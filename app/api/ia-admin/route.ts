import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { saveMemory } from '@/lib/ia/memory'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

export async function POST(req: NextRequest) {
  const { prompt } = await req.json()

  try {
    console.log('🔵 Nouvelle requête IA ADMIN reçue :', prompt)

    // 1. Authentification Supabase
    const supabase = createRouteHandlerClient({ cookies })
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError || !session) {
      console.warn('🛑 Aucun utilisateur connecté.')
      return NextResponse.json(
        { error: 'Utilisateur non authentifié. Veuillez vous connecter.' },
        { status: 401 }
      )
    }

    const user = session.user
    console.log('✅ Utilisateur connecté :', user.email, '→ ID:', user.id)

    // 2. Recherche du profil (selon ID exact — doit correspondre à auth.users.uid)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    console.log('🧠 Données profil trouvées :', profile)
    if (profileError) console.error('❌ Erreur de lecture du profil :', profileError)

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Accès refusé. Rôle administrateur requis.' },
        { status: 403 }
      )
    }

    // 3. Appel à GPT-4
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      temperature: 0.5,
      messages: [
        {
          role: 'system',
          content: `
Tu es l’IA stratégique de direction pour Investissement CERDIA.
Ta mission est de générer des idées de développement, d’optimiser les composants techniques (React, TypeScript), de créer des contenus web professionnels, et de soutenir la vision stratégique de l’entreprise.
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
    console.log('🟢 Réponse GPT-4 obtenue')

    // 4. Sauvegarde mémoire IA
    await saveMemory(supabase, user.id, profile.role, [
      { role: 'user', content: prompt },
      { role: 'ia', content: result },
    ])
    console.log('📦 Mémoire IA sauvegardée')

    return NextResponse.json({ result })
  } catch (err: any) {
    console.error('❌ Erreur IA Admin finale :', err)
    return NextResponse.json(
      { error: 'Erreur IA admin : ' + (err.message || 'Erreur inconnue') },
      { status: 500 }
    )
  }
}
