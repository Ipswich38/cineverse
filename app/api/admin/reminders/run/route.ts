import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "../../_auth";
import { hasSupabase, supabaseAdmin } from "@/lib/supabase";
import { computeInvoiceMoney, todayISO, type InvoiceDoc } from "@/lib/invoice";
import { sendReminderEmail, sendReturnReminderEmail } from "@/lib/contact-mail";
import { displayRentalOrderId } from "@/lib/display-ids";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TABLE = "vissionlink_quote_requests";
// Days relative to the due date on which a reminder fires (− = before due).
const OFFSETS = [-3, 0, 1, 7];
// Days relative to the rental end (date_to) on which a return reminder fires:
// day before, due day, one late nudge. Owners get the BCC = admin monitoring.
const RETURN_OFFSETS = [-1, 0, 1];
// Gear is out with the client in these states; left_premises (heading back),
// returned and settled stop the reminders.
const OUT_STATUSES = ["paid", "shipped", "arrived"];

function php(n: number): string {
  return "PHP " + (Number(n) || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function daysBetween(fromISO: string, toISO: string): number {
  const a = new Date(fromISO + "T00:00:00Z").getTime();
  const b = new Date(toISO + "T00:00:00Z").getTime();
  return Math.round((b - a) / 86400000);
}

// Cron-callable (Vercel cron sends Authorization: Bearer $CRON_SECRET) or admin.
function authorized(req: NextRequest): boolean {
  if (checkAdminAuth(req)) return true;
  const secret = process.env.CRON_SECRET;
  return Boolean(secret && req.headers.get("authorization") === `Bearer ${secret}`);
}

// Scan sent, unpaid invoices and email the client a balance reminder when today
// matches a reminder offset. ?dry=1 reports without sending. ?all=1 ignores the
// offset gate (sends every open balance once — for manual nudges).
async function run(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasSupabase()) return NextResponse.json({ error: "Database not configured." }, { status: 503 });

  const dry = req.nextUrl.searchParams.get("dry") === "1";
  const all = req.nextUrl.searchParams.get("all") === "1";
  const today = todayISO();
  const db = supabaseAdmin()!;
  const { data, error } = await db.from(TABLE).select("id, invoice, invoice_status").eq("invoice_status", "sent").limit(1000);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const results: { id: string; to: string; number: string; balance: number; offset: number; sent: boolean; skipped?: boolean; error?: string }[] = [];
  for (const row of data ?? []) {
    const doc = (row as { invoice?: InvoiceDoc }).invoice;
    if (!doc?.dueDate || !doc.client?.email) continue;
    const money = computeInvoiceMoney(doc, today);
    if (money.balance <= 0.01) continue; // settled
    const offset = daysBetween(doc.dueDate, today); // <0 upcoming, 0 due, >0 overdue
    if (!all && !OFFSETS.includes(offset)) continue;

    const interestNote = money.interest > 0 ? `Includes ${php(money.interest)} accrued late interest (${Math.round(doc.lateInterestMonthlyRate * 100)}%/mo, ${money.daysOverdue} day(s) overdue).` : undefined;
    if (dry) {
      results.push({ id: (row as { id: string }).id, to: doc.client.email, number: doc.number, balance: money.balance, offset, sent: false });
      continue;
    }
    const r = await sendReminderEmail({
      to: doc.client.email,
      clientName: doc.client.name,
      number: doc.number,
      balance: php(money.balance),
      dueDate: doc.dueDate,
      overdueDays: Math.max(0, offset),
      payLink: doc.payMongoLink || undefined,
      interestNote,
    });
    results.push({ id: (row as { id: string }).id, to: doc.client.email, number: doc.number, balance: money.balance, offset, sent: r.ok && !r.skipped, skipped: r.skipped, error: r.error });
  }

  // Return-date reminders: rentals out with the client whose date_to is near.
  const { data: outRows, error: outErr } = await db
    .from(TABLE)
    .select("id, order_no, name, email, date_to, fulfillment_status, cancel_status, items")
    .in("fulfillment_status", OUT_STATUSES)
    .not("date_to", "is", null)
    .limit(1000);
  if (outErr) return NextResponse.json({ error: outErr.message }, { status: 500 });

  const returns: { id: string; to: string; orderNo: string; dateTo: string; offset: number; sent: boolean; skipped?: boolean; error?: string }[] = [];
  for (const row of outRows ?? []) {
    if (row.cancel_status === "approved" || !row.email || !row.date_to) continue;
    const offset = daysBetween(row.date_to as string, today); // <0 upcoming, 0 due back today, >0 late
    if (!RETURN_OFFSETS.includes(offset)) continue;

    const orderNo = displayRentalOrderId(row.id as string, (row.order_no as string | null) ?? null);
    if (dry) {
      returns.push({ id: row.id as string, to: row.email as string, orderNo, dateTo: row.date_to as string, offset, sent: false });
      continue;
    }
    const items = Array.isArray(row.items)
      ? (row.items as { name?: string; qty?: number }[]).map((it) => `${it.name ?? "Equipment"} ×${it.qty ?? 1}`).join(", ")
      : "Rented equipment";
    const r = await sendReturnReminderEmail({
      to: row.email as string,
      clientName: (row.name as string | null) ?? "",
      orderNo,
      dateTo: row.date_to as string,
      daysLeft: -offset,
      items,
    });
    returns.push({ id: row.id as string, to: row.email as string, orderNo, dateTo: row.date_to as string, offset, sent: r.ok && !r.skipped, skipped: r.skipped, error: r.error });
  }

  return NextResponse.json({ ok: true, date: today, dry, scanned: data?.length ?? 0, reminders: results.length, results, returnsScanned: outRows?.length ?? 0, returnReminders: returns.length, returns });
}

export const GET = run; // Vercel cron calls GET
export const POST = run; // manual "run now" from admin
