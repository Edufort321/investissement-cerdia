import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

// 🔐 Connexion Supabase côté serveur
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: Request) {
  const { messages, role } = await req.json()

  const prompt = messages
    .map((m: { role: string; content: string }) =>
      `${m.role === 'user' ? 'Utilisateur' : 'IA'}: ${m.content}`
    )
    .join('\n')

  try {
    const aiResponse = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    })

    const reply = aiResponse.choices[0].message.content || 'Réponse vide.'

    // 💾 Enregistrement dans Supabase
    const { error } = await supabase.from('ia_memory').insert({
      user_id: 'invite',
      role: role || 'investor',
      messages: JSON.stringify([...messages, { role: 'assistant', content: reply }]),
    })

    if (error) {
      console.error('Erreur insertion Supabase :', error)
    }

    return NextResponse.json({ reply })
  } catch (err) {
    console.error('Erreur OpenAI :', err)
    return NextResponse.json({ error: 'Erreur GPT' }, { status: 500 })
  }
}
