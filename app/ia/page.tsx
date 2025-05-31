'use client'

import { useState } from 'react'

interface Message {
  type: 'user' | 'ia'
  text: string
}

export default function IAPage() {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)

  const handleSend = async () => {
    const trimmed = input.trim()
    if (!trimmed) return

    setMessages((prev) => [...prev, { type: 'user', text: trimmed }])
    setInput('')
    setLoading(true)

    const context = `
Tu es l’assistant stratégique officiel de Investissement CERDIA.
Tu es spécialisé en :
- investissement immobilier international
- fiscalité (Canada, Mexique, République dominicaine)
- commerce en ligne (Amazon FBA)
- gestion de capital
- stratégies de rendement sur 10 à 20 ans

Tu peux analyser un scénario comme :
« Si j’investis 100 000 $ sur 10 ans, quelles sont les prévisions conservatrices, modérées et optimales ? »

Réponds de façon structurée, en 3 colonnes :
- **Conservateur**
- **Modéré**
- **Optimal**

Inclue des estimations de rendement annuel net, de valeur cumulée, et des commentaires stratégiques.

Réponds toujours avec clarté, synthèse et précision.
---

Question : ${trimmed}
    `

    try {
      const res = await fetch('/api/ia-public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: context }),
      })

      const data = await res.json()

      setMessages((prev) => [
        ...prev,
        { type: 'ia', text: data.result || 'Réponse indisponible.' },
      ])
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { type: 'ia', text: '❌ Erreur de communication avec l’IA.' },
      ])
    }

    setLoading(false)
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-6 text-center">💡 Assistant IA CERDIA</h1>

      <div className="bg-gray-50 rounded-md p-4 border mb-6 h-[300px] overflow-y-auto shadow-inner">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`mb-2 p-2 rounded max-w-[80%] ${
              msg.type === 'user'
                ? 'bg-blue-100 ml-auto text-right'
                : 'bg-white text-left border'
            }`}
          >
            {msg.text}
          </div>
        ))}
        {loading && (
          <div className="p-2 text-sm text-gray-500">⏳ Réflexion de l’IA en cours...</div>
        )}
      </div>

      <div className="flex gap-2 mb-8">
        <input
          type="text"
          placeholder="Posez une question librement..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 border p-2 rounded shadow-sm"
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        />
        <button
          onClick={handleSend}
          className="bg-blue-700 text-white px-4 rounded"
        >
          Envoyer
        </button>
      </div>

      {/* Vision IA CERDIA */}
      <div className="bg-white rounded shadow-md p-6 border">
        <h2 className="text-xl font-semibold mb-2">🧠 Une vision d’avenir avec l’IA CERDIA</h2>
        <p className="text-gray-700 leading-relaxed text-sm">
          Imaginez un monde où chaque décision d’investissement est guidée par une intelligence stratégique.
          CERDIA IA vous accompagne dans l’analyse de projets immobiliers, la détection d’opportunités de marché,
          la planification fiscale internationale, le commerce Amazon FBA, et la projection de scénarios de rentabilité.
          <br /><br />
          Vous pouvez lui demander :
          <em>“Si j’investis 150 000 $ sur 15 ans, avec réinjection des revenus FBA, quel est le scénario optimal ?”</em>
          <br /><br />
          C’est votre cerveau d’investissement personnel, propulsé par OpenAI et entraîné sur la logique de CERDIA.
        </p>
      </div>
    </div>
  )
}
