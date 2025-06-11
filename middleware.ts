import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { Database } from './lib/database.types'

export async function middleware(req: NextRequest) {
  // Autoriser les credentials (cookies) entre domaines
  const res = NextResponse.next()

  res.headers.set('Access-Control-Allow-Credentials', 'true')
  res.headers.set('Access-Control-Allow-Origin', req.headers.get('origin') || '*')
  res.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  // Cas OPTIONS (préflight fetch) – réponse immédiate
  if (req.method === 'OPTIONS') {
    return res
  }

  // Ignorer les API pour éviter erreurs
  if (req.nextUrl.pathname.startsWith('/api')) return res

  // Authentification Supabase (protège les routes avec cookies)
  const supabase = createMiddlewareClient<Database>({ req, res })
  await supabase.auth.getSession()

  return res
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/connexion/:path*',
    '/admin/:path*',
    '/api/ia-admin',
  ],
}
