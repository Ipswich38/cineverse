// ── No-AI FAQ fallback ───────────────────────────────────────────────────────
// Always-available answers built from the same live data. Used when the LLM is
// missing/rate-limited, and powers the quick-topic chips. Keyword-matched —
// deterministic, free, no hallucinations. Kept in sync with knowledge.ts so the
// bot resolves the same questions with or without the LLM.
import type { EquipmentItem } from "@/lib/catalog";
import { peso, DOWNPAYMENT_RATE, FULL_PAYMENT_DISCOUNT_RATE, PDC_DISCOUNT_RATE } from "@/lib/rental-pricing";
import { COMPANY, TAX_CLAUSE } from "@/lib/company";

export const QUICK_TOPICS = [
  "Help me find gear",
  "How does renting work?",
  "Payment options",
  "Full payment & PDC discounts",
  "IDs needed",
  "Cancellation & deposit",
  "Delivery & pickup",
  "Get a custom quote",
];

const pct = () => Math.round(DOWNPAYMENT_RATE * 100);
const fullPct = () => Math.round(FULL_PAYMENT_DISCOUNT_RATE * 100);
const pdcPct = () => Math.round(PDC_DISCOUNT_RATE * 100);

export function faqAnswer(question: string, catalog: EquipmentItem[]): string {
  const q = question.toLowerCase();
  const has = (...words: string[]) => words.some((w) => q.includes(w));

  if (has("find gear", "recommend", "suggest", "not sure", "what do i need", "help me find", "what should i rent")) {
    return `Happy to help you find the right gear! Quick questions: what are you shooting (e.g. music video, wedding, commercial), and for how many days? Tell me that and I'll point you to the best sets and their rates — or browse the Store and tap “Rent now” on any set.`;
  }
  // Full payment / PDC discounts — check before the generic payment branch.
  if (has("full payment", "pay in full", "pdc", "post-dated", "post dated", "cheque", "check ", "discount")) {
    return `Two ways to save: 1) Pay in FULL online and get ${fullPct()}% off the rental. 2) Cover the balance with post-dated cheque(s) (PDC) payable to ${COMPANY.legalName}, dated to clear on/before handover, for ${pdcPct()}% off. Either way you still pay just a ${pct()}% downpayment online to reserve; you pick the option at checkout. PDC cheques are subject to clearing — a bounced cheque voids the discount. For a bigger multi-day/custom discount, use “Request a quote”.`;
  }
  if (has("pay", "gcash", "maya", "grabpay", "card", "paymongo", "deposit", "downpayment", "down payment", "balance", "reserve")) {
    return `You reserve with a ${pct()}% downpayment online via GCash, Maya, GrabPay, or any Visa/Mastercard card (incl. GoTyme), securely through PayMongo. At checkout you choose how to settle the balance: (a) standard — before/upon handover; (b) pay in full now for ${fullPct()}% off; or (c) by post-dated cheque for ${pdcPct()}% off. Your invoice + contract are emailed after payment.`;
  }
  if (has("how", "rent", "book", "process", "work")) {
    return `Browse the sets, tap “Rent now”, then at checkout enter your dates, read & tick the Terms, choose your payment method, and pay the ${pct()}% downpayment online. Your invoice + rental contract are emailed automatically, and pickup or delivery is arranged for your dates. One rental day = 24 hours.`;
  }
  if (has("id", "i.d", "identification", "license", "passport", "umid", "philid", "valid")) {
    return `On release, the hirer presents at least one (1) original valid government-issued photo ID — e.g. Driver's License, Passport, UMID/SSS/GSIS, PhilID (National ID), PRC, or Postal/Voter's ID. It's verified and photo-documented for security.`;
  }
  if (has("cancel", "refund", "deposit", "security")) {
    return `Cancellation: 20% fee within 12 hours of the scheduled release, 50% once gear is picked up/dispatched (your downpayment may be applied). No security deposit is collected at online checkout — if one is required for a specific release, the amount is stated on your quotation/contract and it's refunded after return and inspection less any damage/loss. See the Cancellation & Refund policy for details.`;
  }
  if (has("late", "extend", "extension", "overtime", "return")) {
    return `One rental day = 24 hours. Need more time? Arrange an extension before your period ends (subject to availability). Unauthorized extensions or late returns incur overtime/daily charges and possible penalties. Please return the gear complete and on time so any deposit is refunded after inspection.`;
  }
  if (has("out of town", "out-of-town", "province", "surcharge", "outside metro")) {
    return `Standard rates cover Metro Manila. A 15% surcharge applies for use outside Metro Manila. For overnight/extended out-of-town shoots, the customer also provides crew transport, meals, and safe accommodation unless agreed otherwise.`;
  }
  if (has("crew", "operator", "caretaker", "manpower", "personnel")) {
    return `Specified sets are released with a designated operator/crew (waivers are at our discretion). Unless agreed otherwise, the customer provides equipment transport and, for crew, adequate meals/drinks and — for overnight or extended shoots — safe accommodation.`;
  }
  if (has("receipt", "vat", "invoice", "tax", "official")) {
    return `${TAX_CLAUSE} The official receipt is issued per our BIR registration. After payment, your invoice and rental contract are emailed to you automatically.`;
  }
  if (has("deliver", "pickup", "pick up", "ship", "handover", "transport")) {
    return `Pickup or delivery is arranged for your rental dates. Transport is the customer's arrangement unless agreed otherwise. Gear is handed over as a complete, checked set, and you can test it before accepting.`;
  }
  if (has("terms", "conditions", "t&c", "agreement", "policy", "contract")) {
    return `At checkout you read and tick our rental Terms & Conditions (the box must be scrolled through and accepted before you can pay). They cover the rental period, IDs, security deposit, payments, cancellation, crew/logistics, and responsibility for the gear. The full Terms, Cancellation & Refund, and Privacy policies are linked in the site footer and at checkout.`;
  }
  if (has("quote", "long", "negotiat", "bulk", "custom", "package deal", "multi-day", "multiday")) {
    return `Published daily rates apply to instant rentals, and you already save with full payment (${fullPct()}%) or PDC (${pdcPct()}%). For a bigger multi-day discount or a custom build, use “Request a quote” on a set/package and the team will tailor a quotation to your shoot.`;
  }
  if (has("price", "rate", "cost", "how much", "pricing", "magkano")) {
    const top = catalog.filter((i) => i.ratePerDay > 0).sort((a, b) => a.ratePerDay - b.ratePerDay).slice(0, 4);
    const list = top.map((i) => `${i.name} — ${peso(i.ratePerDay)}/day`).join(", ");
    return `Every set has a published daily rate${list ? ` (e.g. ${list})` : ""}. Browse the Store to see each set's rate, stock, and what's included. You reserve with just a ${pct()}% downpayment, and can save ${fullPct()}% by paying in full or ${pdcPct()}% by PDC.`;
  }
  if (has("contact", "human", "talk", "team", "person", "call", "message", "agent")) {
    return `I can answer most things right here — gear, rates, payments, IDs, cancellation, delivery, and how renting works, so feel free to ask! For a custom build, a special/bulk discount, or to change an existing booking, use “Request a quote” / the contact options to reach the ${COMPANY.brand} team directly.`;
  }
  // Try to match a specific set by name keyword.
  const match = catalog.find((i) => i.ratePerDay > 0 && q.length > 2 && i.name.toLowerCase().includes(q.split(" ").find((w) => w.length > 3) ?? " "));
  if (match) {
    return `${match.name} rents at ${peso(match.ratePerDay)}/day (${match.stock} available). Tap “Rent now” on it in the Store to reserve with a ${pct()}% downpayment — and save ${fullPct()}% by paying in full or ${pdcPct()}% via PDC.`;
  }
  return `I can help with gear, rates, payment (incl. full-payment & PDC discounts), IDs, cancellation, delivery, and how renting works at ${COMPANY.brand}. Try a quick topic, or browse the Store and tap “Rent now”. For a custom build or bigger discount, use “Request a quote”.`;
}
