import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { requireAIUser } from '@/lib/auth/ai-guard'

let _openai: OpenAI | null = null
function getOpenAI(): OpenAI {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  return _openai
}
export async function POST(request: NextRequest) {
  try {
    const { from, to, language = 'fr' } = await request.json()

    if (!from || !to) {
      return NextResponse.json(
        { error: language === 'fr' ? 'Lieux de départ et d\'arrivée requis' : 'From and to locations required' },
        { status: 400 }
      )
    }

    const prompt = language === 'fr'
      ? `Tu es un expert en transport et logistique. Analyse le trajet de "${from}" à "${to}".

Fournis les suggestions de transport disponibles avec:
- Le mode de transport le plus adapté (plane/train/car/bus/bike/walk/boat)
- La durée estimée en minutes
- Le prix estimé approximatif (en dollars canadiens, sans le symbole $)
- Une brève explication

Retourne UNIQUEMENT un JSON valide avec ce format exact (pas de markdown):
{
  "suggestions": [
    {
      "mode": "plane|train|car|bus|bike|walk|boat",
      "duration": nombre_en_minutes,
      "estimatedPrice": nombre_ou_null,
      "explanation": "Brève explication"
    }
  ]
}

Trie les suggestions par pertinence (la première est la meilleure option).`
      : `You are a transport and logistics expert. Analyze the route from "${from}" to "${to}".

Provide available transport suggestions with:
- The most suitable transport mode (plane/train/car/bus/bike/walk/boat)
- Estimated duration in minutes
- Approximate estimated price (in Canadian dollars, without the $ symbol)
- A brief explanation

Return ONLY valid JSON with this exact format (no markdown):
{
  "suggestions": [
    {
      "mode": "plane|train|car|bus|bike|walk|boat",
      "duration": number_in_minutes,
      "estimatedPrice": number_or_null,
      "explanation": "Brief explanation"
    }
  ]
}

Sort suggestions by relevance (first is best option).`

    console.log('🚗 Génération suggestions transport...')

    const completion = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: language === 'fr'
            ? "Tu es un expert en transport. Tu fournis des suggestions réalistes de transport avec des durées et prix précis. Tu réponds UNIQUEMENT en JSON valide."
            : "You are a transport expert. You provide realistic transport suggestions with accurate durations and prices. You respond ONLY in valid JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 1000
    })

    let responseText = completion.choices[0]?.message?.content || ''

    // Nettoyer la réponse
    responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

    console.log('📝 Réponse IA:', responseText.substring(0, 200))

    let aiData
    try {
      aiData = JSON.parse(responseText)
    } catch (parseError) {
      console.error('❌ Erreur parsing JSON:', parseError)
      console.error('📄 Contenu reçu:', responseText)
      throw new Error('Format de réponse invalide de l\'IA')
    }

    if (!aiData.suggestions || !Array.isArray(aiData.suggestions)) {
      throw new Error('Suggestions non trouvées dans la réponse')
    }

    console.log('✅ Suggestions générées:', aiData.suggestions.length)

    return NextResponse.json({
      success: true,
      suggestions: aiData.suggestions,
      from,
      to
    })

  } catch (error: any) {
    console.error('🔴 Erreur suggestions transport:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Erreur lors de la génération des suggestions',
        details: error.toString()
      },
      { status: 500 }
    )
  }
}
