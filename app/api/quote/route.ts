import { NextRequest, NextResponse } from "next/server";
import { hasSupabase, supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

const TABLE = "vissionlink_quote_requests";

// Public endpoint: a customer submits a custom bundle for a quotation. We store it
// (pending) for the admin to review and respond with custom bundle pricing.
export async function POST(req: NextRequest) {
  if (!hasSupabase()) return NextResponse.json({ error: "Quote requests are temporarily unavailable." }, { status: 503 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body.name !== "string" || typeof body.email !== "string" || !Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json({ error: "Add at least one item, and your name and email." }, { status: 400 });
  }

  const str = (v: unknown, n: number) => (typeof v === "string" ? v.slice(0, n) : "");
  const row = {
    id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: str(body.name, 200),
    company: str(body.company, 200),
    email: str(body.email, 200),
    phone: str(body.phone, 60),
    project: str(body.project, 300),
    date_from: body.dateFrom || null,
    date_to: body.dateTo || null,
    notes: str(body.notes, 4000),
    items: body.items,
    est_total: Number(body.estTotal) || 0,
    status: "pending",
  };

  const db = supabaseAdmin()!;
  const { error } = await db.from(TABLE).insert(row);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: row.id });
}
