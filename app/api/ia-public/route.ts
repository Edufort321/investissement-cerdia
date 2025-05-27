import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json()

    if (!prompt || prompt.trim() === '') {
      return NextResponse.json({ result: '❌ Aucun message reçu.' })
    }

    console.log('📩 Prompt reçu :', prompt)

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content:
            "Tu es l’IA officielle de la plateforme Investissement CERDIA. Tu donnes des réponses utiles, claires et stratégiques.",
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    })

    console.log('🧠 Réponse OpenAI brute :', JSON.stringify(completion, null, 2))

    const result =
      completion.choices?.[0]?.message?.content?.trim() ||
      '❌ Réponse vide de la part de l’IA.'

    return NextResponse.json({ result })
  } catch (error: any) {
    console.error('❌ Erreur IA CERDIA :', error)

    // 🛠️ Diagnostic plus clair si clé ou quota
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
