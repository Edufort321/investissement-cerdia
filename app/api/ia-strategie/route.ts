import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// 1. Initialisation Supabase
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
)

// 2. Chargement de la mémoire stratégique depuis la BD
async function getStrategicSystemMessages() {
  const { data, error } = await supabase
    .from('ia_memory')
    .select('role, messages')
    .eq('is_strategic', true)
    .eq('role', 'system')

  if (error) {
    console.error('❌ Erreur Supabase:', error.message)
    return []
  }

  return data.flatMap((entry) => {
    try {
      return Array.isArray(entry.messages)
        ? entry.messages
        : JSON.parse(entry.messages)
    } catch (e) {
      return []
    }
  })
}

// 3. Route POST
export async function POST(req: NextRequest) {
  const { vision } = await req.json()

  if (!vision) {
    return NextResponse.json({ error: '❌ Vision manquante.' }, { status: 400 })
  }

  // 4. Charger la mémoire stratégique
  const strategicMessages = await getStrategicSystemMessages()

  // Fallback si mémoire vide
  const baseSystem = [
    {
      role: 'system',
      content:
        "Tu es l’IA chef stratégique de Investissement CERDIA. Structure et analyse des visions à long terme, organise les étapes, identifie les leviers d'action, propose des modules IA.",
    },
  ]

  const messages = [
    ...((strategicMessages.length > 0) ? strategicMessages : baseSystem),
    { role: 'user', content: vision },
  ]

  // 5. Appel OpenAI
  const completion = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY ?? ''}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages,
      temperature: 0.5,
    }),
  })

  const json = await completion.json()
  const result = json.choices?.[0]?.message?.content ?? 'Réponse indisponible.'

  return NextResponse.json({ result })
}
