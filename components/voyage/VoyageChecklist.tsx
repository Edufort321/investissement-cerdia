'use client'

import React, { useState } from 'react'
import { CheckSquare, Square, Plus, Trash2, Edit2 } from 'lucide-react'
import { Voyage, ChecklistItem } from '@/types/voyage'

interface VoyageChecklistProps {
  voyage: Voyage
  onToggle: (itemId: string) => void
  onAdd: (text: string) => void
  onDelete: (itemId: string) => void
  language?: string
}

export default function VoyageChecklist({
  voyage,
  onToggle,
  onAdd,
  onDelete,
  language = 'fr'
}: VoyageChecklistProps) {
  const [newItemText, setNewItemText] = useState('')

  const t = (key: string) => {
    const translations: Record<string, { fr: string; en: string }> = {
      'checklist.title': { fr: 'Checklist', en: 'Checklist' },
      'checklist.addPlaceholder': { fr: 'Ajouter un élément...', en: 'Add an item...' },
      'checklist.add': { fr: 'Ajouter', en: 'Add' },
      'checklist.completed': { fr: 'complétés', en: 'completed' },
      'checklist.empty': { fr: 'Aucun élément dans la checklist', en: 'No items in checklist' },
      'checklist.clickToAdd': { fr: 'Ajoutez votre premier élément ci-dessus', en: 'Add your first item above' }
    }
    return translations[key]?.[language as 'fr' | 'en'] || key
  }

  const handleAddItem = () => {
    if (newItemText.trim()) {
      onAdd(newItemText.trim())
      setNewItemText('')
    }
  }

  const completedCount = voyage.checklist.filter(item => item.complete).length
  const totalCount = voyage.checklist.length
  const percentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0

  return (
    <div className="p-3 sm:p-6 pt-20 sm:pt-24 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          {t('checklist.title')}
        </h1>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {completedCount} / {totalCount} {t('checklist.completed')}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-gray-800 rounded-xl shadow-md p-6">
        <div className="w-full bg-gray-700 rounded-full h-3 mb-2">
          <div
            className="h-3 bg-green-500 rounded-full transition-all duration-500"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <p className="text-center text-sm text-gray-400">
          {Math.round(percentage)}% {t('checklist.completed')}
        </p>
      </div>

      {/* Add Item */}
      <div className="bg-gray-800 rounded-xl shadow-md p-4">
        <div className="flex gap-3">
          <input
            type="text"
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
            placeholder={t('checklist.addPlaceholder')}
            className="flex-1 bg-gray-700 text-gray-100 rounded-lg px-4 py-3 border border-gray-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
          <button
            onClick={handleAddItem}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {t('checklist.add')}
          </button>
        </div>
      </div>

      {/* Checklist Items */}
      {voyage.checklist.length > 0 ? (
        <div className="space-y-2">
          {voyage.checklist.map((item) => (
            <div
              key={item.id}
              className="bg-gray-800 rounded-xl p-4 flex items-center gap-4 group hover:bg-gray-750 transition"
            >
              <button
                onClick={() => onToggle(item.id)}
                className="flex-shrink-0 w-6 h-6 text-gray-400 hover:text-indigo-500 transition"
              >
                {item.complete ? (
                  <CheckSquare className="w-6 h-6 text-green-500" />
                ) : (
                  <Square className="w-6 h-6" />
                )}
              </button>

              <p className={`flex-1 ${
                item.complete
                  ? 'text-gray-500 line-through'
                  : 'text-gray-100'
              }`}>
                {item.texte}
              </p>

              <button
                onClick={() => onDelete(item.id)}
                className="opacity-0 group-hover:opacity-100 transition p-2 bg-red-900/30 hover:bg-red-900/50 rounded-lg"
              >
                <Trash2 className="w-4 h-4 text-red-400" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-gray-800 rounded-xl shadow-md p-12 text-center">
          <CheckSquare className="w-16 h-16 mx-auto mb-4 text-gray-600" />
          <p className="text-gray-400 text-lg mb-2">{t('checklist.empty')}</p>
          <p className="text-gray-500 text-sm">{t('checklist.clickToAdd')}</p>
        </div>
      )}
    </div>
  )
}
