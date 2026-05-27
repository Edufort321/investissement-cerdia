'use client'

import { useState, useEffect } from 'react'
import { Shield, Users, TrendingUp, DollarSign, RefreshCw, ExternalLink, CheckCircle, XCircle, Clock, Building2 } from 'lucide-react'

interface CSClient {
  id: string
  company_name: string
  admin_email: string | null
  plan: string
  monthly_revenue: number
  annual_revenue: number
  modules_count: number
  sites_count: number
  status: string
  synced_at: string
  created_at: string
}

interface Summary {
  clients: CSClient[]
  totalMonthly: number
  totalAnnual: number
  activeCount: number
}

const CSECUR360_URL = process.env.NEXT_PUBLIC_CSECUR360_URL || 'http://localhost:3000'

export default function CSecur360Tab() {
  const [data, setData] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/commerce/csecur360', {
        headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_CSECUR360_SYNC_SECRET || 'csecur360-cerdia-bridge'}` }
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setData(await res.json())
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const fmt = (n: number) => new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(n)

  const statusBadge = (s: string) => {
    if (s === 'active') return <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 text-xs px-2 py-0.5 rounded-full border border-green-200"><CheckCircle size={10} />Actif</span>
    if (s === 'suspended') return <span className="inline-flex items-center gap-1 bg-yellow-50 text-yellow-700 text-xs px-2 py-0.5 rounded-full border border-yellow-200"><Clock size={10} />Suspendu</span>
    return <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 text-xs px-2 py-0.5 rounded-full border border-red-200"><XCircle size={10} />Inactif</span>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-orange-100 rounded-xl flex items-center justify-center">
            <Shield size={18} className="text-orange-600" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">C-Secur360 — Revenus</h2>
            <p className="text-xs text-gray-500">Clients synchronises depuis la plateforme de securite industrielle</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition disabled:opacity-50">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Actualiser
          </button>
          <a href={`${CSECUR360_URL}/admin/dashboard`} target="_blank" rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition">
            <ExternalLink size={13} /> Ouvrir C-Secur360
          </a>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          Erreur de synchronisation : {error} — verifie que C-Secur360 est en ligne et la migration 186 executee.
        </div>
      )}

      {/* KPI cards */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { icon: Users, label: 'Clients actifs', value: String(data.activeCount), color: 'text-blue-600', bg: 'bg-blue-50' },
            { icon: Building2, label: 'Total clients', value: String(data.clients.length), color: 'text-purple-600', bg: 'bg-purple-50' },
            { icon: DollarSign, label: 'Revenus mensuels', value: fmt(data.totalMonthly), color: 'text-orange-600', bg: 'bg-orange-50' },
            { icon: TrendingUp, label: 'Revenus annuels', value: fmt(data.totalAnnual), color: 'text-green-600', bg: 'bg-green-50' },
          ].map((k, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-xl p-4">
              <div className={`w-8 h-8 ${k.bg} rounded-lg flex items-center justify-center mb-2`}>
                <k.icon size={15} className={k.color} />
              </div>
              <p className="text-lg font-black text-gray-900">{k.value}</p>
              <p className="text-xs text-gray-500">{k.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 text-sm">Liste des clients</h3>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">Chargement...</div>
        ) : !data || data.clients.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            Aucun client C-Secur360 synchronise. Les nouveaux tenants apparaitront ici automatiquement.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Organisation', 'Courriel', 'Modules', 'Sites', 'Mensuel', 'Annuel', 'Statut', 'Sync'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.clients.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50/50 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <a href={`${CSECUR360_URL}/${c.id}/modules`} target="_blank" rel="noreferrer"
                          className="font-semibold text-gray-900 text-sm hover:text-orange-600 transition">
                          {c.company_name}
                        </a>
                        <span className="text-gray-300 text-xs">/{c.id}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{c.admin_email || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{c.modules_count}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{c.sites_count}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">{fmt(c.monthly_revenue)}</td>
                    <td className="px-4 py-3 text-sm font-bold text-orange-600">{fmt(c.annual_revenue)}</td>
                    <td className="px-4 py-3">{statusBadge(c.status)}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">{new Date(c.synced_at).toLocaleDateString('fr-CA')}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t border-gray-200">
                  <td colSpan={4} className="px-4 py-3 text-xs font-semibold text-gray-600">Total ({data.activeCount} actifs)</td>
                  <td className="px-4 py-3 text-sm font-bold text-gray-900">{fmt(data.totalMonthly)}</td>
                  <td className="px-4 py-3 text-sm font-black text-orange-600">{fmt(data.totalAnnual)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
