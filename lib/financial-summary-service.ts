/**
 * Service pour récupérer le résumé financier depuis les vues SQL
 * Utilise la fonction get_financial_summary() et les vues créées dans migration 95
 */

import { supabase } from './supabase'

export interface FinancialSummary {
  total_investisseurs: number
  compte_courant_balance: number
  capex_balance: number
  depenses_projets: number
  couts_operation: number
}

export interface CAPEXSummary {
  year: number
  capex_received: number
  capex_spent: number
  capex_balance: number
  transaction_count: number
}

export interface CompteCourantMonthly {
  year: number
  month: number
  period: string
  total_inflow: number
  total_outflow: number
  net_balance: number
  cout_operation: number
  cout_maintenance: number
  cout_admin: number
  cout_projet: number
  transaction_count: number
}

export interface PropertyCashflow {
  property_id: string
  property_name: string
  year: number
  total_invested: number
  total_expenses: number
  total_revenue: number
  net_cashflow: number
  transaction_count: number
}

/**
 * Récupère le résumé financier global
 * @param year - Année à filtrer (optionnel, null = toutes années)
 */
export async function getFinancialSummary(year: number | null = null): Promise<FinancialSummary | null> {
  try {
    const { data, error } = await supabase.rpc('get_financial_summary', {
      p_year: year
    })

    if (error) {
      console.error('Error fetching financial summary:', error)
      return null
    }

    if (!data || data.length === 0) {
      return {
        total_investisseurs: 0,
        compte_courant_balance: 0,
        capex_balance: 0,
        depenses_projets: 0,
        couts_operation: 0
      }
    }

    // Convertir le résultat en objet
    const summary: FinancialSummary = {
      total_investisseurs: 0,
      compte_courant_balance: 0,
      capex_balance: 0,
      depenses_projets: 0,
      couts_operation: 0
    }

    data.forEach((row: { metric: string; value: number; category: string }) => {
      switch (row.category) {
        case 'investissement':
          summary.total_investisseurs = row.value
          break
        case 'compte_courant':
          summary.compte_courant_balance = row.value
          break
        case 'capex':
          summary.capex_balance = row.value
          break
        case 'projet':
          summary.depenses_projets = row.value
          break
        case 'operation':
          summary.couts_operation = row.value
          break
      }
    })

    return summary
  } catch (error) {
    console.error('Exception in getFinancialSummary:', error)
    return null
  }
}

/**
 * Récupère le résumé CAPEX par année
 */
export async function getCAPEXSummary(): Promise<CAPEXSummary[]> {
  try {
    const { data, error } = await supabase
      .from('v_capex_summary')
      .select('*')
      .order('year', { ascending: false })

    if (error) {
      console.error('Error fetching CAPEX summary:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Exception in getCAPEXSummary:', error)
    return []
  }
}

/**
 * Récupère le compte courant mensuel
 * @param year - Année à filtrer (optionnel)
 */
export async function getCompteCourantMonthly(year?: number): Promise<CompteCourantMonthly[]> {
  try {
    let query = supabase
      .from('v_compte_courant_monthly')
      .select('*')

    if (year) {
      query = query.eq('year', year)
    }

    query = query.order('year', { ascending: false }).order('month', { ascending: false })

    const { data, error } = await query

    if (error) {
      console.error('Error fetching compte courant monthly:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Exception in getCompteCourantMonthly:', error)
    return []
  }
}

/**
 * Récupère le compte courant annuel
 * @param year - Année à filtrer (optionnel)
 */
export async function getCompteCourantYearly(year?: number) {
  try {
    let query = supabase
      .from('v_compte_courant_yearly')
      .select('*')

    if (year) {
      query = query.eq('year', year)
    }

    query = query.order('year', { ascending: false })

    const { data, error } = await query

    if (error) {
      console.error('Error fetching compte courant yearly:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Exception in getCompteCourantYearly:', error)
    return []
  }
}

/**
 * Récupère les flux par propriété
 * @param propertyId - Filtrer par propriété (optionnel)
 */
export async function getPropertyCashflow(propertyId?: string): Promise<PropertyCashflow[]> {
  try {
    let query = supabase
      .from('v_property_cashflow')
      .select('*')

    if (propertyId) {
      query = query.eq('property_id', propertyId)
    }

    query = query.order('property_name').order('year', { ascending: false })

    const { data, error } = await query

    if (error) {
      console.error('Error fetching property cashflow:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Exception in getPropertyCashflow:', error)
    return []
  }
}

/**
 * Récupère les flux par source de paiement
 * @param year - Année à filtrer (optionnel)
 */
export async function getCashflowBySource(year?: number) {
  try {
    let query = supabase
      .from('v_cashflow_by_source')
      .select('*')

    if (year) {
      query = query.eq('year', year)
    }

    query = query.order('year', { ascending: false }).order('month', { ascending: false })

    const { data, error } = await query

    if (error) {
      console.error('Error fetching cashflow by source:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Exception in getCashflowBySource:', error)
    return []
  }
}

/**
 * Récupère les coûts opérationnels
 * @param year - Année à filtrer (optionnel)
 * @param category - Catégorie à filtrer (optionnel)
 */
export async function getOperationalCosts(year?: number, category?: string) {
  try {
    let query = supabase
      .from('v_operational_costs')
      .select('*')

    if (year) {
      query = query.eq('year', year)
    }

    if (category) {
      query = query.eq('category', category)
    }

    query = query.order('year', { ascending: false }).order('month', { ascending: false })

    const { data, error } = await query

    if (error) {
      console.error('Error fetching operational costs:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Exception in getOperationalCosts:', error)
    return []
  }
}
