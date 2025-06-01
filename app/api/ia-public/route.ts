import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import path from 'path'
import { promises as fs } from 'fs'

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

    // Lecture de la vision stratégique CERDIA
    const filePath = path.join(process.cwd(), 'public', 'vision_cerdia_2025_2045.txt')
    const vision = await fs.readFile(filePath, 'utf8')

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `
Tu es l’intelligence officielle de la plateforme Investissement CERDIA. Voici le plan stratégique :

${vision}

Tu dois uniquement répondre à des questions liées à :
- L’immobilier locatif stratégique de CERDIA
- La rentabilité, la croissance, le FBA, le jeton Allcoin
- La vision d’entreprise 2025–2045

❌ Si la question sort de ce cadre, réponds :
« Pour toute question spécifique ou demande d’investissement, veuillez écrire à eric.dufort@cerdia.ai. »

Réponds de manière professionnelle, alignée sur la vision.
          `.trim(),
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
    })

    const result = completion.choices?.[0]?.message?.content?.trim()
    if (!result) {
      return NextResponse.json({ result: '❌ Réponse vide de l’IA.' })
    }

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
