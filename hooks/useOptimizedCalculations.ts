// 📦 PERFORMANCE: Hooks optimisés avec useMemo pour calculs lourds
import { useMemo } from 'react'

// =====================================================
// 1. CALCULS FINANCIERS
// =====================================================

export function useFinancialCalculations(
  transactions: any[],
  properties: any[]
) {
  return useMemo(() => {
    // Total investissements
    const totalInvestments = transactions
      .filter(t => t.type === 'investissement')
      .reduce((sum, t) => sum + (t.amount || 0), 0)

    // Total dépenses
    const totalExpenses = transactions
      .filter(t => t.type === 'depense')
      .reduce((sum, t) => sum + (t.amount || 0), 0)

    // Total revenus
    const totalRevenue = transactions
      .filter(t => t.type === 'dividende')
      .reduce((sum, t) => sum + (t.amount || 0), 0)

    // ROI global
    const roi = totalInvestments > 0
      ? ((totalRevenue - totalExpenses) / totalInvestments) * 100
      : 0

    // Cash flow mensuel moyen
    const avgMonthlyCashFlow = (totalRevenue - totalExpenses) / 12

    return {
      totalInvestments,
      totalExpenses,
      totalRevenue,
      roi,
      avgMonthlyCashFlow,
      netProfit: totalRevenue - totalExpenses,
    }
  }, [transactions]) // Recalculer seulement si transactions changent
}

// =====================================================
// 2. STATISTIQUES PROPRIÉTÉS
// =====================================================

export function usePropertyStats(
  properties: any[],
  transactions: any[]
) {
  return useMemo(() => {
    const stats = properties.map(property => {
      const propertyTransactions = transactions.filter(
        t => t.property_id === property.id
      )

      const revenue = propertyTransactions
        .filter(t => t.type === 'dividende')
        .reduce((sum, t) => sum + (t.amount || 0), 0)

      const expenses = propertyTransactions
        .filter(t => t.type === 'depense')
        .reduce((sum, t) => sum + (t.amount || 0), 0)

      const capex = propertyTransactions
        .filter(t => t.type === 'capex')
        .reduce((sum, t) => sum + (t.amount || 0), 0)

      const purchasePrice = property.purchase_price || 0
      const roi = purchasePrice > 0
        ? ((revenue - expenses - capex) / purchasePrice) * 100
        : 0

      return {
        id: property.id,
        name: property.name,
        revenue,
        expenses,
        capex,
        netIncome: revenue - expenses - capex,
        roi,
        cashFlow: revenue - expenses,
      }
    })

    return {
      properties: stats,
      totalProperties: properties.length,
      totalValue: properties.reduce((sum, p) => sum + (p.purchase_price || 0), 0),
      avgROI: stats.reduce((sum, p) => sum + p.roi, 0) / stats.length || 0,
    }
  }, [properties, transactions])
}

// =====================================================
// 3. ANALYSE TEMPORELLE
// =====================================================

export function useTimeSeriesData(transactions: any[]) {
  return useMemo(() => {
    // Grouper par mois
    const monthlyData = transactions.reduce((acc: any, t) => {
      const date = new Date(t.date)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

      if (!acc[monthKey]) {
        acc[monthKey] = {
          month: monthKey,
          revenue: 0,
          expenses: 0,
          investments: 0,
        }
      }

      if (t.type === 'dividende') acc[monthKey].revenue += t.amount || 0
      if (t.type === 'depense') acc[monthKey].expenses += t.amount || 0
      if (t.type === 'investissement') acc[monthKey].investments += t.amount || 0

      return acc
    }, {})

    // Convertir en tableau et trier
    const series = Object.values(monthlyData).sort((a: any, b: any) =>
      a.month.localeCompare(b.month)
    )

    return series
  }, [transactions])
}

// =====================================================
// 4. DIVIDENDES ALLOCATION
// =====================================================

export function useDividendCalculations(
  dividends: any[],
  allocations: any[],
  investorId: string
) {
  return useMemo(() => {
    const totalDividends = dividends.reduce((sum, d) => sum + (d.amount || 0), 0)

    const myAllocations = allocations.filter(
      a => a.investor_id === investorId
    )

    const myTotalDividends = myAllocations.reduce(
      (sum, a) => sum + (a.amount || 0),
      0
    )

    const myPaidDividends = myAllocations
      .filter(a => a.paid)
      .reduce((sum, a) => sum + (a.amount || 0), 0)

    const myPendingDividends = myTotalDividends - myPaidDividends

    return {
      totalDividends,
      myTotalDividends,
      myPaidDividends,
      myPendingDividends,
      allocationsCount: myAllocations.length,
    }
  }, [dividends, allocations, investorId])
}

// =====================================================
// 5. SCÉNARIOS RANKING
// =====================================================

export function useScenariosRanking(scenarios: any[]) {
  return useMemo(() => {
    // Calculer score composite pour chaque scénario
    const ranked = scenarios.map(scenario => {
      const roi = scenario.roi || 0
      const cashFlow = scenario.cash_flow_mensuel || 0
      const votes = scenario.votes_count || 0

      // Score composite: 40% ROI + 40% Cash Flow + 20% Votes
      const score = (roi * 0.4) + (cashFlow * 0.4) + (votes * 0.2)

      return {
        ...scenario,
        score,
      }
    })

    // Trier par score décroissant
    ranked.sort((a, b) => b.score - a.score)

    return ranked
  }, [scenarios])
}

// =====================================================
// 6. PORTFOLIO DIVERSIFICATION
// =====================================================

export function usePortfolioDiversification(properties: any[]) {
  return useMemo(() => {
    const byType = properties.reduce((acc: any, p) => {
      const type = p.type || 'unknown'
      if (!acc[type]) {
        acc[type] = {
          count: 0,
          totalValue: 0,
        }
      }
      acc[type].count++
      acc[type].totalValue += p.purchase_price || 0
      return acc
    }, {})

    const totalValue = properties.reduce(
      (sum, p) => sum + (p.purchase_price || 0),
      0
    )

    const diversification = Object.entries(byType).map(([type, data]: [string, any]) => ({
      type,
      count: data.count,
      value: data.totalValue,
      percentage: totalValue > 0 ? (data.totalValue / totalValue) * 100 : 0,
    }))

    return {
      diversification,
      totalProperties: properties.length,
      totalValue,
      isDiversified: diversification.length > 1,
    }
  }, [properties])
}

// =====================================================
// 7. EXEMPLE D'UTILISATION
// =====================================================

/*
// Dans votre composant:

import {
  useFinancialCalculations,
  usePropertyStats,
  useTimeSeriesData,
} from '@/hooks/useOptimizedCalculations'

export function Dashboard() {
  const { transactions, properties } = useInvestmentData()

  // ✅ Calculs optimisés avec useMemo
  const financial = useFinancialCalculations(transactions, properties)
  const propertyStats = usePropertyStats(properties, transactions)
  const timeSeries = useTimeSeriesData(transactions)

  return (
    <div>
      <h2>ROI Global: {financial.roi.toFixed(2)}%</h2>
      <h2>Propriétés: {propertyStats.totalProperties}</h2>
      <Chart data={timeSeries} />
    </div>
  )
}
*/
