import type PDFDocument from "pdfkit";
import { BMR_BANK, BMR_BUSINESS } from "./bmr-rate-card";
import { lineAmount, type QuotationLine } from "./quotation";

// Shared PDF primitives for the BMR document family (quotation / contract /
// invoice). pdfkit's built-in Helvetica has no ₱ glyph, so amounts print "PHP".

type Doc = InstanceType<typeof PDFDocument>;

export const LEFT = 48;
export const RIGHT = 547; // A4 width 595.28 − 48
export const COLS = { desc: 48, qty: 300, days: 350, unit: 400, amount: RIGHT };

export function php(n: number): string {
  return "PHP " + (Number(n) || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function prettyDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" });
}

// Letterhead + a right-aligned document title and meta lines. Returns the y
// below the divider rule.
export function drawLetterhead(pdf: Doc, title: string, metaLines: string[]): number {
  pdf.fillColor("#15130f").font("Helvetica-Bold").fontSize(18).text(BMR_BUSINESS.tradeName, LEFT, 48);
  pdf.font("Helvetica").fontSize(9).fillColor("#555");
  pdf.text(BMR_BUSINESS.proprietor);
  pdf.text(BMR_BUSINESS.address);
  pdf.text(`TIN ${BMR_BUSINESS.tin}  ·  ${BMR_BUSINESS.phone}`);
  pdf.text(`${BMR_BUSINESS.email} / ${BMR_BUSINESS.altEmail}`);

  pdf.font("Helvetica-Bold").fontSize(22).fillColor("#111").text(title, LEFT, 48, { align: "right" });
  pdf.font("Helvetica").fontSize(9).fillColor("#555");
  for (const m of metaLines) pdf.text(m, { align: "right" });

  pdf.moveDown(1.2);
  pdf.moveTo(LEFT, pdf.y).lineTo(RIGHT, pdf.y).strokeColor("#ddd").stroke();
  pdf.moveDown(0.8);
  return pdf.y;
}

// "PREPARED FOR" / "BILL TO" block.
export function drawClientBlock(pdf: Doc, label: string, client: { name: string; company: string; email: string; phone: string; project: string }, extra: string[] = []): number {
  const top = pdf.y;
  pdf.font("Helvetica-Bold").fontSize(9).fillColor("#999").text(label, LEFT, top);
  pdf.font("Helvetica-Bold").fontSize(11).fillColor("#15130f").text(client.name || "—", LEFT, pdf.y + 2);
  pdf.font("Helvetica").fontSize(9).fillColor("#555");
  if (client.company) pdf.text(client.company);
  if (client.email) pdf.text(client.email);
  if (client.phone) pdf.text(client.phone);
  if (client.project) pdf.text(`Project: ${client.project}`);
  for (const e of extra) pdf.text(e);
  pdf.moveDown(1);
  return pdf.y;
}

function tableHeader(pdf: Doc, y: number): number {
  pdf.font("Helvetica-Bold").fontSize(9).fillColor("#fff");
  pdf.rect(LEFT, y - 3, RIGHT - LEFT, 18).fill("#15130f");
  pdf.fillColor("#fff");
  pdf.text("Description", COLS.desc + 6, y + 1, { width: COLS.qty - COLS.desc - 10 });
  pdf.text("Qty", COLS.qty, y + 1, { width: 40, align: "right" });
  pdf.text("Days", COLS.days, y + 1, { width: 40, align: "right" });
  pdf.text("Unit/day", COLS.unit - 6, y + 1, { width: 56, align: "right" });
  pdf.text("Amount", COLS.amount - 90, y + 1, { width: 84, align: "right" });
  return y + 20;
}

// Renders labeled bands of line items under a single table header, paginating as
// needed. Returns the y below the last row.
export function drawLineTable(pdf: Doc, bands: { label: string; lines: QuotationLine[] }[], startY: number): number {
  let y = tableHeader(pdf, startY);
  for (const band of bands) {
    if (!band.lines.length) continue;
    if (y > 740) { pdf.addPage(); y = tableHeader(pdf, 48); }
    pdf.font("Helvetica-Bold").fontSize(9).fillColor("#6c675f").text(band.label.toUpperCase(), LEFT + 2, y);
    y += 14;
    pdf.font("Helvetica").fontSize(9).fillColor("#222");
    for (const line of band.lines) {
      const descHeight = pdf.heightOfString(line.description || "—", { width: COLS.qty - COLS.desc - 12 });
      const rowH = Math.max(16, descHeight + 6);
      if (y + rowH > 760) { pdf.addPage(); y = tableHeader(pdf, 48); pdf.font("Helvetica").fontSize(9).fillColor("#222"); }
      pdf.fillColor("#222").text(line.description || "—", COLS.desc + 6, y, { width: COLS.qty - COLS.desc - 12 });
      pdf.text(String(line.qty), COLS.qty, y, { width: 40, align: "right" });
      pdf.text(String(line.days), COLS.days, y, { width: 40, align: "right" });
      pdf.text(php(line.unitRate), COLS.unit - 6, y, { width: 56, align: "right" });
      pdf.text(php(lineAmount(line)), COLS.amount - 90, y, { width: 84, align: "right" });
      y += rowH;
      pdf.moveTo(LEFT, y - 3).lineTo(RIGHT, y - 3).strokeColor("#eee").stroke();
    }
  }
  return y;
}

// Right-aligned totals rows. Pass a sequence of [label, value, bold?].
export function drawTotals(pdf: Doc, rows: [string, string, boolean?][], startY: number): number {
  let y = startY;
  for (const [label, value, bold] of rows) {
    if (label === "—rule—") {
      pdf.moveTo(COLS.unit - 150, y).lineTo(RIGHT, y).strokeColor("#ccc").stroke();
      y += 6;
      continue;
    }
    pdf.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(bold ? 11 : 9).fillColor(bold ? "#15130f" : "#555");
    pdf.text(label, COLS.unit - 150, y, { width: 190, align: "right" });
    pdf.text(value, COLS.amount - 90, y, { width: 84, align: "right" });
    y += bold ? 18 : 14;
  }
  return y;
}

// Payment terms + bank details block.
export function drawPaymentBlock(pdf: Doc, paymentTerms: string, y: number): number {
  if (paymentTerms && paymentTerms.trim()) {
    pdf.font("Helvetica-Bold").fontSize(9).fillColor("#15130f").text("Payment Terms", LEFT, y);
    pdf.font("Helvetica").fontSize(9).fillColor("#555").text(paymentTerms.trim(), LEFT, pdf.y + 2, { width: RIGHT - LEFT });
    y = pdf.y + 8;
  }
  pdf.font("Helvetica-Bold").fontSize(9).fillColor("#15130f").text("Bank Details", LEFT, y);
  pdf.font("Helvetica").fontSize(9).fillColor("#555").text(`${BMR_BANK.bankName}  ·  ${BMR_BANK.accountName}  ·  ${BMR_BANK.accountNumber}`, LEFT, pdf.y + 2);
  pdf.fillColor("#999").fontSize(8).text(BMR_BANK.note);
  return pdf.y;
}

// Full terms & conditions on a fresh page.
export function drawTermsPage(pdf: Doc, terms: string[], heading = "Terms & Conditions"): void {
  pdf.addPage();
  pdf.font("Helvetica-Bold").fontSize(12).fillColor("#15130f").text(heading, LEFT, 48);
  pdf.moveDown(0.5);
  pdf.font("Helvetica").fontSize(8).fillColor("#444");
  for (const term of terms) {
    pdf.text(term, { width: RIGHT - LEFT, align: "left" });
    pdf.moveDown(0.4);
  }
}

// One signature block: title, optional drawn signature image, a rule, then the
// signer's name, an optional sub-line, and an optional date.
export function drawSignature(
  pdf: Doc,
  opts: { title: string; signatureDataUrl: string | null; name: string; sub?: string; date?: string; position?: string },
  x: number,
  baseY: number,
  width = 220,
): void {
  pdf.font("Helvetica-Bold").fontSize(9).fillColor("#15130f").text(opts.title, x, baseY);
  if (opts.signatureDataUrl && opts.signatureDataUrl.startsWith("data:image")) {
    try {
      const base64 = opts.signatureDataUrl.split(",")[1] ?? "";
      pdf.image(Buffer.from(base64, "base64"), x, baseY + 16, { fit: [Math.min(180, width - 20), 52] });
    } catch {
      /* ignore bad signature image */
    }
  }
  if (opts.position) pdf.font("Helvetica").fontSize(8).fillColor("#777").text(`Position: ${opts.position}`, x, baseY + 56);
  const lineY = baseY + 78;
  pdf.moveTo(x, lineY).lineTo(x + width, lineY).strokeColor("#888").stroke();
  pdf.font("Helvetica-Bold").fontSize(9).fillColor("#15130f").text(opts.name || "", x, lineY + 4);
  if (opts.sub) pdf.font("Helvetica").fontSize(8).fillColor("#777").text(opts.sub);
  if (opts.date) pdf.font("Helvetica").fontSize(8).fillColor("#777").text(`Date: ${prettyDate(opts.date)}`);
}
