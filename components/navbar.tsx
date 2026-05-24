'use client'

import Link from 'next/link'
import { Menu, Search, ShoppingCart, X } from 'lucide-react'
import { useState } from 'react'
import { useCart, cartCount } from '@/lib/cart-store'
import { STORE } from '@/lib/storefront'

export default function Navbar() {
  const { items, openCart } = useCart()
  const count = cartCount(items)
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <>
      {/* Announcement bar */}
      <div className="bg-emerald-700 px-4 py-2 text-center text-xs font-medium tracking-wide text-white">
        FREE SHIPPING over ₱1,500 · Secure payments via PayMongo · Demo-ready checkout
      </div>

      <header className="sticky top-0 z-50 border-b border-stone-200 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-stone-950 text-sm font-bold text-white">
              L
            </div>
            <span className="text-lg font-semibold tracking-normal text-stone-950">{STORE.name}</span>
          </Link>

          <nav className="hidden items-center gap-7 text-sm font-medium text-stone-600 md:flex">
            <Link href="/#products" className="transition-colors hover:text-stone-950">
              Products
            </Link>
            <Link href="/#categories" className="transition-colors hover:text-stone-950">
              Categories
            </Link>
            <Link href="/checkout" className="transition-colors hover:text-stone-950">
              Checkout
            </Link>
            <Link href="/admin" className="transition-colors hover:text-stone-950">
              Admin
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/#products"
              className="hidden h-10 w-10 items-center justify-center rounded-lg border border-stone-200 text-stone-600 transition-colors hover:bg-stone-50 hover:text-stone-950 sm:flex"
              aria-label="Search products"
            >
              <Search className="h-4 w-4" />
            </Link>
            <button
              onClick={openCart}
              className="relative flex h-10 items-center gap-2 rounded-lg bg-stone-950 px-4 text-sm font-medium text-white transition-colors hover:bg-stone-800"
            >
              <ShoppingCart className="h-4 w-4" />
              <span className="hidden sm:inline">Cart</span>
              {count > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-400 px-1 text-xs font-bold text-stone-950">
                  {count}
                </span>
              )}
            </button>

            <button
              className="rounded-lg p-2 text-stone-600 md:hidden"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle navigation menu"
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="flex flex-col gap-4 border-t border-stone-100 bg-white px-4 py-4 text-sm font-medium text-stone-600 md:hidden">
            <Link href="/#products" onClick={() => setMenuOpen(false)}>Products</Link>
            <Link href="/#categories" onClick={() => setMenuOpen(false)}>Categories</Link>
            <Link href="/checkout" onClick={() => setMenuOpen(false)}>Checkout</Link>
            <Link href="/admin" onClick={() => setMenuOpen(false)}>Admin</Link>
          </div>
        )}
      </header>
    </>
  )
}
