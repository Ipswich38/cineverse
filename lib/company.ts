// Single source of truth for the legally-registered operator behind VissionLink.
// VissionLink is the brand/website; BMR Cinema Operation Services is the
// BIR-registered sole proprietorship that operates it.

// Tax registration — flip to "VAT" once the BIR VAT registration completes
// (accountant processing the shift as of June 2026). All tax wording across
// checkout terms, contracts, legal pages, and the chatbot derives from this.
// NOTE: switching to VAT also requires a PRICING decision (add a 12% VAT line
// vs VAT-inclusive rates) — the wording flips automatically, the math does not.
const TAX_TYPE: "Non-VAT" | "VAT" = "Non-VAT";

export const COMPANY = {
  brand: "VissionLink",
  domain: "vissionlink.com",
  tagline: "Production rentals — camera, lighting, grip, audio, and more.",

  // Registered entity (BIR)
  legalName: "BMR Cinema Operation Services",
  proprietor: "Benito M. Remulla Jr.",
  tin: "282-087-636-00001",
  taxType: TAX_TYPE,
  address: "4319 Sta. Barbara St., Ramos Village, Sun Valley, Parañaque City, Metro Manila, Philippines",

  email: "hello@vissionlink.com",

  // Convenience strings reused across footer / legal / receipts.
  operatedByLine: "VissionLink.com is operated by BMR Cinema Operation Services",
  registrationLine: `BMR Cinema Operation Services · ${TAX_TYPE} · TIN 282-087-636-00001`,

  // Last review date for legal documents (update when policies change).
  legalUpdated: "1 June 2026",
} as const;

export const IS_VAT = (TAX_TYPE as string) === "VAT";

// The one tax sentence used verbatim in contracts, checkout terms, legal pages,
// and chatbot answers — keep all tax wording flowing through here so a future
// VAT switch can never leave a stale claim behind.
export const TAX_CLAUSE = IS_VAT
  ? `${COMPANY.legalName} is a VAT-registered business; rental rates are subject to 12% VAT as reflected in billing, and its service invoices are valid for input-tax claims.`
  : `${COMPANY.legalName} is a Non-VAT registered business; rates are not subject to 12% VAT and its documents are not valid for the claim of input taxes.`;
