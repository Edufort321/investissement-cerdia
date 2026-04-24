'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface OwnerDaysResult {
  totalProjectDays: number
  usedDays: Record<string, number>  // investorId → days used current year
  loading: boolean
  /** entitledDays(pct, totalDays): floor(pct/100 * totalDays) */
  entitledDays: (percentageOwnership: number) => number
  /** remainingDays(investorId, pct): entitled - used */
  remainingDays: (investorId: string, percentageOwnership: number) => number
}

export function useOwnerDays(): OwnerDaysResult {
  const [totalProjectDays, setTotalProjectDays] = useState(0)
  const [usedDays, setUsedDays] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const currentYear = new Date().getFullYear()

  useEffect(() => {
    const load = async () => {
      try {
        // Jours propriétaire totaux — projets livrés (livré > complete > actif > purchased)
        const { data: props } = await supabase
          .from('properties')
          .select('owner_occupation_days, status')
          .in('status', ['livré', 'complete', 'actif'])

        const total = (props || []).reduce((sum, p) => sum + (p.owner_occupation_days || 0), 0)

        // Fallback: if nothing yet marked livré, use all properties with owner_occupation_days
        if (total === 0) {
          const { data: allProps } = await supabase
            .from('properties')
            .select('owner_occupation_days')
            .not('owner_occupation_days', 'is', null)
          const fallback = (allProps || []).reduce((sum, p) => sum + (p.owner_occupation_days || 0), 0)
          setTotalProjectDays(fallback)
        } else {
          setTotalProjectDays(total)
        }

        // Jours utilisés par investisseur cette année
        const { data: reservations } = await supabase
          .from('investor_reservations')
          .select('investor_id, start_date, end_date')
          .eq('status', 'confirmed')
          .gte('start_date', `${currentYear}-01-01`)
          .lte('start_date', `${currentYear}-12-31`)

        const used: Record<string, number> = {}
        for (const r of reservations || []) {
          const d1 = new Date(r.start_date)
          const d2 = new Date(r.end_date)
          const days = Math.round((d2.getTime() - d1.getTime()) / 86400000) + 1
          used[r.investor_id] = (used[r.investor_id] || 0) + days
        }
        setUsedDays(used)
      } catch (e) {
        console.error('useOwnerDays error:', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [currentYear])

  const entitledDays = (pct: number) =>
    Math.floor((pct / 100) * totalProjectDays)

  const remainingDays = (investorId: string, pct: number) =>
    entitledDays(pct) - (usedDays[investorId] ?? 0)

  return { totalProjectDays, usedDays, loading, entitledDays, remainingDays }
}
