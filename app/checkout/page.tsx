"use client";

import type { ComponentType, CSSProperties } from "react";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, CreditCard, ShieldCheck, Smartphone, Wallet } from "lucide-react";
import { useStore } from "../providers";
import { currency } from "@/lib/catalog";
import ProvisionalReceipt from "@/components/ProvisionalReceipt";

function genRef() {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `VL-${ymd}-${rand}`;
}

export default function CheckoutPage() {
  const { cart, subtotal, downpayment } = useStore();
  const [method, setMethod] = useState<"paymongo" | "gcash" | "maya">("paymongo");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [schedule, setSchedule] = useState("");
  const [handoff, setHandoff] = useState<"pickup" | "delivery">("pickup");
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [refNo, setRefNo] = useState("");

  const methodLabel = method === "paymongo" ? "PayMongo" : method === "gcash" ? "GCash" : "Maya";

  if (cart.length === 0) {
    return (
      <div className="app-container" style={{ padding: "28px 0 76px" }}>
        <h1 style={{ fontFamily: '"Jost", sans-serif', fontSize: 36, margin: 0 }}>Checkout</h1>
        <p style={{ color: "#6c675f" }}>Your cart is empty.</p>
        <Link href="/store" className="primary-button">Browse rentals</Link>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="app-container" style={{ padding: "24px 0 76px" }}>
        <ProvisionalReceipt
          refNo={refNo}
          name={name}
          email={email}
          phone={phone}
          company={company}
          schedule={schedule}
          handoff={handoff}
          method={methodLabel}
          cart={cart}
          subtotal={subtotal}
          downpayment={downpayment}
        />
      </div>
    );
  }

  return (
    <div className="app-container" style={{ padding: "22px 0 64px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: 16, marginBottom: 18, flexWrap: "wrap" }}>
        <div>
          <p className="section-kicker">Secure request</p>
          <h1 style={{ fontFamily: '"Jost", sans-serif', fontSize: 30, margin: "6px 0 0", letterSpacing: "-0.04em" }}>Checkout</h1>
        </div>
        <div style={{ color: "#6c675f", fontSize: 14 }}>Downpayment due today: <strong style={{ color: "#15130f" }}>{currency(downpayment)}</strong></div>
      </div>

      <div className="checkout-grid">
        <div style={{ padding: 0 }}>
          <p style={{ color: "#6c675f", margin: 0, lineHeight: 1.55, fontSize: 13 }}>
            Send your reservation request first. You will receive a PayMongo payment link after availability is confirmed, so the customer is not charged before the booking is checked.
          </p>

          <div className="checkout-steps">
            <Step number="1" title="Submit request" text="Share contact, schedule, and handoff preference." />
            <Step number="2" title="Confirm availability" text="Admin confirms stock and final rental window." />
            <Step number="3" title="Pay downpayment" text="Pay the 30% reservation link by card, GCash, or Maya." />
          </div>

          <section>
            <h2 style={{ fontFamily: '"Jost", sans-serif', fontSize: 20, margin: "0 0 10px" }}>Contact details</h2>
            <div className="form-grid">
              <Field label="Contact name" value={name} onChange={setName} placeholder="Full name" />
              <Field label="Email" value={email} onChange={setEmail} placeholder="name@email.com" />
              <Field label="Mobile number" value={phone} onChange={setPhone} placeholder="+63" />
              <Field label="Production / company" value={company} onChange={setCompany} placeholder="Production name" />
              <Field label="Rental schedule" value={schedule} onChange={setSchedule} placeholder="Pickup date, shoot dates, return date" className="full-span" />
            </div>
          </section>

          <section style={{ marginTop: 18 }}>
            <h2 style={{ fontFamily: '"Jost", sans-serif', fontSize: 20, margin: "0 0 10px" }}>Handoff</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
              <Choice active={handoff === "pickup"} title="Pickup" text="Customer or crew collects after confirmation." onClick={() => setHandoff("pickup")} />
              <Choice active={handoff === "delivery"} title="Delivery" text="Admin will confirm fee and schedule." onClick={() => setHandoff("delivery")} />
            </div>
          </section>

          <section style={{ marginTop: 18 }}>
            <h2 style={{ fontFamily: '"Jost", sans-serif', fontSize: 20, margin: "0 0 10px" }}>Payment preference</h2>
            <div style={{ display: "grid", gap: 10 }}>
              <Method method="paymongo" active={method} setMethod={setMethod} icon={CreditCard} title="PayMongo secure checkout" text="Best default. Customer receives one checkout link for card, GCash, or Maya." />
              <Method method="gcash" active={method} setMethod={setMethod} icon={Smartphone} title="GCash" text="Use this when the customer already prefers a GCash payment route." />
              <Method method="maya" active={method} setMethod={setMethod} icon={Wallet} title="Maya" text="Use this when the customer already prefers Maya." />
            </div>
          </section>

          <section style={{ marginTop: 18 }}>
            <Field label="Notes for admin" value={notes} onChange={setNotes} textarea placeholder="Accessories needed, delivery address, call time, invoice details..." />
          </section>

          <button
            onClick={() => {
              setRefNo(genRef());
              setSubmitted(true);
            }}
            className="primary-button"
            style={{ marginTop: 20 }}
          >
            <CheckCircle2 size={16} />
            Send reservation request
          </button>

          {submitted && (
            <div style={{ marginTop: 16, padding: 16, borderRadius: 0, background: "#fff7e6", border: "1px solid rgba(180,120,0,0.22)", color: "#8a5b00", lineHeight: 1.6 }}>
              Request prepared. Connect the live PayMongo flow to send the payment link after admin availability confirmation.
            </div>
          )}
        </div>

        <aside className="summary-sticky" style={{ padding: 16, height: "fit-content", background: "#fffdf8", border: "1px solid rgba(17,17,17,0.12)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <ShieldCheck size={18} color="#9a7100" />
            <h2 style={{ fontFamily: '"Jost", sans-serif', fontSize: 20, margin: 0 }}>Reservation summary</h2>
          </div>

          <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
            {cart.map((item) => (
              <div key={`${item.itemId}-${item.days}`} style={{ display: "grid", gridTemplateColumns: "52px minmax(0, 1fr)", gap: 10, borderBottom: "1px solid rgba(17,17,17,0.1)", paddingBottom: 10 }}>
                <img src={item.image} alt={item.name} style={{ width: 52, height: 52, objectFit: "cover" }} />
                <div>
                  <div style={{ fontWeight: 700, lineHeight: 1.3, fontSize: 13 }}>{item.name}</div>
                  <div style={{ color: "#6c675f", fontSize: 12, marginTop: 3 }}>
                    {item.quantity} x {item.days} day(s) at {currency(item.ratePerDay)}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gap: 10, marginTop: 14, borderTop: "1px solid rgba(17,17,17,0.12)", paddingTop: 14, fontSize: 13 }}>
            <SummaryRow label="Rental subtotal" value={currency(subtotal)} />
            <SummaryRow label="Downpayment today (30%)" value={currency(downpayment)} />
            <SummaryRow label="Balance after confirmation" value={currency(Math.max(0, subtotal - downpayment))} />
            <SummaryRow label="Payment route" value={method === "paymongo" ? "PayMongo" : method === "gcash" ? "GCash" : "Maya"} />
          </div>

          <div style={{ marginTop: 14, padding: 12, border: "1px solid rgba(17,17,17,0.12)", color: "#6c675f", lineHeight: 1.55, fontSize: 12 }}>
            No final charge is collected on this screen. Delivery fees, item substitutions, and final balance are confirmed before the payment link is sent.
          </div>

          <Link href="/cart" className="secondary-button" style={{ width: "100%", marginTop: 12 }}>
            Review cart <ArrowRight size={16} />
          </Link>
        </aside>
      </div>
    </div>
  );
}

function Step({ number, title, text }: { number: string; title: string; text: string }) {
  return (
    <div className="checkout-step">
      <div style={{ color: "#9a7100", fontWeight: 800, fontSize: 12 }}>{number}</div>
      <div style={{ fontWeight: 800, marginTop: 5, fontSize: 13 }}>{title}</div>
      <div style={{ color: "#6c675f", fontSize: 12, lineHeight: 1.4, marginTop: 3 }}>{text}</div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  textarea,
  placeholder,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  textarea?: boolean;
  placeholder?: string;
  className?: string;
}) {
  return (
    <label className={className} style={{ display: "grid", gap: 8 }}>
      <span style={{ color: "#6c675f", fontSize: 12 }}>{label}</span>
      {textarea ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={4} placeholder={placeholder} style={fieldStyle} />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={fieldStyle} />
      )}
    </label>
  );
}

function Choice({ active, title, text, onClick }: { active: boolean; title: string; text: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      textAlign: "left",
      background: active ? "#f5c518" : "#fffdf8",
      border: `1px solid ${active ? "#f5c518" : "rgba(17,17,17,0.12)"}`,
      color: "#15130f",
      borderRadius: 0,
      padding: 12,
    }}>
      <div style={{ fontWeight: 800, fontSize: 13 }}>{title}</div>
      <div style={{ color: active ? "rgba(21,19,15,0.72)" : "#6c675f", fontSize: 12, marginTop: 3, lineHeight: 1.45 }}>{text}</div>
    </button>
  );
}

function Method({
  method,
  active,
  setMethod,
  icon: Icon,
  title,
  text,
}: {
  method: "paymongo" | "gcash" | "maya";
  active: "paymongo" | "gcash" | "maya";
  setMethod: (value: "paymongo" | "gcash" | "maya") => void;
  icon: ComponentType<{ size?: number; color?: string }>;
  title: string;
  text: string;
}) {
  const selected = active === method;
  return (
    <button
      onClick={() => setMethod(method)}
      style={{
        textAlign: "left",
        background: selected ? "#f5c518" : "#fffdf8",
        border: `1px solid ${selected ? "#f5c518" : "rgba(17,17,17,0.12)"}`,
        color: "#15130f",
        borderRadius: 0,
        padding: 12,
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
      }}
    >
      <Icon size={16} color="#15130f" />
      <div>
        <div style={{ fontWeight: 700, fontSize: 13 }}>{title}</div>
        <div style={{ color: selected ? "rgba(21,19,15,0.72)" : "#6c675f", fontSize: 12, marginTop: 3, lineHeight: 1.45 }}>{text}</div>
      </div>
    </button>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
      <span style={{ color: "#6c675f" }}>{label}</span>
      <span style={{ fontWeight: 700 }}>{value}</span>
    </div>
  );
}

const fieldStyle: CSSProperties = {
  background: "#fffdf8",
  color: "#15130f",
  border: "1px solid rgba(17,17,17,0.16)",
  borderRadius: 0,
  padding: "10px 12px",
  outline: "none",
};
