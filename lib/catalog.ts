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

const OWNER = "Vissionlink Rentals";
const LOCATION = "Paranaque City";

const IMG_CAMERA = "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1200&q=80";
const IMG_SUPPORT = "https://images.unsplash.com/photo-1492691527719-9bce0f3b5ad4?auto=format&fit=crop&w=1200&q=80";
const IMG_LIGHTING = "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80";
const IMG_AUDIO = "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1200&q=80";
const IMG_DRONE = "https://images.unsplash.com/photo-1473968512647-3e447244af8f?auto=format&fit=crop&w=1200&q=80";

function item(
  id: string,
  name: string,
  category: string,
  ratePerDay: number,
  stock: number,
  description: string,
  specs: string[],
  tags: string[],
  image = IMG_CAMERA,
  featured = false,
): EquipmentItem {
  return {
    id,
    slug: slugify(name),
    name,
    category,
    description,
    owner: OWNER,
    location: LOCATION,
    ratePerDay,
    securityDeposit: 0,
    stock,
    featured,
    images: [image],
    specs,
    tags,
  };
}

// The store catalog mirrors BMR's "Equipment List & Rate" sheet: gear rents by
// complete SET/KIT (each with its own day-rate and stock), never by loose piece.
// This seed is the first-paint fallback; the live list is DB-backed and kept in
// sync (vissionlink_equipment). Keep these in step with that table.
export const INITIAL_CATALOG: EquipmentItem[] = [
  item("bmr-komodo-body", "KOMODO 6K (Body Kit)", "cinema-cameras", 15000, 2, "RED KOMODO 6K body kit with power, media, monitor, matte box and full support — ready for shoot day.", ["RED KOMODO 6K body", "EF-PL adapter mount", "4x V-mount 99Wh batteries + charger", "4x5 Tilta clip-on matte box", "7\" Portkeys monitor", "Tripod, hi-hat & Sachtler fluid head", "Pelican case"], ["komodo", "red", "camera"], IMG_CAMERA, true),
  item("bmr-set7-ac-kit", "Set 7 Assistant Cameraman Kit", "camera-assist-kits", 18000, 3, "Complete AC department kit: wireless follow focus, OLED monitor, Vaxis wireless video and full AC tools.", ["Tilta Nucleus-M wireless follow focus", "5\" SmallHD OLED monitor", "Vaxis Storm 1000s wireless video", "Rec/Stop for Alexa / Sony / RED / Komodo", "T-marks, tools & accessories"], ["ac kit", "assistant cameraman"], IMG_SUPPORT, true),
  item("bmr-dzofilm-arles", "DZOFilm Arles FF/VV Prime 5-Lens Set (EF/PL)", "full-frame-prime", 15000, 2, "Full-frame DZOFilm Arles T1.4 prime set in EF/PL mount.", ["25mm T1.4", "35mm T1.4", "50mm T1.4", "75mm T1.4", "100mm T1.4", "EF/PL mount"], ["dzofilm", "prime lenses"], IMG_CAMERA, true),
  item("bmr-ronin-2", "DJI Ronin 2 Electronic Gimbal (no camera)", "gimbals", 35000, 2, "Heavy-lift DJI Ronin 2 gimbal for cinema payloads.", ["DJI Ronin 2 gimbal", "Remote controller", "7x TB50 batteries + quad charger", "Ready Rig", "Camera plates & 15mm rods", "Triple D-Tap breakout box"], ["ronin 2", "gimbal"], IMG_SUPPORT, true),
  item("bmr-vaxis-3000-storm", "Vaxis 3000 Storm (Wireless Video)", "wireless-video", 20000, 2, "Long-range pro wireless video system.", ["Transmitter", "Receiver", "D-Tap power cables", "Short BNC"], ["vaxis", "wireless video"], IMG_SUPPORT, true),
  item("bmr-mavic-4-pro", "DJI Mavic 4 Pro-100 (6K-60fps)", "cinema-drones", 20000, 2, "DJI Mavic 4 Pro aerial system, 6K-60fps. Cinematic drone operator available on request.", ["DJI Mavic 4 Pro (6K-60fps)", "512GB Creator Combo", "RC Pro 2 controller", "ND filter set (ND8/16/32/64)", "3x intelligent batteries + parallel charger"], ["mavic", "drone", "aerial"], IMG_DRONE, true),
  item("bmr-tilta-nucleus-m", "Tilta Nucleus M (Full Kit, Hard Case)", "follow-focus", 15000, 4, "Complete wireless follow-focus system with dual handles and hard case.", ["Wireless FIZ hand unit", "2x brushless wireless motors", "Dual wireless handles", "Follow-focus marking disks", "Motor & power cables", "Hard waterproof case"], ["tilta", "nucleus m", "follow focus"], IMG_SUPPORT),
  item("bmr-nucleus-iris", "Nucleus M Iris Control", "follow-focus", 3500, 5, "Add-on wireless iris control for the Nucleus M system.", ["Hand unit", "Iris motor", "Battery & charger"], ["iris control", "follow focus"], IMG_SUPPORT),
  item("bmr-ronin-rs3-pro", "Ronin RS3 Pro Gimbal Stabilizer Combo", "gimbals", 10000, 1, "DJI RS3 Pro stabilizer combo with image transmission and focus motor.", ["DJI RS3 Pro", "Raveneye image transmission", "RS motor 2023 + focus combo", "Briefcase handle", "Arca quick-release plates", "Carry case"], ["ronin", "gimbal", "stabilizer"], IMG_SUPPORT),
  item("bmr-tilta-float", "Tilta Float Handheld Gimbal Support System", "gimbals", 10000, 1, "Body-mounted gimbal support system for long operating days.", ["Tilta Float arm & post", "Support vest", "Wireless thumb controller", "Monitor bracket", "Shoulder support", "Carrying case"], ["tilta float", "gimbal support"], IMG_SUPPORT),
  item("bmr-solidcom-c1-pro", "Hollyland Solidcom C1 Pro (Intercom)", "wireless-systems", 10000, 2, "8-headset full-duplex wireless intercom for set communication.", ["8x remote headsets", "8-slot charger", "16x C batteries", "On-air foam cushions"], ["solidcom", "comms", "headset"], IMG_SUPPORT),
  item("bmr-bm-wireless-recorder", "Blackmagic Wireless Recorder", "recorders", 10000, 4, "Director's monitor + wireless recorder cage package.", ["Director's monitor cage V3", "Carbon fiber handgrips", "Short rods & quick-release hood", "Dual-connector monitor", "1535 Pelican Air case"], ["blackmagic", "recorder"], IMG_SUPPORT),
  item("bmr-pyro-s", "Hollyland Pyro S (Wireless Video)", "wireless-video", 5000, 8, "Wireless video transmitter/receiver kit for monitoring.", ["2x transmitters", "2x receivers", "D-Tap power supplies", "Articulating arms"], ["pyro s", "wireless video"], IMG_SUPPORT),
  item("bmr-floor-monitor-21", "21\" Floor Monitor (Seetec P215 Pro, 1000 NIT)", "director-monitors", 4500, 4, "Bright 21-inch director / client floor monitor.", ["Seetec P215 Pro 21\" 1000 NIT", "D-Tap power supply", "Mounting brackets", "Sunhood & stand"], ["floor monitor", "video village"], IMG_SUPPORT),
  item("bmr-cosmo-600", "Hollyland Cosmo 600 (Wireless Video)", "wireless-video", 4000, 2, "Mid-range wireless video transmission kit.", ["Transmitter", "Receiver", "D-Tap power cables", "Short BNC"], ["cosmo", "wireless video"], IMG_SUPPORT),
  item("bmr-insta360-x4", "Insta360 X4 8K Camera", "action-cameras", 3500, 3, "8K 360 action camera kit for immersive and specialty shots.", ["Insta360 X4 8K", "Standard lens guard", "2290 battery", "128GB SD card", "USB-C charging cable", "Protective pouch"], ["360", "insta360", "action camera"], IMG_CAMERA),
  item("bmr-gopro-hero-13", "GoPro Hero 13 Black", "action-cameras", 3000, 2, "Compact action camera kit for body-mount, vehicle and specialty angles.", ["GoPro Hero 13 Black", "2x 128GB SD cards", "2x spare batteries + charger", "Body mount", "Pelican case"], ["gopro", "action camera"], IMG_CAMERA),
  item("bmr-jbl-partybox-320", "JBL Party Box 320", "speakers", 2500, 2, "Portable PA / playback speaker with wireless mics.", ["JBL Party Box 320", "2x microphones", "Receiver", "Battery & case"], ["jbl", "speaker", "microphone"], IMG_AUDIO),
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
