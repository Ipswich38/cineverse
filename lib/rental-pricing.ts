// ── Rental pricing, downpayment & payment-method policy ──────────────────────
// Single source of truth shared by the cart UI and the server checkout, so the
// customer is never shown a total the server won't honour.
//
// Model: the customer always pays a DOWNPAYMENT (a % of the rental) online to
// confirm the booking. How the BALANCE is settled is a choice:
//   • standard — settled (cash / transfer / e-wallet) before or upon handover.
//   • full     — the whole rental is paid online now → full-payment discount.
//   • pdc      — balance covered by post-dated cheque(s) → PDC discount.
// Full payment and PDC are encouraged, so each earns a special discount on the
// rental total. Tune the rates here.

export const DOWNPAYMENT_RATE = 0.15; // 15% to reserve

// Special discounts for the encouraged settlement methods (applied to the rental
// subtotal). The downpayment % is then taken on the already-discounted total.
export const FULL_PAYMENT_DISCOUNT_RATE = 0.05; // pay 100% online now
export const PDC_DISCOUNT_RATE = 0.03; // balance via post-dated cheque(s)

export type BalanceMethod = "standard" | "full" | "pdc";

export function isBalanceMethod(v: unknown): v is BalanceMethod {
  return v === "standard" || v === "full" || v === "pdc";
}

// The special-discount rate earned by a given settlement method.
export function methodDiscountRate(method: BalanceMethod): number {
  if (method === "full") return FULL_PAYMENT_DISCOUNT_RATE;
  if (method === "pdc") return PDC_DISCOUNT_RATE;
  return 0;
}

export type RentableLine = {
  ratePerDay: number;
  days: number;
  quantity: number;
};

export function lineRental(line: RentableLine): number {
  return Math.max(0, (Number(line.ratePerDay) || 0) * (Number(line.days) || 0) * (Number(line.quantity) || 0));
}

export type RentalTotals = {
  method: BalanceMethod;
  rental: number; // full rental subtotal (before any payment-method discount)
  discountRate: number; // special discount earned by the chosen method
  discount: number; // discountRate × rental
  net: number; // rental − discount (the amount actually owed)
  downpayment: number; // DOWNPAYMENT_RATE × net (reservation)
  balance: number; // net − payNow (settled later / by PDC; 0 when paid in full)
  payNow: number; // what PayMongo charges at checkout (full → net, else → downpayment)
};

export function rentalTotals(lines: RentableLine[], method: BalanceMethod = "standard"): RentalTotals {
  const rental = lines.reduce((s, l) => s + lineRental(l), 0);
  const discountRate = methodDiscountRate(method);
  const discount = Math.round(rental * discountRate);
  const net = rental - discount;
  const downpayment = Math.round(net * DOWNPAYMENT_RATE);
  const payNow = method === "full" ? net : downpayment;
  return { method, rental, discountRate, discount, net, downpayment, balance: net - payNow, payNow };
}

export function peso(n: number): string {
  return "₱" + (Number(n) || 0).toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
