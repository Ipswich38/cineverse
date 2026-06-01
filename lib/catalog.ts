export type EquipmentItem = {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string;
  owner: string;
  location: string;
  ratePerDay: number;
  securityDeposit: number;
  stock: number;
  featured: boolean;
  images: string[];
  specs: string[];
  tags: string[];
  /** Booked/blocked date ranges (inclusive, ISO YYYY-MM-DD). Used by the rental calendar. */
  unavailable?: { from: string; to: string }[];
};

export type SupplierSubmission = {
  id: string;
  createdAt: string;
  supplierName: string;
  email: string;
  phone: string;
  itemName: string;
  category: string;
  ratePerDay: number;
  stock: number;
  images: string[];
  description: string;
  status: "pending" | "approved" | "rejected";
};

export type CartItem = {
  itemId: string;
  slug: string;
  name: string;
  image: string;
  ratePerDay: number;
  days: number;
  quantity: number;
  owner: string;
};

export const CATEGORIES = [
  "Camera",
  "Lenses",
  "Lighting",
  "Grip",
  "Sound",
  "Support",
  "Production",
  "Post",
] as const;

export const INITIAL_CATALOG: EquipmentItem[] = [
  {
    id: "eq-cam-1",
    slug: "arri-alexa-mini-lf-kit",
    name: "ARRI Alexa Mini LF Kit",
    category: "Camera",
    description: "Cinema camera package for commercials, TV drama, and premium branded content.",
    owner: "Vissionlink Rentals",
    location: "Makati",
    ratePerDay: 18500,
    securityDeposit: 12000,
    stock: 2,
    featured: true,
    images: [
      "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1200&q=80",
    ],
    specs: ["6K Open Gate", "LPL Mount", "ProRes / ARRIRAW", "On-set support available"],
    tags: ["featured", "cinema camera", "broadcast"],
    unavailable: [{ from: "2026-06-05", to: "2026-06-12" }],
  },
  {
    id: "eq-lens-1",
    slug: "canon-cinema-zooms-set",
    name: "Canon Cinema Zooms Set",
    category: "Lenses",
    description: "Three-lens rental set with fast cine zooms for documentary and run-and-gun production.",
    owner: "J. Santos",
    location: "Quezon City",
    ratePerDay: 8200,
    securityDeposit: 5000,
    stock: 1,
    featured: true,
    images: [
      "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1200&q=80",
    ],
    specs: ["18-80mm", "70-200mm", "PL / EF options", "Case included"],
    tags: ["lens", "optics"],
    unavailable: [{ from: "2026-06-10", to: "2026-06-15" }],
  },
  {
    id: "eq-light-1",
    slug: "aputure-lighting-rig",
    name: "Aputure Lighting Rig",
    category: "Lighting",
    description: "Flexible LED package for interviews, narrative scenes, and small sets.",
    owner: "M. Reyes",
    location: "Pasig",
    ratePerDay: 5400,
    securityDeposit: 3500,
    stock: 4,
    featured: true,
    images: [
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80",
    ],
    specs: ["2x COB lights", "Softboxes", "Light stands", "DMX ready"],
    tags: ["light", "led"],
  },
  {
    id: "eq-sound-1",
    slug: "sound-devices-field-kit",
    name: "Sound Devices Field Kit",
    category: "Sound",
    description: "Location sound kit for production dialogue capture and field recording.",
    owner: "A. Diaz",
    location: "Taguig",
    ratePerDay: 6200,
    securityDeposit: 4000,
    stock: 3,
    featured: false,
    images: [
      "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1200&q=80",
    ],
    specs: ["Mixer-recorder", "Wireless lavs", "Boom kit", "Headphones"],
    tags: ["sound", "location"],
    unavailable: [{ from: "2026-06-20", to: "2026-06-25" }],
  },
  {
    id: "eq-grip-1",
    slug: "grip-and-stand-package",
    name: "Grip & Stand Package",
    category: "Grip",
    description: "All-purpose grip package for small to medium production setups.",
    owner: "Vissionlink Rentals",
    location: "Mandaluyong",
    ratePerDay: 4200,
    securityDeposit: 2500,
    stock: 6,
    featured: false,
    images: [
      "https://images.unsplash.com/photo-1492691527719-9bce0f3b5ad4?auto=format&fit=crop&w=1200&q=80",
    ],
    specs: ["C-stands", "Apple boxes", "Sandbags", "Flags"],
    tags: ["grip", "support"],
  },
  {
    id: "eq-post-1",
    slug: "dailies-and-storage-workstation",
    name: "Dailies & Storage Workstation",
    category: "Post",
    description: "On-set ingest, backups, and review station for production teams.",
    owner: "N. Torres",
    location: "Makati",
    ratePerDay: 3500,
    securityDeposit: 2000,
    stock: 2,
    featured: false,
    images: [
      "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80",
    ],
    specs: ["SSD backup", "Reader kits", "Monitor", "Checksum workflow"],
    tags: ["post", "dailies"],
  },
];

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function currency(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(value);
}

// ── Availability helpers (ISO YYYY-MM-DD strings compare lexicographically) ──

/** Do two inclusive date ranges overlap? */
export function rangesOverlap(aFrom: string, aTo: string, bFrom: string, bTo: string) {
  return aFrom <= bTo && bFrom <= aTo;
}

/** Is the item free for the entire requested window [from, to] (inclusive)? */
export function isItemAvailable(item: EquipmentItem, from?: string | null, to?: string | null) {
  if (!from || !to) return true;
  const start = from <= to ? from : to;
  const end = from <= to ? to : from;
  return !(item.unavailable ?? []).some((r) => rangesOverlap(start, end, r.from, r.to));
}

/** Every date (YYYY-MM-DD) that has at least one item booked — for calendar dots. */
export function bookedDateSet(items: EquipmentItem[]): Set<string> {
  const set = new Set<string>();
  for (const item of items) {
    for (const r of item.unavailable ?? []) {
      const d = new Date(r.from + "T00:00:00");
      const end = new Date(r.to + "T00:00:00");
      while (d <= end) {
        set.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
        d.setDate(d.getDate() + 1);
      }
    }
  }
  return set;
}

