'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, X } from '@/lib/icons'
import { useLanguage } from '@/contexts/LanguageContext'

export default function PWAWarning() {
  const [showWarning, setShowWarning] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)
  const { language } = useLanguage()
  const fr = language === 'fr'

  useEffect(() => {
    // Vérifier si déjà dismissed dans localStorage
    const dismissed = localStorage.getItem('pwa-firefox-warning-dismissed')
    if (dismissed === 'true') {
      setIsDismissed(true)
      return
    }

    // Détecter Firefox
    const isFirefox = /firefox/i.test(navigator.userAgent)

    // Détecter si on est sur desktop (pas mobile)
    const isDesktop = !/android|iphone|ipad|ipod/i.test(navigator.userAgent)

    if (isFirefox && isDesktop) {
      setShowWarning(true)
      console.warn('⚠️ Firefox Desktop ne supporte pas l\'installation PWA native')
    }
  }, [])

  const handleDismiss = () => {
    setShowWarning(false)
    setIsDismissed(true)
    localStorage.setItem('pwa-firefox-warning-dismissed', 'true')
  }

  if (!showWarning || isDismissed) {
    return null
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-orange-500 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Icône + Message */}
          <div className="flex items-center gap-3 flex-1">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <div className="text-sm">
              <span className="font-semibold">
                {fr ? 'Installation PWA non disponible sur Firefox Desktop.' : 'PWA installation not available on Firefox Desktop.'}
              </span>
              {' '}
              {fr ? "Pour installer l'application, veuillez utiliser" : 'To install the application, please use'}{' '}
              <span className="font-semibold">Chrome, Edge {fr ? 'ou' : 'or'} Brave</span>.
              {' '}
              <a
                href="https://www.google.com/chrome/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-orange-100 transition-colors"
              >
                {fr ? 'Télécharger Chrome' : 'Download Chrome'}
              </a>
            </div>
          </div>

          {/* Bouton fermer */}
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-1 hover:bg-orange-600 rounded transition-colors"
            aria-label={fr ? "Fermer l'avertissement" : 'Close warning'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
