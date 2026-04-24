'use client'

import { useState } from 'react'
import { useInvestment } from '@/contexts/InvestmentContext'
import { DollarSign, Plus, Edit2, Trash2, Calendar, Filter, X, TrendingUp, TrendingDown, ArrowLeftRight } from 'lucide-react'

interface TransactionFormData {
  date: string
  type: string
  amount: number
  description: string
  investor_id: string | null
  property_id: string | null
  category: string
  payment_method: string
  reference_number: string
  status: string
  // Revenu locatif
  target_account: 'compte_courant' | 'capex' | null
  // Paiement récurrent
  occurrence_type: 'unique' | 'recurrent'
  recurrence_frequency: 'quotidien' | 'hebdomadaire' | 'mensuel' | 'trimestriel' | 'annuel' | null
  recurrence_end_date: string | null
  recurrence_no_end: boolean
  // Transfert
  transfer_source: 'compte_courant' | 'capex' | null
}

const defaultForm: TransactionFormData = {
  date: new Date().toISOString().split('T')[0],
  type: 'investissement',
  amount: 0,
  description: '',
  investor_id: null,
  property_id: null,
  category: 'capital',
  payment_method: 'virement',
  reference_number: '',
  status: 'complete',
  target_account: null,
  occurrence_type: 'unique',
  recurrence_frequency: null,
  recurrence_end_date: null,
  recurrence_no_end: false,
  transfer_source: null,
}

function generateDates(start: string, frequency: string, endDate: string | null): string[] {
  const dates: string[] = []
  const cur = new Date(start + 'T00:00:00')
  const end = endDate
    ? new Date(endDate + 'T00:00:00')
    : new Date(cur.getFullYear() + 2, cur.getMonth(), cur.getDate())
  while (cur <= end && dates.length < 500) {
    dates.push(cur.toISOString().split('T')[0])
    if (frequency === 'quotidien')     cur.setDate(cur.getDate() + 1)
    else if (frequency === 'hebdomadaire') cur.setDate(cur.getDate() + 7)
    else if (frequency === 'mensuel')  cur.setMonth(cur.getMonth() + 1)
    else if (frequency === 'trimestriel') cur.setMonth(cur.getMonth() + 3)
    else if (frequency === 'annuel')   cur.setFullYear(cur.getFullYear() + 1)
    else break
  }
  return dates
}

export default function TransactionsTab() {
  const { transactions, investors, properties, addTransaction, updateTransaction, deleteTransaction, loading } = useInvestment()

  const [showAddForm, setShowAddForm]     = useState(false)
  const [editingId, setEditingId]         = useState<string | null>(null)
  const [filterType, setFilterType]       = useState<string>('all')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [saving, setSaving]               = useState(false)

  const [formData, setFormData] = useState<TransactionFormData>(defaultForm)

  const set = (patch: Partial<TransactionFormData>) => setFormData(prev => ({ ...prev, ...patch }))

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    const base = {
      date:             formData.date,
      type:             formData.type,
      amount:           formData.amount,
      description:      formData.description,
      investor_id:      formData.investor_id || null,
      property_id:      formData.property_id || null,
      category:         formData.category,
      payment_method:   formData.payment_method,
      reference_number: formData.reference_number,
      status:           formData.status,
      target_account:   formData.target_account || undefined,
      transfer_source:  formData.transfer_source || undefined,
    }

    try {
      // ── Paiement récurrent ─────────────────────────────────────────────────
      if (formData.type === 'paiement' && formData.occurrence_type === 'recurrent' && formData.recurrence_frequency) {
        const dates = generateDates(
          formData.date,
          formData.recurrence_frequency,
          formData.recurrence_no_end ? null : formData.recurrence_end_date
        )
        let errors = 0
        for (const d of dates) {
          const r = await addTransaction({ ...base, date: d })
          if (!r.success) errors++
        }
        if (errors === 0) {
          alert(`✅ ${dates.length} paiement(s) récurrent(s) créés avec succès.`)
        } else {
          alert(`⚠️ ${dates.length - errors}/${dates.length} créés (${errors} erreur(s)).`)
        }
        resetForm()
        setSaving(false)
        return
      }

      // ── Mode édition ───────────────────────────────────────────────────────
      if (editingId) {
        const result = await updateTransaction(editingId, base)
        if (result.success) { resetForm() }
        else alert('Erreur: ' + result.error)
      } else {
        const result = await addTransaction(base)
        if (result.success) { resetForm() }
        else alert('Erreur: ' + result.error)
      }
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (transaction: any) => {
    setEditingId(transaction.id)
    setFormData({
      date:                transaction.date?.split('T')[0] ?? new Date().toISOString().split('T')[0],
      type:                transaction.type ?? 'investissement',
      amount:              Math.abs(transaction.amount ?? 0),
      description:         transaction.description ?? '',
      investor_id:         transaction.investor_id ?? null,
      property_id:         transaction.property_id ?? null,
      category:            transaction.category ?? 'capital',
      payment_method:      transaction.payment_method ?? 'virement',
      reference_number:    transaction.reference_number ?? '',
      status:              transaction.status ?? 'complete',
      target_account:      transaction.target_account ?? null,
      transfer_source:     transaction.transfer_source ?? null,
      occurrence_type:     'unique',
      recurrence_frequency: null,
      recurrence_end_date: null,
      recurrence_no_end:   false,
    })
    setShowAddForm(true)
  }

  const handleDelete = async (id: string, description: string) => {
    if (confirm(`Supprimer "${description}" ?`)) {
      const result = await deleteTransaction(id)
      if (!result.success) alert('Erreur: ' + result.error)
    }
  }

  const resetForm = () => {
    setFormData(defaultForm)
    setShowAddForm(false)
    setEditingId(null)
  }

  // ── Filtres ─────────────────────────────────────────────────────────────────
  const filteredTransactions = transactions.filter(t => {
    if (filterType !== 'all' && t.type !== filterType) return false
    if (filterCategory !== 'all' && t.category !== filterCategory) return false
    return true
  })

  const INFLOW_TYPES = ['investissement', 'dividende', 'loyer', 'loyer_locatif', 'revenu']

  const totalIn = filteredTransactions
    .filter(t => INFLOW_TYPES.includes(t.type))
    .reduce((sum, t) => sum + Math.abs(t.amount), 0)

  const totalOut = filteredTransactions
    .filter(t => ['paiement', 'depense'].includes(t.type))
    .reduce((sum, t) => sum + Math.abs(t.amount), 0)

  const balance = totalIn - totalOut

  const getTypeIcon = (type: string) =>
    INFLOW_TYPES.includes(type)
      ? <TrendingUp className="text-green-600" size={20} />
      : type === 'transfert'
        ? <ArrowLeftRight className="text-indigo-600" size={20} />
        : <TrendingDown className="text-red-600" size={20} />

  const getTypeBadge = (type: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      investissement:  { bg: 'bg-green-100',  text: 'text-green-800',  label: 'Investissement' },
      loyer:           { bg: 'bg-teal-100',   text: 'text-teal-800',   label: 'Loyer' },
      loyer_locatif:   { bg: 'bg-teal-100',   text: 'text-teal-800',   label: 'Revenu locatif' },
      revenu:          { bg: 'bg-cyan-100',   text: 'text-cyan-800',   label: 'Revenu' },
      paiement:        { bg: 'bg-blue-100',   text: 'text-blue-800',   label: 'Paiement' },
      dividende:       { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Dividende' },
      depense:         { bg: 'bg-red-100',    text: 'text-red-800',    label: 'Dépense' },
      transfert:       { bg: 'bg-indigo-100', text: 'text-indigo-800', label: 'Transfert' },
    }
    const b = badges[type] ?? { bg: 'bg-gray-100', text: 'text-gray-800', label: type }
    return <span className={`px-3 py-1 rounded-full text-xs font-medium ${b.bg} ${b.text}`}>{b.label}</span>
  }

  // ── Calculs affichage récurrence ────────────────────────────────────────────
  const previewCount = (formData.type === 'paiement' && formData.occurrence_type === 'recurrent' && formData.recurrence_frequency)
    ? generateDates(formData.date, formData.recurrence_frequency, formData.recurrence_no_end ? null : formData.recurrence_end_date).length
    : null

  const transferDest = formData.transfer_source === 'compte_courant' ? 'CAPEX' : formData.transfer_source === 'capex' ? 'Compte courant' : '—'

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-green-700">Entrées</span>
            <TrendingUp className="text-green-600" size={20} />
          </div>
          <p className="text-2xl font-bold text-green-900">
            {totalIn.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
          </p>
        </div>
        <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-lg border border-red-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-red-700">Sorties</span>
            <TrendingDown className="text-red-600" size={20} />
          </div>
          <p className="text-2xl font-bold text-red-900">
            {totalOut.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
          </p>
        </div>
        <div className={`bg-gradient-to-br p-4 rounded-lg border ${balance >= 0 ? 'from-blue-50 to-blue-100 border-blue-200' : 'from-orange-50 to-orange-100 border-orange-200'}`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-sm font-medium ${balance >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>Solde</span>
            <DollarSign className={balance >= 0 ? 'text-blue-600' : 'text-orange-600'} size={20} />
          </div>
          <p className={`text-2xl font-bold ${balance >= 0 ? 'text-blue-900' : 'text-orange-900'}`}>
            {balance.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
          </p>
        </div>
      </div>

      {/* Barre d'actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Filter size={20} className="text-gray-600" />
          <select value={filterType} onChange={e => setFilterType(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] bg-white">
            <option value="all">Tous les types</option>
            <option value="investissement">Investissement</option>
            <option value="loyer">Loyer</option>
            <option value="loyer_locatif">Revenu locatif</option>
            <option value="revenu">Revenu</option>
            <option value="paiement">Paiement</option>
            <option value="dividende">Dividende</option>
            <option value="depense">Dépense</option>
            <option value="transfert">Transfert</option>
          </select>
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] bg-white">
            <option value="all">Toutes les catégories</option>
            <option value="capital">Capital</option>
            <option value="operation">Opération</option>
            <option value="maintenance">Maintenance</option>
            <option value="admin">Administration</option>
          </select>
        </div>
        <button onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 bg-[#5e5e5e] hover:bg-[#3e3e3e] text-white px-4 py-2 rounded-full transition-colors">
          {showAddForm ? <X size={20} /> : <Plus size={20} />}
          {showAddForm ? 'Annuler' : 'Nouvelle transaction'}
        </button>
      </div>

      {/* ── Formulaire ── */}
      {showAddForm && (
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">
            {editingId ? 'Modifier la transaction' : 'Nouvelle transaction'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {formData.type === 'paiement' && formData.occurrence_type === 'recurrent' ? 'Date de début *' : 'Date *'}
                </label>
                <input type="date" required value={formData.date}
                  onChange={e => set({ date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e]" />
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type *</label>
                <select required value={formData.type}
                  onChange={e => set({
                    type: e.target.value,
                    target_account: null,
                    transfer_source: null,
                    occurrence_type: 'unique',
                    recurrence_frequency: null,
                    recurrence_end_date: null,
                    recurrence_no_end: false,
                  })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] bg-white">
                  <optgroup label="Entrées">
                    <option value="investissement">Investissement</option>
                    <option value="loyer">Loyer</option>
                    <option value="loyer_locatif">Revenu locatif</option>
                    <option value="revenu">Revenu</option>
                    <option value="dividende">Dividende</option>
                  </optgroup>
                  <optgroup label="Sorties">
                    <option value="paiement">Paiement</option>
                    <option value="depense">Dépense</option>
                    <option value="capex">CAPEX</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="admin">Administratif</option>
                    <option value="remboursement_investisseur">Remboursement investisseur</option>
                  </optgroup>
                  <optgroup label="Autre">
                    <option value="transfert">Transfert (courant ↔ CAPEX)</option>
                  </optgroup>
                </select>
              </div>
            </div>

            {/* ── Revenu locatif : compte destination ── */}
            {formData.type === 'loyer_locatif' && (
              <div className="p-4 bg-teal-50 border border-teal-200 rounded-lg">
                <label className="block text-sm font-medium text-teal-800 mb-3">
                  Compte de destination *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {(['compte_courant', 'capex'] as const).map(acc => (
                    <button key={acc} type="button"
                      onClick={() => set({ target_account: acc })}
                      className={`p-3 border-2 rounded-lg text-sm font-medium transition-all ${
                        formData.target_account === acc
                          ? 'border-teal-500 bg-teal-100 text-teal-800'
                          : 'border-gray-300 hover:border-teal-300 text-gray-700'
                      }`}>
                      {acc === 'compte_courant' ? '🏢 Compte courant' : '🏗️ CAPEX'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── Paiement : unique / récurrent ── */}
            {formData.type === 'paiement' && (
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg space-y-4">
                <div>
                  <label className="block text-sm font-medium text-orange-800 mb-2">Occurrence</label>
                  <div className="grid grid-cols-2 gap-3">
                    {(['unique', 'recurrent'] as const).map(occ => (
                      <button key={occ} type="button"
                        onClick={() => set({ occurrence_type: occ })}
                        className={`p-3 border-2 rounded-lg text-sm font-medium transition-all ${
                          formData.occurrence_type === occ
                            ? 'border-orange-500 bg-orange-100 text-orange-800'
                            : 'border-gray-300 hover:border-orange-300 text-gray-700'
                        }`}>
                        {occ === 'unique' ? '1️⃣ Unique' : '🔄 Récurrent'}
                      </button>
                    ))}
                  </div>
                </div>

                {formData.occurrence_type === 'recurrent' && (
                  <div className="space-y-3 pt-2 border-t border-orange-200">
                    <div>
                      <label className="block text-sm font-medium text-orange-800 mb-2">Fréquence *</label>
                      <select required value={formData.recurrence_frequency ?? ''}
                        onChange={e => set({ recurrence_frequency: e.target.value as any })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 bg-white">
                        <option value="">-- Choisir --</option>
                        <option value="quotidien">Quotidien</option>
                        <option value="hebdomadaire">Hebdomadaire</option>
                        <option value="mensuel">Mensuel</option>
                        <option value="trimestriel">Trimestriel</option>
                        <option value="annuel">Annuel</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-orange-800 mb-2">Date de fin</label>
                      <div className="flex items-center gap-3">
                        <input type="date"
                          disabled={formData.recurrence_no_end}
                          value={formData.recurrence_end_date ?? ''}
                          onChange={e => set({ recurrence_end_date: e.target.value })}
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 disabled:bg-gray-100 disabled:text-gray-400" />
                        <label className="flex items-center gap-2 text-sm text-orange-700 whitespace-nowrap cursor-pointer">
                          <input type="checkbox" checked={formData.recurrence_no_end}
                            onChange={e => set({ recurrence_no_end: e.target.checked, recurrence_end_date: null })}
                            className="w-4 h-4 rounded" />
                          Pas de fin
                        </label>
                      </div>
                    </div>
                    {previewCount !== null && (
                      <p className="text-sm text-orange-700 font-medium">
                        Aperçu : <strong>{previewCount}</strong> transaction(s) seront créées
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── Transfert : source / destination ── */}
            {formData.type === 'transfert' && (
              <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                <label className="block text-sm font-medium text-indigo-800 mb-3">De (compte source) *</label>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  {(['compte_courant', 'capex'] as const).map(acc => (
                    <button key={acc} type="button"
                      onClick={() => set({ transfer_source: acc })}
                      className={`p-3 border-2 rounded-lg text-sm font-medium transition-all ${
                        formData.transfer_source === acc
                          ? 'border-indigo-500 bg-indigo-100 text-indigo-800'
                          : 'border-gray-300 hover:border-indigo-300 text-gray-700'
                      }`}>
                      {acc === 'compte_courant' ? '🏢 Compte courant' : '🏗️ CAPEX'}
                    </button>
                  ))}
                </div>
                {formData.transfer_source && (
                  <p className="text-sm text-indigo-700">
                    Vers : <strong>{transferDest}</strong>
                  </p>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Montant */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Montant ($) *</label>
                <input type="text" inputMode="decimal" required
                  value={formData.amount || ''}
                  onChange={e => {
                    const v = e.target.value.replace(/,/g, '.')
                    const n = parseFloat(v)
                    set({ amount: isNaN(n) ? 0 : n })
                  }}
                  placeholder="Ex: 1 500,00"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e]" />
              </div>

              {/* Catégorie (masquée pour transfert) */}
              {formData.type !== 'transfert' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Catégorie *</label>
                  <select required value={formData.category}
                    onChange={e => set({ category: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] bg-white">
                    <option value="capital">Capital</option>
                    <option value="operation">Opération</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="admin">Administration</option>
                  </select>
                </div>
              )}

              {/* Méthode paiement */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Méthode de paiement *</label>
                <select required value={formData.payment_method}
                  onChange={e => set({ payment_method: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] bg-white">
                  <option value="virement">Virement</option>
                  <option value="cheque">Chèque</option>
                  <option value="especes">Espèces</option>
                  <option value="carte">Carte</option>
                </select>
              </div>

              {/* Statut */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Statut *</label>
                <select required value={formData.status}
                  onChange={e => set({ status: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] bg-white">
                  <option value="complete">Complété</option>
                  <option value="pending">En attente</option>
                  <option value="cancelled">Annulé</option>
                </select>
              </div>

              {/* Investisseur (masqué pour transfert) */}
              {formData.type !== 'transfert' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Investisseur</label>
                  <select value={formData.investor_id ?? ''}
                    onChange={e => set({ investor_id: e.target.value || null })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] bg-white">
                    <option value="">Aucun</option>
                    {investors.map(inv => (
                      <option key={inv.id} value={inv.id}>{inv.first_name} {inv.last_name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Propriété */}
              {formData.type !== 'transfert' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Propriété</label>
                  <select value={formData.property_id ?? ''}
                    onChange={e => set({ property_id: e.target.value || null })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] bg-white">
                    <option value="">Aucune</option>
                    {properties.map(prop => (
                      <option key={prop.id} value={prop.id}>{prop.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Description */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
                <textarea required rows={2} value={formData.description}
                  onChange={e => set({ description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e]" />
              </div>

              {/* Référence */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Numéro de référence</label>
                <input type="text" value={formData.reference_number}
                  onChange={e => set({ reference_number: e.target.value })}
                  placeholder="Ex: TRX-2025-001"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e]" />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button type="submit" disabled={saving || loading}
                className="bg-[#5e5e5e] hover:bg-[#3e3e3e] text-white px-6 py-2 rounded-full transition-colors disabled:opacity-50">
                {saving ? 'Enregistrement...' :
                  editingId ? 'Modifier' :
                  (formData.type === 'paiement' && formData.occurrence_type === 'recurrent')
                    ? `Créer ${previewCount ?? '?'} paiement(s)`
                    : 'Ajouter'}
              </button>
              <button type="button" onClick={resetForm}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-2 rounded-full transition-colors">
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Liste des transactions ── */}
      {filteredTransactions.length === 0 ? (
        <div className="bg-white p-12 rounded-lg shadow-md text-center">
          <DollarSign size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucune transaction</h3>
          <p className="text-gray-600">
            {filterType !== 'all' || filterCategory !== 'all'
              ? 'Aucune transaction ne correspond aux filtres'
              : 'Commencez par ajouter votre première transaction'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Montant</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTransactions.map(transaction => {
                  const investor = investors.find(i => i.id === transaction.investor_id)
                  const property = properties.find(p => p.id === transaction.property_id)
                  const isInflow = INFLOW_TYPES.includes(transaction.type)

                  return (
                    <tr key={transaction.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center gap-2">
                          <Calendar size={14} className="text-gray-400" />
                          {new Date(transaction.date).toLocaleDateString('fr-CA')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">{getTypeBadge(transaction.type)}</td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{transaction.description}</div>
                        {investor && <div className="text-xs text-gray-500">Investisseur: {investor.first_name} {investor.last_name}</div>}
                        {property && <div className="text-xs text-gray-500">Propriété: {property.name}</div>}
                        {(transaction as any).target_account && (
                          <div className="text-xs text-teal-600">
                            Vers: {(transaction as any).target_account === 'compte_courant' ? 'Compte courant' : 'CAPEX'}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`flex items-center gap-1 text-sm font-semibold ${
                          isInflow ? 'text-green-600' : transaction.type === 'transfert' ? 'text-indigo-600' : 'text-red-600'
                        }`}>
                          {getTypeIcon(transaction.type)}
                          {Math.abs(transaction.amount).toLocaleString('fr-CA', { style: 'currency', currency: 'CAD' })}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          transaction.status === 'complete' ? 'bg-green-100 text-green-800' :
                          transaction.status === 'pending'  ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {transaction.status === 'complete' ? 'Complété' :
                           transaction.status === 'pending'  ? 'En attente' : 'Annulé'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => handleEdit(transaction)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="Modifier">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => handleDelete(transaction.id, transaction.description)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded" title="Supprimer">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
