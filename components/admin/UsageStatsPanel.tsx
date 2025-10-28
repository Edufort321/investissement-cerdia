'use client'

import React, { useState, useEffect } from 'react'
import {
  DollarSign,
  TrendingUp,
  Activity,
  RefreshCw,
  Zap,
  CheckCircle,
  AlertCircle
} from 'lucide-react'

interface APIUsageStat {
  api: string
  calls: number
  cost: number
  costFormatted: string
  inputTokens?: number
  outputTokens?: number
}

interface UsageStats {
  usage: APIUsageStat[]
  totalCost: number
  totalCostFormatted: string
  profitMargin: number
  sellingPrice: number
  sellingPriceFormatted: string
  profit: number
  profitFormatted: string
  timestamp: string
}

export default function UsageStatsPanel() {
  const [stats, setStats] = useState<UsageStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [profitMargin, setProfitMargin] = useState(50) // 50% par défaut

  const fetchStats = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/usage-stats?margin=${profitMargin / 100}`)
      const data = await response.json()
      if (data.success) {
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Erreur chargement stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const resetStats = async () => {
    if (!confirm('Réinitialiser toutes les statistiques ?')) return

    try {
      const response = await fetch('/api/admin/usage-stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset' })
      })

      const data = await response.json()
      if (data.success) {
        fetchStats()
      }
    } catch (error) {
      console.error('Erreur reset:', error)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [profitMargin])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
        <span className="ml-3 text-gray-600">Chargement...</span>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="text-center p-12 text-gray-600">
        Erreur de chargement des statistiques
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          💰 Statistiques d&apos;utilisation API
        </h1>
        <div className="flex gap-3">
          <button
            onClick={fetchStats}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Actualiser
          </button>
          <button
            onClick={resetStats}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Profit Margin Selector */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-200 dark:border-gray-700">
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Marge de profit : {profitMargin}%
        </label>
        <input
          type="range"
          min="0"
          max="100"
          step="5"
          value={profitMargin}
          onChange={(e) => setProfitMargin(parseInt(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Cost */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl shadow-md p-6 border-2 border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Coût total API</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {stats.totalCostFormatted}
              </p>
            </div>
          </div>
        </div>

        {/* Selling Price */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl shadow-md p-6 border-2 border-green-200 dark:border-green-800">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Prix de vente</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {stats.sellingPriceFormatted}
              </p>
            </div>
          </div>
        </div>

        {/* Profit */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl shadow-md p-6 border-2 border-purple-200 dark:border-purple-800">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Profit ({profitMargin}%)</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {stats.profitFormatted}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* API Usage Details */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Détail par API
        </h3>

        {stats.usage.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Aucune utilisation API enregistrée</p>
          </div>
        ) : (
          <div className="space-y-3">
            {stats.usage.map((api, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    api.cost === 0 ? 'bg-green-100 dark:bg-green-900' : 'bg-orange-100 dark:bg-orange-900'
                  }`}>
                    {api.cost === 0 ? (
                      <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                    ) : (
                      <DollarSign className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">
                      {api.api}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {api.calls} appel{api.calls > 1 ? 's' : ''}
                      {api.inputTokens && ` • ${api.inputTokens.toLocaleString()} tokens in`}
                      {api.outputTokens && ` • ${api.outputTokens.toLocaleString()} tokens out`}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {api.costFormatted}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {api.cost === 0 ? 'Gratuit' : 'Payant'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pricing Formula */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl shadow-md p-6 border-2 border-indigo-200 dark:border-indigo-800">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
          📊 Formule de calcul
        </h3>
        <div className="space-y-2 text-gray-700 dark:text-gray-300">
          <p>
            <strong>Coût total:</strong> {stats.totalCostFormatted}
          </p>
          <p>
            <strong>Marge de profit:</strong> {profitMargin}% → +{stats.profitFormatted}
          </p>
          <div className="border-t-2 border-indigo-300 dark:border-indigo-700 pt-2 mt-2">
            <p className="text-xl font-bold">
              Prix de vente final: {stats.sellingPriceFormatted}
            </p>
          </div>
        </div>
      </div>

      {/* Timestamp */}
      <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
        Dernière mise à jour : {new Date(stats.timestamp).toLocaleString('fr-FR')}
      </p>
    </div>
  )
}
