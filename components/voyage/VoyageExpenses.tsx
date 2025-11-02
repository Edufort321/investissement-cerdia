'use client'

import React, { useState } from 'react'
import { Receipt, Plus, Trash2, Upload, DollarSign, Camera } from 'lucide-react'
import { Voyage, Depense } from '@/types/voyage'
import ReceiptScanner from './ReceiptScanner'

interface VoyageExpensesProps {
  voyage: Voyage
  onAdd: () => void
  onDelete: (depenseId: string) => void
  onAddFromReceipt?: (expense: Partial<Depense>) => void
  language?: string
}

export default function VoyageExpenses({
  voyage,
  onAdd,
  onDelete,
  onAddFromReceipt,
  language = 'fr'
}: VoyageExpensesProps) {
  const [showScanner, setShowScanner] = useState(false)
  const t = (key: string) => {
    const translations: Record<string, { fr: string; en: string }> = {
      'expenses.title': { fr: 'Dépenses', en: 'Expenses' },
      'expenses.add': { fr: 'Ajouter dépense', en: 'Add Expense' },
      'expenses.scanReceipt': { fr: 'Scanner reçu', en: 'Scan Receipt' },
      'expenses.total': { fr: 'Total des dépenses', en: 'Total Expenses' },
      'expenses.category': { fr: 'Catégorie', en: 'Category' },
      'expenses.empty': { fr: 'Aucune dépense enregistrée', en: 'No expenses recorded' },
      'expenses.clickToAdd': { fr: 'Cliquez sur "Ajouter dépense" ou "Scanner reçu" pour commencer', en: 'Click "Add Expense" or "Scan Receipt" to start' }
    }
    return translations[key]?.[language as 'fr' | 'en'] || key
  }

  const handleReceiptScanned = (receiptData: any) => {
    if (onAddFromReceipt) {
      const expense: Partial<Depense> = {
        id: Date.now().toString(),
        montant: receiptData.amount || 0,
        devise: receiptData.currency,
        date: receiptData.date || new Date().toISOString().split('T')[0],
        categorie: receiptData.category,
        description: receiptData.merchant || 'Dépense scannée',
        photos: [] // Possibilité d'ajouter la photo du reçu plus tard
      }
      onAddFromReceipt(expense)
    }
  }

  const totalDepenses = voyage.depenses.reduce((sum, d) => sum + d.montant, 0)

  // Grouper par catégorie
  const depensesParCategorie = voyage.depenses.reduce((acc, depense) => {
    if (!acc[depense.categorie]) {
      acc[depense.categorie] = []
    }
    acc[depense.categorie].push(depense)
    return acc
  }, {} as Record<string, Depense[]>)

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Restaurant': 'bg-orange-500',
      'Transport': 'bg-blue-500',
      'Shopping': 'bg-purple-500',
      'Divertissement': 'bg-pink-500',
      'Autre': 'bg-gray-500'
    }
    return colors[category] || 'bg-indigo-500'
  }

  return (
    <div className="p-3 sm:p-6 pt-20 sm:pt-24 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          {t('expenses.title')}
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowScanner(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition flex items-center gap-2 shadow-md"
          >
            <Camera className="w-4 h-4" />
            {t('expenses.scanReceipt')}
          </button>
          <button
            onClick={onAdd}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {t('expenses.add')}
          </button>
        </div>
      </div>

      {/* Total */}
      <div className="bg-gray-800 rounded-xl shadow-md p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-green-500/20 rounded-xl flex items-center justify-center">
            <DollarSign className="w-8 h-8 text-green-500" />
          </div>
          <div>
            <p className="text-sm text-gray-400">{t('expenses.total')}</p>
            <p className="text-3xl font-bold text-gray-100">
              {totalDepenses.toFixed(2)} {voyage.devise}
            </p>
          </div>
        </div>
      </div>

      {/* Expenses List */}
      {voyage.depenses.length > 0 ? (
        <div className="space-y-6">
          {Object.entries(depensesParCategorie).map(([categorie, depenses]) => {
            const totalCategorie = depenses.reduce((sum, d) => sum + d.montant, 0)
            const colorClass = getCategoryColor(categorie)

            return (
              <div key={categorie} className="bg-gray-800 rounded-xl shadow-md p-6">
                {/* Category Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 ${colorClass} rounded-full`} />
                    <h3 className="text-lg font-semibold text-gray-100">{categorie}</h3>
                  </div>
                  <p className="text-lg font-bold text-gray-300">
                    {totalCategorie.toFixed(2)} {voyage.devise}
                  </p>
                </div>

                {/* Expenses in Category */}
                <div className="space-y-2">
                  {depenses
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map((depense) => (
                      <div
                        key={depense.id}
                        className="flex items-center gap-4 p-3 bg-gray-700/50 rounded-lg group hover:bg-gray-700 transition"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {depense.description && (
                              <p className="font-medium text-gray-200">{depense.description}</p>
                            )}
                          </div>
                          <p className="text-sm text-gray-400">
                            {new Date(depense.date).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US')}
                          </p>
                        </div>

                        <div className="text-right flex items-center gap-3">
                          <p className="text-lg font-bold text-gray-100">
                            {depense.montant.toFixed(2)} {depense.devise}
                          </p>
                          <button
                            onClick={() => onDelete(depense.id)}
                            className="opacity-0 group-hover:opacity-100 transition p-2 bg-red-900/30 hover:bg-red-900/50 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="bg-gray-800 rounded-xl shadow-md p-12 text-center">
          <Receipt className="w-16 h-16 mx-auto mb-4 text-gray-600" />
          <p className="text-gray-400 text-lg mb-2">{t('expenses.empty')}</p>
          <p className="text-gray-500 text-sm">{t('expenses.clickToAdd')}</p>
        </div>
      )}

      {/* Receipt Scanner Modal */}
      <ReceiptScanner
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScanComplete={handleReceiptScanned}
        language={language}
        tripCurrency={voyage.devise}
      />
    </div>
  )
}
