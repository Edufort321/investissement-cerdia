import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@/lib/database.types'

export async function POST(req: NextRequest) {
  const supabase = createRouteHandlerClient<Database>({ cookies })

  const { prompt } = await req.json()

  // Requête à OpenAI
  const completion = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY!}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `Tu es l'IA stratégique de direction pour Investissement CERDIA. Tu aides à créer des idées, optimiser du code et soutenir la stratégie.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
    }),
  })

  const json = await completion.json()
  const result = json.choices?.[0]?.message?.content || 'Réponse indisponible.'

  // Sauvegarde dans la table ia_memory
  const { error } = await supabase.from('ia_memory').insert({
    user_id: 'admin',
    role: 'admin',
    messages: [{ role: 'user', content: prompt }, { role: 'ia', content: result }]
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ result })
}
