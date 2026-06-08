"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { Sparkles, X, Send, Loader2, LayoutDashboard, Calculator, Scale, Megaphone, Cpu, ShieldCheck, type LucideIcon } from "lucide-react";

type Msg = { role: "user" | "assistant"; content: string };

const GREETING: Msg = {
  role: "assistant",
  content: "Hi — I'm your business co-pilot. I can wear several hats: platform help, accounting & PH tax, legal, marketing, technology, and insurance. Tap an area below or just ask.",
};

// The advisory "desks" the assistant covers — shown as a noticeable legend so the
// owner always knows what they can ask. Picking one focuses the suggestion chips.
type Domain = { icon: LucideIcon; label: string; color: string; suggestions: string[] };
const DOMAINS: Domain[] = [
  {
    icon: LayoutDashboard, label: "Platform", color: "#3a6ea5",
    suggestions: ["What can each admin section do?", "How do I send a quotation?", "How do I monitor web orders?", "How does the QR inventory work?"],
  },
  {
    icon: Calculator, label: "Accounting & Tax", color: "#2f6b46",
    suggestions: ["Explain my numbers", "8% tax vs graduated — which?", "Am I close to needing VAT?", "What can I deduct as expenses?", "Which BIR forms do I file?"],
  },
  {
    icon: Scale, label: "Legal", color: "#8a5a00",
    suggestions: ["Key clauses my contract needs", "A client damaged my gear — what now?", "How do I collect an unpaid balance?", "How do I handle client data legally?"],
  },
  {
    icon: Megaphone, label: "Marketing", color: "#a23c7a",
    suggestions: ["Marketing ideas this week", "Which ads should I run?", "Should I give a discount?", "How do I stand out from competitors?"],
  },
  {
    icon: Cpu, label: "Technology", color: "#5a3a7a",
    suggestions: ["What should I buy next?", "Build me a complete shoot kit", "How does GPS tracking help me?", "New gear trends to watch"],
  },
  {
    icon: ShieldCheck, label: "Insurance", color: "#234e7a",
    suggestions: ["Do I need equipment insurance?", "What cover should I carry?", "When should I require a client COI?", "Deposit vs insurance — what covers what?"],
  },
];

// Shown before any desk is picked — a cross-section of the most common asks.
const DEFAULT_TOPICS = ["Explain my numbers", "8% tax vs graduated — which?", "Marketing ideas this week", "Key clauses my contract needs", "Do I need equipment insurance?"];

const findDomain = (label: string | null) => DOMAINS.find((d) => d.label === label) ?? null;

// Internal admin assistant — auth'd to /api/admin/assistant. Not customer-facing.
export default function AdminAssistant({ authCode }: { authCode: string }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [activeDomain, setActiveDomain] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages, open, busy]);

  const showSuggestions = !busy && messages[messages.length - 1]?.role === "assistant";
  // Chips follow the chosen desk; before any is picked, show the common mix.
  const domain = findDomain(activeDomain);
  const chips = domain ? domain.suggestions : DEFAULT_TOPICS;

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || busy) return;
    const next = [...messages, { role: "user" as const, content }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/admin/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${authCode}` },
        body: JSON.stringify({ domain: domain?.label ?? null, messages: next.filter((m) => m !== GREETING) }),
      });
      const data = await res.json().catch(() => ({}));
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply || "Sorry, I couldn't answer that — please try again." }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Connection issue — please try again." }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close assistant" : "Open business assistant"}
        style={{
          position: "fixed", right: 18, bottom: 20, zIndex: 1200,
          display: "inline-flex", alignItems: "center", gap: 8,
          background: "#15130f", color: "#ffcc00", border: "1px solid rgba(255,204,0,0.4)", borderRadius: 999,
          padding: "12px 18px", fontWeight: 800, fontSize: 14, cursor: "pointer",
          boxShadow: "0 10px 30px rgba(17,17,17,0.4)",
        }}
      >
        {open ? <X size={18} /> : <Sparkles size={18} />} {open ? "Close" : "Ask AI"}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Business assistant"
          style={{
            position: "fixed", right: 18, bottom: 80, zIndex: 1200,
            width: "min(400px, calc(100vw - 36px))", height: "min(580px, calc(100vh - 140px))",
            display: "flex", flexDirection: "column",
            background: "#f7f5ef", border: "1px solid rgba(17,17,17,0.18)", borderRadius: 18,
            boxShadow: "0 24px 60px rgba(17,17,17,0.4)", overflow: "hidden",
          }}
        >
          <div style={{ background: "#15130f", color: "#fffdf8", padding: "13px 16px", display: "flex", alignItems: "center", gap: 8 }}>
            <Sparkles size={17} color="#ffcc00" />
            <div>
              <div style={{ fontFamily: '"Jost", sans-serif', fontWeight: 800, fontSize: 16 }}>Business co-pilot</div>
              <div style={{ fontSize: 11.5, color: "rgba(255,253,248,0.7)" }}>6 desks · platform · accounting/tax · legal · marketing · tech · insurance</div>
            </div>
          </div>

          {/* Noticeable legend of the business areas the owner can ask about.
              Picking one focuses the suggestion chips below to that desk. */}
          <div style={{ background: "#efe9dc", borderBottom: "1px solid rgba(17,17,17,0.1)", padding: "8px 8px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
            {DOMAINS.map((d) => {
              const Icon = d.icon;
              const active = activeDomain === d.label;
              return (
                <button
                  key={d.label}
                  onClick={() => setActiveDomain(active ? null : d.label)}
                  title={`Ask about ${d.label}`}
                  aria-pressed={active}
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, background: active ? d.color : "#fffdf8", border: `1px solid ${active ? d.color : "rgba(17,17,17,0.12)"}`, borderRadius: 10, padding: "7px 4px", cursor: "pointer" }}
                >
                  <Icon size={16} color={active ? "#fff" : d.color} />
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: active ? "#fff" : "#15130f", lineHeight: 1.1, textAlign: "center" }}>{d.label}</span>
                </button>
              );
            })}
          </div>

          <div ref={scroller} style={{ flex: 1, overflowY: "auto", padding: 14, display: "grid", gap: 10, alignContent: "start" }}>
            {messages.map((m, i) => (
              <div
                key={i}
                style={{
                  justifySelf: m.role === "user" ? "end" : "start",
                  maxWidth: "88%",
                  background: m.role === "user" ? "#15130f" : "#fffdf8",
                  color: m.role === "user" ? "#fffdf8" : "#15130f",
                  border: m.role === "user" ? "none" : "1px solid rgba(17,17,17,0.12)",
                  borderRadius: 14, padding: "9px 12px", fontSize: 13.5, lineHeight: 1.5,
                  ...(m.role === "user" ? { whiteSpace: "pre-wrap" as const } : null),
                }}
              >
                {m.role === "user" ? m.content : <RichText text={m.content} />}
              </div>
            ))}
            {busy && (
              <div style={{ justifySelf: "start", color: "#6c675f", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Loader2 size={14} className="spin" /> thinking…
              </div>
            )}
            {showSuggestions && (
              <div style={{ marginTop: 2 }}>
                <div style={{ fontSize: 10.5, color: "#9a948a", fontWeight: 700, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  {domain ? `${domain.label} — try:` : "Suggested questions"}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {chips.map((t) => (
                    <button
                      key={t}
                      onClick={() => send(t)}
                      style={{
                        background: domain ? `${domain.color}14` : "#fffdf8",
                        border: `1px solid ${domain ? `${domain.color}66` : "rgba(17,17,17,0.16)"}`,
                        borderRadius: 999,
                        padding: "6px 11px",
                        fontSize: 12,
                        cursor: "pointer",
                        color: "#15130f",
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={{ borderTop: "1px solid rgba(17,17,17,0.1)", padding: 10 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") send(input); }}
                placeholder={domain ? `Ask ${domain.label.toLowerCase()}…` : "Ask about the platform, your numbers, a decision…"}
                style={{ flex: 1, background: "#fffdf8", border: "1px solid rgba(17,17,17,0.18)", borderRadius: 999, padding: "10px 14px", fontSize: 13.5, outline: "none" }}
              />
              <button onClick={() => send(input)} disabled={busy || !input.trim()} aria-label="Send" style={{ background: "#15130f", color: "#ffcc00", border: "none", borderRadius: 999, width: 42, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: busy || !input.trim() ? "default" : "pointer", opacity: busy || !input.trim() ? 0.6 : 1 }}>
                <Send size={16} />
              </button>
            </div>
            <p style={{ margin: "8px 2px 0", fontSize: 10.5, color: "#9a948a", lineHeight: 1.4 }}>Decision support, not official advice. Confirm tax/legal matters with your accountant or lawyer.</p>
          </div>
        </div>
      )}
    </>
  );
}

function stripLooseMarkdown(text: string) {
  return text
    .replace(/(\*\*|__)(?=\s|$)/g, "")
    .replace(/(^|\s)(\*\*|__)(?=\S)(?![\s\S]*\2)/g, "$1")
    .replace(/(^|\s)\*(?=\S)(?![\s\S]*\*)/g, "$1")
    .replace(/\*{1,2}/g, "");
}

// Inline markdown: **bold** (and __bold__) to <strong>; loose markers are stripped.
function renderInline(text: string, keyBase: string) {
  const parts = text.split(/(\*\*[\s\S]+?\*\*|__[\s\S]+?__)/g).filter(Boolean);
  return parts.map((p, i) => {
    const m = /^(\*\*|__)([\s\S]+)\1$/.exec(p);
    return m ? <strong key={`${keyBase}-${i}`}>{stripLooseMarkdown(m[2])}</strong> : <span key={`${keyBase}-${i}`}>{stripLooseMarkdown(p)}</span>;
  });
}

// Lightweight renderer so the assistant's markdown (bold, bullet/numbered lists,
// headings) shows formatted instead of as raw asterisks. Not a full parser —
// just the constructs the model actually emits.
function RichText({ text }: { text: string }) {
  const lines = text
    .replace(/\r/g, "")
    .replace(/([.!?])\s+(#{1,6}\s+)/g, "$1\n$2")
    .replace(/([.!?])\s+((?:[-*•]|\d+[.)])\s+)/g, "$1\n$2")
    .split("\n");
  const blocks: ReactNode[] = [];
  let bullets: string[] = [];
  const flush = () => {
    if (!bullets.length) return;
    const items = bullets;
    blocks.push(
      <ul key={`ul-${blocks.length}`} style={{ margin: "4px 0 0", paddingLeft: 18, display: "grid", gap: 3 }}>
        {items.map((b, i) => <li key={i}>{renderInline(b, `li-${blocks.length}-${i}`)}</li>)}
      </ul>,
    );
    bullets = [];
  };

  lines.forEach((raw, idx) => {
    const line = raw.trimEnd();
    const bullet = line.match(/^\s*(?:[-*•]|\d+[.)])\s+(.*)$/); // - * • or 1. / 1)
    if (bullet) { bullets.push(bullet[1]); return; }
    flush();
    if (!line.trim()) return; // collapse blank lines
    const heading = line.match(/^#{1,6}\s+(.*)$/);
    const content = heading ? heading[1] : line;
    blocks.push(
      <p key={`p-${idx}`} style={{ margin: blocks.length ? "6px 0 0" : 0 }}>
        {heading ? <strong>{renderInline(content, `h-${idx}`)}</strong> : renderInline(content, `p-${idx}`)}
      </p>,
    );
  });
  flush();
  return <div style={{ display: "grid" }}>{blocks}</div>;
}
