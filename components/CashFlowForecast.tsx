'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { TrendingUp, TrendingDown, Calendar, Plus, Edit, Trash2, Save, X } from 'lucide-react'

interface CashFlowMonth {
  month: string
  category: string
  currency: string
  total_inflows: number
  total_outflows: number
  net_cash_flow: number
  operating_inflows: number
  operating_outflows: number
  investing_inflows: number
  investing_outflows: number
  financing_inflows: number
  financing_outflows: number
  avg_confidence: number
}

interface ForecastEntry {
  id?: string
  forecast_date: string
  category: 'operating' | 'investing' | 'financing'
  subcategory: string
  flow_type: 'inflow' | 'outflow'
  amount: number
  description: string
  confidence_level: number
  is_recurring: boolean
}

export default function CashFlowForecast() {
  const [loading, setLoading] = useState(true)
  const [cashFlowData, setCashFlowData] = useState<CashFlowMonth[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingEntry, setEditingEntry] = useState<ForecastEntry | null>(null)

  // Form state
  const [formData, setFormData] = useState<ForecastEntry>({
    forecast_date: new Date().toISOString().split('T')[0],
    category: 'operating',
    subcategory: '',
    flow_type: 'inflow',
    amount: 0,
    description: '',
    confidence_level: 3,
    is_recurring: false
  })

  useEffect(() => {
    loadCashFlowData()
  }, [])

  const loadCashFlowData = async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('cash_flow_12_months')
        .select('*')
        .order('month')

      setCashFlowData(data || [])
    } catch (error) {
      console.error('Error loading cash flow data:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveForecastEntry = async () => {
    try {
      if (editingEntry?.id) {
        // Update
        await supabase
          .from('cash_flow_forecast')
          .update({
            ...formData,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingEntry.id)
      } else {
        // Insert
        await supabase
          .from('cash_flow_forecast')
          .insert({
            ...formData,
            is_actual: false // C'est une prévision, pas du réel
          })
      }

      setShowAddForm(false)
      setEditingEntry(null)
      resetForm()
      loadCashFlowData()
    } catch (error) {
      console.error('Error saving forecast:', error)
      alert('Erreur lors de l\'enregistrement')
    }
  }

  const deleteForecastEntry = async (id: string) => {
    if (!confirm('Supprimer cette prévision?')) return

    try {
      await supabase
        .from('cash_flow_forecast')
        .delete()
        .eq('id', id)

      loadCashFlowData()
    } catch (error) {
      console.error('Error deleting forecast:', error)
    }
  }

  const resetForm = () => {
    setFormData({
      forecast_date: new Date().toISOString().split('T')[0],
      category: 'operating',
      subcategory: '',
      flow_type: 'inflow',
      amount: 0,
      description: '',
      confidence_level: 3,
      is_recurring: false
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const getConfidenceLabel = (level: number) => {
    switch (level) {
      case 1: return { label: 'Certain', color: 'text-green-600' }
      case 2: return { label: 'Très probable', color: 'text-blue-600' }
      case 3: return { label: 'Probable', color: 'text-yellow-600' }
      case 4: return { label: 'Possible', color: 'text-orange-600' }
      case 5: return { label: 'Incertain', color: 'text-red-600' }
      default: return { label: 'N/A', color: 'text-gray-600' }
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'operating': return 'bg-blue-100 text-blue-700'
      case 'investing': return 'bg-purple-100 text-purple-700'
      case 'financing': return 'bg-green-100 text-green-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  // Calcul cumul
  let runningBalance = 0
  const dataWithBalance = cashFlowData.map(month => {
    runningBalance += month.net_cash_flow
    return { ...month, cumulative_balance: runningBalance }
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Prévisions de Trésorerie</h2>
          <p className="text-sm text-gray-600 mt-1">Flux de trésorerie prévisionnels sur 12 mois</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          {showAddForm ? <X size={18} /> : <Plus size={18} />}
          {showAddForm ? 'Annuler' : 'Ajouter Prévision'}
        </button>
      </div>

      {/* Formulaire d'ajout */}
      {showAddForm && (
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <h3 className="font-bold text-gray-900 mb-4">
            {editingEntry ? 'Modifier' : 'Nouvelle'} Prévision
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={formData.forecast_date}
                onChange={(e) => setFormData({ ...formData, forecast_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="operating">Exploitation</option>
                <option value="investing">Investissement</option>
                <option value="financing">Financement</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={formData.flow_type}
                onChange={(e) => setFormData({ ...formData, flow_type: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="inflow">Entrée</option>
                <option value="outflow">Sortie</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Montant (CAD)</label>
              <input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                step="100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sous-catégorie</label>
              <input
                type="text"
                value={formData.subcategory}
                onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                placeholder="Ex: Loyers, Salaires..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confiance</label>
              <select
                value={formData.confidence_level}
                onChange={(e) => setFormData({ ...formData, confidence_level: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="1">1 - Certain</option>
                <option value="2">2 - Très probable</option>
                <option value="3">3 - Probable</option>
                <option value="4">4 - Possible</option>
                <option value="5">5 - Incertain</option>
              </select>
            </div>

            <div className="md:col-span-2 lg:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                rows={2}
                placeholder="Description détaillée..."
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_recurring}
                onChange={(e) => setFormData({ ...formData, is_recurring: e.target.checked })}
                className="rounded"
              />
              <label className="text-sm text-gray-700">Récurrent</label>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-6 pt-4 border-t">
            <button
              onClick={saveForecastEntry}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <Save size={18} />
              Enregistrer
            </button>
            <button
              onClick={() => {
                setShowAddForm(false)
                setEditingEntry(null)
                resetForm()
              }}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Résumé Global */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg shadow-md border border-green-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-green-700 font-medium">Entrées Totales</span>
            <TrendingUp className="text-green-600" size={20} />
          </div>
          <div className="text-2xl font-bold text-green-900">
            {formatCurrency(cashFlowData.reduce((sum, m) => sum + m.total_inflows, 0))}
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg shadow-md border border-red-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-red-700 font-medium">Sorties Totales</span>
            <TrendingDown className="text-red-600" size={20} />
          </div>
          <div className="text-2xl font-bold text-red-900">
            {formatCurrency(cashFlowData.reduce((sum, m) => sum + m.total_outflows, 0))}
          </div>
        </div>

        <div className={`bg-gradient-to-br rounded-lg shadow-md border p-6 ${
          cashFlowData.reduce((sum, m) => sum + m.net_cash_flow, 0) >= 0
            ? 'from-blue-50 to-blue-100 border-blue-200'
            : 'from-orange-50 to-orange-100 border-orange-200'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-sm font-medium ${
              cashFlowData.reduce((sum, m) => sum + m.net_cash_flow, 0) >= 0 ? 'text-blue-700' : 'text-orange-700'
            }`}>
              Flux Net
            </span>
            <Calendar className={cashFlowData.reduce((sum, m) => sum + m.net_cash_flow, 0) >= 0 ? 'text-blue-600' : 'text-orange-600'} size={20} />
          </div>
          <div className={`text-2xl font-bold ${
            cashFlowData.reduce((sum, m) => sum + m.net_cash_flow, 0) >= 0 ? 'text-blue-900' : 'text-orange-900'
          }`}>
            {formatCurrency(cashFlowData.reduce((sum, m) => sum + m.net_cash_flow, 0))}
          </div>
        </div>
      </div>

      {/* Tableau Prévisions Mensuelles */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Mois</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Entrées</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Sorties</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Flux Net</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Cumul</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase">Confiance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {dataWithBalance.map((month, index) => {
                const confidence = getConfidenceLabel(Math.round(month.avg_confidence))
                const isNegative = month.net_cash_flow < 0
                const isCumulNegative = month.cumulative_balance < 0

                return (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {new Date(month.month).toLocaleDateString('fr-CA', { year: 'numeric', month: 'long' })}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-green-600 font-medium">
                      {formatCurrency(month.total_inflows)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-red-600 font-medium">
                      {formatCurrency(month.total_outflows)}
                    </td>
                    <td className={`px-4 py-3 text-sm text-right font-bold ${isNegative ? 'text-red-600' : 'text-green-600'}`}>
                      {formatCurrency(month.net_cash_flow)}
                    </td>
                    <td className={`px-4 py-3 text-sm text-right font-bold ${isCumulNegative ? 'text-red-600' : 'text-blue-600'}`}>
                      {formatCurrency(month.cumulative_balance)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs font-medium ${confidence.color}`}>
                        {confidence.label}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {cashFlowData.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            <p>Aucune prévision disponible</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="mt-3 text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              Ajouter votre première prévision
            </button>
          </div>
        )}
      </div>

      {/* Alertes Critiques */}
      {dataWithBalance.some(m => m.cumulative_balance < 0) && (
        <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <TrendingDown className="text-red-600 flex-shrink-0 mt-0.5" size={24} />
            <div>
              <h3 className="font-bold text-red-900 mb-2">⚠️ Alerte: Prévision Négative Détectée</h3>
              <p className="text-sm text-red-800">
                Les prévisions indiquent un solde cumulatif négatif dans les prochains mois. Action recommandée:
              </p>
              <ul className="list-disc list-inside text-sm text-red-800 mt-2 space-y-1">
                <li>Réviser les dépenses prévues</li>
                <li>Planifier des apports de trésorerie</li>
                <li>Reporter les investissements non-critiques</li>
                <li>Négocier des délais de paiement avec fournisseurs</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
