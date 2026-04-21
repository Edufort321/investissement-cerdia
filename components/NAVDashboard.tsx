'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

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

interface DetailedNAVData {
  // Flux de trésorerie
  total_investments: number
  property_purchases: number
  capex_expenses: number
  maintenance_expenses: number
  admin_expenses: number
  rental_income: number

  // Solde
  cash_balance: number

  // Propriétés
  properties_initial_value: number
  properties_current_value: number
  properties_appreciation: number

  // NAV
  total_assets: number
  total_liabilities: number
  net_asset_value: number
  total_shares: number
  nav_per_share: number
  nav_change_pct: number
}

export default function NAVDashboard() {
  const [summary, setSummary] = useState<NAVSummary | null>(null)
  const [detailedNavData, setDetailedNavData] = useState<DetailedNAVData | null>(null)
  const [history, setHistory] = useState<NAVHistoryPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [snapshotLoading, setSnapshotLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState<'all' | '6m' | '3m' | '1m'>('all')

  useEffect(() => {
    loadNAVData()
  }, [])

  async function loadNAVData() {
    try {
      setLoading(true)
      setError(null)

      // Calculer le NAV actuel EN TEMPS RÉEL basé sur les transactions
      const { data: currentNavRaw, error: navError } = await supabase
        .rpc('calculate_realistic_nav_v2', {
          p_target_date: new Date().toISOString().split('T')[0]
        })

      if (navError) {
        console.error('Erreur calcul NAV actuel:', navError)
        throw navError
      }

      // La fonction RPC retourne un array avec un objet dedans: [{...}]
      // Extraire le premier élément
      const currentNavData = Array.isArray(currentNavRaw) && currentNavRaw.length > 0
        ? currentNavRaw[0]
        : null

      if (!currentNavData) {
        throw new Error('Aucune donnée NAV retournée par calculate_realistic_nav_v2')
      }

      // Charger l'historique des snapshots (pour le graphique)
      const { data: historyData, error: historyError } = await supabase
        .from('nav_history')
        .select('*')
        .order('snapshot_date', { ascending: true })

      if (historyError && historyError.code !== 'PGRST116') throw historyError
      setHistory(historyData || [])

      // Construire le summary à partir du NAV actuel + historique
      if (currentNavData) {
        const firstSnapshot = historyData && historyData.length > 0 ? historyData[0] : null
        const lastSnapshot = historyData && historyData.length > 0 ? historyData[historyData.length - 1] : null

        const summaryData: NAVSummary = {
          current_nav: currentNavData.net_asset_value,
          current_nav_per_share: currentNavData.nav_per_share,
          current_appreciation: currentNavData.properties_appreciation,
          last_snapshot_date: lastSnapshot?.snapshot_date || null,
          last_snapshot_nav_per_share: lastSnapshot?.nav_per_share || null,
          first_snapshot_date: firstSnapshot?.snapshot_date || null,
          first_snapshot_nav_per_share: firstSnapshot?.nav_per_share || null,
          total_performance_pct: firstSnapshot
            ? ((currentNavData.nav_per_share - firstSnapshot.nav_per_share) / firstSnapshot.nav_per_share * 100)
            : null,
          since_last_snapshot_pct: lastSnapshot
            ? ((currentNavData.nav_per_share - lastSnapshot.nav_per_share) / lastSnapshot.nav_per_share * 100)
            : null,
          total_investments: currentNavData.total_investments,
          properties_current_value: currentNavData.properties_current_value,
          total_snapshots: historyData?.length || 0,
          latest_snapshot_date: lastSnapshot?.snapshot_date || null
        }

        setSummary(summaryData)
      }

      // Stocker les données détaillées pour affichage
      setDetailedNavData(currentNavData)

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
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-red-800 font-semibold mb-2">❌ Erreur de configuration NAV</h3>
        <p className="text-red-700 mb-4">
          Le système NAV ne peut pas calculer la valeur actuelle. Cela signifie que les migrations NAV ne sont pas exécutées sur Supabase.
        </p>
        <div className="bg-white rounded p-4 mb-4">
          <p className="text-sm text-gray-700 mb-2"><strong>📋 Migrations requises:</strong></p>
          <ol className="text-sm text-gray-700 list-decimal list-inside space-y-1">
            <li>Migration 85: <code className="bg-gray-100 px-2 py-1 rounded">85-fix-nav-use-correct-schema.sql</code></li>
            <li>Migration 97: <code className="bg-gray-100 px-2 py-1 rounded">97-add-nav-history-tracking.sql</code></li>
          </ol>
        </div>
        <button
          onClick={loadNAVData}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          🔄 Réessayer
        </button>
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
            Calculé automatiquement en temps réel basé sur vos transactions et propriétés (8% appréciation annuelle)
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

      {/* Section détaillée: Calcul NAV */}
      {detailedNavData && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">🧮 Calcul détaillé du NAV</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Actifs */}
            <div>
              <h4 className="text-md font-semibold text-green-700 mb-3">💰 ACTIFS</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Trésorerie (compte courant)</span>
                  <span className="text-sm font-medium text-gray-900">{formatCurrency(detailedNavData.cash_balance)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Valeur des propriétés</span>
                  <span className="text-sm font-medium text-gray-900">{formatCurrency(detailedNavData.properties_current_value)}</span>
                </div>
                <div className="border-t border-gray-200 pt-2 flex justify-between items-center">
                  <span className="text-sm font-semibold text-gray-900">Total Actifs</span>
                  <span className="text-sm font-bold text-green-600">{formatCurrency(detailedNavData.total_assets)}</span>
                </div>
              </div>
            </div>

            {/* Passifs */}
            <div>
              <h4 className="text-md font-semibold text-red-700 mb-3">💳 PASSIFS</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Dettes et obligations</span>
                  <span className="text-sm font-medium text-gray-900">{formatCurrency(detailedNavData.total_liabilities)}</span>
                </div>
                <div className="border-t border-gray-200 pt-2 flex justify-between items-center">
                  <span className="text-sm font-semibold text-gray-900">Total Passifs</span>
                  <span className="text-sm font-bold text-red-600">{formatCurrency(detailedNavData.total_liabilities)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* NAV final */}
          <div className="mt-6 pt-6 border-t-2 border-gray-300">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-sm text-gray-600 mb-1">NAV Total</div>
                  <div className="text-2xl font-bold text-blue-600">{formatCurrency(detailedNavData.net_asset_value)}</div>
                  <div className="text-xs text-gray-500 mt-1">Actifs - Passifs</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-600 mb-1">Parts totales</div>
                  <div className="text-2xl font-bold text-gray-900">{detailedNavData.total_shares.toFixed(2)}</div>
                  <div className="text-xs text-gray-500 mt-1">Actions en circulation</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-600 mb-1">NAV par part</div>
                  <div className="text-2xl font-bold text-blue-600">{detailedNavData.nav_per_share.toFixed(4)} $</div>
                  <div className="text-xs text-gray-500 mt-1">Valeur de chaque action</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section: Propriétés et Appréciation */}
      {detailedNavData && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">🏢 Immeubles et Appréciation</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Valeur d'achat (USD → CAD)</div>
              <div className="text-xl font-bold text-gray-900">{formatCurrency(detailedNavData.properties_initial_value)}</div>
              <div className="text-xs text-gray-500 mt-1">Prix payé pour les propriétés</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Valeur actuelle (8%/an)</div>
              <div className="text-xl font-bold text-green-600">{formatCurrency(detailedNavData.properties_current_value)}</div>
              <div className="text-xs text-gray-500 mt-1">Avec appréciation composée</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Gain d'appréciation</div>
              <div className="text-xl font-bold text-blue-600">{formatCurrency(detailedNavData.properties_appreciation)}</div>
              <div className="text-xs text-green-600 mt-1">
                {detailedNavData.properties_initial_value > 0
                  ? `+${((detailedNavData.properties_appreciation / detailedNavData.properties_initial_value) * 100).toFixed(2)}%`
                  : '-'}
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div className="flex-1">
                <h4 className="font-semibold text-yellow-900 mb-1">Appréciation scénario vs évaluation réelle</h4>
                <p className="text-sm text-yellow-800 mb-2">
                  Les valeurs ci-dessus utilisent un scénario d'appréciation automatique de 8% par an.
                  Pour un NAV précis, des évaluations réelles doivent être effectuées:
                </p>
                <ul className="text-sm text-yellow-800 space-y-1 ml-4 list-disc">
                  <li><strong>À la livraison</strong> de chaque propriété: évaluation initiale réelle</li>
                  <li><strong>Aux 2 ans</strong>: réévaluation pour ajuster le NAV</li>
                </ul>
                <p className="text-xs text-yellow-700 mt-2">
                  💡 <strong>À implanter:</strong> Système de rappel automatique pour les évaluations aux 2 ans
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section: Flux de trésorerie */}
      {detailedNavData && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">💸 Flux de trésorerie</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Entrées */}
            <div>
              <h4 className="text-md font-semibold text-green-700 mb-3">📥 ENTRÉES</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Investissements des commanditaires</span>
                  <span className="text-sm font-medium text-green-600">{formatCurrency(detailedNavData.total_investments)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Revenus locatifs</span>
                  <span className="text-sm font-medium text-green-600">{formatCurrency(detailedNavData.rental_income)}</span>
                </div>
                <div className="border-t border-gray-200 pt-2 flex justify-between items-center">
                  <span className="text-sm font-semibold text-gray-900">Total Entrées</span>
                  <span className="text-sm font-bold text-green-600">
                    {formatCurrency(detailedNavData.total_investments + detailedNavData.rental_income)}
                  </span>
                </div>
              </div>
            </div>

            {/* Sorties */}
            <div>
              <h4 className="text-md font-semibold text-red-700 mb-3">📤 SORTIES</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Achats de propriétés</span>
                  <span className="text-sm font-medium text-red-600">{formatCurrency(detailedNavData.property_purchases)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">CAPEX (améliorations)</span>
                  <span className="text-sm font-medium text-red-600">{formatCurrency(detailedNavData.capex_expenses)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Maintenance</span>
                  <span className="text-sm font-medium text-red-600">{formatCurrency(detailedNavData.maintenance_expenses)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Administration</span>
                  <span className="text-sm font-medium text-red-600">{formatCurrency(detailedNavData.admin_expenses)}</span>
                </div>
                <div className="border-t border-gray-200 pt-2 flex justify-between items-center">
                  <span className="text-sm font-semibold text-gray-900">Total Sorties</span>
                  <span className="text-sm font-bold text-red-600">
                    {formatCurrency(
                      detailedNavData.property_purchases +
                      detailedNavData.capex_expenses +
                      detailedNavData.maintenance_expenses +
                      detailedNavData.admin_expenses
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Solde compte courant */}
          <div className="mt-6 pt-6 border-t-2 border-gray-300">
            <div className={`rounded-lg p-4 ${detailedNavData.cash_balance >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-600 mb-1">💰 Solde du compte courant</div>
                  <div className="text-xs text-gray-500">Entrées - Sorties</div>
                </div>
                <div className={`text-3xl font-bold ${detailedNavData.cash_balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(detailedNavData.cash_balance)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
          <li>• <strong>Le NAV se met à jour automatiquement</strong> en temps réel basé sur vos transactions</li>
          <li>• Le calcul inclut: investissements + appréciation de 8% annuel sur les propriétés</li>
          <li>• Les <strong>snapshots sont optionnels</strong> - ils créent des points sur le graphique historique</li>
          {summary.total_snapshots > 0 && (
            <>
              <li>• Performance mesurée depuis le premier snapshot ({formatDate(summary.first_snapshot_date)})</li>
              <li>• Dernier snapshot: {formatDate(summary.last_snapshot_date)} ({summary.total_snapshots} au total)</li>
            </>
          )}
          {summary.total_snapshots === 0 && (
            <li>• <em>Aucun snapshot créé - créez-en pour voir l'évolution sur le graphique</em></li>
          )}
        </ul>
      </div>
    </div>
  )
}
