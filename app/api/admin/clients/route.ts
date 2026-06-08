import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "../_auth";
import { hasSupabase, supabaseAdmin } from "@/lib/supabase";
import { getClient, updateClient } from "@/lib/clients-db";
import { markDelinquency, policyFor, type ClientRecord, type ClientStanding } from "@/lib/clients";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TABLE = "vissionlink_clients";
const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const str = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : "");
const num = (v: unknown) => Math.max(0, Math.floor(Number(v) || 0));

// POST — manually add a client met OFF the platform (call / walk-in / referral).
// Seeds the ledger row; loyalty figures default to 0 but can be pre-filled for an
// existing relationship being migrated in.
export async function POST(req: NextRequest) {
  if (!checkAdminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasSupabase()) return NextResponse.json({ error: "Database not configured." }, { status: 503 });

  const body = await req.json().catch(() => ({}));
  const email = str(body.email, 200).toLowerCase();
  if (!email || !isEmail(email)) return NextResponse.json({ error: "A valid client email is required." }, { status: 400 });

  const existing = await getClient(email);
  if (existing) return NextResponse.json({ error: "A client with that email already exists." }, { status: 409 });

  const standing = (["good", "watch", "blocked"].includes(body.standing) ? body.standing : "good") as ClientStanding;
  const row: ClientRecord & { email: string } = {
    email,
    name: str(body.name, 200) || null,
    company: str(body.company, 200) || null,
    phone: str(body.phone, 60) || null,
    standing,
    clean_paid_count: num(body.clean_paid_count),
    total_spent: num(body.total_spent),
    bounced_count: num(body.bounced_count),
    late_count: num(body.late_count),
    notes: str(body.notes, 4000) || null,
  };
  const { error } = await supabaseAdmin()!.from(TABLE).insert(row);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, client: row, policy: policyFor(row) });
}

// GET — list the client ledger (with each client's resolved policy), or one
// client by ?email=.
export async function GET(req: NextRequest) {
  if (!checkAdminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasSupabase()) return NextResponse.json({ error: "Database not configured." }, { status: 503 });

  const email = req.nextUrl.searchParams.get("email");
  if (email) {
    const client = await getClient(email);
    return NextResponse.json({ client, policy: policyFor(client) });
  }
  const db = supabaseAdmin()!;
  const { data, error } = await db.from(TABLE).select("*").order("updated_at", { ascending: false }).limit(500);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const clients = (data ?? []) as ClientRecord[];
  return NextResponse.json(clients.map((c) => ({ ...c, policy: policyFor(c) })));
}

// PATCH ?email=… — update standing/notes, or record a delinquency event
// ({ delinquency: "late" | "bounced" }) which demotes the client to watch.
export async function PATCH(req: NextRequest) {
  if (!checkAdminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasSupabase()) return NextResponse.json({ error: "Database not configured." }, { status: 503 });

  const email = req.nextUrl.searchParams.get("email");
  if (!email) return NextResponse.json({ error: "Missing email." }, { status: 400 });
  const body = await req.json().catch(() => ({}));
  const client = await getClient(email);
  if (!client) return NextResponse.json({ error: "Client not found." }, { status: 404 });

  if (body.delinquency === "late" || body.delinquency === "bounced") {
    await updateClient(email, markDelinquency(client, body.delinquency));
    const updated = await getClient(email);
    return NextResponse.json({ ok: true, client: updated, policy: policyFor(updated) });
  }

  const patch: Partial<ClientRecord> = {};
  if (typeof body.standing === "string" && ["good", "watch", "blocked"].includes(body.standing)) patch.standing = body.standing as ClientStanding;
  if (typeof body.notes === "string") patch.notes = body.notes.slice(0, 4000);
  // Editable contact details (e.g. correcting an off-platform client's record).
  if (typeof body.name === "string") patch.name = str(body.name, 200) || null;
  if (typeof body.company === "string") patch.company = str(body.company, 200) || null;
  if (typeof body.phone === "string") patch.phone = str(body.phone, 60) || null;
  if (body.clean_paid_count !== undefined) patch.clean_paid_count = num(body.clean_paid_count);
  if (body.total_spent !== undefined) patch.total_spent = num(body.total_spent);
  if (!Object.keys(patch).length) return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  await updateClient(email, patch);
  const updated = await getClient(email);
  return NextResponse.json({ ok: true, client: updated, policy: policyFor(updated) });
}

// DELETE ?email=… — remove a client from the ledger. (Their loyalty tier/standing
// are rebuilt from invoices on the next clean settlement, so this just clears the
// manual record.)
export async function DELETE(req: NextRequest) {
  if (!checkAdminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasSupabase()) return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  const email = req.nextUrl.searchParams.get("email");
  if (!email) return NextResponse.json({ error: "Missing email." }, { status: 400 });
  const { error } = await supabaseAdmin()!.from(TABLE).delete().eq("email", email);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
