'use client'

import React, { useState, useEffect } from 'react'
import { X, MapPin, Calendar, DollarSign, Sparkles, User, ArrowRight, ArrowLeft } from 'lucide-react'

interface CreateTripModalProps {
  isOpen: boolean
  onClose: () => void
  onCreate: (data: {
    titre: string
    dateDebut: string
    dateFin: string
    budget?: number
    devise: string
  }) => void
  onGenerateWithAI?: (data: {
    destination: string
    dateDebut: string
    dateFin: string
    budget?: number
    devise: string
  }) => void
  language?: string
}

export default function CreateTripModal({
  isOpen,
  onClose,
  onCreate,
  onGenerateWithAI,
  language = 'fr'
}: CreateTripModalProps) {
  const [step, setStep] = useState(1)
  const [destination, setDestination] = useState(language === 'fr' ? 'Nouveau Voyage' : 'New Trip')
  const [dateDebut, setDateDebut] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [dateFin, setDateFin] = useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  )
  const [budget, setBudget] = useState('')
  const [devise, setDevise] = useState('CAD')

  // Auto-update date fin when date début changes (dateDebut + 1 day)
  useEffect(() => {
    if (dateDebut) {
      const debutDate = new Date(dateDebut)
      debutDate.setDate(debutDate.getDate() + 1)
      const newDateFin = debutDate.toISOString().split('T')[0]
      setDateFin(newDateFin)
    }
  }, [dateDebut])

  const t = (key: string) => {
    const translations: Record<string, { fr: string; en: string }> = {
      'modal.title': { fr: 'Créer un nouveau voyage', en: 'Create a new trip' },
      'modal.step1.title': { fr: 'Informations du voyage', en: 'Trip Information' },
      'modal.step2.title': { fr: 'Mode de création', en: 'Creation Mode' },
      'modal.destination': { fr: 'Destination', en: 'Destination' },
      'modal.destinationPlaceholder': { fr: 'Ex: Paris, France', en: 'Ex: Paris, France' },
      'modal.startDate': { fr: 'Date de début', en: 'Start date' },
      'modal.endDate': { fr: 'Date de fin', en: 'End date' },
      'modal.budget': { fr: 'Budget (optionnel)', en: 'Budget (optional)' },
      'modal.currency': { fr: 'Devise', en: 'Currency' },
      'modal.next': { fr: 'Suivant', en: 'Next' },
      'modal.back': { fr: 'Retour', en: 'Back' },
      'modal.cancel': { fr: 'Annuler', en: 'Cancel' },
      'modal.step2.question': { fr: 'Avez-vous tous les détails du voyage ?', en: 'Do you have all trip details?' },
      'modal.step2.manual': { fr: 'J\'ai tous les détails', en: 'I have all details' },
      'modal.step2.manualDesc': { fr: 'Je vais créer mon voyage manuellement', en: 'I will create my trip manually' },
      'modal.step2.ai': { fr: 'Générer avec IA', en: 'Generate with AI' },
      'modal.step2.aiDesc': { fr: 'Créer un voyage avec suggestions via recherche web', en: 'Create trip with AI suggestions via web search' }
    }
    return translations[key]?.[language as 'fr' | 'en'] || key
  }

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!destination.trim()) {
      alert(language === 'fr' ? 'Veuillez entrer une destination' : 'Please enter a destination')
      return
    }
    setStep(2)
  }

  const handleManualCreate = () => {
    onCreate({
      titre: destination.trim(),
      dateDebut,
      dateFin,
      budget: budget ? parseFloat(budget) : undefined,
      devise
    })
    resetForm()
  }

  const handleAIGenerate = () => {
    if (onGenerateWithAI) {
      onGenerateWithAI({
        destination: destination.trim(),
        dateDebut,
        dateFin,
        budget: budget ? parseFloat(budget) : undefined,
        devise
      })
    }
    resetForm()
  }

  const resetForm = () => {
    setStep(1)
    setDestination(language === 'fr' ? 'Nouveau Voyage' : 'New Trip')
    setDateDebut(new Date().toISOString().split('T')[0])
    setDateFin(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
    setBudget('')
    setDevise('CAD')
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center shadow-md">
              <MapPin className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {t('modal.title')}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {language === 'fr' ? `Étape ${step} sur 2` : `Step ${step} of 2`}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
          >
            <X className="w-6 h-6 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Step 1: Trip Information */}
        {step === 1 && (
          <form onSubmit={handleStep1Submit} className="p-6 space-y-6">
            <div className="text-center mb-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {t('modal.step1.title')}
              </h3>
            </div>

            {/* Destination */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                {t('modal.destination')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder={t('modal.destinationPlaceholder')}
                className="w-full bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg px-4 py-3 border border-gray-300 dark:border-gray-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                required
              />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {t('modal.startDate')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={dateDebut}
                  onChange={(e) => setDateDebut(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg px-4 py-3 border border-gray-300 dark:border-gray-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {t('modal.endDate')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={dateFin}
                  onChange={(e) => setDateFin(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg px-4 py-3 border border-gray-300 dark:border-gray-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            {/* Budget */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  {t('modal.budget')}
                </label>
                <input
                  type="number"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="0"
                  min="0"
                  step="0.01"
                  className="w-full bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg px-4 py-3 border border-gray-300 dark:border-gray-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  {t('modal.currency')}
                </label>
                <select
                  value={devise}
                  onChange={(e) => setDevise(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg px-4 py-3 border border-gray-300 dark:border-gray-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="CAD">CAD</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="px-6 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition font-semibold"
              >
                {t('modal.cancel')}
              </button>
              <button
                type="submit"
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition font-semibold shadow-md flex items-center gap-2"
              >
                {t('modal.next')}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

        {/* Step 2: Creation Mode Choice */}
        {step === 2 && (
          <div className="p-6 space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                {t('modal.step2.title')}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {t('modal.step2.question')}
              </p>
            </div>

            {/* Choice Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Manual Creation */}
              <button
                onClick={handleManualCreate}
                className="group p-6 border-2 border-gray-300 dark:border-gray-600 hover:border-indigo-500 dark:hover:border-indigo-400 rounded-xl transition-all hover:shadow-lg bg-white dark:bg-gray-800"
              >
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/30 rounded-full flex items-center justify-center transition">
                    <User className="w-8 h-8 text-gray-600 dark:text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg text-gray-900 dark:text-gray-100 mb-2">
                      {t('modal.step2.manual')}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {t('modal.step2.manualDesc')}
                    </p>
                  </div>
                </div>
              </button>

              {/* AI Generation */}
              <button
                onClick={handleAIGenerate}
                className="group p-6 border-2 border-gray-300 dark:border-gray-600 hover:border-purple-500 dark:hover:border-purple-400 rounded-xl transition-all hover:shadow-lg bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/10 dark:to-indigo-900/10"
              >
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 group-hover:bg-purple-200 dark:group-hover:bg-purple-900/50 rounded-full flex items-center justify-center transition">
                    <Sparkles className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg text-gray-900 dark:text-gray-100 mb-2">
                      {t('modal.step2.ai')}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {t('modal.step2.aiDesc')}
                    </p>
                  </div>
                </div>
              </button>
            </div>

            {/* Back Button */}
            <div className="flex items-center justify-start pt-4">
              <button
                onClick={() => setStep(1)}
                className="px-6 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition font-semibold flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                {t('modal.back')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
