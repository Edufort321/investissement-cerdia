/**
 * Types pour le système de parts d'investisseurs
 * Similar au fonctionnement d'actions en bourse
 */

// Investissement individuel (achat de parts)
export interface InvestorInvestment {
  id: string
  investor_id: string
  investment_date: string // ISO date
  amount_invested: number // Montant en devise
  share_price_at_purchase: number // Prix par part au moment d'achat (FIXE)
  number_of_shares: number // Nombre de parts achetées (FIXE)
  currency: string // CAD, USD, etc.
  payment_method?: string
  reference_number?: string
  notes?: string
  created_at?: string
  updated_at?: string
}

// Paramètres de l'entreprise
export interface CompanySetting {
  id: string
  setting_key: string
  setting_value: string
  setting_type: 'string' | 'number' | 'boolean' | 'json'
  description?: string
  last_updated_by?: string
  created_at?: string
  updated_at?: string
}

// Vue simplifiée des paramètres de parts
export interface ShareSettings {
  nominal_share_value: number // Prix vente actuel d'une part (CAD)
  estimated_share_value: number // Valeur estimée calculée selon ROI
  company_name: string
  calculation_method: 'weighted_roi' | 'simple_average' | 'property_value'
  last_calculation_date?: Date
}

// Résumé d'un investisseur
export interface InvestorSummary {
  investor_id: string
  investor_name: string
  email?: string
  total_investments: number // Nombre d'investissements
  total_amount_invested: number // Somme investie (CAD)
  total_shares: number // Nombre total de parts possédées
  average_purchase_price: number // Prix moyen d'achat par part
  first_investment_date?: string
  last_investment_date?: string
  // Calculés côté client:
  current_value?: number // total_shares × estimated_share_value
  gain_loss?: number // current_value - total_amount_invested
  roi_percentage?: number // (gain_loss / total_amount_invested) × 100
}

// Données pour rapport trimestriel PDF
export interface QuarterlyReport {
  investor: {
    id: string
    name: string
    email?: string
    phone?: string
  }
  reporting_period: {
    quarter: 1 | 2 | 3 | 4
    year: number
    start_date: string
    end_date: string
  }
  summary: {
    total_invested: number
    total_shares: number
    share_price_start: number
    share_price_end: number
    current_value: number
    gain_loss: number
    roi_percentage: number
  }
  investments: InvestorInvestment[]
  share_value_history: {
    date: string
    value: number
  }[]
}

// Formulaire nouvel investissement
export interface NewInvestmentFormData {
  investor_id: string
  investment_date: string
  amount_invested: number
  currency: string
  payment_method?: string
  reference_number?: string
  notes?: string
  // Calculé automatiquement selon nominal_share_value actuel:
  // number_of_shares = amount_invested / nominal_share_value
}
