'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Menu, X, Sun, Moon } from 'lucide-react'
import LanguageSwitcher from './LanguageSwitcher'
import { useTheme } from '@/contexts/ThemeContext'
import { useLanguage } from '@/contexts/LanguageContext'

export default function Navbar() {
  const { isDark, toggleTheme } = useTheme()
  const { language } = useLanguage()
  const fr = language === 'fr'
  const pathname = usePathname()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  if (pathname?.startsWith('/onboarding')) return null

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header className={`bg-[#717171] shadow-md fixed top-0 z-50 w-full transition-all duration-300 ${
      scrolled ? 'py-1' : 'py-2'
    }`}>
      <div className="w-full px-4 sm:px-6 flex items-center justify-between">

        {/* Logo — plus compact */}
        <Link href="/" className="flex items-center flex-shrink-0">
          <Image
            src="/logo-cerdia3.png"
            alt="Logo officiel CERDIA"
            width={40}
            height={20}
            className={`h-auto transition-all duration-300 ${scrolled ? 'w-[32px]' : 'w-[40px]'}`}
            priority
          />
        </Link>

        {/* Droite : FR/EN toujours visible + hamburger */}
        <div className="flex items-center gap-2">
          <button className="bg-[#4a4a4a] text-white px-3 py-1.5 rounded-full hover:bg-[#333] transition text-xs font-semibold">
            <LanguageSwitcher />
          </button>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 bg-[#4a4a4a] text-white rounded-full hover:bg-[#333] transition"
          >
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Menu déroulant */}
      {menuOpen && (
        <div className="bg-[#5e5e5e] border-t border-white/10">
          <nav className="flex flex-col px-4 py-3 gap-2">
            <button
              onClick={toggleTheme}
              className="bg-[#4a4a4a] text-white px-4 py-2 rounded-full hover:bg-[#333] transition text-sm flex items-center justify-center gap-2"
            >
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
              <span>{isDark ? (fr ? 'Mode jour' : 'Day mode') : (fr ? 'Mode sombre' : 'Dark mode')}</span>
            </button>
            <Link href="/" onClick={() => setMenuOpen(false)}>
              <button className="w-full bg-[#4a4a4a] text-white px-4 py-2 rounded-full hover:bg-[#333] transition text-sm">
                {fr ? 'Accueil' : 'Home'}
              </button>
            </Link>
            <Link href="/investir" onClick={() => setMenuOpen(false)}>
              <button className="w-full bg-[#4a4a4a] text-white px-4 py-2 rounded-full hover:bg-[#333] transition text-sm">
                {fr ? 'Investir' : 'Invest'}
              </button>
            </Link>
            <Link href="/vision-cerdia" onClick={() => setMenuOpen(false)}>
              <button className="w-full bg-[#4a4a4a] text-white px-4 py-2 rounded-full hover:bg-[#333] transition text-sm">
                Vision
              </button>
            </Link>
            <Link href="/commerce" onClick={() => setMenuOpen(false)}>
              <button className="w-full bg-[#4a4a4a] text-white px-4 py-2 rounded-full hover:bg-[#333] transition text-sm">
                Commerce
              </button>
            </Link>
            <Link href="/demo" onClick={() => setMenuOpen(false)}>
              <button className="w-full bg-[#4a4a4a] text-white px-4 py-2 rounded-full hover:bg-[#333] transition text-sm">
                {fr ? 'Démo' : 'Demo'}
              </button>
            </Link>
            <Link href="/connexion?redirect=/dashboard" onClick={() => setMenuOpen(false)}>
              <button className="w-full bg-[#4a4a4a] text-white px-4 py-2 rounded-full hover:bg-[#333] transition text-sm">
                {fr ? 'Investisseur' : 'Investor'}
              </button>
            </Link>
          </nav>
        </div>
      )}
    </header>
  )
}
