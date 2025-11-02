'use client'

import React from 'react'
import {
  Calendar,
  DollarSign,
  CheckSquare,
  MapPin,
  Plane,
  Plus,
  TrendingUp,
  AlertCircle,
  Star,
  Edit2,
  Trash2
} from 'lucide-react'
import { Voyage, Evenement } from '@/types/voyage'

interface VoyageDashboardProps {
  voyage: Voyage
  onAddEvent: () => void
  onEditEvent?: (event: Evenement) => void
  onDeleteEvent?: (eventId: string) => void
  language?: string
}

export default function VoyageDashboard({
  voyage,
  onAddEvent,
  onEditEvent,
  onDeleteEvent,
  language = 'fr'
}: VoyageDashboardProps) {
  const t = (key: string) => {
    const translations: Record<string, { fr: string; en: string }> = {
      'dashboard.title': { fr: 'Tableau de bord', en: 'Dashboard' },
      'dashboard.overview': { fr: 'Vue d\'ensemble', en: 'Overview' },
      'dashboard.events': { fr: 'Événements', en: 'Events' },
      'dashboard.totalSpent': { fr: 'Total dépensé', en: 'Total Spent' },
      'dashboard.checklist': { fr: 'Checklist', en: 'Checklist' },
      'dashboard.budget': { fr: 'Budget', en: 'Budget' },
      'dashboard.remaining': { fr: 'Restant', en: 'Remaining' },
      'dashboard.upcomingEvents': { fr: 'Événements à venir', en: 'Upcoming Events' },
      'dashboard.addEvent': { fr: 'Ajouter un événement', en: 'Add Event' },
      'dashboard.noEvents': { fr: 'Aucun événement planifié', en: 'No events planned' },
      'dashboard.budgetAlert': { fr: 'Attention au budget !', en: 'Budget Alert!' },
      'dashboard.completed': { fr: 'complétés', en: 'completed' },
      'dashboard.rating': { fr: 'Évaluation', en: 'Rating' },
      'dashboard.avgRating': { fr: 'Moyenne', en: 'Average' },
      'dashboard.ratedEvents': { fr: 'événements notés', en: 'rated events' }
    }
    return translations[key]?.[language as 'fr' | 'en'] || key
  }

  const budgetUtilise = voyage.evenements.reduce((sum, e) => sum + (e.prix || 0), 0) +
    voyage.depenses.reduce((sum, d) => sum + d.montant, 0)
  const pourcentageBudget = voyage.budget ? (budgetUtilise / voyage.budget) * 100 : 0
  const checklistComplete = voyage.checklist.filter(i => i.complete).length

  // Calculate average rating
  const ratedEvents = voyage.evenements.filter(e => e.rating && e.rating > 0)
  const averageRating = ratedEvents.length > 0
    ? ratedEvents.reduce((sum, e) => sum + (e.rating || 0), 0) / ratedEvents.length
    : 0

  // Trier les événements par date
  const upcomingEvents = [...voyage.evenements]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5)

  return (
    <div className="p-3 sm:p-6 pt-20 sm:pt-24 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          {t('dashboard.title')}
        </h1>
        <button
          onClick={onAddEvent}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          {t('dashboard.addEvent')}
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Events */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('dashboard.events')}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {voyage.evenements.length}
              </p>
            </div>
          </div>
        </div>

        {/* Total Spent */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('dashboard.totalSpent')}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {budgetUtilise.toFixed(0)} {voyage.devise}
              </p>
            </div>
          </div>
        </div>

        {/* Budget Progress */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
              pourcentageBudget > 90 ? 'bg-red-100 dark:bg-red-900' : 'bg-purple-100 dark:bg-purple-900'
            }`}>
              <TrendingUp className={`w-6 h-6 ${
                pourcentageBudget > 90 ? 'text-red-600 dark:text-red-400' : 'text-purple-600 dark:text-purple-400'
              }`} />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('dashboard.budget')}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {voyage.budget ? `${Math.round(pourcentageBudget)}%` : '-'}
              </p>
            </div>
          </div>
          {voyage.budget && pourcentageBudget > 90 && (
            <div className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400 mt-2">
              <AlertCircle className="w-3 h-3" />
              <span>{t('dashboard.budgetAlert')}</span>
            </div>
          )}
        </div>

        {/* Checklist */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900 rounded-lg flex items-center justify-center">
              <CheckSquare className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('dashboard.checklist')}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {checklistComplete}/{voyage.checklist.length}
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            {checklistComplete} {t('dashboard.completed')}
          </p>
        </div>
      </div>

      {/* Trip Rating */}
      {ratedEvents.length > 0 && (
        <div className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/10 dark:to-orange-900/10 rounded-xl shadow-md p-6 border-2 border-yellow-200 dark:border-yellow-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500" />
                {t('dashboard.rating')}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {ratedEvents.length} {t('dashboard.ratedEvents')}
              </p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 mb-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-6 h-6 ${
                      star <= Math.round(averageRating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300 dark:text-gray-600'
                    }`}
                  />
                ))}
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {averageRating.toFixed(1)}/5
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t('dashboard.avgRating')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Budget Progress Bar */}
      {voyage.budget && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {t('dashboard.budget')}
            </h3>
            <div className="text-right">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('dashboard.remaining')}: {(voyage.budget - budgetUtilise).toFixed(0)} {voyage.devise}
              </p>
            </div>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
            <div
              className={`h-4 rounded-full transition-all duration-500 ${
                pourcentageBudget > 90
                  ? 'bg-red-500'
                  : pourcentageBudget > 75
                  ? 'bg-yellow-500'
                  : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(pourcentageBudget, 100)}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-sm text-gray-600 dark:text-gray-400">
            <span>0 {voyage.devise}</span>
            <span>{voyage.budget} {voyage.devise}</span>
          </div>
        </div>
      )}

      {/* Upcoming Events */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          {t('dashboard.upcomingEvents')}
        </h3>
        {upcomingEvents.length > 0 ? (
          <div className="space-y-3">
            {upcomingEvents.map((event) => {
              const IconType = event.type === 'vol' ? Plane : MapPin
              return (
                <div
                  key={event.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                >
                  <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900 rounded-lg flex items-center justify-center flex-shrink-0">
                    <IconType className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                      {event.titre}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {new Date(event.date).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US')}
                      {event.heureDebut && ` • ${event.heureDebut}`}
                    </p>
                  </div>
                  {event.prix && (
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 mr-3">
                      {event.prix} {event.devise}
                    </span>
                  )}

                  {/* BOUTONS DE MODIFICATION - BIEN VISIBLES */}
                  <div className="flex gap-2 flex-shrink-0">
                    {onEditEvent && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onEditEvent(event)
                        }}
                        className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-all shadow-md hover:scale-110"
                        title="✏️ Modifier cet événement"
                      >
                        <Edit2 className="w-4 h-4 text-white" />
                      </button>
                    )}
                    {onDeleteEvent && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          if (window.confirm(language === 'fr' ? 'Supprimer cet événement ?' : 'Delete this event?')) {
                            onDeleteEvent(event.id)
                          }
                        }}
                        className="p-2 bg-red-600 hover:bg-red-700 rounded-lg transition-all shadow-md hover:scale-110"
                        title="🗑️ Supprimer cet événement"
                      >
                        <Trash2 className="w-4 h-4 text-white" />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>{t('dashboard.noEvents')}</p>
          </div>
        )}
      </div>
    </div>
  )
}
