'use client'

import { useState } from 'react'

export default function StrategiePage() {
  const [vision, setVision] = useState('')
  const [response, setResponse] = useState('')
  const [loading, setLoading] = useState(false)

  const envoyerVision = async () => {
    if (!vision.trim()) return
    setLoading(true)

    try {
      const res = await fetch('/api/ia-strategie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vision }),
      })
      const data = await res.json()
      setResponse(data.result || '❌ Réponse non disponible.')
    } catch (e) {
      console.error(e)
      setResponse('❌ Erreur IA Stratégique.')
    }

    setLoading(false)
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-bold text-center mb-6">🧭 Planification stratégique IA CERDIA</h1>

      <textarea
        value={vision}
        onChange={(e) => setVision(e.target.value)}
        placeholder="Décris ta vision stratégique, exemple : bâtir une plateforme mondiale, inclure fiscalité, FBA, immobilier international..."
        className="w-full border p-3 rounded mb-4 h-40"
      />

      <button
        onClick={envoyerVision}
        disabled={loading}
        className="bg-blue-800 text-white px-6 py-2 rounded hover:bg-blue-900"
      >
        {loading ? '⏳ Analyse en cours...' : 'Analyser la vision IA'}
      </button>

      {response && (
        <div className="mt-6 bg-gray-100 p-4 rounded shadow-inner">
          <h2 className="text-lg font-semibold mb-2">💡 Résultat IA :</h2>
          <pre className="whitespace-pre-wrap text-sm text-gray-800">{response}</pre>
        </div>
      )}
    </div>
  )
}
