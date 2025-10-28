import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function POST(request: NextRequest) {
  try {
    const { destination, dateDebut, dateFin, budget, devise = 'CAD', language = 'fr' } = await request.json()

    if (!destination || !dateDebut || !dateFin) {
      return NextResponse.json(
        { error: language === 'fr' ? 'Destination et dates requises' : 'Destination and dates required' },
        { status: 400 }
      )
    }

    // Calculer le nombre de jours
    const start = new Date(dateDebut)
    const end = new Date(dateFin)
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1

    // Créer le prompt pour OpenAI
    const prompt = language === 'fr'
      ? `Tu es un expert en planification de voyages. Génère un itinéraire détaillé pour un voyage à ${destination} du ${dateDebut} au ${dateFin} (${days} jours).

Budget total: ${budget ? `${budget} ${devise}` : 'Non spécifié'}

Fournis un itinéraire jour par jour avec:
- Des activités et attractions principales
- Des suggestions de restaurants
- Des options d'hébergement
- Des estimations de coûts réalistes en ${devise}
- Des conseils pratiques

Retourne UNIQUEMENT un JSON valide avec ce format exact (pas de markdown, pas de texte avant ou après):
{
  "itinerary": [
    {
      "type": "activity|transport|hotel|restaurant",
      "titre": "Nom de l'activité",
      "date": "YYYY-MM-DD",
      "lieu": "Lieu précis",
      "prix": nombre,
      "notes": "Description détaillée"
    }
  ],
  "recommendations": "Conseils généraux pour le voyage"
}`
      : `You are a travel planning expert. Generate a detailed itinerary for a trip to ${destination} from ${dateDebut} to ${dateFin} (${days} days).

Total budget: ${budget ? `${budget} ${devise}` : 'Not specified'}

Provide a day-by-day itinerary with:
- Main activities and attractions
- Restaurant suggestions
- Accommodation options
- Realistic cost estimates in ${devise}
- Practical tips

Return ONLY valid JSON with this exact format (no markdown, no text before or after):
{
  "itinerary": [
    {
      "type": "activity|transport|hotel|restaurant",
      "titre": "Activity name",
      "date": "YYYY-MM-DD",
      "lieu": "Specific location",
      "prix": number,
      "notes": "Detailed description"
    }
  ],
  "recommendations": "General travel tips"
}`

    console.log('🤖 Génération itinéraire avec GPT-4...')

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: language === 'fr'
            ? "Tu es un expert en planification de voyages. Tu fournis des itinéraires détaillés et réalistes avec des estimations de coûts précises. Tu réponds UNIQUEMENT en JSON valide, sans markdown."
            : "You are a travel planning expert. You provide detailed and realistic itineraries with accurate cost estimates. You respond ONLY in valid JSON, without markdown."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 3000
    })

    let responseText = completion.choices[0]?.message?.content || ''

    // Nettoyer la réponse si elle contient du markdown
    responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

    console.log('📝 Réponse brute:', responseText.substring(0, 200))

    let aiData
    try {
      aiData = JSON.parse(responseText)
    } catch (parseError) {
      console.error('❌ Erreur parsing JSON:', parseError)
      console.error('📄 Contenu reçu:', responseText)
      throw new Error(language === 'fr'
        ? 'Format de réponse invalide de l\'IA'
        : 'Invalid AI response format')
    }

    if (!aiData.itinerary || !Array.isArray(aiData.itinerary)) {
      throw new Error(language === 'fr'
        ? 'Itinéraire non trouvé dans la réponse'
        : 'Itinerary not found in response')
    }

    console.log('✅ Itinéraire généré avec', aiData.itinerary.length, 'événements')

    return NextResponse.json({
      success: true,
      itinerary: aiData.itinerary,
      recommendations: aiData.recommendations || '',
      metadata: {
        destination,
        dateDebut,
        dateFin,
        days,
        budget,
        devise
      }
    })

  } catch (error: any) {
    console.error('🔴 Erreur génération voyage:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Erreur lors de la génération du voyage',
        details: error.toString()
      },
      { status: 500 }
    )
  }
}
