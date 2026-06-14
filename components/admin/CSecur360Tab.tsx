'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Shield, Users, TrendingUp, DollarSign, RefreshCw, ExternalLink,
  CheckCircle, XCircle, Clock, Building2, UserCheck, Plus, Percent,
  BadgeCheck, AlertTriangle, ArrowDownToLine, Package, Calendar,
  FileCheck, ClipboardList, Layers, HardHat, BoxesIcon,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface CSVendor {
  id: string
  name: string
  email: string | null
  phone: string | null
  commission_rate: number
  is_active: boolean
  notes: string | null
  synced_at: string
}

interface CSModule {
  key: string
  name_fr: string
  name_en: string
  monthly_price: number
  sort_order: number
  is_active: boolean
  active_tenants: number
  billable_tenants: number
  synced_at: string
}

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
  vendor_id: string | null
  billable: boolean
  synced_at: string
  created_at: string
}

const CSECUR360_URL = process.env.NEXT_PUBLIC_CSECUR360_URL || 'http://localhost:3000'

// Auth par SESSION admin connectée (le token est validé côté serveur — rôle super_admin … org_commerce).
// On n'embarque plus de secret de pont dans le navigateur (fragile + risque de fuite).
async function authHeaders(extra?: Record<string, string>): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token || ''
  return { Authorization: `Bearer ${token}`, ...(extra || {}) }
}

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(n)
const fmtPct = (r: number) => `${Math.round(r * 100)}%`

const statusBadge = (s: string) => {
  if (s === 'active') return (
    <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 text-xs px-2 py-0.5 rounded-full border border-green-200">
      <CheckCircle size={10} />Actif
    </span>
  )
  if (s === 'suspended') return (
    <span className="inline-flex items-center gap-1 bg-yellow-50 text-yellow-700 text-xs px-2 py-0.5 rounded-full border border-yellow-200">
      <Clock size={10} />Suspendu
    </span>
  )
  if (s === 'archived') return (
    <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full border border-gray-200">
      <XCircle size={10} />Archivé
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 text-xs px-2 py-0.5 rounded-full border border-red-200">
      <XCircle size={10} />Inactif
    </span>
  )
}

const BLANK_VENDOR = { name: '', email: '', phone: '', commission_rate: 20, notes: '' }

// Icône par clé de module
const MODULE_ICONS: Record<string, React.ElementType> = {
  admin:       Shield,
  projects:    Layers,
  planner:     Calendar,
  ast:         HardHat,
  permits:     FileCheck,
  accidents:   AlertTriangle,
  near_miss:   AlertTriangle,
  inventory:   BoxesIcon,
  inspections: ClipboardList,
  timesheets:  Clock,
  todo:        CheckCircle,
}

const MODULE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  admin:       { bg: 'bg-gray-100',    text: 'text-gray-600',   border: 'border-gray-200' },
  projects:    { bg: 'bg-blue-50',     text: 'text-blue-600',   border: 'border-blue-200' },
  planner:     { bg: 'bg-violet-50',   text: 'text-violet-600', border: 'border-violet-200' },
  ast:         { bg: 'bg-orange-50',   text: 'text-orange-600', border: 'border-orange-200' },
  permits:     { bg: 'bg-amber-50',    text: 'text-amber-600',  border: 'border-amber-200' },
  accidents:   { bg: 'bg-red-50',      text: 'text-red-600',    border: 'border-red-200' },
  near_miss:   { bg: 'bg-yellow-50',   text: 'text-yellow-600', border: 'border-yellow-200' },
  inventory:   { bg: 'bg-teal-50',     text: 'text-teal-600',   border: 'border-teal-200' },
  inspections: { bg: 'bg-cyan-50',     text: 'text-cyan-600',   border: 'border-cyan-200' },
  timesheets:  { bg: 'bg-indigo-50',   text: 'text-indigo-600', border: 'border-indigo-200' },
  todo:        { bg: 'bg-emerald-50',  text: 'text-emerald-600',border: 'border-emerald-200' },
}

export default function CSecur360Tab() {
  const [tab, setTab] = useState<'clients' | 'modules' | 'vendeurs'>('clients')
  const [clients, setClients] = useState<CSClient[]>([])
  const [vendors, setVendors] = useState<CSVendor[]>([])
  const [modules, setModules] = useState<CSModule[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [syncMsg, setSyncMsg] = useState<string | null>(null)

  const [showVendorForm, setShowVendorForm] = useState(false)
  const [newVendor, setNewVendor] = useState(BLANK_VENDOR)
  const [savingVendor, setSavingVendor] = useState(false)

  const loadAll = async () => {
    setLoading(true)
    setError(null)
    try {
      const h = await authHeaders()
      const [cRes, vRes, mRes] = await Promise.all([
        fetch('/api/commerce/csecur360', { headers: h }),
        fetch('/api/commerce/csecur360/vendors', { headers: h }),
        fetch('/api/commerce/csecur360/modules', { headers: h }),
      ])
      if (!cRes.ok) throw new Error(`clients HTTP ${cRes.status}`)
      const cData = await cRes.json()
      setClients(cData.clients || [])
      if (vRes.ok) {
        const vData = await vRes.json()
        setVendors(vData.vendors || [])
      }
      if (mRes.ok) {
        const mData = await mRes.json()
        setModules(mData.modules || [])
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadAll() }, [])

  const syncFromCSecur = async () => {
    setSyncing(true)
    setSyncMsg(null)
    try {
      const res = await fetch('/api/commerce/csecur360/sync', {
        method: 'POST',
        headers: await authHeaders(),
      })
      const d = await res.json()
      if (d.ok) {
        setSyncMsg(`✓ ${d.clientsSynced} clients · ${d.vendorsSynced} vendeurs · ${d.modulesSynced ?? 0} modules synchronisés`)
      } else {
        setSyncMsg(`⚠ Sync partielle — ${d.errors?.join(', ')}`)
      }
      await loadAll()
    } catch (e: any) {
      setSyncMsg(`Erreur sync : ${e.message}`)
    } finally {
      setSyncing(false)
    }
  }

  const handleCreateVendor = async () => {
    if (!newVendor.name.trim()) return
    setSavingVendor(true)
    try {
      const res = await fetch('/api/commerce/csecur360/vendors', {
        method: 'POST',
        headers: await authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ ...newVendor, commission_rate: newVendor.commission_rate / 100 }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      setNewVendor(BLANK_VENDOR)
      setShowVendorForm(false)
      await loadAll()
    } catch (e: any) {
      alert('Erreur : ' + e.message)
    } finally {
      setSavingVendor(false)
    }
  }

  const deactivateVendor = async (id: string, name: string) => {
    if (!confirm(`Désactiver ${name} ?`)) return
    await fetch(`/api/commerce/csecur360/vendors?id=${id}`, { method: 'DELETE', headers: await authHeaders() })
    loadAll()
  }

  // KPIs calculés
  const activeClients = useMemo(() => clients.filter(c => c.status === 'active'), [clients])
  const billableActive = useMemo(() => activeClients.filter(c => c.billable), [activeClients])

  const totalAnnual = useMemo(() => billableActive.reduce((s, c) => s + Number(c.annual_revenue), 0), [billableActive])
  const totalMonthly = useMemo(() => billableActive.reduce((s, c) => s + Number(c.monthly_revenue), 0), [billableActive])

  const totalCommission = useMemo(() => billableActive.reduce((s, c) => {
    if (!c.vendor_id) return s
    const v = vendors.find(x => x.id === c.vendor_id)
    return s + Number(c.annual_revenue) * Number(v?.commission_rate ?? 0)
  }, 0), [billableActive, vendors])

  const netCerdia = totalAnnual - totalCommission
  const vendorClientCount = useMemo(() => billableActive.filter(c => c.vendor_id).length, [billableActive])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-orange-100 rounded-xl flex items-center justify-center">
            <Shield size={18} className="text-orange-600" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">C-Secur360 — Revenus & Vendeurs</h2>
            <p className="text-xs text-gray-500">Clients et représentants commerciaux synchronisés depuis la plateforme sécurité</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={syncFromCSecur} disabled={syncing || loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition disabled:opacity-50">
            <ArrowDownToLine size={13} className={syncing ? 'animate-bounce' : ''} />
            {syncing ? 'Sync…' : 'Sync depuis C-Secur360'}
          </button>
          <button onClick={loadAll} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition disabled:opacity-50">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Actualiser
          </button>
          <a href={`${CSECUR360_URL}/admin/dashboard`} target="_blank" rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition">
            <ExternalLink size={13} /> Ouvrir C-Secur360
          </a>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 flex items-center gap-2">
          <AlertTriangle size={15} />
          {error} — vérifie que C-Secur360 est en ligne et les migrations 186-187 exécutées.
        </div>
      )}
      {syncMsg && (
        <div className={`border rounded-xl px-4 py-3 text-sm flex items-center gap-2 ${syncMsg.startsWith('✓') ? 'bg-green-50 border-green-200 text-green-700' : 'bg-yellow-50 border-yellow-200 text-yellow-700'}`}>
          {syncMsg.startsWith('✓') ? <CheckCircle size={15} /> : <AlertTriangle size={15} />}
          {syncMsg}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Clients facturables — valeur principale */}
        <div className="bg-white border border-emerald-200 rounded-xl p-4">
          <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center mb-2">
            <BadgeCheck size={15} className="text-emerald-600" />
          </div>
          <p className="text-base font-black text-emerald-700 leading-tight">{billableActive.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Clients facturables</p>
          <p className="text-[10px] text-gray-400">{activeClients.length} actifs · {clients.length} total</p>
        </div>
        {/* Modules par client facturables */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center mb-2">
            <Layers size={15} className="text-blue-600" />
          </div>
          <p className="text-base font-black text-gray-900 leading-tight">
            {modules.filter(m => m.is_active && m.billable_tenants > 0).length}
            <span className="text-xs font-normal text-gray-400"> / {modules.filter(m => m.is_active).length}</span>
          </p>
          <p className="text-xs text-gray-500 mt-0.5">Modules fact. / actifs</p>
          <p className="text-[10px] text-gray-400">{modules.filter(m => m.is_active && m.billable_tenants > 0).reduce((s, m) => s + m.billable_tenants, 0)} assign. facturables</p>
        </div>
        {[
          { icon: DollarSign, label: 'Revenu mensuel',    sub: `${billableActive.length} fact.`, value: fmt(totalMonthly),    color: 'text-orange-600', bg: 'bg-orange-50' },
          { icon: TrendingUp, label: 'Revenu annuel',     sub: `${billableActive.length} fact.`, value: fmt(totalAnnual),     color: 'text-green-600',  bg: 'bg-green-50' },
          { icon: UserCheck,  label: 'Net CERDIA',        sub: 'après commissions',              value: fmt(netCerdia),       color: 'text-emerald-700',bg: 'bg-emerald-50' },
          { icon: Percent,    label: 'Commissions vend.', sub: `${vendorClientCount} client${vendorClientCount !== 1 ? 's' : ''}`, value: fmt(totalCommission), color: 'text-indigo-600', bg: 'bg-indigo-50' },
        ].map((k, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-xl p-4">
            <div className={`w-8 h-8 ${k.bg} rounded-lg flex items-center justify-center mb-2`}>
              <k.icon size={15} className={k.color} />
            </div>
            <p className="text-base font-black text-gray-900 leading-tight">{k.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{k.label}</p>
            <p className="text-[10px] text-gray-400">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Répartition revenus */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Revenu annuel total</p>
          <p className="text-2xl font-black text-gray-900">{fmt(totalAnnual)}</p>
          <p className="text-xs text-gray-500 mt-1">{billableActive.length} clients facturables actifs</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200 rounded-xl p-5">
          <p className="text-xs font-bold text-emerald-600 uppercase tracking-wide mb-1">Revenu net CERDIA</p>
          <p className="text-2xl font-black text-emerald-800">{fmt(netCerdia)}</p>
          <p className="text-xs text-emerald-600 mt-1">Après déduction des commissions</p>
        </div>
        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-200 rounded-xl p-5">
          <p className="text-xs font-bold text-indigo-600 uppercase tracking-wide mb-1">Commissions vendeurs</p>
          <p className="text-2xl font-black text-indigo-800">{fmt(totalCommission)}</p>
          <p className="text-xs text-indigo-600 mt-1">{vendorClientCount} client{vendorClientCount !== 1 ? 's' : ''} avec représentant</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-1">
          {([
            { key: 'clients',  label: `Clients (${billableActive.length}/${clients.length} fact.)` },
            { key: 'modules',  label: `Modules (${modules.filter(m => m.is_active && m.billable_tenants > 0).length}/${modules.length} fact.)` },
            { key: 'vendeurs', label: `Vendeurs (${vendors.length})` },
          ] as const).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition ${tab === t.key ? 'bg-white border border-b-white border-gray-200 -mb-px text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab: Modules */}
      {tab === 'modules' && (
        <div className="space-y-4">
          {/* Info bar */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {modules.filter(m => m.is_active).length} modules actifs · {modules.filter(m => m.monthly_price > 0).length} payants
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {modules.length === 0
                  ? 'Aucun module — clique Sync depuis C-Secur360 pour importer.'
                  : `Dernière sync : ${modules[0]?.synced_at ? new Date(modules[0].synced_at).toLocaleDateString('fr-CA') : '—'}`}
              </p>
            </div>
            {/* Revenu annuel potentiel par module */}
            {modules.some(m => m.monthly_price > 0) && (
              <div className="text-right">
                <p className="text-xs text-gray-400">ARR (clients facturables)</p>
                <p className="text-lg font-black text-orange-600">
                  {fmt(modules.filter(m => m.is_active).reduce((s, m) => s + m.monthly_price * m.billable_tenants, 0))}
                </p>
              </div>
            )}
          </div>

          {modules.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
              <Package size={32} className="mx-auto mb-3 text-gray-300" />
              <p className="text-sm text-gray-400">
                Aucun module synchronisé. Clique <strong>Sync depuis C-Secur360</strong> pour importer le catalogue.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {modules.map(m => {
                const Icon = MODULE_ICONS[m.key] ?? Package
                const colors = MODULE_COLORS[m.key] ?? { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' }
                const annualRevenue = m.monthly_price * m.billable_tenants
                return (
                  <div key={m.key}
                    className={`bg-white border ${colors.border} rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow ${!m.is_active ? 'opacity-50' : ''}`}>
                    {/* Header carte */}
                    <div className="flex items-start justify-between mb-3">
                      <div className={`w-10 h-10 ${colors.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                        <Icon size={20} className={colors.text} />
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${m.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-400'}`}>
                          {m.is_active ? 'Actif' : 'Inactif'}
                        </span>
                        <span className="text-[10px] font-mono text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-200">
                          {m.key}
                        </span>
                      </div>
                    </div>

                    {/* Nom */}
                    <h4 className="font-bold text-gray-900 text-sm leading-tight mb-0.5">{m.name_fr}</h4>
                    <p className="text-xs text-gray-400 mb-4">{m.name_en}</p>

                    {/* Prix */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Prix / an</span>
                        {m.monthly_price > 0 ? (
                          <span className="text-sm font-black text-gray-900">{fmt(m.monthly_price)}</span>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Inclus</span>
                        )}
                      </div>
                    </div>

                    {/* Séparateur */}
                    <div className="border-t border-gray-100 my-3" />

                    {/* Utilisation */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Users size={13} className="text-gray-400" />
                        <span className="text-xs text-gray-600">
                          <span className="font-bold text-emerald-700">{m.billable_tenants}</span>
                          <span className="text-gray-400">/{m.active_tenants}</span>
                          <span className="text-gray-400 ml-0.5">fact.</span>
                        </span>
                      </div>
                      {m.billable_tenants > 0 && m.monthly_price > 0 && (
                        <div className="text-right">
                          <p className="text-[10px] text-gray-400">ARR</p>
                          <p className="text-xs font-bold text-emerald-700">{fmt(annualRevenue)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Tableau récap prix si modules présents */}
          {modules.filter(m => m.monthly_price > 0).length > 0 && (
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden mt-2">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wide">Récapitulatif revenu par module</h4>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Module', 'Prix/an', 'Clients fact. / total', 'ARR fact.'].map(h => (
                      <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {modules.filter(m => m.is_active && m.monthly_price > 0).map(m => (
                    <tr key={m.key} className="hover:bg-gray-50/50">
                      <td className="px-4 py-2.5 font-semibold text-gray-900">{m.name_fr}</td>
                      <td className="px-4 py-2.5 font-bold text-gray-900">{fmt(m.monthly_price)}</td>
                      <td className="px-4 py-2.5">
                        <span className="font-bold text-emerald-700">{m.billable_tenants}</span>
                        <span className="text-xs text-gray-400"> / {m.active_tenants}</span>
                      </td>
                      <td className="px-4 py-2.5 font-bold text-emerald-700">{m.billable_tenants > 0 ? fmt(m.monthly_price * m.billable_tenants) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 border-t border-gray-200">
                    <td colSpan={2} className="px-4 py-2.5 text-xs font-semibold text-gray-600">Total</td>
                    <td className="px-4 py-2.5 font-black text-gray-900">—</td>
                    <td className="px-4 py-2.5 font-black text-emerald-700">
                      {fmt(modules.filter(m => m.is_active && m.monthly_price > 0).reduce((s, m) => s + m.monthly_price * m.billable_tenants, 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab: Clients */}
      {tab === 'clients' && (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-400 text-sm">Chargement…</div>
          ) : clients.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">
              Aucun client. Clique <strong>Sync depuis C-Secur360</strong> pour importer.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Organisation', 'Courriel', 'Mod.', 'Sites', 'Annuel', 'Représentant', 'Commission', 'Facturable', 'Statut', 'Sync'].map(h => (
                      <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {clients.map(c => {
                    const vendor = vendors.find(v => v.id === c.vendor_id)
                    const commAmt = vendor && c.billable ? Math.round(Number(c.annual_revenue) * Number(vendor.commission_rate)) : 0
                    return (
                      <tr key={c.id} className="hover:bg-gray-50/50 transition">
                        <td className="px-3 py-3">
                          <a href={`${CSECUR360_URL}/${c.id}/modules`} target="_blank" rel="noreferrer"
                            className="font-semibold text-gray-900 text-sm hover:text-orange-600 transition block">
                            {c.company_name}
                          </a>
                          <span className="text-gray-400 text-xs">/{c.id}</span>
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-500 max-w-[140px] truncate">{c.admin_email || '—'}</td>
                        <td className="px-3 py-3 text-sm text-center">
                          {c.billable ? (
                            <span className="font-semibold text-emerald-700">{c.modules_count}</span>
                          ) : (
                            <span>
                              <span className="font-semibold text-gray-400">0</span>
                              <span className="text-[10px] text-gray-400">/{c.modules_count}</span>
                            </span>
                          )}
                          <p className="text-[10px] text-gray-400">{c.billable ? 'fact.' : 'non-fact.'}</p>
                        </td>
                        <td className="px-3 py-3 text-sm text-center text-gray-700">{c.sites_count}</td>
                        <td className="px-3 py-3 text-sm font-bold text-gray-900 whitespace-nowrap">
                          {c.billable ? fmt(c.annual_revenue) : (
                            <span className="text-xs font-semibold px-2 py-0.5 bg-gray-100 text-gray-400 rounded">DÉMO</span>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          {vendor ? (
                            <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                              {vendor.name}
                            </span>
                          ) : <span className="text-gray-300 text-xs">—</span>}
                        </td>
                        <td className="px-3 py-3 text-sm whitespace-nowrap">
                          {commAmt > 0 ? (
                            <span className="font-semibold text-indigo-600">{fmt(commAmt)}</span>
                          ) : <span className="text-gray-300 text-xs">—</span>}
                        </td>
                        <td className="px-3 py-3 text-center">
                          {c.billable
                            ? <CheckCircle size={14} className="text-green-500 mx-auto" />
                            : <XCircle size={14} className="text-gray-300 mx-auto" />}
                        </td>
                        <td className="px-3 py-3">{statusBadge(c.status)}</td>
                        <td className="px-3 py-3 text-xs text-gray-400 whitespace-nowrap">
                          {new Date(c.synced_at).toLocaleDateString('fr-CA')}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 border-t border-gray-200">
                    <td colSpan={4} className="px-3 py-3 text-xs font-semibold text-gray-600">
                      Total ({billableActive.length} facturables actifs)
                    </td>
                    <td className="px-3 py-3 text-sm font-black text-gray-900 whitespace-nowrap">{fmt(totalAnnual)}</td>
                    <td colSpan={2} className="px-3 py-3 text-sm font-bold text-indigo-600 whitespace-nowrap">
                      {totalCommission > 0 ? `Comm. ${fmt(totalCommission)}` : ''}
                    </td>
                    <td colSpan={3} className="px-3 py-3 text-sm font-black text-emerald-700 whitespace-nowrap">
                      Net {fmt(netCerdia)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab: Vendeurs */}
      {tab === 'vendeurs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">Commission 20% du revenu annuel par défaut, payable au renouvellement.</p>
            <button onClick={() => setShowVendorForm(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition">
              <Plus size={13} /> Ajouter un vendeur
            </button>
          </div>

          {showVendorForm && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-4">
              <h4 className="text-sm font-semibold text-gray-900">Nouveau représentant commercial</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Nom *', key: 'name', type: 'text', placeholder: 'Jean Tremblay' },
                  { label: 'Courriel', key: 'email', type: 'email', placeholder: 'jean@exemple.com' },
                  { label: 'Téléphone', key: 'phone', type: 'tel', placeholder: '514-555-0123' },
                  { label: 'Commission %', key: 'commission_rate', type: 'number', placeholder: '20' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">{f.label}</label>
                    <input type={f.type} min={f.key === 'commission_rate' ? 0 : undefined}
                      max={f.key === 'commission_rate' ? 100 : undefined}
                      value={(newVendor as any)[f.key]}
                      placeholder={f.placeholder}
                      onChange={e => setNewVendor(v => ({ ...v, [f.key]: f.key === 'commission_rate' ? Number(e.target.value) : e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                  </div>
                ))}
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => { setShowVendorForm(false); setNewVendor(BLANK_VENDOR) }}
                  className="px-4 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100">
                  Annuler
                </button>
                <button onClick={handleCreateVendor} disabled={savingVendor || !newVendor.name.trim()}
                  className="px-4 py-1.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50">
                  {savingVendor ? 'Enregistrement…' : 'Créer'}
                </button>
              </div>
            </div>
          )}

          {vendors.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-400 text-sm">
              Aucun vendeur. Clique <strong>Sync depuis C-Secur360</strong> pour importer, ou crée-en un manuellement.
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Nom', 'Courriel', 'Téléphone', 'Taux', 'Clients', 'Revenu annuel', 'Commission estimée', 'Statut', ''].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {vendors.map(v => {
                    const vClients = billableActive.filter(c => c.vendor_id === v.id)
                    const vRevenue = vClients.reduce((s, c) => s + Number(c.annual_revenue), 0)
                    const vComm = Math.round(vRevenue * Number(v.commission_rate))
                    return (
                      <tr key={v.id} className="hover:bg-gray-50/50">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-gray-900 text-sm">{v.name}</div>
                          {vClients.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {vClients.map(c => (
                                <span key={c.id} className="text-xs bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded border border-indigo-100">
                                  {c.company_name}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">{v.email || '—'}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{v.phone || '—'}</td>
                        <td className="px-4 py-3">
                          <span className="flex items-center gap-1 font-bold text-indigo-600 text-sm">
                            <Percent size={11} />{Math.round(v.commission_rate * 100)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-center">{vClients.length}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900 whitespace-nowrap">
                          {vRevenue > 0 ? fmt(vRevenue) : '—'}
                        </td>
                        <td className="px-4 py-3 text-sm font-bold whitespace-nowrap">
                          {vComm > 0 ? <span className="text-indigo-700">{fmt(vComm)}</span> : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${v.is_active ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-400'}`}>
                            {v.is_active ? 'Actif' : 'Inactif'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {v.is_active && (
                            <button onClick={() => deactivateVendor(v.id, v.name)}
                              className="text-xs text-red-500 border border-red-200 px-2 py-1 rounded hover:bg-red-50 transition">
                              Désactiver
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
