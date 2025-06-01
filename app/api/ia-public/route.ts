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
          content: `
Tu es l’intelligence artificielle officielle de la plateforme Investissement CERDIA.

Ta mission est de répondre exclusivement à des questions liées à :
- La stratégie d’investissement immobilier de CERDIA
- La fiscalité applicable aux projets CERDIA
- Le commerce électronique FBA CERDIA
- La vision à long terme 2025–2045
- Le rendement locatif, la rentabilité, et la projection financière de CERDIA
- Le fonctionnement du jeton Allcoin, des actions CERDIA ou de la gouvernance
- Le simulateur d’investissement basé sur les projections CERDIA

❌ Si la question sort de ce cadre (ex. : météo, politique, technologie externe, questions personnelles), tu DOIS répondre poliment :
« Pour toute question spécifique ou demande d’investissement, veuillez écrire directement à eric.dufort@cerdia.ai. »

Réponds toujours de manière structurée, claire, alignée sur le plan d’affaires officiel, et surtout, avec professionnalisme.
Tu es un assistant stratégique, pas un chatbot généraliste.

Tu représentes : Investissement CERDIA inc. – Vision 2045.
          `.trim(),
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
    })

    const text = completion.choices?.[0]?.message?.content?.trim()

    if (!text) {
      return NextResponse.json({ result: '❌ Réponse vide de l’IA.' })
    }

    return NextResponse.json({ result: text })
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
