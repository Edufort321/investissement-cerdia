'use client'

import Image from 'next/image'
import Link from 'next/link'

export default function DevenirInvestisseurPage() {
  return (
    <div className="max-w-6xl mx-auto px-6 pt-24 pb-16 text-gray-800">
      <h1 className="text-4xl font-bold text-center text-blue-900 mb-6 flex items-center justify-center gap-2">
        <span>💼</span> Rejoindre CERDIA
      </h1>

      <p className="text-center text-lg mb-8">
        CERDIA ouvre ses portes à une sélection restreinte d’investisseurs. Notre mission : bâtir un portefeuille immobilier locatif international, optimisé par l’intelligence artificielle, avec une rentabilité durable à long terme — sans dette bancaire.
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
          Fondée en 2025, CERDIA inc. est une société québécoise qui repose sur une stratégie progressive, disciplinée et autofinancée. Le capital déjà en place permet d'acquérir plusieurs unités locatives dès 2025 dans des projets touristiques d’envergure, comme <strong>Secret Garden</strong> et <strong>Oasis Bay</strong> en République dominicaine.
        </p>

        <p>
          L’expansion se fera par phases jusqu’en 2045, avec une approche prudente et structurée — d’abord en Amérique latine et au Québec, puis avec une diversification stratégique. Tous les profits seront systématiquement réinjectés dans le portefeuille, en combinant l’immobilier, le commerce électronique et la technologie IA.
        </p>

        <p>
          La plateforme IA propriétaire <strong>CERDIAIA</strong> assurera la gestion locative, la comptabilité, les tableaux de bord et les projections d’investissement en temps réel, permettant une croissance intelligente et un contrôle optimal à chaque étape.
        </p>

        <p>
          Notre vision est claire : bâtir un portefeuille d’actifs rentables, sans dettes, tout en préservant le contrôle stratégique à long terme. Un équilibre entre rendement, sécurité et innovation.
        </p>
      </div>

      <div className="mt-10 p-6 border border-gray-300 rounded-lg bg-gray-50 shadow-sm text-sm text-gray-700">
        <p className="mb-2">
          ✅ <strong>Conditions pour devenir investisseur CERDIA :</strong>
        </p>
        <ul className="list-disc ml-6 space-y-1">
          <li>Entrevue confidentielle avec un des fondateurs</li>
          <li>Montant d'entrée : <strong>25 000 $ minimum</strong></li>
          <li>Engagement sur une période minimale de <strong>5 ans</strong></li>
          <li>Réinvestissement total durant les premières phases (aucun retrait anticipé)</li>
          <li>Alignement avec notre stratégie à long terme</li>
        </ul>
      </div>

      <p className="mt-8 text-center italic text-sm text-gray-500">
        Chaque investisseur admis aura accès à des unités CERDIA sélectionnées, à un suivi personnalisé, à un tableau de bord IA sécurisé, et à une stratégie de croissance durable.
      </p>

      <div className="text-center mt-10">
        <Link href="/investir">
          <button className="bg-blue-700 hover:bg-blue-800 text-white text-lg px-6 py-3 rounded-full font-semibold shadow transition">
            Devenir investisseur
          </button>
        </Link>
      </div>
    </div>
  )
}

