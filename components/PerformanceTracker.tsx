'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/contexts/LanguageContext'
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Clock, RefreshCw } from 'lucide-react'

interface PropertyPerformance {
  property_id: string
  property_name: string
  location: string
  status: string
  total_cost: number
  paid_amount: number
  currency: string
  expected_roi: number
  reservation_date: string
  total_revenue: number
  total_expenses: number
  months_since_reservation: number
  actual_roi: number
  annualized_roi: number
  roi_variance: number
  performance_status: 'excellent' | 'good' | 'warning' | 'critical' | 'pending'
  performance_message: string | null
}

export default function PerformanceTracker() {
  const { t, language } = useLanguage()
  const [performances, setPerformances] = useState<PropertyPerformance[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    fetchPerformances()
  }, [])

  const fetchPerformances = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('property_performance')
        .select('*')
        .order('roi_variance', { ascending: true })

      if (error) throw error
      setPerformances(data || [])
    } catch (error) {
      console.error('Error fetching performances:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { icon: any; bg: string; text: string; border: string; label: string }> = {
      excellent: {
        icon: CheckCircle,
        bg: 'bg-green-50',
        text: 'text-green-700',
        border: 'border-green-300',
        label: language === 'fr' ? 'Excellent' : 'Excellent'
      },
      good: {
        icon: TrendingUp,
        bg: 'bg-blue-50',
        text: 'text-blue-700',
        border: 'border-blue-300',
        label: language === 'fr' ? 'Bon' : 'Good'
      },
      warning: {
        icon: AlertTriangle,
        bg: 'bg-yellow-50',
        text: 'text-yellow-700',
        border: 'border-yellow-300',
        label: language === 'fr' ? 'Attention' : 'Warning'
      },
      critical: {
        icon: TrendingDown,
        bg: 'bg-red-50',
        text: 'text-red-700',
        border: 'border-red-300',
        label: language === 'fr' ? 'Critique' : 'Critical'
      },
      pending: {
        icon: Clock,
        bg: 'bg-gray-50',
        text: 'text-gray-700',
        border: 'border-gray-300',
        label: language === 'fr' ? 'En attente' : 'Pending'
      }
    }
    return configs[status] || configs.pending
  }

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat(language === 'fr' ? 'fr-CA' : 'en-CA', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const filteredPerformances = filter === 'all'
    ? performances
    : performances.filter(p => p.performance_status === filter)

  const stats = {
    total: performances.length,
    excellent: performances.filter(p => p.performance_status === 'excellent').length,
    good: performances.filter(p => p.performance_status === 'good').length,
    warning: performances.filter(p => p.performance_status === 'warning').length,
    critical: performances.filter(p => p.performance_status === 'critical').length,
    pending: performances.filter(p => p.performance_status === 'pending').length
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6 px-1 sm:px-0 max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 break-words">
            {language === 'fr' ? 'Suivi de Performance ROI' : 'ROI Performance Tracking'}
          </h3>
          <p className="text-xs sm:text-sm text-gray-600 mt-1 break-words">
            {language === 'fr'
              ? 'Analyse de performance des projets avec alertes automatiques'
              : 'Project performance analysis with automatic alerts'}
          </p>
        </div>
        <button
          onClick={fetchPerformances}
          className="w-full sm:w-auto flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex-shrink-0"
        >
          <RefreshCw size={14} className="sm:w-[18px] sm:h-[18px]" />
          <span>{language === 'fr' ? 'Actualiser' : 'Refresh'}</span>
        </button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 sm:gap-3">
        <div className="bg-white p-3 sm:p-4 rounded-lg border-2 border-gray-200">
          <div className="text-[10px] sm:text-xs text-gray-600 mb-0.5 sm:mb-1 truncate">{language === 'fr' ? 'Total' : 'Total'}</div>
          <div className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">{stats.total}</div>
        </div>
        <div className="bg-green-50 p-3 sm:p-4 rounded-lg border-2 border-green-300">
          <div className="text-[10px] sm:text-xs text-green-700 mb-0.5 sm:mb-1 truncate">{language === 'fr' ? 'Excellents' : 'Excellent'}</div>
          <div className="text-lg sm:text-xl md:text-2xl font-bold text-green-800">{stats.excellent}</div>
        </div>
        <div className="bg-blue-50 p-3 sm:p-4 rounded-lg border-2 border-blue-300">
          <div className="text-[10px] sm:text-xs text-blue-700 mb-0.5 sm:mb-1 truncate">{language === 'fr' ? 'Bons' : 'Good'}</div>
          <div className="text-lg sm:text-xl md:text-2xl font-bold text-blue-800">{stats.good}</div>
        </div>
        <div className="bg-yellow-50 p-3 sm:p-4 rounded-lg border-2 border-yellow-300">
          <div className="text-[10px] sm:text-xs text-yellow-700 mb-0.5 sm:mb-1 truncate">{language === 'fr' ? 'Attention' : 'Warning'}</div>
          <div className="text-lg sm:text-xl md:text-2xl font-bold text-yellow-800">{stats.warning}</div>
        </div>
        <div className="bg-red-50 p-3 sm:p-4 rounded-lg border-2 border-red-300">
          <div className="text-[10px] sm:text-xs text-red-700 mb-0.5 sm:mb-1 truncate">{language === 'fr' ? 'Critiques' : 'Critical'}</div>
          <div className="text-lg sm:text-xl md:text-2xl font-bold text-red-800">{stats.critical}</div>
        </div>
        <div className="bg-gray-50 p-3 sm:p-4 rounded-lg border-2 border-gray-300">
          <div className="text-[10px] sm:text-xs text-gray-600 mb-0.5 sm:mb-1 truncate">{language === 'fr' ? 'En attente' : 'Pending'}</div>
          <div className="text-lg sm:text-xl md:text-2xl font-bold text-gray-700">{stats.pending}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-2 -mx-1 sm:mx-0 px-1 sm:px-0">
        {['all', 'critical', 'warning', 'good', 'excellent', 'pending'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-colors ${
              filter === f
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {f === 'all' ? (language === 'fr' ? 'Tous' : 'All') : getStatusConfig(f).label}
          </button>
        ))}
      </div>

      {/* Performance Cards */}
      {filteredPerformances.length === 0 ? (
        <div className="bg-white p-8 sm:p-12 rounded-lg border border-gray-200 text-center">
          <p className="text-sm sm:text-base text-gray-600">
            {language === 'fr' ? 'Aucun projet trouvé' : 'No projects found'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
          {filteredPerformances.map((perf) => {
            const statusConfig = getStatusConfig(perf.performance_status)
            const Icon = statusConfig.icon

            return (
              <div
                key={perf.property_id}
                className={`bg-white rounded-lg border-2 ${statusConfig.border} overflow-hidden hover:shadow-lg transition-shadow min-w-0 max-w-full`}
              >
                {/* Header */}
                <div className={`p-3 sm:p-4 ${statusConfig.bg} border-b-2 ${statusConfig.border}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-gray-900 text-sm sm:text-base md:text-lg mb-0.5 sm:mb-1 truncate">{perf.property_name}</h4>
                      <p className="text-xs sm:text-sm text-gray-600 truncate">{perf.location}</p>
                    </div>
                    <div className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 rounded-full ${statusConfig.bg} ${statusConfig.text} border ${statusConfig.border} flex-shrink-0`}>
                      <Icon size={14} className="sm:w-4 sm:h-4" />
                      <span className="text-[10px] sm:text-xs font-bold whitespace-nowrap">{statusConfig.label}</span>
                    </div>
                  </div>
                </div>

                {/* Body */}
                <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
                  {/* ROI Comparison */}
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    <div className="text-center min-w-0">
                      <div className="text-[10px] sm:text-xs text-gray-600 mb-0.5 sm:mb-1 truncate">
                        {language === 'fr' ? 'ROI Attendu' : 'Expected ROI'}
                      </div>
                      <div className="text-sm sm:text-base md:text-lg font-bold text-gray-900">{perf.expected_roi}%</div>
                    </div>
                    <div className="text-center min-w-0">
                      <div className="text-[10px] sm:text-xs text-gray-600 mb-0.5 sm:mb-1 truncate">
                        {language === 'fr' ? 'ROI Réel' : 'Actual ROI'}
                      </div>
                      <div className="text-sm sm:text-base md:text-lg font-bold text-blue-600">{perf.annualized_roi}%</div>
                      <div className="text-[10px] sm:text-xs text-gray-500 truncate">
                        ({language === 'fr' ? 'annualisé' : 'annualized'})
                      </div>
                    </div>
                    <div className="text-center min-w-0">
                      <div className="text-[10px] sm:text-xs text-gray-600 mb-0.5 sm:mb-1 truncate">
                        {language === 'fr' ? 'Écart' : 'Variance'}
                      </div>
                      <div className={`text-sm sm:text-base md:text-lg font-bold ${
                        perf.roi_variance >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {perf.roi_variance > 0 ? '+' : ''}{perf.roi_variance}%
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div>
                    <div className="flex justify-between text-[10px] sm:text-xs text-gray-600 mb-1">
                      <span className="truncate">{language === 'fr' ? 'Performance' : 'Performance'}</span>
                      <span className="flex-shrink-0">
                        {perf.annualized_roi >= 0
                          ? `${((perf.annualized_roi / perf.expected_roi) * 100).toFixed(0)}%`
                          : '0%'}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5 sm:h-2">
                      <div
                        className={`h-1.5 sm:h-2 rounded-full ${
                          perf.roi_variance >= perf.expected_roi * 0.2
                            ? 'bg-green-600'
                            : perf.roi_variance >= perf.expected_roi * -0.1
                            ? 'bg-blue-600'
                            : perf.roi_variance >= perf.expected_roi * -0.3
                            ? 'bg-yellow-600'
                            : 'bg-red-600'
                        }`}
                        style={{
                          width: `${Math.min(100, Math.max(0, (perf.annualized_roi / perf.expected_roi) * 100))}%`
                        }}
                      ></div>
                    </div>
                  </div>

                  {/* Financial Details */}
                  <div className="grid grid-cols-2 gap-2 sm:gap-3 pt-2 sm:pt-3 border-t border-gray-200">
                    <div className="min-w-0">
                      <div className="text-[10px] sm:text-xs text-gray-600 mb-0.5 sm:mb-1 truncate">
                        {language === 'fr' ? 'Revenus totaux' : 'Total Revenue'}
                      </div>
                      <div className="text-xs sm:text-sm md:text-base font-bold text-green-600 truncate">
                        {formatCurrency(perf.total_revenue, perf.currency)}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] sm:text-xs text-gray-600 mb-0.5 sm:mb-1 truncate">
                        {language === 'fr' ? 'Coût total' : 'Total Cost'}
                      </div>
                      <div className="text-xs sm:text-sm md:text-base font-bold text-gray-900 truncate">
                        {formatCurrency(perf.total_cost, perf.currency)}
                      </div>
                    </div>
                  </div>

                  {/* Performance Message */}
                  {perf.performance_message && (
                    <div className="bg-gray-50 p-2 rounded border border-gray-200">
                      <p className="text-[10px] sm:text-xs text-gray-600 break-words">{perf.performance_message}</p>
                    </div>
                  )}

                  {/* Time Info */}
                  <div className="text-[10px] sm:text-xs text-gray-500 flex items-center gap-1 min-w-0">
                    <Clock size={10} className="sm:w-3 sm:h-3 flex-shrink-0" />
                    <span className="truncate min-w-0">
                      {Math.floor(perf.months_since_reservation)} {language === 'fr' ? 'mois' : 'months'}
                      <span className="hidden sm:inline"> {language === 'fr' ? 'depuis réservation' : 'since reservation'}</span>
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
