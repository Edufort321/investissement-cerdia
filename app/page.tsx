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
      powered: "Version IA propulsée par OpenAI – Propulsé depuis le Québec 🇨🇦",
      visionTitle: "Notre vision stratégique 2025–2045",
      visionDesc: "Investissement CERDIA vise la construction d’un portefeuille immobilier 100 % autofinancé, sans dette bancaire, optimisé par intelligence artificielle. Trois unités déjà sécurisées en République dominicaine. Objectif d’ici 2045 : 15 à 25 propriétés, rendement net annuel > 500 000 $, valeur nette projetée : 12 à 18 M$. Tous les profits du commerce électronique CERDIA Commerce sont réinjectés dans l’immobilier. Un jeton Allcoin intelligent permettra un accès privilégié à l’écosystème, incluant dividendes, utilité et conversion en actions.",
      visionCTA: "En savoir plus sur la vision"
    },
    en: {
      title: "A bold vision combining AI, real estate, education and luxury rentals",
      subtitle: "Intelligence in the service of investment. Join a high-end network and grow your capital strategically.",
      button: "Become an investor",
      footer: "All rights reserved.",
      powered: "AI version powered by OpenAI – Operated from Quebec 🇨🇦",
      visionTitle: "Our Strategic Vision 2025–2045",
      visionDesc: "Investissement CERDIA is building a fully self-financed real estate portfolio, debt-free, powered by artificial intelligence. Three units already secured in the Dominican Republic. By 2045: 15 to 25 premium properties, annual net revenue > $500,000, projected value: $12–18M. All profits from CERDIA Commerce (FBA) are reinvested into real estate. The Allcoin token offers privileged access, smart dividends, ecosystem utility, and convertible rights.",
      visionCTA: "Discover the full vision"
    }
  }

  const tr = t[lang]

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      {/* HERO SECTION */}
      <section className="max-w-6xl mx-auto px-6 py-16 text-center">
        <h1 className="text-4xl md:text-6xl font-bold text-[#2a2a2a] font-serif mb-6 leading-tight">
          {tr.title}
        </h1>
        <p className="text-lg text-[#444] max-w-3xl mx-auto mb-8">
          {tr.subtitle}
        </p>
        <Link href="/investir">
          <button className="bg-[#5e5e5e] text-white px-6 py-3 rounded-full text-lg hover:bg-[#3e3e3e] transition">
            {tr.button}
          </button>
        </Link>
      </section>

      {/* VISION STRATÉGIQUE SECTION */}
      <section className="bg-white py-12 px-6 text-center max-w-4xl mx-auto">
        <h2 className="text-3xl font-semibold text-[#2a2a2a] mb-4">{tr.visionTitle}</h2>
        <p className="text-[#444] text-lg mb-6">
          {tr.visionDesc}
        </p>
        <Link href="/vision-cerdia">
          <button className="text-black underline hover:text-[#222] font-medium text-sm">
            {tr.visionCTA} →
          </button>
        </Link>
      </section>

      {/* SLIDES */}
      {[
        { href: '/immobilier', src: '/cerdia-slide-immobilier.png', alt: 'Immobilier' },
        { href: '/location', src: '/cerdia-slide-location.png', alt: 'Location' }
      ].map(({ href, src, alt }, i) => (
        <section className="w-full cursor-pointer" key={i}>
          <Link href={href}>
            <Image
              src={src}
              alt={alt}
              width={1920}
              height={800}
              className="w-full h-auto transition-transform duration-200 hover:scale-105"
              priority={i === 0}
            />
          </Link>
        </section>
      ))}

      {/* FOOTER */}
      <footer className="bg-black text-white py-6 mt-16">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center text-sm text-center gap-2 md:gap-0">
          <p>&copy; 2025 Investissement CERDIA. {tr.footer}</p>
          <p>{tr.powered}</p>
        </div>
      </footer>
    </div>
  )
}
