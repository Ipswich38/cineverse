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
