import { NextRequest, NextResponse } from 'next/server'
import { hasSupabaseAdminConfig, supabaseAdmin } from '@/lib/supabase'
import { checkAdminAuth } from '../../_auth'

const VALID_FULFILLMENT = ['awaiting_payment', 'to_pack', 'packing', 'ready_to_ship', 'picked_up', 'shipped', 'delivered', 'returned']

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!checkAdminAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasSupabaseAdminConfig()) return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 })

  const { id } = await params
  const { fulfillment_status, courier_name, tracking_number } = await req.json()

  if (!VALID_FULFILLMENT.includes(fulfillment_status)) {
    return NextResponse.json({ error: 'Invalid fulfillment_status' }, { status: 400 })
  }

  const now = new Date().toISOString()
  const timestamps: Record<string, string | null> = {}
  if (fulfillment_status === 'packing') timestamps.packed_at = now
  if (fulfillment_status === 'shipped') timestamps.shipped_at = now
  if (fulfillment_status === 'delivered') timestamps.delivered_at = now

  const { data, error } = await supabaseAdmin
    .from('orders')
    .update({
      fulfillment_status,
      ...(courier_name != null ? { courier_name: courier_name.trim() || null } : {}),
      ...(tracking_number != null ? { tracking_number: tracking_number.trim() || null } : {}),
      ...timestamps,
    })
    .eq('id', id)
    .select('id, fulfillment_status, courier_name, tracking_number')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
