'use client'

import { useEffect, useState } from 'react'
import { useNAVTimeline } from '@/hooks/useNAVTimeline'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'

interface Props {
  className?: string
}

interface TooltipPayload {
  value: number
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipPayload[]; label?: string }) {
  if (!active || !payload?.length || !label) return null
  const nav = payload[0].value
  const pct = ((nav - 1) * 100).toFixed(2)
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-left">
      <p className="text-xs text-gray-500 mb-1">
        {new Date(label + 'T00:00:00').toLocaleDateString('fr-CA', {
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

export default function NAVTimelineChart({ className = '' }: Props) {
  const { data, loading } = useNAVTimeline()
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

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

  // Silently hide if function not yet deployed or no data
  if (data.length === 0) return null

  const chartData = data.map(d => ({
    date:  d.point_date,
    nav:   Math.round(d.nav_per_share * 10000) / 10000,
    label: new Date(d.point_date + 'T00:00:00').toLocaleDateString('fr-CA', {
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
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            Évolution du NAV / part
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">Depuis les premières transactions</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {current.toFixed(4)} $
          </p>
          <p className={`text-xs font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {Number(totalPct) >= 0 ? '+' : ''}{totalPct}% depuis lancement
          </p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id="navGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={color} stopOpacity={0.25} />
              <stop offset="95%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />

          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            tickFormatter={(v) =>
              new Date(v + 'T00:00:00').toLocaleDateString('fr-CA', { month: 'short' })
            }
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />

          <YAxis
            domain={[minVal, maxVal]}
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            tickFormatter={(v) => v.toFixed(2)}
            tickLine={false}
            axisLine={false}
            width={48}
          />

          <Tooltip content={<CustomTooltip />} />

          <ReferenceLine
            y={1.0}
            stroke="#cbd5e1"
            strokeDasharray="4 4"
            label={{ value: '1,00 $', position: 'insideTopRight', fontSize: 10, fill: '#94a3b8' }}
          />

          <Area
            type="monotone"
            dataKey="nav"
            stroke={color}
            strokeWidth={2}
            fill="url(#navGrad)"
            dot={data.length <= 18 ? { r: 4, fill: color, strokeWidth: 0 } : false}
            activeDot={{ r: 5, fill: color }}
          />
        </AreaChart>
      </ResponsiveContainer>

      {data.length <= 2 && (
        <p className="text-xs text-center text-gray-400 mt-3">
          Le graphique s'enrichira chaque mois au fil des transactions
        </p>
      )}
    </div>
  )
}
