/**
 * Composant KPIs Financiers
 * Utilise les vues SQL temps réel (migration 95)
 */

'use client'

import { useFinancialSummary } from '@/hooks/useFinancialSummary'
import { useNAVTimeline } from '@/hooks/useNAVTimeline'
import { DollarSign, TrendingUp, Building2, Wallet, BarChart3 } from 'lucide-react'
import { useEffect, useState } from 'react'

interface FinancialKPIsProps {
  year?: number | null // null = toutes années
  className?: string
}

export default function FinancialKPIs({ year = null, className = '' }: FinancialKPIsProps) {
  const { summary, loading, error } = useFinancialSummary(year)
  const { current: navCurrent, pctChange: navPct, loading: navLoading } = useNAVTimeline()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || loading) {
    return (
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 ${className}`}>
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="bg-white p-4 rounded-lg border border-gray-200 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <p className="text-red-800 text-sm">❌ Erreur de chargement: {error}</p>
      </div>
    )
  }

  if (!summary) {
    return (
      <div className={`bg-yellow-50 border border-yellow-200 rounded-lg p-4 ${className}`}>
        <p className="text-yellow-800 text-sm">⚠️ Aucune donnée financière disponible</p>
      </div>
    )
  }

  const kpis = [
    {
      title: 'Total Investisseurs',
      value: summary.total_investisseurs,
      format: 'currency' as const,
      icon: DollarSign,
      color: 'from-green-50 to-green-100',
      borderColor: 'border-green-200',
      iconColor: 'text-green-600',
      subtitle: null as string | null,
    },
    {
      title: 'Compte Courant',
      value: summary.compte_courant_balance,
      format: 'currency' as const,
      icon: Wallet,
      color: summary.compte_courant_balance >= 0 ? 'from-blue-50 to-blue-100' : 'from-orange-50 to-orange-100',
      borderColor: summary.compte_courant_balance >= 0 ? 'border-blue-200' : 'border-orange-200',
      iconColor: summary.compte_courant_balance >= 0 ? 'text-blue-600' : 'text-orange-600',
      subtitle: null,
    },
    {
      title: 'CAPEX Réserve',
      value: summary.capex_balance,
      format: 'currency' as const,
      icon: TrendingUp,
      color: 'from-purple-50 to-purple-100',
      borderColor: 'border-purple-200',
      iconColor: 'text-purple-600',
      subtitle: null,
    },
    {
      title: 'Dépenses Projets',
      value: summary.depenses_projets,
      format: 'currency' as const,
      icon: Building2,
      color: 'from-orange-50 to-orange-100',
      borderColor: 'border-orange-200',
      iconColor: 'text-orange-600',
      subtitle: null,
    },
    {
      title: 'NAV / Part',
      value: navCurrent?.nav_per_share ?? 1,
      format: 'nav' as const,
      icon: BarChart3,
      color: (navCurrent?.nav_per_share ?? 1) >= 1 ? 'from-teal-50 to-teal-100' : 'from-red-50 to-red-100',
      borderColor: (navCurrent?.nav_per_share ?? 1) >= 1 ? 'border-teal-200' : 'border-red-200',
      iconColor: (navCurrent?.nav_per_share ?? 1) >= 1 ? 'text-teal-600' : 'text-red-600',
      subtitle: navCurrent ? `${navPct >= 0 ? '+' : ''}${navPct.toFixed(2)}% depuis lancement` : null,
    },
    {
      title: 'Valeur Totale',
      value: navCurrent?.net_asset_value ?? 0,
      format: 'currency' as const,
      icon: BarChart3,
      color: 'from-indigo-50 to-indigo-100',
      borderColor: 'border-indigo-200',
      iconColor: 'text-indigo-600',
      subtitle: navCurrent ? `${navCurrent.total_shares.toLocaleString('fr-CA', { maximumFractionDigits: 0 })} parts` : null,
    },
  ]

  return (
    <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 ${className}`}>
      {kpis.map((kpi, index) => {
        const Icon = kpi.icon
        const isNavLoading = (index === 4 || index === 5) && navLoading
        const displayValue = isNavLoading
          ? '—'
          : kpi.format === 'currency'
            ? new Intl.NumberFormat('fr-CA', {
                style: 'currency',
                currency: 'CAD',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              }).format(kpi.value)
            : new Intl.NumberFormat('fr-CA', {
                minimumFractionDigits: 4,
                maximumFractionDigits: 4,
              }).format(kpi.value) + ' $'

        return (
          <div
            key={index}
            className={`bg-gradient-to-br ${kpi.color} p-4 rounded-lg border ${kpi.borderColor} transition-transform hover:scale-105`}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-gray-700 leading-tight">{kpi.title}</p>
              <Icon className={`w-4 h-4 flex-shrink-0 ${kpi.iconColor}`} />
            </div>
            <p className="text-lg font-bold text-gray-900 leading-tight">{displayValue}</p>
            {kpi.subtitle && (
              <p className={`text-xs mt-1 font-medium ${
                kpi.subtitle.startsWith('+') ? 'text-green-600' :
                kpi.subtitle.startsWith('-') ? 'text-red-600' : 'text-gray-500'
              }`}>{kpi.subtitle}</p>
            )}
            {year && (
              <p className="text-xs text-gray-500 mt-1">Année {year}</p>
            )}
          </div>
        )
      })}
    </div>
  )
}
