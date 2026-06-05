import { BMR_BUSINESS } from "./bmr-rate-card";
import { computeTotals, type QuotationDoc, type QuotationLine } from "./quotation";

// ── E-contract (rental agreement) ────────────────────────────────────────────
// Generated from an AGREED quotation: it carries the same equipment, labor,
// pricing, and the full BMR Terms & Conditions, and adds the rental period and
// both parties' signatures. The provider e-signs in admin; the client signs the
// "Received & Conforme" block (captured in admin for face-to-face, or wet-signed
// on the emailed PDF).

export type ContractDoc = {
  number: string;
  agreementDate: string; // YYYY-MM-DD
  client: { name: string; company: string; email: string; phone: string; project: string };
  rentalFrom: string; // YYYY-MM-DD
  rentalTo: string; // YYYY-MM-DD
  lines: QuotationLine[]; // equipment (inherited from the quotation)
  laborLines: QuotationLine[]; // crew / personnel
  applySurcharge: boolean;
  surchargeRate: number;
  specialDiscountRate: number;
  paymentTerms: string;
  terms: string[];
  notes: string;
  // Provider (Owner) signature.
  providerSignatureDataUrl: string | null;
  providerSignedBy: string;
  providerSignedDate: string;
  // Client (Hirer) signature — optional in-admin capture; otherwise wet-signed.
  clientSignatureDataUrl: string | null;
  clientSignedBy: string;
  clientPosition: string;
  clientSignedDate: string;
};

function contractNumber(quotationNumber: string): string {
  // Reuse the quotation's date+id tail, swapping the Q marker for C.
  return quotationNumber.replace(/-Q-/, "-C-").replace(/^BMR-(?!C-)/, "BMR-C-").startsWith("BMR-C-")
    ? quotationNumber.replace(/-Q-/, "-C-")
    : `BMR-C-${quotationNumber}`;
}

// Build a draft contract from an agreed quotation + the rental dates.
export function generateContract(
  quotation: QuotationDoc,
  opts: { rentalFrom?: string | null; rentalTo?: string | null; agreementDate: string },
): ContractDoc {
  return {
    number: contractNumber(quotation.number),
    agreementDate: opts.agreementDate,
    client: { ...quotation.client },
    rentalFrom: opts.rentalFrom ?? opts.agreementDate,
    rentalTo: opts.rentalTo ?? opts.rentalFrom ?? opts.agreementDate,
    lines: quotation.lines.map((l) => ({ ...l })),
    laborLines: (quotation.laborLines ?? []).map((l) => ({ ...l })),
    applySurcharge: quotation.applySurcharge,
    surchargeRate: quotation.surchargeRate,
    specialDiscountRate: quotation.specialDiscountRate,
    paymentTerms: quotation.paymentTerms,
    terms: [...quotation.terms],
    notes: quotation.notes ?? "",
    providerSignatureDataUrl: quotation.signatureDataUrl ?? null,
    providerSignedBy: quotation.signedBy || BMR_BUSINESS.proprietor,
    providerSignedDate: quotation.signedDate || opts.agreementDate,
    clientSignatureDataUrl: null,
    clientSignedBy: quotation.client.name ?? "",
    clientPosition: "",
    clientSignedDate: "",
  };
}

export function contractReadyToSend(doc: ContractDoc): string | null {
  if (!doc.client.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(doc.client.email)) return "Client email is missing or invalid.";
  if (!doc.lines.length || computeTotals(doc).total <= 0) return "The agreed quotation has no priced lines.";
  if (!doc.providerSignatureDataUrl) return "Attach the provider (Owner) signature before sending.";
  return null;
}
