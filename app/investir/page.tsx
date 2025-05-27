'use client'

import { useState } from 'react'

export default function DevenirInvestisseurPage() {
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Tu peux intégrer ici un appel à Supabase, une API ou Make
    setSubmitted(true)
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="text-4xl font-bold text-blue-800 mb-6 text-center">
        ✨ Candidature pour devenir investisseur CERDIA
      </h1>

      {submitted ? (
        <div className="bg-green-100 border border-green-400 text-green-800 p-6 rounded shadow">
          <p className="text-lg font-semibold mb-2">Merci pour votre intérêt !</p>
          <p>
            Votre demande a été reçue. Un des fondateurs communiquera avec vous sous peu
            pour planifier une entrevue confidentielle.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-gray-700 font-medium mb-2">Nom complet</label>
            <input
              required
              type="text"
              className="w-full border px-4 py-2 rounded shadow-sm"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-2">Courriel</label>
            <input
              required
              type="email"
              className="w-full border px-4 py-2 rounded shadow-sm"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-2">
              Montant que vous envisagez d’investir
            </label>
            <input
              required
              type="number"
              min={25000}
              className="w-full border px-4 py-2 rounded shadow-sm"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-2">
              Pourquoi souhaitez-vous investir avec CERDIA ?
            </label>
            <textarea
              required
              rows={4}
              className="w-full border px-4 py-2 rounded shadow-sm"
            />
          </div>

          <button
            type="submit"
            className="bg-blue-700 text-white font-semibold px-6 py-2 rounded hover:bg-blue-800"
          >
            Soumettre ma candidature
          </button>
        </form>
      )}

      <p className="text-sm italic text-gray-500 mt-10 text-center">
        Toutes les demandes sont confidentielles. Seuls les candidats admissibles seront
        invités à une rencontre avec un fondateur. Pour toute question, écrivez à{' '}
        <a href="mailto:eric.dufort@cerdia.ai" className="text-blue-600 underline">
          eric.dufort@cerdia.ai
        </a>
        .
      </p>
    </div>
  )
}
