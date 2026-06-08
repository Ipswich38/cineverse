import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "../_auth";
import { hasSupabase, supabaseAdmin } from "@/lib/supabase";
import { generateDraft, type QuotationDoc, type QuotationLine } from "@/lib/quotation";
import { computeInvoiceMoney, generateInvoice, invoiceReadyToSend, type InvoiceDoc } from "@/lib/invoice";
import { renderInvoicePdf } from "@/lib/invoice-pdf";
import { sendDocumentEmail } from "@/lib/contact-mail";
import { getClient, creditCleanRental } from "@/lib/clients-db";
import { policyFor } from "@/lib/clients";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TABLE = "vissionlink_quote_requests";
const BUCKET = "invoices";

type Row = {
  id: string;
  quotation?: QuotationDoc | null;
  invoice?: InvoiceDoc | null;
  invoice_status?: string | null;
  invoice_pdf_path?: string | null;
  invoice_sent_at?: string | null;
  name?: string | null;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  project?: string | null;
  notes?: string | null;
  items?: { id?: string; slug?: string; name?: string; qty?: number; days?: number; ratePerDay?: number }[] | null;
};

async function loadRow(id: string): Promise<Row | null> {
  const db = supabaseAdmin()!;
  const { data, error } = await db.from(TABLE).select("*").eq("id", id).maybeSingle();
  if (error || !data) return null;
  return data as Row;
}

const today = () => new Date().toISOString().slice(0, 10);

function sourcePricing(row: Row): QuotationDoc | null {
  if (row.quotation) return row.quotation;
  const items = Array.isArray(row.items) ? row.items : [];
  if (!items.length) return null;
  const draft = generateDraft({ ...row, items: items.map((item) => ({ slug: item.slug ?? item.id, name: item.name })) });
  const lines: QuotationLine[] = items.map((item, i) => ({
    id: `ln-${row.id}-${i}`,
    description: item.name ?? item.slug ?? item.id ?? "Equipment rental",
    qty: Math.max(1, Math.floor(Number(item.qty) || 1)),
    days: Math.max(1, Math.floor(Number(item.days) || 1)),
    unitRate: Number(item.ratePerDay) || 0,
  }));
  return { ...draft, lines, signedBy: draft.signedBy || "Benito M. Remulta Jr.", signedDate: draft.signedDate || today() };
}

// GET ?requestId=… — saved invoice, or a fresh draft from the agreed quotation.
// ?format=pdf streams the PDF.
export async function GET(req: NextRequest) {
  if (!checkAdminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasSupabase()) return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  const id = req.nextUrl.searchParams.get("requestId");
  if (!id) return NextResponse.json({ error: "Missing requestId." }, { status: 400 });

  const row = await loadRow(id);
  if (!row) return NextResponse.json({ error: "Request not found." }, { status: 404 });
  const quotation = sourcePricing(row);
  if (!quotation) return NextResponse.json({ error: "Save source pricing first." }, { status: 400 });

  // Prefill loyalty discount + required deposit from the client's standing/tier.
  let doc: InvoiceDoc;
  if (row.invoice) {
    doc = row.invoice;
  } else {
    const client = await getClient(quotation.client.email);
    const policy = policyFor(client);
    doc = generateInvoice(quotation, { issueDate: today(), loyaltyRate: policy.loyaltyRate, depositRate: policy.depositRate });
  }

  if (req.nextUrl.searchParams.get("format") === "pdf") {
    try {
      const pdf = await renderInvoicePdf(doc);
      return new NextResponse(new Uint8Array(pdf), {
        headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${doc.number}.pdf"` },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "PDF render failed.";
      return NextResponse.json({ error: `Could not render the invoice PDF: ${msg}` }, { status: 500 });
    }
  }

  const client = await getClient(doc.client.email);
  return NextResponse.json({
    doc,
    status: row.invoice_status ?? "none",
    saved: Boolean(row.invoice),
    pdfPath: row.invoice_pdf_path ?? null,
    sentAt: row.invoice_sent_at ?? null,
    policy: policyFor(client),
  });
}

// When an invoice is fully settled, advance the client's loyalty ledger once
// (guarded by the invoice's loyaltyCredited flag). Mutates `doc` so the guard is
// persisted by the caller's save. Returns whether a credit was applied.
async function creditIfSettled(doc: InvoiceDoc): Promise<boolean> {
  if (doc.loyaltyCredited) return false;
  const m = computeInvoiceMoney(doc);
  if (m.status !== "paid") return false;
  await creditCleanRental(doc.client.email, m.paid, { name: doc.client.name, company: doc.client.company, phone: doc.client.phone });
  doc.loyaltyCredited = true;
  return true;
}

// PUT ?requestId=… — save the edited invoice as a draft (also used to record
// payments without re-sending).
export async function PUT(req: NextRequest) {
  if (!checkAdminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasSupabase()) return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  const id = req.nextUrl.searchParams.get("requestId");
  const body = await req.json().catch(() => ({}));
  const doc = body.doc as InvoiceDoc | undefined;
  if (!id || !doc || !Array.isArray(doc.lines)) return NextResponse.json({ error: "Missing requestId or invoice." }, { status: 400 });

  const db = supabaseAdmin()!;
  const row = await loadRow(id);
  const nextStatus = row?.invoice_status === "sent" ? "sent" : "draft";
  const credited = await creditIfSettled(doc); // advances client loyalty when fully paid
  const { error } = await db.from(TABLE).update({ invoice: doc, invoice_status: nextStatus }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, status: nextStatus, loyaltyCredited: credited });
}

// POST ?requestId=… — render the PDF, store a private copy, email the client,
// and mark the invoice sent.
export async function POST(req: NextRequest) {
  if (!checkAdminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasSupabase()) return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  const id = req.nextUrl.searchParams.get("requestId");
  const body = await req.json().catch(() => ({}));
  const doc = body.doc as InvoiceDoc | undefined;
  const message = typeof body.message === "string" ? body.message : "";
  if (!id || !doc) return NextResponse.json({ error: "Missing requestId or invoice." }, { status: 400 });

  const problem = invoiceReadyToSend(doc);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  const db = supabaseAdmin()!;
  let pdf: Buffer;
  try {
    pdf = await renderInvoicePdf(doc);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "PDF render failed.";
    return NextResponse.json({ error: `Could not render the invoice PDF: ${msg}` }, { status: 500 });
  }

  const { data: bucket } = await db.storage.getBucket(BUCKET);
  if (!bucket) {
    const { error: bucketErr } = await db.storage.createBucket(BUCKET, { public: false });
    if (bucketErr && !/already exists/i.test(bucketErr.message)) return NextResponse.json({ error: bucketErr.message }, { status: 500 });
  }
  const path = `${id}/${doc.number}.pdf`;
  const { error: upErr } = await db.storage.from(BUCKET).upload(path, new Uint8Array(pdf), { contentType: "application/pdf", upsert: true });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  const mail = await sendDocumentEmail({ to: doc.client.email, clientName: doc.client.name, kind: "Invoice", number: doc.number, pdf, message });
  if (!mail.ok) return NextResponse.json({ error: mail.error || "Could not email the client." }, { status: 502 });

  await creditIfSettled(doc); // settle-on-send if already fully paid
  const sentAt = new Date().toISOString();
  const { error } = await db.from(TABLE).update({ invoice: doc, invoice_status: "sent", invoice_pdf_path: path, invoice_sent_at: sentAt }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, sentAt, pdfPath: path, emailSkipped: Boolean(mail.skipped) });
}

// DELETE ?requestId=… — discard the invoice: clear its columns (the next open
// regenerates a fresh draft from the agreed quotation) and drop the stored PDF.
export async function DELETE(req: NextRequest) {
  if (!checkAdminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasSupabase()) return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  const id = req.nextUrl.searchParams.get("requestId");
  if (!id) return NextResponse.json({ error: "Missing requestId." }, { status: 400 });
  const db = supabaseAdmin()!;
  const { data: files } = await db.storage.from(BUCKET).list(id);
  if (files?.length) await db.storage.from(BUCKET).remove(files.map((f) => `${id}/${f.name}`));
  const { error } = await db.from(TABLE).update({ invoice: null, invoice_status: "none", invoice_pdf_path: null, invoice_sent_at: null }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
