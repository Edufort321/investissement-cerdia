'use client'

import React, { useState, useEffect } from 'react'
import {
  Eye,
  Users,
  Star,
  Calendar,
  MapPin,
  ArrowLeft,
  Copy,
  TrendingUp,
  Sparkles,
  Image as ImageIcon
} from 'lucide-react'
import { voyageService, PublicVoyageDB } from '@/lib/voyage-service'
import { useLanguage } from '@/contexts/LanguageContext'

interface GaleriePubliqueProps {
  onClose: () => void
  onUseTemplate?: (templateId: string) => void
  showTemplatesOnly?: boolean
}

export default function GaleriePublique({
  onClose,
  onUseTemplate,
  showTemplatesOnly = false
}: GaleriePubliqueProps) {
  const { language } = useLanguage()
  const [voyages, setVoyages] = useState<PublicVoyageDB[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedVoyage, setSelectedVoyage] = useState<PublicVoyageDB | null>(null)
  const [filter, setFilter] = useState<'all' | 'templates'>('all')

  useEffect(() => {
    loadVoyages()
  }, [filter, showTemplatesOnly])

  const loadVoyages = async () => {
    setLoading(true)
    try {
      const data = showTemplatesOnly || filter === 'templates'
        ? await voyageService.getPopularTemplates(20)
        : await voyageService.getPublicVoyages()
      setVoyages(data)
    } catch (error) {
      console.error('Erreur chargement voyages publics:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleViewDetails = async (voyage: PublicVoyageDB) => {
    // Incrémenter les vues
    await voyageService.incrementViews(voyage.id)
    setSelectedVoyage(voyage)
  }

  const handleUseTemplate = (templateId: string) => {
    if (onUseTemplate) {
      onUseTemplate(templateId)
    }
  }

  // Vue détaillée d'un voyage
  if (selectedVoyage) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-20 p-6">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <button
              onClick={() => setSelectedVoyage(null)}
              className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              {language === 'fr' ? 'Retour à la galerie' : 'Back to gallery'}
            </button>
          </div>

          {/* Card du voyage */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
            {/* Image de couverture */}
            {selectedVoyage.template_image_url ? (
              <div className="h-64 bg-gradient-to-br from-indigo-500 to-purple-600 relative">
                <img
                  src={selectedVoyage.template_image_url}
                  alt={selectedVoyage.template_name || selectedVoyage.titre}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/20"></div>
              </div>
            ) : (
              <div className="h-64 bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <ImageIcon className="w-20 h-20 text-white/50" />
              </div>
            )}

            {/* Contenu */}
            <div className="p-8">
              {/* Titre et badges */}
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                    {selectedVoyage.template_name || selectedVoyage.titre}
                  </h1>
                  {selectedVoyage.template_description && (
                    <p className="text-gray-600 dark:text-gray-400 text-lg">
                      {selectedVoyage.template_description}
                    </p>
                  )}
                </div>
                {selectedVoyage.is_template && (
                  <span className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Template
                  </span>
                )}
              </div>

              {/* Statistiques */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-2">
                    <Eye className="w-4 h-4" />
                    <span className="text-sm">
                      {language === 'fr' ? 'Vues' : 'Views'}
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {selectedVoyage.views_count}
                  </p>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-2">
                    <Users className="w-4 h-4" />
                    <span className="text-sm">
                      {language === 'fr' ? 'Utilisations' : 'Uses'}
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {selectedVoyage.uses_count}
                  </p>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-2">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm">
                      {language === 'fr' ? 'Durée' : 'Duration'}
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {Math.ceil(
                      (new Date(selectedVoyage.date_fin).getTime() -
                        new Date(selectedVoyage.date_debut).getTime()) /
                        (1000 * 60 * 60 * 24)
                    )}{' '}
                    {language === 'fr' ? 'j' : 'd'}
                  </p>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-2">
                    <MapPin className="w-4 h-4" />
                    <span className="text-sm">
                      {language === 'fr' ? 'Événements' : 'Events'}
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {selectedVoyage.event_count}
                  </p>
                </div>
              </div>

              {/* Détails du voyage */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mb-8">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  {language === 'fr' ? 'Détails' : 'Details'}
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {language === 'fr' ? 'Date de début' : 'Start date'}
                    </p>
                    <p className="text-gray-900 dark:text-gray-100 font-medium">
                      {new Date(selectedVoyage.date_debut).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {language === 'fr' ? 'Date de fin' : 'End date'}
                    </p>
                    <p className="text-gray-900 dark:text-gray-100 font-medium">
                      {new Date(selectedVoyage.date_fin).toLocaleDateString()}
                    </p>
                  </div>
                  {selectedVoyage.budget && (
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {language === 'fr' ? 'Budget estimé' : 'Estimated budget'}
                      </p>
                      <p className="text-gray-900 dark:text-gray-100 font-medium">
                        {selectedVoyage.budget} {selectedVoyage.devise}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Bouton utiliser comme template */}
              {selectedVoyage.is_template && onUseTemplate && (
                <button
                  onClick={() => handleUseTemplate(selectedVoyage.id)}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold py-4 px-6 rounded-xl transition-all flex items-center justify-center gap-3"
                >
                  <Copy className="w-5 h-5" />
                  {language === 'fr' ? 'Utiliser comme modèle' : 'Use as template'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Vue liste (galerie)
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 pt-20 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors mb-6"
          >
            <ArrowLeft className="w-5 h-5" />
            {language === 'fr' ? 'Retour' : 'Back'}
          </button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                {language === 'fr' ? 'Galerie de Voyages' : 'Travel Gallery'}
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                {language === 'fr'
                  ? 'Découvrez des voyages partagés par la communauté'
                  : 'Discover trips shared by the community'}
              </p>
            </div>

            {!showTemplatesOnly && (
              <div className="flex gap-2">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filter === 'all'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {language === 'fr' ? 'Tous' : 'All'}
                </button>
                <button
                  onClick={() => setFilter('templates')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                    filter === 'templates'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  Templates
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Grille des voyages */}
        {loading ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-300">
              {language === 'fr' ? 'Chargement...' : 'Loading...'}
            </p>
          </div>
        ) : voyages.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-300 text-lg">
              {language === 'fr'
                ? 'Aucun voyage public pour le moment'
                : 'No public trips yet'}
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {voyages.map((voyage) => (
              <div
                key={voyage.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 cursor-pointer group"
                onClick={() => handleViewDetails(voyage)}
              >
                {/* Image */}
                {voyage.template_image_url ? (
                  <div className="h-48 relative overflow-hidden">
                    <img
                      src={voyage.template_image_url}
                      alt={voyage.template_name || voyage.titre}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                  </div>
                ) : (
                  <div className="h-48 bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                    <MapPin className="w-16 h-16 text-white/30" />
                  </div>
                )}

                {/* Badge template */}
                {voyage.is_template && (
                  <div className="absolute top-4 right-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Template
                  </div>
                )}

                {/* Contenu */}
                <div className="p-5">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2 line-clamp-1">
                    {voyage.template_name || voyage.titre}
                  </h3>
                  {voyage.template_description && (
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
                      {voyage.template_description}
                    </p>
                  )}

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-4">
                    <div className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      {voyage.views_count}
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {voyage.uses_count}
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {voyage.event_count}
                    </div>
                  </div>

                  {/* Durée */}
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {Math.ceil(
                        (new Date(voyage.date_fin).getTime() -
                          new Date(voyage.date_debut).getTime()) /
                          (1000 * 60 * 60 * 24)
                      )}{' '}
                      {language === 'fr' ? 'jours' : 'days'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
