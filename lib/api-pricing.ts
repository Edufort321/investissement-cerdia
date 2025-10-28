// Configuration des coûts réels des API (en USD)

export interface APIPricing {
  name: string
  costPerCall?: number
  costPerToken?: number
  inputTokenCost?: number
  outputTokenCost?: number
  free?: boolean
}

export const API_COSTS: Record<string, APIPricing> = {
  // OpenAI GPT-4o-mini (Premium)
  'openai-gpt4o-mini': {
    name: 'OpenAI GPT-4o-mini',
    inputTokenCost: 0.15 / 1_000_000, // $0.15 par 1M tokens input
    outputTokenCost: 0.60 / 1_000_000, // $0.60 par 1M tokens output
  },

  // Google Maps Geocoding API
  'google-geocoding': {
    name: 'Google Maps Geocoding',
    costPerCall: 0.005, // $5 / 1000 requêtes = $0.005 par requête
  },

  // APIs Gratuites
  'nominatim': {
    name: 'Nominatim (OpenStreetMap)',
    free: true,
  },

  'static-db': {
    name: 'Base de données statique',
    free: true,
  },
}

export interface APIUsage {
  apiName: string
  calls: number
  inputTokens?: number
  outputTokens?: number
  cost: number
}

export class APICostCalculator {
  private usage: Map<string, APIUsage> = new Map()

  // Enregistrer un appel API
  trackCall(apiName: string, tokens?: { input?: number; output?: number }) {
    const pricing = API_COSTS[apiName]
    if (!pricing) {
      console.warn(`API inconnue: ${apiName}`)
      return
    }

    const current = this.usage.get(apiName) || {
      apiName,
      calls: 0,
      inputTokens: 0,
      outputTokens: 0,
      cost: 0,
    }

    current.calls += 1

    // Calcul du coût
    if (pricing.free) {
      current.cost = 0
    } else if (pricing.costPerCall) {
      current.cost += pricing.costPerCall
    } else if (pricing.inputTokenCost && pricing.outputTokenCost && tokens) {
      if (tokens.input) {
        current.inputTokens = (current.inputTokens || 0) + tokens.input
        current.cost += tokens.input * pricing.inputTokenCost
      }
      if (tokens.output) {
        current.outputTokens = (current.outputTokens || 0) + tokens.output
        current.cost += tokens.output * pricing.outputTokenCost
      }
    }

    this.usage.set(apiName, current)
  }

  // Obtenir le coût total
  getTotalCost(): number {
    let total = 0
    this.usage.forEach((usage) => {
      total += usage.cost
    })
    return total
  }

  // Obtenir le prix de vente avec marge
  getSellingPrice(profitMargin: number = 0.5): number {
    const cost = this.getTotalCost()
    return cost * (1 + profitMargin)
  }

  // Obtenir le détail de l'utilisation
  getUsageDetails(): APIUsage[] {
    return Array.from(this.usage.values())
  }

  // Reset les compteurs
  reset() {
    this.usage.clear()
  }

  // Export pour sauvegarde
  export(): string {
    return JSON.stringify({
      usage: Array.from(this.usage.entries()),
      totalCost: this.getTotalCost(),
      timestamp: new Date().toISOString(),
    })
  }

  // Import depuis sauvegarde
  import(data: string) {
    try {
      const parsed = JSON.parse(data)
      this.usage = new Map(parsed.usage)
    } catch (error) {
      console.error('Erreur import usage:', error)
    }
  }
}

// Instance globale (en production, stocker en base de données)
// Note: En Edge Runtime, utiliser un store externe (Redis, KV, etc.)
let globalTracker: APICostCalculator | null = null

export function getAPICostTracker(): APICostCalculator {
  if (!globalTracker) {
    globalTracker = new APICostCalculator()
  }
  return globalTracker
}

// Backward compatibility
export const apiCostTracker = getAPICostTracker()

// Helper pour formater les coûts
export function formatCost(cost: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  }).format(cost)
}

// Calculer le prix suggéré pour un voyage
export function calculateTripPrice(
  apiUsage: APIUsage[],
  profitMargin: number = 0.5
): {
  totalCost: number
  sellingPrice: number
  profit: number
  breakdown: { api: string; cost: number; calls: number }[]
} {
  const totalCost = apiUsage.reduce((sum, usage) => sum + usage.cost, 0)
  const sellingPrice = totalCost * (1 + profitMargin)
  const profit = sellingPrice - totalCost

  const breakdown = apiUsage.map((usage) => ({
    api: usage.apiName,
    cost: usage.cost,
    calls: usage.calls,
  }))

  return {
    totalCost,
    sellingPrice,
    profit,
    breakdown,
  }
}
