import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { loginLimiter, apiLimiter, strictApiLimiter } from '@/lib/rate-limit'

// ⚠️ SÉCURITÉ: Whitelist des origines autorisées pour CORS
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://localhost:3000',
  process.env.NEXT_PUBLIC_APP_URL || '',
  // Ajouter ici les domaines de production
].filter(Boolean) // Enlever les chaînes vides

// Obtenir l'IP du client (compatible avec Vercel, Cloudflare, etc.)
function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  const realIp = req.headers.get('x-real-ip')

  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }

  if (realIp) {
    return realIp
  }

  return 'unknown'
}

export async function middleware(req: NextRequest) {
  const origin = req.headers.get('origin')
  const pathname = req.nextUrl.pathname
  const clientIp = getClientIp(req)

  // ⚠️ RATE LIMITING: Appliquer avant toute autre logique
  let rateLimitResult = null

  // Login: limite stricte (5 tentatives / 15 min)
  if (pathname === '/connexion' && req.method === 'POST') {
    rateLimitResult = loginLimiter.check(clientIp)
  }
  // API sensibles: limite stricte (10 req / min)
  else if (pathname.startsWith('/api/investors') && req.method === 'POST') {
    rateLimitResult = strictApiLimiter.check(clientIp)
  }
  // Autres API: limite normale (60 req / min)
  else if (pathname.startsWith('/api/')) {
    rateLimitResult = apiLimiter.check(clientIp)
  }

  // Bloquer si limite dépassée
  if (rateLimitResult && !rateLimitResult.success) {
    const retryAfter = Math.ceil((rateLimitResult.reset - Date.now()) / 1000)

    return new NextResponse(
      JSON.stringify({
        error: 'Too Many Requests',
        message: 'Vous avez dépassé la limite de requêtes. Veuillez réessayer plus tard.',
        retryAfter
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': retryAfter.toString(),
          'X-RateLimit-Limit': rateLimitResult.limit.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': rateLimitResult.reset.toString()
        }
      }
    )
  }

  const res = NextResponse.next()

  // Ajouter les headers de rate limit si applicable
  if (rateLimitResult) {
    res.headers.set('X-RateLimit-Limit', rateLimitResult.limit.toString())
    res.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString())
    res.headers.set('X-RateLimit-Reset', rateLimitResult.reset.toString())
  }

  // Vérifier si l'origine est dans la whitelist
  const isAllowedOrigin = origin && ALLOWED_ORIGINS.includes(origin)

  // CORS headers - seulement pour les origines autorisées
  if (isAllowedOrigin) {
    res.headers.set('Access-Control-Allow-Credentials', 'true')
    res.headers.set('Access-Control-Allow-Origin', origin)
    res.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
    res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  }

  // Handle preflight
  if (req.method === 'OPTIONS') {
    if (isAllowedOrigin) {
      return new NextResponse(null, { status: 200, headers: res.headers })
    }
    return new NextResponse(null, { status: 403 })
  }

  return res
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/connexion/:path*',
    '/admin/:path*',
    '/api/:path*',
  ],
}
