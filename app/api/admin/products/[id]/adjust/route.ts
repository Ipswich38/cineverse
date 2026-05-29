import { NextRequest, NextResponse } from 'next/server'
import { hasSupabaseAdminConfig, supabaseAdmin } from '@/lib/supabase'
import { checkAdminAuth } from '../../../_auth'

const VALID_REASONS = ['manual_restock', 'manual_correction', 'damaged', 'lost', 'returned', 'initial_stock']

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!checkAdminAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasSupabaseAdminConfig()) return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 })

  const { id } = await params
  const { quantity_delta, reason, admin_note } = await req.json()

  if (quantity_delta == null || isNaN(Number(quantity_delta))) {
    return NextResponse.json({ error: 'quantity_delta is required' }, { status: 400 })
  }
  if (!VALID_REASONS.includes(reason)) {
    return NextResponse.json({ error: `reason must be one of: ${VALID_REASONS.join(', ')}` }, { status: 400 })
  }

  const delta = parseInt(String(quantity_delta), 10)

  const { data: product, error: fetchError } = await supabaseAdmin
    .from('products')
    .select('id, name, stock')
    .eq('id', id)
    .single()

  if (fetchError || !product) return NextResponse.json({ error: 'Product not found' }, { status: 404 })

  const newStock = Math.max(product.stock + delta, 0)

  const [updateResult, logResult] = await Promise.all([
    supabaseAdmin.from('products').update({ stock: newStock }).eq('id', id).select('id, stock').single(),
    supabaseAdmin.from('inventory_adjustments').insert({
      product_id: id,
      product_name: product.name,
      quantity_delta: delta,
      reason,
      admin_note: admin_note?.trim() || null,
    }),
  ])

  if (updateResult.error) return NextResponse.json({ error: updateResult.error.message }, { status: 500 })
  if (logResult.error) console.error('[adjust] log failed:', logResult.error.message)

  return NextResponse.json({ id, stock: newStock })
}
