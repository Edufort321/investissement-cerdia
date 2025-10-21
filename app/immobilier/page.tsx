'use client'

import Image from 'next/image'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Pagination, Navigation } from 'swiper/modules'
import { useLanguage } from '@/contexts/LanguageContext'
import 'swiper/css'
import 'swiper/css/pagination'
import 'swiper/css/navigation'

export default function ImmobilierPage() {
  const { language } = useLanguage()

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

  const tr = t[language]

  return (
    <main className="max-w-7xl mx-auto px-6 pt-32 pb-12">
      {/* Header Section */}
      <div className="mb-12">
        <h1 className="text-4xl md:text-5xl font-bold text-[#2234B9] mb-4">{tr.titre}</h1>
        <p className="text-lg text-gray-600 max-w-4xl leading-relaxed">{tr.description}</p>
      </div>

      {/* Projets */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Secret Garden */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-shadow duration-300">
          <Swiper
            spaceBetween={0}
            slidesPerView={1}
            pagination={{ clickable: true }}
            navigation={true}
            modules={[Pagination, Navigation]}
            className="h-64 md:h-80"
          >
            {[1, 2, 3, 4].map((i) => (
              <SwiperSlide key={i}>
                <Image
                  src={`/images/secret-garden-${i}.jpg`}
                  alt={`Secret Garden ${i}`}
                  width={800}
                  height={500}
                  className="w-full h-full object-cover"
                />
              </SwiperSlide>
            ))}
          </Swiper>

          <div className="p-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">{tr.secretTitle}</h3>

            {/* Badges Info */}
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                {tr.secretUnit}
              </span>
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                {tr.secretDelivery}
              </span>
            </div>

            <p className="text-gray-600 mb-6 leading-relaxed">{tr.secretDesc}</p>

            {/* Google Drive Preview */}
            <div className="mb-4">
              <iframe
                src="https://drive.google.com/embeddedfolderview?id=1gZdOpqLzMXwGsjZjAca4aWiHLic_ahms#grid"
                className="w-full h-64 rounded-lg border border-gray-200"
                allow="autoplay"
              ></iframe>
            </div>

            <a
              href="https://drive.google.com/drive/folders/1gZdOpqLzMXwGsjZjAca4aWiHLic_ahms?usp=sharing"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              {tr.secretLink}
              <span className="text-lg">→</span>
            </a>
          </div>
        </div>

        {/* Oasis Bay */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-shadow duration-300">
          <Swiper
            spaceBetween={0}
            slidesPerView={1}
            pagination={{ clickable: true }}
            navigation={true}
            modules={[Pagination, Navigation]}
            className="h-64 md:h-80"
          >
            {[1, 2, 3, 4].map((i) => (
              <SwiperSlide key={i}>
                <Image
                  src={`/images/oasis-bay-${i}.jpg`}
                  alt={`Oasis Bay ${i}`}
                  width={800}
                  height={500}
                  className="w-full h-full object-cover"
                />
              </SwiperSlide>
            ))}
          </Swiper>

          <div className="p-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">{tr.oasisTitle}</h3>

            {/* Badges Info */}
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                {tr.oasisUnit}
              </span>
            </div>

            <p className="text-gray-600 mb-6 leading-relaxed">{tr.oasisDesc}</p>

            {/* Google Drive Preview */}
            <div className="mb-4">
              <iframe
                src="https://drive.google.com/embeddedfolderview?id=16m6hKxxScNdljVLvq85oZ6HM_I7x8yw-#grid"
                className="w-full h-64 rounded-lg border border-gray-200"
                allow="autoplay"
              ></iframe>
            </div>

            <a
              href="https://drive.google.com/drive/folders/16m6hKxxScNdljVLvq85oZ6HM_I7x8yw-?usp=sharing"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              {tr.oasisLink}
              <span className="text-lg">→</span>
            </a>
          </div>
        </div>
      </div>

      {/* Contact Section */}
      <div className="mt-16 bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-8 text-center">
        <h3 className="text-2xl font-bold text-gray-900 mb-3">Besoin d'informations?</h3>
        <p className="text-gray-600 mb-4">{tr.contact}</p>
        <a
          href="mailto:eric.dufort@cerdia.ai"
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors font-medium"
        >
          <span>eric.dufort@cerdia.ai</span>
          <span className="text-lg">✉️</span>
        </a>
      </div>
    </main>
  )
}
