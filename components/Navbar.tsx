'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Menu, X, Sun, Moon } from 'lucide-react'
import LanguageSwitcher from './LanguageSwitcher'
import { useTheme } from '@/contexts/ThemeContext'

export default function Navbar() {
  const { isDark, toggleTheme } = useTheme()
  const [scrolled, setScrolled] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024
      setIsMobile(mobile)
      if (!mobile) {
        setMobileMenuOpen(false)
      }
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <header className={`bg-[#c7c7c7] shadow-sm fixed top-0 z-50 w-full transition-all duration-300 ${
      scrolled ? 'py-1' : 'py-2'
    }`}>
      <div className="w-full px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Logo CERDIA responsive - toujours à gauche */}
        <Link href="/" className="flex items-center flex-shrink-0">
          <Image
            src="/logo-cerdia3.png"
            alt="Logo officiel Investissement CERDIA"
            width={60}
            height={30}
            className={`h-auto transition-all duration-300 ${
              scrolled ? 'w-[60px] sm:w-[70px] md:w-[80px]' : 'w-[70px] sm:w-[90px] md:w-[100px]'
            }`}
            priority
          />
        </Link>

        {/* Navigation Desktop - toujours à droite */}
        <nav className="hidden lg:flex gap-2 items-center flex-shrink-0">
          <button
            onClick={toggleTheme}
            className="bg-[#5e5e5e] text-white p-2 rounded-full hover:bg-[#3e3e3e] transition"
            title={isDark ? 'Mode jour' : 'Mode sombre'}
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button className="bg-[#5e5e5e] text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-full hover:bg-[#3e3e3e] transition text-xs sm:text-sm">
            <LanguageSwitcher />
          </button>
          <Link href="/">
            <button className="bg-[#5e5e5e] text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-full hover:bg-[#3e3e3e] transition text-xs sm:text-sm">
              Accueil
            </button>
          </Link>
          <Link href="/vision-cerdia">
            <button className="bg-[#5e5e5e] text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-full hover:bg-[#3e3e3e] transition text-xs sm:text-sm">
              Vision
            </button>
          </Link>
          <Link href="/connexion">
            <button className="bg-[#5e5e5e] text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-full hover:bg-[#3e3e3e] transition text-xs sm:text-sm">
              Connexion
            </button>
          </Link>
          <Link href="/investir">
            <button className="bg-[#5e5e5e] text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-full hover:bg-[#3e3e3e] transition text-xs sm:text-sm">
              Investir
            </button>
          </Link>
        </nav>

        {/* Hamburger Menu Button */}
        {isMobile && (
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 bg-[#5e5e5e] text-white rounded-full hover:bg-[#3e3e3e] transition"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        )}
      </div>

      {/* Mobile Menu */}
      {isMobile && mobileMenuOpen && (
        <div className="lg:hidden bg-[#c7c7c7] border-t border-gray-400">
          <nav className="flex flex-col px-4 py-3 gap-2">
            <button
              onClick={toggleTheme}
              className="bg-[#5e5e5e] text-white px-4 py-2 rounded-full hover:bg-[#3e3e3e] transition text-sm flex items-center justify-center gap-2"
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
              <span>{isDark ? 'Mode jour' : 'Mode sombre'}</span>
            </button>
            <button className="bg-[#5e5e5e] text-white px-4 py-2 rounded-full hover:bg-[#3e3e3e] transition text-sm text-center">
              <LanguageSwitcher />
            </button>
            <Link href="/" onClick={() => setMobileMenuOpen(false)}>
              <button className="w-full bg-[#5e5e5e] text-white px-4 py-2 rounded-full hover:bg-[#3e3e3e] transition text-sm">
                Accueil
              </button>
            </Link>
            <Link href="/vision-cerdia" onClick={() => setMobileMenuOpen(false)}>
              <button className="w-full bg-[#5e5e5e] text-white px-4 py-2 rounded-full hover:bg-[#3e3e3e] transition text-sm">
                Vision
              </button>
            </Link>
            <Link href="/connexion" onClick={() => setMobileMenuOpen(false)}>
              <button className="w-full bg-[#5e5e5e] text-white px-4 py-2 rounded-full hover:bg-[#3e3e3e] transition text-sm">
                Connexion
              </button>
            </Link>
            <Link href="/investir" onClick={() => setMobileMenuOpen(false)}>
              <button className="w-full bg-[#5e5e5e] text-white px-4 py-2 rounded-full hover:bg-[#3e3e3e] transition text-sm">
                Investir
              </button>
            </Link>
          </nav>
        </div>
      )}
    </header>
  )
}
