import { NextResponse } from 'next/server'
import { sendContactEmail } from '@/lib/contact-mail'

export const runtime = 'nodejs'

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)

export async function POST(req: Request) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request.' }, { status: 400 })
  }

  const name = String(body.name ?? '').trim()
  const email = String(body.email ?? '').trim()
  const subject = String(body.subject ?? '').trim()
  const message = String(body.message ?? '').trim()
  const honeypot = String(body.company ?? '').trim() // bots fill hidden fields

  // Silently accept bots (don't tell them they failed) but send nothing.
  if (honeypot) return NextResponse.json({ ok: true })

  if (!name || !email || !message) {
    return NextResponse.json({ ok: false, error: 'Please fill in your name, email, and message.' }, { status: 400 })
  }
  if (!isEmail(email)) {
    return NextResponse.json({ ok: false, error: 'Please enter a valid email address.' }, { status: 400 })
  }
  if (message.length > 5000) {
    return NextResponse.json({ ok: false, error: 'Message is too long.' }, { status: 400 })
  }

  const res = await sendContactEmail({ name, email, subject, message })
  if (!res.ok) {
    return NextResponse.json({ ok: false, error: 'Could not send right now. Please email us directly.' }, { status: 502 })
  }
  return NextResponse.json({ ok: true })
}
