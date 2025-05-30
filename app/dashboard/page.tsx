'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

interface Message {
  type: 'user' | 'ia'
  text: string
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function AdminIACerdiaPage() {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)

  const [history, setHistory] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')

  const handleSend = async () => {
    const trimmed = input.trim()
    if (!trimmed) return

    setMessages((prev) => [...prev, { type: 'user', text: trimmed }])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/ia-admin', {
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
        { type: 'ia', text: '❌ Erreur de communication avec IA Admin.' },
      ])
    }

    setLoading(false)
  }

  useEffect(() => {
    const fetchHistory = async () => {
      const { data, error } = await supabase
        .from('ia_memory')
        .select('*')
        .order('created_at', { ascending: false })

      if (!error) setHistory(data || [])
    }

    fetchHistory()
  }, [])

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-bold text-center mb-6">🧠 IA CERDIA – Mode Administrateur</h1>

      {/* Boîte de dialogue IA */}
      <div className="bg-gray-100 p-4 rounded-md shadow-inner h-[400px] overflow-y-auto mb-6">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`p-3 rounded mb-2 max-w-[85%] ${
              msg.type === 'user' ? 'bg-blue-200 ml-auto text-right' : 'bg-white text-left border'
            }`}
          >
            {msg.text}
          </div>
        ))}
        {loading && <p className="text-sm text-gray-500">⏳ Réponse IA en cours...</p>}
      </div>

      {/* Champ de saisie IA */}
      <div className="flex gap-2 mb-10">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Commande IA stratégique, exemple : ajoute une section dans /page.tsx..."
          className="flex-1 border p-2 rounded shadow"
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        />
        <button
          onClick={handleSend}
          className="bg-blue-800 hover:bg-blue-900 text-white px-4 rounded"
        >
          Envoyer
        </button>
      </div>

      {/* Historique des requêtes IA */}
      <div>
        <h2 className="text-xl font-semibold mb-3">📜 Historique des requêtes IA</h2>

        <input
          type="text"
          placeholder="🔍 Rechercher dans les requêtes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border p-2 rounded w-full mb-4"
        />

        <div className="bg-white border rounded-md shadow max-h-[400px] overflow-y-auto">
          {history
            .filter(
              (h) =>
                h.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
                h.answer?.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .map((h, idx) => (
              <div key={idx} className="border-b px-4 py-3">
                <p className="text-sm font-bold text-blue-700">👤 {h.user_id}</p>
                <p className="text-gray-800">💬 {h.question}</p>
                <p className="text-green-700 text-sm mt-1">{h.answer}</p>
                <p className="text-xs text-gray-400 mt-1">
                  📅 {new Date(h.created_at).toLocaleString()}
                </p>
                {h.is_strategic && (
                  <span className="text-xs text-red-600 font-semibold">🔥 Stratégique</span>
                )}
              </div>
            ))}
        </div>
      </div>

      <p className="text-sm text-center text-gray-500 italic mt-8">
        ⚙️ Cette IA peut exécuter des actions réservées à l’administration CERDIA.
      </p>
    </div>
  )
}
