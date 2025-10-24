'use client'

import { useState, useEffect, useCallback } from 'react'
import { TrendingUp, TrendingDown, DollarSign, Calendar, AlertCircle, FileText, Download } from 'lucide-react'

interface PropertyPerformanceProps {
  propertyId: string
  propertyName: string
  totalCost: number
  currency: string
  originScenario?: any
  scenarioResults?: any[]
  transactions: any[]
}

interface YearlyPerformance {
  year: number
  rental_income_actual: number
  other_income_actual: number
  total_income_actual: number
  maintenance_actual: number
  management_fees_actual: number
  taxes_actual: number
  insurance_actual: number
  other_expenses_actual: number
  total_expenses_actual: number
  net_income_actual: number
  cumulative_cashflow_actual: number
  roi_actual: number
  total_income_projected?: number
  total_expenses_projected?: number
  net_income_projected?: number
  cumulative_cashflow_projected?: number
  roi_projected?: number
  income_variance: number
  expense_variance: number
  net_income_variance: number
  roi_variance: number
}

export default function PropertyPerformanceAnalysis({
  propertyId,
  propertyName,
  totalCost,
  currency,
  originScenario,
  scenarioResults,
  transactions
}: PropertyPerformanceProps) {
  const [yearlyData, setYearlyData] = useState<YearlyPerformance[]>([])
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  const calculatePerformance = useCallback(() => {
    setLoading(true)

    const propertyTransactions = transactions.filter(t => t.property_id === propertyId)
    const moderateScenario = scenarioResults?.find(r => r.scenario_type === 'moderate')
    const projectedYearlyData = moderateScenario?.yearly_data || []

    const firstTransactionDate = propertyTransactions.length > 0
      ? new Date(Math.min(...propertyTransactions.map(t => new Date(t.date).getTime())))
      : new Date()

    const currentYear = new Date().getFullYear()
    const startYear = firstTransactionDate.getFullYear()
    const yearsToAnalyze = Math.max(1, currentYear - startYear + 1)

    const performanceData: YearlyPerformance[] = []

    for (let i = 0; i < yearsToAnalyze; i++) {
      const year = startYear + i
      const yearTransactions = propertyTransactions.filter(t =>
        new Date(t.date).getFullYear() === year
      )

      const rentalIncome = yearTransactions
        .filter(t => t.type === 'dividende' && (t.description?.toLowerCase().includes('loyer') || t.description?.toLowerCase().includes('location')))
        .reduce((sum, t) => sum + (t.source_amount || t.amount), 0)

      const otherIncome = yearTransactions
        .filter(t => t.type === 'dividende' && !t.description?.toLowerCase().includes('loyer'))
        .reduce((sum, t) => sum + (t.source_amount || t.amount), 0)

      const totalIncomeActual = rentalIncome + otherIncome

      const maintenance = yearTransactions
        .filter(t => t.type === 'depense' && (t.description?.toLowerCase().includes('maintenance') || t.description?.toLowerCase().includes('réparation')))
        .reduce((sum, t) => sum + (t.source_amount || t.amount), 0)

      const managementFees = yearTransactions
        .filter(t => t.type === 'depense' && t.description?.toLowerCase().includes('gestion'))
        .reduce((sum, t) => sum + (t.source_amount || t.amount), 0)

      const taxesExpense = yearTransactions
        .filter(t => t.type === 'depense' && (t.description?.toLowerCase().includes('taxe') || t.description?.toLowerCase().includes('municipal')))
        .reduce((sum, t) => sum + (t.source_amount || t.amount), 0)

      const insurance = yearTransactions
        .filter(t => t.type === 'depense' && t.description?.toLowerCase().includes('assurance'))
        .reduce((sum, t) => sum + (t.source_amount || t.amount), 0)

      const otherExpenses = yearTransactions
        .filter(t => t.type === 'depense' &&
          !t.description?.toLowerCase().includes('maintenance') &&
          !t.description?.toLowerCase().includes('gestion') &&
          !t.description?.toLowerCase().includes('taxe') &&
          !t.description?.toLowerCase().includes('assurance'))
        .reduce((sum, t) => sum + (t.source_amount || t.amount), 0)

      const totalExpensesActual = maintenance + managementFees + taxesExpense + insurance + otherExpenses
      const netIncomeActual = totalIncomeActual - totalExpensesActual
      const investmentToDate = totalCost
      const cumulativeCashflow = netIncomeActual * (i + 1) - investmentToDate
      const roiActual = investmentToDate > 0 ? (netIncomeActual / investmentToDate) * 100 : 0

      const projectedYear = projectedYearlyData[i]
      const totalIncomeProjected = projectedYear?.rentalIncome || 0
      const managementFeesProjected = projectedYear?.managementFees || 0
      const totalExpensesProjected = managementFeesProjected
      const netIncomeProjected = projectedYear?.netIncome || 0
      const cumulativeCashflowProjected = projectedYear?.cumulativeCashflow || 0
      const roiProjected = projectedYear?.roi || 0

      const incomeVariance = totalIncomeProjected > 0
        ? ((totalIncomeActual - totalIncomeProjected) / totalIncomeProjected) * 100
        : 0

      const expenseVariance = totalExpensesProjected > 0
        ? ((totalExpensesActual - totalExpensesProjected) / totalExpensesProjected) * 100
        : 0

      const netIncomeVariance = netIncomeProjected !== 0
        ? ((netIncomeActual - netIncomeProjected) / Math.abs(netIncomeProjected)) * 100
        : 0

      const roiVariance = roiProjected !== 0
        ? roiActual - roiProjected
        : 0

      performanceData.push({
        year,
        rental_income_actual: rentalIncome,
        other_income_actual: otherIncome,
        total_income_actual: totalIncomeActual,
        maintenance_actual: maintenance,
        management_fees_actual: managementFees,
        taxes_actual: taxesExpense,
        insurance_actual: insurance,
        other_expenses_actual: otherExpenses,
        total_expenses_actual: totalExpensesActual,
        net_income_actual: netIncomeActual,
        cumulative_cashflow_actual: cumulativeCashflow,
        roi_actual: roiActual,
        total_income_projected: totalIncomeProjected,
        total_expenses_projected: totalExpensesProjected,
        net_income_projected: netIncomeProjected,
        cumulative_cashflow_projected: cumulativeCashflowProjected,
        roi_projected: roiProjected,
        income_variance: incomeVariance,
        expense_variance: expenseVariance,
        net_income_variance: netIncomeVariance,
        roi_variance: roiVariance
      })
    }

    setYearlyData(performanceData)
    setLoading(false)
  }, [propertyId, transactions, scenarioResults, totalCost])

  useEffect(() => {
    calculatePerformance()
  }, [calculatePerformance])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-CA', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatPercent = (value: number) => {
    const formatted = value.toFixed(1)
    return value >= 0 ? `+${formatted}%` : `${formatted}%`
  }

  const getVarianceColor = (variance: number) => {
    if (variance > 10) return 'text-green-600 bg-green-50'
    if (variance > 0) return 'text-green-600 bg-green-50'
    if (variance > -10) return 'text-orange-600 bg-orange-50'
    return 'text-red-600 bg-red-50'
  }

  const exportToCSV = () => {
    const headers = [
      'Année',
      'Revenus Locatifs Réels',
      'Autres Revenus Réels',
      'Total Revenus Réels',
      'Maintenance',
      'Frais Gestion',
      'Taxes',
      'Assurance',
      'Autres Dépenses',
      'Total Dépenses Réelles',
      'Revenu Net Réel',
      'Cashflow Cumulatif Réel',
      'ROI Réel (%)',
      'Revenus Projetés',
      'Dépenses Projetées',
      'Revenu Net Projeté',
      'ROI Projeté (%)',
      'Variance Revenus (%)',
      'Variance Dépenses (%)',
      'Variance ROI (%)'
    ]

    const rows = yearlyData.map(d => [
      d.year,
      d.rental_income_actual,
      d.other_income_actual,
      d.total_income_actual,
      d.maintenance_actual,
      d.management_fees_actual,
      d.taxes_actual,
      d.insurance_actual,
      d.other_expenses_actual,
      d.total_expenses_actual,
      d.net_income_actual,
      d.cumulative_cashflow_actual,
      d.roi_actual.toFixed(2),
      d.total_income_projected || 0,
      d.total_expenses_projected || 0,
      d.net_income_projected || 0,
      d.roi_projected?.toFixed(2) || 0,
      d.income_variance.toFixed(2),
      d.expense_variance.toFixed(2),
      d.roi_variance.toFixed(2)
    ])

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${propertyName}_performance_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-sm text-gray-600 mt-2">Calcul de la performance...</p>
      </div>
    )
  }

  if (yearlyData.length === 0) {
    return (
      <div className="p-6 text-center">
        <AlertCircle size={48} className="mx-auto text-gray-400 mb-3" />
        <p className="text-gray-600">Aucune transaction enregistrée pour ce projet</p>
        <p className="text-sm text-gray-500 mt-1">
          Ajoutez des transactions (revenus locatifs, dépenses) pour voir l'analyse de performance
        </p>
      </div>
    )
  }

  const totalIncome = yearlyData.reduce((sum, d) => sum + d.total_income_actual, 0)
  const totalExpenses = yearlyData.reduce((sum, d) => sum + d.total_expenses_actual, 0)
  const totalNetIncome = totalIncome - totalExpenses
  const avgROI = yearlyData.length > 0 ? yearlyData.reduce((sum, d) => sum + d.roi_actual, 0) / yearlyData.length : 0

  return (
    <div className="space-y-6">
      {/* Header avec KPIs */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900">📊 Performance Réelle vs Projections</h3>
          <p className="text-sm text-gray-600">Analyse comptable basée sur transactions réelles</p>
        </div>
        <button
          onClick={exportToCSV}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Download size={16} />
          Exporter CSV (Audit)
        </button>
      </div>

      {/* KPIs Globaux */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="text-xs text-blue-700 font-medium mb-1">Revenus totaux</div>
          <div className="text-xl font-bold text-blue-900">{formatCurrency(totalIncome)}</div>
          <div className="text-xs text-blue-600 mt-1">{yearlyData.length} année(s)</div>
        </div>

        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
          <div className="text-xs text-red-700 font-medium mb-1">Dépenses totales</div>
          <div className="text-xl font-bold text-red-900">{formatCurrency(totalExpenses)}</div>
          <div className="text-xs text-red-600 mt-1">{yearlyData.length} année(s)</div>
        </div>

        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="text-xs text-green-700 font-medium mb-1">Revenu net total</div>
          <div className="text-xl font-bold text-green-900">{formatCurrency(totalNetIncome)}</div>
          <div className="text-xs text-green-600 mt-1">Cumulatif</div>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <div className="text-xs text-purple-700 font-medium mb-1">ROI moyen</div>
          <div className="text-xl font-bold text-purple-900">{avgROI.toFixed(1)}%</div>
          <div className="text-xs text-purple-600 mt-1">Annuel</div>
        </div>
      </div>

      {/* Graphique d'évolution */}
      {yearlyData.length > 1 && (
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <h4 className="text-sm font-bold text-gray-900 mb-4">📈 Évolution Réel vs Projeté</h4>

          {/* SVG Graph */}
          <div className="relative h-64 bg-white rounded-lg border border-gray-300 p-4">
            <svg viewBox="0 0 100 50" className="w-full h-full" preserveAspectRatio="none">
              {/* Grid lines */}
              <line x1="0" y1="12.5" x2="100" y2="12.5" stroke="#e5e7eb" strokeWidth="0.2" />
              <line x1="0" y1="25" x2="100" y2="25" stroke="#e5e7eb" strokeWidth="0.2" />
              <line x1="0" y1="37.5" x2="100" y2="37.5" stroke="#e5e7eb" strokeWidth="0.2" />

              {/* Actual line (green) */}
              <polyline
                fill="none"
                stroke="#10b981"
                strokeWidth="0.5"
                points={yearlyData.map((d, i) => {
                  const maxIncome = Math.max(...yearlyData.map(y => Math.max(y.total_income_actual, y.total_income_projected || 0)))
                  const x = (i / (yearlyData.length - 1)) * 98 + 1
                  const y = 48 - ((d.total_income_actual / maxIncome) * 46)
                  return `${x},${y}`
                }).join(' ')}
              />

              {/* Projected line (blue, dashed) */}
              {yearlyData.some(d => d.total_income_projected) && (
                <polyline
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="0.5"
                  strokeDasharray="2,1"
                  points={yearlyData.map((d, i) => {
                    const maxIncome = Math.max(...yearlyData.map(y => Math.max(y.total_income_actual, y.total_income_projected || 0)))
                    const x = (i / (yearlyData.length - 1)) * 98 + 1
                    const y = 48 - (((d.total_income_projected || 0) / maxIncome) * 46)
                    return `${x},${y}`
                  }).join(' ')}
                />
              )}
            </svg>

            {/* Legend */}
            <div className="absolute top-2 right-2 bg-white/90 p-2 rounded border border-gray-200 text-xs space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 bg-green-500"></div>
                <span>Réel</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-0.5 bg-blue-500 border-t-2 border-dashed"></div>
                <span>Projeté</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tableau détaillé par année */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-700">Année</th>
                <th className="px-4 py-3 text-right font-medium text-gray-700">Revenus Réels</th>
                <th className="px-4 py-3 text-right font-medium text-gray-700">Dépenses Réelles</th>
                <th className="px-4 py-3 text-right font-medium text-gray-700">Net Réel</th>
                <th className="px-4 py-3 text-right font-medium text-gray-700">ROI Réel</th>
                <th className="px-4 py-3 text-right font-medium text-gray-700">ROI Projeté</th>
                <th className="px-4 py-3 text-right font-medium text-gray-700">Variance</th>
                <th className="px-4 py-3 text-center font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {yearlyData.map(year => (
                <>
                  <tr key={year.year} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{year.year}</td>
                    <td className="px-4 py-3 text-right text-gray-900">{formatCurrency(year.total_income_actual)}</td>
                    <td className="px-4 py-3 text-right text-red-600">{formatCurrency(year.total_expenses_actual)}</td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900">{formatCurrency(year.net_income_actual)}</td>
                    <td className="px-4 py-3 text-right font-bold text-green-600">{year.roi_actual.toFixed(1)}%</td>
                    <td className="px-4 py-3 text-right text-blue-600">{year.roi_projected?.toFixed(1) || '-'}%</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getVarianceColor(year.roi_variance)}`}>
                        {formatPercent(year.roi_variance)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setSelectedYear(selectedYear === year.year ? null : year.year)}
                        className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                      >
                        {selectedYear === year.year ? 'Masquer' : 'Détails'}
                      </button>
                    </td>
                  </tr>
                  {selectedYear === year.year && (
                    <tr>
                      <td colSpan={8} className="px-4 py-4 bg-gray-50">
                        <div className="grid grid-cols-2 gap-4">
                          {/* Revenus détaillés */}
                          <div>
                            <h5 className="text-xs font-bold text-gray-700 mb-2">💰 Détail des revenus</h5>
                            <div className="space-y-1 text-xs">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Revenus locatifs</span>
                                <span className="font-medium">{formatCurrency(year.rental_income_actual)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Autres revenus</span>
                                <span className="font-medium">{formatCurrency(year.other_income_actual)}</span>
                              </div>
                              <div className="flex justify-between border-t border-gray-300 pt-1 font-bold">
                                <span>Total</span>
                                <span>{formatCurrency(year.total_income_actual)}</span>
                              </div>
                            </div>
                          </div>

                          {/* Dépenses détaillées */}
                          <div>
                            <h5 className="text-xs font-bold text-gray-700 mb-2">💸 Détail des dépenses</h5>
                            <div className="space-y-1 text-xs">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Maintenance</span>
                                <span className="font-medium">{formatCurrency(year.maintenance_actual)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Frais de gestion</span>
                                <span className="font-medium">{formatCurrency(year.management_fees_actual)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Taxes</span>
                                <span className="font-medium">{formatCurrency(year.taxes_actual)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Assurance</span>
                                <span className="font-medium">{formatCurrency(year.insurance_actual)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Autres</span>
                                <span className="font-medium">{formatCurrency(year.other_expenses_actual)}</span>
                              </div>
                              <div className="flex justify-between border-t border-gray-300 pt-1 font-bold">
                                <span>Total</span>
                                <span>{formatCurrency(year.total_expenses_actual)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Notes audit */}
      <div className="bg-amber-50 p-4 rounded-lg border border-amber-200 flex gap-3">
        <FileText size={20} className="text-amber-700 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-amber-800">
          <div className="font-bold mb-1">📋 Note pour audit et due diligence</div>
          <div>
            Tous les montants affichés sont calculés depuis les transactions réelles enregistrées dans le système.
            Chaque chiffre est traçable et vérifiable. Exportez le fichier CSV pour analyse comptable complète.
            Les variances indiquent l'écart entre les projections du scénario d'origine et la performance réelle.
          </div>
        </div>
      </div>
    </div>
  )
}
