'use client'

import { useEffect, useState } from 'react'
import { useParams, notFound } from 'next/navigation'
import Image from 'next/image'
import { ShoppingCart, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { supabase, type Product } from '@/lib/supabase'
import { useCart } from '@/lib/cart-store'
import { toast } from 'sonner'

export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const { addItem } = useCart()

  useEffect(() => {
    async function fetchProduct() {
      const { data } = await supabase
        .from('products')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .single()

      setProduct(data)
      setLoading(false)
    }
    fetchProduct()
  }, [slug])

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10 animate-pulse">
        <div className="grid md:grid-cols-2 gap-10">
          <div className="aspect-square bg-gray-200 rounded-xl" />
          <div className="space-y-4">
            <div className="h-8 bg-gray-200 rounded w-3/4" />
            <div className="h-6 bg-gray-200 rounded w-1/4" />
            <div className="h-24 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    )
  }

  if (!product) return notFound()

  function handleAddToCart() {
    if (!product) return
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
    <div className="max-w-6xl mx-auto px-4 py-10">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-8"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to products
      </Link>

      <div className="grid md:grid-cols-2 gap-10">
        <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-100">
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            className="object-cover"
          />
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <Badge variant="outline" className="mb-2">
              {product.category}
            </Badge>
            <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>
          </div>

          <p className="text-3xl font-bold">
            ₱{product.price.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
          </p>

          <p className="text-gray-600 leading-relaxed">{product.description}</p>

          <div className="text-sm text-gray-400">
            {product.stock > 0 ? (
              <span className="text-green-600 font-medium">
                In stock ({product.stock} available)
              </span>
            ) : (
              <span className="text-red-500 font-medium">Out of stock</span>
            )}
          </div>

          <Button
            size="lg"
            onClick={handleAddToCart}
            disabled={product.stock === 0}
            className="bg-black hover:bg-gray-800 text-white mt-2"
          >
            <ShoppingCart className="h-5 w-5 mr-2" />
            Add to Cart
          </Button>
        </div>
      </div>
    </div>
  )
}
