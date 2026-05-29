import { BadgeCheck, CalendarRange, HandCoins, MessageSquare, ShieldCheck, Sparkles, UserCog, Wallet } from 'lucide-react'
import type { CartItem } from '@/lib/cart-store'
import type { Product } from '@/lib/supabase'

export const STORE = {
  name: 'CineVerse',
  shortName: 'CineVerse',
  tagline: 'Rent production gear from owners across the Philippines — camera, lighting, grip, audio, and more.',
  email: 'hello@cineverse.store',
  location: 'Metro Manila, Philippines',
}

export const FEATURED_CATEGORIES = ['Camera', 'Lighting', 'Grip', 'Audio', 'Lenses', 'Drone']

// Reservation deposit shown across the UI. Source of truth is DOWNPAYMENT_PCT in cart-store.
export const DOWNPAYMENT_LABEL = '30%'

export const TRUST_POINTS = [
  { icon: ShieldCheck, label: 'Verified owners', sub: 'Gear from vetted rental partners' },
  { icon: Wallet, label: 'Secure 30% downpayment', sub: 'Reserve via PayMongo — GCash, Maya, card' },
  { icon: UserCog, label: 'Operators on demand', sub: 'Add a trained operator to any kit' },
  { icon: MessageSquare, label: 'Direct coordination', sub: 'Talk to the owner once you reserve' },
]

export const PRODUCT_HIGHLIGHTS = [
  { icon: CalendarRange, label: 'Flexible duration', value: 'Rent by the day, as long as you need' },
  { icon: UserCog, label: 'Operator option', value: 'Hire someone to run the gear' },
  { icon: BadgeCheck, label: 'Reserve with 30%', value: 'Balance settled with the owner' },
]

// How a rental works — shown on the order/invoice page.
export const RENTAL_FLOW = [
  { key: 'reserved', label: 'Reserved', description: '30% downpayment confirmed by PayMongo.' },
  { key: 'notified', label: 'Owner notified', description: 'The gear owner gets your booking and contact details.' },
  { key: 'coordinate', label: 'Coordinate', description: 'You and the owner align on pickup, handover, and the balance.' },
  { key: 'shoot', label: 'Shoot', description: 'Use the gear (and operator, if booked) on your shoot dates.' },
  { key: 'return', label: 'Return', description: 'Hand the gear back at the end of the rental period.' },
]

const PAYMENT_METHODS = [
  { id: 'paymongo_all', label: 'All methods (recommended)', description: 'Pick GCash, Maya, GrabPay, or card on the secure PayMongo page.' },
  { id: 'gcash', label: 'GCash', description: 'Go straight to GCash e-wallet payment.' },
  { id: 'maya', label: 'Maya', description: 'Go straight to Maya (PayMaya) e-wallet payment.' },
  { id: 'grab_pay', label: 'GrabPay', description: 'Go straight to GrabPay e-wallet payment.' },
  { id: 'card', label: 'Credit / Debit Card', description: 'Pay with Visa or Mastercard on PayMongo secure checkout.' },
] as const

export { PAYMENT_METHODS }

// Demo catalog: production gear from several independent owners (ReelKit holds no inventory).
export const DEMO_PRODUCTS: Product[] = [
  {
    id: 'sony-fx6-cinema',
    name: 'Sony FX6 Cinema Camera Kit',
    slug: 'sony-fx6-cinema-camera-kit',
    description: 'Full-frame 4K cinema camera with dual base ISO, fast hybrid AF, and a cage + V-mount kit. Body, batteries, media, and rig included. Ideal for commercials, docu, and narrative.',
    price: 4500,
    image_url: 'https://images.unsplash.com/photo-1521405924368-64c5b84bec60?w=900&q=80',
    stock: 3,
    category: 'Camera',
    tags: ['camera', 'cinema', '4k', 'sony', 'fullframe'],
    badge: 'Most booked',
    is_active: true,
    owner_name: 'Cinegear Manila',
    owner_email: 'rentals@cinegearmanila.ph',
    owner_phone: '09171234567',
    operator_available: true,
    operator_day_rate: 3500,
    created_at: '2026-05-01T00:00:00.000Z',
  },
  {
    id: 'red-komodo-6k',
    name: 'RED Komodo 6K Camera Kit',
    slug: 'red-komodo-6k-camera-kit',
    description: 'Compact 6K global-shutter cinema camera with REDCODE RAW, RF mount, and a complete shooting kit. Built for gimbal, drone, and tight-space cinematography.',
    price: 6000,
    image_url: 'https://images.unsplash.com/photo-1520870121499-7dddb6ccbcde?w=900&q=80',
    stock: 2,
    category: 'Camera',
    tags: ['camera', 'cinema', '6k', 'red', 'raw'],
    badge: 'Premium',
    is_active: true,
    owner_name: 'Cinegear Manila',
    owner_email: 'rentals@cinegearmanila.ph',
    owner_phone: '09171234567',
    operator_available: true,
    operator_day_rate: 4000,
    created_at: '2026-05-02T00:00:00.000Z',
  },
  {
    id: 'cn-e-prime-set',
    name: 'Canon CN-E Prime Lens Set',
    slug: 'canon-cn-e-prime-lens-set',
    description: 'Five-lens cinema prime set (24, 35, 50, 85, 135mm) with consistent T-stops, manual focus, and matched color. EF mount with PL adapter available.',
    price: 3000,
    image_url: 'https://images.unsplash.com/photo-1772144919581-bf9378bda1e0?w=900&q=80',
    stock: 2,
    category: 'Lenses',
    tags: ['lens', 'prime', 'cinema', 'canon', 'set'],
    badge: 'Glass',
    is_active: true,
    owner_name: 'Cinegear Manila',
    owner_email: 'rentals@cinegearmanila.ph',
    owner_phone: '09171234567',
    operator_available: false,
    operator_day_rate: null,
    created_at: '2026-05-03T00:00:00.000Z',
  },
  {
    id: 'ronin-4d',
    name: 'DJI Ronin 4D Gimbal Camera',
    slug: 'dji-ronin-4d-gimbal-camera',
    description: '4-axis stabilized cinema system with LiDAR focus, full-frame sensor, and wireless video. Smooth movement without a separate gimbal operator rig.',
    price: 3500,
    image_url: 'https://images.unsplash.com/photo-1744306423919-830b9f4b11e8?w=900&q=80',
    stock: 2,
    category: 'Grip',
    tags: ['gimbal', 'movement', 'stabilizer', 'dji', 'camera'],
    badge: 'Movement',
    is_active: true,
    owner_name: 'AeroFrame Studio',
    owner_email: 'book@aeroframe.ph',
    owner_phone: '09181234567',
    operator_available: true,
    operator_day_rate: 3000,
    created_at: '2026-05-04T00:00:00.000Z',
  },
  {
    id: 'aputure-600x',
    name: 'Aputure LS 600x Pro LED',
    slug: 'aputure-ls-600x-pro-led',
    description: 'Bi-color 600W point-source LED with Bowens mount, weather resistance, and a softbox + stand kit. Daylight-to-tungsten output for interiors and night exteriors.',
    price: 1800,
    image_url: 'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=900&q=80',
    stock: 4,
    category: 'Lighting',
    tags: ['light', 'led', 'aputure', 'bicolor', 'key'],
    badge: 'Best seller',
    is_active: true,
    owner_name: 'Liwanag Lights',
    owner_email: 'hello@liwanaglights.ph',
    owner_phone: '09191234567',
    operator_available: true,
    operator_day_rate: 2500,
    created_at: '2026-05-05T00:00:00.000Z',
  },
  {
    id: 'astera-titan-kit',
    name: 'Astera Titan Tube Kit (8)',
    slug: 'astera-titan-tube-kit-8',
    description: 'Eight wireless RGB+mint LED tubes with case, charger, and CRMX control. Pixel effects, gels, and practicals for music videos and stylized scenes.',
    price: 2200,
    image_url: 'https://images.unsplash.com/photo-1529611934128-376c7bb1c88a?w=900&q=80',
    stock: 3,
    category: 'Lighting',
    tags: ['light', 'rgb', 'tube', 'astera', 'wireless'],
    badge: 'Color',
    is_active: true,
    owner_name: 'Liwanag Lights',
    owner_email: 'hello@liwanaglights.ph',
    owner_phone: '09191234567',
    operator_available: false,
    operator_day_rate: null,
    created_at: '2026-05-06T00:00:00.000Z',
  },
  {
    id: 'cstand-combo-set',
    name: 'Matthews C-Stand Combo Set (6)',
    slug: 'matthews-c-stand-combo-set-6',
    description: 'Six heavy-duty C-stands with grip heads, arms, and sandbags. The backbone of any lighting and grip setup.',
    price: 900,
    image_url: 'https://images.unsplash.com/photo-1509762774605-f07235a08f1f?w=900&q=80',
    stock: 5,
    category: 'Grip',
    tags: ['grip', 'cstand', 'support', 'rigging', 'set'],
    badge: 'Essential',
    is_active: true,
    owner_name: 'GripHaus PH',
    owner_email: 'rent@griphaus.ph',
    owner_phone: '09201234567',
    operator_available: false,
    operator_day_rate: null,
    created_at: '2026-05-07T00:00:00.000Z',
  },
  {
    id: 'tripod-fluid-head',
    name: 'Heavy Tripod + Fluid Head',
    slug: 'heavy-tripod-fluid-head',
    description: '100mm bowl tripod with a pro fluid head rated for cinema payloads. Smooth pans and tilts for interview and narrative setups.',
    price: 700,
    image_url: 'https://images.unsplash.com/photo-1527977966376-1c8408f9f108?w=900&q=80',
    stock: 6,
    category: 'Grip',
    tags: ['grip', 'tripod', 'support', 'fluidhead', 'add-on'],
    badge: 'Add-on',
    is_active: true,
    owner_name: 'GripHaus PH',
    owner_email: 'rent@griphaus.ph',
    owner_phone: '09201234567',
    operator_available: false,
    operator_day_rate: null,
    created_at: '2026-05-08T00:00:00.000Z',
  },
  {
    id: 'mkh-416-boom-kit',
    name: 'Sennheiser MKH-416 Boom Kit',
    slug: 'sennheiser-mkh-416-boom-kit',
    description: 'Industry-standard shotgun mic with boom pole, blimp, windshield, and cables. The on-set dialogue workhorse.',
    price: 1200,
    image_url: 'https://images.unsplash.com/photo-1541617434114-48c3a51d0ab2?w=900&q=80',
    stock: 3,
    category: 'Audio',
    tags: ['audio', 'boom', 'shotgun', 'sennheiser', 'dialogue'],
    badge: 'Sound',
    is_active: true,
    owner_name: 'SoundMNL',
    owner_email: 'book@soundmnl.ph',
    owner_phone: '09211234567',
    operator_available: true,
    operator_day_rate: 3000,
    created_at: '2026-05-09T00:00:00.000Z',
  },
  {
    id: 'zoom-f8n-pro',
    name: 'Zoom F8n Pro Recorder + Lavs',
    slug: 'zoom-f8n-pro-recorder-lavs',
    description: '8-channel field recorder with timecode plus three wireless lav sets. Multitrack production sound for interviews and run-and-gun.',
    price: 1500,
    image_url: 'https://images.unsplash.com/photo-1764266022094-57cd1379c07c?w=900&q=80',
    stock: 2,
    category: 'Audio',
    tags: ['audio', 'recorder', 'lav', 'wireless', 'multitrack'],
    badge: 'Add-on',
    is_active: true,
    owner_name: 'SoundMNL',
    owner_email: 'book@soundmnl.ph',
    owner_phone: '09211234567',
    operator_available: false,
    operator_day_rate: null,
    created_at: '2026-05-10T00:00:00.000Z',
  },
  {
    id: 'inspire-3-drone',
    name: 'DJI Inspire 3 Cinema Drone',
    slug: 'dji-inspire-3-cinema-drone',
    description: 'Full-frame 8K aerial cinema platform with dual operator control. Requires a licensed pilot — add one as an operator below.',
    price: 8000,
    image_url: 'https://images.unsplash.com/photo-1507582020474-9a35b7d455d9?w=900&q=80',
    stock: 1,
    category: 'Drone',
    tags: ['drone', 'aerial', '8k', 'dji', 'cinema'],
    badge: 'Pilot required',
    is_active: true,
    owner_name: 'AeroFrame Studio',
    owner_email: 'book@aeroframe.ph',
    owner_phone: '09181234567',
    operator_available: true,
    operator_day_rate: 5000,
    created_at: '2026-05-11T00:00:00.000Z',
  },
  {
    id: 'smallhd-17-monitor',
    name: 'SmallHD 17" Production Monitor',
    slug: 'smallhd-17-production-monitor',
    description: 'Bright 17-inch director/client monitor with SDI/HDMI, scopes, and a stand. Keep the whole team on the same frame.',
    price: 1400,
    image_url: 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=900&q=80',
    stock: 2,
    category: 'Power',
    tags: ['monitor', 'director', 'sdi', 'add-on', 'video-village'],
    badge: 'Add-on',
    is_active: true,
    owner_name: 'PowerGrid Rentals',
    owner_email: 'hi@powergrid.ph',
    owner_phone: '09221234567',
    operator_available: false,
    operator_day_rate: null,
    created_at: '2026-05-12T00:00:00.000Z',
  },
]

export function formatMoney(value: number) {
  return `₱${value.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
}

export function formatDayRate(value: number) {
  return `${formatMoney(value)}/day`
}

export function getCategoryCount(products: Product[], category: string) {
  return products.filter((product) => product.category === category).length
}

function tagScore(a: string[] | null | undefined, b: string[] | null | undefined) {
  if (!a?.length || !b?.length) return 0
  const bTags = new Set(b)
  return a.reduce((score, tag) => score + (bTags.has(tag) ? 2 : 0), 0)
}

// Smart pairings for a shoot: complementary gear gets a boost (camera → lens/light/grip/audio).
const COMPLEMENTS: Record<string, string[]> = {
  Camera: ['Lenses', 'Lighting', 'Grip', 'Audio', 'Power'],
  Lenses: ['Camera', 'Grip'],
  Lighting: ['Grip', 'Power'],
  Grip: ['Camera', 'Lighting'],
  Audio: ['Camera'],
  Drone: ['Power', 'Audio'],
  Power: ['Lighting', 'Camera'],
}

function complementScore(base: string | undefined, candidate: string | undefined) {
  if (!base || !candidate) return 0
  return COMPLEMENTS[base]?.includes(candidate) ? 4 : 0
}

export function getProductRecommendations(product: Product, products: Product[], limit = 4) {
  return products
    .filter((candidate) => candidate.id !== product.id && candidate.stock > 0)
    .map((candidate) => ({
      candidate,
      score:
        complementScore(product.category, candidate.category) +
        tagScore(product.tags, candidate.tags) +
        (candidate.badge?.toLowerCase().includes('add') ? 2 : 0),
    }))
    .sort((a, b) => b.score - a.score || a.candidate.price - b.candidate.price)
    .slice(0, limit)
    .map(({ candidate }) => candidate)
}

export function getCartRecommendations(items: CartItem[], products: Product[], limit = 3) {
  const itemIds = new Set(items.map((item) => item.id))
  const cartTags = items.flatMap((item) => item.tags ?? [])
  const cartCategories = items.map((item) => item.category)

  return products
    .filter((product) => product.stock > 0 && !itemIds.has(product.id))
    .map((product) => ({
      product,
      score:
        cartCategories.reduce((s, c) => s + complementScore(c, product.category), 0) +
        tagScore(cartTags, product.tags) +
        (product.badge?.toLowerCase().includes('add') ? 2 : 0),
    }))
    .sort((a, b) => b.score - a.score || a.product.price - b.product.price)
    .slice(0, limit)
    .map(({ product }) => product)
}

export const ORDER_STATUS_STEPS = [
  { icon: HandCoins, label: 'Downpayment', sub: 'PayMongo confirms your 30% reservation.' },
  { icon: MessageSquare, label: 'Owner notified', sub: 'The owner receives your booking and contacts.' },
  { icon: CalendarRange, label: 'Coordinate', sub: 'Agree on pickup, handover, and the balance.' },
  { icon: Sparkles, label: 'Shoot', sub: 'Use the gear and operator on your dates.' },
]
