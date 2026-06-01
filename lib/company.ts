// Single source of truth for the legally-registered operator behind VissionLink.
// VissionLink is the brand/website; BMR Cinema Operation Services is the
// BIR-registered sole proprietorship that operates it.
export const COMPANY = {
  brand: "VissionLink",
  domain: "vissionlink.com",
  tagline: "Production rentals — camera, lighting, grip, audio, and more.",

  // Registered entity (BIR)
  legalName: "BMR Cinema Operation Services",
  proprietor: "Benito M. Remulla Jr.",
  tin: "282-087-636-00001",
  taxType: "Non-VAT", // sole proprietorship, Non-VAT registered
  address: "4319 Sta. Barbara St., Ramos Village, Sun Valley, Parañaque City, Metro Manila, Philippines",

  email: "hello@vissionlink.com",

  // Convenience strings reused across footer / legal / receipts.
  operatedByLine: "VissionLink.com is operated by BMR Cinema Operation Services",
  registrationLine: "BMR Cinema Operation Services · Non-VAT · TIN 282-087-636-00001",

  // Last review date for legal documents (update when policies change).
  legalUpdated: "1 June 2026",
} as const;
