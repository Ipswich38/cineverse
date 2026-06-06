"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Loader2, Lock, ShieldCheck } from "lucide-react";
import { useStore } from "../providers";
import { peso, DOWNPAYMENT_RATE } from "@/lib/rental-pricing";

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="app-container" style={{ padding: "34px 0 76px" }}>Loading…</div>}>
      <CheckoutContent />
    </Suspense>
  );
}

function CheckoutContent() {
  const { cart, subtotal, downpaymentTotal, balanceTotal } = useStore();
  const params = useSearchParams();
  const cancelled = params.get("cancelled");
  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "", deliveryAddress: "", dateFrom: "", dateTo: "", notes: "" });
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    setError("");
    if (!form.name.trim() || !form.email.trim()) { setError("Name and email are required."); return; }
    if (!form.dateFrom || !form.dateTo) { setError("Choose rental start and end dates."); return; }
    if (!agree) { setError("Please accept the rental/lease terms."); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/checkout/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, agree, cart: cart.map((c) => ({ itemId: c.itemId, days: c.days, quantity: c.quantity })) }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Could not start checkout.");
      window.location.href = data.checkoutUrl; // redirect to PayMongo hosted checkout
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start checkout.");
      setBusy(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="app-container" style={{ padding: "34px 0 76px", maxWidth: 720 }}>
        <h1 style={{ fontFamily: '"Jost", sans-serif', fontSize: 32, margin: 0 }}>Your cart is empty</h1>
        <p style={{ color: "#6c675f", marginTop: 10 }}>Add gear from the <Link href="/store">catalog</Link> to rent.</p>
      </div>
    );
  }

  return (
    <div className="app-container" style={{ padding: "28px 0 76px" }}>
      <p className="section-kicker">Checkout</p>
      <h1 style={{ fontFamily: '"Jost", sans-serif', fontSize: "clamp(28px, 4vw, 44px)", lineHeight: 1, margin: "6px 0 18px" }}>Rent your gear</h1>

      {cancelled && (
        <div style={{ padding: 12, background: "#fff7e6", border: "1px solid rgba(180,120,0,0.22)", color: "#8a5b00", borderRadius: 10, marginBottom: 16, fontSize: 13 }}>
          Payment was cancelled — your cart is intact. You can try again below.
        </div>
      )}

      <div className="cart-layout">
        <div style={{ display: "grid", gap: 14, alignContent: "start" }}>
          <Field label="Full name *"><input value={form.name} onChange={(e) => set("name", e.target.value)} style={inp} /></Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Email *"><input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} style={inp} /></Field>
            <Field label="Phone"><input value={form.phone} onChange={(e) => set("phone", e.target.value)} style={inp} /></Field>
          </div>
          <Field label="Company / production (optional)"><input value={form.company} onChange={(e) => set("company", e.target.value)} style={inp} /></Field>
          <Field label="Delivery / pickup address"><textarea value={form.deliveryAddress} onChange={(e) => set("deliveryAddress", e.target.value)} rows={2} style={{ ...inp, resize: "vertical" }} /></Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Rental from *"><input type="date" value={form.dateFrom} onChange={(e) => set("dateFrom", e.target.value)} style={inp} /></Field>
            <Field label="Rental to *"><input type="date" value={form.dateTo} onChange={(e) => set("dateTo", e.target.value)} style={inp} /></Field>
          </div>
          <Field label="Notes (optional)"><textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} style={{ ...inp, resize: "vertical" }} /></Field>

          <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13, color: "#3a362f", lineHeight: 1.5 }}>
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} style={{ marginTop: 3 }} />
            <span>I have read and agree to the <Link href="/legal/terms" target="_blank">rental/lease terms</Link>. I authorise a {Math.round(DOWNPAYMENT_RATE * 100)}% downpayment now to reserve the gear, with the balance settled before or upon handover.</span>
          </label>
        </div>

        <aside style={{ padding: 16, border: "1px solid rgba(17,17,17,0.12)", background: "#fffdf8", height: "fit-content" }}>
          <h2 style={{ fontFamily: '"Jost", sans-serif', fontSize: 20, margin: "0 0 14px" }}>Order summary</h2>
          <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
            {cart.map((c) => (
              <div key={`${c.itemId}-${c.days}`} style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 13 }}>
                <span style={{ color: "#3a362f" }}>{c.name} · {c.days}d × {c.quantity}</span>
                <span style={{ fontWeight: 700, whiteSpace: "nowrap" }}>{peso(c.ratePerDay * c.days * c.quantity)}</span>
              </div>
            ))}
          </div>
          <div style={{ height: 1, background: "rgba(17,17,17,0.12)", margin: "4px 0 12px" }} />
          <Row label="Rental subtotal" value={peso(subtotal)} />
          <Row label={`Downpayment to reserve (${Math.round(DOWNPAYMENT_RATE * 100)}%)`} value={peso(downpaymentTotal)} />
          <Row label="Balance — settled later" value={peso(balanceTotal)} />
          <div style={{ height: 1, background: "rgba(17,17,17,0.12)", margin: "10px 0" }} />
          <Row label="Pay now" value={peso(downpaymentTotal)} bold />

          {error && <p style={{ color: "#c0392b", fontSize: 13, margin: "12px 0 0" }}>{error}</p>}

          <button onClick={submit} disabled={busy} style={{ marginTop: 16, width: "100%", justifyContent: "center", display: "flex", alignItems: "center", gap: 8, background: "#f5c518", color: "#15130f", border: "none", fontWeight: 800, borderRadius: 999, padding: "13px 14px", fontSize: 14, cursor: busy ? "default" : "pointer", opacity: busy ? 0.7 : 1 }}>
            {busy ? <><Loader2 size={16} className="spin" /> Starting secure checkout…</> : <>Pay {peso(downpaymentTotal)} <ArrowRight size={16} /></>}
          </button>
          <div style={{ marginTop: 12, padding: "10px 12px", background: "#f7f5ef", border: "1px solid rgba(17,17,17,0.1)", borderRadius: 10 }}>
            <p style={{ display: "flex", alignItems: "center", gap: 6, color: "#15130f", fontSize: 12, fontWeight: 700, margin: 0 }}>
              <Lock size={13} /> Accepted payment methods
            </p>
            <p style={{ color: "#6c675f", fontSize: 11.5, lineHeight: 1.55, margin: "5px 0 0" }}>
              GCash · Maya · GrabPay · Visa &amp; Mastercard credit and debit cards (including GoTyme and other bank cards) — securely via PayMongo.
            </p>
          </div>
          <p style={{ display: "flex", gap: 7, color: "#6c675f", fontSize: 11.5, lineHeight: 1.5, margin: "10px 0 0" }}>
            <ShieldCheck size={24} style={{ flexShrink: 0, marginTop: -2 }} /> Your invoice and rental contract are emailed automatically once payment clears.
          </p>
        </aside>
      </div>
    </div>
  );
}

const inp: React.CSSProperties = { width: "100%", background: "#fffdf8", color: "#15130f", border: "1px solid rgba(17,17,17,0.18)", padding: "10px 12px", fontSize: 14, borderRadius: 8, outline: "none" };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label style={{ display: "grid", gap: 5, fontSize: 12, color: "#6c675f", fontWeight: 700 }}>{label}{children}</label>;
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: 6 }}>
      <span style={{ color: bold ? "#15130f" : "#6c675f", fontWeight: bold ? 800 : 400 }}>{label}</span>
      <span style={{ fontWeight: bold ? 800 : 700, fontSize: bold ? 18 : 14 }}>{value}</span>
    </div>
  );
}
