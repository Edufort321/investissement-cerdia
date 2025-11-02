'use client'

import React, { useState } from 'react'
import { Share2, Copy, Check, Eye, EyeOff, Globe, Link as LinkIcon, CheckSquare, Calendar, Image, DollarSign, MapPin } from 'lucide-react'
import { Voyage } from '@/types/voyage'

export interface SharePreferences {
  timeline: boolean
  checklist: boolean
  photos: boolean
  budget: boolean
  map: boolean
}

interface VoyageShareProps {
  voyage: Voyage
  onGenerateLink: () => void
  onToggleLive: () => void
  shareLink?: string
  isLive: boolean
  language?: string
  sharePreferences?: SharePreferences
  onSharePreferencesChange?: (prefs: SharePreferences) => void
}

export default function VoyageShare({
  voyage,
  onGenerateLink,
  onToggleLive,
  shareLink,
  isLive,
  language = 'fr',
  sharePreferences,
  onSharePreferencesChange
}: VoyageShareProps) {
  const [copied, setCopied] = useState(false)
  const [localPrefs, setLocalPrefs] = useState<SharePreferences>(
    sharePreferences || {
      timeline: true,
      checklist: true,
      photos: true,
      budget: false,
      map: true
    }
  )

  const handleTogglePreference = (key: keyof SharePreferences) => {
    const newPrefs = { ...localPrefs, [key]: !localPrefs[key] }
    setLocalPrefs(newPrefs)
    if (onSharePreferencesChange) {
      onSharePreferencesChange(newPrefs)
    }
  }

  const t = (key: string) => {
    const translations: Record<string, { fr: string; en: string }> = {
      'share.title': { fr: 'Partager mon voyage', en: 'Share My Trip' },
      'share.subtitle': { fr: 'Partagez votre itinéraire avec vos proches', en: 'Share your itinerary with loved ones' },
      'share.liveMode': { fr: 'Mode "Me Suivre"', en: '"Follow Me" Mode' },
      'share.liveDesc': { fr: 'Activez le mode en direct pour que vos proches voient votre position en temps réel', en: 'Enable live mode so loved ones can see your location in real-time' },
      'share.enable': { fr: 'Activer', en: 'Enable' },
      'share.disable': { fr: 'Désactiver', en: 'Disable' },
      'share.generateLink': { fr: 'Générer le lien de partage', en: 'Generate Share Link' },
      'share.copyLink': { fr: 'Copier le lien', en: 'Copy Link' },
      'share.copied': { fr: 'Copié !', en: 'Copied!' },
      'share.public': { fr: 'Visible publiquement', en: 'Publicly Visible' },
      'share.private': { fr: 'Privé', en: 'Private' },
      'share.customize': { fr: 'Personnaliser le partage', en: 'Customize Sharing' },
      'share.customizeDesc': { fr: 'Choisissez exactement ce que vous voulez partager', en: 'Choose exactly what you want to share' },
      'share.whatIsShared': { fr: 'Ce qui sera partagé', en: 'What Will Be Shared' },
      'share.timeline': { fr: 'Timeline complète avec événements', en: 'Complete timeline with events' },
      'share.checklist': { fr: 'Checklist de préparation', en: 'Preparation checklist' },
      'share.photos': { fr: 'Photos de voyage', en: 'Trip photos' },
      'share.budget': { fr: 'Budget et dépenses', en: 'Budget and expenses' },
      'share.map': { fr: 'Carte interactive', en: 'Interactive map' },
      'share.nothingSelected': { fr: 'Aucun élément sélectionné', en: 'No items selected' },
      'share.selectAtLeastOne': { fr: 'Sélectionnez au moins un élément à partager', en: 'Select at least one item to share' }
    }
    return translations[key]?.[language as 'fr' | 'en'] || key
  }

  const handleCopy = () => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="p-3 sm:p-6 pt-20 sm:pt-24 space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          {t('share.title')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {t('share.subtitle')}
        </p>
      </div>

      {/* Live Mode Toggle */}
      <div className="bg-gray-800 rounded-xl shadow-md p-6 border-2 border-gray-700">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-indigo-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
              {isLive ? (
                <Eye className="w-6 h-6 text-indigo-500" />
              ) : (
                <EyeOff className="w-6 h-6 text-gray-500" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-100 mb-1">
                {t('share.liveMode')}
              </h3>
              <p className="text-sm text-gray-400">
                {t('share.liveDesc')}
              </p>
              {isLive && (
                <div className="mt-2 flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-green-500 font-semibold">
                    Actif en direct
                  </span>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={onToggleLive}
            className={`px-6 py-3 rounded-lg font-semibold transition ${
              isLive
                ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50'
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
          >
            {isLive ? t('share.disable') : t('share.enable')}
          </button>
        </div>
      </div>

      {/* Share Link */}
      <div className="bg-gray-800 rounded-xl shadow-md p-6">
        <div className="flex items-center gap-3 mb-4">
          <LinkIcon className="w-5 h-5 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-100">
            Lien de partage
          </h3>
        </div>

        {shareLink ? (
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={shareLink}
                readOnly
                className="flex-1 bg-gray-700 text-gray-300 rounded-lg px-4 py-3 border border-gray-600 font-mono text-sm"
              />
              <button
                onClick={handleCopy}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg transition flex items-center gap-2"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    {t('share.copied')}
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    {t('share.copyLink')}
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <Globe className="w-4 h-4 text-gray-400" />
              <span className="text-gray-400">
                {voyage.partage.actif ? t('share.public') : t('share.private')}
              </span>
            </div>
          </div>
        ) : (
          <button
            onClick={onGenerateLink}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg transition flex items-center justify-center gap-2"
          >
            <Share2 className="w-4 h-4" />
            {t('share.generateLink')}
          </button>
        )}
      </div>

      {/* Customize Sharing */}
      <div className="bg-gray-800 rounded-xl shadow-md p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-100 mb-1">
            {t('share.customize')}
          </h3>
          <p className="text-sm text-gray-400">
            {t('share.customizeDesc')}
          </p>
        </div>

        <div className="space-y-3">
          {[
            {
              key: 'timeline' as keyof SharePreferences,
              icon: Calendar,
              emoji: '📅',
              text: t('share.timeline')
            },
            {
              key: 'checklist' as keyof SharePreferences,
              icon: CheckSquare,
              emoji: '✓',
              text: t('share.checklist')
            },
            {
              key: 'map' as keyof SharePreferences,
              icon: MapPin,
              emoji: '🗺️',
              text: t('share.map')
            },
            {
              key: 'photos' as keyof SharePreferences,
              icon: Image,
              emoji: '📸',
              text: t('share.photos')
            },
            {
              key: 'budget' as keyof SharePreferences,
              icon: DollarSign,
              emoji: '💰',
              text: t('share.budget')
            }
          ].map((item) => {
            const Icon = item.icon
            const isEnabled = localPrefs[item.key]
            return (
              <button
                key={item.key}
                onClick={() => handleTogglePreference(item.key)}
                className={`w-full flex items-center justify-between p-4 rounded-lg transition-all ${
                  isEnabled
                    ? 'bg-indigo-600/20 border-2 border-indigo-500'
                    : 'bg-gray-700/50 border-2 border-gray-600 hover:border-gray-500'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{item.emoji}</span>
                  <Icon className={`w-5 h-5 ${isEnabled ? 'text-indigo-400' : 'text-gray-500'}`} />
                  <span className={`font-medium ${isEnabled ? 'text-gray-100' : 'text-gray-400'}`}>
                    {item.text}
                  </span>
                </div>
                <div className={`w-12 h-6 rounded-full transition-colors relative ${
                  isEnabled ? 'bg-indigo-600' : 'bg-gray-600'
                }`}>
                  <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    isEnabled ? 'translate-x-6' : 'translate-x-0'
                  }`} />
                </div>
              </button>
            )
          })}
        </div>

        {/* Warning if nothing selected */}
        {!Object.values(localPrefs).some(v => v) && (
          <div className="mt-4 p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
            <p className="text-sm text-yellow-300 flex items-center gap-2">
              <span className="text-lg">⚠️</span>
              {t('share.selectAtLeastOne')}
            </p>
          </div>
        )}
      </div>

      {/* Privacy Notice */}
      <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-4">
        <p className="text-sm text-blue-300">
          <strong>Note de confidentialité:</strong> Seules les personnes ayant le lien pourront voir votre voyage.
          Le mode "Me Suivre" permet de partager votre position en temps réel uniquement lorsqu'il est activé.
        </p>
      </div>
    </div>
  )
}
