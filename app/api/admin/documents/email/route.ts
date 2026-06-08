import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "../../_auth";
import { hasSupabase, supabaseAdmin } from "@/lib/supabase";
import { type QuotationDoc } from "@/lib/quotation";
import { type ContractDoc } from "@/lib/contract";
import { type InvoiceDoc } from "@/lib/invoice";
import { renderQuotationPdf } from "@/lib/quotation-pdf";
import { renderContractPdf } from "@/lib/contract-pdf";
import { renderInvoicePdf } from "@/lib/invoice-pdf";
import { sendDocumentsEmail } from "@/lib/contact-mail";
import { displayRentalOrderId } from "@/lib/display-ids";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TABLE = "vissionlink_quote_requests";
type AttachmentKey = "quotation" | "contract" | "invoice" | "creditMemo";

type Row = {
  id: string;
  order_no?: string | null;
  name?: string | null;
  email?: string | null;
  quotation?: QuotationDoc | null;
  contract?: ContractDoc | null;
  invoice?: InvoiceDoc | null;
  credit_memo_no?: string | null;
  credit_memo_pdf_path?: string | null;
};

const isAttachment = (v: unknown): v is AttachmentKey =>
  v === "quotation" || v === "contract" || v === "invoice" || v === "creditMemo";

async function storedCreditMemo(path: string): Promise<Buffer | null> {
  const db = supabaseAdmin()!;
  const { data, error } = await db.storage.from("credit-memos").download(path);
  if (error || !data) return null;
  return Buffer.from(await data.arrayBuffer());
}

export async function POST(req: NextRequest) {
  if (!checkAdminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasSupabase()) return NextResponse.json({ error: "Database not configured." }, { status: 503 });

  const body = await req.json().catch(() => ({}));
  const id = typeof body.requestId === "string" ? body.requestId : "";
  const selected = Array.isArray(body.attachments) ? body.attachments.filter(isAttachment) : [];
  const message = typeof body.message === "string" ? body.message : "";
  if (!id) return NextResponse.json({ error: "Missing request id." }, { status: 400 });
  if (selected.length === 0) return NextResponse.json({ error: "Choose at least one document to attach." }, { status: 400 });

  const db = supabaseAdmin()!;
  const { data, error } = await db.from(TABLE).select("*").eq("id", id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Request not found." }, { status: 404 });
  const row = data as Row;
  if (!row.email) return NextResponse.json({ error: "Client email is missing." }, { status: 400 });

  const attachments: { filename: string; content: Buffer }[] = [];
  for (const key of selected) {
    if (key === "quotation") {
      if (!row.quotation) return NextResponse.json({ error: "Save a quotation before attaching it." }, { status: 400 });
      attachments.push({ filename: `${row.quotation.number}.pdf`, content: await renderQuotationPdf(row.quotation) });
    }
    if (key === "contract") {
      if (!row.contract) return NextResponse.json({ error: "Save a contract before attaching it." }, { status: 400 });
      attachments.push({ filename: `${row.contract.number}.pdf`, content: await renderContractPdf(row.contract) });
    }
    if (key === "invoice") {
      if (!row.invoice) return NextResponse.json({ error: "Save an invoice before attaching it." }, { status: 400 });
      attachments.push({ filename: `${row.invoice.number}.pdf`, content: await renderInvoicePdf(row.invoice) });
    }
    if (key === "creditMemo") {
      if (!row.credit_memo_pdf_path) return NextResponse.json({ error: "Generate a credit memo before attaching it." }, { status: 400 });
      const pdf = await storedCreditMemo(row.credit_memo_pdf_path);
      if (!pdf) return NextResponse.json({ error: "Could not load the stored credit memo." }, { status: 500 });
      attachments.push({ filename: `${row.credit_memo_no ?? "credit-memo"}.pdf`, content: pdf });
    }
  }

  const mail = await sendDocumentsEmail({
    to: row.email,
    clientName: row.name ?? "",
    subjectRef: displayRentalOrderId(row.id, row.order_no ?? null),
    message,
    attachments,
  });
  if (!mail.ok) return NextResponse.json({ error: mail.error || "Could not email the client." }, { status: 502 });

  const now = new Date().toISOString();
  const patch: Record<string, unknown> = {};
  if (selected.includes("quotation")) Object.assign(patch, { quotation_status: "sent", quotation_sent_at: now, status: "responded" });
  if (selected.includes("contract")) Object.assign(patch, { contract_status: "sent", contract_sent_at: now });
  if (selected.includes("invoice")) Object.assign(patch, { invoice_status: "sent", invoice_sent_at: now });
  if (Object.keys(patch).length) await db.from(TABLE).update(patch).eq("id", id);

  return NextResponse.json({ ok: true, emailSkipped: Boolean(mail.skipped), sentAt: now, sent: selected });
}
