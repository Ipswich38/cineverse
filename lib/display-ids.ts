export function sixDigitCode(input: string): string {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = Math.imul(33, h) + input.charCodeAt(i) | 0;
  return String(Math.abs(h) % 1_000_000).padStart(6, "0");
}

export function displayRentalOrderId(id: string, orderNo?: string | null): string {
  const digits = (orderNo ?? "").replace(/\D/g, "");
  return `BMR${digits ? digits.slice(-6).padStart(6, "0") : sixDigitCode(id)}`;
}

export function displayPaymentId(seed: string): string {
  return `INV${sixDigitCode(seed)}`;
}
