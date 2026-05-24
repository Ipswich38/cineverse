import { BadgeCheck, Box, Headphones, PackageCheck, RefreshCcw, ShieldCheck, Sparkles, Truck } from 'lucide-react'
import type { CartItem } from '@/lib/cart-store'
import type { Product } from '@/lib/supabase'

export const STORE = {
  name: 'Luma & Co.',
  shortName: 'Luma',
  tagline: 'Modern essentials for everyday living.',
  email: 'hello@lumaandco.ph',
  location: 'Manila, Philippines',
  freeShippingThreshold: 1500,
}

export const FEATURED_CATEGORIES = ['Apparel', 'Accessories', 'Home', 'Travel']

export const TRUST_POINTS = [
  { icon: Truck, label: 'Free Shipping', sub: 'Metro Manila over ₱1,500' },
  { icon: ShieldCheck, label: 'Secure Checkout', sub: 'PayMongo sandbox ready' },
  { icon: RefreshCcw, label: 'Easy Returns', sub: '7-day exchange window' },
  { icon: Headphones, label: 'Local Support', sub: 'Fast help before and after purchase' },
]

export const PRODUCT_HIGHLIGHTS = [
  { icon: Sparkles, label: 'Curated drops', value: 'New weekly edits' },
  { icon: BadgeCheck, label: 'Quality checked', value: 'Packed from Manila' },
  { icon: Truck, label: 'Same-day dispatch', value: 'For paid orders by 2 PM' },
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
    id: 'demo-tee',
    name: 'Everyday Oxford Shirt',
    slug: 'everyday-oxford-shirt',
    description: 'A crisp cotton oxford with a relaxed fit, clean collar, and breathable weave for daily office-to-weekend wear.',
    price: 1290,
    compare_at_price: 1490,
    image_url: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=900&q=80',
    stock: 18,
    category: 'Apparel',
    tags: ['workwear', 'cotton', 'shirt', 'smart-casual'],
    badge: 'Best seller',
    is_active: true,
    created_at: '2026-05-01T00:00:00.000Z',
  },
  {
    id: 'demo-tote',
    name: 'Structured Canvas Tote',
    slug: 'structured-canvas-tote',
    description: 'Heavyweight canvas tote with reinforced handles, inner pocket, and enough room for a laptop and daily carry.',
    price: 890,
    compare_at_price: 1090,
    image_url: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=900&q=80',
    stock: 24,
    category: 'Accessories',
    tags: ['bag', 'canvas', 'commute', 'workwear'],
    badge: 'Bundle pick',
    is_active: true,
    created_at: '2026-05-02T00:00:00.000Z',
  },
  {
    id: 'demo-lamp',
    name: 'Dawn Table Lamp',
    slug: 'dawn-table-lamp',
    description: 'Warm ceramic table lamp with a linen shade, built for bedrooms, studios, and calm evening routines.',
    price: 2490,
    compare_at_price: 2890,
    image_url: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=900&q=80',
    stock: 7,
    category: 'Home',
    tags: ['home', 'lighting', 'studio', 'gift'],
    badge: 'Premium',
    is_active: true,
    created_at: '2026-05-03T00:00:00.000Z',
  },
  {
    id: 'demo-bottle',
    name: 'Insulated Travel Bottle',
    slug: 'insulated-travel-bottle',
    description: 'Double-wall stainless bottle that keeps drinks cold through commutes, workouts, and long errands.',
    price: 690,
    compare_at_price: 790,
    image_url: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=900&q=80',
    stock: 4,
    category: 'Travel',
    tags: ['bottle', 'travel', 'commute', 'fitness'],
    badge: 'Low stock',
    is_active: true,
    created_at: '2026-05-04T00:00:00.000Z',
  },
  {
    id: 'demo-lounge',
    name: 'Ribbed Lounge Set',
    slug: 'ribbed-lounge-set',
    description: 'Soft ribbed coordinates with an easy silhouette for work-from-home days and weekend errands.',
    price: 1590,
    compare_at_price: 1890,
    image_url: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=900&q=80',
    stock: 12,
    category: 'Apparel',
    tags: ['loungewear', 'set', 'weekend', 'comfort'],
    badge: 'New',
    is_active: true,
    created_at: '2026-05-05T00:00:00.000Z',
  },
  {
    id: 'demo-duffle',
    name: 'Weekend Duffle Bag',
    slug: 'weekend-duffle-bag',
    description: 'Compact travel duffle with a structured base, interior pocketing, and comfortable carry handles.',
    price: 1890,
    compare_at_price: 2290,
    image_url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=900&q=80',
    stock: 9,
    category: 'Travel',
    tags: ['bag', 'travel', 'weekend', 'commute'],
    badge: 'Travel edit',
    is_active: true,
    created_at: '2026-05-06T00:00:00.000Z',
  },
  {
    id: 'demo-organizer',
    name: 'Desk Organizer Tray',
    slug: 'desk-organizer-tray',
    description: 'Powder-coated desk tray for cables, keys, notebooks, and clean daily work surfaces.',
    price: 540,
    compare_at_price: null,
    image_url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=900&q=80',
    stock: 31,
    category: 'Home',
    tags: ['desk', 'organizer', 'workwear', 'home-office'],
    badge: 'Add-on',
    is_active: true,
    created_at: '2026-05-07T00:00:00.000Z',
  },
  {
    id: 'demo-cap',
    name: 'Everyday Cotton Cap',
    slug: 'everyday-cotton-cap',
    description: 'Low-profile cotton cap with an adjustable back strap and softly structured brim.',
    price: 490,
    compare_at_price: 590,
    image_url: 'https://images.unsplash.com/photo-1521369909029-2afed882baee?w=900&q=80',
    stock: 22,
    category: 'Accessories',
    tags: ['cap', 'cotton', 'travel', 'weekend'],
    badge: 'Checkout add-on',
    is_active: true,
    created_at: '2026-05-08T00:00:00.000Z',
  },
  {
    id: 'demo-candle',
    name: 'Hinoki Soy Candle',
    slug: 'hinoki-soy-candle',
    description: 'Clean-burning soy candle with hinoki, citrus peel, and soft musk for calm interiors.',
    price: 760,
    compare_at_price: null,
    image_url: 'https://images.unsplash.com/photo-1603006905003-be475563bc59?w=900&q=80',
    stock: 16,
    category: 'Home',
    tags: ['home', 'gift', 'scent', 'premium'],
    badge: 'Giftable',
    is_active: true,
    created_at: '2026-05-09T00:00:00.000Z',
  },
  {
    id: 'demo-pouch',
    name: 'Tech Cable Pouch',
    slug: 'tech-cable-pouch',
    description: 'Compact pouch with mesh dividers for chargers, earbuds, cards, and travel tech.',
    price: 650,
    compare_at_price: 790,
    image_url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=900&q=80',
    stock: 19,
    category: 'Accessories',
    tags: ['tech', 'pouch', 'travel', 'commute'],
    badge: 'Frequently bought',
    is_active: true,
    created_at: '2026-05-10T00:00:00.000Z',
  },
  {
    id: 'demo-socks',
    name: 'Commuter Rib Socks',
    slug: 'commuter-rib-socks',
    description: 'Breathable rib socks with a cushioned sole for office days, travel, and weekends.',
    price: 320,
    compare_at_price: null,
    image_url: 'https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?w=900&q=80',
    stock: 40,
    category: 'Apparel',
    tags: ['socks', 'apparel', 'commute', 'add-on'],
    badge: 'Add-on',
    is_active: true,
    created_at: '2026-05-11T00:00:00.000Z',
  },
  {
    id: 'demo-notebook',
    name: 'Linen Daily Notebook',
    slug: 'linen-daily-notebook',
    description: 'Hardbound linen notebook with smooth paper, lay-flat binding, and subtle date markers.',
    price: 420,
    compare_at_price: 520,
    image_url: 'https://images.unsplash.com/photo-1531346680769-a1d79b57de5c?w=900&q=80',
    stock: 28,
    category: 'Accessories',
    tags: ['notebook', 'desk', 'gift', 'workwear'],
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
