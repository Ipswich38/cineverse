// ── Pre-checkout rental terms (logistics, IDs, settlement) ───────────────────
// Shown on the checkout page before the customer reserves, and reused as the
// "what to expect" copy elsewhere. Aligned to BMR Cinema Operation Services /
// VissionLink (24h rental day, 15% out-of-town surcharge, 5%/mo late interest,
// Non-VAT) — adapted from a standard PH equipment-rental T&C, not copied from
// any other rental house. Keep this the single source so the UI and the docs
// never drift.
import { COMPANY } from "./company";
import { DOWNPAYMENT_RATE, FULL_PAYMENT_DISCOUNT_RATE, PDC_DISCOUNT_RATE, type BalanceMethod } from "./rental-pricing";

const dpPct = Math.round(DOWNPAYMENT_RATE * 100);
const fullPct = Math.round(FULL_PAYMENT_DISCOUNT_RATE * 100);
const pdcPct = Math.round(PDC_DISCOUNT_RATE * 100);

export type TermClause = { title: string; body: string };

// The rental agreement the Hirer accepts at checkout. The same clauses are
// embedded in the e-contract generated after payment.
export const CHECKOUT_RENTAL_TERMS: TermClause[] = [
  {
    title: "1. Booking & confirmation",
    body: `A booking is confirmed only once the ${dpPct}% reservation downpayment is received and the rental agreement is accepted (this checkbox, the emailed e-contract, or a signed SOA). No accepted agreement, no booking.`,
  },
  {
    title: "2. Rental period & charges",
    body: "One (1) rental day equals twenty-four (24) hours. Charges begin when the equipment leaves our premises (or on delivery) and end upon complete return. Charges apply regardless of actual, partial, or non-use. Use beyond the agreed period incurs overtime or additional daily charges for both equipment and crew.",
  },
  {
    title: "3. Crew / caretaker",
    body: `Specified rentals are released with a ${COMPANY.legalName}-designated operator or crew. Any waiver is at our sole discretion and may be denied, conditioned, or revoked. Where crew is waived, stricter identification and security requirements apply.`,
  },
  {
    title: "4. Identification & security",
    body: "The Hirer or an authorized representative must present, at release, at least one (1) original valid government-issued photo ID (e.g. Driver's License, Passport, UMID, PhilID/National ID, PRC, or similar), and consents to its verification, photocopying, and photo documentation. We may also require a security deposit, advance payment, credit-card authorization, or a company/personal guarantee as a condition of release. Failure to provide sufficient identification or security results in denial of release without liability on our part.",
  },
  {
    title: "5. Security deposit",
    body: "No security deposit is collected at online checkout. For specific equipment or releases we may require a refundable security deposit as a condition of release; where required, the amount is stated on your quotation or rental contract before release. Any deposit is refunded only after complete return and inspection; any damage, loss, shortage, delay, or related cost is deducted, without prejudice to further claims.",
  },
  {
    title: "6. Payment terms",
    body: `Payments are made to ${COMPANY.legalName}. The ${dpPct}% downpayment is paid online to reserve; the balance is settled per the method you select at checkout (before/upon handover, in full online, or by post-dated cheque). As a ${COMPANY.taxType} business, our documents are not valid for input-tax claims. Outstanding balances accrue 5% interest per month until paid; we may suspend or refuse release for unpaid balances.`,
  },
  {
    title: "7. Cancellation",
    body: "A 20% fee applies to cancellations within twelve (12) hours of the scheduled release. A 50% fee applies once equipment has been picked up or dispatched. The reservation downpayment may be applied against these fees.",
  },
  {
    title: "8. Extensions & late returns",
    body: "Any extension must be arranged before the rental period ends and is subject to availability. Unauthorized extensions are charged at overtime or daily rates, may be treated as a breach, and may incur penalties and recovery costs.",
  },
  {
    title: "9. Crew welfare & logistics",
    body: "Unless otherwise agreed, the Hirer provides transportation for equipment pick-up/return and, for any crew or technical personnel, adequate and timely meals, beverages, and — for overnight or extended productions — safe and suitable accommodations. A 15% surcharge applies for use outside Metro Manila. Failure to provide for crew welfare entitles us to charge the Hirer, suspend operations, or withdraw services without liability.",
  },
  {
    title: "10. Safety, conduct & right to withdraw",
    body: "The Hirer shall ensure a safe working environment and humane, respectful treatment of personnel. Our crew may halt operations deemed unsafe. We may refuse, suspend, or withdraw personnel and/or equipment without liability for unsafe conditions, legal violations, inadequate crew welfare, security risks, or unprofessional conduct; amounts paid remain non-refundable and the Hirer remains liable for costs incurred.",
  },
  {
    title: "11. Responsibility & risk of loss",
    body: "The Hirer assumes full responsibility for the equipment from release until return — including loss, theft, damage, or misuse, whether by the Hirer, its representatives, or third parties — except where solely caused by our personnel. The Hirer is responsible for insuring the equipment to its full replacement value during the rental period.",
  },
  {
    title: "12. Use, handling & restrictions",
    body: "Equipment is used only for its intended purpose and in accordance with proper operating standards. The Hirer shall not sub-rent, lend, modify, or allow unauthorized use without our prior written consent. All equipment remains the sole property of " + COMPANY.legalName + "; no ownership passes to the Hirer.",
  },
  {
    title: "13. Inspection & acceptance",
    body: "The Hirer may test all equipment before accepting delivery. Acceptance confirms the equipment is in good working condition; any defect must be reported immediately upon receipt, otherwise the equipment is deemed accepted.",
  },
  {
    title: "14. Replacement, repair & downtime",
    body: "For loss or damage, the Hirer pays the full cost of repair or replacement at current market value (including sourcing, shipping, and administrative costs), plus downtime charged at the standard rental rate per day until the equipment is repaired or replaced.",
  },
  {
    title: "15. Data, media & privacy",
    body: `Storage media are erased and reformatted on return unless otherwise agreed; the Hirer is solely responsible for backing up data and we are not liable for data loss. Under the Data Privacy Act of 2012, you consent to our collection and processing of personal data for verification, contract enforcement, and security purposes.`,
  },
  {
    title: "16. Liability, indemnity & force majeure",
    body: `We are not liable for indirect, incidental, or consequential damages (including production delays or loss of profits); any liability shall not exceed the total rental fees paid. The Hirer indemnifies ${COMPANY.legalName}, its proprietor and personnel, against claims arising from use of the equipment or breach of this agreement. We are not liable for delays or failures due to events beyond our control. For corporate Hirers, the authorized signatory is solidarily liable with the Hirer.`,
  },
  {
    title: "17. Governing law",
    body: "This agreement is governed by Philippine law. Disputes are subject to the courts of Parañaque City / Metro Manila, without prejudice to any mandatory consumer venue.",
  },
];

// Accepted identification — kept as a short, plain list for the checkout UI.
export const ACCEPTED_IDS: string[] = [
  "Driver's License",
  "Passport",
  "UMID / SSS / GSIS",
  "PhilID (National ID)",
  "PRC ID",
  "Postal ID / Voter's ID / other government-issued photo ID",
];
export const ID_POLICY =
  "At least one (1) original valid government-issued photo ID is required from the Hirer (or authorized representative) upon release, subject to verification and photo documentation.";

// What the customer should expect right after the downpayment clears.
export const AFTER_DOWNPAYMENT: string[] = [
  `Your slot is reserved and the equipment is held for your dates once the ${dpPct}% downpayment clears.`,
  "Your rental contract and invoice are emailed to you automatically — the downpayment is recorded and the remaining balance is shown as due.",
  "Our team confirms availability and coordinates pickup or delivery, crew/operator (if any), and any out-of-town logistics for your dates.",
  "On release, present your valid ID and settle the balance per the method you chose (or hand over your post-dated cheque). Test and accept the gear in good condition.",
  "Return the equipment complete and on time; the security deposit (if any) is refunded after inspection.",
];

// Per-method settlement copy used by the checkout radios and the documents.
export const PAYMENT_METHODS: Record<BalanceMethod, { label: string; tag?: string; blurb: string }> = {
  standard: {
    label: "Pay downpayment now, balance before handover",
    blurb: `Reserve with ${dpPct}% online today; settle the remaining balance by cash, bank transfer, or e-wallet before or upon handover.`,
  },
  full: {
    label: "Pay in full now",
    tag: `Save ${fullPct}%`,
    blurb: `Pay the whole rental online today and enjoy a ${fullPct}% full-payment discount. No balance to settle later.`,
  },
  pdc: {
    label: "Balance by post-dated cheque (PDC)",
    tag: `Save ${pdcPct}%`,
    blurb: `Reserve with ${dpPct}% online today and cover the balance with post-dated cheque(s) payable to ${COMPANY.legalName}, dated to clear on/before handover — earns a ${pdcPct}% discount. Cheques are subject to clearing; a dishonored cheque (BP22) voids the discount and may incur penalties.`,
  },
};
