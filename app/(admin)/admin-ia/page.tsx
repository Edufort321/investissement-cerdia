'use client'

import { useState } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'

export default function AdminIA() {
  const { language } = useLanguage()
  const fr = language === 'fr'

  const [prompt, setPrompt] = useState('')
  const [result, setResult] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch('/api/ia-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || (fr ? 'Erreur inconnue' : 'Unknown error'))
      }

      setResult(data.result)
      setPrompt('')
    } catch (err: any) {
      setError(err.message || (fr ? 'Erreur inattendue' : 'Unexpected error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4 text-center">
        🧠 {fr ? 'IA CERDIA – Mode Administrateur' : 'CERDIA AI – Administrator Mode'}
      </h1>

      <textarea
        placeholder={fr
          ? "Crée-moi une section IA pour la stratégie de développement durable"
          : 'Create an AI section for the sustainable development strategy'}
        className="w-full border p-3 rounded mb-4 bg-blue-100 text-black"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        disabled={loading}
      />

      <button
        onClick={handleSubmit}
        disabled={loading || !prompt.trim()}
        className="bg-blue-800 text-white px-6 py-2 rounded hover:bg-blue-900 disabled:opacity-50"
      >
        {loading ? (fr ? 'Chargement...' : 'Loading...') : (fr ? 'Envoyer' : 'Send')}
      </button>

      {error && (
        <div className="mt-4 text-red-600 bg-red-100 p-2 rounded border border-red-400">
          {fr ? '❌ Erreur de communication avec IA Admin :' : '❌ AI Admin communication error:'} {error}
        </div>
      )}

      {result && (
        <div className="mt-6 bg-white p-4 border rounded shadow">
          <h2 className="font-semibold mb-2">{fr ? "✅ Réponse de l'IA :" : '✅ AI Response:'}</h2>
          <pre className="whitespace-pre-wrap">{result}</pre>
        </div>
      )}
    </div>
  )
}
