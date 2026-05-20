import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/navbar'
import CartDrawer from '@/components/cart-drawer'
import { Toaster } from '@/components/ui/sonner'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })

export const metadata: Metadata = {
  title: 'Store',
  description: 'Official Online Store',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-gray-50">
        <Navbar />
        <CartDrawer />
        <main className="flex-1">{children}</main>
        <Toaster richColors position="bottom-right" />
        <footer className="border-t bg-white py-6 text-center text-sm text-gray-400">
          © {new Date().getFullYear()} Store. All rights reserved.
        </footer>
      </body>
    </html>
  )
}
