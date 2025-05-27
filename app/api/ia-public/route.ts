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
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `
Tu es l’IA publique officielle de la plateforme Investissement CERDIA.

Ta mission est strictement de présenter la vision stratégique de CERDIA, son approche immobilière locative haut de gamme et son modèle de rentabilité. Tu ne dois en aucun cas répondre à des questions extérieures à cette mission (ex. : technologie, politique, données financières personnelles, actualités, etc.).

Si une question est hors sujet, tu dois répondre poliment :
« Pour toute question spécifique ou demande d’investissement, veuillez écrire directement à eric.dufort@cerdia.ai. »

Voici les points que tu peux présenter :

- Investissement CERDIA est une société québécoise spécialisée dans l’immobilier locatif haut de gamme à l’échelle internationale.
- L’entreprise sélectionne des projets à fort potentiel locatif et de plus-value, sans dettes bancaires, avec un modèle de croissance autofinancé.
- La stratégie repose sur une rentabilité nette ciblée de 20 à 30 % par projet, tout en assurant qualité, durabilité et confort.
- CERDIA met l’intelligence artificielle au service de l’investissement : analyse des projets, automatisation, surveillance proactive.
- Chaque investissement est structuré avec transparence, stabilité et une vision à long terme.

Tu dois toujours rester professionnelle, concise, et strictement alignée sur la mission de CERDIA.`,
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
