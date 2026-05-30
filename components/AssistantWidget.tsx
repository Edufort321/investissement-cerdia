'use client'

import { useState, useRef, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { MessageCircle, X, Send, Sparkles } from 'lucide-react'

/**
 * Widget flottant de l'assistant CERDIA (Claude). Agent informatif : explique la
 * plateforme + les normes fiscales, aide à la saisie. Ne lit aucune donnée tenant.
 *
 * Sécurité : envoie le token Bearer de la session ; la route applique auth + quota.
 */

type Msg = { role: 'user' | 'assistant'; content: string }

const SUGGESTIONS = [
  'Comment fonctionne le calcul du NAV ?',
  'Quand le formulaire T1135 est-il obligatoire ?',
  'Comment bien remplir une transaction de loyer en RD ?',
  'C’est quoi l’élection 871(d) ?',
]

export default function AssistantWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  const send = async (text: string) => {
    const content = text.trim()
    if (!content || loading) return
    const next = [...messages, { role: 'user' as const, content }]
    setMessages(next)
    setInput('')
    setLoading(true)
    try {
      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token
      const res = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ messages: next }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Erreur')
      setMessages(m => [...m, { role: 'assistant', content: json.reply }])
    } catch (e: any) {
      setMessages(m => [...m, { role: 'assistant', content: '⚠️ ' + (e.message || 'Erreur de l’assistant.') }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Bouton flottant */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-[90] w-14 h-14 rounded-full bg-gray-900 text-white shadow-xl flex items-center justify-center hover:bg-gray-800 transition-colors"
          aria-label="Assistant CERDIA"
        >
          <MessageCircle size={24} />
        </button>
      )}

      {/* Panneau de chat */}
      {open && (
        <div className="fixed bottom-5 right-5 z-[90] w-[calc(100vw-2.5rem)] sm:w-96 h-[32rem] max-h-[80vh] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
          {/* En-tête */}
          <div className="bg-gray-900 text-white px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-amber-400" />
              <span className="text-sm font-semibold">Assistant CERDIA</span>
            </div>
            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-white"><X size={18} /></button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="space-y-3">
                <p className="text-sm text-gray-500">
                  👋 Je suis votre guide CERDIA. Je peux expliquer le fonctionnement de la plateforme et les
                  normes fiscales, et vous aider à remplir vos données. Je ne consulte aucune donnée réelle.
                </p>
                <div className="flex flex-col gap-2">
                  {SUGGESTIONS.map(s => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="text-left text-xs text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
                  m.role === 'user' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-800'
                }`}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-400 rounded-2xl px-3 py-2 text-sm">…</div>
              </div>
            )}
          </div>

          {/* Saisie */}
          <div className="border-t border-gray-100 p-3 flex items-center gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') send(input) }}
              placeholder="Posez une question…"
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-full focus:ring-2 focus:ring-gray-400 outline-none"
            />
            <button
              onClick={() => send(input)}
              disabled={loading || !input.trim()}
              className="w-9 h-9 rounded-full bg-gray-900 text-white flex items-center justify-center hover:bg-gray-800 disabled:opacity-40 transition-colors"
            >
              <Send size={15} />
            </button>
          </div>
          <p className="text-[10px] text-gray-400 text-center pb-2 px-3">
            Informatif — faites valider tout point fiscal par un comptable (CPA).
          </p>
        </div>
      )}
    </>
  )
}
