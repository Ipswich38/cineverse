import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "../_auth";
import { hasSupabase, supabaseAdmin } from "@/lib/supabase";
import { generateDraft, quotationReadyToSend, type QuotationDoc, type QuoteRequestInput } from "@/lib/quotation";
import { renderQuotationPdf } from "@/lib/quotation-pdf";
import { sendQuotationEmail } from "@/lib/contact-mail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TABLE = "vissionlink_quote_requests";
// Private bucket holding the sent quotation PDFs — record copies, not public.
const BUCKET = "quotations";

type RequestRow = QuoteRequestInput & {
  status?: string;
  quotation?: QuotationDoc | null;
  quotation_status?: string | null;
  quotation_pdf_path?: string | null;
  quotation_sent_at?: string | null;
};

async function loadRequest(id: string): Promise<RequestRow | null> {
  const db = supabaseAdmin()!;
  const { data, error } = await db.from(TABLE).select("*").eq("id", id).maybeSingle();
  if (error || !data) return null;
  return data as RequestRow;
}

// GET ?requestId=… — return the saved quotation, or a fresh draft generated from
// the request if none has been built yet. ?format=pdf streams the PDF instead.
export async function GET(req: NextRequest) {
  if (!checkAdminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasSupabase()) return NextResponse.json({ error: "Database not configured." }, { status: 503 });

  const id = req.nextUrl.searchParams.get("requestId");
  if (!id) return NextResponse.json({ error: "Missing requestId." }, { status: 400 });

  const row = await loadRequest(id);
  if (!row) return NextResponse.json({ error: "Quote request not found." }, { status: 404 });

  const doc: QuotationDoc = row.quotation ?? generateDraft(row);

  if (req.nextUrl.searchParams.get("format") === "pdf") {
    try {
      const pdf = await renderQuotationPdf(doc);
      return new NextResponse(new Uint8Array(pdf), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="${doc.number}.pdf"`,
        },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "PDF render failed.";
      return NextResponse.json({ error: `Could not render the quotation PDF: ${msg}` }, { status: 500 });
    }
  }

  return NextResponse.json({
    doc,
    status: row.quotation_status ?? "none",
    saved: Boolean(row.quotation),
    pdfPath: row.quotation_pdf_path ?? null,
    sentAt: row.quotation_sent_at ?? null,
  });
}

// PUT ?requestId=… — save the edited quotation as a draft (no email).
export async function PUT(req: NextRequest) {
  if (!checkAdminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasSupabase()) return NextResponse.json({ error: "Database not configured." }, { status: 503 });

  const id = req.nextUrl.searchParams.get("requestId");
  const body = await req.json().catch(() => ({}));
  const doc = body.doc as QuotationDoc | undefined;
  if (!id || !doc || !Array.isArray(doc.lines)) {
    return NextResponse.json({ error: "Missing requestId or quotation." }, { status: 400 });
  }

  const db = supabaseAdmin()!;
  // Don't downgrade an already-sent quotation back to draft on a re-save.
  const row = await loadRequest(id);
  const nextStatus = row?.quotation_status === "sent" ? "sent" : "draft";
  const { error } = await db.from(TABLE).update({ quotation: doc, quotation_status: nextStatus }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, status: nextStatus });
}

// POST ?requestId=… — finalize: render the PDF, store a private copy, email the
// client, and mark the quotation sent (and the request responded).
export async function POST(req: NextRequest) {
  if (!checkAdminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasSupabase()) return NextResponse.json({ error: "Database not configured." }, { status: 503 });

  const id = req.nextUrl.searchParams.get("requestId");
  const body = await req.json().catch(() => ({}));
  const doc = body.doc as QuotationDoc | undefined;
  const message = typeof body.message === "string" ? body.message : "";
  if (!id || !doc) return NextResponse.json({ error: "Missing requestId or quotation." }, { status: 400 });

  const problem = quotationReadyToSend(doc);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  const db = supabaseAdmin()!;
  let pdf: Buffer;
  try {
    pdf = await renderQuotationPdf(doc);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "PDF render failed.";
    return NextResponse.json({ error: `Could not render the quotation PDF: ${msg}` }, { status: 500 });
  }

  // Store a private record copy of the PDF. Bucket is created on first use.
  const { data: bucket } = await db.storage.getBucket(BUCKET);
  if (!bucket) {
    const { error: bucketErr } = await db.storage.createBucket(BUCKET, { public: false });
    if (bucketErr && !/already exists/i.test(bucketErr.message)) {
      return NextResponse.json({ error: bucketErr.message }, { status: 500 });
    }
  }
  const path = `${id}/${doc.number}.pdf`;
  const { error: upErr } = await db.storage.from(BUCKET).upload(path, new Uint8Array(pdf), {
    contentType: "application/pdf",
    upsert: true,
  });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  // Email the client with the PDF attached.
  const mail = await sendQuotationEmail({
    to: doc.client.email,
    clientName: doc.client.name,
    number: doc.number,
    pdf,
    message,
  });
  if (!mail.ok) return NextResponse.json({ error: mail.error || "Could not email the client." }, { status: 502 });

  const sentAt = new Date().toISOString();
  const { error } = await db
    .from(TABLE)
    .update({ quotation: doc, quotation_status: "sent", quotation_pdf_path: path, quotation_sent_at: sentAt, status: "responded" })
    .eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, sentAt, pdfPath: path, emailSkipped: Boolean(mail.skipped) });
}

// DELETE ?requestId=… — discard the quotation: clear its columns (so the next
// open rebuilds a fresh draft) and remove the stored PDF copy. Leaves the quote
// request itself intact.
export async function DELETE(req: NextRequest) {
  if (!checkAdminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasSupabase()) return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  const id = req.nextUrl.searchParams.get("requestId");
  if (!id) return NextResponse.json({ error: "Missing requestId." }, { status: 400 });
  const db = supabaseAdmin()!;
  const { data: files } = await db.storage.from(BUCKET).list(id);
  if (files?.length) await db.storage.from(BUCKET).remove(files.map((f) => `${id}/${f.name}`));
  const { error } = await db.from(TABLE).update({ quotation: null, quotation_status: "none", quotation_pdf_path: null, quotation_sent_at: null }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
