"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, BadgePercent, IdCard, Loader2, Lock, ShieldCheck } from "lucide-react";
import { useStore } from "../providers";
import { peso, rentalTotals, DOWNPAYMENT_RATE, type BalanceMethod } from "@/lib/rental-pricing";
import { CHECKOUT_RENTAL_TERMS, ACCEPTED_IDS, ID_POLICY, AFTER_DOWNPAYMENT, PAYMENT_METHODS } from "@/lib/checkout-terms";

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="app-container" style={{ padding: "34px 0 76px" }}>Loading…</div>}>
      <CheckoutContent />
    </Suspense>
  );
}

const METHOD_ORDER: BalanceMethod[] = ["standard", "full", "pdc"];

function CheckoutContent() {
  const { cart } = useStore();
  const params = useSearchParams();
  const cancelled = params.get("cancelled");
  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "", deliveryAddress: "", dateFrom: "", dateTo: "", notes: "" });
  const [method, setMethod] = useState<BalanceMethod>("standard");
  const [agree, setAgree] = useState(false);
  const [readTerms, setReadTerms] = useState(false); // unlocks only after the T&Cs are scrolled through
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  // Require the customer to actually scroll to the end of the terms before they
  // can tick "I agree". (If the box doesn't overflow on some viewport, treat it
  // as already read so they're never stuck.)
  const termsRef = useRef<HTMLDivElement>(null);
  const onTermsScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 8) setReadTerms(true);
  };
  useEffect(() => {
    const el = termsRef.current;
    if (el && el.scrollHeight <= el.clientHeight + 4) setReadTerms(true);
  }, []);

  const totals = useMemo(
    () => rentalTotals(cart.map((c) => ({ ratePerDay: c.ratePerDay, days: c.days, quantity: c.quantity })), method),
    [cart, method],
  );

  const submit = async () => {
    setError("");
    if (!form.name.trim() || !form.email.trim()) { setError("Name and email are required."); return; }
    if (!form.dateFrom || !form.dateTo) { setError("Choose rental start and end dates."); return; }
    if (!readTerms) { setError("Please scroll through and read the rental terms first."); return; }
    if (!agree) { setError("Please accept the rental/lease terms to continue."); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/checkout/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, agree, balanceMethod: method, cart: cart.map((c) => ({ itemId: c.itemId, days: c.days, quantity: c.quantity })) }),
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

          {/* ── Balance settlement method ─────────────────────────────────── */}
          <div style={{ display: "grid", gap: 9 }}>
            <p style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 800, color: "#15130f", margin: "4px 0 0" }}>
              <BadgePercent size={14} /> How would you like to settle the balance?
            </p>
            {METHOD_ORDER.map((m) => {
              const meta = PAYMENT_METHODS[m];
              const active = method === m;
              return (
                <label key={m} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "11px 13px", border: `1px solid ${active ? "rgba(180,140,0,0.55)" : "rgba(17,17,17,0.14)"}`, background: active ? "#fffae8" : "#fffdf8", borderRadius: 10, cursor: "pointer" }}>
                  <input type="radio" name="balanceMethod" checked={active} onChange={() => setMethod(m)} style={{ marginTop: 3 }} />
                  <span style={{ display: "grid", gap: 3 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, fontWeight: 800, color: "#15130f" }}>
                      {meta.label}
                      {meta.tag && <span style={{ fontSize: 10.5, fontWeight: 800, background: "#1f7a45", color: "#fff", borderRadius: 999, padding: "2px 8px" }}>{meta.tag}</span>}
                    </span>
                    <span style={{ fontSize: 11.5, color: "#6c675f", lineHeight: 1.5 }}>{meta.blurb}</span>
                  </span>
                </label>
              );
            })}
          </div>

          {/* ── ID requirement ────────────────────────────────────────────── */}
          <div style={{ padding: "12px 14px", background: "#f7f5ef", border: "1px solid rgba(17,17,17,0.1)", borderRadius: 10 }}>
            <p style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 800, color: "#15130f", margin: 0 }}>
              <IdCard size={14} /> ID required on release
            </p>
            <p style={{ fontSize: 11.5, color: "#6c675f", lineHeight: 1.55, margin: "6px 0 0" }}>{ID_POLICY}</p>
            <p style={{ fontSize: 11.5, color: "#6c675f", lineHeight: 1.55, margin: "4px 0 0" }}>Accepted: {ACCEPTED_IDS.join(" · ")}.</p>
          </div>

          {/* ── Rental terms — must be scrolled through before agreeing ────── */}
          <div style={{ border: `1px solid ${readTerms ? "rgba(31,122,69,0.45)" : "rgba(180,120,0,0.45)"}`, borderRadius: 10, background: "#fffdf8" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 14px" }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: "#15130f" }}>Rental terms &amp; conditions</span>
              <span style={{ fontSize: 11, fontWeight: 800, color: readTerms ? "#1f7a45" : "#9a6b00" }}>
                {readTerms ? "✓ Read" : "Please scroll to read ↓"}
              </span>
            </div>
            <div ref={termsRef} onScroll={onTermsScroll} style={{ maxHeight: 220, overflowY: "auto", padding: "0 14px 12px", display: "grid", gap: 9, borderTop: "1px solid rgba(17,17,17,0.08)" }}>
              {CHECKOUT_RENTAL_TERMS.map((t) => (
                <div key={t.title}>
                  <p style={{ fontSize: 12, fontWeight: 800, color: "#15130f", margin: "0 0 2px" }}>{t.title}</p>
                  <p style={{ fontSize: 11.5, color: "#6c675f", lineHeight: 1.55, margin: 0 }}>{t.body}</p>
                </div>
              ))}
              <p style={{ fontSize: 11, color: "#8a8378", margin: "2px 0 0" }}>
                Full policies: <Link href="/legal/terms" target="_blank">Terms</Link> · <Link href="/legal/refund" target="_blank">Cancellation &amp; Refund</Link> · <Link href="/legal/privacy" target="_blank">Privacy</Link>.
              </p>
            </div>
          </div>

          {/* ── What to expect after the downpayment ──────────────────────── */}
          <div style={{ padding: "12px 14px", background: "#eef4f0", border: "1px solid rgba(31,122,69,0.22)", borderRadius: 10 }}>
            <p style={{ fontSize: 12, fontWeight: 800, color: "#1f5a3a", margin: 0 }}>What happens after you pay the downpayment</p>
            <ol style={{ margin: "8px 0 0", paddingLeft: 18, display: "grid", gap: 5 }}>
              {AFTER_DOWNPAYMENT.map((s, i) => (
                <li key={i} style={{ fontSize: 11.5, color: "#345445", lineHeight: 1.5 }}>{s}</li>
              ))}
            </ol>
          </div>

          <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13, color: "#3a362f", lineHeight: 1.5, opacity: readTerms ? 1 : 0.55, cursor: readTerms ? "pointer" : "not-allowed" }}>
            <input type="checkbox" checked={agree} disabled={!readTerms} onChange={(e) => setAgree(e.target.checked)} style={{ marginTop: 3 }} />
            <span>
              I have read and agree to the rental terms &amp; conditions above and the <Link href="/legal/terms" target="_blank">full terms</Link>. I authorise the {Math.round(DOWNPAYMENT_RATE * 100)}% downpayment now to reserve the gear
              {method === "full" ? ", paying the full discounted rental online." : method === "pdc" ? ", settling the balance by post-dated cheque per the PDC arrangement." : ", settling the balance before or upon handover."}
              {!readTerms && <em style={{ color: "#9a6b00", fontStyle: "normal", fontWeight: 700 }}> — please scroll through the terms above to enable this.</em>}
            </span>
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
          <Row label="Rental subtotal" value={peso(totals.rental)} />
          {totals.discount > 0 && (
            <Row label={`${method === "full" ? "Full-payment" : "PDC"} discount (${Math.round(totals.discountRate * 100)}%)`} value={"− " + peso(totals.discount)} accent />
          )}
          {totals.discount > 0 && <Row label="Net rental" value={peso(totals.net)} />}
          {method === "full" ? (
            <Row label="Balance" value="₱0 — paid in full" />
          ) : (
            <>
              <Row label={`Downpayment to reserve (${Math.round(DOWNPAYMENT_RATE * 100)}%)`} value={peso(totals.downpayment)} />
              <Row label={method === "pdc" ? "Balance — by post-dated cheque" : "Balance — settled before handover"} value={peso(totals.balance)} />
            </>
          )}
          <div style={{ height: 1, background: "rgba(17,17,17,0.12)", margin: "10px 0" }} />
          <Row label="Pay now" value={peso(totals.payNow)} bold />

          {error && <p style={{ color: "#c0392b", fontSize: 13, margin: "12px 0 0" }}>{error}</p>}

          <button onClick={submit} disabled={busy || !agree} style={{ marginTop: 16, width: "100%", justifyContent: "center", display: "flex", alignItems: "center", gap: 8, background: "#f5c518", color: "#15130f", border: "none", fontWeight: 800, borderRadius: 999, padding: "13px 14px", fontSize: 14, cursor: busy || !agree ? "not-allowed" : "pointer", opacity: busy || !agree ? 0.6 : 1 }}>
            {busy ? <><Loader2 size={16} className="spin" /> Starting secure checkout…</> : <>Pay {peso(totals.payNow)} <ArrowRight size={16} /></>}
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

function Row({ label, value, bold, accent }: { label: string; value: string; bold?: boolean; accent?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: 6 }}>
      <span style={{ color: accent ? "#1f7a45" : bold ? "#15130f" : "#6c675f", fontWeight: bold ? 800 : 400 }}>{label}</span>
      <span style={{ fontWeight: bold ? 800 : 700, fontSize: bold ? 18 : 14, color: accent ? "#1f7a45" : undefined }}>{value}</span>
    </div>
  );
}
