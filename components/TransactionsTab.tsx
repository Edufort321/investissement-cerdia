'use client'

import { useState } from 'react'
import { useInvestment } from '@/contexts/InvestmentContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { DollarSign, Plus, Edit2, Trash2, Calendar, Filter, X, TrendingUp, TrendingDown, ArrowLeftRight } from 'lucide-react'

type Direction = 'revenu' | 'depense' | 'neutre'

const REVENU_TYPES  = ['investissement', 'loyer', 'loyer_locatif', 'revenu', 'dividende']
const DEPENSE_TYPES = ['paiement', 'depense', 'capex', 'maintenance', 'admin', 'remboursement_investisseur']

// TDT Florida par comté (Tourist Development Tax)
const FL_TDT_RATES: Record<string, number> = {
  'FL-MIAMI': 6, 'FL-BROWARD': 5, 'FL-ORANGE': 6, 'FL-OSCEOLA': 6,
  'FL-PINELLAS': 6, 'FL-HILLSBOROUGH': 5, 'FL-COLLIER': 5, 'FL-KEYS': 5,
}
// Seuil court terme Florida : ≤ 182 nuits → Sales Tax + TDT applicables
const FL_SHORT_TERM_DAYS = 182
// ITBIS République Dominicaine (location touristique court terme)
const DR_ITBIS_RATE = 18
// Seuil court terme DR : ≤ 30 nuits
const DR_SHORT_TERM_DAYS = 30

function dirFromType(type: string): Direction {
  if (REVENU_TYPES.includes(type))  return 'revenu'
  if (type === 'transfert')          return 'neutre'
  return 'depense'
}

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
  // Fiscal international
  source_currency: string | null      // Devise d'origine (USD/DOP/EUR/MXN)
  source_amount: number | null        // Montant dans la devise d'origine
  foreign_tax_paid: number | null     // Impôt étranger payé (T2209)
  rental_duration_days: number | null // Durée location (court/long terme)
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
  source_currency: null,
  source_amount: null,
  foreign_tax_paid: null,
  rental_duration_days: null,
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
  const { t, language } = useLanguage()
  const fr = language === 'fr'

  const [showAddForm, setShowAddForm]     = useState(false)
  const [editingId, setEditingId]         = useState<string | null>(null)
  const [filterType, setFilterType]       = useState<string>('all')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [saving, setSaving]               = useState(false)
  const [direction, setDirection]         = useState<Direction>('revenu')

  const [formData, setFormData] = useState<TransactionFormData>(defaultForm)

  const set = (patch: Partial<TransactionFormData>) => setFormData(prev => ({ ...prev, ...patch }))

  const switchDirection = (d: Direction) => {
    setDirection(d)
    const defaultType = d === 'revenu' ? 'investissement' : d === 'depense' ? 'paiement' : 'transfert'
    const defaultCat  = d === 'revenu' ? 'capital' : 'operation'
    set({
      type: defaultType,
      category: defaultCat,
      target_account: null,
      transfer_source: null,
      occurrence_type: 'unique',
      recurrence_frequency: null,
      recurrence_end_date: null,
      recurrence_no_end: false,
    })
  }

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    // Auto-calcul TDT Florida lors de la soumission
    const _linkedProp = formData.property_id ? (properties.find(p => p.id === formData.property_id) as any) : null
    const _countyCode = _linkedProp?.county_code
    const _tdtRate = _countyCode ? (FL_TDT_RATES[_countyCode] ?? null) : null
    const _isRentalIncome = ['loyer', 'loyer_locatif', 'revenu'].includes(formData.type)
    const _isShortTermFL = formData.rental_duration_days != null && formData.rental_duration_days <= FL_SHORT_TERM_DAYS
    const _autoTdtAmount = (_isRentalIncome && _isShortTermFL && _tdtRate && formData.amount > 0)
      ? Math.round(formData.amount * _tdtRate / 100 * 100) / 100 : undefined
    const _autoTdtRate = _autoTdtAmount != null ? _tdtRate : undefined

    // Auto-calcul IRNR RD 27% non-résidents
    const _isDR = _linkedProp?.country_code === 'DO'
    const _isConfotur = !!_linkedProp?.is_confotur
    const _hasForeignTax = (formData.foreign_tax_paid ?? 0) > 0
    const _autoIrnrAmount = (_isDR && _isRentalIncome && !_isConfotur && !_hasForeignTax && formData.amount > 0)
      ? Math.round(formData.amount * 0.27 * 100) / 100 : undefined
    const _autoIrnrRate = _autoIrnrAmount != null ? 27 : undefined

    const base = {
      date:                 formData.date,
      type:                 formData.type,
      amount:               formData.amount,
      description:          formData.description,
      investor_id:          formData.investor_id || null,
      property_id:          formData.property_id || null,
      category:             formData.category,
      payment_method:       formData.payment_method,
      reference_number:     formData.reference_number,
      status:               formData.status,
      target_account:       formData.target_account || undefined,
      transfer_source:      formData.transfer_source || undefined,
      source_currency:      formData.source_currency || undefined,
      source_amount:        formData.source_amount || undefined,
      foreign_tax_paid:     formData.foreign_tax_paid || undefined,
      rental_duration_days: formData.rental_duration_days || undefined,
      county_tdt_amount:    _autoTdtAmount,
      county_tdt_rate:      _autoTdtRate,
      irnr_amount:          _autoIrnrAmount,
      irnr_rate:            _autoIrnrRate,
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
          alert(fr
            ? `✅ ${dates.length} paiement(s) récurrent(s) créés avec succès.`
            : `✅ ${dates.length} recurring payment(s) created successfully.`)
        } else {
          alert(fr
            ? `⚠️ ${dates.length - errors}/${dates.length} créés (${errors} erreur(s)).`
            : `⚠️ ${dates.length - errors}/${dates.length} created (${errors} error(s)).`)
        }
        resetForm()
        setSaving(false)
        return
      }

      // ── Mode édition ───────────────────────────────────────────────────────
      if (editingId) {
        const result = await updateTransaction(editingId, base)
        if (result.success) { resetForm() }
        else alert((fr ? 'Erreur : ' : 'Error: ') + result.error)
      } else {
        const result = await addTransaction(base)
        if (result.success) { resetForm() }
        else alert((fr ? 'Erreur : ' : 'Error: ') + result.error)
      }
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (transaction: any) => {
    setEditingId(transaction.id)
    setDirection(dirFromType(transaction.type ?? 'investissement'))
    setFormData({
      date:                transaction.date?.split('T')[0] ?? new Date().toISOString().split('T')[0],
      type:                transaction.type ?? 'investissement',
      amount:              Math.abs(transaction.amount ?? 0),
      description:         transaction.description ?? '',
      investor_id:         transaction.investor_id ?? null,
      property_id:          transaction.property_id ?? null,
      source_currency:      (transaction as any).source_currency ?? null,
      source_amount:        (transaction as any).source_amount ?? null,
      foreign_tax_paid:     (transaction as any).foreign_tax_paid ?? null,
      rental_duration_days: (transaction as any).rental_duration_days ?? null,
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
    if (confirm(fr ? `Supprimer "${description}" ?` : `Delete "${description}"?`)) {
      const result = await deleteTransaction(id)
      if (!result.success) alert((fr ? 'Erreur : ' : 'Error: ') + result.error)
    }
  }

  const resetForm = () => {
    setFormData(defaultForm)
    setDirection('revenu')
    setShowAddForm(false)
    setEditingId(null)
  }

  // ── Filtres ─────────────────────────────────────────────────────────────────
  const filteredTransactions = transactions.filter(tx => {
    if (filterType !== 'all' && tx.type !== filterType) return false
    if (filterCategory !== 'all' && tx.category !== filterCategory) return false
    return true
  })

  const INFLOW_TYPES = REVENU_TYPES

  const totalIn = filteredTransactions
    .filter(tx => INFLOW_TYPES.includes(tx.type))
    .reduce((sum, tx) => sum + Math.abs(tx.amount), 0)

  const totalOut = filteredTransactions
    .filter(tx => DEPENSE_TYPES.includes(tx.type))
    .reduce((sum, tx) => sum + Math.abs(tx.amount), 0)

  const balance = totalIn - totalOut

  const getTypeIcon = (type: string) =>
    INFLOW_TYPES.includes(type)
      ? <TrendingUp className="text-green-600" size={20} />
      : type === 'transfert'
        ? <ArrowLeftRight className="text-indigo-600" size={20} />
        : <TrendingDown className="text-red-600" size={20} />

  const getTypeBadge = (type: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      investissement:            { bg: 'bg-green-100',  text: 'text-green-800',  label: t('transactionType.investment') },
      loyer:                     { bg: 'bg-teal-100',   text: 'text-teal-800',   label: t('transactions.typeLoyer') },
      loyer_locatif:             { bg: 'bg-teal-100',   text: 'text-teal-800',   label: t('transactions.typeLoyerLocatif') },
      revenu:                    { bg: 'bg-cyan-100',   text: 'text-cyan-800',   label: t('transactions.typeRevenu') },
      paiement:                  { bg: 'bg-blue-100',   text: 'text-blue-800',   label: t('transactionType.payment') },
      dividende:                 { bg: 'bg-purple-100', text: 'text-purple-800', label: t('transactionType.dividend') },
      depense:                   { bg: 'bg-red-100',    text: 'text-red-800',    label: t('transactionType.expense') },
      transfert:                 { bg: 'bg-indigo-100', text: 'text-indigo-800', label: t('transactions.typeTransfert') },
    }
    const b = badges[type] ?? { bg: 'bg-gray-100', text: 'text-gray-800', label: type }
    return <span className={`px-3 py-1 rounded-full text-xs font-medium ${b.bg} ${b.text}`}>{b.label}</span>
  }

  // ── Calculs affichage récurrence ────────────────────────────────────────────
  const previewCount = (formData.type === 'paiement' && formData.occurrence_type === 'recurrent' && formData.recurrence_frequency)
    ? generateDates(formData.date, formData.recurrence_frequency, formData.recurrence_no_end ? null : formData.recurrence_end_date).length
    : null

  const transferDest = formData.transfer_source === 'compte_courant'
    ? t('transactions.typeCapex')
    : formData.transfer_source === 'capex'
      ? t('transactions.compteCourant')
      : '—'

  const dateLocale = fr ? 'fr-CA' : 'en-CA'

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/40 dark:to-green-800/20 p-4 rounded-lg border border-green-200 dark:border-green-800/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-green-700 dark:text-green-300">{t('transactions.totalIn')}</span>
            <TrendingUp className="text-green-600 dark:text-green-400" size={20} />
          </div>
          <p className="text-2xl font-bold text-green-900 dark:text-green-200">
            {totalIn.toLocaleString(dateLocale, { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
          </p>
        </div>
        <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/40 dark:to-red-800/20 p-4 rounded-lg border border-red-200 dark:border-red-800/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-red-700 dark:text-red-300">{t('transactions.totalOut')}</span>
            <TrendingDown className="text-red-600 dark:text-red-400" size={20} />
          </div>
          <p className="text-2xl font-bold text-red-900 dark:text-red-200">
            {totalOut.toLocaleString(dateLocale, { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
          </p>
        </div>
        <div className={`bg-gradient-to-br p-4 rounded-lg border ${balance >= 0 ? 'from-blue-50 to-blue-100 dark:from-blue-900/40 dark:to-blue-800/20 border-blue-200 dark:border-blue-800/50' : 'from-orange-50 to-orange-100 dark:from-orange-900/40 dark:to-orange-800/20 border-orange-200 dark:border-orange-800/50'}`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-sm font-medium ${balance >= 0 ? 'text-blue-700 dark:text-blue-300' : 'text-orange-700 dark:text-orange-300'}`}>{t('transactions.balance')}</span>
            <DollarSign className={balance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'} size={20} />
          </div>
          <p className={`text-2xl font-bold ${balance >= 0 ? 'text-blue-900 dark:text-blue-200' : 'text-orange-900 dark:text-orange-200'}`}>
            {balance.toLocaleString(dateLocale, { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
          </p>
        </div>
      </div>

      {/* Barre d'actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Filter size={20} className="text-gray-600" />
          <select value={filterType} onChange={e => setFilterType(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] bg-white">
            <option value="all">{t('transactions.allTypes')}</option>
            <option value="investissement">{t('transactionType.investment')}</option>
            <option value="loyer">{t('transactions.typeLoyer')}</option>
            <option value="loyer_locatif">{t('transactions.typeLoyerLocatif')}</option>
            <option value="revenu">{t('transactions.typeRevenu')}</option>
            <option value="paiement">{t('transactionType.payment')}</option>
            <option value="dividende">{t('transactionType.dividend')}</option>
            <option value="depense">{t('transactionType.expense')}</option>
            <option value="transfert">{t('transactions.typeTransfert')}</option>
          </select>
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] bg-white">
            <option value="all">{t('transactions.allCategories')}</option>
            <option value="capital">{t('category.capital')}</option>
            <option value="operation">{t('category.operation')}</option>
            <option value="maintenance">{t('category.maintenance')}</option>
            <option value="admin">{t('category.admin')}</option>
          </select>
        </div>
        <button onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 bg-[#5e5e5e] hover:bg-[#3e3e3e] text-white px-4 py-2 rounded-full transition-colors">
          {showAddForm ? <X size={20} /> : <Plus size={20} />}
          {showAddForm ? t('common.cancel') : t('transactions.new')}
        </button>
      </div>

      {/* ── Formulaire ── */}
      {showAddForm && (
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">
            {editingId ? t('transactions.edit') : t('transactions.new')}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* ── Direction toggle ── */}
            <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
              {([
                { key: 'revenu',  label: fr ? '↑ Revenu'  : '↑ Revenue', active: 'bg-green-500',  inactive: 'hover:text-green-700' },
                { key: 'depense', label: fr ? '↓ Dépense' : '↓ Expense', active: 'bg-red-500',    inactive: 'hover:text-red-700'   },
                { key: 'neutre',  label: fr ? '↔ Neutre'  : '↔ Neutral', active: 'bg-indigo-500', inactive: 'hover:text-indigo-700' },
              ] as { key: Direction; label: string; active: string; inactive: string }[]).map(({ key, label, active, inactive }) => (
                <button key={key} type="button"
                  onClick={() => switchDirection(key)}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    direction === key ? `${active} text-white shadow-sm` : `text-gray-500 ${inactive}`
                  }`}>
                  {label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {formData.type === 'paiement' && formData.occurrence_type === 'recurrent'
                    ? t('transactions.dateStart')
                    : t('transactions.dateLabel')}
                </label>
                <input type="date" required value={formData.date}
                  onChange={e => set({ date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e]" />
              </div>

              {/* Type — filtré par direction */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('transactions.typeLabel')}</label>
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
                  {direction === 'revenu' && <>
                    <option value="investissement">{t('transactionType.investment')}</option>
                    <option value="loyer">{t('transactions.typeLoyer')}</option>
                    <option value="loyer_locatif">{t('transactions.typeLoyerLocatif')}</option>
                    <option value="revenu">{t('transactions.typeRevenu')}</option>
                    <option value="dividende">{t('transactionType.dividend')}</option>
                  </>}
                  {direction === 'depense' && <>
                    <option value="paiement">{t('transactionType.payment')}</option>
                    <option value="depense">{t('transactionType.expense')}</option>
                    <option value="capex">{t('transactions.typeCapex')}</option>
                    <option value="maintenance">{t('transactions.typeMaintenance')}</option>
                    <option value="admin">{t('transactions.typeAdmin')}</option>
                    <option value="remboursement_investisseur">{t('transactions.typeRemboursement')}</option>
                  </>}
                  {direction === 'neutre' && <>
                    <option value="transfert">{t('transactions.typeTransfertFull')}</option>
                  </>}
                </select>
              </div>
            </div>

            {/* ── Revenu locatif : compte destination ── */}
            {formData.type === 'loyer_locatif' && (
              <div className="p-4 bg-teal-50 border border-teal-200 rounded-lg">
                <label className="block text-sm font-medium text-teal-800 mb-3">
                  {t('transactions.destinationAccount')}
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
                      {acc === 'compte_courant' ? `🏢 ${t('transactions.compteCourant')}` : `🏗️ ${t('transactions.typeCapex')}`}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── Paiement : unique / récurrent ── */}
            {formData.type === 'paiement' && (
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg space-y-4">
                <div>
                  <label className="block text-sm font-medium text-orange-800 mb-2">{t('transactions.occurrence')}</label>
                  <div className="grid grid-cols-2 gap-3">
                    {(['unique', 'recurrent'] as const).map(occ => (
                      <button key={occ} type="button"
                        onClick={() => set({ occurrence_type: occ })}
                        className={`p-3 border-2 rounded-lg text-sm font-medium transition-all ${
                          formData.occurrence_type === occ
                            ? 'border-orange-500 bg-orange-100 text-orange-800'
                            : 'border-gray-300 hover:border-orange-300 text-gray-700'
                        }`}>
                        {occ === 'unique'
                          ? `1️⃣ ${t('transactions.occurrenceUnique')}`
                          : `🔄 ${t('transactions.occurrenceRecurrent')}`}
                      </button>
                    ))}
                  </div>
                </div>

                {formData.occurrence_type === 'recurrent' && (
                  <div className="space-y-3 pt-2 border-t border-orange-200">
                    <div>
                      <label className="block text-sm font-medium text-orange-800 mb-2">{t('transactions.frequency')}</label>
                      <select required value={formData.recurrence_frequency ?? ''}
                        onChange={e => set({ recurrence_frequency: e.target.value as any })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 bg-white">
                        <option value="">{t('transactions.freqChoose')}</option>
                        <option value="quotidien">{t('transactions.freqQuotidien')}</option>
                        <option value="hebdomadaire">{t('transactions.freqHebdomadaire')}</option>
                        <option value="mensuel">{t('transactions.freqMensuel')}</option>
                        <option value="trimestriel">{t('transactions.freqTrimestriel')}</option>
                        <option value="annuel">{t('transactions.freqAnnuel')}</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-orange-800 mb-2">{t('transactions.endDate')}</label>
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
                          {t('transactions.noEnd')}
                        </label>
                      </div>
                    </div>
                    {previewCount !== null && (
                      <p className="text-sm text-orange-700 font-medium">
                        {fr ? 'Aperçu :' : 'Preview:'} <strong>{previewCount}</strong> {fr ? 'transaction(s) seront créées' : 'transaction(s) will be created'}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── Transfert : source / destination ── */}
            {formData.type === 'transfert' && (
              <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                <label className="block text-sm font-medium text-indigo-800 mb-3">{t('transactions.sourceAccount')}</label>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  {(['compte_courant', 'capex'] as const).map(acc => (
                    <button key={acc} type="button"
                      onClick={() => set({ transfer_source: acc })}
                      className={`p-3 border-2 rounded-lg text-sm font-medium transition-all ${
                        formData.transfer_source === acc
                          ? 'border-indigo-500 bg-indigo-100 text-indigo-800'
                          : 'border-gray-300 hover:border-indigo-300 text-gray-700'
                      }`}>
                      {acc === 'compte_courant' ? `🏢 ${t('transactions.compteCourant')}` : `🏗️ ${t('transactions.typeCapex')}`}
                    </button>
                  ))}
                </div>
                {formData.transfer_source && (
                  <p className="text-sm text-indigo-700">
                    {t('transactions.toAccount')} <strong>{transferDest}</strong>
                  </p>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Montant avec indicateur de signe */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('transactions.amountLabel')}</label>
                <div className="relative">
                  <span className={`absolute left-3 top-1/2 -translate-y-1/2 font-bold text-base select-none ${
                    direction === 'revenu' ? 'text-green-600' : direction === 'depense' ? 'text-red-600' : 'text-indigo-600'
                  }`}>
                    {direction === 'revenu' ? '+' : direction === 'depense' ? '−' : '↔'}
                  </span>
                  <input type="text" inputMode="decimal" required
                    value={formData.amount || ''}
                    onFocus={e => { if (!formData.amount || formData.amount === 0) e.target.select() }}
                    onChange={e => {
                      const v = e.target.value.replace(/,/g, '.')
                      const n = parseFloat(v)
                      set({ amount: isNaN(n) ? 0 : Math.abs(n) })
                    }}
                    placeholder={fr ? 'Ex: 1 500,00' : 'E.g. 1500.00'}
                    className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e]" />
                </div>
              </div>

              {/* Catégorie — filtrée par direction, masquée pour neutre/transfert */}
              {direction !== 'neutre' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('transactions.categoryLabel')}</label>
                  <select required value={formData.category}
                    onChange={e => set({ category: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] bg-white">
                    {direction === 'revenu' ? <>
                      <option value="capital">{t('category.capital')}</option>
                      <option value="operation">{t('category.operation')}</option>
                    </> : <>
                      <option value="operation">{t('category.operation')}</option>
                      <option value="maintenance">{t('category.maintenance')}</option>
                      <option value="admin">{t('category.admin')}</option>
                      <option value="capital">{t('category.capital')}</option>
                    </>}
                  </select>
                </div>
              )}

              {/* Méthode paiement */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('transactions.paymentMethodLabel')}</label>
                <select required value={formData.payment_method}
                  onChange={e => set({ payment_method: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] bg-white">
                  <option value="virement">{t('paymentMethod.transfer')}</option>
                  <option value="cheque">{t('paymentMethod.check')}</option>
                  <option value="especes">{t('paymentMethod.cash')}</option>
                  <option value="carte">{t('paymentMethod.card')}</option>
                </select>
              </div>

              {/* Statut */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('transactions.statusLabel')}</label>
                <select required value={formData.status}
                  onChange={e => set({ status: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] bg-white">
                  <option value="complete">{t('status.complete')}</option>
                  <option value="pending">{t('status.pending')}</option>
                  <option value="cancelled">{t('status.cancelled')}</option>
                </select>
              </div>

              {/* Investisseur (masqué pour transfert) */}
              {formData.type !== 'transfert' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('transactions.investor')}</label>
                  <select value={formData.investor_id ?? ''}
                    onChange={e => set({ investor_id: e.target.value || null })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] bg-white">
                    <option value="">{t('transactions.noInvestor')}</option>
                    {investors.map(inv => (
                      <option key={inv.id} value={inv.id}>{inv.first_name} {inv.last_name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Propriété */}
              {formData.type !== 'transfert' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('transactions.property')}</label>
                  <select value={formData.property_id ?? ''}
                    onChange={e => set({ property_id: e.target.value || null })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] bg-white">
                    <option value="">{t('transactions.noProperty')}</option>
                    {properties.map(prop => (
                      <option key={prop.id} value={prop.id}>{prop.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Description */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('transactions.descriptionLabel')}</label>
                <textarea required rows={2} value={formData.description}
                  onChange={e => set({ description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] resize-none min-h-[72px] max-h-[120px]" />
              </div>

              {/* ── Devise étrangère (si propriété hors Canada) ── */}
              {(() => {
                const linkedProp = formData.property_id ? properties.find(p => p.id === formData.property_id) as any : null
                const cc = linkedProp?.country_code
                const countyCode = linkedProp?.county_code
                const isRentalIncome = ['loyer', 'loyer_locatif', 'revenu'].includes(formData.type)
                const isInternational = cc && cc !== 'CA'
                const tdtRate = countyCode ? (FL_TDT_RATES[countyCode] ?? null) : null
                const isShortTermFL = formData.rental_duration_days != null && formData.rental_duration_days <= FL_SHORT_TERM_DAYS
                const isShortTermDR = formData.rental_duration_days != null && formData.rental_duration_days <= DR_SHORT_TERM_DAYS
                const tdtAmount = (isShortTermFL && tdtRate && formData.amount > 0) ? Math.round(formData.amount * tdtRate / 100 * 100) / 100 : null
                const itbisAmount = (cc === 'DO' && isShortTermDR && formData.amount > 0) ? Math.round(formData.amount * DR_ITBIS_RATE / 100 * 100) / 100 : null
                const flStateTax = (isShortTermFL && formData.amount > 0) ? Math.round(formData.amount * 6 / 100 * 100) / 100 : null
                if (!isInternational && !isRentalIncome) return null
                return (
                  <div className="md:col-span-2 p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
                    <p className="text-sm font-semibold text-blue-800">
                      {cc === 'US' ? '🇺🇸 Fiscal USA' : cc === 'DO' ? '🇩🇴 Fiscal République Dominicaine' : cc === 'MX' ? '🇲🇽 Fiscal Mexique' : '🌎 Fiscal international'}
                      {linkedProp?.name && <span className="text-blue-600 font-normal ml-2">— {linkedProp.name}</span>}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          {fr ? 'Devise d\'origine' : 'Source currency'}
                        </label>
                        <select value={formData.source_currency ?? ''}
                          onChange={e => set({ source_currency: e.target.value || null })}
                          className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-400">
                          <option value="">CAD (par défaut)</option>
                          <option value="USD">USD — Dollar américain</option>
                          <option value="DOP">DOP — Peso dominicain</option>
                          <option value="MXN">MXN — Peso mexicain</option>
                          <option value="EUR">EUR — Euro</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          {fr ? 'Montant devise d\'origine' : 'Amount in source currency'}
                        </label>
                        <input type="number" step="0.01"
                          value={formData.source_amount ?? ''}
                          onChange={e => set({ source_amount: e.target.value ? parseFloat(e.target.value) : null })}
                          placeholder={fr ? '0.00' : '0.00'}
                          className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          {fr ? 'Impôt étranger payé (T2209)' : 'Foreign tax paid (T2209)'}
                        </label>
                        <input type="number" step="0.01"
                          value={formData.foreign_tax_paid ?? ''}
                          onChange={e => set({ foreign_tax_paid: e.target.value ? parseFloat(e.target.value) : null })}
                          placeholder={fr ? 'Impôt payé à l\'étranger' : 'Tax paid abroad'}
                          className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400" />
                        <p className="text-xs text-gray-400 mt-0.5">{fr ? 'Pour crédit T2209 / ligne 40500' : 'For T2209 credit / line 40500'}</p>
                      </div>
                    </div>

                    {/* Durée location pour calcul Sales Tax / ITBIS */}
                    {isRentalIncome && (cc === 'US' || cc === 'DO') && (
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          {fr ? 'Durée de la location (jours)' : 'Rental duration (days)'}
                          <span className="text-gray-400 ml-1">
                            {cc === 'US' ? `Court terme ≤ ${FL_SHORT_TERM_DAYS}j → Sales Tax + TDT applicables` : `Court terme ≤ ${DR_SHORT_TERM_DAYS}j → ITBIS 18% applicable`}
                          </span>
                        </label>
                        <input type="number" min="1" max="365"
                          value={formData.rental_duration_days ?? ''}
                          onChange={e => set({ rental_duration_days: e.target.value ? parseInt(e.target.value) : null })}
                          placeholder={fr ? 'Ex: 7 (1 semaine)' : 'E.g. 7 (1 week)'}
                          className="w-full sm:w-32 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400" />
                      </div>
                    )}

                    {/* Alerte TDT Florida */}
                    {cc === 'US' && isRentalIncome && (
                      <div className={`rounded-lg p-3 text-xs ${isShortTermFL && tdtRate ? 'bg-amber-50 border border-amber-200' : 'bg-gray-50 border border-gray-200'}`}>
                        {isShortTermFL && tdtRate ? (
                          <div className="space-y-1">
                            <p className="font-semibold text-amber-800">⚠️ Florida — Taxes applicables (location court terme)</p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                              <div className="bg-white rounded p-2 text-center">
                                <p className="text-gray-500">State Sales Tax</p>
                                <p className="font-bold text-orange-700">{flStateTax != null ? `${flStateTax.toFixed(2)} $` : '—'}</p>
                                <p className="text-gray-400">6% (DR-15)</p>
                              </div>
                              <div className="bg-white rounded p-2 text-center">
                                <p className="text-gray-500">TDT {countyCode?.replace('FL-', '')}</p>
                                <p className="font-bold text-red-700">{tdtAmount != null ? `${tdtAmount.toFixed(2)} $` : '—'}</p>
                                <p className="text-gray-400">{tdtRate}% (mensuel)</p>
                              </div>
                              <div className="bg-orange-50 rounded p-2 text-center">
                                <p className="text-gray-500">Total taxes</p>
                                <p className="font-bold text-orange-900">
                                  {flStateTax != null && tdtAmount != null ? `${(flStateTax + tdtAmount).toFixed(2)} $` : '—'}
                                </p>
                                <p className="text-gray-400">{6 + (tdtRate || 0)}%</p>
                              </div>
                            </div>
                            <p className="text-amber-700 mt-1">DR-15 (Sales Tax) → déclaration mensuelle/trimestrielle à l'État. TDT → déclaration mensuelle au comté.</p>
                          </div>
                        ) : (
                          <p className="text-gray-500">
                            {fr ? `Entrez la durée de location pour voir les taxes applicables (Sales Tax État 6% + TDT comté ${tdtRate ?? '?'}%)` : `Enter rental duration to see applicable taxes`}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Alerte ITBIS République Dominicaine */}
                    {cc === 'DO' && isRentalIncome && (
                      <div className={`rounded-lg p-3 text-xs ${isShortTermDR && itbisAmount ? 'bg-amber-50 border border-amber-200' : 'bg-gray-50 border border-gray-200'}`}>
                        {isShortTermDR && itbisAmount ? (
                          <div className="space-y-1">
                            <p className="font-semibold text-amber-800">⚠️ République Dominicaine — ITBIS applicable</p>
                            <div className="grid grid-cols-2 gap-2 mt-2">
                              <div className="bg-white rounded p-2 text-center">
                                <p className="text-gray-500">ITBIS 18%</p>
                                <p className="font-bold text-red-700">{itbisAmount.toFixed(2)} $</p>
                                <p className="text-gray-400">Location touristique court terme</p>
                              </div>
                              <div className="bg-blue-50 rounded p-2 text-center">
                                <p className="text-gray-500">Confotur</p>
                                <p className="font-bold text-blue-700">{(linkedProp as any)?.confotur_certification_date ? '✅ Exonéré' : '❌ Vérifier'}</p>
                                <p className="text-gray-400">Loi 158-01 (si certifié)</p>
                              </div>
                            </div>
                            <p className="text-amber-700 mt-1">ITBIS à déclarer mensuellement à la DGII. Si propriété Confotur certifiée : exonération possible.</p>
                          </div>
                        ) : (
                          <p className="text-gray-500">
                            {fr ? `Entrez la durée de location pour voir si ITBIS 18% s'applique (court terme ≤ ${DR_SHORT_TERM_DAYS} nuits)` : `Enter rental duration to check if ITBIS 18% applies`}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Alerte IRNR République Dominicaine (retenue 27% non-résidents) */}
                    {cc === 'DO' && isRentalIncome && !(linkedProp as any)?.is_confotur && (
                      (() => {
                        const irnrEstimate = formData.amount > 0 ? Math.round(formData.amount * 0.27 * 100) / 100 : null
                        const hasForeignTax = (formData.foreign_tax_paid ?? 0) > 0
                        return (
                          <div className={`rounded-lg p-3 text-xs ${!hasForeignTax && irnrEstimate ? 'bg-rose-50 border border-rose-200' : 'bg-green-50 border border-green-200'}`}>
                            {!hasForeignTax && irnrEstimate ? (
                              <div className="space-y-1">
                                <p className="font-semibold text-rose-800">🏛️ IRNR — Retenue non-résidents (27%) estimée</p>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                                  <div className="bg-white rounded p-2 text-center">
                                    <p className="text-gray-500">Revenu brut</p>
                                    <p className="font-bold text-gray-800">{formData.amount.toFixed(2)} $</p>
                                  </div>
                                  <div className="bg-white rounded p-2 text-center">
                                    <p className="text-gray-500">IRNR 27%</p>
                                    <p className="font-bold text-rose-700">{irnrEstimate.toFixed(2)} $</p>
                                    <p className="text-gray-400">Retenu par locataire</p>
                                  </div>
                                  <div className="bg-rose-100 rounded p-2 text-center">
                                    <p className="text-gray-500">Net reçu</p>
                                    <p className="font-bold text-rose-900">{(formData.amount - irnrEstimate).toFixed(2)} $</p>
                                  </div>
                                </div>
                                <p className="text-rose-700 mt-1">Retenu mensuellement par le locataire → versé à la DGII. Saisissez le montant retenu dans « Impôt étranger payé » pour crédit T2209.</p>
                              </div>
                            ) : (
                              <p className="text-green-700 font-medium">
                                ✅ IRNR — Impôt étranger saisi ({(formData.foreign_tax_paid ?? 0).toFixed(2)} $) → crédit T2209 applicable
                              </p>
                            )}
                          </div>
                        )
                      })()
                    )}
                  </div>
                )
              })()}

              {/* Référence */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('transactions.referenceLabel')}</label>
                <input type="text" value={formData.reference_number}
                  onChange={e => set({ reference_number: e.target.value })}
                  placeholder={fr ? 'Ex: TRX-2025-001' : 'E.g. TRX-2025-001'}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e]" />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button type="submit" disabled={saving || loading}
                className="bg-[#5e5e5e] hover:bg-[#3e3e3e] text-white px-6 py-2 rounded-full transition-colors disabled:opacity-50">
                {saving
                  ? t('common.saving')
                  : editingId
                    ? t('common.edit')
                    : (formData.type === 'paiement' && formData.occurrence_type === 'recurrent')
                      ? (fr ? `Créer ${previewCount ?? '?'} paiement(s)` : `Create ${previewCount ?? '?'} payment(s)`)
                      : t('common.add')}
              </button>
              <button type="button" onClick={resetForm}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-2 rounded-full transition-colors">
                {t('common.cancel')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Liste des transactions ── */}
      {filteredTransactions.length === 0 ? (
        <div className="bg-white p-12 rounded-lg shadow-md text-center">
          <DollarSign size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('transactions.noTransactions')}</h3>
          <p className="text-gray-600">
            {filterType !== 'all' || filterCategory !== 'all'
              ? t('transactions.noMatch')
              : t('transactions.addFirst')}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('transactions.date')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('transactions.type')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('transactions.description')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('transactions.amount')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('transactions.status')}</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('common.actions')}</th>
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
                          {new Date(transaction.date).toLocaleDateString(dateLocale)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">{getTypeBadge(transaction.type)}</td>
                      <td className="px-6 py-4 max-w-[220px]">
                        {/* Description tronquée + tooltip complet au survol */}
                        <div className="group relative">
                          <div
                            className="text-sm font-medium text-gray-900 truncate cursor-default"
                            title={transaction.description}
                          >
                            {transaction.description}
                          </div>
                          <div className="pointer-events-none absolute left-0 top-full z-30 mt-1 hidden w-72 rounded-lg bg-gray-900 px-3 py-2 text-xs text-white shadow-xl group-hover:block whitespace-normal break-words">
                            {transaction.description}
                          </div>
                        </div>
                        {investor && <div className="text-xs text-gray-500 truncate mt-0.5">{t('transactions.investorRow')} {investor.first_name} {investor.last_name}</div>}
                        {property && <div className="text-xs text-gray-500 truncate">{t('transactions.propertyRow')} {property.name}</div>}
                        {(transaction as any).target_account && (
                          <div className="text-xs text-teal-600 truncate">
                            {t('transactions.toRow')} {(transaction as any).target_account === 'compte_courant' ? t('transactions.compteCourant') : t('transactions.typeCapex')}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`flex items-center gap-1 text-sm font-semibold ${
                          isInflow ? 'text-green-600' : transaction.type === 'transfert' ? 'text-indigo-600' : 'text-red-600'
                        }`}>
                          {getTypeIcon(transaction.type)}
                          {Math.abs(transaction.amount).toLocaleString(dateLocale, { style: 'currency', currency: 'CAD' })}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          transaction.status === 'complete' ? 'bg-green-100 text-green-800' :
                          transaction.status === 'pending'  ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {transaction.status === 'complete' ? t('status.complete') :
                           transaction.status === 'pending'  ? t('status.pending') : t('status.cancelled')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => handleEdit(transaction)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded" title={t('common.edit')}>
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => handleDelete(transaction.id, transaction.description)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded" title={t('common.delete')}>
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
