import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { hasPaymongoWebhookConfig, verifyWebhookSignature } from '@/lib/paymongo'
import { notifyCustomerBookingPaid, notifyOwnersBookingPaid, notifyBalancePaid, notifyPurchasePaid } from '@/lib/notifications'
import { COMMISSION_PCT } from '@/lib/cart-store'
import type { Order, OrderItem } from '@/lib/supabase'

// On full funding, write one payout ledger row per owner (released to them after return).
async function createPayouts(order: Order, items: OrderItem[]) {
  const pct = order.commission_pct ?? COMMISSION_PCT
  const byOwner = new Map<string, { name: string | null; email: string | null; phone: string | null; gear: number }>()
  for (const it of items) {
    const key = it.owner_email || it.owner_name || 'unknown'
    const e = byOwner.get(key) ?? { name: it.owner_name ?? null, email: it.owner_email ?? null, phone: it.owner_phone ?? null, gear: 0 }
    e.gear += Number(it.line_total)
    byOwner.set(key, e)
  }
  const rows = [...byOwner.values()].map((o) => {
    const commission = Math.round(o.gear * pct)
    return {
      order_id: order.id,
      owner_name: o.name,
      owner_email: o.email,
      owner_phone: o.phone,
      gear_total: o.gear,
      commission,
      amount: o.gear - commission,
      status: 'pending' as const,
    }
  })
  if (rows.length) await supabaseAdmin.from('payouts').insert(rows)
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature = req.headers.get('paymongo-signature') ?? ''

  if (!hasPaymongoWebhookConfig()) {
    console.error('[webhook] Missing PAYMONGO_WEBHOOK_SECRET')
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 })
  }
  const secret = process.env.PAYMONGO_WEBHOOK_SECRET!

  if (!verifyWebhookSignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let event: unknown
  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const data = event as {
    data?: {
      attributes?: {
        type?: string
        data?: {
          id?: string
          attributes?: {
            payments?: Array<{ id?: string }>
          }
        }
      }
    }
  }
  const type = data.data?.attributes?.type

  if (type === 'checkout_session.payment.paid') {
    const checkoutId = data.data?.attributes?.data?.id
    const paymentId = data.data?.attributes?.data?.attributes?.payments?.[0]?.id

    if (!checkoutId) {
      return NextResponse.json({ error: 'Missing checkout session id' }, { status: 400 })
    }

    // 1) Reservation payment (30% + logistics) — first installment.
    const { data: reservation } = await supabaseAdmin
      .from('orders')
      .update({
        status: 'paid',
        fulfillment_status: 'to_pack',
        paymongo_payment_id: paymentId ?? null,
        paid_at: new Date().toISOString(),
      })
      .eq('paymongo_session_id', checkoutId)
      .eq('status', 'pending') // idempotent: only the first paid event acts
      .select('*')
      .single()

    if (reservation?.id) {
      const { data: itemsData } = await supabaseAdmin.from('order_items').select('*').eq('order_id', reservation.id)
      const booking = reservation as Order
      const items = (itemsData as OrderItem[] | null) ?? []
      try {
        if (booking.order_kind === 'purchase') {
          // Purchase is paid in full now → fund seller payouts (released after delivery) + confirm.
          await createPayouts(booking, items)
          await notifyPurchasePaid(booking, items)
        } else {
          await Promise.all([notifyCustomerBookingPaid(booking, items), notifyOwnersBookingPaid(booking, items)])
        }
        await supabaseAdmin.from('orders').update({ owner_notified_at: new Date().toISOString() }).eq('id', reservation.id)
      } catch (notifyErr) {
        console.error('[webhook] reservation/purchase handling failed:', notifyErr)
      }
      return NextResponse.json({ received: true })
    }

    // 2) Balance payment (70%) — second installment, fully funds the booking.
    const { data: balanceOrder } = await supabaseAdmin
      .from('orders')
      .update({ balance_paid_at: new Date().toISOString(), balance_payment_id: paymentId ?? null })
      .eq('balance_session_id', checkoutId)
      .is('balance_paid_at', null) // idempotent
      .select('*')
      .single()

    if (balanceOrder?.id) {
      const { data: itemsData } = await supabaseAdmin.from('order_items').select('*').eq('order_id', balanceOrder.id)
      const booking = balanceOrder as Order
      const items = (itemsData as OrderItem[] | null) ?? []
      try {
        await createPayouts(booking, items) // ledger rows owed to owners (released after return)
        await notifyBalancePaid(booking, items)
      } catch (balanceErr) {
        console.error('[webhook] balance handling failed:', balanceErr)
      }
      return NextResponse.json({ received: true })
    }

    console.warn('[webhook] no matching booking for session:', checkoutId)
  }

  return NextResponse.json({ received: true })
}
