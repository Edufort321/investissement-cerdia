// Helper pour gérer les décalages horaires des vols internationaux

export interface TimezoneCity {
  name: string
  offset: number // Décalage en minutes par rapport à UTC
  dstOffset?: number // Décalage en heure d'été (si applicable)
}

export const TIMEZONE_CITIES: Record<string, TimezoneCity> = {
  // Amérique du Nord
  'montreal': { name: 'Montréal', offset: -300, dstOffset: -240 }, // UTC-5 / UTC-4
  'toronto': { name: 'Toronto', offset: -300, dstOffset: -240 }, // UTC-5 / UTC-4
  'vancouver': { name: 'Vancouver', offset: -480, dstOffset: -420 }, // UTC-8 / UTC-7
  'new-york': { name: 'New York', offset: -300, dstOffset: -240 }, // UTC-5 / UTC-4
  'los-angeles': { name: 'Los Angeles', offset: -480, dstOffset: -420 }, // UTC-8 / UTC-7
  'chicago': { name: 'Chicago', offset: -360, dstOffset: -300 }, // UTC-6 / UTC-5

  // Europe
  'paris': { name: 'Paris', offset: 60, dstOffset: 120 }, // UTC+1 / UTC+2
  'london': { name: 'Londres', offset: 0, dstOffset: 60 }, // UTC+0 / UTC+1
  'madrid': { name: 'Madrid', offset: 60, dstOffset: 120 }, // UTC+1 / UTC+2
  'rome': { name: 'Rome', offset: 60, dstOffset: 120 }, // UTC+1 / UTC+2
  'berlin': { name: 'Berlin', offset: 60, dstOffset: 120 }, // UTC+1 / UTC+2

  // Asie
  'tokyo': { name: 'Tokyo', offset: 540 }, // UTC+9 (pas d'heure d'été)
  'beijing': { name: 'Beijing', offset: 480 }, // UTC+8 (pas d'heure d'été)
  'dubai': { name: 'Dubaï', offset: 240 }, // UTC+4 (pas d'heure d'été)
  'singapore': { name: 'Singapour', offset: 480 }, // UTC+8 (pas d'heure d'été)

  // Océanie
  'sydney': { name: 'Sydney', offset: 600, dstOffset: 660 }, // UTC+10 / UTC+11

  // Afrique
  'cairo': { name: 'Le Caire', offset: 120 }, // UTC+2
  'johannesburg': { name: 'Johannesburg', offset: 120 }, // UTC+2

  // Amérique du Sud
  'sao-paulo': { name: 'São Paulo', offset: -180 }, // UTC-3
  'buenos-aires': { name: 'Buenos Aires', offset: -180 }, // UTC-3
}

/**
 * Détermine si on est en période d'heure d'été pour une date donnée
 * Simplifié : Mars-Octobre pour hémisphère Nord
 */
function isDST(date: Date): boolean {
  const month = date.getMonth() + 1 // 1-12
  return month >= 3 && month <= 10
}

/**
 * Obtient le décalage actuel d'une ville en tenant compte de l'heure d'été
 */
function getCurrentOffset(city: TimezoneCity, date: Date): number {
  if (city.dstOffset && isDST(date)) {
    return city.dstOffset
  }
  return city.offset
}

/**
 * Calcule la durée réelle d'un vol en tenant compte des décalages horaires
 *
 * @param departureDate Date de départ (YYYY-MM-DD)
 * @param departureTime Heure de départ (HH:mm)
 * @param departureCityKey Clé de la ville de départ
 * @param arrivalDate Date d'arrivée (YYYY-MM-DD)
 * @param arrivalTime Heure d'arrivée (HH:mm)
 * @param arrivalCityKey Clé de la ville d'arrivée
 * @returns Durée en minutes
 */
export function calculateFlightDuration(
  departureDate: string,
  departureTime: string,
  departureCityKey: string,
  arrivalDate: string,
  arrivalTime: string,
  arrivalCityKey: string
): {
  durationMinutes: number
  departureUTC: Date
  arrivalUTC: Date
  timezoneInfo: {
    departure: { city: string; offset: number }
    arrival: { city: string; offset: number }
  }
} | null {
  const departureCity = TIMEZONE_CITIES[departureCityKey]
  const arrivalCity = TIMEZONE_CITIES[arrivalCityKey]

  if (!departureCity || !arrivalCity) {
    console.warn('Ville non trouvée pour le calcul de timezone')
    return null
  }

  // Parser les dates et heures
  const [depYear, depMonth, depDay] = departureDate.split('-').map(Number)
  const [depHour, depMin] = departureTime.split(':').map(Number)

  const [arrYear, arrMonth, arrDay] = arrivalDate.split('-').map(Number)
  const [arrHour, arrMin] = arrivalTime.split(':').map(Number)

  // Créer les objets Date en temps local
  const departureLocal = new Date(depYear, depMonth - 1, depDay, depHour, depMin)
  const arrivalLocal = new Date(arrYear, arrMonth - 1, arrDay, arrHour, arrMin)

  // Obtenir les décalages en minutes
  const departureOffset = getCurrentOffset(departureCity, departureLocal)
  const arrivalOffset = getCurrentOffset(arrivalCity, arrivalLocal)

  // Convertir en UTC
  const departureUTC = new Date(departureLocal.getTime() - departureOffset * 60 * 1000)
  const arrivalUTC = new Date(arrivalLocal.getTime() - arrivalOffset * 60 * 1000)

  // Calculer la durée en minutes
  const durationMinutes = Math.round((arrivalUTC.getTime() - departureUTC.getTime()) / (1000 * 60))

  return {
    durationMinutes,
    departureUTC,
    arrivalUTC,
    timezoneInfo: {
      departure: {
        city: departureCity.name,
        offset: departureOffset
      },
      arrival: {
        city: arrivalCity.name,
        offset: arrivalOffset
      }
    }
  }
}

/**
 * Formate une durée en heures et minutes
 */
export function formatDuration(minutes: number): string {
  if (minutes < 0) {
    return '0h 0min'
  }

  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60

  if (hours === 0) {
    return `${mins}min`
  }

  return `${hours}h ${mins}min`
}

/**
 * Formate un décalage UTC
 */
export function formatOffset(offsetMinutes: number): string {
  const sign = offsetMinutes >= 0 ? '+' : '-'
  const absMinutes = Math.abs(offsetMinutes)
  const hours = Math.floor(absMinutes / 60)
  const mins = absMinutes % 60

  if (mins === 0) {
    return `UTC${sign}${hours}`
  }

  return `UTC${sign}${hours}:${mins.toString().padStart(2, '0')}`
}

/**
 * Extrait la ville d'un code d'aéroport ou d'un nom complet
 * Ex: "Aéroport international Pierre-Elliott-Trudeau de Montréal (YUL)" -> "montreal"
 */
export function extractCityKey(locationString: string): string | null {
  const normalized = locationString.toLowerCase()

  for (const [key, city] of Object.entries(TIMEZONE_CITIES)) {
    if (normalized.includes(key) || normalized.includes(city.name.toLowerCase())) {
      return key
    }
  }

  return null
}
