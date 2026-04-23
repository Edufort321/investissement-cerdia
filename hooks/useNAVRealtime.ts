import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export interface NAVRealtimeData {
  nav_per_share: number
  net_asset_value: number
  total_assets: number
  total_liabilities: number
  total_shares: number
  cash_balance: number
  total_investments: number
  properties_current_value: number
  properties_initial_value: number
  properties_appreciation: number
  capex_expenses: number
  maintenance_expenses: number
  admin_expenses: number
  rental_income: number
  nav_change_pct: number
}

export function useNAVRealtime() {
  const [data, setData] = useState<NAVRealtimeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    try {
      setLoading(true)
      setError(null)
      const { data: raw, error: rpcError } = await supabase.rpc('calculate_realistic_nav_v2', {
        p_target_date: new Date().toISOString().split('T')[0]
      })
      if (rpcError) throw rpcError
      if (raw && raw.length > 0) {
        const r = raw[0]
        setData({
          nav_per_share:             Number(r.nav_per_share ?? 1),
          net_asset_value:           Number(r.net_asset_value ?? 0),
          total_assets:              Number(r.total_assets ?? 0),
          total_liabilities:         Number(r.total_liabilities ?? 0),
          total_shares:              Number(r.total_shares ?? 0),
          cash_balance:              Number(r.cash_balance ?? 0),
          total_investments:         Number(r.total_investments ?? 0),
          properties_current_value:  Number(r.properties_current_value ?? 0),
          properties_initial_value:  Number(r.properties_initial_value ?? 0),
          properties_appreciation:   Number(r.properties_appreciation ?? 0),
          capex_expenses:            Number(r.capex_expenses ?? 0),
          maintenance_expenses:      Number(r.maintenance_expenses ?? 0),
          admin_expenses:            Number(r.admin_expenses ?? 0),
          rental_income:             Number(r.rental_income ?? 0),
          nav_change_pct:            Number(r.nav_change_pct ?? 0),
        })
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur NAV temps réel')
      console.error('useNAVRealtime error:', e)
    } finally {
      setLoading(false)
    }
  }

  return { data, loading, error, reload: load }
}
