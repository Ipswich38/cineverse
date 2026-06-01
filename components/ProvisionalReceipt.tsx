"use client";

import Link from "next/link";
import { Printer, ArrowLeft } from "lucide-react";
import { COMPANY } from "@/lib/company";
import { currency } from "@/lib/catalog";
import type { CartItem } from "@/lib/catalog";

export default function ProvisionalReceipt({
  refNo,
  name,
  email,
  phone,
  company,
  schedule,
  handoff,
  method,
  cart,
  subtotal,
  downpayment,
}: {
  refNo: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  schedule: string;
  handoff: "pickup" | "delivery";
  method: string;
  cart: CartItem[];
  subtotal: number;
  downpayment: number;
}) {
  const balance = Math.max(0, subtotal - downpayment);
  const issued = new Date().toLocaleString("en-PH", { dateStyle: "long", timeStyle: "short" });

  return (
    <div>
      {/* Actions (hidden on print) */}
      <div className="no-print" style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <Link href="/store" style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "#15130f", textDecoration: "none", fontSize: 13, fontWeight: 700 }}>
          <ArrowLeft size={16} /> Back to store
        </Link>
        <button
          onClick={() => window.print()}
          style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#f5c518", color: "#15130f", border: 0, borderRadius: 999, padding: "11px 22px", fontWeight: 800, cursor: "pointer", boxShadow: "0 10px 22px rgba(245,197,24,0.4)" }}
        >
          <Printer size={16} /> Print / Save PDF
        </button>
      </div>

      {/* Receipt paper */}
      <div className="receipt-paper" style={{ background: "#fffdf8", border: "1px solid rgba(17,17,17,0.16)", borderRadius: 16, padding: "26px 26px 30px", maxWidth: 720, margin: "0 auto", boxShadow: "0 24px 60px rgba(17,17,17,0.12)" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
          <div>
            <p style={{ margin: 0, fontFamily: '"Jost", sans-serif', fontWeight: 700, fontSize: 22, letterSpacing: "-0.02em" }}>{COMPANY.legalName}</p>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#6c675f", lineHeight: 1.5, maxWidth: 340 }}>{COMPANY.address}</p>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#6c675f" }}>{COMPANY.taxType} · TIN {COMPANY.tin}</p>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#a8843e", fontWeight: 600 }}>VissionLink.com</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <span style={{ display: "inline-block", background: "#15130f", color: "#fffdf8", fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", padding: "6px 12px", borderRadius: 999 }}>
              Provisional Receipt
            </span>
            <p style={{ margin: "10px 0 0", fontSize: 12, color: "#6c675f" }}>Ref No.</p>
            <p style={{ margin: "1px 0 0", fontFamily: '"Jost", sans-serif', fontWeight: 700, fontSize: 16 }}>{refNo}</p>
            <p style={{ margin: "8px 0 0", fontSize: 12, color: "#6c675f" }}>{issued}</p>
          </div>
        </div>

        {/* NOT-OFFICIAL banner */}
        <div style={{ marginTop: 18, background: "#fff7e6", border: "1px solid rgba(180,120,0,0.28)", borderRadius: 12, padding: "12px 14px", color: "#8a5b00", fontSize: 12.5, lineHeight: 1.55 }}>
          <strong>This is a provisional acknowledgment of your reservation request — not an Official Receipt.</strong> The
          Official Receipt / Service Invoice will be issued by {COMPANY.legalName} upon payment, in accordance with its
          BIR-registered receipt booklet.
        </div>

        {/* Bill to */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginTop: 20 }}>
          <Block label="Billed to">
            <strong>{name || "—"}</strong>
            {company && <div style={{ color: "#6c675f" }}>{company}</div>}
            {email && <div style={{ color: "#6c675f" }}>{email}</div>}
            {phone && <div style={{ color: "#6c675f" }}>{phone}</div>}
          </Block>
          <Block label="Reservation">
            <div style={{ color: "#6c675f" }}>Handoff: <strong style={{ color: "#15130f" }}>{handoff === "pickup" ? "Pickup" : "Delivery"}</strong></div>
            <div style={{ color: "#6c675f" }}>Payment: <strong style={{ color: "#15130f" }}>{method}</strong></div>
            {schedule && <div style={{ color: "#6c675f" }}>Schedule: {schedule}</div>}
          </Block>
        </div>

        {/* Line items */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 20, fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid rgba(17,17,17,0.18)" }}>
              <th style={{ padding: "8px 6px", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "#6c675f" }}>Item</th>
              <th style={{ padding: "8px 6px", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "#6c675f", textAlign: "center" }}>Qty × Days</th>
              <th style={{ padding: "8px 6px", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "#6c675f", textAlign: "right" }}>Rate/day</th>
              <th style={{ padding: "8px 6px", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "#6c675f", textAlign: "right" }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {cart.map((item) => (
              <tr key={`${item.itemId}-${item.days}`} style={{ borderBottom: "1px solid rgba(17,17,17,0.08)" }}>
                <td style={{ padding: "9px 6px" }}>
                  <div style={{ fontWeight: 700 }}>{item.name}</div>
                  <div style={{ color: "#6c675f", fontSize: 12 }}>{item.owner}</div>
                </td>
                <td style={{ padding: "9px 6px", textAlign: "center" }}>{item.quantity} × {item.days}</td>
                <td style={{ padding: "9px 6px", textAlign: "right" }}>{currency(item.ratePerDay)}</td>
                <td style={{ padding: "9px 6px", textAlign: "right" }}>{currency(item.ratePerDay * item.days * item.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
          <div style={{ width: "min(320px, 100%)", display: "grid", gap: 8, fontSize: 13 }}>
            <Row label="Rental subtotal" value={currency(subtotal)} />
            <Row label="Reservation downpayment (30%)" value={currency(downpayment)} strong />
            <Row label="Balance on / before handover" value={currency(balance)} />
          </div>
        </div>

        {/* Footer notices */}
        <div style={{ marginTop: 22, borderTop: "1px solid rgba(17,17,17,0.12)", paddingTop: 14, display: "grid", gap: 6 }}>
          <p style={{ margin: 0, fontSize: 11.5, fontWeight: 700, letterSpacing: "0.04em", color: "#8a5b00" }}>
            THIS DOCUMENT IS NOT VALID FOR CLAIM OF INPUT TAXES.
          </p>
          <p style={{ margin: 0, fontSize: 11.5, color: "#6c675f", lineHeight: 1.55 }}>
            No final charge is collected on this acknowledgment. A secure PayMongo payment link is sent after availability is
            confirmed. The Official Receipt follows upon payment.
          </p>
        </div>
      </div>
    </div>
  );
}

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ border: "1px solid rgba(17,17,17,0.12)", borderRadius: 12, padding: 14 }}>
      <p style={{ margin: "0 0 6px", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "#6c675f", fontWeight: 700 }}>{label}</p>
      <div style={{ fontSize: 13, lineHeight: 1.5 }}>{children}</div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
      <span style={{ color: "#6c675f" }}>{label}</span>
      <span style={{ fontWeight: strong ? 800 : 700, color: "#15130f" }}>{value}</span>
    </div>
  );
}
