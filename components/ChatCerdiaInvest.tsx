'use client'

import { useState } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'

interface Props {
  mode?: 'investor' | 'admin' | 'formation'
}

export default function ChatCerdiaInvest({ mode = 'investor' }: Props) {
  const { language } = useLanguage()
  const fr = language === 'fr'
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    const newMessages = [...messages, { role: 'user', content: input }]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    const res = await fetch('/api/cerdia', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: generatePrompt(newMessages, mode) }),
    })

    const data = await res.json()
    setMessages([...newMessages, { role: 'assistant', content: data.reply }])
    setLoading(false)
  }

  const generatePrompt = (
    msgs: { role: string; content: string }[],
    m: 'investor' | 'admin' | 'formation'
  ) => {
    const introMap: Record<string, string> = {
      investor: fr
        ? "Tu es l'assistant intelligent de CERDIA. Réponds aux questions d'un investisseur de manière claire, stratégique et professionnelle."
        : "You are CERDIA's intelligent assistant. Answer an investor's questions clearly, strategically and professionally.",
      admin: fr
        ? "Tu es l'assistant présidentiel de CERDIA. Tu peux générer des pages, contrats, modules ou décisions stratégiques."
        : "You are CERDIA's presidential assistant. You can generate pages, contracts, modules or strategic decisions.",
      formation: fr
        ? "Tu es un coach IA pour la formation CERDIA. Tu expliques les concepts comme à un étudiant motivé."
        : "You are an AI coach for CERDIA training. You explain concepts as if to a motivated student.",
    }
    const intro = introMap[m] ?? introMap.investor
    const history = msgs.map((msg) => `${msg.role === 'user' ? (fr ? 'Utilisateur' : 'User') : 'IA'} : ${msg.content}`).join('\n')
    return `${intro}\n\n${history}\n\n${fr ? 'Réponds maintenant à la dernière question :' : 'Now answer the last question:'}`
  }

  const modeLabel = fr
    ? `Assistant CERDIA IA - Mode ${mode}`
    : `CERDIA AI Assistant - ${mode} mode`

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg text-black">
      <h2 className="text-xl font-bold mb-4">{modeLabel}</h2>

      <div className="border p-4 mb-4 h-64 overflow-y-auto rounded bg-gray-50">
        {messages.map((msg, i) => (
          <div key={i} className={msg.role === 'user' ? 'mb-2 text-right' : 'mb-2 text-left'}>
            <span className={msg.role === 'user' ? 'inline-block p-2 rounded-lg bg-blue-200' : 'inline-block p-2 rounded-lg bg-gray-200'}>
              {msg.content}
            </span>
          </div>
        ))}
        {loading && <p className="text-blue-600 italic">{fr ? "L'IA réfléchit…" : 'AI is thinking…'}</p>}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={fr ? 'Posez une question à CERDIA IA' : 'Ask CERDIA AI a question'}
          className="flex-grow border rounded px-4 py-2"
        />
        <button type="submit" className="bg-blue-700 text-white px-4 py-2 rounded hover:bg-blue-800">
          {fr ? 'Envoyer' : 'Send'}
        </button>
      </form>
    </div>
  )
}
