'use client'

import React, { useState } from 'react'
import { Share2, Copy, Check, Eye, EyeOff, Globe, Link as LinkIcon } from 'lucide-react'
import { Voyage } from '@/types/voyage'

interface VoyageShareProps {
  voyage: Voyage
  onGenerateLink: () => void
  onToggleLive: () => void
  shareLink?: string
  isLive: boolean
  language?: string
}

export default function VoyageShare({
  voyage,
  onGenerateLink,
  onToggleLive,
  shareLink,
  isLive,
  language = 'fr'
}: VoyageShareProps) {
  const [copied, setCopied] = useState(false)

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
      'share.whatIsShared': { fr: 'Ce qui sera partagé', en: 'What Will Be Shared' },
      'share.timeline': { fr: 'Timeline complète avec événements', en: 'Complete timeline with events' },
      'share.checklist': { fr: 'Checklist de préparation', en: 'Preparation checklist' },
      'share.photos': { fr: 'Photos de voyage', en: 'Trip photos' },
      'share.budget': { fr: 'Budget (si partagé)', en: 'Budget (if shared)' }
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
    <div className="p-6 space-y-6">
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

      {/* What's Shared */}
      <div className="bg-gray-800 rounded-xl shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-100 mb-4">
          {t('share.whatIsShared')}
        </h3>

        <div className="space-y-3">
          {[
            { icon: '📅', text: t('share.timeline') },
            { icon: '✓', text: t('share.checklist') },
            { icon: '📸', text: t('share.photos') },
            { icon: '💰', text: t('share.budget') }
          ].map((item, i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-3 bg-gray-700/50 rounded-lg"
            >
              <span className="text-2xl">{item.icon}</span>
              <span className="text-gray-300">{item.text}</span>
            </div>
          ))}
        </div>
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
