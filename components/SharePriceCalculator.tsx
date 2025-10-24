'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/contexts/LanguageContext'
import { Calculator, DollarSign, TrendingUp, TrendingDown, CheckCircle, AlertTriangle, Calendar } from 'lucide-react'

interface SharePriceCalculation {
  share_price: number
  total_assets: number
  total_liabilities: number
  net_asset_value: number
  total_shares: number
  message: string
}

interface SharePriceHistory {
  id: string
  effective_date: string
  revision_type: string
  share_price: number
  previous_price?: number
  total_assets: number
  total_liabilities: number
  net_asset_value: number
  total_shares: number
  published: boolean
  notes?: string
}

export default function SharePriceCalculator() {
  const { t, language } = useLanguage()
  const [calculation, setCalculation] = useState<SharePriceCalculation | null>(null)
  const [history, setHistory] = useState<SharePriceHistory[]>([])
  const [loading, setLoading] = useState(false)
  const [calculating, setCalculating] = useState(false)
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split('T')[0])
  const [revisionType, setRevisionType] = useState<'annual_june' | 'special'>('annual_june')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    loadHistory()
  }, [])

  const loadHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('share_price_history')
        .select('*')
        .order('effective_date', { ascending: false })
        .limit(10)

      if (error) throw error
      setHistory(data || [])
    } catch (error) {
      console.error('Error loading history:', error)
    }
  }

  const calculatePrice = async () => {
    setCalculating(true)
    try {
      const { data, error } = await supabase
        .rpc('calculate_share_price', {
          p_effective_date: effectiveDate,
          p_revision_type: revisionType,
          p_notes: notes || null
        })

      if (error) throw error

      if (data && data.length > 0) {
        setCalculation(data[0])
      }
    } catch (error) {
      console.error('Error calculating price:', error)
      alert(language === 'fr'
        ? 'Erreur lors du calcul du prix'
        : 'Error calculating price')
    } finally {
      setCalculating(false)
    }
  }

  const publishPrice = async () => {
    if (!calculation) return

    if (!confirm(language === 'fr'
      ? `Publier le nouveau prix des parts à ${formatCurrency(calculation.share_price)} ?`
      : `Publish new share price at ${formatCurrency(calculation.share_price)}?`
    )) {
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase
        .rpc('publish_share_price', {
          p_effective_date: effectiveDate
        })

      if (error) throw error

      alert(language === 'fr'
        ? 'Prix publié avec succès!'
        : 'Price published successfully!')

      setCalculation(null)
      setNotes('')
      loadHistory()
    } catch (error) {
      console.error('Error publishing price:', error)
      alert(language === 'fr'
        ? 'Erreur lors de la publication'
        : 'Error publishing price')
    } finally {
      setLoading(false)
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

  const formatCurrencyShort = (amount: number) => {
    return new Intl.NumberFormat(language === 'fr' ? 'fr-CA' : 'en-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const currentPrice = history.find(h => h.published)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {language === 'fr' ? 'Calcul du prix des parts (NAV)' : 'Share Price Calculator (NAV)'}
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {language === 'fr'
            ? 'Calculer et publier le nouveau prix des parts basé sur les évaluations de propriétés'
            : 'Calculate and publish new share price based on property valuations'}
        </p>
      </div>

      {/* Prix actuel */}
      {currentPrice && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                {language === 'fr' ? 'Prix actuel publié' : 'Current Published Price'}
              </p>
              <p className="text-3xl font-bold text-blue-900 dark:text-blue-100 mt-1">
                {formatCurrency(currentPrice.share_price)}
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                {language === 'fr' ? 'Effectif depuis le' : 'Effective since'}{' '}
                {new Date(currentPrice.effective_date).toLocaleDateString(language === 'fr' ? 'fr-CA' : 'en-CA')}
              </p>
            </div>
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center">
              <DollarSign className="text-blue-600 dark:text-blue-300" size={32} />
            </div>
          </div>
        </div>
      )}

      {/* Formulaire de calcul */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          {language === 'fr' ? 'Calculer un nouveau prix' : 'Calculate New Price'}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {language === 'fr' ? 'Date effective' : 'Effective Date'} *
            </label>
            <input
              type="date"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {language === 'fr' ? 'Type de révision' : 'Revision Type'}
            </label>
            <select
              value={revisionType}
              onChange={(e) => setRevisionType(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="annual_june">
                {language === 'fr' ? 'Révision annuelle (1er juin)' : 'Annual Revision (June 1st)'}
              </option>
              <option value="special">
                {language === 'fr' ? 'Révision spéciale' : 'Special Revision'}
              </option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {language === 'fr' ? 'Notes' : 'Notes'}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              rows={2}
              placeholder={language === 'fr' ? 'Raison de la révision...' : 'Reason for revision...'}
            />
          </div>
        </div>

        <button
          onClick={calculatePrice}
          disabled={calculating}
          className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
        >
          <Calculator size={20} />
          {calculating
            ? (language === 'fr' ? 'Calcul en cours...' : 'Calculating...')
            : (language === 'fr' ? 'Calculer le prix' : 'Calculate Price')}
        </button>
      </div>

      {/* Résultat du calcul */}
      {calculation && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {language === 'fr' ? 'Résultat du calcul' : 'Calculation Result'}
            </h3>
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <CheckCircle size={16} />
              <span>{calculation.message}</span>
            </div>
          </div>

          {/* Prix calculé */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-700 rounded-lg p-6 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700 dark:text-green-300 font-medium">
                  {language === 'fr' ? 'Nouveau prix calculé' : 'New Calculated Price'}
                </p>
                <p className="text-4xl font-bold text-green-900 dark:text-green-100 mt-1">
                  {formatCurrency(calculation.share_price)}
                </p>
                {currentPrice && (
                  <div className="flex items-center gap-2 mt-2 text-sm">
                    {calculation.share_price > currentPrice.share_price ? (
                      <>
                        <TrendingUp className="text-green-600" size={16} />
                        <span className="text-green-700 dark:text-green-300 font-medium">
                          +{formatCurrency(calculation.share_price - currentPrice.share_price)}
                          {' '}
                          (+{((calculation.share_price - currentPrice.share_price) / currentPrice.share_price * 100).toFixed(2)}%)
                        </span>
                      </>
                    ) : (
                      <>
                        <TrendingDown className="text-red-600" size={16} />
                        <span className="text-red-700 dark:text-red-300 font-medium">
                          {formatCurrency(calculation.share_price - currentPrice.share_price)}
                          {' '}
                          ({((calculation.share_price - currentPrice.share_price) / currentPrice.share_price * 100).toFixed(2)}%)
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>
              <div className="w-20 h-20 bg-green-100 dark:bg-green-800 rounded-full flex items-center justify-center">
                <DollarSign className="text-green-600 dark:text-green-300" size={40} />
              </div>
            </div>
          </div>

          {/* Détails du calcul */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                {language === 'fr' ? 'Total actifs' : 'Total Assets'}
              </p>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {formatCurrencyShort(calculation.total_assets)}
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                {language === 'fr' ? 'Total passifs' : 'Total Liabilities'}
              </p>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {formatCurrencyShort(calculation.total_liabilities)}
              </p>
            </div>

            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 border border-green-200 dark:border-green-700">
              <p className="text-xs text-green-700 dark:text-green-400 font-medium mb-1">
                {language === 'fr' ? 'Actif net (NAV)' : 'Net Asset Value'}
              </p>
              <p className="text-lg font-bold text-green-800 dark:text-green-300">
                {formatCurrencyShort(calculation.net_asset_value)}
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                {language === 'fr' ? 'Total parts' : 'Total Shares'}
              </p>
              <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {calculation.total_shares.toLocaleString(language === 'fr' ? 'fr-CA' : 'en-CA', {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0
                })}
              </p>
            </div>
          </div>

          {/* Formule */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4 mb-4">
            <p className="text-sm text-blue-900 dark:text-blue-100 font-mono text-center">
              {language === 'fr' ? 'Prix par part' : 'Price per share'} = ({formatCurrencyShort(calculation.total_assets)} - {formatCurrencyShort(calculation.total_liabilities)}) / {calculation.total_shares.toLocaleString()} = {formatCurrency(calculation.share_price)}
            </p>
          </div>

          {/* Bouton publier */}
          <button
            onClick={publishPrice}
            disabled={loading}
            className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            <CheckCircle size={20} />
            {loading
              ? (language === 'fr' ? 'Publication...' : 'Publishing...')
              : (language === 'fr' ? 'Publier ce prix' : 'Publish This Price')}
          </button>
        </div>
      )}

      {/* Historique */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {language === 'fr' ? 'Historique des prix' : 'Price History'}
          </h3>
        </div>

        {history.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            {language === 'fr' ? 'Aucun historique' : 'No history'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {language === 'fr' ? 'Date' : 'Date'}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {language === 'fr' ? 'Type' : 'Type'}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {language === 'fr' ? 'Prix' : 'Price'}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {language === 'fr' ? 'NAV' : 'NAV'}
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {language === 'fr' ? 'Statut' : 'Status'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {history.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                      {new Date(record.effective_date).toLocaleDateString(language === 'fr' ? 'fr-CA' : 'en-CA')}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 rounded text-xs">
                        {record.revision_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-gray-900 dark:text-gray-100">
                      {formatCurrency(record.share_price)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-600 dark:text-gray-400">
                      {formatCurrencyShort(record.net_asset_value)}
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      {record.published ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 rounded text-xs font-medium">
                          <CheckCircle size={12} />
                          {language === 'fr' ? 'Publié' : 'Published'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded text-xs">
                          <Calendar size={12} />
                          {language === 'fr' ? 'Brouillon' : 'Draft'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
