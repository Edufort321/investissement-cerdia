import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@/types/supabase'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(req: NextRequest) {
  const supabase = createRouteHandlerClient<Database>({ cookies })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  const userId = session?.user.id

  if (!userId) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const prompt = `
Tu es l’assistant stratégique de CERDIA. Propose une tâche à réaliser pour améliorer le projet ou sa rentabilité. La tâche doit être utile, réaliste, stratégique, et applicable dans les prochaines semaines. Formule ta réponse clairement en une seule phrase.
    `

    const chat = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'system', content: prompt }],
      temperature: 0.7,
    })

    const result = chat.choices[0].message?.content?.trim()

    return NextResponse.json({ result: result || 'Aucune tâche générée.' })
  } catch (error) {
    console.error('Erreur propose-task:', error)
    return NextResponse.json({ error: 'Erreur IA' }, { status: 500 })
  }
}
