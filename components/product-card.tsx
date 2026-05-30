'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Plus, ShieldCheck, ShoppingBag, UserCog } from 'lucide-react'
import { useCart, type CartMode } from '@/lib/cart-store'
import type { Product } from '@/lib/supabase'
import { toast } from 'sonner'
import { formatMoney } from '@/lib/storefront'

export default function ProductCard({ product, mode = 'rent' }: { product: Product; mode?: CartMode }) {
  const { addItem } = useCart()
  const buy = mode === 'buy'
  const salePrice = product.sale_price ?? 0

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
      mode,
      salePrice: buy ? salePrice : undefined,
    })
    toast.success('Added to cart')
  }

  const soldOut = product.stock === 0

  return (
    <Link href={`/products/${product.slug}`} className="group block">
      <div className="card-float overflow-hidden rounded-3xl bg-white">
        <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-[#f3f4f6]">
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
          />

          {soldOut && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-sm">
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#111827] shadow-sm">{buy ? 'Sold out' : 'Fully booked'}</span>
            </div>
          )}

          {product.badge && !soldOut && (
            <div className="absolute left-3 top-3">
              <span className="rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-[#111827] shadow-sm backdrop-blur-sm">
                {product.badge}
              </span>
            </div>
          )}

          {!buy && product.operator_available && !soldOut && (
            <div className="absolute right-3 top-3">
              <span className="inline-flex items-center gap-1 rounded-full bg-[#FFF7DB] px-2 py-1 text-[10px] font-semibold text-[#a8843e] shadow-sm">
                <UserCog className="h-3 w-3" />
                Operator
              </span>
            </div>
          )}

          {!soldOut && (
            <div className="absolute inset-x-3 bottom-3 translate-y-2 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
              <button
                onClick={handleAdd}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[#FFCC00] text-[13px] font-semibold text-[#111827] shadow-lg transition-colors hover:bg-[#E6B800]"
              >
                {buy ? <ShoppingBag className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                Add to Cart
              </button>
            </div>
          )}
        </div>

        <div className="px-1.5 pb-1 pt-4">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6b7280]">{product.category}</p>
          <h3 className="line-clamp-1 text-[15px] font-semibold text-[#111827]">{product.name}</h3>

          {product.owner_name && (
            <p className="mt-1 inline-flex items-center gap-1 text-[12px] text-[#6b7280]">
              <ShieldCheck className="h-3.5 w-3.5 text-[#C5A059]" />
              {product.owner_name}
            </p>
          )}

          <div className="mt-3 flex items-end justify-between">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-[#6b7280]">{buy ? 'Buy now' : 'Daily Rental'}</p>
              <p className="mt-0.5 text-[17px] font-bold leading-none text-[#111827]">
                {formatMoney(buy ? salePrice : product.price)}
                {!buy && <span className="ml-1 text-[12px] font-normal text-[#6b7280]">/day</span>}
              </p>
            </div>
            {!buy && product.for_sale && product.sale_price ? (
              <span className="mb-0.5 text-[11px] font-medium text-[#a8843e]">Buy {formatMoney(product.sale_price)}</span>
            ) : (
              <span className="mb-0.5 text-[11px] font-medium text-[#6b7280]">{product.stock} avail.</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
