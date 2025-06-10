import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@/lib/database.types'
import { proposeTask } from '@/lib/ia/logic'

export async function POST(req: NextRequest) {
  const supabase = createRouteHandlerClient<Database>({ cookies })

  try {
    const { prompt } = await req.json()
    if (!prompt) {
      return NextResponse.json({ error: '❌ Prompt manquant.' }, { status: 400 })
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: '❌ Utilisateur non authentifié.' }, { status: 401 })
    }

    // 🔍 1. Appel à OpenAI
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

    // 🧠 2. Sauvegarde mémoire
    const { error: memError } = await supabase.from('ia_memory').insert({
      user_id: user.id,
      role: 'admin',
      messages: [
        { role: 'user', content: prompt },
        { role: 'ia', content: result },
      ],
    })

    if (memError) {
      console.error('Erreur Supabase (ia_memory):', memError)
    }

    // ⚙️ 3. Déclenche une proposition de tâche si c’est une commande de ce type
    if (prompt.toLowerCase().includes('propose une tâche') || prompt.toLowerCase().includes('tâche ia')) {
      try {
        await proposeTask({
          user_id: user.id,
          type: 'suggested',
          payload: { prompt, result },
          note: `Généré par IA admin sur base du prompt : "${prompt}"`,
        })
      } catch (taskError) {
        console.error('Erreur proposeTask():', taskError)
      }
    }

    return NextResponse.json({ result })
  } catch (e) {
    console.error('Erreur IA Admin route:', e)
    return NextResponse.json({ error: '❌ Erreur serveur IA Admin.' }, { status: 500 })
  }
}
