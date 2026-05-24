'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Database } from '@/types/supabase'
import { useLanguage } from '@/contexts/LanguageContext'

// Disable static generation for this page
export const dynamic = 'force-dynamic'

interface Message {
  type: 'user' | 'ia'
  text: string
}

export default function AdminIACerdiaPage() {
  const { language } = useLanguage()
  const fr = language === 'fr'

  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([{
    type: 'ia',
    text: fr ? "Bonjour! Comment puis-je vous aider aujourd'hui?" : 'Hello! How can I help you today?'
  }])
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false)

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
        body: JSON.stringify({ prompt: trimmed, privileged: isAdminUnlocked }),
      })

      const data = await res.json()

      if (data.result) {
        setMessages((prev) => [...prev, { type: 'ia', text: data.result }])
      } else {
        setMessages((prev) => [...prev, { type: 'ia', text: fr ? '❌ Réponse non disponible.' : '❌ Response unavailable.' }])
      }
    } catch (e) {
      console.error('Erreur IA Admin:', e)
      setMessages((prev) => [...prev, { type: 'ia', text: fr ? '❌ Erreur de communication avec IA Admin.' : '❌ AI Admin communication error.' }])
    }

    setLoading(false)
  }

  const unlockAdmin = async () => {
    const nom = prompt(fr ? "Nom d'utilisateur" : 'Username')
    const pass = prompt(fr ? 'Mot de passe' : 'Password')
    if (nom === 'eric' && pass === 'ok') {
      setIsAdminUnlocked(true)
      alert(fr ? '🔓 Accès IA Admin activé.' : '🔓 AI Admin access enabled.')
    } else {
      alert(fr ? '⛔ Informations incorrectes' : '⛔ Incorrect credentials')
    }
  }

  const formatMessage = (text: string) => {
    return text.split('\n').map((line, idx) => {
      if (line.trim().startsWith('**') && line.trim().endsWith('**')) {
        return <p key={idx} className="font-semibold text-blue-700 text-lg mt-2 mb-1">{line.replace(/\*\*/g, '')}</p>
      } else if (line.trim().startsWith('- ') || line.trim().startsWith('• ')) {
        return <li key={idx} className="ml-4 list-disc">{line.replace(/^[-•]\s*/, '')}</li>
      } else {
        return <p key={idx} className="text-gray-800 mb-2">{line}</p>
      }
    })
  }

  return (
    <div className="max-w-6xl mx-auto px-8 py-10">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold">🤖 {fr ? 'CERDIA IA – Assistant intelligent' : 'CERDIA AI – Intelligent Assistant'}</h1>
        {!isAdminUnlocked && (
          <button onClick={unlockAdmin} className="text-sm bg-gray-300 hover:bg-gray-400 text-black px-3 py-1 rounded">
            🔐 {fr ? 'Débloquer mode Admin IA' : 'Unlock AI Admin mode'}
          </button>
        )}
      </div>

      <div className="bg-gray-100 p-6 rounded-md shadow-inner h-[450px] overflow-y-auto mb-6 space-y-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`whitespace-pre-wrap p-4 rounded-lg max-w-[85%] leading-relaxed text-[15px] ${
              msg.type === 'user'
                ? 'bg-blue-100 ml-auto text-right border border-blue-300'
                : 'bg-white text-left border border-gray-300'
            }`}
          >
            {formatMessage(msg.text)}
          </div>
        ))}
        {loading && <p className="text-sm text-gray-500 italic text-center">⏳ {fr ? 'Réponse IA en cours...' : 'AI response in progress...'}</p>}
      </div>

      <div className="flex gap-2 mb-6">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={fr ? 'Commande IA, exemple : résume le plan 2045...' : 'AI command, e.g. summarize the 2045 plan...'}
          className="flex-1 border p-3 rounded shadow text-base"
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        />
        <button
          onClick={handleSend}
          className="bg-blue-800 hover:bg-blue-900 text-white px-6 py-2 rounded text-base"
        >
          {fr ? 'Envoyer' : 'Send'}
        </button>
      </div>

      <p className="text-xs text-center text-gray-400 italic">
        🧠 {fr
          ? "Cette IA répond librement. Pour activer les commandes de modification de code, déverrouillez l'accès admin."
          : 'This AI responds freely. To enable code modification commands, unlock admin access.'}
      </p>
    </div>
  )
}
