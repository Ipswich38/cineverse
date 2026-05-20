import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyWebhookSignature } from '@/lib/paymongo'

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature = req.headers.get('paymongo-signature') ?? ''

  const secret = process.env.PAYMONGO_WEBHOOK_SECRET!
  if (!verifyWebhookSignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const event = JSON.parse(rawBody)
  const type = event?.data?.attributes?.type

  if (type === 'checkout_session.payment.paid') {
    const sessionId = event.data.attributes.data?.attributes?.metadata?.order_id

    // Look up order by paymongo_session_id
    const checkoutId = event.data.attributes.data?.id
    const paymentId = event.data.attributes.data?.attributes?.payments?.[0]?.id

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
