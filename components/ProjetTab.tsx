'use client'

import { useState } from 'react'
import { useInvestment } from '@/contexts/InvestmentContext'
import { Building2, Plus, Edit2, Trash2, MapPin, Calendar, DollarSign, TrendingUp, X } from 'lucide-react'

interface PropertyFormData {
  name: string
  location: string
  status: string
  total_cost: number
  paid_amount: number
  reservation_date: string
  expected_roi: number
}

export default function ProjetTab() {
  const { properties, addProperty, updateProperty, deleteProperty, loading } = useInvestment()

  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<PropertyFormData>({
    name: '',
    location: '',
    status: 'reservation',
    total_cost: 0,
    paid_amount: 0,
    reservation_date: new Date().toISOString().split('T')[0],
    expected_roi: 0
  })

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
      expected_roi: property.expected_roi
    })
    setShowAddForm(true)
  }

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Êtes-vous sûr de vouloir supprimer la propriété "${name}" ?`)) {
      const result = await deleteProperty(id)
      if (!result.success) {
        alert('Erreur lors de la suppression: ' + result.error)
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
      expected_roi: 0
    })
    setShowAddForm(false)
    setEditingId(null)
  }

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      reservation: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Réservation' },
      en_construction: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'En construction' },
      complete: { bg: 'bg-green-100', text: 'text-green-800', label: 'Complété' },
      actif: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Actif' }
    }
    const badge = badges[status] || badges.reservation
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestion des Projets</h2>
          <p className="text-gray-600 mt-1">Gérez vos propriétés immobilières et suivez leur progression</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 bg-[#5e5e5e] hover:bg-[#3e3e3e] text-white px-4 py-2 rounded-full transition-colors"
        >
          {showAddForm ? <X size={20} /> : <Plus size={20} />}
          {showAddForm ? 'Annuler' : 'Ajouter une propriété'}
        </button>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">
            {editingId ? 'Modifier la propriété' : 'Nouvelle propriété'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  Coût total ($) *
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
                  Montant payé ($) *
                </label>
                <input
                  type="number"
                  value={formData.paid_amount}
                  onChange={(e) => setFormData({ ...formData, paid_amount: parseFloat(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                  placeholder="Ex: 116817.94"
                  min="0"
                  step="0.01"
                  required
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

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="bg-[#5e5e5e] hover:bg-[#3e3e3e] text-white px-6 py-2 rounded-full transition-colors disabled:opacity-50"
              >
                {loading ? 'Enregistrement...' : editingId ? 'Modifier' : 'Ajouter'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-2 rounded-full transition-colors"
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
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {properties.map((property) => {
            const progress = (property.paid_amount / property.total_cost) * 100
            const remaining = property.total_cost - property.paid_amount

            return (
              <div key={property.id} className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
                {/* Header */}
                <div className="p-6 border-b border-gray-100">
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

                  <div className="flex items-center text-sm text-gray-600 gap-1">
                    <Calendar size={14} />
                    Réservé le {new Date(property.reservation_date).toLocaleDateString('fr-CA')}
                  </div>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4">
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
                        {property.paid_amount.toLocaleString('fr-CA', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })} payé
                      </span>
                      <span>
                        {remaining.toLocaleString('fr-CA', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })} restant
                      </span>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                    <div>
                      <div className="flex items-center gap-1 text-gray-600 text-xs mb-1">
                        <DollarSign size={12} />
                        Coût total
                      </div>
                      <div className="font-bold text-gray-900">
                        {property.total_cost.toLocaleString('fr-CA', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })}
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
                <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex gap-2">
                  <button
                    onClick={() => handleEdit(property)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
                  >
                    <Edit2 size={16} />
                    Modifier
                  </button>
                  <button
                    onClick={() => handleDelete(property.id, property.name)}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-medium"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
