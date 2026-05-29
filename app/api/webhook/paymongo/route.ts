import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { hasPaymongoWebhookConfig, verifyWebhookSignature } from '@/lib/paymongo'
import { notifyCustomerBookingPaid, notifyOwnersBookingPaid } from '@/lib/notifications'
import type { Order, OrderItem } from '@/lib/supabase'

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

    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .update({
        status: 'paid',
        fulfillment_status: 'to_pack',
        paymongo_payment_id: paymentId ?? null,
        paid_at: new Date().toISOString(),
      })
      .eq('paymongo_session_id', checkoutId)
      .eq('status', 'pending') // idempotent: only act on the first paid event
      .select('*')
      .single()

    if (error) {
      // No pending booking matched (already processed, or unknown session) — ack and move on.
      console.warn('[webhook] no pending booking for session:', checkoutId, error.message)
      return NextResponse.json({ received: true })
    }

    if (order?.id) {
      const { data: itemsData, error: itemsError } = await supabaseAdmin
        .from('order_items')
        .select('*')
        .eq('order_id', order.id)

      if (itemsError) console.error('[webhook] fetch items failed:', itemsError.message)

      const booking = order as Order
      const items = (itemsData as OrderItem[] | null) ?? []

      // Confirm to the renter and hand off contact details to each gear owner.
      try {
        await Promise.all([
          notifyCustomerBookingPaid(booking, items),
          notifyOwnersBookingPaid(booking, items),
        ])
        await supabaseAdmin
          .from('orders')
          .update({ owner_notified_at: new Date().toISOString() })
          .eq('id', order.id)
      } catch (notifyErr) {
        console.error('[webhook] notification failed:', notifyErr)
      }
    }
  }

  return NextResponse.json({ received: true })
}
