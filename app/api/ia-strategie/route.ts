import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// ✅ Désactivation temporaire des erreurs bloquantes pour permettre le build
const SUPABASE_URL = process.env.SUPABASE_URL ?? ''
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? ''
const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? ''

// 🔐 Initialisation Supabase uniquement si possible
const supabase = (SUPABASE_URL && SUPABASE_ANON_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null

// 🧠 Charger les messages stratégiques
async function getStrategicSystemMessages() {
  if (!supabase) return []

  const { data, error } = await supabase
    .from('ia_memory')
    .select('messages')
    .eq('is_strategic', true)
    .eq('role', 'system')

  if (error) {
    console.error('❌ Erreur Supabase:', error.message)
    return []
  }

  return data.flatMap((entry) => {
    try {
      return Array.isArray(entry.messages) ? entry.messages : JSON.parse(entry.messages)
    } catch {
      console.warn('⚠️ Format JSON invalide dans messages.')
      return []
    }
  })
}

// 📬 Route POST
export async function POST(req: NextRequest) {
  const { vision, user_id = 'admin@cerdia.ai' } = await req.json()

  if (!vision || vision.trim() === '') {
    return NextResponse.json({ error: '❌ Aucune vision fournie.' }, { status: 400 })
  }

  const strategicMessages = await getStrategicSystemMessages()

  const baseSystem = [
    {
      role: 'system',
      content:
        "Tu es l’IA chef stratégique de Investissement CERDIA. Structure et analyse des visions à long terme, organise les étapes, identifie les leviers d'action, propose des modules IA.",
    },
  ]

  const messages = [
    ...(strategicMessages.length > 0 ? strategicMessages : baseSystem),
    { role: 'user', content: vision },
  ]

  // ⚠️ Si la clé OpenAI n'est pas présente, on renvoie un message neutre
  if (!OPENAI_API_KEY) {
    console.warn('⚠️ OPENAI_API_KEY manquante, réponse mock activée.')
    return NextResponse.json({ result: 'Réponse générée automatiquement (clé API manquante).' })
  }

  // 🤖 Appel à OpenAI
  const completion = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
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

  // 📝 Enregistrement mémoire (si Supabase actif)
  if (supabase) {
    const { error: insertError } = await supabase.from('ia_memory').insert([
      {
        role: 'user',
        user_id,
        question: vision,
        answer: result,
        is_strategic: false,
      },
    ])

    if (insertError) {
      console.error('⚠️ Erreur enregistrement mémoire :', insertError.message)
    }
  }

  return NextResponse.json({ result })
}
