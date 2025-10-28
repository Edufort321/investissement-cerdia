'use client'

import React, { useState, useEffect, useRef } from 'react'
import { X, Calendar, MapPin, DollarSign, FileText, Plane, Hotel, Activity, Utensils, Train, Car, Bus, Bike, Ship, PersonStanding, Clock, Sparkles, Loader2, Camera, Upload, Star, Globe } from 'lucide-react'
import { calculateFlightDuration, formatDuration, formatOffset, extractCityKey, TIMEZONE_CITIES } from '@/lib/timezone-helper'

type EventType = 'transport' | 'hotel' | 'activity' | 'restaurant'
type TransportMode = 'plane' | 'train' | 'car' | 'bus' | 'bike' | 'walk' | 'boat'

interface AddEventModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (event: {
    type: EventType
    titre: string
    date: string
    lieu: string
    prix?: number
    notes?: string
    transportMode?: TransportMode
    duration?: number
    fromLocation?: string
    coordinates?: { lat: number; lng: number }
    rating?: number
    heureDebut?: string
    heureFin?: string
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
  const [type, setType] = useState<EventType>('activity')
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

  // États pour les suggestions de lieux de transport
  const [fromSuggestions, setFromSuggestions] = useState<any[]>([])
  const [toSuggestions, setToSuggestions] = useState<any[]>([])
  const [loadingFromSuggestions, setLoadingFromSuggestions] = useState(false)
  const [loadingToSuggestions, setLoadingToSuggestions] = useState(false)
  const [showFromSuggestions, setShowFromSuggestions] = useState(false)
  const [showToSuggestions, setShowToSuggestions] = useState(false)

  useEffect(() => {
    if (previousLocation) {
      setFromLocation(previousLocation)
    }
  }, [previousLocation])

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
        const requestBody = {
          location: fromLocation,
          transportMode: transportMode || 'plane',
          language
        }
        console.log('📤 Envoi requête:', requestBody)

        const response = await fetch('/api/ai/suggest-location', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        })

        console.log('📥 Réponse reçue:', response.status)
        const data = await response.json()
        console.log('📊 Données:', data)

        if (data.success && data.suggestions) {
          console.log(`✅ ${data.suggestions.length} suggestions trouvées`)
          setFromSuggestions(data.suggestions)
          setShowFromSuggestions(data.suggestions.length > 0)
        } else {
          console.warn('⚠️ Pas de suggestions ou erreur:', data.error)
        }
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
        const response = await fetch('/api/ai/suggest-location', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            location: lieu,
            transportMode: transportMode || 'plane',
            language
          })
        })

        const data = await response.json()
        if (data.success && data.suggestions) {
          setToSuggestions(data.suggestions)
          setShowToSuggestions(data.suggestions.length > 0)
        }
      } catch (error) {
        console.error('Erreur suggestions arrivée:', error)
      } finally {
        setLoadingToSuggestions(false)
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [lieu, type, transportMode, language])

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
      'event.aiSuggest': { fr: 'Suggestions IA', en: 'AI Suggestions' },
      'event.add': { fr: 'Ajouter', en: 'Add' },
      'event.cancel': { fr: 'Annuler', en: 'Cancel' }
    }
    return translations[key]?.[language as 'fr' | 'en'] || key
  }

  const eventTypes = [
    { id: 'transport' as EventType, icon: Plane, label: t('event.type.transport') },
    { id: 'hotel' as EventType, icon: Hotel, label: t('event.type.hotel') },
    { id: 'activity' as EventType, icon: Activity, label: t('event.type.activity') },
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
          else if (receipt.categorie === 'hotel' || receipt.categorie === 'hebergement') setType('hotel')
          else if (receipt.categorie === 'transport') setType('transport')
          else if (receipt.categorie === 'activite' || receipt.categorie === 'activity') setType('activity')

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!titre.trim()) {
      alert(language === 'fr' ? 'Veuillez entrer un nom' : 'Please enter a name')
      return
    }

    // Obtenir les coordonnées du lieu
    const coordinates = await geocodeLocation(lieu.trim())

    onAdd({
      type,
      titre: titre.trim(),
      date,
      lieu: lieu.trim(),
      prix: prix ? parseFloat(prix) : undefined,
      notes: notes.trim() || undefined,
      transportMode: type === 'transport' ? transportMode || undefined : undefined,
      duration: duration ? parseInt(duration) : undefined,
      fromLocation: type === 'transport' ? fromLocation.trim() || undefined : undefined,
      coordinates: coordinates || undefined,
      rating: rating > 0 ? rating : undefined,
      heureDebut: heureDebut || undefined,
      heureFin: heureFin || undefined
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
    setType('activity')
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
                            setShowFromSuggestions(false)
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition border-b border-gray-200 dark:border-gray-700 last:border-b-0"
                        >
                          <div className="font-semibold text-gray-900 dark:text-gray-100">
                            {suggestion.name}
                            {suggestion.code && (
                              <span className="ml-2 text-indigo-600 dark:text-indigo-400 font-mono">
                                {suggestion.code}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {suggestion.description}
                            {suggestion.distance && ` • ${suggestion.distance}`}
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
                            setShowToSuggestions(false)
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition border-b border-gray-200 dark:border-gray-700 last:border-b-0"
                        >
                          <div className="font-semibold text-gray-900 dark:text-gray-100">
                            {suggestion.name}
                            {suggestion.code && (
                              <span className="ml-2 text-indigo-600 dark:text-indigo-400 font-mono">
                                {suggestion.code}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {suggestion.description}
                            {suggestion.distance && ` • ${suggestion.distance}`}
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

              {/* Time fields with auto-calculated duration */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Start Time */}
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

                {/* End Time */}
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
              </div>

              {/* Arrival Date (for flights that arrive next day) */}
              {transportMode === 'plane' && (
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
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {language === 'fr'
                      ? '💡 Changez cette date si votre vol arrive le lendemain'
                      : '💡 Change this date if your flight arrives the next day'}
                  </p>
                </div>
              )}

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

          {/* Date and Location (for non-transport) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            {type !== 'transport' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  {t('event.location')}
                </label>
                <input
                  type="text"
                  value={lieu}
                  onChange={(e) => setLieu(e.target.value)}
                  placeholder={t('event.locationPlaceholder')}
                  className="w-full bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg px-4 py-3 border border-gray-300 dark:border-gray-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            )}
          </div>

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
