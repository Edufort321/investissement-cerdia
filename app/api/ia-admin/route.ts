import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/lib/database.types' // ⚠️ assure-toi que ce fichier existe (on fera l'étape 2 juste après)
import OpenAI from 'openai'
import { saveMemory } from '@/lib/ia/memory'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

export async function POST(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies })
    const { prompt } = await req.json()

    // 🔐 Authentification utilisateur
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Utilisateur non authentifié. Veuillez vous connecter.' },
        { status: 401 }
      )
    }

    const user = session.user

    // 🔍 Récupération du rôle (admin ou non)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Accès refusé. Rôle administrateur requis.' },
        { status: 403 }
      )
    }

    // ✨ Requête OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      temperature: 0.5,
      messages: [
        {
          role: 'system',
          content: `
Tu es l’IA stratégique de direction pour Investissement CERDIA.
Tu aides à générer des idées de développement, optimiser des composants techniques (React, TypeScript),
créer des contenus web professionnels et soutenir la vision stratégique de l’entreprise.
Sois structuré, clair, créatif et proactif.
`.trim(),
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    })

    const result = completion.choices[0].message?.content ?? 'Réponse indisponible.'

    // 💾 Enregistrement mémoire IA
    await saveMemory(supabase, user.id, profile.role, [
      { role: 'user', content: prompt },
      { role: 'ia', content: result },
    ])

    return NextResponse.json({ result })
  } catch (err: any) {
    console.error('❌ Erreur IA Admin:', err)
    return NextResponse.json(
      { error: 'Erreur IA admin : ' + (err.message || 'Erreur inconnue') },
      { status: 500 }
    )
  }
}
