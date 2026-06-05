import PDFDocument from "pdfkit";
import { BMR_BUSINESS } from "./bmr-rate-card";
import { computeTotals } from "./quotation";
import { computeInvoiceMoney, CHANNEL_LABELS, type InvoiceDoc } from "./invoice";
import {
  LEFT, RIGHT, php, prettyDate,
  drawLetterhead, drawClientBlock, drawLineTable, drawTotals, drawPaymentBlock, drawTermsPage, drawSignature,
} from "./pdf-shared";

const STATUS_LABEL: Record<string, string> = { unpaid: "UNPAID", partial: "PARTIALLY PAID", paid: "PAID" };

// Renders the e-invoice: BILL TO, equipment & labor lines, the full payment
// breakdown (discounts, incidents, deposit & payments, balance with accrued late
// interest), the accepted payment channels + bank/PDC terms, the T&C, and the
// authorized signature.
export function renderInvoicePdf(doc: InvoiceDoc): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const pdf = new PDFDocument({ size: "A4", margin: 48 });
    const chunks: Buffer[] = [];
    pdf.on("data", (c: Buffer) => chunks.push(c));
    pdf.on("end", () => resolve(Buffer.concat(chunks)));
    pdf.on("error", reject);

    const totals = computeTotals(doc);
    const m = computeInvoiceMoney(doc);
    const labor = doc.laborLines ?? [];
    const incidents = doc.incidents ?? [];
    const payments = doc.payments ?? [];

    drawLetterhead(pdf, "INVOICE", [
      `No. ${doc.number}`,
      `Issued: ${prettyDate(doc.issueDate)}`,
      `Due: ${prettyDate(doc.dueDate)}`,
      `Status: ${STATUS_LABEL[m.status]}`,
    ]);

    drawClientBlock(pdf, "BILL TO", doc.client);

    let y = drawLineTable(pdf, [
      { label: "Equipment", lines: doc.lines },
      { label: "Labor / Personnel", lines: labor },
    ], pdf.y);

    // ── Money breakdown ────────────────────────────────────────────────────────
    y += 8;
    if (y > 640) { pdf.addPage(); y = 60; }
    const rows: [string, string, boolean?][] = [];
    if (labor.length) {
      rows.push(["Total equipment cost", php(totals.equipmentSubtotal)]);
      rows.push(["Labor cost", php(totals.laborSubtotal)]);
    }
    if (doc.applySurcharge) rows.push([`Out-of-town surcharge (${Math.round(doc.surchargeRate * 100)}%)`, php(totals.surcharge)]);
    if (totals.discount > 0) rows.push([`Special discount (${Math.round(doc.specialDiscountRate * 100)}%)`, "- " + php(totals.discount)]);
    rows.push(["Rental total", php(m.rental)]);
    if (m.loyaltyDiscount > 0) rows.push([`Loyalty discount (${Math.round(doc.loyaltyDiscountRate * 100)}%)`, "- " + php(m.loyaltyDiscount)]);
    if (m.pdcDiscount > 0) rows.push([`PDC discount (${Math.round(doc.pdcDiscountRate * 100)}%)`, "- " + php(m.pdcDiscount)]);
    if (m.promptDiscount > 0) rows.push([`Prompt-pay discount (${Math.round(doc.promptPayDiscountRate * 100)}%)`, "- " + php(m.promptDiscount)]);
    if (m.discountsTotal > 0) rows.push(["Net rental", php(m.net)]);
    if (m.incidentsTotal > 0) rows.push(["Incidents / charges", "+ " + php(m.incidentsTotal)]);
    if (doc.depositRequired > 0) rows.push([`Required deposit${m.depositReceived >= doc.depositRequired ? " (received)" : ""}`, php(doc.depositRequired)]);
    if (m.paid > 0) rows.push(["Payments received", "- " + php(m.paid)]);
    rows.push(["—rule—", ""]);
    if (m.interest > 0) {
      rows.push(["Amount payable", php(m.principal)]);
      rows.push([`Late interest (${Math.round(doc.lateInterestMonthlyRate * 100)}%/mo · ${m.daysOverdue}d overdue)`, "+ " + php(m.interest)]);
      rows.push(["—rule—", ""]);
    }
    rows.push(["BALANCE DUE", php(m.balance), true]);
    y = drawTotals(pdf, rows, y);

    // ── Incident ledger detail ─────────────────────────────────────────────────
    if (incidents.length) {
      y += 10;
      if (y > 700) { pdf.addPage(); y = 60; }
      pdf.font("Helvetica-Bold").fontSize(9).fillColor("#15130f").text("Incidents / charges", LEFT, y);
      y = pdf.y + 4;
      pdf.font("Helvetica").fontSize(8).fillColor("#555");
      for (const i of incidents) {
        pdf.text(`${prettyDate(i.date)} — ${i.description || "Charge"}`, LEFT, y, { width: RIGHT - LEFT - 100 });
        pdf.text(php(i.amount), RIGHT - 90, y, { width: 90, align: "right" });
        y = pdf.y + 2;
      }
    }

    // ── Payments received detail ───────────────────────────────────────────────
    if (payments.length) {
      y += 10;
      if (y > 700) { pdf.addPage(); y = 60; }
      pdf.font("Helvetica-Bold").fontSize(9).fillColor("#15130f").text("Payments received", LEFT, y);
      y = pdf.y + 4;
      pdf.font("Helvetica").fontSize(8).fillColor("#555");
      for (const p of payments) {
        const label = `${prettyDate(p.date)} — ${CHANNEL_LABELS[p.channel] ?? p.channel}${p.kind === "deposit" ? " (deposit)" : ""}${p.reference ? ` · ${p.reference}` : ""}`;
        pdf.text(label, LEFT, y, { width: RIGHT - LEFT - 100 });
        pdf.text(php(p.amount), RIGHT - 90, y, { width: 90, align: "right" });
        y = pdf.y + 2;
      }
    }

    // ── How to pay ─────────────────────────────────────────────────────────────
    y += 12;
    if (y > 640) { pdf.addPage(); y = 60; }
    pdf.font("Helvetica-Bold").fontSize(9).fillColor("#15130f").text("How to pay", LEFT, y);
    pdf.font("Helvetica").fontSize(9).fillColor("#555");
    const channels = (doc.acceptedChannels ?? []).map((c) => CHANNEL_LABELS[c]).filter(Boolean);
    if (channels.length) pdf.text(`Accepted: ${channels.join("  ·  ")}`, LEFT, pdf.y + 2, { width: RIGHT - LEFT });
    if (doc.payMongoLink && doc.payMongoLink.trim()) {
      pdf.fillColor("#1d5fbf").text(`Pay online: ${doc.payMongoLink.trim()}`, { link: doc.payMongoLink.trim(), underline: true });
      pdf.fillColor("#555");
    }
    if ((doc.acceptedChannels ?? []).includes("pdc")) {
      pdf.fillColor("#7a6f00").fontSize(8).text(
        `PDC: cheque dated on/before ${prettyDate(doc.pdcDueDate || doc.dueDate)}. A stop-payment requires written notice to BMR before the due date; a dishonored cheque is subject to B.P. 22 / Estafa liability and forfeits any PDC discount.`,
        LEFT, pdf.y + 4, { width: RIGHT - LEFT },
      );
    }
    y = drawPaymentBlock(pdf, doc.paymentTerms, pdf.y + 8);

    if (doc.notes && doc.notes.trim()) {
      y += 8;
      if (y > 700) { pdf.addPage(); y = 60; }
      pdf.font("Helvetica-Bold").fontSize(9).fillColor("#15130f").text("Notes", LEFT, y);
      pdf.font("Helvetica").fontSize(9).fillColor("#555").text(doc.notes.trim(), LEFT, pdf.y + 2, { width: RIGHT - LEFT });
    }

    drawTermsPage(pdf, doc.terms ?? []);

    pdf.moveDown(1.5);
    let sigY = pdf.y;
    if (sigY > 660) { pdf.addPage(); sigY = 60; }
    drawSignature(pdf, {
      title: "Authorized signature",
      signatureDataUrl: doc.providerSignatureDataUrl,
      name: doc.providerSignedBy || BMR_BUSINESS.proprietor,
      sub: BMR_BUSINESS.tradeName,
    }, LEFT, sigY, 220);
    drawSignature(pdf, {
      title: "Received & Conforme",
      signatureDataUrl: null,
      name: doc.client.name || "",
      sub: "Authorized signature with printed name",
    }, LEFT + 280, sigY, 200);

    pdf.end();
  });
}
