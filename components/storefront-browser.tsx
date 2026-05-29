'use client'

import { useMemo, useState } from 'react'
import { Search, Sparkles } from 'lucide-react'
import ProductCard from '@/components/product-card'
import type { Product } from '@/lib/supabase'

export default function StorefrontBrowser({ listings }: { listings: Product[] }) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string>('All')

  const categories = useMemo(() => {
    const set = new Set<string>()
    listings.forEach((l) => l.category && set.add(l.category))
    return ['All', ...[...set].sort()]
  }, [listings])

  const smartPicks = useMemo(() => {
    const rank = (p: Product) =>
      (p.badge?.toLowerCase().includes('book') ? 3 : 0) +
      (p.badge?.toLowerCase().includes('seller') ? 2 : 0) +
      (p.operator_available ? 1 : 0)
    return [...listings].sort((a, b) => rank(b) - rank(a)).slice(0, 4)
  }, [listings])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return listings.filter((l) => {
      if (category !== 'All' && l.category !== category) return false
      if (!q) return true
      const haystack = [l.name, l.category, l.owner_name ?? '', ...(l.tags ?? [])].join(' ').toLowerCase()
      return haystack.includes(q)
    })
  }, [listings, query, category])

  const showSmart = !query && category === 'All'

  return (
    <>
      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#6e6e73]" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search gear, category, or owner — e.g. camera, Aputure, drone"
          className="h-14 w-full rounded-2xl border border-black/[0.08] bg-[#f5f5f7] pl-12 pr-4 text-[15px] text-[#1d1d1f] outline-none transition-colors focus:border-[#0071e3] focus:bg-white"
        />
      </div>

      {/* Category chips */}
      <div className="mt-4 flex flex-wrap gap-2">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`h-9 rounded-full px-4 text-[13px] font-medium transition-colors ${
              category === c
                ? 'bg-[#1d1d1f] text-white'
                : 'bg-[#f5f5f7] text-[#1d1d1f]/70 hover:bg-black/[0.06]'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Smart picks */}
      {showSmart && smartPicks.length > 0 && (
        <section className="mt-12">
          <div className="mb-5 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#0071e3]" />
            <h2 className="text-[17px] font-semibold text-[#1d1d1f]">Smart picks for your shoot</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {smartPicks.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* Results */}
      <section id="gear" className="mt-14 scroll-mt-20">
        <div className="mb-5 flex items-end justify-between">
          <h2 className="text-[17px] font-semibold text-[#1d1d1f]">
            {showSmart ? 'All gear' : `${filtered.length} result${filtered.length === 1 ? '' : 's'}`}
          </h2>
          <p className="text-[13px] text-[#6e6e73]">{listings.length} listings · prices per day</p>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-black/[0.06] bg-[#f5f5f7] py-16 text-center">
            <p className="text-[15px] font-medium text-[#1d1d1f]">No gear matches “{query}”.</p>
            <button onClick={() => { setQuery(''); setCategory('All') }} className="mt-2 text-[13px] font-medium text-[#0071e3] hover:underline">
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {filtered.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>
    </>
  )
}
