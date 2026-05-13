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
  Pause, Play, Archive, Trash2, MoreVertical,
} from 'lucide-react'

interface Org {
  id: string
  name: string
  slug: string | null
  logo_url: string | null
  plan: string
  status: string
  is_demo: boolean
  created_at: string
}

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

  const [form, setForm] = useState({
    name: '',
    slug: '',
    admin_email: '',
    admin_full_name: '',
    plan: 'basic',
    logo_url: '',
    annual_amount_cad: '',
    start_date: new Date().toISOString().split('T')[0],
  })

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('organizations')
      .select('id, name, slug, logo_url, plan, status, is_demo, created_at')
      .order('created_at', { ascending: false })
    if (error) console.error('[OrganisationsTab] load failed:', error)
    setOrgs((data || []) as Org[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const resetForm = () => {
    setForm({
      name: '', slug: '', admin_email: '', admin_full_name: '',
      plan: 'basic', logo_url: '', annual_amount_cad: '',
      start_date: new Date().toISOString().split('T')[0],
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
        plan: form.plan,
      }
      if (form.slug.trim()) payload.slug = form.slug.trim()
      if (form.admin_full_name.trim()) payload.admin_full_name = form.admin_full_name.trim()
      if (form.logo_url.trim()) payload.logo_url = form.logo_url.trim()
      if (form.annual_amount_cad) payload.annual_amount_cad = parseFloat(form.annual_amount_cad.replace(',', '.')) || 0
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
    if (org.plan === 'internal') {
      toast({ msg: 'Le tenant interne CERDIA ne peut pas changer de statut.', type: 'error' })
      return
    }
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
      `⚠️ SUPPRESSION DÉFINITIVE\n\nTape exactement le nom de l'organisation pour confirmer :\n"${org.name}"\n\n` +
      `Note : la suppression peut échouer si l'organisation a des données liées (propriétés, transactions, etc.). Dans ce cas, utilise "Archiver" à la place.`
    )
    if (confirmName !== org.name) {
      if (confirmName !== null) toast({ msg: 'Nom incorrect, suppression annulée.', type: 'error' })
      return
    }
    const { error } = await supabase.from('organizations').delete().eq('id', org.id)
    if (error) {
      const isFK = error.message?.includes('foreign key') || error.code === '23503'
      toast({
        msg: isFK
          ? "Suppression impossible : l'organisation a des données liées. Archive-la plutôt."
          : `Erreur: ${error.message}`,
        type: 'error',
      })
      return
    }
    await load()
    toast({ msg: 'Organisation supprimée définitivement.', type: 'success' })
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
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 transition-colors"
          >
            <Plus size={14} /> Nouvelle organisation
          </button>
        </div>
      </div>

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
                    <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">
                      {new Date(org.created_at).toLocaleDateString('fr-CA')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        {!isReal && (
                          <button
                            onClick={() => switchOrg(org.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors"
                            title="Voir comme cette organisation (mode support)"
                          >
                            <Eye size={12} /> Voir
                          </button>
                        )}
                        {org.plan !== 'internal' && org.status === 'active' && (
                          <button
                            onClick={() => updateStatus(org, 'suspended')}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-orange-100 hover:bg-orange-200 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 rounded-lg transition-colors"
                            title="Suspendre l'accès"
                          >
                            <Pause size={12} /> Suspendre
                          </button>
                        )}
                        {org.plan !== 'internal' && org.status === 'suspended' && (
                          <button
                            onClick={() => updateStatus(org, 'active')}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-emerald-100 hover:bg-emerald-200 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 rounded-lg transition-colors"
                            title="Réactiver"
                          >
                            <Play size={12} /> Réactiver
                          </button>
                        )}
                        {org.plan !== 'internal' && org.status !== 'archived' && (
                          <button
                            onClick={() => updateStatus(org, 'archived')}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded-lg transition-colors"
                            title="Archiver"
                          >
                            <Archive size={12} /> Archiver
                          </button>
                        )}
                        {org.plan !== 'internal' && (
                          <button
                            onClick={() => handleDelete(org)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/30 dark:text-red-300 rounded-lg transition-colors"
                            title="Supprimer définitivement"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

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
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Plan</label>
                    <select className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm" value={form.plan} onChange={e => setForm(f => ({ ...f, plan: e.target.value }))}>
                      <option value="basic">basic</option>
                      <option value="pro">pro</option>
                      <option value="enterprise">enterprise</option>
                      <option value="demo">demo</option>
                    </select>
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Montant annuel CAD</label>
                    <input type="text" inputMode="decimal" className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm" placeholder="1200.00" value={form.annual_amount_cad} onChange={e => setForm(f => ({ ...f, annual_amount_cad: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date de début</label>
                    <input type="date" className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
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
