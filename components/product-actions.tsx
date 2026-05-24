'use client'

import { Heart, ShoppingCart } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useCart } from '@/lib/cart-store'
import type { Product } from '@/lib/supabase'

export default function ProductActions({ product }: { product: Product }) {
  const { addItem } = useCart()

  function handleAddToCart() {
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
    <div className="flex gap-3">
      <Button
        size="lg"
        onClick={handleAddToCart}
        disabled={product.stock === 0}
        className="h-11 flex-1 bg-stone-950 text-white hover:bg-stone-800 sm:flex-none sm:px-8"
      >
        <ShoppingCart className="h-5 w-5" />
        Add to Cart
      </Button>
      <Button variant="outline" size="icon-lg" aria-label="Save product">
        <Heart className="h-5 w-5" />
      </Button>
    </div>
  )
}
