import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "../_auth";
import { hasSupabase, supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TABLE = "vissionlink_expenses";

export async function GET(req: NextRequest) {
  if (!checkAdminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasSupabase()) return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  const db = supabaseAdmin()!;
  const { data, error } = await db.from(TABLE).select("*").order("date", { ascending: false }).limit(1000);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  if (!checkAdminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasSupabase()) return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  const b = await req.json().catch(() => ({}));
  const amount = Number(b.amount) || 0;
  if (!b.date || amount <= 0) return NextResponse.json({ error: "Date and a positive amount are required." }, { status: 400 });
  const row = {
    id: `exp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    date: String(b.date).slice(0, 10),
    category: typeof b.category === "string" ? b.category.slice(0, 40) : "general",
    description: typeof b.description === "string" ? b.description.slice(0, 400) : "",
    amount,
  };
  const { error } = await supabaseAdmin()!.from(TABLE).insert(row);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, expense: row });
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
