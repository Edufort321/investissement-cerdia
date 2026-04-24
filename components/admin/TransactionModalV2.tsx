'use client'

import { useState, useEffect } from 'react'
import { X, AlertCircle, DollarSign, TrendingUp, TrendingDown, Building, User, CreditCard, AlertTriangle, ArrowLeftRight } from 'lucide-react'
import { useInvestment } from '@/contexts/InvestmentContext'
import { useExchangeRate } from '@/contexts/ExchangeRateContext'
import TransactionAttachmentsManager from './TransactionAttachmentsManager'

type TransactionFlowType = 'inflow' | 'outflow' | 'transfert'
type PaymentSource = 'compte_courant' | 'investisseur_direct'
type InvestorPaymentType = 'achat_parts' | 'dette_a_rembourser'

type TransactionCategoryInflow = 'investissement' | 'loyer' | 'loyer_locatif' | 'dividende' | 'revenu'
type TransactionCategoryOutflow = 'achat_propriete' | 'admin' | 'capex' | 'maintenance' | 'depense' | 'remboursement_investisseur' | 'paiement'

interface TransactionFormData {
  id?: string // Pour mode édition
  date: string
  flowType: TransactionFlowType
  category: TransactionCategoryInflow | TransactionCategoryOutflow | ''
  amount: number // Toujours positif dans l'UI
  description: string
  investor_id: string | null
  property_id: string | null
  status: 'pending' | 'complete' | 'cancelled'
  notes: string

  // NOUVEAUX CHAMPS: Source du paiement
  payment_source: PaymentSource
  investor_payment_type: InvestorPaymentType | null
  affects_compte_courant: boolean

  // Champs pour remboursement en parts
  reimbursement_in_shares: boolean
  shares_returned: number

  // Champs de devise
  source_currency: 'CAD' | 'USD'
  source_amount: number | null
  exchange_rate: number
  bank_fees: number

  // Nouveau: compte de destination (loyer_locatif)
  target_account: 'compte_courant' | 'capex' | null

  // Nouveau: occurrence paiement récurrent
  occurrence_type: 'unique' | 'recurrent'
  recurrence_frequency: 'quotidien' | 'hebdomadaire' | 'mensuel' | 'trimestriel' | 'annuel' | null
  recurrence_end_date: string | null
  recurrence_no_end: boolean

  // Nouveau: transfert
  transfer_source: 'compte_courant' | 'capex' | null
}

interface TransactionModalV2Props {
  isOpen: boolean
  onClose: () => void
  transaction?: any // Si fourni = mode édition
  onSave: (transaction: any) => Promise<void>
}

// Helper: génère toutes les dates d'une récurrence
function generateDates(start: string, frequency: string, endDate: string | null): string[] {
  const dates: string[] = []
  const cur = new Date(start + 'T00:00:00')
  const end = endDate
    ? new Date(endDate + 'T00:00:00')
    : new Date(cur.getFullYear() + 2, cur.getMonth(), cur.getDate())
  while (cur <= end && dates.length < 500) {
    dates.push(cur.toISOString().split('T')[0])
    if (frequency === 'quotidien') cur.setDate(cur.getDate() + 1)
    else if (frequency === 'hebdomadaire') cur.setDate(cur.getDate() + 7)
    else if (frequency === 'mensuel') cur.setMonth(cur.getMonth() + 1)
    else if (frequency === 'trimestriel') cur.setMonth(cur.getMonth() + 3)
    else if (frequency === 'annuel') cur.setFullYear(cur.getFullYear() + 1)
  }
  return dates
}

export default function TransactionModalV2({ isOpen, onClose, transaction, onSave }: TransactionModalV2Props) {
  const { investors, properties, shareSettings } = useInvestment()
  const { rate: currentExchangeRate } = useExchangeRate()

  const [formData, setFormData] = useState<TransactionFormData>({
    date: new Date().toISOString().split('T')[0],
    flowType: 'inflow',
    category: '',
    amount: 0,
    description: '',
    investor_id: null,
    property_id: null,
    status: 'complete',
    notes: '',
    payment_source: 'compte_courant',
    investor_payment_type: null,
    affects_compte_courant: true,
    reimbursement_in_shares: false,
    shares_returned: 0,
    source_currency: 'CAD',
    source_amount: null,
    exchange_rate: 1.0,
    bank_fees: 0,
    target_account: null,
    occurrence_type: 'unique',
    recurrence_frequency: null,
    recurrence_end_date: null,
    recurrence_no_end: false,
    transfer_source: null
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [showAttachments, setShowAttachments] = useState(false)
  const [recurrentCreatedCount, setRecurrentCreatedCount] = useState<number | null>(null)

  // Catégories selon le type de flux
  const inflowCategories: { value: TransactionCategoryInflow; label: string; description: string }[] = [
    { value: 'investissement', label: 'Investissement', description: 'Investisseur achète des parts' },
    { value: 'loyer', label: 'Loyer', description: 'Revenus locatifs' },
    { value: 'loyer_locatif', label: 'Revenu locatif', description: 'Revenu locatif (loyer + compte dest.)' },
    { value: 'revenu', label: 'Revenu', description: 'Revenu général' },
    { value: 'dividende', label: 'Dividende', description: 'Distribution de profits' }
  ]

  const outflowCategories: { value: TransactionCategoryOutflow; label: string; description: string }[] = [
    { value: 'achat_propriete', label: 'Achat propriété', description: 'Achat de propriété immobilière' },
    { value: 'admin', label: 'Administratif', description: 'Frais avocat, fiscalité, NEQ' },
    { value: 'capex', label: 'CAPEX', description: 'Amélioration propriété' },
    { value: 'maintenance', label: 'Maintenance', description: 'Entretien propriété' },
    { value: 'depense', label: 'Dépense générale', description: 'Autre dépense' },
    { value: 'paiement', label: 'Paiement', description: 'Paiement unique ou récurrent' },
    { value: 'remboursement_investisseur', label: 'Remboursement investisseur', description: 'Rembourser un investisseur' }
  ]

  // Initialiser le formulaire en mode édition
  useEffect(() => {
    if (transaction) {
      const flowType: TransactionFlowType =
        transaction.type === 'transfert'
          ? 'transfert'
          : transaction.amount >= 0
          ? 'inflow'
          : 'outflow'

      setFormData({
        id: transaction.id,
        date: transaction.date?.split('T')[0] || new Date().toISOString().split('T')[0],
        flowType,
        category: transaction.type === 'transfert' ? '' : (transaction.type || ''),
        amount: Math.abs(transaction.amount || 0),
        description: transaction.description || '',
        investor_id: transaction.investor_id || null,
        property_id: transaction.property_id || null,
        status: transaction.status || 'complete',
        notes: transaction.notes || '',
        payment_source: transaction.payment_source || 'compte_courant',
        investor_payment_type: transaction.investor_payment_type || null,
        affects_compte_courant: transaction.affects_compte_courant !== undefined ? transaction.affects_compte_courant : true,
        reimbursement_in_shares: transaction.reimbursement_in_shares || false,
        shares_returned: transaction.shares_returned || 0,
        source_currency: transaction.source_currency || 'CAD',
        source_amount: transaction.source_amount || null,
        exchange_rate: transaction.exchange_rate || 1.0,
        bank_fees: transaction.bank_fees || 0,
        target_account: transaction.target_account || null,
        occurrence_type: 'unique',
        recurrence_frequency: null,
        recurrence_end_date: null,
        recurrence_no_end: false,
        transfer_source: transaction.transfer_source || null
      })
      setShowAttachments(true)
    } else {
      resetForm()
    }
  }, [transaction])

  // Mettre à jour le taux de change quand USD est sélectionné
  useEffect(() => {
    if (formData.source_currency === 'USD' && currentExchangeRate) {
      setFormData(prev => ({
        ...prev,
        exchange_rate: currentExchangeRate
      }))
    }
  }, [formData.source_currency, currentExchangeRate])

  // Auto-gérer affects_compte_courant selon payment_source
  useEffect(() => {
    if (formData.payment_source === 'investisseur_direct' && formData.investor_payment_type === 'achat_parts') {
      setFormData(prev => ({ ...prev, affects_compte_courant: false }))
    } else if (formData.payment_source === 'investisseur_direct' && formData.investor_payment_type === 'dette_a_rembourser') {
      setFormData(prev => ({ ...prev, affects_compte_courant: false }))
    } else {
      setFormData(prev => ({ ...prev, affects_compte_courant: true }))
    }
  }, [formData.payment_source, formData.investor_payment_type])

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      flowType: 'inflow',
      category: '',
      amount: 0,
      description: '',
      investor_id: null,
      property_id: null,
      status: 'complete',
      notes: '',
      payment_source: 'compte_courant',
      investor_payment_type: null,
      affects_compte_courant: true,
      reimbursement_in_shares: false,
      shares_returned: 0,
      source_currency: 'CAD',
      source_amount: null,
      exchange_rate: 1.0,
      bank_fees: 0,
      target_account: null,
      occurrence_type: 'unique',
      recurrence_frequency: null,
      recurrence_end_date: null,
      recurrence_no_end: false,
      transfer_source: null
    })
    setErrors({})
    setShowAttachments(false)
    setRecurrentCreatedCount(null)
  }

  const handleFlowTypeChange = (flowType: TransactionFlowType) => {
    setFormData(prev => ({
      ...prev,
      flowType,
      category: '',
      property_id: null,
      investor_id: null,
      reimbursement_in_shares: false,
      shares_returned: 0,
      target_account: null,
      occurrence_type: 'unique',
      recurrence_frequency: null,
      recurrence_end_date: null,
      recurrence_no_end: false,
      transfer_source: null
    }))
    setRecurrentCreatedCount(null)
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.date) newErrors.date = 'Date requise'
    if (formData.amount <= 0) newErrors.amount = 'Montant doit être supérieur à 0'
    if (!formData.description.trim()) newErrors.description = 'Description requise'

    // Validation spécifique au type transfert
    if (formData.flowType === 'transfert') {
      if (!formData.transfer_source) newErrors.transfer_source = 'Compte source requis pour un transfert'
      setErrors(newErrors)
      return Object.keys(newErrors).length === 0
    }

    if (!formData.category) newErrors.category = 'Catégorie requise'

    // Validation spécifique selon la catégorie
    if (formData.category === 'investissement' && !formData.investor_id) {
      newErrors.investor_id = 'Investisseur requis pour un investissement'
    }

    if (formData.category === 'remboursement_investisseur' && !formData.investor_id) {
      newErrors.investor_id = 'Investisseur requis pour un remboursement'
    }

    if (formData.category === 'achat_propriete' && !formData.property_id) {
      newErrors.property_id = 'Propriété requise pour un achat'
    }

    if (formData.reimbursement_in_shares && formData.shares_returned <= 0) {
      newErrors.shares_returned = 'Nombre de parts requis pour un remboursement en parts'
    }

    // Validation source paiement
    if (formData.payment_source === 'investisseur_direct' && !formData.investor_payment_type) {
      newErrors.investor_payment_type = 'Type de paiement investisseur requis'
    }

    if (formData.payment_source === 'investisseur_direct' && !formData.investor_id) {
      newErrors.investor_id = 'Investisseur requis pour un paiement direct'
    }

    // Validation loyer_locatif
    if (formData.category === 'loyer_locatif' && !formData.target_account) {
      newErrors.target_account = 'Compte de destination requis pour un revenu locatif'
    }

    // Validation récurrence
    if (formData.category === 'paiement' && formData.flowType === 'outflow' && formData.occurrence_type === 'recurrent') {
      if (!formData.recurrence_frequency) {
        newErrors.recurrence_frequency = 'Fréquence requise pour un paiement récurrent'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) return

    setSaving(true)
    try {
      // --- CAS TRANSFERT ---
      if (formData.flowType === 'transfert') {
        const dest = formData.transfer_source === 'compte_courant' ? 'capex' : 'compte_courant'
        await onSave({
          date: formData.date,
          type: 'transfert',
          amount: formData.amount,
          description: formData.description,
          status: formData.status,
          notes: formData.notes || undefined,
          transfer_source: formData.transfer_source,
          target_account: dest,
          source_currency: formData.source_currency,
          exchange_rate: formData.exchange_rate,
          bank_fees: formData.bank_fees || 0,
          ...(formData.id ? { id: formData.id } : {})
        })
        resetForm()
        onClose()
        return
      }

      // Calculer le montant final avec le bon signe
      const finalAmount = formData.flowType === 'inflow' ? formData.amount : -formData.amount

      // Données de base communes
      const baseData: any = {
        date: formData.date,
        type: formData.category,
        amount: finalAmount,
        description: formData.description,
        investor_id: formData.investor_id || undefined,
        property_id: formData.property_id || undefined,
        status: formData.status,
        notes: formData.notes || undefined,
        payment_source: formData.payment_source,
        investor_payment_type: formData.investor_payment_type || undefined,
        affects_compte_courant: formData.affects_compte_courant,
        reimbursement_in_shares: formData.reimbursement_in_shares,
        shares_returned: formData.shares_returned || 0,
        source_currency: formData.source_currency,
        source_amount: formData.source_amount || undefined,
        exchange_rate: formData.exchange_rate,
        bank_fees: formData.bank_fees || 0,
        target_account: formData.target_account || undefined
      }

      if (formData.id) {
        baseData.id = formData.id
      }

      // --- CAS PAIEMENT RÉCURRENT ---
      if (
        formData.flowType === 'outflow' &&
        formData.category === 'paiement' &&
        formData.occurrence_type === 'recurrent' &&
        formData.recurrence_frequency
      ) {
        const dates = generateDates(
          formData.date,
          formData.recurrence_frequency,
          formData.recurrence_no_end ? null : formData.recurrence_end_date
        )
        for (const d of dates) {
          await onSave({ ...baseData, date: d })
        }
        setRecurrentCreatedCount(dates.length)
        resetForm()
        onClose()
        return
      }

      // --- CAS NORMAL ---
      await onSave(baseData)
      resetForm()
      onClose()
    } catch (error: any) {
      alert('Erreur lors de la sauvegarde: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  // Calculer les parts automatiquement pour un investissement
  const calculatedShares = formData.category === 'investissement' && shareSettings
    ? Math.floor(formData.amount / shareSettings.nominal_share_value)
    : 0

  // Dériver le compte destination pour transfert
  const transferDest = formData.transfer_source === 'compte_courant'
    ? 'CAPEX'
    : formData.transfer_source === 'capex'
    ? 'Compte courant'
    : '—'

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full my-8">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between rounded-t-lg">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {transaction ? '✏️ Modifier la transaction' : '➕ Nouvelle transaction'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <X size={24} className="text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Confirmation récurrence */}
        {recurrentCreatedCount !== null && (
          <div className="mx-6 mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-sm text-green-800 dark:text-green-300">
              ✅ <strong>{recurrentCreatedCount} transaction(s) récurrente(s)</strong> créées avec succès.
            </p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">

          {/* Type de flux : 3 boutons */}
          <div className="border-2 border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-700/50">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              💰 Type de transaction <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => handleFlowTypeChange('inflow')}
                className={`p-5 border-2 rounded-lg transition-all ${
                  formData.flowType === 'inflow'
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/30 shadow-lg'
                    : 'border-gray-300 dark:border-gray-600 hover:border-green-300 hover:shadow'
                }`}
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  <TrendingUp className="text-green-600" size={28} />
                  <span className="text-2xl">➕</span>
                </div>
                <div className="font-bold text-base text-gray-900 dark:text-gray-100">Entrée (+)</div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Augmente le compte courant</div>
              </button>

              <button
                type="button"
                onClick={() => handleFlowTypeChange('outflow')}
                className={`p-5 border-2 rounded-lg transition-all ${
                  formData.flowType === 'outflow'
                    ? 'border-red-500 bg-red-50 dark:bg-red-900/30 shadow-lg'
                    : 'border-gray-300 dark:border-gray-600 hover:border-red-300 hover:shadow'
                }`}
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  <TrendingDown className="text-red-600" size={28} />
                  <span className="text-2xl">➖</span>
                </div>
                <div className="font-bold text-base text-gray-900 dark:text-gray-100">Sortie (-)</div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Diminue le compte courant</div>
              </button>

              <button
                type="button"
                onClick={() => handleFlowTypeChange('transfert')}
                className={`p-5 border-2 rounded-lg transition-all ${
                  formData.flowType === 'transfert'
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 shadow-lg'
                    : 'border-gray-300 dark:border-gray-600 hover:border-indigo-300 hover:shadow'
                }`}
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  <ArrowLeftRight className="text-indigo-600" size={28} />
                </div>
                <div className="font-bold text-base text-gray-900 dark:text-gray-100">Transfert ↔</div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">Entre compte courant et CAPEX</div>
              </button>
            </div>
          </div>

          {/* ===== SECTION TRANSFERT ===== */}
          {formData.flowType === 'transfert' && (
            <div className="border-2 border-indigo-300 dark:border-indigo-700 rounded-lg p-4 bg-indigo-50 dark:bg-indigo-900/20 space-y-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                🔄 Compte source <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, transfer_source: 'compte_courant' })}
                  className={`p-4 border-2 rounded-lg transition-all ${
                    formData.transfer_source === 'compte_courant'
                      ? 'border-indigo-500 bg-indigo-100 dark:bg-indigo-900/40 shadow-md'
                      : 'border-gray-300 dark:border-gray-600 hover:border-indigo-300'
                  }`}
                >
                  <div className="font-semibold text-gray-900 dark:text-gray-100">🏢 Compte courant</div>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, transfer_source: 'capex' })}
                  className={`p-4 border-2 rounded-lg transition-all ${
                    formData.transfer_source === 'capex'
                      ? 'border-indigo-500 bg-indigo-100 dark:bg-indigo-900/40 shadow-md'
                      : 'border-gray-300 dark:border-gray-600 hover:border-indigo-300'
                  }`}
                >
                  <div className="font-semibold text-gray-900 dark:text-gray-100">🏗️ CAPEX</div>
                </button>
              </div>
              {errors.transfer_source && <p className="text-red-500 text-sm">{errors.transfer_source}</p>}

              {formData.transfer_source && (
                <div className="mt-2 p-3 bg-white dark:bg-gray-800 border border-indigo-200 dark:border-indigo-700 rounded-lg">
                  <p className="text-sm text-indigo-800 dark:text-indigo-300">
                    <strong>De :</strong> {formData.transfer_source === 'compte_courant' ? 'Compte courant' : 'CAPEX'}
                    &nbsp;→&nbsp;
                    <strong>Vers :</strong> {transferDest}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ===== SECTION NORMALE (inflow / outflow) ===== */}
          {formData.flowType !== 'transfert' && (
            <>
              {/* Date — devient "Date de début" si récurrent */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  📅{' '}
                  {formData.flowType === 'outflow' &&
                  formData.category === 'paiement' &&
                  formData.occurrence_type === 'recurrent'
                    ? 'Date de début'
                    : 'Date'}{' '}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 ${
                    errors.date ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
                {errors.date && <p className="text-red-500 text-sm mt-1">{errors.date}</p>}
              </div>

              {/* Catégorie */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  📂 Catégorie <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({
                    ...formData,
                    category: e.target.value as any,
                    target_account: null,
                    occurrence_type: 'unique',
                    recurrence_frequency: null,
                    recurrence_end_date: null,
                    recurrence_no_end: false
                  })}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 ${
                    errors.category ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  <option value="">Sélectionner une catégorie</option>
                  {formData.flowType === 'inflow'
                    ? inflowCategories.map(cat => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label} - {cat.description}
                        </option>
                      ))
                    : outflowCategories.map(cat => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label} - {cat.description}
                        </option>
                      ))}
                </select>
                {errors.category && <p className="text-red-500 text-sm mt-1">{errors.category}</p>}
              </div>

              {/* === Occurrence toggle pour "paiement" outflow === */}
              {formData.flowType === 'outflow' && formData.category === 'paiement' && (
                <div className="border-2 border-orange-300 dark:border-orange-700 rounded-lg p-4 bg-orange-50 dark:bg-orange-900/20 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      🔁 Occurrence
                    </label>
                    <div className="flex gap-0 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600 w-fit">
                      <button
                        type="button"
                        onClick={() => setFormData({
                          ...formData,
                          occurrence_type: 'unique',
                          recurrence_frequency: null,
                          recurrence_end_date: null,
                          recurrence_no_end: false
                        })}
                        className={`px-5 py-2 text-sm font-medium transition-colors ${
                          formData.occurrence_type === 'unique'
                            ? 'bg-orange-500 text-white'
                            : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-orange-50 dark:hover:bg-orange-900/20'
                        }`}
                      >
                        Unique
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, occurrence_type: 'recurrent' })}
                        className={`px-5 py-2 text-sm font-medium transition-colors border-l border-gray-300 dark:border-gray-600 ${
                          formData.occurrence_type === 'recurrent'
                            ? 'bg-orange-500 text-white'
                            : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-orange-50 dark:hover:bg-orange-900/20'
                        }`}
                      >
                        Récurrent
                      </button>
                    </div>
                  </div>

                  {formData.occurrence_type === 'recurrent' && (
                    <>
                      {/* Fréquence */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          📆 Fréquence <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={formData.recurrence_frequency || ''}
                          onChange={(e) => setFormData({ ...formData, recurrence_frequency: e.target.value as any || null })}
                          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 ${
                            errors.recurrence_frequency ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                          }`}
                        >
                          <option value="">Sélectionner une fréquence</option>
                          <option value="quotidien">Quotidien</option>
                          <option value="hebdomadaire">Hebdomadaire</option>
                          <option value="mensuel">Mensuel</option>
                          <option value="trimestriel">Trimestriel</option>
                          <option value="annuel">Annuel</option>
                        </select>
                        {errors.recurrence_frequency && (
                          <p className="text-red-500 text-sm mt-1">{errors.recurrence_frequency}</p>
                        )}
                      </div>

                      {/* Date de fin */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          🏁 Date de fin
                        </label>
                        <div className="flex items-center gap-3 mb-2">
                          <input
                            type="checkbox"
                            id="recurrence_no_end"
                            checked={formData.recurrence_no_end}
                            onChange={(e) => setFormData({
                              ...formData,
                              recurrence_no_end: e.target.checked,
                              recurrence_end_date: e.target.checked ? null : formData.recurrence_end_date
                            })}
                            className="w-4 h-4 text-orange-500 rounded focus:ring-2 focus:ring-orange-400"
                          />
                          <label htmlFor="recurrence_no_end" className="text-sm text-gray-700 dark:text-gray-300">
                            Pas de fin (2 ans maximum)
                          </label>
                        </div>
                        {!formData.recurrence_no_end && (
                          <input
                            type="date"
                            value={formData.recurrence_end_date || ''}
                            onChange={(e) => setFormData({ ...formData, recurrence_end_date: e.target.value || null })}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                          />
                        )}
                      </div>

                      <div className="p-3 bg-orange-100 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 rounded-lg">
                        <p className="text-xs text-orange-800 dark:text-orange-300">
                          ⚠️ Une transaction séparée sera créée pour chaque occurrence (maximum 500).
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Source du paiement (masqué pour transfert — déjà géré, mais aussi pour dividende) */}
              {formData.category && formData.category !== 'dividende' && (
                <div className="border-2 border-blue-300 dark:border-blue-700 rounded-lg p-4 bg-blue-50 dark:bg-blue-900/20">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    💳 Qui paie cette transaction ? <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, payment_source: 'compte_courant', investor_payment_type: null })}
                      className={`p-4 border-2 rounded-lg transition-all ${
                        formData.payment_source === 'compte_courant'
                          ? 'border-blue-500 bg-blue-100 dark:bg-blue-900/40 shadow-md'
                          : 'border-gray-300 dark:border-gray-600 hover:border-blue-300'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <Building className="text-blue-600" size={24} />
                        <span className="text-2xl">🏢</span>
                      </div>
                      <div className="font-semibold text-gray-900 dark:text-gray-100">COMPTE COURANT</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">La société paie</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, payment_source: 'investisseur_direct' })}
                      className={`p-4 border-2 rounded-lg transition-all ${
                        formData.payment_source === 'investisseur_direct'
                          ? 'border-purple-500 bg-purple-100 dark:bg-purple-900/40 shadow-md'
                          : 'border-gray-300 dark:border-gray-600 hover:border-purple-300'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <User className="text-purple-600" size={24} />
                        <span className="text-2xl">👤</span>
                      </div>
                      <div className="font-semibold text-gray-900 dark:text-gray-100">INVESTISSEUR DIRECT</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">L'investisseur paie lui-même</div>
                    </button>
                  </div>

                  {/* Si investisseur direct : Type de paiement */}
                  {formData.payment_source === 'investisseur_direct' && (
                    <div className="mt-4 border-t-2 border-purple-200 dark:border-purple-800 pt-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        🔍 Type de paiement direct <span className="text-red-500">*</span>
                      </label>
                      <div className="grid grid-cols-2 gap-4">
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, investor_payment_type: 'achat_parts' })}
                          className={`p-4 border-2 rounded-lg transition-all ${
                            formData.investor_payment_type === 'achat_parts'
                              ? 'border-green-500 bg-green-100 dark:bg-green-900/40 shadow-md'
                              : 'border-gray-300 dark:border-gray-600 hover:border-green-300'
                          }`}
                        >
                          <div className="flex items-center justify-center gap-2 mb-2">
                            <CreditCard className="text-green-600" size={20} />
                            <span className="text-xl">💵</span>
                          </div>
                          <div className="font-semibold text-sm text-gray-900 dark:text-gray-100">ACHAT DE PARTS</div>
                          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                            L'investisseur achète directement des parts
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, investor_payment_type: 'dette_a_rembourser' })}
                          className={`p-4 border-2 rounded-lg transition-all ${
                            formData.investor_payment_type === 'dette_a_rembourser'
                              ? 'border-orange-500 bg-orange-100 dark:bg-orange-900/40 shadow-md'
                              : 'border-gray-300 dark:border-gray-600 hover:border-orange-300'
                          }`}
                        >
                          <div className="flex items-center justify-center gap-2 mb-2">
                            <AlertTriangle className="text-orange-600" size={20} />
                            <span className="text-xl">📝</span>
                          </div>
                          <div className="font-semibold text-sm text-gray-900 dark:text-gray-100">DETTE À REMBOURSER</div>
                          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                            Créer une dette envers l'investisseur
                          </div>
                        </button>
                      </div>
                      {errors.investor_payment_type && (
                        <p className="text-red-500 text-sm mt-2">{errors.investor_payment_type}</p>
                      )}

                      {formData.investor_payment_type === 'achat_parts' && (
                        <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                          <p className="text-sm text-green-800 dark:text-green-300">
                            ✅ <strong>Achat de parts direct</strong> : L'investisseur paie directement la dépense et reçoit des parts en échange.
                            Le compte courant n'est pas affecté.
                          </p>
                        </div>
                      )}

                      {formData.investor_payment_type === 'dette_a_rembourser' && (
                        <div className="mt-3 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                          <p className="text-sm text-orange-800 dark:text-orange-300">
                            ⚠️  <strong>Dette à rembourser</strong> : L'investisseur paie temporairement la dépense. Une dette est créée dans son profil.
                            La société devra le rembourser plus tard via le compte courant.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Montant */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  💵 Montant {formData.source_currency === 'CAD' ? '(CAD)' : '(USD)'} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.amount || ''}
                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 ${
                      errors.amount ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                    placeholder="0.00"
                  />
                </div>
                {errors.amount && <p className="text-red-500 text-sm mt-1">{errors.amount}</p>}
                <p className="text-xs text-gray-500 mt-1">
                  💡 Saisir le montant en positif. Le signe (+ ou -) sera ajouté automatiquement.
                </p>
              </div>

              {/* Devise et taux de change */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    💱 Devise source
                  </label>
                  <select
                    value={formData.source_currency}
                    onChange={(e) => setFormData({ ...formData, source_currency: e.target.value as 'CAD' | 'USD' })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                  >
                    <option value="CAD">🇨🇦 CAD</option>
                    <option value="USD">🇺🇸 USD</option>
                  </select>
                </div>

                {formData.source_currency === 'USD' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      🔄 Taux de change (USD → CAD)
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      min="0"
                      value={formData.exchange_rate || ''}
                      onChange={(e) => setFormData({ ...formData, exchange_rate: parseFloat(e.target.value) || 1 })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                      placeholder="1.35"
                    />
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  📝 Description <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 ${
                    errors.description ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="Ex: Investissement Jean Dupont - Achat parts"
                />
                {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
              </div>

              {/* Compte de destination — loyer_locatif */}
              {formData.category === 'loyer_locatif' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    🏦 Compte de destination <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, target_account: 'compte_courant' })}
                      className={`p-4 border-2 rounded-lg transition-all ${
                        formData.target_account === 'compte_courant'
                          ? 'border-blue-500 bg-blue-100 dark:bg-blue-900/40 shadow-md'
                          : 'border-gray-300 dark:border-gray-600 hover:border-blue-300'
                      }`}
                    >
                      <div className="font-semibold text-gray-900 dark:text-gray-100">🏢 Compte courant</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, target_account: 'capex' })}
                      className={`p-4 border-2 rounded-lg transition-all ${
                        formData.target_account === 'capex'
                          ? 'border-blue-500 bg-blue-100 dark:bg-blue-900/40 shadow-md'
                          : 'border-gray-300 dark:border-gray-600 hover:border-blue-300'
                      }`}
                    >
                      <div className="font-semibold text-gray-900 dark:text-gray-100">🏗️ CAPEX</div>
                    </button>
                  </div>
                  {errors.target_account && <p className="text-red-500 text-sm mt-2">{errors.target_account}</p>}
                </div>
              )}

              {/* Investisseur (conditionnel) */}
              {(formData.category === 'investissement' ||
                formData.category === 'remboursement_investisseur' ||
                formData.category === 'dividende' ||
                formData.payment_source === 'investisseur_direct') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    👤 Investisseur{' '}
                    {(formData.category === 'investissement' ||
                      formData.category === 'remboursement_investisseur' ||
                      formData.payment_source === 'investisseur_direct') && (
                      <span className="text-red-500">*</span>
                    )}
                  </label>
                  <select
                    value={formData.investor_id || ''}
                    onChange={(e) => setFormData({ ...formData, investor_id: e.target.value || null })}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 ${
                      errors.investor_id ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    <option value="">Sélectionner un investisseur</option>
                    {investors.map(inv => (
                      <option key={inv.id} value={inv.id}>
                        {inv.first_name} {inv.last_name} ({inv.total_shares} parts)
                      </option>
                    ))}
                  </select>
                  {errors.investor_id && <p className="text-red-500 text-sm mt-1">{errors.investor_id}</p>}

                  {formData.category === 'investissement' && calculatedShares > 0 && (
                    <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <p className="text-sm text-blue-800 dark:text-blue-300">
                        💡 Cet investissement de {formData.amount.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD' })} donnera automatiquement <strong>{calculatedShares} parts</strong> à l'investisseur
                        (valeur nominale: {shareSettings?.nominal_share_value.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD' })}/part)
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Propriété (conditionnel) — inclut loyer_locatif */}
              {(formData.category === 'achat_propriete' ||
                formData.category === 'capex' ||
                formData.category === 'maintenance' ||
                formData.category === 'loyer' ||
                formData.category === 'loyer_locatif' ||
                formData.category === 'revenu') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    🏠 Propriété {formData.category === 'achat_propriete' && <span className="text-red-500">*</span>}
                  </label>
                  <select
                    value={formData.property_id || ''}
                    onChange={(e) => setFormData({ ...formData, property_id: e.target.value || null })}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 ${
                      errors.property_id ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    <option value="">Sélectionner une propriété</option>
                    {properties.map(prop => (
                      <option key={prop.id} value={prop.id}>
                        {prop.name} - {prop.location}
                      </option>
                    ))}
                  </select>
                  {errors.property_id && <p className="text-red-500 text-sm mt-1">{errors.property_id}</p>}
                </div>
              )}

              {/* Remboursement en parts (conditionnel) */}
              {formData.category === 'remboursement_investisseur' && (
                <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-700/50">
                  <div className="flex items-center gap-3 mb-3">
                    <input
                      type="checkbox"
                      id="reimbursement_in_shares"
                      checked={formData.reimbursement_in_shares}
                      onChange={(e) => setFormData({ ...formData, reimbursement_in_shares: e.target.checked })}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <label htmlFor="reimbursement_in_shares" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Rembourser en parts (au lieu d'argent)
                    </label>
                  </div>

                  {formData.reimbursement_in_shares && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Nombre de parts retournées <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formData.shares_returned || ''}
                        onChange={(e) => setFormData({ ...formData, shares_returned: parseInt(e.target.value) || 0 })}
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 ${
                          errors.shares_returned ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                        }`}
                        placeholder="100"
                      />
                      {errors.shares_returned && <p className="text-red-500 text-sm mt-1">{errors.shares_returned}</p>}
                    </div>
                  )}
                </div>
              )}

              {/* Statut */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  ✅ Statut
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                >
                  <option value="pending">⏳ En attente</option>
                  <option value="complete">✅ Complété</option>
                  <option value="cancelled">❌ Annulé</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  📌 Notes (optionnel)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                  placeholder="Informations supplémentaires..."
                />
              </div>
            </>
          )}

          {/* ===== CHAMPS COMMUNS (aussi pour transfert) ===== */}
          {formData.flowType === 'transfert' && (
            <>
              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  📅 Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 ${
                    errors.date ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
                {errors.date && <p className="text-red-500 text-sm mt-1">{errors.date}</p>}
              </div>

              {/* Montant */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  💵 Montant (CAD) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.amount || ''}
                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 ${
                      errors.amount ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                    placeholder="0.00"
                  />
                </div>
                {errors.amount && <p className="text-red-500 text-sm mt-1">{errors.amount}</p>}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  📝 Description <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 ${
                    errors.description ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="Ex: Transfert vers CAPEX pour rénovation"
                />
                {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
              </div>

              {/* Statut */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  ✅ Statut
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                >
                  <option value="pending">⏳ En attente</option>
                  <option value="complete">✅ Complété</option>
                  <option value="cancelled">❌ Annulé</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  📌 Notes (optionnel)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                  placeholder="Informations supplémentaires..."
                />
              </div>
            </>
          )}

          {/* Pièces jointes (mode édition seulement) */}
          {transaction && (
            <div>
              <button
                type="button"
                onClick={() => setShowAttachments(!showAttachments)}
                className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
              >
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  📎 Pièces jointes
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {showAttachments ? '▼ Masquer' : '▶ Afficher'}
                </span>
              </button>

              {showAttachments && (
                <div className="mt-4 border border-gray-300 dark:border-gray-600 rounded-lg p-4">
                  <TransactionAttachmentsManager transactionId={transaction.id} />
                </div>
              )}
            </div>
          )}

          {/* Note importante */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertCircle className="text-yellow-600 flex-shrink-0" size={20} />
              <div className="text-sm text-yellow-800 dark:text-yellow-300">
                <p className="font-medium mb-1">💡 Rappels importants:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Le montant doit toujours être saisi en <strong>positif</strong></li>
                  <li>Choisissez <strong>Entrée (+)</strong>, <strong>Sortie (-)</strong> ou <strong>Transfert ↔</strong></li>
                  <li>Si l'investisseur paie directement, précisez s'il achète des parts ou si c'est une dette</li>
                  <li>Les investissements créent automatiquement des parts pour l'investisseur</li>
                  <li>Un paiement récurrent crée une transaction par occurrence (max 500)</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => {
                resetForm()
                onClose()
              }}
              className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
            >
              ❌ Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {saving
                ? '⏳ Enregistrement...'
                : transaction
                ? '✅ Mettre à jour'
                : formData.flowType === 'outflow' &&
                  formData.category === 'paiement' &&
                  formData.occurrence_type === 'recurrent'
                ? '🔁 Créer les paiements récurrents'
                : '➕ Créer la transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
