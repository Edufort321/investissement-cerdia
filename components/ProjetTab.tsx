'use client'

import { useState, useEffect } from 'react'
import { useInvestment } from '@/contexts/InvestmentContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { Building2, Plus, Edit2, Trash2, MapPin, Calendar, DollarSign, TrendingUp, X, AlertCircle, CheckCircle, Clock, FileImage, RefreshCw } from 'lucide-react'
import ProjectAttachments from './ProjectAttachments'
import { getCurrentExchangeRate } from '@/lib/exchangeRate'

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
  percentage: number
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
    markPaymentAsPaid,
    loading
  } = useInvestment()
  const { t, language } = useLanguage()

  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<any>(null)
  const [showAttachmentsPropertyId, setShowAttachmentsPropertyId] = useState<string | null>(null)
  const [exchangeRate, setExchangeRate] = useState<number>(1.35)
  const [loadingRate, setLoadingRate] = useState(false)

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
    { label: 'Acompte', percentage: 50, due_date: new Date().toISOString().split('T')[0] },
    { label: '2e versement', percentage: 20, due_date: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0] },
    { label: '3e versement', percentage: 20, due_date: new Date(Date.now() + 60*24*60*60*1000).toISOString().split('T')[0] },
    { label: 'Versement final', percentage: 10, due_date: new Date(Date.now() + 90*24*60*60*1000).toISOString().split('T')[0] }
  ])

  const [paymentFormData, setPaymentFormData] = useState({
    paid_date: new Date().toISOString().split('T')[0],
    amount_usd: 0,
    amount_cad_conversion: 0,
    fees_cad: 0,
    amount_cad_total: 0,
    effective_exchange_rate: 1.35
  })

  // Fetch payment schedules when component mounts
  useEffect(() => {
    fetchPaymentSchedules()
  }, [fetchPaymentSchedules])

  // Load exchange rate on mount
  useEffect(() => {
    loadExchangeRate()
  }, [])

  const loadExchangeRate = async () => {
    setLoadingRate(true)
    try {
      const rate = await getCurrentExchangeRate('USD', 'CAD')
      setExchangeRate(rate)
      // Update the payment form with the new rate
      setPaymentFormData(prev => ({ ...prev, exchange_rate: rate }))
    } catch (error) {
      console.error('Error loading exchange rate:', error)
    } finally {
      setLoadingRate(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (editingId) {
      // Update existing property
      const result = await updateProperty(editingId, formData)
      if (result.success) {
        setEditingId(null)
        resetForm()
      } else {
        alert('Erreur lors de la modification: ' + result.error)
      }
    } else {
      // Add new property
      const result = await addProperty(formData)
      if (result.success) {
        setShowAddForm(false)
        resetForm()
      } else {
        alert('Erreur lors de l\'ajout: ' + result.error)
      }
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

  const handleMarkAsPaid = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPayment) return

    // Utiliser le taux effectif (incluant frais) pour marquer le paiement
    const result = await markPaymentAsPaid(
      selectedPayment.id,
      paymentFormData.paid_date,
      paymentFormData.amount_cad_total, // Total incluant frais
      paymentFormData.effective_exchange_rate // Taux effectif
    )

    if (result.success) {
      setShowPaymentModal(false)
      setSelectedPayment(null)
      setPaymentFormData({
        paid_date: new Date().toISOString().split('T')[0],
        amount_usd: 0,
        amount_cad_conversion: 0,
        fees_cad: 0,
        amount_cad_total: 0,
        effective_exchange_rate: 1.35
      })
    } else {
      alert(t('error.generic') + ': ' + result.error)
    }
  }

  const openPaymentModal = (payment: any) => {
    const amountUSD = payment.amount
    const conversion = amountUSD * exchangeRate

    setSelectedPayment(payment)
    setPaymentFormData({
      paid_date: new Date().toISOString().split('T')[0],
      amount_usd: amountUSD,
      amount_cad_conversion: conversion,
      fees_cad: 0,
      amount_cad_total: conversion,
      effective_exchange_rate: exchangeRate
    })
    setShowPaymentModal(true)
  }

  // Fonction pour recalculer le total CAD et taux effectif
  const updateCADCalculations = (conversionCAD: number, fees: number, amountUSD: number) => {
    const total = conversionCAD + fees
    const effectiveRate = amountUSD > 0 ? total / amountUSD : 0

    setPaymentFormData(prev => ({
      ...prev,
      amount_cad_conversion: conversionCAD,
      fees_cad: fees,
      amount_cad_total: total,
      effective_exchange_rate: effectiveRate
    }))
  }

  const addPaymentTerm = () => {
    setPaymentTerms([...paymentTerms, { label: '', percentage: 0, due_date: new Date().toISOString().split('T')[0] }])
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

  const calculateTotalPaidCAD = (propertyId: string) => {
    const payments = getPropertyPayments(propertyId).filter(p => p.status === 'paid')
    return payments.reduce((sum, p) => sum + (p.amount_paid_cad || 0), 0)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{t('projects.title')}</h2>
          <p className="text-sm sm:text-base text-gray-600 mt-1">{t('projects.subtitle')}</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 bg-[#5e5e5e] hover:bg-[#3e3e3e] text-white px-4 py-2 rounded-full transition-colors w-full sm:w-auto justify-center"
        >
          {showAddForm ? <X size={20} /> : <Plus size={20} />}
          {showAddForm ? t('common.cancel') : t('projects.add')}
        </button>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md border border-gray-200">
          <h3 className="text-base sm:text-lg font-semibold mb-4">
            {editingId ? 'Modifier la propriété' : 'Nouvelle propriété'}
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
                  <div className="grid grid-cols-[1fr_80px_120px_140px_40px] gap-2 mb-2 px-1">
                    <div className="text-xs font-semibold text-gray-600">Label</div>
                    <div className="text-xs font-semibold text-gray-600">%</div>
                    <div className="text-xs font-semibold text-gray-600">Montant ({formData.currency})</div>
                    <div className="text-xs font-semibold text-gray-600">Date échéance</div>
                    <div></div>
                  </div>

                  <div className="space-y-2">
                    {paymentTerms.map((term, index) => {
                      // Calculer le montant basé sur le pourcentage
                      const amountAfterDeposit = (formData.total_cost || 0) - (formData.reservation_deposit || 0)
                      const calculatedAmount = amountAfterDeposit * (term.percentage / 100)

                      return (
                        <div key={index} className="grid grid-cols-[1fr_80px_120px_140px_40px] gap-2 items-center">
                          <input
                            type="text"
                            value={term.label}
                            onChange={(e) => updatePaymentTerm(index, 'label', e.target.value)}
                            placeholder="Ex: Acompte"
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          />
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
                        <span className="text-gray-600">Total pourcentage:</span>
                        <span className={`ml-2 font-bold ${paymentTerms.reduce((sum, term) => sum + term.percentage, 0) === 100 ? 'text-green-600' : 'text-red-600'}`}>
                          {paymentTerms.reduce((sum, term) => sum + term.percentage, 0).toFixed(1)}%
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Total montant:</span>
                        <span className="ml-2 font-bold text-blue-600">
                          {paymentTerms.reduce((sum, term) => {
                            const amountAfterDeposit = (formData.total_cost || 0) - (formData.reservation_deposit || 0)
                            return sum + (amountAfterDeposit * (term.percentage / 100))
                          }, 0).toLocaleString('fr-CA', { style: 'currency', currency: formData.currency })}
                        </span>
                      </div>
                    </div>
                    {paymentTerms.reduce((sum, term) => sum + term.percentage, 0) !== 100 && (
                      <p className="text-xs text-red-600 mt-2">⚠️ Le total doit être égal à 100%</p>
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
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucune propriété</h3>
          <p className="text-gray-600 mb-4">Commencez par ajouter votre première propriété immobilière</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-[#5e5e5e] hover:bg-[#3e3e3e] text-white px-6 py-2 rounded-full transition-colors"
          >
            Ajouter une propriété
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
          {properties.map((property) => {
            const progress = (property.paid_amount / property.total_cost) * 100
            const remaining = property.total_cost - property.paid_amount
            const propertyPayments = getPropertyPayments(property.id)
            const totalPaidCAD = calculateTotalPaidCAD(property.id)
            const pendingPayments = propertyPayments.filter(p => p.status === 'pending').length
            const overduePayments = propertyPayments.filter(p => p.status === 'overdue').length

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
                        {property.paid_amount.toLocaleString('fr-CA', { style: 'currency', currency: property.currency || 'USD', minimumFractionDigits: 0 })} payé
                      </span>
                      <span>
                        {remaining.toLocaleString('fr-CA', { style: 'currency', currency: property.currency || 'USD', minimumFractionDigits: 0 })} restant
                      </span>
                    </div>
                  </div>

                  {/* CAD Tracking */}
                  {totalPaidCAD > 0 && (
                    <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                      <div className="text-xs text-green-700 font-medium mb-1">Total payé en CAD</div>
                      <div className="text-lg font-bold text-green-800">
                        {totalPaidCAD.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
                      </div>
                      <div className="text-xs text-green-600 mt-1">Coût réel en économie canadienne</div>
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
                            // Calculer montant en CAD (temps réel si pending, fixé si paid)
                            const amountCAD = payment.status === 'paid' && payment.amount_paid_cad
                              ? payment.amount_paid_cad
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

                                {/* Montants USD et CAD côte à côte */}
                                <div className="grid grid-cols-2 gap-2 mb-2">
                                  {/* Montant USD (contrat) */}
                                  <div className="bg-white p-2 rounded border border-gray-300">
                                    <div className="text-xs text-gray-600 mb-1">Contrat (USD)</div>
                                    <div className="text-sm font-bold text-gray-900">
                                      {payment.amount.toLocaleString('fr-CA', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })}
                                    </div>
                                  </div>

                                  {/* Montant CAD (converti ou fixé) */}
                                  <div className={`p-2 rounded border ${payment.status === 'paid' ? 'bg-green-50 border-green-300' : 'bg-blue-50 border-blue-300'}`}>
                                    <div className="text-xs text-gray-600 mb-1">
                                      {payment.status === 'paid' ? 'Payé (CAD)' : 'Estimé (CAD)'}
                                    </div>
                                    <div className={`text-sm font-bold ${payment.status === 'paid' ? 'text-green-900' : 'text-blue-900'}`}>
                                      {amountCAD.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
                                    </div>
                                    {payment.status === 'paid' && payment.exchange_rate_used && (
                                      <div className="text-xs text-green-700 mt-1">
                                        Taux: {payment.exchange_rate_used.toFixed(4)}
                                      </div>
                                    )}
                                    {payment.status === 'pending' && payment.currency === 'USD' && (
                                      <div className="text-xs text-blue-700 mt-1">
                                        Taux actuel
                                      </div>
                                    )}
                                  </div>
                                </div>

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
                                  <button
                                    onClick={() => openPaymentModal(payment)}
                                    className="mt-2 w-full bg-blue-600 hover:bg-blue-700 text-white text-xs py-1 px-3 rounded transition-colors"
                                  >
                                    Marquer comme payé
                                  </button>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}

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

      {/* Mark as Paid Modal */}
      {showPaymentModal && selectedPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-[95vw] sm:max-w-md w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Marquer le paiement comme payé</h3>

            <div className="mb-4">
              <div className="text-sm text-gray-600 mb-2">
                <strong>{selectedPayment.term_label}</strong>
              </div>
              <div className="text-lg font-bold text-gray-900 mb-1">
                {selectedPayment.amount.toLocaleString('fr-CA', { style: 'currency', currency: selectedPayment.currency })}
              </div>
              <div className="text-xs text-gray-600">
                Échéance: {new Date(selectedPayment.due_date).toLocaleDateString('fr-CA')}
              </div>
            </div>

            <form onSubmit={handleMarkAsPaid} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date de paiement *
                </label>
                <input
                  type="date"
                  value={paymentFormData.paid_date}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, paid_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>

              {/* Montant USD */}
              <div className="bg-gray-50 p-3 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Montant du contrat (USD)
                </label>
                <div className="text-2xl font-bold text-gray-900">
                  {paymentFormData.amount_usd.toLocaleString('fr-CA', { style: 'currency', currency: 'USD' })}
                </div>
              </div>

              {/* Conversion CAD */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Conversion en CAD *
                </label>
                <input
                  type="number"
                  value={paymentFormData.amount_cad_conversion}
                  onChange={(e) => {
                    const conversion = parseFloat(e.target.value) || 0
                    updateCADCalculations(conversion, paymentFormData.fees_cad, paymentFormData.amount_usd)
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  step="0.01"
                  min="0"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Montant reçu par la banque (sans frais)
                </p>
              </div>

              {/* Frais bancaires */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Frais bancaires (CAD) *
                </label>
                <input
                  type="number"
                  value={paymentFormData.fees_cad}
                  onChange={(e) => {
                    const fees = parseFloat(e.target.value) || 0
                    updateCADCalculations(paymentFormData.amount_cad_conversion, fees, paymentFormData.amount_usd)
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  step="0.01"
                  min="0"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Frais de transfert, conversion, etc.
                </p>
              </div>

              {/* Total CAD payé */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-blue-700 mb-1">Total CAD payé</div>
                    <div className="text-xl font-bold text-blue-900">
                      {paymentFormData.amount_cad_total.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD' })}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-blue-700 mb-1">Taux effectif</div>
                    <div className="text-xl font-bold text-blue-900">
                      {paymentFormData.effective_exchange_rate.toFixed(4)}
                    </div>
                    <div className="text-xs text-blue-600 mt-1">
                      (incluant frais)
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Confirmer le paiement
                </button>
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg transition-colors"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
