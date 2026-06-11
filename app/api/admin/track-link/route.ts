import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "../_auth";
import { hasSupabase, supabaseAdmin } from "@/lib/supabase";
import { hasTrackLinks, makeTrackToken } from "@/lib/track-link";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET ?orderId=… — mint the courier tracking link for an order (valid 14 days).
// The admin hands this URL to the delivery rider; it can only check in location
// and mark arrived / left premises for this one order.
export async function GET(req: NextRequest) {
  if (!checkAdminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasSupabase()) return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  if (!hasTrackLinks()) return NextResponse.json({ error: "ORDER_LINK_SECRET is not set." }, { status: 503 });
  const orderId = req.nextUrl.searchParams.get("orderId") ?? "";
  if (!orderId) return NextResponse.json({ error: "Missing orderId." }, { status: 400 });

  const db = supabaseAdmin()!;
  const { data: order } = await db.from("vissionlink_quote_requests").select("id").eq("id", orderId).maybeSingle();
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });

  return NextResponse.json({ url: `https://vissionlink.com/track?token=${encodeURIComponent(makeTrackToken(orderId))}` });
}
