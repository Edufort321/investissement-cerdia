/**
 * Dashboard Compte Courant dédié
 * Utilise la vue v_compte_courant_monthly (migration 95)
 */

'use client'

import { useCompteCourantMonthly } from '@/hooks/useFinancialSummary'
import { useState } from 'react'
import { Wallet, TrendingUp, TrendingDown, Calendar } from 'lucide-react'

export default function CompteCourantDashboard() {
  const currentYear = new Date().getFullYear()
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const { data, loading, error } = useCompteCourantMonthly(selectedYear)

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

  if (!data || data.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <p className="text-yellow-800">⚠️ Aucune donnée de compte courant pour {selectedYear}</p>
        <p className="text-sm text-yellow-700 mt-2">
          Créez des transactions avec affects_compte_courant = true pour voir les données.
        </p>
      </div>
    )
  }

  const totalInflow = data.reduce((sum, d) => sum + d.total_inflow, 0)
  const totalOutflow = data.reduce((sum, d) => sum + d.total_outflow, 0)
  const netBalance = data.reduce((sum, d) => sum + d.net_balance, 0)

  const totalCoutOperation = data.reduce((sum, d) => sum + d.cout_operation, 0)
  const totalCoutMaintenance = data.reduce((sum, d) => sum + d.cout_maintenance, 0)
  const totalCoutAdmin = data.reduce((sum, d) => sum + d.cout_admin, 0)
  const totalCoutProjet = data.reduce((sum, d) => sum + d.cout_projet, 0)

  // Années disponibles
  const uniqueYears = Array.from(new Set(data.map(d => d.year))).sort((a, b) => b - a)
  if (!uniqueYears.includes(currentYear)) {
    uniqueYears.unshift(currentYear)
  }

  // Ordre chronologique inversé (le plus récent en premier)
  const sortedData = [...data].sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year
    return b.month - a.month
  })

  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ]

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

      {/* KPIs Résumé Annuel */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-700">Entrées Totales</p>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-green-600">
            +{totalInflow.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-gray-500 mt-1">{selectedYear}</p>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-lg border border-red-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-700">Sorties Totales</p>
            <TrendingDown className="w-5 h-5 text-red-600" />
          </div>
          <p className="text-2xl font-bold text-red-600">
            -{totalOutflow.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-gray-500 mt-1">{selectedYear}</p>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-700">Balance Nette</p>
            <Wallet className="w-5 h-5 text-blue-600" />
          </div>
          <p className={`text-2xl font-bold ${netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {netBalance.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0, signDisplay: 'always' })}
          </p>
          <p className="text-xs text-gray-500 mt-1">{selectedYear}</p>
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

      {/* Coûts par catégorie */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Coûts par Catégorie ({selectedYear})</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-orange-50 rounded-lg border border-orange-200">
            <p className="text-xs text-gray-600 mb-1">Opération</p>
            <p className="font-bold text-orange-600">
              {totalCoutOperation.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
            </p>
          </div>
          <div className="text-center p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <p className="text-xs text-gray-600 mb-1">Maintenance</p>
            <p className="font-bold text-yellow-600">
              {totalCoutMaintenance.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
            </p>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg border border-purple-200">
            <p className="text-xs text-gray-600 mb-1">Administration</p>
            <p className="font-bold text-purple-600">
              {totalCoutAdmin.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
            </p>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-xs text-gray-600 mb-1">Projet</p>
            <p className="font-bold text-blue-600">
              {totalCoutProjet.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
            </p>
          </div>
        </div>
      </div>

      {/* Tableau mensuel */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Détails Mensuels - {selectedYear}</h3>
        </div>
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
              {sortedData.map((monthData, index) => (
                <tr key={`${monthData.year}-${monthData.month}`} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-4 py-3 font-semibold text-gray-900">
                    {monthNames[monthData.month - 1]} {monthData.year}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-green-600">
                    +{monthData.total_inflow.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-red-600">
                    -{monthData.total_outflow.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
                  </td>
                  <td className={`px-4 py-3 text-right font-bold ${monthData.net_balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {monthData.net_balance.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0, signDisplay: 'always' })}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-600">
                    {monthData.transaction_count}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>ℹ️ Comment ça fonctionne:</strong>
        </p>
        <ul className="text-sm text-blue-700 mt-2 ml-4 space-y-1">
          <li>• <strong>Entrées:</strong> Transactions avec affects_compte_courant = true et montant positif</li>
          <li>• <strong>Sorties:</strong> Transactions avec affects_compte_courant = true et montant négatif</li>
          <li>• <strong>Balance:</strong> Entrées - Sorties</li>
          <li>• Les transactions avec source = CAPEX ou investisseur_direct n'affectent PAS le compte courant</li>
          <li>• Les données sont calculées en temps réel depuis la table transactions</li>
        </ul>
      </div>
    </div>
  )
}
