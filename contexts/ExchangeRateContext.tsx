'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface ExchangeRateContextType {
  rate: number
  loading: boolean
  error: string | null
  lastUpdated: string | null
  updateRate: (newRate: number, date: string) => void
  refreshRate: () => Promise<void>
}

const ExchangeRateContext = createContext<ExchangeRateContextType | undefined>(undefined)

export function ExchangeRateProvider({ children }: { children: ReactNode }) {
  const [rate, setRate] = useState<number>(1.35) // Taux par défaut
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

  const fetchRate = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/exchange-rate?days=1')
      if (!response.ok) {
        throw new Error('Failed to fetch exchange rate')
      }
      const data = await response.json()
      setRate(data.current.rate)
      setLastUpdated(data.current.date)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
      console.error('Error fetching exchange rate:', err)
      // Garder le taux par défaut en cas d'erreur
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRate()

    // Rafraîchir toutes les heures
    const interval = setInterval(fetchRate, 3600000)
    return () => clearInterval(interval)
  }, [])

  const updateRate = (newRate: number, date: string) => {
    setRate(newRate)
    setLastUpdated(date)
  }

  const refreshRate = async () => {
    await fetchRate()
  }

  return (
    <ExchangeRateContext.Provider value={{ rate, loading, error, lastUpdated, updateRate, refreshRate }}>
      {children}
    </ExchangeRateContext.Provider>
  )
}

export function useExchangeRate() {
  const context = useContext(ExchangeRateContext)
  if (context === undefined) {
    throw new Error('useExchangeRate must be used within an ExchangeRateProvider')
  }
  return context
}
