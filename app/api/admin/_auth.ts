import { NextRequest } from 'next/server'

export function checkAdminAuth(req: NextRequest): boolean {
  const auth = req.headers.get('authorization')
  const secret = process.env.ADMIN_SECRET ?? 'demo-admin'
  return auth === `Bearer ${secret}`
}
