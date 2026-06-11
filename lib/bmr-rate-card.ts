// BMR business data extracted from the official rate-card PDF
// (_BMR Camera Rent-04-26-26.pdf). Drives auto-generated e-quotations: the
// letterhead, the equipment day-rates, the package → line-item mapping, the
// VAT / surcharge math, and the rental terms & conditions.
//
// NOTE: the proprietor name is "Benito M. Remulta Jr." (Remulta), per the owner.
import { TAX_CLAUSE } from "./company";

export const BMR_BUSINESS = {
  tradeName: "BMR Cinema Operation Services",
  proprietor: "Benito M. Remulta Jr.",
  address: "141 GK. Village, Cubicside, Barangay Merville, Parañaque City",
  tin: "282-087-636-000",
  phone: "+63 906 566 6556 / +63 991 717 3777",
  email: "bremulta25@yahoo.com",
  altEmail: "jokz1988@gmail.com",
} as const;

// Payment bank details — printed on every BMR quote/invoice for settlement.
export const BMR_BANK = {
  bankName: "Security Bank",
  accountName: "Benito Remulta Jr",
  accountNumber: "000 000 755 9939",
  note: "Please send any proof of transfer for confirmation.",
} as const;

// Default payment-terms text (editable per quotation). Matches BMR's invoices.
export const DEFAULT_PAYMENT_TERMS = "100% full payment on the last day of shooting.";

export type RateCardItem = { key: string; name: string; dailyRate: number };

// Equipment & day-rates (PHP). Items the PDF lists without a printed rate are
// omitted here; the admin can still add custom lines in the editor.
export const RATE_CARD: RateCardItem[] = [
  { key: "ac-kit-set7", name: "Set 7 Assistant Cameraman Kit", dailyRate: 18000 },
  { key: "ronin-rs3-pro", name: "Ronin RS3 Pro Gimbal Stabilizer Combo", dailyRate: 10000 },
  { key: "tilta-float", name: "Tilta Float Handheld Gimbal Support System", dailyRate: 10000 },
  { key: "solidcom-c1-pro", name: "Solidcom C1 Pro (intercom)", dailyRate: 10000 },
  { key: "pyro-s", name: "Hollyland Pyro S (wireless video)", dailyRate: 5000 },
  { key: "floor-monitor-21", name: '21" Floor Monitor (Seetec P215 Pro, 1000 NIT)', dailyRate: 4500 },
  { key: "bm-wireless-recorder", name: "Blackmagic Wireless Recorder", dailyRate: 10000 },
  { key: "cosmo-600", name: "Hollyland Cosmo 600 (wireless video)", dailyRate: 4000 },
  { key: "tilta-nucleus-m", name: "Tilta Nucleus M (full kit, hard case)", dailyRate: 15000 },
  { key: "dji-ronin-2", name: "DJI Ronin 2 Electronic Gimbal (no camera)", dailyRate: 35000 },
  { key: "jbl-partybox-320", name: "JBL Party Box 320", dailyRate: 2500 },
  { key: "vaxis-3000-storm", name: "Vaxis 3000 Storm (wireless video)", dailyRate: 20000 },
  { key: "gopro-hero-13", name: "GoPro Hero 13 Black", dailyRate: 3000 },
  { key: "komodo-6k-body", name: "RED KOMODO 6K (body kit)", dailyRate: 15000 },
  { key: "insta360-x4", name: "Insta360 X4 8K Camera", dailyRate: 3500 },
  { key: "nucleus-m-iris", name: "Tilta Nucleus M Iris Control", dailyRate: 3500 },
  { key: "dji-mavic-4-pro", name: "DJI Mavic 4 Pro-100 (6K-60fps)", dailyRate: 20000 },
  { key: "drone-operator", name: "Cinematic Drone Operator (service)", dailyRate: 25000 },
  { key: "dzofilm-arles-5", name: "DZOFILM Arles FF/VV Prime 5 Lenses (EF/PL)", dailyRate: 15000 },
  { key: "smallhd-702-touch", name: "SmallHD 702 Touch Monitor", dailyRate: 3500 },

  // ── Lighting & grip ─────────────────────────────────────────────────────────
  // Read from the BMR cost-estimate sheet (pages 15-16). On that sheet the price
  // column holds the LINE total, so the per-unit day-rate below = total ÷ qty.
  { key: "nanlux-evoke-1200b", name: "Nanlux Evoke 1200B (Fresnel + barndoors)", dailyRate: 8000 },
  { key: "nanlux-720b", name: "Nanlux 720B Light Kit (Fresnel + barndoors)", dailyRate: 4500 },
  { key: "aputure-ls300x", name: "Aputure LS300X LED Light Kit (Fresnel + barndoors)", dailyRate: 2500 },
  { key: "aputure-b7c", name: "Aputure B7C Kit", dailyRate: 3000 },
  { key: "amaran-f22-rgb", name: "Amaran F22 2x2 RGB Flexible Light Mat", dailyRate: 3000 },
  { key: "aputure-dome-150", name: "Aputure Light Dome 150", dailyRate: 1000 },
  { key: "aputure-dome-90", name: "Aputure Light Dome 90", dailyRate: 500 },
  { key: "aputure-spotlight", name: "Aputure Spotlight (19/26/36° lens)", dailyRate: 2500 },
  { key: "aputure-lantern-85", name: "Aputure Lantern 85", dailyRate: 500 },
  { key: "nanlite-pavotube-30c", name: "Nanlite Pavotube II 30C RGBWW LED Pixel Tube", dailyRate: 2000 },
  { key: "pavotube-1ft", name: "1ft Pavotube", dailyRate: 750 },
  { key: "avenger-c-stand", name: "Avenger C-Stand with arm & grip head", dailyRate: 300 },
  { key: "avenger-hi-roller", name: "Avenger Hi Roller Stand (large wide base)", dailyRate: 500 },
  { key: "manfrotto-04-stand", name: "Manfrotto 04 Light Stand", dailyRate: 200 },
  { key: "matthellini-clamp", name: "Matthellini Clamp", dailyRate: 200 },
  { key: "gator-clamp", name: "Gator Clamp", dailyRate: 200 },
  { key: "super-clamp", name: "Super Clamp", dailyRate: 100 },

  // ── Lighting control ────────────────────────────────────────────────────────
  { key: "survival-kit", name: "Survival Kit", dailyRate: 1500 },
  { key: "floppy-4x4", name: "4x4 Floppy", dailyRate: 500 },
  { key: "silk-4x4", name: "4x4 Silk", dailyRate: 1000 },
  { key: "butterfly-12x12", name: "12x12 Butterfly", dailyRate: 2000 },
  { key: "butterfly-20x20", name: "20x20 Butterfly", dailyRate: 3000 },
  { key: "black-backing-12x12", name: "12x12 Black Backing", dailyRate: 500 },
  { key: "black-backing-20x20", name: "20x20 Black Backing", dailyRate: 1000 },
  { key: "reflector", name: "Reflector", dailyRate: 500 },
  { key: "polecat-8ft", name: "Manfrotto 8ft Polecat", dailyRate: 1000 },

  // ── Dollies & utilities ─────────────────────────────────────────────────────
  { key: "smoke-machine", name: "Smoke Machine / Haze", dailyRate: 2500 },
  { key: "ladder-10ft", name: "10ft Ladder", dailyRate: 200 },
  { key: "apple-box-set", name: "Apple Box Set (full/half/quarter)", dailyRate: 100 },
  { key: "sandbag", name: "Sandbag", dailyRate: 25 },
  { key: "extension-cord", name: "Extension Cord", dailyRate: 100 },
];

// Crew / personnel day-rates (the "Labor Cost" section on BMR quotes). Per-unit
// rates derived the same way (line total ÷ headcount).
export type PersonnelRate = { key: string; name: string; dailyRate: number };
export const PERSONNEL_RATES: PersonnelRate[] = [
  { key: "cam-assist", name: "Camera Assistant", dailyRate: 4000 },
  { key: "drone-caretaker", name: "Drone Caretaker", dailyRate: 1500 },
  { key: "head-crew", name: "Head Crew", dailyRate: 2500 },
  { key: "grip-crew", name: "Grip Crew", dailyRate: 2000 },
];

export const RATE_CARD_BY_KEY: Record<string, RateCardItem> = Object.fromEntries(
  RATE_CARD.map((r) => [r.key, r]),
);

// Which rate-card lines pre-fill a draft when a client requests a given package
// (by package-offer slug). Quantities default to 1; the admin edits from there.
export const PACKAGE_RATE_LINES: Record<string, { key: string; qty: number }[]> = {
  "komodo-camera-package": [{ key: "komodo-6k-body", qty: 1 }],
  "komodo-prime-monitoring-package": [
    { key: "komodo-6k-body", qty: 1 },
    { key: "dzofilm-arles-5", qty: 1 },
    { key: "floor-monitor-21", qty: 1 },
  ],
  "full-production-lighting-grip-package": [
    { key: "komodo-6k-body", qty: 1 },
    { key: "dzofilm-arles-5", qty: 1 },
    { key: "ac-kit-set7", qty: 1 },
    { key: "dji-ronin-2", qty: 1 },
    { key: "bm-wireless-recorder", qty: 1 },
  ],
  "assistant-cameraman-ac-kit": [{ key: "ac-kit-set7", qty: 1 }],
  "gimbal-stabilizer-package": [
    { key: "ronin-rs3-pro", qty: 1 },
    { key: "tilta-float", qty: 1 },
  ],
};

// Financial rules from the terms.
export const FINANCE = {
  vatRate: 0.12, // 12% VAT (term 19)
  outOfTownSurchargeRate: 0.15, // 15% outside Metro Manila (term 16)
  currency: "PHP",
} as const;

// Default validity window for a quotation (days from issue).
export const QUOTATION_VALID_DAYS = 7;

// Rental terms & conditions — copied verbatim from the BMR rate-card PDF.
export const QUOTATION_TERMS: string[] = [
  "1. AGREEMENT — This quotation, upon acceptance, forms a rental agreement between BMR (the Owner) and the client (the Hirer) for the equipment and period specified above.",
  "2. EQUIPMENT CONDITION — The Hirer shall be entitled to test all specified equipment before accepting delivery. Upon signing this Agreement, the Hirer acknowledges that the equipment supplied by the Owner is in good operational condition.",
  "3. SAFETY COMPLIANCE — The Hirer agrees to comply with all safety requirements as instructed by the crew operating the equipment supplied by the Owner. The crew reserves the right to halt operations if deemed unsafe. Should the Hirer choose to proceed under such conditions, the Hirer assumes full liability for any resulting accidents or claims.",
  "4. INSPECTION RIGHTS — The Hirer shall permit any person authorized by the Owner to examine the condition of the equipment at all reasonable times and locations.",
  "5. INSURANCE RESPONSIBILITY — The Hirer shall be responsible for insuring the equipment during the rental period against loss or damage (including accident, fire, or theft) to its FULL REPLACEMENT VALUE.",
  "6. LOSS OR DAMAGE — In the event of loss or damage, the Hirer shall cover all repair or replacement costs as determined by the Owner. Rental charges shall continue for the duration required to repair or replace the equipment.",
  "7. REPORTING ISSUES — Any damage or malfunction must be reported immediately upon return of the equipment.",
  "8. LIABILITY WAIVER — The Owner shall not be held liable in contract or tort for any loss, injury, or damage sustained by the Hirer or any third party arising from the use or presence of the equipment.",
  "9. EQUIPMENT SUITABILITY — The Owner shall not be liable for any loss, injury, or damage caused by incorrect, defective, or malfunctioning equipment. By accepting delivery, the Hirer confirms that the equipment is suitable and in proper working condition.",
  "10. OWNERSHIP — All equipment remains the sole property of the Owner. No rights or ownership interest are transferred to the Hirer.",
  "11. POSSESSION AND CONTROL — The Hirer shall only return the equipment to the Owner or its authorized representative. The Hirer shall not transfer possession to any third party without written consent from the Owner.",
  "12. RENTAL PERIOD — One rental day is equivalent to Twenty Four (24) hours. Rental charges begin when equipment leaves the Owner's premises and end upon return or end of agreed period (whichever is later). Extensions beyond 24 hours incur overtime charges.",
  "13. EXTENSION POLICY — Any extension must be arranged before the original rental period ends and is subject to equipment availability.",
  "14. TRANSPORTATION — Transportation for equipment pick-up and return shall be the responsibility of the Hirer unless otherwise agreed.",
  "15. CREW REQUIREMENTS — The Hirer shall be responsible for providing food, lodging, transportation, permits, insurance, and travel arrangements for any crew or technical personnel.",
  "16. OUT-OF-TOWN SURCHARGE — A 15% surcharge shall apply for equipment use outside Metro Manila.",
  "17. CANCELLATION POLICY — A 20% cancellation fee applies if canceled within 12 hours of the scheduled rental. A 50% set-up fee applies if cancellation occurs after equipment has been picked up.",
  "18. PRICE CHANGES — All rental prices and specifications are subject to change without prior notice.",
  `19. TAX — ${TAX_CLAUSE}`,
  "20. PAYMENT TERMS — Full payment must be made prior to equipment release unless otherwise agreed in writing.",
  "21. LATE PAYMENT CHARGES — A 5% monthly interest will be applied to outstanding balances beyond 15 days from the due date.",
  "22. OUTSTANDING BALANCES — BMR reserves the right to refuse release of equipment if the Hirer has unpaid balances from previous rentals.",
];
