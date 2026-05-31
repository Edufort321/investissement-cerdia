/**
 * Composant KPIs Financiers
 * Utilise les vues SQL temps réel (migration 95)
 */

'use client'

import { useFinancialSummary } from '@/hooks/useFinancialSummary'
import { useNAVTimeline } from '@/hooks/useNAVTimeline'
import { useLanguage } from '@/contexts/LanguageContext'
import { useOrganization } from '@/contexts/OrganizationContext'
import { DollarSign, TrendingUp, Building2, Wallet, BarChart3 } from 'lucide-react'
import { useEffect, useState } from 'react'

interface FinancialKPIsProps {
  year?: number | null // null = toutes années
  className?: string
}

export default function FinancialKPIs({ year = null, className = '' }: FinancialKPIsProps) {
  const { t } = useLanguage()
  // Organisation effective (réelle ou override "View as") — les KPI doivent
  // suivre le tenant affiché, pas tout ce que super_admin voit via RLS.
  const { organization } = useOrganization()
  const orgId = organization?.id ?? null
  const { summary, loading, error } = useFinancialSummary(year, orgId)
  const { current: navCurrent, pctChange: navPct, loading: navLoading } = useNAVTimeline(orgId)
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
        <p className="text-red-800 text-sm">❌ {t('dashboard.loadError')}: {error}</p>
      </div>
    )
  }

  if (!summary) {
    return (
      <div className={`bg-yellow-50 border border-yellow-200 rounded-lg p-4 ${className}`}>
        <p className="text-yellow-800 text-sm">⚠️ {t('dashboard.noFinancialData')}</p>
      </div>
    )
  }

  const kpis = [
    {
      title: t('dashboard.totalInvestors'),
      value: summary.total_investisseurs,
      format: 'currency' as const,
      icon: DollarSign,
      color: 'from-green-50 to-green-100 dark:from-green-900/40 dark:to-green-800/20',
      borderColor: 'border-green-200 dark:border-green-800/50',
      iconColor: 'text-green-600 dark:text-green-400',
      subtitle: null as string | null,
    },
    {
      title: t('dashboard.currentAccount'),
      value: summary.compte_courant_balance,
      format: 'currency' as const,
      icon: Wallet,
      color: summary.compte_courant_balance >= 0 ? 'from-blue-50 to-blue-100 dark:from-blue-900/40 dark:to-blue-800/20' : 'from-orange-50 to-orange-100 dark:from-orange-900/40 dark:to-orange-800/20',
      borderColor: summary.compte_courant_balance >= 0 ? 'border-blue-200 dark:border-blue-800/50' : 'border-orange-200 dark:border-orange-800/50',
      iconColor: summary.compte_courant_balance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400',
      subtitle: null,
    },
    {
      title: t('dashboard.capexReserve'),
      value: summary.capex_balance,
      format: 'currency' as const,
      icon: TrendingUp,
      color: 'from-purple-50 to-purple-100 dark:from-purple-900/40 dark:to-purple-800/20',
      borderColor: 'border-purple-200 dark:border-purple-800/50',
      iconColor: 'text-purple-600 dark:text-purple-400',
      subtitle: null,
    },
    {
      title: t('dashboard.projectExpenses'),
      value: summary.depenses_projets,
      format: 'currency' as const,
      icon: Building2,
      color: 'from-orange-50 to-orange-100 dark:from-orange-900/40 dark:to-orange-800/20',
      borderColor: 'border-orange-200 dark:border-orange-800/50',
      iconColor: 'text-orange-600 dark:text-orange-400',
      subtitle: null,
    },
    {
      title: t('dashboard.navPerShare'),
      value: navCurrent?.nav_per_share ?? 1,
      format: 'nav' as const,
      icon: BarChart3,
      color: (navCurrent?.nav_per_share ?? 1) >= 1 ? 'from-teal-50 to-teal-100 dark:from-teal-900/40 dark:to-teal-800/20' : 'from-red-50 to-red-100 dark:from-red-900/40 dark:to-red-800/20',
      borderColor: (navCurrent?.nav_per_share ?? 1) >= 1 ? 'border-teal-200 dark:border-teal-800/50' : 'border-red-200 dark:border-red-800/50',
      iconColor: (navCurrent?.nav_per_share ?? 1) >= 1 ? 'text-teal-600 dark:text-teal-400' : 'text-red-600 dark:text-red-400',
      subtitle: navCurrent ? `${(navPct ?? 0) >= 0 ? '+' : ''}${(navPct ?? 0).toFixed(2)}% ${t('dashboard.sinceLaunch')}` : null,
    },
    {
      title: t('dashboard.totalValue'),
      value: navCurrent?.net_asset_value ?? 0,
      format: 'currency' as const,
      icon: BarChart3,
      color: 'from-indigo-50 to-indigo-100 dark:from-indigo-900/40 dark:to-indigo-800/20',
      borderColor: 'border-indigo-200 dark:border-indigo-800/50',
      iconColor: 'text-indigo-600 dark:text-indigo-400',
      subtitle: navCurrent ? `${(navCurrent.total_shares ?? 0).toLocaleString('fr-CA', { maximumFractionDigits: 0 })} ${t('dashboard.shares')}` : null,
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
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300 leading-tight">{kpi.title}</p>
              <Icon className={`w-4 h-4 flex-shrink-0 ${kpi.iconColor}`} />
            </div>
            <p className="text-lg font-bold text-gray-900 dark:text-gray-100 leading-tight">{displayValue}</p>
            {kpi.subtitle && (
              <p className={`text-xs mt-1 font-medium ${
                kpi.subtitle.startsWith('+') ? 'text-green-600' :
                kpi.subtitle.startsWith('-') ? 'text-red-600' : 'text-gray-500'
              }`}>{kpi.subtitle}</p>
            )}
            {year && (
              <p className="text-xs text-gray-500 mt-1">{t('dashboard.year')} {year}</p>
            )}
          </div>
        )
      })}
    </div>
  )
}
