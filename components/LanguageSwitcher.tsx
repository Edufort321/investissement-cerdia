'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useTransition } from 'react'

export default function LanguageSwitcher() {
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()

  const changeLocale = (locale: 'fr' | 'en') => {
    const newPath = `/${locale}${pathname.replace(/^\/(fr|en)/, '')}`
    startTransition(() => {
      router.push(newPath)
    })
  }

  return (
    <div className="flex gap-3 text-sm">
      <button onClick={() => changeLocale('fr')} className="hover:underline">
        🇫🇷 Français
      </button>
      <button onClick={() => changeLocale('en')} className="hover:underline">
        🇬🇧 English
      </button>
    </div>
  )
}
