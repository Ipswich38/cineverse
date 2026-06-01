import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '../../_auth'
import { hasInboxConfig, sendReply } from '@/lib/inbox'

export const runtime = 'nodejs'

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)

// POST /api/admin/inbox/reply  { to, subject, text }
export async function POST(req: NextRequest) {
  if (!checkAdminAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasInboxConfig()) {
    return NextResponse.json({ error: 'Mailbox not configured.' }, { status: 503 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const to = String(body.to ?? '').trim()
  const subject = String(body.subject ?? '').trim() || '(no subject)'
  const text = String(body.text ?? '').trim()

  if (!isEmail(to)) return NextResponse.json({ error: 'Invalid recipient address.' }, { status: 400 })
  if (!text) return NextResponse.json({ error: 'Reply cannot be empty.' }, { status: 400 })

  try {
    await sendReply({ to, subject, text })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[inbox:reply:error]', err)
    return NextResponse.json({ error: 'Could not send reply.' }, { status: 502 })
  }
}
