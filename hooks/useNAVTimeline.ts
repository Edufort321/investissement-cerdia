import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export interface NAVTimelinePoint {
  point_date: string
  nav_per_share: number
  net_asset_value: number
  total_shares: number
}

export function useNAVTimeline() {
  const [data, setData] = useState<NAVTimelinePoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    try {
      setLoading(true)
      setError(null)
      const { data: raw, error: rpcError } = await supabase.rpc('get_nav_timeline')
      if (rpcError) throw rpcError
      setData(
        (raw || []).map((r: any) => ({
          point_date:      r.point_date,
          nav_per_share:   Number(r.nav_per_share),
          net_asset_value: Number(r.net_asset_value),
          total_shares:    Number(r.total_shares),
        }))
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur timeline NAV')
      console.error('useNAVTimeline error:', e)
    } finally {
      setLoading(false)
    }
  }

  const current  = data.length > 0 ? data[data.length - 1] : null
  const initial  = data.length > 0 ? data[0] : null
  const pctChange = current && initial && initial.nav_per_share > 0
    ? (current.nav_per_share - initial.nav_per_share) / initial.nav_per_share * 100
    : 0

  return { data, loading, error, reload: load, current, pctChange }
}
