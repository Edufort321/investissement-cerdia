'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, TrendingDown, RefreshCw } from 'lucide-react'

interface ExchangeRateData {
  current: {
    date: string
    rate: number
  }
  history: Array<{
    date: string
    rate: number
  }>
  source: string
  lastUpdated: string
  error?: string
}

type TimePeriod = '30' | '90' | '180' | '365'

const PERIOD_LABELS: Record<TimePeriod, string> = {
  '30': '30 jours',
  '90': '3 mois',
  '180': '6 mois',
  '365': '1 an'
}

export default function ExchangeRateWidget() {
  const [data, setData] = useState<ExchangeRateData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('30')

  const fetchExchangeRate = async (days: string = selectedPeriod) => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`/api/exchange-rate?days=${days}`)
      if (!response.ok) {
        throw new Error('Failed to fetch exchange rate')
      }
      const result = await response.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
      console.error('Error fetching exchange rate:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchExchangeRate(selectedPeriod)
  }, [selectedPeriod])

  useEffect(() => {
    // Rafraîchir toutes les heures
    const interval = setInterval(() => fetchExchangeRate(selectedPeriod), 3600000)
    return () => clearInterval(interval)
  }, [selectedPeriod])

  if (loading && !data) {
    return (
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md border border-gray-200">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (!data) {
    return null
  }

  const { current, history } = data

  // Calculer la variation par rapport à hier
  const yesterdayRate = history.length > 1 ? history[history.length - 2].rate : current.rate
  const change = current.rate - yesterdayRate
  const changePercent = (change / yesterdayRate) * 100
  const isPositive = change >= 0

  // Préparer les données pour le graphique
  const minRate = Math.min(...history.map(h => h.rate))
  const maxRate = Math.max(...history.map(h => h.rate))
  const rangeRate = maxRate - minRate || 0.01 // Éviter division par zéro

  // Dimensions du graphique
  const width = 100
  const height = 40
  const padding = 2

  // Créer les points du graphique (path SVG)
  const points = history.map((point, index) => {
    const x = (index / (history.length - 1)) * (width - padding * 2) + padding
    const y = height - padding - ((point.rate - minRate) / rangeRate) * (height - padding * 2)
    return `${x},${y}`
  }).join(' ')

  return (
    <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md border border-gray-200">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-medium text-gray-600 mb-1">Taux de change USD → CAD</h3>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-gray-900">
              {current.rate.toFixed(4)}
            </span>
            <div className={`flex items-center gap-1 text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {isPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
              <span>
                {isPositive ? '+' : ''}{change.toFixed(4)} ({changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}%)
              </span>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Mis à jour: {new Date(current.date).toLocaleDateString('fr-CA', {
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            })}
          </p>
        </div>
        <button
          onClick={fetchExchangeRate}
          disabled={loading}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          title="Rafraîchir"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Filtres de période */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {(Object.keys(PERIOD_LABELS) as TimePeriod[]).map((period) => (
          <button
            key={period}
            onClick={() => setSelectedPeriod(period)}
            className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
              selectedPeriod === period
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {PERIOD_LABELS[period]}
          </button>
        ))}
      </div>

      {/* Graphique */}
      {history.length > 1 && (
        <div className="mt-4">
          <p className="text-xs font-medium text-gray-600 mb-2">Évolution sur {PERIOD_LABELS[selectedPeriod]}</p>
          <div className="relative">
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="w-full h-24"
              preserveAspectRatio="none"
            >
              {/* Grille de fond */}
              <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#e5e7eb" strokeWidth="0.5" />
              <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="#e5e7eb" strokeWidth="0.5" />
              <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#e5e7eb" strokeWidth="0.5" />

              {/* Ligne du graphique */}
              <polyline
                points={points}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Zone sous la courbe (gradient) */}
              <defs>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                </linearGradient>
              </defs>
              <polygon
                points={`${padding},${height - padding} ${points} ${width - padding},${height - padding}`}
                fill="url(#areaGradient)"
              />
            </svg>

            {/* Légendes */}
            <div className="flex justify-between mt-1 text-xs text-gray-500">
              <span>{history[0].date.split('-').slice(1).join('/')}</span>
              <span>
                Min: {minRate.toFixed(4)} | Max: {maxRate.toFixed(4)}
              </span>
              <span>{history[history.length - 1].date.split('-').slice(1).join('/')}</span>
            </div>
          </div>
        </div>
      )}

      {/* Source */}
      <div className="mt-4 pt-3 border-t border-gray-100">
        <p className="text-xs text-gray-500">
          Source: <span className="font-medium">{data.source}</span>
          {data.error && <span className="text-orange-600 ml-2">({data.error})</span>}
        </p>
      </div>
    </div>
  )
}
