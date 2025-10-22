'use client'

import { useState, useEffect } from 'react'
import { Calendar, Filter, Settings, X, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Scenario {
  id: string
  name: string
  unit_number: string
  status: string
  owner_occupation_days: number
  management_company_name?: string
  management_company_contact?: string
  management_company_email?: string
}

interface Investor {
  id: string
  name: string
  email: string
}

interface Reservation {
  id?: string
  scenario_id: string
  investor_id: string
  investor_name?: string
  start_date: string
  end_date: string
  status: 'confirmed' | 'cancelled' | 'pending'
  notes?: string
  type?: 'owner' | 'commercial' // Type de réservation
}

interface CommercialBooking {
  id: string
  scenario_id: string
  guest_name: string
  start_date: string
  end_date: string
  status: string
}

interface InvestorQuota {
  investor_id: string
  investor_name: string
  total_days_entitled: number
  total_days_used: number
  total_days_remaining: number
}

interface ApiConfig {
  id?: string
  scenario_id: string
  provider: string
  api_key: string
  api_secret: string
  api_endpoint: string
  property_id: string
  auto_sync: boolean
}

export default function InvestorReservationsCalendar() {
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [investors, setInvestors] = useState<Investor[]>([])
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [commercialBookings, setCommercialBookings] = useState<CommercialBooking[]>([])
  const [investorQuotas, setInvestorQuotas] = useState<InvestorQuota[]>([])
  const [filteredScenarios, setFilteredScenarios] = useState<Scenario[]>([])
  const [searchFilter, setSearchFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [isLoading, setIsLoading] = useState(true)
  const [showReservationModal, setShowReservationModal] = useState(false)
  const [showApiConfig, setShowApiConfig] = useState(false)
  const [showQuotaInfo, setShowQuotaInfo] = useState(false)
  const [selectedCell, setSelectedCell] = useState<{ scenarioId: string, date: Date } | null>(null)
  const [selectedScenarioForApi, setSelectedScenarioForApi] = useState<string | null>(null)
  const [selectedInvestor, setSelectedInvestor] = useState('')

  const [apiConfig, setApiConfig] = useState<ApiConfig>({
    scenario_id: '',
    provider: '',
    api_key: '',
    api_secret: '',
    api_endpoint: '',
    property_id: '',
    auto_sync: false
  })

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [scenarios, searchFilter, statusFilter])

  const loadData = async () => {
    setIsLoading(true)
    try {
      // Charger les scénarios (projets purchased uniquement)
      const { data: scenariosData, error: scenariosError } = await supabase
        .from('scenarios')
        .select('id, name, unit_number, status, owner_occupation_days, management_company_name, management_company_contact, management_company_email')
        .eq('status', 'purchased')
        .order('name', { ascending: true })

      if (scenariosError) throw scenariosError
      setScenarios(scenariosData || [])

      // Charger les investisseurs
      const { data: investorsData, error: investorsError } = await supabase
        .from('investors')
        .select('id, name, email')
        .order('name', { ascending: true })

      if (investorsError) throw investorsError
      setInvestors(investorsData || [])

      // Charger les réservations investisseurs
      await loadReservations()

      // Charger les bookings commerciaux
      await loadCommercialBookings()

      // Charger les quotas investisseurs
      await loadInvestorQuotas()

    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadReservations = async () => {
    try {
      const { data, error } = await supabase
        .from('investor_reservations')
        .select(`
          *,
          investors!investor_reservations_investor_id_fkey (name)
        `)
        .eq('status', 'confirmed')

      if (error) throw error

      const reservationsWithNames = (data || []).map(r => ({
        ...r,
        investor_name: r.investors?.name
      }))

      setReservations(reservationsWithNames)
    } catch (error) {
      console.error('Error loading reservations:', error)
    }
  }

  const loadCommercialBookings = async () => {
    try {
      const { data, error } = await supabase
        .from('scenario_bookings')
        .select('id, scenario_id, guest_name, start_date, end_date, status')
        .in('status', ['confirmed', 'completed'])

      if (error) throw error
      setCommercialBookings(data || [])
    } catch (error) {
      console.error('Error loading commercial bookings:', error)
    }
  }

  const loadInvestorQuotas = async () => {
    try {
      const { data, error } = await supabase
        .from('investor_total_rights')
        .select('*')

      if (error) throw error
      setInvestorQuotas(data || [])
    } catch (error) {
      console.error('Error loading investor quotas:', error)
    }
  }

  const applyFilters = () => {
    let filtered = [...scenarios]

    if (searchFilter) {
      filtered = filtered.filter(s =>
        s.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
        s.unit_number.toLowerCase().includes(searchFilter.toLowerCase())
      )
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(s => s.status === statusFilter)
    }

    setFilteredScenarios(filtered)
  }

  const handleCellClick = (scenarioId: string, day: number) => {
    const date = new Date(currentYear, currentMonth, day)
    const existing = getReservationForDate(scenarioId, date)

    if (existing) {
      // Ne permettre la suppression que des réservations d'investisseurs
      if (existing.type === 'owner') {
        handleDeleteReservation(existing.data.id!)
      } else {
        alert('Les réservations commerciales ne peuvent pas être modifiées depuis ce calendrier')
      }
    } else {
      // Ouvrir modal pour créer nouvelle réservation investisseur
      setSelectedCell({ scenarioId, date })
      setShowReservationModal(true)
    }
  }

  const handleQuickReserve = async () => {
    if (!selectedCell || !selectedInvestor) return

    try {
      const dateStr = selectedCell.date.toISOString().split('T')[0]

      // Vérifier les quotas avant de créer la réservation
      const { data: quotaCheck, error: quotaError } = await supabase
        .rpc('check_investor_can_reserve', {
          p_investor_id: selectedInvestor,
          p_scenario_id: selectedCell.scenarioId,
          p_start_date: dateStr,
          p_end_date: dateStr
        })

      if (quotaError) {
        console.error('Error checking quota:', quotaError)
        alert('Erreur lors de la vérification des quotas')
        return
      }

      // Vérifier si la réservation est autorisée
      if (quotaCheck && quotaCheck.length > 0) {
        const check = quotaCheck[0]

        if (!check.can_reserve) {
          alert(`❌ Réservation refusée:\n\n${check.reason}\n\nJours demandés: ${check.days_requested}\nJours restants (cette unité): ${check.days_available_unit}\nJours restants (total): ${check.days_available_total}`)
          return
        }
      }

      // Si tout est OK, créer la réservation
      const { error } = await supabase
        .from('investor_reservations')
        .insert([{
          scenario_id: selectedCell.scenarioId,
          investor_id: selectedInvestor,
          start_date: dateStr,
          end_date: dateStr,
          status: 'confirmed',
          reserved_by: selectedInvestor
        }])

      if (error) throw error

      // Recharger les données
      await loadReservations()
      await loadInvestorQuotas()

      setShowReservationModal(false)
      setSelectedInvestor('')
      setSelectedCell(null)

      alert('✅ Réservation confirmée!')
    } catch (error) {
      console.error('Error creating reservation:', error)
      alert('Erreur lors de la réservation')
    }
  }

  const handleDeleteReservation = async (reservationId: string) => {
    if (!confirm('Annuler cette réservation ?')) return

    try {
      const { error } = await supabase
        .from('investor_reservations')
        .delete()
        .eq('id', reservationId)

      if (error) throw error

      // Recharger les données
      await loadReservations()
      await loadInvestorQuotas()
    } catch (error) {
      console.error('Error deleting reservation:', error)
    }
  }

  const getReservationForDate = (scenarioId: string, date: Date): { type: 'owner' | 'commercial', data: any } | null => {
    const dateStr = date.toISOString().split('T')[0]

    // Vérifier d'abord les réservations d'investisseurs (priorité)
    const ownerReservation = reservations.find(r =>
      r.scenario_id === scenarioId &&
      r.start_date <= dateStr &&
      r.end_date >= dateStr
    )

    if (ownerReservation) {
      return { type: 'owner', data: ownerReservation }
    }

    // Sinon vérifier les bookings commerciaux
    const commercialBooking = commercialBookings.find(b =>
      b.scenario_id === scenarioId &&
      b.start_date <= dateStr &&
      b.end_date >= dateStr
    )

    if (commercialBooking) {
      return { type: 'commercial', data: commercialBooking }
    }

    return null
  }

  const getDaysInMonth = () => {
    return new Date(currentYear, currentMonth + 1, 0).getDate()
  }

  const getFirstDayOfMonth = () => {
    return new Date(currentYear, currentMonth, 1).getDay()
  }

  const handleSaveApiConfig = async () => {
    if (!selectedScenarioForApi) return

    try {
      const { error } = await supabase
        .from('property_management_api')
        .upsert({
          ...apiConfig,
          scenario_id: selectedScenarioForApi
        })

      if (error) throw error

      alert('Configuration API sauvegardée!')
      setShowApiConfig(false)
    } catch (error) {
      console.error('Error saving API config:', error)
      alert('Erreur lors de la sauvegarde')
    }
  }

  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ]

  const daysInMonth = getDaysInMonth()
  const firstDay = getFirstDayOfMonth()

  // Générer un code couleur par investisseur
  const getInvestorColor = (investorId: string) => {
    const colors = [
      'bg-blue-200 border-blue-400',
      'bg-green-200 border-green-400',
      'bg-purple-200 border-purple-400',
      'bg-orange-200 border-orange-400',
      'bg-pink-200 border-pink-400',
      'bg-yellow-200 border-yellow-400',
      'bg-indigo-200 border-indigo-400',
      'bg-red-200 border-red-400'
    ]
    const index = investors.findIndex(i => i.id === investorId)
    return colors[index % colors.length]
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* En-tête avec filtres */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Filtrer par nom ou unité..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="all">Tous les statuts</option>
            <option value="purchased">Achetés</option>
          </select>

          <button
            onClick={() => setShowApiConfig(true)}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <Settings size={16} />
            Config API
          </button>

          <button
            onClick={() => setShowQuotaInfo(!showQuotaInfo)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <Calendar size={16} />
            {showQuotaInfo ? 'Masquer quotas' : 'Voir quotas'}
          </button>
        </div>
      </div>

      {/* Panel des quotas investisseurs */}
      {showQuotaInfo && investorQuotas.length > 0 && (
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Quotas d'occupation par investisseur ({currentYear})</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="p-3 text-left text-sm font-semibold text-gray-700">Investisseur</th>
                  <th className="p-3 text-center text-sm font-semibold text-gray-700">Jours autorisés</th>
                  <th className="p-3 text-center text-sm font-semibold text-gray-700">Jours utilisés</th>
                  <th className="p-3 text-center text-sm font-semibold text-gray-700">Jours restants</th>
                  <th className="p-3 text-center text-sm font-semibold text-gray-700">% utilisation</th>
                </tr>
              </thead>
              <tbody>
                {investorQuotas.map((quota) => {
                  const utilisationPct = quota.total_days_entitled > 0
                    ? Math.round((quota.total_days_used / quota.total_days_entitled) * 100)
                    : 0

                  let statusColor = 'text-green-600'
                  if (utilisationPct > 80) statusColor = 'text-red-600'
                  else if (utilisationPct > 50) statusColor = 'text-orange-600'

                  return (
                    <tr key={quota.investor_id} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-medium text-gray-900">{quota.investor_name}</td>
                      <td className="p-3 text-center text-gray-700">{Math.round(quota.total_days_entitled)} jours</td>
                      <td className="p-3 text-center text-gray-700">{quota.total_days_used} jours</td>
                      <td className={`p-3 text-center font-semibold ${statusColor}`}>
                        {Math.round(quota.total_days_remaining)} jours
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${
                                utilisationPct > 80 ? 'bg-red-600' :
                                utilisationPct > 50 ? 'bg-orange-600' :
                                'bg-green-600'
                              }`}
                              style={{ width: `${Math.min(utilisationPct, 100)}%` }}
                            ></div>
                          </div>
                          <span className={`text-sm font-medium ${statusColor}`}>
                            {utilisationPct}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Les jours autorisés sont calculés selon le % de parts dans chaque projet.
              Le quota maximum par unité doit être respecté.
            </p>
          </div>
        </div>
      )}

      {/* Navigation mois */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              if (currentMonth === 0) {
                setCurrentMonth(11)
                setCurrentYear(currentYear - 1)
              } else {
                setCurrentMonth(currentMonth - 1)
              }
            }}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
          >
            ← Mois précédent
          </button>
          <h3 className="text-xl font-bold text-gray-900">
            {monthNames[currentMonth]} {currentYear}
          </h3>
          <button
            onClick={() => {
              if (currentMonth === 11) {
                setCurrentMonth(0)
                setCurrentYear(currentYear + 1)
              } else {
                setCurrentMonth(currentMonth + 1)
              }
            }}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
          >
            Mois suivant →
          </button>
        </div>
      </div>

      {/* Calendrier multi-lignes */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b-2 border-gray-300">
                <th className="sticky left-0 z-10 bg-gray-50 p-3 text-left font-semibold text-gray-700 border-r-2 border-gray-300 min-w-[200px]">
                  Projet
                </th>
                {['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].map((day, i) => (
                  <th key={i} className="p-2 text-center text-xs font-semibold text-gray-600" colSpan={Math.ceil(daysInMonth / 7)}>
                    {day}
                  </th>
                ))}
              </tr>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="sticky left-0 z-10 bg-gray-50 border-r-2 border-gray-300"></th>
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1
                  return (
                    <th key={day} className="p-1 text-center text-xs text-gray-500 min-w-[40px]">
                      {day}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {filteredScenarios.length === 0 ? (
                <tr>
                  <td colSpan={daysInMonth + 1} className="p-8 text-center text-gray-500">
                    Aucun projet trouvé
                  </td>
                </tr>
              ) : (
                filteredScenarios.map(scenario => (
                  <tr key={scenario.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="sticky left-0 z-10 bg-white p-3 border-r-2 border-gray-200 font-medium text-gray-900">
                      <div>
                        <div className="font-semibold">{scenario.name}</div>
                        <div className="text-xs text-gray-600">Unité {scenario.unit_number}</div>
                      </div>
                    </td>
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                      const day = i + 1
                      const date = new Date(currentYear, currentMonth, day)
                      const reservation = getReservationForDate(scenario.id, date)
                      const isWeekend = date.getDay() === 0 || date.getDay() === 6

                      let bgColor = isWeekend ? 'bg-gray-50' : 'bg-white'
                      let title = 'Cliquer pour réserver'
                      let displayText = ''

                      if (reservation) {
                        if (reservation.type === 'owner') {
                          // Réservation investisseur - couleur par investisseur
                          bgColor = getInvestorColor(reservation.data.investor_id)
                          title = `Réservé par ${reservation.data.investor_name} (usage personnel)`
                          displayText = reservation.data.investor_name?.split(' ')[0] || ''
                        } else {
                          // Booking commercial - vert uniforme
                          bgColor = 'bg-green-100 border-green-300'
                          title = `Réservé (commercial): ${reservation.data.guest_name}`
                          displayText = 'COM'
                        }
                      }

                      return (
                        <td
                          key={day}
                          onClick={() => handleCellClick(scenario.id, day)}
                          className={`p-0 border border-gray-200 cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all ${bgColor}`}
                          title={title}
                        >
                          <div className="w-full h-10 flex items-center justify-center">
                            {displayText && (
                              <span className="text-xs font-medium truncate px-1">
                                {displayText}
                              </span>
                            )}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Légende */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
        <h4 className="font-semibold text-gray-900 mb-3">Légende des investisseurs</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {investors.map((investor, index) => (
            <div key={investor.id} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded border-2 ${getInvestorColor(investor.id)}`}></div>
              <span className="text-sm text-gray-700">{investor.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Modal réservation rapide */}
      {showReservationModal && selectedCell && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Réserver</h3>
              <button
                onClick={() => {
                  setShowReservationModal(false)
                  setSelectedInvestor('')
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">
                  Date: <strong>{selectedCell.date.toLocaleDateString('fr-CA')}</strong>
                </p>
                <p className="text-sm text-gray-600">
                  Projet: <strong>{scenarios.find(s => s.id === selectedCell.scenarioId)?.name}</strong>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sélectionner l'investisseur *
                </label>
                <select
                  value={selectedInvestor}
                  onChange={(e) => setSelectedInvestor(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                >
                  <option value="">-- Choisir un investisseur --</option>
                  {investors.map(investor => (
                    <option key={investor.id} value={investor.id}>
                      {investor.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowReservationModal(false)
                    setSelectedInvestor('')
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  onClick={handleQuickReserve}
                  disabled={!selectedInvestor}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:bg-gray-400 flex items-center gap-2"
                >
                  <Check size={16} />
                  Confirmer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal configuration API */}
      {showApiConfig && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Configuration API Gestion Locative</h3>
              <button
                onClick={() => setShowApiConfig(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Projet *
                </label>
                <select
                  value={selectedScenarioForApi || ''}
                  onChange={(e) => setSelectedScenarioForApi(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">-- Sélectionner un projet --</option>
                  {scenarios.map(scenario => (
                    <option key={scenario.id} value={scenario.id}>
                      {scenario.name} - Unité {scenario.unit_number}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fournisseur
                </label>
                <select
                  value={apiConfig.provider}
                  onChange={(e) => setApiConfig({...apiConfig, provider: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">-- Choisir --</option>
                  <option value="Guesty">Guesty</option>
                  <option value="Hostaway">Hostaway</option>
                  <option value="Lodgify">Lodgify</option>
                  <option value="BookingSync">BookingSync</option>
                  <option value="Autre">Autre</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  API Endpoint
                </label>
                <input
                  type="url"
                  value={apiConfig.api_endpoint}
                  onChange={(e) => setApiConfig({...apiConfig, api_endpoint: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="https://api.example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  API Key
                </label>
                <input
                  type="password"
                  value={apiConfig.api_key}
                  onChange={(e) => setApiConfig({...apiConfig, api_key: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Votre clé API"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  API Secret
                </label>
                <input
                  type="password"
                  value={apiConfig.api_secret}
                  onChange={(e) => setApiConfig({...apiConfig, api_secret: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Votre secret API"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Property ID
                </label>
                <input
                  type="text"
                  value={apiConfig.property_id}
                  onChange={(e) => setApiConfig({...apiConfig, property_id: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="ID de la propriété dans le système"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="auto-sync"
                  checked={apiConfig.auto_sync}
                  onChange={(e) => setApiConfig({...apiConfig, auto_sync: e.target.checked})}
                  className="rounded"
                />
                <label htmlFor="auto-sync" className="text-sm text-gray-700">
                  Activer la synchronisation automatique
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t">
                <button
                  onClick={() => setShowApiConfig(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSaveApiConfig}
                  disabled={!selectedScenarioForApi}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:bg-gray-400"
                >
                  Sauvegarder
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
