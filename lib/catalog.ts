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

export const INITIAL_CATALOG: EquipmentItem[] = [
  item("bmr-komodo-package", "KOMODO Package (6K Sensor)", "cinema-cameras", 18000, 2, "RED Komodo camera package for commercial, music video, and narrative production.", ["6K sensor", "0.75-120fps", "Camera body package", "BMR operated support available"], ["komodo", "red", "camera", "package"], IMG_CAMERA, true),
  item("bmr-komodo-body", "KOMODO 6K (Body)", "cinema-cameras", 15000, 2, "Komodo 6K body package with power, monitor, media, matte box, and support accessories.", ["4x V-mount 99Wh battery", "7 inch Portkeys monitor", "EF-PL adapter mount", "Matte box and Pelican case"], ["komodo", "red", "camera"], IMG_CAMERA, true),
  item("bmr-gopro-hero-13", "GoPro Hero 13 Black", "action-cameras", 3000, 2, "Compact action camera kit for body mount, vehicle, action, and specialty angles.", ["Charger", "2x 128GB SD cards", "2x spare battery", "Body mount and Pelican case"], ["gopro", "action camera"], IMG_CAMERA),
  item("bmr-insta360-x4", "Insta360 X4 8K Camera", "specialty-cameras", 3500, 3, "8K 360 camera kit for immersive angles, BTS, and specialty production coverage.", ["Standard lens guard", "2290 battery", "128GB SD card", "USB-C cable and pouch"], ["360", "insta360", "specialty camera"], IMG_CAMERA),

  item("bmr-dzofilm-arles", "DZOFilm Arles FF/VV Prime 5 Lens Set (EF/PL)", "full-frame-prime", 15000, 2, "Five-lens full-frame prime set for cinematic coverage.", ["25mm T1.4", "35mm T1.4", "50mm T1.4", "75mm T1.4", "100mm T1.4"], ["dzofilm", "prime lenses", "ef", "pl"], IMG_CAMERA, true),
  item("bmr-nd-filter-set", "ND Filter Set #3, #6, #9", "nd-filters", 0, 1, "Neutral density filter set available as an add-on for camera packages.", ["ND #3", "ND #6", "ND #9", "Quoted with camera package"], ["nd filters", "filters"], IMG_CAMERA),
  item("bmr-tilta-nucleus-m", "Tilta Nucleus M Full Kit", "follow-focus", 15000, 4, "Wireless FIZ follow-focus kit with hand unit, motors, handles, power, chargers, and hard case.", ["Wireless FIZ hand unit", "2x wireless motors", "Right and left wireless handles", "Hard shell waterproof case"], ["tilta", "nucleus m", "follow focus"], IMG_SUPPORT, true),
  item("bmr-nucleus-iris", "Nucleus M Iris Control", "follow-focus", 3500, 5, "Compact Nucleus M iris control set for lens control workflows.", ["Hand unit", "Iris motor", "Battery and charger"], ["iris control", "follow focus"], IMG_SUPPORT),

  item("bmr-set-7-ac-kit", "Set 7 Assistant Cameraman Kit", "camera-assist-kits", 18000, 3, "Assistant cameraman kit with wireless follow focus, SmallHD monitor, Vaxis wireless video, and AC tools.", ["Tilta Nucleus-M components", "SmallHD OLED monitor", "Vaxis Storm 1000s", "T-marks, laser pointer, Robocup"], ["ac kit", "assistant cameraman", "follow focus"], IMG_SUPPORT, true),
  item("bmr-ronin-rs3-pro", "Ronin RS3 Pro Gimbal Stabilizer Combo", "gimbals", 10000, 1, "DJI Ronin RS3 Pro stabilizer combo with RavenEye, focus motor accessories, and Tilta ring grip support.", ["DJI RavenEye image transmission", "DJI RS Motor 2023", "Tilta advance ring grip", "V-mount battery plate"], ["ronin", "gimbal", "stabilizer"], IMG_SUPPORT),
  item("bmr-tilta-float", "Tilta Float Handheld Gimbal Support System", "gimbals", 10000, 1, "Body-supported handheld gimbal support system for longer stabilized operating days.", ["Support vest", "System arm and post", "Wireless thumb controller", "V-mount battery plate and case"], ["tilta float", "gimbal support"], IMG_SUPPORT),
  item("bmr-dji-ronin-2", "DJI Ronin 2 Electronic Gimbal", "gimbals", 35000, 2, "Heavy-lift Ronin 2 package for cinema camera stabilization without camera body.", ["Gimbal and remote controller", "7x TB50 batteries", "Ready Rig", "Camera power and control cables"], ["ronin 2", "gimbal", "heavy lift"], IMG_SUPPORT, true),
  item("bmr-tripod-fluid-head", "Tripod and Fluid Head Support", "fluid-heads", 1500, 1, "Tripod and fluid head support included with select camera packages or quoted as an add-on.", ["Tall tripod", "Sachtler fluid head", "Hi-hat support"], ["tripod", "fluid head"], IMG_SUPPORT),

  item("bmr-pyro-s", "Hollyland Pyro S Wireless Video", "wireless-video", 5000, 8, "Wireless video set with transmitters, receivers, D-tap power, USB-C, and articulating arms.", ["2x transmitters", "2x receivers", "4x D-tap power supplies", "4x articulating arms"], ["pyro s", "wireless video"], IMG_CAMERA, true),
  item("bmr-vaxis-3000", "Vaxis 3000 Storm", "wireless-video", 20000, 2, "Long-range Vaxis Storm wireless video set for demanding monitoring workflows.", ["Transmitter", "Receiver", "D-tap power cables", "Mounting screws and short BNC"], ["vaxis", "wireless video"], IMG_CAMERA),
  item("bmr-vaxis-1000s", "Vaxis 1000S", "wireless-video", 5000, 1, "Vaxis 1000S wireless video transmitter and receiver kit.", ["Transmitter", "Receiver", "D-tap power cables", "Short BNC"], ["vaxis", "wireless video"], IMG_CAMERA),
  item("bmr-cosmo-600", "Cosmo 600 Wireless Video", "wireless-video", 4000, 2, "Cosmo 600 transmitter and receiver kit for compact wireless video monitoring.", ["Transmitter", "Receiver", "D-tap power cables", "Short BNC"], ["cosmo", "wireless video"], IMG_CAMERA),
  item("bmr-handheld-directors-monitor", "Handheld Director's Monitor", "director-monitors", 3500, 4, "Director's handheld monitoring setup with Vaxis wireless video and SmallHD touch monitor.", ["Vaxis 1000", "702 SmallHD Touch", "D-tap power supply", "Sun hood and mounting bracket"], ["director monitor", "smallhd"], IMG_CAMERA),
  item("bmr-21-floor-monitor", "21 Inches Floor Monitor", "director-monitors", 4500, 4, "Large floor monitor setup for director, client, and video village viewing.", ["Seetec P215 Pro 21 inch 1000 nit monitor", "D-tap power supply", "Mounting brackets", "Stand and sunhood"], ["floor monitor", "video village"], IMG_CAMERA),
  item("bmr-blackmagic-wireless-recorder", "Blackmagic Wireless Recorder", "recorders", 10000, 4, "Director's monitor cage and recording kit with Pelican case and accessories.", ["Director's Monitor Cage V3 kit", "Carbon fiber handgrips", "1535 Pelican Air case", "Dual connector monitor brackets"], ["blackmagic", "recorder"], IMG_CAMERA),

  item("bmr-solidcom-c1-pro", "Solidcom C1 Pro", "wireless-systems", 10000, 2, "Wireless production communication headset system for camera, grip, and production teams.", ["8x remote headsets", "8-slot charger", "16x batteries", "On-air foam cushions"], ["solidcom", "comms", "headset"], IMG_AUDIO),
  item("bmr-jbl-partybox-320", "JBL PartyBox 320", "speakers", 2500, 2, "Portable powered speaker package with wireless microphones for playback and production use.", ["2x microphones", "Receiver", "Battery", "Case"], ["jbl", "speaker", "microphone"], IMG_AUDIO),

  item("bmr-dji-mavic-4-pro", "DJI Mavic 4 Pro 100MP 6K 60fps", "cinema-drones", 20000, 2, "DJI Mavic 4 Pro Creator Combo for aerial production work.", ["512GB Creator Combo", "DJI RC Pro 2 controller", "Parallel charging hub", "ND filter set and 3 batteries"], ["mavic", "drone", "aerial"], IMG_DRONE, true),
  item("bmr-cinematic-drone-operator", "Cinematic Drone Operator", "drone-operators", 25000, 1, "Professional drone operator service for cinematic aerial work, quoted with drone availability and production scope.", ["Operator service", "Aerial production support", "Quoted by shoot requirement"], ["drone operator", "aerial"], IMG_DRONE),

  item("bmr-nanlux-evoke-1200b", "Nanlux Evoke 1200B with Fresnel and Barndoors", "cob-lights", 8000, 1, "High-output bi-color LED fixture package for large set and location lighting.", ["Fresnel", "Barndoors", "High-output bi-color LED"], ["nanlux", "cob light"], IMG_LIGHTING, true),
  item("bmr-nanlux-720b", "Nanlux 720B Light Kit with Fresnel and Barndoors", "cob-lights", 4500, 1, "Bi-color LED light kit for controlled key, fill, and background lighting.", ["Fresnel", "Barndoors", "LED light kit"], ["nanlux", "light"], IMG_LIGHTING),
  item("bmr-aputure-ls300x", "Aputure LS300X LED Light Kit", "cob-lights", 2500, 1, "Aputure LS300X kit with Fresnel and barndoors for interview and scene lighting.", ["Fresnel", "Barndoors", "Bi-color LED"], ["aputure", "cob light"], IMG_LIGHTING),
  item("bmr-aputure-b7c-kit", "Aputure B7C Kit", "rgb-lights", 3000, 1, "Practical RGB bulb kit for motivated lighting and set accents.", ["RGB practical bulbs", "Kit configuration", "Battery-capable practical lighting"], ["aputure", "rgb", "practical"], IMG_LIGHTING),
  item("bmr-amaran-f22", "Amaran F22 2x2 RGB Flexible Light Mat", "light-mats", 6000, 2, "Flexible RGB light mat package for soft, controllable output in tight spaces.", ["2x2 flexible RGB mat", "Soft output", "Compact rigging"], ["amaran", "rgb mat"], IMG_LIGHTING),
  item("bmr-pavotube-30c", "Nanlite Pavotube II 30C RGBWW LED Pixel Tube", "tube-lights", 4000, 2, "RGBWW pixel tube kit for color effects, practicals, and production accents.", ["Pavotube II 30C", "RGBWW pixel control", "Tube light kit"], ["nanlite", "pavotube", "tube light"], IMG_LIGHTING),
  item("bmr-pavotube-1ft", "1ft Pavotube Kit", "tube-lights", 3000, 4, "Compact Pavotube kit for accent lighting, hiding lights, and tabletop work.", ["1ft tubes", "RGB tube lighting", "Compact placement"], ["pavotube", "tube light"], IMG_LIGHTING),
  item("bmr-light-dome-150", "Aputure Light Dome 150", "softboxes", 1000, 1, "Large soft modifier for Aputure and compatible COB lighting.", ["150cm soft modifier", "Soft key light", "Quoted as lighting add-on"], ["softbox", "aputure"], IMG_LIGHTING),
  item("bmr-light-dome-90", "Aputure Light Dome 90", "softboxes", 500, 1, "Medium soft modifier for compact key and fill lighting.", ["90cm soft modifier", "Lighting add-on"], ["softbox", "aputure"], IMG_LIGHTING),
  item("bmr-aputure-spotlight", "Aputure Spotlight with 19, 26, 36 Degree Lenses", "spotlight-attachments", 2500, 1, "Spotlight projection attachment set for precise beam shaping.", ["19 degree lens", "26 degree lens", "36 degree lens"], ["spotlight", "aputure"], IMG_LIGHTING),
  item("bmr-aputure-lantern-85", "Aputure Lantern 85", "lanterns", 1000, 2, "Lantern soft modifier for broad ambient light and overhead setups.", ["Lantern 85", "Soft ambient spread"], ["lantern", "soft light"], IMG_LIGHTING),

  item("bmr-avenger-c-stands", "Avenger C-Stand with Arm and Grip Head", "c-stands", 3000, 10, "C-stand package with arms and grip heads for lighting and grip setups.", ["10x Avenger C-stands", "Arms and grip heads", "Quoted as package quantity"], ["c-stand", "grip"], IMG_SUPPORT),
  item("bmr-hi-roller-stands", "Avenger Hi Roller Stand Large Wide Base", "roller-stands", 2000, 4, "Large wide-base roller stand set for heavier fixtures and modifiers.", ["4x Hi Roller stands", "Large wide base"], ["roller stand", "grip"], IMG_SUPPORT),
  item("bmr-manfrotto-light-stand", "Manfrotto 04 Light Stand", "light-stands", 800, 4, "Manfrotto light stand set for LED and modifier support.", ["4x Manfrotto 04 stands", "Lighting support"], ["light stand", "grip"], IMG_SUPPORT),
  item("bmr-matthellini-clamp", "Matthellini Clamp", "clamps", 1200, 6, "Matthellini clamp set for rigging and grip work.", ["6x Matthellini clamps", "Grip rigging"], ["clamp", "grip"], IMG_SUPPORT),
  item("bmr-gator-clamp", "Gator Clamp", "clamps", 800, 4, "Gator clamp set for production rigging.", ["4x Gator clamps", "Grip rigging"], ["clamp", "grip"], IMG_SUPPORT),
  item("bmr-super-clamp", "Super Clamp", "clamps", 400, 4, "Super clamp set for compact rigging and accessory mounting.", ["4x Super clamps", "Accessory mounting"], ["clamp", "grip"], IMG_SUPPORT),
  item("bmr-survival-kit", "Survival Kit", "production-supplies", 1500, 1, "Production survival kit quoted as a support add-on for full production packages.", ["Production support kit", "Quoted by shoot needs"], ["survival kit", "production"], IMG_SUPPORT),
  item("bmr-digital-juice-shadow-kit", "Digital Juice Shadow Kit", "flags", 0, 1, "Shadow and light control kit available as a quoted add-on.", ["Light shaping kit", "Quoted with lighting package"], ["shadow kit", "lighting control"], IMG_LIGHTING),
  item("bmr-4x4-floppy", "4x4 Floppy", "flags", 2000, 4, "4x4 floppy flags for negative fill and light control.", ["4x 4x4 floppy", "Light control"], ["floppy", "flag"], IMG_LIGHTING),
  item("bmr-4x4-silk", "4x4 Silk", "flags", 2000, 2, "4x4 silk frames for diffusion and light softening.", ["2x 4x4 silk", "Diffusion"], ["silk", "diffusion"], IMG_LIGHTING),
  item("bmr-12x12-butterfly", "12x12 Butterfly", "overheads", 2000, 1, "12x12 overhead butterfly for light control and diffusion.", ["12x12 overhead", "Butterfly frame"], ["butterfly", "overhead"], IMG_LIGHTING),
  item("bmr-20x20-butterfly", "20x20 Butterfly", "overheads", 3000, 1, "20x20 overhead butterfly for larger exterior or studio setups.", ["20x20 overhead", "Butterfly frame"], ["butterfly", "overhead"], IMG_LIGHTING),
  item("bmr-12x12-black-backing", "12x12 Black Backing", "overheads", 500, 1, "Black backing for overhead control and negative fill.", ["12x12 black backing", "Light control"], ["black backing", "negative fill"], IMG_LIGHTING),
  item("bmr-20x20-black-backing", "20x20 Black Backing", "overheads", 1000, 1, "Large black backing for overhead control and negative fill.", ["20x20 black backing", "Light control"], ["black backing", "negative fill"], IMG_LIGHTING),
  item("bmr-reflector", "Reflector", "reflectors", 500, 1, "Reflector for bounce, fill, and daylight control.", ["Reflector", "Lighting control"], ["reflector", "bounce"], IMG_LIGHTING),
  item("bmr-polecat", "Manfrotto 8ft Polecat", "light-stands", 1000, 1, "8ft polecat for compact mounting and set rigging.", ["8ft polecat", "Manfrotto"], ["polecat", "grip"], IMG_SUPPORT),
  item("bmr-smoke-haze", "Smoke Machine / Haze", "haze-machines", 2500, 1, "Smoke and haze machine for atmosphere, beams, and production effects.", ["Smoke machine", "Haze effect"], ["haze", "smoke"], IMG_LIGHTING),
  item("bmr-10ft-ladder", "10ft Ladder", "production-supplies", 200, 1, "10ft production ladder available with grip and lighting packages.", ["10ft ladder", "Production support"], ["ladder", "production"], IMG_SUPPORT),
  item("bmr-apple-box-set", "Apple Box Set Full Half Quarter", "apple-boxes", 500, 5, "Apple box sets for grip, blocking, and production support.", ["Full apple box", "Half apple box", "Quarter apple box"], ["apple box", "grip"], IMG_SUPPORT),
  item("bmr-sandbag", "Sandbag", "sandbags", 250, 10, "Sandbags for safe stand, rigging, and overhead setups.", ["10x sandbags", "Grip safety"], ["sandbag", "grip"], IMG_SUPPORT),
  item("bmr-extensions", "Extension Cables", "extension-cables", 1500, 15, "Extension cable set for lighting and production power needs.", ["15x extensions", "Electrical support"], ["extension", "power"], IMG_SUPPORT),
  item("bmr-breakout-box", "Triple D-Tap Breakout Box", "breakout-boxes", 0, 1, "Triple D-tap breakout power accessory available with Ronin and camera support packages.", ["Triple D-tap breakout", "Camera power accessory"], ["d-tap", "power"], IMG_SUPPORT),
  item("bmr-vmount-batteries", "V-Mount Battery Set", "battery-systems", 0, 7, "V-mount and TB50 battery support available with camera, gimbal, and monitoring packages.", ["V-mount batteries", "TB50 batteries", "Chargers"], ["battery", "v-mount"], IMG_SUPPORT),
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
