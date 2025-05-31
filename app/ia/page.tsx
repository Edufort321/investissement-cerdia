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
  const [lang, setLang] = useState<'fr' | 'en'>('fr')

  const translations = {
    fr: {
      title: '💡 Assistant IA CERDIA',
      placeholder: 'Posez une question librement...',
      button: 'Envoyer',
      waiting: '⏳ Réflexion de l’IA en cours...',
      default: 'Réponse indisponible.',
      error: '❌ Erreur de communication avec l’IA.',
      footerTitle: '🧠 Une vision d’avenir avec l’IA CERDIA',
      footerText: `Imaginez un monde où chaque décision d’investissement est guidée par une intelligence stratégique.
CERDIA IA vous accompagne dans l’analyse de projets immobiliers, la détection d’opportunités de marché, la planification fiscale internationale, le commerce Amazon FBA, et la projection de scénarios de rentabilité.

Vous pouvez lui demander :
“Si j’investis 150 000 $ sur 15 ans, avec réinjection des revenus FBA, quel est le scénario optimal ?”

C’est votre cerveau d’investissement personnel, propulsé par OpenAI et entraîné sur la logique de CERDIA.`,
      contact: 'Pour toute question spécifique ou demande d’investissement, veuillez écrire directement à ',
    },
    en: {
      title: '💡 CERDIA AI Assistant',
      placeholder: 'Ask your investment question...',
      button: 'Send',
      waiting: '⏳ AI is thinking...',
      default: 'Answer not available.',
      error: '❌ Error contacting AI.',
      footerTitle: '🧠 A vision for the future with CERDIA AI',
      footerText: `Imagine a world where every investment decision is guided by strategic intelligence.
CERDIA AI helps you analyze real estate projects, detect market opportunities, handle global tax planning, manage Amazon FBA commerce, and forecast investment scenarios.

You can ask:
“If I invest $150,000 over 15 years, reinvesting FBA profits, what is the optimal scenario?”

It’s your personal investment brain, powered by OpenAI and trained on CERDIA’s logic.`,
      contact: 'For any specific question or investment inquiry, please contact ',
    }
  }

  const tr = translations[lang]

  const handleSend = async () => {
    const trimmed = input.trim()
    if (!trimmed) return

    setMessages((prev) => [...prev, { type: 'user', text: trimmed }])
    setInput('')
    setLoading(true)

    const prompt = `
Tu es l'assistant officiel de Investissement CERDIA. Tu dois toujours répondre dans un ton professionnel et stratégique.

Langue : ${lang === 'fr' ? 'Français' : 'English'}

Ta spécialité est :
- l’investissement immobilier international (Canada, Mexique, République dominicaine)
- la fiscalité applicable à CERDIA
- le commerce électronique (Amazon FBA)
- la projection de rendement à 10 ou 20 ans selon divers montants d’investissement
- l’analyse stratégique en scénario conservateur / modéré / optimal

Ta tâche : répondre clairement à la question suivante :

${trimmed}
`

    try {
      const res = await fetch('/api/ia-public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      })

      const data = await res.json()

      setMessages((prev) => [
        ...prev,
        { type: 'ia', text: data.result || tr.default },
      ])
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { type: 'ia', text: tr.error },
      ])
    }

    setLoading(false)
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      {/* Langue */}
      <div className="flex justify-end mb-4">
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value as 'fr' | 'en')}
          className="border px-3 py-1 rounded-md shadow text-sm"
        >
          <option value="fr">🇨🇦 Français</option>
          <option value="en">🇺🇸 English</option>
        </select>
      </div>

      {/* Titre */}
      <h1 className="text-2xl font-bold mb-6 text-center">{tr.title}</h1>

      {/* Historique de chat */}
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
          <div className="p-2 text-sm text-gray-500">{tr.waiting}</div>
        )}
      </div>

      {/* Input */}
      <div className="flex gap-2 mb-8">
        <input
          type="text"
          placeholder={tr.placeholder}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 border p-2 rounded shadow-sm"
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        />
        <button
          onClick={handleSend}
          className="bg-blue-700 text-white px-4 rounded"
        >
          {tr.button}
        </button>
      </div>

      {/* Contact CERDIA */}
      <div className="mb-4 text-sm text-center text-gray-700">
        {tr.contact}
        <a href="mailto:eric.dufort@cerdia.ai" className="text-blue-600 underline">
          eric.dufort@cerdia.ai
        </a>
      </div>

      {/* Vision IA */}
      <div className="bg-white rounded shadow-md p-6 border text-sm leading-relaxed">
        <h2 className="text-lg font-semibold mb-2">🧠 {tr.footerTitle}</h2>
        <p className="text-gray-700 whitespace-pre-line">{tr.footerText}</p>
      </div>
    </div>
  )
}
