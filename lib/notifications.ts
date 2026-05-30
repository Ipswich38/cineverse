// Notification adapters — email + SMS.
//
// Providers are intentionally NOT chosen yet (decision deferred). Both adapters are
// env-gated: with no keys they safely no-op and log, so the rest of the flow works.
// To go live, fill the env vars and implement the marked fetch calls (suggested:
// Resend for email, Semaphore for SMS — both are simple REST APIs).

import type { Order, OrderItem } from '@/lib/supabase'
import { formatMoney } from '@/lib/storefront'

function isPlaceholder(value: string | undefined) {
  if (!value) return true
  const v = value.toLowerCase()
  return v.includes('xxxx') || v.includes('placeholder') || v.startsWith('your-')
}

export function hasEmailConfig() {
  return !isPlaceholder(process.env.EMAIL_PROVIDER_API_KEY)
}

export function hasSmsConfig() {
  return !isPlaceholder(process.env.SMS_PROVIDER_API_KEY)
}

interface SendResult {
  ok: boolean
  skipped?: boolean
  error?: string
}

export async function sendEmail(opts: { to: string; subject: string; text: string }): Promise<SendResult> {
  if (!opts.to) return { ok: false, error: 'missing recipient' }
  if (!hasEmailConfig()) {
    console.log(`[email:skipped] to=${opts.to} subject="${opts.subject}"`)
    return { ok: true, skipped: true }
  }

  try {
    // TODO(provider): implement once chosen. Example shape for Resend:
    // const res = await fetch('https://api.resend.com/emails', {
    //   method: 'POST',
    //   headers: { Authorization: `Bearer ${process.env.EMAIL_PROVIDER_API_KEY}`, 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ from: process.env.EMAIL_FROM, to: opts.to, subject: opts.subject, text: opts.text }),
    // })
    // if (!res.ok) throw new Error(`email provider ${res.status}`)
    console.log(`[email:sent] to=${opts.to} subject="${opts.subject}"`)
    return { ok: true }
  } catch (err) {
    console.error('[email:error]', err)
    return { ok: false, error: err instanceof Error ? err.message : 'email failed' }
  }
}

export async function sendSms(opts: { to: string; message: string }): Promise<SendResult> {
  if (!opts.to) return { ok: false, error: 'missing recipient' }
  if (!hasSmsConfig()) {
    console.log(`[sms:skipped] to=${opts.to} message="${opts.message.slice(0, 40)}..."`)
    return { ok: true, skipped: true }
  }

  try {
    // TODO(provider): implement once chosen. Example shape for Semaphore:
    // const res = await fetch('https://api.semaphore.co/api/v4/messages', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ apikey: process.env.SMS_PROVIDER_API_KEY, number: opts.to, message: opts.message, sendername: process.env.SMS_SENDER_NAME }),
    // })
    // if (!res.ok) throw new Error(`sms provider ${res.status}`)
    console.log(`[sms:sent] to=${opts.to}`)
    return { ok: true }
  } catch (err) {
    console.error('[sms:error]', err)
    return { ok: false, error: err instanceof Error ? err.message : 'sms failed' }
  }
}

function bookingRef(orderId: string) {
  return orderId.slice(0, 8).toUpperCase()
}

// Renter confirmation: downpayment received, booking reserved.
export async function notifyCustomerBookingPaid(order: Order, items: OrderItem[]) {
  const ref = bookingRef(order.id)
  const lines = items
    .map((it) => `• ${it.product_name} ×${it.quantity} for ${it.days} day(s)${it.with_operator ? ' + operator' : ''}`)
    .join('\n')

  const managed = order.logistics_method === 'managed'
  const logisticsLine = managed
    ? `\nCineVerse managed delivery (${formatMoney(order.logistics_fee ?? 0)}) is included — our logistics team will coordinate pickup, delivery, and return with you.`
    : `\nYou chose to handle pickup & return yourself — the gear owner(s) will reach out to coordinate.`

  const summary =
    `Booking #${ref} reserved!\n\n${lines}\n\n` +
    `Downpayment paid: ${formatMoney(order.downpayment_amount ?? 0)}\n` +
    (managed ? `  · includes managed delivery: ${formatMoney(order.logistics_fee ?? 0)}\n` : '') +
    `Balance due to owners on handover: ${formatMoney(order.balance_amount ?? 0)}\n` +
    (order.shoot_start_date ? `Shoot date: ${order.shoot_start_date}\n` : '') +
    logisticsLine

  await Promise.all([
    sendEmail({ to: order.customer_email, subject: `CineVerse booking #${ref} confirmed`, text: summary }),
    sendSms({ to: order.customer_phone, message: `CineVerse: booking #${ref} reserved. Downpayment ${formatMoney(order.downpayment_amount ?? 0)} received. Owner will contact you to coordinate.` }),
  ])
}

// Owner notification: their gear was booked + the renter's contact info (the handoff).
export async function notifyOwnersBookingPaid(order: Order, items: OrderItem[]) {
  const ref = bookingRef(order.id)

  // Group line items by owner (a booking can span multiple owners).
  const byOwner = new Map<string, { email: string; phone: string; lines: string[]; gearTotal: number }>()
  for (const it of items) {
    const key = it.owner_email || it.owner_name || 'unknown'
    const entry = byOwner.get(key) ?? { email: it.owner_email ?? '', phone: it.owner_phone ?? '', lines: [], gearTotal: 0 }
    entry.lines.push(`• ${it.product_name} ×${it.quantity} for ${it.days} day(s)${it.with_operator ? ' + operator' : ''} — ${formatMoney(it.line_total)}`)
    entry.gearTotal += it.line_total
    byOwner.set(key, entry)
  }

  const managed = order.logistics_method === 'managed'
  const logisticsLine = managed
    ? `The renter chose CineVerse managed delivery — our logistics team will contact you to schedule pickup of your gear and handle delivery to the renter and the return to you.`
    : `The renter will coordinate pickup and return with you directly.`

  await Promise.all(
    [...byOwner.values()].map((owner) => {
      const text =
        `You have a new CineVerse booking (#${ref}).\n\n` +
        `${owner.lines.join('\n')}\n\n` +
        `Booking value (your gear): ${formatMoney(owner.gearTotal)}\n` +
        (order.shoot_start_date ? `Shoot date: ${order.shoot_start_date}\n` : '') +
        `\nThe renter has paid their downpayment. ${logisticsLine}\n` +
        `Please arrange the remaining balance with the renter.\n\n` +
        `Renter contact:\n` +
        `Name: ${order.customer_name}\n` +
        `Phone: ${order.customer_phone}\n` +
        `Email: ${order.customer_email}\n` +
        (order.notes ? `Notes: ${order.notes}\n` : '')

      return Promise.all([
        sendEmail({ to: owner.email, subject: `New CineVerse booking #${ref} — coordinate with renter`, text }),
        sendSms({ to: owner.phone, message: `CineVerse: new booking #${ref}. Renter ${order.customer_name} (${order.customer_phone}) paid downpayment. Check email to coordinate.` }),
      ])
    })
  )
}
