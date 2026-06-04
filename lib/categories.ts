import { slugify } from "./catalog";

// ── The equipment taxonomy ──────────────────────────────────────────────────
// Single source of truth for the category tree. Drives the navbar mega-menu, the
// admin category picker, and storefront filtering. Edit the tree here; everything
// else (slugs, lookups, descendants) is derived.

export type CategoryNode = { name: string; children?: CategoryNode[] };

export const CATEGORY_TREE: CategoryNode[] = [
  {
    name: "Cameras",
    children: [
      { name: "Cinema Cameras" },
      { name: "Broadcast Cameras" },
      { name: "Mirrorless Cameras" },
      { name: "DSLR Cameras" },
      { name: "Action Cameras" },
      { name: "Specialty Cameras" },
      {
        name: "Camera Accessories",
        children: [
          { name: "Camera Cages" },
          { name: "Camera Rigs" },
          { name: "Viewfinders" },
          { name: "Media Cards" },
          { name: "Batteries" },
          { name: "Chargers" },
          { name: "Camera Monitors" },
        ],
      },
    ],
  },
  {
    name: "Lenses",
    children: [
      { name: "Prime Lenses", children: [{ name: "Full Frame Prime" }, { name: "Super 35 Prime" }, { name: "Vintage Prime" }] },
      { name: "Zoom Lenses", children: [{ name: "Standard Zoom" }, { name: "Wide Zoom" }, { name: "Telephoto Zoom" }] },
      { name: "Anamorphic Lenses", children: [{ name: "Anamorphic Prime" }, { name: "Anamorphic Zoom" }] },
      { name: "Specialty Lenses", children: [{ name: "Macro" }, { name: "Probe" }, { name: "Tilt Shift" }, { name: "Fisheye" }, { name: "Telephoto" }] },
      { name: "Lens Accessories", children: [{ name: "Lens Adapters" }, { name: "Matte Boxes" }, { name: "Follow Focus" }, { name: "Lens Support" }] },
      { name: "Filters", children: [{ name: "ND Filters" }, { name: "Variable ND" }, { name: "Polarizers" }, { name: "Diffusion Filters" }, { name: "Effects Filters" }] },
    ],
  },
  {
    name: "Camera Support",
    children: [
      { name: "Tripods", children: [{ name: "Fluid Heads" }, { name: "Carbon Fiber" }, { name: "Heavy Duty" }] },
      { name: "Sliders" },
      { name: "Dollies" },
      { name: "Tracks" },
      { name: "Jibs" },
      { name: "Cranes" },
      { name: "Gimbals" },
      { name: "Steadicam" },
      { name: "Easyrig" },
      { name: "Remote Heads" },
      { name: "Car Mounts" },
      { name: "Suction Mounts" },
      { name: "Underwater Housings" },
    ],
  },
  {
    name: "Lighting",
    children: [
      { name: "LED Lights", children: [{ name: "Panels" }, { name: "COB Lights" }, { name: "Fresnels" }, { name: "RGB Lights" }] },
      { name: "HMI Lights" },
      { name: "Tungsten Lights" },
      { name: "Fluorescent Lights" },
      { name: "Tube Lights" },
      { name: "Practical Lights" },
      { name: "Lighting Control", children: [{ name: "DMX Controllers" }, { name: "Dimmers" }, { name: "Wireless Control" }] },
      { name: "Lighting Accessories", children: [{ name: "Softboxes" }, { name: "Lanterns" }, { name: "Grids" }, { name: "Reflectors" }, { name: "Diffusion" }] },
    ],
  },
  {
    name: "Grip Equipment",
    children: [
      { name: "C-Stands" },
      { name: "Combo Stands" },
      { name: "Roller Stands" },
      { name: "Boom Arms" },
      { name: "Clamps" },
      { name: "Flags" },
      { name: "Nets" },
      { name: "Scrims" },
      { name: "Frames" },
      { name: "Overheads" },
      { name: "Apple Boxes" },
      { name: "Sandbags" },
      { name: "Backdrop Systems" },
    ],
  },
  {
    name: "Audio",
    children: [
      { name: "Shotgun Microphones" },
      { name: "Lavalier Microphones" },
      { name: "Wireless Systems" },
      { name: "Boom Poles" },
      { name: "Field Recorders" },
      { name: "Audio Mixers" },
      { name: "Headphones" },
      { name: "Timecode Systems" },
      { name: "Audio Accessories" },
    ],
  },
  {
    name: "Monitoring & Video",
    children: [
      { name: "Director Monitors" },
      { name: "On-Camera Monitors" },
      { name: "Wireless Video" },
      { name: "Video Assist" },
      { name: "SDI Equipment" },
      { name: "HDMI Equipment" },
      { name: "Video Converters" },
      { name: "Recorders" },
    ],
  },
  {
    name: "Power & Electrical",
    children: [
      { name: "Generators" },
      { name: "Generator Trucks" },
      { name: "Power Stations" },
      { name: "Distribution Boxes" },
      { name: "Breakout Boxes" },
      { name: "Extension Cables" },
      { name: "Feeder Cables" },
      { name: "Battery Systems" },
      { name: "Chargers" },
    ],
  },
  {
    name: "Drones & Aerial",
    children: [
      { name: "Cinema Drones" },
      { name: "FPV Drones" },
      { name: "Drone Cameras" },
      { name: "Drone Batteries" },
      { name: "Drone Accessories" },
      { name: "Aerial Monitoring" },
    ],
  },
  {
    name: "Studio & Production",
    children: [
      { name: "Green Screens" },
      { name: "Backdrops" },
      { name: "Teleprompters" },
      { name: "Fog Machines" },
      { name: "Haze Machines" },
      { name: "Production Monitors" },
      { name: "Walkie Talkies" },
      { name: "Data Management" },
      { name: "DIT Equipment" },
      { name: "Production Supplies" },
    ],
  },
  {
    name: "Packages",
    children: [
      { name: "Camera Packages" },
      { name: "Lighting Packages" },
      { name: "Audio Packages" },
      { name: "Interview Kits" },
      { name: "Podcast Kits" },
      { name: "Documentary Kits" },
      { name: "Event Coverage Kits" },
      { name: "Commercial Production Kits" },
      { name: "Music Video Kits" },
      { name: "Full Production Packages" },
    ],
  },
];

// ── Derived structures ──────────────────────────────────────────────────────

export type SluggedCategory = {
  slug: string;
  name: string;
  depth: number;
  parent: string | null;
  path: string[]; // ancestor names → this name
  children: SluggedCategory[];
};

const usedSlugs = new Set<string>();
function uniqueSlug(name: string, parentSlug: string | null): string {
  let s = slugify(name);
  if (usedSlugs.has(s) && parentSlug) s = `${parentSlug}-${slugify(name)}`;
  let base = s;
  let i = 2;
  while (usedSlugs.has(s)) s = `${base}-${i++}`;
  usedSlugs.add(s);
  return s;
}

function build(nodes: CategoryNode[], depth: number, parent: SluggedCategory | null): SluggedCategory[] {
  return nodes.map((n) => {
    const slug = uniqueSlug(n.name, parent?.slug ?? null);
    const self: SluggedCategory = {
      slug,
      name: n.name,
      depth,
      parent: parent?.slug ?? null,
      path: [...(parent?.path ?? []), n.name],
      children: [],
    };
    self.children = n.children ? build(n.children, depth + 1, self) : [];
    return self;
  });
}

/** The full taxonomy with stable slugs — top-level nodes (each with children). */
export const CATEGORIES: SluggedCategory[] = build(CATEGORY_TREE, 0, null);

/** Every node, keyed by slug. */
export const CATEGORY_BY_SLUG: Map<string, SluggedCategory> = (() => {
  const m = new Map<string, SluggedCategory>();
  const walk = (nodes: SluggedCategory[]) => nodes.forEach((n) => { m.set(n.slug, n); walk(n.children); });
  walk(CATEGORIES);
  return m;
})();

/** Flat list in tree order (for grouped pickers); label is the full path. */
export const CATEGORY_FLAT: { slug: string; name: string; depth: number; label: string }[] = (() => {
  const out: { slug: string; name: string; depth: number; label: string }[] = [];
  const walk = (nodes: SluggedCategory[]) =>
    nodes.forEach((n) => { out.push({ slug: n.slug, name: n.name, depth: n.depth, label: n.path.join(" › ") }); walk(n.children); });
  walk(CATEGORIES);
  return out;
})();

/** A slug plus every descendant slug — for "show this category and everything under it". */
export function descendantSlugs(slug: string): Set<string> {
  const set = new Set<string>();
  const node = CATEGORY_BY_SLUG.get(slug);
  if (!node) return set;
  const walk = (n: SluggedCategory) => { set.add(n.slug); n.children.forEach(walk); };
  walk(node);
  return set;
}

/** Display name for a slug (falls back to the raw value if unknown/legacy). */
export function categoryName(slug: string): string {
  return CATEGORY_BY_SLUG.get(slug)?.name ?? slug;
}

// Legacy seed items used capitalized names ("Camera", "Sound", …); map them onto the
// new slugs so the demo catalog still filters until items are recategorized in admin.
const LEGACY_ALIASES: Record<string, string> = {
  camera: "cameras",
  cameras: "cameras",
  lenses: "lenses",
  lighting: "lighting",
  sound: "audio",
  audio: "audio",
  grip: "grip-equipment",
  support: "camera-support",
  production: "studio-production",
  post: "studio-production",
};

/** Normalize whatever is stored on an item (slug or legacy name) to a known slug. */
export function normalizeCategory(value: string | undefined | null): string {
  if (!value) return "";
  if (CATEGORY_BY_SLUG.has(value)) return value;
  const s = slugify(value);
  if (CATEGORY_BY_SLUG.has(s)) return s;
  return LEGACY_ALIASES[s] ?? s;
}
