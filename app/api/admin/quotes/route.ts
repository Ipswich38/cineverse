import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "../_auth";
import { hasSupabase, supabaseAdmin } from "@/lib/supabase";
import { generateDraft } from "@/lib/quotation";
import { PACKAGE_OFFERS } from "@/lib/package-offers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TABLE = "vissionlink_quote_requests";
const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

// GET — list quote requests (newest first) for the admin to review.
export async function GET(req: NextRequest) {
  if (!checkAdminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasSupabase()) return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  const db = supabaseAdmin()!;
  const { data, error } = await db.from(TABLE).select("*").order("created_at", { ascending: false }).limit(100);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// POST — admin creates a quotation directly for a client who reached out by
// phone or in person. Builds the request row and an auto-generated draft from
// the chosen package (optional), then returns the row so the editor can open it.
export async function POST(req: NextRequest) {
  if (!checkAdminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasSupabase()) return NextResponse.json({ error: "Database not configured." }, { status: 503 });

  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const str = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : "");
  const name = str(body.name, 200);
  const email = str(body.email, 200);
  if (!name || !email) return NextResponse.json({ error: "Client name and email are required." }, { status: 400 });
  if (!isEmail(email)) return NextResponse.json({ error: "Please enter a valid client email." }, { status: 400 });

  const packageSlug = str(body.packageSlug, 120);
  const offer = packageSlug ? PACKAGE_OFFERS.find((o) => o.slug === packageSlug) : undefined;
  const items = offer ? [{ type: "package", slug: offer.slug, name: offer.name, priceRange: offer.priceRange }] : [];

  const id = `q-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const base = {
    id,
    name,
    company: str(body.company, 200),
    email,
    phone: str(body.phone, 60),
    project: str(body.project, 300),
    date_from: str(body.dateFrom, 40) || null,
    date_to: str(body.dateTo, 40) || null,
    notes: str(body.notes, 4000),
    items,
  };
  const draft = generateDraft(base);
  const row = { ...base, est_total: 0, status: "pending", quotation: draft, quotation_status: "draft", channel: "direct" };

  const db = supabaseAdmin()!;
  // `channel` column is optional; retry without it if the column doesn't exist.
  let insert = await db.from(TABLE).insert(row).select("*").maybeSingle();
  if (insert.error && /channel/i.test(insert.error.message)) {
    const { channel: _omit, ...rowNoChannel } = row;
    insert = await db.from(TABLE).insert(rowNoChannel).select("*").maybeSingle();
  }
  if (insert.error) return NextResponse.json({ error: insert.error.message }, { status: 500 });
  return NextResponse.json({ ok: true, request: insert.data });
}

// PATCH ?id=… — update a request's status (pending | responded | closed).
export async function PATCH(req: NextRequest) {
  if (!checkAdminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasSupabase()) return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  const id = req.nextUrl.searchParams.get("id");
  const body = await req.json().catch(() => ({}));
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
  const db = supabaseAdmin()!;

  // Mark the quotation agreed/unset (client accepted) — gates contract & invoice.
  if (typeof body.agreed === "boolean") {
    const { error } = await db.from(TABLE).update({ quotation_agreed_at: body.agreed ? new Date().toISOString() : null }).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // Advance an instant-rent order's fulfillment: paid → shipped → returned →
  // settled (security reconciled). Each stamps its own timestamp.
  if (typeof body.fulfillment === "string") {
    const STAMP: Record<string, string> = { shipped: "shipped_at", returned: "returned_at", settled: "settled_at" };
    const next = body.fulfillment;
    if (!STAMP[next] && next !== "cancelled") return NextResponse.json({ error: "Invalid fulfillment state." }, { status: 400 });
    const patch: Record<string, unknown> = { fulfillment_status: next };
    if (STAMP[next]) patch[STAMP[next]] = new Date().toISOString();
    const { error } = await db.from(TABLE).update(patch).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  const status = body.status as string;
  if (!["pending", "responded", "closed"].includes(status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }
  const { error } = await db.from(TABLE).update({ status }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE ?id=… — remove a quote request and everything hanging off it: the row
// (which carries the quotation/contract/invoice docs), the stored PDF copies in
// each bucket, and any inventory units reserved against it (checked back in).
export async function DELETE(req: NextRequest) {
  if (!checkAdminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasSupabase()) return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });
  const db = supabaseAdmin()!;

  // Release any units reserved for this request before the row disappears.
  await db.from("vissionlink_units").update({ status: "available", assigned_request_id: null, updated_at: new Date().toISOString() }).eq("assigned_request_id", id);

  // Best-effort cleanup of stored document PDFs (one folder per request id).
  for (const bucket of ["quotations", "contracts", "invoices"]) {
    const { data: files } = await db.storage.from(bucket).list(id);
    if (files?.length) await db.storage.from(bucket).remove(files.map((f) => `${id}/${f.name}`));
  }

  const { error } = await db.from(TABLE).delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
