"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MessageCircle, X, Send, Loader2, FileText } from "lucide-react";
import { COMPANY } from "@/lib/company";
import { QUICK_TOPICS } from "@/lib/chatbot/faq";

type Msg = { role: "user" | "assistant"; content: string };

const GREETING: Msg = {
  role: "assistant",
  content: `Hi! I'm the ${COMPANY.brand} assistant. Ask about gear, rates, payment, or how renting works — or pick a topic below.`,
};

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages, open, busy]);

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || busy) return;
    const next = [...messages, { role: "user" as const, content }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.filter((m) => m !== GREETING) }),
      });
      const data = await res.json().catch(() => ({}));
      const reply = data.reply || "Sorry, I couldn't answer that — try a quick topic, or browse the Store and tap “Rent now”.";
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "I'm having trouble right now. Please browse the Store, or use “Request a quote” to reach the team." }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {/* Floating bubble (replaces the old Find Gear button) */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close chat" : "Ask a question"}
        style={{
          position: "fixed", right: 18, bottom: 78, zIndex: 90,
          display: "inline-flex", alignItems: "center", gap: 8,
          background: "#15130f", color: "#ffcc00", border: "none", borderRadius: 999,
          padding: "12px 18px", fontWeight: 800, fontSize: 14, cursor: "pointer",
          boxShadow: "0 10px 30px rgba(17,17,17,0.32)",
        }}
      >
        {open ? <X size={18} /> : <MessageCircle size={18} />} {open ? "Close" : "Ask us"}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={`${COMPANY.brand} assistant`}
          style={{
            position: "fixed", right: 18, bottom: 138, zIndex: 90,
            width: "min(380px, calc(100vw - 36px))", height: "min(560px, calc(100vh - 200px))",
            display: "flex", flexDirection: "column",
            background: "#f7f5ef", border: "1px solid rgba(17,17,17,0.16)", borderRadius: 18,
            boxShadow: "0 24px 60px rgba(17,17,17,0.32)", overflow: "hidden",
          }}
        >
          <div style={{ background: "#15130f", color: "#fffdf8", padding: "13px 16px" }}>
            <div style={{ fontFamily: '"Jost", sans-serif', fontWeight: 800, fontSize: 16 }}>{COMPANY.brand} assistant</div>
            <div style={{ fontSize: 11.5, color: "rgba(255,253,248,0.7)" }}>Gear · rates · how renting works</div>
          </div>

          <div ref={scroller} style={{ flex: 1, overflowY: "auto", padding: 14, display: "grid", gap: 10, alignContent: "start" }}>
            {messages.map((m, i) => (
              <div
                key={i}
                style={{
                  justifySelf: m.role === "user" ? "end" : "start",
                  maxWidth: "85%",
                  background: m.role === "user" ? "#f5c518" : "#fffdf8",
                  color: "#15130f",
                  border: m.role === "user" ? "none" : "1px solid rgba(17,17,17,0.12)",
                  borderRadius: 14, padding: "9px 12px", fontSize: 13.5, lineHeight: 1.5, whiteSpace: "pre-wrap",
                }}
              >
                {m.content}
              </div>
            ))}
            {busy && (
              <div style={{ justifySelf: "start", color: "#6c675f", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Loader2 size={14} className="spin" /> typing…
              </div>
            )}
            {messages.length <= 1 && !busy && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 2 }}>
                {QUICK_TOPICS.map((t) => (
                  <button key={t} onClick={() => send(t)} style={{ background: "#fffdf8", border: "1px solid rgba(17,17,17,0.16)", borderRadius: 999, padding: "6px 11px", fontSize: 12, cursor: "pointer", color: "#15130f" }}>
                    {t}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={{ borderTop: "1px solid rgba(17,17,17,0.1)", padding: 10, display: "grid", gap: 8 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") send(input); }}
                placeholder="Ask about gear, rates, renting…"
                style={{ flex: 1, background: "#fffdf8", border: "1px solid rgba(17,17,17,0.18)", borderRadius: 999, padding: "10px 14px", fontSize: 13.5, outline: "none" }}
              />
              <button onClick={() => send(input)} disabled={busy || !input.trim()} aria-label="Send" style={{ background: "#15130f", color: "#ffcc00", border: "none", borderRadius: 999, width: 42, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: busy || !input.trim() ? "default" : "pointer", opacity: busy || !input.trim() ? 0.6 : 1 }}>
                <Send size={16} />
              </button>
            </div>
            <Link href={{ pathname: "/contact", query: { type: "quote" } }} onClick={() => setOpen(false)} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 11.5, color: "#6c675f", textDecoration: "none" }}>
              <FileText size={13} /> Need a custom build or discount? Chat with the team
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
