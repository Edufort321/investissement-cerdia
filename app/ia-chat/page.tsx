'use client'

import { useLanguage } from '@/contexts/LanguageContext'

export default function IAChatPage() {
  const { language } = useLanguage()
  const fr = language === 'fr'

  return (
    <div className="min-h-screen flex items-center justify-center text-xl text-gray-600">
      {fr ? '🤖 Assistant IA CERDIA – À venir' : '🤖 CERDIA AI Assistant – Coming soon'}
    </div>
  )
}
