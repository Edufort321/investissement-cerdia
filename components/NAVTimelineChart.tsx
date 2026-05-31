'use client'

import { useEffect, useState } from 'react'
import { useOrganization } from '@/contexts/OrganizationContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { useNAVTimeline } from '@/hooks/useNAVTimeline'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'

interface Props {
  className?: string
}

interface TooltipPayload {
  value: number
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipPayload[]; label?: string }) {
  const { language } = useLanguage()
  const fr = language === 'fr'

  if (!active || !payload?.length || !label) return null
  const nav = payload[0].value
  const pct = ((nav - 1) * 100).toFixed(2)
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-left">
      <p className="text-xs text-gray-500 mb-1">
        {new Date(label + 'T00:00:00').toLocaleDateString(fr ? 'fr-CA' : 'en-CA', {
          year: 'numeric', month: 'long', day: 'numeric',
        })}
      </p>
      <p className="text-sm font-bold text-gray-900">{nav.toFixed(4)} $/part</p>
      <p className={`text-xs font-medium ${nav >= 1 ? 'text-green-600' : 'text-red-600'}`}>
        {nav >= 1 ? '+' : ''}{pct}% vs 1,00 $
      </p>
    </div>
  )
}

type Range = '3M' | '6M' | '1A' | 'ALL'

export default function NAVTimelineChart({ className = '' }: Props) {
  const { organization } = useOrganization()
  const { t, language } = useLanguage()
  const fr = language === 'fr'
  const { data, loading } = useNAVTimeline(organization?.id ?? null)
  const [mounted, setMounted] = useState(false)
  const [range, setRange] = useState<Range>('ALL')
  // Détection mobile pour adapter le graphique (hauteur, ticks, dots).
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    setMounted(true)
    const check = () => setIsMobile(window.innerWidth < 640)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  if (!mounted || loading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-1"></div>
          <div className="h-3 bg-gray-100 rounded w-1/4 mb-6"></div>
          <div className="h-48 bg-gray-100 rounded"></div>
        </div>
      </div>
    )
  }

  if (data.length === 0) return null

  // Filtre la plage de temps selon le bouton sélectionné.
  const monthsBack: Record<Range, number | null> = { '3M': 3, '6M': 6, '1A': 12, 'ALL': null }
  const cutoff = (() => {
    const m = monthsBack[range]
    if (m === null) return null
    const d = new Date(); d.setMonth(d.getMonth() - m)
    return d
  })()
  const filtered = cutoff
    ? data.filter(d => new Date(d.point_date + 'T00:00:00') >= cutoff)
    : data
  // Garde au moins 2 points pour un graphique lisible (sinon on retombe sur tout).
  const source = filtered.length >= 2 ? filtered : data

  const chartData = source.map(d => ({
    date:  d.point_date,
    nav:   Math.round(d.nav_per_share * 10000) / 10000,
    label: new Date(d.point_date + 'T00:00:00').toLocaleDateString(fr ? 'fr-CA' : 'en-CA', {
      month: 'short', year: '2-digit',
    }),
  }))

  const navValues = chartData.map(d => d.nav)
  const current   = navValues[navValues.length - 1] ?? 1
  const initial   = navValues[0] ?? 1
  const isPositive = current >= 1.0
  const color     = isPositive ? '#10b981' : '#ef4444'

  const minVal = Math.min(...navValues, 1.0) * 0.995
  const maxVal = Math.max(...navValues) * 1.005

  const totalPct = initial > 0 ? ((current - initial) / initial * 100).toFixed(2) : '0.00'

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-4">
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            {t('nav.evolutionTitle')} / {fr ? 'part' : 'share'}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {fr ? 'Depuis les premières transactions' : 'Since the first transactions'}
          </p>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {current.toFixed(4)} $
          </p>
          <p className={`text-xs font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {Number(totalPct) >= 0 ? '+' : ''}{totalPct}% {fr ? 'depuis lancement' : 'since launch'}
          </p>
        </div>
      </div>

      {/* Filtre de période (comme le taux de change) */}
      <div className="flex gap-1.5 mb-3">
        {(['3M', '6M', '1A', 'ALL'] as Range[]).map(r => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${
              range === r
                ? 'bg-gray-800 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {r === 'ALL' ? (fr ? 'Tout' : 'All') : r === '1A' ? (fr ? '1 an' : '1Y') : r}
          </button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={isMobile ? 180 : 220}>
        <LineChart data={chartData} margin={{ top: 5, right: isMobile ? 4 : 10, left: isMobile ? -8 : 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />

          <XAxis
            dataKey="date"
            tick={{ fontSize: isMobile ? 9 : 11, fill: '#9ca3af' }}
            tickFormatter={(v) =>
              new Date(v + 'T00:00:00').toLocaleDateString(fr ? 'fr-CA' : 'en-CA', { month: 'short' })
            }
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            minTickGap={isMobile ? 24 : 12}
          />

          <YAxis
            domain={[minVal, maxVal]}
            tick={{ fontSize: isMobile ? 9 : 11, fill: '#9ca3af' }}
            tickFormatter={(v) => v.toFixed(2)}
            tickLine={false}
            axisLine={false}
            width={isMobile ? 38 : 48}
          />

          <Tooltip content={<CustomTooltip />} />

          <ReferenceLine
            y={1.0}
            stroke="#cbd5e1"
            strokeDasharray="4 4"
            label={{ value: '1,00 $', position: 'insideTopRight', fontSize: 10, fill: '#94a3b8' }}
          />

          <Line
            type="monotone"
            dataKey="nav"
            stroke={color}
            strokeWidth={2}
            dot={chartData.length <= (isMobile ? 10 : 18) ? { r: isMobile ? 3 : 4, fill: color, stroke: color, strokeWidth: 0 } : false}
            activeDot={{ r: 5, fill: color }}
          />
        </LineChart>
      </ResponsiveContainer>

      {data.length <= 2 && (
        <p className="text-xs text-center text-gray-400 mt-3">
          {fr
            ? "Le graphique s'enrichira chaque mois au fil des transactions"
            : 'The chart will grow each month as transactions are recorded'}
        </p>
      )}
    </div>
  )
}
