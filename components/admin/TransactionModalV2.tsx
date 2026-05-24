'use client'

import { useState, useEffect } from 'react'
import { X, AlertCircle, DollarSign, TrendingUp, TrendingDown, Building, User, CreditCard, AlertTriangle, ArrowLeftRight } from 'lucide-react'
import { useInvestment } from '@/contexts/InvestmentContext'
import { useExchangeRate } from '@/contexts/ExchangeRateContext'
import { useLanguage } from '@/contexts/LanguageContext'
import TransactionAttachmentsManager from './TransactionAttachmentsManager'

type TransactionFlowType = 'inflow' | 'outflow' | 'transfert'
type PaymentSource = 'compte_courant' | 'investisseur_direct'
type InvestorPaymentType = 'achat_parts' | 'dette_a_rembourser'

type TransactionCategoryInflow = 'investissement' | 'loyer' | 'loyer_locatif' | 'dividende' | 'revenu'
type TransactionCategoryOutflow = 'achat_propriete' | 'admin' | 'capex' | 'maintenance' | 'depense' | 'remboursement_investisseur' | 'paiement'

interface TransactionFormData {
  id?: string
  date: string
  flowType: TransactionFlowType
  category: TransactionCategoryInflow | TransactionCategoryOutflow | ''
  amount: number
  description: string
  investor_id: string | null
  property_id: string | null
  status: 'pending' | 'complete' | 'cancelled'
  notes: string
  payment_source: PaymentSource
  investor_payment_type: InvestorPaymentType | null
  affects_compte_courant: boolean
  reimbursement_in_shares: boolean
  shares_returned: number
  source_currency: 'CAD' | 'USD'
  source_amount: number | null
  exchange_rate: number
  bank_fees: number
  target_account: 'compte_courant' | 'capex' | null
  occurrence_type: 'unique' | 'recurrent'
  recurrence_frequency: 'quotidien' | 'hebdomadaire' | 'mensuel' | 'trimestriel' | 'annuel' | null
  recurrence_end_date: string | null
  recurrence_no_end: boolean
  transfer_source: 'compte_courant' | 'capex' | null
}

interface TransactionModalV2Props {
  isOpen: boolean
  onClose: () => void
  transaction?: any
  onSave: (transaction: any) => Promise<void>
}

// Helper: generates all dates for a recurrence (frequency values are internal DB codes, not translated)
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
  const { language } = useLanguage()
  const fr = language === 'fr'
  const locale = fr ? 'fr-CA' : 'en-CA'

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

  const inflowCategories: { value: TransactionCategoryInflow; label: string; description: string }[] = [
    { value: 'investissement', label: fr ? 'Investissement' : 'Investment',   description: fr ? 'Investisseur achete des parts'       : 'Investor buys shares' },
    { value: 'loyer',          label: fr ? 'Loyer' : 'Rent',                  description: fr ? 'Revenus locatifs'                    : 'Rental income' },
    { value: 'loyer_locatif',  label: fr ? 'Revenu locatif' : 'Rental income', description: fr ? 'Revenu locatif (loyer + compte dest.)' : 'Rental income (rent + destination account)' },
    { value: 'revenu',         label: fr ? 'Revenu' : 'Revenue',              description: fr ? 'Revenu general'                     : 'General revenue' },
    { value: 'dividende',      label: fr ? 'Dividende' : 'Dividend',          description: fr ? 'Distribution de profits'            : 'Profit distribution' }
  ]

  const outflowCategories: { value: TransactionCategoryOutflow; label: string; description: string }[] = [
    { value: 'achat_propriete',          label: fr ? 'Achat propriete' : 'Property purchase',      description: fr ? 'Achat de propriete immobiliere'       : 'Real estate property purchase' },
    { value: 'admin',                    label: fr ? 'Administratif' : 'Administrative',           description: fr ? 'Frais avocat, fiscalite, NEQ'         : 'Lawyer fees, taxes, NEQ' },
    { value: 'capex',                    label: 'CAPEX',                                            description: fr ? 'Amelioration propriete'               : 'Property improvement' },
    { value: 'maintenance',              label: fr ? 'Maintenance' : 'Maintenance',                description: fr ? 'Entretien propriete'                   : 'Property maintenance' },
    { value: 'depense',                  label: fr ? 'Depense generale' : 'General expense',       description: fr ? 'Autre depense'                        : 'Other expense' },
    { value: 'paiement',                 label: fr ? 'Paiement' : 'Payment',                       description: fr ? 'Paiement unique ou recurrent'          : 'One-time or recurring payment' },
    { value: 'remboursement_investisseur', label: fr ? 'Remboursement investisseur' : 'Investor reimbursement', description: fr ? 'Rembourser un investisseur' : 'Reimburse an investor' }
  ]

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

  useEffect(() => {
    if (formData.source_currency === 'USD' && currentExchangeRate) {
      setFormData(prev => ({ ...prev, exchange_rate: currentExchangeRate }))
    }
  }, [formData.source_currency, currentExchangeRate])

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

    if (!formData.date) newErrors.date = fr ? 'Date requise' : 'Date required'
    if (formData.amount <= 0) newErrors.amount = fr ? 'Montant doit etre superieur a 0' : 'Amount must be greater than 0'
    if (!formData.description.trim()) newErrors.description = fr ? 'Description requise' : 'Description required'

    if (formData.flowType === 'transfert') {
      if (!formData.transfer_source) newErrors.transfer_source = fr ? 'Compte source requis pour un transfert' : 'Source account required for a transfer'
      setErrors(newErrors)
      return Object.keys(newErrors).length === 0
    }

    if (!formData.category) newErrors.category = fr ? 'Categorie requise' : 'Category required'

    if (formData.category === 'investissement' && !formData.investor_id) {
      newErrors.investor_id = fr ? 'Investisseur requis pour un investissement' : 'Investor required for an investment'
    }

    if (formData.category === 'remboursement_investisseur' && !formData.investor_id) {
      newErrors.investor_id = fr ? 'Investisseur requis pour un remboursement' : 'Investor required for a reimbursement'
    }

    if (formData.category === 'achat_propriete' && !formData.property_id) {
      newErrors.property_id = fr ? 'Propriete requise pour un achat' : 'Property required for a purchase'
    }

    if (formData.reimbursement_in_shares && formData.shares_returned <= 0) {
      newErrors.shares_returned = fr ? 'Nombre de parts requis pour un remboursement en parts' : 'Number of shares required for a share reimbursement'
    }

    if (formData.payment_source === 'investisseur_direct' && !formData.investor_payment_type) {
      newErrors.investor_payment_type = fr ? 'Type de paiement investisseur requis' : 'Investor payment type required'
    }

    if (formData.payment_source === 'investisseur_direct' && !formData.investor_id) {
      newErrors.investor_id = fr ? 'Investisseur requis pour un paiement direct' : 'Investor required for a direct payment'
    }

    if (formData.category === 'loyer_locatif' && !formData.target_account) {
      newErrors.target_account = fr ? 'Compte de destination requis pour un revenu locatif' : 'Destination account required for rental income'
    }

    if (formData.category === 'paiement' && formData.flowType === 'outflow' && formData.occurrence_type === 'recurrent') {
      if (!formData.recurrence_frequency) {
        newErrors.recurrence_frequency = fr ? 'Frequence requise pour un paiement recurrent' : 'Frequency required for a recurring payment'
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

      const finalAmount = formData.flowType === 'inflow' ? formData.amount : -formData.amount

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

      await onSave(baseData)
      resetForm()
      onClose()
    } catch (error: any) {
      alert((fr ? 'Erreur lors de la sauvegarde: ' : 'Save error: ') + error.message)
    } finally {
      setSaving(false)
    }
  }

  const calculatedShares = formData.category === 'investissement' && shareSettings
    ? Math.floor(formData.amount / shareSettings.nominal_share_value)
    : 0

  const transferDest = formData.transfer_source === 'compte_courant'
    ? 'CAPEX'
    : formData.transfer_source === 'capex'
    ? (fr ? 'Compte courant' : 'Current account')
    : '—'

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full my-8">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between rounded-t-lg">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {transaction
              ? (fr ? 'Modifier la transaction' : 'Edit transaction')
              : (fr ? 'Nouvelle transaction' : 'New transaction')}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <X size={24} className="text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Recurring confirmation */}
        {recurrentCreatedCount !== null && (
          <div className="mx-6 mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-sm text-green-800 dark:text-green-300">
              ✅ <strong>{recurrentCreatedCount} {fr ? 'transaction(s) recurrente(s)' : 'recurring transaction(s)'}</strong>{' '}
              {fr ? 'creees avec succes.' : 'created successfully.'}
            </p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">

          {/* Flow type: 3 buttons */}
          <div className="border-2 border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-700/50">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              {fr ? 'Type de transaction' : 'Transaction type'} <span className="text-red-500">*</span>
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
                  <span className="text-2xl">+</span>
                </div>
                <div className="font-bold text-base text-gray-900 dark:text-gray-100">
                  {fr ? 'Entree (+)' : 'Inflow (+)'}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {fr ? 'Augmente le compte courant' : 'Increases current account'}
                </div>
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
                  <span className="text-2xl">-</span>
                </div>
                <div className="font-bold text-base text-gray-900 dark:text-gray-100">
                  {fr ? 'Sortie (-)' : 'Outflow (-)'}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {fr ? 'Diminue le compte courant' : 'Decreases current account'}
                </div>
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
                <div className="font-bold text-base text-gray-900 dark:text-gray-100">
                  {fr ? 'Transfert' : 'Transfer'} &harr;
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {fr ? 'Entre compte courant et CAPEX' : 'Between current account and CAPEX'}
                </div>
              </button>
            </div>
          </div>

          {/* ===== TRANSFER SECTION ===== */}
          {formData.flowType === 'transfert' && (
            <div className="border-2 border-indigo-300 dark:border-indigo-700 rounded-lg p-4 bg-indigo-50 dark:bg-indigo-900/20 space-y-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {fr ? 'Compte source' : 'Source account'} <span className="text-red-500">*</span>
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
                  <div className="font-semibold text-gray-900 dark:text-gray-100">
                    {fr ? 'Compte courant' : 'Current account'}
                  </div>
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
                  <div className="font-semibold text-gray-900 dark:text-gray-100">CAPEX</div>
                </button>
              </div>
              {errors.transfer_source && <p className="text-red-500 text-sm">{errors.transfer_source}</p>}

              {formData.transfer_source && (
                <div className="mt-2 p-3 bg-white dark:bg-gray-800 border border-indigo-200 dark:border-indigo-700 rounded-lg">
                  <p className="text-sm text-indigo-800 dark:text-indigo-300">
                    <strong>{fr ? 'De :' : 'From:'}</strong>{' '}
                    {formData.transfer_source === 'compte_courant' ? (fr ? 'Compte courant' : 'Current account') : 'CAPEX'}
                    &nbsp;&rarr;&nbsp;
                    <strong>{fr ? 'Vers :' : 'To:'}</strong> {transferDest}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ===== NORMAL SECTION (inflow / outflow) ===== */}
          {formData.flowType !== 'transfert' && (
            <>
              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {formData.flowType === 'outflow' &&
                  formData.category === 'paiement' &&
                  formData.occurrence_type === 'recurrent'
                    ? (fr ? 'Date de debut' : 'Start date')
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

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {fr ? 'Categorie' : 'Category'} <span className="text-red-500">*</span>
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
                  <option value="">{fr ? 'Selectionner une categorie' : 'Select a category'}</option>
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

              {/* Occurrence toggle for "paiement" outflow */}
              {formData.flowType === 'outflow' && formData.category === 'paiement' && (
                <div className="border-2 border-orange-300 dark:border-orange-700 rounded-lg p-4 bg-orange-50 dark:bg-orange-900/20 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {fr ? 'Occurrence' : 'Occurrence'}
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
                        {fr ? 'Unique' : 'One-time'}
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
                        {fr ? 'Recurrent' : 'Recurring'}
                      </button>
                    </div>
                  </div>

                  {formData.occurrence_type === 'recurrent' && (
                    <>
                      {/* Frequency */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {fr ? 'Frequence' : 'Frequency'} <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={formData.recurrence_frequency || ''}
                          onChange={(e) => setFormData({ ...formData, recurrence_frequency: e.target.value as any || null })}
                          className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 ${
                            errors.recurrence_frequency ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                          }`}
                        >
                          <option value="">{fr ? 'Selectionner une frequence' : 'Select a frequency'}</option>
                          <option value="quotidien">{fr ? 'Quotidien' : 'Daily'}</option>
                          <option value="hebdomadaire">{fr ? 'Hebdomadaire' : 'Weekly'}</option>
                          <option value="mensuel">{fr ? 'Mensuel' : 'Monthly'}</option>
                          <option value="trimestriel">{fr ? 'Trimestriel' : 'Quarterly'}</option>
                          <option value="annuel">{fr ? 'Annuel' : 'Annual'}</option>
                        </select>
                        {errors.recurrence_frequency && (
                          <p className="text-red-500 text-sm mt-1">{errors.recurrence_frequency}</p>
                        )}
                      </div>

                      {/* End date */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {fr ? 'Date de fin' : 'End date'}
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
                            {fr ? 'Pas de fin (2 ans maximum)' : 'No end (2 year max)'}
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
                          {fr
                            ? 'Une transaction separee sera creee pour chaque occurrence (maximum 500).'
                            : 'A separate transaction will be created for each occurrence (maximum 500).'}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Payment source */}
              {formData.category && formData.category !== 'dividende' && (
                <div className="border-2 border-blue-300 dark:border-blue-700 rounded-lg p-4 bg-blue-50 dark:bg-blue-900/20">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    {fr ? 'Qui paie cette transaction ?' : 'Who pays this transaction?'} <span className="text-red-500">*</span>
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
                      </div>
                      <div className="font-semibold text-gray-900 dark:text-gray-100">
                        {fr ? 'COMPTE COURANT' : 'CURRENT ACCOUNT'}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {fr ? 'La societe paie' : 'The company pays'}
                      </div>
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
                      </div>
                      <div className="font-semibold text-gray-900 dark:text-gray-100">
                        {fr ? 'INVESTISSEUR DIRECT' : 'DIRECT INVESTOR'}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {fr ? "L'investisseur paie lui-meme" : 'The investor pays directly'}
                      </div>
                    </button>
                  </div>

                  {formData.payment_source === 'investisseur_direct' && (
                    <div className="mt-4 border-t-2 border-purple-200 dark:border-purple-800 pt-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        {fr ? 'Type de paiement direct' : 'Direct payment type'} <span className="text-red-500">*</span>
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
                          </div>
                          <div className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                            {fr ? 'ACHAT DE PARTS' : 'SHARE PURCHASE'}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                            {fr
                              ? "L'investisseur achete directement des parts"
                              : 'The investor directly buys shares'}
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
                          </div>
                          <div className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                            {fr ? 'DETTE A REMBOURSER' : 'DEBT TO REPAY'}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                            {fr
                              ? "Creer une dette envers l'investisseur"
                              : 'Create a debt towards the investor'}
                          </div>
                        </button>
                      </div>
                      {errors.investor_payment_type && (
                        <p className="text-red-500 text-sm mt-2">{errors.investor_payment_type}</p>
                      )}

                      {formData.investor_payment_type === 'achat_parts' && (
                        <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                          <p className="text-sm text-green-800 dark:text-green-300">
                            {fr
                              ? <>
                                  <strong>Achat de parts direct</strong> : L&apos;investisseur paie directement la depense et recoit des parts en echange.
                                  Le compte courant n&apos;est pas affecte.
                                </>
                              : <>
                                  <strong>Direct share purchase</strong>: The investor directly pays the expense and receives shares in return.
                                  The current account is not affected.
                                </>}
                          </p>
                        </div>
                      )}

                      {formData.investor_payment_type === 'dette_a_rembourser' && (
                        <div className="mt-3 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                          <p className="text-sm text-orange-800 dark:text-orange-300">
                            {fr
                              ? <>
                                  <strong>Dette a rembourser</strong> : L&apos;investisseur paie temporairement la depense. Une dette est creee dans son profil.
                                  La societe devra le rembourser plus tard via le compte courant.
                                </>
                              : <>
                                  <strong>Debt to repay</strong>: The investor temporarily pays the expense. A debt is created in their profile.
                                  The company will need to reimburse them later via the current account.
                                </>}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {fr ? 'Montant' : 'Amount'} {formData.source_currency === 'CAD' ? '(CAD)' : '(USD)'} <span className="text-red-500">*</span>
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
                  {fr
                    ? 'Saisir le montant en positif. Le signe (+ ou -) sera ajoute automatiquement.'
                    : 'Enter the amount as a positive number. The sign (+ or -) will be added automatically.'}
                </p>
              </div>

              {/* Currency and exchange rate */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {fr ? 'Devise source' : 'Source currency'}
                  </label>
                  <select
                    value={formData.source_currency}
                    onChange={(e) => setFormData({ ...formData, source_currency: e.target.value as 'CAD' | 'USD' })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                  >
                    <option value="CAD">CAD</option>
                    <option value="USD">USD</option>
                  </select>
                </div>

                {formData.source_currency === 'USD' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {fr ? 'Taux de change (USD -> CAD)' : 'Exchange rate (USD -> CAD)'}
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
                  Description <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 ${
                    errors.description ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder={fr ? 'Ex: Investissement Jean Dupont - Achat parts' : 'Ex: Jean Dupont investment - Share purchase'}
                />
                {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
              </div>

              {/* Destination account — loyer_locatif */}
              {formData.category === 'loyer_locatif' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {fr ? 'Compte de destination' : 'Destination account'} <span className="text-red-500">*</span>
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
                      <div className="font-semibold text-gray-900 dark:text-gray-100">
                        {fr ? 'Compte courant' : 'Current account'}
                      </div>
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
                      <div className="font-semibold text-gray-900 dark:text-gray-100">CAPEX</div>
                    </button>
                  </div>
                  {errors.target_account && <p className="text-red-500 text-sm mt-2">{errors.target_account}</p>}
                </div>
              )}

              {/* Investor (conditional) */}
              {(formData.category === 'investissement' ||
                formData.category === 'remboursement_investisseur' ||
                formData.category === 'dividende' ||
                formData.payment_source === 'investisseur_direct') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {fr ? 'Investisseur' : 'Investor'}{' '}
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
                    <option value="">{fr ? 'Selectionner un investisseur' : 'Select an investor'}</option>
                    {investors.map(inv => (
                      <option key={inv.id} value={inv.id}>
                        {inv.first_name} {inv.last_name} ({inv.total_shares} {fr ? 'parts' : 'shares'})
                      </option>
                    ))}
                  </select>
                  {errors.investor_id && <p className="text-red-500 text-sm mt-1">{errors.investor_id}</p>}

                  {formData.category === 'investissement' && calculatedShares > 0 && (
                    <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <p className="text-sm text-blue-800 dark:text-blue-300">
                        {fr
                          ? <>
                              Cet investissement de {formData.amount.toLocaleString(locale, { style: 'currency', currency: 'CAD' })} donnera automatiquement <strong>{calculatedShares} parts</strong> a l&apos;investisseur
                              (valeur nominale: {shareSettings?.nominal_share_value.toLocaleString(locale, { style: 'currency', currency: 'CAD' })}/part)
                            </>
                          : <>
                              This investment of {formData.amount.toLocaleString(locale, { style: 'currency', currency: 'CAD' })} will automatically give <strong>{calculatedShares} shares</strong> to the investor
                              (nominal value: {shareSettings?.nominal_share_value.toLocaleString(locale, { style: 'currency', currency: 'CAD' })}/share)
                            </>}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Property (conditional) */}
              {(formData.category === 'achat_propriete' ||
                formData.category === 'capex' ||
                formData.category === 'maintenance' ||
                formData.category === 'loyer' ||
                formData.category === 'loyer_locatif' ||
                formData.category === 'revenu') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {fr ? 'Propriete' : 'Property'}{' '}
                    {formData.category === 'achat_propriete' && <span className="text-red-500">*</span>}
                  </label>
                  <select
                    value={formData.property_id || ''}
                    onChange={(e) => setFormData({ ...formData, property_id: e.target.value || null })}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 ${
                      errors.property_id ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    <option value="">{fr ? 'Selectionner une propriete' : 'Select a property'}</option>
                    {properties.map(prop => (
                      <option key={prop.id} value={prop.id}>
                        {prop.name} - {prop.location}
                      </option>
                    ))}
                  </select>
                  {errors.property_id && <p className="text-red-500 text-sm mt-1">{errors.property_id}</p>}
                </div>
              )}

              {/* Reimbursement in shares (conditional) */}
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
                      {fr ? "Rembourser en parts (au lieu d'argent)" : 'Reimburse in shares (instead of cash)'}
                    </label>
                  </div>

                  {formData.reimbursement_in_shares && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {fr ? 'Nombre de parts retournees' : 'Number of shares returned'} <span className="text-red-500">*</span>
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

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {fr ? 'Statut' : 'Status'}
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                >
                  <option value="pending">{fr ? 'En attente' : 'Pending'}</option>
                  <option value="complete">{fr ? 'Complete' : 'Completed'}</option>
                  <option value="cancelled">{fr ? 'Annule' : 'Cancelled'}</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {fr ? 'Notes (optionnel)' : 'Notes (optional)'}
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                  placeholder={fr ? 'Informations supplementaires...' : 'Additional information...'}
                />
              </div>
            </>
          )}

          {/* ===== SHARED FIELDS (also for transfer) ===== */}
          {formData.flowType === 'transfert' && (
            <>
              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Date <span className="text-red-500">*</span>
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

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {fr ? 'Montant (CAD)' : 'Amount (CAD)'} <span className="text-red-500">*</span>
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
                  Description <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 ${
                    errors.description ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder={fr ? 'Ex: Transfert vers CAPEX pour renovation' : 'Ex: Transfer to CAPEX for renovation'}
                />
                {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {fr ? 'Statut' : 'Status'}
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                >
                  <option value="pending">{fr ? 'En attente' : 'Pending'}</option>
                  <option value="complete">{fr ? 'Complete' : 'Completed'}</option>
                  <option value="cancelled">{fr ? 'Annule' : 'Cancelled'}</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {fr ? 'Notes (optionnel)' : 'Notes (optional)'}
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                  placeholder={fr ? 'Informations supplementaires...' : 'Additional information...'}
                />
              </div>
            </>
          )}

          {/* Attachments (edit mode only) */}
          {transaction && (
            <div>
              <button
                type="button"
                onClick={() => setShowAttachments(!showAttachments)}
                className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
              >
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {fr ? 'Pieces jointes' : 'Attachments'}
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {showAttachments ? (fr ? 'Masquer' : 'Hide') : (fr ? 'Afficher' : 'Show')}
                </span>
              </button>

              {showAttachments && (
                <div className="mt-4 border border-gray-300 dark:border-gray-600 rounded-lg p-4">
                  <TransactionAttachmentsManager transactionId={transaction.id} />
                </div>
              )}
            </div>
          )}

          {/* Important notes */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertCircle className="text-yellow-600 flex-shrink-0" size={20} />
              <div className="text-sm text-yellow-800 dark:text-yellow-300">
                <p className="font-medium mb-1">{fr ? 'Rappels importants:' : 'Important reminders:'}</p>
                <ul className="list-disc list-inside space-y-1">
                  {fr ? (
                    <>
                      <li>Le montant doit toujours etre saisi en <strong>positif</strong></li>
                      <li>Choisissez <strong>Entree (+)</strong>, <strong>Sortie (-)</strong> ou <strong>Transfert</strong></li>
                      <li>Si l&apos;investisseur paie directement, precisez s&apos;il achete des parts ou si c&apos;est une dette</li>
                      <li>Les investissements creent automatiquement des parts pour l&apos;investisseur</li>
                      <li>Un paiement recurrent cree une transaction par occurrence (max 500)</li>
                    </>
                  ) : (
                    <>
                      <li>Amount must always be entered as a <strong>positive</strong> number</li>
                      <li>Choose <strong>Inflow (+)</strong>, <strong>Outflow (-)</strong> or <strong>Transfer</strong></li>
                      <li>If the investor pays directly, specify whether they&apos;re buying shares or it&apos;s a debt</li>
                      <li>Investments automatically create shares for the investor</li>
                      <li>A recurring payment creates one transaction per occurrence (max 500)</li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => { resetForm(); onClose() }}
              className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
            >
              {fr ? 'Annuler' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {saving
                ? (fr ? 'Enregistrement...' : 'Saving...')
                : transaction
                ? (fr ? 'Mettre a jour' : 'Update')
                : formData.flowType === 'outflow' &&
                  formData.category === 'paiement' &&
                  formData.occurrence_type === 'recurrent'
                ? (fr ? 'Creer les paiements recurrents' : 'Create recurring payments')
                : (fr ? 'Creer la transaction' : 'Create transaction')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
