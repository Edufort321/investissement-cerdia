import { NextRequest, NextResponse } from 'next/server'
import { apiCostTracker } from '@/lib/api-pricing'

// Base de données statique des principaux aéroports mondiaux (100% GRATUIT !)
const AIRPORTS_DB = {
  // Canada
  'montreal': [
    { name: 'Aéroport international Pierre-Elliott-Trudeau de Montréal', code: 'YUL', distance: '20 km', description: 'Principal aéroport international' },
    { name: 'Aéroport de Montréal-Mirabel', code: 'YMX', distance: '50 km', description: 'Aéroport cargo' }
  ],
  'toronto': [
    { name: 'Aéroport international Pearson de Toronto', code: 'YYZ', distance: '27 km', description: 'Plus grand aéroport du Canada' },
    { name: 'Aéroport Billy Bishop de Toronto', code: 'YTZ', distance: '2 km', description: 'Aéroport du centre-ville' }
  ],
  'vancouver': [
    { name: 'Aéroport international de Vancouver', code: 'YVR', distance: '12 km', description: 'Principal aéroport de la côte ouest' }
  ],
  'quebec': [
    { name: 'Aéroport international Jean-Lesage de Québec', code: 'YQB', distance: '16 km', description: 'Aéroport de Québec' }
  ],
  // France
  'paris': [
    { name: 'Aéroport Charles de Gaulle', code: 'CDG', distance: '25 km', description: 'Principal aéroport international' },
    { name: 'Aéroport d\'Orly', code: 'ORY', distance: '14 km', description: 'Deuxième aéroport de Paris' },
    { name: 'Aéroport de Beauvais', code: 'BVA', distance: '85 km', description: 'Aéroport low-cost' }
  ],
  'nice': [
    { name: 'Aéroport Nice Côte d\'Azur', code: 'NCE', distance: '7 km', description: 'Aéroport de la Côte d\'Azur' }
  ],
  'lyon': [
    { name: 'Aéroport Lyon-Saint-Exupéry', code: 'LYS', distance: '25 km', description: 'Aéroport de Lyon' }
  ],
  'marseille': [
    { name: 'Aéroport Marseille Provence', code: 'MRS', distance: '27 km', description: 'Aéroport de Marseille' }
  ],
  // USA
  'new york': [
    { name: 'Aéroport JFK', code: 'JFK', distance: '26 km', description: 'Principal aéroport international' },
    { name: 'Aéroport LaGuardia', code: 'LGA', distance: '13 km', description: 'Vols domestiques' },
    { name: 'Aéroport Newark', code: 'EWR', distance: '25 km', description: 'New Jersey' }
  ],
  'los angeles': [
    { name: 'Aéroport international de Los Angeles', code: 'LAX', distance: '18 km', description: 'LAX' }
  ],
  'chicago': [
    { name: 'Aéroport O\'Hare', code: 'ORD', distance: '27 km', description: 'Principal hub américain' }
  ],
  // UK
  'london': [
    { name: 'Aéroport d\'Heathrow', code: 'LHR', distance: '23 km', description: 'Principal aéroport britannique' },
    { name: 'Aéroport de Gatwick', code: 'LGW', distance: '45 km', description: 'Deuxième aéroport de Londres' }
  ],
  // Autres grandes villes
  'tokyo': [
    { name: 'Aéroport de Narita', code: 'NRT', distance: '60 km', description: 'Principal aéroport international' },
    { name: 'Aéroport de Haneda', code: 'HND', distance: '18 km', description: 'Proche du centre-ville' }
  ],
  'dubai': [
    { name: 'Aéroport international de Dubaï', code: 'DXB', distance: '5 km', description: 'Hub international majeur' }
  ]
}

// Gares principales
const STATIONS_DB = {
  'montreal': [
    { name: 'Gare Centrale de Montréal', code: null, distance: 'Centre-ville', description: 'Principale gare VIA Rail' }
  ],
  'toronto': [
    { name: 'Union Station', code: null, distance: 'Centre-ville', description: 'Principale gare de Toronto' }
  ],
  'paris': [
    { name: 'Gare du Nord', code: null, distance: 'Centre-ville', description: 'TGV, Eurostar, Thalys' },
    { name: 'Gare de Lyon', code: null, distance: 'Centre-ville', description: 'TGV Sud et Est' },
    { name: 'Gare Montparnasse', code: null, distance: 'Centre-ville', description: 'TGV Ouest et Sud-Ouest' }
  ],
  'london': [
    { name: 'St Pancras International', code: null, distance: 'Centre-ville', description: 'Eurostar' },
    { name: 'King\'s Cross', code: null, distance: 'Centre-ville', description: 'Trains nationaux' }
  ]
}

export async function POST(request: NextRequest) {
  try {
    const { location, transportMode = 'plane', language = 'fr', usePremium = false } = await request.json()

    console.log('🔍 API suggest-location appelée:', { location, transportMode, language, usePremium })

    if (!location || location.trim().length < 2) {
      return NextResponse.json(
        { error: language === 'fr' ? 'Lieu requis' : 'Location required' },
        { status: 400 }
      )
    }

    // ========================================
    // MODE GRATUIT - Base de données statique
    // ========================================
    if (!usePremium) {
      console.log('💚 Mode GRATUIT - Recherche dans base de données statique')

      // Normaliser la recherche (minuscules, sans accents)
      const normalizedLocation = location.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()

      console.log('🔍 Recherche normalisée:', normalizedLocation)

      let suggestions: any[] = []

      // Chercher dans la base appropriée selon le mode de transport
      if (transportMode === 'plane') {
        // Recherche dans AIRPORTS_DB
        for (const [city, airports] of Object.entries(AIRPORTS_DB)) {
          if (normalizedLocation.includes(city) || city.includes(normalizedLocation)) {
            suggestions = airports.map(airport => ({
              ...airport,
              type: 'airport'
            }))
            break
          }
        }
      } else if (transportMode === 'train') {
        // Recherche dans STATIONS_DB
        for (const [city, stations] of Object.entries(STATIONS_DB)) {
          if (normalizedLocation.includes(city) || city.includes(normalizedLocation)) {
            suggestions = stations.map(station => ({
              ...station,
              type: 'station'
            }))
            break
          }
        }
      } else {
        // Pour les autres modes, chercher dans les deux bases
        for (const [city, airports] of Object.entries(AIRPORTS_DB)) {
          if (normalizedLocation.includes(city) || city.includes(normalizedLocation)) {
            suggestions = [
              ...airports.map(airport => ({ ...airport, type: 'airport' }))
            ]
            break
          }
        }

        if (suggestions.length === 0) {
          for (const [city, stations] of Object.entries(STATIONS_DB)) {
            if (normalizedLocation.includes(city) || city.includes(normalizedLocation)) {
              suggestions = stations.map(station => ({ ...station, type: 'station' }))
              break
            }
          }
        }
      }

      console.log(`✅ ${suggestions.length} suggestion(s) gratuite(s) trouvée(s)`)

      // 💰 Tracker l'utilisation (gratuit)
      apiCostTracker.trackCall('static-db')

      return NextResponse.json({
        success: true,
        suggestions,
        mode: 'free'
      })
    }

    // ========================================
    // MODE PREMIUM - OpenAI (PAYANT)
    // ========================================
    console.log('💎 Mode PREMIUM - Utilisation de OpenAI (PAYANT)')

    const prompt = language === 'fr'
      ? `Pour la ville ou région "${location}", trouve les principaux points de transport pour le mode "${transportMode}".

RÈGLES STRICTES :
1. Pour "plane" (avion) : Liste les aéroports internationaux et régionaux avec leur code IATA (ex: YUL, CDG)
2. Pour "train" : Liste les gares principales (ex: Gare Centrale, Gare du Nord)
3. Pour "bus" : Liste les gares routières principales
4. Pour "boat" : Liste les ports maritimes ou terminaux de ferry
5. Pour "car" : Suggère les points de location de voiture ou parkings principaux

Retourne UNIQUEMENT un JSON valide avec ce format exact (pas de markdown, pas de code block) :
{
  "suggestions": [
    {
      "name": "Nom complet du lieu",
      "code": "Code IATA ou identifiant si applicable (null sinon)",
      "type": "airport|station|port|terminal",
      "distance": "Distance approximative du centre-ville",
      "description": "Courte description (ex: Principal aéroport international)"
    }
  ]
}

Maximum 5 suggestions, triées par importance/popularité.
Si le lieu n'est pas reconnu, retourne un tableau vide.`
      : `For the city or region "${location}", find the main transport points for mode "${transportMode}".

STRICT RULES:
1. For "plane": List international and regional airports with IATA code (e.g., YUL, CDG)
2. For "train": List main train stations (e.g., Central Station, Gare du Nord)
3. For "bus": List main bus terminals
4. For "boat": List seaports or ferry terminals
5. For "car": Suggest car rental points or main parking facilities

Return ONLY valid JSON with this exact format (no markdown, no code block):
{
  "suggestions": [
    {
      "name": "Full location name",
      "code": "IATA code or identifier if applicable (null otherwise)",
      "type": "airport|station|port|terminal",
      "distance": "Approximate distance from city center",
      "description": "Short description (e.g., Main international airport)"
    }
  ]
}

Maximum 5 suggestions, sorted by importance/popularity.
If location not recognized, return empty array.`

    // NOTE: OpenAI désactivé pour l'instant (pas de tokens)
    // Pour activer le mode premium, il faudra configurer OPENAI_API_KEY
    return NextResponse.json({
      success: false,
      error: language === 'fr'
        ? 'Mode premium non disponible pour le moment. Utilisez le mode gratuit.'
        : 'Premium mode not available at the moment. Use free mode.',
      suggestions: [],
      mode: 'premium_unavailable'
    }, { status: 503 })

    /* Code OpenAI commenté pour réactivation future avec tokens payants
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: language === 'fr'
            ? "Tu es un expert en transport et géographie. Tu connais tous les aéroports, gares, ports du monde. Tu réponds UNIQUEMENT en JSON valide."
            : "You are an expert in transportation and geography. You know all airports, stations, ports worldwide. You respond ONLY in valid JSON."
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
    responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

    console.log('📝 Réponse IA (suggestions):', responseText.substring(0, 200))

    let data
    try {
      data = JSON.parse(responseText)
    } catch (parseError) {
      console.error('❌ Erreur parsing JSON:', parseError)
      console.error('📄 Contenu reçu:', responseText)
      throw new Error('Format de réponse invalide de l\'IA')
    }

    if (!data.suggestions || !Array.isArray(data.suggestions)) {
      throw new Error('Format de suggestions invalide')
    }

    console.log(`✅ ${data.suggestions.length} suggestion(s) premium trouvée(s)`)

    return NextResponse.json({
      success: true,
      suggestions: data.suggestions,
      mode: 'premium'
    })
    */

  } catch (error: any) {
    console.error('🔴 Erreur suggestions transport:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Erreur lors de la recherche de suggestions',
        suggestions: []
      },
      { status: 500 }
    )
  }
}
