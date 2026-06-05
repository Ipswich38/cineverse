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
    await transporter().sendMail({ from: `VissionLink / BMR <${process.env.ZOHO_SMTP_USER}>`, to: input.to, replyTo, subject, text })
    return { ok: true }
  } catch (err) {
    console.error('[reminder:error]', err)
    return { ok: false, error: err instanceof Error ? err.message : 'send failed' }
  }
}

export interface DocumentEmailInput {
  to: string
  clientName: string
  kind: 'Contract' | 'Invoice'
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
