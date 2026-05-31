/**
 * Dashboard CAPEX dédié
 * Utilise la vue v_capex_summary (migration 95)
 */

'use client'

import { useCAPEXSummary } from '@/hooks/useFinancialSummary'
import { useLanguage } from '@/contexts/LanguageContext'
import { TrendingUp, TrendingDown, DollarSign, Activity } from 'lucide-react'

export default function CAPEXDashboard() {
  const { capexData, loading, error } = useCAPEXSummary()
  const { t, language } = useLanguage()
  const fr = language === 'fr'
  const locale = fr ? 'fr-CA' : 'en-CA'

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
        <p className="text-red-800">❌ {fr ? 'Erreur : ' : 'Error: '}{error}</p>
      </div>
    )
  }

  if (!capexData || capexData.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <p className="text-yellow-800">⚠️ {t('capex.noData')}</p>
        <p className="text-sm text-yellow-700 mt-2">{t('capex.noDataHint')}</p>
      </div>
    )
  }

  const currentYear = new Date().getFullYear()
  const currentYearData = capexData.find(d => d.year === currentYear)
  const totalBalance = capexData.reduce((sum, d) => sum + d.capex_balance, 0)

  const fmt = (v: number) =>
    v.toLocaleString(locale, { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })

  return (
    <div className="space-y-6">
      {/* Titre */}
      <div className="flex items-center gap-3">
        <Activity className="text-purple-600" size={32} />
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('capex.dashboard')}</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">{t('capex.subtitle')}</p>
        </div>
      </div>

      {/* KPIs Résumé */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/40 dark:to-purple-800/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800/50">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('capex.totalBalance')}</p>
            <DollarSign className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{fmt(totalBalance)}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('capex.allYears')}</p>
        </div>

        {currentYearData && (
          <>
            <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/40 dark:to-green-800/20 p-4 rounded-lg border border-green-200 dark:border-green-800/50">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {fr ? `CAPEX Reçu ${currentYear}` : `CAPEX Received ${currentYear}`}
                </p>
                <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{fmt(currentYearData.capex_received)}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{currentYearData.transaction_count} {fr ? 'transactions' : 'transactions'}</p>
            </div>

            <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/40 dark:to-red-800/20 p-4 rounded-lg border border-red-200 dark:border-red-800/50">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {fr ? `CAPEX Dépensé ${currentYear}` : `CAPEX Spent ${currentYear}`}
                </p>
                <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{fmt(currentYearData.capex_spent)}</p>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/40 dark:to-blue-800/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800/50">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('capex.balance')} {currentYear}</p>
                <DollarSign className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <p className={`text-2xl font-bold ${currentYearData.capex_balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {fmt(currentYearData.capex_balance)}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Tableau historique par année */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">{t('capex.historyTitle')}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('capex.year')}</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('capex.received')}</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('capex.spent')}</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('capex.balance')}</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">{t('compteCourant.transactions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {capexData.map((yearData, index) => (
                <tr key={yearData.year} className={index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700/30'}>
                  <td className="px-4 py-3 font-semibold text-gray-900 dark:text-gray-100">
                    {yearData.year}
                    {yearData.year === currentYear && (
                      <span className="ml-2 px-2 py-0.5 bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-300 text-xs rounded-full">
                        {t('capex.current')}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-green-600">
                    +{fmt(yearData.capex_received)}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-red-600">
                    -{fmt(yearData.capex_spent)}
                  </td>
                  <td className={`px-4 py-3 text-right font-bold ${yearData.capex_balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {fmt(yearData.capex_balance)}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-400">
                    {yearData.transaction_count}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-100 dark:bg-gray-700/60 border-t-2 border-gray-300 dark:border-gray-600">
              <tr>
                <td className="px-4 py-3 font-bold text-gray-900 dark:text-gray-100">TOTAL</td>
                <td className="px-4 py-3 text-right font-bold text-green-600">
                  +{fmt(capexData.reduce((sum, d) => sum + d.capex_received, 0))}
                </td>
                <td className="px-4 py-3 text-right font-bold text-red-600">
                  -{fmt(capexData.reduce((sum, d) => sum + d.capex_spent, 0))}
                </td>
                <td className={`px-4 py-3 text-right font-bold ${totalBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {fmt(totalBalance)}
                </td>
                <td className="px-4 py-3 text-center font-bold text-gray-900 dark:text-gray-100">
                  {capexData.reduce((sum, d) => sum + d.transaction_count, 0)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Info */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-lg p-4">
        <p className="text-sm text-blue-800 dark:text-blue-300">
          <strong>ℹ️ {fr ? 'Comment ça fonctionne :' : 'How it works:'}</strong>
        </p>
        <ul className="text-sm text-blue-700 dark:text-blue-300/80 mt-2 ml-4 space-y-1">
          {fr ? (
            <>
              <li>• <strong>CAPEX Reçu :</strong> Transactions avec Source = "CAPEX" et montant positif (transferts vers réserve)</li>
              <li>• <strong>CAPEX Dépensé :</strong> Transactions avec Catégorie = "CAPEX" et montant négatif (dépenses depuis réserve)</li>
              <li>• <strong>Balance :</strong> CAPEX Reçu - CAPEX Dépensé</li>
              <li>• Les données sont calculées en temps réel depuis la table transactions</li>
            </>
          ) : (
            <>
              <li>• <strong>CAPEX Received:</strong> Transactions with Source = "CAPEX" and positive amount (transfers to reserve)</li>
              <li>• <strong>CAPEX Spent:</strong> Transactions with Category = "CAPEX" and negative amount (expenses from reserve)</li>
              <li>• <strong>Balance:</strong> CAPEX Received - CAPEX Spent</li>
              <li>• Data is calculated in real time from the transactions table</li>
            </>
          )}
        </ul>
      </div>
    </div>
  )
}
