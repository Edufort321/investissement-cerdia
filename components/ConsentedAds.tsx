'use client'

import { useEffect, useState } from 'react'
import Script from 'next/script'

/**
 * Charge le script Google AdSense UNIQUEMENT après consentement aux cookies
 * (Loi 25 / RGPD). Tant que l'utilisateur n'a pas accepté, aucun script
 * publicitaire/traceur n'est injecté.
 *
 * S'abonne au choix initial (localStorage) + aux changements en direct via
 * l'événement `cerdia-consent-change` émis par <CookieConsent />.
 */
export default function ConsentedAds() {
  const [consented, setConsented] = useState(false)

  useEffect(() => {
    const check = () => setConsented(localStorage.getItem('cerdia_cookie_consent') === 'accepted')
    check()
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent).detail
      setConsented(detail === 'accepted')
    }
    window.addEventListener('cerdia-consent-change', onChange)
    return () => window.removeEventListener('cerdia-consent-change', onChange)
  }, [])

  if (!consented) return null

  return (
    <Script
      async
      src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7698570045125787"
      crossOrigin="anonymous"
      strategy="afterInteractive"
    />
  )
}
