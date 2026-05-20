'use client'

import Link from 'next/link'
import { CheckCircle } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'

export default function OrderSuccessPage() {
  return (
    <div className="max-w-lg mx-auto px-4 py-20 text-center">
      <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-6" />
      <h1 className="text-3xl font-bold mb-3">Order Confirmed!</h1>
      <p className="text-gray-500 mb-2">
        Thank you for your purchase. You will receive a confirmation email shortly.
      </p>
      <p className="text-gray-400 text-sm mb-8">
        If you have questions about your order, contact us with your order reference number.
      </p>
      <Link href="/" className={buttonVariants({ className: 'bg-black hover:bg-gray-800 text-white' })}>
        Continue Shopping
      </Link>
    </div>
  )
}
