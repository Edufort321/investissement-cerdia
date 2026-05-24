'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useOrganization } from '@/contexts/OrganizationContext'
import { Plus, X, Edit2, Check, AlertCircle } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

interface Liability {
  id: string
  property_id: string | null
  description: string
  lender: string | null
  principal_amount: number
  currency: 'CAD' | 'USD'
  interest_rate: number | null
  start_date: string | null
  end_date: string | null
  status: 'active' | 'paid_off' | 'refinanced'
  notes: string | null
  created_at: string
}

interface Property {
  id: string
  name: string
}

interface LiabilitiesManagerProps {
  exchangeRate?: number
  onTotalChange?: (totalCAD: number) => void
}

const STATUS_LABELS_FR: Record<string, string> = {
  active: 'Actif',
  paid_off: 'Remboursé',
  refinanced: 'Refinancé',
}

const STATUS_LABELS_EN: Record<string, string> = {
  active: 'Active',
  paid_off: 'Paid off',
  refinanced: 'Refinanced',
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-red-100 text-red-700',
  paid_off: 'bg-green-100 text-green-700',
  refinanced: 'bg-blue-100 text-blue-700',
}

const EMPTY_FORM = {
  property_id: '',
  description: '',
  lender: '',
  principal_amount: '',
  currency: 'CAD' as 'CAD' | 'USD',
  interest_rate: '',
  start_date: '',
  end_date: '',
  status: 'active' as 'active' | 'paid_off' | 'refinanced',
  notes: '',
}

export default function LiabilitiesManager({ exchangeRate = 1.40, onTotalChange }: LiabilitiesManagerProps) {
  const { organization } = useOrganization()
  const orgId = organization?.id ?? null
  const { language } = useLanguage()
  const fr = language === 'fr'
  const locale = fr ? 'fr-CA' : 'en-CA'
  const STATUS_LABELS = fr ? STATUS_LABELS_FR : STATUS_LABELS_EN

  const [liabilities, setLiabilities] = useState<Liability[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (orgId) loadData()
  }, [orgId])

  async function loadData() {
    const [{ data: liabData }, { data: propData }] = await Promise.all([
      supabase.from('liabilities').select('*').eq('organization_id', orgId!).order('created_at', { ascending: false }),
      supabase.from('properties').select('id, name').eq('organization_id', orgId!).order('name'),
    ])
    setLiabilities(liabData || [])
    setProperties(propData || [])

    const totalCAD = (liabData || [])
      .filter(l => l.status === 'active')
      .reduce((sum, l) => sum + (l.currency === 'USD' ? l.principal_amount * exchangeRate : l.principal_amount), 0)
    onTotalChange?.(totalCAD)
  }

  function startEdit(l: Liability) {
    setEditId(l.id)
    setForm({
      property_id: l.property_id || '',
      description: l.description,
      lender: l.lender || '',
      principal_amount: String(l.principal_amount),
      currency: l.currency,
      interest_rate: l.interest_rate != null ? String(l.interest_rate * 100) : '',
      start_date: l.start_date || '',
      end_date: l.end_date || '',
      status: l.status,
      notes: l.notes || '',
    })
    setShowForm(true)
    setError(null)
  }

  function resetForm() {
    setForm(EMPTY_FORM)
    setEditId(null)
    setShowForm(false)
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const payload = {
        organization_id: orgId,
        property_id: form.property_id || null,
        description: form.description.trim(),
        lender: form.lender.trim() || null,
        principal_amount: parseFloat(form.principal_amount),
        currency: form.currency,
        interest_rate: form.interest_rate ? parseFloat(form.interest_rate) / 100 : null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        status: form.status,
        notes: form.notes.trim() || null,
      }
      if (editId) {
        const { error: err } = await supabase.from('liabilities').update(payload).eq('id', editId)
        if (err) throw err
      } else {
        const { error: err } = await supabase.from('liabilities').insert([payload])
        if (err) throw err
      }
      resetForm()
      await loadData()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(fr ? 'Supprimer ce passif ?' : 'Delete this liability?')) return
    await supabase.from('liabilities').delete().eq('id', id)
    await loadData()
  }

  const totalActive = liabilities
    .filter(l => l.status === 'active')
    .reduce((sum, l) => sum + (l.currency === 'USD' ? l.principal_amount * exchangeRate : l.principal_amount), 0)

  const fmt = (n: number, currency = 'CAD') =>
    new Intl.NumberFormat(locale, { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n)

  return (
    <div className="space-y-4">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{fr ? 'Passifs du fonds' : 'Fund liabilities'}</h3>
          <p className="text-sm text-gray-500">
            {fr ? 'Total actif:' : 'Active total:'} <span className="font-semibold text-red-600">{fmt(totalActive)}</span>
            {' '}— {fr ? 'déduit du NAV' : 'deducted from NAV'}
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => { setShowForm(true); setEditId(null); setForm(EMPTY_FORM) }}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-800 text-white rounded-lg hover:bg-gray-900"
          >
            <Plus size={15} />
            {fr ? 'Ajouter' : 'Add'}
          </button>
        )}
      </div>

      {/* Formulaire */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{fr ? 'Description *' : 'Description *'}</label>
              <input
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder={fr ? 'Ex: Hypothèque 2e rang — Plaza Colonia' : 'Ex: 2nd mortgage — Plaza Colonia'}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{fr ? 'Prêteur' : 'Lender'}</label>
              <input
                value={form.lender}
                onChange={e => setForm(f => ({ ...f, lender: e.target.value }))}
                placeholder={fr ? 'Ex: Banque Nationale, Hypothécaire XYZ' : 'Ex: National Bank, XYZ Mortgage'}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{fr ? 'Montant principal *' : 'Principal amount *'}</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.principal_amount}
                onChange={e => setForm(f => ({ ...f, principal_amount: e.target.value }))}
                placeholder="0.00"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{fr ? 'Devise' : 'Currency'}</label>
              <select
                value={form.currency}
                onChange={e => setForm(f => ({ ...f, currency: e.target.value as 'CAD' | 'USD' }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white"
              >
                <option value="CAD">CAD</option>
                <option value="USD">USD</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{fr ? "Taux d'intérêt (%)" : 'Interest rate (%)'}</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.interest_rate}
                onChange={e => setForm(f => ({ ...f, interest_rate: e.target.value }))}
                placeholder="Ex: 5.25"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{fr ? 'Propriété liée' : 'Linked property'}</label>
              <select
                value={form.property_id}
                onChange={e => setForm(f => ({ ...f, property_id: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white"
              >
                <option value="">{fr ? '— Aucune —' : '— None —'}</option>
                {properties.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{fr ? 'Date de début' : 'Start date'}</label>
              <input
                type="date"
                value={form.start_date}
                onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{fr ? "Date d'échéance" : 'Maturity date'}</label>
              <input
                type="date"
                value={form.end_date}
                onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{fr ? 'Statut' : 'Status'}</label>
              <select
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value as typeof form.status }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white"
              >
                <option value="active">{fr ? 'Actif' : 'Active'}</option>
                <option value="paid_off">{fr ? 'Remboursé' : 'Paid off'}</option>
                <option value="refinanced">{fr ? 'Refinancé' : 'Refinanced'}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
              <input
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder={fr ? 'Notes supplémentaires...' : 'Additional notes...'}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 rounded-lg p-3">
              <AlertCircle size={15} />
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-800 text-white rounded-lg hover:bg-gray-900 disabled:opacity-50"
            >
              <Check size={14} />
              {saving ? (fr ? 'Enregistrement...' : 'Saving...') : editId ? (fr ? 'Mettre à jour' : 'Update') : (fr ? 'Ajouter' : 'Add')}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              {fr ? 'Annuler' : 'Cancel'}
            </button>
          </div>
        </form>
      )}

      {/* Liste */}
      {liabilities.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm">
          {fr ? 'Aucun passif enregistré. Le NAV suppose 0 $ de dettes.' : 'No liabilities recorded. NAV assumes $0 in debt.'}
        </div>
      ) : (
        <div className="space-y-2">
          {liabilities.map(l => {
            const amountCAD = l.currency === 'USD' ? l.principal_amount * exchangeRate : l.principal_amount
            const propName = properties.find(p => p.id === l.property_id)?.name
            return (
              <div
                key={l.id}
                className={`border rounded-lg p-4 ${l.status === 'active' ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-900 text-sm">{l.description}</span>
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${STATUS_COLORS[l.status]}`}>
                        {STATUS_LABELS[l.status]}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                      <span className="text-sm font-semibold text-red-700">
                        {fmt(l.principal_amount, l.currency)} {l.currency}
                        {l.currency === 'USD' && (
                          <span className="text-xs text-gray-500 font-normal ml-1">≈ {fmt(amountCAD)} CAD</span>
                        )}
                      </span>
                      {l.lender && <span className="text-xs text-gray-500">{l.lender}</span>}
                      {l.interest_rate != null && (
                        <span className="text-xs text-gray-500">{(l.interest_rate * 100).toFixed(2)}% int.</span>
                      )}
                      {propName && <span className="text-xs text-gray-500">📍 {propName}</span>}
                      {l.end_date && (
                        <span className="text-xs text-gray-500">
                          {fr ? 'Échéance:' : 'Maturity:'} {new Date(l.end_date).toLocaleDateString(locale)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => startEdit(l)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 rounded"
                      title={fr ? 'Modifier' : 'Edit'}
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(l.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 rounded"
                      title={fr ? 'Supprimer' : 'Delete'}
                    >
                      <X size={14} />
                    </button>
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
