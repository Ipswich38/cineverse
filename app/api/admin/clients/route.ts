import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "../_auth";
import { hasSupabase, supabaseAdmin } from "@/lib/supabase";
import { getClient, updateClient } from "@/lib/clients-db";
import { markDelinquency, policyFor, type ClientRecord, type ClientStanding } from "@/lib/clients";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TABLE = "vissionlink_clients";

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
