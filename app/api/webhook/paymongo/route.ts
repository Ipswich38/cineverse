import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyWebhookSignature } from '@/lib/paymongo'

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature = req.headers.get('paymongo-signature') ?? ''

  const secret = process.env.PAYMONGO_WEBHOOK_SECRET
  if (!secret) {
    console.error('[webhook] Missing PAYMONGO_WEBHOOK_SECRET')
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
  }

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

    const { error } = await supabaseAdmin
      .from('orders')
      .update({
        status: 'paid',
        paymongo_payment_id: paymentId ?? null,
      })
      .eq('paymongo_session_id', checkoutId)

    if (error) console.error('[webhook] update failed:', error.message)
  }

  return NextResponse.json({ received: true })
}
