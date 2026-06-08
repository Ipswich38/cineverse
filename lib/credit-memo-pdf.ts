import PDFDocument from "pdfkit";
import { BMR_BUSINESS } from "./bmr-rate-card";
import { type CreditMemoDoc } from "./credit-memo";
import {
  LEFT, RIGHT, php, prettyDate,
  drawLetterhead, drawClientBlock, drawTotals, drawTermsPage, drawSignature,
} from "./pdf-shared";

const METHOD_LABEL: Record<string, string> = { paymongo: "Original payment method (via PayMongo)", offline: "Manual / off-platform" };

// Renders the credit memo: CREDIT TO, the original amount, any cancellation fee
// retained, the credited/refunded amount, the reason on record, the terms, and
// the authorized signature. Mirrors the invoice layout for a consistent look.
export function renderCreditMemoPdf(doc: CreditMemoDoc): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const pdf = new PDFDocument({ size: "A4", margin: 48 });
    const chunks: Buffer[] = [];
    pdf.on("data", (c: Buffer) => chunks.push(c));
    pdf.on("end", () => resolve(Buffer.concat(chunks)));
    pdf.on("error", reject);

    drawLetterhead(pdf, "CREDIT MEMO", [
      `No. ${doc.number}`,
      `Issued: ${prettyDate(doc.issueDate)}`,
      `Order: ${doc.orderNo}`,
      `Ref. invoice: ${doc.originalInvoiceNo}`,
    ]);

    drawClientBlock(pdf, "CREDIT TO", doc.client);

    let y = pdf.y + 6;
    const rows: [string, string, boolean?][] = [];
    rows.push(["Amount originally paid", php(doc.amountPaid)]);
    if (doc.feeRetained > 0) rows.push(["Cancellation fee retained", "- " + php(doc.feeRetained)]);
    rows.push(["—rule—", ""]);
    rows.push(["CREDIT / REFUND ISSUED", php(doc.creditAmount), true]);
    y = drawTotals(pdf, rows, y);

    // ── Refund routing ──────────────────────────────────────────────────────────
    y += 12;
    if (y > 680) { pdf.addPage(); y = 60; }
    pdf.font("Helvetica-Bold").fontSize(9).fillColor("#15130f").text("Refund routing", LEFT, y);
    pdf.font("Helvetica").fontSize(9).fillColor("#555");
    pdf.text(`Method: ${METHOD_LABEL[doc.refundMethod] ?? doc.refundMethod}`, LEFT, pdf.y + 2, { width: RIGHT - LEFT });
    if (doc.refundRef) pdf.text(`Reference: ${doc.refundRef}`, LEFT, pdf.y + 1, { width: RIGHT - LEFT });

    // ── Reason on record ────────────────────────────────────────────────────────
    y = pdf.y + 12;
    if (y > 680) { pdf.addPage(); y = 60; }
    pdf.font("Helvetica-Bold").fontSize(9).fillColor("#15130f").text("Reason on record", LEFT, y);
    pdf.font("Helvetica").fontSize(9).fillColor("#555");
    pdf.text(doc.reasonCategory, LEFT, pdf.y + 2, { width: RIGHT - LEFT });
    if (doc.reason && doc.reason.trim()) pdf.fillColor("#777").fontSize(8.5).text(doc.reason.trim(), LEFT, pdf.y + 1, { width: RIGHT - LEFT });

    if (doc.note && doc.note.trim()) {
      y = pdf.y + 12;
      if (y > 700) { pdf.addPage(); y = 60; }
      pdf.font("Helvetica-Bold").fontSize(9).fillColor("#15130f").text("Note", LEFT, y);
      pdf.font("Helvetica").fontSize(9).fillColor("#555").text(doc.note.trim(), LEFT, pdf.y + 2, { width: RIGHT - LEFT });
    }

    drawTermsPage(pdf, doc.terms ?? [], "Terms");

    pdf.moveDown(1.5);
    let sigY = pdf.y;
    if (sigY > 660) { pdf.addPage(); sigY = 60; }
    drawSignature(pdf, {
      title: "Authorized signature",
      signatureDataUrl: doc.providerSignatureDataUrl,
      name: doc.providerSignedBy || BMR_BUSINESS.proprietor,
      sub: BMR_BUSINESS.tradeName,
    }, LEFT, sigY, 220);

    pdf.end();
  });
}
