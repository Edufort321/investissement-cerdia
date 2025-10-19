'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'

export default function PageInvestir() {
  const [lang, setLang] = useState<'fr' | 'en'>('fr')

  const t = {
    fr: {
      titre: "💼 Rejoindre l’investissement CERDIA",
      intro: "Investissement CERDIA ouvre ses portes à une sélection restreinte d’investisseurs. Notre mission : bâtir un portefeuille immobilier locatif international, optimisé par l’intelligence artificielle, avec une rentabilité durable à long terme.",
      p1: "L’entrée dans notre programme d’investissement est conditionnelle à une entrevue avec l’un des fondateurs. Seuls les candidats alignés avec notre vision stratégique et notre rigueur à long terme seront invités à participer.",
      p2: "L’investissement minimum est de 25 000 $, avec un engagement de 5 ans minimum. Aucun frais de retrait anticipé ne sera permis. Notre approche est conçue pour maximiser la valeur à long terme et la stabilité du capital.",
      p3: "Chaque investisseur admis bénéficiera d’un accès privilégié aux unités CERDIA, d’un suivi personnalisé, et d’un partage stratégique de la croissance.",
      bouton: "Devenir investisseur"
    },
    en: {
      titre: "💼 Join the CERDIA Investment Program",
      intro: "Investissement CERDIA is opening its doors to a selective group of investors. Our mission: to build an international rental real estate portfolio powered by AI, with sustainable long-term returns.",
      p1: "Entry into our investment program is subject to an interview with one of the founders. Only candidates aligned with our strategic vision and long-term discipline will be invited to participate.",
      p2: "The minimum investment is $25,000, with a minimum commitment of 5 years. Early withdrawals are not permitted. Our approach is designed to maximize long-term value and capital stability.",
      p3: "Approved investors will benefit from privileged access to CERDIA units, personalized support, and strategic growth sharing.",
      bouton: "Become an investor"
    }
  }

  const tr = t[lang]

  return (
    <div className="max-w-5xl mx-auto px-6 pt-24 pb-12">
      {/* Sélecteur de langue uniforme */}
      <div className="flex justify-end mb-6">
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value as 'fr' | 'en')}
          className="border px-3 py-1 rounded-md shadow text-sm"
        >
          <option value="fr">🇨🇦 Français</option>
          <option value="en">🇺🇸 English</option>
        </select>
      </div>

      {/* Titre */}
      <h1 className="text-3xl md:text-4xl font-bold text-center text-blue-900 mb-4">
        {tr.titre}
      </h1>

      {/* Intro */}
      <p className="text-center text-gray-700 mb-8">{tr.intro}</p>

      {/* Images */}
      <div className="grid md:grid-cols-2 gap-8 mb-10">
        <div className="border rounded-lg overflow-hidden">
          <Image
            src="/images/secret-garden.jpg"
            alt="Secret Garden"
            width={800}
            height={500}
            className="w-full h-56 object-cover"
          />
        </div>
        <div className="border rounded-lg overflow-hidden">
          <Image
            src="/images/oasis-bay.jpg"
            alt="Oasis Bay"
            width={800}
            height={500}
            className="w-full h-56 object-cover"
          />
        </div>
      </div>

      {/* Paragraphes */}
      <div className="text-gray-800 space-y-4 text-justify">
        <p>{tr.p1}</p>
        <p>{tr.p2}</p>
        <p>{tr.p3}</p>
      </div>

      {/* Bouton */}
      <div className="text-center mt-10">
        <Link
          href="/investir/candidature"
          className="bg-blue-700 text-white px-6 py-3 rounded hover:bg-blue-800"
        >
          {tr.bouton}
        </Link>
      </div>
    </div>
  )
}
