import { NextRequest, NextResponse } from 'next/server'

/**
 * API de geocoding et autocomplétion d'adresses
 * Utilise OpenStreetMap Nominatim (100% GRATUIT, pas de clé API requise)
 *
 * IMPORTANT: Respecte les limites d'utilisation de Nominatim
 * - Maximum 1 requête par seconde
 * - User-Agent personnalisé requis
 * - Voir: https://operations.osmfoundation.org/policies/nominatim/
 */

// Cache simple pour éviter les requêtes répétitives
const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

// Throttling pour respecter la limite de 1 req/sec de Nominatim
let lastRequestTime = 0
const MIN_REQUEST_INTERVAL = 1000 // 1 seconde

async function throttledFetch(url: string): Promise<Response> {
  const now = Date.now()
  const timeSinceLastRequest = now - lastRequestTime

  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest
    await new Promise(resolve => setTimeout(resolve, waitTime))
  }

  lastRequestTime = Date.now()
  return fetch(url)
}

export async function POST(request: NextRequest) {
  try {
    const { query, language = 'fr', limit = 5 } = await request.json()

    console.log('🔍 API geocode-autocomplete appelée:', { query, language, limit })

    if (!query || query.trim().length < 3) {
      return NextResponse.json(
        {
          error: language === 'fr'
            ? 'Veuillez entrer au moins 3 caractères'
            : 'Please enter at least 3 characters'
        },
        { status: 400 }
      )
    }

    // Vérifier le cache
    const cacheKey = `${query.toLowerCase()}-${language}-${limit}`
    const cached = cache.get(cacheKey)
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      console.log('✅ Réponse du cache')
      return NextResponse.json({
        success: true,
        results: cached.data,
        source: 'cache'
      })
    }

    // Construire l'URL pour Nominatim
    // https://nominatim.openstreetmap.org/search?q=123+rue+saint-jean+quebec&format=json&addressdetails=1&limit=5
    const nominatimUrl = new URL('https://nominatim.openstreetmap.org/search')
    nominatimUrl.searchParams.append('q', query)
    nominatimUrl.searchParams.append('format', 'json')
    nominatimUrl.searchParams.append('addressdetails', '1')
    nominatimUrl.searchParams.append('limit', limit.toString())
    nominatimUrl.searchParams.append('accept-language', language)
    // Prioriser les adresses (buildings, residences, etc.)
    nominatimUrl.searchParams.append('featuretype', 'settlement')

    console.log('📤 Requête Nominatim:', nominatimUrl.toString())

    // Faire la requête avec throttling
    const response = await throttledFetch(nominatimUrl.toString(), {
      headers: {
        'User-Agent': 'CerdiaVoyageApp/1.0 (Travel Planning App)',
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    console.log(`✅ ${data.length} résultat(s) trouvé(s)`)

    // Formater les résultats
    const results = data.map((place: any) => {
      // Construire une description lisible depuis les détails d'adresse
      const addr = place.address || {}
      const parts = []

      if (addr.house_number) parts.push(addr.house_number)
      if (addr.road) parts.push(addr.road)
      if (addr.neighbourhood) parts.push(addr.neighbourhood)
      if (addr.suburb) parts.push(addr.suburb)
      if (addr.city || addr.town || addr.village) {
        parts.push(addr.city || addr.town || addr.village)
      }
      if (addr.state) parts.push(addr.state)
      if (addr.country) parts.push(addr.country)

      return {
        name: place.display_name,
        shortName: parts.slice(0, 3).join(', ') || place.display_name,
        fullAddress: place.display_name,
        coordinates: {
          lat: parseFloat(place.lat),
          lng: parseFloat(place.lon)
        },
        type: place.type,
        category: place.class,
        importance: place.importance,
        addressDetails: addr
      }
    })

    // Trier par importance (Nominatim fournit déjà un score)
    results.sort((a: any, b: any) => (b.importance || 0) - (a.importance || 0))

    // Mettre en cache
    cache.set(cacheKey, { data: results, timestamp: Date.now() })

    // Nettoyer le cache (supprimer les entrées > 10 minutes)
    for (const [key, value] of cache.entries()) {
      if (Date.now() - value.timestamp > 10 * 60 * 1000) {
        cache.delete(key)
      }
    }

    return NextResponse.json({
      success: true,
      results,
      source: 'nominatim'
    })

  } catch (error: any) {
    console.error('🔴 Erreur geocode-autocomplete:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Erreur lors de la recherche d\'adresses',
        results: []
      },
      { status: 500 }
    )
  }
}
