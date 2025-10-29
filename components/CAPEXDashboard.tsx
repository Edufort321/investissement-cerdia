/**
 * Dashboard CAPEX dédié
 * Utilise la vue v_capex_summary (migration 95)
 */

'use client'

import { useCAPEXSummary } from '@/hooks/useFinancialSummary'
import { TrendingUp, TrendingDown, DollarSign, Activity } from 'lucide-react'

export default function CAPEXDashboard() {
  const { capexData, loading, error } = useCAPEXSummary()

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-32 bg-gray-200 rounded-lg"></div>
        <div className="h-64 bg-gray-200 rounded-lg"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <p className="text-red-800">❌ Erreur: {error}</p>
      </div>
    )
  }

  if (!capexData || capexData.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <p className="text-yellow-800">⚠️ Aucune donnée CAPEX disponible</p>
        <p className="text-sm text-yellow-700 mt-2">
          Créez des transactions avec Source = CAPEX ou Catégorie = CAPEX pour voir les données.
        </p>
      </div>
    )
  }

  const currentYear = new Date().getFullYear()
  const currentYearData = capexData.find(d => d.year === currentYear)
  const totalBalance = capexData.reduce((sum, d) => sum + d.capex_balance, 0)

  return (
    <div className="space-y-6">
      {/* Titre */}
      <div className="flex items-center gap-3">
        <Activity className="text-purple-600" size={32} />
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dashboard CAPEX</h2>
          <p className="text-sm text-gray-600">Réserves et dépenses CAPEX en temps réel</p>
        </div>
      </div>

      {/* KPIs Résumé */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-700">Balance Totale</p>
            <DollarSign className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {totalBalance.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-gray-500 mt-1">Toutes années</p>
        </div>

        {currentYearData && (
          <>
            <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-700">CAPEX Reçu {currentYear}</p>
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {currentYearData.capex_received.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
              </p>
              <p className="text-xs text-gray-500 mt-1">{currentYearData.transaction_count} transactions</p>
            </div>

            <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-lg border border-red-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-700">CAPEX Dépensé {currentYear}</p>
                <TrendingDown className="w-5 h-5 text-red-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {currentYearData.capex_spent.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
              </p>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-700">Balance {currentYear}</p>
                <DollarSign className="w-5 h-5 text-blue-600" />
              </div>
              <p className={`text-2xl font-bold ${currentYearData.capex_balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {currentYearData.capex_balance.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Tableau historique par année */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Historique CAPEX par Année</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Année</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Reçu</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Dépensé</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Balance</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Transactions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {capexData.map((yearData, index) => (
                <tr key={yearData.year} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-4 py-3 font-semibold text-gray-900">
                    {yearData.year}
                    {yearData.year === currentYear && (
                      <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-800 text-xs rounded-full">
                        Actuel
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-green-600">
                    +{yearData.capex_received.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-red-600">
                    -{yearData.capex_spent.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
                  </td>
                  <td className={`px-4 py-3 text-right font-bold ${yearData.capex_balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {yearData.capex_balance.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-600">
                    {yearData.transaction_count}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-100 border-t-2 border-gray-300">
              <tr>
                <td className="px-4 py-3 font-bold text-gray-900">TOTAL</td>
                <td className="px-4 py-3 text-right font-bold text-green-600">
                  +{capexData.reduce((sum, d) => sum + d.capex_received, 0).toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
                </td>
                <td className="px-4 py-3 text-right font-bold text-red-600">
                  -{capexData.reduce((sum, d) => sum + d.capex_spent, 0).toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
                </td>
                <td className={`px-4 py-3 text-right font-bold ${totalBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {totalBalance.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
                </td>
                <td className="px-4 py-3 text-center font-bold text-gray-900">
                  {capexData.reduce((sum, d) => sum + d.transaction_count, 0)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>ℹ️ Comment ça fonctionne:</strong>
        </p>
        <ul className="text-sm text-blue-700 mt-2 ml-4 space-y-1">
          <li>• <strong>CAPEX Reçu:</strong> Transactions avec Source = "CAPEX" et montant positif (transferts vers réserve)</li>
          <li>• <strong>CAPEX Dépensé:</strong> Transactions avec Catégorie = "CAPEX" et montant négatif (dépenses depuis réserve)</li>
          <li>• <strong>Balance:</strong> CAPEX Reçu - CAPEX Dépensé</li>
          <li>• Les données sont calculées en temps réel depuis la table transactions</li>
        </ul>
      </div>
    </div>
  )
}
