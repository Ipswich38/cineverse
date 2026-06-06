// ── Finalize a paid instant rental ───────────────────────────────────────────
// Runs once a PayMongo payment settles (called by the webhook, and by the
// success page as a fallback). Reuses the admin document pipeline: builds a
// quotation from the order's cart lines, generates the lease contract + invoice
// (full rental + refundable security recorded as paid), reserves inventory, and
// emails the customer both PDFs. Idempotent — guarded by an optimistic claim on
// fulfillment_status so the webhook and the fallback can't double-process.
import { supabaseAdmin } from "@/lib/supabase";
import { computeTotals, type QuotationDoc, type QuotationLine } from "@/lib/quotation";
import { generateContract } from "@/lib/contract";
import { renderContractPdf } from "@/lib/contract-pdf";
import { generateInvoice, type InvoiceDoc, type PaymentEntry } from "@/lib/invoice";
import { renderInvoicePdf } from "@/lib/invoice-pdf";
import { sendDocumentEmail } from "@/lib/contact-mail";
import { planAssignment, type AssignUnit } from "@/lib/unit-assign";
import { DOWNPAYMENT_RATE } from "@/lib/rental-pricing";
import { BMR_BUSINESS, FINANCE, QUOTATION_TERMS } from "@/lib/bmr-rate-card";

const TABLE = "vissionlink_quote_requests";
const UNITS = "vissionlink_units";
const today = () => new Date().toISOString().slice(0, 10);

type OrderItem = { id?: string; name?: string; qty?: number; days?: number; ratePerDay?: number; securityDeposit?: number };

function buildQuotation(row: Record<string, unknown>, items: OrderItem[], day: string): QuotationDoc {
  const lines: QuotationLine[] = items.map((it, i) => ({
    id: `ln-${i}-${Math.random().toString(36).slice(2, 6)}`,
    description: String(it.name ?? "Equipment rental"),
    qty: Math.max(1, Math.floor(Number(it.qty) || 1)),
    days: Math.max(1, Math.floor(Number(it.days) || 1)),
    unitRate: Number(it.ratePerDay) || 0,
  }));
  const number = `BMR-Q-${day.replace(/-/g, "")}-${String(row.id).slice(-4).toUpperCase()}`;
  return {
    number,
    issueDate: day,
    validUntil: day,
    client: {
      name: String(row.name ?? ""),
      company: String(row.company ?? ""),
      email: String(row.email ?? ""),
      phone: String(row.phone ?? ""),
      project: String(row.project ?? ""),
    },
    lines,
    laborLines: [],
    applySurcharge: false,
    surchargeRate: FINANCE.outOfTownSurchargeRate,
    specialDiscountRate: 0,
    paymentTerms: "Paid in full online at checkout (rental + refundable security deposit).",
    notes: String(row.notes ?? ""),
    terms: [...QUOTATION_TERMS],
    signatureDataUrl: null,
    signedBy: BMR_BUSINESS.proprietor,
    signedDate: day,
  };
}

async function storePdf(bucket: string, path: string, pdf: Buffer) {
  const db = supabaseAdmin()!;
  const { data: b } = await db.storage.getBucket(bucket);
  if (!b) {
    const { error } = await db.storage.createBucket(bucket, { public: false });
    if (error && !/already exists/i.test(error.message)) return;
  }
  await db.storage.from(bucket).upload(path, new Uint8Array(pdf), { contentType: "application/pdf", upsert: true });
}

async function reserveUnits(orderId: string, lines: QuotationLine[]) {
  const db = supabaseAdmin()!;
  const { data: units } = await db.from(UNITS).select("id,name,category,status,assigned_request_id").limit(5000);
  const plan = planAssignment(lines.map((l) => ({ id: l.id, description: l.description, qty: l.qty })), (units as AssignUnit[]) ?? [], orderId);
  if (plan.assignUnitIds.length) {
    await db.from(UNITS).update({ status: "rented", assigned_request_id: orderId, updated_at: new Date().toISOString() }).in("id", plan.assignUnitIds);
  }
}

export type FinalizeResult = { ok: boolean; alreadyDone?: boolean; error?: string };

export async function finalizeRentalOrder(orderId: string): Promise<FinalizeResult> {
  const db = supabaseAdmin()!;

  // Optimistic claim: only one caller flips pending_payment → processing.
  const claim = await db.from(TABLE).update({ fulfillment_status: "processing" }).eq("id", orderId).eq("fulfillment_status", "pending_payment").select("*").maybeSingle();
  if (claim.error) return { ok: false, error: claim.error.message };
  if (!claim.data) {
    const { data: cur } = await db.from(TABLE).select("fulfillment_status").eq("id", orderId).maybeSingle();
    if (!cur) return { ok: false, error: "Order not found." };
    return { ok: true, alreadyDone: true }; // already claimed/finished by the other path
  }
  const row = claim.data as Record<string, unknown>;

  try {
    const day = today();
    const items = Array.isArray(row.items) ? (row.items as OrderItem[]) : [];
    const quotation = buildQuotation(row, items, day);
    const rentalTotal = computeTotals(quotation).total;
    // The customer paid a downpayment online; the balance is settled later.
    const downpayment = Math.round(rentalTotal * DOWNPAYMENT_RATE);
    const ref = String(row.payment_ref ?? orderId);

    const contract = generateContract(quotation, { rentalFrom: String(row.date_from ?? day), rentalTo: String(row.date_to ?? row.date_from ?? day), agreementDate: day });

    const invoice: InvoiceDoc = generateInvoice(quotation, { issueDate: day, depositRate: 0 });
    invoice.depositRequired = 0;
    const payments: PaymentEntry[] = [];
    if (downpayment > 0) payments.push({ id: `pay-${Date.now()}-dp`, date: day, channel: "paymongo", amount: downpayment, reference: ref, kind: "payment" });
    invoice.payments = payments; // balance (rental − downpayment) remains due

    const [contractPdf, invoicePdf] = await Promise.all([renderContractPdf(contract), renderInvoicePdf(invoice)]);
    const contractPath = `${orderId}/${contract.number}.pdf`;
    const invoicePath = `${orderId}/${invoice.number}.pdf`;
    await Promise.all([storePdf("contracts", contractPath, contractPdf), storePdf("invoices", invoicePath, invoicePdf)]);

    // Email the customer both documents (best-effort; don't fail the order on a mail hiccup).
    const note = "Thank you for your booking. Your rental contract and invoice are attached — the downpayment is recorded and the remaining balance is shown as due (settled before or upon handover). We'll be in touch to arrange pickup / delivery for your dates.";
    await Promise.allSettled([
      sendDocumentEmail({ to: quotation.client.email, clientName: quotation.client.name, kind: "Contract", number: contract.number, pdf: contractPdf, message: note }),
      sendDocumentEmail({ to: quotation.client.email, clientName: quotation.client.name, kind: "Invoice", number: invoice.number, pdf: invoicePdf, message: note }),
    ]);

    await reserveUnits(orderId, quotation.lines);

    const now = new Date().toISOString();
    await db.from(TABLE).update({
      quotation, quotation_status: "sent", quotation_agreed_at: now,
      contract, contract_status: "sent", contract_pdf_path: contractPath, contract_sent_at: now,
      invoice, invoice_status: "sent", invoice_pdf_path: invoicePath, invoice_sent_at: now,
      status: "responded", fulfillment_status: "paid", paid_at: now,
    }).eq("id", orderId);

    return { ok: true };
  } catch (err) {
    // Release the claim so it can be retried (webhook will fire again).
    await db.from(TABLE).update({ fulfillment_status: "pending_payment" }).eq("id", orderId);
    return { ok: false, error: err instanceof Error ? err.message : "Finalize failed." };
  }
}
