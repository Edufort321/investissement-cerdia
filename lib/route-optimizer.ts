/**
 * Route Optimizer - Optimise l'ordre des événements d'une journée par distance
 * Utilise l'algorithme du plus proche voisin (Nearest Neighbor) pour minimiser la distance totale
 */

export interface Location {
  lat: number
  lng: number
}

export interface OptimizableEvent {
  id: string
  titre: string
  heureDebut?: string
  heureFin?: string
  lieu?: string
  adresse?: string
  coordonnees?: Location
}

export interface OptimizationResult {
  originalOrder: OptimizableEvent[]
  optimizedOrder: OptimizableEvent[]
  originalDistance: number
  optimizedDistance: number
  timeSaved: number // en minutes (estimation basée sur 50 km/h moyenne)
  distanceSaved: number // en km
  improvements: number // pourcentage d'amélioration
}

/**
 * Calcule la distance entre deux points GPS (formule de Haversine)
 * @returns Distance en kilomètres
 */
export function calculateDistance(loc1: Location, loc2: Location): number {
  const R = 6371 // Rayon de la Terre en km
  const dLat = toRad(loc2.lat - loc1.lat)
  const dLng = toRad(loc2.lng - loc1.lng)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(loc1.lat)) * Math.cos(toRad(loc2.lat)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distance = R * c

  return distance
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180)
}

/**
 * Calcule la distance totale d'un parcours
 */
export function calculateTotalDistance(events: OptimizableEvent[]): number {
  if (events.length < 2) return 0

  let totalDistance = 0
  for (let i = 0; i < events.length - 1; i++) {
    const event1 = events[i]
    const event2 = events[i + 1]

    if (event1.coordonnees && event2.coordonnees) {
      totalDistance += calculateDistance(event1.coordonnees, event2.coordonnees)
    }
  }

  return totalDistance
}

/**
 * Optimise l'ordre des événements avec l'algorithme du plus proche voisin
 * Garde les événements avec horaires fixes à leur position, optimise seulement les flexibles
 */
export function optimizeRoute(events: OptimizableEvent[]): OptimizationResult {
  // Filtrer les événements qui ont des coordonnées
  const eventsWithCoords = events.filter(e => e.coordonnees)

  if (eventsWithCoords.length < 2) {
    return {
      originalOrder: events,
      optimizedOrder: events,
      originalDistance: 0,
      optimizedDistance: 0,
      timeSaved: 0,
      distanceSaved: 0,
      improvements: 0
    }
  }

  // Séparer les événements avec horaires fixes et flexibles
  const fixedEvents: Array<{ event: OptimizableEvent, index: number }> = []
  const flexibleEvents: OptimizableEvent[] = []

  eventsWithCoords.forEach((event, index) => {
    if (event.heureDebut) {
      // Événement avec horaire fixe
      fixedEvents.push({ event, index })
    } else {
      // Événement flexible (peut être réordonné)
      flexibleEvents.push(event)
    }
  })

  // Si tous les événements ont des horaires fixes, pas d'optimisation possible
  if (flexibleEvents.length === 0) {
    const originalDistance = calculateTotalDistance(events)
    return {
      originalOrder: events,
      optimizedOrder: events,
      originalDistance,
      optimizedDistance: originalDistance,
      timeSaved: 0,
      distanceSaved: 0,
      improvements: 0
    }
  }

  // Algorithme du plus proche voisin pour les événements flexibles
  const optimizedFlexible: OptimizableEvent[] = []
  const remaining = [...flexibleEvents]

  // Commencer par le premier événement flexible
  let current = remaining.shift()!
  optimizedFlexible.push(current)

  // Trouver le plus proche voisin à chaque étape
  while (remaining.length > 0) {
    let nearestIndex = 0
    let nearestDistance = Infinity

    for (let i = 0; i < remaining.length; i++) {
      const distance = calculateDistance(
        current.coordonnees!,
        remaining[i].coordonnees!
      )

      if (distance < nearestDistance) {
        nearestDistance = distance
        nearestIndex = i
      }
    }

    current = remaining.splice(nearestIndex, 1)[0]
    optimizedFlexible.push(current)
  }

  // Réinsérer les événements optimisés avec les événements à horaires fixes
  const optimizedOrder: OptimizableEvent[] = []
  let flexibleIndex = 0

  for (let i = 0; i < events.length; i++) {
    const fixedEvent = fixedEvents.find(fe => fe.index === i)

    if (fixedEvent) {
      optimizedOrder.push(fixedEvent.event)
    } else if (flexibleIndex < optimizedFlexible.length) {
      optimizedOrder.push(optimizedFlexible[flexibleIndex])
      flexibleIndex++
    }
  }

  // Ajouter les événements restants sans coordonnées
  events.forEach(event => {
    if (!event.coordonnees && !optimizedOrder.includes(event)) {
      optimizedOrder.push(event)
    }
  })

  // Calculer les métriques
  const originalDistance = calculateTotalDistance(events)
  const optimizedDistance = calculateTotalDistance(optimizedOrder)
  const distanceSaved = originalDistance - optimizedDistance
  const timeSaved = (distanceSaved / 50) * 60 // 50 km/h moyenne = temps en minutes
  const improvements = originalDistance > 0
    ? ((distanceSaved / originalDistance) * 100)
    : 0

  return {
    originalOrder: events,
    optimizedOrder,
    originalDistance,
    optimizedDistance,
    timeSaved: Math.max(0, timeSaved),
    distanceSaved: Math.max(0, distanceSaved),
    improvements: Math.max(0, improvements)
  }
}

/**
 * Optimise uniquement les événements d'une journée spécifique
 */
export function optimizeDayRoute(
  allEvents: OptimizableEvent[],
  date: string
): OptimizationResult {
  // Filtrer les événements de cette journée
  const dayEvents = allEvents.filter(event => {
    // Ici on suppose que l'événement a une propriété date
    // Adapter selon votre modèle de données
    return true // TODO: filtrer par date
  })

  return optimizeRoute(dayEvents)
}

/**
 * Estime le temps de trajet entre deux points
 * @param distance Distance en km
 * @param mode Mode de transport ('driving' | 'walking' | 'transit')
 * @returns Temps en minutes
 */
export function estimateTravelTime(
  distance: number,
  mode: 'driving' | 'walking' | 'transit' = 'driving'
): number {
  const speeds = {
    driving: 50, // km/h en ville
    walking: 5,  // km/h
    transit: 30  // km/h (métro/bus)
  }

  const speed = speeds[mode]
  return (distance / speed) * 60 // Temps en minutes
}
