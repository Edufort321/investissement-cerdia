'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, Calendar, Users, BarChart3 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/contexts/LanguageContext'

interface OccupationStat {
  period_type: string
  period_label: string
  days_booked_commercial: number
  days_booked_personal: number
  total_days_booked: number
  total_days_in_period: number
  occupation_rate_pct: number
}

interface InvestorOccupationStat {
  property_name: string
  unit_number: string
  ownership_percentage: number
  entitled_days: number
  days_used: number
  days_remaining: number
  utilization_rate_pct: number
}

interface OccupationStatsProps {
  type: 'project' | 'investor'
  id: string
  year?: number
  showDetails?: boolean
}

export default function OccupationStats({ type, id, year, showDetails = true }: OccupationStatsProps) {
  const { language } = useLanguage()
  const fr = language === 'fr'

  const [projectStats, setProjectStats] = useState<OccupationStat[]>([])
  const [investorStats, setInvestorStats] = useState<InvestorOccupationStat[]>([])
  const [selectedYear, setSelectedYear] = useState(year || new Date().getFullYear())
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => { loadStats() }, [id, selectedYear, type])

  const loadStats = async () => {
    setIsLoading(true)
    try {
      if (type === 'project') await loadProjectStats()
      else await loadInvestorStats()
    } catch (error) {
      console.error('Error loading occupation stats:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadProjectStats = async () => {
    const { data, error } = await supabase.rpc('get_project_occupation_stats', { p_scenario_id: id, p_year: selectedYear })
    if (error) { console.error('Error loading project stats:', error); return }
    setProjectStats(data || [])
  }

  const loadInvestorStats = async () => {
    const { data, error } = await supabase.rpc('get_investor_occupation_stats', { p_investor_id: id, p_year: selectedYear })
    if (error) { console.error('Error loading investor stats:', error); return }
    setInvestorStats(data || [])
  }

  const getOccupationColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600 bg-green-50'
    if (rate >= 60) return 'text-blue-600 bg-blue-50'
    if (rate >= 40) return 'text-orange-600 bg-orange-50'
    return 'text-red-600 bg-red-50'
  }

  const getProgressBarColor = (rate: number) => {
    if (rate >= 80) return 'bg-green-600'
    if (rate >= 60) return 'bg-blue-600'
    if (rate >= 40) return 'bg-orange-600'
    return 'bg-red-600'
  }

  const dayLabel = (n: number) => fr ? `${n}j` : `${n}d`

  const yearOptions = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (type === 'project') {
    const annualStats = projectStats.find(s => s.period_type === 'annual')
    const quarterlyStats = projectStats.filter(s => s.period_type === 'quarterly')
    const monthlyStats = projectStats.filter(s => s.period_type === 'monthly')

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 size={20} />
            {fr ? "Taux d'occupation" : 'Occupancy rate'}
          </h3>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        {annualStats && (
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-blue-700 font-medium">{fr ? `Taux annuel ${selectedYear}` : `Annual rate ${selectedYear}`}</p>
                <p className="text-4xl font-bold text-blue-900">{annualStats.occupation_rate_pct}%</p>
              </div>
              <TrendingUp className="text-blue-600" size={48} />
            </div>
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div className="bg-white rounded-lg p-3">
                <p className="text-xs text-gray-600">{fr ? 'Jours commercial' : 'Commercial days'}</p>
                <p className="text-lg font-bold text-gray-900">{annualStats.days_booked_commercial}</p>
              </div>
              <div className="bg-white rounded-lg p-3">
                <p className="text-xs text-gray-600">{fr ? 'Jours personnel' : 'Personal days'}</p>
                <p className="text-lg font-bold text-gray-900">{annualStats.days_booked_personal}</p>
              </div>
              <div className="bg-white rounded-lg p-3">
                <p className="text-xs text-gray-600">{fr ? 'Total jours' : 'Total days'}</p>
                <p className="text-lg font-bold text-gray-900">{annualStats.total_days_booked}</p>
              </div>
            </div>
          </div>
        )}

        {showDetails && quarterlyStats.length > 0 && (
          <div>
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Calendar size={16} />
              {fr ? 'Par trimestre' : 'By quarter'}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {quarterlyStats.map((stat, idx) => (
                <div key={idx} className="bg-white border border-gray-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">{stat.period_label}</p>
                  <p className={`text-2xl font-bold mb-2 ${getOccupationColor(stat.occupation_rate_pct).split(' ')[0]}`}>
                    {stat.occupation_rate_pct}%
                  </p>
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className={`h-full ${getProgressBarColor(stat.occupation_rate_pct)}`} style={{ width: `${Math.min(stat.occupation_rate_pct, 100)}%` }} />
                  </div>
                  <div className="mt-2 text-xs text-gray-600">
                    {stat.total_days_booked} / {stat.total_days_in_period} {fr ? 'jours' : 'days'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {showDetails && monthlyStats.length > 0 && (
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">{fr ? 'Par mois' : 'By month'}</h4>
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-3 text-left text-sm font-semibold text-gray-700">{fr ? 'Mois' : 'Month'}</th>
                    <th className="p-3 text-center text-sm font-semibold text-gray-700">{fr ? 'Commercial' : 'Commercial'}</th>
                    <th className="p-3 text-center text-sm font-semibold text-gray-700">{fr ? 'Personnel' : 'Personal'}</th>
                    <th className="p-3 text-center text-sm font-semibold text-gray-700">Total</th>
                    <th className="p-3 text-center text-sm font-semibold text-gray-700">{fr ? 'Taux' : 'Rate'}</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyStats.map((stat, idx) => (
                    <tr key={idx} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="p-3 text-sm text-gray-900">{stat.period_label}</td>
                      <td className="p-3 text-center text-sm text-gray-700">{dayLabel(stat.days_booked_commercial)}</td>
                      <td className="p-3 text-center text-sm text-gray-700">{dayLabel(stat.days_booked_personal)}</td>
                      <td className="p-3 text-center text-sm font-medium text-gray-900">{dayLabel(stat.total_days_booked)}</td>
                      <td className="p-3 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getOccupationColor(stat.occupation_rate_pct)}`}>
                          {stat.occupation_rate_pct}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <Users size={20} />
          {fr ? `Utilisation des droits d'occupation (${selectedYear})` : `Occupancy rights usage (${selectedYear})`}
        </h3>
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
        >
          {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {investorStats.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-8 text-center text-gray-500">
          {fr ? "Aucune donnée d'occupation pour cette année" : 'No occupancy data for this year'}
        </div>
      ) : (
        <div className="space-y-4">
          {investorStats.map((stat, idx) => {
            const utilizationPct = stat.utilization_rate_pct || 0
            return (
              <div key={idx} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-gray-900">{stat.property_name}</h4>
                    <p className="text-sm text-gray-600">{fr ? 'Unité' : 'Unit'} {stat.unit_number}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-600">{fr ? 'Participation' : 'Ownership'}</p>
                    <p className="text-lg font-bold text-blue-600">{stat.ownership_percentage}%</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div className="bg-gray-50 rounded p-2">
                    <p className="text-xs text-gray-600">{fr ? 'Jours autorisés' : 'Entitled days'}</p>
                    <p className="text-sm font-bold text-gray-900">{Math.round(stat.entitled_days)}</p>
                  </div>
                  <div className="bg-blue-50 rounded p-2">
                    <p className="text-xs text-blue-700">{fr ? 'Jours utilisés' : 'Days used'}</p>
                    <p className="text-sm font-bold text-blue-900">{stat.days_used}</p>
                  </div>
                  <div className="bg-green-50 rounded p-2">
                    <p className="text-xs text-green-700">{fr ? 'Jours restants' : 'Days remaining'}</p>
                    <p className="text-sm font-bold text-green-900">{Math.round(stat.days_remaining)}</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">{fr ? "Taux d'utilisation" : 'Utilization rate'}</span>
                    <span className={`font-medium ${utilizationPct > 80 ? 'text-red-600' : utilizationPct > 50 ? 'text-orange-600' : 'text-green-600'}`}>
                      {utilizationPct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${utilizationPct > 80 ? 'bg-red-600' : utilizationPct > 50 ? 'bg-orange-600' : 'bg-green-600'}`}
                      style={{ width: `${Math.min(utilizationPct, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-sm text-blue-800">
          {fr
            ? <><strong>Note :</strong> Les jours autorisés sont calculés selon votre % de parts dans chaque projet. Les quotas se réinitialisent chaque année.</>
            : <><strong>Note:</strong> Entitled days are calculated based on your ownership % in each project. Quotas reset each year.</>}
        </p>
      </div>
    </div>
  )
}
