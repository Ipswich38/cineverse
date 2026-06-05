import { supabaseAdmin } from "./supabase";
import { applyCleanRental, type ClientRecord } from "./clients";

// Server-side access to the client ledger (vissionlink_clients). Keyed by email.
const TABLE = "vissionlink_clients";

export async function getClient(email: string): Promise<ClientRecord | null> {
  const db = supabaseAdmin();
  if (!db || !email) return null;
  const { data } = await db.from(TABLE).select("*").eq("email", email.toLowerCase()).maybeSingle();
  return (data as ClientRecord) ?? null;
}

// Ensure a ledger row exists for this email (created on first contact), keeping
// name/company/phone fresh. Returns the current record.
export async function ensureClient(email: string, fields: Partial<ClientRecord> = {}): Promise<ClientRecord | null> {
  const db = supabaseAdmin();
  if (!db || !email) return null;
  const key = email.toLowerCase();
  const existing = await getClient(key);
  if (existing) {
    const patch: Partial<ClientRecord> = {};
    for (const k of ["name", "company", "phone"] as const) if (fields[k] && !existing[k]) patch[k] = fields[k] as string;
    if (Object.keys(patch).length) await db.from(TABLE).update({ ...patch, updated_at: new Date().toISOString() }).eq("email", key);
    return { ...existing, ...patch };
  }
  const row: ClientRecord & { email: string } = {
    email: key,
    name: fields.name ?? null,
    company: fields.company ?? null,
    phone: fields.phone ?? null,
    standing: "good",
    clean_paid_count: 0,
    total_spent: 0,
    bounced_count: 0,
    late_count: 0,
    notes: null,
  };
  await db.from(TABLE).insert(row);
  return row;
}

export async function updateClient(email: string, patch: Partial<ClientRecord>): Promise<void> {
  const db = supabaseAdmin();
  if (!db || !email) return;
  await db.from(TABLE).update({ ...patch, updated_at: new Date().toISOString() }).eq("email", email.toLowerCase());
}

// Advance the ledger for a clean, fully-paid rental (idempotency is the caller's
// responsibility via the invoice's loyaltyCredited guard).
export async function creditCleanRental(email: string, amountPaid: number, fields: Partial<ClientRecord> = {}): Promise<void> {
  const client = (await ensureClient(email, fields)) ?? null;
  if (!client) return;
  await updateClient(email, applyCleanRental(client, amountPaid));
}
