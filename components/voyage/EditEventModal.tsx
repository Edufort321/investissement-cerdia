'use client'

import React, { useState, useEffect } from 'react'
import { X, Calendar, MapPin, DollarSign, FileText, Plane, Hotel, Activity, Utensils, Train, Car, Bus, Bike, Ship, PersonStanding, Clock, Globe, Loader2, Star } from 'lucide-react'
import { calculateFlightDuration, formatDuration, formatOffset, extractCityKey } from '@/lib/timezone-helper'
import { Evenement, Waypoint } from '@/types/voyage'
import WaypointsManager from './WaypointsManager'

type EventType = 'transport' | 'hotel' | 'activity' | 'restaurant'
type TransportMode = 'plane' | 'train' | 'car' | 'bus' | 'bike' | 'walk' | 'boat'

interface EditEventModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (eventId: string, updates: Partial<Evenement>) => Promise<void>
  onDelete: (eventId: string) => Promise<void>
  event: Evenement
  language?: string
  tripCurrency?: string
}

export default function EditEventModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  event,
  language = 'fr',
  tripCurrency = 'CAD'
}: EditEventModalProps) {
  // Mapper les types de l'événement
  const getEventType = (type: string): EventType => {
    if (type === 'transport' || type === 'vol') return 'transport'
    if (type === 'hebergement' || type === 'hotel') return 'hotel'
    if (type === 'activite') return 'activity'
    if (type === 'restaurant') return 'restaurant'
    return 'activity'
  }

  const [type, setType] = useState<EventType>(getEventType(event.type))
  const [titre, setTitre] = useState(event.titre)
  const [date, setDate] = useState(event.date)
  const [arrivalDate, setArrivalDate] = useState(event.dateArrivee || event.date)
  const [lieu, setLieu] = useState(event.lieu || '')
  const [fromLocation, setFromLocation] = useState(event.villeDepart || '')
  const [prix, setPrix] = useState(event.prix?.toString() || '')
  const [notes, setNotes] = useState(event.notes || '')
  const [transportMode, setTransportMode] = useState<TransportMode | null>(
    (event.transportMode as TransportMode) || null
  )
  const [duration, setDuration] = useState(event.duration?.toString() || '')
  const [heureDebut, setHeureDebut] = useState(event.heureDebut || '')
  const [heureFin, setHeureFin] = useState(event.heureArrivee || event.heureFin || '')
  const [rating, setRating] = useState<number>(event.rating || 0)
  const [timezoneInfo, setTimezoneInfo] = useState<string>('')
  const [parkingInfo, setParkingInfo] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // États pour suggestions d'adresses
  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([])
  const [loadingLocationSuggestions, setLoadingLocationSuggestions] = useState(false)
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false)

  // État pour les waypoints (étapes/points d'intérêt)
  const [waypoints, setWaypoints] = useState<Waypoint[]>(event.waypoints || [])

  // Extraire les infos de parking des notes existantes
  useEffect(() => {
    if (event.notes) {
      const parkingMatch = event.notes.match(/🅿️\s*(?:Stationnement|Parking):\s*(.+?)(?:\n|$)/i)
      if (parkingMatch) {
        setParkingInfo(parkingMatch[1].trim())
      }
    }
  }, [event])

  // Calcul automatique de la durée
  useEffect(() => {
    if (!heureDebut || !heureFin) {
      setTimezoneInfo('')
      return
    }

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
            const info = `${result.timezoneInfo.departure.city} ${formatOffset(result.timezoneInfo.departure.offset)} → ${result.timezoneInfo.arrival.city} ${formatOffset(result.timezoneInfo.arrival.offset)}`
            setTimezoneInfo(info)
            return
          }
        }
      } catch (error) {
        console.error('Erreur calcul durée avec timezone:', error)
      }
    }

    try {
      setTimezoneInfo('')
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

  // Suggestions d'adresses pour événements non-transport
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
      'event.edit': { fr: 'Modifier l\'événement', en: 'Edit Event' },
      'event.save': { fr: 'Sauvegarder', en: 'Save' },
      'event.delete': { fr: 'Supprimer', en: 'Delete' },
      'event.cancel': { fr: 'Annuler', en: 'Cancel' },
      'event.confirmDelete': { fr: 'Êtes-vous sûr de vouloir supprimer cet événement ?', en: 'Are you sure you want to delete this event?' },
      'event.type': { fr: 'Type d\'événement', en: 'Event Type' },
      'event.name': { fr: 'Nom', en: 'Name' },
      'event.date': { fr: 'Date', en: 'Date' },
      'event.location': { fr: 'Lieu', en: 'Location' },
      'event.fromLocation': { fr: 'De', en: 'From' },
      'event.toLocation': { fr: 'Vers', en: 'To' },
      'event.transportMode': { fr: 'Moyen de transport', en: 'Transport Mode' },
      'event.price': { fr: 'Prix', en: 'Price' },
      'event.notes': { fr: 'Notes', en: 'Notes' },
      'event.rating': { fr: 'Évaluation', en: 'Rating' }
    }
    return translations[key]?.[language as 'fr' | 'en'] || key
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!titre.trim()) {
      alert(language === 'fr' ? 'Veuillez entrer un nom' : 'Please enter a name')
      return
    }

    setIsSaving(true)
    try {
      // Construire les notes avec info de stationnement
      let finalNotes = notes.trim()
      // Supprimer ancienne info de parking
      finalNotes = finalNotes.replace(/🅿️\s*(?:Stationnement|Parking):.+?(?:\n\n?|$)/gi, '').trim()

      if (transportMode === 'car' && parkingInfo.trim()) {
        const parkingNote = language === 'fr'
          ? `🅿️ Stationnement: ${parkingInfo.trim()}`
          : `🅿️ Parking: ${parkingInfo.trim()}`
        finalNotes = finalNotes ? `${finalNotes}\n\n${parkingNote}` : parkingNote
      }

      const updates: Partial<Evenement> = {
        titre: titre.trim(),
        date,
        lieu: lieu.trim(),
        villeDepart: type === 'transport' ? fromLocation.trim() || undefined : undefined,
        villeArrivee: type === 'transport' ? lieu.trim() || undefined : undefined,
        dateArrivee: type === 'transport' && transportMode === 'plane' ? arrivalDate : undefined,
        heureArrivee: type === 'transport' ? heureFin || undefined : undefined,
        prix: prix ? parseFloat(prix) : undefined,
        notes: finalNotes || undefined,
        transportMode: type === 'transport' ? transportMode || undefined : undefined,
        duration: duration ? parseInt(duration) : undefined,
        rating: rating > 0 ? rating : undefined,
        heureDebut: heureDebut || undefined,
        heureFin: heureFin || undefined,
        waypoints: waypoints.length > 0 ? waypoints : undefined
      }

      await onSave(event.id, updates)
      onClose()
    } catch (error) {
      console.error('Erreur sauvegarde:', error)
      alert(language === 'fr' ? 'Erreur lors de la sauvegarde' : 'Error saving event')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(t('event.confirmDelete'))) {
      return
    }

    setIsDeleting(true)
    try {
      await onDelete(event.id)
      onClose()
    } catch (error) {
      console.error('Erreur suppression:', error)
      alert(language === 'fr' ? 'Erreur lors de la suppression' : 'Error deleting event')
    } finally {
      setIsDeleting(false)
    }
  }

  if (!isOpen) return null

  const transportModes = [
    { id: 'plane' as TransportMode, icon: Plane, label: 'Avion' },
    { id: 'train' as TransportMode, icon: Train, label: 'Train' },
    { id: 'car' as TransportMode, icon: Car, label: 'Voiture' },
    { id: 'bus' as TransportMode, icon: Bus, label: 'Bus' },
    { id: 'bike' as TransportMode, icon: Bike, label: 'Vélo' },
    { id: 'walk' as TransportMode, icon: PersonStanding, label: 'À pied' },
    { id: 'boat' as TransportMode, icon: Ship, label: 'Bateau' }
  ]

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {t('event.edit')}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
          >
            <X className="w-6 h-6 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="p-6 space-y-6">
          {/* Event Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              {t('event.name')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg px-4 py-3 border border-gray-300 dark:border-gray-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              required
            />
          </div>

          {/* Transport Mode (if transport) */}
          {type === 'transport' && (
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
          )}

          {/* From/To Locations (if transport) */}
          {type === 'transport' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  {t('event.fromLocation')}
                </label>
                <input
                  type="text"
                  value={fromLocation}
                  onChange={(e) => setFromLocation(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg px-4 py-3 border border-gray-300 dark:border-gray-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  {t('event.toLocation')}
                </label>
                <input
                  type="text"
                  value={lieu}
                  onChange={(e) => setLieu(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg px-4 py-3 border border-gray-300 dark:border-gray-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Time fields (if transport) */}
          {type === 'transport' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                </div>
              )}

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
                  </div>
                  {timezoneInfo && (
                    <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 mt-2 bg-white/50 dark:bg-gray-800/50 rounded px-3 py-2">
                      <Globe className="w-4 h-4" />
                      <span className="font-medium">{timezoneInfo}</span>
                    </div>
                  )}
                </div>
              )}

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
                </div>
              )}
            </>
          )}

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
                  className="w-full bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg px-4 py-3 border border-gray-300 dark:border-gray-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                {loadingLocationSuggestions && (
                  <div className="absolute right-3 top-11 text-gray-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                )}
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
                        <div className="font-semibold text-gray-900 dark:text-gray-100">
                          📍 {suggestion.shortName || suggestion.name}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {suggestion.fullAddress || suggestion.description}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
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
              rows={3}
              className="w-full bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg px-4 py-3 border border-gray-300 dark:border-gray-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
            />
          </div>

          {/* Waypoints / Étapes (pour activités comme promenades) */}
          {type === 'activity' && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <WaypointsManager
                waypoints={waypoints}
                onChange={setWaypoints}
                language={language}
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between gap-3 pt-4">
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting || isSaving}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg transition font-semibold shadow-md"
            >
              {isDeleting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {language === 'fr' ? 'Suppression...' : 'Deleting...'}
                </span>
              ) : (
                t('event.delete')
              )}
            </button>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving || isDeleting}
                className="px-6 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 text-gray-700 dark:text-gray-200 rounded-lg transition font-semibold"
              >
                {t('event.cancel')}
              </button>
              <button
                type="submit"
                disabled={isSaving || isDeleting}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-lg transition font-semibold shadow-md"
              >
                {isSaving ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {language === 'fr' ? 'Sauvegarde...' : 'Saving...'}
                  </span>
                ) : (
                  t('event.save')
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
