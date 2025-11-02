'use client'

import React, { useState } from 'react'
import { TrendingUp, DollarSign, AlertCircle, PieChart, Edit, Save, X } from 'lucide-react'
import { Voyage } from '@/types/voyage'

interface VoyageBudgetProps {
  voyage: Voyage
  language?: string
  onBudgetChange?: (newBudget: number) => Promise<void>
}

export default function VoyageBudget({ voyage, language = 'fr', onBudgetChange }: VoyageBudgetProps) {
  const [isEditingBudget, setIsEditingBudget] = useState(false)
  const [budgetInput, setBudgetInput] = useState(voyage.budget?.toString() || '0')
  const [isSaving, setIsSaving] = useState(false)

  const t = (key: string) => {
    const translations: Record<string, { fr: string; en: string }> = {
      'budget.title': { fr: 'Budget', en: 'Budget' },
      'budget.total': { fr: 'Budget total', en: 'Total Budget' },
      'budget.spent': { fr: 'Dépensé', en: 'Spent' },
      'budget.remaining': { fr: 'Restant', en: 'Remaining' },
      'budget.events': { fr: 'Événements', en: 'Events' },
      'budget.expenses': { fr: 'Dépenses', en: 'Expenses' },
      'budget.breakdown': { fr: 'Répartition', en: 'Breakdown' },
      'budget.alert': { fr: 'Attention au budget!', en: 'Budget Alert!' },
      'budget.onTrack': { fr: 'Dans les clous', en: 'On Track' },
      'budget.edit': { fr: 'Modifier', en: 'Edit' },
      'budget.save': { fr: 'Sauvegarder', en: 'Save' },
      'budget.cancel': { fr: 'Annuler', en: 'Cancel' },
      'budget.noBudget': { fr: 'Aucun budget défini', en: 'No budget set' },
      'budget.setBudget': { fr: 'Définir un budget', en: 'Set a budget' }
    }
    return translations[key]?.[language as 'fr' | 'en'] || key
  }

  const handleSaveBudget = async () => {
    const newBudget = parseFloat(budgetInput)
    if (isNaN(newBudget) || newBudget < 0) {
      alert(language === 'fr' ? 'Veuillez entrer un montant valide' : 'Please enter a valid amount')
      return
    }

    setIsSaving(true)
    try {
      if (onBudgetChange) {
        await onBudgetChange(newBudget)
      }
      setIsEditingBudget(false)
    } catch (error) {
      console.error('Erreur sauvegarde budget:', error)
      alert(language === 'fr' ? 'Erreur lors de la sauvegarde' : 'Error saving budget')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancelEdit = () => {
    setBudgetInput(voyage.budget?.toString() || '0')
    setIsEditingBudget(false)
  }

  const totalEvents = voyage.evenements.reduce((sum, e) => sum + (e.prix || 0), 0)
  const totalExpenses = voyage.depenses.reduce((sum, d) => sum + d.montant, 0)
  const totalSpent = totalEvents + totalExpenses
  const remaining = (voyage.budget || 0) - totalSpent
  const percentage = voyage.budget ? (totalSpent / voyage.budget) * 100 : 0

  const isOverBudget = remaining < 0
  const isNearLimit = percentage > 90 && !isOverBudget

  return (
    <div className="p-3 sm:p-6 pt-20 sm:pt-24 space-y-4 sm:space-y-6">
      {/* Header */}
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
        {t('budget.title')}
      </h1>

      {/* Budget Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Budget - Editable */}
        <div className="bg-gray-800 rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-indigo-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <DollarSign className="w-6 h-6 text-indigo-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-400">{t('budget.total')}</p>
                {isEditingBudget ? (
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="number"
                      value={budgetInput}
                      onChange={(e) => setBudgetInput(e.target.value)}
                      min="0"
                      step="100"
                      className="w-32 bg-gray-700 text-gray-100 rounded-lg px-3 py-2 border border-indigo-500 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-xl font-bold"
                      placeholder="8000"
                      autoFocus
                    />
                    <span className="text-xl font-bold text-gray-300">{voyage.devise}</span>
                  </div>
                ) : (
                  <p className="text-2xl font-bold text-gray-100">
                    {(voyage.budget || 0).toFixed(0)} {voyage.devise}
                  </p>
                )}
              </div>
            </div>
            {/* Edit/Save/Cancel buttons */}
            <div className="flex items-center gap-2">
              {isEditingBudget ? (
                <>
                  <button
                    onClick={handleSaveBudget}
                    disabled={isSaving}
                    className="p-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg transition"
                    title={t('budget.save')}
                  >
                    <Save className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                    className="p-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition"
                    title={t('budget.cancel')}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsEditingBudget(true)}
                  className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition"
                  title={t('budget.edit')}
                >
                  <Edit className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
          {!voyage.budget && !isEditingBudget && (
            <p className="text-xs text-gray-500 mt-2">
              💡 {t('budget.setBudget')}
            </p>
          )}
        </div>

        {/* Spent */}
        <div className="bg-gray-800 rounded-xl shadow-md p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
              isOverBudget ? 'bg-red-500/20' : 'bg-orange-500/20'
            }`}>
              <TrendingUp className={`w-6 h-6 ${
                isOverBudget ? 'text-red-500' : 'text-orange-500'
              }`} />
            </div>
            <div>
              <p className="text-sm text-gray-400">{t('budget.spent')}</p>
              <p className="text-2xl font-bold text-gray-100">
                {totalSpent.toFixed(0)} {voyage.devise}
              </p>
            </div>
          </div>
        </div>

        {/* Remaining */}
        <div className="bg-gray-800 rounded-xl shadow-md p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
              isOverBudget ? 'bg-red-500/20' : 'bg-green-500/20'
            }`}>
              <DollarSign className={`w-6 h-6 ${
                isOverBudget ? 'text-red-500' : 'text-green-500'
              }`} />
            </div>
            <div>
              <p className="text-sm text-gray-400">{t('budget.remaining')}</p>
              <p className={`text-2xl font-bold ${
                isOverBudget ? 'text-red-400' : 'text-gray-100'
              }`}>
                {remaining.toFixed(0)} {voyage.devise}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Alert */}
      {(isOverBudget || isNearLimit) && (
        <div className={`rounded-xl p-4 flex items-center gap-3 ${
          isOverBudget
            ? 'bg-red-900/20 border-2 border-red-500'
            : 'bg-yellow-900/20 border-2 border-yellow-500'
        }`}>
          <AlertCircle className={`w-6 h-6 ${
            isOverBudget ? 'text-red-500' : 'text-yellow-500'
          }`} />
          <p className={`font-semibold ${
            isOverBudget ? 'text-red-400' : 'text-yellow-400'
          }`}>
            {isOverBudget
              ? `Vous avez dépassé votre budget de ${Math.abs(remaining).toFixed(0)} ${voyage.devise}`
              : t('budget.alert')
            }
          </p>
        </div>
      )}

      {/* Progress Bar */}
      <div className="bg-gray-800 rounded-xl shadow-md p-6">
        <div className="mb-4">
          <div className="flex justify-between mb-2">
            <span className="text-sm text-gray-400">{Math.round(percentage)}%</span>
            <span className="text-sm text-gray-400">
              {remaining.toFixed(0)} {voyage.devise} {t('budget.remaining')}
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-4">
            <div
              className={`h-4 rounded-full transition-all duration-500 ${
                isOverBudget
                  ? 'bg-red-500'
                  : percentage > 90
                  ? 'bg-yellow-500'
                  : percentage > 75
                  ? 'bg-orange-500'
                  : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Breakdown */}
      <div className="bg-gray-800 rounded-xl shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-100 mb-4 flex items-center gap-2">
          <PieChart className="w-5 h-5" />
          {t('budget.breakdown')}
        </h3>

        <div className="space-y-4">
          {/* Events */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-300">{t('budget.events')}</span>
              <span className="font-semibold text-gray-100">
                {totalEvents.toFixed(0)} {voyage.devise}
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="h-2 bg-blue-500 rounded-full"
                style={{ width: `${voyage.budget ? (totalEvents / voyage.budget) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* Expenses */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-300">{t('budget.expenses')}</span>
              <span className="font-semibold text-gray-100">
                {totalExpenses.toFixed(0)} {voyage.devise}
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="h-2 bg-purple-500 rounded-full"
                style={{ width: `${voyage.budget ? (totalExpenses / voyage.budget) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
