'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Eye, ShoppingCart, Star } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useCart } from '@/lib/cart-store'
import type { Product } from '@/lib/supabase'
import { toast } from 'sonner'
import { formatMoney } from '@/lib/storefront'

export default function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart()

  function handleAddToCart(e: React.MouseEvent) {
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
    })
    toast.success(`${product.name} added to cart`)
  }

  return (
    <Link href={`/products/${product.slug}`} className="group block h-full">
      <div className="flex h-full flex-col overflow-hidden rounded-lg border border-stone-200 bg-white transition-all duration-300 hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-lg">
        <div className="relative aspect-[4/5] overflow-hidden bg-stone-100">
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />

          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
          <div className="absolute bottom-3 left-3 right-3 flex justify-center gap-2 opacity-100 transition-all duration-300 md:translate-y-2 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100">
            <button
              onClick={handleAddToCart}
              disabled={product.stock === 0}
              className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-white px-3 text-xs font-semibold text-stone-950 shadow-md transition-colors hover:bg-stone-950 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ShoppingCart className="h-3.5 w-3.5" />
              Add
            </button>
            <Link
              href={`/products/${product.slug}`}
              className="flex h-9 items-center justify-center gap-1.5 rounded-lg bg-white px-3 text-xs font-semibold text-stone-950 shadow-md transition-colors hover:bg-stone-950 hover:text-white"
              onClick={(e) => e.stopPropagation()}
              aria-label={`View ${product.name}`}
            >
              <Eye className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="absolute left-3 top-3 flex flex-col gap-1">
            {product.stock === 0 && (
              <Badge className="bg-stone-600 text-xs text-white">Out of Stock</Badge>
            )}
            {product.stock > 0 && product.stock <= 5 && (
              <Badge className="bg-amber-500 text-xs text-white">Only {product.stock} left</Badge>
            )}
            {product.badge && product.stock > 5 && (
              <Badge className="bg-sky-600 text-xs text-white">{product.badge}</Badge>
            )}
          </div>
        </div>

        <div className="flex flex-1 flex-col p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">{product.category}</p>
            <div className="flex items-center gap-1 text-xs text-stone-500">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              4.8
            </div>
          </div>
          <h3 className="line-clamp-1 text-sm font-semibold text-stone-950">{product.name}</h3>
          <p className="mt-1 line-clamp-2 min-h-9 text-xs leading-5 text-stone-500">{product.description}</p>
          <div className="mt-auto flex items-end justify-between gap-3 pt-4">
            <span>
              <span className="font-semibold text-stone-950">{formatMoney(product.price)}</span>
              {product.compare_at_price && product.compare_at_price > product.price && (
                <span className="ml-2 text-xs text-stone-400 line-through">
                  {formatMoney(product.compare_at_price)}
                </span>
              )}
            </span>
            {product.stock > 0 && (
              <span className="rounded-full bg-sky-50 px-2 py-1 text-xs font-medium text-sky-700">In stock</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
