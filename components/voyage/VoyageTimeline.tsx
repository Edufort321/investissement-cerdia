'use client'

import React, { useState } from 'react'
import {
  Plane,
  Hotel,
  MapPin,
  Car,
  Home,
  Plus,
  Edit2,
  Trash2,
  Clock,
  Star,
  Navigation,
  TrendingDown,
  X,
  Mail
} from 'lucide-react'
import { Voyage, Evenement } from '@/types/voyage'
import { optimizeRoute, OptimizationResult } from '@/lib/route-optimizer'
import EmailImport from './EmailImport'

interface VoyageTimelineProps {
  voyage: Voyage
  onAddEvent: () => void
  onEditEvent?: (event: Evenement) => void
  onDeleteEvent?: (eventId: string) => void
  onOptimizeRoute?: (optimizedEvents: Evenement[]) => void
  onImportFromEmail?: (eventData: any) => void
  language?: string
}

export default function VoyageTimeline({
  voyage,
  onAddEvent,
  onEditEvent,
  onDeleteEvent,
  onOptimizeRoute,
  onImportFromEmail,
  language = 'fr'
}: VoyageTimelineProps) {
  const [viewMode, setViewMode] = useState<'gantt' | 'list'>('gantt')
  const [showOptimizationModal, setShowOptimizationModal] = useState(false)
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null)
  const [showEmailImport, setShowEmailImport] = useState(false)

  const t = (key: string) => {
    const translations: Record<string, { fr: string; en: string }> = {
      'timeline.title': { fr: 'Timeline', en: 'Timeline' },
      'timeline.gantt': { fr: 'Vue Gantt', en: 'Gantt View' },
      'timeline.list': { fr: 'Vue Liste', en: 'List View' },
      'timeline.addEvent': { fr: 'Ajouter événement', en: 'Add Event' },
      'timeline.optimizeRoute': { fr: 'Optimiser itinéraire', en: 'Optimize Route' },
      'timeline.importEmail': { fr: 'Importer email', en: 'Import email' },
      'timeline.noEvents': { fr: 'Aucun événement planifié', en: 'No events planned' },
      'timeline.clickToAdd': { fr: 'Cliquez sur "Ajouter événement" pour commencer', en: 'Click "Add Event" to start' },
      'timeline.type.vol': { fr: 'Vol', en: 'Flight' },
      'timeline.type.hebergement': { fr: 'Hébergement', en: 'Accommodation' },
      'timeline.type.activite': { fr: 'Activité', en: 'Activity' },
      'timeline.type.transport': { fr: 'Transport', en: 'Transport' },
      'timeline.type.condo': { fr: 'Condo', en: 'Condo' },
      'optimize.title': { fr: 'Optimisation d\'itinéraire', en: 'Route Optimization' },
      'optimize.improvements': { fr: 'Améliorations', en: 'Improvements' },
      'optimize.distanceSaved': { fr: 'Distance économisée', en: 'Distance Saved' },
      'optimize.timeSaved': { fr: 'Temps économisé', en: 'Time Saved' },
      'optimize.apply': { fr: 'Appliquer l\'optimisation', en: 'Apply Optimization' },
      'optimize.cancel': { fr: 'Annuler', en: 'Cancel' },
      'optimize.before': { fr: 'Avant', en: 'Before' },
      'optimize.after': { fr: 'Après', en: 'After' },
      'optimize.noCoordinates': { fr: 'Aucune coordonnée GPS trouvée pour les événements', en: 'No GPS coordinates found for events' },
      'optimize.addCoordinates': { fr: 'Ajoutez des adresses à vos événements pour optimiser l\'itinéraire', en: 'Add addresses to your events to optimize the route' }
    }
    return translations[key]?.[language as 'fr' | 'en'] || key
  }

  const handleOptimize = () => {
    // Filter events that have coordinates
    const eventsWithCoords = voyage.evenements.filter(e => e.coordonnees)

    if (eventsWithCoords.length < 2) {
      alert(t('optimize.noCoordinates') + '\n\n' + t('optimize.addCoordinates'))
      return
    }

    // Run optimization
    const result = optimizeRoute(voyage.evenements)
    setOptimizationResult(result)
    setShowOptimizationModal(true)
  }

  const handleApplyOptimization = () => {
    if (optimizationResult && onOptimizeRoute) {
      onOptimizeRoute(optimizationResult.optimizedOrder)
      setShowOptimizationModal(false)
      setOptimizationResult(null)
    }
  }

  const getEventIcon = (type: string) => {
    const icons: Record<string, any> = {
      vol: Plane,
      hebergement: Hotel,
      activite: MapPin,
      transport: Car,
      condo: Home
    }
    return icons[type] || MapPin
  }

  const getEventColor = (type: string) => {
    const colors: Record<string, string> = {
      vol: 'bg-blue-500',
      hebergement: 'bg-purple-500',
      activite: 'bg-green-500',
      transport: 'bg-yellow-500',
      condo: 'bg-indigo-500'
    }
    return colors[type] || 'bg-gray-500'
  }

  const getEventBgColor = (type: string) => {
    const colors: Record<string, string> = {
      vol: 'bg-blue-500/10 border-blue-500/20',
      hebergement: 'bg-purple-500/10 border-purple-500/20',
      activite: 'bg-green-500/10 border-green-500/20',
      transport: 'bg-yellow-500/10 border-yellow-500/20',
      condo: 'bg-indigo-500/10 border-indigo-500/20'
    }
    return colors[type] || 'bg-gray-500/10 border-gray-500/20'
  }

  // Calculer la durée du voyage en jours
  const dateDebut = new Date(voyage.dateDebut)
  const dateFin = new Date(voyage.dateFin)
  const dureeJours = Math.ceil((dateFin.getTime() - dateDebut.getTime()) / (1000 * 60 * 60 * 24)) + 1

  // Générer les dates pour le Gantt
  const dates = Array.from({ length: dureeJours }, (_, i) => {
    const date = new Date(dateDebut)
    date.setDate(date.getDate() + i)
    return date
  })

  // Trier les événements par date
  const sortedEvents = [...voyage.evenements].sort((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  // Calculer la position de l'événement dans le Gantt
  const getEventPosition = (eventDate: string) => {
    const date = new Date(eventDate)
    const dayIndex = Math.floor((date.getTime() - dateDebut.getTime()) / (1000 * 60 * 60 * 24))
    return {
      left: `${(dayIndex / dureeJours) * 100}%`,
      width: `${(1 / dureeJours) * 100}%`
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          {t('timeline.title')}
        </h1>
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex bg-gray-200 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setViewMode('gantt')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                viewMode === 'gantt'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              {t('timeline.gantt')}
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              {t('timeline.list')}
            </button>
          </div>

          {voyage.evenements.length >= 2 && (
            <button
              onClick={handleOptimize}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition flex items-center gap-2"
            >
              <Route className="w-4 h-4" />
              {t('timeline.optimizeRoute')}
            </button>
          )}

          <button
            onClick={() => setShowEmailImport(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition flex items-center gap-2"
          >
            <Mail className="w-4 h-4" />
            {t('timeline.importEmail')}
          </button>

          <button
            onClick={onAddEvent}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {t('timeline.addEvent')}
          </button>
        </div>
      </div>

      {sortedEvents.length === 0 ? (
        <div className="bg-gray-800 rounded-xl shadow-md p-12 text-center">
          <Clock className="w-16 h-16 mx-auto mb-4 text-gray-600" />
          <p className="text-gray-400 text-lg mb-2">{t('timeline.noEvents')}</p>
          <p className="text-gray-500 text-sm">{t('timeline.clickToAdd')}</p>
        </div>
      ) : viewMode === 'gantt' ? (
        <div className="bg-gray-800 rounded-xl shadow-md p-6 overflow-x-auto">
          {/* Gantt Header - Dates */}
          <div className="mb-6">
            <div className="flex border-b border-gray-700">
              {dates.map((date, i) => (
                <div
                  key={i}
                  className="flex-1 text-center py-2 border-r border-gray-700 last:border-r-0"
                >
                  <div className="text-xs text-gray-400">
                    {date.toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', { weekday: 'short' })}
                  </div>
                  <div className="text-sm font-semibold text-gray-300">
                    {date.getDate()}
                  </div>
                  <div className="text-xs text-gray-500">
                    {date.toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', { month: 'short' })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Gantt Body - Events */}
          <div className="space-y-3">
            {sortedEvents.map((event) => {
              const Icon = getEventIcon(event.type)
              const color = getEventColor(event.type)
              const position = getEventPosition(event.date)

              return (
                <div key={event.id} className="relative h-16">
                  {/* Grid Background */}
                  <div className="absolute inset-0 flex">
                    {dates.map((_, i) => (
                      <div key={i} className="flex-1 border-r border-gray-700/30 last:border-r-0" />
                    ))}
                  </div>

                  {/* Event Bar */}
                  <div
                    className="absolute top-1 h-14 group cursor-pointer"
                    style={{ left: position.left, width: position.width, minWidth: '120px' }}
                  >
                    <div className={`h-full ${color} rounded-lg p-2 flex items-center gap-2 shadow-lg hover:shadow-xl transition relative`}>
                      <Icon className="w-4 h-4 text-white flex-shrink-0" />
                      <div className="flex-1 min-w-0 text-white">
                        <p className="text-xs font-semibold truncate">{event.titre}</p>
                        <p className="text-xs opacity-90 truncate">
                          {event.heureDebut && `${event.heureDebut}`}
                          {event.prix && ` • ${event.prix} ${event.devise}`}
                        </p>
                      </div>

                      {/* Hover Actions */}
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition flex gap-1">
                        {onEditEvent && (
                          <button
                            onClick={() => onEditEvent(event)}
                            className="bg-white/20 hover:bg-white/30 p-1 rounded"
                          >
                            <Edit2 className="w-3 h-3 text-white" />
                          </button>
                        )}
                        {onDeleteEvent && (
                          <button
                            onClick={() => onDeleteEvent(event.id)}
                            className="bg-red-500/20 hover:bg-red-500/30 p-1 rounded"
                          >
                            <Trash2 className="w-3 h-3 text-white" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        /* List View */
        <div className="space-y-3">
          {sortedEvents.map((event) => {
            const Icon = getEventIcon(event.type)
            const bgColor = getEventBgColor(event.type)

            return (
              <div
                key={event.id}
                className={`bg-gray-800 border ${bgColor} rounded-xl p-4 flex items-center gap-4 group hover:shadow-lg transition`}
              >
                <div className={`w-12 h-12 ${getEventColor(event.type)} rounded-lg flex items-center justify-center flex-shrink-0`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-semibold text-gray-100">{event.titre}</h3>
                    <span className="px-2 py-0.5 bg-gray-700 text-gray-300 rounded text-xs">
                      {t(`timeline.type.${event.type}`)}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <span>
                      📅 {new Date(event.date).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US')}
                    </span>
                    {event.heureDebut && <span>🕒 {event.heureDebut}</span>}
                    {event.lieu && <span>📍 {event.lieu}</span>}
                  </div>
                  {event.notes && (
                    <p className="text-sm text-gray-500 mt-2">{event.notes}</p>
                  )}
                </div>

                {event.prix && (
                  <div className="text-right flex-shrink-0">
                    <p className="text-xl font-bold text-gray-100">
                      {event.prix} {event.devise}
                    </p>
                  </div>
                )}

                {/* Rating */}
                {event.rating && event.rating > 0 && (
                  <div className="flex items-center gap-1 mt-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${
                          star <= event.rating!
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-400'
                        }`}
                      />
                    ))}
                    <span className="ml-1 text-sm text-gray-300">
                      ({event.rating}/5)
                    </span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                  {onEditEvent && (
                    <button
                      onClick={() => onEditEvent(event)}
                      className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
                    >
                      <Edit2 className="w-4 h-4 text-gray-300" />
                    </button>
                  )}
                  {onDeleteEvent && (
                    <button
                      onClick={() => onDeleteEvent(event.id)}
                      className="p-2 bg-red-900/30 hover:bg-red-900/50 rounded-lg transition"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Optimization Modal */}
      {showOptimizationModal && optimizationResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center shadow-md">
                  <Route className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {t('optimize.title')}
                </h2>
              </div>
              <button
                onClick={() => setShowOptimizationModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
              >
                <X className="w-6 h-6 text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingDown className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <span className="text-sm font-medium text-green-700 dark:text-green-300">
                      {t('optimize.improvements')}
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-green-800 dark:text-green-200">
                    {optimizationResult.improvements.toFixed(1)}%
                  </p>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                      {t('optimize.distanceSaved')}
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-blue-800 dark:text-blue-200">
                    {optimizationResult.distanceSaved.toFixed(1)} km
                  </p>
                </div>

                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                      {t('optimize.timeSaved')}
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-purple-800 dark:text-purple-200">
                    {Math.round(optimizationResult.timeSaved)} min
                  </p>
                </div>
              </div>

              {/* Before / After Comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Before */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                    <span className="w-6 h-6 bg-red-500/20 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center text-sm">✕</span>
                    {t('optimize.before')}
                    <span className="text-sm font-normal text-gray-500">
                      ({optimizationResult.originalDistance.toFixed(1)} km)
                    </span>
                  </h3>
                  <div className="space-y-2">
                    {optimizationResult.originalOrder.map((event, index) => (
                      <div
                        key={event.id}
                        className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                      >
                        <span className="w-6 h-6 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0">
                          {index + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                            {event.titre}
                          </p>
                          {event.lieu && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {event.lieu}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* After */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                    <span className="w-6 h-6 bg-green-500/20 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center text-sm">✓</span>
                    {t('optimize.after')}
                    <span className="text-sm font-normal text-gray-500">
                      ({optimizationResult.optimizedDistance.toFixed(1)} km)
                    </span>
                  </h3>
                  <div className="space-y-2">
                    {optimizationResult.optimizedOrder.map((event, index) => (
                      <div
                        key={event.id}
                        className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg"
                      >
                        <span className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0">
                          {index + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                            {event.titre}
                          </p>
                          {event.lieu && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {event.lieu}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setShowOptimizationModal(false)}
                  className="flex-1 px-6 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition font-semibold"
                >
                  {t('optimize.cancel')}
                </button>
                <button
                  onClick={handleApplyOptimization}
                  className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition font-semibold shadow-md"
                >
                  {t('optimize.apply')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Email Import Modal */}
      {onImportFromEmail && (
        <EmailImport
          isOpen={showEmailImport}
          onClose={() => setShowEmailImport(false)}
          onImportEvent={onImportFromEmail}
          voyageId={voyage.id}
          devise={voyage.devise}
          language={language}
        />
      )}
    </div>
  )
}
