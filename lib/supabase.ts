import { createClient } from '@supabase/supabase-js'

// A Product is a rental LISTING: equipment offered by an owner, priced per day.
// `price` = daily rental rate (₱/day). `stock` = units available to rent.
export interface Product {
  id: string
  name: string
  slug: string
  description: string
  price: number // daily rental rate
  compare_at_price?: number | null
  image_url: string
  stock: number // units available
  category: string
  tags?: string[] | null
  badge?: string | null
  is_active: boolean
  reorder_threshold?: number
  created_at: string
  // Equipment owner (notification-only; no login). Contact shared with renter after downpayment.
  owner_name?: string | null
  owner_email?: string | null
  owner_phone?: string | null
  // Smart add-on: optionally hire an operator to run this gear on the shoot.
  operator_available?: boolean | null
  operator_day_rate?: number | null
}

// An Order is a BOOKING: a rental reservation paid via a 30% downpayment.
export interface Order {
  id: string
  customer_name: string
  customer_email: string
  customer_phone: string
  customer_address: string
  billing_address?: string | null
  // Rental specifics
  shoot_start_date?: string | null
  rental_days?: number | null
  notes?: string | null
  subtotal?: number | null // rental subtotal (gear only)
  operator_total?: number | null // operator fees across the booking
  total_amount: number // full rental total (gear + operators)
  downpayment_pct?: number | null
  downpayment_amount?: number | null // amount charged now via PayMongo
  balance_amount?: number | null // settled with owner on handover
  owner_notified_at?: string | null
  // Legacy fulfillment fields kept for the admin dashboard (unused by rentals)
  shipping_fee?: number | null
  shipping_method?: string | null
  payment_method?: string | null
  status: 'pending' | 'paid' | 'failed' | 'cancelled'
  fulfillment_status?: 'awaiting_payment' | 'to_pack' | 'packing' | 'ready_to_ship' | 'picked_up' | 'shipped' | 'delivered' | 'returned' | null
  paymongo_session_id: string
  paymongo_payment_id: string
  courier_name?: string | null
  tracking_number?: string | null
  paid_at?: string | null
  packed_at?: string | null
  shipped_at?: string | null
  delivered_at?: string | null
  created_at: string
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string | null
  product_name: string
  quantity: number // units rented
  days: number // rental duration in days
  daily_rate: number
  unit_price: number // mirror of daily_rate (legacy)
  with_operator: boolean
  operator_day_rate?: number | null
  operator_fee: number
  line_total: number
  owner_name?: string | null
  owner_email?: string | null
  owner_phone?: string | null
}

function hasRealValue(value: string | undefined) {
  return Boolean(value && !value.toLowerCase().includes('placeholder') && !value.toLowerCase().startsWith('your-'))
}

export function hasSupabaseConfig() {
  return hasRealValue(process.env.NEXT_PUBLIC_SUPABASE_URL) && hasRealValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}

export function hasSupabaseAdminConfig() {
  return hasSupabaseConfig() && hasRealValue(process.env.SUPABASE_SERVICE_ROLE_KEY)
}

function getSupabase() {
  if (!hasSupabaseConfig()) {
    throw new Error('Missing Supabase public configuration')
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

function getSupabaseAdmin() {
  if (!hasSupabaseAdminConfig()) {
    throw new Error('Missing Supabase admin configuration')
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export const supabase = new Proxy({} as ReturnType<typeof getSupabase>, {
  get(_, prop) {
    return getSupabase()[prop as keyof ReturnType<typeof getSupabase>]
  },
})

export const supabaseAdmin = new Proxy({} as ReturnType<typeof getSupabaseAdmin>, {
  get(_, prop) {
    return getSupabaseAdmin()[prop as keyof ReturnType<typeof getSupabaseAdmin>]
  },
})
