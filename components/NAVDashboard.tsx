'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface NAVHistoryPoint {
  id: string
  snapshot_date: string
  nav_per_share: number
  net_asset_value: number
  total_investments: number
  property_purchases: number
  properties_current_value: number
  properties_appreciation: number
  total_shares: number
  cash_balance: number | null
  total_properties: number | null
  period_change_pct: number | null
  total_change_pct: number | null
  days_since_previous: number | null
}

interface NAVSummary {
  current_nav: number
  current_nav_per_share: number
  current_appreciation: number
  last_snapshot_date: string | null
  last_snapshot_nav_per_share: number | null
  first_snapshot_date: string | null
  first_snapshot_nav_per_share: number | null
  total_performance_pct: number | null
  since_last_snapshot_pct: number | null
  total_investments: number
  properties_current_value: number
  total_snapshots: number
  latest_snapshot_date: string | null
}

export default function NAVDashboard() {
  const [summary, setSummary] = useState<NAVSummary | null>(null)
  const [history, setHistory] = useState<NAVHistoryPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [snapshotLoading, setSnapshotLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState<'all' | '6m' | '3m' | '1m'>('all')

  const supabase = createClient()

  useEffect(() => {
    loadNAVData()
  }, [])

  async function loadNAVData() {
    try {
      setLoading(true)
      setError(null)

      // Charger le résumé NAV
      const { data: summaryData, error: summaryError } = await supabase
        .from('v_nav_summary')
        .select('*')
        .single()

      if (summaryError) throw summaryError
      setSummary(summaryData)

      // Charger l'historique NAV
      const { data: historyData, error: historyError } = await supabase
        .from('v_nav_history_with_changes')
        .select('*')
        .order('snapshot_date', { ascending: true })

      if (historyError) throw historyError
      setHistory(historyData || [])

    } catch (err: any) {
      console.error('Error loading NAV data:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function createSnapshot() {
    try {
      setSnapshotLoading(true)
      setError(null)

      const { data, error } = await supabase.rpc('snapshot_nav', {
        p_snapshot_date: new Date().toISOString().split('T')[0]
      })

      if (error) throw error

      // Recharger les données
      await loadNAVData()
      alert('Snapshot créé avec succès!')

    } catch (err: any) {
      console.error('Error creating snapshot:', err)
      setError(err.message)
      alert('Erreur lors de la création du snapshot: ' + err.message)
    } finally {
      setSnapshotLoading(false)
    }
  }

  function formatCurrency(amount: number | null | undefined): string {
    if (amount == null) return '-'
    return new Intl.NumberFormat('fr-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  function formatPercent(pct: number | null | undefined): string {
    if (pct == null) return '-'
    const sign = pct >= 0 ? '+' : ''
    return `${sign}${pct.toFixed(2)}%`
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('fr-CA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  function getFilteredHistory(): NAVHistoryPoint[] {
    if (selectedPeriod === 'all') return history

    const now = new Date()
    const cutoffDate = new Date()

    switch (selectedPeriod) {
      case '1m':
        cutoffDate.setMonth(now.getMonth() - 1)
        break
      case '3m':
        cutoffDate.setMonth(now.getMonth() - 3)
        break
      case '6m':
        cutoffDate.setMonth(now.getMonth() - 6)
        break
    }

    return history.filter(point => new Date(point.snapshot_date) >= cutoffDate)
  }

  function getPerformanceColor(pct: number | null | undefined): string {
    if (pct == null) return 'text-gray-600'
    if (pct > 0) return 'text-green-600'
    if (pct < 0) return 'text-red-600'
    return 'text-gray-600'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement du NAV...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-red-800 font-semibold mb-2">Erreur</h3>
        <p className="text-red-700">{error}</p>
        <button
          onClick={loadNAVData}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Réessayer
        </button>
      </div>
    )
  }

  if (!summary) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h3 className="text-yellow-800 font-semibold mb-2">Aucune donnée NAV</h3>
        <p className="text-yellow-700 mb-4">
          Aucune donnée NAV disponible. La migration 97 doit être exécutée sur Supabase.
        </p>
      </div>
    )
  }

  const filteredHistory = getFilteredHistory()

  return (
    <div className="space-y-6">
      {/* En-tête avec bouton snapshot */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Valeur Liquidative (NAV)</h2>
          <p className="text-sm text-gray-600 mt-1">
            Suivi de la performance du fonds avec appréciation de 8% annuel sur les propriétés
          </p>
        </div>
        <button
          onClick={createSnapshot}
          disabled={snapshotLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {snapshotLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              Création...
            </>
          ) : (
            <>
              <span>📸</span>
              Créer un snapshot
            </>
          )}
        </button>
      </div>

      {/* KPIs principaux */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* NAV par action actuel */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="text-sm text-gray-600 mb-1">NAV par action</div>
          <div className="text-3xl font-bold text-blue-600">
            {summary.current_nav_per_share.toFixed(4)} $
          </div>
          {summary.since_last_snapshot_pct != null && (
            <div className={`text-sm mt-2 ${getPerformanceColor(summary.since_last_snapshot_pct)}`}>
              {formatPercent(summary.since_last_snapshot_pct)} depuis dernier snapshot
            </div>
          )}
        </div>

        {/* Performance totale */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="text-sm text-gray-600 mb-1">Performance totale</div>
          <div className={`text-3xl font-bold ${getPerformanceColor(summary.total_performance_pct)}`}>
            {formatPercent(summary.total_performance_pct)}
          </div>
          <div className="text-sm text-gray-600 mt-2">
            Depuis {formatDate(summary.first_snapshot_date)}
          </div>
        </div>

        {/* NAV total */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="text-sm text-gray-600 mb-1">NAV total</div>
          <div className="text-3xl font-bold text-gray-900">
            {formatCurrency(summary.current_nav)}
          </div>
          <div className="text-sm text-gray-600 mt-2">
            {formatCurrency(summary.current_appreciation)} d'appréciation
          </div>
        </div>

        {/* Valeur des propriétés */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="text-sm text-gray-600 mb-1">Valeur des propriétés</div>
          <div className="text-3xl font-bold text-gray-900">
            {formatCurrency(summary.properties_current_value)}
          </div>
          <div className="text-sm text-gray-600 mt-2">
            {formatCurrency(summary.total_investments)} investis
          </div>
        </div>
      </div>

      {/* Graphique historique */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Évolution du NAV</h3>
          <div className="flex gap-2">
            {(['1m', '3m', '6m', 'all'] as const).map(period => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period)}
                className={`px-3 py-1 text-sm rounded ${
                  selectedPeriod === period
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {period === 'all' ? 'Tout' : period.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {filteredHistory.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="mb-2">Aucun historique disponible pour cette période</p>
            <p className="text-sm">Créez des snapshots réguliers pour suivre l'évolution du NAV</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Simple graphique ASCII / Barres */}
            <div className="overflow-x-auto">
              <div className="min-w-full">
                {filteredHistory.map((point, idx) => {
                  const maxNav = Math.max(...filteredHistory.map(p => p.nav_per_share))
                  const barWidth = (point.nav_per_share / maxNav) * 100

                  return (
                    <div key={point.id} className="mb-4">
                      <div className="flex items-center gap-4">
                        <div className="w-32 text-sm text-gray-600 flex-shrink-0">
                          {new Date(point.snapshot_date).toLocaleDateString('fr-CA', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </div>
                        <div className="flex-1">
                          <div className="relative">
                            <div
                              className="h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded transition-all duration-300"
                              style={{ width: `${barWidth}%` }}
                            >
                              <div className="absolute inset-0 flex items-center justify-end pr-2">
                                <span className="text-white text-sm font-semibold">
                                  {point.nav_per_share.toFixed(4)} $
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className={`w-24 text-sm text-right flex-shrink-0 ${getPerformanceColor(point.period_change_pct)}`}>
                          {point.period_change_pct != null ? formatPercent(point.period_change_pct) : '-'}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Statistiques du graphique */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
              <div className="text-center">
                <div className="text-sm text-gray-600">Plus bas</div>
                <div className="text-lg font-semibold text-gray-900">
                  {Math.min(...filteredHistory.map(p => p.nav_per_share)).toFixed(4)} $
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-600">Moyenne</div>
                <div className="text-lg font-semibold text-gray-900">
                  {(filteredHistory.reduce((sum, p) => sum + p.nav_per_share, 0) / filteredHistory.length).toFixed(4)} $
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-600">Plus haut</div>
                <div className="text-lg font-semibold text-gray-900">
                  {Math.max(...filteredHistory.map(p => p.nav_per_share)).toFixed(4)} $
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tableau détaillé des snapshots */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Historique des snapshots</h3>

        {history.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="mb-2">Aucun snapshot disponible</p>
            <p className="text-sm">Créez votre premier snapshot pour commencer le suivi</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">NAV/action</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Var. période</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Var. totale</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">NAV total</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Appréciation</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Propriétés</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {history.slice().reverse().map((point) => (
                  <tr key={point.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {formatDate(point.snapshot_date)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                      {point.nav_per_share.toFixed(4)} $
                    </td>
                    <td className={`px-4 py-3 text-sm text-right font-medium ${getPerformanceColor(point.period_change_pct)}`}>
                      {formatPercent(point.period_change_pct)}
                    </td>
                    <td className={`px-4 py-3 text-sm text-right font-medium ${getPerformanceColor(point.total_change_pct)}`}>
                      {formatPercent(point.total_change_pct)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900">
                      {formatCurrency(point.net_asset_value)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-green-600">
                      {formatCurrency(point.properties_appreciation)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-600">
                      {point.total_properties || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-blue-900 mb-2">ℹ️ À propos du NAV</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Le NAV est calculé automatiquement avec une appréciation de 8% annuel sur les propriétés</li>
          <li>• Les snapshots peuvent être créés manuellement ou générés mensuellement</li>
          <li>• La performance est mesurée depuis le premier snapshot ({formatDate(summary.first_snapshot_date)})</li>
          <li>• Dernier snapshot: {formatDate(summary.last_snapshot_date)} ({summary.total_snapshots} au total)</li>
        </ul>
      </div>
    </div>
  )
}
