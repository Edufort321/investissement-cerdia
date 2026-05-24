'use client'

import React, { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, Tooltip } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapPin, Plane, Car, Train, Bus, Plus, Sparkles, Bike, Ship, PersonStanding, Hotel, UtensilsCrossed, CalendarDays } from 'lucide-react'
import { Evenement, Voyage } from '@/types/voyage'

// Fix pour les icônes Leaflet par défaut
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png'
})

// Fonction pour créer des icônes personnalisées basées sur le type d'événement
function createCustomIcon(type: string, transportMode?: string) {
  let emoji = '📍'
  let bgColor = '#6366f1' // indigo par défaut

  // Emojis selon le type d'événement
  if (type === 'transport' && transportMode) {
    switch (transportMode) {
      case 'plane':
        emoji = '✈️'
        bgColor = '#3b82f6' // blue
        break
      case 'train':
        emoji = '🚆'
        bgColor = '#8b5cf6' // violet
        break
      case 'car':
        emoji = '🚗'
        bgColor = '#ef4444' // red
        break
      case 'bus':
        emoji = '🚌'
        bgColor = '#f59e0b' // amber
        break
      case 'bike':
        emoji = '🚴'
        bgColor = '#10b981' // green
        break
      case 'walk':
        emoji = '🚶'
        bgColor = '#06b6d4' // cyan
        break
      case 'boat':
        emoji = '⛴️'
        bgColor = '#0ea5e9' // sky
        break
    }
  } else if (type === 'hebergement') {
    emoji = '🏨'
    bgColor = '#ec4899' // pink-500
  } else if (type === 'restaurant') {
    emoji = '🍽️'
    bgColor = '#f97316' // orange-500
  } else if (type === 'activite') {
    emoji = '🎯'
    bgColor = '#10b981' // emerald-500
  } else if (type === 'condo') {
    emoji = '🏢'
    bgColor = '#a855f7' // purple-500
  } else if (type === 'vol') {
    emoji = '✈️'
    bgColor = '#0ea5e9' // sky-500
  }

  const iconHtml = `
    <div style="
      background-color: ${bgColor};
      border-radius: 50%;
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      font-size: 18px;
    ">
      ${emoji}
    </div>
  `

  return L.divIcon({
    html: iconHtml,
    className: 'custom-marker',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18]
  })
}

interface VoyageMapProps {
  voyage: Voyage
  onAddTransport: (event: Evenement) => void
  language?: string
}

interface TransportSuggestion {
  type: 'avion' | 'train' | 'auto' | 'taxi' | 'metro' | 'bus'
  nom: string
  description: string
  duree: string
  prix: string
  disponible: boolean
  recommande: boolean
  raison: string
}

export default function VoyageMap({ voyage, onAddTransport, language = 'fr' }: VoyageMapProps) {
  const [selectedEvent, setSelectedEvent] = useState<Evenement | null>(null)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestions, setSuggestions] = useState<TransportSuggestion[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [origin, setOrigin] = useState('')
  const [destination, setDestination] = useState('')

  const t = (key: string) => {
    const translations: Record<string, { fr: string; en: string }> = {
      'map.title': { fr: 'Carte du voyage', en: 'Trip Map' },
      'map.addTransport': { fr: 'Ajouter transport', en: 'Add Transport' },
      'map.origin': { fr: 'Origine', en: 'Origin' },
      'map.destination': { fr: 'Destination', en: 'Destination' },
      'map.getSuggestions': { fr: 'Obtenir suggestions IA', en: 'Get AI Suggestions' },
      'map.loading': { fr: 'Chargement des suggestions...', en: 'Loading suggestions...' },
      'map.recommended': { fr: 'Recommandé', en: 'Recommended' },
      'map.duration': { fr: 'Durée', en: 'Duration' },
      'map.price': { fr: 'Prix estimé', en: 'Estimated Price' },
      'map.select': { fr: 'Sélectionner', en: 'Select' }
    }
    return translations[key]?.[language as 'fr' | 'en'] || key
  }

  // Extraire les événements avec coordonnées
  const [locations, setLocations] = useState<Array<{ event: Evenement; coords: [number, number] }>>([])
  const [transportRoutes, setTransportRoutes] = useState<Array<{
    from: [number, number]
    to: [number, number]
    mode: string
    duration?: number
    title: string
  }>>([])

  // Géocoder un lieu si pas de coordonnées
  const geocodeIfNeeded = async (event: Evenement): Promise<[number, number] | null> => {
    // Si l'événement a déjà des coordonnées, les utiliser
    if (event.coordonnees) {
      return [event.coordonnees.lat, event.coordonnees.lng]
    }

    // Sinon, géocoder le lieu
    if (event.lieu) {
      try {
        const response = await fetch(`/api/geocode?address=${encodeURIComponent(event.lieu)}`)
        const data = await response.json()
        if (data.success && data.coordinates) {
          return [data.coordinates.lat, data.coordinates.lng]
        }
      } catch (error) {
        console.error('Erreur géocodage:', error)
      }
    }

    return null
  }

  // Charger les coordonnées des événements au montage
  useEffect(() => {
    const loadLocations = async () => {
      const locs: Array<{ event: Evenement; coords: [number, number] }> = []
      const routes: Array<{ from: [number, number]; to: [number, number]; mode: string; duration?: number; title: string }> = []

      for (const event of voyage.evenements) {
        const coords = await geocodeIfNeeded(event)
        if (coords) {
          locs.push({ event, coords })

          // Si c'est un événement de transport, créer une route
          if (event.type === 'transport' && event.transportMode) {
            let fromCoords: [number, number] | null = null

            // Utiliser coordonneesDepart si disponible (plus fiable)
            if (event.coordonneesDepart) {
              fromCoords = [event.coordonneesDepart.lat, event.coordonneesDepart.lng]
              console.log(`🗺️ Utilisation coordonneesDepart pour "${event.titre}":`, fromCoords)
            } else if (event.fromLocation) {
              // Fallback: géocoder fromLocation si pas de coordonneesDepart
              try {
                const fromResponse = await fetch(`/api/geocode?address=${encodeURIComponent(event.fromLocation)}`)
                const fromData = await fromResponse.json()
                if (fromData.success && fromData.coordinates) {
                  fromCoords = [fromData.coordinates.lat, fromData.coordinates.lng]
                  console.log(`🗺️ Géocodage fromLocation pour "${event.titre}":`, fromCoords)
                }
              } catch (error) {
                console.error('Erreur géocodage fromLocation:', error)
              }
            }

            if (fromCoords) {
              routes.push({
                from: fromCoords,
                to: coords,
                mode: event.transportMode,
                duration: event.duration,
                title: event.titre
              })
              console.log(`✅ Route ajoutée: ${event.titre} (${event.transportMode})`)
            } else {
              console.warn(`⚠️ Impossible de créer route pour "${event.titre}": pas de coordonnées de départ`)
            }
          }
        }
      }

      setLocations(locs)
      setTransportRoutes(routes)
    }

    loadLocations()
  }, [voyage.evenements])

  // Obtenir le style de la polyline selon le mode de transport
  const getPolylineStyle = (mode: string) => {
    const styles: Record<string, { color: string; dashArray?: string; weight: number }> = {
      plane: { color: '#3b82f6', dashArray: '10, 10', weight: 3 },
      train: { color: '#8b5cf6', weight: 4 },
      car: { color: '#ef4444', weight: 3 },
      bus: { color: '#f59e0b', weight: 3 },
      bike: { color: '#10b981', weight: 2 },
      walk: { color: '#06b6d4', dashArray: '2, 6', weight: 2 },
      boat: { color: '#0ea5e9', dashArray: '5, 5', weight: 3 }
    }
    return styles[mode] || { color: '#6366f1', weight: 3 }
  }

  const handleGetSuggestions = async () => {
    if (!origin || !destination) {
      alert(language === 'fr' ? 'Veuillez remplir origine et destination' : 'Please fill in origin and destination')
      return
    }

    setLoadingSuggestions(true)
    setShowSuggestions(true)

    try {
      const response = await fetch('/api/ai/suggest-transport', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin,
          destination,
          dates: {
            debut: voyage.dateDebut,
            fin: voyage.dateFin
          }
        })
      })

      const data = await response.json()
      setSuggestions(data.suggestions || [])
    } catch (error) {
      console.error('Erreur suggestions:', error)
      alert(language === 'fr' ? 'Erreur lors de la recuperation des suggestions' : 'Error fetching suggestions')
    } finally {
      setLoadingSuggestions(false)
    }
  }

  const handleSelectTransport = (suggestion: TransportSuggestion) => {
    const newEvent: Evenement = {
      id: Date.now().toString(),
      type: 'transport',
      titre: suggestion.nom,
      date: voyage.dateDebut,
      heureDebut: '',
      heureFin: '',
      lieu: `${origin} → ${destination}`,
      prix: parseFloat(suggestion.prix.replace(/[^0-9.]/g, '')),
      devise: 'CAD',
      notes: `${suggestion.description}\n\nDurée: ${suggestion.duree}\n${suggestion.raison}`,
      transport: suggestion.type
    }

    onAddTransport(newEvent)
    setShowSuggestions(false)
    setOrigin('')
    setDestination('')
  }

  const getTransportIcon = (type: string) => {
    const icons: Record<string, any> = {
      avion: Plane,
      train: Train,
      auto: Car,
      taxi: Car,
      metro: Train,
      bus: Bus
    }
    return icons[type] || MapPin
  }

  // Centre de la carte (première location ou Montréal par défaut)
  const center: [number, number] = locations.length > 0
    ? locations[0].coords
    : [45.5017, -73.5673]

  return (
    <div className="p-3 sm:p-6 pt-20 sm:pt-24 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          {t('map.title')}
        </h1>
      </div>

      {/* Add Transport Form */}
      <div className="bg-gray-800 rounded-xl shadow-md p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-indigo-500" />
          <h3 className="text-lg font-semibold text-gray-100">
            {t('map.addTransport')}
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="text"
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            placeholder={t('map.origin')}
            className="bg-gray-700 text-gray-100 rounded-lg px-4 py-3 border border-gray-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
          <input
            type="text"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder={t('map.destination')}
            className="bg-gray-700 text-gray-100 rounded-lg px-4 py-3 border border-gray-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
          <button
            onClick={handleGetSuggestions}
            disabled={loadingSuggestions}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 text-white px-6 py-3 rounded-lg transition flex items-center justify-center gap-2"
          >
            {loadingSuggestions ? (
              <>{t('map.loading')}</>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                {t('map.getSuggestions')}
              </>
            )}
          </button>
        </div>

        {/* AI Suggestions */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="mt-6 space-y-3">
            <h4 className="text-sm font-semibold text-gray-400 uppercase">
              {language === 'fr' ? 'Suggestions IA' : 'AI Suggestions'}
            </h4>
            {suggestions.map((suggestion, i) => {
              const Icon = getTransportIcon(suggestion.type)
              return (
                <div
                  key={i}
                  className={`p-4 rounded-lg border-2 ${
                    suggestion.recommande
                      ? 'bg-indigo-900/20 border-indigo-500'
                      : 'bg-gray-700/50 border-gray-600'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        suggestion.recommande ? 'bg-indigo-500' : 'bg-gray-600'
                      }`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h5 className="font-semibold text-gray-100">{suggestion.nom}</h5>
                          {suggestion.recommande && (
                            <span className="px-2 py-0.5 bg-indigo-500 text-white text-xs rounded-full">
                              {t('map.recommended')}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-400 mb-2">{suggestion.description}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span>⏱️ {t('map.duration')}: {suggestion.duree}</span>
                          <span>💰 {t('map.price')}: {suggestion.prix}</span>
                        </div>
                        <p className="text-sm text-gray-400 mt-2 italic">{suggestion.raison}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleSelectTransport(suggestion)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition text-sm"
                    >
                      {t('map.select')}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Map */}
      <div className="bg-gray-800 rounded-xl shadow-md overflow-hidden" style={{ height: '600px' }}>
        {locations.length > 0 ? (
          <MapContainer
            center={center}
            zoom={6}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Afficher tous les événements comme marqueurs */}
            {locations.map((loc, i) => (
              <Marker
                key={`marker-${i}`}
                position={loc.coords}
                icon={createCustomIcon(loc.event.type, loc.event.transportMode)}
              >
                <Popup>
                  <div className="text-sm">
                    <strong className="text-base font-bold">{loc.event.titre}</strong>
                    {loc.event.lieu && <p className="mt-1">{loc.event.lieu}</p>}
                    <p className="text-gray-600 text-xs mt-1">
                      {new Date(loc.event.date).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                    {loc.event.prix && (
                      <p className="text-indigo-600 font-semibold mt-1">
                        {loc.event.prix} {loc.event.devise || 'CAD'}
                      </p>
                    )}
                    {loc.event.duration && (
                      <p className="text-gray-700 text-xs mt-1">
                        ⏱️ {language === 'fr' ? 'Duree' : 'Duration'}: {loc.event.duration} min
                      </p>
                    )}
                    {loc.event.notes && (
                      <p className="text-gray-500 text-xs mt-2 italic">{loc.event.notes}</p>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Dessiner les routes de transport */}
            {transportRoutes.map((route, i) => {
              const style = getPolylineStyle(route.mode)
              return (
                <Polyline
                  key={`route-${i}`}
                  positions={[route.from, route.to]}
                  pathOptions={{
                    color: style.color,
                    weight: style.weight,
                    opacity: 0.7,
                    dashArray: style.dashArray
                  }}
                >
                  <Tooltip permanent={false} direction="center">
                    <div className="text-xs">
                      <strong>{route.title}</strong>
                      {route.duration && <div>⏱️ {route.duration} min</div>}
                      <div className="capitalize">{route.mode}</div>
                    </div>
                  </Tooltip>
                </Polyline>
              )
            })}
          </MapContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-400">
            <div className="text-center">
              <MapPin className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">
                {language === 'fr'
                  ? 'Aucun événement avec localisation'
                  : 'No events with location'}
              </p>
              <p className="text-sm mt-2">
                {language === 'fr'
                  ? 'Ajoutez des événements pour les voir sur la carte'
                  : 'Add events to see them on the map'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
