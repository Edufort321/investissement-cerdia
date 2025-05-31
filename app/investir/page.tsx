'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'

export default function PageInvestir() {
  const [lang, setLang] = useState<'fr' | 'en'>('fr')

  const toggleLang = () => {
    setLang((prev) => (prev === 'fr' ? 'en' : 'fr'))
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      {/* Langue */}
      <div className="flex justify-end mb-6">
        <button
          onClick={toggleLang}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded hover:bg-gray-200 text-sm"
        >
          {lang === 'fr' ? (
            <>
              <span role="img" aria-label="US">🇺🇸</span> <span>Switch to English</span>
            </>
          ) : (
            <>
              <span role="img" aria-label="CA">🇨🇦</span> <span>Passer en français</span>
            </>
          )}
        </button>
      </div>

      {/* Titre */}
      <h1 className="text-3xl md:text-4xl font-bold text-center text-blue-900 mb-4">
        <span role="img" aria-label="dossier">💼</span>{' '}
        {lang === 'fr' ? "Rejoindre l’investissement CERDIA" : "Join the CERDIA Investment Program"}
      </h1>

      {/* Intro */}
      <p className="text-center text-gray-700 mb-8">
        {lang === 'fr'
          ? "Investissement CERDIA ouvre ses portes à une sélection restreinte d’investisseurs. Notre mission : bâtir un portefeuille immobilier locatif international, optimisé par l’intelligence artificielle, avec une rentabilité durable à long terme."
          : "Investissement CERDIA is opening its doors to a selective group of investors. Our mission: to build an international rental real estate portfolio powered by AI, with sustainable long-term returns."}
      </p>

      {/* Images */}
      <div className="grid md:grid-cols-2 gap-8 mb-10">
        <div className="border rounded-lg overflow-hidden">
          <Image src="/images/secret-garden.jpg" alt="Secret Garden" width={800} height={500} className="w-full h-56 object-cover" />
        </div>
        <div className="border rounded-lg overflow-hidden">
          <Image src="/images/oasis-bay.jpg" alt="Oasis Bay" width={800} height={500} className="w-full h-56 object-cover" />
        </div>
      </div>

      {/* Texte d'information */}
      <div className="text-gray-800 space-y-4 text-justify">
        {lang === 'fr' ? (
          <>
            <p>
              L’entrée dans notre programme d’investissement est conditionnelle à une entrevue avec l’un des fondateurs. Seuls les candidats alignés avec notre vision stratégique et notre rigueur à long terme seront invités à participer.
            </p>
            <p>
              L’investissement minimum est de <strong>25 000 $</strong>, avec un engagement de <strong>5 ans minimum</strong>. Aucun frais de retrait anticipé ne sera permis. Notre approche est conçue pour maximiser la valeur à long terme et la stabilité du capital.
            </p>
            <p>
              Chaque investisseur admis bénéficiera d’un accès privilégié aux unités CERDIA, d’un suivi personnalisé, et d’un partage stratégique de la croissance.
            </p>
          </>
        ) : (
          <>
            <p>
              Entry into our investment program is subject to an interview with one of the founders. Only candidates aligned with our strategic vision and long-term discipline will be invited to participate.
            </p>
            <p>
              The minimum investment is <strong>$25,000</strong>, with a minimum commitment of <strong>5 years</strong>. Early withdrawals are not permitted. Our approach is designed to maximize long-term value and capital stability.
            </p>
            <p>
              Approved investors will benefit from privileged access to CERDIA units, personalized support, and strategic growth sharing.
            </p>
          </>
        )}
      </div>

      {/* Bouton */}
      <div className="text-center mt-10">
        <Link
          href="/investir/candidature"
          className="bg-blue-700 text-white px-6 py-3 rounded hover:bg-blue-800"
        >
          {lang === 'fr' ? "Devenir investisseur" : "Become an investor"}
        </Link>
      </div>
    </div>
  )
}
