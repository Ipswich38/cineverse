"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, X, Send, Loader2 } from "lucide-react";

type Msg = { role: "user" | "assistant"; content: string };

const GREETING: Msg = {
  role: "assistant",
  content: "Hi — I'm your business co-pilot. Ask me how to use any part of the admin, to explain your numbers, or for a view on a quotation, contract, discount, or tax question.",
};

const TOPICS = ["Explain my numbers", "How do I send a quotation?", "Should I give a discount?", "Help with a contract", "Tax question"];

// Internal admin assistant — auth'd to /api/admin/assistant. Not customer-facing.
export default function AdminAssistant({ authCode }: { authCode: string }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages, open, busy]);

  const showSuggestions = !busy && messages[messages.length - 1]?.role === "assistant";

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
        body: JSON.stringify({ messages: next.filter((m) => m !== GREETING) }),
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
        {open ? <X size={18} /> : <Sparkles size={18} />} {open ? "Close" : "Assistant"}
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
              <div style={{ fontSize: 11.5, color: "rgba(255,253,248,0.7)" }}>Platform help · accounting · advice</div>
            </div>
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
                  borderRadius: 14, padding: "9px 12px", fontSize: 13.5, lineHeight: 1.5, whiteSpace: "pre-wrap",
                }}
              >
                {m.content}
              </div>
            ))}
            {busy && (
              <div style={{ justifySelf: "start", color: "#6c675f", fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Loader2 size={14} className="spin" /> thinking…
              </div>
            )}
            {showSuggestions && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 2 }}>
                {TOPICS.map((t) => (
                  <button key={t} onClick={() => send(t)} style={{ background: "#fffdf8", border: "1px solid rgba(17,17,17,0.16)", borderRadius: 999, padding: "6px 11px", fontSize: 12, cursor: "pointer", color: "#15130f" }}>
                    {t}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={{ borderTop: "1px solid rgba(17,17,17,0.1)", padding: 10 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") send(input); }}
                placeholder="Ask about the platform, your numbers, a decision…"
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
