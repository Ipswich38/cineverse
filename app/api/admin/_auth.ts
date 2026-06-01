import { NextRequest } from 'next/server'

// The admin page unlocks with a code (see app/admin/page.tsx). That same code is
// sent as a Bearer token to admin-only API routes. Set ADMIN_SECRET in the
// environment to override the default in production.
export const ADMIN_DEFAULT_CODE = 'vissionlink-admin'

export function checkAdminAuth(req: NextRequest): boolean {
  const auth = req.headers.get('authorization')
  const secret = process.env.ADMIN_SECRET ?? ADMIN_DEFAULT_CODE
  return auth === `Bearer ${secret}`
}
