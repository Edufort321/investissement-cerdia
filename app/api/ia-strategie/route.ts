import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// ✅ Variables Supabase directement inscrites ici (temporairement)
const SUPABASE_URL = 'https://swvolnvknfmakgmjhoml.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3dm9sbnZrbmZtYWtnbWpob21sIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTkzMjMwMTAsImV4cCI6MjAxNDg5OTAxfQ.A78ddzUnRJ7Z2_HSYkM1oAfuPaibmrEmHlYucjlAk1g'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function getStrategicSystemMessages() {
  const { data, error } = await supabase
    .from('ia_memory')
    .select('messages')
    .eq('is_strategic', true)
    .eq('role', 'system')

  if (error) {
    console.error('❌ Supabase error:', error.message)
    return []
  }

  return data.flatMap((entry) => {
    try {
      return Array.isArray(entry.messages) ? entry.messages : JSON.parse(entry.messages)
    } catch {
      return []
    }
  })
}

export async function POST(req: NextRequest) {
  const { vision, user_id = 'admin@cerdia.ai' } = await req.json()

  if (!vision?.trim()) {
    return NextResponse.json({ error: '❌ Aucune vision fournie.' }, { status: 400 })
  }

  const strategicMessages = await getStrategicSystemMessages()

  const messages = [
    ...(strategicMessages.length ? strategicMessages : [{
      role: 'system',
      content: "Tu es l’IA chef stratégique de Investissement CERDIA. Structure et analyse des visions à long terme, organise les étapes, identifie les leviers d'action, propose des modules IA."
    }]),
    { role: 'user', content: vision },
  ]

  const completion = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer sk-xxxxxx`, // 🔁 Remplace par ta vraie clé OpenAI
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

  const { error: insertError } = await supabase.from('ia_memory').insert([{
    role: 'user',
    user_id,
    question: vision,
    answer: result,
    is_strategic: false,
  }])

  if (insertError) {
    console.error('⚠️ Erreur insertion mémoire:', insertError.message)
  }

  return NextResponse.json({ result })
}
