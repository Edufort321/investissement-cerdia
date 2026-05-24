'use client'

import { useEffect, useState } from 'react'
import { Download, X, Smartphone } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function InstallPWAPrompt() {
  const { language } = useLanguage()
  const fr = language === 'fr'
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    // Détecter iOS
    const checkIsIOS = () => {
      const userAgent = window.navigator.userAgent.toLowerCase()
      return /iphone|ipad|ipod/.test(userAgent)
    }

    // Vérifier si l'app est déjà installée
    const checkIfInstalled = () => {
      // Mode standalone = app installée
      if (window.matchMedia('(display-mode: standalone)').matches) {
        setIsInstalled(true)
        return true
      }
      // iOS standalone
      if ((window.navigator as any).standalone === true) {
        setIsInstalled(true)
        return true
      }
      return false
    }

    // Vérifier si l'utilisateur a déjà fermé le prompt
    const promptDismissed = localStorage.getItem('pwa-prompt-dismissed')

    if (checkIfInstalled() || promptDismissed === 'true') {
      return
    }

    const isiOS = checkIsIOS()
    setIsIOS(isiOS)

    // Sur iOS, afficher le prompt manuel après 3 secondes
    if (isiOS) {
      const timer = setTimeout(() => {
        setShowPrompt(true)
      }, 3000)
      return () => clearTimeout(timer)
    }

    // Écouter l'événement beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      const promptEvent = e as BeforeInstallPromptEvent
      setDeferredPrompt(promptEvent)
      setShowPrompt(true)
    }

    // Écouter l'installation
    const handleAppInstalled = () => {
      setIsInstalled(true)
      setShowPrompt(false)
      setDeferredPrompt(null)
      localStorage.removeItem('pwa-prompt-dismissed')
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      return
    }

    // Afficher le prompt d'installation
    await deferredPrompt.prompt()

    // Attendre la réponse de l'utilisateur
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      console.log('User accepted the install prompt')
    } else {
      console.log('User dismissed the install prompt')
    }

    // Réinitialiser
    setDeferredPrompt(null)
    setShowPrompt(false)
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    localStorage.setItem('pwa-prompt-dismissed', 'true')
  }

  // Ne rien afficher si déjà installé
  if (isInstalled || !showPrompt) {
    return null
  }

  // Ne rien afficher sur Android si pas de prompt disponible
  if (!isIOS && !deferredPrompt) {
    return null
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-md z-50 animate-slide-up">
      <div className="bg-gradient-to-br from-blue-600 to-purple-700 text-white rounded-xl shadow-2xl p-4 sm:p-5 border border-white/20">
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 text-white/80 hover:text-white transition-colors"
          aria-label={fr ? 'Fermer' : 'Close'}
        >
          <X size={20} />
        </button>

        <div className="flex items-start gap-3 mb-4">
          <div className="bg-white/20 p-2.5 rounded-lg flex-shrink-0">
            <Smartphone className="text-white" size={24} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-base sm:text-lg mb-1">
              {fr ? 'Installer CERDIA' : 'Install CERDIA'}
            </h3>
            <p className="text-white/90 text-sm leading-relaxed">
              {fr
                ? "Accédez rapidement à votre plateforme depuis votre écran d'accueil. Fonctionne comme une application native!"
                : 'Quick access to your platform from your home screen. Works like a native app!'}
            </p>
          </div>
        </div>

        {isIOS ? (
          <div className="space-y-3">
            <p className="text-white/90 text-sm font-medium">
              {fr ? 'Pour installer sur iOS:' : 'To install on iOS:'}
            </p>
            <ol className="text-white/90 text-xs space-y-2 list-decimal list-inside">
              {fr ? (
                <>
                  <li>Appuyez sur l'icône <span className="inline-flex items-center justify-center w-5 h-5 bg-white/20 rounded mx-1">📤</span> (Partager) en bas de Safari</li>
                  <li>Faites défiler et sélectionnez "Sur l'écran d'accueil"</li>
                  <li>Appuyez sur "Ajouter"</li>
                </>
              ) : (
                <>
                  <li>Tap the <span className="inline-flex items-center justify-center w-5 h-5 bg-white/20 rounded mx-1">📤</span> (Share) icon at the bottom of Safari</li>
                  <li>Scroll down and select "Add to Home Screen"</li>
                  <li>Tap "Add"</li>
                </>
              )}
            </ol>
            <button
              onClick={handleDismiss}
              className="w-full mt-2 px-4 py-2.5 text-white bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-sm font-medium"
            >
              {fr ? "J'ai compris" : 'Got it'}
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={handleInstallClick}
              className="flex-1 bg-white text-blue-600 hover:bg-blue-50 font-semibold py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg"
            >
              <Download size={18} />
              {fr ? "Installer l'app" : 'Install app'}
            </button>
            <button
              onClick={handleDismiss}
              className="px-4 py-2.5 text-white/90 hover:text-white hover:bg-white/10 rounded-lg transition-colors text-sm font-medium"
            >
              {fr ? 'Plus tard' : 'Later'}
            </button>
          </div>
        )}

        <div className="mt-3 pt-3 border-t border-white/20">
          <ul className="text-xs text-white/80 space-y-1">
            <li className="flex items-center gap-2">
              <span className="w-1 h-1 bg-white rounded-full"></span>
              {fr ? 'Accès instantané sans navigateur' : 'Instant access without a browser'}
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1 h-1 bg-white rounded-full"></span>
              {fr ? 'Notifications en temps réel' : 'Real-time notifications'}
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1 h-1 bg-white rounded-full"></span>
              {fr ? 'Fonctionne hors ligne' : 'Works offline'}
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
