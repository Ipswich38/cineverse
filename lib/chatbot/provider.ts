// ── Pluggable chatbot LLM provider ───────────────────────────────────────────
// Free-tier first. Tries Gemini, then Groq (whichever key is set); returns null on
// any failure / missing key / rate-limit so the caller can fall back to the no-AI
// FAQ. Swap providers by setting a different key — no code change in callers.
//
// Env (all optional — none set ⇒ chatbot runs on the FAQ fallback only):
//   GEMINI_API_KEY   + optional GEMINI_MODEL (default gemini-2.0-flash)
//   GROQ_API_KEY     + optional GROQ_MODEL   (default gemma2-9b-it)

export type ChatMsg = { role: "user" | "assistant"; content: string };

export function hasLLM(): boolean {
  return Boolean(process.env.GEMINI_API_KEY || process.env.GROQ_API_KEY);
}

const MAX_OUTPUT = 600;

export async function askLLM(system: string, messages: ChatMsg[]): Promise<string | null> {
  try {
    if (process.env.GEMINI_API_KEY) return await askGemini(system, messages);
    if (process.env.GROQ_API_KEY) return await askGroq(system, messages);
  } catch {
    /* fall through to FAQ */
  }
  return null;
}

// Google Gemini (free tier) — generativelanguage REST API.
async function askGemini(system: string, messages: ChatMsg[]): Promise<string | null> {
  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;
  const body = {
    systemInstruction: { parts: [{ text: system }] },
    contents: messages.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
    generationConfig: { maxOutputTokens: MAX_OUTPUT, temperature: 0.3 },
  };
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) return null;
  const json = await res.json();
  const text = json?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
  return text.trim() || null;
}

// Groq (free tier) — OpenAI-compatible chat completions (serves Gemma, Llama, etc.).
async function askGroq(system: string, messages: ChatMsg[]): Promise<string | null> {
  const model = process.env.GROQ_MODEL || "gemma2-9b-it";
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    body: JSON.stringify({
      model,
      max_tokens: MAX_OUTPUT,
      temperature: 0.3,
      messages: [{ role: "system", content: system }, ...messages],
    }),
  });
  if (!res.ok) return null;
  const json = await res.json();
  return (json?.choices?.[0]?.message?.content ?? "").trim() || null;
}
