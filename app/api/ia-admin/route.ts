import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { saveMemory } from '@/lib/ia/memory'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

export async function POST(req: NextRequest) {
  const supabase = createMiddlewareClient({ cookies })
  const { prompt } = await req.json()

  try {
    console.log('📨 [IA-ADMIN] Commande reçue :', prompt)

    // 1. Authentification Supabase
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError || !session) {
      console.warn('🔒 Utilisateur non authentifié.')
      return NextResponse.json(
        { error: 'Utilisateur non authentifié.' },
        { status: 401 }
      )
    }

    const user = session.user
    console.log('✅ Utilisateur connecté :', user.email, 'ID:', user.id)

    // 2. Récupération du rôle via la table `profiles`
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('❌ Erreur Supabase:', profileError.message)
    }

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Accès refusé. Rôle administrateur requis.' },
        { status: 403 }
      )
    }

    // 3. Appel à OpenAI GPT-4
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      temperature: 0.5,
      messages: [
        {
          role: 'system',
          content: `
Tu es l’IA stratégique de direction pour Investissement CERDIA.
Ta mission est de générer des idées d’investissement, d’optimiser la technologie web (Next.js, Supabase, React), d’évaluer des stratégies financières, et d’assister l’administration à atteindre 1 milliard sur 20 ans.
Réponds toujours de manière structurée, claire, et professionnelle.
          `.trim(),
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    })

    const result = completion.choices[0].message?.content ?? 'Réponse indisponible.'

    // 4. Sauvegarde mémoire IA
    await saveMemory(supabase, user.id, profile.role, [
      { role: 'user', content: prompt },
      { role: 'ia', content: result },
    ])

    console.log('✅ Réponse IA envoyée et sauvegardée.')
    return NextResponse.json({ result })
  } catch (err: any) {
    console.error('🔥 Erreur IA Admin:', err.message || err)
    return NextResponse.json(
      { error: 'Erreur interne : ' + (err.message || 'Erreur inconnue') },
      { status: 500 }
    )
  }
}
