'use client'

import React, { useState, useEffect, useRef } from 'react'
import { X, Calendar, MapPin, DollarSign, FileText, Plane, Hotel, Activity, Utensils, Train, Car, Bus, Bike, Ship, PersonStanding, Clock, Sparkles, Loader2, Camera, Upload, Star, Globe, Plus } from 'lucide-react'
import { calculateFlightDuration, formatDuration, formatOffset, extractCityKey, TIMEZONE_CITIES } from '@/lib/timezone-helper'
import { Waypoint } from '@/types/voyage'
import WaypointsManager from './WaypointsManager'

type EventType = 'transport' | 'hebergement' | 'activite' | 'restaurant'
type TransportMode = 'plane' | 'train' | 'car' | 'bus' | 'bike' | 'walk' | 'boat'

interface AddEventModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (event: {
    type: EventType
    titre: string
    date: string
    lieu: string
    adresse?: string
    villeDepart?: string
    villeArrivee?: string
    dateArrivee?: string
    heureArrivee?: string
    numeroVol?: string
    compagnie?: string
    prix?: number
    notes?: string
    transportMode?: TransportMode
    duration?: number
    fromLocation?: string
    coordinates?: { lat: number; lng: number }
    rating?: number
    heureDebut?: string
    heureFin?: string
    waypoints?: Waypoint[]
    externalLink?: string
  }) => void
  language?: string
  tripCurrency?: string
  previousLocation?: string
}

export default function AddEventModal({
  isOpen,
  onClose,
  onAdd,
  language = 'fr',
  tripCurrency = 'CAD',
  previousLocation = ''
}: AddEventModalProps) {
  const [type, setType] = useState<EventType>('activite')
  const [titre, setTitre] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [arrivalDate, setArrivalDate] = useState(new Date().toISOString().split('T')[0]) // Date d'arrivée (pour vols)
  const [lieu, setLieu] = useState('')
  const [fromLocation, setFromLocation] = useState(previousLocation)
  const [prix, setPrix] = useState('')
  const [notes, setNotes] = useState('')
  const [transportMode, setTransportMode] = useState<TransportMode | null>(null)
  const [duration, setDuration] = useState('')
  const [heureDebut, setHeureDebut] = useState('')
  const [heureFin, setHeureFin] = useState('')
  const [rating, setRating] = useState<number>(0)
  const [loadingAI, setLoadingAI] = useState(false)
  const [loadingScan, setLoadingScan] = useState(false)
  const [timezoneInfo, setTimezoneInfo] = useState<string>('') // Info timezone pour affichage
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [parkingInfo, setParkingInfo] = useState('')

  // États pour les suggestions de lieux de transport
  const [fromSuggestions, setFromSuggestions] = useState<any[]>([])
  const [toSuggestions, setToSuggestions] = useState<any[]>([])
  const [loadingFromSuggestions, setLoadingFromSuggestions] = useState(false)
  const [loadingToSuggestions, setLoadingToSuggestions] = useState(false)
  const [showFromSuggestions, setShowFromSuggestions] = useState(false)
  const [showToSuggestions, setShowToSuggestions] = useState(false)

  // États pour les suggestions d'adresses (pour tous types d'événements)
  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([])
  const [loadingLocationSuggestions, setLoadingLocationSuggestions] = useState(false)
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false)

  // État pour les waypoints (étapes/points d'intérêt)
  const [waypoints, setWaypoints] = useState<Waypoint[]>([])

  // État pour le lien externe (lien vers app/site de l'événement)
  const [externalLink, setExternalLink] = useState('')

  // État pour les pièces jointes (PDFs, billets, etc.)
  const [attachments, setAttachments] = useState<File[]>([])
  const attachmentInputRef = useRef<HTMLInputElement>(null)

  // États pour les coordonnées (utilisés pour le calcul de durée)
  const [fromCoordinates, setFromCoordinates] = useState<{ lat: number; lng: number } | null>(null)
  const [toCoordinates, setToCoordinates] = useState<{ lat: number; lng: number } | null>(null)
  const [calculatingDuration, setCalculatingDuration] = useState(false)

  useEffect(() => {
    if (previousLocation) {
      setFromLocation(previousLocation)
    }
  }, [previousLocation])

  // Calculer automatiquement la durée estimée pour les transports
  useEffect(() => {
    if (type !== 'transport' || !fromCoordinates || !toCoordinates || !transportMode) {
      return
    }

    const calculateTravelTime = async () => {
      setCalculatingDuration(true)
      try {
        const response = await fetch('/api/calculate-travel-time', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: fromCoordinates,
            to: toCoordinates,
            mode: transportMode
          })
        })

        const data = await response.json()
        if (data.success && data.duration) {
          setDuration(data.duration.toString())
          console.log(`✅ Durée calculée: ${data.duration} min (${data.distance} km)`)
        }
      } catch (error) {
        console.error('Erreur calcul durée:', error)
      } finally {
        setCalculatingDuration(false)
      }
    }

    calculateTravelTime()
  }, [fromCoordinates, toCoordinates, transportMode, type])

  // Mettre à jour automatiquement l'heure d'arrivée basée sur heure départ + durée
  useEffect(() => {
    if (type !== 'transport' || !heureDebut || !duration || !date) {
      return
    }

    try {
      const durationMinutes = parseInt(duration)
      if (isNaN(durationMinutes) || durationMinutes <= 0) {
        return
      }

      // Parser heure de départ
      const [depHour, depMin] = heureDebut.split(':').map(Number)
      const departureDate = new Date(date)
      departureDate.setHours(depHour, depMin, 0, 0)

      // Ajouter la durée
      const arrivalDate = new Date(departureDate.getTime() + durationMinutes * 60 * 1000)

      // Mettre à jour heure et date d'arrivée
      const arrHour = arrivalDate.getHours().toString().padStart(2, '0')
      const arrMin = arrivalDate.getMinutes().toString().padStart(2, '0')
      setHeureFin(`${arrHour}:${arrMin}`)

      // Si l'arrivée est un autre jour
      const arrDateStr = arrivalDate.toISOString().split('T')[0]
      if (arrDateStr !== date) {
        setArrivalDate(arrDateStr)
      } else {
        setArrivalDate(date)
      }

      console.log(`🕐 Heure d'arrivée mise à jour: ${arrHour}:${arrMin} (${arrDateStr})`)
    } catch (error) {
      console.error('Erreur calcul heure d\'arrivée:', error)
    }
  }, [heureDebut, duration, date, type])

  // Synchroniser la date d'arrivée avec la date de départ (par défaut)
  useEffect(() => {
    if (type === 'transport' && date) {
      // Si pas d'heures définies, ou si l'arrivée est très différente, synchroniser avec la date de départ
      if (!heureDebut || !heureFin) {
        setArrivalDate(date)
      }
    }
  }, [type, date, heureDebut, heureFin])

  // Ajustement automatique de la date d'arrivée pour les vols (basé sur les heures)
  useEffect(() => {
    if (type === 'transport' && transportMode === 'plane' && heureDebut && heureFin && date) {
      // Si l'heure d'arrivée est plus tôt que l'heure de départ, on assume que c'est le lendemain
      const [depHour, depMin] = heureDebut.split(':').map(Number)
      const [arrHour, arrMin] = heureFin.split(':').map(Number)

      const depMinutes = depHour * 60 + depMin
      const arrMinutes = arrHour * 60 + arrMin

      if (arrMinutes < depMinutes) {
        // Vol arrive le lendemain
        const departureDate = new Date(date)
        departureDate.setDate(departureDate.getDate() + 1)
        const nextDay = departureDate.toISOString().split('T')[0]
        if (arrivalDate !== nextDay) {
          setArrivalDate(nextDay)
        }
      } else {
        // Vol arrive le même jour
        if (arrivalDate !== date) {
          setArrivalDate(date)
        }
      }
    }
  }, [type, transportMode, heureDebut, heureFin, date])

  // Calcul automatique de la durée à partir des heures de début et fin
  // avec gestion du décalage horaire pour les vols
  useEffect(() => {
    if (!heureDebut || !heureFin) {
      setTimezoneInfo('')
      return
    }

    // Pour les vols en avion, utiliser le calcul avec timezone
    if (type === 'transport' && transportMode === 'plane' && fromLocation && lieu) {
      try {
        const departureCity = extractCityKey(fromLocation)
        const arrivalCity = extractCityKey(lieu)

        if (departureCity && arrivalCity) {
          const result = calculateFlightDuration(
            date,
            heureDebut,
            departureCity,
            arrivalDate,
            heureFin,
            arrivalCity
          )

          if (result) {
            setDuration(result.durationMinutes.toString())

            // Afficher les informations de timezone
            const info = `${result.timezoneInfo.departure.city} ${formatOffset(result.timezoneInfo.departure.offset)} → ${result.timezoneInfo.arrival.city} ${formatOffset(result.timezoneInfo.arrival.offset)}`
            setTimezoneInfo(info)
            return
          }
        }
      } catch (error) {
        console.error('Erreur calcul durée avec timezone:', error)
      }
    }

    // Calcul simple sans timezone (pour les autres cas)
    try {
      setTimezoneInfo('')

      const [startHour, startMin] = heureDebut.split(':').map(Number)
      const [endHour, endMin] = heureFin.split(':').map(Number)

      // Calculer la différence en minutes en tenant compte de la date
      const startDate = new Date(date + 'T' + heureDebut)
      const endDate = new Date(arrivalDate + 'T' + heureFin)

      const totalMinutes = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60))

      if (totalMinutes >= 0) {
        setDuration(totalMinutes.toString())
      }
    } catch (error) {
      console.error('Erreur calcul durée:', error)
    }
  }, [heureDebut, heureFin, date, arrivalDate, type, transportMode, fromLocation, lieu])

  // Suggestions pour le lieu de départ (transport)
  useEffect(() => {
    if (type !== 'transport' || !fromLocation || fromLocation.length < 3) {
      setFromSuggestions([])
      setShowFromSuggestions(false)
      return
    }

    console.log('🔍 Recherche de suggestions pour:', fromLocation)

    const timer = setTimeout(async () => {
      setLoadingFromSuggestions(true)
      console.log('⏳ Début de la requête API...')
      try {
        // Combiner les suggestions de POIs (aéroports, gares) + adresses personnelles
        const [poiResponse, addressResponse] = await Promise.all([
          fetch('/api/ai/suggest-location', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              location: fromLocation,
              transportMode: transportMode || 'plane',
              language
            })
          }),
          fetch('/api/geocode-autocomplete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: fromLocation,
              language,
              limit: 3
            })
          })
        ])

        const poiData = await poiResponse.json()
        const addressData = await addressResponse.json()

        console.log('📊 POI Data:', poiData)
        console.log('📊 Address Data:', addressData)

        // Combiner les résultats (POIs en premier, puis adresses personnelles)
        const combined = []

        if (poiData.success && poiData.suggestions) {
          combined.push(...poiData.suggestions.map((s: any) => ({ ...s, source: 'poi' })))
        }

        if (addressData.success && addressData.results) {
          combined.push(...addressData.results.map((r: any) => ({
            name: r.shortName,
            description: r.fullAddress,
            type: 'address',
            source: 'geocode',
            coordinates: r.coordinates
          })))
        }

        console.log(`✅ ${combined.length} suggestions combinées trouvées (POIs + adresses)`)
        setFromSuggestions(combined)
        setShowFromSuggestions(combined.length > 0)
      } catch (error) {
        console.error('❌ Erreur suggestions départ:', error)
      } finally {
        setLoadingFromSuggestions(false)
        console.log('✔️ Requête terminée')
      }
    }, 500) // Délai de 500ms pour éviter trop de requêtes

    return () => clearTimeout(timer)
  }, [fromLocation, type, transportMode, language])

  // Suggestions pour le lieu d'arrivée (transport)
  useEffect(() => {
    if (type !== 'transport' || !lieu || lieu.length < 3) {
      setToSuggestions([])
      setShowToSuggestions(false)
      return
    }

    const timer = setTimeout(async () => {
      setLoadingToSuggestions(true)
      try {
        // Combiner les suggestions de POIs (aéroports, gares) + adresses
        const [poiResponse, addressResponse] = await Promise.all([
          fetch('/api/ai/suggest-location', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              location: lieu,
              transportMode: transportMode || 'plane',
              language
            })
          }),
          fetch('/api/geocode-autocomplete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: lieu,
              language,
              limit: 3
            })
          })
        ])

        const poiData = await poiResponse.json()
        const addressData = await addressResponse.json()

        // Combiner les résultats (POIs en premier, puis adresses)
        const combined = []

        if (poiData.success && poiData.suggestions) {
          combined.push(...poiData.suggestions.map((s: any) => ({ ...s, source: 'poi' })))
        }

        if (addressData.success && addressData.results) {
          combined.push(...addressData.results.map((r: any) => ({
            name: r.shortName,
            description: r.fullAddress,
            type: 'address',
            source: 'geocode',
            coordinates: r.coordinates
          })))
        }

        setToSuggestions(combined)
        setShowToSuggestions(combined.length > 0)
      } catch (error) {
        console.error('Erreur suggestions arrivée:', error)
      } finally {
        setLoadingToSuggestions(false)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [lieu, type, transportMode, language])

  // Suggestions d'adresses pour événements non-transport (hotel, activity, restaurant)
  useEffect(() => {
    if (type === 'transport' || !lieu || lieu.length < 3) {
      setLocationSuggestions([])
      setShowLocationSuggestions(false)
      return
    }

    const timer = setTimeout(async () => {
      setLoadingLocationSuggestions(true)
      try {
        const response = await fetch('/api/geocode-autocomplete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: lieu,
            language,
            limit: 5
          })
        })

        const data = await response.json()
        if (data.success && data.results) {
          setLocationSuggestions(data.results)
          setShowLocationSuggestions(data.results.length > 0)
        }
      } catch (error) {
        console.error('Erreur suggestions lieu:', error)
      } finally {
        setLoadingLocationSuggestions(false)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [lieu, type, language])

  const t = (key: string) => {
    const translations: Record<string, { fr: string; en: string }> = {
      'event.title': { fr: 'Ajouter un événement', en: 'Add Event' },
      'event.type': { fr: 'Type d\'événement', en: 'Event Type' },
      'event.type.transport': { fr: 'Transport', en: 'Transport' },
      'event.type.hotel': { fr: 'Hébergement', en: 'Accommodation' },
      'event.type.activity': { fr: 'Activité', en: 'Activity' },
      'event.type.restaurant': { fr: 'Restaurant', en: 'Restaurant' },
      'event.name': { fr: 'Nom', en: 'Name' },
      'event.namePlaceholder': { fr: 'Ex: Vol Paris-Tokyo', en: 'Ex: Flight Paris-Tokyo' },
      'event.date': { fr: 'Date', en: 'Date' },
      'event.fromLocation': { fr: 'De', en: 'From' },
      'event.toLocation': { fr: 'Vers', en: 'To' },
      'event.location': { fr: 'Lieu', en: 'Location' },
      'event.locationPlaceholder': { fr: 'Ex: Paris, France', en: 'Ex: Paris, France' },
      'event.transportMode': { fr: 'Moyen de transport', en: 'Transport Mode' },
      'event.transport.plane': { fr: 'Avion', en: 'Plane' },
      'event.transport.train': { fr: 'Train', en: 'Train' },
      'event.transport.car': { fr: 'Voiture', en: 'Car' },
      'event.transport.bus': { fr: 'Bus', en: 'Bus' },
      'event.transport.bike': { fr: 'Vélo', en: 'Bike' },
      'event.transport.walk': { fr: 'À pied', en: 'Walk' },
      'event.transport.boat': { fr: 'Bateau', en: 'Boat' },
      'event.duration': { fr: 'Durée (minutes)', en: 'Duration (minutes)' },
      'event.price': { fr: 'Prix', en: 'Price' },
      'event.rating': { fr: 'Évaluation', en: 'Rating' },
      'event.ratingDesc': { fr: 'Notez votre expérience (optionnel)', en: 'Rate your experience (optional)' },
      'event.notes': { fr: 'Notes', en: 'Notes' },
      'event.notesPlaceholder': { fr: 'Informations supplémentaires...', en: 'Additional information...' },
      'event.externalLink': { fr: 'Lien de l\'événement', en: 'Event Link' },
      'event.externalLinkPlaceholder': { fr: 'Ex: lien de réservation, billetterie, site web...', en: 'Ex: booking link, ticketing, website...' },
      'event.attachments': { fr: 'Pièces jointes', en: 'Attachments' },
      'event.attachmentsDesc': { fr: 'PDFs, billets, confirmations...', en: 'PDFs, tickets, confirmations...' },
      'event.addAttachment': { fr: 'Ajouter un fichier', en: 'Add file' },
      'event.removeAttachment': { fr: 'Retirer', en: 'Remove' },
      'event.aiSuggest': { fr: 'Suggestions IA', en: 'AI Suggestions' },
      'event.add': { fr: 'Ajouter', en: 'Add' },
      'event.cancel': { fr: 'Annuler', en: 'Cancel' }
    }
    return translations[key]?.[language as 'fr' | 'en'] || key
  }

  const eventTypes = [
    { id: 'transport' as EventType, icon: Plane, label: t('event.type.transport') },
    { id: 'hebergement' as EventType, icon: Hotel, label: t('event.type.hotel') },
    { id: 'activite' as EventType, icon: Activity, label: t('event.type.activity') },
    { id: 'restaurant' as EventType, icon: Utensils, label: t('event.type.restaurant') }
  ]

  const transportModes = [
    { id: 'plane' as TransportMode, icon: Plane, label: t('event.transport.plane') },
    { id: 'train' as TransportMode, icon: Train, label: t('event.transport.train') },
    { id: 'car' as TransportMode, icon: Car, label: t('event.transport.car') },
    { id: 'bus' as TransportMode, icon: Bus, label: t('event.transport.bus') },
    { id: 'bike' as TransportMode, icon: Bike, label: t('event.transport.bike') },
    { id: 'walk' as TransportMode, icon: PersonStanding, label: t('event.transport.walk') },
    { id: 'boat' as TransportMode, icon: Ship, label: t('event.transport.boat') }
  ]

  const handleGetAISuggestions = async () => {
    if (!fromLocation || !lieu) {
      alert(language === 'fr' ? 'Veuillez entrer les lieux de départ et d\'arrivée' : 'Please enter from and to locations')
      return
    }

    setLoadingAI(true)
    try {
      const response = await fetch('/api/ai/transport-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: fromLocation,
          to: lieu,
          language
        })
      })

      const data = await response.json()
      if (data.success && data.suggestions) {
        // Auto-fill with best suggestion
        const best = data.suggestions[0]
        setTransportMode(best.mode)
        setDuration(best.duration.toString())
        if (best.estimatedPrice) {
          setPrix(best.estimatedPrice.toString())
        }
        alert(language === 'fr'
          ? `Suggestion: ${best.mode} - ${best.duration} min${best.estimatedPrice ? ` - ${best.estimatedPrice} ${tripCurrency}` : ''}`
          : `Suggestion: ${best.mode} - ${best.duration} min${best.estimatedPrice ? ` - ${best.estimatedPrice} ${tripCurrency}` : ''}`)
      }
    } catch (error) {
      console.error('Erreur suggestions IA:', error)
    } finally {
      setLoadingAI(false)
    }
  }

  const geocodeLocation = async (location: string): Promise<{ lat: number; lng: number } | null> => {
    try {
      const response = await fetch(`/api/geocode?address=${encodeURIComponent(location)}`)
      const data = await response.json()
      if (data.success && data.coordinates) {
        return data.coordinates
      }
    } catch (error) {
      console.error('Erreur géocodage:', error)
    }
    return null
  }

  const handleScanReceipt = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Vérifier que c'est une image
    if (!file.type.startsWith('image/')) {
      alert(language === 'fr' ? 'Veuillez sélectionner une image' : 'Please select an image')
      return
    }

    setLoadingScan(true)
    try {
      // Convertir l'image en base64
      const reader = new FileReader()
      reader.onloadend = async () => {
        const base64String = reader.result as string

        // Envoyer à l'API OCR
        const response = await fetch('/api/ai/scan-receipt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: base64String,
            language
          })
        })

        const data = await response.json()

        if (data.success && data.receipt) {
          const receipt = data.receipt

          // Remplir automatiquement les champs du formulaire
          if (receipt.nom) setTitre(receipt.nom)
          if (receipt.montant) setPrix(receipt.montant.toString())
          if (receipt.date) setDate(receipt.date)
          if (receipt.notes) setNotes(receipt.notes)

          // Définir le type selon la catégorie
          if (receipt.categorie === 'restaurant') setType('restaurant')
          else if (receipt.categorie === 'hotel' || receipt.categorie === 'hebergement') setType('hebergement')
          else if (receipt.categorie === 'transport') setType('transport')
          else if (receipt.categorie === 'activite' || receipt.categorie === 'activity') setType('activite')

          // Ajouter les items dans les notes si présents
          if (receipt.items && receipt.items.length > 0) {
            const itemsText = '\n\nArticles: ' + receipt.items.join(', ')
            setNotes((prev) => (prev ? prev + itemsText : itemsText.trim()))
          }

          alert(language === 'fr'
            ? `✅ Facture scannée avec succès!\nMontant: ${receipt.montant} ${receipt.devise || tripCurrency}`
            : `✅ Receipt scanned successfully!\nAmount: ${receipt.montant} ${receipt.devise || tripCurrency}`
          )
        } else {
          throw new Error(data.error || 'Erreur inconnue')
        }
      }
      reader.readAsDataURL(file)
    } catch (error: any) {
      console.error('Erreur scan facture:', error)
      alert(
        language === 'fr'
          ? `❌ Erreur lors du scan: ${error.message}`
          : `❌ Scan error: ${error.message}`
      )
    } finally {
      setLoadingScan(false)
      // Réinitialiser l'input file pour permettre de rescanner la même image
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleAddAttachments = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    const newFiles = Array.from(files)
    setAttachments(prev => [...prev, ...newFiles])

    // Reset input to allow re-selecting the same file
    if (attachmentInputRef.current) {
      attachmentInputRef.current.value = ''
    }
  }

  const handleRemoveAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!titre.trim()) {
      alert(language === 'fr' ? 'Veuillez entrer un nom' : 'Please enter a name')
      return
    }

    // Obtenir les coordonnées du lieu
    const coordinates = await geocodeLocation(lieu.trim())

    // Construire les notes avec info de stationnement si applicable
    let finalNotes = notes.trim()
    if (transportMode === 'car' && parkingInfo.trim()) {
      const parkingNote = language === 'fr'
        ? `🅿️ Stationnement: ${parkingInfo.trim()}`
        : `🅿️ Parking: ${parkingInfo.trim()}`
      finalNotes = finalNotes ? `${finalNotes}\n\n${parkingNote}` : parkingNote
    }

    onAdd({
      type,
      titre: titre.trim(),
      date,
      lieu: lieu.trim(),
      adresse: lieu.trim(), // Adresse complète
      villeDepart: type === 'transport' ? fromLocation.trim() || undefined : undefined,
      villeArrivee: type === 'transport' ? lieu.trim() || undefined : undefined,
      dateArrivee: type === 'transport' && transportMode === 'plane' ? arrivalDate : undefined,
      heureArrivee: type === 'transport' ? heureFin || undefined : undefined,
      numeroVol: undefined, // TODO: Ajouter champ dans le formulaire
      compagnie: undefined, // TODO: Ajouter champ dans le formulaire
      prix: prix ? parseFloat(prix) : undefined,
      notes: finalNotes || undefined,
      transportMode: type === 'transport' ? transportMode || undefined : undefined,
      duration: duration ? parseInt(duration) : undefined,
      fromLocation: type === 'transport' ? fromLocation.trim() || undefined : undefined,
      coordinates: coordinates || undefined,
      rating: rating > 0 ? rating : undefined,
      heureDebut: heureDebut || undefined,
      heureFin: heureFin || undefined,
      waypoints: waypoints.length > 0 ? waypoints : undefined,
      externalLink: externalLink.trim() || undefined
    })

    // Reset form
    resetForm()
  }

  const resetForm = () => {
    setTitre('')
    setDate(new Date().toISOString().split('T')[0])
    setArrivalDate(new Date().toISOString().split('T')[0])
    setLieu('')
    setFromLocation(previousLocation)
    setPrix('')
    setNotes('')
    setTransportMode(null)
    setDuration('')
    setHeureDebut('')
    setHeureFin('')
    setRating(0)
    setTimezoneInfo('')
    setParkingInfo('')
    setWaypoints([])
    setExternalLink('')
    setAttachments([])
    setType('activite')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {t('event.title')}
          </h2>
          <button
            onClick={() => { resetForm(); onClose(); }}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
          >
            <X className="w-6 h-6 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Scanner de facture */}
        <div className="px-6 pt-6">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleScanReceipt}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={loadingScan}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-white px-6 py-4 rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-3 font-semibold group"
          >
            {loadingScan ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {language === 'fr' ? 'Analyse en cours...' : 'Analyzing...'}
              </>
            ) : (
              <>
                <Camera className="w-5 h-5 group-hover:scale-110 transition-transform" />
                {language === 'fr' ? '📸 Scanner une facture' : '📸 Scan a receipt'}
                <Sparkles className="w-4 h-4 text-yellow-300" />
              </>
            )}
          </button>
          <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-2">
            {language === 'fr'
              ? 'Prenez une photo de votre facture pour remplir automatiquement les champs'
              : 'Take a photo of your receipt to automatically fill in the fields'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Type Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              {t('event.type')}
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {eventTypes.map((eventType) => {
                const Icon = eventType.icon
                const isSelected = type === eventType.id
                return (
                  <button
                    key={eventType.id}
                    type="button"
                    onClick={() => setType(eventType.id)}
                    className={`p-4 border-2 rounded-xl transition-all ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                        : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                    }`}
                  >
                    <Icon className={`w-6 h-6 mx-auto mb-2 ${
                      isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-600 dark:text-gray-400'
                    }`} />
                    <span className={`text-sm font-medium ${
                      isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-300'
                    }`}>
                      {eventType.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Transport Mode (only for transport type) */}
          {type === 'transport' && (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  {t('event.transportMode')}
                </label>
                <div className="grid grid-cols-4 md:grid-cols-7 gap-2">
                  {transportModes.map((mode) => {
                    const Icon = mode.icon
                    const isSelected = transportMode === mode.id
                    return (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => setTransportMode(mode.id)}
                        className={`p-3 border-2 rounded-lg transition-all ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-300 dark:border-gray-600'
                        }`}
                        title={mode.label}
                      >
                        <Icon className={`w-5 h-5 mx-auto ${
                          isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'
                        }`} />
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* From/To Locations */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* From Location with Autocomplete */}
                <div className="relative">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {t('event.fromLocation')}
                  </label>
                  <input
                    type="text"
                    value={fromLocation}
                    onChange={(e) => setFromLocation(e.target.value)}
                    onFocus={() => fromSuggestions.length > 0 && setShowFromSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowFromSuggestions(false), 200)}
                    placeholder={t('event.locationPlaceholder')}
                    className="w-full bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg px-4 py-3 border border-gray-300 dark:border-gray-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                  {loadingFromSuggestions && (
                    <div className="absolute right-3 top-11 text-gray-400">
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </div>
                  )}
                  {/* Suggestions Dropdown */}
                  {showFromSuggestions && fromSuggestions.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {fromSuggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => {
                            setFromLocation(suggestion.code ? `${suggestion.name} (${suggestion.code})` : suggestion.name)
                            // Sauvegarder les coordonnées pour le calcul de durée
                            if (suggestion.coordinates) {
                              setFromCoordinates(suggestion.coordinates)
                            }
                            setShowFromSuggestions(false)
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition border-b border-gray-200 dark:border-gray-700 last:border-b-0"
                        >
                          <div className="flex items-start gap-2">
                            <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                                {suggestion.name}
                                {suggestion.code && (
                                  <span className="ml-2 text-indigo-600 dark:text-indigo-400 font-mono">
                                    {suggestion.code}
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                                {suggestion.description}
                                {suggestion.distance && ` • ${suggestion.distance}`}
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* To Location with Autocomplete */}
                <div className="relative">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {t('event.toLocation')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={lieu}
                    onChange={(e) => setLieu(e.target.value)}
                    onFocus={() => toSuggestions.length > 0 && setShowToSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowToSuggestions(false), 200)}
                    placeholder={t('event.locationPlaceholder')}
                    className="w-full bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg px-4 py-3 border border-gray-300 dark:border-gray-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    required
                  />
                  {loadingToSuggestions && (
                    <div className="absolute right-3 top-11 text-gray-400">
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </div>
                  )}
                  {/* Suggestions Dropdown */}
                  {showToSuggestions && toSuggestions.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {toSuggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => {
                            setLieu(suggestion.code ? `${suggestion.name} (${suggestion.code})` : suggestion.name)
                            // Sauvegarder les coordonnées pour le calcul de durée
                            if (suggestion.coordinates) {
                              setToCoordinates(suggestion.coordinates)
                            }
                            setShowToSuggestions(false)
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition border-b border-gray-200 dark:border-gray-700 last:border-b-0"
                        >
                          <div className="flex items-start gap-2">
                            <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                                {suggestion.name}
                                {suggestion.code && (
                                  <span className="ml-2 text-indigo-600 dark:text-indigo-400 font-mono">
                                    {suggestion.code}
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                                {suggestion.description}
                                {suggestion.distance && ` • ${suggestion.distance}`}
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* AI Suggestions Button */}
              {fromLocation && lieu && (
                <button
                  type="button"
                  onClick={handleGetAISuggestions}
                  disabled={loadingAI}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/30 transition font-semibold disabled:opacity-50"
                >
                  {loadingAI ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {language === 'fr' ? 'Chargement...' : 'Loading...'}
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      {t('event.aiSuggest')}
                    </>
                  )}
                </button>
              )}

              {/* Départ: Heure + Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Heure de départ */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {language === 'fr' ? 'Heure de départ' : 'Departure Time'}
                  </label>
                  <input
                    type="time"
                    value={heureDebut}
                    onChange={(e) => setHeureDebut(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg px-4 py-3 border border-gray-300 dark:border-gray-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                {/* Date de départ */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {language === 'fr' ? 'Date de départ' : 'Departure Date'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg px-4 py-3 border border-gray-300 dark:border-gray-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Arrivée: Heure + Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Heure d'arrivée */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {language === 'fr' ? 'Heure d\'arrivée' : 'Arrival Time'}
                  </label>
                  <input
                    type="time"
                    value={heureFin}
                    onChange={(e) => setHeureFin(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg px-4 py-3 border border-gray-300 dark:border-gray-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                {/* Date d'arrivée (auto-calculée pour avion) */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {language === 'fr' ? 'Date d\'arrivée' : 'Arrival Date'}
                  </label>
                  <input
                    type="date"
                    value={arrivalDate}
                    onChange={(e) => setArrivalDate(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg px-4 py-3 border border-gray-300 dark:border-gray-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                  {transportMode === 'plane' && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {language === 'fr'
                        ? '✨ Ajustée automatiquement selon heures'
                        : '✨ Auto-adjusted based on times'}
                    </p>
                  )}
                </div>
              </div>

              {/* Calculated Duration Display with Timezone Info */}
              {duration && heureDebut && heureFin && (
                <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 border-2 border-indigo-200 dark:border-indigo-800 rounded-lg px-4 py-4">
                  <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 mb-2">
                    <Clock className="w-5 h-5" />
                    <span className="font-semibold">
                      {language === 'fr' ? 'Durée calculée:' : 'Calculated duration:'}
                    </span>
                    <span className="text-lg font-bold">
                      {formatDuration(parseInt(duration))}
                    </span>
                    <span className="text-sm opacity-75">
                      ({duration} min)
                    </span>
                  </div>
                  {timezoneInfo && (
                    <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 mt-2 bg-white/50 dark:bg-gray-800/50 rounded px-3 py-2">
                      <Globe className="w-4 h-4" />
                      <span className="font-medium">{timezoneInfo}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Parking Info (for car transport) */}
              {transportMode === 'car' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {language === 'fr' ? '🅿️ Stationnement' : '🅿️ Parking'}
                  </label>
                  <textarea
                    value={parkingInfo}
                    onChange={(e) => setParkingInfo(e.target.value)}
                    placeholder={language === 'fr' ? 'Ex: Stationnement public rue Saint-Jean, 5$/heure' : 'Ex: Public parking on Saint-Jean street, $5/hour'}
                    rows={2}
                    className="w-full bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg px-4 py-3 border border-gray-300 dark:border-gray-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {language === 'fr'
                      ? '💡 Lieu de stationnement, coût, instructions'
                      : '💡 Parking location, cost, instructions'}
                  </p>
                </div>
              )}
            </>
          )}

          {/* Event Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              {t('event.name')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
              placeholder={t('event.namePlaceholder')}
              className="w-full bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg px-4 py-3 border border-gray-300 dark:border-gray-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              required
            />
          </div>

          {/* Date and Location (for non-transport ONLY) */}
          {type !== 'transport' && (
            <>
              {/* Pour hébergement: Date d'arrivée et Date de départ */}
              {type === 'hebergement' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {language === 'fr' ? 'Date d\'arrivée (Check-in)' : 'Check-in Date'}
                    </label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg px-4 py-3 border border-gray-300 dark:border-gray-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {language === 'fr' ? 'Date de départ (Check-out)' : 'Check-out Date'}
                    </label>
                    <input
                      type="date"
                      value={arrivalDate}
                      onChange={(e) => setArrivalDate(e.target.value)}
                      min={date}
                      className="w-full bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg px-4 py-3 border border-gray-300 dark:border-gray-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      required
                    />
                  </div>
                </div>
              ) : (
                /* Pour autres types: Une seule date */
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {t('event.date')}
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg px-4 py-3 border border-gray-300 dark:border-gray-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    required
                  />
                </div>
              )}
              <div className="relative">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  {t('event.location')}
                </label>
                <input
                  type="text"
                  value={lieu}
                  onChange={(e) => setLieu(e.target.value)}
                  onFocus={() => locationSuggestions.length > 0 && setShowLocationSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowLocationSuggestions(false), 200)}
                  placeholder={t('event.locationPlaceholder')}
                  className="w-full bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg px-4 py-3 border border-gray-300 dark:border-gray-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                {loadingLocationSuggestions && (
                  <div className="absolute right-3 top-11 text-gray-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                )}
                {/* Suggestions Dropdown */}
                {showLocationSuggestions && locationSuggestions.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {locationSuggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => {
                          setLieu(suggestion.shortName || suggestion.name)
                          setShowLocationSuggestions(false)
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition border-b border-gray-200 dark:border-gray-700 last:border-b-0"
                      >
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                              {suggestion.shortName || suggestion.name}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                              {suggestion.fullAddress || suggestion.description}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Price */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              {t('event.price')} ({tripCurrency})
            </label>
            <input
              type="number"
              value={prix}
              onChange={(e) => setPrix(e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.01"
              className="w-full bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg px-4 py-3 border border-gray-300 dark:border-gray-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {/* Rating */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
              <Star className="w-4 h-4" />
              {t('event.rating')}
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              {t('event.ratingDesc')}
            </p>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star === rating ? 0 : star)}
                  className="transition-all hover:scale-110 focus:outline-none"
                >
                  <Star
                    className={`w-8 h-8 ${
                      star <= rating
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300 dark:text-gray-600'
                    } transition-colors`}
                  />
                </button>
              ))}
              {rating > 0 && (
                <span className="ml-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {rating}/5
                </span>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              {t('event.notes')}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('event.notesPlaceholder')}
              rows={3}
              className="w-full bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg px-4 py-3 border border-gray-300 dark:border-gray-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
            />
          </div>

          {/* Lien externe */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
              <Globe className="w-4 h-4" />
              {t('event.externalLink')}
            </label>
            <input
              type="url"
              value={externalLink}
              onChange={(e) => setExternalLink(e.target.value)}
              placeholder={t('event.externalLinkPlaceholder')}
              className="w-full bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg px-4 py-3 border border-gray-300 dark:border-gray-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {/* Pièces jointes */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              📎 {t('event.attachments')}
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              {t('event.attachmentsDesc')}
            </p>

            {/* Hidden file input */}
            <input
              ref={attachmentInputRef}
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
              onChange={handleAddAttachments}
              className="hidden"
            />

            {/* Add attachment button */}
            <button
              type="button"
              onClick={() => attachmentInputRef.current?.click()}
              className="w-full px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-indigo-500 dark:hover:border-indigo-400 transition flex items-center justify-center gap-2 text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
            >
              <Plus className="w-5 h-5" />
              {t('event.addAttachment')}
            </button>

            {/* List of attached files */}
            {attachments.length > 0 && (
              <div className="mt-3 space-y-2">
                {attachments.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                      <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                        {file.name}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                        ({(file.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveAttachment(index)}
                      className="ml-2 px-3 py-1 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition"
                    >
                      {t('event.removeAttachment')}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Waypoints / Étapes (pour activités comme promenades) */}
          {type === 'activite' && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <WaypointsManager
                waypoints={waypoints}
                onChange={setWaypoints}
                language={language}
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => { resetForm(); onClose(); }}
              className="px-6 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition font-semibold"
            >
              {t('event.cancel')}
            </button>
            <button
              type="submit"
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition font-semibold shadow-md"
            >
              {t('event.add')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
