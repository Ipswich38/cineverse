'use client'

import { useState } from 'react'
import { Loader2, LockKeyhole } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { formatMoney } from '@/lib/storefront'

export default function PayBalanceButton({ bookingId, amount }: { bookingId: string; amount: number }) {
  const [loading, setLoading] = useState(false)

  async function pay() {
    setLoading(true)
    try {
      const res = await fetch('/api/booking/balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Could not start payment')
      window.location.href = data.checkoutUrl
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    <Button onClick={pay} disabled={loading} size="lg" className="h-12 w-full bg-[#FFCC00] text-[#111827] hover:bg-[#E6B800]">
      {loading ? (
        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Redirecting to PayMongo...</>
      ) : (
        <><LockKeyhole className="h-4 w-4" /> Pay balance {formatMoney(amount)}</>
      )}
    </Button>
  )
}
