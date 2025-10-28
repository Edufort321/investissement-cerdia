import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function POST(request: NextRequest) {
  try {
    const { origin, destination, dates } = await request.json()

    const prompt = `Tu es un expert en voyage. L'utilisateur voyage de "${origin}" à "${destination}" du ${dates.debut} au ${dates.fin}.

Suggère les meilleurs moyens de transport pour ce trajet en format JSON avec cette structure:
{
  "suggestions": [
    {
      "type": "avion" | "train" | "auto" | "taxi" | "metro" | "bus",
      "nom": "Nom du transport",
      "description": "Description courte",
      "duree": "Durée estimée",
      "prix": "Prix estimé en CAD",
      "disponible": true/false,
      "recommande": true/false,
      "raison": "Pourquoi ce transport est recommandé"
    }
  ]
}

Donne 3-5 options réalistes et pertinentes pour ce trajet.`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Tu es un assistant spécialisé en planification de voyages. Tu réponds uniquement en JSON valide.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7
    })

    const result = JSON.parse(completion.choices[0].message.content || '{}')

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Erreur OpenAI:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la génération des suggestions', details: error.message },
      { status: 500 }
    )
  }
}
