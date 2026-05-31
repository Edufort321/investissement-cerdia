'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

/**
 * Lien « Retour à l'accueil » réutilisable pour les pages publiques.
 * Positionné sous la navbar fixe. Bilingue FR/EN.
 */
export default function BackToHome({ className = '' }: { className?: string }) {
  const { language } = useLanguage()
  const fr = language === 'fr'
  return (
    <Link
      href="/"
      className={`inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 transition-colors ${className}`}
    >
      <ArrowLeft size={16} />
      {fr ? "Retour à l'accueil" : 'Back to home'}
    </Link>
  )
}
