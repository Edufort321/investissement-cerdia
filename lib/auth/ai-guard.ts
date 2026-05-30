/**
 * Garde anti-abus pour les routes IA coûteuses (OpenAI / DALL-E / Vision).
 *
 * OWASP API4:2023 — Unrestricted Resource Consumption. Sans garde, un visiteur
 * anonyme peut spammer ces routes et faire exploser la facture OpenAI.
 *
 * Stratégie :
 *   1. Authentification OBLIGATOIRE (token Bearer Supabase). Un anonyme ne peut
 *      pas consommer d'IA.
 *   2. Rate-limit STRICT par utilisateur (et non par IP) : un quota propre à
 *      chaque user, distinct selon le coût de la route.
 *
 * Usage :
 *   const guard = await requireAIUser(request, 'image')
 *   if (guard.error) return guard.error
 *   // ... appel OpenAI, guard.userId disponible
 */

import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { rateLimit } from '@/lib/rate-limit'

// Quotas par catégorie de coût (par utilisateur).
//   image  : DALL-E ~0.08 $/img → très strict
//   vision : GPT-4o Vision (scan reçu) → strict
//   text   : GPT-4o-mini (chat, suggestions) → modéré
const LIMITERS = {
  image:  rateLimit({ interval: 60 * 60 * 1000, uniqueTokenPerInterval: 10 }),  // 10 / heure
  vision: rateLimit({ interval: 60 * 60 * 1000, uniqueTokenPerInterval: 30 }),  // 30 / heure
  text:   rateLimit({ interval: 60 * 1000,      uniqueTokenPerInterval: 20 }),  // 20 / minute
} as const

export type AICostTier = keyof typeof LIMITERS

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
  )
}

export async function requireAIUser(
  request: NextRequest,
  tier: AICostTier
): Promise<{ userId: string; error: null } | { userId: null; error: NextResponse }> {
  // 1. Auth obligatoire.
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
  const token = authHeader?.replace(/^Bearer\s+/i, '').trim()
  if (!token) {
    return { userId: null, error: NextResponse.json({ error: 'Authentification requise' }, { status: 401 }) }
  }

  let userId: string
  try {
    const admin = getServiceClient()
    const { data, error } = await admin.auth.getUser(token)
    if (error || !data?.user) {
      return { userId: null, error: NextResponse.json({ error: 'Session invalide' }, { status: 401 }) }
    }
    userId = data.user.id
  } catch {
    return { userId: null, error: NextResponse.json({ error: 'Erreur d\'authentification' }, { status: 401 }) }
  }

  // 2. Rate-limit strict PAR UTILISATEUR (clé = tier:userId).
  const result = LIMITERS[tier].check(`ai:${tier}:${userId}`)
  if (!result.success) {
    const retryAfter = Math.ceil((result.reset - Date.now()) / 1000)
    return {
      userId: null,
      error: NextResponse.json(
        { error: 'Quota IA dépassé. Réessayez plus tard.', retryAfter },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } }
      ),
    }
  }

  return { userId, error: null }
}
