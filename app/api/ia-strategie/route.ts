import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// 🔐 Initialisation Supabase avec environnement sécurisé
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
)

// 🧠 Fonction pour charger les messages stratégiques (rôle "system")
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
      console.warn('⚠️ Format invalide détecté dans messages.')
      return []
    }
  })
}

// 📬 Route POST IA stratégique
export async function POST(req: NextRequest) {
  const { vision } = await req.json()

  if (!vision || vision.trim() === '') {
    return NextResponse.json({ error: '❌ Aucune vision n’a été fournie à l’IA stratégique.' }, { status: 400 })
  }

  // 🧠 Charger la mémoire stratégique depuis Supabase
  const strategicMessages = await getStrategicSystemMessages()

  // 🧱 Fallback par défaut si aucune mémoire stratégique en base
  const baseSystem = [
    {
      role: 'system',
      content:
        "Tu es l’IA chef stratégique de Investissement CERDIA. Structure et analyse des visions à long terme, organise les étapes, identifie les leviers d'action, propose des modules IA.",
    },
  ]

  // 🧩 Fusion des messages à envoyer à OpenAI
  const messages = [
    ...(strategicMessages.length > 0 ? strategicMessages : baseSystem),
    { role: 'user', content: vision },
  ]

  // 🤖 Appel OpenAI
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

  // ✅ Résultat ou erreur
  const result = json.choices?.[0]?.message?.content ?? 'Réponse indisponible.'

  return NextResponse.json({ result })
}
