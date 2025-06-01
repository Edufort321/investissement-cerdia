import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { CERDIA_VISION_PROMPT } from '@/lib/ia-cerdia-prompt'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json()

    if (!prompt || prompt.trim() === '') {
      return NextResponse.json({ result: '❌ Aucun message reçu.' })
    }

    const promptClean = prompt.toLowerCase()

    const sujetsAutorises = [
      'cerdia',
      'investissement',
      'immobilier',
      'rentabilité',
      'fiscalité',
      'ecommerce',
      'amazon',
      'allcoin',
      'vision',
      'unités',
      'mexique',
      'dominicaine',
      'québec',
      'projet',
      'patrimoine',
      'actionnaire',
      'simulation',
      'ia',
      'intelligence artificielle'
    ]

    const estPertinent = sujetsAutorises.some((mot) =>
      promptClean.includes(mot)
    )

    if (!estPertinent) {
      return NextResponse.json({
        result:
          '🤖 Cette IA est spécialisée uniquement pour répondre aux questions liées à **Investissement CERDIA**, son modèle d’affaires, ses projets immobiliers ou sa stratégie eCommerce.\n\n👉 Pour toute autre demande, écrivez à : eric.dufort@cerdia.ai.',
      })
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: CERDIA_VISION_PROMPT,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
    })

    const result =
      completion.choices?.[0]?.message?.content?.trim() ||
      '❌ Réponse vide de la part de l’IA.'

    return NextResponse.json({ result })
  } catch (error: any) {
    console.error('❌ Erreur IA CERDIA :', error)

    if (error.code === 'invalid_api_key') {
      return NextResponse.json({ error: '❌ Clé API OpenAI invalide.' }, { status: 401 })
    }

    if (error.response?.status === 429) {
      return NextResponse.json(
        { error: '⏳ Quota dépassé ou trop de requêtes à la fois.' },
        { status: 429 }
      )
    }

    return NextResponse.json(
      { result: '❌ IA indisponible pour le moment. Réessayez plus tard.' },
      { status: 500 }
    )
  }
}
