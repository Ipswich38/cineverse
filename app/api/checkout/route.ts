import { NextRequest, NextResponse } from 'next/server'
import { hasSupabaseAdminConfig, supabaseAdmin } from '@/lib/supabase'
import { createCheckoutSession } from '@/lib/paymongo'
import type { CartItem } from '@/lib/cart-store'
import type { Product } from '@/lib/supabase'

const FREE_SHIPPING_THRESHOLD = 1500
const STANDARD_SHIPPING_FEE = 120
const EXPRESS_SHIPPING_FEE = 220
const MAX_ITEM_QUANTITY = 99

interface CheckoutCustomer {
  name: string
  email: string
  phone: string
  address: string
}

interface CheckoutDetails {
  billingAddress?: string
  deliveryMethod?: 'standard' | 'express'
  paymentMethod?: 'paymongo_all' | 'gcash' | 'card'
}

function normalizeCustomer(customer: CheckoutCustomer) {
  return {
    name: customer.name?.trim(),
    email: customer.email?.trim().toLowerCase(),
    phone: customer.phone?.trim(),
    address: customer.address?.trim(),
  }
}

function validateCheckoutInput(customer: CheckoutCustomer, items: CartItem[]) {
  const normalizedCustomer = normalizeCustomer(customer)

  if (!normalizedCustomer.name || !normalizedCustomer.email || !normalizedCustomer.phone || !normalizedCustomer.address) {
    throw new Error('Please complete all customer fields')
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedCustomer.email)) {
    throw new Error('Please enter a valid email address')
  }

  if (!items?.length) {
    throw new Error('Cart is empty')
  }

  for (const item of items) {
    if (!item.id || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > MAX_ITEM_QUANTITY) {
      throw new Error('Cart contains an invalid item quantity')
    }
  }

  return normalizedCustomer
}

function getShippingFee(subtotal: number, deliveryMethod: CheckoutDetails['deliveryMethod']) {
  if (deliveryMethod === 'express') return EXPRESS_SHIPPING_FEE
  return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING_FEE
}

export async function POST(req: NextRequest) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
    if (!baseUrl) {
      return NextResponse.json({ error: 'Checkout is not configured' }, { status: 503 })
    }

    if (!hasSupabaseAdminConfig()) {
      return NextResponse.json({ error: 'Checkout needs real Supabase keys before accepting orders' }, { status: 503 })
    }

    const { customer, checkout, items }: { customer: CheckoutCustomer; checkout?: CheckoutDetails; items: CartItem[] } = await req.json()
    const normalizedCustomer = validateCheckoutInput(customer, items)
    const deliveryMethod = checkout?.deliveryMethod === 'express' ? 'express' : 'standard'
    const paymentMethod = checkout?.paymentMethod ?? 'paymongo_all'
    const billingAddress = checkout?.billingAddress?.trim() || normalizedCustomer.address

    const productIds = [...new Set(items.map((item) => item.id))]
    const { data: products, error: productsError } = await supabaseAdmin
      .from('products')
      .select('id, name, slug, price, image_url, stock, category, tags, is_active')
      .in('id', productIds)
      .eq('is_active', true)

    if (productsError) throw new Error(productsError.message)

    const productsById = new Map((products as Product[] | null)?.map((product) => [product.id, product]) ?? [])
    const pricedItems = items.map((item) => {
      const product = productsById.get(item.id)
      if (!product) throw new Error(`${item.name} is no longer available`)
      if (product.stock < item.quantity) throw new Error(`${product.name} only has ${product.stock} left`)

      return {
        id: product.id,
        name: product.name,
        slug: product.slug,
        price: Number(product.price),
        image_url: product.image_url,
        quantity: item.quantity,
      }
    })

    if (pricedItems.length !== items.length) {
      return NextResponse.json({ error: 'Cart contains unavailable products' }, { status: 400 })
    }

    const subtotal = pricedItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
    const shippingFee = getShippingFee(subtotal, deliveryMethod)
    const total = subtotal + shippingFee

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        customer_name: normalizedCustomer.name,
        customer_email: normalizedCustomer.email,
        customer_phone: normalizedCustomer.phone,
        customer_address: normalizedCustomer.address,
        billing_address: billingAddress,
        total_amount: total,
        shipping_fee: shippingFee,
        shipping_method: deliveryMethod,
        payment_method: paymentMethod,
        status: 'pending',
        fulfillment_status: 'awaiting_payment',
      })
      .select()
      .single()

    if (orderError) throw new Error(orderError.message)

    const { error: orderItemsError } = await supabaseAdmin.from('order_items').insert(
      pricedItems.map((item) => ({
        order_id: order.id,
        product_id: item.id,
        product_name: item.name,
        quantity: item.quantity,
        unit_price: item.price,
      }))
    )

    if (orderItemsError) throw new Error(orderItemsError.message)

    const session = await createCheckoutSession({
      lineItems: [
        ...pricedItems.map((item) => ({
          name: item.name,
          amount: item.price,
          quantity: item.quantity,
          image_url: item.image_url,
        })),
        ...(shippingFee > 0
          ? [{
              name: deliveryMethod === 'express' ? 'Express Shipping' : 'Standard Shipping',
              amount: shippingFee,
              quantity: 1,
            }]
          : []),
      ],
      customer: {
        name: normalizedCustomer.name,
        email: normalizedCustomer.email,
        phone: normalizedCustomer.phone,
      },
      successUrl: `${baseUrl}/order-success`,
      cancelUrl: `${baseUrl}/checkout`,
      orderId: order.id,
    })

    const { error: sessionUpdateError } = await supabaseAdmin
      .from('orders')
      .update({ paymongo_session_id: session.id })
      .eq('id', order.id)

    if (sessionUpdateError) throw new Error(sessionUpdateError.message)

    return NextResponse.json({ checkoutUrl: session.attributes.checkout_url })
  } catch (err) {
    console.error('[checkout]', err)
    const message = err instanceof Error ? err.message : 'Internal error'
    const status = /cart|available|stock|left|email|customer|quantity|fields/i.test(message) ? 400 : 500
    return NextResponse.json(
      { error: message },
      { status }
    )
  }
}
