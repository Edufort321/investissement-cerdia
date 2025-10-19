'use client'

import { useLanguage } from '@/contexts/LanguageContext'

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage()

  const toggleLanguage = () => {
    const newLang = language === 'fr' ? 'en' : 'fr'
    setLanguage(newLang)
  }

  return (
    <span
      onClick={toggleLanguage}
      className="cursor-pointer font-medium"
      title={language === 'fr' ? 'Switch to English' : 'Passer au français'}
    >
      {language === 'fr' ? 'FR' : 'EN'} / {language === 'fr' ? 'EN' : 'FR'}
    </span>
  )
}
