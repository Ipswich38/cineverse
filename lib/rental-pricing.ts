// ── Rental pricing & refundable security policy ──────────────────────────────
// Single source of truth shared by the cart UI and the server checkout, so the
// customer is never shown a total the server won't honour. Instant rentals charge
// the FULL rental fee plus a refundable security deposit up front; the deposit is
// returned after the gear comes back (less any damages).
//
// The refundable security hold is a flat, predictable amount per unit
// (DEFAULT_SECURITY_DEPOSIT) — easy for the client to read and trust. If a set
// ever carries an explicit securityDeposit (> 0), that value is used instead, so
// BMR can tune it per set/tier later. Edit the flat default here.

export const DEFAULT_SECURITY_DEPOSIT = 5000;

export type RentableLine = {
  ratePerDay: number;
  days: number;
  quantity: number;
  securityDeposit?: number; // explicit per-unit deposit; 0/undefined → flat default
};

// Per-unit refundable security hold for one line.
export function unitSecurityDeposit(_ratePerDay: number, explicit?: number): number {
  return explicit && explicit > 0 ? explicit : DEFAULT_SECURITY_DEPOSIT;
}

export function lineRental(line: RentableLine): number {
  return Math.max(0, (Number(line.ratePerDay) || 0) * (Number(line.days) || 0) * (Number(line.quantity) || 0));
}

export function lineSecurity(line: RentableLine): number {
  return unitSecurityDeposit(line.ratePerDay, line.securityDeposit) * (Number(line.quantity) || 0);
}

export type RentalTotals = { rental: number; security: number; payNow: number };

// Roll a set of lines into rental subtotal, refundable security, and the amount
// charged at checkout (rental + security).
export function rentalTotals(lines: RentableLine[]): RentalTotals {
  const rental = lines.reduce((s, l) => s + lineRental(l), 0);
  const security = lines.reduce((s, l) => s + lineSecurity(l), 0);
  return { rental, security, payNow: rental + security };
}

export function peso(n: number): string {
  return "₱" + (Number(n) || 0).toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
