/**
 * Gestionnaire de Paiements Programmés
 * Permet de gérer les payment_schedules d'une propriété
 * - Éditer paiements individuels
 * - Décaler dates en masse (gestion retards)
 * - Ajouter/supprimer paiements
 * - Voir statut et progression
 */

'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Calendar,
  Edit2,
  Trash2,
  Plus,
  X,
  Save,
  AlertCircle,
  Clock,
  DollarSign,
  TrendingUp,
  ChevronRight
} from 'lucide-react'

interface PaymentSchedule {
  id: string
  property_id: string
  term_number: number
  term_label: string | null
  percentage: number | null
  amount: number
  currency: string
  due_date: string
  paid_date: string | null
  status: 'pending' | 'partial' | 'paid' | 'overdue' | 'cancelled'
  notes: string | null
  transaction_count: number
  total_amount_paid: number
  remaining_amount: number
  payment_progress_percent: number
  days_until_due: number
  alert_status: string
}

interface PaymentScheduleManagerProps {
  propertyId: string
  propertyName: string
  propertyCurrency: string
}

export default function PaymentScheduleManager({
  propertyId,
  propertyName,
  propertyCurrency
}: PaymentScheduleManagerProps) {
  const [payments, setPayments] = useState<PaymentSchedule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [shiftDaysValue, setShiftDaysValue] = useState<number>(30)
  const [showShiftForm, setShowShiftForm] = useState(false)

  // État formulaire édition
  const [editForm, setEditForm] = useState<Partial<PaymentSchedule>>({})

  // État formulaire ajout
  const [addForm, setAddForm] = useState({
    term_label: '',
    amount: 0,
    due_date: '',
    notes: ''
  })

  useEffect(() => {
    loadPayments()
  }, [propertyId])

  async function loadPayments() {
    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('v_payment_schedules_detail')
        .select('*')
        .eq('property_id', propertyId)
        .order('due_date', { ascending: true })

      if (fetchError) throw fetchError

      setPayments(data || [])
    } catch (err) {
      console.error('Error loading payments:', err)
      setError(err instanceof Error ? err.message : 'Error loading payments')
    } finally {
      setLoading(false)
    }
  }

  async function handleEditPayment(payment: PaymentSchedule) {
    setEditingId(payment.id)
    setEditForm({
      term_label: payment.term_label || '',
      amount: payment.amount,
      due_date: payment.due_date,
      notes: payment.notes || ''
    })
  }

  async function handleSavePayment() {
    if (!editingId) return

    try {
      const { error: updateError } = await supabase.rpc('update_payment_schedule', {
        p_payment_id: editingId,
        p_term_label: editForm.term_label || null,
        p_amount: editForm.amount || null,
        p_due_date: editForm.due_date || null,
        p_notes: editForm.notes || null
      })

      if (updateError) throw updateError

      setEditingId(null)
      setEditForm({})
      await loadPayments()
    } catch (err) {
      console.error('Error updating payment:', err)
      alert('Erreur lors de la mise à jour: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }
  }

  async function handleDeletePayment(paymentId: string, termLabel: string) {
    if (!confirm(`Supprimer le paiement "${termLabel}"?\n\nCette action est irréversible.`)) {
      return
    }

    try {
      const { error: deleteError } = await supabase.rpc('delete_payment_schedule', {
        p_payment_id: paymentId
      })

      if (deleteError) {
        if (deleteError.message.includes('transactions linked')) {
          alert('Impossible de supprimer ce paiement car des transactions y sont liées.\n\nSupprimez ou déliez les transactions d\'abord.')
        } else {
          throw deleteError
        }
        return
      }

      await loadPayments()
    } catch (err) {
      console.error('Error deleting payment:', err)
      alert('Erreur lors de la suppression: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }
  }

  async function handleAddPayment() {
    try {
      // Trouver le prochain numéro de terme
      const maxTermNumber = Math.max(...payments.map(p => p.term_number), 0)

      const { error: insertError } = await supabase
        .from('payment_schedules')
        .insert({
          property_id: propertyId,
          term_number: maxTermNumber + 1,
          term_label: addForm.term_label,
          amount: addForm.amount,
          currency: propertyCurrency,
          due_date: addForm.due_date,
          notes: addForm.notes,
          status: 'pending'
        })

      if (insertError) throw insertError

      setShowAddForm(false)
      setAddForm({ term_label: '', amount: 0, due_date: '', notes: '' })
      await loadPayments()
    } catch (err) {
      console.error('Error adding payment:', err)
      alert('Erreur lors de l\'ajout: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }
  }

  async function handleShiftDates(futureOnly: boolean) {
    if (!confirm(
      `Décaler les paiements ${futureOnly ? 'futurs' : 'tous'} de ${shiftDaysValue} jours?\n\n` +
      `Cette action modifiera ${futureOnly ? 'les paiements futurs seulement' : 'TOUS les paiements'}.`
    )) {
      return
    }

    try {
      const { data, error: shiftError } = await supabase.rpc('shift_property_payment_dates', {
        p_property_id: propertyId,
        p_days_offset: shiftDaysValue,
        p_apply_to_future_only: futureOnly
      })

      if (shiftError) throw shiftError

      alert(`${data} paiement(s) décalé(s) de ${shiftDaysValue} jours`)
      setShowShiftForm(false)
      await loadPayments()
    } catch (err) {
      console.error('Error shifting dates:', err)
      alert('Erreur lors du décalage: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      paid: 'bg-green-100 text-green-800 border-green-300',
      partial: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      pending: 'bg-gray-100 text-gray-800 border-gray-300',
      overdue: 'bg-red-100 text-red-800 border-red-300',
      cancelled: 'bg-gray-200 text-gray-600 border-gray-400'
    }

    const labels = {
      paid: '✅ Payé',
      partial: '⚠️ Partiel',
      pending: '⏳ En attente',
      overdue: '🔴 En retard',
      cancelled: '❌ Annulé'
    }

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg border border-gray-200 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800 text-sm flex items-center gap-2">
          <AlertCircle size={16} />
          Erreur: {error}
        </p>
      </div>
    )
  }

  const pendingPayments = payments.filter(p => p.status === 'pending' || p.status === 'partial' || p.status === 'overdue')
  const paidPayments = payments.filter(p => p.status === 'paid')

  return (
    <div className="space-y-4">
      {/* Header avec actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Calendar size={20} className="text-blue-600" />
            Paiements Programmés
          </h3>
          <p className="text-sm text-gray-600">{propertyName}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowShiftForm(!showShiftForm)}
            className="px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors text-sm flex items-center gap-1.5"
          >
            <Clock size={16} />
            Décaler dates
          </button>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm flex items-center gap-1.5"
          >
            {showAddForm ? <X size={16} /> : <Plus size={16} />}
            {showAddForm ? 'Annuler' : 'Ajouter'}
          </button>
        </div>
      </div>

      {/* Formulaire décalage dates */}
      {showShiftForm && (
        <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-3">Décaler les dates de paiement</h4>
          <p className="text-sm text-gray-700 mb-3">
            Utile si le projet prend du retard. Décale toutes les dates d'échéance.
          </p>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre de jours à ajouter
              </label>
              <input
                type="number"
                value={shiftDaysValue}
                onChange={(e) => setShiftDaysValue(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="30"
              />
              <p className="text-xs text-gray-500 mt-1">
                Exemple: +30 pour décaler de 30 jours, -7 pour avancer de 7 jours
              </p>
            </div>
            <button
              onClick={() => handleShiftDates(true)}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors whitespace-nowrap"
            >
              Futurs uniquement
            </button>
            <button
              onClick={() => handleShiftDates(false)}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors whitespace-nowrap"
            >
              Tous
            </button>
          </div>
        </div>
      )}

      {/* Formulaire ajout */}
      {showAddForm && (
        <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-3">Nouveau paiement</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Label *</label>
              <input
                type="text"
                value={addForm.term_label}
                onChange={(e) => setAddForm({ ...addForm, term_label: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="Paiement °5"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Montant * ({propertyCurrency})</label>
              <input
                type="number"
                step="0.01"
                value={addForm.amount}
                onChange={(e) => setAddForm({ ...addForm, amount: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="25000"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date d'échéance *</label>
              <input
                type="date"
                value={addForm.due_date}
                onChange={(e) => setAddForm({ ...addForm, due_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <input
                type="text"
                value={addForm.notes}
                onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="Notes optionnelles"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleAddPayment}
              disabled={!addForm.term_label || !addForm.amount || !addForm.due_date}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              Ajouter
            </button>
            <button
              onClick={() => {
                setShowAddForm(false)
                setAddForm({ term_label: '', amount: 0, due_date: '', notes: '' })
              }}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition-colors"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Liste des paiements */}
      {payments.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <Calendar size={48} className="mx-auto text-gray-400 mb-3" />
          <p className="text-gray-600">Aucun paiement programmé pour cette propriété</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
          >
            Ajouter le premier paiement
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {payments.map((payment) => {
            const isEditing = editingId === payment.id

            return (
              <div
                key={payment.id}
                className={`border rounded-lg p-4 transition-all ${
                  payment.status === 'paid'
                    ? 'bg-green-50 border-green-200'
                    : payment.status === 'overdue'
                    ? 'bg-red-50 border-red-200'
                    : payment.status === 'partial'
                    ? 'bg-yellow-50 border-yellow-200'
                    : 'bg-white border-gray-200'
                }`}
              >
                {isEditing ? (
                  /* Mode édition */
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Label</label>
                        <input
                          type="text"
                          value={editForm.term_label || ''}
                          onChange={(e) => setEditForm({ ...editForm, term_label: e.target.value })}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Montant</label>
                        <input
                          type="number"
                          step="0.01"
                          value={editForm.amount || 0}
                          onChange={(e) => setEditForm({ ...editForm, amount: parseFloat(e.target.value) || 0 })}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Date d'échéance</label>
                        <input
                          type="date"
                          value={editForm.due_date || ''}
                          onChange={(e) => setEditForm({ ...editForm, due_date: e.target.value })}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                      <input
                        type="text"
                        value={editForm.notes || ''}
                        onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded"
                        placeholder="Notes..."
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleSavePayment}
                        className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-sm flex items-center gap-1"
                      >
                        <Save size={14} />
                        Sauvegarder
                      </button>
                      <button
                        onClick={() => {
                          setEditingId(null)
                          setEditForm({})
                        }}
                        className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded text-sm"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Mode affichage */
                  <div>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-gray-900">
                            {payment.term_label || `Paiement °${payment.term_number}`}
                          </h4>
                          {getStatusBadge(payment.status)}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm mt-2">
                          <div>
                            <span className="text-gray-600">Montant:</span>
                            <p className="font-semibold">
                              {payment.amount.toLocaleString('fr-CA', {
                                style: 'currency',
                                currency: payment.currency
                              })}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-600">Échéance:</span>
                            <p className="font-semibold">
                              {new Date(payment.due_date).toLocaleDateString('fr-CA')}
                            </p>
                          </div>
                          {payment.status !== 'pending' && (
                            <>
                              <div>
                                <span className="text-gray-600">Payé:</span>
                                <p className="font-semibold text-green-600">
                                  {payment.total_amount_paid.toLocaleString('fr-CA', {
                                    style: 'currency',
                                    currency: payment.currency
                                  })}
                                </p>
                              </div>
                              <div>
                                <span className="text-gray-600">Restant:</span>
                                <p className="font-semibold text-orange-600">
                                  {payment.remaining_amount.toLocaleString('fr-CA', {
                                    style: 'currency',
                                    currency: payment.currency
                                  })}
                                </p>
                              </div>
                            </>
                          )}
                        </div>

                        {/* Barre de progression pour paiements partiels */}
                        {payment.status === 'partial' && payment.payment_progress_percent > 0 && (
                          <div className="mt-3">
                            <div className="flex justify-between text-xs text-gray-600 mb-1">
                              <span>Progression</span>
                              <span>{payment.payment_progress_percent.toFixed(1)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-yellow-500 h-2 rounded-full transition-all"
                                style={{ width: `${Math.min(payment.payment_progress_percent, 100)}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {payment.notes && (
                          <p className="text-xs text-gray-600 mt-2 italic">
                            📝 {payment.notes}
                          </p>
                        )}

                        {payment.transaction_count > 0 && (
                          <p className="text-xs text-blue-600 mt-2">
                            💳 {payment.transaction_count} transaction(s) liée(s)
                          </p>
                        )}
                      </div>

                      {/* Boutons actions */}
                      <div className="flex gap-1 ml-2">
                        <button
                          onClick={() => handleEditPayment(payment)}
                          className="p-2 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                          title="Modifier"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeletePayment(payment.id, payment.term_label || `Paiement °${payment.term_number}`)}
                          className="p-2 text-red-600 hover:bg-red-100 rounded transition-colors"
                          title="Supprimer"
                          disabled={payment.transaction_count > 0}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Résumé */}
      {payments.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 mb-2">Résumé</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>
              <span className="text-gray-600">Total:</span>
              <p className="font-bold text-gray-900">
                {payments.reduce((sum, p) => sum + p.amount, 0).toLocaleString('fr-CA', {
                  style: 'currency',
                  currency: propertyCurrency
                })}
              </p>
            </div>
            <div>
              <span className="text-gray-600">Payé:</span>
              <p className="font-bold text-green-600">
                {paidPayments.reduce((sum, p) => sum + p.amount, 0).toLocaleString('fr-CA', {
                  style: 'currency',
                  currency: propertyCurrency
                })}
              </p>
            </div>
            <div>
              <span className="text-gray-600">En attente:</span>
              <p className="font-bold text-orange-600">
                {pendingPayments.reduce((sum, p) => sum + p.amount, 0).toLocaleString('fr-CA', {
                  style: 'currency',
                  currency: propertyCurrency
                })}
              </p>
            </div>
            <div>
              <span className="text-gray-600">Paiements:</span>
              <p className="font-bold text-gray-900">
                {paidPayments.length} / {payments.length}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
