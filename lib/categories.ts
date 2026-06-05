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
      { name: "Action Cameras" },
      { name: "Specialty Cameras" },
    ],
  },
  {
    name: "Lenses",
    children: [
      { name: "Prime Lenses", children: [{ name: "Full Frame Prime" }] },
      { name: "Filters", children: [{ name: "ND Filters" }] },
      { name: "Lens Accessories", children: [{ name: "Follow Focus" }] },
    ],
  },
  {
    name: "Camera Support",
    children: [
      { name: "Tripods", children: [{ name: "Fluid Heads" }] },
      { name: "Gimbals" },
      { name: "Camera Assist Kits" },
    ],
  },
  {
    name: "Lighting",
    children: [
      { name: "LED Lights", children: [{ name: "COB Lights" }, { name: "RGB Lights" }, { name: "Light Mats" }] },
      { name: "Tube Lights" },
      { name: "Lighting Control", children: [{ name: "Flags" }, { name: "Overheads" }, { name: "Reflectors" }] },
      { name: "Lighting Accessories", children: [{ name: "Softboxes" }, { name: "Lanterns" }, { name: "Spotlight Attachments" }] },
    ],
  },
  {
    name: "Grip Equipment",
    children: [
      { name: "C-Stands" },
      { name: "Roller Stands" },
      { name: "Light Stands" },
      { name: "Clamps" },
      { name: "Apple Boxes" },
      { name: "Sandbags" },
    ],
  },
  {
    name: "Audio",
    children: [
      { name: "Wireless Systems" },
      { name: "Speakers" },
    ],
  },
  {
    name: "Monitoring & Video",
    children: [
      { name: "Director Monitors" },
      { name: "Wireless Video" },
      { name: "Recorders" },
    ],
  },
  {
    name: "Power & Electrical",
    children: [
      { name: "Breakout Boxes" },
      { name: "Extension Cables" },
      { name: "Battery Systems" },
    ],
  },
  {
    name: "Drones & Aerial",
    children: [
      { name: "Cinema Drones" },
      { name: "Drone Operators" },
    ],
  },
  {
    name: "Studio & Production",
    children: [
      { name: "Haze Machines" },
      { name: "Production Supplies" },
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
