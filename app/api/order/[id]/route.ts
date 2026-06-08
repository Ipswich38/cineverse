import { NextRequest, NextResponse } from "next/server";
import { hasSupabase, supabaseAdmin } from "@/lib/supabase";
import { displayRentalOrderId } from "@/lib/display-ids";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TABLE = "vissionlink_quote_requests";


// GET /api/order/:id?email=… — a SAFE booking summary for the client's own order
// page. The email must match the order (it acts as a light shared token), and only
// non-sensitive fields are returned (never IP, payment refs, or documents).
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!hasSupabase()) return NextResponse.json({ error: "Not configured." }, { status: 503 });
  const { id } = await ctx.params;
  const email = (req.nextUrl.searchParams.get("email") ?? "").trim().toLowerCase();
  if (!id || !email) return NextResponse.json({ error: "Order not found." }, { status: 404 });

  const db = supabaseAdmin()!;
  const { data: row } = await db
    .from(TABLE)
    .select("id,order_no,email,status,fulfillment_status,date_from,date_to,items,amount_paid,est_total,cancel_status,project")
    .eq("id", id)
    .maybeSingle();

  // Same 404 for "no order" and "email mismatch" — don't reveal which.
  if (!row || String(row.email ?? "").toLowerCase() !== email) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  return NextResponse.json({
    order: {
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
    },
  });
}
