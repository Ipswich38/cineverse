import { BadgeCheck, Box, Headphones, PackageCheck, RefreshCcw, ShieldCheck, Sparkles, Truck } from 'lucide-react'
import type { CartItem } from '@/lib/cart-store'
import type { Product } from '@/lib/supabase'

export const STORE = {
  name: 'Waevpoint Online Store',
  shortName: 'Waevpoint',
  tagline: 'Drone gear, aerial imaging tools, and field-ready accessories.',
  email: 'store@waevpoint.quest',
  location: 'Manila, Philippines',
  freeShippingThreshold: 5000,
}

export const FEATURED_CATEGORIES = ['Drones', 'Accessories', 'Power', 'Field Kits']

export const TRUST_POINTS = [
  { icon: Truck, label: 'Free Shipping', sub: 'Metro Manila over ₱5,000' },
  { icon: ShieldCheck, label: 'Secure Checkout', sub: 'PayMongo-ready payments' },
  { icon: RefreshCcw, label: 'Field Support', sub: 'Pre-flight checks and setup guidance' },
  { icon: Headphones, label: 'Local Service', sub: 'Support for pilots, creators, and teams' },
]

export const PRODUCT_HIGHLIGHTS = [
  { icon: Sparkles, label: 'Mission-ready', value: 'Creator and survey kits' },
  { icon: BadgeCheck, label: 'Checked before dispatch', value: 'Packed from Manila' },
  { icon: Truck, label: 'Fast fulfillment', value: 'For paid orders by 2 PM' },
]

export const DELIVERY_OPTIONS = [
  { id: 'standard', label: 'Standard Delivery', description: 'Metro Manila 2-4 days, provincial 4-7 days', fee: 120 },
  { id: 'express', label: 'Express Delivery', description: 'Metro Manila next-day dispatch priority', fee: 220 },
] as const

export const PAYMENT_METHODS = [
  { id: 'paymongo_all', label: 'PayMongo Checkout', description: 'Choose GCash, Maya, card, or enabled methods on PayMongo.' },
  { id: 'gcash', label: 'GCash preferred', description: 'Redirects to PayMongo with GCash as the expected buyer choice.' },
  { id: 'card', label: 'Card preferred', description: 'Redirects to PayMongo secure card checkout.' },
] as const

export const FULFILLMENT_FLOW = [
  { key: 'paid', label: 'Paid', description: 'Payment confirmed by PayMongo webhook.' },
  { key: 'to_pack', label: 'To Pack', description: 'Inventory is reserved and the order is queued for picking.' },
  { key: 'ready_to_ship', label: 'Ready to Ship', description: 'Packed parcel awaits courier pickup.' },
  { key: 'picked_up', label: 'Picked Up', description: 'Courier has collected the parcel.' },
  { key: 'shipped', label: 'Shipped', description: 'Shipment is in transit with tracking.' },
  { key: 'delivered', label: 'Delivered', description: 'Order is completed after confirmed delivery.' },
]

export const DEMO_PRODUCTS: Product[] = [
  {
    id: 'drone-mini-4k',
    name: 'AeroMini 4K Drone Fly More Kit',
    slug: 'aeromini-4k-drone-fly-more-kit',
    description: 'Compact 4K camera drone bundle with three batteries, charging hub, prop guards, and a travel case for creators and first-time pilots.',
    price: 38990,
    compare_at_price: 42990,
    image_url: 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=900&q=80',
    stock: 8,
    category: 'Drones',
    tags: ['drone', '4k', 'creator', 'fly-more', 'beginner'],
    badge: 'Best seller',
    is_active: true,
    created_at: '2026-05-01T00:00:00.000Z',
  },
  {
    id: 'propeller-guard-set',
    name: 'Quick-Snap Propeller Guard Set',
    slug: 'quick-snap-propeller-guard-set',
    description: 'Lightweight guard set for safer indoor training, tight spaces, and beginner flight sessions.',
    price: 1490,
    compare_at_price: 1790,
    image_url: 'https://images.unsplash.com/photo-1527977966376-1c8408f9f108?w=900&q=80',
    stock: 32,
    category: 'Accessories',
    tags: ['propeller', 'guard', 'training', 'safety', 'add-on'],
    badge: 'Bundle add-on',
    is_active: true,
    created_at: '2026-05-02T00:00:00.000Z',
  },
  {
    id: 'cinema-gimbal-drone',
    name: 'SkyFrame Pro Gimbal Drone',
    slug: 'skyframe-pro-gimbal-drone',
    description: 'Stabilized aerial imaging platform with a 3-axis gimbal, intelligent tracking, and long-range transmission for commercial shoots.',
    price: 84990,
    compare_at_price: 92990,
    image_url: 'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=900&q=80',
    stock: 4,
    category: 'Drones',
    tags: ['drone', 'gimbal', 'pro', 'cinema', 'commercial'],
    badge: 'Premium',
    is_active: true,
    created_at: '2026-05-03T00:00:00.000Z',
  },
  {
    id: 'intelligent-flight-battery',
    name: 'Intelligent Flight Battery',
    slug: 'intelligent-flight-battery',
    description: 'High-density spare battery with smart power management, cycle tracking, and field-safe protection.',
    price: 5490,
    compare_at_price: 6290,
    image_url: 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=900&q=80',
    stock: 6,
    category: 'Power',
    tags: ['battery', 'power', 'drone', 'field', 'spare'],
    badge: 'Low stock',
    is_active: true,
    created_at: '2026-05-04T00:00:00.000Z',
  },
  {
    id: 'nd-filter-pack',
    name: 'ND Filter Pack for Aerial Video',
    slug: 'nd-filter-pack-for-aerial-video',
    description: 'ND8, ND16, ND32, and ND64 filter pack for smoother shutter control in bright outdoor flight conditions.',
    price: 2490,
    compare_at_price: 2990,
    image_url: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=900&q=80',
    stock: 18,
    category: 'Accessories',
    tags: ['filter', 'video', 'camera', 'cinema', 'add-on'],
    badge: 'New',
    is_active: true,
    created_at: '2026-05-05T00:00:00.000Z',
  },
  {
    id: 'field-backpack',
    name: 'Drone Field Backpack',
    slug: 'drone-field-backpack',
    description: 'Weather-resistant backpack with padded drone bay, battery slots, controller pocket, and laptop sleeve.',
    price: 6990,
    compare_at_price: 7990,
    image_url: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=900&q=80',
    stock: 9,
    category: 'Field Kits',
    tags: ['backpack', 'field', 'travel', 'drone', 'kit'],
    badge: 'Field kit',
    is_active: true,
    created_at: '2026-05-06T00:00:00.000Z',
  },
  {
    id: 'landing-pad-pro',
    name: 'Foldable Landing Pad Pro',
    slug: 'foldable-landing-pad-pro',
    description: 'High-visibility, foldable landing pad for clean takeoff and landing on grass, sand, rooftops, and rough terrain.',
    price: 1290,
    compare_at_price: null,
    image_url: 'https://images.unsplash.com/photo-1524143986875-3b098d78b363?w=900&q=80',
    stock: 31,
    category: 'Field Kits',
    tags: ['landing-pad', 'field', 'safety', 'add-on'],
    badge: 'Add-on',
    is_active: true,
    created_at: '2026-05-07T00:00:00.000Z',
  },
  {
    id: 'fast-charging-hub',
    name: 'Triple Battery Fast Charging Hub',
    slug: 'triple-battery-fast-charging-hub',
    description: 'Sequential fast charging hub for three drone batteries with field-friendly status indicators.',
    price: 3990,
    compare_at_price: 4490,
    image_url: 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=900&q=80',
    stock: 22,
    category: 'Power',
    tags: ['charger', 'battery', 'power', 'field', 'add-on'],
    badge: 'Checkout add-on',
    is_active: true,
    created_at: '2026-05-08T00:00:00.000Z',
  },
  {
    id: 'survey-marker-kit',
    name: 'Aerial Survey Marker Kit',
    slug: 'aerial-survey-marker-kit',
    description: 'Reusable high-contrast ground markers for mapping, inspection, construction progress, and survey workflows.',
    price: 3290,
    compare_at_price: null,
    image_url: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=900&q=80',
    stock: 16,
    category: 'Field Kits',
    tags: ['survey', 'mapping', 'field', 'inspection'],
    badge: 'Mapping kit',
    is_active: true,
    created_at: '2026-05-09T00:00:00.000Z',
  },
  {
    id: 'controller-sun-hood',
    name: 'Controller Sun Hood',
    slug: 'controller-sun-hood',
    description: 'Collapsible anti-glare hood for remote controllers and mobile screens during daylight flight.',
    price: 990,
    compare_at_price: 1290,
    image_url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=900&q=80',
    stock: 19,
    category: 'Accessories',
    tags: ['controller', 'sun-hood', 'screen', 'field', 'add-on'],
    badge: 'Frequently bought',
    is_active: true,
    created_at: '2026-05-10T00:00:00.000Z',
  },
  {
    id: 'propeller-pair',
    name: 'Low-Noise Propeller Pair',
    slug: 'low-noise-propeller-pair',
    description: 'Balanced replacement propellers engineered for quieter flights and efficient lift.',
    price: 790,
    compare_at_price: null,
    image_url: 'https://images.unsplash.com/photo-1527977966376-1c8408f9f108?w=900&q=80',
    stock: 40,
    category: 'Accessories',
    tags: ['propeller', 'replacement', 'drone', 'add-on'],
    badge: 'Add-on',
    is_active: true,
    created_at: '2026-05-11T00:00:00.000Z',
  },
  {
    id: 'pilot-checklist-card',
    name: 'Waterproof Pilot Checklist Cards',
    slug: 'waterproof-pilot-checklist-cards',
    description: 'Reusable pre-flight, site survey, battery safety, and post-flight checklist cards for field teams.',
    price: 590,
    compare_at_price: 750,
    image_url: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=900&q=80',
    stock: 28,
    category: 'Field Kits',
    tags: ['checklist', 'field', 'safety', 'pilot', 'add-on'],
    badge: 'Smart add-on',
    is_active: true,
    created_at: '2026-05-12T00:00:00.000Z',
  },
]

export function formatMoney(value: number) {
  return `₱${value.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
}

export function getCategoryCount(products: Product[], category: string) {
  return products.filter((product) => product.category === category).length
}

function tagScore(a: string[] | null | undefined, b: string[] | null | undefined) {
  if (!a?.length || !b?.length) return 0
  const bTags = new Set(b)
  return a.reduce((score, tag) => score + (bTags.has(tag) ? 2 : 0), 0)
}

export function getProductRecommendations(product: Product, products: Product[], limit = 4) {
  return products
    .filter((candidate) => candidate.id !== product.id && candidate.stock > 0)
    .map((candidate) => ({
      product: candidate,
      score:
        (candidate.category === product.category ? 4 : 0) +
        tagScore(product.tags, candidate.tags) +
        (candidate.price <= product.price ? 1 : 0) +
        (candidate.badge?.toLowerCase().includes('add') ? 1 : 0),
    }))
    .sort((a, b) => b.score - a.score || a.product.price - b.product.price)
    .slice(0, limit)
    .map(({ product: candidate }) => candidate)
}

export function getCartRecommendations(items: CartItem[], products: Product[], limit = 3) {
  const itemIds = new Set(items.map((item) => item.id))
  const cartTags = items.flatMap((item) => item.tags ?? [])
  const cartCategories = new Set(items.map((item) => item.category).filter(Boolean))

  return products
    .filter((product) => product.stock > 0 && !itemIds.has(product.id))
    .map((product) => ({
      product,
      score:
        (cartCategories.has(product.category) ? 3 : 0) +
        tagScore(cartTags, product.tags) +
        (product.price < 800 ? 2 : 0) +
        (product.badge?.toLowerCase().includes('add') || product.badge?.toLowerCase().includes('bought') ? 2 : 0),
    }))
    .sort((a, b) => b.score - a.score || a.product.price - b.product.price)
    .slice(0, limit)
    .map(({ product }) => product)
}

export const ORDER_STATUS_STEPS = [
  { icon: ShieldCheck, label: 'Payment', sub: 'PayMongo confirms the transaction.' },
  { icon: PackageCheck, label: 'To Pack', sub: 'Stock is deducted and the order enters fulfillment.' },
  { icon: Box, label: 'Ready', sub: 'Items are packed and tagged for courier pickup.' },
  { icon: Truck, label: 'Transit', sub: 'Courier pickup, shipping, and delivery are tracked.' },
]
