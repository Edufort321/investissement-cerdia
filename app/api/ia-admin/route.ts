import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { saveMemory } from '@/lib/ia/memory'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

export async function POST(req: NextRequest) {
  const supabase = createServerComponentClient({ cookies })
  const { prompt } = await req.json()

  try {
    // Authentification Supabase
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

    // Vérification du rôle dans la table profiles
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

    // Appel OpenAI GPT-4
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      temperature: 0.5,
      messages: [
        {
          role: 'system',
          content: `
Tu es l’IA stratégique de direction pour Investissement CERDIA.
Tu aides à générer des idées de développement, optimiser des composants techniques (React, TypeScript), créer des sections web et améliorer la vision d’affaires.
Sois professionnel, clair et structuré.
          `.trim(),
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    })

    const result = completion.choices[0].message?.content ?? 'Réponse indisponible.'

    // Sauvegarde dans ia_memory
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
