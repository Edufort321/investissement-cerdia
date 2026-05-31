'use client'

import { useLanguage } from '@/contexts/LanguageContext'

export default function LocationPage() {
  const { language } = useLanguage()
  const fr = language === 'fr'

  return (
    <div className="min-h-screen pt-28 px-6">
      <div className="flex items-center justify-center text-xl text-gray-600 mt-20">
        {fr ? '🏢 Location haut de gamme CERDIA – À venir' : '🏢 CERDIA Premium Rentals – Coming soon'}
      </div>
    </div>
  )
}
