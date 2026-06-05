import PDFDocument from "pdfkit";
import { BMR_BUSINESS } from "./bmr-rate-card";
import { computeTotals } from "./quotation";
import type { ContractDoc } from "./contract";
import {
  LEFT, RIGHT, php, prettyDate,
  drawLetterhead, drawClientBlock, drawLineTable, drawTotals, drawPaymentBlock, drawTermsPage, drawSignature,
} from "./pdf-shared";

// Renders the e-contract (rental agreement) to a PDF buffer: parties, equipment
// & labor schedule, agreed pricing, the full BMR Terms & Conditions, and both
// the Owner (provider) and Hirer (client / conforme) signature blocks.
export function renderContractPdf(doc: ContractDoc): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const pdf = new PDFDocument({ size: "A4", margin: 48 });
    const chunks: Buffer[] = [];
    pdf.on("data", (c: Buffer) => chunks.push(c));
    pdf.on("end", () => resolve(Buffer.concat(chunks)));
    pdf.on("error", reject);

    const totals = computeTotals(doc);
    const labor = doc.laborLines ?? [];

    drawLetterhead(pdf, "CONTRACT", [
      `No. ${doc.number}`,
      `Agreement date: ${prettyDate(doc.agreementDate)}`,
      `Rental period: ${prettyDate(doc.rentalFrom)} – ${prettyDate(doc.rentalTo)}`,
    ]);

    // Preamble — names the parties and binds the agreement.
    pdf.font("Helvetica").fontSize(9).fillColor("#444").text(
      `This Rental Agreement is entered into between ${BMR_BUSINESS.tradeName} (the "Owner") and the client named below (the "Hirer") for the equipment, crew, and rental period specified herein, subject to the Terms & Conditions attached.`,
      LEFT, pdf.y, { width: RIGHT - LEFT },
    );
    pdf.moveDown(0.8);

    drawClientBlock(pdf, "HIRER (CLIENT)", doc.client);

    let y = drawLineTable(pdf, [
      { label: "Equipment", lines: doc.lines },
      { label: "Labor / Personnel", lines: labor },
    ], pdf.y);

    // ── Totals ───────────────────────────────────────────────────────────────
    y += 8;
    if (y > 700) { pdf.addPage(); y = 60; }
    const rows: [string, string, boolean?][] = [];
    if (labor.length) {
      rows.push(["Total equipment cost", php(totals.equipmentSubtotal)]);
      rows.push(["Labor cost", php(totals.laborSubtotal)]);
    }
    if (doc.applySurcharge) rows.push([`Out-of-town surcharge (${Math.round(doc.surchargeRate * 100)}%)`, php(totals.surcharge)]);
    rows.push(["Subtotal", php(totals.subtotal)]);
    if (totals.discount > 0) rows.push([`Special discount (${Math.round(doc.specialDiscountRate * 100)}%)`, "- " + php(totals.discount)]);
    rows.push(["—rule—", ""]);
    rows.push(["CONTRACT TOTAL", php(totals.total), true]);
    y = drawTotals(pdf, rows, y);

    // ── Payment + bank ─────────────────────────────────────────────────────────
    y += 8;
    if (y > 660) { pdf.addPage(); y = 60; }
    y = drawPaymentBlock(pdf, doc.paymentTerms, y);

    if (doc.notes && doc.notes.trim()) {
      y += 8;
      if (y > 700) { pdf.addPage(); y = 60; }
      pdf.font("Helvetica-Bold").fontSize(9).fillColor("#15130f").text("Notes", LEFT, y);
      pdf.font("Helvetica").fontSize(9).fillColor("#555").text(doc.notes.trim(), LEFT, pdf.y + 2, { width: RIGHT - LEFT });
    }

    // ── Terms & conditions ────────────────────────────────────────────────────
    drawTermsPage(pdf, doc.terms);

    // ── Signatures: Owner (left) + Hirer / Conforme (right) ─────────────────────
    pdf.moveDown(1.5);
    let sigY = pdf.y;
    if (sigY > 640) { pdf.addPage(); sigY = 60; }

    drawSignature(pdf, {
      title: "Owner (BMR)",
      signatureDataUrl: doc.providerSignatureDataUrl,
      name: doc.providerSignedBy || BMR_BUSINESS.proprietor,
      sub: BMR_BUSINESS.tradeName,
      date: doc.providerSignedDate,
    }, LEFT, sigY, 220);

    drawSignature(pdf, {
      title: "Hirer — Received & Conforme",
      signatureDataUrl: doc.clientSignatureDataUrl,
      name: doc.clientSignedBy || doc.client.name || "",
      sub: doc.client.company || "Authorized signature with printed name",
      position: doc.clientPosition || undefined,
      date: doc.clientSignedDate,
    }, LEFT + 280, sigY, 200);

    pdf.end();
  });
}
