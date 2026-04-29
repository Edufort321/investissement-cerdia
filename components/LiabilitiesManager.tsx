'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, X, Edit2, Check, AlertCircle } from 'lucide-react'

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

const STATUS_LABELS: Record<string, string> = {
  active: 'Actif',
  paid_off: 'Remboursé',
  refinanced: 'Refinancé',
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
  const [liabilities, setLiabilities] = useState<Liability[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const [{ data: liabData }, { data: propData }] = await Promise.all([
      supabase.from('liabilities').select('*').order('created_at', { ascending: false }),
      supabase.from('properties').select('id, name').order('name'),
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
    if (!confirm('Supprimer ce passif ?')) return
    await supabase.from('liabilities').delete().eq('id', id)
    await loadData()
  }

  const totalActive = liabilities
    .filter(l => l.status === 'active')
    .reduce((sum, l) => sum + (l.currency === 'USD' ? l.principal_amount * exchangeRate : l.principal_amount), 0)

  const fmt = (n: number, currency = 'CAD') =>
    new Intl.NumberFormat('fr-CA', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n)

  return (
    <div className="space-y-4">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Passifs du fonds</h3>
          <p className="text-sm text-gray-500">
            Total actif: <span className="font-semibold text-red-600">{fmt(totalActive)}</span>
            {' '}— déduit du NAV
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => { setShowForm(true); setEditId(null); setForm(EMPTY_FORM) }}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-800 text-white rounded-lg hover:bg-gray-900"
          >
            <Plus size={15} />
            Ajouter
          </button>
        )}
      </div>

      {/* Formulaire */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Description *</label>
              <input
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Ex: Hypothèque 2e rang — Plaza Colonia"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Prêteur</label>
              <input
                value={form.lender}
                onChange={e => setForm(f => ({ ...f, lender: e.target.value }))}
                placeholder="Ex: Banque Nationale, Hypothécaire XYZ"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Montant principal *</label>
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
              <label className="block text-xs font-medium text-gray-600 mb-1">Devise</label>
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
              <label className="block text-xs font-medium text-gray-600 mb-1">Taux d'intérêt (%)</label>
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
              <label className="block text-xs font-medium text-gray-600 mb-1">Propriété liée</label>
              <select
                value={form.property_id}
                onChange={e => setForm(f => ({ ...f, property_id: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white"
              >
                <option value="">— Aucune —</option>
                {properties.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date de début</label>
              <input
                type="date"
                value={form.start_date}
                onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date d'échéance</label>
              <input
                type="date"
                value={form.end_date}
                onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Statut</label>
              <select
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value as typeof form.status }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white"
              >
                <option value="active">Actif</option>
                <option value="paid_off">Remboursé</option>
                <option value="refinanced">Refinancé</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
              <input
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Notes supplémentaires..."
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
              {saving ? 'Enregistrement...' : editId ? 'Mettre à jour' : 'Ajouter'}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Annuler
            </button>
          </div>
        </form>
      )}

      {/* Liste */}
      {liabilities.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm">
          Aucun passif enregistré. Le NAV suppose 0 $ de dettes.
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
                          Échéance: {new Date(l.end_date).toLocaleDateString('fr-CA')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => startEdit(l)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 rounded"
                      title="Modifier"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(l.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 rounded"
                      title="Supprimer"
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
