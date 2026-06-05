import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "../_auth";
import { hasSupabase, supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TABLE = "vissionlink_units";
const STATUSES = ["available", "rented", "maintenance", "retired"];

export async function GET(req: NextRequest) {
  if (!checkAdminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasSupabase()) return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  const db = supabaseAdmin()!;
  const { data, error } = await db.from(TABLE).select("*").order("name", { ascending: true }).limit(2000);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  if (!checkAdminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasSupabase()) return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  const b = await req.json().catch(() => ({}));
  const name = typeof b.name === "string" ? b.name.trim().slice(0, 200) : "";
  if (!name) return NextResponse.json({ error: "Unit name is required." }, { status: 400 });
  const row = {
    id: `u-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name,
    category: typeof b.category === "string" ? b.category.slice(0, 80) : null,
    serial: typeof b.serial === "string" ? b.serial.slice(0, 120) : null,
    status: "available",
    location_label: typeof b.location_label === "string" ? b.location_label.slice(0, 200) : null,
    notes: typeof b.notes === "string" ? b.notes.slice(0, 1000) : null,
  };
  const { error } = await supabaseAdmin()!.from(TABLE).insert(row);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, unit: row });
}

// PATCH ?id=… — update status / location / assignment. Check-out sets rented +
// assigned_request_id; check-in clears it. Stamps last_seen on a location update.
export async function PATCH(req: NextRequest) {
  if (!checkAdminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasSupabase()) return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  const id = req.nextUrl.searchParams.get("id");
  const b = await req.json().catch(() => ({}));
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof b.status === "string" && STATUSES.includes(b.status)) {
    patch.status = b.status;
    if (b.status !== "rented") patch.assigned_request_id = null;
  }
  if ("assigned_request_id" in b) patch.assigned_request_id = b.assigned_request_id || null;
  if (typeof b.location_label === "string") { patch.location_label = b.location_label.slice(0, 200); patch.last_seen = new Date().toISOString(); }
  if (typeof b.lat === "number") patch.lat = b.lat;
  if (typeof b.lng === "number") patch.lng = b.lng;
  if (typeof b.notes === "string") patch.notes = b.notes.slice(0, 1000);
  if (typeof b.serial === "string") patch.serial = b.serial.slice(0, 120);

  const { error } = await supabaseAdmin()!.from(TABLE).update(patch).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  if (!checkAdminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasSupabase()) return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
  const { error } = await supabaseAdmin()!.from(TABLE).delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
