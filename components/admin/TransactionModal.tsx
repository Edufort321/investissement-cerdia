'use client'

import { useState, useEffect } from 'react'
import { X, AlertCircle, DollarSign, TrendingUp, TrendingDown } from 'lucide-react'
import { useInvestment } from '@/contexts/InvestmentContext'
import { useExchangeRate } from '@/contexts/ExchangeRateContext'
import { useLanguage } from '@/contexts/LanguageContext'
import TransactionAttachmentsManager from './TransactionAttachmentsManager'

type TransactionFlowType = 'inflow' | 'outflow'

type TransactionCategoryInflow = 'investissement' | 'loyer' | 'dividende'
type TransactionCategoryOutflow = 'achat_propriete' | 'admin' | 'capex' | 'maintenance' | 'depense' | 'remboursement_investisseur'

const FISCAL_CATEGORIES: Record<string, { value: string; label: string; enLabel: string }[]> = {
  maintenance: [
    { value: 'taxes_foncieres',   label: 'Taxes foncières',             enLabel: 'Property taxes' },
    { value: 'assurances',        label: 'Assurances',                  enLabel: 'Insurance' },
    { value: 'frais_condo',       label: 'Frais de condo',              enLabel: 'Condo fees' },
    { value: 'utilites',          label: 'Services publics / Utilités', enLabel: 'Utilities' },
    { value: 'entretien_courant', label: 'Entretien courant',           enLabel: 'Routine maintenance' },
    { value: 'frais_gestion',     label: 'Frais de gestion locative',   enLabel: 'Property management fees' },
  ],
  depense: [
    { value: 'taxes_foncieres',   label: 'Taxes foncières',             enLabel: 'Property taxes' },
    { value: 'assurances',        label: 'Assurances',                  enLabel: 'Insurance' },
    { value: 'frais_condo',       label: 'Frais de condo',              enLabel: 'Condo fees' },
    { value: 'utilites',          label: 'Services publics / Utilités', enLabel: 'Utilities' },
    { value: 'frais_gestion',     label: 'Frais de gestion',            enLabel: 'Management fees' },
    { value: 'entretien_courant', label: 'Entretien courant',           enLabel: 'Routine maintenance' },
    { value: 'frais_bancaires',   label: 'Frais bancaires',             enLabel: 'Bank fees' },
    { value: 'autre_depense',     label: 'Autre dépense',               enLabel: 'Other expense' },
  ],
  capex: [
    { value: 'renovation_majeure', label: 'Rénovation majeure', enLabel: 'Major renovation' },
    { value: 'equipements',        label: 'Équipements',        enLabel: 'Equipment' },
    { value: 'ameliorations',      label: 'Améliorations',      enLabel: 'Improvements' },
    { value: 'ameublement',        label: 'Ameublement',        enLabel: 'Furnishings' },
  ],
  achat_propriete: [
    { value: 'acquisition',      label: "Prix d'acquisition",  enLabel: 'Acquisition price' },
    { value: 'frais_notaire',    label: 'Frais de notaire',    enLabel: 'Notary fees' },
    { value: 'frais_inspection', label: 'Inspection / diligence', enLabel: 'Inspection / due diligence' },
  ],
  admin: [
    { value: 'honoraires_comptables', label: 'Honoraires comptables',     enLabel: 'Accounting fees' },
    { value: 'honoraires_juridiques', label: 'Honoraires juridiques',     enLabel: 'Legal fees' },
    { value: 'frais_constitutifs',    label: 'Frais constitutifs / NEQ',  enLabel: 'Incorporation fees / NEQ' },
    { value: 'frais_bancaires',       label: 'Frais bancaires',           enLabel: 'Bank fees' },
    { value: 'autre_admin',           label: 'Autre administratif',       enLabel: 'Other administrative' },
  ],
  loyer: [
    { value: 'loyer_court_terme', label: 'Location court terme (Airbnb, etc.)', enLabel: 'Short-term rental (Airbnb, etc.)' },
    { value: 'loyer_long_terme',  label: 'Location long terme',                 enLabel: 'Long-term rental' },
    { value: 'loyer_autre',       label: 'Autre revenu locatif',                enLabel: 'Other rental income' },
  ],
}

interface TransactionFormData {
  date: string
  flowType: TransactionFlowType
  category: TransactionCategoryInflow | TransactionCategoryOutflow | ''
  amount: number
  description: string
  investor_id: string | null
  property_id: string | null
  status: 'pending' | 'complete' | 'cancelled'
  notes: string
  fiscal_category: string | null
  reimbursement_in_shares: boolean
  shares_returned: number
  source_currency: 'CAD' | 'USD'
  source_amount: number | null
  exchange_rate: number
  bank_fees: number
}

interface TransactionModalProps {
  isOpen: boolean
  onClose: () => void
  transaction?: any
  onSave: (transaction: any) => Promise<void>
}

export default function TransactionModal({ isOpen, onClose, transaction, onSave }: TransactionModalProps) {
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
    fiscal_category: null,
    reimbursement_in_shares: false,
    shares_returned: 0,
    source_currency: 'CAD',
    source_amount: null,
    exchange_rate: 1.0,
    bank_fees: 0
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [showAttachments, setShowAttachments] = useState(false)

  const inflowCategories: { value: TransactionCategoryInflow; label: string; description: string }[] = [
    { value: 'investissement', label: fr ? 'Investissement' : 'Investment',   description: fr ? 'Investisseur achète des parts' : 'Investor buys shares' },
    { value: 'loyer',          label: fr ? 'Loyer' : 'Rent',                  description: fr ? 'Revenus locatifs' : 'Rental income' },
    { value: 'dividende',      label: fr ? 'Dividende' : 'Dividend',          description: fr ? 'Distribution de profits' : 'Profit distribution' },
  ]

  const outflowCategories: { value: TransactionCategoryOutflow; label: string; description: string }[] = [
    { value: 'achat_propriete',           label: fr ? 'Achat propriété' : 'Property purchase',     description: fr ? 'Achat de propriété immobilière' : 'Real estate purchase' },
    { value: 'admin',                      label: fr ? 'Administratif' : 'Administrative',           description: fr ? 'Frais avocat, fiscalité, NEQ' : 'Legal, tax, NEQ fees' },
    { value: 'capex',                      label: 'CAPEX',                                           description: fr ? 'Amélioration propriété' : 'Property improvement' },
    { value: 'maintenance',                label: fr ? 'Maintenance' : 'Maintenance',                description: fr ? 'Entretien propriété' : 'Property maintenance' },
    { value: 'depense',                    label: fr ? 'Dépense générale' : 'General expense',       description: fr ? 'Autre dépense' : 'Other expense' },
    { value: 'remboursement_investisseur', label: fr ? 'Remboursement investisseur' : 'Investor reimbursement', description: fr ? 'Rembourser un investisseur' : 'Reimburse an investor' },
  ]

  useEffect(() => {
    if (transaction) {
      const flowType: TransactionFlowType = transaction.amount >= 0 ? 'inflow' : 'outflow'
      setFormData({
        date: transaction.date?.split('T')[0] || new Date().toISOString().split('T')[0],
        flowType,
        category: transaction.type || '',
        amount: Math.abs(transaction.amount || 0),
        description: transaction.description || '',
        investor_id: transaction.investor_id || null,
        property_id: transaction.property_id || null,
        status: transaction.status || 'complete',
        notes: transaction.notes || '',
        fiscal_category: transaction.fiscal_category || null,
        reimbursement_in_shares: transaction.reimbursement_in_shares || false,
        shares_returned: transaction.shares_returned || 0,
        source_currency: transaction.source_currency || 'CAD',
        source_amount: transaction.source_amount || null,
        exchange_rate: transaction.exchange_rate || 1.0,
        bank_fees: transaction.bank_fees || 0
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
      fiscal_category: null,
      reimbursement_in_shares: false,
      shares_returned: 0,
      source_currency: 'CAD',
      source_amount: null,
      exchange_rate: 1.0,
      bank_fees: 0
    })
    setErrors({})
    setShowAttachments(false)
  }

  const handleFlowTypeChange = (flowType: TransactionFlowType) => {
    setFormData(prev => ({
      ...prev,
      flowType,
      category: '',
      fiscal_category: null,
      property_id: null,
      investor_id: null,
      reimbursement_in_shares: false,
      shares_returned: 0
    }))
  }

  const handleCategoryChange = (category: string) => {
    setFormData(prev => ({
      ...prev,
      category: category as TransactionCategoryInflow | TransactionCategoryOutflow,
      fiscal_category: null
    }))
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.date) newErrors.date = fr ? 'Date requise' : 'Date required'
    if (!formData.category) newErrors.category = fr ? 'Catégorie requise' : 'Category required'
    if (formData.amount <= 0) newErrors.amount = fr ? 'Montant doit être supérieur à 0' : 'Amount must be greater than 0'
    if (!formData.description.trim()) newErrors.description = fr ? 'Description requise' : 'Description required'

    if (formData.category === 'investissement' && !formData.investor_id) {
      newErrors.investor_id = fr ? 'Investisseur requis pour un investissement' : 'Investor required for an investment'
    }
    if (formData.category === 'remboursement_investisseur' && !formData.investor_id) {
      newErrors.investor_id = fr ? 'Investisseur requis pour un remboursement' : 'Investor required for a reimbursement'
    }
    if (formData.category === 'achat_propriete' && !formData.property_id) {
      newErrors.property_id = fr ? 'Propriété requise pour un achat' : 'Property required for a purchase'
    }
    if (formData.reimbursement_in_shares && formData.shares_returned <= 0) {
      newErrors.shares_returned = fr ? 'Nombre de parts requis pour un remboursement en parts' : 'Number of shares required for share reimbursement'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    try {
      const finalAmount = formData.flowType === 'inflow' ? formData.amount : -formData.amount
      const transactionData: any = {
        date: formData.date,
        type: formData.category,
        amount: finalAmount,
        description: formData.description,
        investor_id: formData.investor_id || undefined,
        property_id: formData.property_id || undefined,
        status: formData.status,
        notes: formData.notes || undefined,
        fiscal_category: formData.fiscal_category || undefined,
        reimbursement_in_shares: formData.reimbursement_in_shares,
        shares_returned: formData.shares_returned || 0,
        source_currency: formData.source_currency,
        source_amount: formData.source_amount || undefined,
        exchange_rate: formData.exchange_rate,
        bank_fees: formData.bank_fees || 0
      }
      if (transaction?.id) {
        transactionData.id = transaction.id
      }
      await onSave(transactionData)
      resetForm()
      onClose()
    } catch (error: any) {
      alert((fr ? 'Erreur lors de la sauvegarde : ' : 'Save error: ') + error.message)
    } finally {
      setSaving(false)
    }
  }

  const calculatedShares = formData.category === 'investissement' && shareSettings
    ? Math.floor(formData.amount / shareSettings.nominal_share_value)
    : 0

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {transaction ? (fr ? 'Modifier la transaction' : 'Edit transaction') : (fr ? 'Nouvelle transaction' : 'New transaction')}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
            <X size={24} className="text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {fr ? 'Date' : 'Date'} <span className="text-red-500">*</span>
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

          {/* Type de flux */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              {fr ? 'Type de flux' : 'Flow type'} <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => handleFlowTypeChange('inflow')}
                className={`p-4 border-2 rounded-lg transition-all ${
                  formData.flowType === 'inflow'
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-green-300'
                }`}
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  <TrendingUp className="text-green-600" size={24} />
                  <span className="text-2xl">🟢</span>
                </div>
                <div className="font-semibold text-gray-900 dark:text-gray-100">{fr ? "ENTRÉE D'ARGENT" : 'MONEY IN'}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{fr ? 'Montant positif' : 'Positive amount'}</div>
              </button>

              <button
                type="button"
                onClick={() => handleFlowTypeChange('outflow')}
                className={`p-4 border-2 rounded-lg transition-all ${
                  formData.flowType === 'outflow'
                    ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-red-300'
                }`}
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  <TrendingDown className="text-red-600" size={24} />
                  <span className="text-2xl">🔴</span>
                </div>
                <div className="font-semibold text-gray-900 dark:text-gray-100">{fr ? "SORTIE D'ARGENT" : 'MONEY OUT'}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{fr ? 'Montant négatif' : 'Negative amount'}</div>
              </button>
            </div>
          </div>

          {/* Catégorie */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {fr ? 'Catégorie' : 'Category'} <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.category}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 ${
                errors.category ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
            >
              <option value="">{fr ? 'Sélectionner une catégorie' : 'Select a category'}</option>
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

          {/* Catégorie fiscale */}
          {formData.category && FISCAL_CATEGORIES[formData.category] && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {fr ? 'Catégorie fiscale' : 'Tax category'}
                <span className="ml-2 text-xs font-normal text-gray-500">{fr ? '(pour rapports T1135 / T2209)' : '(for T1135 / T2209 reports)'}</span>
              </label>
              <select
                value={formData.fiscal_category || ''}
                onChange={(e) => setFormData({ ...formData, fiscal_category: e.target.value || null })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
              >
                <option value="">{fr ? '— Non spécifié —' : '— Unspecified —'}</option>
                {FISCAL_CATEGORIES[formData.category].map(opt => (
                  <option key={opt.value} value={opt.value}>{fr ? opt.label : opt.enLabel}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {fr
                  ? 'Permet de générer des rapports OPEX/CAPEX et déclarations fiscales précis.'
                  : 'Enables accurate OPEX/CAPEX reports and tax filings.'}
              </p>
            </div>
          )}

          {/* Montant */}
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
                ? 'Saisir le montant en positif. Le signe sera ajouté automatiquement selon le type de flux.'
                : 'Enter a positive amount. The sign will be applied automatically based on the flow type.'}
            </p>
          </div>

          {/* Devise */}
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
                  {fr ? 'Taux de change (USD → CAD)' : 'Exchange rate (USD → CAD)'}
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
              {fr ? 'Description' : 'Description'} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 ${
                errors.description ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder={fr ? 'Ex: Investissement Jean Dupont - Achat parts' : 'Ex: Investment Jean Dupont - Share purchase'}
            />
            {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
          </div>

          {/* Investisseur */}
          {(formData.category === 'investissement' || formData.category === 'remboursement_investisseur' || formData.category === 'dividende') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {fr ? 'Investisseur' : 'Investor'}{' '}
                {(formData.category === 'investissement' || formData.category === 'remboursement_investisseur') && <span className="text-red-500">*</span>}
              </label>
              <select
                value={formData.investor_id || ''}
                onChange={(e) => setFormData({ ...formData, investor_id: e.target.value || null })}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 ${
                  errors.investor_id ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
              >
                <option value="">{fr ? 'Sélectionner un investisseur' : 'Select an investor'}</option>
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
                    💡 {fr
                      ? <>Cet investissement de {formData.amount.toLocaleString(locale, { style: 'currency', currency: 'CAD' })} donnera automatiquement <strong>{calculatedShares} parts</strong> à l&apos;investisseur
                        (valeur nominale: {shareSettings?.nominal_share_value.toLocaleString(locale, { style: 'currency', currency: 'CAD' })}/part)</>
                      : <>This investment of {formData.amount.toLocaleString(locale, { style: 'currency', currency: 'CAD' })} will automatically give <strong>{calculatedShares} shares</strong> to the investor
                        (nominal value: {shareSettings?.nominal_share_value.toLocaleString(locale, { style: 'currency', currency: 'CAD' })}/share)</>}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Propriété */}
          {(formData.category === 'achat_propriete' || formData.category === 'capex' || formData.category === 'maintenance' || formData.category === 'loyer') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {fr ? 'Propriété' : 'Property'}{' '}
                {formData.category === 'achat_propriete' && <span className="text-red-500">*</span>}
              </label>
              <select
                value={formData.property_id || ''}
                onChange={(e) => setFormData({ ...formData, property_id: e.target.value || null })}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 ${
                  errors.property_id ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
              >
                <option value="">{fr ? 'Sélectionner une propriété' : 'Select a property'}</option>
                {properties.map(prop => (
                  <option key={prop.id} value={prop.id}>
                    {prop.name} - {prop.location}
                  </option>
                ))}
              </select>
              {errors.property_id && <p className="text-red-500 text-sm mt-1">{errors.property_id}</p>}
            </div>
          )}

          {/* Remboursement en parts */}
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
                  {fr ? 'Rembourser en parts (au lieu d\'argent)' : 'Reimburse in shares (instead of cash)'}
                </label>
              </div>

              {formData.reimbursement_in_shares && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {fr ? 'Nombre de parts retournées' : 'Number of shares returned'} <span className="text-red-500">*</span>
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
              {fr ? 'Statut' : 'Status'}
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
            >
              <option value="pending">{fr ? 'En attente' : 'Pending'}</option>
              <option value="complete">{fr ? 'Complété' : 'Completed'}</option>
              <option value="cancelled">{fr ? 'Annulé' : 'Cancelled'}</option>
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
              placeholder={fr ? 'Informations supplémentaires...' : 'Additional information...'}
            />
          </div>

          {/* Pièces jointes */}
          {transaction && (
            <div>
              <button
                type="button"
                onClick={() => setShowAttachments(!showAttachments)}
                className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
              >
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {fr ? 'Pièces jointes' : 'Attachments'}
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

          {/* Note importante */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertCircle className="text-yellow-600 flex-shrink-0" size={20} />
              <div className="text-sm text-yellow-800 dark:text-yellow-300">
                <p className="font-medium mb-1">{fr ? 'Important :' : 'Important:'}</p>
                <ul className="list-disc list-inside space-y-1">
                  {fr ? (
                    <>
                      <li>Le montant doit toujours être saisi en <strong>positif</strong></li>
                      <li>Le signe (+ ou -) sera ajouté automatiquement selon le type de flux choisi</li>
                      <li>Les investissements créent automatiquement des parts pour l&apos;investisseur</li>
                    </>
                  ) : (
                    <>
                      <li>The amount must always be entered as a <strong>positive</strong> number</li>
                      <li>The sign (+ or -) will be applied automatically based on the chosen flow type</li>
                      <li>Investments automatically create shares for the investor</li>
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
              className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              {fr ? 'Annuler' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {saving
                ? (fr ? 'Enregistrement...' : 'Saving...')
                : transaction
                  ? (fr ? 'Mettre à jour' : 'Update')
                  : (fr ? 'Créer la transaction' : 'Create transaction')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
