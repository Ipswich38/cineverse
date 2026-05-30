import { NextRequest, NextResponse } from 'next/server'
import { hasSupabaseAdminConfig, supabaseAdmin, type Order } from '@/lib/supabase'
import { createCheckoutSession, hasPaymongoConfig, resolvePaymentMethodTypes } from '@/lib/paymongo'

// Renter pays the remaining 70% rental balance through CineVerse (collected before handover).
export async function POST(req: NextRequest) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
    if (!baseUrl) return NextResponse.json({ error: 'Not configured' }, { status: 503 })
    if (!hasSupabaseAdminConfig()) return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 })
    if (!hasPaymongoConfig()) return NextResponse.json({ error: 'PayMongo not configured' }, { status: 503 })

    const { bookingId } = await req.json()
    if (!bookingId || !/^[0-9a-f-]{36}$/i.test(bookingId)) {
      return NextResponse.json({ error: 'Invalid booking' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin.from('orders').select('*').eq('id', bookingId).single()
    if (error || !data) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

    const order = data as Order
    if (order.status !== 'paid') {
      return NextResponse.json({ error: 'Reservation is not confirmed yet' }, { status: 409 })
    }
    if (order.balance_paid_at) {
      return NextResponse.json({ error: 'Balance is already paid' }, { status: 409 })
    }
    const balance = Number(order.balance_amount ?? 0)
    if (balance <= 0) return NextResponse.json({ error: 'Nothing left to pay' }, { status: 409 })

    const ref = order.id.slice(0, 8).toUpperCase()
    const session = await createCheckoutSession({
      lineItems: [{ name: `Rental balance (70%) — Booking #${ref}`, amount: balance, quantity: 1 }],
      customer: {
        name: order.customer_name,
        email: order.customer_email,
        phone: order.customer_phone,
      },
      successUrl: `${baseUrl}/booking/${order.id}?paid=1`,
      cancelUrl: `${baseUrl}/booking/${order.id}`,
      orderId: order.id,
      paymentMethodTypes: resolvePaymentMethodTypes(order.payment_method ?? 'paymongo_all'),
    })

    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({ balance_session_id: session.id })
      .eq('id', order.id)
    if (updateError) throw new Error(updateError.message)

    return NextResponse.json({ checkoutUrl: session.attributes.checkout_url })
  } catch (err) {
    console.error('[balance]', err)
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
