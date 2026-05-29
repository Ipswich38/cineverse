'use client'

import Link from 'next/link'
import { Menu, ShoppingBag, X } from 'lucide-react'
import { useState } from 'react'
import { useCart, cartCount } from '@/lib/cart-store'
import { STORE } from '@/lib/storefront'

const LINKS = [
  { href: '/#gear', label: 'Browse Gear' },
  { href: '/#how', label: 'How it works' },
  { href: '/checkout', label: 'Checkout' },
]

export default function Navbar() {
  const { items, openCart } = useCart()
  const count = cartCount(items)
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-black/[0.06] bg-white/80 backdrop-blur-2xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5">
        <Link href="/" className="flex items-center gap-1.5">
          <span className="text-[17px] font-semibold tracking-tight text-[#1d1d1f]">{STORE.shortName}</span>
          <span className="hidden text-[17px] font-light tracking-tight text-[#6e6e73] sm:inline">Rentals</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {LINKS.map(({ href, label }) => (
            <Link
              key={label}
              href={href}
              className="text-[13px] font-medium text-[#1d1d1f]/70 transition-colors duration-150 hover:text-[#1d1d1f]"
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <button
            onClick={openCart}
            aria-label="Open cart"
            className="relative flex h-9 items-center gap-2 rounded-full bg-[#1d1d1f] px-4 text-[13px] font-medium text-white transition-opacity hover:opacity-80"
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Cart</span>
            {count > 0 && (
              <span className="flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-[#0071e3] px-1 text-[10px] font-bold leading-none text-white">
                {count}
              </span>
            )}
          </button>

          <button
            className="rounded-full p-2 text-[#1d1d1f]/60 transition-colors hover:bg-black/5 md:hidden"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="border-t border-black/[0.06] bg-white/95 px-5 pb-5 pt-4 md:hidden">
          {[...LINKS, { href: '/admin', label: 'Admin' }].map(({ href, label }) => (
            <Link
              key={label}
              href={href}
              onClick={() => setMenuOpen(false)}
              className="flex h-11 items-center border-b border-black/[0.06] text-[15px] font-medium text-[#1d1d1f] last:border-0"
            >
              {label}
            </Link>
          ))}
        </div>
      )}
    </header>
  )
}
