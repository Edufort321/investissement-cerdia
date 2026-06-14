/**
 * POST /api/assistant/public-chat — Chatbot PUBLIC marketing (Claude).
 *
 * Page d'accueil, visiteurs anonymes. Informe sur la plateforme d'investissement
 * immobilier CERDIA et oriente vers la démo + le courriel. Aucune donnée réelle,
 * aucun conseil en investissement (voir PUBLIC_SYSTEM_PROMPT).
 *
 * Anti-abus (pas d'auth possible) :
 *  - rate-limit par IP + plafond global quotidien (lib/assistant/public-guard).
 *  - max_tokens court (limite de coût par réponse) + bornes d'entrée.
 *  - prompt caching sur la base de connaissance.
 */

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { PUBLIC_SYSTEM_PROMPT } from '@/lib/assistant/public-knowledge'
import { checkPublicQuota, getClientIp } from '@/lib/assistant/public-guard'

const MODEL = 'claude-haiku-4-5'   // bot d'accueil → modèle économique
const MAX_TOKENS = 350             // réponses COURTES = coût borné
const MAX_HISTORY = 8
const MAX_INPUT_CHARS = 1000

let _client: Anthropic | null = null
function getClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  return _client
}

type ChatMessage = { role: 'user' | 'assistant'; content: string }

export async function POST(request: NextRequest) {
  // Anti-abus : IP + plafond global. Aucun appel IA si dépassé.
  const ip = getClientIp(request.headers)
  const quota = checkPublicQuota(ip)
  if (!quota.ok) {
    const msg = quota.reason === 'global_cap'
      ? 'Notre assistant est très sollicité aujourd’hui. Écrivez-nous à info@cerdia.ai ou essayez la démo.'
      : 'Vous avez envoyé beaucoup de messages. Réessayez un peu plus tard, ou écrivez à info@cerdia.ai.'
    return NextResponse.json({ reply: msg, limited: true }, { status: 200 })
  }

  const client = getClient()
  if (!client) {
    return NextResponse.json(
      { reply: 'Assistant momentanément indisponible. Écrivez-nous à info@cerdia.ai.' },
      { status: 200 }
    )
  }

  const body = await request.json().catch(() => ({} as any))
  const raw: ChatMessage[] = Array.isArray(body.messages) ? body.messages : []
  const messages = raw
    .filter(m => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-MAX_HISTORY)
    .map(m => ({ role: m.role, content: String(m.content).slice(0, MAX_INPUT_CHARS) }))

  if (messages.length === 0 || messages[messages.length - 1].role !== 'user') {
    return NextResponse.json({ error: 'Message requis' }, { status: 400 })
  }

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: [{ type: 'text', text: PUBLIC_SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    })
    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map(b => b.text).join('\n').trim()
    return NextResponse.json({ reply: text || '…' })
  } catch (e: any) {
    console.error('[public-chat] error:', e?.message)
    return NextResponse.json(
      { reply: 'Une erreur est survenue. Écrivez-nous à info@cerdia.ai.' },
      { status: 200 }
    )
  }
}
