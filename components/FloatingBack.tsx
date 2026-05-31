'use client'

import { usePathname, useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

/**
 * Bouton « Retour » FIXE universel, affiché sur toutes les pages SAUF l'accueil
 * et le dashboard (qui a sa propre navigation). Évite d'ajouter un retour manuel
 * sur chaque page. Position fixe en haut à gauche, sous la navbar.
 */

// Pages où le bouton retour ne doit PAS apparaître (elles ont leur propre nav,
// ou sont la racine).
const HIDDEN = ['/', '/dashboard', '/connexion', '/portfolio', '/commerce/admin', '/admin']

export default function FloatingBack() {
  const pathname = usePathname()
  const router = useRouter()
  const { language } = useLanguage()
  const fr = language === 'fr'

  const hidden = HIDDEN.some(r => pathname === r || (r !== '/' && pathname.startsWith(r)))
  if (hidden) return null

  return (
    <button
      onClick={() => router.back()}
      aria-label={fr ? "Retour" : 'Back'}
      className="fixed top-[4.5rem] left-3 z-40 inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/90 dark:bg-gray-800/90 backdrop-blur border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-200 shadow-sm hover:bg-white dark:hover:bg-gray-700 transition-colors"
    >
      <ArrowLeft size={16} />
      <span className="hidden sm:inline">{fr ? 'Retour' : 'Back'}</span>
    </button>
  )
}
