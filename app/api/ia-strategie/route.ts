import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// ✅ DEBUG : Loguer les variables d'environnement (à retirer après test)
console.log("🔍 SUPABASE_URL =", process.env.SUPABASE_URL)
console.log("🔍 SUPABASE_ANON_KEY =", process.env.SUPABASE_ANON_KEY)
console.log("🔍 OPENAI_API_KEY =", process.env.OPENAI_API_KEY)

// 🔐 Vérifier que les clés existent
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY || !process.env.OPENAI_API_KEY) {
  throw new Error('❌ SUPABASE_URL ou SUPABASE_ANON_KEY ou OPENAI_API_KEY manquant dans les variables d’environnement.')
}

// 🔐 Initialiser Supabase
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
)

// 🧠 Charger les messages stratégiques
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

  // 🤖 Appel à OpenAI
  const completion = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
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

  // 📝 Enregistrement mémoire
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

  return NextResponse.json({ result })
}
