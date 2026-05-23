import { BadgeCheck, Headphones, RefreshCcw, ShieldCheck, Sparkles, Truck } from 'lucide-react'
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

export const DEMO_PRODUCTS: Product[] = [
  {
    id: 'demo-tee',
    name: 'Everyday Oxford Shirt',
    slug: 'everyday-oxford-shirt',
    description: 'A crisp cotton oxford with a relaxed fit, clean collar, and breathable weave for daily office-to-weekend wear.',
    price: 1290,
    image_url: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=900&q=80',
    stock: 18,
    category: 'Apparel',
    is_active: true,
    created_at: '2026-05-01T00:00:00.000Z',
  },
  {
    id: 'demo-tote',
    name: 'Structured Canvas Tote',
    slug: 'structured-canvas-tote',
    description: 'Heavyweight canvas tote with reinforced handles, inner pocket, and enough room for a laptop and daily carry.',
    price: 890,
    image_url: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=900&q=80',
    stock: 24,
    category: 'Accessories',
    is_active: true,
    created_at: '2026-05-02T00:00:00.000Z',
  },
  {
    id: 'demo-lamp',
    name: 'Dawn Table Lamp',
    slug: 'dawn-table-lamp',
    description: 'Warm ceramic table lamp with a linen shade, built for bedrooms, studios, and calm evening routines.',
    price: 2490,
    image_url: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=900&q=80',
    stock: 7,
    category: 'Home',
    is_active: true,
    created_at: '2026-05-03T00:00:00.000Z',
  },
  {
    id: 'demo-bottle',
    name: 'Insulated Travel Bottle',
    slug: 'insulated-travel-bottle',
    description: 'Double-wall stainless bottle that keeps drinks cold through commutes, workouts, and long errands.',
    price: 690,
    image_url: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=900&q=80',
    stock: 4,
    category: 'Travel',
    is_active: true,
    created_at: '2026-05-04T00:00:00.000Z',
  },
]

export function formatMoney(value: number) {
  return `₱${value.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
}

export function getCategoryCount(products: Product[], category: string) {
  return products.filter((product) => product.category === category).length
}
