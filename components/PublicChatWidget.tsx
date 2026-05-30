'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { MessageCircle, X, Send, Sparkles, PlayCircle, Mail } from 'lucide-react'

/**
 * Chatbot PUBLIC (page d'accueil marketing). Informe sur la plateforme
 * d'investissement immobilier CERDIA et oriente vers la démo + le courriel.
 * Anonyme (pas de session) ; la route applique le rate-limit IP + plafond global.
 */

type Msg = { role: 'user' | 'assistant'; content: string }

const CONTACT_EMAIL = 'eric.dufort@cerdia.ai'

const SUGGESTIONS = [
  'C’est quoi CERDIA ?',
  'Comment devenir investisseur ?',
  'Dans quels pays investissez-vous ?',
  'Comment fonctionne le suivi de mon investissement ?',
]

export default function PublicChatWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Ouverture automatique à l'arrivée (une seule fois par session, après 2,5 s)
  // pour engager le visiteur. Ne se rouvre pas s'il l'a déjà fermé.
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (sessionStorage.getItem('cerdia_chat_seen') === '1') return
    const t = setTimeout(() => {
      setOpen(true)
      sessionStorage.setItem('cerdia_chat_seen', '1')
    }, 2500)
    return () => clearTimeout(t)
  }, [])

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
      const res = await fetch('/api/assistant/public-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next }),
      })
      const json = await res.json()
      setMessages(m => [...m, { role: 'assistant', content: json.reply || '…' }])
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: `Une erreur est survenue. Écrivez-nous à ${CONTACT_EMAIL}.` }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-[95] flex items-center gap-2 rounded-full bg-amber-400 text-black shadow-xl px-4 py-3 hover:bg-amber-300 transition-colors font-semibold text-sm"
          aria-label="Discuter avec CERDIA"
        >
          <MessageCircle size={20} /> Des questions ?
        </button>
      )}

      {open && (
        <div className="fixed bottom-5 right-5 z-[95] w-[calc(100vw-2.5rem)] sm:w-96 h-[34rem] max-h-[82vh] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
          <div className="bg-gray-900 text-white px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-amber-400" />
              <span className="text-sm font-semibold">Assistant CERDIA</span>
            </div>
            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-white"><X size={18} /></button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">
                  👋 Bonjour ! Je peux vous expliquer comment fonctionne CERDIA et l’investissement
                  immobilier sur notre plateforme. Que souhaitez-vous savoir ?
                </p>
                <div className="flex flex-col gap-2">
                  {SUGGESTIONS.map(s => (
                    <button key={s} onClick={() => send(s)}
                      className="text-left text-xs text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 transition-colors">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
                  m.role === 'user' ? 'bg-gray-900 !text-white' : 'bg-gray-100 !text-gray-800'
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

          {/* CTA permanents : démo + courriel (les 2 portes de sortie) */}
          <div className="px-3 pt-2 flex gap-2">
            <Link href="/demo" className="flex-1">
              <span className="flex items-center justify-center gap-1.5 text-xs font-semibold bg-amber-400 hover:bg-amber-300 text-black rounded-lg py-2 transition-colors">
                <PlayCircle size={14} /> Voir la démo
              </span>
            </Link>
            <a href={`mailto:${CONTACT_EMAIL}?subject=Devenir investisseur CERDIA`} className="flex-1">
              <span className="flex items-center justify-center gap-1.5 text-xs font-semibold bg-gray-900 hover:bg-gray-800 text-white rounded-lg py-2 transition-colors">
                <Mail size={14} /> Nous écrire
              </span>
            </a>
          </div>

          <div className="p-3 flex items-center gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') send(input) }}
              placeholder="Posez votre question…"
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-full focus:ring-2 focus:ring-amber-400 outline-none !bg-white !text-gray-900 placeholder:!text-gray-400"
            />
            <button onClick={() => send(input)} disabled={loading || !input.trim()}
              className="w-9 h-9 rounded-full bg-gray-900 text-white flex items-center justify-center hover:bg-gray-800 disabled:opacity-40 transition-colors">
              <Send size={15} />
            </button>
          </div>
          <p className="text-[10px] text-gray-400 text-center pb-2 px-3">
            Information générale — ne constitue pas un conseil en investissement.
          </p>
        </div>
      )}
    </>
  )
}
