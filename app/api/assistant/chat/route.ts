/**
 * POST /api/assistant/chat — Assistant conseiller CERDIA (Claude / Anthropic).
 *
 * Agent INFORMATIF : explique le fonctionnement de la plateforme + les normes
 * fiscales (base de connaissance interne uniquement). Il ne lit AUCUNE donnée de
 * tenant → fuite entre tenants impossible par construction.
 *
 * Sécurité / coûts :
 *  - requireAIUser (auth Bearer obligatoire + quota strict par utilisateur).
 *  - max_tokens borné (limite de dépense par réponse).
 *  - prompt caching sur la base de connaissance (réduit le coût des tokens d'entrée
 *    répétés à chaque message).
 */

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { requireAIUser } from '@/lib/auth/ai-guard'
import { ASSISTANT_SYSTEM_PROMPT } from '@/lib/assistant/knowledge-base'

const MODEL = 'claude-haiku-4-5'   // agent informatif → modèle économique suffisant
const MAX_TOKENS = 800             // borne de coût par réponse
const MAX_HISTORY = 10             // borne le contexte (coût + abus)
const MAX_INPUT_CHARS = 2000       // borne la taille d'un message utilisateur

let _client: Anthropic | null = null
function getClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  return _client
}

type ChatMessage = { role: 'user' | 'assistant'; content: string }

export async function POST(request: NextRequest) {
  // 🔒 Auth + quota (tier 'text' : 20 req/min par utilisateur).
  const guard = await requireAIUser(request, 'text')
  if (guard.error) return guard.error

  const client = getClient()
  if (!client) return NextResponse.json({ error: 'Assistant non configuré (ANTHROPIC_API_KEY)' }, { status: 503 })

  const body = await request.json().catch(() => ({} as any))
  const rawMessages: ChatMessage[] = Array.isArray(body.messages) ? body.messages : []

  // Validation/borne des entrées (anti-abus).
  const messages = rawMessages
    .filter(m => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-MAX_HISTORY)
    .map(m => ({ role: m.role, content: String(m.content).slice(0, MAX_INPUT_CHARS) }))

  if (messages.length === 0 || messages[messages.length - 1].role !== 'user') {
    return NextResponse.json({ error: 'Message utilisateur requis' }, { status: 400 })
  }

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      // Le system prompt (base de connaissance) est mis en cache → tokens d'entrée
      // facturés une seule fois sur la fenêtre de cache, puis réutilisés.
      system: [
        {
          type: 'text',
          text: ASSISTANT_SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    })

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map(b => b.text)
      .join('\n')
      .trim()

    return NextResponse.json({ reply: text || '…' })
  } catch (e: any) {
    console.error('[assistant/chat] error:', e?.message)
    return NextResponse.json({ error: 'Erreur de l\'assistant. Réessayez.' }, { status: 500 })
  }
}
