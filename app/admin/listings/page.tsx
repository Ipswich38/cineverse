'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ImagePlus, Loader2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { FEATURED_CATEGORIES, formatMoney } from '@/lib/storefront'
import type { Product } from '@/lib/supabase'

const EMPTY = {
  name: '', category: FEATURED_CATEGORIES[0], description: '', image_url: '',
  price: '', stock: '1', badge: '',
  for_rent: true, for_sale: false, sale_price: '',
  owner_name: '', owner_email: '', owner_phone: '',
  operator_available: false, operator_day_rate: '',
}

export default function AdminListingsPage() {
  const [password, setPassword] = useState('')
  const [authed, setAuthed] = useState(false)
  const [listings, setListings] = useState<Product[]>([])
  const [form, setForm] = useState({ ...EMPTY })
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const authHeader = useCallback(() => ({ Authorization: `Bearer ${password}` }), [password])

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/products', { headers: authHeader() })
    if (res.status === 401) { setAuthed(false); toast.error('Wrong password'); return }
    if (res.ok) { setListings(await res.json()); setAuthed(true) }
    else if (res.status === 503) { setAuthed(true); toast.error('Supabase not configured') }
  }, [authHeader])

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('cv_admin') : null
    if (saved) setPassword(saved)
  }, [])

  function login(e: React.FormEvent) {
    e.preventDefault()
    localStorage.setItem('cv_admin', password)
    load()
  }

  async function onUpload(file: File) {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/admin/upload', { method: 'POST', headers: authHeader(), body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Upload failed')
      setForm((f) => ({ ...f, image_url: data.url }))
      toast.success('Photo uploaded')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.price) { toast.error('Name and daily rate are required'); return }
    if (form.for_sale && !form.sale_price) { toast.error('Set a sale price or untick "For sale"'); return }
    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { ...authHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          category: form.category,
          description: form.description,
          image_url: form.image_url,
          price: Number(form.price),
          stock: Number(form.stock || 1),
          badge: form.badge,
          for_rent: form.for_rent,
          for_sale: form.for_sale,
          sale_price: form.for_sale ? Number(form.sale_price) : null,
          owner_name: form.owner_name,
          owner_email: form.owner_email,
          owner_phone: form.owner_phone,
          operator_available: form.operator_available,
          operator_day_rate: form.operator_available ? Number(form.operator_day_rate || 0) : null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Could not save')
      toast.success(`Added "${data.name}"`)
      setForm({ ...EMPTY })
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save')
    } finally {
      setSubmitting(false)
    }
  }

  async function remove(id: string, name: string) {
    if (!confirm(`Deactivate "${name}"? It will be hidden from the store.`)) return
    const res = await fetch(`/api/admin/products/${id}`, { method: 'DELETE', headers: authHeader() })
    if (res.ok) { toast.success('Removed'); load() } else { toast.error('Could not remove') }
  }

  // --- Login gate ---
  if (!authed) {
    return (
      <div className="mx-auto max-w-sm px-4 py-24">
        <h1 className="text-2xl font-semibold text-[#111827]">Listings admin</h1>
        <p className="mt-1 text-sm text-[#6b7280]">Enter the admin password to manage listings.</p>
        <form onSubmit={login} className="mt-6 space-y-3">
          <div>
            <Label htmlFor="pw">Password</Label>
            <Input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Admin password" />
          </div>
          <Button type="submit" className="h-11 w-full bg-[#FFCC00] text-[#111827] hover:bg-[#E6B800]">Enter</Button>
        </form>
      </div>
    )
  }

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value } as typeof EMPTY))

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <Link href="/admin" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-[#6b7280] hover:text-[#111827]">
        <ArrowLeft className="h-4 w-4" /> Admin
      </Link>
      <h1 className="text-3xl font-semibold text-[#111827]">Add a listing</h1>
      <p className="mt-2 text-sm text-[#6b7280]">Fill the form and upload a photo — it goes live on the store immediately.</p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.2fr_1fr]">
        {/* Form */}
        <form onSubmit={submit} className="space-y-5 rounded-2xl border border-black/[0.08] bg-white p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" value={form.name} onChange={set('name')} placeholder="Sony FX6 Cinema Camera Kit" required />
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <select id="category" value={form.category} onChange={set('category')} className="h-10 w-full rounded-md border border-black/[0.12] bg-white px-3 text-sm">
                {FEATURED_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <Label htmlFor="badge">Badge (optional)</Label>
              <Input id="badge" value={form.badge} onChange={set('badge')} placeholder="Best seller" />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="description">Description</Label>
              <textarea id="description" value={form.description} onChange={set('description')} rows={2}
                className="w-full rounded-md border border-black/[0.12] bg-white px-3 py-2 text-sm" placeholder="1–2 sentences about the gear." />
            </div>
          </div>

          {/* Photo */}
          <div>
            <Label>Photo</Label>
            <div className="mt-1 flex items-center gap-4">
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-[#f3f4f6]">
                {form.image_url
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={form.image_url} alt="" className="h-full w-full object-cover" />
                  : <span className="flex h-full items-center justify-center text-[#6b7280]"><ImagePlus className="h-6 w-6" /></span>}
              </div>
              <div className="flex-1">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-black/[0.12] px-3 py-2 text-sm font-medium text-[#111827] hover:bg-[#f3f4f6]">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                  {uploading ? 'Uploading…' : 'Upload photo'}
                  <input type="file" accept="image/*" className="hidden" disabled={uploading}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f) }} />
                </label>
                <Input className="mt-2" value={form.image_url} onChange={set('image_url')} placeholder="…or paste an image URL" />
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="price">Daily rate ₱ *</Label>
              <Input id="price" type="number" min="0" value={form.price} onChange={set('price')} placeholder="4500" required />
            </div>
            <div>
              <Label htmlFor="stock">Units</Label>
              <Input id="stock" type="number" min="0" value={form.stock} onChange={set('stock')} />
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 text-sm text-[#111827]">
                <input type="checkbox" checked={form.for_rent} onChange={(e) => setForm((f) => ({ ...f, for_rent: e.target.checked }))} /> For rent
              </label>
            </div>
          </div>

          {/* Sale */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 text-sm text-[#111827]">
                <input type="checkbox" checked={form.for_sale} onChange={(e) => setForm((f) => ({ ...f, for_sale: e.target.checked }))} /> For sale
              </label>
            </div>
            {form.for_sale && (
              <div className="sm:col-span-2">
                <Label htmlFor="sale_price">Sale price ₱</Label>
                <Input id="sale_price" type="number" min="0" value={form.sale_price} onChange={set('sale_price')} placeholder="24990" />
              </div>
            )}
          </div>

          {/* Operator */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 text-sm text-[#111827]">
                <input type="checkbox" checked={form.operator_available} onChange={(e) => setForm((f) => ({ ...f, operator_available: e.target.checked }))} /> Operator available
              </label>
            </div>
            {form.operator_available && (
              <div className="sm:col-span-2">
                <Label htmlFor="op">Operator ₱/day</Label>
                <Input id="op" type="number" min="0" value={form.operator_day_rate} onChange={set('operator_day_rate')} placeholder="3500" />
              </div>
            )}
          </div>

          {/* Owner */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div><Label htmlFor="on">Owner name</Label><Input id="on" value={form.owner_name} onChange={set('owner_name')} placeholder="Cinegear Manila" /></div>
            <div><Label htmlFor="oe">Owner email</Label><Input id="oe" type="email" value={form.owner_email} onChange={set('owner_email')} placeholder="owner@email.com" /></div>
            <div><Label htmlFor="op2">Owner phone</Label><Input id="op2" value={form.owner_phone} onChange={set('owner_phone')} placeholder="09XXXXXXXXX" /></div>
          </div>

          <Button type="submit" disabled={submitting} className="h-11 w-full bg-[#FFCC00] text-[#111827] hover:bg-[#E6B800]">
            {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…</> : 'Publish listing'}
          </Button>
        </form>

        {/* Existing listings */}
        <div>
          <h2 className="mb-3 text-sm font-semibold text-[#111827]">Live listings ({listings.length})</h2>
          <div className="space-y-2">
            {listings.map((p) => (
              <div key={p.id} className="flex items-center gap-3 rounded-xl border border-black/[0.06] bg-white p-2.5">
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-[#f3f4f6]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {p.image_url && <img src={p.image_url} alt="" className="h-full w-full object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-sm font-semibold text-[#111827]">{p.name}</p>
                  <p className="text-xs text-[#6b7280]">{p.category} · {formatMoney(p.price)}/day{p.for_sale && p.sale_price ? ` · buy ${formatMoney(p.sale_price)}` : ''}</p>
                </div>
                <button onClick={() => remove(p.id, p.name)} className="shrink-0 p-1.5 text-[#ff3b30]/70 hover:text-[#ff3b30]" aria-label="Remove">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            {listings.length === 0 && <p className="text-sm text-[#6b7280]">No listings yet.</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
