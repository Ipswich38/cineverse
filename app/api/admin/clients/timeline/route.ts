import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "../../_auth";
import { hasSupabase, supabaseAdmin } from "@/lib/supabase";
import { getClient } from "@/lib/clients-db";
import { policyFor } from "@/lib/clients";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TABLE = "vissionlink_quote_requests";

// Columns we project into the per-client activity timeline. Kept explicit so the
// response stays small and never leaks the full document blobs.
const COLS = [
  "id", "order_no", "created_at", "channel", "status", "project",
  "date_from", "date_to", "est_total", "items",
  "quotation_status", "quotation_sent_at", "quotation_agreed_at",
  "contract_status", "contract_pdf_path", "invoice_status", "invoice_pdf_path",
  "fulfillment_status", "payment_method", "payment_ref", "amount_paid", "paid_at",
  "client_ip", "client_location",
].join(",");

// GET ?email=… — one client's CRM view: the loyalty ledger + resolved policy,
// plus every order/quotation for that email merged into a single timeline
// (quotation → order/payment → invoice → contract).
export async function GET(req: NextRequest) {
  if (!checkAdminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasSupabase()) return NextResponse.json({ error: "Database not configured." }, { status: 503 });

  const email = (req.nextUrl.searchParams.get("email") ?? "").trim().toLowerCase();
  if (!email) return NextResponse.json({ error: "An email is required." }, { status: 400 });

  const client = await getClient(email);
  const db = supabaseAdmin()!;
  const { data, error } = await db
    .from(TABLE)
    .select(COLS)
    .ilike("email", email)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ client, policy: policyFor(client), orders: data ?? [] });
}
