'use client'

import { useMemo, useState } from 'react'
import { ArrowUpRight, Search, Sparkles } from 'lucide-react'
import ProductCard from '@/components/product-card'
import type { Product } from '@/lib/supabase'
import type { CartMode } from '@/lib/cart-store'
import { STORE } from '@/lib/storefront'

export default function StorefrontBrowser({ listings }: { listings: Product[] }) {
  const [mode, setMode] = useState<CartMode>('rent')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string>('All')

  // Listings available in the current mode.
  const modeListings = useMemo(
    () => listings.filter((l) => (mode === 'buy' ? l.for_sale && l.sale_price : l.for_rent !== false)),
    [listings, mode]
  )

  const categories = useMemo(() => {
    const set = new Set<string>()
    modeListings.forEach((l) => l.category && set.add(l.category))
    return ['All', ...[...set].sort()]
  }, [modeListings])

  const smartPicks = useMemo(() => {
    const rank = (p: Product) =>
      (p.badge?.toLowerCase().includes('book') ? 3 : 0) +
      (p.badge?.toLowerCase().includes('seller') ? 2 : 0) +
      (p.operator_available ? 1 : 0)
    return [...modeListings].sort((a, b) => rank(b) - rank(a)).slice(0, 4)
  }, [modeListings])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return modeListings.filter((l) => {
      if (category !== 'All' && l.category !== category) return false
      if (!q) return true
      const haystack = [l.name, l.category, l.owner_name ?? '', ...(l.tags ?? [])].join(' ').toLowerCase()
      return haystack.includes(q)
    })
  }, [modeListings, query, category])

  const showSmart = !query && category === 'All'

  function switchMode(m: CartMode) {
    setMode(m)
    setCategory('All')
  }

  return (
    <>
      {/* Rent / Buy (in-app) · Hire (→ CineForce, new tab) */}
      <div className="mb-5 flex justify-center">
        <div className="inline-flex items-center rounded-full bg-[#f3f4f6] p-1">
          {(['rent', 'buy'] as CartMode[]).map((m) => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              className={`h-9 rounded-full px-6 text-[13px] font-semibold capitalize transition-all ${
                mode === m ? 'bg-[#111827] text-white shadow-sm' : 'text-[#6b7280] hover:text-[#111827]'
              }`}
            >
              {m}
            </button>
          ))}
          <a
            href={STORE.crewUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Hire crew on CineForce (opens a new tab)"
            className="inline-flex h-9 items-center gap-1 rounded-full px-6 text-[13px] font-semibold text-[#a8843e] transition-colors hover:bg-white"
          >
            Hire
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      {/* Search */}
      <div className="relative mx-auto max-w-2xl">
        <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-[#6b7280]" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={mode === 'buy' ? 'Search gear to buy — e.g. GoPro, drone, battery' : 'Search gear, category, or owner — e.g. camera, Aputure, drone'}
          className="ring-gold h-14 w-full rounded-full border border-transparent bg-[#f3f4f6] pl-[3.25rem] pr-5 text-[15px] text-[#111827] outline-none transition-colors focus:bg-white"
        />
      </div>

      {/* Category chips */}
      <div className="mt-6 flex flex-wrap justify-center gap-2.5">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`h-9 rounded-full px-4 text-[13px] font-medium transition-all duration-200 ${
              category === c
                ? 'bg-[#FFCC00] text-[#111827] shadow-sm'
                : 'bg-[#f3f4f6] text-[#111827]/70 hover:bg-[#ece9e2] hover:text-[#111827]'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Smart picks */}
      {showSmart && smartPicks.length > 0 && (
        <section className="mt-16">
          <div className="mb-7 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#C5A059]" />
            <h2 className="text-[20px] font-bold tracking-[-0.01em] text-[#111827]">
              {mode === 'buy' ? 'Popular to buy' : 'Smart picks for your shoot'}
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {smartPicks.map((p) => (
              <ProductCard key={p.id} product={p} mode={mode} />
            ))}
          </div>
        </section>
      )}

      {/* Results */}
      <section id="gear" className="mt-16 scroll-mt-24">
        <div className="mb-7 flex items-end justify-between">
          <h2 className="text-[20px] font-bold tracking-[-0.01em] text-[#111827]">
            {showSmart ? (mode === 'buy' ? 'Gear for sale' : 'Browse all gear') : `${filtered.length} result${filtered.length === 1 ? '' : 's'}`}
          </h2>
          <p className="text-[13px] text-[#6b7280]">{modeListings.length} listings · {mode === 'buy' ? 'one-time purchase' : 'prices per day'}</p>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-3xl bg-[#f3f4f6] py-20 text-center">
            <p className="text-[15px] font-medium text-[#111827]">No gear {mode === 'buy' ? 'for sale' : ''} matches “{query}”.</p>
            <button onClick={() => { setQuery(''); setCategory('All') }} className="mt-2 text-[13px] font-semibold text-[#a8843e] hover:underline">
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {filtered.map((p) => (
              <ProductCard key={p.id} product={p} mode={mode} />
            ))}
          </div>
        )}
      </section>
    </>
  )
}
