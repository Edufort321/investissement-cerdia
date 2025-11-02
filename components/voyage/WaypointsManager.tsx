'use client'

import React, { useState, useEffect } from 'react'
import { Plus, Trash2, MapPin, Check, Loader2, GripVertical, X } from 'lucide-react'
import { Waypoint } from '@/types/voyage'

interface WaypointsManagerProps {
  waypoints: Waypoint[]
  onChange: (waypoints: Waypoint[]) => void
  language?: string
}

export default function WaypointsManager({
  waypoints,
  onChange,
  language = 'fr'
}: WaypointsManagerProps) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [newWaypointName, setNewWaypointName] = useState('')
  const [newWaypointAddress, setNewWaypointAddress] = useState('')
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)

  const t = (key: string) => {
    const translations: Record<string, { fr: string; en: string }> = {
      'waypoints.title': { fr: 'Étapes / Points d\'intérêt', en: 'Waypoints / Points of Interest' },
      'waypoints.add': { fr: 'Ajouter une étape', en: 'Add Waypoint' },
      'waypoints.name': { fr: 'Nom du point', en: 'Waypoint Name' },
      'waypoints.namePlaceholder': { fr: 'Ex: Tour Eiffel, Café des Arts...', en: 'Ex: Eiffel Tower, Arts Cafe...' },
      'waypoints.address': { fr: 'Adresse', en: 'Address' },
      'waypoints.addressPlaceholder': { fr: 'Rechercher une adresse...', en: 'Search address...' },
      'waypoints.save': { fr: 'Ajouter', en: 'Add' },
      'waypoints.cancel': { fr: 'Annuler', en: 'Cancel' },
      'waypoints.empty': { fr: 'Aucune étape ajoutée', en: 'No waypoints added' },
      'waypoints.emptyDesc': { fr: 'Ajoutez des points d\'intérêt pour votre promenade', en: 'Add points of interest for your walk' },
      'waypoints.delete': { fr: 'Supprimer', en: 'Delete' },
      'waypoints.visited': { fr: 'Visité', en: 'Visited' }
    }
    return translations[key]?.[language as 'fr' | 'en'] || key
  }

  // Recherche d'adresses
  useEffect(() => {
    if (!newWaypointAddress || newWaypointAddress.length < 3) {
      setAddressSuggestions([])
      setShowSuggestions(false)
      return
    }

    const timer = setTimeout(async () => {
      setLoadingSuggestions(true)
      try {
        const response = await fetch('/api/geocode-autocomplete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: newWaypointAddress,
            language,
            limit: 5
          })
        })

        const data = await response.json()
        if (data.success && data.results) {
          setAddressSuggestions(data.results)
          setShowSuggestions(data.results.length > 0)
        }
      } catch (error) {
        console.error('Erreur suggestions:', error)
      } finally {
        setLoadingSuggestions(false)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [newWaypointAddress, language])

  const handleAddWaypoint = (selectedAddress?: any) => {
    if (!newWaypointName.trim()) {
      alert(language === 'fr' ? 'Veuillez entrer un nom' : 'Please enter a name')
      return
    }

    const newWaypoint: Waypoint = {
      id: Date.now().toString(),
      evenementId: '', // Will be set by parent
      nom: newWaypointName.trim(),
      ordre: waypoints.length,
      coordonnees: selectedAddress?.coordinates || { lat: 0, lng: 0 },
      adresse: selectedAddress?.fullAddress || newWaypointAddress.trim(),
      visited: false
    }

    onChange([...waypoints, newWaypoint])

    // Reset form
    setNewWaypointName('')
    setNewWaypointAddress('')
    setShowAddForm(false)
    setAddressSuggestions([])
  }

  const handleDeleteWaypoint = (waypointId: string) => {
    onChange(waypoints.filter(w => w.id !== waypointId))
  }

  const handleToggleVisited = (waypointId: string) => {
    onChange(
      waypoints.map(w =>
        w.id === waypointId ? { ...w, visited: !w.visited } : w
      )
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          {t('waypoints.title')}
        </h3>
        {!showAddForm && (
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="text-sm px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition flex items-center gap-1"
          >
            <Plus className="w-3 h-3" />
            {t('waypoints.add')}
          </button>
        )}
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 space-y-3 border-2 border-indigo-500">
          {/* Name */}
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              {t('waypoints.name')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={newWaypointName}
              onChange={(e) => setNewWaypointName(e.target.value)}
              placeholder={t('waypoints.namePlaceholder')}
              className="w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 border border-gray-300 dark:border-gray-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
              autoFocus
            />
          </div>

          {/* Address */}
          <div className="relative">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              {t('waypoints.address')}
            </label>
            <div className="relative">
              <input
                type="text"
                value={newWaypointAddress}
                onChange={(e) => setNewWaypointAddress(e.target.value)}
                onFocus={() => addressSuggestions.length > 0 && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder={t('waypoints.addressPlaceholder')}
                className="w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2 border border-gray-300 dark:border-gray-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
              />
              {loadingSuggestions && (
                <div className="absolute right-3 top-2.5 text-gray-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
              )}
            </div>

            {/* Suggestions Dropdown */}
            {showSuggestions && addressSuggestions.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {addressSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => {
                      setNewWaypointAddress(suggestion.shortName || suggestion.name)
                      setShowSuggestions(false)
                      handleAddWaypoint(suggestion)
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition border-b border-gray-200 dark:border-gray-700 last:border-b-0"
                  >
                    <div className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                      📍 {suggestion.shortName || suggestion.name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {suggestion.fullAddress || suggestion.description}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => handleAddWaypoint()}
              className="flex-1 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition text-sm font-medium"
            >
              {t('waypoints.save')}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false)
                setNewWaypointName('')
                setNewWaypointAddress('')
              }}
              className="flex-1 px-3 py-2 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 rounded-lg transition text-sm font-medium"
            >
              {t('waypoints.cancel')}
            </button>
          </div>
        </div>
      )}

      {/* Waypoints List */}
      {waypoints.length === 0 && !showAddForm ? (
        <div className="text-center py-6 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
          <MapPin className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('waypoints.empty')}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t('waypoints.emptyDesc')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {waypoints.map((waypoint, index) => (
            <div
              key={waypoint.id}
              className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 flex items-center gap-3 group hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            >
              {/* Drag Handle (future feature) */}
              <div className="cursor-move opacity-30 group-hover:opacity-100 transition">
                <GripVertical className="w-4 h-4 text-gray-400" />
              </div>

              {/* Order Badge */}
              <div className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                {index + 1}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {waypoint.nom}
                </p>
                {waypoint.adresse && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    📍 {waypoint.adresse}
                  </p>
                )}
              </div>

              {/* Visited Checkbox */}
              <button
                type="button"
                onClick={() => handleToggleVisited(waypoint.id)}
                className={`p-1.5 rounded transition ${
                  waypoint.visited
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-600 text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-500'
                }`}
                title={t('waypoints.visited')}
              >
                <Check className="w-3 h-3" />
              </button>

              {/* Delete Button */}
              <button
                type="button"
                onClick={() => handleDeleteWaypoint(waypoint.id)}
                className="p-1.5 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 rounded transition opacity-0 group-hover:opacity-100"
                title={t('waypoints.delete')}
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {waypoints.length > 0 && (
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          💡 {language === 'fr'
            ? `${waypoints.length} étape${waypoints.length > 1 ? 's' : ''} ajoutée${waypoints.length > 1 ? 's' : ''}`
            : `${waypoints.length} waypoint${waypoints.length > 1 ? 's' : ''} added`}
        </p>
      )}
    </div>
  )
}
