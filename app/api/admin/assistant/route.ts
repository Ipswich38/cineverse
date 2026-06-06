import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "../_auth";
import { hasSupabase, supabaseAdmin } from "@/lib/supabase";
import { computeInvoiceMoney, type InvoiceDoc } from "@/lib/invoice";
import { peso } from "@/lib/rental-pricing";
import { buildAdminKnowledge } from "@/lib/chatbot/admin-knowledge";
import { askLLM, hasLLM, type ChatMsg } from "@/lib/chatbot/provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Aggregate, non-PII business snapshot for the assistant's context.
async function snapshot(): Promise<string> {
  if (!hasSupabase()) return "Database not configured — no live figures available.";
  const db = supabaseAdmin()!;
  const [reqs, exps] = await Promise.all([
    db.from("vissionlink_quote_requests").select("invoice,quotation_status,contract_status,invoice_status,fulfillment_status,quotation_agreed_at").limit(2000),
    db.from("vissionlink_expenses").select("amount").limit(2000),
  ]);
  const rows = reqs.data ?? [];
  let revenue = 0, receivables = 0, deposits = 0, overdue = 0, unpaid = 0, invoices = 0;
  for (const r of rows) {
    if (!r.invoice) continue;
    invoices++;
    const m = computeInvoiceMoney(r.invoice as InvoiceDoc);
    revenue += m.paid; receivables += m.balance; deposits += m.depositReceived;
    if (m.balance > 0.01) { unpaid++; if (m.daysOverdue > 0) overdue++; }
  }
  const expenses = (exps.data ?? []).reduce((s: number, e: { amount?: number }) => s + (Number(e.amount) || 0), 0);
  const agreed = rows.filter((r) => r.quotation_agreed_at).length;
  const sentQuotes = rows.filter((r) => r.quotation_status === "sent").length;
  const activeRentals = rows.filter((r) => r.fulfillment_status && ["paid", "shipped"].includes(String(r.fulfillment_status))).length;

  return [
    `- Revenue collected: ${peso(revenue)}`,
    `- Receivables (open balances): ${peso(receivables)} across ${unpaid} unpaid invoice(s), ${overdue} overdue`,
    `- Deposits held: ${peso(deposits)}`,
    `- Expenses recorded: ${peso(expenses)}`,
    `- Net (P&L = revenue − expenses): ${peso(revenue - expenses)}`,
    `- Invoices issued: ${invoices} · quotations sent: ${sentQuotes} · agreed: ${agreed} · active rentals (paid/shipped): ${activeRentals}`,
  ].join("\n");
}

export async function POST(req: NextRequest) {
  if (!checkAdminAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const raw = Array.isArray(body.messages) ? body.messages : [];
  const messages: ChatMsg[] = raw
    .filter((m: { role?: string; content?: string }) => (m?.role === "user" || m?.role === "assistant") && typeof m.content === "string")
    .slice(-12)
    .map((m: { role: "user" | "assistant"; content: string }) => ({ role: m.role, content: m.content.slice(0, 2000) }));

  if (!messages.some((m) => m.role === "user")) return NextResponse.json({ error: "No message." }, { status: 400 });

  if (!hasLLM()) {
    return NextResponse.json({ reply: "The assistant needs an AI key (GROQ_API_KEY or GEMINI_API_KEY) set in the environment. Once it's set, I can help with the platform, your numbers, quotations, contracts, discounts, and tax questions.", source: "none" });
  }

  const reply = await askLLM(buildAdminKnowledge(await snapshot()), messages);
  if (!reply) return NextResponse.json({ reply: "I'm having trouble reaching the AI service right now — please try again in a moment.", source: "none" });
  return NextResponse.json({ reply, source: "ai" });
}
