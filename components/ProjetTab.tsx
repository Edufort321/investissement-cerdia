'use client'

import { useState, useEffect } from 'react'
import { useInvestment } from '@/contexts/InvestmentContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { Building2, Plus, Edit2, Trash2, MapPin, Calendar, DollarSign, TrendingUp, X, AlertCircle, CheckCircle, Clock, FileImage, RefreshCw, Calculator } from 'lucide-react'
import ProjectAttachments from './ProjectAttachments'
import { getCurrentExchangeRate } from '@/lib/exchangeRate'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

interface PropertyFormData {
  name: string
  location: string
  status: string
  total_cost: number
  paid_amount: number
  reservation_date: string
  expected_roi: number
  // Payment schedule fields
  currency: string
  payment_schedule_type: string
  reservation_deposit: number
  reservation_deposit_cad: number
  payment_start_date: string
}

interface PaymentTerm {
  label: string
  amount_type: 'percentage' | 'fixed_amount' // Type: pourcentage ou montant fixe
  percentage: number
  fixed_amount: number
  due_date: string // Date d'échéance au format YYYY-MM-DD
}

export default function ProjetTab() {
  const {
    properties,
    addProperty,
    updateProperty,
    deleteProperty,
    paymentSchedules,
    fetchPaymentSchedules,
    transactions,
    loading
  } = useInvestment()
  const { t, language } = useLanguage()

  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null)
  const [showTransactionsPropertyId, setShowTransactionsPropertyId] = useState<string | null>(null)
  const [showAttachmentsPropertyId, setShowAttachmentsPropertyId] = useState<string | null>(null)
  const [exchangeRate, setExchangeRate] = useState<number>(1.35)
  const [loadingRate, setLoadingRate] = useState(false)
  const [scenarios, setScenarios] = useState<any[]>([])
  const [scenarioResults, setScenarioResults] = useState<any[]>([])

  const supabase = createClientComponentClient()

  const [formData, setFormData] = useState<PropertyFormData>({
    name: '',
    location: '',
    status: 'reservation',
    total_cost: 0,
    paid_amount: 0,
    reservation_date: new Date().toISOString().split('T')[0],
    expected_roi: 0,
    currency: 'USD',
    payment_schedule_type: 'one_time',
    reservation_deposit: 0,
    reservation_deposit_cad: 0,
    payment_start_date: new Date().toISOString().split('T')[0]
  })

  const [paymentTerms, setPaymentTerms] = useState<PaymentTerm[]>([
    { label: 'Acompte', amount_type: 'percentage', percentage: 50, fixed_amount: 0, due_date: new Date().toISOString().split('T')[0] },
    { label: '2e versement', amount_type: 'percentage', percentage: 20, fixed_amount: 0, due_date: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0] },
    { label: '3e versement', amount_type: 'percentage', percentage: 20, fixed_amount: 0, due_date: new Date(Date.now() + 60*24*60*60*1000).toISOString().split('T')[0] },
    { label: 'Versement final', amount_type: 'percentage', percentage: 10, fixed_amount: 0, due_date: new Date(Date.now() + 90*24*60*60*1000).toISOString().split('T')[0] }
  ])

  // Fetch payment schedules when component mounts
  useEffect(() => {
    fetchPaymentSchedules()
  }, [fetchPaymentSchedules])

  // Load exchange rate on mount
  useEffect(() => {
    loadExchangeRate()
  }, [])

  // Load scenarios and their results for converted projects
  useEffect(() => {
    const loadScenarios = async () => {
      try {
        const { data: scenariosData, error: scenariosError } = await supabase
          .from('scenarios')
          .select('*')
          .eq('status', 'purchased')

        if (scenariosError) throw scenariosError
        setScenarios(scenariosData || [])

        // Load scenario results for all scenarios
        if (scenariosData && scenariosData.length > 0) {
          const { data: resultsData, error: resultsError } = await supabase
            .from('scenario_results')
            .select('*')
            .in('scenario_id', scenariosData.map(s => s.id))

          if (resultsError) throw resultsError
          setScenarioResults(resultsData || [])
        }
      } catch (error) {
        console.error('Error loading scenarios:', error)
      }
    }

    loadScenarios()
  }, [properties])

  const loadExchangeRate = async () => {
    setLoadingRate(true)
    try {
      const rate = await getCurrentExchangeRate('USD', 'CAD')
      setExchangeRate(rate)
    } catch (error) {
      console.error('Error loading exchange rate:', error)
    } finally {
      setLoadingRate(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!editingId) {
      alert(t('projects.cannotAddManually'))
      return
    }

    // Update existing property
    const result = await updateProperty(editingId, formData)
    if (result.success) {
      setEditingId(null)
      setShowAddForm(false)
      resetForm()
    } else {
      alert(t('projects.updateError') + result.error)
    }
  }

  const handleEdit = (property: any) => {
    setEditingId(property.id)
    setFormData({
      name: property.name,
      location: property.location,
      status: property.status,
      total_cost: property.total_cost,
      paid_amount: property.paid_amount,
      reservation_date: property.reservation_date.split('T')[0],
      expected_roi: property.expected_roi,
      currency: property.currency || 'USD',
      payment_schedule_type: property.payment_schedule_type || 'one_time',
      reservation_deposit: property.reservation_deposit || 0,
      reservation_deposit_cad: property.reservation_deposit_cad || 0,
      payment_start_date: property.payment_start_date?.split('T')[0] || new Date().toISOString().split('T')[0]
    })
    setShowAddForm(true)
  }

  const handleDelete = async (id: string, name: string) => {
    if (confirm(t('projects.confirmDelete') + ` "${name}" ?`)) {
      const result = await deleteProperty(id)
      if (!result.success) {
        alert(t('error.deleteFailed') + ': ' + result.error)
      }
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      location: '',
      status: 'reservation',
      total_cost: 0,
      paid_amount: 0,
      reservation_date: new Date().toISOString().split('T')[0],
      expected_roi: 0,
      currency: 'USD',
      payment_schedule_type: 'one_time',
      reservation_deposit: 0,
      reservation_deposit_cad: 0,
      payment_start_date: new Date().toISOString().split('T')[0]
    })
    setShowAddForm(false)
    setEditingId(null)
  }

  const addPaymentTerm = () => {
    setPaymentTerms([...paymentTerms, { label: '', amount_type: 'percentage', percentage: 0, fixed_amount: 0, due_date: new Date().toISOString().split('T')[0] }])
  }

  const removePaymentTerm = (index: number) => {
    setPaymentTerms(paymentTerms.filter((_, i) => i !== index))
  }

  const updatePaymentTerm = (index: number, field: keyof PaymentTerm, value: string | number) => {
    const updated = [...paymentTerms]
    updated[index] = { ...updated[index], [field]: value }
    setPaymentTerms(updated)
  }

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      reservation: { bg: 'bg-blue-100', text: 'text-blue-800', label: t('status.reservation') },
      en_construction: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: t('status.construction') },
      complete: { bg: 'bg-green-100', text: 'text-green-800', label: t('status.completed') },
      actif: { bg: 'bg-purple-100', text: 'text-purple-800', label: t('status.active') }
    }
    const badge = badges[status] || badges.reservation
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    )
  }

  const getPaymentStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="text-green-600" size={16} />
      case 'overdue':
        return <AlertCircle className="text-red-600" size={16} />
      default:
        return <Clock className="text-gray-400" size={16} />
    }
  }

  const getPropertyPayments = (propertyId: string) => {
    return paymentSchedules.filter(ps => ps.property_id === propertyId)
  }

  // Calculer le total payé en CAD depuis les transactions (source de vérité unique)
  const calculateTotalPaidCAD = (propertyId: string) => {
    return transactions
      .filter(t => t.property_id === propertyId)
      .reduce((sum, t) => sum + t.amount, 0)
  }

  // Calculer le total payé en USD (montant source) depuis les transactions
  const calculateTotalPaidUSD = (propertyId: string) => {
    return transactions
      .filter(t => t.property_id === propertyId && t.source_currency === 'USD' && t.source_amount)
      .reduce((sum, t) => sum + (t.source_amount || 0), 0)
  }

  // Calculer le total payé en devise du contrat (pour progression)
  const calculateTotalPaidInPropertyCurrency = (propertyId: string, currency: string) => {
    if (currency === 'CAD') {
      // Si le contrat est en CAD, on prend directement le montant CAD
      return calculateTotalPaidCAD(propertyId)
    } else {
      // Si le contrat est en USD (ou autre), on prend le montant source USD
      return calculateTotalPaidUSD(propertyId)
    }
  }

  return (
    <div className="space-y-6 mt-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{t('projects.title')}</h2>
          <p className="text-sm sm:text-base text-gray-600 mt-1">{t('projects.convertedFromScenarios')}</p>
        </div>
      </div>

      {/* Edit Form (modification uniquement) */}
      {showAddForm && editingId && (
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md border border-gray-200">
          <h3 className="text-base sm:text-lg font-semibold mb-4">
            Modifier la propriété
          </h3>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom de la propriété *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                  placeholder="Ex: Oasis Bay A301"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Localisation *
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                  placeholder="Ex: Punta Cana, République Dominicaine"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Statut *
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent bg-white"
                  required
                >
                  <option value="reservation">Réservation</option>
                  <option value="en_construction">En construction</option>
                  <option value="complete">Complété</option>
                  <option value="actif">Actif</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date de réservation *
                </label>
                <input
                  type="date"
                  value={formData.reservation_date}
                  onChange={(e) => setFormData({ ...formData, reservation_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Devise *
                </label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent bg-white"
                  required
                >
                  <option value="USD">USD ($)</option>
                  <option value="CAD">CAD ($)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Coût total *
                </label>
                <input
                  type="number"
                  value={formData.total_cost}
                  onChange={(e) => setFormData({ ...formData, total_cost: parseFloat(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                  placeholder="Ex: 150000"
                  min="0"
                  step="0.01"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Montant payé
                </label>
                <input
                  type="number"
                  value={formData.paid_amount}
                  onChange={(e) => setFormData({ ...formData, paid_amount: parseFloat(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                  placeholder="Ex: 116817.94"
                  min="0"
                  step="0.01"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ROI attendu (%) *
                </label>
                <input
                  type="number"
                  value={formData.expected_roi}
                  onChange={(e) => setFormData({ ...formData, expected_roi: parseFloat(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                  placeholder="Ex: 10.2"
                  min="0"
                  step="0.1"
                  required
                />
              </div>
            </div>

            {/* Payment Schedule Section */}
            <div className="border-t border-gray-200 pt-6">
              <h4 className="text-sm sm:text-base font-semibold text-gray-900 mb-4">Configuration des Paiements</h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Acompte de réservation ({formData.currency})
                  </label>
                  <input
                    type="number"
                    value={formData.reservation_deposit}
                    onChange={(e) => setFormData({ ...formData, reservation_deposit: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                    placeholder="Ex: 10000"
                    min="0"
                    step="0.01"
                  />
                  <p className="text-xs text-gray-500 mt-1">Ce montant se déduit du total</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Acompte payé en CAD
                  </label>
                  <input
                    type="number"
                    value={formData.reservation_deposit_cad}
                    onChange={(e) => setFormData({ ...formData, reservation_deposit_cad: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                    placeholder="Ex: 13500"
                    min="0"
                    step="0.01"
                  />
                  <p className="text-xs text-gray-500 mt-1">Montant réel en économie canadienne</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type de calendrier de paiement
                  </label>
                  <select
                    value={formData.payment_schedule_type}
                    onChange={(e) => setFormData({ ...formData, payment_schedule_type: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent bg-white"
                  >
                    <option value="one_time">Paiement unique</option>
                    <option value="fixed_terms">Termes fixes (personnalisés)</option>
                    <option value="monthly_degressive">Mensuel dégressif</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date de début des paiements
                  </label>
                  <input
                    type="date"
                    value={formData.payment_start_date}
                    onChange={(e) => setFormData({ ...formData, payment_start_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                  />
                </div>
              </div>

              {/* Fixed Terms Configuration */}
              {formData.payment_schedule_type === 'fixed_terms' && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="text-sm font-semibold text-gray-900">Termes de paiement</h5>
                    <button
                      type="button"
                      onClick={addPaymentTerm}
                      className="text-sm text-[#5e5e5e] hover:text-[#3e3e3e] font-medium"
                    >
                      + Ajouter un terme
                    </button>
                  </div>

                  {/* En-têtes des colonnes */}
                  <div className="grid grid-cols-[1fr_90px_100px_120px_140px_40px] gap-2 mb-2 px-1">
                    <div className="text-xs font-semibold text-gray-600">Label</div>
                    <div className="text-xs font-semibold text-gray-600">Type</div>
                    <div className="text-xs font-semibold text-gray-600">Valeur</div>
                    <div className="text-xs font-semibold text-gray-600">Montant ({formData.currency})</div>
                    <div className="text-xs font-semibold text-gray-600">Date échéance</div>
                    <div></div>
                  </div>

                  <div className="space-y-2">
                    {paymentTerms.map((term, index) => {
                      // Calculer le montant selon le type
                      const amountAfterDeposit = (formData.total_cost || 0) - (formData.reservation_deposit || 0)
                      const calculatedAmount = term.amount_type === 'percentage'
                        ? amountAfterDeposit * (term.percentage / 100)
                        : term.fixed_amount

                      return (
                        <div key={index} className="grid grid-cols-[1fr_90px_100px_120px_140px_40px] gap-2 items-center">
                          <input
                            type="text"
                            value={term.label}
                            onChange={(e) => updatePaymentTerm(index, 'label', e.target.value)}
                            placeholder="Ex: Réservation"
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          />
                          <select
                            value={term.amount_type}
                            onChange={(e) => updatePaymentTerm(index, 'amount_type', e.target.value as 'percentage' | 'fixed_amount')}
                            className="px-2 py-2 border border-gray-300 rounded-lg text-sm"
                          >
                            <option value="percentage">%</option>
                            <option value="fixed_amount">$</option>
                          </select>
                          {term.amount_type === 'percentage' ? (
                            <input
                              type="number"
                              value={term.percentage}
                              onChange={(e) => updatePaymentTerm(index, 'percentage', parseFloat(e.target.value) || 0)}
                              placeholder="%"
                              className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm text-center"
                              min="0"
                              max="100"
                              step="0.1"
                            />
                          ) : (
                            <input
                              type="number"
                              value={term.fixed_amount}
                              onChange={(e) => updatePaymentTerm(index, 'fixed_amount', parseFloat(e.target.value) || 0)}
                              placeholder="Montant"
                              className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm text-right"
                              min="0"
                              step="100"
                            />
                          )}
                          <div className="px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-sm text-right font-medium text-gray-700">
                            {calculatedAmount.toLocaleString('fr-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </div>
                          <input
                            type="date"
                            value={term.due_date}
                            onChange={(e) => updatePaymentTerm(index, 'due_date', e.target.value)}
                            className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => removePaymentTerm(index)}
                            className="text-red-600 hover:text-red-800 p-1"
                            title="Supprimer"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )
                    })}
                  </div>

                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-600">Total pourcentages:</span>
                        <span className={`ml-2 font-bold ${paymentTerms.filter(t => t.amount_type === 'percentage').reduce((sum, term) => sum + term.percentage, 0) === 100 || paymentTerms.every(t => t.amount_type === 'fixed_amount') ? 'text-green-600' : 'text-orange-600'}`}>
                          {paymentTerms.filter(t => t.amount_type === 'percentage').reduce((sum, term) => sum + term.percentage, 0).toFixed(1)}%
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Total montant:</span>
                        <span className="ml-2 font-bold text-blue-600">
                          {paymentTerms.reduce((sum, term) => {
                            const amountAfterDeposit = (formData.total_cost || 0) - (formData.reservation_deposit || 0)
                            return sum + (term.amount_type === 'percentage'
                              ? amountAfterDeposit * (term.percentage / 100)
                              : term.fixed_amount)
                          }, 0).toLocaleString('fr-CA', { style: 'currency', currency: formData.currency })}
                        </span>
                      </div>
                    </div>
                    {paymentTerms.some(t => t.amount_type === 'percentage') &&
                     paymentTerms.filter(t => t.amount_type === 'percentage').reduce((sum, term) => sum + term.percentage, 0) !== 100 && (
                      <p className="text-xs text-orange-600 mt-2">⚠️ Les termes en % totalisent {paymentTerms.filter(t => t.amount_type === 'percentage').reduce((sum, term) => sum + term.percentage, 0).toFixed(1)}% (devrait être 100%)</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto bg-[#5e5e5e] hover:bg-[#3e3e3e] text-white px-6 py-2 rounded-full transition-colors disabled:opacity-50"
              >
                {loading ? 'Enregistrement...' : editingId ? 'Modifier' : 'Ajouter'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="w-full sm:w-auto bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-2 rounded-full transition-colors"
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Properties List */}
      {properties.length === 0 ? (
        <div className="bg-white p-12 rounded-lg shadow-md text-center">
          <Building2 size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucun projet actif</h3>
          <p className="text-gray-600 mb-2">Les projets sont créés automatiquement depuis l'onglet <strong>Évaluateur</strong></p>
          <p className="text-sm text-gray-500">Créez un scénario → Analysez → Vote des investisseurs → Marquez comme acheté</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
          {properties.map((property) => {
            // Calculer les montants depuis les transactions (source unique de vérité)
            const totalPaidCAD = calculateTotalPaidCAD(property.id)
            const totalPaidUSD = calculateTotalPaidUSD(property.id)
            const totalPaidInPropertyCurrency = calculateTotalPaidInPropertyCurrency(property.id, property.currency || 'USD')

            // Calculer la progression basée sur les transactions
            const progress = property.total_cost > 0 ? (totalPaidInPropertyCurrency / property.total_cost) * 100 : 0
            const remaining = property.total_cost - totalPaidInPropertyCurrency

            const propertyPayments = getPropertyPayments(property.id)
            const pendingPayments = propertyPayments.filter(p => p.status === 'pending').length
            const overduePayments = propertyPayments.filter(p => p.status === 'overdue').length

            // Trouver le scénario d'origine pour ce projet
            const originScenario = scenarios.find(s => s.converted_property_id === property.id)
            const scenarioData = originScenario ? scenarioResults.filter(r => r.scenario_id === originScenario.id) : []
            const moderateScenario = scenarioData.find(r => r.scenario_type === 'moderate')

            return (
              <div key={property.id} className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
                {/* Header */}
                <div className="p-4 sm:p-6 border-b border-gray-100">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900 mb-1">{property.name}</h3>
                      <div className="flex items-center text-sm text-gray-600 gap-1">
                        <MapPin size={14} />
                        {property.location}
                      </div>
                    </div>
                    {getStatusBadge(property.status)}
                  </div>

                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Calendar size={14} />
                      Réservé le {new Date(property.reservation_date).toLocaleDateString('fr-CA')}
                    </div>
                    <div className="font-semibold text-xs bg-gray-100 px-2 py-1 rounded">
                      {property.currency || 'USD'}
                    </div>
                  </div>
                </div>

                {/* Body */}
                <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                  {/* Progression */}
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600 font-medium">Progression</span>
                      <span className="font-bold text-gray-900">{progress.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-blue-600 h-3 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs mt-2 text-gray-600">
                      <span>
                        {totalPaidInPropertyCurrency.toLocaleString('fr-CA', { style: 'currency', currency: property.currency || 'USD', minimumFractionDigits: 0 })} payé
                      </span>
                      <span>
                        {remaining.toLocaleString('fr-CA', { style: 'currency', currency: property.currency || 'USD', minimumFractionDigits: 0 })} restant
                      </span>
                    </div>
                  </div>

                  {/* USD vs CAD Comparison */}
                  {property.currency === 'USD' && (totalPaidUSD > 0 || totalPaidCAD > 0) && (
                    <div className="grid grid-cols-2 gap-2">
                      {/* Montant USD contractuel */}
                      <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                        <div className="text-xs text-blue-700 font-medium mb-1">Contrat (USD)</div>
                        <div className="text-base font-bold text-blue-900">
                          {totalPaidUSD.toLocaleString('fr-CA', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })}
                        </div>
                        <div className="text-xs text-blue-600 mt-1">Montant attendu</div>
                      </div>

                      {/* Montant CAD réellement payé */}
                      <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                        <div className="text-xs text-green-700 font-medium mb-1">Payé (CAD)</div>
                        <div className="text-base font-bold text-green-900">
                          {totalPaidCAD.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
                        </div>
                        <div className="text-xs text-green-600 mt-1">
                          {totalPaidUSD > 0 && totalPaidCAD > 0
                            ? `Taux: ${(totalPaidCAD / totalPaidUSD).toFixed(4)}`
                            : 'Coût réel'
                          }
                        </div>
                      </div>
                    </div>
                  )}

                  {/* CAD Only Tracking (pour contrats en CAD) */}
                  {property.currency === 'CAD' && totalPaidCAD > 0 && (
                    <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                      <div className="text-xs text-green-700 font-medium mb-1">Total payé en CAD</div>
                      <div className="text-lg font-bold text-green-800">
                        {totalPaidCAD.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
                      </div>
                      <div className="text-xs text-green-600 mt-1">Coût total</div>
                    </div>
                  )}

                  {/* Scenario Information */}
                  {originScenario && moderateScenario && (
                    <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Calculator size={14} className="text-purple-700" />
                        <div className="text-xs font-bold text-purple-900">{t('projectScenario.title')}</div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <div className="text-xs text-purple-700">{t('scenarioResults.avgAnnualReturn')}</div>
                          <div className="text-sm font-bold text-purple-900">
                            {moderateScenario.summary.avg_annual_return?.toFixed(2)}%
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-purple-700">{t('scenarioResults.totalReturn')}</div>
                          <div className="text-sm font-bold text-purple-900">
                            {moderateScenario.summary.total_return?.toFixed(1)}%
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-purple-700">{t('scenarioResults.breakEven')}</div>
                          <div className="text-sm font-bold text-purple-900">
                            {t('scenarioResults.year')} {moderateScenario.summary.break_even_year}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-purple-700">{t('scenarioResults.recommendation')}</div>
                          <div className={`text-xs font-bold ${
                            moderateScenario.summary.recommendation === 'recommended' ? 'text-green-700' :
                            moderateScenario.summary.recommendation === 'not_recommended' ? 'text-red-700' : 'text-yellow-700'
                          }`}>
                            {moderateScenario.summary.recommendation === 'recommended' ? '✅ ' + t('scenarioResults.recommended') :
                             moderateScenario.summary.recommendation === 'not_recommended' ? '⚠️ ' + t('scenarioResults.notRecommended') : '📊 ' + t('scenarioResults.toConsider')}
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-purple-600 mt-2">
                        {t('projectScenario.createdOn')} {new Date(originScenario.created_at).toLocaleDateString(language === 'fr' ? 'fr-CA' : 'en-CA')}
                      </div>
                    </div>
                  )}

                  {/* Payment Alerts */}
                  {(pendingPayments > 0 || overduePayments > 0) && (
                    <div className="flex gap-2">
                      {pendingPayments > 0 && (
                        <div className="flex-1 bg-blue-50 p-2 rounded-lg border border-blue-200">
                          <div className="flex items-center gap-1 text-xs text-blue-700">
                            <Clock size={12} />
                            {pendingPayments} en attente
                          </div>
                        </div>
                      )}
                      {overduePayments > 0 && (
                        <div className="flex-1 bg-red-50 p-2 rounded-lg border border-red-200">
                          <div className="flex items-center gap-1 text-xs text-red-700">
                            <AlertCircle size={12} />
                            {overduePayments} en retard
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Payment Schedule */}
                  {propertyPayments.length > 0 && (
                    <div>
                      <button
                        onClick={() => setSelectedPropertyId(selectedPropertyId === property.id ? null : property.id)}
                        className="text-sm font-medium text-[#5e5e5e] hover:text-[#3e3e3e] mb-2"
                      >
                        {selectedPropertyId === property.id ? '▼' : '▶'} Calendrier de paiements ({propertyPayments.length})
                      </button>

                      {selectedPropertyId === property.id && (
                        <div className="space-y-2 mt-2">
                          {/* Exchange Rate Display */}
                          <div className="bg-blue-50 p-2 rounded-lg border border-blue-200 flex items-center justify-between">
                            <div className="text-xs font-medium text-blue-900">
                              Taux USD→CAD: <span className="font-bold">{exchangeRate.toFixed(4)}</span>
                            </div>
                            <button
                              onClick={loadExchangeRate}
                              disabled={loadingRate}
                              className="text-blue-600 hover:text-blue-800 p-1 rounded"
                              title="Rafraîchir"
                            >
                              <RefreshCw size={12} className={loadingRate ? 'animate-spin' : ''} />
                            </button>
                          </div>

                          {propertyPayments.map(payment => {
                            // Chercher les transactions réelles liées à ce paiement
                            const paymentTransactions = transactions.filter(tx => tx.payment_schedule_id === payment.id)

                            // Calculer montant USD réel payé (depuis transactions)
                            const actualPaidUSD = paymentTransactions
                              .filter(tx => tx.source_currency === 'USD' && tx.source_amount)
                              .reduce((sum, tx) => sum + (tx.source_amount || 0), 0)

                            // Calculer montant CAD réel payé (depuis transactions)
                            const actualPaidCAD = paymentTransactions
                              .reduce((sum, tx) => sum + tx.amount, 0)

                            // Calculer taux de change effectif
                            const effectiveRate = actualPaidUSD > 0 ? actualPaidCAD / actualPaidUSD : null

                            // Montant CAD à afficher
                            const amountCAD = payment.status === 'paid' && actualPaidCAD > 0
                              ? actualPaidCAD
                              : payment.currency === 'USD' ? payment.amount * exchangeRate : payment.amount

                            return (
                              <div key={payment.id} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                                {/* Header with status and label */}
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    {getPaymentStatusIcon(payment.status)}
                                    <span className="text-sm font-medium text-gray-900">
                                      {payment.term_label}
                                    </span>
                                  </div>
                                </div>

                                {/* Affichage USD vs CAD en deux lignes claires */}
                                {payment.currency === 'USD' ? (
                                  <div className="space-y-2 mb-2">
                                    {/* Ligne 1: Montant USD attendu (contrat) */}
                                    <div className="bg-blue-50 p-2 rounded border border-blue-200">
                                      <div className="flex items-center justify-between">
                                        <div className="text-xs text-blue-700 font-medium">Terme attendu (USD)</div>
                                        <div className="text-base font-bold text-blue-900">
                                          {payment.amount.toLocaleString('fr-CA', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })}
                                        </div>
                                      </div>
                                      <div className="text-xs text-blue-600 mt-1">Montant selon le contrat</div>
                                    </div>

                                    {/* Ligne 2: Montant CAD réellement payé */}
                                    <div className={`p-2 rounded border ${actualPaidCAD > 0 ? 'bg-green-50 border-green-300' : 'bg-gray-50 border-gray-300'}`}>
                                      <div className="flex items-center justify-between">
                                        <div className={`text-xs font-medium ${actualPaidCAD > 0 ? 'text-green-700' : 'text-gray-700'}`}>
                                          {actualPaidCAD > 0 ? 'Payé à la banque (CAD)' : 'À payer (CAD estimé)'}
                                        </div>
                                        <div className={`text-base font-bold ${actualPaidCAD > 0 ? 'text-green-900' : 'text-gray-900'}`}>
                                          {amountCAD.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
                                        </div>
                                      </div>
                                      <div className={`text-xs mt-1 flex items-center justify-between ${actualPaidCAD > 0 ? 'text-green-600' : 'text-gray-600'}`}>
                                        {effectiveRate ? (
                                          <>
                                            <span>Taux effectif: {effectiveRate.toFixed(4)}</span>
                                            {actualPaidUSD > 0 && (
                                              <span className="font-medium">{actualPaidUSD.toLocaleString('fr-CA', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })} USD payé</span>
                                            )}
                                          </>
                                        ) : (
                                          <span>Taux actuel: {exchangeRate.toFixed(4)}</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  // Pour les contrats en CAD, affichage simple
                                  <div className="bg-gray-50 p-2 rounded border border-gray-200 mb-2">
                                    <div className="flex items-center justify-between">
                                      <div className="text-xs text-gray-700 font-medium">Montant (CAD)</div>
                                      <div className="text-base font-bold text-gray-900">
                                        {payment.amount.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Date info */}
                                <div className="flex items-center justify-between text-xs text-gray-600">
                                  <span>Échéance: {new Date(payment.due_date).toLocaleDateString('fr-CA')}</span>
                                  {payment.status === 'paid' && payment.paid_date && (
                                    <span className="text-green-600 font-medium">
                                      Payé le {new Date(payment.paid_date).toLocaleDateString('fr-CA')}
                                    </span>
                                  )}
                                </div>

                                {payment.status === 'pending' && (
                                  <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-900">
                                    <p className="mb-1">💡 Pour effectuer ce paiement :</p>
                                    <p className="text-blue-700">Allez dans <strong>Administration → Transactions</strong></p>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Historique des transactions */}
                  <div>
                    <button
                      onClick={() => setShowTransactionsPropertyId(showTransactionsPropertyId === property.id ? null : property.id)}
                      className="text-sm font-medium text-[#5e5e5e] hover:text-[#3e3e3e] mb-2"
                    >
                      {showTransactionsPropertyId === property.id ? '▼' : '▶'} Historique des transactions ({transactions.filter(tx => tx.property_id === property.id).length})
                    </button>

                    {showTransactionsPropertyId === property.id && (
                      <div className="space-y-2 mt-2">
                        {transactions.filter(tx => tx.property_id === property.id).length === 0 ? (
                          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-center">
                            <p className="text-sm text-gray-600">Aucune transaction pour ce projet</p>
                            <p className="text-xs text-gray-500 mt-1">Les transactions apparaîtront ici automatiquement</p>
                          </div>
                        ) : (
                          transactions
                            .filter(tx => tx.property_id === property.id)
                            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                            .map(tx => (
                              <div key={tx.id} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex-1">
                                    <div className="text-sm font-medium text-gray-900">{tx.description}</div>
                                    <div className="text-xs text-gray-600 mt-1">
                                      {new Date(tx.date).toLocaleDateString('fr-CA')}
                                      {tx.reference_number && ` • Réf: ${tx.reference_number}`}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className={`text-sm font-bold ${tx.type === 'investissement' ? 'text-green-600' : 'text-red-600'}`}>
                                      {tx.type === 'investissement' ? '+' : '-'}{tx.amount.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
                                    </div>
                                    {tx.source_currency === 'USD' && tx.source_amount && (
                                      <div className="text-xs text-gray-600 mt-1">
                                        {tx.source_amount.toLocaleString('fr-CA', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 text-xs">
                                  <span className={`px-2 py-1 rounded text-white ${
                                    tx.type === 'investissement' ? 'bg-green-600' :
                                    tx.type === 'retrait' ? 'bg-red-600' :
                                    'bg-blue-600'
                                  }`}>
                                    {tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}
                                  </span>

                                  <span className="px-2 py-1 bg-gray-200 text-gray-700 rounded">
                                    {tx.payment_method}
                                  </span>

                                  {tx.source_currency === 'USD' && tx.exchange_rate && (
                                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
                                      Taux: {tx.exchange_rate.toFixed(4)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))
                        )}
                      </div>
                    )}
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                    <div>
                      <div className="flex items-center gap-1 text-gray-600 text-xs mb-1">
                        <DollarSign size={12} />
                        Coût total
                      </div>
                      <div className="font-bold text-gray-900">
                        {property.total_cost.toLocaleString('fr-CA', { style: 'currency', currency: property.currency || 'USD', minimumFractionDigits: 0 })}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-1 text-gray-600 text-xs mb-1">
                        <TrendingUp size={12} />
                        ROI attendu
                      </div>
                      <div className="font-bold text-green-600">
                        {property.expected_roi}%
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="px-4 sm:px-6 py-3 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={() => setShowAttachmentsPropertyId(property.id)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm font-medium"
                  >
                    <FileImage size={16} />
                    Pièces jointes
                  </button>
                  <button
                    onClick={() => handleEdit(property)}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
                  >
                    <Edit2 size={16} />
                    <span className="sm:hidden">Modifier</span>
                  </button>
                  <button
                    onClick={() => handleDelete(property.id, property.name)}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-medium"
                  >
                    <Trash2 size={16} />
                    <span className="sm:hidden">Supprimer</span>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Project Attachments Modal */}
      {showAttachmentsPropertyId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-[95vw] sm:max-w-5xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Pièces jointes du projet</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {properties.find(p => p.id === showAttachmentsPropertyId)?.name}
                </p>
              </div>
              <button
                onClick={() => setShowAttachmentsPropertyId(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
              <ProjectAttachments
                propertyId={showAttachmentsPropertyId}
                onClose={() => setShowAttachmentsPropertyId(null)}
              />
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
