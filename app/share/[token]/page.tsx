'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Lock, AlertCircle, Calendar, DollarSign, TrendingUp, MapPin, User, FileText } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

interface ShareData {
  is_valid: boolean
  error_message: string | null
  scenario_id: string
  scenario_data: any
  permissions: {
    view_financials: boolean
    view_documents: boolean
    view_bookings: boolean
  }
  access_count: number
}

export default function SharePage() {
  const params = useParams()
  const token = params.token as string
  const { language } = useLanguage()
  const fr = language === 'fr'
  const locale = fr ? 'fr-CA' : 'en-CA'

  const [shareData, setShareData] = useState<ShareData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (token) {
      loadShareData()
    }
  }, [token])

  const loadShareData = async () => {
    setLoading(true)
    setError(null)

    try {
      const { data, error: rpcError } = await supabase
        .rpc('get_share_link_data', {
          p_token: token
        })

      if (rpcError) throw rpcError

      if (data && data.length > 0) {
        const result = data[0]

        if (!result.is_valid) {
          setError(result.error_message)
        } else {
          setShareData(result)
        }
      } else {
        setError(fr ? 'Lien invalide' : 'Invalid link')
      }
    } catch (err) {
      console.error('Error loading share data:', err)
      setError(fr ? 'Erreur lors du chargement des données' : 'Error loading data')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{fr ? 'Chargement du scénario partagé...' : 'Loading shared scenario...'}</p>
        </div>
      </div>
    )
  }

  if (error || !shareData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="text-red-600" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{fr ? 'Accès refusé' : 'Access denied'}</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
            {fr
              ? 'Ce lien peut avoir expiré, été désactivé, ou être invalide.'
              : 'This link may have expired, been disabled, or be invalid.'}
          </div>
        </div>
      </div>
    )
  }

  const scenario = shareData.scenario_data
  const permissions = shareData.permissions

  const statusLabel = scenario.status === 'purchased' ? (fr ? 'Acheté' : 'Purchased') :
                      scenario.status === 'approved'  ? (fr ? 'Approuvé' : 'Approved') :
                      scenario.status === 'pending_vote' ? (fr ? 'En vote' : 'Under vote') :
                      (fr ? 'Brouillon' : 'Draft')

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{scenario.name}</h1>
              <p className="text-sm text-gray-600 mt-1 flex items-center gap-2">
                <Lock size={14} />
                {fr ? 'Vue en lecture seule' : 'Read-only view'} &bull; {fr ? 'Visite' : 'Visit'} #{shareData.access_count}
              </p>
            </div>
            <div className="text-right">
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                scenario.status === 'purchased' ? 'bg-green-100 text-green-800' :
                scenario.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                scenario.status === 'pending_vote' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {statusLabel}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Project Details */}
            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">{fr ? 'Détails du Projet' : 'Project Details'}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <MapPin className="text-blue-600 mt-1" size={20} />
                  <div>
                    <p className="text-sm text-gray-600">{fr ? 'Adresse' : 'Address'}</p>
                    <p className="font-medium text-gray-900">{scenario.address}</p>
                    <p className="text-sm text-gray-600">{scenario.state_region}, {scenario.country}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <User className="text-blue-600 mt-1" size={20} />
                  <div>
                    <p className="text-sm text-gray-600">{fr ? 'Promoteur' : 'Developer'}</p>
                    <p className="font-medium text-gray-900">{scenario.promoter_name}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <FileText className="text-blue-600 mt-1" size={20} />
                  <div>
                    <p className="text-sm text-gray-600">{fr ? 'Unité' : 'Unit'}</p>
                    <p className="font-medium text-gray-900">{scenario.unit_number}</p>
                  </div>
                </div>
                {scenario.delivery_date && (
                  <div className="flex items-start gap-3">
                    <Calendar className="text-blue-600 mt-1" size={20} />
                    <div>
                      <p className="text-sm text-gray-600">{fr ? 'Livraison prévue' : 'Expected delivery'}</p>
                      <p className="font-medium text-gray-900">
                        {new Date(scenario.delivery_date).toLocaleDateString(locale)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Financial Info */}
            {permissions.view_financials && (
              <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">{fr ? 'Informations Financières' : 'Financial Information'}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="flex items-center gap-2 text-gray-600 mb-2">
                      <DollarSign size={18} />
                      <span className="text-sm">{fr ? "Prix d'achat" : 'Purchase price'}</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(scenario.purchase_price, scenario.promoter_data?.rent_currency || 'USD')}
                    </p>
                  </div>

                  {scenario.promoter_data && (
                    <>
                      <div>
                        <div className="flex items-center gap-2 text-gray-600 mb-2">
                          <TrendingUp size={18} />
                          <span className="text-sm">
                            {fr
                              ? `Loyer ${scenario.promoter_data.rent_type === 'monthly' ? 'mensuel' : 'journalier'}`
                              : `${scenario.promoter_data.rent_type === 'monthly' ? 'Monthly' : 'Daily'} rent`}
                          </span>
                        </div>
                        <p className="text-2xl font-bold text-green-600">
                          {formatCurrency(scenario.promoter_data.monthly_rent, scenario.promoter_data.rent_currency)}
                        </p>
                      </div>

                      <div className="bg-blue-50 rounded-lg p-4">
                        <p className="text-xs text-blue-700 mb-1">{fr ? 'Appréciation annuelle' : 'Annual appreciation'}</p>
                        <p className="text-xl font-bold text-blue-900">{scenario.promoter_data.annual_appreciation}%</p>
                      </div>

                      <div className="bg-purple-50 rounded-lg p-4">
                        <p className="text-xs text-purple-700 mb-1">{fr ? "Taux d'occupation" : 'Occupancy rate'}</p>
                        <p className="text-xl font-bold text-purple-900">{scenario.promoter_data.occupancy_rate}%</p>
                      </div>

                      <div className="bg-orange-50 rounded-lg p-4">
                        <p className="text-xs text-orange-700 mb-1">{fr ? 'Frais de gestion' : 'Management fees'}</p>
                        <p className="text-xl font-bold text-orange-900">{scenario.promoter_data.management_fees}%</p>
                      </div>

                      <div className="bg-green-50 rounded-lg p-4">
                        <p className="text-xs text-green-700 mb-1">{fr ? 'Durée du projet' : 'Project duration'}</p>
                        <p className="text-xl font-bold text-green-900">{scenario.promoter_data.project_duration} {fr ? 'ans' : 'yr'}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Permissions Badge */}
            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg shadow-lg p-6 text-white">
              <h3 className="font-bold mb-3 flex items-center gap-2">
                <Lock size={18} />
                {fr ? 'Accès autorisé' : 'Authorized access'}
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${permissions.view_financials ? 'bg-green-400' : 'bg-red-400'}`}></div>
                  <span>{fr ? 'Informations financières' : 'Financial information'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${permissions.view_documents ? 'bg-green-400' : 'bg-red-400'}`}></div>
                  <span>{fr ? 'Documents' : 'Documents'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${permissions.view_bookings ? 'bg-green-400' : 'bg-red-400'}`}></div>
                  <span>{fr ? 'Calendrier de bookings' : 'Bookings calendar'}</span>
                </div>
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
              <h3 className="font-bold text-gray-900 mb-3">{fr ? 'À propos de ce lien' : 'About this link'}</h3>
              <div className="space-y-2 text-sm text-gray-600">
                {fr ? (
                  <>
                    <p>&bull; Ce lien vous donne un accès en <strong>lecture seule</strong></p>
                    <p>&bull; Les informations affichées dépendent des permissions accordées</p>
                    <p>&bull; Aucune modification n&apos;est possible via ce lien</p>
                  </>
                ) : (
                  <>
                    <p>&bull; This link gives you <strong>read-only</strong> access</p>
                    <p>&bull; The information displayed depends on the permissions granted</p>
                    <p>&bull; No modifications are possible via this link</p>
                  </>
                )}
              </div>
            </div>

            {/* Branding */}
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-600">{fr ? 'Propulsé par' : 'Powered by'}</p>
              <p className="text-lg font-bold text-gray-900">CERDIA</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
