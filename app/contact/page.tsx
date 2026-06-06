"use client";

import type { CSSProperties } from "react";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Mail, MapPin, Send } from "lucide-react";
import { INITIAL_CATALOG } from "@/lib/catalog";
import { PROVIDERS } from "@/lib/providers";

// Quote dropdown lists the real rental sets (gear rents by set, not by piece).
const QUOTE_SETS = INITIAL_CATALOG;

const STORE_EMAIL = "hello@vissionlink.com";
const STORE_LOCATION = "Metro Manila, Philippines";

type Status = "idle" | "sending" | "sent" | "error";
type Tab = "inquiry" | "quote";

export default function ContactPage() {
  return (
    <Suspense fallback={<div className="app-container" style={{ padding: "28px 0 76px" }}>Loading…</div>}>
      <ContactInner />
    </Suspense>
  );
}

function ContactInner() {
  const params = useSearchParams();
  const initialTab: Tab = params.get("type") === "quote" ? "quote" : "inquiry";
  const [tab, setTab] = useState<Tab>(initialTab);

  return (
    <div className="app-container" style={{ padding: "28px 0 76px" }}>
      <p className="section-kicker">Contact</p>
      <h1 style={{ fontFamily: '"Jost", sans-serif', fontSize: "clamp(2rem, 4vw, 3rem)", lineHeight: 0.98, letterSpacing: "-0.04em", margin: "8px 0 12px" }}>
        Send a message or request a quote.
      </h1>
      <p style={{ maxWidth: 760, color: "#6c675f", fontSize: 14, lineHeight: 1.7, margin: 0 }}>
        Use <strong>General inquiry</strong> for questions about renting or listing gear, or <strong>Quotation</strong> to
        request pricing for a specific package. Either way, your message reaches us at {STORE_EMAIL}.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))", gap: 20, marginTop: 28, alignItems: "start" }}>
        {/* Contact details */}
        <div className="surface" style={{ padding: 22, borderRadius: 18, border: "1px solid rgba(17,17,17,0.08)", boxShadow: "0 10px 28px rgba(17,17,17,0.06)" }}>
          <h2 style={{ fontFamily: '"Jost", sans-serif', fontSize: 20, margin: "0 0 16px" }}>Contact details</h2>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 16 }}>
            <Mail size={18} color="#d8a800" style={{ marginTop: 2 }} />
            <div>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 13 }}>Email</p>
              <a href={`mailto:${STORE_EMAIL}`} style={{ color: "#6c675f", fontSize: 13, textDecoration: "none" }}>
                {STORE_EMAIL}
              </a>
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <MapPin size={18} color="#d8a800" style={{ marginTop: 2 }} />
            <div>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 13 }}>Location</p>
              <p style={{ margin: 0, color: "#6c675f", fontSize: 13 }}>{STORE_LOCATION}</p>
            </div>
          </div>
          <p style={{ marginTop: 22, color: "#6c675f", fontSize: 12, lineHeight: 1.6 }}>
            Prefer email? Reach us directly at{" "}
            <a href={`mailto:${STORE_EMAIL}`} style={{ color: "#d8a800", fontWeight: 600, textDecoration: "none" }}>
              {STORE_EMAIL}
            </a>
            .
          </p>
        </div>

        {/* Form — floating card */}
        <div
          className="surface"
          style={{
            padding: "22px 24px 28px",
            borderRadius: 24,
            border: "1px solid rgba(17,17,17,0.06)",
            boxShadow: "0 30px 70px rgba(17,17,17,0.20)",
            transform: "translateY(-8px)",
          }}
        >
          {/* Tabs */}
          <div style={{ display: "inline-flex", gap: 4, padding: 4, background: "#f0ece3", borderRadius: 999, marginBottom: 20 }}>
            <TabButton active={tab === "inquiry"} onClick={() => setTab("inquiry")}>General inquiry</TabButton>
            <TabButton active={tab === "quote"} onClick={() => setTab("quote")}>Quotation</TabButton>
          </div>

          {tab === "inquiry" ? <InquiryForm /> : <QuoteForm defaultPackage={params.get("package") ?? ""} defaultProvider={params.get("provider") ?? PROVIDERS[0]?.slug ?? ""} />}
        </div>
      </div>
    </div>
  );
}

/* ── General inquiry ──────────────────────────────────────────────────────── */
function InquiryForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "", company: "" });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Something went wrong.");
      setStatus("sent");
      setForm({ name: "", email: "", subject: "", message: "", company: "" });
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  if (status === "sent") return <Sent label="Message sent" copy="Thanks for reaching out — we’ll reply to your email soon." onReset={() => setStatus("idle")} />;

  return (
    <form onSubmit={onSubmit} style={{ display: "grid", gap: 14 }}>
      <Honeypot value={form.company} onChange={set("company")} name="company" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))", gap: 14 }}>
        <Field label="Name" required>
          <input required value={form.name} onChange={set("name")} style={inputStyle} placeholder="Juan dela Cruz" />
        </Field>
        <Field label="Email" required>
          <input required type="email" value={form.email} onChange={set("email")} style={inputStyle} placeholder="you@example.com" />
        </Field>
      </div>
      <Field label="Subject">
        <input value={form.subject} onChange={set("subject")} style={inputStyle} placeholder="What's this about?" />
      </Field>
      <Field label="Message" required>
        <textarea required value={form.message} onChange={set("message")} rows={5} maxLength={5000} style={{ ...inputStyle, resize: "vertical" }} placeholder="How can we help?" />
      </Field>
      {status === "error" && <p style={errorStyle}>{error}</p>}
      <SubmitButton sending={status === "sending"}>Send message</SubmitButton>
    </form>
  );
}

/* ── Quotation ────────────────────────────────────────────────────────────── */
function QuoteForm({ defaultPackage, defaultProvider }: { defaultPackage: string; defaultProvider: string }) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    provider: defaultProvider,
    package: defaultPackage,
    name: "",
    email: "",
    phone: "",
    company: "",
    project: "",
    dateFrom: "",
    dateTo: "",
    notes: "",
    website: "", // honeypot
  });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError("");
    try {
      const res = await fetch("/api/quote-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Something went wrong.");
      setStatus("sent");
      setForm((f) => ({ ...f, name: "", email: "", phone: "", company: "", project: "", dateFrom: "", dateTo: "", notes: "" }));
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  if (status === "sent")
    return <Sent label="Quotation request sent" copy="Thanks! Your request was sent to our team and logged for review. We’ll reply with pricing shortly." onReset={() => setStatus("idle")} />;

  return (
    <form onSubmit={onSubmit} style={{ display: "grid", gap: 14 }}>
      <Honeypot value={form.website} onChange={set("website")} name="website" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))", gap: 14 }}>
        <Field label="Provider" required>
          <select required value={form.provider} onChange={set("provider")} style={inputStyle}>
            <option value="" disabled>Select a provider…</option>
            {PROVIDERS.map((p) => (
              <option key={p.slug} value={p.slug}>{p.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Which set?" required>
          <select required value={form.package} onChange={set("package")} style={inputStyle}>
            <option value="" disabled>Select a rental set…</option>
            {QUOTE_SETS.map((s) => (
              <option key={s.slug} value={s.slug}>{s.name}</option>
            ))}
          </select>
        </Field>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))", gap: 14 }}>
        <Field label="Name" required>
          <input required value={form.name} onChange={set("name")} style={inputStyle} placeholder="Juan dela Cruz" />
        </Field>
        <Field label="Email" required>
          <input required type="email" value={form.email} onChange={set("email")} style={inputStyle} placeholder="you@example.com" />
        </Field>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))", gap: 14 }}>
        <Field label="Phone">
          <input value={form.phone} onChange={set("phone")} style={inputStyle} placeholder="+63 9xx xxx xxxx" />
        </Field>
        <Field label="Company / production">
          <input value={form.company} onChange={set("company")} style={inputStyle} placeholder="Optional" />
        </Field>
      </div>
      <Field label="Project">
        <input value={form.project} onChange={set("project")} style={inputStyle} placeholder="e.g. TVC shoot, music video, documentary" />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))", gap: 14 }}>
        <Field label="Needed from">
          <input type="date" value={form.dateFrom} onChange={set("dateFrom")} style={inputStyle} />
        </Field>
        <Field label="Needed to">
          <input type="date" value={form.dateTo} onChange={set("dateTo")} style={inputStyle} />
        </Field>
      </div>
      <Field label="Notes">
        <textarea value={form.notes} onChange={set("notes")} rows={4} maxLength={4000} style={{ ...inputStyle, resize: "vertical" }} placeholder="Scope, crew, location, add-ons, anything else we should price in." />
      </Field>
      {status === "error" && <p style={errorStyle}>{error}</p>}
      <SubmitButton sending={status === "sending"}>Send quotation request</SubmitButton>
    </form>
  );
}

/* ── Shared bits ──────────────────────────────────────────────────────────── */
function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border: 0,
        cursor: "pointer",
        padding: "9px 18px",
        borderRadius: 999,
        fontSize: 13,
        fontWeight: 800,
        background: active ? "#15130f" : "transparent",
        color: active ? "#fffdf8" : "#6c675f",
      }}
    >
      {children}
    </button>
  );
}

function SubmitButton({ sending, children }: { sending: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={sending}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        alignSelf: "start",
        background: "#f5c518",
        color: "#15130f",
        fontWeight: 800,
        padding: "13px 26px",
        border: 0,
        borderRadius: 999,
        cursor: "pointer",
        boxShadow: "0 10px 22px rgba(245,197,24,0.4)",
        opacity: sending ? 0.6 : 1,
      }}
    >
      {sending ? "Sending…" : <>{children} <Send size={16} /></>}
    </button>
  );
}

function Sent({ label, copy, onReset }: { label: string; copy: string; onReset: () => void }) {
  return (
    <div style={{ textAlign: "center", padding: "40px 8px" }}>
      <div style={{ width: 48, height: 48, margin: "0 auto", display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: 999, background: "rgba(245,197,24,0.18)", fontSize: 24 }}>✓</div>
      <h3 style={{ fontFamily: '"Jost", sans-serif', fontSize: 20, margin: "16px 0 6px" }}>{label}</h3>
      <p style={{ color: "#6c675f", fontSize: 13, margin: "0 auto", maxWidth: 300 }}>{copy}</p>
      <button onClick={onReset} style={{ marginTop: 22, background: "transparent", border: 0, color: "#d8a800", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
        Send another
      </button>
    </div>
  );
}

function Honeypot({ value, onChange, name }: { value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; name: string }) {
  return (
    <input type="text" name={name} value={value} onChange={onChange} tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ display: "none" }} />
  );
}

const inputStyle: CSSProperties = {
  width: "100%",
  background: "#fffdf8",
  color: "#15130f",
  border: "1px solid rgba(17,17,17,0.18)",
  borderRadius: 12,
  padding: "12px 14px",
  outline: "none",
};

const errorStyle: CSSProperties = { color: "#c0392b", fontSize: 13, margin: 0 };

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 13, fontWeight: 700 }}>
        {label} {required && <span style={{ color: "#d8a800" }}>*</span>}
      </span>
      {children}
    </label>
  );
}
