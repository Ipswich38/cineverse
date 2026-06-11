import { NextRequest, NextResponse } from "next/server";
import { hasSupabase, supabaseAdmin } from "@/lib/supabase";
import { hasOrderLinks, makeOrdersToken, verifyOrdersToken } from "@/lib/order-link";
import { sendMyOrdersLinkEmail } from "@/lib/contact-mail";
import { displayRentalOrderId } from "@/lib/display-ids";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TABLE = "vissionlink_quote_requests";
// Same safe-field discipline as /api/order/[id] — never IP, payment refs, or documents.
const SAFE_COLS = "id,order_no,email,status,fulfillment_status,date_from,date_to,items,amount_paid,est_total,cancel_status,project,created_at";

// POST { email } — email a signed "My orders" link. Always answers ok:true so
// the endpoint can't be used to probe which emails have orders.
export async function POST(req: NextRequest) {
  if (!hasSupabase() || !hasOrderLinks()) return NextResponse.json({ error: "Not configured." }, { status: 503 });
  const body = await req.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || !email.includes("@") || email.length > 200) {
    return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  }

  const db = supabaseAdmin()!;
  const { count } = await db.from(TABLE).select("id", { count: "exact", head: true }).eq("email", email);
  if (count) {
    const link = `https://vissionlink.com/my-orders?token=${encodeURIComponent(makeOrdersToken(email))}`;
    await sendMyOrdersLinkEmail(email, link);
  }
  // Same response whether or not orders exist — no enumeration.
  return NextResponse.json({ ok: true });
}

// GET ?token=… — list the verified email's orders (newest first).
export async function GET(req: NextRequest) {
  if (!hasSupabase() || !hasOrderLinks()) return NextResponse.json({ error: "Not configured." }, { status: 503 });
  const email = verifyOrdersToken(req.nextUrl.searchParams.get("token") ?? "");
  if (!email) return NextResponse.json({ error: "This link is invalid or has expired. Request a new one." }, { status: 401 });

  const db = supabaseAdmin()!;
  const { data, error } = await db.from(TABLE).select(SAFE_COLS).eq("email", email).order("created_at", { ascending: false }).limit(50);
  if (error) return NextResponse.json({ error: "Could not load orders." }, { status: 500 });

  const orders = (data ?? []).map((row) => ({
    id: row.id,
    orderNo: displayRentalOrderId(row.id, row.order_no ?? null),
    status: row.status,
    fulfillmentStatus: row.fulfillment_status,
    dateFrom: row.date_from,
    dateTo: row.date_to,
    project: row.project,
    items: Array.isArray(row.items) ? row.items : [],
    amountPaid: row.amount_paid,
    estTotal: row.est_total,
    cancelStatus: row.cancel_status ?? null,
    createdAt: row.created_at,
  }));
  return NextResponse.json({ email, orders });
}
