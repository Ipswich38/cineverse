import { NextRequest, NextResponse } from "next/server";
import { hasSupabase, supabaseAdmin } from "@/lib/supabase";
import { getCatalogCached } from "@/lib/catalog-data";
import { packageByCartIdLive } from "@/lib/packages-data";
import { rentalTotals, DOWNPAYMENT_RATE, isBalanceMethod, type RentableLine, type BalanceMethod } from "@/lib/rental-pricing";
import { createCheckoutSession, hasPaymongo } from "@/lib/paymongo";
import { clientIpFromHeaders, lookupLocation } from "@/lib/geo-ip";
import { displayRentalOrderId } from "@/lib/display-ids";
import { parseCrewSelection, crewLineItems, crewDaysFromRange } from "@/lib/cineforce-crew";

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
  const balanceMethod: BalanceMethod = isBalanceMethod(b.balanceMethod) ? b.balanceMethod : "standard";
  const incoming = Array.isArray(b.cart) ? (b.cart as IncomingLine[]) : [];

  if (!name || !email) return NextResponse.json({ error: "Name and email are required." }, { status: 400 });
  if (!isEmail(email)) return NextResponse.json({ error: "Please enter a valid email." }, { status: 400 });
  if (!agree) return NextResponse.json({ error: "Please accept the rental/lease terms to continue." }, { status: 400 });
  if (!dateFrom || !dateTo) return NextResponse.json({ error: "Choose rental start and end dates." }, { status: 400 });
  if (incoming.length === 0) return NextResponse.json({ error: "Your cart is empty." }, { status: 400 });

  // Crew hire (Cineforce) or signed liability waiver — one of the two is required.
  const crew = parseCrewSelection(b.crew);
  if (!crew.ok) return NextResponse.json({ error: crew.error }, { status: 400 });

  // Resolve every cart line against the catalog → authoritative price + deposit.
  const catalog = await getCatalogCached();
  const byId = new Map(catalog.map((c) => [c.id, c]));
  const items: { id: string; name: string; qty: number; days: number; ratePerDay: number }[] = [];
  for (const line of incoming) {
    const id = String(line.itemId);
    const days = Math.max(1, Math.floor(Number(line.days) || 0));
    const qty = Math.max(1, Math.floor(Number(line.quantity) || 0));
    // Packages (id `pkg-…`) price from the live DB packages; gear from the catalog.
    const pkg = await packageByCartIdLive(id);
    if (pkg) {
      items.push({ id, name: pkg.name, qty, days, ratePerDay: pkg.pricePerDay });
      continue;
    }
    const item = byId.get(id);
    if (!item) return NextResponse.json({ error: "An item in your cart is no longer available." }, { status: 409 });
    if (item.stock > 0 && qty > item.stock) return NextResponse.json({ error: `Only ${item.stock} of ${item.name} in stock.` }, { status: 409 });
    items.push({ id: item.id, name: item.name, qty, days, ratePerDay: item.ratePerDay });
  }

  // Crew lines are priced server-side from the Cineforce position rates and
  // billed for the whole booked date range. They ride along in `items` (with a
  // `crew-` id prefix) so totals, the contract, and the invoice all include them.
  for (const c of crewLineItems(crew.value, crewDaysFromRange(dateFrom, dateTo))) {
    items.push({ id: c.id, name: c.name, qty: c.qty, days: c.days, ratePerDay: c.ratePerDay });
  }

  const rentable: RentableLine[] = items.map((i) => ({ ratePerDay: i.ratePerDay, days: i.days, quantity: i.qty }));
  const totals = rentalTotals(rentable, balanceMethod); // { rental, discount, net, downpayment, balance, payNow }
  if (totals.payNow < 100) return NextResponse.json({ error: "Minimum online payment is ₱100." }, { status: 400 });

  // Pending order row (an auto-agreed rental; docs are generated on payment).
  const id = `r-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  // Human-friendly sequential service order number (SO-0001…). Atomic via the
  // next_order_no() DB function; if it's unavailable we fall back to the id so
  // checkout never blocks on numbering.
  let orderNo: string | null = null;
  try {
    const seq = await supabaseAdmin()!.rpc("next_order_no");
    if (!seq.error && typeof seq.data === "string") orderNo = seq.data;
  } catch { /* fall back to id below */ }

  // Best-effort capture of where the order came from (never blocks checkout).
  const clientIp = clientIpFromHeaders(req.headers);
  const clientLocation = await lookupLocation(clientIp);

  const row = {
    id, name, email, phone, project,
    company: str(b.company, 200),
    date_from: dateFrom, date_to: dateTo,
    notes, items,
    est_total: totals.net,
    status: "pending",
    channel: "rent",
    balance_method: balanceMethod,
    fulfillment_status: "pending_payment",
    delivery_address: deliveryAddress,
    order_no: orderNo,
    client_ip: clientIp,
    client_location: clientLocation,
    crew_mode: crew.value.mode,
    waiver_signed_name: crew.value.mode === "waiver" ? crew.value.waiverSignedName : null,
  };
  let insert = await supabaseAdmin()!.from(TABLE).insert(row).select("id").maybeSingle();
  if (insert.error && /channel|balance_method|order_no|client_ip|client_location|crew_mode|waiver_signed_name|column/i.test(insert.error.message)) {
    // Older schemas may lack the optional columns — retry without them.
    const { channel: _c, balance_method: _bm, order_no: _on, client_ip: _ip, client_location: _loc, crew_mode: _cm, waiver_signed_name: _wn, ...rest } = row;
    insert = await supabaseAdmin()!.from(TABLE).insert(rest).select("id").maybeSingle();
  }
  if (insert.error) return NextResponse.json({ error: insert.error.message }, { status: 500 });

  // PayMongo charges payNow now: the full discounted rental for "full", otherwise
  // the reservation downpayment (balance settled later / by PDC).
  const base = req.nextUrl.origin;
  const pct = Math.round(DOWNPAYMENT_RATE * 100);
  const displayNo = displayRentalOrderId(id, orderNo); // what the customer sees on the PayMongo page
  const lineName = balanceMethod === "full"
    ? `Rental — paid in full — order ${displayNo}`
    : `Rental downpayment (${pct}%) — order ${displayNo}`;
  const lines = [{ name: lineName, amount: totals.payNow, quantity: 1 }];

  try {
    const session = await createCheckoutSession({
      lines,
      description: `VissionLink rental ${displayNo}`,
      referenceNumber: displayNo,
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
