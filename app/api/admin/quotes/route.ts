import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "../_auth";
import { hasSupabase, supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TABLE = "vissionlink_quote_requests";

// GET — list quote requests (newest first) for the admin to review.
export async function GET(req: NextRequest) {
  if (!checkAdminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasSupabase()) return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  const db = supabaseAdmin()!;
  const { data, error } = await db.from(TABLE).select("*").order("created_at", { ascending: false }).limit(100);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// PATCH ?id=… — update a request's status (pending | responded | closed).
export async function PATCH(req: NextRequest) {
  if (!checkAdminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasSupabase()) return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  const id = req.nextUrl.searchParams.get("id");
  const body = await req.json().catch(() => ({}));
  const status = body.status as string;
  if (!id || !["pending", "responded", "closed"].includes(status)) {
    return NextResponse.json({ error: "Missing id or invalid status." }, { status: 400 });
  }
  const db = supabaseAdmin()!;
  const { error } = await db.from(TABLE).update({ status }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
