'use client'

export default function DevenirInvestisseurPage() {
  return (
    <div className="max-w-xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold text-center text-blue-800 mb-6">
        ✨ Candidature pour devenir investisseur CERDIA
      </h1>
      <form action="https://formspree.io/f/xldbqbrb" method="POST" className="space-y-6">
        <label className="block">
          Nom complet :
          <input type="text" name="nom" required className="mt-1 w-full border rounded px-4 py-2" />
        </label>
        <label className="block">
          Courriel :
          <input type="email" name="email" required className="mt-1 w-full border rounded px-4 py-2" />
        </label>
        <label className="block">
          Montant que vous envisagez d’investir :
          <input type="text" name="montant" className="mt-1 w-full border rounded px-4 py-2" />
        </label>
        <label className="block">
          Pourquoi souhaitez-vous investir avec CERDIA ?
          <textarea name="motivation" rows={4} className="mt-1 w-full border rounded px-4 py-2" />
        </label>
        <div className="text-center">
          <button type="submit" className="bg-blue-700 text-white px-6 py-3 rounded hover:bg-blue-800">
            Soumettre ma candidature
          </button>
        </div>
      </form>
      <p className="text-center text-sm text-gray-500 mt-6 italic">
        Toutes les demandes sont confidentielles. Seuls les candidats admissibles seront invités à une rencontre avec un fondateur.
        Pour toute question : <a href="mailto:eric.dufort@cerdia.ai" className="underline text-blue-600">eric.dufort@cerdia.ai</a>
      </p>
    </div>
  )
}
