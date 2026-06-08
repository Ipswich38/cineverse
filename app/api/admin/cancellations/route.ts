import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "../_auth";
import { hasSupabase, supabaseAdmin } from "@/lib/supabase";
import { createRefund } from "@/lib/paymongo";
import { generateCreditMemo } from "@/lib/credit-memo";
import { renderCreditMemoPdf } from "@/lib/credit-memo-pdf";
import { storePdf, releaseUnits } from "@/lib/rental-finalize";
import { ensureClient } from "@/lib/clients-db";
import { sendDocumentEmail, sendCancellationDecisionEmail } from "@/lib/contact-mail";
import { peso } from "@/lib/rental-pricing";
import { isValidCategory } from "@/lib/cancellation";
import { displayRentalOrderId } from "@/lib/display-ids";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TABLE = "vissionlink_quote_requests";
const today = () => new Date().toISOString().slice(0, 10);
const num = (v: unknown) => Math.max(0, Number(v) || 0);
const str = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : "");

// POST — approve a cancellation: refund (PayMongo or manual), generate a credit
// memo, release held units, email the client. Admin-only.
export async function POST(req: NextRequest) {
  if (!checkAdminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasSupabase()) return NextResponse.json({ error: "Database not configured." }, { status: 503 });

  const b = await req.json().catch(() => ({} as Record<string, unknown>));
  const orderId = str(b.orderId, 80);
  if (!orderId) return NextResponse.json({ error: "Missing order id." }, { status: 400 });
  const reasonCategory = isValidCategory(b.reasonCategory) ? String(b.reasonCategory) : "Other (please explain)";
  const reason = str(b.reason, 4000);
  const note = str(b.note, 4000);

  const db = supabaseAdmin()!;
  const { data: row, error } = await db.from(TABLE).select("*").eq("id", orderId).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!row) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  if (row.fulfillment_status === "cancelled" || row.cancel_status === "refunded" || row.cancel_status === "cancelled") {
    return NextResponse.json({ error: "This order is already cancelled." }, { status: 409 });
  }

  const amountPaid = num(row.amount_paid);
  const refundAmount = Math.min(num(b.refundAmount), amountPaid); // never refund more than collected

  // 1) Move the money. Prefer a PayMongo refund against the recorded payment id;
  // fall back to a manual/offline record if there's no usable ref or the API fails.
  let refundMethod: "paymongo" | "offline" = "offline";
  let refundRef: string | null = null;
  const payRef = String(row.payment_ref ?? "");
  if (refundAmount > 0 && /^pay_/.test(payRef)) {
    try {
      const r = await createRefund({ paymentId: payRef, amount: refundAmount, notes: `Order ${displayRentalOrderId(orderId, typeof row.order_no === "string" ? row.order_no : null)} cancellation` });
      refundMethod = "paymongo";
      refundRef = r.id || null;
    } catch (err) {
      console.error("[cancellation:refund] PayMongo refund failed, falling back to offline:", err);
      refundMethod = "offline";
    }
  }

  // 2) Credit memo.
  const day = today();
  const orderNo = displayRentalOrderId(orderId, typeof row.order_no === "string" ? row.order_no : null);
  const number = `BMR-CM-${day.replace(/-/g, "")}-${orderNo.slice(-4).toUpperCase()}`;
  const client = {
    name: String(row.name ?? ""), company: String(row.company ?? ""),
    email: String(row.email ?? ""), phone: String(row.phone ?? ""), project: String(row.project ?? ""),
  };
  const originalInvoiceNo = String((row.invoice as { number?: string } | null)?.number ?? "—");
  const memo = generateCreditMemo({
    number, issueDate: day, orderNo, originalInvoiceNo, client,
    amountPaid, creditAmount: refundAmount, refundMethod, refundRef,
    reasonCategory, reason, note,
  });
  let memoPath: string | null = null;
  try {
    const pdf = await renderCreditMemoPdf(memo);
    memoPath = `${orderId}/${number}.pdf`;
    await storePdf("credit-memos", memoPath, pdf);

    // 3) Release any units held for this order.
    await releaseUnits(orderId);

    // 4) Persist the cancellation on the order.
    const now = new Date().toISOString();
    await db.from(TABLE).update({
      fulfillment_status: "cancelled",
      cancel_status: refundAmount > 0 ? "refunded" : "cancelled",
      cancel_reason_category: reasonCategory,
      cancel_reason: reason || row.cancel_reason,
      cancel_admin_note: note,
      refund_amount: refundAmount,
      refund_method: refundMethod,
      refund_ref: refundRef,
      refunded_at: now,
      credit_memo_no: number,
      credit_memo_pdf_path: memoPath,
    }).eq("id", orderId);

    // Keep the CRM record fresh (no loyalty credit on a cancellation).
    await ensureClient(client.email, { name: client.name, company: client.company, phone: client.phone });

    // 5) Notify the client — decision summary + the credit memo PDF.
    await Promise.allSettled([
      sendCancellationDecisionEmail({ to: client.email, clientName: client.name, orderNo, decision: "approved", note, refundAmount: refundAmount > 0 ? peso(refundAmount) : undefined, refundMethod }),
      sendDocumentEmail({ to: client.email, clientName: client.name, kind: "Credit Memo", number, pdf, message: `This credit memo confirms the cancellation of order ${orderNo}.` }),
    ]);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Could not complete the cancellation." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, creditMemoNo: number, refundAmount, refundMethod, refundRef });
}

// PATCH — decline a client's cancellation request. Order stays active.
export async function PATCH(req: NextRequest) {
  if (!checkAdminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasSupabase()) return NextResponse.json({ error: "Database not configured." }, { status: 503 });

  const b = await req.json().catch(() => ({} as Record<string, unknown>));
  const orderId = str(b.orderId, 80);
  const note = str(b.note, 4000);
  if (!orderId) return NextResponse.json({ error: "Missing order id." }, { status: 400 });

  const db = supabaseAdmin()!;
  const { data: row } = await db.from(TABLE).select("id,name,email,order_no").eq("id", orderId).maybeSingle();
  if (!row) return NextResponse.json({ error: "Order not found." }, { status: 404 });

  await db.from(TABLE).update({ cancel_status: "declined", cancel_admin_note: note }).eq("id", orderId);
  await sendCancellationDecisionEmail({ to: String(row.email), clientName: String(row.name ?? ""), orderNo: displayRentalOrderId(orderId, typeof row.order_no === "string" ? row.order_no : null), decision: "declined", note });

  return NextResponse.json({ ok: true });
}
