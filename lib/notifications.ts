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

const APP_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://www.cineverse.store'

// Renter confirmation: reservation (30% + logistics) received; 70% balance collected by CineVerse.
export async function notifyCustomerBookingPaid(order: Order, items: OrderItem[]) {
  const ref = bookingRef(order.id)
  const lines = items
    .map((it) => `• ${it.product_name} ×${it.quantity} for ${it.days} day(s)${it.with_operator ? ' + operator' : ''}`)
    .join('\n')

  const managed = order.logistics_method === 'managed'
  const balance = order.balance_amount ?? 0
  const balanceLink = `${APP_URL}/booking/${order.id}`
  const logisticsLine = managed
    ? `\nCineVerse managed delivery (${formatMoney(order.logistics_fee ?? 0)}) is included — we'll coordinate pickup, delivery, and return with you.`
    : `\nYou chose to handle pickup & return yourself — the gear owner(s) will coordinate the handover with you.`

  const summary =
    `Booking #${ref} reserved!\n\n${lines}\n\n` +
    `Reservation paid: ${formatMoney(order.downpayment_amount ?? 0)}` +
    (managed ? ` (incl. managed delivery ${formatMoney(order.logistics_fee ?? 0)})` : '') + `\n` +
    `Remaining balance (70%): ${formatMoney(balance)}\n` +
    `Pay your balance securely through CineVerse before handover:\n${balanceLink}\n` +
    (order.shoot_start_date ? `Shoot date: ${order.shoot_start_date}\n` : '') +
    logisticsLine

  await Promise.all([
    sendEmail({ to: order.customer_email, subject: `CineVerse booking #${ref} confirmed`, text: summary }),
    sendSms({ to: order.customer_phone, message: `CineVerse: booking #${ref} reserved. Pay your ${formatMoney(balance)} balance before handover: ${balanceLink}` }),
  ])
}

// Group booking line items by owner with per-owner economics.
function ownersFromItems(order: Order, items: OrderItem[]) {
  const pct = order.commission_pct ?? 0.15
  const byOwner = new Map<string, { email: string; phone: string; lines: string[]; gearTotal: number }>()
  for (const it of items) {
    const key = it.owner_email || it.owner_name || 'unknown'
    const entry = byOwner.get(key) ?? { email: it.owner_email ?? '', phone: it.owner_phone ?? '', lines: [], gearTotal: 0 }
    entry.lines.push(`• ${it.product_name} ×${it.quantity} for ${it.days} day(s)${it.with_operator ? ' + operator' : ''} — ${formatMoney(it.line_total)}`)
    entry.gearTotal += it.line_total
    byOwner.set(key, entry)
  }
  return [...byOwner.values()].map((o) => {
    const commission = Math.round(o.gearTotal * pct)
    return { ...o, commission, payout: o.gearTotal - commission, pct }
  })
}

// Owner notification at reservation: gear booked + their payout (paid by CineVerse after return).
// Renter contact is shared only on self-pickup; on managed logistics CineVerse brokers everything.
export async function notifyOwnersBookingPaid(order: Order, items: OrderItem[]) {
  const ref = bookingRef(order.id)
  const managed = order.logistics_method === 'managed'
  const logisticsLine = managed
    ? `The renter chose CineVerse managed delivery — our logistics team will contact you to schedule pickup, and we handle delivery to the renter and the return to you.`
    : `The renter will coordinate pickup and return with you directly.`

  await Promise.all(
    ownersFromItems(order, items).map((owner) => {
      const contactBlock = managed
        ? `CineVerse coordinates all pickup, delivery, and return — no logistics action needed from you.\n`
        : `Renter contact (to coordinate pickup/return):\n` +
          `Name: ${order.customer_name}\nPhone: ${order.customer_phone}\nEmail: ${order.customer_email}\n` +
          (order.notes ? `Notes: ${order.notes}\n` : '')

      const text =
        `You have a new CineVerse booking (#${ref}).\n\n` +
        `${owner.lines.join('\n')}\n\n` +
        `Your gear subtotal: ${formatMoney(owner.gearTotal)}\n` +
        `CineVerse commission (${Math.round(owner.pct * 100)}%): −${formatMoney(owner.commission)}\n` +
        `Your payout: ${formatMoney(owner.payout)} — paid by CineVerse after the gear is returned.\n` +
        (order.shoot_start_date ? `Shoot date: ${order.shoot_start_date}\n` : '') +
        `\n${logisticsLine}\n\n${contactBlock}`

      return Promise.all([
        sendEmail({ to: owner.email, subject: `New CineVerse booking #${ref}`, text }),
        sendSms({ to: owner.phone, message: `CineVerse: new booking #${ref}. Your payout ${formatMoney(owner.payout)} (after return). Check email for details.` }),
      ])
    })
  )
}

// Both sides once the 70% balance clears and the booking is fully funded.
export async function notifyBalancePaid(order: Order, items: OrderItem[]) {
  const ref = bookingRef(order.id)
  const managed = order.logistics_method === 'managed'

  const renterText =
    `Booking #${ref} is fully paid — you're all set!\n\n` +
    (managed
      ? `We'll deliver your gear${order.shoot_start_date ? ` for your shoot on ${order.shoot_start_date}` : ''} and collect it after.`
      : `Coordinate final pickup with the owner(s)${order.shoot_start_date ? ` for ${order.shoot_start_date}` : ''}.`)

  const ownerSends = ownersFromItems(order, items).flatMap((owner) => {
    const text =
      `Booking #${ref} is now fully funded by the renter.\n\n` +
      `Your payout of ${formatMoney(owner.payout)} will be released by CineVerse after the gear is returned.\n` +
      (managed ? `CineVerse will handle pickup, delivery, and return.\n` : `Coordinate the handover with the renter as arranged.\n`)
    return [
      sendEmail({ to: owner.email, subject: `CineVerse booking #${ref} fully funded — payout scheduled`, text }),
      sendSms({ to: owner.phone, message: `CineVerse: booking #${ref} fully funded. Payout ${formatMoney(owner.payout)} after return.` }),
    ]
  })

  await Promise.all([
    sendEmail({ to: order.customer_email, subject: `CineVerse booking #${ref} fully paid`, text: renterText }),
    sendSms({ to: order.customer_phone, message: `CineVerse: booking #${ref} fully paid. You're all set!` }),
    ...ownerSends,
  ])
}

// Purchase confirmation (buy): paid in full → CineVerse delivers; sellers paid after delivery.
export async function notifyPurchasePaid(order: Order, items: OrderItem[]) {
  const ref = bookingRef(order.id)
  const lines = items.map((it) => `• ${it.product_name} ×${it.quantity} — ${formatMoney(it.line_total)}`).join('\n')

  const renterText =
    `Order #${ref} confirmed — thank you!\n\n${lines}\n\n` +
    `Paid: ${formatMoney(order.downpayment_amount ?? 0)} (incl. delivery ${formatMoney(order.logistics_fee ?? 0)})\n` +
    (order.customer_address ? `Deliver to: ${order.customer_address}\n` : '') +
    `\nCineVerse will deliver your gear and coordinate the schedule with you.`

  const ownerSends = ownersFromItems(order, items).flatMap((owner) => {
    const text =
      `You sold gear on CineVerse (order #${ref}).\n\n${owner.lines.join('\n')}\n\n` +
      `Sale subtotal: ${formatMoney(owner.gearTotal)}\n` +
      `CineVerse commission (${Math.round(owner.pct * 100)}%): −${formatMoney(owner.commission)}\n` +
      `Your payout: ${formatMoney(owner.payout)} — paid by CineVerse after the item is delivered.\n\n` +
      `CineVerse will arrange pickup from you and deliver to the buyer.`
    return [
      sendEmail({ to: owner.email, subject: `Sold on CineVerse — order #${ref}`, text }),
      sendSms({ to: owner.phone, message: `CineVerse: item sold (order #${ref}). Payout ${formatMoney(owner.payout)} after delivery. We'll arrange pickup.` }),
    ]
  })

  await Promise.all([
    sendEmail({ to: order.customer_email, subject: `CineVerse order #${ref} confirmed`, text: renterText }),
    sendSms({ to: order.customer_phone, message: `CineVerse: order #${ref} confirmed. We'll deliver your gear soon!` }),
    ...ownerSends,
  ])
}
