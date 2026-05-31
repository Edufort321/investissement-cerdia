'use client'

import { useInvestment } from '@/contexts/InvestmentContext'
import { useOrganization } from '@/contexts/OrganizationContext'
import { useFinancialSummary } from '@/hooks/useFinancialSummary'
import { useLanguage } from '@/contexts/LanguageContext'
import { useState, useMemo } from 'react'
import { Wallet, TrendingUp, TrendingDown, Calendar } from 'lucide-react'

const INFLOW_TYPES  = ['investissement', 'loyer', 'loyer_locatif', 'revenu', 'dividende']
const OUTFLOW_TYPES = ['paiement', 'achat_propriete', 'capex', 'maintenance', 'admin',
                       'depense', 'remboursement_investisseur', 'courant', 'rnd', 'transfert']

const ALL_YEARS = 'all'

export default function CompteCourantDashboard() {
  const { transactions } = useInvestment()
  const { organization } = useOrganization()
  const { summary: globalSummary } = useFinancialSummary(null, organization?.id ?? null)
  const { t, language } = useLanguage()
  const fr = language === 'fr'
  const locale = fr ? 'fr-CA' : 'en-CA'

  const currentYear = new Date().getFullYear()
  const [selectedYear, setSelectedYear] = useState<number | 'all'>(currentYear)

  const fmt = (v: number) =>
    v.toLocaleString(locale, { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })
  const fmtSigned = (v: number) =>
    v.toLocaleString(locale, { style: 'currency', currency: 'CAD', minimumFractionDigits: 0, signDisplay: 'always' })

  const activeTx = useMemo(
    () => (transactions || []).filter(tx => tx && tx.status !== 'cancelled'),
    [transactions]
  )

  const uniqueYears = useMemo(() => {
    const years = Array.from(new Set(activeTx.map(tx => new Date(tx.date).getFullYear())))
      .sort((a, b) => b - a)
    if (!years.includes(currentYear)) years.unshift(currentYear)
    return years
  }, [activeTx, currentYear])

  const monthlyData = useMemo(() => {
    const map = new Map<string, {
      year: number; month: number; period: string
      inflow: number; outflow: number; count: number
    }>()

    for (const tx of activeTx) {
      const d     = new Date(tx.date)
      const year  = d.getFullYear()
      const month = d.getMonth() + 1
      const key   = `${year}-${String(month).padStart(2, '0')}`

      if (!map.has(key)) {
        map.set(key, { year, month, period: key, inflow: 0, outflow: 0, count: 0 })
      }
      const row = map.get(key)!
      const amt = Math.abs(tx.amount || 0)

      if (INFLOW_TYPES.includes(tx.type))       row.inflow  += amt
      else if (OUTFLOW_TYPES.includes(tx.type)) row.outflow += amt
      row.count++
    }

    return Array.from(map.values()).sort((a, b) =>
      b.year !== a.year ? b.year - a.year : b.month - a.month
    )
  }, [activeTx])

  const filteredMonthly = useMemo(() =>
    selectedYear === ALL_YEARS
      ? monthlyData
      : monthlyData.filter(r => r.year === selectedYear),
    [monthlyData, selectedYear]
  )

  const periodInflow  = filteredMonthly.reduce((s, r) => s + r.inflow,  0)
  const periodOutflow = filteredMonthly.reduce((s, r) => s + r.outflow, 0)
  const periodBalance = periodInflow - periodOutflow
  const periodCount   = filteredMonthly.reduce((s, r) => s + r.count,   0)

  const globalBalance = globalSummary?.compte_courant_balance ?? null

  const periodLabel = selectedYear === ALL_YEARS ? t('compteCourant.allYears') : String(selectedYear)

  const formatMonth = (year: number, month: number) =>
    new Date(year, month - 1, 1).toLocaleDateString(locale, { month: 'long', year: 'numeric' })

  return (
    <div className="space-y-6">
      {/* En-tête + sélecteur */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Wallet className="text-blue-600" size={32} />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{t('compteCourant.dashboard')}</h2>
            <p className="text-sm text-gray-600">{t('compteCourant.subtitle')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Calendar size={20} className="text-gray-600" />
          <select
            value={selectedYear}
            onChange={e => setSelectedYear(e.target.value === ALL_YEARS ? ALL_YEARS : parseInt(e.target.value))}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          >
            <option value={ALL_YEARS}>{t('compteCourant.allYears')}</option>
            {uniqueYears.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Solde cumulatif toutes années */}
      <div className={`rounded-xl p-6 border-2 ${(globalBalance ?? 0) >= 0
        ? 'bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/40 dark:to-green-800/20 border-green-300 dark:border-green-800/60'
        : 'bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/40 dark:to-red-800/20 border-red-300 dark:border-red-800/60'}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wide">
              {t('compteCourant.cumulativeBalance')}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t('compteCourant.cumulativeDesc')}
            </p>
          </div>
          <div className={`text-2xl sm:text-4xl font-bold ${(globalBalance ?? 0) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
            {globalBalance !== null ? fmt(globalBalance) : '—'}
          </div>
        </div>
      </div>

      {/* KPIs période sélectionnée */}
      <div>
        <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide mb-3">
          {t('compteCourant.summary')} — {periodLabel}
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/40 dark:to-green-800/20 p-4 rounded-lg border border-green-200 dark:border-green-800/50">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('transactions.totalIn')}</p>
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-green-600">+{fmt(periodInflow)}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{periodLabel}</p>
          </div>

          <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/40 dark:to-red-800/20 p-4 rounded-lg border border-red-200 dark:border-red-800/50">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('transactions.totalOut')}</p>
              <TrendingDown className="w-5 h-5 text-red-600" />
            </div>
            <p className="text-2xl font-bold text-red-600">-{fmt(periodOutflow)}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{periodLabel}</p>
          </div>

          <div className={`bg-gradient-to-br p-4 rounded-lg border ${periodBalance >= 0
            ? 'from-blue-50 to-blue-100 dark:from-blue-900/40 dark:to-blue-800/20 border-blue-200 dark:border-blue-800/50'
            : 'from-orange-50 to-orange-100 dark:from-orange-900/40 dark:to-orange-800/20 border-orange-200 dark:border-orange-800/50'}`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('capex.balance')}</p>
              <Wallet className={`w-5 h-5 ${periodBalance >= 0 ? 'text-blue-600' : 'text-orange-600'}`} />
            </div>
            <p className={`text-2xl font-bold ${periodBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {fmtSigned(periodBalance)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{periodLabel}</p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/40 dark:to-purple-800/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800/50">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('compteCourant.transactions')}</p>
              <Calendar className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{periodCount}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{periodLabel}</p>
          </div>
        </div>
      </div>

      {/* Tableau mensuel */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">
            {t('compteCourant.monthlyDetails')} — {periodLabel}
          </h3>
          <span className="text-sm text-gray-500">
            {filteredMonthly.length} {fr ? 'mois' : 'month(s)'}
          </span>
        </div>
        {filteredMonthly.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            {fr ? `Aucune transaction pour ${periodLabel}` : `No transactions for ${periodLabel}`}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left   text-xs font-semibold text-gray-700 uppercase">{t('compteCourant.month')}</th>
                  <th className="px-4 py-3 text-right  text-xs font-semibold text-gray-700 uppercase">{t('transactions.totalIn')}</th>
                  <th className="px-4 py-3 text-right  text-xs font-semibold text-gray-700 uppercase">{t('transactions.totalOut')}</th>
                  <th className="px-4 py-3 text-right  text-xs font-semibold text-gray-700 uppercase">{t('capex.balance')}</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">{fr ? 'Trans.' : 'Trx.'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredMonthly.map((row, i) => {
                  const bal = row.inflow - row.outflow
                  return (
                    <tr key={row.period} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-3 font-semibold text-gray-900">
                        {formatMonth(row.year, row.month)}
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
