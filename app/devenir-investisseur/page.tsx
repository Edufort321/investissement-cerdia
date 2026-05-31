'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useLanguage } from '@/contexts/LanguageContext'
import BackToHome from '@/components/BackToHome'

export default function DevenirInvestisseurPage() {
  const { language } = useLanguage()
  const fr = language === 'fr'

  return (
    <div className="max-w-6xl mx-auto px-6 pt-24 pb-16 text-gray-800">
      <BackToHome className="mb-6" />
      <h1 className="text-4xl font-bold text-center text-blue-900 mb-6 flex items-center justify-center gap-2">
        <span>💼</span> {fr ? 'Rejoindre CERDIA' : 'Join CERDIA'}
      </h1>

      <p className="text-center text-lg mb-8">
        {fr
          ? "CERDIA ouvre ses portes à une sélection restreinte d'investisseurs. Notre mission : bâtir un portefeuille immobilier locatif international, optimisé par l'intelligence artificielle, avec une rentabilité durable à long terme — sans dette bancaire."
          : "CERDIA opens its doors to a select group of investors. Our mission: to build an international rental real estate portfolio, optimized by artificial intelligence, with sustainable long-term returns — debt-free."}
      </p>

      <div className="grid md:grid-cols-2 gap-6 mb-10">
        <Image
          src="/images/secret-garden.jpg"
          alt="Secret Garden"
          width={800}
          height={500}
          className="rounded-xl shadow-md w-full h-auto object-cover"
        />
        <Image
          src="/images/oasis-bay.jpg"
          alt="Oasis Bay"
          width={800}
          height={500}
          className="rounded-xl shadow-md w-full h-auto object-cover"
        />
      </div>

      <div className="text-base space-y-5 leading-relaxed">
        <p>
          {fr
            ? <>Fondée en 2025, CERDIA inc. est une société québécoise qui repose sur une stratégie progressive, disciplinée et autofinancée. Le capital déjà en place permet d&apos;acquérir plusieurs unités locatives dès 2025 dans des projets touristiques d&apos;envergure, comme <strong>Secret Garden</strong> et <strong>Oasis Bay</strong> en République dominicaine.</>
            : <>Founded in 2025, CERDIA inc. is a Quebec company built on a progressive, disciplined, and self-funded strategy. Capital already in place enables the acquisition of multiple rental units as early as 2025 in large-scale tourism projects, such as <strong>Secret Garden</strong> and <strong>Oasis Bay</strong> in the Dominican Republic.</>}
        </p>

        <p>
          {fr
            ? "L'expansion se fera par phases jusqu'en 2045, avec une approche prudente et structurée — d'abord en Amérique latine et au Québec, puis avec une diversification stratégique. Tous les profits seront systématiquement réinjectés dans le portefeuille, en combinant l'immobilier, le commerce électronique et la technologie IA."
            : "Expansion will happen in phases through 2045, with a cautious and structured approach — first in Latin America and Quebec, then with strategic diversification. All profits will be systematically reinvested into the portfolio, combining real estate, e-commerce, and AI technology."}
        </p>

        <p>
          {fr
            ? <>La plateforme IA propriétaire <strong>CERDIAIA</strong> assurera la gestion locative, la comptabilité, les tableaux de bord et les projections d&apos;investissement en temps réel, permettant une croissance intelligente et un contrôle optimal à chaque étape.</>
            : <>The proprietary AI platform <strong>CERDIAIA</strong> will handle rental management, accounting, dashboards, and real-time investment projections, enabling smart growth and optimal control at every step.</>}
        </p>

        <p>
          {fr
            ? "Notre vision est claire : bâtir un portefeuille d'actifs rentables, sans dettes, tout en préservant le contrôle stratégique à long terme. Un équilibre entre rendement, sécurité et innovation."
            : "Our vision is clear: build a portfolio of profitable assets, debt-free, while preserving long-term strategic control. A balance between returns, security, and innovation."}
        </p>
      </div>

      <div className="mt-10 p-6 border border-gray-300 rounded-lg bg-gray-50 shadow-sm text-sm text-gray-700">
        <p className="mb-2">
          ✅ <strong>{fr ? 'Conditions pour devenir investisseur CERDIA :' : 'Requirements to become a CERDIA investor:'}</strong>
        </p>
        <ul className="list-disc ml-6 space-y-1">
          <li>{fr ? 'Entrevue confidentielle avec un des fondateurs' : 'Confidential interview with one of the founders'}</li>
          <li>
            {fr
              ? <>Montant d&apos;entrée : <strong>25 000 $ minimum</strong></>
              : <>Minimum investment: <strong>$25,000</strong></>}
          </li>
          <li>
            {fr
              ? <>Engagement sur une période minimale de <strong>5 ans</strong></>
              : <>Commitment for a minimum period of <strong>5 years</strong></>}
          </li>
          <li>{fr ? 'Réinvestissement total durant les premières phases (aucun retrait anticipé)' : 'Full reinvestment during the initial phases (no early withdrawals)'}</li>
          <li>{fr ? 'Alignement avec notre stratégie à long terme' : 'Alignment with our long-term strategy'}</li>
        </ul>
      </div>

      <p className="mt-8 text-center italic text-sm text-gray-500">
        {fr
          ? "Chaque investisseur admis aura accès à des unités CERDIA sélectionnées, à un suivi personnalisé, à un tableau de bord IA sécurisé, et à une stratégie de croissance durable."
          : "Each admitted investor will have access to selected CERDIA units, personalized follow-up, a secure AI dashboard, and a sustainable growth strategy."}
      </p>

      <div className="text-center mt-10">
        <Link href="/investir">
          <button className="bg-blue-700 hover:bg-blue-800 text-white text-lg px-6 py-3 rounded-full font-semibold shadow transition">
            {fr ? 'Devenir investisseur' : 'Become an investor'}
          </button>
        </Link>
      </div>
    </div>
  )
}
