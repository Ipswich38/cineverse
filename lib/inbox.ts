// Admin inbox — reads the hello@vissionlink.com mailbox over Zoho IMAP and lets
// the admin reply over Zoho SMTP. Reuses the same Zoho credentials as the contact
// form (ZOHO_SMTP_USER / ZOHO_SMTP_PASS). Server-only (Node runtime).
//
// Read  = IMAP  (imap.zoho.com:993, SSL)  — SMTP cannot read mail.
// Reply = SMTP  (smtp.zoho.com:465, SSL)  — same as the contact form.
import { ImapFlow } from 'imapflow'
import { simpleParser } from 'mailparser'
import nodemailer from 'nodemailer'

function isPlaceholder(v: string | undefined) {
  if (!v) return true
  const s = v.toLowerCase()
  return s.includes('xxxx') || s.includes('placeholder') || s.startsWith('your-')
}

export function hasInboxConfig() {
  return !isPlaceholder(process.env.ZOHO_SMTP_USER) && !isPlaceholder(process.env.ZOHO_SMTP_PASS)
}

const USER = () => process.env.ZOHO_SMTP_USER as string
const PASS = () => process.env.ZOHO_SMTP_PASS as string

function imapClient() {
  return new ImapFlow({
    host: process.env.ZOHO_IMAP_HOST ?? 'imap.zoho.com',
    port: Number(process.env.ZOHO_IMAP_PORT ?? 993),
    secure: true,
    auth: { user: USER(), pass: PASS() },
    logger: false,
  })
}

export interface MailSummary {
  uid: number
  from: string
  fromName: string
  fromAddress: string
  subject: string
  date: string
  seen: boolean
  preview: string
}

export interface MailFull extends MailSummary {
  to: string
  text: string
  html: string | null
}

function addrText(a: { name?: string; address?: string } | undefined) {
  if (!a) return { name: '', address: '', full: '' }
  const name = a.name || ''
  const address = a.address || ''
  return { name, address, full: name ? `${name} <${address}>` : address }
}

// List the most recent messages in INBOX (newest first).
export async function listInbox(limit = 25): Promise<MailSummary[]> {
  const client = imapClient()
  await client.connect()
  const out: MailSummary[] = []
  try {
    const lock = await client.getMailboxLock('INBOX')
    try {
      const total = client.mailbox && typeof client.mailbox !== 'boolean' ? client.mailbox.exists : 0
      if (!total) return []
      const start = Math.max(1, total - limit + 1)
      for await (const msg of client.fetch(`${start}:*`, { uid: true, envelope: true, flags: true })) {
        const env = msg.envelope
        const from = addrText(env?.from?.[0])
        out.push({
          uid: msg.uid,
          from: from.full,
          fromName: from.name,
          fromAddress: from.address,
          subject: env?.subject || '(no subject)',
          date: (env?.date ?? new Date()).toISOString(),
          seen: msg.flags?.has('\\Seen') ?? false,
          preview: '',
        })
      }
    } finally {
      lock.release()
    }
  } finally {
    await client.logout().catch(() => {})
  }
  // newest first
  return out.sort((a, b) => +new Date(b.date) - +new Date(a.date))
}

// Fetch one full message by UID (and mark it read).
export async function getMessage(uid: number): Promise<MailFull | null> {
  const client = imapClient()
  await client.connect()
  try {
    const lock = await client.getMailboxLock('INBOX')
    try {
      const msg = await client.fetchOne(String(uid), { uid: true, source: true, envelope: true, flags: true }, { uid: true })
      if (!msg || !msg.source) return null
      const parsed = await simpleParser(msg.source)
      const from = addrText(msg.envelope?.from?.[0])
      // mark as seen
      await client.messageFlagsAdd(String(uid), ['\\Seen'], { uid: true }).catch(() => {})
      const toField = Array.isArray(parsed.to) ? parsed.to.map((t) => t.text).join(', ') : parsed.to?.text || ''
      return {
        uid,
        from: from.full,
        fromName: from.name,
        fromAddress: from.address,
        to: toField,
        subject: msg.envelope?.subject || parsed.subject || '(no subject)',
        date: (msg.envelope?.date ?? parsed.date ?? new Date()).toISOString(),
        seen: true,
        preview: '',
        text: parsed.text || '',
        html: typeof parsed.html === 'string' ? parsed.html : null,
      }
    } finally {
      lock.release()
    }
  } finally {
    await client.logout().catch(() => {})
  }
}

// Reply to a message over SMTP (from the mailbox; goes to the original sender).
export async function sendReply(opts: { to: string; subject: string; text: string }) {
  const transporter = nodemailer.createTransport({
    host: process.env.ZOHO_SMTP_HOST ?? 'smtp.zoho.com',
    port: Number(process.env.ZOHO_SMTP_PORT ?? 465),
    secure: true,
    auth: { user: USER(), pass: PASS() },
  })
  const subject = /^re:/i.test(opts.subject) ? opts.subject : `Re: ${opts.subject}`
  await transporter.sendMail({
    from: `Vissionlink <${USER()}>`,
    to: opts.to,
    subject,
    text: opts.text,
  })
}
