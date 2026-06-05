import {
  DEFAULT_PAYMENT_TERMS,
  FINANCE,
  PACKAGE_RATE_LINES,
  QUOTATION_TERMS,
  QUOTATION_VALID_DAYS,
  RATE_CARD_BY_KEY,
} from "./bmr-rate-card";

// ── E-quotation document model ───────────────────────────────────────────────
// One editable quotation generated from a client quote request. The admin edits
// it, attaches an e-signature, then sends (which renders a PDF, stores a copy,
// and emails the client). Persisted as JSON on the quote-request row.

export type QuotationLine = {
  id: string;
  description: string;
  qty: number;
  days: number;
  unitRate: number; // PHP per unit per day
};

export type QuotationDoc = {
  number: string;
  issueDate: string; // YYYY-MM-DD
  validUntil: string; // YYYY-MM-DD
  client: { name: string; company: string; email: string; phone: string; project: string };
  lines: QuotationLine[]; // equipment
  laborLines: QuotationLine[]; // crew / personnel ("Labor Cost")
  applySurcharge: boolean;
  surchargeRate: number;
  specialDiscountRate: number; // 0..1 — BMR "Special Discount %"
  paymentTerms: string;
  notes: string;
  terms: string[];
  signatureDataUrl: string | null; // PNG data URL captured from the signature pad
  signedBy: string;
  signedDate: string; // YYYY-MM-DD
};

export type QuotationTotals = {
  equipmentSubtotal: number;
  laborSubtotal: number;
  surcharge: number;
  subtotal: number; // equipment + labor + surcharge
  discount: number; // subtotal × specialDiscountRate
  total: number; // subtotal − discount (no separate VAT line, per BMR docs)
};

export function lineAmount(line: { qty: number; days: number; unitRate: number }): number {
  return Math.max(0, (Number(line.qty) || 0) * (Number(line.days) || 0) * (Number(line.unitRate) || 0));
}

export function computeTotals(doc: Pick<QuotationDoc, "lines" | "laborLines" | "applySurcharge" | "surchargeRate" | "specialDiscountRate">): QuotationTotals {
  const equipmentSubtotal = doc.lines.reduce((s, l) => s + lineAmount(l), 0);
  const laborSubtotal = (doc.laborLines ?? []).reduce((s, l) => s + lineAmount(l), 0);
  const surcharge = doc.applySurcharge ? equipmentSubtotal * (doc.surchargeRate || 0) : 0;
  const subtotal = equipmentSubtotal + laborSubtotal + surcharge;
  const discount = Math.max(0, subtotal * Math.min(1, Math.max(0, Number(doc.specialDiscountRate) || 0)));
  const total = Math.max(0, subtotal - discount);
  return { equipmentSubtotal, laborSubtotal, surcharge, subtotal, discount, total };
}

export function formatPHP(n: number): string {
  return "₱" + (Number(n) || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function rentalDays(from: string | null, to: string | null): number {
  if (!from) return 1;
  const a = new Date(from + "T00:00:00");
  const b = to ? new Date(to + "T00:00:00") : a;
  const diff = Math.floor((b.getTime() - a.getTime()) / 86400000) + 1;
  return Math.max(1, diff);
}

let lineSeq = 0;
function newLineId(): string {
  return `ln-${Date.now().toString(36)}-${(lineSeq++).toString(36)}`;
}

// Shape of the stored quote request we read from (subset of the DB row).
export type QuoteRequestInput = {
  id: string;
  name?: string | null;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  project?: string | null;
  date_from?: string | null;
  date_to?: string | null;
  notes?: string | null;
  items?: Array<{ type?: string; slug?: string; name?: string; providerName?: string }>;
};

// Build a draft quotation from a client quote request: map each requested
// package to its rate-card lines, set rental days from the requested dates, and
// pre-fill terms. Everything is then editable by the admin.
export function generateDraft(req: QuoteRequestInput): QuotationDoc {
  const today = new Date();
  const validUntil = new Date(today);
  validUntil.setDate(validUntil.getDate() + QUOTATION_VALID_DAYS);
  const days = rentalDays(req.date_from ?? null, req.date_to ?? null);

  const lines: QuotationLine[] = [];
  for (const item of req.items ?? []) {
    const mapped = item.slug ? PACKAGE_RATE_LINES[item.slug] : undefined;
    if (mapped && mapped.length) {
      for (const m of mapped) {
        const rc = RATE_CARD_BY_KEY[m.key];
        if (!rc) continue;
        lines.push({ id: newLineId(), description: rc.name, qty: m.qty, days, unitRate: rc.dailyRate });
      }
    } else if (item.name) {
      // Unknown package — start with a single editable line at 0; admin sets rate.
      lines.push({ id: newLineId(), description: item.name, qty: 1, days, unitRate: 0 });
    }
  }
  if (lines.length === 0) {
    lines.push({ id: newLineId(), description: "Equipment rental", qty: 1, days, unitRate: 0 });
  }

  const num = `BMR-Q-${isoDate(today).replace(/-/g, "")}-${req.id.slice(-4).toUpperCase()}`;

  return {
    number: num,
    issueDate: isoDate(today),
    validUntil: isoDate(validUntil),
    client: {
      name: req.name ?? "",
      company: req.company ?? "",
      email: req.email ?? "",
      phone: req.phone ?? "",
      project: req.project ?? "",
    },
    lines,
    laborLines: [],
    applySurcharge: false,
    surchargeRate: FINANCE.outOfTownSurchargeRate,
    specialDiscountRate: 0,
    paymentTerms: DEFAULT_PAYMENT_TERMS,
    notes: req.notes ?? "",
    terms: [...QUOTATION_TERMS],
    signatureDataUrl: null,
    signedBy: "",
    signedDate: "",
  };
}

// Light validation before sending.
export function quotationReadyToSend(doc: QuotationDoc): string | null {
  if (!doc.client.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(doc.client.email)) return "Client email is missing or invalid.";
  if (!doc.lines.length || computeTotals(doc).total <= 0) return "Add at least one priced line item.";
  if (!doc.signatureDataUrl) return "Attach the provider e-signature before sending.";
  return null;
}
