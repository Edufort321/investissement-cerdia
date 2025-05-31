'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'

export default function ImmobilierPage() {
  const [lang, setLang] = useState<'fr' | 'en'>('fr')

  const toggleLang = () => {
    setLang((prev) => (prev === 'fr' ? 'en' : 'fr'))
  }

  return (
    <main className="max-w-7xl mx-auto px-6 py-12">
      {/* Sélecteur de langue */}
      <div className="flex justify-end mb-6">
        <button
          onClick={toggleLang}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded hover:bg-gray-200 text-sm"
        >
          {lang === 'fr' ? (
            <>
              <span role="img" aria-label="US Flag">🇺🇸</span>
              <span>Switch to English</span>
            </>
          ) : (
            <>
              <span role="img" aria-label="Canada Flag">🇨🇦</span>
              <span>Passer en français</span>
            </>
          )}
        </button>
      </div>

      {/* Titre + description */}
      <h2 className="text-3xl font-bold text-[#2234B9] mb-2">
        {lang === 'fr' ? '🏡 Projets Locatifs en Acquisition' : '🏡 Rental Projects in Acquisition'}
      </h2>
      <p className="text-gray-700 mb-10 max-w-3xl">
        {lang === 'fr'
          ? "Investissement CERDIA concentre ses acquisitions sur des projets locatifs haut de gamme, dans des secteurs à fort potentiel de croissance et de rendement à long terme."
          : "Investissement CERDIA focuses its acquisitions on high-end rental projects in areas with strong long-term growth and return potential."}
      </p>

      {/* Cartes projets */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Secret Garden */}
        <div className="bg-white rounded-xl shadow p-6">
          <Image
            src="/images/secret-garden.jpg"
            alt="Secret Garden"
            width={800}
            height={500}
            className="rounded-lg mb-4 w-full object-cover"
          />
          <h3 className="text-xl font-semibold mb-2">🌴 Secret Garden</h3>
          <ul className="text-sm text-gray-700 mb-2">
            <li>{lang === 'fr' ? 'Unité acquise : H212' : 'Unit acquired: H212'}</li>
            <li>{lang === 'fr' ? 'Livraison prévue : Mars 2026' : 'Delivery expected: March 2026'}</li>
          </ul>
          <p className="mb-4 text-gray-700 text-sm">
            {lang === 'fr'
              ? "Projet locatif dans un environnement tropical avec gestion locative centralisée."
              : "Rental project in a tropical environment with centralized property management."}
          </p>
          <Link href="/secret-garden" className="text-blue-600 underline font-medium">
            {lang === 'fr' ? '📂 Consulter le dossier Secret Garden' : '📂 View the Secret Garden file'}
          </Link>
        </div>

        {/* Oasis Bay */}
        <div className="bg-white rounded-xl shadow p-6">
          <Image
            src="/images/oasis-bay.jpg"
            alt="Oasis Bay"
            width={800}
            height={500}
            className="rounded-lg mb-4 w-full object-cover"
          />
          <h3 className="text-xl font-semibold mb-2">🌴 Oasis Bay</h3>
          <ul className="text-sm text-gray-700 mb-2">
            <li>{lang === 'fr' ? 'Unités acquises : A301 et A302' : 'Units acquired: A301 and A302'}</li>
          </ul>
          <p className="mb-4 text-gray-700 text-sm">
            {lang === 'fr'
              ? "Studios gérés par Meliá INNSIDE dans le complexe Cana Bay avec services haut de gamme."
              : "Studios managed by Meliá INNSIDE in the Cana Bay complex with premium services."}
          </p>
          <Link href="/oasis-bay" className="text-blue-600 underline font-medium">
            {lang === 'fr' ? '📂 Consulter le dossier Oasis Bay' : '📂 View the Oasis Bay file'}
          </Link>
        </div>
      </div>

      {/* Note contact */}
      <p className="text-center text-sm text-gray-600 mt-10">
        {lang === 'fr'
          ? "Pour toute question sur ces projets ou l’investissement locatif CERDIA, contactez :"
          : "For any question about these projects or CERDIA rental investments, contact:"}{' '}
        <a href="mailto:eric.dufort@cerdia.ai" className="text-blue-600 underline">
          eric.dufort@cerdia.ai
        </a>
      </p>
    </main>
  )
}
