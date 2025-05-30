'use client'

import { useState } from 'react'

export default function AdminIAPage() {
  const [prompt, setPrompt] = useState('')
  const [result, setResult] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSend = async () => {
    setLoading(true)
    setError('')
    setResult('')

    try {
      const res = await fetch('/api/ia-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Erreur inconnue')
      } else {
        setResult(data.result)
      }
    } catch (err: any) {
      setError('Erreur réseau : ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-4">🧠 IA CERDIA – Mode Administrateur</h1>

      <textarea
        className="w-full border p-2 mb-4"
        placeholder="Commande IA stratégique (ex: crée une section investissement durable)..."
        rows={4}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
      />

      <button
        className="bg-blue-700 text-white px-4 py-2 rounded"
        onClick={handleSend}
        disabled={loading}
      >
        {loading ? 'Envoi...' : 'Envoyer'}
      </button>

      {error && (
        <p className="text-red-600 mt-4">❌ {error}</p>
      )}

      {result && (
        <div className="mt-6 border p-4 bg-gray-100 whitespace-pre-wrap">
          {result}
        </div>
      )}
    </div>
  )
}
