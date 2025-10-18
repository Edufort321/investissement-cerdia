'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Pagination, Autoplay } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/pagination'

export default function ImmobilierPage() {
  const [lang, setLang] = useState<'fr' | 'en'>('fr')

  const t = {
    fr: {
      titre: '🏡 Projets Locatifs en Acquisition',
      description:
        "Investissement CERDIA concentre ses acquisitions sur des projets locatifs haut de gamme, dans des secteurs à fort potentiel de croissance et de rendement à long terme.",
      secretTitle: '🌴 Secret Garden',
      secretUnit: 'Unité acquise : H212',
      secretDelivery: 'Livraison prévue : Mars 2026',
      secretDesc: 'Projet locatif dans un environnement tropical avec gestion locative centralisée.',
      secretLink: '📂 Consulter le dossier Secret Garden',
      oasisTitle: '🌴 Oasis Bay',
      oasisUnit: 'Unités acquises : A301 et A302',
      oasisDesc: 'Studios gérés par Meliá INNSIDE dans le complexe Cana Bay avec services haut de gamme.',
      oasisLink: '📂 Consulter le dossier Oasis Bay',
      contact: 'Pour toute question sur ces projets ou l’investissement locatif CERDIA, contactez :'
    },
    en: {
      titre: '🏡 Rental Projects in Acquisition',
      description:
        "Investissement CERDIA focuses its acquisitions on high-end rental projects in areas with strong long-term growth and return potential.",
      secretTitle: '🌴 Secret Garden',
      secretUnit: 'Unit acquired: H212',
      secretDelivery: 'Delivery expected: March 2026',
      secretDesc: 'Rental project in a tropical environment with centralized property management.',
      secretLink: '📂 View the Secret Garden file',
      oasisTitle: '🌴 Oasis Bay',
      oasisUnit: 'Units acquired: A301 and A302',
      oasisDesc: 'Studios managed by Meliá INNSIDE in the Cana Bay complex with premium services.',
      oasisLink: '📂 View the Oasis Bay file',
      contact: 'For any question about these projects or CERDIA rental investments, contact:'
    }
  }

  const tr = t[lang]

  return (
    <main className="max-w-7xl mx-auto px-6 py-12">
      {/* Sélecteur de langue */}
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
      <h2 className="text-3xl font-bold text-[#2234B9] mb-2">{tr.titre}</h2>
      <p className="text-gray-700 mb-10 max-w-3xl">{tr.description}</p>

      {/* Projets */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Secret Garden */}
        <div className="bg-white rounded-xl shadow p-6">
          <Swiper
            spaceBetween={10}
            slidesPerView={1}
            pagination={{ clickable: true }}
            autoplay={{ delay: 3000 }}
            modules={[Pagination, Autoplay]}
            className="mb-4 rounded-lg overflow-hidden"
          >
            {[1, 2, 3, 4].map((i) => (
              <SwiperSlide key={i}>
                <Image
                  src={`/images/secret-garden-${i}.jpg`}
                  alt={`Secret Garden ${i}`}
                  width={800}
                  height={500}
                  className="w-full object-cover"
                />
              </SwiperSlide>
            ))}
          </Swiper>
          <h3 className="text-xl font-semibold mb-2">{tr.secretTitle}</h3>
          <ul className="text-sm text-gray-700 mb-2">
            <li>{tr.secretUnit}</li>
            <li>{tr.secretDelivery}</li>
          </ul>
          <p className="mb-4 text-gray-700 text-sm">{tr.secretDesc}</p>
          <a
            href="https://drive.google.com/drive/folders/1gZdOpqLzMXwGsjZjAca4aWiHLic_ahms?usp=sharing"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline font-medium"
          >
            {tr.secretLink}
          </a>
        </div>

        {/* Oasis Bay */}
        <div className="bg-white rounded-xl shadow p-6">
          <Swiper
            spaceBetween={10}
            slidesPerView={1}
            pagination={{ clickable: true }}
            autoplay={{ delay: 3000 }}
            modules={[Pagination, Autoplay]}
            className="mb-4 rounded-lg overflow-hidden"
          >
            {[1, 2, 3, 4].map((i) => (
              <SwiperSlide key={i}>
                <Image
                  src={`/images/oasis-bay-${i}.jpg`}
                  alt={`Oasis Bay ${i}`}
                  width={800}
                  height={500}
                  className="w-full object-cover"
                />
              </SwiperSlide>
            ))}
          </Swiper>
          <h3 className="text-xl font-semibold mb-2">{tr.oasisTitle}</h3>
          <ul className="text-sm text-gray-700 mb-2">
            <li>{tr.oasisUnit}</li>
          </ul>
          <p className="mb-4 text-gray-700 text-sm">{tr.oasisDesc}</p>
          <a
            href="https://drive.google.com/drive/folders/16m6hKxxScNdljVLvq85oZ6HM_I7x8yw-?usp=sharing"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline font-medium"
          >
            {tr.oasisLink}
          </a>
        </div>
      </div>

      {/* Contact */}
      <p className="text-center text-sm text-gray-600 mt-10">
        {tr.contact}{' '}
        <a href="mailto:eric.dufort@cerdia.ai" className="text-blue-600 underline">
          eric.dufort@cerdia.ai
        </a>
      </p>
    </main>
  )
}
