'use client'

import ImageCarousel from '@/components/ImageCarousel'
import Link from 'next/link'

export default function ProjetsLocatifsPage() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <h1 className="text-4xl font-bold text-center text-blue-800 mb-8">
        🏘️ Projets Locatifs en Acquisition
      </h1>

      <p className="text-lg text-center text-gray-700 mb-12">
        Investissement CERDIA concentre ses acquisitions sur des projets locatifs haut de gamme, dans des secteurs à fort potentiel de croissance et de rendement à long terme.
      </p>

      <div className="grid md:grid-cols-2 gap-10">
        {/* Secret Garden */}
        <div className="bg-white shadow-md rounded-xl overflow-hidden border">
          <ImageCarousel
            images={[
              '/images/secret-garden-1.jpg',
              '/images/secret-garden-2.jpg',
              '/images/secret-garden-3.jpg',
              '/images/secret-garden-4.jpg'
            ]}
          />
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">🌴 Secret Garden</h2>
            <p className="text-gray-700 mb-4">
              Unité acquise : H212<br />
              Livraison prévue : Mars 2026<br />
              Projet locatif dans un environnement tropical avec gestion locative centralisée.
            </p>
            <Link
              href="https://drive.google.com/drive/folders/1Rp5nTtJyBLeztxnYSnZdS29PNCt34P78?usp=sharing"
              target="_blank"
              className="text-blue-700 underline font-semibold"
            >
              📂 Consulter le dossier Secret Garden
            </Link>
          </div>
        </div>

        {/* Oasis Bay */}
        <div className="bg-white shadow-md rounded-xl overflow-hidden border">
          <ImageCarousel
            images={[
              '/images/oasis-bay-1.jpg',
              '/images/oasis-bay-2.jpg',
              '/images/oasis-bay-3.jpg',
              '/images/oasis-bay-4.jpg'
            ]}
          />
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">🏝️ Oasis Bay</h2>
            <p className="text-gray-700 mb-4">
              Unités acquises : A301 et A302<br />
              Studios gérés par Meliá INNSiDE dans le complexe Cana Bay avec services haut de gamme.
            </p>
            <Link
              href="https://drive.google.com/drive/folders/16m6hKxxScNdljVLvq85oZ6HM_I7x8yw-?usp=sharing"
              target="_blank"
              className="text-blue-700 underline font-semibold"
            >
              📂 Consulter le dossier Oasis Bay
            </Link>
          </div>
        </div>
      </div>

      <p className="text-sm text-center text-gray-500 italic mt-10">
        Pour toute question sur ces projets ou l’investissement locatif CERDIA, contactez :{' '}
        <a href="mailto:eric.dufort@cerdia.ai" className="underline text-blue-600">
          eric.dufort@cerdia.ai
        </a>
      </p>
    </div>
  )
}
