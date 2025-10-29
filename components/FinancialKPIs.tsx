/**
 * Composant KPIs Financiers
 * Utilise les vues SQL temps réel (migration 95)
 */

'use client'

import { useFinancialSummary } from '@/hooks/useFinancialSummary'
import { DollarSign, TrendingUp, Building2, Wallet } from 'lucide-react'
import { useEffect, useState } from 'react'

interface FinancialKPIsProps {
  year?: number | null // null = toutes années
  className?: string
}

export default function FinancialKPIs({ year = null, className = '' }: FinancialKPIsProps) {
  const { summary, loading, error } = useFinancialSummary(year)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || loading) {
    return (
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
        {[1, 2, 3, 4].map(i => (
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
      format: 'currency',
      icon: DollarSign,
      color: 'from-green-50 to-green-100',
      borderColor: 'border-green-200',
      iconColor: 'text-green-600'
    },
    {
      title: 'Compte Courant',
      value: summary.compte_courant_balance,
      format: 'currency',
      icon: Wallet,
      color: 'from-blue-50 to-blue-100',
      borderColor: 'border-blue-200',
      iconColor: 'text-blue-600'
    },
    {
      title: 'CAPEX Réserve',
      value: summary.capex_balance,
      format: 'currency',
      icon: TrendingUp,
      color: 'from-purple-50 to-purple-100',
      borderColor: 'border-purple-200',
      iconColor: 'text-purple-600'
    },
    {
      title: 'Dépenses Projets',
      value: summary.depenses_projets,
      format: 'currency',
      icon: Building2,
      color: 'from-orange-50 to-orange-100',
      borderColor: 'border-orange-200',
      iconColor: 'text-orange-600'
    }
  ]

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
      {kpis.map((kpi, index) => {
        const Icon = kpi.icon
        const displayValue = kpi.format === 'currency'
          ? new Intl.NumberFormat('fr-CA', {
              style: 'currency',
              currency: 'CAD',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0
            }).format(kpi.value)
          : kpi.value.toLocaleString('fr-CA')

        return (
          <div
            key={index}
            className={`bg-gradient-to-br ${kpi.color} p-4 rounded-lg border ${kpi.borderColor} transition-transform hover:scale-105`}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-700">{kpi.title}</p>
              <Icon className={`w-5 h-5 ${kpi.iconColor}`} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{displayValue}</p>
            {year && (
              <p className="text-xs text-gray-500 mt-1">Année {year}</p>
            )}
          </div>
        )
      })}
    </div>
  )
}
