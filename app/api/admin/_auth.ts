import { NextRequest } from 'next/server'

// The admin page unlocks with a code (see app/admin/page.tsx). That same code is
// sent as a Bearer token to admin-only API routes. ADMIN_SECRET must be set in
// the environment — with no secret configured, admin access fails closed.
export function checkAdminAuth(req: NextRequest): boolean {
  const secret = process.env.ADMIN_SECRET
  if (!secret) return false
  const auth = req.headers.get('authorization')
  return auth === `Bearer ${secret}`
}
