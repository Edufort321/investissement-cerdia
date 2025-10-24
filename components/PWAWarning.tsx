'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, X } from '@/lib/icons'

export default function PWAWarning() {
  const [showWarning, setShowWarning] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)

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
              <span className="font-semibold">Installation PWA non disponible sur Firefox Desktop.</span>
              {' '}
              Pour installer l'application, veuillez utiliser{' '}
              <span className="font-semibold">Chrome, Edge ou Brave</span>.
              {' '}
              <a
                href="https://www.google.com/chrome/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-orange-100 transition-colors"
              >
                Télécharger Chrome
              </a>
            </div>
          </div>

          {/* Bouton fermer */}
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-1 hover:bg-orange-600 rounded transition-colors"
            aria-label="Fermer l'avertissement"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
