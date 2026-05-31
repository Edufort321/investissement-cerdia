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

// ⚠️ orgId OBLIGATOIRE pour l'isolation tenant : sans filtre organization_id, le
// hook agrégeait les propriétés/réservations de TOUS les tenants (fuite démo →
// CERDIA, ou entre clients). On scope désormais explicitement sur l'org effective.
export function useOwnerDays(orgId: string | null = null): OwnerDaysResult {
  const [totalProjectDays, setTotalProjectDays] = useState(0)
  const [usedDays, setUsedDays] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const currentYear = new Date().getFullYear()

  useEffect(() => {
    // Tant qu'on n'a pas l'org, on ne charge rien (évite d'agréger tous les tenants).
    if (!orgId) { setTotalProjectDays(0); setUsedDays({}); setLoading(false); return }
    const load = async () => {
      setLoading(true)
      try {
        // Jours propriétaire: projets actifs/livrés DU TENANT uniquement (pas en_construction)
        const { data: props } = await supabase
          .from('properties')
          .select('owner_occupation_days')
          .eq('organization_id', orgId)
          .in('status', ['livré', 'complete', 'actif'])

        const total = (props || []).reduce((sum, p) => sum + (p.owner_occupation_days || 0), 0)
        setTotalProjectDays(total)

        // Jours utilisés par investisseur cette année — DU TENANT uniquement
        const { data: reservations } = await supabase
          .from('investor_reservations')
          .select('investor_id, start_date, end_date')
          .eq('organization_id', orgId)
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
  }, [currentYear, orgId])

  const entitledDays = (pct: number) =>
    Math.floor((pct / 100) * totalProjectDays)

  const remainingDays = (investorId: string, pct: number) =>
    entitledDays(pct) - (usedDays[investorId] ?? 0)

  return { totalProjectDays, usedDays, loading, entitledDays, remainingDays }
}
