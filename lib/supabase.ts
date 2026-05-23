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
