import Link from 'next/link'
import { CheckCircle2, UserCog } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import ClearCart from '@/components/clear-cart'
import { hasSupabaseAdminConfig, supabaseAdmin, type Order, type OrderItem } from '@/lib/supabase'
import { ORDER_STATUS_STEPS, STORE, formatMoney } from '@/lib/storefront'

export const dynamic = 'force-dynamic'

async function getBooking(ref: string | undefined) {
  if (!ref || !hasSupabaseAdminConfig()) return null
  const uuid = /^[0-9a-f-]{36}$/i.test(ref) ? ref : null
  if (!uuid) return null

  const { data: order } = await supabaseAdmin.from('orders').select('*').eq('id', uuid).single()
  if (!order) return null

  const { data: items } = await supabaseAdmin.from('order_items').select('*').eq('order_id', uuid)
  return { order: order as Order, items: (items as OrderItem[] | null) ?? [] }
}

export default async function OrderSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>
}) {
  const { ref } = await searchParams
  const booking = await getBooking(ref)
  const shortRef = ref ? ref.slice(0, 8).toUpperCase() : null
  const isPurchase = booking?.order.order_kind === 'purchase'
  const paid = booking?.order.status === 'paid'
  const kindLabel = isPurchase ? 'Order' : 'Booking'

  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <ClearCart />

      <div className="text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#FFCC00]/10">
          <CheckCircle2 className="h-12 w-12 text-[#C5A059]" />
        </div>
        <h1 className="text-3xl font-semibold text-[#111827]">{isPurchase ? 'Order confirmed' : 'Reservation received'}</h1>
        <p className="mx-auto mt-3 max-w-xl text-[#6b7280]">
          {isPurchase
            ? (paid
                ? 'Paid in full — thank you! CineVerse will deliver your gear and coordinate the schedule with you.'
                : 'Once PayMongo confirms your payment, CineVerse arranges delivery. A confirmation is sent by email and SMS.')
            : (paid
                ? 'Your reservation is confirmed. Pay the remaining 70% balance securely through CineVerse before handover — we hold it and pay the owner after a clean return.'
                : 'Once PayMongo confirms your reservation, the owner is notified and you can pay the balance through CineVerse. A confirmation is sent by email and SMS.')}
        </p>
        {shortRef && <p className="mt-3 text-sm font-medium text-[#111827]">{kindLabel} #{shortRef}</p>}
      </div>

      {/* Invoice */}
      {booking && (
        <div className="mt-10 rounded-2xl border border-black/[0.08] bg-white p-6">
          <div className="mb-5 flex items-start justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[#6b7280]">{isPurchase ? 'Order invoice' : 'Downpayment invoice'}</p>
              <p className="text-lg font-semibold text-[#111827]">{STORE.name}</p>
            </div>
            <div className="text-right text-xs text-[#6b7280]">
              <p>{kindLabel} #{shortRef}</p>
              {booking.order.shoot_start_date && <p className="mt-1">Shoot: {booking.order.shoot_start_date}</p>}
              <p className="mt-1 capitalize">Status: {booking.order.status}</p>
            </div>
          </div>

          <div className="divide-y divide-black/[0.06] border-y border-black/[0.06]">
            {booking.items.map((it) => (
              <div key={it.id} className="flex items-start justify-between gap-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-[#111827]">{it.product_name}</p>
                  <p className="text-xs text-[#6b7280]">
                    {isPurchase
                      ? `${formatMoney(it.daily_rate)} × ${it.quantity}`
                      : `${formatMoney(it.daily_rate)}/day × ${it.quantity} unit(s) × ${it.days} day(s)`}
                  </p>
                  {!isPurchase && it.with_operator && (
                    <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium text-[#a8843e]">
                      <UserCog className="h-3 w-3" /> operator {formatMoney(it.operator_fee)}
                    </p>
                  )}
                </div>
                <p className="text-sm font-medium text-[#111827]">{formatMoney(it.line_total)}</p>
              </div>
            ))}
          </div>

          {isPurchase ? (
            <>
              <div className="mt-4 space-y-1.5 text-sm text-[#6b7280]">
                <div className="flex justify-between"><span>Items</span><span>{formatMoney(booking.order.subtotal ?? 0)}</span></div>
                <div className="flex justify-between"><span>Delivery (one-way)</span><span>{formatMoney(booking.order.logistics_fee ?? 0)}</span></div>
                {booking.order.customer_address && <div className="flex justify-between"><span>Deliver to</span><span className="max-w-[60%] truncate text-right">{booking.order.customer_address}</span></div>}
              </div>
              <div className="mt-3 flex justify-between rounded-xl border-l-2 border-[#FFCC00] bg-[#FFF7DB] px-3 py-2.5 text-[15px] font-semibold text-[#111827]">
                <span>{paid ? 'Paid' : 'Due now'}</span>
                <span>{formatMoney(booking.order.downpayment_amount ?? 0)}</span>
              </div>
            </>
          ) : (
            (() => {
              const logisticsFee = booking.order.logistics_fee ?? 0
              const payNow = booking.order.downpayment_amount ?? 0
              const gearDown = payNow - logisticsFee
              return (
                <>
                  <div className="mt-4 space-y-1.5 text-sm text-[#6b7280]">
                    <div className="flex justify-between"><span>Gear rental</span><span>{formatMoney(booking.order.subtotal ?? 0)}</span></div>
                    {(booking.order.operator_total ?? 0) > 0 && (
                      <div className="flex justify-between"><span>Operators</span><span>{formatMoney(booking.order.operator_total ?? 0)}</span></div>
                    )}
                    <div className="flex justify-between font-semibold text-[#111827]"><span>Rental total</span><span>{formatMoney(booking.order.total_amount)}</span></div>
                    <div className="flex justify-between"><span>30% gear downpayment</span><span>{formatMoney(gearDown)}</span></div>
                    <div className="flex justify-between"><span>Managed delivery</span><span>{formatMoney(logisticsFee)}</span></div>
                    <div className="flex justify-between"><span>Balance (70%) — pay before handover</span><span>{formatMoney(booking.order.balance_amount ?? 0)}</span></div>
                  </div>
                  <div className="mt-3 flex justify-between rounded-xl border-l-2 border-[#FFCC00] bg-[#FFF7DB] px-3 py-2.5 text-[15px] font-semibold text-[#111827]">
                    <span>{paid ? 'Paid now' : 'Due now'}</span>
                    <span>{formatMoney(payNow)}</span>
                  </div>
                  {paid && !booking.order.balance_paid_at && (booking.order.balance_amount ?? 0) > 0 && (
                    <Link href={`/booking/${booking.order.id}`} className={buttonVariants({ className: 'mt-3 h-11 w-full bg-[#FFCC00] text-[#111827] hover:bg-[#E6B800]' })}>
                      Pay {formatMoney(booking.order.balance_amount ?? 0)} balance
                    </Link>
                  )}
                </>
              )
            })()
          )}
        </div>
      )}

      {/* Next steps — rental flow only */}
      {!isPurchase && (
        <div className="mt-8 rounded-2xl border border-black/[0.08] bg-white p-6">
          <h2 className="mb-4 text-sm font-semibold text-[#111827]">What happens next</h2>
          <div className="grid gap-3 sm:grid-cols-4">
            {ORDER_STATUS_STEPS.map(({ icon: Icon, label, sub }, i) => (
              <div key={label} className="rounded-xl bg-[#f3f4f6] p-3">
                <div className="mb-2 flex h-7 w-7 items-center justify-center rounded-full bg-[#111827] text-xs font-semibold text-white">{i + 1}</div>
                <Icon className="mb-1 h-4 w-4 text-[#C5A059]" />
                <p className="text-sm font-semibold text-[#111827]">{label}</p>
                <p className="mt-1 text-[11px] leading-4 text-[#6b7280]">{sub}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 text-center">
        <Link href="/" className={buttonVariants({ className: 'h-11 bg-[#111827] px-6 text-white hover:bg-[#111827]/85' })}>
          Back to browse
        </Link>
      </div>
    </div>
  )
}
