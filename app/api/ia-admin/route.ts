import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@/lib/database.types'

export async function POST(req: NextRequest) {
  const supabase = createRouteHandlerClient<Database>({ cookies })

  try {
    const { prompt } = await req.json()

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Prompt manquant ou invalide.' }, { status: 400 })
    }

    // 🔐 Récupération de l'utilisateur connecté
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error("❌ Erreur d'authentification Supabase :", authError?.message)
      return NextResponse.json({ error: 'Utilisateur non authentifié.' }, { status: 401 })
    }

    console.log("👤 Utilisateur connecté :", user.id)

    // 💬 Appel à l'API OpenAI
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

    if (!completion.ok) {
      console.error("❌ Erreur OpenAI :", json)
      return NextResponse.json({ error: 'Erreur avec OpenAI', detail: json }, { status: 500 })
    }

    const result = json.choices?.[0]?.message?.content ?? 'Réponse indisponible.'

    // 🧠 Enregistrement dans ia_memory
    const { error: insertError } = await supabase.from('ia_memory').insert({
      user_id: user.id,
      role: 'admin',
      messages: [
        { role: 'user', content: prompt },
        { role: 'ia', content: result }
      ],
    })

    if (insertError) {
      console.error("❌ Erreur Supabase (insert) :", insertError)
      return NextResponse.json({ error: 'Erreur lors de l’insertion en mémoire IA.' }, { status: 500 })
    }

    return NextResponse.json({ result })
  } catch (err: any) {
    console.error('❌ Exception API IA Admin :', err)
    return NextResponse.json({ error: err.message ?? 'Erreur serveur.' }, { status: 500 })
  }
}
