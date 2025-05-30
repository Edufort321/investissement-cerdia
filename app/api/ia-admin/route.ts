import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@/lib/database.types'

export async function POST(req: NextRequest) {
  const supabase = createRouteHandlerClient<Database>({ cookies })
  const { prompt } = await req.json()

  // Appel à OpenAI
  const completion = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY!}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'Tu es l’assistant IA stratégique de Investissement CERDIA. Réponds avec clarté, intelligence, et précision professionnelle.' },
        { role: 'user', content: prompt },
      ],
    }),
  })

  const json = await completion.json()
  const result = json.choices?.[0]?.message?.content || 'Réponse vide'

  // Enregistrement dans Supabase
  const {
    data,
    error
  } = await supabase.from('ia_memory').insert({
    user_id: 'admin', // ou récupérer dynamiquement si authentifié
    role: 'admin',
    messages: [{ prompt, result }],
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ result })
}
