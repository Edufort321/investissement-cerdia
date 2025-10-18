'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useTransition, useState } from 'react'

export default function LanguageSwitcher() {
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()
  const [currentLang, setCurrentLang] = useState<'fr' | 'en'>('fr')

  const toggleLanguage = () => {
    const newLang = currentLang === 'fr' ? 'en' : 'fr'
    setCurrentLang(newLang)
    const newPath = `/${newLang}${pathname.replace(/^\/(fr|en)/, '')}`
    startTransition(() => {
      router.push(newPath)
    })
  }

  return (
    <span
      onClick={toggleLanguage}
      className="cursor-pointer"
    >
      FR/EN
    </span>
  )
}
