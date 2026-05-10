/**
 * Authentification des routes API Amazon.
 *
 * Accepte :
 *   - Vercel cron : header `x-vercel-cron-secret` == process.env.CRON_SECRET
 *   - Appel manuel : header `Authorization: Bearer ${ADMIN_API_TOKEN}`
 *
 * Ne valide PAS de session utilisateur (Supabase Auth) — pour ça, utiliser
 * `requireAdmin()` dans `lib/auth/admin.ts` (Server Components / actions).
 */

import { NextRequest, NextResponse } from 'next/server'

export function authorizeCronOrAdmin(req: NextRequest): NextResponse | null {
  const cron = req.headers.get('x-vercel-cron-secret')
  if (cron && cron === process.env.CRON_SECRET) return null

  const auth = req.headers.get('authorization')
  if (auth && auth === `Bearer ${process.env.ADMIN_API_TOKEN}`) return null

  return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
}
