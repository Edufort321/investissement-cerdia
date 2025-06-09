import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@/lib/database.types'

export async function POST(req: NextRequest) {
  const supabase = createRouteHandlerClient<Database>({ cookies })

  const { prompt } = await req.json()
  if (!prompt) return NextResponse.json({ error: '❌ Prompt manquant.' }, { status: 400 })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const completion = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY ?? ''}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4',
      temperature: 0.5,
      messages: [
        {
          role: 'system',
          content: `Tu es l’IA stratégique de direction pour Investissement CERDIA. Aide à structurer le projet, créer du code, générer des contenus et supporter les décisions.`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    }),
  })

  const json = await completion.json()
  const result = json.choices?.[0]?.message?.content ?? 'Réponse indisponible.'

  await supabase.from('ia_memory').insert({
    user_id: user?.id || 'admin',
    role: 'admin',
    messages: [
      { role: 'user', content: prompt },
      { role: 'ia', content: result },
    ],
  })

  return NextResponse.json({ result })
}
