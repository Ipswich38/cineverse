import PDFDocument from "pdfkit";
import { BMR_BUSINESS } from "./bmr-rate-card";
import { LEFT, RIGHT, prettyDate, drawLetterhead, drawClientBlock, drawSignature } from "./pdf-shared";
import { WAIVER_TITLE, WAIVER_PREAMBLE, WAIVER_CLAUSES } from "./cineforce-crew";

export type WaiverDoc = {
  number: string;
  date: string; // ISO — when the waiver was e-signed at checkout
  client: { name: string; company: string; email: string; phone: string; project: string };
  signedName: string; // typed full name used as the e-signature
  equipment: string[]; // rented item names covered by the waiver
};

// Renders BMR's Equipment Rental Liability Waiver to a PDF buffer — generated
// when a paid rental proceeds WITHOUT BMR-designated crew, stored alongside the
// contract and invoice for the order.
export function renderWaiverPdf(doc: WaiverDoc): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const pdf = new PDFDocument({ size: "A4", margin: 48 });
    const chunks: Buffer[] = [];
    pdf.on("data", (c: Buffer) => chunks.push(c));
    pdf.on("end", () => resolve(Buffer.concat(chunks)));
    pdf.on("error", reject);

    drawLetterhead(pdf, "LIABILITY WAIVER", [
      `No. ${doc.number}`,
      `E-signed: ${prettyDate(doc.date)}`,
    ]);

    pdf.font("Helvetica-Bold").fontSize(11).fillColor("#15130f").text(WAIVER_TITLE.toUpperCase(), LEFT, pdf.y, { width: RIGHT - LEFT });
    pdf.moveDown(0.6);
    pdf.font("Helvetica").fontSize(9).fillColor("#444").text(WAIVER_PREAMBLE, LEFT, pdf.y, { width: RIGHT - LEFT });
    pdf.moveDown(0.9);

    drawClientBlock(pdf, "RENTER / PRODUCTION COMPANY", doc.client);

    if (doc.equipment.length) {
      pdf.font("Helvetica-Bold").fontSize(9).fillColor("#999").text("EQUIPMENT COVERED", LEFT, pdf.y);
      pdf.font("Helvetica").fontSize(9).fillColor("#444");
      for (const name of doc.equipment) pdf.text(`• ${name}`, LEFT, pdf.y + 2, { width: RIGHT - LEFT });
      pdf.moveDown(0.9);
    }

    for (const clause of WAIVER_CLAUSES) {
      if (pdf.y > 680) pdf.addPage();
      pdf.font("Helvetica-Bold").fontSize(9.5).fillColor("#15130f").text(clause.title, LEFT, pdf.y, { width: RIGHT - LEFT });
      pdf.font("Helvetica").fontSize(9).fillColor("#444").text(clause.body, LEFT, pdf.y + 1, { width: RIGHT - LEFT });
      pdf.moveDown(0.6);
    }

    pdf.moveDown(0.4);
    if (pdf.y > 660) pdf.addPage();
    pdf.font("Helvetica").fontSize(8).fillColor("#777").text(
      `E-signature: this waiver was accepted at online checkout by typing the Renter's full name after scrolling through the complete text. Name typed: ${doc.signedName}.`,
      LEFT, pdf.y, { width: RIGHT - LEFT },
    );
    pdf.moveDown(1.2);

    let sigY = pdf.y;
    if (sigY > 640) { pdf.addPage(); sigY = 60; }
    drawSignature(pdf, {
      title: "Lessor (BMR)",
      signatureDataUrl: null,
      name: BMR_BUSINESS.proprietor,
      sub: BMR_BUSINESS.tradeName,
      date: doc.date,
    }, LEFT, sigY, 220);
    drawSignature(pdf, {
      title: "Renter — Read & Agreed",
      signatureDataUrl: null,
      name: doc.signedName || doc.client.name,
      sub: doc.client.company || "Authorized representative (e-signed)",
      date: doc.date,
    }, LEFT + 280, sigY, 200);

    pdf.end();
  });
}
