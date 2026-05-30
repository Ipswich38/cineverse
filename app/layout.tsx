import type { Metadata } from 'next'
import './globals.css'
import Navbar from '@/components/navbar'
import CartDrawer from '@/components/cart-drawer'
import { Toaster } from '@/components/ui/sonner'
import Link from 'next/link'
import { STORE } from '@/lib/storefront'

export const metadata: Metadata = {
  title: STORE.name,
  description: `${STORE.tagline} Reserve with a 30% downpayment via PayMongo.`,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="flex min-h-full flex-col bg-white font-sans text-[#1d1d1f]">
        <Navbar />
        <CartDrawer />
        <main className="flex-1">{children}</main>

        <footer className="bg-[#1d1d1f] text-white/50">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-10 px-5 py-14 md:grid-cols-4">
            <div className="col-span-2 md:col-span-1">
              <p className="mb-3 text-[15px] font-semibold text-white">{STORE.shortName}</p>
              <p className="text-[13px] leading-relaxed">{STORE.tagline}</p>
              <p className="mt-4 text-[12px]">{STORE.location}</p>
              <p className="text-[12px]">{STORE.email}</p>
            </div>
            <div>
              <p className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-white/30">Rent</p>
              <ul className="space-y-3 text-[13px]">
                <li><Link href="/#gear" className="transition-colors hover:text-white">Browse Gear</Link></li>
                <li><Link href="/about" className="transition-colors hover:text-white">About</Link></li>
                <li><Link href="/checkout" className="transition-colors hover:text-white">Checkout</Link></li>
              </ul>
            </div>
            <div>
              <p className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-white/30">Support</p>
              <ul className="space-y-3 text-[13px]">
                <li><Link href="/about" className="transition-colors hover:text-white">Reservations</Link></li>
                <li><Link href="/about" className="transition-colors hover:text-white">Downpayments</Link></li>
                <li><Link href="/admin" className="transition-colors hover:text-white">Owner admin</Link></li>
              </ul>
            </div>
            <div>
              <p className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-white/30">Connect</p>
              <ul className="space-y-3 text-[13px]">
                <li><a href="#" className="transition-colors hover:text-white">Facebook</a></li>
                <li><a href="#" className="transition-colors hover:text-white">Instagram</a></li>
              </ul>
            </div>
          </div>
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 border-t border-white/[0.08] px-5 py-5 text-[12px] sm:flex-row">
            <p>© {new Date().getFullYear()} {STORE.shortName}. All rights reserved.</p>
            <p>Payments secured by <span className="font-medium text-white">PayMongo</span></p>
          </div>
        </footer>

        <Toaster richColors position="bottom-right" />
      </body>
    </html>
  )
}
