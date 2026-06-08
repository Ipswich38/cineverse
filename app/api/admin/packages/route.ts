import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "../_auth";
import { PACKAGES_TABLE, hasSupabase, supabaseAdmin } from "@/lib/supabase";
import { offerToRow, purgePackages } from "@/lib/packages-data";
import type { PackageOffer } from "@/lib/package-offers";

export const runtime = "nodejs";

function gate(req: NextRequest): NextResponse | null {
  if (!checkAdminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasSupabase()) return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  return null;
}

// Create or upsert a package offer.
export async function POST(req: NextRequest) {
  const blocked = gate(req);
  if (blocked) return blocked;
  const offer = (await req.json()) as PackageOffer;
  const db = supabaseAdmin()!;
  const { error } = await db.from(PACKAGES_TABLE).upsert(offerToRow(offer), { onConflict: "id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  purgePackages();
  return NextResponse.json({ ok: true });
}

// Update an existing package offer.
export async function PUT(req: NextRequest) {
  const blocked = gate(req);
  if (blocked) return blocked;
  const offer = (await req.json()) as PackageOffer;
  const db = supabaseAdmin()!;
  const { error } = await db.from(PACKAGES_TABLE).update(offerToRow(offer)).eq("id", offer.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  purgePackages();
  return NextResponse.json({ ok: true });
}

// Delete a package offer by id (?id=...).
export async function DELETE(req: NextRequest) {
  const blocked = gate(req);
  if (blocked) return blocked;
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
  const db = supabaseAdmin()!;
  const { error } = await db.from(PACKAGES_TABLE).delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  purgePackages();
  return NextResponse.json({ ok: true });
}
