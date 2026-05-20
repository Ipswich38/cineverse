import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { createCheckoutSession } from '@/lib/paymongo'
import type { CartItem } from '@/lib/cart-store'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL!

export async function POST(req: NextRequest) {
  try {
    const { customer, items }: { customer: { name: string; email: string; phone: string; address: string }; items: CartItem[] } =
      await req.json()

    if (!items?.length) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })
    }

    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0)

    // Create order in Supabase
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        customer_name: customer.name,
        customer_email: customer.email,
        customer_phone: customer.phone,
        customer_address: customer.address,
        total_amount: total,
        status: 'pending',
      })
      .select()
      .single()

    if (orderError) throw new Error(orderError.message)

    // Insert order items
    await supabaseAdmin.from('order_items').insert(
      items.map((item) => ({
        order_id: order.id,
        product_id: item.id,
        product_name: item.name,
        quantity: item.quantity,
        unit_price: item.price,
      }))
    )

    // Create PayMongo checkout session
    const session = await createCheckoutSession({
      lineItems: items.map((item) => ({
        name: item.name,
        amount: item.price,
        quantity: item.quantity,
        image_url: item.image_url,
      })),
      customer: {
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
      },
      successUrl: `${BASE_URL}/order-success`,
      cancelUrl: `${BASE_URL}/checkout`,
      orderId: order.id,
    })

    // Save PayMongo session ID to order
    await supabaseAdmin
      .from('orders')
      .update({ paymongo_session_id: session.id })
      .eq('id', order.id)

    return NextResponse.json({ checkoutUrl: session.attributes.checkout_url })
  } catch (err) {
    console.error('[checkout]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}
