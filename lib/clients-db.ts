import { supabaseAdmin } from "./supabase";
import { applyCleanRental, type ClientRecord } from "./clients";

// Server-side access to the client ledger (vissionlink_clients). Keyed by email.
const TABLE = "vissionlink_clients";

// Ledger writes are best-effort (a failure must not block an order), but they
// must never be invisible — log so it surfaces in Vercel function logs.
function logDbError(op: string, email: string, error: { message: string } | null) {
  if (error) console.error(`[clients-db] ${op} failed for ${email}: ${error.message}`);
}

export async function getClient(email: string): Promise<ClientRecord | null> {
  const db = supabaseAdmin();
  if (!db || !email) return null;
  const { data, error } = await db.from(TABLE).select("*").eq("email", email.toLowerCase()).maybeSingle();
  logDbError("get", email, error);
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
    if (Object.keys(patch).length) {
      const { error } = await db.from(TABLE).update({ ...patch, updated_at: new Date().toISOString() }).eq("email", key);
      logDbError("refresh", key, error);
    }
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
  const { error } = await db.from(TABLE).insert(row);
  logDbError("insert", key, error);
  return row;
}

export async function updateClient(email: string, patch: Partial<ClientRecord>): Promise<void> {
  const db = supabaseAdmin();
  if (!db || !email) return;
  const { error } = await db.from(TABLE).update({ ...patch, updated_at: new Date().toISOString() }).eq("email", email.toLowerCase());
  logDbError("update", email, error);
}

// Advance the ledger for a clean, fully-paid rental (idempotency is the caller's
// responsibility via the invoice's loyaltyCredited guard).
export async function creditCleanRental(email: string, amountPaid: number, fields: Partial<ClientRecord> = {}): Promise<void> {
  const client = (await ensureClient(email, fields)) ?? null;
  if (!client) return;
  await updateClient(email, applyCleanRental(client, amountPaid));
}
