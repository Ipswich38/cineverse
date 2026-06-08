// ── Credit memo ───────────────────────────────────────────────────────────────
// Issued when a paid rental is cancelled: it formally credits the client for the
// amount refunded (and records any cancellation fee retained under the rental
// terms). Separate from the invoice — an invoice bills, a credit memo reverses.
import { BMR_BUSINESS } from "./bmr-rate-card";
import { COMPANY } from "./company";

export type CreditClient = { name: string; company: string; email: string; phone: string; project: string };

export type CreditMemoDoc = {
  number: string;
  issueDate: string; // YYYY-MM-DD
  orderNo: string; // the SO-… the client knows
  originalInvoiceNo: string;
  client: CreditClient;
  amountPaid: number; // what the client originally paid online
  feeRetained: number; // cancellation fee kept per the rental terms (paid − credit)
  creditAmount: number; // amount actually refunded / credited
  refundMethod: "paymongo" | "offline";
  refundRef: string | null; // PayMongo refund id, when applicable
  reasonCategory: string;
  reason: string;
  note: string; // admin note to the client
  terms: string[];
  providerSignedBy: string;
  providerSignatureDataUrl: string | null;
};

const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

export function generateCreditMemo(opts: {
  number: string;
  issueDate: string;
  orderNo: string;
  originalInvoiceNo: string;
  client: CreditClient;
  amountPaid: number;
  creditAmount: number;
  refundMethod: "paymongo" | "offline";
  refundRef?: string | null;
  reasonCategory: string;
  reason: string;
  note?: string;
}): CreditMemoDoc {
  const amountPaid = round2(opts.amountPaid);
  const creditAmount = Math.min(round2(opts.creditAmount), amountPaid);
  const feeRetained = round2(Math.max(0, amountPaid - creditAmount));
  return {
    number: opts.number,
    issueDate: opts.issueDate,
    orderNo: opts.orderNo,
    originalInvoiceNo: opts.originalInvoiceNo,
    client: opts.client,
    amountPaid,
    feeRetained,
    creditAmount,
    refundMethod: opts.refundMethod,
    refundRef: opts.refundRef ?? null,
    reasonCategory: opts.reasonCategory,
    reason: opts.reason,
    note: opts.note ?? "",
    terms: [
      `This credit memo cancels rental order ${opts.orderNo} and reverses the amount credited below against invoice ${opts.originalInvoiceNo}.`,
      feeRetained > 0
        ? `A cancellation fee has been retained in accordance with the Cancellation & Refund terms accepted at booking; the balance is credited/refunded to the original payment method.`
        : `The amount paid is credited/refunded in full to the original payment method.`,
      `Refunds are processed through the original payment provider and may take a few business days to reflect, depending on your bank or e-wallet. Third-party transaction fees may be non-refundable.`,
      `${BMR_BUSINESS.tradeName} is ${COMPANY.taxType}-registered; this document is issued per its BIR registration.`,
    ],
    providerSignedBy: BMR_BUSINESS.proprietor,
    providerSignatureDataUrl: null,
  };
}
