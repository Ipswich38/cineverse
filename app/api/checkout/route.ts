import { NextRequest, NextResponse } from 'next/server'
import { hasSupabaseAdminConfig, supabaseAdmin } from '@/lib/supabase'
import { createCheckoutSession, hasPaymongoConfig, resolvePaymentMethodTypes } from '@/lib/paymongo'
import { DOWNPAYMENT_PCT, LOGISTICS_FEE_PER_OWNER } from '@/lib/cart-store'
import type { CartItem, LogisticsMethod } from '@/lib/cart-store'
import type { Product } from '@/lib/supabase'

const MAX_ITEM_QUANTITY = 99
const MAX_DAYS = 365

interface CheckoutCustomer {
  name: string
  email: string
  phone: string
}

interface CheckoutDetails {
  shootStartDate?: string
  notes?: string
  logisticsMethod?: LogisticsMethod
  paymentMethod?: 'paymongo_all' | 'gcash' | 'maya' | 'grab_pay' | 'card'
}

function normalizeCustomer(customer: CheckoutCustomer) {
  return {
    name: customer.name?.trim(),
    email: customer.email?.trim().toLowerCase(),
    phone: customer.phone?.trim(),
  }
}

function validateCheckoutInput(customer: CheckoutCustomer, items: CartItem[]) {
  const normalizedCustomer = normalizeCustomer(customer)

  if (!normalizedCustomer.name || !normalizedCustomer.email || !normalizedCustomer.phone) {
    throw new Error('Please complete your name, email, and phone')
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedCustomer.email)) {
    throw new Error('Please enter a valid email address')
  }

  if (!items?.length) {
    throw new Error('Your cart is empty')
  }

  for (const item of items) {
    if (!item.id || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > MAX_ITEM_QUANTITY) {
      throw new Error('Cart contains an invalid quantity')
    }
    if (!Number.isInteger(item.days) || item.days < 1 || item.days > MAX_DAYS) {
      throw new Error('Cart contains an invalid rental duration')
    }
  }

  return normalizedCustomer
}

export async function POST(req: NextRequest) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
    if (!baseUrl) {
      return NextResponse.json({ error: 'Checkout is not configured' }, { status: 503 })
    }

    if (!hasSupabaseAdminConfig()) {
      return NextResponse.json({ error: 'Checkout needs real Supabase keys before accepting bookings' }, { status: 503 })
    }

    if (!hasPaymongoConfig()) {
      return NextResponse.json({ error: 'Checkout needs a real PayMongo secret key before accepting payments' }, { status: 503 })
    }

    const { customer, checkout, items }: { customer: CheckoutCustomer; checkout?: CheckoutDetails; items: CartItem[] } = await req.json()
    const normalizedCustomer = validateCheckoutInput(customer, items)
    const paymentMethod = checkout?.paymentMethod ?? 'paymongo_all'
    const logisticsMethod: LogisticsMethod = checkout?.logisticsMethod === 'managed' ? 'managed' : 'self'
    const shootStartDate = checkout?.shootStartDate?.trim() || null
    const notes = checkout?.notes?.trim() || null

    // Re-fetch listings and price everything server-side (never trust client amounts).
    const productIds = [...new Set(items.map((item) => item.id))]
    const { data: products, error: productsError } = await supabaseAdmin
      .from('products')
      .select('id, name, slug, price, image_url, stock, category, tags, is_active, owner_name, owner_email, owner_phone, operator_available, operator_day_rate')
      .in('id', productIds)
      .eq('is_active', true)

    if (productsError) throw new Error(productsError.message)

    const productsById = new Map((products as Product[] | null)?.map((product) => [product.id, product]) ?? [])

    const pricedItems = items.map((item) => {
      const product = productsById.get(item.id)
      if (!product) throw new Error(`${item.name} is no longer available`)
      if (product.stock < item.quantity) throw new Error(`${product.name} only has ${product.stock} unit(s) available`)

      const dailyRate = Number(product.price)
      const days = item.days
      const quantity = item.quantity
      const rental = dailyRate * quantity * days

      const withOperator = Boolean(item.withOperator && product.operator_available)
      const operatorDayRate = withOperator ? Number(product.operator_day_rate ?? 0) : 0
      const operatorFee = withOperator ? operatorDayRate * days : 0

      return {
        product_id: product.id,
        product_name: product.name,
        quantity,
        days,
        daily_rate: dailyRate,
        unit_price: dailyRate,
        with_operator: withOperator,
        operator_day_rate: withOperator ? operatorDayRate : null,
        operator_fee: operatorFee,
        line_total: rental + operatorFee,
        owner_name: product.owner_name ?? null,
        owner_email: product.owner_email ?? null,
        owner_phone: product.owner_phone ?? null,
        rental,
      }
    })

    if (pricedItems.length !== items.length) {
      return NextResponse.json({ error: 'Cart contains unavailable gear' }, { status: 400 })
    }

    const subtotal = pricedItems.reduce((sum, item) => sum + item.rental, 0)
    const operatorTotal = pricedItems.reduce((sum, item) => sum + item.operator_fee, 0)
    const total = subtotal + operatorTotal
    const gearDownpayment = Math.round(total * DOWNPAYMENT_PCT)
    // Managed logistics: ₱600 round-trip per distinct owner (each is a separate pickup/return).
    const ownerCount = new Set(pricedItems.map((item) => item.owner_email || item.owner_name || item.product_id)).size
    const logisticsFee = logisticsMethod === 'managed' ? LOGISTICS_FEE_PER_OWNER * ownerCount : 0
    // Renter pays the gear downpayment plus the full logistics fee now; balance (gear) is owed to the owner.
    const downpayment = gearDownpayment + logisticsFee
    const balance = total - gearDownpayment
    const maxDays = Math.max(...pricedItems.map((item) => item.days))

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        customer_name: normalizedCustomer.name,
        customer_email: normalizedCustomer.email,
        customer_phone: normalizedCustomer.phone,
        shoot_start_date: shootStartDate,
        rental_days: maxDays,
        notes,
        subtotal,
        operator_total: operatorTotal,
        total_amount: total,
        downpayment_pct: DOWNPAYMENT_PCT,
        downpayment_amount: downpayment,
        balance_amount: balance,
        logistics_method: logisticsMethod,
        logistics_fee: logisticsFee,
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
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        days: item.days,
        daily_rate: item.daily_rate,
        unit_price: item.unit_price,
        with_operator: item.with_operator,
        operator_day_rate: item.operator_day_rate,
        operator_fee: item.operator_fee,
        line_total: item.line_total,
        owner_name: item.owner_name,
        owner_email: item.owner_email,
        owner_phone: item.owner_phone,
      }))
    )

    if (orderItemsError) throw new Error(orderItemsError.message)

    // PayMongo charges only the 30% downpayment now. The full breakdown lives on the booking.
    const ref = order.id.slice(0, 8).toUpperCase()
    const gearSummary = pricedItems
      .map((item) => `${item.product_name} ×${item.quantity} (${item.days}d)${item.with_operator ? ' +op' : ''}`)
      .join(', ')

    const session = await createCheckoutSession({
      lineItems: [
        {
          name: `Reservation downpayment (30%) — Booking #${ref}`,
          amount: gearDownpayment,
          quantity: 1,
        },
        ...(logisticsFee > 0
          ? [{
              name: `Managed logistics (round-trip${ownerCount > 1 ? ` ×${ownerCount} owners` : ''})`,
              amount: logisticsFee,
              quantity: 1,
            }]
          : []),
      ],
      customer: {
        name: normalizedCustomer.name,
        email: normalizedCustomer.email,
        phone: normalizedCustomer.phone,
      },
      successUrl: `${baseUrl}/order-success?ref=${order.id}`,
      cancelUrl: `${baseUrl}/checkout`,
      orderId: order.id,
      paymentMethodTypes: resolvePaymentMethodTypes(paymentMethod),
    })

    const { error: sessionUpdateError } = await supabaseAdmin
      .from('orders')
      .update({ paymongo_session_id: session.id })
      .eq('id', order.id)

    if (sessionUpdateError) throw new Error(sessionUpdateError.message)

    return NextResponse.json({ checkoutUrl: session.attributes.checkout_url, ref, gearSummary })
  } catch (err) {
    console.error('[checkout]', err)
    const message = err instanceof Error ? err.message : 'Internal error'
    const status = /cart|available|stock|unit|email|name|phone|duration|empty/i.test(message) ? 400 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
