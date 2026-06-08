// ── Finalize a paid instant rental ───────────────────────────────────────────
// Runs once a PayMongo payment settles (called by the webhook, and by the
// success page as a fallback). Reuses the admin document pipeline: builds a
// quotation from the order's cart lines, generates the lease contract + invoice
// (full rental + refundable security recorded as paid), reserves inventory, and
// emails the customer both PDFs. Idempotent — guarded by an optimistic claim on
// fulfillment_status so the webhook and the fallback can't double-process.
import { supabaseAdmin } from "@/lib/supabase";
import { computeTotals, type QuotationDoc, type QuotationLine } from "@/lib/quotation";
import { getCheckoutSession, extractPaymentInfo } from "@/lib/paymongo";
import { ensureClient } from "@/lib/clients-db";
import { generateContract } from "@/lib/contract";
import { renderContractPdf } from "@/lib/contract-pdf";
import { generateInvoice, type InvoiceDoc, type PaymentEntry, type PaymentChannel } from "@/lib/invoice";
import { renderInvoicePdf } from "@/lib/invoice-pdf";
import { sendOrderConfirmationEmail } from "@/lib/contact-mail";
import { planAssignment, type AssignUnit } from "@/lib/unit-assign";
import { DOWNPAYMENT_RATE, methodDiscountRate, isBalanceMethod, peso, type BalanceMethod } from "@/lib/rental-pricing";
import { BMR_BUSINESS, FINANCE, QUOTATION_TERMS } from "@/lib/bmr-rate-card";
import { COMPANY } from "@/lib/company";
import { displayRentalOrderId } from "@/lib/display-ids";

const TABLE = "vissionlink_quote_requests";
const UNITS = "vissionlink_units";
const today = () => new Date().toISOString().slice(0, 10);

type OrderItem = { id?: string; name?: string; qty?: number; days?: number; ratePerDay?: number; securityDeposit?: number };

const dpPct = Math.round(DOWNPAYMENT_RATE * 100);

// Map the PayMongo method onto an invoice payment channel. GCash/Maya have
// their own channels; card / GrabPay fold into the generic "paymongo" channel.
function methodToChannel(method: string | null): PaymentChannel {
  switch (method) {
    case "gcash": return "gcash";
    case "paymaya": return "maya";
    default: return "paymongo"; // card, grab_pay, unknown
  }
}

// Settlement-method-specific payment terms, extra contract clause, and the
// invoice channels — so the e-contract reads differently for full / PDC deals.
function methodPlan(method: BalanceMethod, rentalTotal: number, handoverDate: string) {
  const discountRate = methodDiscountRate(method);
  const pct = Math.round(discountRate * 100);
  const downpayment = Math.round(rentalTotal * DOWNPAYMENT_RATE);
  const balance = rentalTotal - downpayment;
  if (method === "full") {
    return {
      discountRate,
      paymentTerms: `PAID IN FULL online at checkout — ${peso(rentalTotal)} (inclusive of a ${pct}% full-payment discount). No balance remains. Refundable security deposit, if any, is settled separately on release.`,
      extraTerm: `23. FULL-PAYMENT DISCOUNT — A ${pct}% discount has been applied for full online payment at booking. The rental is fully settled; only a refundable security deposit (if required) remains, collected on release.`,
      channels: ["paymongo"] as PaymentChannel[],
      paidNow: rentalTotal, // fully paid online
    };
  }
  if (method === "pdc") {
    return {
      discountRate,
      paymentTerms: `${dpPct}% reservation downpayment (${peso(downpayment)}) PAID online. Balance of ${peso(balance)} to be settled by post-dated cheque(s) payable to ${COMPANY.legalName}, dated to clear on or before handover (${handoverDate}). A ${pct}% PDC discount has been applied. Cheques are subject to clearing; a dishonored or stop-paid cheque (B.P. 22) voids the discount and may incur penalties and suspension of release.`,
      extraTerm: `23. POST-DATED CHEQUE (PDC) ARRANGEMENT — The balance is covered by post-dated cheque(s) payable to ${COMPANY.legalName}, dated to clear on or before the handover date. A ${pct}% PDC discount applies. The Hirer warrants the cheque(s) are funded; dishonor or stop-payment (B.P. 22) voids the discount, makes the full balance immediately due with 5% monthly interest, and entitles the Owner to suspend or refuse release.`,
      channels: ["pdc"] as PaymentChannel[],
      paidNow: downpayment,
    };
  }
  return {
    discountRate,
    paymentTerms: `${dpPct}% reservation downpayment (${peso(downpayment)}) PAID online. Balance of ${peso(balance)} settled by cash, bank transfer, or e-wallet before or upon handover. Refundable security deposit, if any, is collected on release.`,
    extraTerm: null as string | null,
    channels: ["cash", "bank_transfer", "gcash", "maya"] as PaymentChannel[],
    paidNow: downpayment,
  };
}

function buildQuotation(row: Record<string, unknown>, items: OrderItem[], day: string, method: BalanceMethod): QuotationDoc {
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
    specialDiscountRate: methodDiscountRate(method), // full-payment / PDC discount
    paymentTerms: "", // set from methodPlan in finalize (depends on the computed total)
    notes: String(row.notes ?? ""),
    terms: [...QUOTATION_TERMS],
    signatureDataUrl: null,
    signedBy: BMR_BUSINESS.proprietor,
    signedDate: day,
  };
}

export async function storePdf(bucket: string, path: string, pdf: Buffer) {
  const db = supabaseAdmin()!;
  const { data: b } = await db.storage.getBucket(bucket);
  if (!b) {
    const { error } = await db.storage.createBucket(bucket, { public: false });
    if (error && !/already exists/i.test(error.message)) return;
  }
  await db.storage.from(bucket).upload(path, new Uint8Array(pdf), { contentType: "application/pdf", upsert: true });
}

// Inverse of reserveUnits — free any units held for a cancelled order.
export async function releaseUnits(orderId: string) {
  const db = supabaseAdmin()!;
  await db.from(UNITS).update({ status: "available", assigned_request_id: null, updated_at: new Date().toISOString() }).eq("assigned_request_id", orderId);
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
    const method: BalanceMethod = isBalanceMethod(row.balance_method) ? row.balance_method : "standard";
    const items = Array.isArray(row.items) ? (row.items as OrderItem[]) : [];
    const quotation = buildQuotation(row, items, day, method);
    const rentalTotal = computeTotals(quotation).total; // already net of the method discount
    const handoverDate = String(row.date_from ?? day);
    const plan = methodPlan(method, rentalTotal, handoverDate);
    quotation.paymentTerms = plan.paymentTerms;
    if (plan.extraTerm) quotation.terms = [...quotation.terms, plan.extraTerm];
    // Read HOW the customer actually paid from the settled PayMongo session
    // (best-effort — falls back to the generic channel if the lookup fails).
    const sessionId = String(row.payment_ref ?? "");
    const payInfo = sessionId ? extractPaymentInfo(await getCheckoutSession(sessionId)) : extractPaymentInfo(null);
    const ref = payInfo.reference ?? sessionId ?? orderId;
    const channel = methodToChannel(payInfo.method);

    const contract = generateContract(quotation, { rentalFrom: handoverDate, rentalTo: String(row.date_to ?? row.date_from ?? day), agreementDate: day });

    const invoice: InvoiceDoc = generateInvoice(quotation, { issueDate: day, depositRate: 0, acceptedChannels: plan.channels });
    invoice.depositRequired = 0;
    if (method === "pdc") invoice.pdcDueDate = handoverDate;
    // Record what was actually collected online now. For "full" that's the whole
    // (discounted) rental → invoice settles to paid; otherwise the downpayment,
    // leaving the balance due (settled before handover, or by PDC).
    const payments: PaymentEntry[] = [];
    if (plan.paidNow > 0) payments.push({ id: `pay-${Date.now()}-dp`, date: day, channel, amount: plan.paidNow, reference: ref, kind: "payment" });
    invoice.payments = payments;

    const [contractPdf, invoicePdf] = await Promise.all([renderContractPdf(contract), renderInvoicePdf(invoice)]);
    const contractPath = `${orderId}/${contract.number}.pdf`;
    const invoicePath = `${orderId}/${invoice.number}.pdf`;
    await Promise.all([storePdf("contracts", contractPath, contractPdf), storePdf("invoices", invoicePath, invoicePdf)]);

    // Customer communication: confirmation only. The contract and invoice are
    // generated as admin drafts below, then reviewed/sent from Clients & Orders.
    const balance = Math.max(0, rentalTotal - plan.paidNow);
    const balanceNote = method === "pdc" ? "to be settled by your post-dated cheque(s)" : "settled by cash / transfer / e-wallet before or upon handover";
    await Promise.allSettled([
      sendOrderConfirmationEmail({
        to: quotation.client.email,
        clientName: quotation.client.name,
        orderId: displayRentalOrderId(orderId, typeof row.order_no === "string" ? row.order_no : null),
        manageUrl: `https://${COMPANY.domain}/order/${orderId}?email=${encodeURIComponent(quotation.client.email)}`,
        amountPaid: peso(plan.paidNow),
        paymentRef: ref,
        paidInFull: balance <= 0,
        balanceDue: balance > 0 ? peso(balance) : undefined,
        balanceNote: balance > 0 ? balanceNote : undefined,
        rentalFrom: handoverDate,
        rentalTo: String(row.date_to ?? row.date_from ?? day),
        items: items.map((it) => ({ name: String(it.name ?? "Equipment rental"), qty: Math.max(1, Math.floor(Number(it.qty) || 1)), days: Math.max(1, Math.floor(Number(it.days) || 1)) })),
      }),
    ]);

    await reserveUnits(orderId, quotation.lines);

    const now = new Date().toISOString();
    const baseUpdate = {
      quotation, quotation_status: "none", quotation_agreed_at: now,
      contract, contract_status: "draft", contract_pdf_path: contractPath, contract_sent_at: null,
      invoice, invoice_status: "draft", invoice_pdf_path: invoicePath, invoice_sent_at: null,
      status: "responded", fulfillment_status: "paid", paid_at: payInfo.paidAt ?? now,
    };
    // Record how/where it was paid. Tolerate older schemas that lack the columns.
    const upd = await db.from(TABLE).update({
      ...baseUpdate,
      payment_method: payInfo.method, payment_ref: ref, amount_paid: plan.paidNow,
    }).eq("id", orderId);
    if (upd.error && /payment_method|amount_paid|payment_ref|column/i.test(upd.error.message)) {
      await db.from(TABLE).update(baseUpdate).eq("id", orderId);
    }

    // Create / refresh the CRM client record now that a real payment settled.
    await ensureClient(quotation.client.email, {
      name: quotation.client.name,
      company: quotation.client.company,
      phone: quotation.client.phone,
    });

    return { ok: true };
  } catch (err) {
    // Release the claim so it can be retried (webhook will fire again).
    await db.from(TABLE).update({ fulfillment_status: "pending_payment" }).eq("id", orderId);
    return { ok: false, error: err instanceof Error ? err.message : "Finalize failed." };
  }
}
