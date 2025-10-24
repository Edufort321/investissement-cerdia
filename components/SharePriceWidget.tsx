'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { TrendingUp, TrendingDown, DollarSign, Calendar, AlertCircle, Info } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

interface SharePrice {
  effective_date: string
  share_price: number
  price_change: number
  price_change_percentage: number
  total_assets: number
  total_liabilities: number
  net_asset_value: number
  total_shares: number
  total_return_percentage: number
  days_since_revision: number
  next_revision_date: string
  is_projected?: boolean
}

export default function SharePriceWidget() {
  const { t, language } = useLanguage()
  const [currentPrice, setCurrentPrice] = useState<SharePrice | null>(null)
  const [priceHistory, setPriceHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    fetchSharePrice()
    fetchPriceHistory()
  }, [])

  const fetchSharePrice = async () => {
    try {
      const { data, error } = await supabase
        .from('current_share_price')
        .select('*')
        .single()

      if (error) {
        // Si pas de prix, afficher 1,00$ par défaut
        const currentYear = new Date().getFullYear()
        const june1stThisYear = new Date(currentYear, 5, 1) // Mois 5 = juin (0-indexed)
        const now = new Date()
        const nextRevisionYear = now >= june1stThisYear ? currentYear + 1 : currentYear

        setCurrentPrice({
          effective_date: new Date().toISOString(),
          share_price: 1.0000,
          price_change: 0,
          price_change_percentage: 0,
          total_assets: 0,
          total_liabilities: 0,
          net_asset_value: 0,
          total_shares: 0,
          total_return_percentage: 0,
          days_since_revision: 0,
          next_revision_date: new Date(nextRevisionYear, 5, 1).toISOString()
        })
      } else {
        setCurrentPrice(data)
      }
    } catch (error) {
      console.error('Error fetching share price:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchPriceHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('share_price_history')
        .select('*')
        .eq('published', true)
        .order('effective_date', { ascending: false })
        .limit(12)

      if (error) throw error
      setPriceHistory(data || [])
    } catch (error) {
      console.error('Error fetching price history:', error)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(language === 'fr' ? 'fr-CA' : 'en-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 4,
      maximumFractionDigits: 4
    }).format(amount)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(language === 'fr' ? 'fr-CA' : 'en-CA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-8 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  if (!currentPrice) return null

  const isPositive = currentPrice.price_change >= 0

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="px-4 sm:px-6 py-4 sm:py-6">
        <div className="flex items-center justify-between mb-2 sm:mb-3">
          <h3 className="text-gray-600 text-xs sm:text-sm font-medium">
            {language === 'fr' ? 'Valeur de la part (NAV)' : 'Share Price (NAV)'}
          </h3>
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-100 rounded-full flex items-center justify-center">
            <DollarSign className="text-purple-600" size={18} />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
            {formatCurrency(currentPrice.share_price)}
          </p>
          {currentPrice.is_projected && (
            <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 rounded-full">
              {language === 'fr' ? 'Projeté' : 'Projected'}
            </span>
          )}
          {!currentPrice.is_projected && currentPrice.share_price !== 1.0000 && (
            <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded-full">
              {language === 'fr' ? 'Réel' : 'Actual'}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between mt-1 sm:mt-2">
          <div className={`flex items-center gap-1 text-xs sm:text-sm font-medium ${
            isPositive ? 'text-green-600' : 'text-red-600'
          }`}>
            {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            <span>
              {isPositive ? '+' : ''}{formatCurrency(currentPrice.price_change)}
              {' '}
              ({isPositive ? '+' : ''}{currentPrice.price_change_percentage?.toFixed(2)}%)
            </span>
          </div>

          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-gray-500 hover:text-gray-700 p-1 rounded-lg transition-colors"
          >
            <Info size={16} />
          </button>
        </div>

        <p className="text-xs sm:text-sm text-gray-500 mt-1 sm:mt-2">
          {language === 'fr' ? 'Prochaine révision: ' : 'Next revision: '}
          {formatDate(currentPrice.next_revision_date)}
        </p>

        {/* Graphique d'évolution */}
        {priceHistory.length > 1 && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {language === 'fr' ? 'Évolution' : 'Evolution'}
              </p>
              {currentPrice.total_return_percentage !== 0 && (
                <span className={`text-xs font-semibold ${
                  currentPrice.total_return_percentage >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {currentPrice.total_return_percentage >= 0 ? '+' : ''}
                  {currentPrice.total_return_percentage?.toFixed(2)}% {language === 'fr' ? 'total' : 'total'}
                </span>
              )}
            </div>

            {/* Graphique SVG */}
            <div className="relative h-24 bg-gray-50 dark:bg-gray-700 rounded-lg overflow-hidden">
              <svg
                viewBox="0 0 100 40"
                className="w-full h-full"
                preserveAspectRatio="none"
              >
                {/* Grille horizontale légère */}
                <line x1="0" y1="10" x2="100" y2="10" stroke="currentColor" strokeWidth="0.1" className="text-gray-300 dark:text-gray-600" opacity="0.3" />
                <line x1="0" y1="20" x2="100" y2="20" stroke="currentColor" strokeWidth="0.1" className="text-gray-300 dark:text-gray-600" opacity="0.3" />
                <line x1="0" y1="30" x2="100" y2="30" stroke="currentColor" strokeWidth="0.1" className="text-gray-300 dark:text-gray-600" opacity="0.3" />

                {/* Ligne du graphique */}
                <polyline
                  fill="none"
                  stroke={isPositive ? '#10b981' : '#ef4444'}
                  strokeWidth="0.5"
                  points={priceHistory
                    .slice(0, 12)
                    .reverse()
                    .map((point, index, arr) => {
                      const minPrice = Math.min(...arr.map(p => p.share_price))
                      const maxPrice = Math.max(...arr.map(p => p.share_price))
                      const rangePrice = maxPrice - minPrice || 0.01

                      const x = (index / (arr.length - 1)) * 98 + 1
                      const y = 38 - ((point.share_price - minPrice) / rangePrice) * 36

                      return `${x},${y}`
                    })
                    .join(' ')}
                />

                {/* Aire sous la courbe */}
                <polygon
                  fill={isPositive ? '#10b981' : '#ef4444'}
                  opacity="0.1"
                  points={
                    priceHistory
                      .slice(0, 12)
                      .reverse()
                      .map((point, index, arr) => {
                        const minPrice = Math.min(...arr.map(p => p.share_price))
                        const maxPrice = Math.max(...arr.map(p => p.share_price))
                        const rangePrice = maxPrice - minPrice || 0.01

                        const x = (index / (arr.length - 1)) * 98 + 1
                        const y = 38 - ((point.share_price - minPrice) / rangePrice) * 36

                        return `${x},${y}`
                      })
                      .join(' ') + ' 99,38 1,38'
                  }
                />
              </svg>

              {/* Indicateur du prix */}
              <div className="absolute top-2 right-2 bg-white/90 dark:bg-gray-800/90 px-2 py-1 rounded text-xs font-semibold">
                {formatCurrency(currentPrice.share_price)}
              </div>
            </div>
          </div>
        )}

        {/* Détails étendus */}
        {showDetails && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
            <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              {language === 'fr' ? 'Détails du calcul NAV' : 'NAV Calculation Details'}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="bg-gray-50 dark:bg-gray-700 rounded p-2 border border-gray-200 dark:border-gray-600">
                <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                  {language === 'fr' ? 'Actifs' : 'Assets'}
                </div>
                <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                  {formatCurrency(currentPrice.total_assets)}
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 rounded p-2 border border-gray-200 dark:border-gray-600">
                <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                  {language === 'fr' ? 'Passifs' : 'Liabilities'}
                </div>
                <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                  {formatCurrency(currentPrice.total_liabilities)}
                </div>
              </div>

              <div className="bg-green-50 dark:bg-green-900/20 rounded p-2 border border-green-200 dark:border-green-700">
                <div className="text-xs text-green-700 dark:text-green-400 font-medium mb-1">
                  {language === 'fr' ? 'NAV' : 'NAV'}
                </div>
                <div className="text-sm font-bold text-green-800 dark:text-green-300">
                  {formatCurrency(currentPrice.net_asset_value)}
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 rounded p-2 border border-gray-200 dark:border-gray-600">
                <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                  {language === 'fr' ? 'Parts' : 'Shares'}
                </div>
                <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                  {currentPrice.total_shares.toLocaleString(language === 'fr' ? 'fr-CA' : 'en-CA', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                  })}
                </div>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded p-2 flex gap-2">
              <AlertCircle size={14} className="text-blue-700 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-blue-800 dark:text-blue-300">
                {language === 'fr'
                  ? 'Révision annuelle le 1er juin basée sur les évaluations.'
                  : 'Annual revision on June 1st based on valuations.'}
              </div>
            </div>

            {currentPrice.is_projected && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded p-2 flex gap-2">
                <AlertCircle size={14} className="text-amber-700 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-amber-800 dark:text-amber-300">
                  {language === 'fr'
                    ? 'Prix projeté avec croissance de 5% mensuel. Sera remplacé par les calculs basés sur les évaluations réelles des propriétés.'
                    : 'Projected price with 5% monthly growth. Will be replaced by calculations based on actual property valuations.'}
                </div>
              </div>
            )}

            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded p-2 flex gap-2">
              <Info size={14} className="text-purple-700 dark:text-purple-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-purple-800 dark:text-purple-300">
                {language === 'fr'
                  ? 'Le prix de transaction entre investisseurs reste à 1,00 $ (fixé par le conseil d\'administration). Le NAV est un indicateur de performance.'
                  : 'Transaction price between investors remains at $1.00 (set by board of directors). NAV is a performance indicator.'}
              </div>
            </div>
          </div>
        )}

        {/* Mini historique */}
        {priceHistory.length > 1 && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              {language === 'fr' ? 'Historique' : 'History'}
            </div>
            <div className="space-y-1">
              {priceHistory.slice(0, 3).map((price) => (
                <div
                  key={price.id}
                  className="flex items-center justify-between text-xs bg-gray-50 dark:bg-gray-700 rounded p-2 border border-gray-200 dark:border-gray-600"
                >
                  <div className="text-gray-600 dark:text-gray-400">
                    {new Date(price.effective_date).toLocaleDateString(language === 'fr' ? 'fr-CA' : 'en-CA')}
                  </div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    {formatCurrency(price.share_price)}
                  </div>
                  <div className={`text-xs ${
                    price.price_change_percentage >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {price.price_change_percentage >= 0 ? '+' : ''}
                    {price.price_change_percentage?.toFixed(2)}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
