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
    // imapflow surfaces useful detail beyond the bare "Command failed" — pull the
    // server response / code so the cause (usually a Zoho-side setting) is visible.
    const e = err as { message?: string; responseText?: string; serverResponseCode?: string; authenticationFailed?: boolean }
    const detail = e.responseText || e.serverResponseCode || e.message || 'Inbox error'

    // Zoho gates IMAP behind a paid plan — free mailboxes reject the login with
    // "not available for your account" / "yet to enable IMAP". That's an expected
    // plan limitation, not a fault, so report it as a calm 200 the UI can show
    // gently rather than a red error. Sending (SMTP) is unaffected.
    if (/imap/i.test(detail) && /(not available|yet to enable|paid|administrator)/i.test(detail)) {
      return NextResponse.json({ unavailable: true, error: 'Mailbox mirroring needs a Zoho paid plan (IMAP). New enquiries still arrive under E-Quotations.' })
    }

    const isAuth = Boolean(e.authenticationFailed) || /auth|login|credential/i.test(detail)
    const message = isAuth
      ? `Mailbox sign-in was rejected (${detail}). In Zoho Mail, enable IMAP access for hello@vissionlink.com and use an app-specific password (not the login password); set ZOHO_IMAP_HOST if your account is on a non-.com region.`
      : `Could not read the mailbox (${detail}). Check that IMAP is enabled in Zoho and the host/port are correct.`
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
