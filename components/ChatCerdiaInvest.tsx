'use client'

import { useState } from 'react'

interface Props {
  mode?: 'investor' | 'admin' | 'formation'
}

export default function ChatCerdiaInvest({ mode = 'investor' }: Props) {
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
      body: JSON.stringify({
        message: generatePrompt(newMessages, mode),
      }),
    })

    const data = await res.json()
    setMessages([...newMessages, { role: 'assistant', content: data.reply }])
    setLoading(false)
  }

  const generatePrompt = (
    messages: { role: string; content: string }[],
    mode: 'investor' | 'admin' | 'formation'
  ) => {
    const intro =
      mode === 'investor'
        ? 'Tu es l’assistant intelligent de Investissement CERDIA. Réponds aux questions d’un investisseur de manière claire, stratégique et professionnelle.'
        : mode === 'admin'
        ? 'Tu es l’assistant présidentiel de CERDIA. Tu peux générer des pages, contrats, modules ou décisions stratégiques.'
        : 'Tu es un coach IA pour la formation CERDIA. Tu expliques les concepts comme à un étudiant motivé.'

    const historique = messages.map((m) => `${m.role === 'user' ? 'Utilisateur' : 'IA'} : ${m.content}`).join('\n')

    return `${intro}\n\n${historique}\n\nRéponds maintenant à la dernière question :`
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg text-black">
      <h2 className="text-xl font-bold mb-4">💬 Assistant CERDIA IA – Mode {mode}</h2>

      <div className="border p-4 mb-4 h-64 overflow-y-auto rounded bg-gray-50">
        {messages.map((msg, i) => (
          <div key={i} className={`mb-2 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
            <span className={`inline-block p-2 rounded-lg ${msg.role === 'user' ? 'bg-blue-200' : 'bg-gray-200'}`}>
              {msg.content}
            </span>
          </div>
        ))}
        {loading && <p className="text-blue-600 italic">⏳ L’IA réfléchit…</p>}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Posez une question à CERDIA IA"
          className="flex-grow border rounded px-4 py-2"
        />
        <button
          type="submit"
          className="bg-blue-700 text-white px-4 py-2 rounded hover:bg-blue-800"
        >
          Envoyer
        </button>
      </form>
    </div>
  )
}
