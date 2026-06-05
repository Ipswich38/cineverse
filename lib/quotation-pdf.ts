import PDFDocument from "pdfkit";
import { BMR_BANK, BMR_BUSINESS } from "./bmr-rate-card";
import { computeTotals, lineAmount, type QuotationDoc, type QuotationLine } from "./quotation";

// Currency for the PDF. pdfkit's built-in Helvetica (WinAnsi) has no ₱ glyph,
// so we print "PHP" rather than the peso sign.
function php(n: number): string {
  return "PHP " + (Number(n) || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function prettyDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" });
}

const LEFT = 48;
const RIGHT = 547; // 595.28 (A4) - 48
const COLS = { desc: 48, qty: 300, days: 350, unit: 400, amount: RIGHT };

// Renders the quotation to a PDF buffer (letterhead, equipment + labor line
// items, totals, payment terms, bank details, terms & conditions, the provider's
// e-signature, and a client "Received & Conforme" block).
export function renderQuotationPdf(doc: QuotationDoc): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const pdf = new PDFDocument({ size: "A4", margin: 48 });
    const chunks: Buffer[] = [];
    pdf.on("data", (c: Buffer) => chunks.push(c));
    pdf.on("end", () => resolve(Buffer.concat(chunks)));
    pdf.on("error", reject);

    const totals = computeTotals(doc);
    const laborLines = doc.laborLines ?? [];

    // ── Letterhead ──────────────────────────────────────────────────────────
    pdf.fillColor("#15130f").font("Helvetica-Bold").fontSize(18).text(BMR_BUSINESS.tradeName, LEFT, 48);
    pdf.font("Helvetica").fontSize(9).fillColor("#555");
    pdf.text(BMR_BUSINESS.proprietor);
    pdf.text(BMR_BUSINESS.address);
    pdf.text(`TIN ${BMR_BUSINESS.tin}  ·  ${BMR_BUSINESS.phone}`);
    pdf.text(`${BMR_BUSINESS.email} / ${BMR_BUSINESS.altEmail}`);

    pdf.font("Helvetica-Bold").fontSize(22).fillColor("#111").text("QUOTATION", LEFT, 48, { align: "right" });
    pdf.font("Helvetica").fontSize(9).fillColor("#555");
    pdf.text(`No. ${doc.number}`, { align: "right" });
    pdf.text(`Issued: ${prettyDate(doc.issueDate)}`, { align: "right" });
    pdf.text(`Valid until: ${prettyDate(doc.validUntil)}`, { align: "right" });

    pdf.moveDown(1.2);
    pdf.moveTo(LEFT, pdf.y).lineTo(RIGHT, pdf.y).strokeColor("#ddd").stroke();
    pdf.moveDown(0.8);

    // ── Bill to ─────────────────────────────────────────────────────────────
    const billTop = pdf.y;
    pdf.font("Helvetica-Bold").fontSize(9).fillColor("#999").text("PREPARED FOR", LEFT, billTop);
    pdf.font("Helvetica-Bold").fontSize(11).fillColor("#15130f").text(doc.client.name || "—", LEFT, pdf.y + 2);
    pdf.font("Helvetica").fontSize(9).fillColor("#555");
    if (doc.client.company) pdf.text(doc.client.company);
    if (doc.client.email) pdf.text(doc.client.email);
    if (doc.client.phone) pdf.text(doc.client.phone);
    if (doc.client.project) pdf.text(`Project: ${doc.client.project}`);

    pdf.moveDown(1);

    // ── Line-item table helpers ──────────────────────────────────────────────
    const drawHeader = (y: number) => {
      pdf.font("Helvetica-Bold").fontSize(9).fillColor("#fff");
      pdf.rect(LEFT, y - 3, RIGHT - LEFT, 18).fill("#15130f");
      pdf.fillColor("#fff");
      pdf.text("Description", COLS.desc + 6, y + 1, { width: COLS.qty - COLS.desc - 10 });
      pdf.text("Qty", COLS.qty, y + 1, { width: 40, align: "right" });
      pdf.text("Days", COLS.days, y + 1, { width: 40, align: "right" });
      pdf.text("Unit/day", COLS.unit - 6, y + 1, { width: 56, align: "right" });
      pdf.text("Amount", COLS.amount - 90, y + 1, { width: 84, align: "right" });
      return y + 20;
    };

    // Draws a band of rows starting at y, paginating as needed. Returns new y.
    const drawRows = (lines: QuotationLine[], startY: number): number => {
      let y = startY;
      pdf.font("Helvetica").fontSize(9).fillColor("#222");
      for (const line of lines) {
        const descHeight = pdf.heightOfString(line.description || "—", { width: COLS.qty - COLS.desc - 12 });
        const rowH = Math.max(16, descHeight + 6);
        if (y + rowH > 760) {
          pdf.addPage();
          y = drawHeader(48);
          pdf.font("Helvetica").fontSize(9).fillColor("#222");
        }
        pdf.fillColor("#222").text(line.description || "—", COLS.desc + 6, y, { width: COLS.qty - COLS.desc - 12 });
        pdf.text(String(line.qty), COLS.qty, y, { width: 40, align: "right" });
        pdf.text(String(line.days), COLS.days, y, { width: 40, align: "right" });
        pdf.text(php(line.unitRate), COLS.unit - 6, y, { width: 56, align: "right" });
        pdf.text(php(lineAmount(line)), COLS.amount - 90, y, { width: 84, align: "right" });
        y += rowH;
        pdf.moveTo(LEFT, y - 3).lineTo(RIGHT, y - 3).strokeColor("#eee").stroke();
      }
      return y;
    };

    const sectionLabel = (label: string, y: number): number => {
      pdf.font("Helvetica-Bold").fontSize(9).fillColor("#6c675f").text(label.toUpperCase(), LEFT + 2, y);
      return y + 14;
    };

    // ── Equipment ─────────────────────────────────────────────────────────────
    let y = drawHeader(pdf.y);
    y = sectionLabel("Equipment", y);
    y = drawRows(doc.lines, y);

    // ── Labor / personnel ──────────────────────────────────────────────────────
    if (laborLines.length) {
      y += 6;
      if (y > 740) { pdf.addPage(); y = drawHeader(48); }
      y = sectionLabel("Labor / Personnel", y);
      y = drawRows(laborLines, y);
    }

    // ── Totals ───────────────────────────────────────────────────────────────
    y += 8;
    if (y > 700) { pdf.addPage(); y = 60; }
    const totalRow = (label: string, value: string, bold = false) => {
      pdf.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(bold ? 11 : 9).fillColor(bold ? "#15130f" : "#555");
      pdf.text(label, COLS.unit - 150, y, { width: 190, align: "right" });
      pdf.text(value, COLS.amount - 90, y, { width: 84, align: "right" });
      y += bold ? 18 : 14;
    };
    if (laborLines.length) {
      totalRow("Total equipment cost", php(totals.equipmentSubtotal));
      totalRow("Labor cost", php(totals.laborSubtotal));
    }
    if (doc.applySurcharge) totalRow(`Out-of-town surcharge (${Math.round(doc.surchargeRate * 100)}%)`, php(totals.surcharge));
    totalRow("Subtotal", php(totals.subtotal));
    if (totals.discount > 0) totalRow(`Special discount (${Math.round(doc.specialDiscountRate * 100)}%)`, "- " + php(totals.discount));
    y += 2;
    pdf.moveTo(COLS.unit - 150, y - 2).lineTo(RIGHT, y - 2).strokeColor("#ccc").stroke();
    y += 4;
    totalRow("GRAND TOTAL", php(totals.total), true);

    // ── Payment terms + bank details ──────────────────────────────────────────
    y += 8;
    if (y > 660) { pdf.addPage(); y = 60; }
    if (doc.paymentTerms && doc.paymentTerms.trim()) {
      pdf.font("Helvetica-Bold").fontSize(9).fillColor("#15130f").text("Payment Terms", LEFT, y);
      pdf.font("Helvetica").fontSize(9).fillColor("#555").text(doc.paymentTerms.trim(), LEFT, pdf.y + 2, { width: RIGHT - LEFT });
      y = pdf.y + 8;
    }
    pdf.font("Helvetica-Bold").fontSize(9).fillColor("#15130f").text("Bank Details", LEFT, y);
    pdf.font("Helvetica").fontSize(9).fillColor("#555");
    pdf.text(`${BMR_BANK.bankName}  ·  ${BMR_BANK.accountName}  ·  ${BMR_BANK.accountNumber}`, LEFT, pdf.y + 2);
    pdf.fillColor("#999").fontSize(8).text(BMR_BANK.note);
    y = pdf.y;

    // ── Notes ────────────────────────────────────────────────────────────────
    if (doc.notes && doc.notes.trim()) {
      y += 8;
      if (y > 700) { pdf.addPage(); y = 60; }
      pdf.font("Helvetica-Bold").fontSize(9).fillColor("#15130f").text("Notes", LEFT, y);
      pdf.font("Helvetica").fontSize(9).fillColor("#555").text(doc.notes.trim(), LEFT, pdf.y + 2, { width: RIGHT - LEFT });
    }

    // ── Terms & conditions ────────────────────────────────────────────────────
    pdf.addPage();
    pdf.font("Helvetica-Bold").fontSize(12).fillColor("#15130f").text("Terms & Conditions", LEFT, 48);
    pdf.moveDown(0.5);
    pdf.font("Helvetica").fontSize(8).fillColor("#444");
    for (const term of doc.terms) {
      pdf.text(term, { width: RIGHT - LEFT, align: "left" });
      pdf.moveDown(0.4);
    }

    // ── Signatures ─────────────────────────────────────────────────────────────
    pdf.moveDown(1.5);
    let sigY = pdf.y;
    if (sigY > 640) {
      pdf.addPage();
      sigY = 60;
    }

    // Provider (left): approved & issued, with the captured e-signature.
    pdf.font("Helvetica-Bold").fontSize(9).fillColor("#15130f").text("Approved & issued by the Provider", LEFT, sigY);
    if (doc.signatureDataUrl && doc.signatureDataUrl.startsWith("data:image")) {
      try {
        const base64 = doc.signatureDataUrl.split(",")[1] ?? "";
        const buf = Buffer.from(base64, "base64");
        pdf.image(buf, LEFT, sigY + 16, { fit: [180, 56] });
      } catch {
        /* ignore bad signature image */
      }
    }
    const lineY = sigY + 78;
    pdf.moveTo(LEFT, lineY).lineTo(LEFT + 220, lineY).strokeColor("#888").stroke();
    pdf.font("Helvetica-Bold").fontSize(9).fillColor("#15130f").text(doc.signedBy || BMR_BUSINESS.proprietor, LEFT, lineY + 4);
    pdf.font("Helvetica").fontSize(8).fillColor("#777").text(BMR_BUSINESS.tradeName);
    if (doc.signedDate) pdf.text(`Date: ${prettyDate(doc.signedDate)}`);

    // Client (right): Received & Conforme — signed by the hirer on acceptance.
    const RCOL = LEFT + 280;
    pdf.font("Helvetica-Bold").fontSize(9).fillColor("#15130f").text("Received & Conforme", RCOL, sigY);
    pdf.font("Helvetica").fontSize(8).fillColor("#777");
    pdf.text("Name:", RCOL, sigY + 22);
    pdf.fillColor("#15130f").text(doc.client.name || "", RCOL + 34, sigY + 22);
    pdf.fillColor("#777").text("Position:", RCOL, sigY + 38);
    pdf.text("Date:", RCOL, sigY + 54);
    pdf.moveTo(RCOL, lineY).lineTo(RCOL + 200, lineY).strokeColor("#888").stroke();
    pdf.font("Helvetica").fontSize(8).fillColor("#777").text("Authorized signature with printed name", RCOL, lineY + 4);

    pdf.end();
  });
}
