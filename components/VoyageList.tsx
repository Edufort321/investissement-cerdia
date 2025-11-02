'use client'

import React, { useEffect, useState } from 'react'
import {
  Calendar,
  MapPin,
  Clock,
  Edit,
  Trash2,
  Eye,
  Printer,
  Plus,
  Plane,
  ArrowLeft
} from 'lucide-react'
import { voyageService, VoyageDB } from '@/lib/voyage-service'
import { useLanguage } from '@/contexts/LanguageContext'

interface VoyageListProps {
  userId: string
  userMode: 'investor' | 'single' | 'full' | 'free' | null
  onSelectVoyage: (voyageId: string) => void
  onCreateNew: () => void
  onBack: () => void
}

export default function VoyageList({
  userId,
  userMode,
  onSelectVoyage,
  onCreateNew,
  onBack
}: VoyageListProps) {
  const { language, t } = useLanguage()
  const [voyages, setVoyages] = useState<VoyageDB[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadVoyages()
  }, [userId])

  const loadVoyages = async () => {
    try {
      setLoading(true)
      const data = await voyageService.getAll(userId)
      setVoyages(data)
    } catch (err) {
      console.error('Erreur chargement voyages:', err)
      setError(language === 'fr' ? 'Erreur de chargement' : 'Loading error')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (voyageId: string, titre: string) => {
    if (!confirm(language === 'fr'
      ? `Supprimer définitivement "${titre}" ?`
      : `Permanently delete "${titre}"?`
    )) {
      return
    }

    try {
      const success = await voyageService.delete(voyageId)
      if (success) {
        setVoyages(voyages.filter(v => v.id !== voyageId))
      } else {
        alert(language === 'fr' ? 'Erreur de suppression' : 'Delete error')
      }
    } catch (err) {
      console.error('Erreur suppression:', err)
      alert(language === 'fr' ? 'Erreur de suppression' : 'Delete error')
    }
  }

  const canCreateNew = () => {
    if (userMode === 'single') {
      return voyages.length === 0
    }
    return true // investor et full ont voyages illimités
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const calculateDuration = (dateDebut: string, dateFin: string) => {
    const debut = new Date(dateDebut)
    const fin = new Date(dateFin)
    const diff = Math.ceil((fin.getTime() - debut.getTime()) / (1000 * 60 * 60 * 24))
    return `${diff} ${language === 'fr' ? 'jours' : 'days'}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 pt-32 p-3 sm:p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">
            {language === 'fr' ? 'Chargement de vos voyages...' : 'Loading your trips...'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 pt-32 p-3 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            >
              <ArrowLeft className="w-6 h-6 text-gray-700 dark:text-gray-300" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {language === 'fr' ? 'Mes Voyages' : 'My Trips'}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {voyages.length} {language === 'fr' ? 'voyage(s)' : 'trip(s)'}
                {userMode === 'single' && ` • ${language === 'fr' ? 'Maximum 1' : 'Maximum 1'}`}
              </p>
            </div>
          </div>

          {canCreateNew() && (
            <button
              onClick={onCreateNew}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition font-semibold"
            >
              <Plus className="w-5 h-5" />
              {language === 'fr' ? 'Nouveau Voyage' : 'New Trip'}
            </button>
          )}
        </div>

        {/* Mode single - limitation */}
        {userMode === 'single' && voyages.length >= 1 && (
          <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-yellow-800 dark:text-yellow-200 text-sm">
              ⚠️ {language === 'fr'
                ? 'Mode "Un Voyage" : Vous avez atteint la limite (1 voyage maximum). Supprimez votre voyage actuel pour en créer un nouveau.'
                : 'Single Trip Mode: You have reached the limit (1 trip maximum). Delete your current trip to create a new one.'}
            </p>
          </div>
        )}

        {/* Liste des voyages */}
        {voyages.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plane className="w-12 h-12 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
              {language === 'fr' ? 'Aucun voyage enregistré' : 'No trips saved'}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              {language === 'fr'
                ? 'Créez votre premier voyage pour commencer'
                : 'Create your first trip to get started'}
            </p>
            <button
              onClick={onCreateNew}
              className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-semibold"
            >
              <Plus className="w-5 h-5" />
              {language === 'fr' ? 'Créer mon premier voyage' : 'Create my first trip'}
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {voyages.map((voyage) => {
              const isExpired = voyage.expire_at ? new Date(voyage.expire_at) < new Date() : false

              return (
                <div
                  key={voyage.id}
                  className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border-2 transition-all hover:shadow-xl ${
                    isExpired
                      ? 'border-red-300 dark:border-red-700 opacity-60'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                >
                  {/* Header */}
                  <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-4 text-white">
                    <h3 className="text-xl font-bold mb-1">{voyage.titre}</h3>
                    <div className="flex items-center gap-2 text-indigo-100 text-sm">
                      <Calendar className="w-4 h-4" />
                      <span>{calculateDuration(voyage.date_debut, voyage.date_fin)}</span>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-4 space-y-3">
                    <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                      <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <div>
                        <div>{formatDate(voyage.date_debut)}</div>
                        <div>{formatDate(voyage.date_fin)}</div>
                      </div>
                    </div>

                    {voyage.budget && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                        <span className="font-semibold">
                          {language === 'fr' ? 'Budget:' : 'Budget:'}
                        </span>
                        <span>
                          {voyage.budget.toLocaleString()} {voyage.devise}
                        </span>
                      </div>
                    )}

                    {isExpired && (
                      <div className="text-xs text-red-600 dark:text-red-400 font-semibold">
                        ⚠️ {language === 'fr' ? 'Expiré' : 'Expired'}
                      </div>
                    )}
                  </div>

                  {/* Footer - Actions */}
                  <div className="p-4 bg-gray-50 dark:bg-gray-900 flex gap-2">
                    <button
                      onClick={() => onSelectVoyage(voyage.id)}
                      disabled={isExpired}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      <Edit className="w-4 h-4" />
                      <span className="text-sm font-semibold">
                        {language === 'fr' ? 'Ouvrir' : 'Open'}
                      </span>
                    </button>

                    <button
                      onClick={() => handleDelete(voyage.id, voyage.titre)}
                      className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                      title={language === 'fr' ? 'Supprimer' : 'Delete'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
