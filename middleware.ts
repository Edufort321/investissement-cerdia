import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { Database } from './lib/database.types'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()

  // Laisser passer les routes API (sinon 405)
  if (req.nextUrl.pathname.startsWith('/api')) return res

  const supabase = createMiddlewareClient<Database>({ req, res })
  await supabase.auth.getSession()

  return res
}

export const config = {
  matcher: [
    '/dashboard/admin/:path*',
    '/api/ia-admin' // Peut être laissé ou retiré maintenant, car on bypasse dans le if
  ],
}
