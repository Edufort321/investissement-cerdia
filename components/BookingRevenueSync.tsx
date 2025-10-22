'use client'

import { useState, useEffect } from 'react'
import { RefreshCw, CheckCircle, AlertTriangle, XCircle, Clock } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface SyncStatus {
  scenario_id: string
  scenario_name: string
  current_year: number
  calculated_revenue: number
  synced_revenue: number | null
  sync_status: 'Non synchronisé' | 'À jour' | 'Désynchronisé'
  last_sync: string | null
}

interface SyncResult {
  scenario_id: string
  scenario_name: string
  year: number
  success: boolean
  message: string
  revenue_amount: number
}

export default function BookingRevenueSync() {
  const [syncStatuses, setSyncStatuses] = useState<SyncStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncingScenarioId, setSyncingScenarioId] = useState<string | null>(null)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  useEffect(() => {
    loadSyncStatuses()
  }, [])

  const loadSyncStatuses = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('booking_revenue_sync_status')
        .select('*')
        .order('scenario_name')

      if (error) throw error
      setSyncStatuses(data || [])
    } catch (error) {
      console.error('Error loading sync statuses:', error)
    } finally {
      setLoading(false)
    }
  }

  const syncScenario = async (scenarioId: string) => {
    setSyncingScenarioId(scenarioId)
    try {
      const { data, error } = await supabase
        .rpc('sync_complete_booking_data', {
          p_scenario_id: scenarioId,
          p_year: selectedYear
        })

      if (error) throw error

      if (data && data.length > 0 && data[0].success) {
        alert(`✅ ${data[0].message}\n\nRevenus: ${data[0].revenue_amount.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD' })}\nFrais gestion: ${data[0].management_fees.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD' })}\nRevenu net: ${data[0].net_income.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD' })}`)
      } else {
        alert(`❌ ${data[0]?.message || 'Erreur de synchronisation'}`)
      }

      await loadSyncStatuses()
    } catch (error) {
      console.error('Error syncing scenario:', error)
      alert('❌ Erreur lors de la synchronisation')
    } finally {
      setSyncingScenarioId(null)
    }
  }

  const syncAllScenarios = async () => {
    setSyncing(true)
    try {
      const { data, error } = await supabase
        .rpc('sync_all_booking_revenues', {
          p_year: selectedYear
        })

      if (error) throw error

      const successCount = data?.filter((r: SyncResult) => r.success).length || 0
      const totalCount = data?.length || 0

      alert(`✅ Synchronisation terminée!\n\n${successCount}/${totalCount} projets synchronisés avec succès`)

      await loadSyncStatuses()
    } catch (error) {
      console.error('Error syncing all scenarios:', error)
      alert('❌ Erreur lors de la synchronisation globale')
    } finally {
      setSyncing(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'À jour':
        return <CheckCircle className="text-green-600" size={20} />
      case 'Désynchronisé':
        return <AlertTriangle className="text-orange-600" size={20} />
      case 'Non synchronisé':
        return <XCircle className="text-red-600" size={20} />
      default:
        return <Clock className="text-gray-600" size={20} />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'À jour':
        return 'bg-green-50 text-green-700 border-green-300'
      case 'Désynchronisé':
        return 'bg-orange-50 text-orange-700 border-orange-300'
      case 'Non synchronisé':
        return 'bg-red-50 text-red-700 border-red-300'
      default:
        return 'bg-gray-50 text-gray-700 border-gray-300'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const stats = {
    total: syncStatuses.length,
    synced: syncStatuses.filter(s => s.sync_status === 'À jour').length,
    outdated: syncStatuses.filter(s => s.sync_status === 'Désynchronisé').length,
    notSynced: syncStatuses.filter(s => s.sync_status === 'Non synchronisé').length
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Synchronisation des Revenus Bookings</h3>
          <p className="text-sm text-gray-600 mt-1">
            Synchronisez automatiquement les revenus des bookings vers les valeurs réelles
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button
            onClick={loadSyncStatuses}
            disabled={loading}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Actualiser
          </button>
          <button
            onClick={syncAllScenarios}
            disabled={syncing || syncStatuses.length === 0}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Synchronisation...' : 'Tout synchroniser'}
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
          <div className="text-xs text-gray-600 mb-1">Total projets</div>
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg border-2 border-green-300">
          <div className="text-xs text-green-700 mb-1">À jour</div>
          <div className="text-2xl font-bold text-green-800">{stats.synced}</div>
        </div>
        <div className="bg-orange-50 p-4 rounded-lg border-2 border-orange-300">
          <div className="text-xs text-orange-700 mb-1">Désynchronisés</div>
          <div className="text-2xl font-bold text-orange-800">{stats.outdated}</div>
        </div>
        <div className="bg-red-50 p-4 rounded-lg border-2 border-red-300">
          <div className="text-xs text-red-700 mb-1">Non synchronisés</div>
          <div className="text-2xl font-bold text-red-800">{stats.notSynced}</div>
        </div>
      </div>

      {/* Sync Status Table */}
      {syncStatuses.length === 0 ? (
        <div className="bg-white p-12 rounded-lg border border-gray-200 text-center">
          <p className="text-gray-600">Aucun projet trouvé</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="p-3 text-left text-sm font-semibold text-gray-700">Projet</th>
                  <th className="p-3 text-center text-sm font-semibold text-gray-700">Statut</th>
                  <th className="p-3 text-right text-sm font-semibold text-gray-700">Revenus calculés</th>
                  <th className="p-3 text-right text-sm font-semibold text-gray-700">Revenus synchronisés</th>
                  <th className="p-3 text-center text-sm font-semibold text-gray-700">Dernière sync</th>
                  <th className="p-3 text-center text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {syncStatuses.map((status) => (
                  <tr key={status.scenario_id} className="border-b hover:bg-gray-50">
                    <td className="p-3">
                      <div className="font-medium text-gray-900">{status.scenario_name}</div>
                      <div className="text-xs text-gray-600">Année {status.current_year}</div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-center">
                        <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${getStatusColor(status.sync_status)}`}>
                          {getStatusIcon(status.sync_status)}
                          <span className="text-xs font-medium">{status.sync_status}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-right font-medium text-gray-900">
                      {status.calculated_revenue.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
                    </td>
                    <td className="p-3 text-right">
                      {status.synced_revenue !== null
                        ? <span className="font-medium text-blue-600">
                            {status.synced_revenue.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
                          </span>
                        : <span className="text-gray-400">—</span>
                      }
                    </td>
                    <td className="p-3 text-center text-sm text-gray-600">
                      {status.last_sync
                        ? new Date(status.last_sync).toLocaleDateString('fr-CA', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })
                        : '—'
                      }
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => syncScenario(status.scenario_id)}
                        disabled={syncingScenarioId === status.scenario_id}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 mx-auto"
                      >
                        <RefreshCw size={14} className={syncingScenarioId === status.scenario_id ? 'animate-spin' : ''} />
                        {syncingScenarioId === status.scenario_id ? 'Sync...' : 'Synchroniser'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">ℹ️ Fonctionnement</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• La synchronisation calcule automatiquement les revenus totaux des bookings confirmés/complétés</li>
          <li>• Les frais de gestion sont calculés selon le % défini dans les paramètres du projet</li>
          <li>• Les données sont mises à jour dans la section "Valeurs Réelles vs Projections"</li>
          <li>• <strong>Auto-sync activé:</strong> Les revenus sont synchronisés automatiquement lors de l'ajout/modification/suppression d'un booking</li>
        </ul>
      </div>
    </div>
  )
}
