'use client'

import { useState } from 'react'
import { useInvestment } from '@/contexts/InvestmentContext'
import { DollarSign, Plus, Edit2, Trash2, Calendar, Filter, X, TrendingUp, TrendingDown } from 'lucide-react'

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
}

export default function TransactionsTab() {
  const { transactions, investors, properties, addTransaction, updateTransaction, deleteTransaction, loading } = useInvestment()

  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [filterType, setFilterType] = useState<string>('all')
  const [filterCategory, setFilterCategory] = useState<string>('all')

  const [formData, setFormData] = useState<TransactionFormData>({
    date: new Date().toISOString().split('T')[0],
    type: 'investissement',
    amount: 0,
    description: '',
    investor_id: null,
    property_id: null,
    category: 'capital',
    payment_method: 'virement',
    reference_number: '',
    status: 'complete'
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const dataToSubmit = {
      ...formData,
      investor_id: formData.investor_id || null,
      property_id: formData.property_id || null
    }

    if (editingId) {
      const result = await updateTransaction(editingId, dataToSubmit)
      if (result.success) {
        setEditingId(null)
        resetForm()
      } else {
        alert('Erreur lors de la modification: ' + result.error)
      }
    } else {
      const result = await addTransaction(dataToSubmit)
      if (result.success) {
        setShowAddForm(false)
        resetForm()
      } else {
        alert('Erreur lors de l\'ajout: ' + result.error)
      }
    }
  }

  const handleEdit = (transaction: any) => {
    setEditingId(transaction.id)
    setFormData({
      date: transaction.date.split('T')[0],
      type: transaction.type,
      amount: transaction.amount,
      description: transaction.description,
      investor_id: transaction.investor_id,
      property_id: transaction.property_id,
      category: transaction.category,
      payment_method: transaction.payment_method,
      reference_number: transaction.reference_number || '',
      status: transaction.status
    })
    setShowAddForm(true)
  }

  const handleDelete = async (id: string, description: string) => {
    if (confirm(`Êtes-vous sûr de vouloir supprimer la transaction "${description}" ?`)) {
      const result = await deleteTransaction(id)
      if (!result.success) {
        alert('Erreur lors de la suppression: ' + result.error)
      }
    }
  }

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      type: 'investissement',
      amount: 0,
      description: '',
      investor_id: null,
      property_id: null,
      category: 'capital',
      payment_method: 'virement',
      reference_number: '',
      status: 'complete'
    })
    setShowAddForm(false)
    setEditingId(null)
  }

  // Filtrer les transactions
  const filteredTransactions = transactions.filter(t => {
    if (filterType !== 'all' && t.type !== filterType) return false
    if (filterCategory !== 'all' && t.category !== filterCategory) return false
    return true
  })

  // Calculs statistiques
  const totalIn = filteredTransactions
    .filter(t => ['investissement', 'dividende'].includes(t.type))
    .reduce((sum, t) => sum + t.amount, 0)

  const totalOut = filteredTransactions
    .filter(t => ['paiement', 'depense'].includes(t.type))
    .reduce((sum, t) => sum + t.amount, 0)

  const balance = totalIn - totalOut

  const getTypeIcon = (type: string) => {
    if (['investissement', 'dividende'].includes(type)) {
      return <TrendingUp className="text-green-600" size={20} />
    }
    return <TrendingDown className="text-red-600" size={20} />
  }

  const getTypeBadge = (type: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      investissement: { bg: 'bg-green-100', text: 'text-green-800', label: 'Investissement' },
      paiement: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Paiement' },
      dividende: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Dividende' },
      depense: { bg: 'bg-red-100', text: 'text-red-800', label: 'Dépense' }
    }
    const badge = badges[type] || badges.investissement
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header avec statistiques */}
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

        <div className={`bg-gradient-to-br ${balance >= 0 ? 'from-blue-50 to-blue-100 border-blue-200' : 'from-orange-50 to-orange-100 border-orange-200'} p-4 rounded-lg border`}>
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
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent bg-white"
          >
            <option value="all">Tous les types</option>
            <option value="investissement">Investissement</option>
            <option value="paiement">Paiement</option>
            <option value="dividende">Dividende</option>
            <option value="depense">Dépense</option>
          </select>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent bg-white"
          >
            <option value="all">Toutes les catégories</option>
            <option value="capital">Capital</option>
            <option value="operation">Opération</option>
            <option value="maintenance">Maintenance</option>
            <option value="admin">Administration</option>
          </select>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 bg-[#5e5e5e] hover:bg-[#3e3e3e] text-white px-4 py-2 rounded-full transition-colors"
        >
          {showAddForm ? <X size={20} /> : <Plus size={20} />}
          {showAddForm ? 'Annuler' : 'Nouvelle transaction'}
        </button>
      </div>

      {/* Formulaire */}
      {showAddForm && (
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">
            {editingId ? 'Modifier la transaction' : 'Nouvelle transaction'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date *</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type *</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent bg-white"
                  required
                >
                  <option value="investissement">Investissement</option>
                  <option value="paiement">Paiement</option>
                  <option value="dividende">Dividende</option>
                  <option value="depense">Dépense</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Montant ($) *</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={formData.amount}
                  onChange={(e) => {
                    const value = e.target.value.replace(/,/g, '.')
                    const parsed = parseFloat(value)
                    if (value === '' || value === '0' || !isNaN(parsed)) {
                      setFormData({ ...formData, amount: isNaN(parsed) ? 0 : parsed })
                    }
                  }}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                  placeholder="Ex: 2921.78 ou 2921,78"
                  pattern="[0-9]+([.,][0-9]{1,2})?"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Catégorie *</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent bg-white"
                  required
                >
                  <option value="capital">Capital</option>
                  <option value="operation">Opération</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="admin">Administration</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Méthode de paiement *</label>
                <select
                  value={formData.payment_method}
                  onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent bg-white"
                  required
                >
                  <option value="virement">Virement</option>
                  <option value="cheque">Chèque</option>
                  <option value="especes">Espèces</option>
                  <option value="carte">Carte</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Statut *</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent bg-white"
                  required
                >
                  <option value="complete">Complété</option>
                  <option value="en_attente">En attente</option>
                  <option value="annule">Annulé</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Investisseur</label>
                <select
                  value={formData.investor_id || ''}
                  onChange={(e) => setFormData({ ...formData, investor_id: e.target.value || null })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent bg-white"
                >
                  <option value="">Aucun</option>
                  {investors.map(inv => (
                    <option key={inv.id} value={inv.id}>
                      {inv.first_name} {inv.last_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Propriété</label>
                <select
                  value={formData.property_id || ''}
                  onChange={(e) => setFormData({ ...formData, property_id: e.target.value || null })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent bg-white"
                >
                  <option value="">Aucune</option>
                  {properties.map(prop => (
                    <option key={prop.id} value={prop.id}>
                      {prop.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                  rows={3}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Numéro de référence</label>
                <input
                  type="text"
                  value={formData.reference_number}
                  onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                  placeholder="Ex: TRX-2025-001"
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

      {/* Liste des transactions */}
      {filteredTransactions.length === 0 ? (
        <div className="bg-white p-12 rounded-lg shadow-md text-center">
          <DollarSign size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucune transaction</h3>
          <p className="text-gray-600 mb-4">
            {filterType !== 'all' || filterCategory !== 'all'
              ? 'Aucune transaction ne correspond aux filtres sélectionnés'
              : 'Commencez par ajouter votre première transaction'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Montant</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTransactions.map((transaction) => {
                  const investor = investors.find(i => i.id === transaction.investor_id)
                  const property = properties.find(p => p.id === transaction.property_id)

                  return (
                    <tr key={transaction.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-sm text-gray-900">
                          <Calendar size={14} className="text-gray-400" />
                          {new Date(transaction.date).toLocaleDateString('fr-CA')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getTypeBadge(transaction.type)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{transaction.description}</div>
                        {investor && (
                          <div className="text-xs text-gray-500">Investisseur: {investor.first_name} {investor.last_name}</div>
                        )}
                        {property && (
                          <div className="text-xs text-gray-500">Propriété: {property.name}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`flex items-center gap-1 text-sm font-semibold ${
                          ['investissement', 'dividende'].includes(transaction.type) ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {getTypeIcon(transaction.type)}
                          {transaction.amount.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD' })}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          transaction.status === 'complete' ? 'bg-green-100 text-green-800' :
                          transaction.status === 'en_attente' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {transaction.status === 'complete' ? 'Complété' :
                           transaction.status === 'en_attente' ? 'En attente' : 'Annulé'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(transaction)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Modifier"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(transaction.id, transaction.description)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Supprimer"
                          >
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
