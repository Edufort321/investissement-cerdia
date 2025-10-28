'use client'

import React from 'react'
import { TrendingUp, DollarSign, AlertCircle, PieChart } from 'lucide-react'
import { Voyage } from '@/types/voyage'

interface VoyageBudgetProps {
  voyage: Voyage
  language?: string
}

export default function VoyageBudget({ voyage, language = 'fr' }: VoyageBudgetProps) {
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
      'budget.onTrack': { fr: 'Dans les clous', en: 'On Track' }
    }
    return translations[key]?.[language as 'fr' | 'en'] || key
  }

  const totalEvents = voyage.evenements.reduce((sum, e) => sum + (e.prix || 0), 0)
  const totalExpenses = voyage.depenses.reduce((sum, d) => sum + d.montant, 0)
  const totalSpent = totalEvents + totalExpenses
  const remaining = (voyage.budget || 0) - totalSpent
  const percentage = voyage.budget ? (totalSpent / voyage.budget) * 100 : 0

  const isOverBudget = remaining < 0
  const isNearLimit = percentage > 90 && !isOverBudget

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
        {t('budget.title')}
      </h1>

      {/* Budget Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Budget */}
        <div className="bg-gray-800 rounded-xl shadow-md p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-indigo-500/20 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-indigo-500" />
            </div>
            <div>
              <p className="text-sm text-gray-400">{t('budget.total')}</p>
              <p className="text-2xl font-bold text-gray-100">
                {(voyage.budget || 0).toFixed(0)} {voyage.devise}
              </p>
            </div>
          </div>
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
