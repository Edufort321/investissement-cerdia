'use client'

import { useInvestment } from '@/contexts/InvestmentContext'
import { useFinancialSummary } from '@/hooks/useFinancialSummary'
import { useState, useMemo } from 'react'
import { Wallet, TrendingUp, TrendingDown, Calendar } from 'lucide-react'

const INFLOW_TYPES  = ['investissement', 'loyer', 'loyer_locatif', 'revenu', 'dividende']
const OUTFLOW_TYPES = ['paiement', 'achat_propriete', 'capex', 'maintenance', 'admin',
                       'depense', 'remboursement_investisseur', 'courant', 'rnd', 'transfert']

const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
]

const ALL_YEARS = 'all'

export default function CompteCourantDashboard() {
  const { transactions } = useInvestment()
  const { summary: globalSummary } = useFinancialSummary(null)
  const currentYear = new Date().getFullYear()
  const [selectedYear, setSelectedYear] = useState<number | 'all'>(currentYear)

  const fmt = (v: number) =>
    v.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })
  const fmtSigned = (v: number) =>
    v.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0, signDisplay: 'always' })

  // Transactions actives uniquement
  const activeTx = useMemo(
    () => (transactions || []).filter(t => t && t.status !== 'cancelled'),
    [transactions]
  )

  // Années disponibles
  const uniqueYears = useMemo(() => {
    const years = Array.from(new Set(activeTx.map(t => new Date(t.date).getFullYear())))
      .sort((a, b) => b - a)
    if (!years.includes(currentYear)) years.unshift(currentYear)
    return years
  }, [activeTx, currentYear])

  // Agrégation mensuelle depuis les transactions brutes
  const monthlyData = useMemo(() => {
    const map = new Map<string, {
      year: number; month: number; period: string
      inflow: number; outflow: number; count: number
    }>()

    for (const t of activeTx) {
      const d     = new Date(t.date)
      const year  = d.getFullYear()
      const month = d.getMonth() + 1
      const key   = `${year}-${String(month).padStart(2, '0')}`

      if (!map.has(key)) {
        map.set(key, { year, month, period: key, inflow: 0, outflow: 0, count: 0 })
      }
      const row = map.get(key)!
      const amt = Math.abs(t.amount || 0)

      if (INFLOW_TYPES.includes(t.type))       row.inflow  += amt
      else if (OUTFLOW_TYPES.includes(t.type)) row.outflow += amt
      row.count++
    }

    return Array.from(map.values()).sort((a, b) =>
      b.year !== a.year ? b.year - a.year : b.month - a.month
    )
  }, [activeTx])

  // Filtrer par année sélectionnée
  const filteredMonthly = useMemo(() =>
    selectedYear === ALL_YEARS
      ? monthlyData
      : monthlyData.filter(r => r.year === selectedYear),
    [monthlyData, selectedYear]
  )

  // Totaux pour la période sélectionnée
  const periodInflow  = filteredMonthly.reduce((s, r) => s + r.inflow,  0)
  const periodOutflow = filteredMonthly.reduce((s, r) => s + r.outflow, 0)
  const periodBalance = periodInflow - periodOutflow
  const periodCount   = filteredMonthly.reduce((s, r) => s + r.count,   0)

  // Solde global toutes années (source: get_financial_summary)
  const globalBalance = globalSummary?.compte_courant_balance ?? null

  const periodLabel = selectedYear === ALL_YEARS ? 'Toutes années' : String(selectedYear)

  return (
    <div className="space-y-6">
      {/* En-tête + sélecteur */}
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
            onChange={e => setSelectedYear(e.target.value === ALL_YEARS ? ALL_YEARS : parseInt(e.target.value))}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          >
            <option value={ALL_YEARS}>Toutes années</option>
            {uniqueYears.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Solde cumulatif toutes années */}
      <div className={`rounded-xl p-6 border-2 ${(globalBalance ?? 0) >= 0
        ? 'bg-gradient-to-br from-green-50 to-green-100 border-green-300'
        : 'bg-gradient-to-br from-red-50 to-red-100 border-red-300'}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Solde Cumulatif — Toutes Années
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Investissements + Revenus − Toutes dépenses
            </p>
          </div>
          <div className={`text-4xl font-bold ${(globalBalance ?? 0) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
            {globalBalance !== null ? fmt(globalBalance) : '—'}
          </div>
        </div>
      </div>

      {/* KPIs période sélectionnée */}
      <div>
        <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
          Résumé — {periodLabel}
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-700">Entrées</p>
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-green-600">+{fmt(periodInflow)}</p>
            <p className="text-xs text-gray-500 mt-1">{periodLabel}</p>
          </div>

          <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-lg border border-red-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-700">Sorties</p>
              <TrendingDown className="w-5 h-5 text-red-600" />
            </div>
            <p className="text-2xl font-bold text-red-600">-{fmt(periodOutflow)}</p>
            <p className="text-xs text-gray-500 mt-1">{periodLabel}</p>
          </div>

          <div className={`bg-gradient-to-br p-4 rounded-lg border ${periodBalance >= 0
            ? 'from-blue-50 to-blue-100 border-blue-200'
            : 'from-orange-50 to-orange-100 border-orange-200'}`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-700">Balance</p>
              <Wallet className={`w-5 h-5 ${periodBalance >= 0 ? 'text-blue-600' : 'text-orange-600'}`} />
            </div>
            <p className={`text-2xl font-bold ${periodBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {fmtSigned(periodBalance)}
            </p>
            <p className="text-xs text-gray-500 mt-1">{periodLabel}</p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-700">Transactions</p>
              <Calendar className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{periodCount}</p>
            <p className="text-xs text-gray-500 mt-1">{periodLabel}</p>
          </div>
        </div>
      </div>

      {/* Tableau mensuel */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">
            Détails Mensuels — {periodLabel}
          </h3>
          <span className="text-sm text-gray-500">{filteredMonthly.length} mois</span>
        </div>
        {filteredMonthly.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            Aucune transaction pour {periodLabel}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left   text-xs font-semibold text-gray-700 uppercase">Mois</th>
                  <th className="px-4 py-3 text-right  text-xs font-semibold text-gray-700 uppercase">Entrées</th>
                  <th className="px-4 py-3 text-right  text-xs font-semibold text-gray-700 uppercase">Sorties</th>
                  <th className="px-4 py-3 text-right  text-xs font-semibold text-gray-700 uppercase">Balance</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Trans.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredMonthly.map((row, i) => {
                  const bal = row.inflow - row.outflow
                  return (
                    <tr key={row.period} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-3 font-semibold text-gray-900">
                        {MONTH_NAMES[row.month - 1]} {row.year}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-green-600">
                        {row.inflow > 0 ? `+${fmt(row.inflow)}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-red-600">
                        {row.outflow > 0 ? `-${fmt(row.outflow)}` : '—'}
                      </td>
                      <td className={`px-4 py-3 text-right font-bold ${bal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {fmtSigned(bal)}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600">{row.count}</td>
                    </tr>
                  )
                })}
              </tbody>
              {/* Ligne total */}
              <tfoot className="bg-gray-100 border-t-2 border-gray-300">
                <tr>
                  <td className="px-4 py-3 font-bold text-gray-900">Total {periodLabel}</td>
                  <td className="px-4 py-3 text-right font-bold text-green-700">
                    {periodInflow > 0 ? `+${fmt(periodInflow)}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-red-700">
                    {periodOutflow > 0 ? `-${fmt(periodOutflow)}` : '—'}
                  </td>
                  <td className={`px-4 py-3 text-right font-bold ${periodBalance >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {fmtSigned(periodBalance)}
                  </td>
                  <td className="px-4 py-3 text-center font-bold text-gray-700">{periodCount}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
