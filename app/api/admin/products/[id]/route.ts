import { NextRequest, NextResponse } from 'next/server'
import { hasSupabaseAdminConfig, supabaseAdmin } from '@/lib/supabase'
import { checkAdminAuth } from '../../_auth'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!checkAdminAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasSupabaseAdminConfig()) return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 })

  const { id } = await params
  const body = await req.json()
  const { name, slug, description, price, compare_at_price, image_url, stock, reorder_threshold, category, tags, badge, is_active } = body

  const update: Record<string, unknown> = {}
  if (name != null) update.name = name.trim()
  if (slug != null) update.slug = slug.trim().toLowerCase().replace(/\s+/g, '-')
  if (description != null) update.description = description.trim()
  if (price != null) update.price = Number(price)
  if ('compare_at_price' in body) update.compare_at_price = compare_at_price ? Number(compare_at_price) : null
  if (image_url != null) update.image_url = image_url.trim()
  if (stock != null) update.stock = Number(stock)
  if (reorder_threshold != null) update.reorder_threshold = Number(reorder_threshold)
  if (category != null) update.category = category.trim()
  if (tags != null) update.tags = Array.isArray(tags) ? tags : tags.split(',').map((t: string) => t.trim()).filter(Boolean)
  if ('badge' in body) update.badge = badge?.trim() || null
  if (is_active != null) update.is_active = Boolean(is_active)

  const { data, error } = await supabaseAdmin
    .from('products')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!checkAdminAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasSupabaseAdminConfig()) return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 })

  const { id } = await params

  const { error } = await supabaseAdmin
    .from('products')
    .update({ is_active: false })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
