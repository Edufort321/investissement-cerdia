import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// ✅ Vérification des variables d’environnement
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY
const OPENAI_API_KEY = process.env.OPENAI_API_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('❌ SUPABASE_URL ou SUPABASE_ANON_KEY manquant dans les variables d’environnement.')
}
if (!OPENAI_API_KEY) {
  throw new Error('❌ OPENAI_API_KEY manquant dans les variables d’environnement.')
}

// 🔐 Initialisation Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// 🧠 Lecture de la mémoire stratégique "system"
async function getStrategicSystemMessages() {
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
      if (Array.isArray(entry.messages)) return entry.messages
      return JSON.parse(entry.messages)
    } catch (e) {
      console.warn('⚠️ Format JSON invalide dans messages.')
      return []
    }
  })
}

// 📬 Traitement de la requête POST
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

  // 🤖 Appel OpenAI
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

  // 📝 Enregistrement dans Supabase
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
    console.error('⚠️ Erreur lors de l’enregistrement dans ia_memory:', insertError.message)
  }

  return NextResponse.json({ result })
}
