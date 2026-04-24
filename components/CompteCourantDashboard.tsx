/**
 * Dashboard Compte Courant dédié
 * Utilise la vue v_compte_courant_monthly (migration 95)
 * Solde cumulatif toutes années via get_financial_summary()
 */

'use client'

import { useCompteCourantMonthly, useFinancialSummary } from '@/hooks/useFinancialSummary'
import { useState, useMemo } from 'react'
import { Wallet, TrendingUp, TrendingDown, Calendar } from 'lucide-react'

export default function CompteCourantDashboard() {
  const currentYear = new Date().getFullYear()
  const [selectedYear, setSelectedYear] = useState(currentYear)

  // Charger TOUTES les années (sans filtre) pour avoir le sélecteur complet
  const { data: allData, loading, error } = useCompteCourantMonthly()
  // Solde cumulatif toutes années — même source que FinancialKPIs
  const { summary: globalSummary } = useFinancialSummary(null)

  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ]

  // Années disponibles depuis les données réelles
  const uniqueYears = useMemo(() => {
    const years = Array.from(new Set((allData || []).map(d => d.year))).sort((a, b) => b - a)
    if (!years.includes(currentYear)) years.unshift(currentYear)
    return years
  }, [allData, currentYear])

  // Filtrer pour l'année sélectionnée
  const data = useMemo(
    () => (allData || []).filter(d => d.year === selectedYear).sort((a, b) => b.month - a.month),
    [allData, selectedYear]
  )

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-32 bg-gray-200 rounded-lg"></div>
        <div className="h-96 bg-gray-200 rounded-lg"></div>
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

  // Totaux pour l'année sélectionnée
  const totalInflow  = data.reduce((sum, d) => sum + d.total_inflow,  0)
  const totalOutflow = data.reduce((sum, d) => sum + d.total_outflow, 0)
  const netBalance   = data.reduce((sum, d) => sum + d.net_balance,   0)

  const totalCoutOperation  = data.reduce((sum, d) => sum + d.cout_operation,  0)
  const totalCoutMaintenance = data.reduce((sum, d) => sum + d.cout_maintenance, 0)
  const totalCoutAdmin      = data.reduce((sum, d) => sum + d.cout_admin,      0)
  const totalCoutProjet     = data.reduce((sum, d) => sum + d.cout_projet,     0)

  const fmt = (v: number) => v.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })
  const fmtSigned = (v: number) => v.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0, signDisplay: 'always' })

  const globalBalance = globalSummary?.compte_courant_balance ?? null

  return (
    <div className="space-y-6">
      {/* Titre et sélecteur d'année */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Wallet className="text-blue-600" size={32} />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Dashboard Compte Courant</h2>
            <p className="text-sm text-gray-600">Flux de trésorerie en temps réel</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Calendar size={20} className="text-gray-600" />
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          >
            {uniqueYears.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Solde cumulatif toutes années — source: get_financial_summary() */}
      <div className={`rounded-xl p-6 border-2 ${(globalBalance ?? 0) >= 0 ? 'bg-gradient-to-br from-green-50 to-green-100 border-green-300' : 'bg-gradient-to-br from-red-50 to-red-100 border-red-300'}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Solde Cumulatif — Toutes Années</p>
            <p className="text-xs text-gray-500 mt-1">Investissements + Revenus − Toutes dépenses</p>
          </div>
          <div className={`text-4xl font-bold ${(globalBalance ?? 0) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
            {globalBalance !== null ? fmt(globalBalance) : '—'}
          </div>
        </div>
      </div>

      {/* KPIs Résumé Annuel */}
      <div>
        <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">Détail {selectedYear}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-700">Entrées Totales</p>
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-green-600">+{fmt(totalInflow)}</p>
            <p className="text-xs text-gray-500 mt-1">{selectedYear}</p>
          </div>

          <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-lg border border-red-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-700">Sorties Totales</p>
              <TrendingDown className="w-5 h-5 text-red-600" />
            </div>
            <p className="text-2xl font-bold text-red-600">-{fmt(totalOutflow)}</p>
            <p className="text-xs text-gray-500 mt-1">{selectedYear}</p>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-700">Balance Nette {selectedYear}</p>
              <Wallet className="w-5 h-5 text-blue-600" />
            </div>
            <p className={`text-2xl font-bold ${netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {fmtSigned(netBalance)}
            </p>
            <p className="text-xs text-gray-500 mt-1">{selectedYear} seulement</p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-700">Transactions</p>
              <Calendar className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {data.reduce((sum, d) => sum + d.transaction_count, 0)}
            </p>
            <p className="text-xs text-gray-500 mt-1">{selectedYear}</p>
          </div>
        </div>
      </div>

      {/* Coûts par catégorie */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Coûts par Catégorie ({selectedYear})</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-orange-50 rounded-lg border border-orange-200">
            <p className="text-xs text-gray-600 mb-1">Opération</p>
            <p className="font-bold text-orange-600">{fmt(totalCoutOperation)}</p>
          </div>
          <div className="text-center p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <p className="text-xs text-gray-600 mb-1">Maintenance</p>
            <p className="font-bold text-yellow-600">{fmt(totalCoutMaintenance)}</p>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg border border-purple-200">
            <p className="text-xs text-gray-600 mb-1">Administration</p>
            <p className="font-bold text-purple-600">{fmt(totalCoutAdmin)}</p>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-xs text-gray-600 mb-1">Projet</p>
            <p className="font-bold text-blue-600">{fmt(totalCoutProjet)}</p>
          </div>
        </div>
      </div>

      {/* Tableau mensuel */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Détails Mensuels — {selectedYear}</h3>
        </div>
        {data.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            Aucune transaction pour {selectedYear}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Mois</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Entrées</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Sorties</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Balance</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Trans.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.map((monthData, index) => (
                  <tr key={`${monthData.year}-${monthData.month}`} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-3 font-semibold text-gray-900">
                      {monthNames[monthData.month - 1]} {monthData.year}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-green-600">
                      +{fmt(monthData.total_inflow)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-red-600">
                      -{fmt(monthData.total_outflow)}
                    </td>
                    <td className={`px-4 py-3 text-right font-bold ${monthData.net_balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {fmtSigned(monthData.net_balance)}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">
                      {monthData.transaction_count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>ℹ️ Sources:</strong> Le solde cumulatif provient de <code>get_financial_summary()</code> (même source que les KPIs du tableau de bord). Le détail mensuel provient de la vue <code>v_compte_courant_monthly</code>.
        </p>
      </div>
    </div>
  )
}
