'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/contexts/LanguageContext'
import { useExchangeRate } from '@/contexts/ExchangeRateContext'
import { TrendingUp, TrendingDown, DollarSign, Calendar, Save, X, Plus, AlertCircle, RefreshCw } from 'lucide-react'

interface Property {
  id: string
  name: string
  location: string
  total_cost: number
  currency: string
  status: string
  expected_roi: number | null
  origin_scenario_id: string | null
}

interface ScenarioData {
  annual_appreciation?: number
}

interface PropertyValuation {
  id?: string
  property_id: string
  valuation_date: string
  valuation_type: 'initial' | 'biennial' | 'sale' | 'special'
  acquisition_cost: number
  current_market_value: number
  currency: 'USD' | 'CAD'
  exchange_rate_used?: number
  appraiser_name?: string
  notes?: string
  next_valuation_date?: string
}

export default function PropertyValuationManager() {
  const { t, language } = useLanguage()
  const { rate: exchangeRate, loading: rateLoading, refreshRate } = useExchangeRate()
  const [properties, setProperties] = useState<Property[]>([])
  const [valuations, setValuations] = useState<any[]>([])
  const [scenarios, setScenarios] = useState<Record<string, ScenarioData>>({})
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState<PropertyValuation>({
    property_id: '',
    valuation_date: new Date().toISOString().split('T')[0],
    valuation_type: 'biennial',
    acquisition_cost: 0,
    current_market_value: 0,
    currency: 'CAD',
    appraiser_name: '',
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
        .select('id, name, location, total_cost, currency, status, expected_roi, origin_scenario_id')
        .order('name')
      if (error) throw error
      setProperties(data || [])

      // Charger les données de scénario pour les taux de projection
      const scenarioIds = (data || [])
        .filter(p => p.origin_scenario_id)
        .map(p => p.origin_scenario_id as string)

      if (scenarioIds.length > 0) {
        const { data: scenariosData } = await supabase
          .from('scenarios')
          .select('id, promoter_data')
          .in('id', scenarioIds)

        if (scenariosData) {
          const scenarioMap: Record<string, ScenarioData> = {}
          scenariosData.forEach(s => {
            scenarioMap[s.id] = {
              annual_appreciation: s.promoter_data?.annual_appreciation
            }
          })
          setScenarios(scenarioMap)
        }
      }
    } catch (error) {
      console.error('Error loading properties:', error)
    }
  }

  const loadValuations = async () => {
    try {
      const { data, error } = await supabase
        .from('property_valuations')
        .select(`*, properties:property_id (name, location, currency)`)
        .order('valuation_date', { ascending: false })
      if (error) throw error
      setValuations(data || [])
    } catch (error) {
      console.error('Error loading valuations:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePropertySelect = (propertyId: string) => {
    const property = properties.find(p => p.id === propertyId)
    if (!property) return

    const currency = (property.currency?.toUpperCase() === 'USD' ? 'USD' : 'CAD') as 'USD' | 'CAD'
    setFormData({
      ...formData,
      property_id: propertyId,
      acquisition_cost: property.total_cost || 0,
      currency
    })
  }

  const getEffectiveAppreciationRate = (property: Property): number => {
    if (property.expected_roi && property.expected_roi > 0) return property.expected_roi
    if (property.origin_scenario_id) {
      const scenario = scenarios[property.origin_scenario_id]
      if (scenario?.annual_appreciation && scenario.annual_appreciation > 0) {
        return scenario.annual_appreciation
      }
    }
    return 8
  }

  const saveValuation = async () => {
    if (!formData.property_id || !formData.valuation_date || formData.current_market_value <= 0) {
      alert(language === 'fr' ? 'Veuillez remplir tous les champs requis' : 'Please fill all required fields')
      return
    }

    try {
      const nextDate = new Date(formData.valuation_date)
      nextDate.setFullYear(nextDate.getFullYear() + 2)

      const valuationData: any = {
        property_id: formData.property_id,
        valuation_date: formData.valuation_date,
        valuation_type: formData.valuation_type,
        acquisition_cost: formData.acquisition_cost,
        current_market_value: formData.current_market_value,
        currency: formData.currency,
        exchange_rate_used: formData.currency === 'USD' ? exchangeRate : null,
        appraiser_name: formData.appraiser_name || null,
        notes: formData.notes || null,
        next_valuation_date: nextDate.toISOString().split('T')[0]
      }

      const { error } = await supabase.from('property_valuations').insert([valuationData])
      if (error) throw error

      alert(language === 'fr' ? 'Évaluation enregistrée avec succès' : 'Valuation saved successfully')
      setShowAddForm(false)
      setFormData({
        property_id: '',
        valuation_date: new Date().toISOString().split('T')[0],
        valuation_type: 'biennial',
        acquisition_cost: 0,
        current_market_value: 0,
        currency: 'CAD',
        appraiser_name: '',
        notes: ''
      })
      loadValuations()
    } catch (error: any) {
      console.error('Error saving valuation:', error)
      alert(language === 'fr' ? 'Erreur: ' + error.message : 'Error: ' + error.message)
    }
  }

  const formatCurrency = (amount: number, currency = 'CAD') => {
    return new Intl.NumberFormat(language === 'fr' ? 'fr-CA' : 'en-CA', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0
    }).format(amount)
  }

  const getCadEquivalent = (amount: number, currency: 'USD' | 'CAD'): number => {
    if (currency === 'USD') return amount * exchangeRate
    return amount
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      reservation: 'Réservation',
      en_construction: 'En construction',
      actif: 'Actif',
      complete: 'Complété',
      acquired: 'Acquis',
      en_location: 'En location',
      vendu: 'Vendu'
    }
    return labels[status] || status
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-16 h-16 border-4 border-gray-300 border-t-gray-900 rounded-full animate-spin"></div>
      </div>
    )
  }

  const selectedProperty = properties.find(p => p.id === formData.property_id)
  const appreciationRate = selectedProperty ? getEffectiveAppreciationRate(selectedProperty) : 8
  const cadEquivAcquisition = getCadEquivalent(formData.acquisition_cost, formData.currency)
  const cadEquivMarket = getCadEquivalent(formData.current_market_value, formData.currency)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {language === 'fr' ? 'Évaluations des propriétés' : 'Property Valuations'}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {language === 'fr'
              ? 'Évaluations pour le calcul du NAV — Supports USD et CAD'
              : 'Valuations for NAV calculation — Supports USD and CAD'}
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

      {/* Taux de change actuel */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <DollarSign className="text-blue-600 dark:text-blue-400" size={18} />
          <span className="text-sm text-blue-800 dark:text-blue-200">
            <strong>{language === 'fr' ? 'Taux de change en direct:' : 'Live Exchange Rate:'}</strong>{' '}
            1 USD = {rateLoading ? '...' : exchangeRate.toFixed(4)} CAD
          </span>
          <span className="text-xs text-blue-600 dark:text-blue-400">
            {language === 'fr' ? '(Banque du Canada)' : '(Bank of Canada)'}
          </span>
        </div>
        <button
          onClick={refreshRate}
          disabled={rateLoading}
          className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-800 rounded"
          title={language === 'fr' ? 'Rafraîchir le taux' : 'Refresh rate'}
        >
          <RefreshCw size={14} className={rateLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Alertes évaluations à prévoir */}
      {valuations.length > 0 && (() => {
        const today = new Date()
        const reminderThreshold = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000)
        const upcomingValuations = valuations.filter((v: any) => {
          if (!v.next_valuation_date) return false
          const nextDate = new Date(v.next_valuation_date)
          return nextDate <= reminderThreshold
        })
        const overdueValuations = upcomingValuations.filter((v: any) => new Date(v.next_valuation_date) < today)
        if (upcomingValuations.length === 0) return null
        return (
          <div className={`${overdueValuations.length > 0 ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700' : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700'} border rounded-lg p-4`}>
            <div className="flex items-start gap-3">
              <AlertCircle className={`${overdueValuations.length > 0 ? 'text-red-700 dark:text-red-400' : 'text-yellow-700 dark:text-yellow-400'} flex-shrink-0 mt-0.5`} size={20} />
              <div className="flex-1">
                <h3 className={`text-sm font-semibold ${overdueValuations.length > 0 ? 'text-red-900 dark:text-red-200' : 'text-yellow-900 dark:text-yellow-200'}`}>
                  {overdueValuations.length > 0
                    ? `⚠️ ${overdueValuations.length} évaluation(s) en retard`
                    : `🔔 ${upcomingValuations.length} évaluation(s) à prévoir`}
                </h3>
                <ul className={`mt-2 space-y-1 text-xs ${overdueValuations.length > 0 ? 'text-red-800 dark:text-red-300' : 'text-yellow-800 dark:text-yellow-300'}`}>
                  {upcomingValuations.map((v: any) => {
                    const nextDate = new Date(v.next_valuation_date)
                    const isOverdue = nextDate < today
                    const daysUntil = Math.ceil((nextDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))
                    return (
                      <li key={v.id} className="flex items-center gap-2">
                        <span className="font-medium">{v.properties?.name}:</span>
                        <span>
                          {isOverdue
                            ? `En retard de ${Math.abs(daysUntil)} jours`
                            : `Dans ${daysUntil} jours (${nextDate.toLocaleDateString('fr-CA')})`}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Formulaire d'ajout */}
      {showAddForm && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {language === 'fr' ? 'Nouvelle évaluation' : 'New Valuation'}
            </h3>
            <button onClick={() => setShowAddForm(false)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
              <X size={20} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Propriété */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {language === 'fr' ? 'Propriété' : 'Property'} *
              </label>
              <select
                value={formData.property_id}
                onChange={(e) => handlePropertySelect(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="">{language === 'fr' ? 'Sélectionner une propriété' : 'Select a property'}</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {p.location} ({getStatusLabel(p.status)})
                  </option>
                ))}
              </select>

              {/* Info propriété sélectionnée */}
              {selectedProperty && (
                <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-xs text-gray-600 dark:text-gray-400 space-y-1">
                  <div className="flex justify-between">
                    <span>Devise contrat:</span>
                    <span className="font-medium">{selectedProperty.currency || 'USD'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Prix d'achat:</span>
                    <span className="font-medium">
                      {formatCurrency(selectedProperty.total_cost, selectedProperty.currency || 'USD')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Taux appréciation NAV:</span>
                    <span className="font-medium text-blue-600">
                      {appreciationRate}%/an
                      {selectedProperty.expected_roi && selectedProperty.expected_roi > 0
                        ? ' (expected_roi)'
                        : selectedProperty.origin_scenario_id && scenarios[selectedProperty.origin_scenario_id]?.annual_appreciation
                          ? ' (scénario)'
                          : ' (défaut)'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {language === 'fr' ? "Date d'évaluation" : 'Valuation Date'} *
              </label>
              <input
                type="date"
                value={formData.valuation_date}
                onChange={(e) => setFormData({ ...formData, valuation_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>

            {/* Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {language === 'fr' ? "Type d'évaluation" : 'Valuation Type'}
              </label>
              <select
                value={formData.valuation_type}
                onChange={(e) => setFormData({ ...formData, valuation_type: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="initial">{language === 'fr' ? 'Initiale (achat)' : 'Initial (purchase)'}</option>
                <option value="biennial">{language === 'fr' ? 'Biennale (2 ans)' : 'Biennial (2 years)'}</option>
                <option value="special">{language === 'fr' ? 'Spéciale' : 'Special'}</option>
                <option value="sale">{language === 'fr' ? 'Vente' : 'Sale'}</option>
              </select>
            </div>

            {/* Devise */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {language === 'fr' ? 'Devise des montants' : 'Currency of amounts'}
              </label>
              <div className="flex gap-2">
                {(['USD', 'CAD'] as const).map((cur) => (
                  <button
                    key={cur}
                    type="button"
                    onClick={() => setFormData({ ...formData, currency: cur })}
                    className={`flex-1 py-2 rounded-lg border font-medium text-sm transition-colors ${
                      formData.currency === cur
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {cur}
                  </button>
                ))}
              </div>
              {formData.currency === 'USD' && (
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  Taux utilisé: 1 USD = {exchangeRate.toFixed(4)} CAD (en direct)
                </p>
              )}
            </div>

            {/* Coût d'acquisition */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {language === 'fr' ? "Coût d'acquisition" : 'Acquisition Cost'} ({formData.currency})
              </label>
              <input
                type="number"
                value={formData.acquisition_cost || ''}
                onChange={(e) => setFormData({ ...formData, acquisition_cost: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="254000"
                step="1000"
              />
              {formData.currency === 'USD' && formData.acquisition_cost > 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  ≈ {formatCurrency(cadEquivAcquisition, 'CAD')} CAD (taux actuel)
                </p>
              )}
            </div>

            {/* Valeur marchande */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {language === 'fr' ? 'Valeur marchande actuelle' : 'Current Market Value'} ({formData.currency}) *
              </label>
              <input
                type="number"
                value={formData.current_market_value || ''}
                onChange={(e) => setFormData({ ...formData, current_market_value: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder={formData.currency === 'USD' ? '254000' : '354000'}
                step="1000"
                required
              />
              {formData.currency === 'USD' && formData.current_market_value > 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  ≈ {formatCurrency(cadEquivMarket, 'CAD')} CAD (taux actuel)
                </p>
              )}
            </div>

            {/* Évaluateur */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {language === 'fr' ? "Nom de l'évaluateur" : 'Appraiser Name'}
              </label>
              <input
                type="text"
                value={formData.appraiser_name}
                onChange={(e) => setFormData({ ...formData, appraiser_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="Jean Tremblay"
              />
            </div>

            {/* Notes */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {language === 'fr' ? 'Notes' : 'Notes'}
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                rows={2}
                placeholder={language === 'fr' ? 'Remarques...' : 'Remarks...'}
              />
            </div>
          </div>

          {/* Aperçu appréciation */}
          {formData.acquisition_cost > 0 && formData.current_market_value > 0 && (
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
              <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-3">
                📊 Aperçu de l'évaluation
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Acquisition</div>
                  <div className="font-bold text-gray-900 dark:text-gray-100">
                    {formatCurrency(formData.acquisition_cost, formData.currency)}
                  </div>
                  {formData.currency === 'USD' && (
                    <div className="text-xs text-gray-500">≈ {formatCurrency(cadEquivAcquisition)} CAD</div>
                  )}
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Valeur marchande</div>
                  <div className="font-bold text-gray-900 dark:text-gray-100">
                    {formatCurrency(formData.current_market_value, formData.currency)}
                  </div>
                  {formData.currency === 'USD' && (
                    <div className="text-xs text-gray-500">≈ {formatCurrency(cadEquivMarket)} CAD</div>
                  )}
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Appréciation</div>
                  <div className={`font-bold flex items-center gap-1 ${
                    formData.current_market_value >= formData.acquisition_cost ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formData.current_market_value >= formData.acquisition_cost
                      ? <TrendingUp size={14} />
                      : <TrendingDown size={14} />}
                    {((formData.current_market_value - formData.acquisition_cost) / formData.acquisition_cost * 100).toFixed(2)}%
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatCurrency(formData.current_market_value - formData.acquisition_cost, formData.currency)}
                  </div>
                </div>
              </div>

              {selectedProperty && (
                <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-700">
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    <strong>Impact NAV:</strong> Cette évaluation sera convertie en CAD au taux actuel ({exchangeRate.toFixed(4)})
                    et utilisera un taux d'appréciation de <strong>{appreciationRate}%/an</strong> pour les calculs futurs.
                  </p>
                </div>
              )}
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

      {/* Explication NAV construction */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-200 mb-2">
          🏗️ Projets en construction — Comment le NAV démarre
        </h4>
        <ul className="text-xs text-amber-800 dark:text-amber-300 space-y-1">
          <li>• <strong>Phase réservation/construction:</strong> NAV utilise automatiquement le prix d'achat + date de réservation</li>
          <li>• <strong>Taux d'appréciation:</strong> Lu depuis <em>expected_roi</em> de la propriété, sinon depuis <em>annual_appreciation</em> du scénario lié, sinon 8% par défaut</li>
          <li>• <strong>Évaluation initiale (type "Initiale"):</strong> Créez-en une pour figer le prix de départ et le taux — cela prend le dessus sur le fallback automatique</li>
          <li>• <strong>Devise:</strong> Les montants USD sont convertis en CAD via le taux en direct (Banque du Canada) lors du calcul NAV</li>
        </ul>
      </div>

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
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Propriété</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Devise</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Coût achat</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Valeur actuelle</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Équiv. CAD</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Appréciation</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Prochaine</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {valuations.map((valuation: any) => {
                  const cur: 'USD' | 'CAD' = valuation.currency === 'USD' ? 'USD' : 'CAD'
                  const appreciation = valuation.acquisition_cost > 0
                    ? ((valuation.current_market_value - valuation.acquisition_cost) / valuation.acquisition_cost * 100)
                    : 0
                  const isPositive = appreciation >= 0
                  const cadValue = getCadEquivalent(valuation.current_market_value, cur)

                  return (
                    <tr key={valuation.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                        <div className="font-medium">{valuation.properties?.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{valuation.properties?.location}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {new Date(valuation.valuation_date).toLocaleDateString('fr-CA')}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 rounded text-xs font-medium">
                          {valuation.valuation_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          cur === 'USD'
                            ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}>
                          {cur}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-gray-100">
                        {formatCurrency(valuation.acquisition_cost, cur)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-gray-900 dark:text-gray-100">
                        {formatCurrency(valuation.current_market_value, cur)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-500 dark:text-gray-400">
                        {cur === 'USD'
                          ? formatCurrency(cadValue, 'CAD')
                          : <span className="text-gray-400">—</span>}
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
                        {valuation.next_valuation_date
                          ? new Date(valuation.next_valuation_date).toLocaleDateString('fr-CA')
                          : '—'}
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
