'use client'

import Link from 'next/link'
import { CheckCircle, Mail, PackageCheck } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'

export default function OrderSuccessPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center">
      <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50">
        <CheckCircle className="h-12 w-12 text-emerald-600" />
      </div>
      <h1 className="text-3xl font-semibold text-stone-950">Order Confirmed</h1>
      <p className="mt-3 text-stone-500">
        Thank you for your purchase. Your payment has been processed and the order is ready for fulfillment.
      </p>
      <div className="mt-8 grid gap-3 text-left sm:grid-cols-2">
        <div className="rounded-lg border border-stone-200 bg-white p-4">
          <Mail className="mb-3 h-5 w-5 text-emerald-700" />
          <p className="text-sm font-semibold text-stone-950">Email confirmation</p>
          <p className="mt-1 text-sm text-stone-500">Send status updates and receipts from your commerce workflow.</p>
        </div>
        <div className="rounded-lg border border-stone-200 bg-white p-4">
          <PackageCheck className="mb-3 h-5 w-5 text-emerald-700" />
          <p className="text-sm font-semibold text-stone-950">Fulfillment ready</p>
          <p className="mt-1 text-sm text-stone-500">Orders are saved for admin review and shipping handoff.</p>
        </div>
      </div>
      <Link href="/" className={buttonVariants({ className: 'mt-8 h-11 bg-stone-950 px-6 text-white hover:bg-stone-800' })}>
        Continue Shopping
      </Link>
    </div>
  )
}
