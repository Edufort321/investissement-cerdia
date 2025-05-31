'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { Menu, X } from 'lucide-react' // Icônes du menu (tu peux aussi utiliser Heroicons ou autre)

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50 w-full">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center">
          <Image
            src="/logo-cerdia.png"
            alt="CERDIA Logo"
            width={150}
            height={48}
            className="h-auto w-[120px] sm:w-[180px] md:w-[225px]"
            priority
          />
        </Link>

        {/* Desktop navigation */}
        <nav className="hidden md:flex gap-6 items-center text-sm md:text-base">
          <Link href="/" className="hover:underline transition">Accueil</Link>
          <Link href="/vision-cerdia" className="hover:underline transition">Vision</Link>
          <Link href="/connexion" className="hover:underline transition">Connexion</Link>
          <Link href="/investir">
            <button className="bg-[#0F1E47] text-white px-4 py-2 rounded-full hover:bg-[#1a2960] transition">
              Investir
            </button>
          </Link>
        </nav>

        {/* Mobile menu button */}
        <button
          className="md:hidden text-gray-700"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div className="md:hidden px-4 pb-4 flex flex-col gap-4 bg-white text-sm">
          <Link href="/" onClick={() => setIsOpen(false)} className="hover:underline">Accueil</Link>
          <Link href="/vision-cerdia" onClick={() => setIsOpen(false)} className="hover:underline">Vision</Link>
          <Link href="/connexion" onClick={() => setIsOpen(false)} className="hover:underline">Connexion</Link>
          <Link href="/investir" onClick={() => setIsOpen(false)}>
            <button className="w-full bg-[#0F1E47] text-white py-2 rounded-full hover:bg-[#1a2960] transition">
              Investir
            </button>
          </Link>
        </div>
      )}
    </header>
  )
}
