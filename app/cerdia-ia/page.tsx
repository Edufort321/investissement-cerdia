'use client'

import { useState } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'

export default function CerdiaIA() {
  const [question, setQuestion] = useState('')
  const [reponse, setReponse] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { language } = useLanguage()
  const fr = language === 'fr'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setReponse(null)

    setTimeout(() => {
      setReponse(
        fr
          ? `🤖 Réponse de CERDIA IA : "${question}" est en cours d'analyse. Merci pour votre demande !`
          : `🤖 CERDIA AI Response: "${question}" is being analyzed. Thank you for your request!`
      )
      setLoading(false)
    }, 1200)
  }

  return (
    <section className="max-w-3xl mx-auto py-10 px-4 text-gray-800">
      <h1 className="text-3xl font-bold mb-6 text-center">🤖 {fr ? 'Assistant CERDIA IA' : 'CERDIA AI Assistant'}</h1>
      <form onSubmit={handleSubmit} className="mb-6 flex flex-col gap-4">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={fr ? 'Posez une question à CERDIA IA...' : 'Ask CERDIA AI a question...'}
          className="border rounded p-3 w-full"
        />
        <button
          type="submit"
          className="bg-blue-700 text-white py-2 px-6 rounded hover:bg-blue-800"
        >
          {fr ? 'Envoyer' : 'Send'}
        </button>
      </form>

      {loading && <p className="text-blue-600">⏳ {fr ? 'CERDIA IA traite votre demande...' : 'CERDIA AI is processing your request...'}</p>}
      {reponse && <p className="bg-gray-100 p-4 rounded text-black mt-4">{reponse}</p>}
    </section>
  )
}
