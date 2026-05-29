import { NextRequest, NextResponse } from 'next/server'
import { hasSupabaseAdminConfig, supabaseAdmin } from '@/lib/supabase'
import { checkAdminAuth } from '../_auth'

export async function GET(req: NextRequest) {
  if (!checkAdminAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasSupabaseAdminConfig()) return NextResponse.json({ error: 'Supabase not configured', demo: true }, { status: 503 })

  const { data, error } = await supabaseAdmin
    .from('products')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  if (!checkAdminAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasSupabaseAdminConfig()) return NextResponse.json({ error: 'Supabase not configured', demo: true }, { status: 503 })

  const body = await req.json()
  const { name, slug, description, price, compare_at_price, image_url, stock, reorder_threshold, category, tags, badge, is_active } = body

  if (!name || !slug || price == null || stock == null) {
    return NextResponse.json({ error: 'Missing required fields: name, slug, price, stock' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('products')
    .insert({
      name: name.trim(),
      slug: slug.trim().toLowerCase().replace(/\s+/g, '-'),
      description: description?.trim() ?? null,
      price: Number(price),
      compare_at_price: compare_at_price ? Number(compare_at_price) : null,
      image_url: image_url?.trim() ?? null,
      stock: Number(stock),
      reorder_threshold: reorder_threshold != null ? Number(reorder_threshold) : 5,
      category: category?.trim() ?? null,
      tags: Array.isArray(tags) ? tags : tags?.split(',').map((t: string) => t.trim()).filter(Boolean) ?? [],
      badge: badge?.trim() || null,
      is_active: is_active !== false,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
