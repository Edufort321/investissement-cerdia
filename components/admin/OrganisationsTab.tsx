'use client'

/**
 * Onglet Multi-Tenant — visible uniquement aux super_admin.
 * Liste les organisations existantes + permet d'en créer en 1 clic.
 *
 * Le SELECT sur organizations passe automatiquement par RLS :
 * super_admin_all_orgs (mig 145) → Eric voit toutes les organisations.
 */

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useOrganization } from '@/contexts/OrganizationContext'
import {
  Plus, Eye, Shield, Building2, Copy, Check, AlertCircle, X, RefreshCw, ExternalLink,
  Pause, Play, Archive, Trash2, MoreVertical, TrendingUp,
} from 'lucide-react'

interface Org {
  id: string
  name: string
  slug: string | null
  logo_url: string | null
  plan: string
  status: string
  is_demo: boolean
  is_billable: boolean
  contact_name: string | null
  contact_email: string | null
  billing_address: string | null
  next_renewal_date: string | null
  last_reminder_sent_at: string | null
  suspended_at: string | null
  created_at: string
}

type PaymentStatus = 'ok' | 'invoice_due' | 'grace' | 'overdue_block'

interface CreateResponse {
  organization: Org
  admin_user_id: string
  magic_link: string | null
  temp_password: string
}

export default function OrganisationsTab({ toast }: { toast: (t: { msg: string; type: 'success' | 'error' }) => void }) {
  const { isSuperAdmin, realOrganization, switchOrg, isViewingAsOther } = useOrganization()
  const [orgs, setOrgs] = useState<Org[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [lastCreated, setLastCreated] = useState<CreateResponse | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null)
  const [revPeriod, setRevPeriod] = useState<'day' | 'month' | 'year'>('year')
  const [editOrg, setEditOrg] = useState<Org | null>(null)
  const [editForm, setEditForm] = useState({
    is_billable: true,
    contact_name: '',
    contact_email: '',
    billing_address: '',
  })
  const [savingEdit, setSavingEdit] = useState(false)

  const getPaymentStatus = (org: Org): PaymentStatus => {
    if (!org.is_billable) return 'ok'
    const days = daysUntilRenewal(org.next_renewal_date)
    if (days === null) return 'ok'
    if (days > 60) return 'ok'
    if (days >= 0) return 'invoice_due'
    if (days >= -30) return 'grace'
    return 'overdue_block'
  }

  const openEditOrg = (org: Org) => {
    setEditForm({
      is_billable: org.is_billable,
      contact_name: org.contact_name ?? '',
      contact_email: org.contact_email ?? '',
      billing_address: org.billing_address ?? '',
    })
    setEditOrg(org)
  }

  const saveOrgProfile = async () => {
    if (!editOrg) return
    setSavingEdit(true)
    const { error } = await supabase
      .from('organizations')
      .update({
        is_billable: editForm.is_billable,
        contact_name: editForm.contact_name.trim() || null,
        contact_email: editForm.contact_email.trim() || null,
        billing_address: editForm.billing_address.trim() || null,
      })
      .eq('id', editOrg.id)
    setSavingEdit(false)
    if (error) { toast({ msg: `Erreur: ${error.message}`, type: 'error' }); return }
    await load()
    setEditOrg(null)
    toast({ msg: 'Profil mis à jour.', type: 'success' })
  }

  const openMenu = (e: React.MouseEvent<HTMLButtonElement>, orgId: string) => {
    if (openMenuId === orgId) { setOpenMenuId(null); setMenuPos(null); return }
    const rect = e.currentTarget.getBoundingClientRect()
    setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
    setOpenMenuId(orgId)
  }
  const closeMenu = () => { setOpenMenuId(null); setMenuPos(null) }

  const [form, setForm] = useState({
    name: '',
    slug: '',
    admin_email: '',
    admin_full_name: '',
    logo_url: '',
    start_date: new Date().toISOString().split('T')[0],
  })

  // ─── Prix annuel SaaS — stocke dans CERDIA Globale settings.saas_pricing.annual_amount_cad ───
  const CERDIA_UUID = 'c0000000-0000-0000-0000-000000000001'
  const [annualPrice, setAnnualPrice] = useState<number>(0)
  const [editingPrice, setEditingPrice] = useState(false)
  const [priceInput, setPriceInput] = useState('')
  const [savingPrice, setSavingPrice] = useState(false)

  const loadPrice = useCallback(async () => {
    const { data } = await supabase
      .from('organizations')
      .select('settings')
      .eq('id', CERDIA_UUID)
      .maybeSingle()
    const p = Number(data?.settings?.saas_pricing?.annual_amount_cad) || 0
    setAnnualPrice(p)
    setPriceInput(p > 0 ? String(p) : '')
  }, [])

  const savePrice = async () => {
    const raw = priceInput.replace(',', '.')
    const newPrice = parseFloat(raw)
    if (isNaN(newPrice) || newPrice < 0) {
      toast({ msg: 'Montant invalide.', type: 'error' })
      return
    }
    setSavingPrice(true)
    // Lit settings actuel pour merger (pas écraser)
    const { data: current } = await supabase
      .from('organizations')
      .select('settings')
      .eq('id', CERDIA_UUID)
      .maybeSingle()
    const merged = {
      ...(current?.settings || {}),
      saas_pricing: { annual_amount_cad: newPrice, currency: 'CAD' },
    }
    const { error } = await supabase
      .from('organizations')
      .update({ settings: merged })
      .eq('id', CERDIA_UUID)
    setSavingPrice(false)
    if (error) {
      toast({ msg: `Erreur: ${error.message}`, type: 'error' })
      return
    }
    setAnnualPrice(newPrice)
    setEditingPrice(false)
    toast({ msg: 'Prix annuel mis à jour.', type: 'success' })
  }

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) console.error('[OrganisationsTab] load failed:', error)
    setOrgs((data || []) as Org[])
    setLoading(false)
  }, [])

  const handleRenew = async (org: Org) => {
    if (!confirm(`Renouveler "${org.name}" pour 1 an ?\n\n(À faire après réception du paiement annuel.)`)) return
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) { toast({ msg: 'Non authentifié.', type: 'error' }); return }
      const res = await fetch(`/api/admin/organizations/${org.id}/renew`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json()
      if (!res.ok) {
        toast({ msg: `Erreur: ${json.error}`, type: 'error' })
        return
      }
      await load()
      toast({
        msg: `${org.name} renouvelé jusqu'au ${json.next_renewal}${json.reactivated ? ' (réactivé)' : ''}.`,
        type: 'success',
      })
    } catch (e: any) {
      toast({ msg: e.message || 'Erreur réseau', type: 'error' })
    }
  }

  const daysUntilRenewal = (dateStr: string | null): number | null => {
    if (!dateStr) return null
    const target = new Date(dateStr)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return Math.floor((target.getTime() - today.getTime()) / 86400000)
  }

  useEffect(() => { load() }, [load])
  useEffect(() => { loadPrice() }, [loadPrice])

  const resetForm = () => {
    setForm({
      name: '', slug: '', admin_email: '', admin_full_name: '',
      logo_url: '', start_date: new Date().toISOString().split('T')[0],
    })
    setLastCreated(null)
  }

  const handleCreate = async () => {
    if (!form.name.trim()) { toast({ msg: 'Nom requis.', type: 'error' }); return }
    if (!form.admin_email.trim()) { toast({ msg: 'Email admin requis.', type: 'error' }); return }
    setCreating(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) {
        toast({ msg: 'Non authentifié.', type: 'error' })
        setCreating(false)
        return
      }
      const payload: any = {
        name: form.name.trim(),
        admin_email: form.admin_email.trim().toLowerCase(),
        annual_amount_cad: annualPrice,
      }
      if (form.slug.trim()) payload.slug = form.slug.trim()
      if (form.admin_full_name.trim()) payload.admin_full_name = form.admin_full_name.trim()
      if (form.logo_url.trim()) payload.logo_url = form.logo_url.trim()
      if (form.start_date) payload.start_date = form.start_date

      const res = await fetch('/api/admin/organizations/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) {
        toast({ msg: `Erreur: ${json.error || res.status}`, type: 'error' })
        setCreating(false)
        return
      }
      setLastCreated(json)
      await load()
      toast({ msg: 'Organisation créée !', type: 'success' })
    } catch (e: any) {
      toast({ msg: e.message || 'Erreur réseau', type: 'error' })
    } finally {
      setCreating(false)
    }
  }

  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(label)
      setTimeout(() => setCopied(null), 2000)
    } catch {
      toast({ msg: 'Impossible de copier.', type: 'error' })
    }
  }

  const updateStatus = async (org: Org, newStatus: 'active' | 'suspended' | 'archived') => {
    const labels: Record<string, string> = {
      active: 'réactiver', suspended: 'suspendre', archived: 'archiver',
    }
    if (!confirm(`Voulez-vous ${labels[newStatus]} "${org.name}" ?`)) return
    const { error } = await supabase
      .from('organizations')
      .update({ status: newStatus })
      .eq('id', org.id)
    if (error) {
      toast({ msg: `Erreur: ${error.message}`, type: 'error' })
      return
    }
    await load()
    toast({ msg: `Organisation ${labels[newStatus]}e.`, type: 'success' })
  }

  const handleDelete = async (org: Org) => {
    if (org.plan === 'internal') {
      toast({ msg: 'Le tenant interne CERDIA ne peut pas être supprimé.', type: 'error' })
      return
    }
    const confirmName = window.prompt(
      `⚠️ SUPPRESSION DÉFINITIVE (cascade)\n\nTape exactement le nom pour confirmer :\n"${org.name}"\n\n` +
      `Le tenant + son user admin seront supprimés. Si l'organisation a des données (propriétés, transactions, etc.), la suppression sera refusée — utilise "Archiver" à la place.`
    )
    if (confirmName !== org.name) {
      if (confirmName !== null) toast({ msg: 'Nom incorrect, suppression annulée.', type: 'error' })
      return
    }

    await doDelete(org, false)
  }

  const doDelete = async (org: Org, force: boolean) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) {
        toast({ msg: 'Non authentifié.', type: 'error' })
        return
      }
      const url = `/api/admin/organizations/${org.id}${force ? '?force=true' : ''}`
      const res = await fetch(url, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json()
      if (!res.ok) {
        if (res.status === 409 && json.tables) {
          // Propose le cascade force
          const tablesList = json.tables.join('\n  - ')
          const confirmCascade = window.confirm(
            `⚠️ "${org.name}" a des données liées :\n\n  - ${tablesList}\n\n` +
            `Veux-tu TOUT supprimer définitivement en cascade ?\n` +
            `(toutes ces données + le tenant + l'utilisateur admin)`
          )
          if (confirmCascade) {
            await doDelete(org, true)
          } else {
            toast({ msg: 'Suppression annulée. Tu peux archiver à la place.', type: 'error' })
          }
        } else {
          toast({ msg: `Erreur: ${json.error || res.status}${json.detail ? ' — ' + json.detail : ''}`, type: 'error' })
        }
        return
      }
      await load()
      const cascadedMsg = json.cascade?.length
        ? ` + ${json.cascade.reduce((s: number, c: any) => s + c.deleted, 0)} rows cascade`
        : ''
      toast({ msg: `${org.name} supprimée (${json.profiles_removed} user${json.profiles_removed !== 1 ? 's' : ''}${cascadedMsg}).`, type: 'success' })
    } catch (e: any) {
      toast({ msg: e.message || 'Erreur réseau', type: 'error' })
    }
  }

  if (!isSuperAdmin) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
        <Shield size={32} className="text-gray-400 mx-auto mb-3" />
        <h3 className="font-bold text-gray-900 dark:text-white mb-2">Accès super_admin requis</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Cet onglet est réservé aux administrateurs CERDIA pour gérer les organisations clients.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Building2 size={22} className="text-purple-600" />
            Organisations
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Gère les tenants SaaS de la plateforme. {orgs.length} organisation{orgs.length > 1 ? 's' : ''}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <RefreshCw size={14} /> Rafraîchir
          </button>
          <button
            onClick={() => { resetForm(); setShowForm(true) }}
            disabled={annualPrice <= 0}
            title={annualPrice <= 0 ? 'Définis d\'abord le prix annuel ci-dessous' : ''}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus size={14} /> Nouvelle organisation
          </button>
        </div>
      </div>

      {/* Dashboard revenus SaaS */}
      {(() => {
        const payingOrgs = orgs.filter(o => o.is_billable && o.status !== 'archived')
        const divisor = revPeriod === 'year' ? 1 : revPeriod === 'month' ? 12 : 365
        const perOrg = annualPrice > 0 ? annualPrice / divisor : 0
        const total = perOrg * payingOrgs.length
        const fmt = (n: number) => n.toLocaleString('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        const periodLabel = revPeriod === 'year' ? 'annuel' : revPeriod === 'month' ? 'mensuel' : 'quotidien'
        return (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <TrendingUp size={18} className="text-emerald-600" />
                Revenus SaaS
              </h3>
              <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                {(['day', 'month', 'year'] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => setRevPeriod(p)}
                    className={`px-3 py-1 text-xs rounded-md transition-colors ${
                      revPeriod === p
                        ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm font-medium'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                    }`}
                  >
                    {p === 'day' ? 'Quotidien' : p === 'month' ? 'Mensuel' : 'Annuel'}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <div className="sm:col-span-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-xl p-4">
                <p className="text-xs text-emerald-700 dark:text-emerald-300 mb-1">
                  Revenu {periodLabel} total
                </p>
                <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-200">
                  {annualPrice > 0 ? `${fmt(total)} CAD` : <span className="text-base font-medium text-amber-600">Prix non défini</span>}
                </p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                  {payingOrgs.length} tenant{payingOrgs.length !== 1 ? 's' : ''} payant{payingOrgs.length !== 1 ? 's' : ''}
                  {annualPrice > 0 && ` × ${fmt(perOrg)} CAD`}
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl p-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">ARR</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {annualPrice > 0 ? `${fmt(annualPrice * payingOrgs.length)} CAD` : '—'}
                </p>
                <p className="text-xs text-gray-400 mt-1">Annual recurring revenue</p>
              </div>
            </div>

            {payingOrgs.length > 0 ? (
              <div className="space-y-1">
                {payingOrgs.map(org => {
                  const days = daysUntilRenewal(org.next_renewal_date)
                  const renewalBadge = days === null ? null
                    : days < 0 ? <span className="text-xs px-1.5 py-0.5 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 rounded">{Math.abs(days)}j retard</span>
                    : days <= 60 ? <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 rounded">dans {days}j</span>
                    : null
                  return (
                    <div key={org.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-semibold text-gray-500 flex-shrink-0">
                          {org.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{org.name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={`text-xs px-1.5 py-0.5 rounded ${
                              org.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' :
                              'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                            }`}>{org.status}</span>
                            {renewalBadge}
                          </div>
                        </div>
                      </div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white flex-shrink-0 ml-3">
                        {annualPrice > 0 ? `${fmt(perOrg)} CAD` : '—'}
                      </p>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-3">Aucun tenant payant actif.</p>
            )}
          </div>
        )
      })()}

      {/* Prix annuel SaaS — éditable par super_admin (stocké dans CERDIA Globale settings) */}
      <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-2xl p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center flex-shrink-0">
              <Building2 size={18} className="text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-purple-900 dark:text-purple-200">Plateforme Multi-Tenant Organisation</p>
              <p className="text-xs text-purple-700 dark:text-purple-300">
                Prix annuel appliqué à chaque nouvelle organisation créée.
              </p>
            </div>
          </div>
          {editingPrice ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                inputMode="decimal"
                className="w-32 px-3 py-2 rounded-xl border border-purple-300 dark:border-purple-600 bg-white dark:bg-gray-700 text-sm font-mono"
                placeholder="0.00"
                value={priceInput}
                onChange={e => setPriceInput(e.target.value.replace(/[^\d.,]/g, ''))}
                autoFocus
              />
              <span className="text-sm text-purple-700 dark:text-purple-300">CAD/an</span>
              <button onClick={savePrice} disabled={savingPrice} className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-medium disabled:opacity-50">
                {savingPrice ? '...' : 'Enregistrer'}
              </button>
              <button onClick={() => { setEditingPrice(false); setPriceInput(annualPrice > 0 ? String(annualPrice) : '') }} className="px-3 py-2 text-sm text-gray-600 dark:text-gray-300">
                Annuler
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold text-purple-900 dark:text-purple-200">
                {annualPrice > 0 ? `${annualPrice.toFixed(2)} CAD/an` : <span className="text-amber-600 text-base font-medium">Non défini</span>}
              </span>
              <button
                onClick={() => setEditingPrice(true)}
                className="px-3 py-1.5 text-xs bg-white dark:bg-gray-700 border border-purple-300 dark:border-purple-600 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/40 transition-colors"
              >
                {annualPrice > 0 ? 'Modifier' : 'Définir'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Alertes paiement */}
      {(() => {
        const invoiceDue = orgs.filter(o => getPaymentStatus(o) === 'invoice_due')
        const grace = orgs.filter(o => getPaymentStatus(o) === 'grace')
        const overdue = orgs.filter(o => getPaymentStatus(o) === 'overdue_block')
        if (invoiceDue.length === 0 && grace.length === 0 && overdue.length === 0) return null
        return (
          <div className="space-y-2">
            {invoiceDue.length > 0 && (
              <div className="flex items-start gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl">
                <AlertCircle size={16} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-amber-800 dark:text-amber-200">
                  <span className="font-semibold">Facture à envoyer dans les 60 prochains jours :</span>{' '}
                  {invoiceDue.map(o => {
                    const d = daysUntilRenewal(o.next_renewal_date)
                    return `${o.name} (dans ${d}j)`
                  }).join(' · ')}
                </div>
              </div>
            )}
            {grace.length > 0 && (
              <div className="flex items-start gap-3 px-4 py-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-xl">
                <AlertCircle size={16} className="text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-orange-800 dark:text-orange-200">
                  <span className="font-semibold">Paiement en attente (période de grâce) :</span>{' '}
                  {grace.map(o => {
                    const d = daysUntilRenewal(o.next_renewal_date)
                    return `${o.name} (${Math.abs(d!)}j retard)`
                  }).join(' · ')}
                </div>
              </div>
            )}
            {overdue.length > 0 && (
              <div className="flex items-start gap-3 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl">
                <AlertCircle size={16} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 text-xs text-red-800 dark:text-red-200">
                  <span className="font-semibold">Suspension recommandée — retard de plus de 30 jours :</span>{' '}
                  {overdue.map(o => {
                    const d = daysUntilRenewal(o.next_renewal_date)
                    return `${o.name} (${Math.abs(d!)}j retard)`
                  }).join(' · ')}
                  {overdue.some(o => o.status === 'active') && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {overdue.filter(o => o.status === 'active').map(o => (
                        <button
                          key={o.id}
                          onClick={() => updateStatus(o, 'suspended')}
                          className="px-2 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                        >
                          Bloquer {o.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )
      })()}

      {/* Liste */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-500">Chargement…</div>
        ) : orgs.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">Aucune organisation.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700/50 text-xs uppercase text-gray-500 dark:text-gray-400">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Organisation</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Plan</th>
                <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Status</th>
                <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Prochain renouvellement</th>
                <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Créée le</th>
                <th className="text-right px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {orgs.map(org => {
                const isReal = realOrganization?.id === org.id
                return (
                  <tr key={org.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {org.logo_url ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={org.logo_url} alt={org.name} className="w-8 h-8 rounded-lg object-cover bg-white flex-shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-semibold text-gray-500 flex-shrink-0">
                            {org.name.charAt(0)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white truncate flex items-center gap-1.5">
                            {org.name}
                            {isReal && <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">Vous</span>}
                            {org.is_demo && <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">DEMO</span>}
                          </p>
                          {org.slug && <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{org.slug}</p>}
                          {org.is_demo && (() => {
                            const demoUrl = typeof window !== 'undefined'
                              ? `${window.location.origin}/demo`
                              : 'https://www.cerdia.ai/demo'
                            return (
                              <div className="flex items-center gap-1.5 mt-1.5">
                                <a
                                  href={demoUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline truncate font-mono"
                                  title="Ouvrir la démo dans un nouvel onglet"
                                >
                                  {demoUrl.replace(/^https?:\/\//, '')}
                                </a>
                                <button
                                  type="button"
                                  onClick={() => handleCopy(demoUrl, `demo-url-${org.id}`)}
                                  className="text-xs px-1.5 py-0.5 bg-blue-100 hover:bg-blue-200 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded inline-flex items-center gap-1"
                                  title="Copier le lien à partager"
                                >
                                  {copied === `demo-url-${org.id}` ? <><Check size={10} /> Copié</> : <><Copy size={10} /> Copier</>}
                                </button>
                              </div>
                            )
                          })()}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded capitalize">{org.plan}</span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className={`text-xs px-2 py-1 rounded ${
                        org.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' :
                        org.status === 'suspended' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                        'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                      }`}>
                        {org.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs hidden lg:table-cell">
                      {(() => {
                        if (!org.is_billable) return <span className="text-gray-400">Non facturable</span>
                        if (!org.next_renewal_date) return <span className="text-gray-400">Non défini</span>
                        const days = daysUntilRenewal(org.next_renewal_date)
                        const ps = getPaymentStatus(org)
                        const dateStr = new Date(org.next_renewal_date).toLocaleDateString('fr-CA')
                        return (
                          <div className="space-y-1">
                            <span className="text-gray-700 dark:text-gray-300">{dateStr}</span>
                            {ps === 'ok' && days !== null && (
                              <div><span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 rounded text-xs">dans {days}j</span></div>
                            )}
                            {ps === 'invoice_due' && (
                              <div><span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 rounded text-xs">Envoyer facture — {days}j</span></div>
                            )}
                            {ps === 'grace' && (
                              <div><span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 rounded text-xs">En attente — {Math.abs(days!)}j retard</span></div>
                            )}
                            {ps === 'overdue_block' && (
                              <div className="flex items-center gap-1.5">
                                <span className="px-1.5 py-0.5 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 rounded text-xs font-semibold">{Math.abs(days!)}j retard</span>
                                {org.status === 'active' && (
                                  <button
                                    onClick={() => updateStatus(org, 'suspended')}
                                    className="px-1.5 py-0.5 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition-colors"
                                  >
                                    Bloquer
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })()}
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">
                      {new Date(org.created_at).toLocaleDateString('fr-CA')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={(e) => openMenu(e, org.id)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        title="Actions"
                      >
                        <MoreVertical size={16} className="text-gray-500" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Dropdown actions — rendu en fixed pour échapper au overflow-hidden de la table */}
      {openMenuId && menuPos && (() => {
        const org = orgs.find(o => o.id === openMenuId)
        if (!org) return null
        const isReal = realOrganization?.id === org.id
        return (
          <>
            <div className="fixed inset-0 z-40" onClick={closeMenu} />
            <div
              className="fixed z-50 w-44 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg py-1 text-left"
              style={{ top: menuPos.top, right: menuPos.right }}
            >
              <button
                onClick={() => { closeMenu(); openEditOrg(org) }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
              >
                <Building2 size={12} /> Modifier profil
              </button>
              <div className="border-t border-gray-100 dark:border-gray-700 my-1" />
              <button
                onClick={() => { closeMenu(); handleRenew(org) }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <RefreshCw size={12} /> Renouveler
              </button>
              {!isReal && (
                <button
                  onClick={() => { closeMenu(); switchOrg(org.id) }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                >
                  <Eye size={12} /> Voir
                </button>
              )}
              {org.status === 'active' && (
                <button
                  onClick={() => { closeMenu(); updateStatus(org, 'suspended') }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-orange-700 dark:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
                >
                  <Pause size={12} /> Suspendre
                </button>
              )}
              {org.status === 'suspended' && (
                <button
                  onClick={() => { closeMenu(); updateStatus(org, 'active') }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                >
                  <Play size={12} /> Réactiver
                </button>
              )}
              {org.status !== 'archived' && (
                <button
                  onClick={() => { closeMenu(); updateStatus(org, 'archived') }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <Archive size={12} /> Archiver
                </button>
              )}
              {org.plan !== 'internal' && (
                <>
                  <div className="border-t border-gray-100 dark:border-gray-700 my-1" />
                  <button
                    onClick={() => { closeMenu(); handleDelete(org) }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <Trash2 size={12} /> Supprimer
                  </button>
                </>
              )}
            </div>
          </>
        )
      })()}

      {/* Modal — modifier profil org */}
      {editOrg && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center p-4 overflow-y-auto" onClick={() => !savingEdit && setEditOrg(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 my-8 w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Building2 size={16} className="text-purple-600" />
                Profil — {editOrg.name}
              </h3>
              <button onClick={() => setEditOrg(null)} disabled={savingEdit} className="text-gray-400 hover:text-gray-700">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Infos client */}
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Contact de facturation</p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nom du contact</label>
                    <input
                      type="text"
                      value={editForm.contact_name}
                      onChange={e => setEditForm(f => ({ ...f, contact_name: e.target.value }))}
                      placeholder="Jean Tremblay"
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email de facturation</label>
                    <input
                      type="email"
                      value={editForm.contact_email}
                      onChange={e => setEditForm(f => ({ ...f, contact_email: e.target.value }))}
                      placeholder="facturation@client.com"
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Adresse de facturation</label>
                    <textarea
                      value={editForm.billing_address}
                      onChange={e => setEditForm(f => ({ ...f, billing_address: e.target.value }))}
                      placeholder={'123 rue Principale\nMontréal, QC H2X 1Y5\nCanada'}
                      rows={3}
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm resize-none"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Facturation SaaS</p>
                <label className="flex items-start gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={editForm.is_billable}
                    onChange={e => setEditForm(f => ({ ...f, is_billable: e.target.checked }))}
                    className="mt-0.5 w-4 h-4 accent-purple-600"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Facturable</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Inclure dans le calcul ARR et le dashboard revenus. Désactiver pour les démos, comptes internes, ou périodes d'essai.
                    </p>
                  </div>
                </label>
                {!editForm.is_billable && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 px-1">
                    Ce tenant ne sera plus comptabilisé dans l'ARR.
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-gray-100 dark:border-gray-700">
              <button onClick={() => setEditOrg(null)} disabled={savingEdit} className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300">
                Annuler
              </button>
              <button onClick={saveOrgProfile} disabled={savingEdit} className="px-4 py-2 text-sm bg-purple-600 text-white rounded-xl disabled:opacity-50 flex items-center gap-2">
                {savingEdit ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                {savingEdit ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal — création */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center p-4 overflow-y-auto" onClick={() => !creating && setShowForm(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 my-8 w-full max-w-2xl" onClick={e => e.stopPropagation()}>
            {lastCreated ? (
              // Mode "résultat" : montre le magic link + mot de passe
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                    <Check size={18} /> Organisation créée
                  </h3>
                  <button onClick={() => { setLastCreated(null); setShowForm(false) }} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
                </div>
                <div className="space-y-4 text-sm">
                  <div>
                    <p className="text-gray-600 dark:text-gray-400 mb-1">Organisation :</p>
                    <p className="font-semibold">{lastCreated.organization.name}</p>
                  </div>
                  <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl">
                    <p className="font-semibold text-amber-900 dark:text-amber-200 mb-2 flex items-center gap-1">
                      <AlertCircle size={14} /> Partage ces infos au client (à ne montrer qu'une fois)
                    </p>
                    {lastCreated.magic_link && (
                      <div className="mb-3">
                        <label className="text-xs text-gray-600 dark:text-gray-400">Magic link (recommandé)</label>
                        <div className="flex items-center gap-2 mt-1">
                          <input type="text" readOnly value={lastCreated.magic_link} className="flex-1 px-2 py-1.5 text-xs bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg font-mono" />
                          <button onClick={() => handleCopy(lastCreated.magic_link!, 'link')} className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs flex items-center gap-1">
                            {copied === 'link' ? <><Check size={12} /> Copié</> : <><Copy size={12} /> Copier</>}
                          </button>
                        </div>
                      </div>
                    )}
                    <div>
                      <label className="text-xs text-gray-600 dark:text-gray-400">Mot de passe temporaire (alternatif)</label>
                      <div className="flex items-center gap-2 mt-1">
                        <input type="text" readOnly value={lastCreated.temp_password} className="flex-1 px-2 py-1.5 text-xs bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg font-mono" />
                        <button onClick={() => handleCopy(lastCreated.temp_password, 'pwd')} className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs flex items-center gap-1">
                          {copied === 'pwd' ? <><Check size={12} /> Copié</> : <><Copy size={12} /> Copier</>}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
                    <button onClick={() => { setLastCreated(null); resetForm() }} className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl">Créer une autre</button>
                    <button onClick={() => { setLastCreated(null); setShowForm(false) }} className="px-4 py-2 text-sm bg-purple-600 text-white rounded-xl">Terminé</button>
                  </div>
                </div>
              </>
            ) : (
              // Mode "formulaire"
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">Nouvelle organisation</h3>
                  <button onClick={() => setShowForm(false)} disabled={creating} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nom de l'organisation *</label>
                    <input type="text" className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm" placeholder="ACME Holdings inc." value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Slug (URL-friendly)</label>
                    <input type="text" className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm" placeholder="acme (auto si vide)" value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date de début</label>
                    <input type="date" className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email admin *</label>
                    <input type="email" className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm" placeholder="boss@acme.com" value={form.admin_email} onChange={e => setForm(f => ({ ...f, admin_email: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nom de l'admin</label>
                    <input type="text" className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm" placeholder="Jean Tremblay" value={form.admin_full_name} onChange={e => setForm(f => ({ ...f, admin_full_name: e.target.value }))} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Logo URL (optionnel — fallback CERDIA si vide)</label>
                    <input type="text" className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm" placeholder="https://..." value={form.logo_url} onChange={e => setForm(f => ({ ...f, logo_url: e.target.value }))} />
                  </div>
                  <div className="sm:col-span-2 p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-xl">
                    <p className="text-xs text-purple-900 dark:text-purple-200">
                      <strong>Prix annuel appliqué :</strong> {annualPrice > 0 ? `${annualPrice.toFixed(2)} CAD/an` : 'NON DÉFINI'}
                      {annualPrice <= 0 && <span className="text-amber-700 dark:text-amber-300"> ⚠️ Définis-le d'abord ci-dessus dans le header.</span>}
                    </p>
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-gray-100 dark:border-gray-700">
                  <button onClick={() => setShowForm(false)} disabled={creating} className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl">Annuler</button>
                  <button onClick={handleCreate} disabled={creating} className="px-4 py-2 text-sm bg-purple-600 text-white rounded-xl disabled:opacity-50 flex items-center gap-2">
                    {creating ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
                    {creating ? 'Création…' : 'Créer en 1 clic'}
                  </button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 flex items-start gap-2">
                  <ExternalLink size={12} className="mt-0.5 flex-shrink-0" />
                  <span>La facturation annuelle automatique (rappel 60j + suspension 30j après échéance) sera ajoutée en Phase 3.3. Pour l'instant, le montant et la date sont stockés dans <code className="font-mono text-xs bg-gray-100 dark:bg-gray-700 px-1 rounded">organizations.settings.billing</code>.</span>
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
