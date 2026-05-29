'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Plus, UserCog } from 'lucide-react'
import { useCart } from '@/lib/cart-store'
import type { Product } from '@/lib/supabase'
import { toast } from 'sonner'
import { formatMoney } from '@/lib/storefront'

export default function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart()

  function handleAdd(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    addItem({
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      image_url: product.image_url,
      category: product.category,
      tags: product.tags ?? [],
      ownerName: product.owner_name ?? undefined,
      operatorAvailable: Boolean(product.operator_available),
      operatorDayRate: product.operator_day_rate ?? undefined,
    })
    toast.success('Added to cart')
  }

  const soldOut = product.stock === 0

  return (
    <Link href={`/products/${product.slug}`} className="group block">
      <div className="overflow-hidden rounded-2xl bg-[#f5f5f7] transition-all duration-300 group-hover:shadow-[0_8px_30px_rgba(0,0,0,0.10)]">
        <div className="relative aspect-[4/3] overflow-hidden">
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />

          {soldOut && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm">
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#1d1d1f]">Fully booked</span>
            </div>
          )}

          {product.badge && !soldOut && (
            <div className="absolute left-3 top-3">
              <span className="rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-[#1d1d1f] shadow-sm backdrop-blur-sm">
                {product.badge}
              </span>
            </div>
          )}

          {product.operator_available && !soldOut && (
            <div className="absolute right-3 top-3">
              <span className="inline-flex items-center gap-1 rounded-full bg-[#0071e3]/10 px-2 py-1 text-[10px] font-semibold text-[#0071e3]">
                <UserCog className="h-3 w-3" />
                Operator
              </span>
            </div>
          )}

          {!soldOut && (
            <div className="absolute inset-x-3 bottom-3 translate-y-2 opacity-0 transition-all duration-250 group-hover:translate-y-0 group-hover:opacity-100">
              <button
                onClick={handleAdd}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#1d1d1f] text-[13px] font-semibold text-white shadow-lg transition-opacity hover:opacity-80"
              >
                <Plus className="h-3.5 w-3.5" />
                Add to Cart
              </button>
            </div>
          )}
        </div>

        <div className="px-4 py-4">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-[#6e6e73]">{product.category}</p>
          <h3 className="line-clamp-1 text-[15px] font-semibold text-[#1d1d1f]">{product.name}</h3>
          {product.owner_name && (
            <p className="mt-0.5 text-[12px] text-[#6e6e73]">by {product.owner_name}</p>
          )}
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-[15px] font-semibold text-[#1d1d1f]">{formatMoney(product.price)}</span>
            <span className="text-[12px] text-[#6e6e73]">/day</span>
          </div>
        </div>
      </div>
    </Link>
  )
}
