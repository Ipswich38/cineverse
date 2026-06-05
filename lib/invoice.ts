import { BMR_BUSINESS } from "./bmr-rate-card";
import { computeTotals, type QuotationDoc, type QuotationLine } from "./quotation";

// ── E-invoice (billing) with deposit + incident + payment ledger ──────────────
// Generated from the agreed quotation. Adds the layered payment model: a secured
// deposit (deductible from the total, but absorbing incidents first), an incident
// ledger, recorded payments across flexible channels, stackable discounts
// (loyalty / PDC / prompt-pay), and live late-interest accrual on overdue
// balances. Mirrors BMR's RENTAL / SERVICE INVOICE.

export type PaymentStatus = "unpaid" | "partial" | "paid";

// Flexible payment channels. PDC (post-dated cheque) is the anchor — it earns a
// discount but carries stop-payment / BP22 terms stated on the invoice.
export type PaymentChannel = "pdc" | "bank_transfer" | "gcash" | "maya" | "cash" | "paymongo";
export const CHANNEL_LABELS: Record<PaymentChannel, string> = {
  pdc: "Post-dated cheque (PDC)",
  bank_transfer: "Bank transfer / InstaPay / PESONet",
  gcash: "GCash",
  maya: "Maya",
  cash: "Cash",
  paymongo: "Online (card / e-wallet)",
};
export const ALL_CHANNELS: PaymentChannel[] = ["pdc", "bank_transfer", "gcash", "maya", "cash", "paymongo"];

export type PaymentKind = "deposit" | "payment";
export type PaymentEntry = { id: string; date: string; channel: PaymentChannel; amount: number; reference: string; kind: PaymentKind };
export type Incident = { id: string; date: string; description: string; amount: number };

export type InvoiceDoc = {
  number: string;
  issueDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  client: { name: string; company: string; email: string; phone: string; project: string };
  lines: QuotationLine[]; // equipment
  laborLines: QuotationLine[]; // crew / personnel
  applySurcharge: boolean;
  surchargeRate: number;
  specialDiscountRate: number;
  paymentTerms: string;
  terms: string[];
  notes: string;

  // ── Payment model ──────────────────────────────────────────────────────────
  depositRequired: number; // secured before/at delivery; deductible from total
  payments: PaymentEntry[]; // includes the deposit once received (kind="deposit")
  incidents: Incident[]; // damage / loss / late charges — deposit absorbs these first
  acceptedChannels: PaymentChannel[];
  pdcDueDate: string; // date the PDC is dated / expected to clear
  pdcDiscountRate: number; // 0..1 — discount for on-time, clearing PDC
  promptPayDiscountRate: number; // 0..1 — early-settlement discount
  loyaltyDiscountRate: number; // 0..1 — prefilled from the client's tier
  lateInterestMonthlyRate: number; // accrues on overdue balance (term #21: 5%/mo)
  payMongoLink: string; // optional online-payment link
  loyaltyCredited: boolean; // guard: client ledger advanced once on full settlement

  // Optional "Authorized Signature".
  providerSignatureDataUrl: string | null;
  providerSignedBy: string;
};

export const INVOICE_DUE_DAYS = 7;
export const DEFAULT_LATE_INTEREST = 0.05; // 5% / month, per term #21

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
export function todayISO(): string {
  return isoDate(new Date());
}
function daysBetween(fromISO: string, toISO: string): number {
  const a = new Date(fromISO + "T00:00:00Z").getTime();
  const b = new Date(toISO + "T00:00:00Z").getTime();
  return Math.round((b - a) / 86400000);
}

function invoiceNumber(quotationNumber: string): string {
  return quotationNumber.includes("-Q-") ? quotationNumber.replace(/-Q-/, "-INV-") : `BMR-INV-${quotationNumber}`;
}

const clampRate = (r: number) => Math.min(1, Math.max(0, Number(r) || 0));

export type InvoiceMoney = {
  rental: number; // agreed rental total (equipment + labor + surcharge − special discount)
  loyaltyDiscount: number;
  pdcDiscount: number;
  promptDiscount: number;
  discountsTotal: number;
  net: number; // rental − stacked discounts
  incidentsTotal: number;
  depositReceived: number;
  paid: number; // all recorded payments (incl. deposit)
  principal: number; // outstanding before interest
  daysOverdue: number;
  interest: number; // accrued late interest on the overdue principal
  balance: number; // principal + interest
  status: PaymentStatus;
};

// The full money breakdown as of a given date (defaults to today). The deposit
// and any other payments offset the same pool that incidents add to — so the
// deposit absorbs incidents first, exactly per BMR's rule.
export function computeInvoiceMoney(doc: InvoiceDoc, asOf: string = todayISO()): InvoiceMoney {
  const rental = computeTotals(doc).total;
  const loyaltyDiscount = rental * clampRate(doc.loyaltyDiscountRate);
  const pdcDiscount = rental * clampRate(doc.pdcDiscountRate);
  const promptDiscount = rental * clampRate(doc.promptPayDiscountRate);
  const discountsTotal = loyaltyDiscount + pdcDiscount + promptDiscount;
  const net = Math.max(0, rental - discountsTotal);

  const incidentsTotal = (doc.incidents ?? []).reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const payments = doc.payments ?? [];
  const paid = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const depositReceived = payments.filter((p) => p.kind === "deposit").reduce((s, p) => s + (Number(p.amount) || 0), 0);

  const principal = Math.max(0, net + incidentsTotal - paid);
  const daysOverdue = principal > 0 && doc.dueDate ? Math.max(0, daysBetween(doc.dueDate, asOf)) : 0;
  const monthly = Number(doc.lateInterestMonthlyRate) || 0;
  const interest = daysOverdue > 0 ? principal * monthly * (daysOverdue / 30) : 0;
  const balance = principal + interest;

  const status: PaymentStatus = paid <= 0 ? "unpaid" : balance <= 0.01 ? "paid" : "partial";
  return { rental, loyaltyDiscount, pdcDiscount, promptDiscount, discountsTotal, net, incidentsTotal, depositReceived, paid, principal, daysOverdue, interest, balance, status };
}

// Convenience: outstanding balance (incl. accrued interest) as of a date.
export function balanceDue(doc: InvoiceDoc, asOf?: string): number {
  return computeInvoiceMoney(doc, asOf).balance;
}

// Build a draft invoice from the agreed quotation. Loyalty discount and the
// required deposit are prefilled from the client's policy (the API supplies them);
// PDC / prompt-pay discounts are left at 0 for the admin to set per invoice.
export function generateInvoice(
  quotation: QuotationDoc,
  opts: { issueDate: string; loyaltyRate?: number; depositRate?: number; acceptedChannels?: PaymentChannel[] },
): InvoiceDoc {
  const due = new Date(opts.issueDate + "T00:00:00Z");
  due.setUTCDate(due.getUTCDate() + INVOICE_DUE_DAYS);
  const dueISO = isoDate(due);

  const draft: InvoiceDoc = {
    number: invoiceNumber(quotation.number),
    issueDate: opts.issueDate,
    dueDate: dueISO,
    client: { ...quotation.client },
    lines: quotation.lines.map((l) => ({ ...l })),
    laborLines: (quotation.laborLines ?? []).map((l) => ({ ...l })),
    applySurcharge: quotation.applySurcharge,
    surchargeRate: quotation.surchargeRate,
    specialDiscountRate: quotation.specialDiscountRate,
    paymentTerms: quotation.paymentTerms,
    terms: [...quotation.terms],
    notes: quotation.notes ?? "",
    depositRequired: 0,
    payments: [],
    incidents: [],
    acceptedChannels: opts.acceptedChannels ?? [...ALL_CHANNELS],
    pdcDueDate: dueISO,
    pdcDiscountRate: 0,
    promptPayDiscountRate: 0,
    loyaltyDiscountRate: clampRate(opts.loyaltyRate ?? 0),
    lateInterestMonthlyRate: DEFAULT_LATE_INTEREST,
    payMongoLink: "",
    loyaltyCredited: false,
    providerSignatureDataUrl: quotation.signatureDataUrl ?? null,
    providerSignedBy: quotation.signedBy || BMR_BUSINESS.proprietor,
  };
  // Required deposit = share of the (already discount-applied) rental total.
  const rate = clampRate(opts.depositRate ?? 0);
  draft.depositRequired = Math.round(computeInvoiceMoney(draft).net * rate);
  return draft;
}

export function invoiceReadyToSend(doc: InvoiceDoc): string | null {
  if (!doc.client.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(doc.client.email)) return "Client email is missing or invalid.";
  if (!doc.lines.length || computeTotals(doc).total <= 0) return "The invoice has no priced lines.";
  if (!doc.acceptedChannels?.length) return "Enable at least one payment channel.";
  return null;
}
