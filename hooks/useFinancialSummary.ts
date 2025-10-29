/**
 * Hook React pour charger le résumé financier
 * Utilise les vues SQL créées dans migration 95
 */

import { useEffect, useState } from 'react'
import {
  getFinancialSummary,
  getCAPEXSummary,
  getCompteCourantMonthly,
  getPropertyCashflow,
  type FinancialSummary,
  type CAPEXSummary,
  type CompteCourantMonthly,
  type PropertyCashflow
} from '@/lib/financial-summary-service'

export function useFinancialSummary(year: number | null = null) {
  const [summary, setSummary] = useState<FinancialSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    async function load() {
      try {
        setLoading(true)
        setError(null)
        const data = await getFinancialSummary(year)
        if (isMounted) {
          setSummary(data)
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Error loading financial summary')
          console.error('useFinancialSummary error:', err)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      isMounted = false
    }
  }, [year])

  return { summary, loading, error, reload: () => {
    setLoading(true)
    getFinancialSummary(year).then(data => {
      setSummary(data)
      setLoading(false)
    })
  }}
}

export function useCAPEXSummary() {
  const [capexData, setCapexData] = useState<CAPEXSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    async function load() {
      try {
        setLoading(true)
        setError(null)
        const data = await getCAPEXSummary()
        if (isMounted) {
          setCapexData(data)
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Error loading CAPEX summary')
          console.error('useCAPEXSummary error:', err)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      isMounted = false
    }
  }, [])

  return { capexData, loading, error }
}

export function useCompteCourantMonthly(year?: number) {
  const [data, setData] = useState<CompteCourantMonthly[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    async function load() {
      try {
        setLoading(true)
        setError(null)
        const result = await getCompteCourantMonthly(year)
        if (isMounted) {
          setData(result)
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Error loading compte courant')
          console.error('useCompteCourantMonthly error:', err)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      isMounted = false
    }
  }, [year])

  return { data, loading, error }
}

export function usePropertyCashflow(propertyId?: string) {
  const [data, setData] = useState<PropertyCashflow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    async function load() {
      try {
        setLoading(true)
        setError(null)
        const result = await getPropertyCashflow(propertyId)
        if (isMounted) {
          setData(result)
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Error loading property cashflow')
          console.error('usePropertyCashflow error:', err)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      isMounted = false
    }
  }, [propertyId])

  return { data, loading, error }
}
