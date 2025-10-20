'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useInvestment } from '@/contexts/InvestmentContext'
import { LayoutDashboard, FolderKanban, Settings, LogOut, Menu, X, TrendingUp, Building2, DollarSign, Users, AlertCircle, Clock, Calendar } from 'lucide-react'
import ProjetTab from '@/components/ProjetTab'
import AdministrationTab from '@/components/AdministrationTab'
import ExchangeRateWidget from '@/components/ExchangeRateWidget'
import { getCurrentExchangeRate } from '@/lib/exchangeRate'

type TabType = 'dashboard' | 'projet' | 'administration'

export default function DashboardPage() {
  const { currentUser, isAuthenticated, logout } = useAuth()
  const { investors, properties, transactions, capexAccounts, currentAccounts, rndAccounts, paymentSchedules, loading } = useInvestment()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabType>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const [exchangeRate, setExchangeRate] = useState<number>(1.35)

  // Charger le taux de change au montage
  useEffect(() => {
    const loadExchangeRate = async () => {
      const rate = await getCurrentExchangeRate('USD', 'CAD')
      setExchangeRate(rate)
    }
    loadExchangeRate()
  }, [])

  // Fonction helper pour calculer le flag de couleur selon proximité échéance
  const getColorFlag = (dueDate: string): { color: string; emoji: string; label: string } => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const due = new Date(dueDate)
    due.setHours(0, 0, 0, 0)
    const daysUntil = Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (daysUntil < 0) {
      return { color: 'red', emoji: '🔴', label: 'En retard' }
    } else if (daysUntil <= 5) {
      return { color: 'orange', emoji: '🟠', label: 'Urgent' }
    } else if (daysUntil <= 10) {
      return { color: 'yellow', emoji: '🟡', label: 'Bientôt' }
    } else {
      return { color: 'green', emoji: '🟢', label: 'À venir' }
    }
  }

  // Gérer la vue mobile/desktop
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024
      setIsMobile(mobile)
      setSidebarOpen(!mobile)
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/connexion')
    }
  }, [isAuthenticated, router])

  const handleLogout = async () => {
    await logout()
    router.push('/')
  }

  // Calculer les KPIs en temps réel basés sur les TRANSACTIONS

  // 1. TOTAL INVESTISSEURS - Somme des apports (transactions de type 'investissement')
  const totalInvestisseurs = transactions
    .filter(t => t.type === 'investissement')
    .reduce((sum, t) => sum + t.amount, 0)

  // 2. INVESTISSEMENT IMMOBILIER - Somme des paiements sur propriétés (transactions avec property_id, sauf investissements)
  const totalInvestissementImmobilier = transactions
    .filter(t => t.property_id && t.type !== 'investissement')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0)

  // 3. DÉPENSES OPÉRATION - Somme des dépenses CAPEX + R&D
  const totalDepensesOperation =
    capexAccounts.reduce((sum, acc) => sum + acc.investment_capex + acc.operation_capex, 0) +
    (rndAccounts?.reduce((sum, acc) => sum + acc.investment_capex + acc.operation_capex, 0) || 0)

  // 4. COMPTE COURANT - Calculé = Total Investisseurs - Investissements - Dépenses
  const compteCurrentCalcule = totalInvestisseurs - totalInvestissementImmobilier - totalDepensesOperation

  // Autres KPIs
  const numberOfProperties = properties.length
  const totalCurrentValue = investors.reduce((sum, inv) => sum + (inv.current_value || 0), 0)
  const averageROI = properties.length > 0
    ? properties.reduce((sum, prop) => sum + (prop.expected_roi || 0), 0) / properties.length
    : 0
  const estimatedMonthlyRevenue = (totalCurrentValue * (averageROI / 100)) / 12

  // Transactions récentes (5 dernières)
  const recentTransactions = transactions.slice(0, 5)

  // Paiements à venir (pending/overdue uniquement, triés par date)
  const upcomingPayments = paymentSchedules
    .filter(payment => payment.status === 'pending' || payment.status === 'overdue')
    .map(payment => {
      const property = properties.find(p => p.id === payment.property_id)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const due = new Date(payment.due_date)
      due.setHours(0, 0, 0, 0)
      const daysUntil = Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      const flag = getColorFlag(payment.due_date)
      const amountInCAD = payment.currency === 'USD' ? payment.amount * exchangeRate : payment.amount

      return {
        ...payment,
        property_name: property?.name || 'Propriété inconnue',
        property_location: property?.location || '',
        days_until_due: daysUntil,
        color_flag: flag,
        amount_in_cad: amountInCAD
      }
    })
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gray-300 border-t-gray-900 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'dashboard' as TabType, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'projet' as TabType, label: 'Projet', icon: FolderKanban },
    { id: 'administration' as TabType, label: 'Administration', icon: Settings },
  ]

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar gauche */}
      <aside
        className={`fixed left-0 top-16 h-[calc(100vh-4rem)] bg-[#c7c7c7] text-black transition-all duration-300 z-40 ${
          sidebarOpen ? 'w-64' : 'w-0'
        } overflow-hidden overflow-y-auto`}
      >
        <div className="p-6">
          {/* Header Sidebar */}
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold">Navigation</h2>
            {isMobile && (
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-2 hover:bg-gray-400 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            )}
          </div>

          {/* User Info */}
          <div className="mb-8 pb-6 border-b border-gray-500">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-[#5e5e5e] text-white rounded-full flex items-center justify-center text-lg font-semibold">
                {currentUser.firstName.charAt(0)}{currentUser.lastName.charAt(0)}
              </div>
              <div>
                <p className="font-semibold">{currentUser.firstName} {currentUser.lastName}</p>
                <p className="text-sm text-gray-700">{currentUser.role === 'admin' ? 'Administrateur' : 'Investisseur'}</p>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="space-y-2">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id)
                    if (isMobile) setSidebarOpen(false)
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-full transition-all ${
                    activeTab === tab.id
                      ? 'bg-[#5e5e5e] text-white'
                      : 'text-black hover:bg-[#3e3e3e] hover:text-white'
                  }`}
                >
                  <Icon size={20} />
                  <span className="font-medium">{tab.label}</span>
                </button>
              )
            })}
          </nav>

          {/* Logout Button */}
          <div className="absolute bottom-6 left-6 right-6">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-full text-red-600 hover:bg-red-100 hover:text-red-700 transition-all"
            >
              <LogOut size={20} />
              <span className="font-medium">Déconnexion</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Hamburger Menu - Visible only on mobile */}
      {isMobile && (
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="fixed top-24 left-4 z-50 p-3 bg-[#5e5e5e] text-white rounded-full shadow-lg hover:bg-[#3e3e3e] transition-colors"
        >
          <Menu size={24} />
        </button>
      )}

      {/* Main Content */}
      <main className={`flex-1 transition-all duration-300 ${sidebarOpen && !isMobile ? 'ml-64' : 'ml-0'} ${isMobile ? 'pt-32' : 'pt-20'}`}>
        {/* Content Area */}
        <div className="p-4 sm:p-6 max-w-7xl mx-auto">
          {activeTab === 'dashboard' && (
            <div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Vue d'ensemble</h2>
                {loading && (
                  <div className="text-xs sm:text-sm text-gray-600 flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-gray-400 border-t-gray-900 rounded-full animate-spin"></div>
                    Chargement...
                  </div>
                )}
              </div>

              {/* KPIs Cards - Flux de Trésorerie */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
                {/* 1. Total Investisseurs */}
                <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md border border-gray-200">
                  <div className="flex items-center justify-between mb-2 sm:mb-3">
                    <h3 className="text-gray-600 text-xs sm:text-sm font-medium">Total Investisseurs</h3>
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Users className="text-blue-600" size={18} />
                    </div>
                  </div>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900">
                    {totalInvestisseurs.toLocaleString('fr-CA', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1 sm:mt-2">Apports ({investors.length} investisseurs)</p>
                </div>

                {/* 2. Investissement Immobilier */}
                <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md border border-gray-200">
                  <div className="flex items-center justify-between mb-2 sm:mb-3">
                    <h3 className="text-gray-600 text-xs sm:text-sm font-medium">Investissement Immobilier</h3>
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <Building2 className="text-purple-600" size={18} />
                    </div>
                  </div>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900">
                    {totalInvestissementImmobilier.toLocaleString('fr-CA', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1 sm:mt-2">{numberOfProperties} {numberOfProperties > 1 ? 'propriétés' : 'propriété'}</p>
                </div>

                {/* 3. Dépenses Opération */}
                <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md border border-gray-200">
                  <div className="flex items-center justify-between mb-2 sm:mb-3">
                    <h3 className="text-gray-600 text-xs sm:text-sm font-medium">Dépenses Opération</h3>
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-orange-100 rounded-full flex items-center justify-center">
                      <TrendingDown className="text-orange-600" size={18} />
                    </div>
                  </div>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900">
                    {totalDepensesOperation.toLocaleString('fr-CA', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1 sm:mt-2">CAPEX, R&D, etc.</p>
                </div>

                {/* 4. Compte Courant */}
                <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md border border-gray-200">
                  <div className="flex items-center justify-between mb-2 sm:mb-3">
                    <h3 className="text-gray-600 text-xs sm:text-sm font-medium">Compte Courant</h3>
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <DollarSign className="text-green-600" size={18} />
                    </div>
                  </div>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900">
                    {compteCurrentCalcule.toLocaleString('fr-CA', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1 sm:mt-2">Fonds disponibles</p>
                </div>

              </div>

              {/* Taux de change USD→CAD */}
              <div className="mb-6 sm:mb-8">
                <ExchangeRateWidget />
              </div>

              {/* Section Propriétés */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
                {/* Liste des Propriétés */}
                <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
                  <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
                    <Building2 size={18} className="text-purple-600" />
                    Portefeuille Immobilier
                  </h3>
                  {properties.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">Aucune propriété pour le moment</p>
                  ) : (
                    <div className="space-y-4">
                      {properties.map((property) => {
                        const progress = (property.paid_amount / property.total_cost) * 100
                        return (
                          <div key={property.id} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h4 className="font-semibold text-gray-900">{property.name}</h4>
                                <p className="text-sm text-gray-600">{property.location}</p>
                              </div>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                property.status === 'en_construction' ? 'bg-yellow-100 text-yellow-800' :
                                property.status === 'reservation' ? 'bg-blue-100 text-blue-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                {property.status === 'en_construction' ? 'En construction' :
                                 property.status === 'reservation' ? 'Réservation' : property.status}
                              </span>
                            </div>
                            <div className="mt-3">
                              <div className="flex justify-between text-sm mb-1">
                                <span className="text-gray-600">Progression</span>
                                <span className="font-semibold">{progress.toFixed(1)}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-blue-600 h-2 rounded-full transition-all"
                                  style={{ width: `${progress}%` }}
                                ></div>
                              </div>
                              <div className="flex justify-between text-xs mt-2 text-gray-600">
                                <span>
                                  {property.paid_amount.toLocaleString('fr-CA', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })} payé
                                </span>
                                <span>
                                  / {property.total_cost.toLocaleString('fr-CA', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })}
                                </span>
                              </div>
                            </div>
                            <div className="mt-3 pt-3 border-t border-gray-100">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">ROI attendu</span>
                                <span className="font-semibold text-green-600">{property.expected_roi}%</span>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Répartition des Investisseurs */}
                <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
                  <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
                    <Users size={18} className="text-blue-600" />
                    Répartition des Investisseurs
                  </h3>
                  {investors.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">Aucun investisseur pour le moment</p>
                  ) : (
                    <div className="space-y-3">
                      {investors
                        .sort((a, b) => b.total_invested - a.total_invested)
                        .map((investor) => (
                        <div key={investor.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-semibold">
                              {investor.first_name.charAt(0)}{investor.last_name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{investor.first_name} {investor.last_name}</p>
                              <p className="text-sm text-gray-600">{investor.percentage_ownership.toFixed(2)}% du portefeuille</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-gray-900">
                              {investor.total_invested.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
                            </p>
                            <p className="text-xs text-gray-500">{investor.total_shares.toLocaleString()} parts</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Paiements à venir */}
              {upcomingPayments.length > 0 && (
                <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md mb-6 sm:mb-8">
                  <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
                    <AlertCircle size={18} className="text-orange-600" />
                    Paiements à venir
                    <span className="ml-auto text-xs sm:text-sm font-normal text-gray-500">
                      {upcomingPayments.length} paiement{upcomingPayments.length > 1 ? 's' : ''} en attente
                    </span>
                  </h3>
                  <div className="space-y-3">
                    {upcomingPayments.map((payment) => {
                      const bgColorClass = payment.color_flag.color === 'red' ? 'bg-red-50 border-red-200' :
                                          payment.color_flag.color === 'orange' ? 'bg-orange-50 border-orange-200' :
                                          payment.color_flag.color === 'yellow' ? 'bg-yellow-50 border-yellow-200' :
                                          'bg-green-50 border-green-200'

                      return (
                        <div key={payment.id} className={`border rounded-lg p-3 sm:p-4 ${bgColorClass}`}>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                            {/* Flag et statut */}
                            <div className="flex items-center gap-2">
                              <span className="text-xl sm:text-2xl">{payment.color_flag.emoji}</span>
                              <div>
                                <p className="text-xs sm:text-sm font-medium text-gray-700">{payment.color_flag.label}</p>
                                <p className="text-xs text-gray-600">
                                  {payment.days_until_due < 0
                                    ? `${Math.abs(payment.days_until_due)} jour${Math.abs(payment.days_until_due) > 1 ? 's' : ''} de retard`
                                    : payment.days_until_due === 0
                                    ? 'Aujourd\'hui'
                                    : `Dans ${payment.days_until_due} jour${payment.days_until_due > 1 ? 's' : ''}`
                                  }
                                </p>
                              </div>
                            </div>

                            {/* Informations du paiement */}
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-gray-900 truncate">{payment.property_name}</p>
                              <p className="text-xs sm:text-sm text-gray-600">{payment.term_label}</p>
                            </div>

                            {/* Date d'échéance */}
                            <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-700">
                              <Calendar size={14} className="text-gray-500" />
                              <span>
                                {new Date(payment.due_date).toLocaleDateString('fr-CA', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric'
                                })}
                              </span>
                            </div>

                            {/* Montants */}
                            <div className="text-right">
                              <p className="font-bold text-gray-900">
                                {payment.amount.toLocaleString('fr-CA', {
                                  style: 'currency',
                                  currency: payment.currency,
                                  minimumFractionDigits: 0
                                })}
                              </p>
                              {payment.currency === 'USD' && (
                                <p className="text-xs text-gray-600">
                                  ≈ {payment.amount_in_cad.toLocaleString('fr-CA', {
                                    style: 'currency',
                                    currency: 'CAD',
                                    minimumFractionDigits: 0
                                  })}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Note sur le taux de change */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-xs text-gray-600 flex items-center gap-1">
                      <Clock size={12} />
                      Taux de change USD→CAD: {exchangeRate.toFixed(4)} (mis à jour quotidiennement)
                    </p>
                  </div>
                </div>
              )}

              {/* Transactions Récentes */}
              <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
                <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Activité récente</h3>
                {recentTransactions.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">Aucune transaction récente</p>
                ) : (
                  <div className="space-y-4">
                    {recentTransactions.map((transaction) => (
                      <div key={transaction.id} className="flex items-center gap-4 pb-4 border-b border-gray-100 last:border-0">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          transaction.type === 'investissement' ? 'bg-green-100' :
                          transaction.type === 'paiement' ? 'bg-blue-100' :
                          transaction.type === 'dividende' ? 'bg-purple-100' :
                          'bg-gray-100'
                        }`}>
                          <DollarSign size={20} className={
                            transaction.type === 'investissement' ? 'text-green-600' :
                            transaction.type === 'paiement' ? 'text-blue-600' :
                            transaction.type === 'dividende' ? 'text-purple-600' :
                            'text-gray-600'
                          } />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{transaction.description}</p>
                          <p className="text-sm text-gray-600">
                            {new Date(transaction.date).toLocaleDateString('fr-CA', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </p>
                        </div>
                        <span className={`font-semibold ${
                          transaction.type === 'investissement' || transaction.type === 'dividende'
                            ? 'text-green-600'
                            : 'text-blue-600'
                        }`}>
                          {transaction.amount >= 0 ? '+' : ''}{transaction.amount.toLocaleString('fr-CA', {
                            style: 'currency',
                            currency: 'USD'
                          })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'projet' && <ProjetTab />}

          {activeTab === 'administration' && <AdministrationTab />}
        </div>
      </main>

      {/* Mobile Overlay */}
      {sidebarOpen && isMobile && (
        <div
          className="fixed inset-0 bg-black/50 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  )
}
