'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/contexts/LanguageContext'
import { TrendingUp, TrendingDown, DollarSign, Calendar, Save, X, Plus, AlertCircle } from 'lucide-react'

interface Property {
  id: string
  name: string
  location: string
  total_cost: number
}

interface PropertyValuation {
  id?: string
  property_id: string
  valuation_date: string
  valuation_type: 'initial' | 'biennial' | 'sale' | 'special'
  acquisition_cost: number
  current_market_value: number
  appreciation_percentage?: number
  appraiser_name?: string
  appraiser_firm?: string
  notes?: string
  next_valuation_date?: string
  valuation_report_url?: string
  created_by?: string
}

export default function PropertyValuationManager() {
  const { t, language } = useLanguage()
  const [properties, setProperties] = useState<Property[]>([])
  const [valuations, setValuations] = useState<PropertyValuation[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState<PropertyValuation>({
    property_id: '',
    valuation_date: new Date().toISOString().split('T')[0],
    valuation_type: 'biennial',
    acquisition_cost: 0,
    current_market_value: 0,
    appraiser_name: '',
    appraiser_firm: '',
    notes: ''
  })

  useEffect(() => {
    loadProperties()
    loadValuations()
  }, [])

  const loadProperties = async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('id, name, location, total_cost')
        .order('name')

      if (error) throw error
      setProperties(data || [])
    } catch (error) {
      console.error('Error loading properties:', error)
    }
  }

  const loadValuations = async () => {
    try {
      const { data, error } = await supabase
        .from('property_valuations')
        .select(`
          *,
          properties:property_id (name, location)
        `)
        .order('valuation_date', { ascending: false })

      if (error) throw error
      setValuations(data || [])
    } catch (error) {
      console.error('Error loading valuations:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveValuation = async () => {
    if (!formData.property_id || !formData.valuation_date || formData.current_market_value === 0) {
      alert(language === 'fr' ? 'Veuillez remplir tous les champs requis' : 'Please fill all required fields')
      return
    }

    try {
      // Calculer la prochaine date d'évaluation (dans 2 ans)
      const nextDate = new Date(formData.valuation_date)
      nextDate.setFullYear(nextDate.getFullYear() + 2)

      const valuationData = {
        ...formData,
        next_valuation_date: nextDate.toISOString().split('T')[0]
      }

      const { error } = await supabase
        .from('property_valuations')
        .insert([valuationData])

      if (error) throw error

      alert(language === 'fr' ? 'Évaluation enregistrée avec succès' : 'Valuation saved successfully')
      setShowAddForm(false)
      setFormData({
        property_id: '',
        valuation_date: new Date().toISOString().split('T')[0],
        valuation_type: 'biennial',
        acquisition_cost: 0,
        current_market_value: 0,
        appraiser_name: '',
        appraiser_firm: '',
        notes: ''
      })
      loadValuations()
    } catch (error) {
      console.error('Error saving valuation:', error)
      alert(language === 'fr' ? 'Erreur lors de l\'enregistrement' : 'Error saving valuation')
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(language === 'fr' ? 'fr-CA' : 'en-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 0
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-16 h-16 border-4 border-gray-300 border-t-gray-900 rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {language === 'fr' ? 'Évaluations des propriétés' : 'Property Valuations'}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {language === 'fr' ? 'Évaluations biennales pour le calcul du NAV' : 'Biennial valuations for NAV calculation'}
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          <Plus size={20} />
          {language === 'fr' ? 'Nouvelle évaluation' : 'New Valuation'}
        </button>
      </div>

      {/* Alertes - Propriétés nécessitant une évaluation */}
      {valuations.length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-yellow-700 dark:text-yellow-400 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <h3 className="text-sm font-semibold text-yellow-900 dark:text-yellow-200">
                {language === 'fr' ? 'Prochaines évaluations requises' : 'Upcoming Valuations Required'}
              </h3>
              <p className="text-xs text-yellow-800 dark:text-yellow-300 mt-1">
                {language === 'fr'
                  ? 'Les propriétés doivent être évaluées tous les 2 ans pour le calcul du prix des parts.'
                  : 'Properties must be valued every 2 years for share price calculation.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Formulaire d'ajout */}
      {showAddForm && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {language === 'fr' ? 'Nouvelle évaluation' : 'New Valuation'}
            </h3>
            <button
              onClick={() => setShowAddForm(false)}
              className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <X size={20} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {language === 'fr' ? 'Propriété' : 'Property'} *
              </label>
              <select
                value={formData.property_id}
                onChange={(e) => {
                  const property = properties.find(p => p.id === e.target.value)
                  setFormData({
                    ...formData,
                    property_id: e.target.value,
                    acquisition_cost: property?.total_cost || 0
                  })
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                required
              >
                <option value="">{language === 'fr' ? 'Sélectionner une propriété' : 'Select a property'}</option>
                {properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.name} - {property.location}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {language === 'fr' ? 'Date d\'évaluation' : 'Valuation Date'} *
              </label>
              <input
                type="date"
                value={formData.valuation_date}
                onChange={(e) => setFormData({...formData, valuation_date: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {language === 'fr' ? 'Type d\'évaluation' : 'Valuation Type'}
              </label>
              <select
                value={formData.valuation_type}
                onChange={(e) => setFormData({...formData, valuation_type: e.target.value as any})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="initial">{language === 'fr' ? 'Initiale' : 'Initial'}</option>
                <option value="biennial">{language === 'fr' ? 'Biennale (2 ans)' : 'Biennial (2 years)'}</option>
                <option value="special">{language === 'fr' ? 'Spéciale' : 'Special'}</option>
                <option value="sale">{language === 'fr' ? 'Vente' : 'Sale'}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {language === 'fr' ? 'Coût d\'acquisition' : 'Acquisition Cost'} (CAD)
              </label>
              <input
                type="number"
                value={formData.acquisition_cost}
                onChange={(e) => setFormData({...formData, acquisition_cost: parseFloat(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                readOnly
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {language === 'fr' ? 'Valeur marchande actuelle' : 'Current Market Value'} (CAD) *
              </label>
              <input
                type="number"
                value={formData.current_market_value || ''}
                onChange={(e) => setFormData({...formData, current_market_value: parseFloat(e.target.value) || 0})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="250000"
                step="1000"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {language === 'fr' ? 'Nom de l\'évaluateur' : 'Appraiser Name'}
              </label>
              <input
                type="text"
                value={formData.appraiser_name}
                onChange={(e) => setFormData({...formData, appraiser_name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="Jean Tremblay"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {language === 'fr' ? 'Firme d\'évaluation' : 'Appraiser Firm'}
              </label>
              <input
                type="text"
                value={formData.appraiser_firm}
                onChange={(e) => setFormData({...formData, appraiser_firm: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="ABC Évaluations Inc."
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {language === 'fr' ? 'Notes' : 'Notes'}
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                rows={3}
                placeholder={language === 'fr' ? 'Remarques supplémentaires...' : 'Additional remarks...'}
              />
            </div>
          </div>

          {/* Aperçu appréciation */}
          {formData.acquisition_cost > 0 && formData.current_market_value > 0 && (
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-900 dark:text-blue-200">
                  {language === 'fr' ? 'Appréciation' : 'Appreciation'}:
                </span>
                <div className="flex items-center gap-2">
                  {formData.current_market_value >= formData.acquisition_cost ? (
                    <TrendingUp className="text-green-600" size={16} />
                  ) : (
                    <TrendingDown className="text-red-600" size={16} />
                  )}
                  <span className={`text-lg font-bold ${
                    formData.current_market_value >= formData.acquisition_cost ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {((formData.current_market_value - formData.acquisition_cost) / formData.acquisition_cost * 100).toFixed(2)}%
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    ({formatCurrency(formData.current_market_value - formData.acquisition_cost)})
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3 justify-end mt-6">
            <button
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
            >
              {language === 'fr' ? 'Annuler' : 'Cancel'}
            </button>
            <button
              onClick={saveValuation}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <Save size={20} />
              {language === 'fr' ? 'Enregistrer' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {/* Liste des évaluations */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {language === 'fr' ? 'Historique des évaluations' : 'Valuation History'}
          </h3>
        </div>

        {valuations.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            {language === 'fr' ? 'Aucune évaluation enregistrée' : 'No valuations recorded'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {language === 'fr' ? 'Propriété' : 'Property'}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {language === 'fr' ? 'Date' : 'Date'}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {language === 'fr' ? 'Type' : 'Type'}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {language === 'fr' ? 'Coût achat' : 'Acquisition'}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {language === 'fr' ? 'Valeur actuelle' : 'Current Value'}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {language === 'fr' ? 'Appréciation' : 'Appreciation'}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {language === 'fr' ? 'Prochaine' : 'Next'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {valuations.map((valuation: any) => {
                  const appreciation = ((valuation.current_market_value - valuation.acquisition_cost) / valuation.acquisition_cost * 100)
                  const isPositive = appreciation >= 0

                  return (
                    <tr key={valuation.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                        <div className="font-medium">{valuation.properties?.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{valuation.properties?.location}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {new Date(valuation.valuation_date).toLocaleDateString(language === 'fr' ? 'fr-CA' : 'en-CA')}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 rounded text-xs font-medium">
                          {valuation.valuation_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-gray-100">
                        {formatCurrency(valuation.acquisition_cost)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-gray-900 dark:text-gray-100">
                        {formatCurrency(valuation.current_market_value)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        <div className={`flex items-center justify-end gap-1 font-medium ${
                          isPositive ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                          <span>{isPositive ? '+' : ''}{appreciation.toFixed(2)}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {valuation.next_valuation_date ? (
                          new Date(valuation.next_valuation_date).toLocaleDateString(language === 'fr' ? 'fr-CA' : 'en-CA')
                        ) : '-'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
