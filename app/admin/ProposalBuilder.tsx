"use client";

import type { CSSProperties } from "react";
import { useMemo, useState } from "react";
import { FileText, Plus, Printer, Trash2 } from "lucide-react";
import { COMPANY } from "@/lib/company";
import { currency, type EquipmentItem } from "@/lib/catalog";

type Line = { id: string; description: string; qty: number; days: number; rate: number };

const newLine = (over: Partial<Line> = {}): Line => ({
  id: `ln-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  description: "",
  qty: 1,
  days: 1,
  rate: 0,
  ...over,
});

const today = () => new Date().toISOString().slice(0, 10);
const addDays = (iso: string, n: number) => {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
const fmtDate = (iso: string) => {
  try {
    return new Date(iso + "T00:00:00").toLocaleDateString("en-PH", { dateStyle: "long" });
  } catch {
    return iso;
  }
};

const DEFAULT_TERMS = [
  "Rates are per day, per unit, unless otherwise stated.",
  "A reservation is confirmed upon receipt of the agreed downpayment.",
  "A refundable security deposit may be required and is returned after equipment is checked in undamaged.",
  "The client is responsible for loss or damage while equipment is in their care.",
  "This proposal is an estimate and is valid until the date indicated above.",
].join("\n");

// In-house proposal generator: fill in the details, add line items (or quick-add from
// the catalog), then Download/Print as PDF. Pure client-side document — no data saved.
export default function ProposalBuilder({ catalog }: { catalog: EquipmentItem[] }) {
  const [proposalNo, setProposalNo] = useState(`VL-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`);
  const [date, setDate] = useState(today());
  const [validDays, setValidDays] = useState("14");
  const [clientName, setClientName] = useState("");
  const [clientCompany, setClientCompany] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [projectTitle, setProjectTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Line[]>([newLine()]);
  const [discount, setDiscount] = useState("0");
  const [terms, setTerms] = useState(DEFAULT_TERMS);
  const [quickPick, setQuickPick] = useState("");

  const validUntil = useMemo(() => addDays(date, Number(validDays) || 0), [date, validDays]);
  const lineTotal = (l: Line) => (Number(l.qty) || 0) * (Number(l.days) || 0) * (Number(l.rate) || 0);
  const subtotal = useMemo(() => lines.reduce((s, l) => s + lineTotal(l), 0), [lines]);
  const discountVal = Number(discount) || 0;
  const total = Math.max(0, subtotal - discountVal);

  const updateLine = (id: string, patch: Partial<Line>) =>
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  const removeLine = (id: string) => setLines((prev) => prev.filter((l) => l.id !== id));

  const quickAdd = (itemId: string) => {
    const it = catalog.find((c) => c.id === itemId);
    if (!it) return;
    setLines((prev) => [...prev, newLine({ description: it.name, rate: it.ratePerDay })]);
    setQuickPick("");
  };

  return (
    <div className="surface" style={{ padding: 18, borderRadius: 20 }}>
      <h2 style={{ fontFamily: '"Jost", sans-serif', fontSize: 24, marginTop: 0, display: "inline-flex", alignItems: "center", gap: 9 }}>
        <FileText size={20} /> Proposal generator
      </h2>
      <p style={{ color: "#6c675f", fontSize: 13, marginTop: 2 }}>Fill in the details, then Download / Print as PDF. Nothing is saved — this just builds the document.</p>

      {/* ── Editor ─────────────────────────────────────────────────────────── */}
      <div className="vl-no-print" style={{ display: "grid", gap: 14, marginTop: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))", gap: 12 }}>
          <FieldS label="Proposal #" value={proposalNo} onChange={setProposalNo} />
          <FieldS label="Date" type="date" value={date} onChange={setDate} />
          <FieldS label="Valid for (days)" value={validDays} onChange={setValidDays} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: 12 }}>
          <FieldS label="Client name" value={clientName} onChange={setClientName} />
          <FieldS label="Client company" value={clientCompany} onChange={setClientCompany} />
          <FieldS label="Client email" value={clientEmail} onChange={setClientEmail} />
          <FieldS label="Client address" value={clientAddress} onChange={setClientAddress} />
        </div>
        <FieldS label="Project / title" value={projectTitle} onChange={setProjectTitle} />

        {/* Line items */}
        <div style={{ display: "grid", gap: 8 }}>
          <span style={labelStyle}>Line items</span>
          {lines.map((l) => (
            <div key={l.id} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 64px 64px 110px 36px", gap: 8, alignItems: "center" }}>
              <input value={l.description} onChange={(e) => updateLine(l.id, { description: e.target.value })} placeholder="Item / service" style={cell} />
              <input value={String(l.qty)} onChange={(e) => updateLine(l.id, { qty: Number(e.target.value) })} placeholder="Qty" inputMode="numeric" style={cell} />
              <input value={String(l.days)} onChange={(e) => updateLine(l.id, { days: Number(e.target.value) })} placeholder="Days" inputMode="numeric" style={cell} />
              <input value={String(l.rate)} onChange={(e) => updateLine(l.id, { rate: Number(e.target.value) })} placeholder="Rate/day" inputMode="numeric" style={cell} />
              <button onClick={() => removeLine(l.id)} style={{ ...miniBtn, padding: "8px 10px" }} title="Remove"><Trash2 size={14} /></button>
            </div>
          ))}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
            <button onClick={() => setLines((prev) => [...prev, newLine()])} style={miniBtn}><Plus size={14} /> Add line</button>
            {catalog.length > 0 && (
              <select value={quickPick} onChange={(e) => quickAdd(e.target.value)} style={{ ...cell, width: "auto", flex: "1 1 200px" }}>
                <option value="">Quick-add from catalog…</option>
                {catalog.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} — {currency(c.ratePerDay)}/day</option>
                ))}
              </select>
            )}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: 12 }}>
          <FieldS label="Discount (₱)" value={discount} onChange={setDiscount} />
        </div>
        <label style={{ display: "grid", gap: 8 }}>
          <span style={labelStyle}>Notes (optional)</span>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} style={inputStyle} />
        </label>
        <label style={{ display: "grid", gap: 8 }}>
          <span style={labelStyle}>Terms (one per line)</span>
          <textarea value={terms} onChange={(e) => setTerms(e.target.value)} rows={5} style={inputStyle} />
        </label>

        <div>
          <button onClick={() => window.print()} style={{ ...miniBtn, background: "#15130f", color: "#fffdf8" }}>
            <Printer size={15} /> Download / Print PDF
          </button>
        </div>
      </div>

      {/* ── Printable document ─────────────────────────────────────────────── */}
      <div id="proposal-print" style={{ marginTop: 22 }}>
        <div style={{ border: "1px solid rgba(17,17,17,0.14)", borderRadius: 14, padding: 28, background: "#ffffff", color: "#15130f" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontFamily: '"Jost", sans-serif', fontSize: 26, fontWeight: 800 }}>{COMPANY.brand}</div>
              <div style={{ fontSize: 12, color: "#5c574e", lineHeight: 1.6, marginTop: 4 }}>
                {COMPANY.legalName}<br />
                {COMPANY.address}<br />
                {COMPANY.email} · {COMPANY.domain}<br />
                {COMPANY.taxType} · TIN {COMPANY.tin}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: '"Jost", sans-serif', fontSize: 22, fontWeight: 800, letterSpacing: 1 }}>PROPOSAL</div>
              <div style={{ fontSize: 12, color: "#5c574e", lineHeight: 1.7, marginTop: 4 }}>
                <div><strong>No.</strong> {proposalNo}</div>
                <div><strong>Date:</strong> {fmtDate(date)}</div>
                <div><strong>Valid until:</strong> {fmtDate(validUntil)}</div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 22, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
            <div>
              <div style={sectionLabel}>Prepared for</div>
              <div style={{ fontSize: 13, lineHeight: 1.7 }}>
                {clientName && <div><strong>{clientName}</strong></div>}
                {clientCompany && <div>{clientCompany}</div>}
                {clientEmail && <div>{clientEmail}</div>}
                {clientAddress && <div>{clientAddress}</div>}
                {!clientName && !clientCompany && <div style={{ color: "#a59f93" }}>—</div>}
              </div>
            </div>
            {projectTitle && (
              <div>
                <div style={sectionLabel}>Project</div>
                <div style={{ fontSize: 13, lineHeight: 1.7 }}>{projectTitle}</div>
              </div>
            )}
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 22, fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "2px solid #15130f" }}>
                <th style={th}>Item / service</th>
                <th style={{ ...th, textAlign: "right" }}>Qty</th>
                <th style={{ ...th, textAlign: "right" }}>Days</th>
                <th style={{ ...th, textAlign: "right" }}>Rate/day</th>
                <th style={{ ...th, textAlign: "right" }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {lines.filter((l) => l.description || lineTotal(l) > 0).map((l) => (
                <tr key={l.id} style={{ borderBottom: "1px solid rgba(17,17,17,0.1)" }}>
                  <td style={td}>{l.description || "—"}</td>
                  <td style={{ ...td, textAlign: "right" }}>{l.qty}</td>
                  <td style={{ ...td, textAlign: "right" }}>{l.days}</td>
                  <td style={{ ...td, textAlign: "right" }}>{currency(Number(l.rate) || 0)}</td>
                  <td style={{ ...td, textAlign: "right" }}>{currency(lineTotal(l))}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
            <table style={{ fontSize: 13, minWidth: 240 }}>
              <tbody>
                <tr><td style={{ padding: "4px 0", color: "#5c574e" }}>Subtotal</td><td style={{ padding: "4px 0", textAlign: "right" }}>{currency(subtotal)}</td></tr>
                {discountVal > 0 && <tr><td style={{ padding: "4px 0", color: "#5c574e" }}>Discount</td><td style={{ padding: "4px 0", textAlign: "right" }}>− {currency(discountVal)}</td></tr>}
                <tr style={{ borderTop: "2px solid #15130f" }}>
                  <td style={{ padding: "8px 0", fontWeight: 800, fontSize: 15 }}>Total</td>
                  <td style={{ padding: "8px 0", textAlign: "right", fontWeight: 800, fontSize: 15 }}>{currency(total)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {notes && (
            <div style={{ marginTop: 18 }}>
              <div style={sectionLabel}>Notes</div>
              <div style={{ fontSize: 13, whiteSpace: "pre-wrap", lineHeight: 1.7 }}>{notes}</div>
            </div>
          )}

          <div style={{ marginTop: 18 }}>
            <div style={sectionLabel}>Terms</div>
            <ul style={{ fontSize: 12, color: "#3f3a32", lineHeight: 1.7, paddingLeft: 18, margin: 0 }}>
              {terms.split("\n").map((t) => t.trim()).filter(Boolean).map((t, i) => <li key={i}>{t}</li>)}
            </ul>
          </div>

          <div style={{ marginTop: 26, fontSize: 11, color: "#8a8479", textAlign: "center" }}>
            {COMPANY.operatedByLine}. This proposal is a provisional document, not an official receipt.
          </div>
        </div>
      </div>

      {/* Print isolation: only #proposal-print shows on paper/PDF. */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #proposal-print, #proposal-print * { visibility: visible !important; }
          #proposal-print { position: absolute !important; left: 0; top: 0; width: 100%; margin: 0; }
          #proposal-print > div { border: none !important; border-radius: 0 !important; padding: 0 !important; }
          .vl-no-print { display: none !important; }
        }
      `}</style>
    </div>
  );
}

function FieldS({ label, value, onChange, type }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label style={{ display: "grid", gap: 8 }}>
      <span style={labelStyle}>{label}</span>
      <input type={type ?? "text"} value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle} />
    </label>
  );
}

const labelStyle: CSSProperties = { color: "#6c675f", fontSize: 13 };
const sectionLabel: CSSProperties = { fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", color: "#8a8479", marginBottom: 6 };
const inputStyle: CSSProperties = { background: "#fffdf8", color: "#15130f", border: "1px solid rgba(17,17,17,0.18)", borderRadius: 12, padding: "12px 14px", outline: "none" };
const cell: CSSProperties = { ...inputStyle, padding: "10px 12px", borderRadius: 10, width: "100%" };
const miniBtn: CSSProperties = { background: "#f1f1ee", color: "#111", border: "none", borderRadius: 999, padding: "10px 16px", fontWeight: 800, display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer" };
const th: CSSProperties = { padding: "8px 6px", fontSize: 12, color: "#5c574e", fontWeight: 800 };
const td: CSSProperties = { padding: "9px 6px" };
