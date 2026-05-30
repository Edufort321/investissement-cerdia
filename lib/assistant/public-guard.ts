/**
 * Garde anti-abus pour le chatbot PUBLIC (page d'accueil, visiteurs anonymes).
 *
 * Pas d'authentification possible (visiteurs anonymes) → on protège par :
 *   1. Rate-limit PAR IP (un visiteur ne peut pas spammer).
 *   2. Plafond GLOBAL quotidien (la facture IA ne peut JAMAIS dépasser un montant,
 *      même en cas d'attaque distribuée sur plusieurs IP).
 *   3. La route applique aussi max_tokens court (limite de coût par réponse).
 *
 * Stockage en mémoire (suffisant ici ; pour multi-instance, migrer vers Upstash).
 */

import { rateLimit } from '@/lib/rate-limit'

// Par IP : 12 messages / heure.
const ipLimiter = rateLimit({ interval: 60 * 60 * 1000, uniqueTokenPerInterval: 12 })

// Plafond global quotidien : nombre total de requêtes acceptées par jour, toutes IP
// confondues. Au-delà, le bot répond un message statique (aucun appel IA facturé).
const GLOBAL_DAILY_CAP = 600
let globalCount = 0
let globalResetAt = 0

export type PublicGuardResult =
  | { ok: true }
  | { ok: false; reason: 'rate_limit' | 'global_cap'; retryAfter: number }

export function checkPublicQuota(ip: string): PublicGuardResult {
  const now = Date.now()

  // Réinitialise le compteur global chaque jour.
  if (now > globalResetAt) {
    globalCount = 0
    globalResetAt = now + 24 * 60 * 60 * 1000
  }

  // 1. Plafond global d'abord (protège la facture en priorité).
  if (globalCount >= GLOBAL_DAILY_CAP) {
    return { ok: false, reason: 'global_cap', retryAfter: Math.ceil((globalResetAt - now) / 1000) }
  }

  // 2. Rate-limit par IP.
  const r = ipLimiter.check(`pub:${ip}`)
  if (!r.success) {
    return { ok: false, reason: 'rate_limit', retryAfter: Math.ceil((r.reset - now) / 1000) }
  }

  globalCount += 1
  return { ok: true }
}

/** Extrait l'IP du client (compatible Vercel / proxies). */
export function getClientIp(headers: Headers): string {
  const fwd = headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return headers.get('x-real-ip') || 'unknown'
}
