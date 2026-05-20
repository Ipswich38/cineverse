import { createClient } from '@supabase/supabase-js'

export interface Product {
  id: string
  name: string
  slug: string
  description: string
  price: number
  image_url: string
  stock: number
  category: string
  is_active: boolean
  created_at: string
}

export interface Order {
  id: string
  customer_name: string
  customer_email: string
  customer_phone: string
  customer_address: string
  total_amount: number
  status: 'pending' | 'paid' | 'failed'
  paymongo_session_id: string
  paymongo_payment_id: string
  created_at: string
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

function getSupabaseAdmin() {
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
