'use client'

import React, { useState } from 'react'
import { Mail, X, Loader2, CheckCircle, AlertCircle, Plane, Hotel, Car, MapPin } from 'lucide-react'
import { ParsedBooking, bookingToEvent } from '@/lib/email-parser'

interface EmailImportProps {
  isOpen: boolean
  onClose: () => void
  onImportEvent: (eventData: any) => void
  voyageId: string
  devise: string
  language?: string
}

export default function EmailImport({
  isOpen,
  onClose,
  onImportEvent,
  voyageId,
  devise,
  language = 'fr'
}: EmailImportProps) {
  const [subject, setSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [parsing, setParsing] = useState(false)
  const [parsedBooking, setParsedBooking] = useState<ParsedBooking | null>(null)
  const [error, setError] = useState<string | null>(null)

  const t = (key: string) => {
    const translations: Record<string, { fr: string; en: string }> = {
      'title': { fr: 'Importer depuis un email', en: 'Import from email' },
      'subtitle': { fr: 'Copiez-collez votre email de confirmation', en: 'Copy-paste your confirmation email' },
      'subject': { fr: 'Objet de l\'email', en: 'Email subject' },
      'subjectPlaceholder': { fr: 'Ex: Confirmation de vol Air Canada', en: 'Ex: Air Canada Flight Confirmation' },
      'body': { fr: 'Contenu de l\'email', en: 'Email content' },
      'bodyPlaceholder': { fr: 'Collez ici le contenu complet de votre email de confirmation...', en: 'Paste here the full content of your confirmation email...' },
      'parse': { fr: 'Analyser l\'email', en: 'Parse email' },
      'parsing': { fr: 'Analyse en cours...', en: 'Parsing...' },
      'importEvent': { fr: 'Ajouter à mon voyage', en: 'Add to my trip' },
      'cancel': { fr: 'Annuler', en: 'Cancel' },
      'tryAnother': { fr: 'Essayer un autre email', en: 'Try another email' },
      'detected': { fr: 'Détecté', en: 'Detected' },
      'confirmationNumber': { fr: 'Numéro de confirmation', en: 'Confirmation number' },
      'provider': { fr: 'Fournisseur', en: 'Provider' },
      'date': { fr: 'Date', en: 'Date' },
      'time': { fr: 'Heure', en: 'Time' },
      'location': { fr: 'Lieu', en: 'Location' },
      'price': { fr: 'Prix', en: 'Price' },
      'flight': { fr: 'Vol', en: 'Flight' },
      'hotel': { fr: 'Hôtel', en: 'Hotel' },
      'car_rental': { fr: 'Location de voiture', en: 'Car rental' },
      'activity': { fr: 'Activité', en: 'Activity' },
      'flightNumber': { fr: 'Numéro de vol', en: 'Flight number' },
      'airline': { fr: 'Compagnie', en: 'Airline' },
      'route': { fr: 'Trajet', en: 'Route' },
      'checkIn': { fr: 'Arrivée', en: 'Check-in' },
      'checkOut': { fr: 'Départ', en: 'Check-out' },
      'pickup': { fr: 'Prise en charge', en: 'Pickup' },
      'dropoff': { fr: 'Retour', en: 'Drop-off' },
      'errorNoDetection': { fr: 'Aucune réservation détectée dans cet email', en: 'No booking detected in this email' },
      'errorTip': { fr: 'Astuce: Assurez-vous d\'inclure les détails importants (dates, numéros de vol/confirmation, etc.)', en: 'Tip: Make sure to include important details (dates, flight/confirmation numbers, etc.)' }
    }
    return translations[key]?.[language as 'fr' | 'en'] || key
  }

  const getTypeIcon = (type: string) => {
    const icons = {
      flight: Plane,
      hotel: Hotel,
      car_rental: Car,
      activity: MapPin
    }
    return icons[type as keyof typeof icons] || Mail
  }

  const getTypeColor = (type: string) => {
    const colors = {
      flight: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
      hotel: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
      car_rental: 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
      activity: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
    }
    return colors[type as keyof typeof colors] || 'text-gray-600 bg-gray-50 border-gray-200'
  }

  const handleParse = async () => {
    setError(null)
    setParsing(true)
    setParsedBooking(null)

    try {
      const response = await fetch('/api/voyage/parse-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, emailBody })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || t('errorNoDetection'))
        return
      }

      setParsedBooking(data.booking)
    } catch (err) {
      console.error('Erreur parsing:', err)
      setError(t('errorNoDetection'))
    } finally {
      setParsing(false)
    }
  }

  const handleImport = () => {
    if (!parsedBooking) return

    const event = bookingToEvent(parsedBooking, voyageId, devise)
    onImportEvent(event)
    handleClose()
  }

  const handleClose = () => {
    setSubject('')
    setEmailBody('')
    setParsedBooking(null)
    setError(null)
    onClose()
  }

  const handleReset = () => {
    setSubject('')
    setEmailBody('')
    setParsedBooking(null)
    setError(null)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-3xl w-full border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center shadow-md">
              <Mail className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {t('title')}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('subtitle')}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
          >
            <X className="w-6 h-6 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {!parsedBooking ? (
            <>
              {/* Subject Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('subject')}
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder={t('subjectPlaceholder')}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-100"
                />
              </div>

              {/* Email Body Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('body')}
                </label>
                <textarea
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  placeholder={t('bodyPlaceholder')}
                  rows={12}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-100 font-mono text-sm"
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-red-600 dark:text-red-400 font-medium">{error}</p>
                    <p className="text-sm text-red-500 dark:text-red-400 mt-1">{t('errorTip')}</p>
                  </div>
                </div>
              )}

              {/* Parse Button */}
              <button
                onClick={handleParse}
                disabled={!subject || !emailBody || parsing}
                className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md"
              >
                {parsing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {t('parsing')}
                  </>
                ) : (
                  t('parse')
                )}
              </button>
            </>
          ) : (
            <>
              {/* Parsed Result */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-semibold">
                  <CheckCircle className="w-5 h-5" />
                  <span>{t('detected')}: {t(parsedBooking.type)}</span>
                </div>

                <div className={`border-2 rounded-lg p-4 ${getTypeColor(parsedBooking.type)}`}>
                  <div className="flex items-start gap-3">
                    {React.createElement(getTypeIcon(parsedBooking.type), {
                      className: 'w-8 h-8 flex-shrink-0'
                    })}
                    <div className="flex-1 space-y-3">
                      <h3 className="text-xl font-bold">{parsedBooking.title}</h3>

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {parsedBooking.date && (
                          <div>
                            <span className="font-medium">{t('date')}:</span>
                            <p>{parsedBooking.date}</p>
                          </div>
                        )}

                        {parsedBooking.time && (
                          <div>
                            <span className="font-medium">{t('time')}:</span>
                            <p>{parsedBooking.time}</p>
                          </div>
                        )}

                        {parsedBooking.location && (
                          <div className="col-span-2">
                            <span className="font-medium">{t('location')}:</span>
                            <p>{parsedBooking.location}</p>
                          </div>
                        )}

                        {parsedBooking.provider && (
                          <div>
                            <span className="font-medium">{t('provider')}:</span>
                            <p>{parsedBooking.provider}</p>
                          </div>
                        )}

                        {parsedBooking.confirmationNumber && (
                          <div>
                            <span className="font-medium">{t('confirmationNumber')}:</span>
                            <p className="font-mono text-xs">{parsedBooking.confirmationNumber}</p>
                          </div>
                        )}

                        {parsedBooking.price && (
                          <div>
                            <span className="font-medium">{t('price')}:</span>
                            <p className="text-lg font-bold">
                              {parsedBooking.price.toFixed(2)} {parsedBooking.currency}
                            </p>
                          </div>
                        )}

                        {/* Flight specific */}
                        {parsedBooking.type === 'flight' && parsedBooking.details.flightNumber && (
                          <div>
                            <span className="font-medium">{t('flightNumber')}:</span>
                            <p>{parsedBooking.details.flightNumber}</p>
                          </div>
                        )}

                        {parsedBooking.type === 'flight' && parsedBooking.details.departureCity && parsedBooking.details.arrivalCity && (
                          <div className="col-span-2">
                            <span className="font-medium">{t('route')}:</span>
                            <p>{parsedBooking.details.departureCity} → {parsedBooking.details.arrivalCity}</p>
                          </div>
                        )}

                        {/* Hotel specific */}
                        {parsedBooking.type === 'hotel' && parsedBooking.details.checkInDate && (
                          <div>
                            <span className="font-medium">{t('checkIn')}:</span>
                            <p>{parsedBooking.details.checkInDate}</p>
                          </div>
                        )}

                        {parsedBooking.type === 'hotel' && parsedBooking.details.checkOutDate && (
                          <div>
                            <span className="font-medium">{t('checkOut')}:</span>
                            <p>{parsedBooking.details.checkOutDate}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleReset}
                  className="flex-1 px-6 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition font-semibold"
                >
                  {t('tryAnother')}
                </button>
                <button
                  onClick={handleImport}
                  className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition font-semibold shadow-md"
                >
                  {t('importEvent')}
                </button>
              </div>
            </>
          )}

          {/* Cancel Button */}
          {!parsedBooking && (
            <button
              onClick={handleClose}
              disabled={parsing}
              className="w-full px-6 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition font-semibold disabled:opacity-50"
            >
              {t('cancel')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
