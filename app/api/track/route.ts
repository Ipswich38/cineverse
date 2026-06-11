import { NextRequest, NextResponse } from "next/server";
import { hasSupabase, supabaseAdmin } from "@/lib/supabase";
import { hasTrackLinks, verifyTrackToken } from "@/lib/track-link";
import { displayRentalOrderId } from "@/lib/display-ids";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TABLE = "vissionlink_quote_requests";
const UNITS = "vissionlink_units";

// Location/status ingest. Two callers, two auth paths:
//
// 1. Courier link (today): POST { token, lat?, lng?, action? } — token is the
//    order-scoped signed link from the admin. Updates the order's assigned
//    units' last-known position and optionally advances delivery status
//    (arrived / left_premises only — couriers never mark returned/settled).
//
// 2. Hardware GPS tracker (future): POST { unitId, lat, lng } with
//    Authorization: Bearer $TRACK_DEVICE_TOKEN. One env token shared by BMR's
//    devices; swap to per-device tokens when the fleet grows.

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const validCoords = (lat: number | null, lng: number | null) =>
  lat !== null && lng !== null && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;

export async function POST(req: NextRequest) {
  if (!hasSupabase()) return NextResponse.json({ error: "Not configured." }, { status: 503 });
  const body = await req.json().catch(() => ({}));
  const db = supabaseAdmin()!;
  const now = new Date().toISOString();
  const lat = num(body.lat);
  const lng = num(body.lng);

  // ── Device mode ──
  const deviceToken = process.env.TRACK_DEVICE_TOKEN;
  const auth = req.headers.get("authorization");
  if (auth && deviceToken && auth === `Bearer ${deviceToken}`) {
    const unitId = typeof body.unitId === "string" ? body.unitId : "";
    if (!unitId || !validCoords(lat, lng)) return NextResponse.json({ error: "unitId, lat, lng required." }, { status: 400 });
    const { error } = await db.from(UNITS).update({ lat, lng, last_seen: now, updated_at: now }).eq("id", unitId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // ── Courier mode ──
  if (!hasTrackLinks()) return NextResponse.json({ error: "Not configured." }, { status: 503 });
  const orderId = verifyTrackToken(typeof body.token === "string" ? body.token : "");
  if (!orderId) return NextResponse.json({ error: "This tracking link is invalid or has expired." }, { status: 401 });

  const { data: order } = await db.from(TABLE).select("id, order_no, fulfillment_status, items, date_to").eq("id", orderId).maybeSingle();
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });

  // Position check-in: stamp every unit assigned to this order.
  let unitsUpdated = 0;
  if (validCoords(lat, lng)) {
    const { data: updated } = await db
      .from(UNITS)
      .update({ lat, lng, last_seen: now, updated_at: now })
      .eq("assigned_request_id", orderId)
      .select("id");
    unitsUpdated = updated?.length ?? 0;
  }

  // Optional delivery-status advance, with guarded transitions.
  const action = typeof body.action === "string" ? body.action : "";
  let statusChanged = false;
  if (action) {
    const current = String(order.fulfillment_status ?? "");
    const allowed: Record<string, { from: string[]; stamp: string }> = {
      arrived: { from: ["shipped"], stamp: "arrived_at" },
      left_premises: { from: ["arrived", "shipped"], stamp: "left_premises_at" },
    };
    const rule = allowed[action];
    if (!rule) return NextResponse.json({ error: "Invalid action." }, { status: 400 });
    if (!rule.from.includes(current)) {
      return NextResponse.json({ error: `Order is "${current.replace(/_/g, " ")}" — cannot mark ${action.replace(/_/g, " ")}.` }, { status: 409 });
    }
    const { error } = await db.from(TABLE).update({ fulfillment_status: action, [rule.stamp]: now }).eq("id", orderId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    statusChanged = true;
  }

  return NextResponse.json({ ok: true, unitsUpdated, statusChanged });
}

// GET ?token=… — the courier page bootstraps from this: order number, item
// summary, and current status. No client PII (name/email/phone) is exposed.
export async function GET(req: NextRequest) {
  if (!hasSupabase() || !hasTrackLinks()) return NextResponse.json({ error: "Not configured." }, { status: 503 });
  const orderId = verifyTrackToken(req.nextUrl.searchParams.get("token") ?? "");
  if (!orderId) return NextResponse.json({ error: "This tracking link is invalid or has expired." }, { status: 401 });
  const db = supabaseAdmin()!;
  const { data: order } = await db.from(TABLE).select("id, order_no, fulfillment_status, items, date_to").eq("id", orderId).maybeSingle();
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  const items = Array.isArray(order.items)
    ? (order.items as { name?: string; qty?: number }[]).map((it) => `${it.name ?? "Equipment"} ×${it.qty ?? 1}`)
    : [];
  return NextResponse.json({
    orderNo: displayRentalOrderId(order.id, (order.order_no as string | null) ?? null),
    status: order.fulfillment_status ?? "",
    items,
    dateTo: order.date_to ?? null,
  });
}
