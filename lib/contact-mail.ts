// Contact-form mailer — sends through Zoho SMTP using the site's own mailbox
// (hello@vissionlink.com). Keeps email in one place (Zoho) — no extra provider/DNS.
//
// Required env (set in Vercel + .env.local):
//   ZOHO_SMTP_USER  = hello@vissionlink.com        (the Zoho mailbox)
//   ZOHO_SMTP_PASS  = <Zoho app-specific password> (Zoho → Security → App Passwords)
//   CONTACT_TO      = hello@vissionlink.com         (optional; defaults to ZOHO_SMTP_USER)
import nodemailer from 'nodemailer'

function isPlaceholder(v: string | undefined) {
  if (!v) return true
  const s = v.toLowerCase()
  return s.includes('xxxx') || s.includes('placeholder') || s.startsWith('your-')
}

export function hasContactMailConfig() {
  return !isPlaceholder(process.env.ZOHO_SMTP_USER) && !isPlaceholder(process.env.ZOHO_SMTP_PASS)
}

// Optional silent copy of every outgoing email to the owner's personal inbox(es).
// Set MAIL_BCC in the env to a comma-separated list (e.g. "a@x.com,b@y.com").
// BCC keeps the recipients hidden from the customer. Empty → no copy.
export function bccList(): string[] {
  return (process.env.MAIL_BCC || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

let cached: nodemailer.Transporter | null = null
function transporter() {
  if (cached) return cached
  cached = nodemailer.createTransport({
    host: process.env.ZOHO_SMTP_HOST ?? 'smtp.zoho.com',
    port: Number(process.env.ZOHO_SMTP_PORT ?? 465),
    secure: true, // 465 = implicit TLS
    auth: { user: process.env.ZOHO_SMTP_USER, pass: process.env.ZOHO_SMTP_PASS },
  })
  return cached
}

// Magic link to the customer's "My orders" page. NO BCC — the link is the
// customer's private access token and must not be copied anywhere else.
export async function sendMyOrdersLinkEmail(to: string, link: string): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  if (!hasContactMailConfig()) {
    console.log('[my-orders:skipped] SMTP not configured. Link for ' + to + ': ' + link)
    return { ok: true, skipped: true }
  }
  try {
    await transporter().sendMail({
      from: `Vissionlink Rentals <${process.env.ZOHO_SMTP_USER}>`,
      to,
      subject: 'Your VissionLink orders — secure link',
      text:
        `Hi,\n\n` +
        `You (or someone using this email) asked to view your rental orders on vissionlink.com.\n\n` +
        `Open your orders here (link works for 7 days):\n${link}\n\n` +
        `If you didn't request this, you can ignore this email — nothing changes without this link.\n\n` +
        `— Vissionlink Rentals / BMR Cinema Operation Services\n`,
    })
    return { ok: true }
  } catch (err) {
    console.error('[my-orders:error]', err)
    return { ok: false, error: err instanceof Error ? err.message : 'send failed' }
  }
}

export interface ReturnReminderInput {
  to: string
  clientName: string
  orderNo: string
  dateTo: string // human date the gear is due back
  daysLeft: number // >0 = upcoming, 0 = due today, <0 = overdue
  items: string // short summary, e.g. "KOMODO 6K (Body Kit) ×1"
}

// Return-date reminder, keyed to the rental end date (date_to on the order).
// Sent by the daily reminders cron at T-1 / due day / T+1. Owners get the BCC
// copy, which doubles as the admin's "due back" monitoring nudge.
export async function sendReturnReminderEmail(input: ReturnReminderInput): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const replyTo = process.env.CONTACT_TO || process.env.ZOHO_SMTP_USER || 'hello@vissionlink.com'
  const late = input.daysLeft < 0
  const subject = late
    ? `Equipment return overdue — Order ${input.orderNo}`
    : input.daysLeft === 0
      ? `Equipment due back today — Order ${input.orderNo}`
      : `Equipment due back tomorrow — Order ${input.orderNo}`
  const lead = late
    ? `Our records show the equipment on Order ${input.orderNo} was due back on ${input.dateTo} and has not yet been marked returned.`
    : input.daysLeft === 0
      ? `A friendly reminder that the equipment on Order ${input.orderNo} is due back today, ${input.dateTo}.`
      : `A friendly reminder that the equipment on Order ${input.orderNo} is due back tomorrow, ${input.dateTo}.`
  const text =
    `Hi ${input.clientName || 'there'},\n\n` +
    `${lead}\n\n` +
    `Items: ${input.items}\n\n` +
    `Please coordinate the return/pickup with us at ${replyTo}. Late returns are billed per the rental agreement, ` +
    `and the security deposit is released after the gear is checked in.\n\n` +
    `Thank you,\nVissionlink Rentals / BMR Cinema Operation Services\n`
  if (!hasContactMailConfig()) {
    console.log('[return-reminder:skipped] SMTP not configured.\n' + subject)
    return { ok: true, skipped: true }
  }
  try {
    await transporter().sendMail({
      from: `Vissionlink Rentals <${process.env.ZOHO_SMTP_USER}>`,
      to: input.to,
      bcc: bccList(),
      replyTo,
      subject,
      text,
    })
    return { ok: true }
  } catch (err) {
    console.error('[return-reminder:error]', err)
    return { ok: false, error: err instanceof Error ? err.message : 'send failed' }
  }
}

// Plain operational alert to the site owner (used by lib/report-error.ts).
// No BCC, no reply-to — this is internal plumbing, not customer mail.
export async function sendAlertEmail(subject: string, text: string): Promise<{ ok: boolean; skipped?: boolean }> {
  if (!hasContactMailConfig()) return { ok: true, skipped: true }
  const to = process.env.CONTACT_TO || process.env.ZOHO_SMTP_USER || 'hello@vissionlink.com'
  try {
    await transporter().sendMail({
      from: `Vissionlink Alerts <${process.env.ZOHO_SMTP_USER}>`,
      to,
      subject,
      text,
    })
    return { ok: true }
  } catch (err) {
    console.error('[alert:error]', err)
    return { ok: false }
  }
}

export interface ContactInput {
  name: string
  email: string
  subject?: string
  message: string
}

export async function sendContactEmail(input: ContactInput): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const to = process.env.CONTACT_TO || process.env.ZOHO_SMTP_USER || 'hello@vissionlink.com'
  const subject = input.subject?.trim() ? `Contact form: ${input.subject.trim()}` : 'New contact form message'
  const text =
    `New message from the Vissionlink contact form\n\n` +
    `Name:    ${input.name}\n` +
    `Email:   ${input.email}\n` +
    (input.subject ? `Subject: ${input.subject}\n` : '') +
    `\n${input.message}\n`

  if (!hasContactMailConfig()) {
    // Don't lose the lead in dev / before SMTP is configured — log it loudly.
    console.log('[contact:skipped] SMTP not configured. Message:\n' + text)
    return { ok: true, skipped: true }
  }

  try {
    // From must be the authenticated mailbox (Zoho rejects spoofed From).
    // Reply-To = the visitor, so hitting "Reply" answers them directly.
    await transporter().sendMail({
      from: `Vissionlink Website <${process.env.ZOHO_SMTP_USER}>`,
      to,
      bcc: bccList(),
      replyTo: `${input.name} <${input.email}>`,
      subject,
      text,
    })
    return { ok: true }
  } catch (err) {
    console.error('[contact:error]', err)
    return { ok: false, error: err instanceof Error ? err.message : 'send failed' }
  }
}

export interface QuoteRequestInput {
  name: string
  email: string
  phone?: string
  company?: string
  project?: string
  dateFrom?: string
  dateTo?: string
  notes?: string
  providerName: string
  packageName: string
  priceRange?: string
}

// Quotation requests from the tabbed /contact form. Same Zoho mailbox as the
// contact form (hello@vissionlink.com), but a quote-specific subject/body that
// leads with the chosen provider and package.
export async function sendQuoteRequestEmail(input: QuoteRequestInput): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const to = process.env.CONTACT_TO || process.env.ZOHO_SMTP_USER || 'hello@vissionlink.com'
  const subject = `Quotation request — ${input.packageName} (${input.providerName})`
  const dates =
    input.dateFrom || input.dateTo ? `${input.dateFrom || '—'} → ${input.dateTo || '—'}` : ''
  const text =
    `New quotation request from the VissionLink website\n\n` +
    `Provider: ${input.providerName}\n` +
    `Package:  ${input.packageName}${input.priceRange ? ` (${input.priceRange})` : ''}\n\n` +
    `Name:     ${input.name}\n` +
    `Email:    ${input.email}\n` +
    (input.phone ? `Phone:    ${input.phone}\n` : '') +
    (input.company ? `Company:  ${input.company}\n` : '') +
    (input.project ? `Project:  ${input.project}\n` : '') +
    (dates ? `Dates:    ${dates}\n` : '') +
    (input.notes ? `\nNotes:\n${input.notes}\n` : '')

  if (!hasContactMailConfig()) {
    console.log('[quote:skipped] SMTP not configured. Request:\n' + text)
    return { ok: true, skipped: true }
  }

  try {
    await transporter().sendMail({
      from: `Vissionlink Website <${process.env.ZOHO_SMTP_USER}>`,
      to,
      bcc: bccList(),
      replyTo: `${input.name} <${input.email}>`,
      subject,
      text,
    })
    return { ok: true }
  } catch (err) {
    console.error('[quote:error]', err)
    return { ok: false, error: err instanceof Error ? err.message : 'send failed' }
  }
}

export interface QuotationEmailInput {
  to: string
  clientName: string
  number: string
  pdf: Buffer
  message?: string
}

// Sends a finalized e-quotation to the client with the PDF attached. From the
// site mailbox; Reply-To points back to hello@vissionlink.com so the client's
// replies reach the team. Triggered only when the provider clicks "Send".
export async function sendQuotationEmail(input: QuotationEmailInput): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const replyTo = process.env.CONTACT_TO || process.env.ZOHO_SMTP_USER || 'hello@vissionlink.com'
  const subject = `Quotation ${input.number} — BMR Cinema Operation Services`
  const text =
    `Hi ${input.clientName || 'there'},\n\n` +
    `Please find attached your quotation (${input.number}) from BMR Cinema Operation Services via VissionLink.\n\n` +
    (input.message?.trim() ? `${input.message.trim()}\n\n` : '') +
    `Validity and full terms are stated in the attached PDF. Reply to this email to confirm, adjust, or ask any questions.\n\n` +
    `Thank you,\nVissionLink / BMR Cinema Operation Services\n`

  if (!hasContactMailConfig()) {
    console.log(`[quotation:skipped] SMTP not configured. Would email ${input.to} quotation ${input.number}.`)
    return { ok: true, skipped: true }
  }

  try {
    await transporter().sendMail({
      from: `VissionLink / BMR <${process.env.ZOHO_SMTP_USER}>`,
      to: input.to,
      bcc: bccList(),
      replyTo,
      subject,
      text,
      attachments: [{ filename: `${input.number}.pdf`, content: input.pdf, contentType: 'application/pdf' }],
    })
    return { ok: true }
  } catch (err) {
    console.error('[quotation:error]', err)
    return { ok: false, error: err instanceof Error ? err.message : 'send failed' }
  }
}

export interface ReminderEmailInput {
  to: string
  clientName: string
  number: string
  balance: string // pre-formatted, e.g. "PHP 30,850.00"
  dueDate: string // human date
  overdueDays: number // >0 = overdue, <=0 = upcoming
  payLink?: string
  interestNote?: string
}

// Plain-text balance reminder (no attachment). Sent by the scheduled reminders
// job at T-3 / due / T+1 / T+7. Tone hardens once overdue.
export async function sendReminderEmail(input: ReminderEmailInput): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const replyTo = process.env.CONTACT_TO || process.env.ZOHO_SMTP_USER || 'hello@vissionlink.com'
  const overdue = input.overdueDays > 0
  const subject = overdue
    ? `Overdue balance — Invoice ${input.number} (${input.balance})`
    : `Payment reminder — Invoice ${input.number} due ${input.dueDate}`
  const lead = overdue
    ? `This is a reminder that your balance on Invoice ${input.number} is now ${input.overdueDays} day(s) overdue.`
    : `This is a friendly reminder that your balance on Invoice ${input.number} is due on ${input.dueDate}.`
  const text =
    `Hi ${input.clientName || 'there'},\n\n` +
    `${lead}\n\n` +
    `Outstanding balance: ${input.balance}\n` +
    (input.interestNote ? `${input.interestNote}\n` : '') +
    (input.payLink ? `\nPay online: ${input.payLink}\n` : '') +
    `\nReply to this email with your proof of transfer once settled. Thank you,\n` +
    `VissionLink / BMR Cinema Operation Services\n`

  if (!hasContactMailConfig()) {
    console.log(`[reminder:skipped] SMTP not configured. Would remind ${input.to} re ${input.number} (${input.balance}).`)
    return { ok: true, skipped: true }
  }
  try {
    await transporter().sendMail({ from: `VissionLink / BMR <${process.env.ZOHO_SMTP_USER}>`, to: input.to, bcc: bccList(), replyTo, subject, text })
    return { ok: true }
  } catch (err) {
    console.error('[reminder:error]', err)
    return { ok: false, error: err instanceof Error ? err.message : 'send failed' }
  }
}

export interface OrderConfirmationInput {
  to: string
  clientName: string
  orderId: string
  amountPaid: string // pre-formatted, e.g. "₱101"
  paymentRef?: string
  paidInFull: boolean
  balanceDue?: string // pre-formatted; omit/empty when paid in full
  balanceNote?: string // how the balance is settled (handover / PDC)
  rentalFrom?: string
  rentalTo?: string
  items?: { name: string; qty: number; days: number }[]
  manageUrl?: string // discreet self-service link to the client's order page
}

// First email a customer gets after a successful payment: a warm confirmation +
// assurance of what happens next. No attachment — it reassures immediately, then
// the contract (with terms) and the invoice (payment proof) follow as their own
// emails. Always from hello@vissionlink.com.
export async function sendOrderConfirmationEmail(input: OrderConfirmationInput): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const replyTo = process.env.CONTACT_TO || process.env.ZOHO_SMTP_USER || 'hello@vissionlink.com'
  const subject = `Booking confirmed — order ${input.orderId} (VissionLink / BMR)`
  const lines = (input.items ?? []).map((i) => `  • ${i.name} — ${i.days} day(s) × ${i.qty}`).join('\n')
  const dates = input.rentalFrom || input.rentalTo ? `${input.rentalFrom || '—'} → ${input.rentalTo || '—'}` : ''
  const text =
    `Hi ${input.clientName || 'there'},\n\n` +
    `Thank you — we've received your payment and your booking is confirmed. ✅\n\n` +
    `Order reference: ${input.orderId}\n` +
    `Amount paid: ${input.amountPaid}${input.paymentRef ? ` (ref ${input.paymentRef})` : ''}\n` +
    (input.paidInFull
      ? `Status: PAID IN FULL — nothing further to settle.\n`
      : `Balance: ${input.balanceDue || '—'}${input.balanceNote ? ` — ${input.balanceNote}` : ''}\n`) +
    (dates ? `Rental dates: ${dates}\n` : '') +
    (lines ? `\nYour gear:\n${lines}\n` : '') +
    `\nWhat happens next:\n` +
    `  1) Our team will review your contract and invoice, then email the required document(s) shortly.\n` +
    `  2) Our team will reach out to arrange pickup or delivery for your dates.\n` +
    `  3) Please bring a valid government-issued ID when you collect or receive the gear.\n\n` +
    `Questions or changes? Just reply to this email — it reaches our team directly.\n` +
    (input.manageUrl ? `You can also view this booking here: ${input.manageUrl}\n` : '') +
    `\nThank you for renting with us,\nVissionLink / BMR Cinema Operation Services\nhello@vissionlink.com\n`

  if (!hasContactMailConfig()) {
    console.log(`[confirmation:skipped] SMTP not configured. Would confirm order ${input.orderId} to ${input.to}.`)
    return { ok: true, skipped: true }
  }
  try {
    await transporter().sendMail({ from: `VissionLink / BMR <${process.env.ZOHO_SMTP_USER}>`, to: input.to, bcc: bccList(), replyTo, subject, text })
    return { ok: true }
  } catch (err) {
    console.error('[confirmation:error]', err)
    return { ok: false, error: err instanceof Error ? err.message : 'send failed' }
  }
}

export interface DocumentEmailInput {
  to: string
  clientName: string
  kind: 'Contract' | 'Invoice' | 'Credit Memo'
  number: string
  pdf: Buffer
  message?: string
}

// Generic sender for the downstream documents (e-contract, e-invoice). Same Zoho
// mailbox + Reply-To as the quotation; only the wording and attachment name vary.
// Triggered only when the provider clicks "Send".
export async function sendDocumentEmail(input: DocumentEmailInput): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const replyTo = process.env.CONTACT_TO || process.env.ZOHO_SMTP_USER || 'hello@vissionlink.com'
  const lower = input.kind.toLowerCase()
  const subject = `${input.kind} ${input.number} — BMR Cinema Operation Services`
  const closing =
    input.kind === 'Contract'
      ? `Please review and sign the attached rental agreement. Reply to this email to confirm or raise any questions.`
      : input.kind === 'Credit Memo'
        ? `Please find your credit memo attached. It confirms the amount credited/refunded for your cancelled order. Reply to this email if anything looks off.`
        : `Please find your invoice attached. Payment details are stated in the PDF. Reply to this email once payment has been made, attaching proof of transfer.`
  const text =
    `Hi ${input.clientName || 'there'},\n\n` +
    `Please find attached your ${lower} (${input.number}) from BMR Cinema Operation Services via VissionLink.\n\n` +
    (input.message?.trim() ? `${input.message.trim()}\n\n` : '') +
    `${closing}\n\n` +
    `Thank you,\nVissionLink / BMR Cinema Operation Services\n`

  if (!hasContactMailConfig()) {
    console.log(`[${lower}:skipped] SMTP not configured. Would email ${input.to} ${lower} ${input.number}.`)
    return { ok: true, skipped: true }
  }

  try {
    await transporter().sendMail({
      from: `VissionLink / BMR <${process.env.ZOHO_SMTP_USER}>`,
      to: input.to,
      bcc: bccList(),
      replyTo,
      subject,
      text,
      attachments: [{ filename: `${input.number}.pdf`, content: input.pdf, contentType: 'application/pdf' }],
    })
    return { ok: true }
  } catch (err) {
    console.error(`[${lower}:error]`, err)
    return { ok: false, error: err instanceof Error ? err.message : 'send failed' }
  }
}

export async function sendDocumentsEmail(input: {
  to: string
  clientName: string
  subjectRef: string
  message?: string
  attachments: { filename: string; content: Buffer }[]
}): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const replyTo = process.env.CONTACT_TO || process.env.ZOHO_SMTP_USER || 'hello@vissionlink.com'
  const subject = `Documents for ${input.subjectRef} — BMR Cinema Operation Services`
  const names = input.attachments.map((a) => a.filename.replace(/\.pdf$/i, '')).join(', ')
  const text =
    `Hi ${input.clientName || 'there'},\n\n` +
    `Please find attached the selected document(s) for ${input.subjectRef}: ${names}.\n\n` +
    (input.message?.trim() ? `${input.message.trim()}\n\n` : '') +
    `Reply to this email if you have questions or need any correction.\n\n` +
    `Thank you,\nVissionLink / BMR Cinema Operation Services\n`

  if (!hasContactMailConfig()) {
    console.log(`[documents:skipped] SMTP not configured. Would email ${input.to}: ${names}.`)
    return { ok: true, skipped: true }
  }

  try {
    await transporter().sendMail({
      from: `VissionLink / BMR <${process.env.ZOHO_SMTP_USER}>`,
      to: input.to,
      bcc: bccList(),
      replyTo,
      subject,
      text,
      attachments: input.attachments.map((a) => ({ filename: a.filename, content: a.content, contentType: 'application/pdf' })),
    })
    return { ok: true }
  } catch (err) {
    console.error('[documents:error]', err)
    return { ok: false, error: err instanceof Error ? err.message : 'send failed' }
  }
}

export interface CancellationRequestInput {
  orderNo: string
  clientName: string
  clientEmail: string
  category: string
  reason: string
}

// A client has REQUESTED to cancel an existing booking. Notifies the team (reply
// goes to the client) AND sends the client a calm acknowledgement — it's a review
// request, never an instant refund. Both are best-effort.
export async function sendCancellationRequestEmails(input: CancellationRequestInput): Promise<{ ok: boolean; skipped?: boolean }> {
  const team = process.env.CONTACT_TO || process.env.ZOHO_SMTP_USER || 'hello@vissionlink.com'
  const teamText =
    `A cancellation/change request was submitted for an existing booking.\n\n` +
    `Order:    ${input.orderNo}\n` +
    `Client:   ${input.clientName || '—'} <${input.clientEmail}>\n` +
    `Category: ${input.category}\n\n` +
    `Reason:\n${input.reason}\n\n` +
    `Review it in Admin → Orders (the card shows a "cancellation requested" banner) to approve a refund + credit memo, or decline.\n`
  const clientText =
    `Hi ${input.clientName || 'there'},\n\n` +
    `We've received your request regarding order ${input.orderNo} and our team will review it against the Cancellation & Refund terms you accepted at booking. ` +
    `We'll be in touch shortly with the outcome — there's nothing more you need to do for now.\n\n` +
    `If you'd like to add anything, just reply to this email.\n\n` +
    `Thank you,\nVissionLink / BMR Cinema Operation Services\n`

  if (!hasContactMailConfig()) {
    console.log(`[cancel-request:skipped] SMTP not configured. Order ${input.orderNo} from ${input.clientEmail}.`)
    return { ok: true, skipped: true }
  }
  try {
    await transporter().sendMail({ from: `Vissionlink Website <${process.env.ZOHO_SMTP_USER}>`, to: team, bcc: bccList(), replyTo: `${input.clientName} <${input.clientEmail}>`, subject: `Cancellation request — order ${input.orderNo}`, text: teamText })
    await transporter().sendMail({ from: `VissionLink / BMR <${process.env.ZOHO_SMTP_USER}>`, to: input.clientEmail, replyTo: team, subject: `We received your request — order ${input.orderNo}`, text: clientText })
    return { ok: true }
  } catch (err) {
    console.error('[cancel-request:error]', err)
    return { ok: false }
  }
}

export interface CancellationDecisionInput {
  to: string
  clientName: string
  orderNo: string
  decision: 'approved' | 'declined'
  note?: string
  refundAmount?: string // pre-formatted, e.g. "₱1,912.50"
  refundMethod?: 'paymongo' | 'offline'
}

// The team's decision on a cancellation request. On approval the credit memo PDF
// is emailed separately (sendDocumentEmail); this is the human-readable summary.
export async function sendCancellationDecisionEmail(input: CancellationDecisionInput): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const replyTo = process.env.CONTACT_TO || process.env.ZOHO_SMTP_USER || 'hello@vissionlink.com'
  const approved = input.decision === 'approved'
  const subject = approved
    ? `Cancellation approved — order ${input.orderNo}`
    : `About your request — order ${input.orderNo}`
  const refundLine = approved && input.refundAmount
    ? (input.refundMethod === 'offline'
        ? `A refund of ${input.refundAmount} will be arranged to you directly.\n`
        : `A refund of ${input.refundAmount} has been issued to your original payment method and may take a few business days to reflect.\n`)
    : ''
  const text =
    `Hi ${input.clientName || 'there'},\n\n` +
    (approved
      ? `Your cancellation request for order ${input.orderNo} has been approved. ${refundLine}` +
        `A credit memo with the details is attached in a separate email for your records.\n`
      : `We've reviewed your request for order ${input.orderNo}.\n`) +
    (input.note?.trim() ? `\n${input.note.trim()}\n` : '') +
    `\nIf you have any questions, just reply to this email.\n\n` +
    `Thank you,\nVissionLink / BMR Cinema Operation Services\n`

  if (!hasContactMailConfig()) {
    console.log(`[cancel-decision:skipped] SMTP not configured. ${input.decision} order ${input.orderNo} to ${input.to}.`)
    return { ok: true, skipped: true }
  }
  try {
    await transporter().sendMail({ from: `VissionLink / BMR <${process.env.ZOHO_SMTP_USER}>`, to: input.to, bcc: bccList(), replyTo, subject, text })
    return { ok: true }
  } catch (err) {
    console.error('[cancel-decision:error]', err)
    return { ok: false, error: err instanceof Error ? err.message : 'send failed' }
  }
}
