import { NextRequest, NextResponse } from "next/server";
import { getCatalogCached } from "@/lib/catalog-data";
import { buildKnowledgeBase } from "@/lib/chatbot/knowledge";
import { askLLM, probeLLM, type ChatMsg } from "@/lib/chatbot/provider";
import { faqAnswer } from "@/lib/chatbot/faq";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST { messages: [{role, content}] } → { reply, source: "ai" | "faq" }
// Tries the free LLM (grounded by the live catalog); falls back to the no-AI FAQ
// so the assistant ALWAYS answers, even with no key or a rate-limited provider.
export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get("debug") !== "1") return NextResponse.json({ ok: true });
  return NextResponse.json(await probeLLM());
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const raw = Array.isArray(body.messages) ? body.messages : [];
  // Sanitise + cap history (last 10 turns, 1k chars each).
  const messages: ChatMsg[] = raw
    .filter((m: { role?: string; content?: string }) => (m?.role === "user" || m?.role === "assistant") && typeof m.content === "string")
    .slice(-10)
    .map((m: { role: "user" | "assistant"; content: string }) => ({ role: m.role, content: m.content.slice(0, 1000) }));

  const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
  if (!lastUser) return NextResponse.json({ error: "No message." }, { status: 400 });

  const catalog = await getCatalogCached();

  const aiReply = await askLLM(buildKnowledgeBase(catalog), messages);
  if (aiReply) return NextResponse.json({ reply: aiReply, source: "ai" });

  return NextResponse.json({ reply: faqAnswer(lastUser, catalog), source: "faq" });
}
