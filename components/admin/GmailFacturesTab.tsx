'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Mail, ExternalLink, RefreshCw, Search, Filter,
  FileText, Receipt, AlertTriangle, CheckCircle, XCircle, Minus,
  Building2, TrendingUp, DollarSign,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────
interface GmailInvoice {
  id: string
  message_id: string
  gmail_link: string | null
  category: 'FACTURE' | 'RECU_PAIEMENT' | 'DOC_PROJET' | 'A_REVISER'
  classification_confidence: number | null
  vendor_name: string | null
  document_date: string | null
  document_number: string | null
  amount: number | null
  currency: string | null
  payment_method: string | null
  is_paid: boolean | null
  extraction_confidence: number | null
  cerdia_company: string | null
  file_path: string | null
  classified_at: string
}

type CategoryFilter = 'all' | 'FACTURE' | 'RECU_PAIEMENT' | 'non_assigne'

const COMPANIES = ['CERDIA Globale', 'CERDIA S.E.C.', 'Commerce CERDIA']

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number | null) {
  if (n == null) return '—'
  return new Intl.NumberFormat('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
}

function confBadge(v: number | null) {
  const pct = Math.round((v ?? 0) * 100)
  const cls = pct >= 80
    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
    : pct >= 65
    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
    : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
  return <span className={`px-1.5 py-0.5 rounded text-xs font-mono font-semibold ${cls}`}>{pct}%</span>
}

function catBadge(cat: string) {
  const map: Record<string, { label: string; cls: string; icon: React.ElementType }> = {
    FACTURE:       { label: 'Facture',  cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',       icon: FileText },
    RECU_PAIEMENT: { label: 'Reçu',    cls: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400', icon: Receipt },
    DOC_PROJET:    { label: 'Document', cls: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',            icon: FileText },
    A_REVISER:     { label: 'À réviser', cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400', icon: AlertTriangle },
  }
  const { label, cls, icon: Icon } = map[cat] ?? { label: cat, cls: 'bg-gray-100 text-gray-600', icon: FileText }
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      <Icon size={11} /> {label}
    </span>
  )
}

function paidBadge(v: boolean | null) {
  if (v === true)  return <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400"><CheckCircle size={13} /> Oui</span>
  if (v === false) return <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 dark:text-red-400"><XCircle size={13} /> Non</span>
  return <span className="inline-flex items-center gap-1 text-xs text-gray-400"><Minus size={13} /> —</span>
}

// ─── Component ────────────────────────────────────────────────────────────────
interface Props {
  /** Companies to display (shows their invoices + unassigned). */
  filterCompanies: string[]
  /** Label shown in the section header */
  title?: string
}

export default function GmailFacturesTab({ filterCompanies, title = 'Factures Gmail' }: Props) {
  const [invoices, setInvoices] = useState<GmailInvoice[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState<CategoryFilter>('all')
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const companyList = filterCompanies.map(c => `"${c}"`).join(',')
      const { data, error: err } = await supabase
        .from('gmail_invoices')
        .select('*')
        .or(`cerdia_company.in.(${companyList}),cerdia_company.is.null`)
        .order('document_date', { ascending: false })

      if (err) throw err
      setInvoices(data ?? [])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [filterCompanies])

  useEffect(() => { load() }, [load])

  // Assign company and save to Supabase
  const assignCompany = async (id: string, company: string) => {
    setSaving(id)
    const { error: err } = await supabase
      .from('gmail_invoices')
      .update({ cerdia_company: company || null, synced_at: new Date().toISOString() })
      .eq('id', id)
    setSaving(null)
    if (err) { setError(err.message); return }
    setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, cerdia_company: company || null } : inv))
  }

  // ── Filtered list ─────────────────────────────────────────────────────────
  const filtered = invoices.filter(inv => {
    const q = search.toLowerCase()
    const matchSearch = !q ||
      (inv.vendor_name ?? '').toLowerCase().includes(q) ||
      (inv.document_number ?? '').toLowerCase().includes(q)
    const matchCat =
      catFilter === 'all' ? true
      : catFilter === 'non_assigne' ? !inv.cerdia_company
      : inv.category === catFilter
    return matchSearch && matchCat
  })

  // ── Stats ─────────────────────────────────────────────────────────────────
  const financial = invoices.filter(i => i.category === 'FACTURE' || i.category === 'RECU_PAIEMENT')
  const totalCAD  = financial.filter(i => (i.currency ?? 'CAD') === 'CAD').reduce((s, i) => s + (i.amount ?? 0), 0)
  const totalUSD  = financial.filter(i => i.currency === 'USD').reduce((s, i) => s + (i.amount ?? 0), 0)
  const unassigned = invoices.filter(i => !i.cerdia_company && (i.category === 'FACTURE' || i.category === 'RECU_PAIEMENT')).length
  const factures  = invoices.filter(i => i.category === 'FACTURE').length
  const recus     = invoices.filter(i => i.category === 'RECU_PAIEMENT').length

  const statCards = [
    { label: 'Factures',  value: factures,       icon: FileText,     color: 'text-blue-600 dark:text-blue-400',   bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { label: 'Reçus',     value: recus,           icon: Receipt,      color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-900/20' },
    { label: 'Total CAD', value: `${fmt(totalCAD)} $`, icon: DollarSign, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
    { label: 'Total USD', value: `${fmt(totalUSD)} $`, icon: TrendingUp, color: 'text-amber-600 dark:text-amber-400',   bg: 'bg-amber-50 dark:bg-amber-900/20' },
    { label: 'À assigner', value: unassigned,     icon: AlertTriangle, color: unassigned > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-gray-500', bg: unassigned > 0 ? 'bg-orange-50 dark:bg-orange-900/20' : 'bg-gray-50 dark:bg-gray-800' },
  ]

  const catTabs: { key: CategoryFilter; label: string }[] = [
    { key: 'all',          label: `Tous (${invoices.length})` },
    { key: 'FACTURE',      label: `Factures (${factures})` },
    { key: 'RECU_PAIEMENT', label: `Reçus (${recus})` },
    { key: 'non_assigne',  label: `À assigner (${unassigned})` },
  ]

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Mail size={20} className="text-blue-500" />
            {title}
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Factures et reçus classifiés automatiquement depuis Gmail · {filterCompanies.join(' / ')}
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Actualiser
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 text-sm flex items-center gap-2">
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {statCards.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className={`${bg} rounded-xl p-3 flex flex-col gap-1`}>
            <div className={`flex items-center gap-1.5 ${color}`}>
              <Icon size={14} />
              <span className="text-xs font-medium">{label}</span>
            </div>
            <div className="text-base font-bold text-gray-900 dark:text-gray-100 truncate">{value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
        {/* Category tabs */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
          {catTabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setCatFilter(key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                catFilter === key
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher fournisseur…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-16 text-center text-gray-400 flex flex-col items-center gap-2">
            <RefreshCw size={24} className="animate-spin" />
            <span className="text-sm">Chargement…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <Filter size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">Aucun document trouvé</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Fournisseur</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Catégorie</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">Montant</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Payé?</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">Conf.</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 min-w-[180px]">
                    <span className="flex items-center gap-1"><Building2 size={12} /> Compagnie CERDIA</span>
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">Gmail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {filtered.map((inv, idx) => (
                  <tr
                    key={inv.id}
                    className={`transition-colors hover:bg-blue-50/30 dark:hover:bg-blue-900/10 ${
                      idx % 2 === 0 ? '' : 'bg-gray-50/50 dark:bg-gray-700/20'
                    } ${!inv.cerdia_company && (inv.category === 'FACTURE' || inv.category === 'RECU_PAIEMENT')
                        ? 'border-l-2 border-l-orange-400' : ''
                    }`}
                  >
                    {/* Date */}
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-gray-400 font-mono text-xs">
                      {inv.document_date ?? '—'}
                    </td>

                    {/* Fournisseur */}
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 dark:text-gray-100 truncate max-w-[200px]">
                        {inv.vendor_name ?? '—'}
                      </div>
                      {inv.document_number && (
                        <div className="text-xs text-gray-400 font-mono">{inv.document_number}</div>
                      )}
                    </td>

                    {/* Catégorie */}
                    <td className="px-4 py-3 whitespace-nowrap">{catBadge(inv.category)}</td>

                    {/* Montant */}
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {inv.amount != null ? (
                        <span className="font-semibold text-gray-900 dark:text-gray-100">
                          {fmt(inv.amount)}{' '}
                          <span className="text-xs text-gray-400">{inv.currency ?? 'CAD'}</span>
                        </span>
                      ) : '—'}
                    </td>

                    {/* Payé? */}
                    <td className="px-4 py-3 text-center">{paidBadge(inv.is_paid)}</td>

                    {/* Confiance */}
                    <td className="px-4 py-3 text-center">
                      {confBadge(inv.classification_confidence)}
                    </td>

                    {/* Compagnie CERDIA dropdown */}
                    <td className="px-4 py-3">
                      <div className="relative">
                        <select
                          value={inv.cerdia_company ?? ''}
                          onChange={e => assignCompany(inv.id, e.target.value)}
                          disabled={saving === inv.id}
                          className={`w-full text-xs px-2 py-1.5 rounded-lg border transition-colors outline-none focus:ring-2 focus:ring-blue-500 ${
                            inv.cerdia_company
                              ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300'
                              : 'border-orange-300 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400'
                          } ${saving === inv.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <option value="">— À assigner —</option>
                          {COMPANIES.map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                        {saving === inv.id && (
                          <div className="absolute right-2 top-1/2 -translate-y-1/2">
                            <RefreshCw size={10} className="animate-spin text-blue-500" />
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Gmail link */}
                    <td className="px-4 py-3 text-center">
                      {inv.gmail_link ? (
                        <a
                          href={inv.gmail_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                          title="Ouvrir dans Gmail"
                        >
                          <ExternalLink size={13} />
                        </a>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {filtered.length > 0 && (
        <p className="text-xs text-gray-400 text-right">{filtered.length} document{filtered.length > 1 ? 's' : ''} affiché{filtered.length > 1 ? 's' : ''}</p>
      )}
    </div>
  )
}
