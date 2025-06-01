'use client'

import { useState, useEffect, useRef } from 'react'

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
  const chatBoxRef = useRef<HTMLDivElement>(null)

  const welcomeMessage = {
    fr: "👋 Bonjour, je suis l’assistant IA officiel de CERDIA. Posez vos questions sur notre vision immobilière, le FBA, ou les investissements stratégiques.",
    en: "👋 Hello, I’m the official AI assistant of CERDIA. Ask me anything about our real estate vision, FBA strategy, or strategic investments."
  }

  useEffect(() => {
    setMessages([
      {
        type: 'ia',
        text: lang === 'fr' ? welcomeMessage.fr : welcomeMessage.en
      }
    ])
  }, [lang])

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

      setMessages((prev) => [...prev, { type: 'ia', text: data.result || 'Réponse indisponible.' }])
    } catch {
      setMessages((prev) => [...prev, { type: 'ia', text: '❌ Erreur de communication avec l’IA.' }])
    }

    setLoading(false)
  }

  const handleSimulation = async () => {
    if (!simAmount || !simYears) return

    const prompt = `
Simulation personnalisée CERDIA
Montant investi : ${simAmount} $
Durée : ${simYears} ans
Langue : ${lang === 'fr' ? 'français' : 'english'}
`.trim()

    setMessages((prev) => [...prev, { type: 'user', text: `Simulation : ${simAmount} $ sur ${simYears} ans` }])
    setLoading(true)

    try {
      const res = await fetch('/api/ia-public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      })

      const data = await res.json()
      setMessages((prev) => [...prev, { type: 'ia', text: data.result || 'Réponse indisponible.' }])
    } catch {
      setMessages((prev) => [...prev, { type: 'ia', text: '❌ Erreur de communication avec l’IA.' }])
    }

    setLoading(false)
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-6 text-center">💡 Assistant IA CERDIA</h1>

      {/* Sélecteur de langue */}
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

      {/* Chat box */}
      <div
        ref={chatBoxRef}
        className="bg-gray-50 rounded-md p-4 border mb-6 h-[300px] overflow-y-auto shadow-inner flex flex-col"
      >
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

      {/* Input */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder={lang === 'fr' ? 'Posez une question librement...' : 'Ask a question freely...'}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 border p-2 rounded shadow-sm"
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        />
        <button onClick={handleSend} className="bg-blue-700 text-white px-4 rounded">
          {lang === 'fr' ? 'Envoyer' : 'Send'}
        </button>
      </div>

      {/* Simulation rapide */}
      <div className="mb-10 border-t pt-4">
        <h3 className="font-semibold text-sm mb-2">
          📊 {lang === 'fr' ? 'Simulation rapide :' : 'Quick Simulation:'}
        </h3>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="number"
            placeholder={lang === 'fr' ? 'Montant ($)' : 'Amount ($)'}
            value={simAmount}
            onChange={(e) => setSimAmount(e.target.value)}
            className="border p-2 rounded w-full sm:w-40"
          />
          <input
            type="number"
            placeholder={lang === 'fr' ? 'Durée (années)' : 'Duration (years)'}
            value={simYears}
            onChange={(e) => setSimYears(e.target.value)}
            className="border p-2 rounded w-full sm:w-40"
          />
          <button
            onClick={handleSimulation}
            className="bg-green-700 text-white px-4 rounded hover:bg-green-800"
          >
            {lang === 'fr' ? 'Simuler' : 'Simulate'}
          </button>
        </div>
      </div>

      {/* Présentation */}
      <div className="bg-white rounded shadow-md p-6 border">
        <h2 className="text-xl font-semibold mb-2">
          🧠 {lang === 'fr' ? 'Une vision d’avenir avec l’IA CERDIA' : 'A forward-looking vision with CERDIA AI'}
        </h2>
        <p className="text-gray-700 leading-relaxed text-sm">
          {lang === 'fr'
            ? "Imaginez un monde où chaque décision d’investissement est guidée par une intelligence stratégique. CERDIA IA vous accompagne dans l’analyse de projets immobiliers, la détection d’opportunités de marché, et la gestion proactive de votre capital."
            : "Imagine a world where every investment decision is guided by strategic intelligence. CERDIA AI assists you in analyzing real estate projects, detecting market opportunities, and proactively managing your capital."}
          <br /><br />
          {lang === 'fr'
            ? "Que vous soyez investisseur novice ou stratège aguerri, notre IA adaptative vous offre des recommandations personnalisées, répond à vos questions sur les projets en cours, et surveille en temps réel les tendances du marché mondial."
            : "Whether you're a novice investor or a seasoned strategist, our adaptive AI offers personalized recommendations, answers your questions about current projects, and monitors global market trends in real-time."}
          <br /><br />
          {lang === 'fr'
            ? "L’IA CERDIA, c’est plus qu’un outil : c’est un partenaire de croissance, un cerveau digital à votre service, opérant jour et nuit pour faire fructifier votre patrimoine avec vision et sécurité."
            : "CERDIA AI is more than a tool: it's a growth partner, a digital brain at your service, working day and night to grow your wealth with vision and security."}
        </p>
      </div>
    </div>
  )
}
