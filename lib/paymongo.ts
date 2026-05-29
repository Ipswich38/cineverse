import { createHmac, timingSafeEqual } from 'crypto'

const BASE_URL = 'https://api.paymongo.com/v1'

// PayMongo payment_method_types accepted by Checkout Sessions.
// e-wallets: gcash (GCash), paymaya (Maya), grab_pay (GrabPay).
export type PaymentMethodType = 'card' | 'gcash' | 'paymaya' | 'grab_pay'

// Buyer-facing preference (from checkout UI) -> PayMongo method types shown on the hosted page.
export const PAYMENT_METHOD_MAP: Record<string, PaymentMethodType[]> = {
  paymongo_all: ['card', 'gcash', 'paymaya', 'grab_pay'],
  gcash: ['gcash'],
  maya: ['paymaya'],
  grab_pay: ['grab_pay'],
  card: ['card'],
}

export function resolvePaymentMethodTypes(preference?: string): PaymentMethodType[] {
  return PAYMENT_METHOD_MAP[preference ?? 'paymongo_all'] ?? PAYMENT_METHOD_MAP.paymongo_all
}

function isPlaceholder(value: string | undefined) {
  if (!value) return true
  const v = value.toLowerCase()
  return v.includes('xxxx') || v.includes('placeholder') || v.startsWith('your-')
}

export function hasPaymongoConfig() {
  return !isPlaceholder(process.env.PAYMONGO_SECRET_KEY)
}

export function hasPaymongoWebhookConfig() {
  return !isPlaceholder(process.env.PAYMONGO_WEBHOOK_SECRET)
}

function authHeader() {
  const key = process.env.PAYMONGO_SECRET_KEY
  if (!key) throw new Error('Missing PAYMONGO_SECRET_KEY')
  return `Basic ${Buffer.from(`${key}:`).toString('base64')}`
}

export interface LineItem {
  name: string
  amount: number
  quantity: number
  image_url?: string
}

export interface CheckoutCustomer {
  name: string
  email: string
  phone?: string
}

export async function createCheckoutSession({
  lineItems,
  customer,
  successUrl,
  cancelUrl,
  orderId,
  paymentMethodTypes,
}: {
  lineItems: LineItem[]
  customer: CheckoutCustomer
  successUrl: string
  cancelUrl: string
  orderId: string
  paymentMethodTypes?: PaymentMethodType[]
}) {
  const res = await fetch(`${BASE_URL}/checkout_sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authHeader(),
    },
    body: JSON.stringify({
      data: {
        attributes: {
          billing: {
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
          },
          line_items: lineItems.map((item) => ({
            currency: 'PHP',
            amount: Math.round(item.amount * 100), // convert to centavos
            name: item.name,
            quantity: item.quantity,
            images: item.image_url ? [item.image_url] : [],
          })),
          payment_method_types: paymentMethodTypes ?? PAYMENT_METHOD_MAP.paymongo_all,
          success_url: successUrl,
          cancel_url: cancelUrl,
          description: `Order #${orderId.slice(0, 8).toUpperCase()}`,
          metadata: { order_id: orderId },
        },
      },
    }),
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.errors?.[0]?.detail ?? 'PayMongo error')
  return data.data
}

export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string,
  secret: string
): boolean {
  const parts = Object.fromEntries(
    signatureHeader.split(',').map((part) => {
      const [key, ...value] = part.trim().split('=')
      return [key, value.join('=')]
    })
  )
  const timestamp = parts['t']
  const signatures = [parts['te'], parts['li']].filter(Boolean)

  if (!timestamp || signatures.length === 0) return false

  const timestampSeconds = Number(timestamp)
  const nowSeconds = Math.floor(Date.now() / 1000)
  if (!Number.isFinite(timestampSeconds) || Math.abs(nowSeconds - timestampSeconds) > 300) {
    return false
  }

  const computed = createHmac('sha256', secret)
    .update(`${timestamp}.${rawBody}`)
    .digest('hex')

  return signatures.some((signature) => {
    const computedBuffer = Buffer.from(computed, 'hex')
    const signatureBuffer = Buffer.from(signature, 'hex')
    return (
      computedBuffer.length === signatureBuffer.length &&
      timingSafeEqual(computedBuffer, signatureBuffer)
    )
  })
}
