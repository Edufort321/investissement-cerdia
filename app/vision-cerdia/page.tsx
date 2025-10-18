'use client'

import { useState } from 'react'

export default function VisionCerdia() {
  const [lang, setLang] = useState<'fr' | 'en'>('fr')

  const content = {
    fr: {
      title: "Vision stratégique CERDIA – 2025 à 2045",
      intro: "Notre vision est simple : bâtir un portefeuille immobilier international intelligent, autofinancé, et hautement rentable, propulsé par une IA propriétaire.",
      sections: [
        {
          heading: "📍 Situation actuelle (mai 2025)",
          text: "Trois unités de qualité touristique déjà sécurisées en République dominicaine (Oasis Bay et Secret Garden), pour une valeur totale de 700 000 $ CAD. Aucun financement bancaire – 100 % capital injecté par les fondateurs. Revenus locatifs nets attendus : 80 000 $ CAD/an."
        },
        {
          heading: "🚀 Objectif 2045",
          text: "Atteindre une capitalisation nette entre 12 et 18 millions CAD, grâce à 15 à 25 unités locatives détenues à 100 %, générant un revenu locatif net annuel de plus de 500 000 $ CAD. Aucune dette toxique. Rotation intelligente des actifs. IA autonome (CERDIAIA) à l’horizon 2030."
        },
        {
          heading: "🧠 Intelligence Artificielle",
          text: "CERDIAIA sera intégrée à chaque étape : tarification, gestion, entretien, rapports automatisés, alertes marché, signature de contrats, tableaux IA présidentiels. Objectif : IA autonome complète dès 2030."
        },
        {
          heading: "🛍️ Commerce électronique",
          text: "Dès 2025, lancement de CERDIA Commerce inc. – produits de voyage professionnels (Amazon FBA). Tous les bénéfices sont réinjectés dans le portefeuille immobilier, assurant une double source de croissance."
        },
        {
          heading: "🪙 Jeton Allcoin intelligent",
          text: "Jeton numérique hybride avec 3 fonctions : dividendes intelligents, utilité dans l’écosystème (accès privilégié, location, services), et droit de conversion en actions selon des critères définis. Objectif : accès contrôlé à la propriété intelligente."
        },
        {
          heading: "📈 Fiscalité optimisée",
          text: "Sociétés déclarées dans chaque juridiction (Québec, RD, Mexique). Déclarations légales, utilisation de crédits d’impôt pour éviter la double imposition. Réinvestissement structuré via conventions intercompagnies."
        },
        {
          heading: "📊 Projections financières (résumé)",
          text: "De 2025 à 2045 : croissance stable, disciplinée. 10 à 15 unités d’ici 2035. Objectif net : 250 000 $ à 650 000 $ de revenu locatif net annuel. Option de sortie : revente globale à un fonds privé ou transformation en société de rendement."
        }
      ],
      footer: "Cette vision est un plan réel et discipliné, conçu pour bâtir une richesse durable, avec un contrôle complet par la direction CERDIA."
    },
    en: {
      title: "CERDIA Strategic Vision – 2025 to 2045",
      intro: "Our vision is simple: build a self-financed, high-performance international real estate portfolio powered by proprietary AI.",
      sections: [
        {
          heading: "📍 Current Status (May 2025)",
          text: "Three tourism-grade units already secured in the Dominican Republic (Oasis Bay and Secret Garden), worth $700,000 CAD. Fully founder-financed. Net rental revenues expected: $80,000 CAD/year."
        },
        {
          heading: "🚀 2045 Objective",
          text: "Reach a net capitalization of $12–18M CAD, with 15–25 fully owned rental units generating $500,000+ CAD in annual net income. No toxic debt. Smart asset rotation. Fully autonomous AI (CERDIAIA) by 2030."
        },
        {
          heading: "🧠 Artificial Intelligence",
          text: "CERDIAIA will power all management, pricing, maintenance, reporting, contract automation, and real-time market alerts. Target: full autonomy by 2030."
        },
        {
          heading: "🛍️ eCommerce Strategy",
          text: "CERDIA Commerce inc. launches in 2025 with professional travel gear (Amazon FBA). All net profits are reinvested into real estate to ensure dual growth."
        },
        {
          heading: "🪙 Allcoin Smart Token",
          text: "A hybrid digital token offering 3 features: smart dividends, ecosystem utility (privileged access, rentals, services), and equity conversion rights. Goal: controlled access to smart ownership."
        },
        {
          heading: "📈 Tax Optimization",
          text: "Legally registered companies in each jurisdiction (Quebec, DR, Mexico). Income declared locally with credit optimization to prevent double taxation. Structured reinvestment via intercompany agreements."
        },
        {
          heading: "📊 Financial Projections (Summary)",
          text: "From 2025 to 2045: disciplined growth. 10 to 15 units by 2035. Net target: $250,000 to $650,000 CAD annually. Exit option: full sale to a private fund or transformation into a yield company."
        }
      ],
      footer: "This vision is real, structured, and designed for long-term wealth with full strategic control by CERDIA leadership."
    }
  }

  const tr = content[lang]

  return (
    <main className="min-h-screen bg-white px-6 py-12 max-w-4xl mx-auto">
      {/* Lang selector */}
      <div className="flex justify-end mb-4">
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value as 'fr' | 'en')}
          className="border px-3 py-1 rounded-md shadow text-sm"
        >
          <option value="fr">🇫🇷 Français</option>
          <option value="en">🇬🇧 English</option>
        </select>
      </div>

      {/* Title */}
      <h1 className="text-4xl font-bold text-[#0F1E47] mb-6 text-center">
        {tr.title}
      </h1>

      {/* Intro */}
      <p className="text-lg text-gray-800 mb-8 text-center">
        {tr.intro}
      </p>

      {/* Sections */}
      {tr.sections.map((section, idx) => (
        <div key={idx} className="mb-8">
          <h2 className="text-2xl font-semibold text-[#0F1E47] mb-2">{section.heading}</h2>
          <p className="text-gray-700">{section.text}</p>
        </div>
      ))}

      {/* Footer */}
      <div className="mt-12 border-t pt-6 text-center text-sm text-gray-500">
        {tr.footer}
      </div>
    </main>
  )
}
