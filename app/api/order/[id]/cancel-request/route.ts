import { NextRequest, NextResponse } from "next/server";
import { hasSupabase, supabaseAdmin } from "@/lib/supabase";
import { validateRequest } from "@/lib/cancellation";
import { sendCancellationRequestEmails } from "@/lib/contact-mail";
import { displayRentalOrderId } from "@/lib/display-ids";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TABLE = "vissionlink_quote_requests";

// POST /api/order/:id/cancel-request — a client REQUESTS a cancellation/change.
// Gated: email must match the order, a reason category is required, and the
// explanation must be substantive (see validateRequest). Never refunds anything —
// it logs a request for the team to review.
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!hasSupabase()) return NextResponse.json({ error: "Not configured." }, { status: 503 });
  const { id } = await ctx.params;
  const b = await req.json().catch(() => ({} as Record<string, unknown>));
  const email = (typeof b.email === "string" ? b.email : "").trim().toLowerCase();
  const category = typeof b.category === "string" ? b.category : "";
  const reason = typeof b.reason === "string" ? b.reason.trim().slice(0, 4000) : "";

  if (!id || !email) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  const invalid = validateRequest(category, reason);
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

  const db = supabaseAdmin()!;
  const { data: row } = await db
    .from(TABLE)
    .select("id,order_no,name,email,fulfillment_status,cancel_status")
    .eq("id", id)
    .maybeSingle();
  if (!row || String(row.email ?? "").toLowerCase() !== email) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }
  if (row.fulfillment_status === "cancelled" || row.cancel_status === "refunded" || row.cancel_status === "cancelled") {
    return NextResponse.json({ error: "This order has already been cancelled." }, { status: 409 });
  }
  if (row.cancel_status === "requested") {
    return NextResponse.json({ error: "We've already received a request for this order and it's under review." }, { status: 409 });
  }

  const { error } = await db.from(TABLE).update({
    cancel_status: "requested",
    cancel_reason_category: category,
    cancel_reason: reason,
    cancel_requested_at: new Date().toISOString(),
  }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await sendCancellationRequestEmails({
    orderNo: displayRentalOrderId(id, typeof row.order_no === "string" ? row.order_no : null),
    clientName: String(row.name ?? ""),
    clientEmail: email,
    category,
    reason,
  });

  return NextResponse.json({ ok: true });
}
