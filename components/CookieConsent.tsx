'use client'

import { useEffect, useState } from 'react'

/**
 * Bannière de consentement aux cookies — conformité Loi 25 (Québec) / RGPD (UE).
 *
 * Le site charge des cookies non essentiels (publicité Google AdSense, analytics).
 * La loi exige un consentement EXPLICITE et PRÉALABLE avant de les déposer. Ce
 * composant :
 *   - bloque le chargement des scripts de tracking tant que l'utilisateur n'a pas
 *     choisi (le script AdSense ne se charge qu'après "Accepter") ;
 *   - mémorise le choix dans localStorage (cerdia_cookie_consent) ;
 *   - permet de refuser (le strict nécessaire seulement).
 *
 * L'état est exposé via l'événement `cerdia-consent-change` et la clé localStorage
 * pour que les scripts tiers s'abonnent.
 */

const CONSENT_KEY = 'cerdia_cookie_consent' // 'accepted' | 'rejected'

export function hasCookieConsent(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(CONSENT_KEY) === 'accepted'
}

export default function CookieConsent() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // N'affiche la bannière que si aucun choix n'a encore été fait.
    const choice = localStorage.getItem(CONSENT_KEY)
    if (!choice) setVisible(true)
  }, [])

  const decide = (value: 'accepted' | 'rejected') => {
    localStorage.setItem(CONSENT_KEY, value)
    window.dispatchEvent(new CustomEvent('cerdia-consent-change', { detail: value }))
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Consentement aux cookies"
      className="fixed bottom-0 inset-x-0 z-[100] bg-gray-900 text-gray-100 shadow-2xl border-t border-gray-700"
    >
      <div className="max-w-5xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <p className="text-xs sm:text-sm flex-1 leading-relaxed">
          🍪 Nous utilisons des cookies essentiels au fonctionnement du site, et — avec votre accord —
          des cookies de mesure d’audience et de publicité. Vous pouvez accepter ou refuser ces derniers.
          Voir notre{' '}
          <a href="/privacy" className="underline text-amber-300 hover:text-amber-200">politique de confidentialité</a>.
        </p>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => decide('rejected')}
            className="px-3 py-2 text-xs sm:text-sm rounded-lg border border-gray-500 text-gray-200 hover:bg-gray-800 transition-colors"
          >
            Refuser
          </button>
          <button
            onClick={() => decide('accepted')}
            className="px-4 py-2 text-xs sm:text-sm rounded-lg bg-amber-500 text-gray-900 font-semibold hover:bg-amber-400 transition-colors"
          >
            Accepter
          </button>
        </div>
      </div>
    </div>
  )
}
