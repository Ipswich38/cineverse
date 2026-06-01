"use client";

import type { CSSProperties } from "react";
import { useState } from "react";
import { Mail, MapPin, Send } from "lucide-react";

const STORE_EMAIL = "hello@vissionlink.com";
const STORE_LOCATION = "Metro Manila, Philippines";

type Status = "idle" | "sending" | "sent" | "error";

export default function ContactPage() {
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

  return (
    <div className="app-container" style={{ padding: "28px 0 76px" }}>
      <p className="section-kicker">Contact</p>
      <h1 style={{ fontFamily: '"Jost", sans-serif', fontSize: "clamp(2rem, 4vw, 3rem)", lineHeight: 0.98, letterSpacing: "-0.04em", margin: "8px 0 12px" }}>
        Send a rental or crew request.
      </h1>
      <p style={{ maxWidth: 760, color: "#6c675f", fontSize: 14, lineHeight: 1.7, margin: 0 }}>
        Questions about renting or listing gear? Send us a message below and we&apos;ll get back to you. For crew and
        production support, head to Need A Crew on the cineforce subdomain.
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
            padding: "28px 24px",
            borderRadius: 24,
            border: "1px solid rgba(17,17,17,0.06)",
            boxShadow: "0 30px 70px rgba(17,17,17,0.20)",
            transform: "translateY(-8px)",
          }}
        >
          {status === "sent" ? (
            <div style={{ textAlign: "center", padding: "40px 8px" }}>
              <div style={{ width: 48, height: 48, margin: "0 auto", display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: 999, background: "rgba(245,197,24,0.18)", fontSize: 24 }}>✓</div>
              <h3 style={{ fontFamily: '"Jost", sans-serif', fontSize: 20, margin: "16px 0 6px" }}>Message sent</h3>
              <p style={{ color: "#6c675f", fontSize: 13, margin: "0 auto", maxWidth: 280 }}>
                Thanks for reaching out — we&apos;ll reply to your email soon.
              </p>
              <button onClick={() => setStatus("idle")} style={{ marginTop: 22, background: "transparent", border: 0, color: "#d8a800", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                Send another message
              </button>
            </div>
          ) : (
            <form onSubmit={onSubmit} style={{ display: "grid", gap: 14 }}>
              {/* honeypot — hidden from humans */}
              <input
                type="text"
                name="company"
                value={form.company}
                onChange={set("company")}
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                style={{ display: "none" }}
              />

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

              {status === "error" && <p style={{ color: "#c0392b", fontSize: 13, margin: 0 }}>{error}</p>}

              <button
                type="submit"
                disabled={status === "sending"}
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
                  opacity: status === "sending" ? 0.6 : 1,
                }}
              >
                {status === "sending" ? "Sending…" : <>Send message <Send size={16} /></>}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
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
