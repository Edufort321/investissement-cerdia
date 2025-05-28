'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'

export default function Home() {
  const [lang, setLang] = useState<'fr' | 'en'>('fr')

  const t = {
    fr: {
      title: "Une vision d’envergure alliant IA, immobilier, formation et luxe locatif",
      subtitle: "L'intelligence au service de l'investissement. Rejoignez un réseau haut de gamme et faites croître votre capital stratégiquement.",
      button: "Devenir investisseur",
      footer: "Tous droits réservés.",
      powered: "Version IA propulsée par OpenAI – Propulsé depuis le Québec 🇨🇦"
    },
    en: {
      title: "A bold vision combining AI, real estate, education and luxury rentals",
      subtitle: "Intelligence in the service of investment. Join a high-end network and grow your capital strategically.",
      button: "Become an investor",
      footer: "All rights reserved.",
      powered: "AI version powered by OpenAI – Operated from Quebec 🇨🇦"
    }
  }

  const tr = t[lang]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Language Selector */}
      <div className="absolute top-6 right-6 z-50">
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value as 'fr' | 'en')}
          className="border px-3 py-1 rounded-md shadow text-sm"
        >
          <option value="fr">🇫🇷 Français</option>
          <option value="en">🇬🇧 English</option>
        </select>
      </div>

      {/* HERO SECTION */}
      <section className="max-w-6xl mx-auto px-6 py-16 text-center">
        <h1 className="text-4xl md:text-6xl font-bold text-[#0F1E47] font-serif mb-6 leading-tight">
          {tr.title}
        </h1>
        <p className="text-lg text-gray-700 max-w-3xl mx-auto mb-8">
          {tr.subtitle}
        </p>
        <Link href="/investir">
          <button className="bg-[#0F1E47] text-white px-6 py-3 rounded-full text-lg hover:bg-[#1a2960] transition">
            {tr.button}
          </button>
        </Link>
      </section>

      {/* SLIDES */}
      <section className="w-full cursor-pointer">
        <Link href="/ia">
          <Image
            src="/cerdia-slide-intelligence.png"
            alt="Intelligence"
            width={1920}
            height={800}
            className="w-full h-auto transition-transform duration-200 hover:scale-105"
            priority
          />
        </Link>
      </section>

      <section className="w-full cursor-pointer">
        <Link href="/immobilier">
          <Image
            src="/cerdia-slide-immobilier.png"
            alt="Immobilier"
            width={1920}
            height={800}
            className="w-full h-auto transition-transform duration-200 hover:scale-105"
          />
        </Link>
      </section>

      <section className="w-full cursor-pointer">
        <Link href="/ecommerce">
          <Image
            src="/cerdia-slide-ecommerce.png"
            alt="eCommerce"
            width={1920}
            height={800}
            className="w-full h-auto transition-transform duration-200 hover:scale-105"
          />
        </Link>
      </section>

      <section className="w-full cursor-pointer">
        <Link href="/location">
          <Image
            src="/cerdia-slide-location.png"
            alt="Location"
            width={1920}
            height={800}
            className="w-full h-auto transition-transform duration-200 hover:scale-105"
          />
        </Link>
      </section>

      <section className="w-full cursor-pointer">
        <Link href="/formation">
          <Image
            src="/cerdia-slide-formation.png"
            alt="Formation"
            width={1920}
            height={800}
            className="w-full h-auto transition-transform duration-200 hover:scale-105"
          />
        </Link>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#0F1E47] text-white py-6 mt-16">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center text-sm text-center gap-2 md:gap-0">
          <p>&copy; 2025 Investissement CERDIA. {tr.footer}</p>
          <p>{tr.powered}</p>
        </div>
      </footer>
    </div>
  )
}
