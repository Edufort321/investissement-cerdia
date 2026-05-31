'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { TrendingUp, TrendingDown, Calendar, Plus, Edit, Trash2, Save, X } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

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
  const { language } = useLanguage()
  const fr = language === 'fr'
  const locale = fr ? 'fr-CA' : 'en-CA'

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
      alert(fr ? "Erreur lors de l'enregistrement" : 'Error saving forecast')
    }
  }

  const deleteForecastEntry = async (id: string) => {
    if (!confirm(fr ? 'Supprimer cette prévision?' : 'Delete this forecast?')) return

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
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const getConfidenceLabel = (level: number) => {
    switch (level) {
      case 1: return { label: fr ? 'Certain' : 'Certain', color: 'text-green-600' }
      case 2: return { label: fr ? 'Très probable' : 'Very likely', color: 'text-blue-600' }
      case 3: return { label: fr ? 'Probable' : 'Probable', color: 'text-yellow-600' }
      case 4: return { label: fr ? 'Possible' : 'Possible', color: 'text-orange-600' }
      case 5: return { label: fr ? 'Incertain' : 'Uncertain', color: 'text-red-600' }
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
          <h2 className="text-2xl font-bold text-gray-900">{fr ? 'Prévisions de Trésorerie' : 'Cash Flow Forecast'}</h2>
          <p className="text-sm text-gray-600 mt-1">{fr ? 'Flux de trésorerie prévisionnels sur 12 mois' : '12-month cash flow projections'}</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          {showAddForm ? <X size={18} /> : <Plus size={18} />}
          {showAddForm ? (fr ? 'Annuler' : 'Cancel') : (fr ? 'Ajouter Prévision' : 'Add Forecast')}
        </button>
      </div>

      {/* Formulaire d'ajout */}
      {showAddForm && (
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <h3 className="font-bold text-gray-900 mb-4">
            {editingEntry ? (fr ? 'Modifier' : 'Edit') : (fr ? 'Nouvelle' : 'New')} {fr ? 'Prévision' : 'Forecast'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{fr ? 'Date' : 'Date'}</label>
              <input
                type="date"
                value={formData.forecast_date}
                onChange={(e) => setFormData({ ...formData, forecast_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{fr ? 'Catégorie' : 'Category'}</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="operating">{fr ? 'Exploitation' : 'Operating'}</option>
                <option value="investing">{fr ? 'Investissement' : 'Investing'}</option>
                <option value="financing">{fr ? 'Financement' : 'Financing'}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{fr ? 'Type' : 'Type'}</label>
              <select
                value={formData.flow_type}
                onChange={(e) => setFormData({ ...formData, flow_type: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="inflow">{fr ? 'Entrée' : 'Inflow'}</option>
                <option value="outflow">{fr ? 'Sortie' : 'Outflow'}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{fr ? 'Montant (CAD)' : 'Amount (CAD)'}</label>
              <input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                step="100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{fr ? 'Sous-catégorie' : 'Subcategory'}</label>
              <input
                type="text"
                value={formData.subcategory}
                onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                placeholder={fr ? 'Ex: Loyers, Salaires...' : 'e.g. Rent, Salaries...'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{fr ? 'Confiance' : 'Confidence'}</label>
              <select
                value={formData.confidence_level}
                onChange={(e) => setFormData({ ...formData, confidence_level: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="1">{fr ? '1 - Certain' : '1 - Certain'}</option>
                <option value="2">{fr ? '2 - Très probable' : '2 - Very likely'}</option>
                <option value="3">{fr ? '3 - Probable' : '3 - Probable'}</option>
                <option value="4">{fr ? '4 - Possible' : '4 - Possible'}</option>
                <option value="5">{fr ? '5 - Incertain' : '5 - Uncertain'}</option>
              </select>
            </div>

            <div className="md:col-span-2 lg:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">{fr ? 'Description' : 'Description'}</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                rows={2}
                placeholder={fr ? 'Description détaillée...' : 'Detailed description...'}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_recurring}
                onChange={(e) => setFormData({ ...formData, is_recurring: e.target.checked })}
                className="rounded"
              />
              <label className="text-sm text-gray-700">{fr ? 'Récurrent' : 'Recurring'}</label>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-6 pt-4 border-t">
            <button
              onClick={saveForecastEntry}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <Save size={18} />
              {fr ? 'Enregistrer' : 'Save'}
            </button>
            <button
              onClick={() => {
                setShowAddForm(false)
                setEditingEntry(null)
                resetForm()
              }}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              {fr ? 'Annuler' : 'Cancel'}
            </button>
          </div>
        </div>
      )}

      {/* Résumé Global */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/40 dark:to-green-800/20 rounded-lg shadow-md border border-green-200 dark:border-green-800/50 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-green-700 dark:text-green-300 font-medium">{fr ? 'Entrées Totales' : 'Total Inflows'}</span>
            <TrendingUp className="text-green-600 dark:text-green-400" size={20} />
          </div>
          <div className="text-2xl font-bold text-green-900 dark:text-green-200">
            {formatCurrency(cashFlowData.reduce((sum, m) => sum + m.total_inflows, 0))}
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/40 dark:to-red-800/20 rounded-lg shadow-md border border-red-200 dark:border-red-800/50 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-red-700 dark:text-red-300 font-medium">{fr ? 'Sorties Totales' : 'Total Outflows'}</span>
            <TrendingDown className="text-red-600 dark:text-red-400" size={20} />
          </div>
          <div className="text-2xl font-bold text-red-900 dark:text-red-200">
            {formatCurrency(cashFlowData.reduce((sum, m) => sum + m.total_outflows, 0))}
          </div>
        </div>

        <div className={`bg-gradient-to-br rounded-lg shadow-md border p-6 ${
          cashFlowData.reduce((sum, m) => sum + m.net_cash_flow, 0) >= 0
            ? 'from-blue-50 to-blue-100 dark:from-blue-900/40 dark:to-blue-800/20 border-blue-200 dark:border-blue-800/50'
            : 'from-orange-50 to-orange-100 dark:from-orange-900/40 dark:to-orange-800/20 border-orange-200 dark:border-orange-800/50'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-sm font-medium ${
              cashFlowData.reduce((sum, m) => sum + m.net_cash_flow, 0) >= 0 ? 'text-blue-700 dark:text-blue-300' : 'text-orange-700 dark:text-orange-300'
            }`}>
              {fr ? 'Flux Net' : 'Net Flow'}
            </span>
            <Calendar className={cashFlowData.reduce((sum, m) => sum + m.net_cash_flow, 0) >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'} size={20} />
          </div>
          <div className={`text-2xl font-bold ${
            cashFlowData.reduce((sum, m) => sum + m.net_cash_flow, 0) >= 0 ? 'text-blue-900 dark:text-blue-200' : 'text-orange-900 dark:text-orange-200'
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
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">{fr ? 'Mois' : 'Month'}</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">{fr ? 'Entrées' : 'Inflows'}</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">{fr ? 'Sorties' : 'Outflows'}</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">{fr ? 'Flux Net' : 'Net Flow'}</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">{fr ? 'Cumul' : 'Cumulative'}</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase">{fr ? 'Confiance' : 'Confidence'}</th>
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
                      {new Date(month.month).toLocaleDateString(locale, { year: 'numeric', month: 'long' })}
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
            <p>{fr ? 'Aucune prévision disponible' : 'No forecasts available'}</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="mt-3 text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              {fr ? 'Ajouter votre première prévision' : 'Add your first forecast'}
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
              <h3 className="font-bold text-red-900 mb-2">⚠️ {fr ? 'Alerte: Prévision Négative Détectée' : 'Alert: Negative Forecast Detected'}</h3>
              <p className="text-sm text-red-800">
                {fr ? 'Les prévisions indiquent un solde cumulatif négatif dans les prochains mois. Action recommandée:' : 'Forecasts indicate a negative cumulative balance in coming months. Recommended action:'}
              </p>
              <ul className="list-disc list-inside text-sm text-red-800 mt-2 space-y-1">
                <li>{fr ? 'Réviser les dépenses prévues' : 'Review planned expenses'}</li>
                <li>{fr ? 'Planifier des apports de trésorerie' : 'Plan cash injections'}</li>
                <li>{fr ? 'Reporter les investissements non-critiques' : 'Defer non-critical investments'}</li>
                <li>{fr ? 'Négocier des délais de paiement avec fournisseurs' : 'Negotiate payment terms with suppliers'}</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
