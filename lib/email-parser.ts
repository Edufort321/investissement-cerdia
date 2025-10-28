/**
 * Email Parser Service - Parse les confirmations de voyage depuis emails
 * Supporte: Vols, Hôtels, Locations de voiture, Activités
 */

export interface ParsedBooking {
  type: 'flight' | 'hotel' | 'car_rental' | 'activity'
  title: string
  date: string
  dateEnd?: string
  time?: string
  location?: string
  price?: number
  currency?: string
  confirmationNumber?: string
  provider?: string
  details: {
    flightNumber?: string
    airline?: string
    departureCity?: string
    arrivalCity?: string
    departureTime?: string
    arrivalTime?: string
    hotelName?: string
    checkInDate?: string
    checkOutDate?: string
    address?: string
    carType?: string
    pickupLocation?: string
    dropoffLocation?: string
    activityName?: string
    participants?: number
  }
  rawEmail?: string
}

/**
 * Airlines patterns for flight detection
 */
const AIRLINES = [
  'Air Canada', 'WestJet', 'Air France', 'British Airways', 'Lufthansa',
  'American Airlines', 'United Airlines', 'Delta', 'Emirates', 'Qatar Airways',
  'KLM', 'Swiss', 'Turkish Airlines', 'Air Transat', 'Porter Airlines'
]

const AIRLINE_REGEX = new RegExp(`(${AIRLINES.join('|')})`, 'i')

/**
 * Hotel chains patterns
 */
const HOTEL_CHAINS = [
  'Marriott', 'Hilton', 'Hyatt', 'Sheraton', 'Holiday Inn', 'Best Western',
  'Radisson', 'Fairmont', 'Four Seasons', 'Ritz-Carlton', 'InterContinental',
  'Novotel', 'Ibis', 'Accor', 'Sofitel', 'Airbnb', 'Booking.com', 'Hotels.com'
]

const HOTEL_REGEX = new RegExp(`(${HOTEL_CHAINS.join('|')})`, 'i')

/**
 * Car rental companies
 */
const CAR_RENTAL_COMPANIES = [
  'Hertz', 'Avis', 'Enterprise', 'Budget', 'National', 'Alamo',
  'Europcar', 'Sixt', 'Thrifty', 'Dollar'
]

const CAR_RENTAL_REGEX = new RegExp(`(${CAR_RENTAL_COMPANIES.join('|')})`, 'i')

/**
 * Détecte le type de réservation
 */
export function detectBookingType(subject: string, body: string): 'flight' | 'hotel' | 'car_rental' | 'activity' | null {
  const text = (subject + ' ' + body).toLowerCase()

  // Flight keywords
  if (
    text.match(/flight\s*(confirmation|booking|itinerary)/i) ||
    text.match(/vol\s*(confirmation|r[ée]servation)/i) ||
    AIRLINE_REGEX.test(text) ||
    text.includes('boarding pass') ||
    text.includes('carte d\'embarquement')
  ) {
    return 'flight'
  }

  // Hotel keywords
  if (
    text.match(/hotel\s*(confirmation|booking|reservation)/i) ||
    text.match(/h[ôo]tel\s*(confirmation|r[ée]servation)/i) ||
    HOTEL_REGEX.test(text) ||
    text.includes('check-in') ||
    text.includes('check-out')
  ) {
    return 'hotel'
  }

  // Car rental keywords
  if (
    text.match(/car\s*rental/i) ||
    text.match(/location\s*de\s*voiture/i) ||
    CAR_RENTAL_REGEX.test(text) ||
    text.includes('pickup location') ||
    text.includes('lieu de prise en charge')
  ) {
    return 'car_rental'
  }

  // Activity keywords
  if (
    text.match(/tour\s*(confirmation|booking)/i) ||
    text.match(/activity\s*(confirmation|booking)/i) ||
    text.match(/excursion\s*(confirmation|r[ée]servation)/i) ||
    text.includes('ticket') ||
    text.includes('billet')
  ) {
    return 'activity'
  }

  return null
}

/**
 * Parse un email de confirmation de vol
 */
export function parseFlightEmail(subject: string, body: string): ParsedBooking | null {
  const flightNumberMatch = body.match(/(?:flight|vol)\s*(?:number|num[ée]ro)?[:\s]*([A-Z]{2}\s*\d{3,4})/i)
  const airlineMatch = body.match(AIRLINE_REGEX)

  // Dates - multiple formats
  const datePatterns = [
    /(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})/i,
    /(\d{4}-\d{2}-\d{2})/,
    /(\d{2}\/\d{2}\/\d{4})/
  ]

  let dateMatch = null
  for (const pattern of datePatterns) {
    dateMatch = body.match(pattern)
    if (dateMatch) break
  }

  // Times
  const departureTimeMatch = body.match(/departure[:\s]*(\d{1,2}:\d{2})/i) ||
                             body.match(/départ[:\s]*(\d{1,2}h\d{2})/i)
  const arrivalTimeMatch = body.match(/arrival[:\s]*(\d{1,2}:\d{2})/i) ||
                           body.match(/arrivée[:\s]*(\d{1,2}h\d{2})/i)

  // Cities
  const cityPattern = /(?:from|de)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:to|[àa])\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i
  const citiesMatch = body.match(cityPattern)

  // Confirmation number
  const confirmationMatch = body.match(/(?:confirmation|booking|reference)[:\s#]*([A-Z0-9]{6,})/i) ||
                           body.match(/(?:numéro de confirmation)[:\s#]*([A-Z0-9]{6,})/i)

  // Price
  const priceMatch = body.match(/(?:total|price|prix)[:\s]*[€$£]?\s*(\d+(?:[.,]\d{2})?)\s*([€$£]?)/i)

  if (!flightNumberMatch && !airlineMatch) return null

  const flightNumber = flightNumberMatch?.[1]?.replace(/\s+/g, '')
  const airline = airlineMatch?.[1]
  const departureCity = citiesMatch?.[1]
  const arrivalCity = citiesMatch?.[2]
  const date = dateMatch?.[1] || new Date().toISOString().split('T')[0]

  return {
    type: 'flight',
    title: `Vol ${flightNumber || airline || 'Non spécifié'}`,
    date,
    time: departureTimeMatch?.[1]?.replace('h', ':'),
    location: departureCity,
    price: priceMatch ? parseFloat(priceMatch[1].replace(',', '.')) : undefined,
    currency: priceMatch?.[2] || 'CAD',
    confirmationNumber: confirmationMatch?.[1],
    provider: airline,
    details: {
      flightNumber,
      airline,
      departureCity,
      arrivalCity,
      departureTime: departureTimeMatch?.[1],
      arrivalTime: arrivalTimeMatch?.[1]
    },
    rawEmail: body
  }
}

/**
 * Parse un email de confirmation d'hôtel
 */
export function parseHotelEmail(subject: string, body: string): ParsedBooking | null {
  const hotelMatch = body.match(HOTEL_REGEX) ||
                     body.match(/(?:hotel|h[ôo]tel)[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})/i)

  // Check-in / Check-out dates
  const checkInMatch = body.match(/check[- ]?in[:\s]*(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})/i) ||
                       body.match(/check[- ]?in[:\s]*(\d{4}-\d{2}-\d{2})/i) ||
                       body.match(/arriv[ée]e[:\s]*(\d{1,2}\/\d{2}\/\d{4})/i)

  const checkOutMatch = body.match(/check[- ]?out[:\s]*(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})/i) ||
                        body.match(/check[- ]?out[:\s]*(\d{4}-\d{2}-\d{2})/i) ||
                        body.match(/d[ée]part[:\s]*(\d{1,2}\/\d{2}\/\d{4})/i)

  // Address
  const addressMatch = body.match(/address[:\s]+([^\n]{10,100})/i) ||
                       body.match(/adresse[:\s]+([^\n]{10,100})/i)

  // Confirmation number
  const confirmationMatch = body.match(/(?:confirmation|booking|r[ée]servation)[:\s#]*([A-Z0-9]{6,})/i)

  // Price
  const priceMatch = body.match(/(?:total|price|prix)[:\s]*[€$£]?\s*(\d+(?:[.,]\d{2})?)\s*([€$£]?)/i)

  if (!hotelMatch && !checkInMatch) return null

  const hotelName = hotelMatch?.[1] || 'Hôtel non spécifié'
  const checkIn = checkInMatch?.[1] || new Date().toISOString().split('T')[0]

  return {
    type: 'hotel',
    title: hotelName,
    date: checkIn,
    dateEnd: checkOutMatch?.[1],
    location: addressMatch?.[1]?.trim(),
    price: priceMatch ? parseFloat(priceMatch[1].replace(',', '.')) : undefined,
    currency: priceMatch?.[2] || 'CAD',
    confirmationNumber: confirmationMatch?.[1],
    provider: hotelMatch?.[0],
    details: {
      hotelName,
      checkInDate: checkIn,
      checkOutDate: checkOutMatch?.[1],
      address: addressMatch?.[1]?.trim()
    },
    rawEmail: body
  }
}

/**
 * Parse un email de location de voiture
 */
export function parseCarRentalEmail(subject: string, body: string): ParsedBooking | null {
  const companyMatch = body.match(CAR_RENTAL_REGEX)

  // Pickup date/time
  const pickupMatch = body.match(/pick[- ]?up[:\s]*(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})/i) ||
                      body.match(/pick[- ]?up[:\s]*(\d{4}-\d{2}-\d{2})/i) ||
                      body.match(/prise en charge[:\s]*(\d{1,2}\/\d{2}\/\d{4})/i)

  // Drop-off date
  const dropoffMatch = body.match(/drop[- ]?off[:\s]*(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})/i) ||
                       body.match(/drop[- ]?off[:\s]*(\d{4}-\d{2}-\d{2})/i) ||
                       body.match(/retour[:\s]*(\d{1,2}\/\d{2}\/\d{4})/i)

  // Locations
  const pickupLocationMatch = body.match(/pick[- ]?up\s+location[:\s]+([^\n]{10,80})/i) ||
                              body.match(/lieu\s+de\s+prise\s+en\s+charge[:\s]+([^\n]{10,80})/i)

  const dropoffLocationMatch = body.match(/drop[- ]?off\s+location[:\s]+([^\n]{10,80})/i) ||
                               body.match(/lieu\s+de\s+retour[:\s]+([^\n]{10,80})/i)

  // Car type
  const carTypeMatch = body.match(/(?:vehicle|voiture|car)[:\s]+([^\n]{5,50})/i)

  // Confirmation
  const confirmationMatch = body.match(/(?:confirmation|booking|r[ée]servation)[:\s#]*([A-Z0-9]{6,})/i)

  // Price
  const priceMatch = body.match(/(?:total|price|prix)[:\s]*[€$£]?\s*(\d+(?:[.,]\d{2})?)\s*([€$£]?)/i)

  if (!companyMatch && !pickupMatch) return null

  const pickupDate = pickupMatch?.[1] || new Date().toISOString().split('T')[0]

  return {
    type: 'car_rental',
    title: `Location ${companyMatch?.[1] || 'voiture'}`,
    date: pickupDate,
    dateEnd: dropoffMatch?.[1],
    location: pickupLocationMatch?.[1]?.trim(),
    price: priceMatch ? parseFloat(priceMatch[1].replace(',', '.')) : undefined,
    currency: priceMatch?.[2] || 'CAD',
    confirmationNumber: confirmationMatch?.[1],
    provider: companyMatch?.[1],
    details: {
      carType: carTypeMatch?.[1]?.trim(),
      pickupLocation: pickupLocationMatch?.[1]?.trim(),
      dropoffLocation: dropoffLocationMatch?.[1]?.trim()
    },
    rawEmail: body
  }
}

/**
 * Parse un email de confirmation d'activité/tour
 */
export function parseActivityEmail(subject: string, body: string): ParsedBooking | null {
  // Activity name
  const activityMatch = body.match(/(?:tour|activity|excursion)[:\s]+([^\n]{5,80})/i) ||
                        body.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,5})\s+(?:tour|visit|excursion)/i)

  // Date
  const dateMatch = body.match(/date[:\s]*(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})/i) ||
                    body.match(/date[:\s]*(\d{4}-\d{2}-\d{2})/i) ||
                    body.match(/date[:\s]*(\d{1,2}\/\d{2}\/\d{4})/i)

  // Time
  const timeMatch = body.match(/time[:\s]*(\d{1,2}:\d{2})/i) ||
                    body.match(/heure[:\s]*(\d{1,2}h\d{2})/i)

  // Location
  const locationMatch = body.match(/(?:meeting\s+point|location|lieu)[:\s]+([^\n]{10,80})/i)

  // Participants
  const participantsMatch = body.match(/(?:participants?|guests?|personnes?)[:\s]*(\d+)/i)

  // Confirmation
  const confirmationMatch = body.match(/(?:confirmation|booking|ticket)[:\s#]*([A-Z0-9]{6,})/i)

  // Price
  const priceMatch = body.match(/(?:total|price|prix)[:\s]*[€$£]?\s*(\d+(?:[.,]\d{2})?)\s*([€$£]?)/i)

  if (!activityMatch && !dateMatch) return null

  const activityName = activityMatch?.[1]?.trim() || 'Activité'
  const date = dateMatch?.[1] || new Date().toISOString().split('T')[0]

  return {
    type: 'activity',
    title: activityName,
    date,
    time: timeMatch?.[1]?.replace('h', ':'),
    location: locationMatch?.[1]?.trim(),
    price: priceMatch ? parseFloat(priceMatch[1].replace(',', '.')) : undefined,
    currency: priceMatch?.[2] || 'CAD',
    confirmationNumber: confirmationMatch?.[1],
    details: {
      activityName,
      participants: participantsMatch ? parseInt(participantsMatch[1]) : undefined
    },
    rawEmail: body
  }
}

/**
 * Parse un email et retourne la réservation détectée
 */
export function parseEmail(subject: string, body: string): ParsedBooking | null {
  const type = detectBookingType(subject, body)

  if (!type) return null

  switch (type) {
    case 'flight':
      return parseFlightEmail(subject, body)
    case 'hotel':
      return parseHotelEmail(subject, body)
    case 'car_rental':
      return parseCarRentalEmail(subject, body)
    case 'activity':
      return parseActivityEmail(subject, body)
    default:
      return null
  }
}

/**
 * Convertit une réservation parsée en Evenement
 */
export function bookingToEvent(booking: ParsedBooking, voyageId: string, devise: string) {
  const typeMap = {
    flight: 'vol',
    hotel: 'hebergement',
    car_rental: 'transport',
    activity: 'activite'
  }

  return {
    id: Date.now().toString(),
    type: typeMap[booking.type],
    titre: booking.title,
    date: booking.date,
    heureDebut: booking.time,
    lieu: booking.location,
    prix: booking.price,
    devise: booking.currency || devise,
    notes: `Numéro de confirmation: ${booking.confirmationNumber || 'N/A'}\nImporté automatiquement depuis email`,
    // Champs spécifiques
    numeroVol: booking.details.flightNumber,
    compagnie: booking.details.airline || booking.provider,
    villeDepart: booking.details.departureCity,
    villeArrivee: booking.details.arrivalCity,
    heureArrivee: booking.details.arrivalTime
  }
}
