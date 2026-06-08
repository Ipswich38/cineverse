import { NextRequest, NextResponse } from "next/server";
import { hasSupabase, supabaseAdmin } from "@/lib/supabase";
import { getCheckoutSession, sessionIsPaid, hasPaymongo } from "@/lib/paymongo";
import { finalizeRentalOrder } from "@/lib/rental-finalize";
import { displayRentalOrderId } from "@/lib/display-ids";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";


// GET ?order=… — order fulfillment status for the success page. Also acts as the
// webhook FALLBACK: if the order is still pending, it verifies the payment with
// PayMongo and finalizes it (idempotent) so a delayed webhook never strands a
// paid customer. Returns only the non-sensitive fulfillment status.
export async function GET(req: NextRequest) {
  if (!hasSupabase()) return NextResponse.json({ error: "Not configured." }, { status: 503 });
  const orderId = req.nextUrl.searchParams.get("order");
  if (!orderId) return NextResponse.json({ error: "Missing order." }, { status: 400 });

  const db = supabaseAdmin()!;
  const { data: row } = await db.from("vissionlink_quote_requests").select("fulfillment_status,payment_ref,balance_method,order_no").eq("id", orderId).maybeSingle();
  if (!row) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  const balance_method = (row as { balance_method?: string }).balance_method ?? "standard";
  const order_no = (row as { order_no?: string | null }).order_no ?? null;
  const display_order_no = displayRentalOrderId(orderId, order_no);

  if (row.fulfillment_status === "pending_payment" && hasPaymongo() && row.payment_ref) {
    const session = await getCheckoutSession(String(row.payment_ref));
    if (sessionIsPaid(session)) {
      await finalizeRentalOrder(orderId);
      const { data: after } = await db.from("vissionlink_quote_requests").select("fulfillment_status").eq("id", orderId).maybeSingle();
      return NextResponse.json({ fulfillment_status: after?.fulfillment_status ?? "paid", balance_method, order_no: display_order_no, legacy_order_no: order_no });
    }
  }
  return NextResponse.json({ fulfillment_status: row.fulfillment_status ?? "pending_payment", balance_method, order_no: display_order_no, legacy_order_no: order_no });
}
