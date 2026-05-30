import Link from 'next/link'
import { CheckCircle2, Clock, UserCog } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import PayBalanceButton from '@/components/pay-balance-button'
import { hasSupabaseAdminConfig, supabaseAdmin, type Order, type OrderItem } from '@/lib/supabase'
import { STORE, formatMoney } from '@/lib/storefront'

export const dynamic = 'force-dynamic'

async function getBooking(id: string) {
  if (!hasSupabaseAdminConfig()) return null
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null
  const { data: order } = await supabaseAdmin.from('orders').select('*').eq('id', id).single()
  if (!order) return null
  const { data: items } = await supabaseAdmin.from('order_items').select('*').eq('order_id', id)
  return { order: order as Order, items: (items as OrderItem[] | null) ?? [] }
}

export default async function BookingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const booking = await getBooking(id)
  const ref = id.slice(0, 8).toUpperCase()

  if (!booking) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <h1 className="text-2xl font-semibold text-[#111827]">Booking not found</h1>
        <p className="mt-2 text-[#6b7280]">This booking link may be invalid.</p>
        <Link href="/#gear" className={buttonVariants({ className: 'mt-6 h-11 bg-[#111827] px-5 text-white hover:bg-[#111827]/85' })}>
          Browse gear
        </Link>
      </div>
    )
  }

  const { order, items } = booking
  const reservationPaid = order.status === 'paid'
  const balance = order.balance_amount ?? 0
  const balancePaid = Boolean(order.balance_paid_at)
  const logisticsFee = order.logistics_fee ?? 0
  const reservation = order.downpayment_amount ?? 0

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#a8843e]">Booking #{ref}</p>
      <h1 className="mt-2 text-3xl font-semibold text-[#111827]">
        {balancePaid ? 'Fully paid' : reservationPaid ? 'Balance due' : 'Awaiting reservation'}
      </h1>
      <p className="mt-2 text-sm text-[#6b7280]">
        {balancePaid
          ? "You're all set — your booking is fully funded."
          : reservationPaid
            ? 'Your reservation is confirmed. Pay the remaining balance through CineVerse before handover.'
            : 'This booking has not been reserved yet.'}
      </p>

      <div className="mt-8 rounded-3xl border border-black/[0.06] bg-white p-6 shadow-[0_10px_40px_-20px_rgba(17,24,39,0.2)]">
        <div className="divide-y divide-black/[0.06] border-b border-black/[0.06]">
          {items.map((it) => (
            <div key={it.id} className="flex items-start justify-between gap-4 py-3">
              <div>
                <p className="text-sm font-semibold text-[#111827]">{it.product_name}</p>
                <p className="text-xs text-[#6b7280]">{formatMoney(it.daily_rate)}/day × {it.quantity} × {it.days}d</p>
                {it.with_operator && (
                  <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium text-[#a8843e]">
                    <UserCog className="h-3 w-3" /> operator {formatMoney(it.operator_fee)}
                  </p>
                )}
              </div>
              <p className="text-sm font-medium text-[#111827]">{formatMoney(it.line_total)}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 space-y-1.5 text-sm text-[#6b7280]">
          <div className="flex justify-between font-semibold text-[#111827]"><span>Rental total</span><span>{formatMoney(order.total_amount)}</span></div>
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-[#C5A059]" /> Reservation paid</span>
            <span>{formatMoney(reservation)}</span>
          </div>
          {logisticsFee > 0 && <div className="flex justify-between pl-5 text-xs"><span>incl. managed delivery</span><span>{formatMoney(logisticsFee)}</span></div>}
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5">
              {balancePaid ? <CheckCircle2 className="h-3.5 w-3.5 text-[#C5A059]" /> : <Clock className="h-3.5 w-3.5 text-[#6b7280]" />}
              Balance (70%)
            </span>
            <span className={balancePaid ? '' : 'font-semibold text-[#111827]'}>{formatMoney(balance)}</span>
          </div>
        </div>

        <div className="mt-6">
          {balancePaid ? (
            <div className="flex items-center justify-center gap-2 rounded-xl bg-[#f6efdf] px-4 py-3 text-sm font-semibold text-[#111827]">
              <CheckCircle2 className="h-4 w-4 text-[#C5A059]" /> Booking fully paid
            </div>
          ) : reservationPaid ? (
            <PayBalanceButton bookingId={order.id} amount={balance} />
          ) : (
            <Link href="/checkout" className={buttonVariants({ size: 'lg', className: 'h-12 w-full bg-[#111827] text-white hover:bg-[#111827]/85' })}>
              Complete reservation
            </Link>
          )}
        </div>
      </div>

      <p className="mt-6 text-center text-[11px] text-[#6b7280]">
        Payments are processed securely by PayMongo. {STORE.name} holds your rental and pays the owner after a clean return.
      </p>
    </div>
  )
}
