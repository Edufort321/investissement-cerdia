'use client'

import { useState } from 'react'

export default function DevenirInvestisseur() {
  const [submitted, setSubmitted] = useState(false)

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 text-gray-800">
      <h1 className="text-4xl font-bold text-center text-blue-900 mb-8">
        ✨ Candidature pour devenir investisseur CERDIA
      </h1>

      <p className="text-lg mb-8 leading-relaxed text-justify">
        Investissement CERDIA inc. est une société visionnaire spécialisée dans
        l’immobilier locatif haut de gamme à l’international, avec un accent sur la
        rentabilité durable et la croissance à long terme. En tant qu’investisseur,
        vous ferez partie d’un réseau stratégique, axé sur des acquisitions ciblées au
        Canada, au Mexique, en République dominicaine et ailleurs. Chaque projet est
        rigoureusement analysé par notre IA afin de maximiser le rendement et réduire
        les risques. L’entrée dans le capital se fait sur sélection uniquement, après une
        entrevue avec un des fondateurs. Le montant minimal d’investissement est de
        25 000 $, avec un engagement ferme de 5 ans (aucun retrait possible pendant
        cette période). Rejoignez-nous pour façonner un portefeuille immobilier de
        prestige, conçu pour la génération de richesse à long terme.
      </p>

      {submitted ? (
        <div className="bg-green-100 text-green-700 p-4 rounded-md">
          ✅ Merci pour votre candidature! Un membre de notre équipe vous contactera sous peu.
        </div>
      ) : (
        <form
          action="https://formspree.io/f/xldbqbrb"
          method="POST"
          onSubmit={() => setSubmitted(true)}
          className="space-y-6 bg-white p-6 rounded-xl shadow-md border"
        >
          <div>
            <label className="block font-semibold mb-1">Nom complet</label>
            <input
              type="text"
              name="nom"
              required
              className="w-full border px-4 py-2 rounded-md"
            />
          </div>

          <div>
            <label className="block font-semibold mb-1">Courriel</label>
            <input
              type="email"
              name="email"
              required
              className="w-full border px-4 py-2 rounded-md"
            />
          </div>

          <div>
            <label className="block font-semibold mb-1">Montant que vous envisagez d’investir</label>
            <input
              type="text"
              name="montant"
              required
              className="w-full border px-4 py-2 rounded-md"
            />
          </div>

          <div>
            <label className="block font-semibold mb-1">
              Pourquoi souhaitez-vous investir avec CERDIA ?
            </label>
            <textarea
              name="motivation"
              required
              rows={4}
              className="w-full border px-4 py-2 rounded-md"
            ></textarea>
          </div>

          <button
            type="submit"
            className="bg-blue-800 text-white px-6 py-2 rounded-md hover:bg-blue-900"
          >
            Soumettre ma candidature
          </button>
        </form>
      )}

      <p className="text-sm text-center text-gray-500 italic mt-8">
        Toutes les demandes sont confidentielles. Seuls les candidats admissibles seront invités à une rencontre avec un fondateur. Pour toute question, écrivez à{' '}
        <a href="mailto:eric.dufort@cerdia.ai" className="underline text-blue-600">
          eric.dufort@cerdia.ai
        </a>
        .
      </p>
    </div>
  )
}
