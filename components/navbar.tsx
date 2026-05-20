'use client'

import Link from 'next/link'
import { ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCart, cartCount } from '@/lib/cart-store'

export default function Navbar() {
  const { items, openCart } = useCart()
  const count = cartCount(items)

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold tracking-tight">
          STORE
        </Link>

        <Button
          variant="ghost"
          size="icon"
          className="relative"
          onClick={openCart}
        >
          <ShoppingCart className="h-5 w-5" />
          {count > 0 && (
            <span className="absolute -top-1 -right-1 bg-black text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {count}
            </span>
          )}
        </Button>
      </div>
    </header>
  )
}
