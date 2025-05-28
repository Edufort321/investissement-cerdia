'use client'

import Link from 'next/link'
import Image from 'next/image'

export default function Navbar() {
  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        {/* Logo CERDIA agrandi */}
        <Link href="/" className="flex items-center">
          <Image
            src="/logo-cerdia.png"
            alt="CERDIA Logo"
            width={225}     // 150 * 1.5
            height={72}      // 48 * 1.5
            className="h-[72px] w-auto"
            priority
          />
        </Link>

        {/* Navigation */}
        <nav className="flex gap-6 items-center text-sm md:text-base">
          <Link href="/" className="hover:underline transition">Accueil</Link>
          <Link href="/vision-cerdia" className="hover:underline transition">Vision</Link>
          <Link href="/connexion" className="hover:underline transition">Connexion</Link>

          <Link href="/investir">
            <button className="bg-[#0F1E47] text-white px-4 py-2 rounded-full hover:bg-[#1a2960] transition">
              Investir
            </button>
          </Link>
        </nav>
      </div>
    </header>
  )
}
