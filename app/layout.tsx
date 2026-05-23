import type { Metadata } from 'next'
import './globals.css'
import Navbar from '@/components/navbar'
import CartDrawer from '@/components/cart-drawer'
import { Toaster } from '@/components/ui/sonner'
import Link from 'next/link'
import { Mail, MapPin, MessageCircle, ShieldCheck } from 'lucide-react'
import { STORE } from '@/lib/storefront'

export const metadata: Metadata = {
  title: `${STORE.name} - Official Online Shop`,
  description: `${STORE.tagline} Secure checkout via PayMongo.`,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-stone-50 font-sans text-stone-950">
        <Navbar />
        <CartDrawer />
        <main className="flex-1">{children}</main>

        <footer className="mt-0 bg-stone-950 text-stone-400">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-4 py-12 md:grid-cols-4">
            <div className="col-span-2 md:col-span-1">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-sm font-bold text-white">L</div>
                <span className="font-semibold text-white">{STORE.name}</span>
              </div>
              <p className="text-sm leading-relaxed">
                {STORE.tagline} Built with direct checkout, customer details, and order tracking foundations.
              </p>
            </div>
            <div>
              <p className="mb-3 text-sm font-semibold text-white">Shop</p>
              <ul className="space-y-2 text-sm">
                <li><Link href="/#products" className="transition-colors hover:text-white">All Products</Link></li>
                <li><Link href="/#categories" className="transition-colors hover:text-white">Categories</Link></li>
                <li><Link href="/#products" className="transition-colors hover:text-white">New Arrivals</Link></li>
              </ul>
            </div>
            <div>
              <p className="mb-3 text-sm font-semibold text-white">Help</p>
              <ul className="space-y-2 text-sm">
                <li><Link href="/#products" className="transition-colors hover:text-white">Shipping Policy</Link></li>
                <li><Link href="/#products" className="transition-colors hover:text-white">Returns</Link></li>
                <li><Link href="/checkout" className="transition-colors hover:text-white">Checkout</Link></li>
              </ul>
            </div>
            <div>
              <p className="mb-3 text-sm font-semibold text-white">Contact</p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2"><MapPin className="h-4 w-4" /> {STORE.location}</li>
                <li className="flex items-center gap-2"><Mail className="h-4 w-4" /> {STORE.email}</li>
                <li className="flex items-center gap-2"><MessageCircle className="h-4 w-4" /> Facebook</li>
                <li className="flex items-center gap-2"><MessageCircle className="h-4 w-4" /> Instagram</li>
              </ul>
            </div>
          </div>
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 border-t border-white/10 px-4 py-4 text-xs sm:flex-row">
            <p>© {new Date().getFullYear()} {STORE.name}. All rights reserved.</p>
            <p className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> Payments secured by <span className="font-medium text-white">PayMongo</span></p>
          </div>
        </footer>

        <Toaster richColors position="bottom-right" />
      </body>
    </html>
  )
}
