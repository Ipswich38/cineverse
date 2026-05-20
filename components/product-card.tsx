'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useCart } from '@/lib/cart-store'
import type { Product } from '@/lib/supabase'
import { toast } from 'sonner'

export default function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart()

  function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault()
    addItem({
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      image_url: product.image_url,
    })
    toast.success(`${product.name} added to cart`)
  }

  return (
    <Link href={`/products/${product.slug}`} className="group block">
      <div className="bg-white rounded-xl overflow-hidden border border-gray-100 hover:border-gray-300 transition-all hover:shadow-md">
        <div className="relative aspect-square bg-gray-50 overflow-hidden">
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {product.stock <= 5 && product.stock > 0 && (
            <Badge className="absolute top-2 left-2 bg-orange-500">
              Only {product.stock} left
            </Badge>
          )}
          {product.stock === 0 && (
            <Badge className="absolute top-2 left-2 bg-gray-500">
              Out of stock
            </Badge>
          )}
        </div>

        <div className="p-4">
          <p className="text-xs text-gray-400 mb-1">{product.category}</p>
          <h3 className="font-medium text-gray-900 mb-1 line-clamp-1">
            {product.name}
          </h3>
          <p className="text-sm text-gray-500 line-clamp-2 mb-3">
            {product.description}
          </p>
          <div className="flex items-center justify-between">
            <span className="font-bold text-gray-900">
              ₱{product.price.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            </span>
            <Button
              size="sm"
              onClick={handleAddToCart}
              disabled={product.stock === 0}
              className="bg-black hover:bg-gray-800 text-white"
            >
              <ShoppingCart className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
        </div>
      </div>
    </Link>
  )
}
