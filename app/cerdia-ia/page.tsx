'use client'

import { useState } from 'react'

export default function CerdiaIA() {
  const [question, setQuestion] = useState('')
  const [reponse, setReponse] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setReponse(null)

    // Simulation IA (version évolutive dans 3.6)
    setTimeout(() => {
      setReponse(`🤖 Réponse de CERDIA IA : "${question}" est en cours d'analyse. Merci pour votre demande !`)
      setLoading(false)
    }, 1200)
  }

  return (
    <section className="max-w-3xl mx-auto py-10 px-4 text-gray-800">
      <h1 className="text-3xl font-bold mb-6 text-center">🤖 Assistant CERDIA IA</h1>
      <form onSubmit={handleSubmit} className="mb-6 flex flex-col gap-4">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Posez une question à CERDIA IA..."
          className="border rounded p-3 w-full"
        />
        <button
          type="submit"
          className="bg-blue-700 text-white py-2 px-6 rounded hover:bg-blue-800"
        >
          Envoyer
        </button>
      </form>

      {loading && <p className="text-blue-600">⏳ CERDIA IA traite votre demande...</p>}
      {reponse && <p className="bg-gray-100 p-4 rounded text-black mt-4">{reponse}</p>}
    </section>
  )
}
