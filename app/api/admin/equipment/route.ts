import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "../_auth";
import { EQUIPMENT_TABLE, hasSupabase, supabaseAdmin } from "@/lib/supabase";
import { itemToRow, purgeCatalog } from "@/lib/catalog-data";
import type { EquipmentItem } from "@/lib/catalog";

export const runtime = "nodejs";

function gate(req: NextRequest): NextResponse | null {
  if (!checkAdminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasSupabase()) return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  return null;
}

// Create or upsert a listing.
export async function POST(req: NextRequest) {
  const blocked = gate(req);
  if (blocked) return blocked;
  const item = (await req.json()) as EquipmentItem;
  const db = supabaseAdmin()!;
  const { error } = await db.from(EQUIPMENT_TABLE).upsert(itemToRow(item), { onConflict: "id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  purgeCatalog();
  return NextResponse.json({ ok: true });
}

// Update an existing listing.
export async function PUT(req: NextRequest) {
  const blocked = gate(req);
  if (blocked) return blocked;
  const item = (await req.json()) as EquipmentItem;
  const db = supabaseAdmin()!;
  const { error } = await db.from(EQUIPMENT_TABLE).update(itemToRow(item)).eq("id", item.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  purgeCatalog();
  return NextResponse.json({ ok: true });
}

// Delete a listing by id (?id=...).
export async function DELETE(req: NextRequest) {
  const blocked = gate(req);
  if (blocked) return blocked;
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
  const db = supabaseAdmin()!;
  const { error } = await db.from(EQUIPMENT_TABLE).delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  purgeCatalog();
  return NextResponse.json({ ok: true });
}
