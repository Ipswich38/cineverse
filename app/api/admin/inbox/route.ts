import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '../_auth'
import { hasInboxConfig, listInbox, getMessage } from '@/lib/inbox'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/admin/inbox            → list recent messages
// GET /api/admin/inbox?uid=123    → full single message (marks read)
export async function GET(req: NextRequest) {
  if (!checkAdminAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasInboxConfig()) {
    return NextResponse.json({ error: 'Mailbox not configured (set ZOHO_SMTP_USER / ZOHO_SMTP_PASS).' }, { status: 503 })
  }

  const uid = req.nextUrl.searchParams.get('uid')
  try {
    if (uid) {
      const msg = await getMessage(Number(uid))
      if (!msg) return NextResponse.json({ error: 'Message not found' }, { status: 404 })
      return NextResponse.json(msg)
    }
    const limit = Number(req.nextUrl.searchParams.get('limit') ?? 25)
    const list = await listInbox(Math.min(Math.max(limit, 1), 50))
    return NextResponse.json(list)
  } catch (err) {
    console.error('[inbox:error]', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Inbox error' }, { status: 500 })
  }
}
