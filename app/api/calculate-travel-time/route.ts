import { NextRequest, NextResponse } from 'next/server'

/**
 * API pour calculer le temps de trajet estimé entre deux points
 * Utilise OSRM (Open Source Routing Machine) - 100% GRATUIT
 *
 * OSRM fournit:
 * - Durée estimée du trajet
 * - Distance
 * - Route optimale
 *
 * Modes supportés: car, bike, walk (OSRM public)
 * Note: Pour plane/train/bus, on utilisera une estimation simple basée sur la distance
 */

// Cache pour éviter les requêtes répétitives
const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_DURATION = 30 * 60 * 1000 // 30 minutes

interface CalculateTravelTimeRequest {
  from: { lat: number; lng: number }
  to: { lat: number; lng: number }
  mode: 'car' | 'bike' | 'walk' | 'plane' | 'train' | 'bus'
}

// Vitesses moyennes estimées (km/h)
const AVERAGE_SPEEDS = {
  plane: 800, // Vitesse de croisière + temps taxi/décollage/atterrissage
  train: 120, // Train à grande vitesse moyen
  bus: 60,
  car: 80,
  bike: 20,
  walk: 5
}

// Calcul de distance haversine (distance à vol d'oiseau)
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371 // Rayon de la Terre en km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export async function POST(request: NextRequest) {
  try {
    const { from, to, mode } = await request.json() as CalculateTravelTimeRequest

    if (!from || !to || !from.lat || !from.lng || !to.lat || !to.lng) {
      return NextResponse.json(
        { error: 'Coordonnées invalides' },
        { status: 400 }
      )
    }

    console.log(`🚗 Calcul durée ${mode}:`, from, '→', to)

    // Vérifier le cache
    const cacheKey = `${from.lat},${from.lng}-${to.lat},${to.lng}-${mode}`
    const cached = cache.get(cacheKey)
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      console.log('✅ Réponse du cache')
      return NextResponse.json({
        success: true,
        ...cached.data,
        source: 'cache'
      })
    }

    let duration: number // en minutes
    let distance: number // en km

    // Pour car, bike, walk: utiliser OSRM
    if (['car', 'bike', 'walk'].includes(mode)) {
      try {
        // Mapping des modes vers les profils OSRM
        const osrmProfile = mode === 'car' ? 'car' : mode === 'bike' ? 'bike' : 'foot'
        const osrmUrl = `https://router.project-osrm.org/route/v1/${osrmProfile}/${from.lng},${from.lat};${to.lng},${to.lat}?overview=false`

        console.log('📤 Requête OSRM:', osrmUrl)

        const response = await fetch(osrmUrl, {
          headers: {
            'User-Agent': 'CerdiaVoyageApp/1.0'
          }
        })

        if (!response.ok) {
          throw new Error(`OSRM API error: ${response.status}`)
        }

        const data = await response.json()

        if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
          throw new Error('Pas de route trouvée')
        }

        const route = data.routes[0]
        duration = Math.round(route.duration / 60) // secondes → minutes
        distance = Math.round(route.distance / 1000 * 10) / 10 // mètres → km
        console.log(`✅ OSRM: ${distance}km, ${duration}min`)
      } catch (error) {
        console.warn('⚠️ OSRM échoué, utilisation estimation:', error)
        // Fallback: estimation simple
        distance = haversineDistance(from.lat, from.lng, to.lat, to.lng)
        const speed = AVERAGE_SPEEDS[mode]
        duration = Math.round((distance / speed) * 60)
      }
    } else {
      // Pour plane, train, bus: estimation basée sur distance à vol d'oiseau
      distance = haversineDistance(from.lat, from.lng, to.lat, to.lng)
      const speed = AVERAGE_SPEEDS[mode]
      duration = Math.round((distance / speed) * 60)

      // Pour les vols, ajouter du temps pour l'embarquement et débarquement
      if (mode === 'plane') {
        duration += 60 // +1h pour embarquement/débarquement/taxi
      }

      console.log(`📏 Estimation ${mode}: ${distance}km, ${duration}min`)
    }

    const result = {
      duration, // minutes
      distance, // km
      mode,
      from,
      to
    }

    // Mettre en cache
    cache.set(cacheKey, { data: result, timestamp: Date.now() })

    // Nettoyer le cache (supprimer les entrées > 1 heure)
    Array.from(cache.entries()).forEach(([key, value]) => {
      if (Date.now() - value.timestamp > 60 * 60 * 1000) {
        cache.delete(key)
      }
    })

    return NextResponse.json({
      success: true,
      ...result,
      source: 'osrm'
    })

  } catch (error: any) {
    console.error('🔴 Erreur calculate-travel-time:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Erreur lors du calcul du temps de trajet'
      },
      { status: 500 }
    )
  }
}
