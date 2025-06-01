import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import fs from 'fs'
import path from 'path'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Chemin absolu pour charger la vision de CERDIA
const visionFilePath = path.resolve(process.cwd(), 'public/vision_cerdia_2025_2045.txt')
let visionContent = 'Vision stratégique indisponible.'

try {
  visionContent = fs.readFileSync(visionFilePath, 'utf-8')
  console.log('📘 Vision CERDIA chargée avec succès.')
} catch (err) {
  console.warn('⚠️ Impossible de lire le fichier de vision CERDIA.')
}

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json()

    if (!prompt || prompt.trim() === '') {
      return NextResponse.json({ result: '❌ Aucun message reçu.' })
    }

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

Voici la vision de l’entreprise (à connaître par cœur) :
${visionContent}

Tu es un assistant stratégique, pas un chatbot généraliste. Réponds toujours de manière claire, structurée et professionnelle.
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
