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
  const [simAmount, setSimAmount] = useState('')
  const [simYears, setSimYears] = useState('')
  const [lang, setLang] = useState<'fr' | 'en'>('fr')

  const handleSend = async () => {
    const trimmed = input.trim()
    if (!trimmed) return

    setMessages((prev) => [...prev, { type: 'user', text: trimmed }])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/ia-public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: trimmed }),
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

  const handleSimulation = async () => {
    if (!simAmount || !simYears) return

    const prompt = `
Tu es l’intelligence stratégique de CERDIA. Génère une simulation basée sur la vision de développement 2025–2045.

Montant investi : ${simAmount} $
Durée : ${simYears} ans

Présente :
- 1 scénario conservateur (rendement bas, sécurisé)
- 1 scénario modéré (équilibré)
- 1 scénario optimal (croissance maximale via réinjection eCommerce + plus-value)

Indique pour chaque :
- Rendement annuel moyen
- Valeur finale projetée
- Explication stratégique

Langue de réponse : ${lang === 'fr' ? 'français' : 'english'}
`

    setMessages((prev) => [
      ...prev,
      { type: 'user', text: `Simulation : ${simAmount} $ sur ${simYears} ans` },
    ])
    setLoading(true)

    try {
      const res = await fetch('/api/ia-public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
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

      <div className="flex justify-center mb-4">
        <button
          onClick={() => setLang('fr')}
          className={`px-4 py-1 rounded-l border ${lang === 'fr' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
        >
          🇨🇦 Français
        </button>
        <button
          onClick={() => setLang('en')}
          className={`px-4 py-1 rounded-r border ${lang === 'en' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
        >
          🇺🇸 English
        </button>
      </div>

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

      <div className="flex gap-2 mb-4">
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

      <div className="mb-10 border-t pt-4">
        <h3 className="font-semibold text-sm mb-2">📊 Simulation rapide :</h3>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="number"
            placeholder="Montant ($)"
            value={simAmount}
            onChange={(e) => setSimAmount(e.target.value)}
            className="border p-2 rounded w-full sm:w-40"
          />
          <input
            type="number"
            placeholder="Durée (années)"
            value={simYears}
            onChange={(e) => setSimYears(e.target.value)}
            className="border p-2 rounded w-full sm:w-40"
          />
          <button
            onClick={handleSimulation}
            className="bg-green-700 text-white px-4 rounded hover:bg-green-800"
          >
            Simuler
          </button>
        </div>
      </div>

      <div className="bg-white rounded shadow-md p-6 border">
        <h2 className="text-xl font-semibold mb-2">🧠 Une vision d’avenir avec l’IA CERDIA</h2>
        <p className="text-gray-700 leading-relaxed text-sm">
          Imaginez un monde où chaque décision d’investissement est guidée par une intelligence stratégique.
          CERDIA IA vous accompagne dans l’analyse de projets immobiliers, la détection d’opportunités de marché,
          et la gestion proactive de votre capital.
          <br /><br />
          Que vous soyez investisseur novice ou stratège aguerri, notre IA adaptative vous offre des
          recommandations personnalisées, répond à vos questions sur les projets en cours, et surveille
          en temps réel les tendances du marché mondial.
          <br /><br />
          L’IA CERDIA, c’est plus qu’un outil : c’est un partenaire de croissance,
          un cerveau digital à votre service, opérant jour et nuit pour faire fructifier votre patrimoine
          avec vision et sécurité.
        </p>
      </div>
    </div>
  )
}
