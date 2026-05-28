'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Shield, Users, TrendingUp, DollarSign, RefreshCw, ExternalLink,
  CheckCircle, XCircle, Clock, Building2, UserCheck, Plus, Percent,
  BadgeCheck, AlertTriangle, ArrowDownToLine,
} from 'lucide-react'

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

const SYNC_SECRET = process.env.NEXT_PUBLIC_CSECUR360_SYNC_SECRET || 'csecur360-cerdia-bridge'
const CSECUR360_URL = process.env.NEXT_PUBLIC_CSECUR360_URL || 'http://localhost:3000'
const authHeader = { Authorization: `Bearer ${SYNC_SECRET}` }

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

export default function CSecur360Tab() {
  const [tab, setTab] = useState<'clients' | 'vendeurs'>('clients')
  const [clients, setClients] = useState<CSClient[]>([])
  const [vendors, setVendors] = useState<CSVendor[]>([])
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
      const [cRes, vRes] = await Promise.all([
        fetch('/api/commerce/csecur360', { headers: authHeader }),
        fetch('/api/commerce/csecur360/vendors', { headers: authHeader }),
      ])
      if (!cRes.ok) throw new Error(`clients HTTP ${cRes.status}`)
      const cData = await cRes.json()
      setClients(cData.clients || [])
      if (vRes.ok) {
        const vData = await vRes.json()
        setVendors(vData.vendors || [])
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
        headers: authHeader,
      })
      const d = await res.json()
      if (d.ok) {
        setSyncMsg(`✓ ${d.clientsSynced} clients · ${d.vendorsSynced} vendeurs synchronisés`)
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
        headers: { 'Content-Type': 'application/json', ...authHeader },
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
    await fetch(`/api/commerce/csecur360/vendors?id=${id}`, { method: 'DELETE', headers: authHeader })
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
        {[
          { icon: Users,       label: 'Clients actifs',    value: String(activeClients.length),  color: 'text-blue-600',   bg: 'bg-blue-50' },
          { icon: Building2,   label: 'Total clients',     value: String(clients.length),         color: 'text-purple-600', bg: 'bg-purple-50' },
          { icon: DollarSign,  label: 'Revenu mensuel',    value: fmt(totalMonthly),              color: 'text-orange-600', bg: 'bg-orange-50' },
          { icon: TrendingUp,  label: 'Revenu annuel',     value: fmt(totalAnnual),               color: 'text-green-600',  bg: 'bg-green-50' },
          { icon: BadgeCheck,  label: 'Net CERDIA',        value: fmt(netCerdia),                 color: 'text-emerald-700',bg: 'bg-emerald-50' },
          { icon: UserCheck,   label: 'Commissions vend.', value: fmt(totalCommission),           color: 'text-indigo-600', bg: 'bg-indigo-50' },
        ].map((k, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-xl p-4">
            <div className={`w-8 h-8 ${k.bg} rounded-lg flex items-center justify-center mb-2`}>
              <k.icon size={15} className={k.color} />
            </div>
            <p className="text-base font-black text-gray-900 leading-tight">{k.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{k.label}</p>
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
          {(['clients', 'vendeurs'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition ${tab === t ? 'bg-white border border-b-white border-gray-200 -mb-px text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
              {t === 'clients' ? `Clients (${clients.length})` : `Vendeurs (${vendors.length})`}
            </button>
          ))}
        </div>
      </div>

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
                        <td className="px-3 py-3 text-sm text-center text-gray-700">{c.modules_count}</td>
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
