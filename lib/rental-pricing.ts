// ── Rental pricing & downpayment policy ──────────────────────────────────────
// Single source of truth shared by the cart UI and the server checkout, so the
// customer is never shown a total the server won't honour.
//
// Model: the customer pays a DOWNPAYMENT (a % of the rental) online to confirm
// the booking; the remaining balance is settled later (before or upon handover).
// Tune the rate here.

export const DOWNPAYMENT_RATE = 0.15; // 15% to reserve

export type RentableLine = {
  ratePerDay: number;
  days: number;
  quantity: number;
};

export function lineRental(line: RentableLine): number {
  return Math.max(0, (Number(line.ratePerDay) || 0) * (Number(line.days) || 0) * (Number(line.quantity) || 0));
}

export type RentalTotals = {
  rental: number; // full rental subtotal
  downpayment: number; // charged online now (DOWNPAYMENT_RATE × rental)
  balance: number; // settled later
  payNow: number; // = downpayment (what PayMongo charges at checkout)
};

export function rentalTotals(lines: RentableLine[]): RentalTotals {
  const rental = lines.reduce((s, l) => s + lineRental(l), 0);
  const downpayment = Math.round(rental * DOWNPAYMENT_RATE);
  return { rental, downpayment, balance: rental - downpayment, payNow: downpayment };
}

export function peso(n: number): string {
  return "₱" + (Number(n) || 0).toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
