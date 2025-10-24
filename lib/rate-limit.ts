// ⚠️ SÉCURITÉ: Rate limiting pour prévenir brute-force et abus
// Simple in-memory rate limiter (pour développement)
// En production, utiliser Redis/Upstash pour scalabilité multi-instances

interface RateLimitStore {
  [key: string]: {
    count: number
    resetTime: number
  }
}

const store: RateLimitStore = {}

// Nettoyer les anciennes entrées toutes les 10 minutes
setInterval(() => {
  const now = Date.now()
  Object.keys(store).forEach(key => {
    if (store[key].resetTime < now) {
      delete store[key]
    }
  })
}, 10 * 60 * 1000)

export interface RateLimitConfig {
  interval: number // Fenêtre en millisecondes
  uniqueTokenPerInterval: number // Nombre de requêtes autorisées
}

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: number
}

export function rateLimit(config: RateLimitConfig) {
  return {
    check: (identifier: string): RateLimitResult => {
      const now = Date.now()
      const key = identifier

      if (!store[key] || store[key].resetTime < now) {
        // Créer une nouvelle entrée ou réinitialiser
        store[key] = {
          count: 1,
          resetTime: now + config.interval
        }

        return {
          success: true,
          limit: config.uniqueTokenPerInterval,
          remaining: config.uniqueTokenPerInterval - 1,
          reset: store[key].resetTime
        }
      }

      // Incrémenter le compteur
      store[key].count += 1

      const success = store[key].count <= config.uniqueTokenPerInterval

      return {
        success,
        limit: config.uniqueTokenPerInterval,
        remaining: Math.max(0, config.uniqueTokenPerInterval - store[key].count),
        reset: store[key].resetTime
      }
    }
  }
}

// Configurations prédéfinies
export const loginLimiter = rateLimit({
  interval: 15 * 60 * 1000, // 15 minutes
  uniqueTokenPerInterval: 5 // 5 tentatives par 15 min
})

export const apiLimiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 60 // 60 requêtes par minute
})

export const strictApiLimiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 10 // 10 requêtes par minute (pour routes sensibles)
})
