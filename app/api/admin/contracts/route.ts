import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "../_auth";
import { hasSupabase, supabaseAdmin } from "@/lib/supabase";
import { type QuotationDoc } from "@/lib/quotation";
import { generateContract, contractReadyToSend, type ContractDoc } from "@/lib/contract";
import { renderContractPdf } from "@/lib/contract-pdf";
import { sendDocumentEmail } from "@/lib/contact-mail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TABLE = "vissionlink_quote_requests";
const BUCKET = "contracts";

type Row = {
  id: string;
  date_from?: string | null;
  date_to?: string | null;
  quotation?: QuotationDoc | null;
  contract?: ContractDoc | null;
  contract_status?: string | null;
  contract_pdf_path?: string | null;
  contract_sent_at?: string | null;
};

async function loadRow(id: string): Promise<Row | null> {
  const db = supabaseAdmin()!;
  const { data, error } = await db.from(TABLE).select("*").eq("id", id).maybeSingle();
  if (error || !data) return null;
  return data as Row;
}

const today = () => new Date().toISOString().slice(0, 10);

// GET ?requestId=… — saved contract, or a fresh draft generated from the agreed
// quotation. ?format=pdf streams the PDF.
export async function GET(req: NextRequest) {
  if (!checkAdminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasSupabase()) return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  const id = req.nextUrl.searchParams.get("requestId");
  if (!id) return NextResponse.json({ error: "Missing requestId." }, { status: 400 });

  const row = await loadRow(id);
  if (!row) return NextResponse.json({ error: "Request not found." }, { status: 404 });
  if (!row.quotation) return NextResponse.json({ error: "Build the quotation first." }, { status: 400 });

  const doc: ContractDoc = row.contract ?? generateContract(row.quotation, { rentalFrom: row.date_from ?? null, rentalTo: row.date_to ?? null, agreementDate: today() });

  if (req.nextUrl.searchParams.get("format") === "pdf") {
    const pdf = await renderContractPdf(doc);
    return new NextResponse(new Uint8Array(pdf), {
      headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${doc.number}.pdf"` },
    });
  }

  return NextResponse.json({
    doc,
    status: row.contract_status ?? "none",
    saved: Boolean(row.contract),
    pdfPath: row.contract_pdf_path ?? null,
    sentAt: row.contract_sent_at ?? null,
  });
}

// PUT ?requestId=… — save the edited contract as a draft (no email).
export async function PUT(req: NextRequest) {
  if (!checkAdminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasSupabase()) return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  const id = req.nextUrl.searchParams.get("requestId");
  const body = await req.json().catch(() => ({}));
  const doc = body.doc as ContractDoc | undefined;
  if (!id || !doc || !Array.isArray(doc.lines)) return NextResponse.json({ error: "Missing requestId or contract." }, { status: 400 });

  const db = supabaseAdmin()!;
  const row = await loadRow(id);
  const nextStatus = row?.contract_status === "sent" || row?.contract_status === "signed" ? row.contract_status : "draft";
  const { error } = await db.from(TABLE).update({ contract: doc, contract_status: nextStatus }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, status: nextStatus });
}

// POST ?requestId=… — render the PDF, store a private copy, email the client,
// and mark the contract sent.
export async function POST(req: NextRequest) {
  if (!checkAdminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasSupabase()) return NextResponse.json({ error: "Database not configured." }, { status: 503 });
  const id = req.nextUrl.searchParams.get("requestId");
  const body = await req.json().catch(() => ({}));
  const doc = body.doc as ContractDoc | undefined;
  const message = typeof body.message === "string" ? body.message : "";
  if (!id || !doc) return NextResponse.json({ error: "Missing requestId or contract." }, { status: 400 });

  const problem = contractReadyToSend(doc);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  const db = supabaseAdmin()!;
  const pdf = await renderContractPdf(doc);

  const { data: bucket } = await db.storage.getBucket(BUCKET);
  if (!bucket) {
    const { error: bucketErr } = await db.storage.createBucket(BUCKET, { public: false });
    if (bucketErr && !/already exists/i.test(bucketErr.message)) return NextResponse.json({ error: bucketErr.message }, { status: 500 });
  }
  const path = `${id}/${doc.number}.pdf`;
  const { error: upErr } = await db.storage.from(BUCKET).upload(path, new Uint8Array(pdf), { contentType: "application/pdf", upsert: true });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  const mail = await sendDocumentEmail({ to: doc.client.email, clientName: doc.client.name, kind: "Contract", number: doc.number, pdf, message });
  if (!mail.ok) return NextResponse.json({ error: mail.error || "Could not email the client." }, { status: 502 });

  const sentAt = new Date().toISOString();
  const { error } = await db.from(TABLE).update({ contract: doc, contract_status: "sent", contract_pdf_path: path, contract_sent_at: sentAt }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, sentAt, pdfPath: path, emailSkipped: Boolean(mail.skipped) });
}
