'use client'

export default function InvestirPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="text-4xl font-bold text-blue-800 mb-6 text-center">
        ✨ Candidature pour devenir investisseur CERDIA
      </h1>

      <form
        action="https://formspree.io/f/xxxxxxxx" // Remplace par TON ID Formspree
        method="POST"
        className="space-y-6"
      >
        <div>
          <label className="block text-gray-700 font-medium mb-2">Nom complet</label>
          <input
            required
            type="text"
            name="Nom complet"
            className="w-full border px-4 py-2 rounded shadow-sm"
          />
        </div>

        <div>
          <label className="block text-gray-700 font-medium mb-2">Courriel</label>
          <input
            required
            type="email"
            name="Courriel"
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
            name="Montant prévu"
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
            name="Motivation"
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

