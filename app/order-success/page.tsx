'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { CheckCircle, Mail, PackageCheck, Truck } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { useCart } from '@/lib/cart-store'
import { FULFILLMENT_FLOW } from '@/lib/storefront'

export default function OrderSuccessPage() {
  const { clearCart } = useCart()

  useEffect(() => {
    clearCart()
  }, [clearCart])

  return (
    <div className="mx-auto max-w-3xl px-4 py-20">
      <div className="text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50">
          <CheckCircle className="h-12 w-12 text-emerald-600" />
        </div>
        <h1 className="text-3xl font-semibold text-stone-950">Order Confirmed</h1>
        <p className="mx-auto mt-3 max-w-xl text-stone-500">
          Payment is confirmed by PayMongo, inventory is deducted, and the order enters the fulfillment queue.
        </p>
      </div>

      <div className="mt-8 grid gap-3 text-left sm:grid-cols-3">
        <div className="rounded-lg border border-stone-200 bg-white p-4">
          <Mail className="mb-3 h-5 w-5 text-emerald-700" />
          <p className="text-sm font-semibold text-stone-950">Email confirmation</p>
          <p className="mt-1 text-sm text-stone-500">Receipt and status updates can be sent from the order workflow.</p>
        </div>
        <div className="rounded-lg border border-stone-200 bg-white p-4">
          <PackageCheck className="mb-3 h-5 w-5 text-emerald-700" />
          <p className="text-sm font-semibold text-stone-950">To pack</p>
          <p className="mt-1 text-sm text-stone-500">Paid orders are queued for picking, packing, and label assignment.</p>
        </div>
        <div className="rounded-lg border border-stone-200 bg-white p-4">
          <Truck className="mb-3 h-5 w-5 text-emerald-700" />
          <p className="text-sm font-semibold text-stone-950">Courier handoff</p>
          <p className="mt-1 text-sm text-stone-500">The parcel moves through pickup, shipping, and delivered states.</p>
        </div>
      </div>

      <div className="mt-8 rounded-lg border border-stone-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-stone-950">Fulfillment timeline</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {FULFILLMENT_FLOW.map((step, index) => (
            <div key={step.key} className="rounded-md bg-stone-50 p-3">
              <div className="mb-2 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-xs font-semibold text-white">
                {index + 1}
              </div>
              <p className="text-sm font-semibold text-stone-950">{step.label}</p>
              <p className="mt-1 text-xs leading-5 text-stone-500">{step.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 text-center">
        <Link href="/" className={buttonVariants({ className: 'h-11 bg-stone-950 px-6 text-white hover:bg-stone-800' })}>
          Continue Shopping
        </Link>
      </div>
    </div>
  )
}
