'use client'

import { useState, useEffect } from 'react'
import { Calendar, Plus, Edit2, Trash2, DollarSign, Users, RefreshCw } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/contexts/LanguageContext'

interface Booking {
  id?: string
  scenario_id: string
  guest_name: string
  start_date: string
  end_date: string
  nightly_rate: number
  total_amount?: number
  currency?: string
  status: 'confirmed' | 'cancelled' | 'pending' | 'completed'
  notes?: string
  booking_source?: string
}

interface BookingsCalendarProps {
  scenarioId: string
  currency?: string
  defaultNightlyRate?: number
}

export function BookingsCalendar({ scenarioId, currency = 'USD', defaultNightlyRate = 0 }: BookingsCalendarProps) {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null)
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())

  const { language } = useLanguage()
  const fr = language === 'fr'
  const locale = fr ? 'fr-CA' : 'en-CA'

  // Form state
  const [formData, setFormData] = useState<Booking>({
    scenario_id: scenarioId,
    guest_name: '',
    start_date: '',
    end_date: '',
    nightly_rate: defaultNightlyRate,
    currency: currency,
    status: 'confirmed',
    notes: '',
    booking_source: ''
  })

  useEffect(() => {
    loadBookings()
  }, [scenarioId])

  const loadBookings = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('scenario_bookings')
        .select('*')
        .eq('scenario_id', scenarioId)
        .order('start_date', { ascending: true })

      if (error) throw error
      setBookings(data || [])
    } catch (error) {
      console.error('Error loading bookings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      if (editingBooking?.id) {
        // Update existing booking
        const { error } = await supabase
          .from('scenario_bookings')
          .update({
            guest_name: formData.guest_name,
            start_date: formData.start_date,
            end_date: formData.end_date,
            nightly_rate: formData.nightly_rate,
            currency: formData.currency,
            status: formData.status,
            notes: formData.notes,
            booking_source: formData.booking_source
          })
          .eq('id', editingBooking.id)

        if (error) throw error
      } else {
        // Create new booking
        const { error } = await supabase
          .from('scenario_bookings')
          .insert([{
            scenario_id: scenarioId,
            guest_name: formData.guest_name,
            start_date: formData.start_date,
            end_date: formData.end_date,
            nightly_rate: formData.nightly_rate,
            currency: formData.currency,
            status: formData.status,
            notes: formData.notes,
            booking_source: formData.booking_source
          }])

        if (error) throw error
      }

      await loadBookings()
      resetForm()
    } catch (error) {
      console.error('Error saving booking:', error)
      alert(fr ? 'Erreur lors de la sauvegarde' : 'Error saving booking')
    }
  }

  const handleDelete = async (bookingId: string) => {
    if (!confirm(fr ? 'Supprimer cette réservation ?' : 'Delete this booking?')) return

    try {
      const { error } = await supabase
        .from('scenario_bookings')
        .delete()
        .eq('id', bookingId)

      if (error) throw error
      await loadBookings()
    } catch (error) {
      console.error('Error deleting booking:', error)
    }
  }

  const resetForm = () => {
    setFormData({
      scenario_id: scenarioId,
      guest_name: '',
      start_date: '',
      end_date: '',
      nightly_rate: defaultNightlyRate,
      currency: currency,
      status: 'confirmed',
      notes: '',
      booking_source: ''
    })
    setEditingBooking(null)
    setShowForm(false)
  }

  const editBooking = (booking: Booking) => {
    setFormData({
      scenario_id: booking.scenario_id,
      guest_name: booking.guest_name,
      start_date: booking.start_date,
      end_date: booking.end_date,
      nightly_rate: booking.nightly_rate,
      currency: booking.currency || 'USD',
      status: booking.status,
      notes: booking.notes || '',
      booking_source: booking.booking_source || ''
    })
    setEditingBooking(booking)
    setShowForm(true)
  }

  // Calculate statistics
  const stats = {
    totalBookings: bookings.filter(b => b.status === 'confirmed').length,
    totalRevenue: bookings
      .filter(b => b.status === 'confirmed')
      .reduce((sum, b) => sum + (b.total_amount || 0), 0),
    totalNights: bookings
      .filter(b => b.status === 'confirmed')
      .reduce((sum, b) => {
        const start = new Date(b.start_date)
        const end = new Date(b.end_date)
        return sum + Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
      }, 0),
    occupancyRate: 0 // Will be calculated based on year
  }

  // Calculate days in current year
  const daysInYear = 365
  stats.occupancyRate = (stats.totalNights / daysInYear) * 100

  // Get bookings for current month
  const monthBookings = bookings.filter(booking => {
    const start = new Date(booking.start_date)
    const end = new Date(booking.end_date)
    const monthStart = new Date(currentYear, currentMonth, 1)
    const monthEnd = new Date(currentYear, currentMonth + 1, 0)

    return (start <= monthEnd && end >= monthStart)
  })

  const monthNames = fr
    ? ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
    : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay()
  }

  const isDateBooked = (day: number) => {
    const date = new Date(currentYear, currentMonth, day)
    return monthBookings.some(booking => {
      const start = new Date(booking.start_date)
      const end = new Date(booking.end_date)
      return date >= start && date <= end
    })
  }

  const getBookingForDate = (day: number) => {
    const date = new Date(currentYear, currentMonth, day)
    return monthBookings.find(booking => {
      const start = new Date(booking.start_date)
      const end = new Date(booking.end_date)
      return date >= start && date <= end
    })
  }

  const daysInMonth = getDaysInMonth(currentYear, currentMonth)
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 font-medium">{fr ? 'Réservations' : 'Bookings'}</p>
              <p className="text-2xl font-bold text-blue-900">{stats.totalBookings}</p>
            </div>
            <Calendar className="text-blue-600" size={32} />
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600 font-medium">{fr ? 'Revenus' : 'Revenue'}</p>
              <p className="text-2xl font-bold text-green-900">
                {stats.totalRevenue.toLocaleString(locale, { style: 'currency', currency: currency, minimumFractionDigits: 0 })}
              </p>
            </div>
            <DollarSign className="text-green-600" size={32} />
          </div>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-600 font-medium">{fr ? 'Nuitées' : 'Nights'}</p>
              <p className="text-2xl font-bold text-purple-900">{stats.totalNights}</p>
            </div>
            <Users className="text-purple-600" size={32} />
          </div>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-orange-600 font-medium">{fr ? "Taux d'occupation" : 'Occupancy rate'}</p>
              <p className="text-2xl font-bold text-orange-900">{stats.occupancyRate.toFixed(1)}%</p>
            </div>
            <Calendar className="text-orange-600" size={32} />
          </div>
        </div>
      </div>

      {/* Calendar Header */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-gray-900">{fr ? 'Calendrier des réservations' : 'Booking calendar'}</h3>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <Plus size={18} />
            {fr ? 'Nouvelle réservation' : 'New booking'}
          </button>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => {
              if (currentMonth === 0) {
                setCurrentMonth(11)
                setCurrentYear(currentYear - 1)
              } else {
                setCurrentMonth(currentMonth - 1)
              }
            }}
            className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded"
          >
            ←
          </button>
          <h4 className="text-lg font-semibold">
            {monthNames[currentMonth]} {currentYear}
          </h4>
          <button
            onClick={() => {
              if (currentMonth === 11) {
                setCurrentMonth(0)
                setCurrentYear(currentYear + 1)
              } else {
                setCurrentMonth(currentMonth + 1)
              }
            }}
            className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded"
          >
            →
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Days of week header */}
          {(fr ? ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']).map(day => (
            <div key={day} className="p-2 text-center font-semibold text-gray-600 text-sm">
              {day}
            </div>
          ))}

          {/* Empty cells for days before month starts */}
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="p-2 border border-gray-100"></div>
          ))}

          {/* Days of month */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1
            const isBooked = isDateBooked(day)
            const booking = getBookingForDate(day)

            return (
              <div
                key={day}
                className={`p-2 border border-gray-200 min-h-[60px] ${
                  isBooked
                    ? booking?.status === 'confirmed'
                      ? 'bg-green-100 border-green-300'
                      : booking?.status === 'cancelled'
                      ? 'bg-red-100 border-red-300'
                      : 'bg-yellow-100 border-yellow-300'
                    : 'bg-white hover:bg-gray-50'
                }`}
              >
                <div className="text-sm font-medium text-gray-700">{day}</div>
                {isBooked && booking && (
                  <div className="text-xs mt-1 truncate" title={booking.guest_name}>
                    {booking.guest_name}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="mt-4 flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
            <span>{fr ? 'Confirmé' : 'Confirmed'}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-yellow-100 border border-yellow-300 rounded"></div>
            <span>{fr ? 'En attente' : 'Pending'}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 bg-red-100 border border-red-300 rounded"></div>
            <span>{fr ? 'Annulé' : 'Cancelled'}</span>
          </div>
        </div>
      </div>

      {/* Bookings List */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">{fr ? 'Liste des réservations' : 'Booking list'}</h3>

        {bookings.length === 0 ? (
          <p className="text-gray-500 text-center py-8">{fr ? 'Aucune réservation pour le moment' : 'No bookings yet'}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-200 bg-gray-50">
                  <th className="text-left p-3">{fr ? 'Invité' : 'Guest'}</th>
                  <th className="text-left p-3">{fr ? 'Arrivée' : 'Check-in'}</th>
                  <th className="text-left p-3">{fr ? 'Départ' : 'Check-out'}</th>
                  <th className="text-right p-3">{fr ? 'Nuits' : 'Nights'}</th>
                  <th className="text-right p-3">{fr ? 'Tarif/nuit' : 'Rate/night'}</th>
                  <th className="text-right p-3">Total</th>
                  <th className="text-center p-3">{fr ? 'Statut' : 'Status'}</th>
                  <th className="text-center p-3">{fr ? 'Source' : 'Source'}</th>
                  <th className="text-center p-3">{fr ? 'Actions' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map(booking => {
                  const start = new Date(booking.start_date)
                  const end = new Date(booking.end_date)
                  const nights = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))

                  return (
                    <tr key={booking.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="p-3">{booking.guest_name}</td>
                      <td className="p-3">{new Date(booking.start_date).toLocaleDateString(locale)}</td>
                      <td className="p-3">{new Date(booking.end_date).toLocaleDateString(locale)}</td>
                      <td className="p-3 text-right">{nights}</td>
                      <td className="p-3 text-right">
                        {booking.nightly_rate.toLocaleString(locale, { style: 'currency', currency: booking.currency || 'USD', minimumFractionDigits: 0 })}
                      </td>
                      <td className="p-3 text-right font-medium">
                        {(booking.total_amount || 0).toLocaleString(locale, { style: 'currency', currency: booking.currency || 'USD', minimumFractionDigits: 0 })}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                          booking.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                          booking.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {booking.status === 'confirmed' ? (fr ? 'Confirmé' : 'Confirmed') :
                           booking.status === 'cancelled' ? (fr ? 'Annulé' : 'Cancelled') :
                           booking.status === 'completed' ? (fr ? 'Complété' : 'Completed') :
                           (fr ? 'En attente' : 'Pending')}
                        </span>
                      </td>
                      <td className="p-3 text-center text-xs text-gray-600">
                        {booking.booking_source || '—'}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => editBooking(booking)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                            title={fr ? 'Modifier' : 'Edit'}
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(booking.id!)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                            title={fr ? 'Supprimer' : 'Delete'}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Booking Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                {editingBooking ? (fr ? 'Modifier la réservation' : 'Edit booking') : (fr ? 'Nouvelle réservation' : 'New booking')}
              </h3>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {fr ? "Nom de l'invité *" : 'Guest name *'}
                    </label>
                    <input
                      type="text"
                      value={formData.guest_name}
                      onChange={(e) => setFormData({...formData, guest_name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {fr ? 'Source de réservation' : 'Booking source'}
                    </label>
                    <select
                      value={formData.booking_source}
                      onChange={(e) => setFormData({...formData, booking_source: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">{fr ? 'Sélectionner...' : 'Select...'}</option>
                      <option value="Airbnb">Airbnb</option>
                      <option value="Booking.com">Booking.com</option>
                      <option value="VRBO">VRBO</option>
                      <option value="Direct">{fr ? 'Direct' : 'Direct'}</option>
                      <option value="Autre">{fr ? 'Autre' : 'Other'}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {fr ? "Date d'arrivée *" : 'Check-in date *'}
                    </label>
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {fr ? 'Date de départ *' : 'Check-out date *'}
                    </label>
                    <input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {fr ? 'Tarif par nuit *' : 'Nightly rate *'}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.nightly_rate}
                      onChange={(e) => setFormData({...formData, nightly_rate: parseFloat(e.target.value)})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {fr ? 'Statut *' : 'Status *'}
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value as any})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="confirmed">{fr ? 'Confirmé' : 'Confirmed'}</option>
                      <option value="pending">{fr ? 'En attente' : 'Pending'}</option>
                      <option value="completed">{fr ? 'Complété' : 'Completed'}</option>
                      <option value="cancelled">{fr ? 'Annulé' : 'Cancelled'}</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {fr ? 'Notes' : 'Notes'}
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    rows={3}
                  ></textarea>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    {fr ? 'Annuler' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                  >
                    {editingBooking ? (fr ? 'Modifier' : 'Update') : (fr ? 'Créer' : 'Create')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
