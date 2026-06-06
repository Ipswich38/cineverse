import { NextRequest, NextResponse } from "next/server";
import { hasSupabase, supabaseAdmin } from "@/lib/supabase";
import { getCatalogCached } from "@/lib/catalog-data";
import { rentalTotals, lineRental, lineSecurity, type RentableLine } from "@/lib/rental-pricing";
import { createCheckoutSession, hasPaymongo } from "@/lib/paymongo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TABLE = "vissionlink_quote_requests";
const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

type IncomingLine = { itemId: string; days: number; quantity: number };

// POST — start an instant rental. Recomputes every price from the authoritative
// catalog (never trusts the client), creates a pending order row, opens a PayMongo
// Checkout Session for (rental + refundable security), and returns the redirect URL.
export async function POST(req: NextRequest) {
  if (!hasSupabase()) return NextResponse.json({ error: "Store is not configured." }, { status: 503 });
  if (!hasPaymongo()) return NextResponse.json({ error: "Online payment is not configured." }, { status: 503 });

  const b = await req.json().catch(() => ({} as Record<string, unknown>));
  const str = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : "");
  const name = str(b.name, 200);
  const email = str(b.email, 200);
  const phone = str(b.phone, 60);
  const deliveryAddress = str(b.deliveryAddress, 500);
  const dateFrom = str(b.dateFrom, 40);
  const dateTo = str(b.dateTo, 40);
  const project = str(b.project, 300);
  const notes = str(b.notes, 2000);
  const agree = b.agree === true;
  const incoming = Array.isArray(b.cart) ? (b.cart as IncomingLine[]) : [];

  if (!name || !email) return NextResponse.json({ error: "Name and email are required." }, { status: 400 });
  if (!isEmail(email)) return NextResponse.json({ error: "Please enter a valid email." }, { status: 400 });
  if (!agree) return NextResponse.json({ error: "Please accept the rental/lease terms to continue." }, { status: 400 });
  if (!dateFrom || !dateTo) return NextResponse.json({ error: "Choose rental start and end dates." }, { status: 400 });
  if (incoming.length === 0) return NextResponse.json({ error: "Your cart is empty." }, { status: 400 });

  // Resolve every cart line against the catalog → authoritative price + deposit.
  const catalog = await getCatalogCached();
  const byId = new Map(catalog.map((c) => [c.id, c]));
  const items: { id: string; name: string; qty: number; days: number; ratePerDay: number; securityDeposit: number }[] = [];
  for (const line of incoming) {
    const item = byId.get(String(line.itemId));
    if (!item) return NextResponse.json({ error: "An item in your cart is no longer available." }, { status: 409 });
    const days = Math.max(1, Math.floor(Number(line.days) || 0));
    const qty = Math.max(1, Math.floor(Number(line.quantity) || 0));
    if (item.stock > 0 && qty > item.stock) return NextResponse.json({ error: `Only ${item.stock} of ${item.name} in stock.` }, { status: 409 });
    items.push({ id: item.id, name: item.name, qty, days, ratePerDay: item.ratePerDay, securityDeposit: item.securityDeposit });
  }

  const rentable: RentableLine[] = items.map((i) => ({ ratePerDay: i.ratePerDay, days: i.days, quantity: i.qty, securityDeposit: i.securityDeposit }));
  const totals = rentalTotals(rentable);
  if (totals.payNow < 100) return NextResponse.json({ error: "Minimum online payment is ₱100." }, { status: 400 });

  // Pending order row (an auto-agreed rental; docs are generated on payment).
  const id = `r-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const row = {
    id, name, email, phone, project,
    company: str(b.company, 200),
    date_from: dateFrom, date_to: dateTo,
    notes, items,
    est_total: totals.rental,
    status: "pending",
    channel: "rent",
    fulfillment_status: "pending_payment",
    security_deposit: totals.security,
    delivery_address: deliveryAddress,
  };
  let insert = await supabaseAdmin()!.from(TABLE).insert(row).select("id").maybeSingle();
  if (insert.error && /channel|column/i.test(insert.error.message)) {
    const { channel: _c, ...rest } = row;
    insert = await supabaseAdmin()!.from(TABLE).insert(rest).select("id").maybeSingle();
  }
  if (insert.error) return NextResponse.json({ error: insert.error.message }, { status: 500 });

  // PayMongo line items: one per gear line + a refundable security deposit line.
  const base = req.nextUrl.origin;
  const lines = items.map((i) => ({ name: `${i.name} — ${i.days} day(s)`, amount: lineRental({ ratePerDay: i.ratePerDay, days: i.days, quantity: 1 }), quantity: i.qty }));
  if (totals.security > 0) lines.push({ name: "Refundable security deposit", amount: totals.security, quantity: 1 });

  try {
    const session = await createCheckoutSession({
      lines,
      description: `VissionLink rental ${id}`,
      referenceNumber: id,
      customer: { name, email, phone: phone || undefined },
      successUrl: `${base}/checkout/success?order=${id}`,
      cancelUrl: `${base}/checkout?cancelled=1`,
      metadata: { orderId: id },
    });
    await supabaseAdmin()!.from(TABLE).update({ payment_ref: session.id }).eq("id", id);
    return NextResponse.json({ ok: true, checkoutUrl: session.checkoutUrl, orderId: id });
  } catch (err) {
    // Roll the pending order back so a failed session doesn't leave a ghost.
    await supabaseAdmin()!.from(TABLE).delete().eq("id", id);
    const msg = err instanceof Error ? err.message : "Could not start checkout.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
