'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useLanguage } from '@/contexts/LanguageContext'

export default function Home() {
  const { language } = useLanguage()

  const t = {
    fr: {
      title: "Une vision d'envergure alliant IA, immobilier, formation et luxe locatif",
      subtitle: "L'intelligence au service de l'investissement. Rejoignez un réseau haut de gamme et faites croître votre capital stratégiquement.",
      button: "Devenir investisseur",
      footer: "Tous droits réservés.",
      powered: "Version IA propulsée par OpenAI – Propulsé depuis le Québec 🇨🇦",
      visionTitle: "Notre vision stratégique 2025–2045",
      visionDesc: "CERDIA vise la construction d'un portefeuille immobilier 100 % autofinancé, sans dette bancaire, optimisé par intelligence artificielle. Trois unités déjà sécurisées en République dominicaine. Objectif d'ici 2045 : 15 à 25 propriétés, rendement net annuel > 500 000 $, valeur nette projetée : 12 à 18 M$. Tous les profits du commerce électronique CERDIA Commerce sont réinjectés dans l'immobilier. Un jeton Allcoin intelligent permettra un accès privilégié à l'écosystème, incluant dividendes, utilité et conversion en actions.",
      visionCTA: "En savoir plus sur la vision",
      // Nouvelles traductions
      immobilierTitle: "Immobilier d'exception",
      immobilierDesc: "Accédez à des projets ciblés dans les Caraïbes, États-Unis, Canada et ailleurs - optimisés pour la rentabilité durable",
      immobilierCTA: "Découvrir nos projets",
      locationTitle: "Location haut de gamme",
      locationDesc: "Une plateforme locative CERDIA avec conciergerie VIP et rendement optimisé.",
      locationCTA: "Explorer nos locations",
      voyageTitle: "Mon Voyage",
      voyageDesc: "Planifiez votre voyage parfait avec l'IA. Timeline 24/7, gestion de budget, suggestions intelligentes et mode partage.",
      voyageCTA: "Planifier mon voyage",
      commerceTitle: "Commerce CERDIA",
      commerceDesc: "CERDIA Commerce réinvestit ses profits directement dans l'immobilier. Boutique en ligne, Amazon FBA et stratégies e-commerce optimisées par intelligence artificielle — un moteur de croissance au service du portefeuille.",
      commerceCTA: "Découvrir CERDIA Commerce"
    },
    en: {
      title: "A bold vision combining AI, real estate, education and luxury rentals",
      subtitle: "Intelligence in the service of investment. Join a high-end network and grow your capital strategically.",
      button: "Become an investor",
      footer: "All rights reserved.",
      powered: "AI version powered by OpenAI – Operated from Quebec 🇨🇦",
      visionTitle: "Our Strategic Vision 2025–2045",
      visionDesc: "CERDIA is building a fully self-financed real estate portfolio, debt-free, powered by artificial intelligence. Three units already secured in the Dominican Republic. By 2045: 15 to 25 premium properties, annual net revenue > $500,000, projected value: $12–18M. All profits from CERDIA Commerce (FBA) are reinvested into real estate. The Allcoin token offers privileged access, smart dividends, ecosystem utility, and convertible rights.",
      visionCTA: "Discover the full vision",
      // New translations
      immobilierTitle: "Exceptional Real Estate",
      immobilierDesc: "Access targeted projects in the Caribbean, United States, Canada and beyond - optimized for sustainable profitability",
      immobilierCTA: "Discover our projects",
      locationTitle: "Premium Rentals",
      locationDesc: "A CERDIA rental platform with VIP concierge service and optimized returns.",
      locationCTA: "Explore our rentals",
      voyageTitle: "My Journey",
      voyageDesc: "Plan your perfect trip with AI. 24/7 timeline, budget management, smart suggestions and share mode.",
      voyageCTA: "Plan my trip",
      commerceTitle: "CERDIA Commerce",
      commerceDesc: "CERDIA Commerce reinvests all its profits directly into real estate. Online store, Amazon FBA and AI-optimized e-commerce strategies — a growth engine fueling the portfolio.",
      commerceCTA: "Discover CERDIA Commerce"
    }
  }

  const tr = t[language]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-20 transition-colors duration-300">
        {/* HERO SECTION */}
        <section className="max-w-6xl mx-auto px-6 py-16 text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-gray-100 font-serif mb-6 leading-tight">
            {tr.title}
          </h1>
          <p className="text-lg text-gray-700 dark:text-gray-300 max-w-3xl mx-auto mb-8">
            {tr.subtitle}
          </p>
          <Link href="/investir">
            <button className="bg-[#5e5e5e] dark:bg-gray-700 text-white px-6 py-3 rounded-full text-lg hover:bg-[#3e3e3e] dark:hover:bg-gray-600 transition">
              {tr.button}
            </button>
          </Link>
        </section>

        {/* VISION STRATÉGIQUE SECTION */}
        <section className="bg-white dark:bg-gray-800 py-12 px-6 text-center max-w-4xl mx-auto rounded-2xl shadow-md">
          <h2 className="text-3xl font-semibold text-gray-900 dark:text-gray-100 mb-4">{tr.visionTitle}</h2>
          <p className="text-gray-700 dark:text-gray-300 text-lg mb-6">
            {tr.visionDesc}
          </p>
          <Link href="/vision-cerdia">
            <button className="text-gray-900 dark:text-gray-100 underline hover:text-gray-700 dark:hover:text-gray-300 font-medium text-sm">
              {tr.visionCTA} →
            </button>
          </Link>
        </section>

        {/* IMMOBILIER SECTION - Image + Text */}
        <section className="max-w-7xl mx-auto px-6 py-16">
          <Link href="/immobilier" className="block group">
            <div className="grid md:grid-cols-2 gap-8 items-center bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-2xl transition-shadow duration-300">
              {/* Image */}
              <div className="relative h-96 sm:h-[500px] md:h-full md:min-h-[450px] overflow-hidden">
                <Image
                  src="/cerdia-slide-immobilier.png"
                  alt="Immobilier"
                  fill
                  className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
                  priority
                />
              </div>
              {/* Texte */}
              <div className="p-8 md:p-12">
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4 font-serif">
                  {tr.immobilierTitle}
                </h2>
                <p className="text-lg text-gray-700 dark:text-gray-300 mb-6 leading-relaxed">
                  {tr.immobilierDesc}
                </p>
                <span className="inline-flex items-center gap-2 text-gray-700 dark:text-gray-300 font-semibold group-hover:gap-3 transition-all">
                  {tr.immobilierCTA}
                  <span className="text-xl">→</span>
                </span>
              </div>
            </div>
          </Link>
        </section>

        {/* LOCATION SECTION - Text + Image (inversé) */}
        <section className="max-w-7xl mx-auto px-6 py-16">
          <Link href="/location" className="block group">
            <div className="grid md:grid-cols-2 gap-8 items-center bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-2xl transition-shadow duration-300">
              {/* Texte (à gauche sur desktop) */}
              <div className="p-8 md:p-12 order-2 md:order-1">
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4 font-serif">
                  {tr.locationTitle}
                </h2>
                <p className="text-lg text-gray-700 dark:text-gray-300 mb-6 leading-relaxed">
                  {tr.locationDesc}
                </p>
                <span className="inline-flex items-center gap-2 text-gray-700 dark:text-gray-300 font-semibold group-hover:gap-3 transition-all">
                  {tr.locationCTA}
                  <span className="text-xl">→</span>
                </span>
              </div>
              {/* Image (à droite sur desktop) */}
              <div className="relative h-96 sm:h-[500px] md:h-full md:min-h-[450px] overflow-hidden order-1 md:order-2">
                <Image
                  src="/cerdia-slide-location.png"
                  alt="Location"
                  fill
                  className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
                />
              </div>
            </div>
          </Link>
        </section>

        {/* MON VOYAGE SECTION - Image + Text */}
        <section className="max-w-7xl mx-auto px-6 py-16">
          <Link href="/mon-voyage" className="block group">
            <div className="grid md:grid-cols-2 gap-8 items-center bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-2xl transition-shadow duration-300">
              {/* Image */}
              <div className="relative h-96 sm:h-[500px] md:h-full md:min-h-[450px] overflow-hidden">
                <Image
                  src="/cerdia-slide-voyage.png"
                  alt="Mon Voyage"
                  fill
                  className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              {/* Texte */}
              <div className="p-8 md:p-12">
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4 font-serif">
                  {tr.voyageTitle}
                </h2>
                <p className="text-lg text-gray-700 dark:text-gray-300 mb-6 leading-relaxed">
                  {tr.voyageDesc}
                </p>
                <span className="inline-flex items-center gap-2 text-gray-700 dark:text-gray-300 font-semibold group-hover:gap-3 transition-all">
                  {tr.voyageCTA}
                  <span className="text-xl">→</span>
                </span>
              </div>
            </div>
          </Link>
        </section>

        {/* COMMERCE CERDIA SECTION - Image + Text */}
        <section className="max-w-7xl mx-auto px-6 py-16">
          <Link href="/commerce" className="block group">
            <div className="grid md:grid-cols-2 gap-8 items-center bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-2xl transition-shadow duration-300">
              {/* Texte - à gauche pour alterner avec Mon Voyage */}
              <div className="p-8 md:p-12 order-2 md:order-1">
                <span className="inline-block bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-xs font-semibold px-3 py-1 rounded-full mb-4 uppercase tracking-wider">
                  E-Commerce & Amazon FBA
                </span>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4 font-serif">
                  {tr.commerceTitle}
                </h2>
                <p className="text-lg text-gray-700 dark:text-gray-300 mb-6 leading-relaxed">
                  {tr.commerceDesc}
                </p>
                <span className="inline-flex items-center gap-2 text-orange-700 dark:text-orange-400 font-semibold group-hover:gap-3 transition-all">
                  {tr.commerceCTA}
                  <span className="text-xl">→</span>
                </span>
              </div>
              {/* Image */}
              <div className="relative h-96 sm:h-[500px] md:h-full md:min-h-[450px] overflow-hidden order-1 md:order-2">
                <Image
                  src="/cerdia-slide-ecommerce.png"
                  alt="Commerce CERDIA"
                  fill
                  className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
                />
              </div>
            </div>
          </Link>
        </section>

        {/* FOOTER */}
        <footer className="bg-gray-900 dark:bg-black text-white py-6 mt-16">
          <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center text-sm text-center gap-2 md:gap-0">
            <p>&copy; 2025 CERDIA. {tr.footer}</p>
            <p>{tr.powered}</p>
          </div>
        </footer>
    </div>
  )
}
