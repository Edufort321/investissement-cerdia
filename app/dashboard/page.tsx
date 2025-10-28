'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useInvestment } from '@/contexts/InvestmentContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { useExchangeRate } from '@/contexts/ExchangeRateContext'
import { LayoutDashboard, FolderKanban, Settings, LogOut, Menu, X, TrendingUp, TrendingDown, Building2, DollarSign, Users, AlertCircle, Clock, Calendar, Calculator, Wallet, Briefcase } from 'lucide-react'
import ProjetTab from '@/components/ProjetTab'
import AdministrationTab from '@/components/AdministrationTab'
import ScenariosTab from '@/components/ScenariosTab'
import InvestorReservationsCalendar from '@/components/InvestorReservationsCalendar'
import TreasuryDashboard from '@/components/TreasuryDashboard'
import CashFlowForecast from '@/components/CashFlowForecast'
import BankReconciliation from '@/components/BankReconciliation'
import PaymentSchedule from '@/components/PaymentSchedule'
import TreasuryAlerts from '@/components/TreasuryAlerts'
import ProjectManagementDashboard from '@/components/ProjectManagementDashboard'
import BudgetDashboard from '@/components/BudgetDashboard'
import UserGuide from '@/components/UserGuide'
import NotesManager from '@/components/NotesManager'
import ExchangeRateWidget from '@/components/ExchangeRateWidget'
import SharePriceWidget from '@/components/SharePriceWidget'
import PropertyValuationManager from '@/components/PropertyValuationManager'
import SharePriceCalculator from '@/components/SharePriceCalculator'
import InstallPWAPrompt from '@/components/InstallPWAPrompt'
import CorporateBookTab from '@/components/CorporateBookTab'

type TabType = 'dashboard' | 'projet' | 'evaluateur' | 'reservations' | 'administration'
type AdminSubTabType = 'investisseurs' | 'transactions' | 'capex' | 'rd_dividendes' | 'rapports_fiscaux' | 'performance' | 'sync_revenues' | 'tresorerie' | 'gestion_projet' | 'budgetisation' | 'evaluations' | 'prix_parts' | 'livre_entreprise' | 'mode_emploi' | 'bloc_notes'

export default function DashboardPage() {
  const { currentUser, isAuthenticated, logout } = useAuth()
  const { investors, properties, transactions, capexAccounts, currentAccounts, rndAccounts, paymentSchedules, loading } = useInvestment()
  const { t, language } = useLanguage()
  const { rate: exchangeRate } = useExchangeRate()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabType>('dashboard')
  const [adminSubTab, setAdminSubTab] = useState<AdminSubTabType>('investisseurs')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [isMobile, setIsMobile] = useState(false)

  // Fonction helper pour calculer le flag de couleur selon statut et proximité échéance
  const getColorFlag = (dueDate: string, status: string): { color: string; emoji: string; label: string } => {
    // Si payé, toujours vert
    if (status === 'paid') {
      return { color: 'green', emoji: '🟢', label: 'Payé' }
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const due = new Date(dueDate)
    due.setHours(0, 0, 0, 0)
    const daysUntil = Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    // Pour les paiements en attente (pending)
    if (daysUntil < 0) {
      // En retard
      return { color: 'red', emoji: '🔴', label: t('dashboard.overdue') }
    } else if (daysUntil <= 7) {
      // À venir bientôt (7 jours ou moins)
      return { color: 'orange', emoji: '🟡', label: t('dashboard.urgent') }
    } else {
      // Futur (plus de 7 jours)
      return { color: 'gray', emoji: '⚪', label: t('dashboard.upcoming') }
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

  // 1. TOTAL INVESTISSEURS (CAD) - Somme des apports (transactions de type 'investissement')
  const totalInvestisseurs = transactions
    .filter(t => t.type === 'investissement')
    .reduce((sum, t) => sum + t.amount, 0)

  // 2. INVESTISSEMENT IMMOBILIER (USD) - Somme de TOUTES les transactions liées à une propriété (incluant investissements directs)
  const totalInvestissementImmobilierUSD = transactions
    .filter(t => t.property_id) // Toutes les transactions avec property_id (investissements directs + paiements depuis compte)
    .reduce((sum, t) => {
      // Si la transaction a une devise source USD, utiliser source_amount
      if (t.source_currency === 'USD' && t.source_amount) {
        return sum + Math.abs(t.source_amount)
      }
      // Sinon, convertir le montant CAD en USD
      return sum + (Math.abs(t.amount) / exchangeRate)
    }, 0)

  // Convertir Investissement Immobilier en CAD pour le calcul du Compte Courant
  const totalInvestissementImmobilierCAD = totalInvestissementImmobilierUSD * exchangeRate

  // 3. DÉPENSES OPÉRATION (CAD) - Somme des dépenses CAPEX + R&D
  const totalDepensesOperation =
    capexAccounts.reduce((sum, acc) => sum + acc.investment_capex + acc.operation_capex, 0) +
    (rndAccounts?.reduce((sum, acc) => sum + acc.investment_capex + acc.operation_capex, 0) || 0)

  // 4. COMPTE COURANT (CAD) - Calculé = Total Investisseurs - Investissements (convertis) - Dépenses
  const compteCurrentCalcule = totalInvestisseurs - totalInvestissementImmobilierCAD - totalDepensesOperation

  // Autres KPIs
  const numberOfProperties = properties.length
  const totalCurrentValue = investors.reduce((sum, inv) => sum + (inv.current_value || 0), 0)
  const averageROI = properties.length > 0
    ? properties.reduce((sum, prop) => sum + (prop.expected_roi || 0), 0) / properties.length
    : 0
  const estimatedMonthlyRevenue = (totalCurrentValue * (averageROI / 100)) / 12

  // Transactions récentes (5 dernières)
  const recentTransactions = transactions.slice(0, 5)

  // Tous les paiements (triés par date)
  const upcomingPayments = paymentSchedules
    .map(payment => {
      const property = properties.find(p => p.id === payment.property_id)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const due = new Date(payment.due_date)
      due.setHours(0, 0, 0, 0)
      const daysUntil = Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      const flag = getColorFlag(payment.due_date, payment.status)
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
    .sort((a, b) => {
      // Trier: en retard d'abord, puis par date
      if (a.color_flag.color === 'red' && b.color_flag.color !== 'red') return -1
      if (a.color_flag.color !== 'red' && b.color_flag.color === 'red') return 1
      if (a.color_flag.color === 'orange' && b.color_flag.color === 'gray') return -1
      if (a.color_flag.color === 'gray' && b.color_flag.color === 'orange') return 1
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
    })

  // Calculer les statistiques réelles des investisseurs depuis les transactions
  const investorStats = investors.map(investor => {
    // Calculer le total investi depuis les transactions
    const totalFromTransactions = transactions
      .filter(t => t.investor_id === investor.id && t.type === 'investissement')
      .reduce((sum, t) => sum + t.amount, 0)

    return {
      ...investor,
      calculated_total_invested: totalFromTransactions,
      calculated_percentage: totalInvestisseurs > 0 ? (totalFromTransactions / totalInvestisseurs) * 100 : 0
    }
  })

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gray-300 border-t-gray-900 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    )
  }

  // Filtrer les onglets selon les permissions de l'utilisateur
  const allTabs = [
    { id: 'dashboard' as TabType, label: t('nav.dashboard'), icon: LayoutDashboard, permission: 'dashboard' },
    { id: 'projet' as TabType, label: t('nav.projects'), icon: FolderKanban, permission: 'projet' },
    { id: 'evaluateur' as TabType, label: 'Évaluateur', icon: Calculator, permission: null }, // Toujours visible
    { id: 'reservations' as TabType, label: 'Réservations', icon: Calendar, permission: null }, // Toujours visible
    { id: 'administration' as TabType, label: t('nav.administration'), icon: Settings, permission: 'administration' },
  ]

  const tabs = allTabs.filter(tab => {
    // Si pas de permission requise, toujours visible
    if (!tab.permission) return true

    // Si admin, accès à tout
    if (currentUser?.investorData?.access_level === 'admin') return true

    // Sinon vérifier la permission spécifique
    const permissions = currentUser?.investorData?.permissions as any
    return permissions?.[tab.permission] === true
  })

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex transition-colors duration-300">
      {/* Sidebar gauche */}
      <aside
        className={`fixed left-0 top-20 h-[calc(100vh-5rem)] bg-[#c7c7c7] dark:bg-gray-800 text-black dark:text-gray-100 transition-all duration-300 z-40 ${
          sidebarOpen ? 'w-64' : 'w-0'
        } overflow-hidden overflow-y-auto`}
      >
        <div className="p-6 pb-6 min-h-full flex flex-col">
          {/* Header Sidebar */}
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold">{t('nav.dashboard')}</h2>
            {isMobile && (
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1 hover:bg-gray-400 rounded-lg transition-colors"
              >
                <X size={24} />
              </button>
            )}
          </div>

          {/* User Info */}
          <div className="mb-8 pb-6 border-b border-gray-500 dark:border-gray-600">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-[#5e5e5e] dark:bg-gray-700 text-white rounded-full flex items-center justify-center text-lg font-semibold">
                {currentUser.firstName.charAt(0)}{currentUser.lastName.charAt(0)}
              </div>
              <div>
                <p className="font-semibold">{currentUser.firstName} {currentUser.lastName}</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{currentUser.role === 'admin' ? t('accessLevel.admin') : t('accessLevel.investor')}</p>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="space-y-2 flex-1">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <div key={tab.id}>
                  <button
                    onClick={() => {
                      setActiveTab(tab.id)
                      if (isMobile && tab.id !== 'administration') setSidebarOpen(false)
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-full transition-all ${
                      activeTab === tab.id
                        ? 'bg-[#5e5e5e] dark:bg-gray-700 text-white'
                        : 'text-black dark:text-gray-100 hover:bg-[#3e3e3e] dark:hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    <Icon size={20} />
                    <span className="font-medium">{tab.label}</span>
                  </button>

                  {/* Sous-onglets Administration */}
                  {tab.id === 'administration' && activeTab === 'administration' && (
                    <div className="mt-2 ml-4 space-y-1">
                      <button
                        onClick={() => {
                          setAdminSubTab('investisseurs')
                          if (isMobile) setSidebarOpen(false)
                        }}
                        className={`w-full text-left px-4 py-2 text-sm rounded-lg transition-all ${
                          adminSubTab === 'investisseurs'
                            ? 'bg-gray-200 dark:bg-gray-700 text-[#5e5e5e] dark:text-gray-100 font-medium'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        Investisseurs
                      </button>
                      <button
                        onClick={() => {
                          setAdminSubTab('transactions')
                          if (isMobile) setSidebarOpen(false)
                        }}
                        className={`w-full text-left px-4 py-2 text-sm rounded-lg transition-all ${
                          adminSubTab === 'transactions'
                            ? 'bg-gray-200 dark:bg-gray-700 text-[#5e5e5e] dark:text-gray-100 font-medium'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        Transactions
                      </button>
                      <button
                        onClick={() => {
                          setAdminSubTab('capex')
                          if (isMobile) setSidebarOpen(false)
                        }}
                        className={`w-full text-left px-4 py-2 text-sm rounded-lg transition-all ${
                          adminSubTab === 'capex'
                            ? 'bg-gray-200 dark:bg-gray-700 text-[#5e5e5e] dark:text-gray-100 font-medium'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        CAPEX
                      </button>
                      <button
                        onClick={() => {
                          setAdminSubTab('rd_dividendes')
                          if (isMobile) setSidebarOpen(false)
                        }}
                        className={`w-full text-left px-4 py-2 text-sm rounded-lg transition-all ${
                          adminSubTab === 'rd_dividendes'
                            ? 'bg-gray-200 dark:bg-gray-700 text-[#5e5e5e] dark:text-gray-100 font-medium'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        R&D / Dividendes
                      </button>
                      <button
                        onClick={() => {
                          setAdminSubTab('rapports_fiscaux')
                          if (isMobile) setSidebarOpen(false)
                        }}
                        className={`w-full text-left px-4 py-2 text-sm rounded-lg transition-all ${
                          adminSubTab === 'rapports_fiscaux'
                            ? 'bg-gray-200 dark:bg-gray-700 text-[#5e5e5e] dark:text-gray-100 font-medium'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        Rapports Fiscaux
                      </button>
                      <button
                        onClick={() => {
                          setAdminSubTab('performance')
                          if (isMobile) setSidebarOpen(false)
                        }}
                        className={`w-full text-left px-4 py-2 text-sm rounded-lg transition-all ${
                          adminSubTab === 'performance'
                            ? 'bg-gray-200 dark:bg-gray-700 text-[#5e5e5e] dark:text-gray-100 font-medium'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        Performance ROI
                      </button>
                      <button
                        onClick={() => {
                          setAdminSubTab('sync_revenues')
                          if (isMobile) setSidebarOpen(false)
                        }}
                        className={`w-full text-left px-4 py-2 text-sm rounded-lg transition-all ${
                          adminSubTab === 'sync_revenues'
                            ? 'bg-gray-200 dark:bg-gray-700 text-[#5e5e5e] dark:text-gray-100 font-medium'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        Sync Revenus
                      </button>
                      <button
                        onClick={() => {
                          setAdminSubTab('tresorerie')
                          if (isMobile) setSidebarOpen(false)
                        }}
                        className={`w-full text-left px-4 py-2 text-sm rounded-lg transition-all ${
                          adminSubTab === 'tresorerie'
                            ? 'bg-gray-200 dark:bg-gray-700 text-[#5e5e5e] dark:text-gray-100 font-medium'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        Trésorerie
                      </button>
                      <button
                        onClick={() => {
                          setAdminSubTab('gestion_projet')
                          if (isMobile) setSidebarOpen(false)
                        }}
                        className={`w-full text-left px-4 py-2 text-sm rounded-lg transition-all ${
                          adminSubTab === 'gestion_projet'
                            ? 'bg-gray-200 dark:bg-gray-700 text-[#5e5e5e] dark:text-gray-100 font-medium'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        Gestion Projet
                      </button>
                      <button
                        onClick={() => {
                          setAdminSubTab('budgetisation')
                          if (isMobile) setSidebarOpen(false)
                        }}
                        className={`w-full text-left px-4 py-2 text-sm rounded-lg transition-all ${
                          adminSubTab === 'budgetisation'
                            ? 'bg-gray-200 dark:bg-gray-700 text-[#5e5e5e] dark:text-gray-100 font-medium'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        Budgétisation
                      </button>
                      <button
                        onClick={() => {
                          setAdminSubTab('evaluations')
                          if (isMobile) setSidebarOpen(false)
                        }}
                        className={`w-full text-left px-4 py-2 text-sm rounded-lg transition-all ${
                          adminSubTab === 'evaluations'
                            ? 'bg-gray-200 dark:bg-gray-700 text-[#5e5e5e] dark:text-gray-100 font-medium'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        Évaluations
                      </button>
                      <button
                        onClick={() => {
                          setAdminSubTab('prix_parts')
                          if (isMobile) setSidebarOpen(false)
                        }}
                        className={`w-full text-left px-4 py-2 text-sm rounded-lg transition-all ${
                          adminSubTab === 'prix_parts'
                            ? 'bg-gray-200 dark:bg-gray-700 text-[#5e5e5e] dark:text-gray-100 font-medium'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        Prix des parts
                      </button>
                      <button
                        onClick={() => {
                          setAdminSubTab('livre_entreprise')
                          if (isMobile) setSidebarOpen(false)
                        }}
                        className={`w-full text-left px-4 py-2 text-sm rounded-lg transition-all ${
                          adminSubTab === 'livre_entreprise'
                            ? 'bg-gray-200 dark:bg-gray-700 text-[#5e5e5e] dark:text-gray-100 font-medium'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        Livre d'entreprise
                      </button>
                      <button
                        onClick={() => {
                          setAdminSubTab('mode_emploi')
                          if (isMobile) setSidebarOpen(false)
                        }}
                        className={`w-full text-left px-4 py-2 text-sm rounded-lg transition-all ${
                          adminSubTab === 'mode_emploi'
                            ? 'bg-gray-200 dark:bg-gray-700 text-[#5e5e5e] dark:text-gray-100 font-medium'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        Mode d'emploi
                      </button>
                      <button
                        onClick={() => {
                          setAdminSubTab('bloc_notes')
                          if (isMobile) setSidebarOpen(false)
                        }}
                        className={`w-full text-left px-4 py-2 text-sm rounded-lg transition-all ${
                          adminSubTab === 'bloc_notes'
                            ? 'bg-gray-200 dark:bg-gray-700 text-[#5e5e5e] dark:text-gray-100 font-medium'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        Bloc-notes
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </nav>

          {/* Logout Button */}
          <div className="mt-6 pt-6 border-t border-gray-500 dark:border-gray-600">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-full text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-700 dark:hover:text-red-300 transition-all"
            >
              <LogOut size={20} />
              <span className="font-medium">{t('nav.logout')}</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Hamburger Menu - Visible only on mobile */}
      {isMobile && (
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="fixed top-28 left-4 z-30 p-2 bg-[#5e5e5e] text-white rounded-full shadow-lg hover:bg-[#3e3e3e] transition"
        >
          <Menu size={20} />
        </button>
      )}

      {/* Main Content */}
      <main className={`flex-1 transition-all duration-300 ${sidebarOpen && !isMobile ? 'ml-64' : 'ml-0'} ${sidebarOpen && isMobile ? 'pt-[calc(100vh-4rem)]' : 'pt-32'} overflow-x-hidden`}>
        {/* Content Area */}
        <div className="p-4 sm:p-6 max-w-7xl mx-auto overflow-x-hidden">
          {activeTab === 'dashboard' && (
            <div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-6 mt-6">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">{t('dashboard.overview')}</h2>
                {loading && (
                  <div className="text-xs sm:text-sm text-gray-600 flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-gray-400 border-t-gray-900 rounded-full animate-spin"></div>
                    {t('common.loading')}
                  </div>
                )}
              </div>

              {/* KPIs Cards - Flux de Trésorerie */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
                {/* 1. Total Investisseurs (CAD) */}
                <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-2 sm:mb-3">
                    <h3 className="text-gray-600 text-xs sm:text-sm font-medium">{t('dashboard.totalInvestors')}</h3>
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Users className="text-blue-600" size={18} />
                    </div>
                  </div>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
                    {totalInvestisseurs.toLocaleString(language === 'fr' ? 'fr-CA' : 'en-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1 sm:mt-2">{t('dashboard.cadContributions')} ({investors.length} {investors.length > 1 ? t('dashboard.investors') : t('dashboard.investor')})</p>
                </div>

                {/* 2. Investissement Immobilier (CAD) */}
                <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-2 sm:mb-3">
                    <h3 className="text-gray-600 text-xs sm:text-sm font-medium">{t('dashboard.realEstateInvestment')}</h3>
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <Building2 className="text-purple-600" size={18} />
                    </div>
                  </div>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
                    {totalInvestissementImmobilierCAD.toLocaleString(language === 'fr' ? 'fr-CA' : 'en-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1 sm:mt-2">
                    {numberOfProperties} {numberOfProperties > 1 ? t('dashboard.properties') : t('dashboard.property')} • {totalInvestissementImmobilierUSD.toLocaleString(language === 'fr' ? 'fr-CA' : 'en-CA', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })} USD
                  </p>
                </div>

                {/* 3. Dépenses Opération (CAD) */}
                <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-2 sm:mb-3">
                    <h3 className="text-gray-600 text-xs sm:text-sm font-medium">{t('dashboard.operationalExpenses')}</h3>
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-orange-100 rounded-full flex items-center justify-center">
                      <TrendingDown className="text-orange-600" size={18} />
                    </div>
                  </div>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
                    {totalDepensesOperation.toLocaleString(language === 'fr' ? 'fr-CA' : 'en-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1 sm:mt-2">{t('dashboard.capexRnD')}</p>
                </div>

                {/* 4. Compte Courant (CAD) */}
                <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-2 sm:mb-3">
                    <h3 className="text-gray-600 text-xs sm:text-sm font-medium">{t('dashboard.currentAccount')}</h3>
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <DollarSign className="text-green-600" size={18} />
                    </div>
                  </div>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
                    {compteCurrentCalcule.toLocaleString(language === 'fr' ? 'fr-CA' : 'en-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1 sm:mt-2">{t('dashboard.availableFunds')}</p>
                </div>

              </div>

              {/* Widget Prix des Parts et Taux de change */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
                <SharePriceWidget />
                <ExchangeRateWidget />
              </div>

              {/* Section Propriétés */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
                {/* Liste des Propriétés */}
                <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-md">
                  <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
                    <Building2 size={18} className="text-purple-600" />
                    {t('dashboard.realEstatePortfolio')}
                  </h3>
                  {properties.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">{t('dashboard.noProperties')}</p>
                  ) : (
                    <div className="space-y-4">
                      {properties.map((property) => {
                        // Calculer le montant payé depuis les transactions réelles (incluant investissements directs)
                        const paidFromTransactions = transactions
                          .filter(t => t.property_id === property.id) // Toutes les transactions liées à cette propriété
                          .reduce((sum, t) => {
                            // Si la transaction a une devise source USD, utiliser source_amount
                            if (t.source_currency === 'USD' && t.source_amount) {
                              return sum + Math.abs(t.source_amount)
                            }
                            // Sinon, convertir le montant CAD en USD
                            return sum + (Math.abs(t.amount) / exchangeRate)
                          }, 0) // USD

                        // Convertir en CAD
                        const paidAmountCAD = paidFromTransactions * exchangeRate
                        const totalCostCAD = property.total_cost * exchangeRate

                        const progress = (paidFromTransactions / property.total_cost) * 100

                        return (
                          <div key={property.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h4 className="font-semibold text-gray-900 dark:text-gray-100">{property.name}</h4>
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
                                  {paidAmountCAD.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })} payé
                                </span>
                                <span>
                                  / {totalCostCAD.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
                                </span>
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                ({paidFromTransactions.toLocaleString('fr-CA', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })} / {property.total_cost.toLocaleString('fr-CA', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })} USD)
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
                <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-md">
                  <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
                    <Users size={18} className="text-blue-600" />
                    {t('dashboard.investorBreakdown')}
                  </h3>
                  {investorStats.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">{t('dashboard.noInvestors')}</p>
                  ) : (
                    <div className="space-y-3">
                      {investorStats
                        .filter(investor => investor.calculated_total_invested > 0)
                        .sort((a, b) => b.calculated_total_invested - a.calculated_total_invested)
                        .map((investor) => (
                        <div key={investor.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-semibold">
                              {investor.first_name.charAt(0)}{investor.last_name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-gray-100">{investor.first_name} {investor.last_name}</p>
                              <p className="text-sm text-gray-600">{investor.calculated_percentage.toFixed(2)}% {t('dashboard.ownership')}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-gray-900 dark:text-gray-100">
                              {investor.calculated_total_invested.toLocaleString(language === 'fr' ? 'fr-CA' : 'en-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
                            </p>
                            <p className="text-xs text-gray-500">{investor.total_shares.toLocaleString()} {t('dashboard.shares')}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Calendrier des paiements */}
              {upcomingPayments.length > 0 && (
                <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md mb-6 sm:mb-8">
                  <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
                    <Calendar size={18} className="text-blue-600" />
                    Calendrier des paiements
                    <span className="ml-auto text-xs sm:text-sm font-normal text-gray-500">
                      {upcomingPayments.filter(p => p.status === 'pending' || p.status === 'overdue').length} en attente • {upcomingPayments.filter(p => p.status === 'paid').length} payé(s)
                    </span>
                  </h3>

                  {/* Total des paiements à venir */}
                  {(() => {
                    const pendingPayments = upcomingPayments.filter(p => p.status === 'pending' || p.status === 'overdue')
                    const totalUSD = pendingPayments
                      .filter(p => p.currency === 'USD')
                      .reduce((sum, p) => sum + p.amount, 0)
                    const totalCAD = pendingPayments
                      .filter(p => p.currency === 'CAD')
                      .reduce((sum, p) => sum + p.amount, 0)
                    const totalCADConverted = totalUSD * exchangeRate + totalCAD

                    return (
                      <div className="mb-4 p-3 sm:p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <div>
                            <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Total des paiements à venir</p>
                            {totalUSD > 0 && (
                              <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 mt-1">
                                {totalUSD.toLocaleString('fr-CA', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })}
                                {totalCAD > 0 && ` + ${totalCAD.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}`}
                              </p>
                            )}
                            {totalUSD === 0 && totalCAD > 0 && (
                              <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 mt-1">
                                {totalCAD.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
                              </p>
                            )}
                          </div>
                          <div className="text-left sm:text-right">
                            <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">Équivalent CAD</p>
                            <p className="text-lg sm:text-xl font-bold text-blue-700 dark:text-blue-400">
                              {totalCADConverted.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  })()}

                  <div className="space-y-3">
                    {upcomingPayments.map((payment) => {
                      const bgColorClass = payment.color_flag.color === 'red' ? 'bg-red-50 border-red-200' :
                                          payment.color_flag.color === 'orange' ? 'bg-orange-50 border-orange-200' :
                                          payment.color_flag.color === 'green' ? 'bg-green-50 border-green-200' :
                                          'bg-gray-50 border-gray-200'

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
                              <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">{payment.property_name}</p>
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
                              <p className="font-bold text-gray-900 dark:text-gray-100">
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

                          {/* Barre de progression pour paiements partiels */}
                          {(() => {
                            // Calculer le montant déjà payé pour ce paiement
                            const paidAmount = transactions
                              .filter(t => t.payment_schedule_id === payment.id)
                              .reduce((sum, t) => sum + Math.abs(t.amount), 0)

                            const remainingAmount = payment.amount - paidAmount
                            const progressPercentage = payment.amount > 0 ? (paidAmount / payment.amount) * 100 : 0

                            // Afficher seulement si des paiements partiels ont été faits
                            if (paidAmount > 0 && remainingAmount > 0) {
                              return (
                                <div className="mt-3 pt-3 border-t border-gray-300">
                                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                                    <span>Payé: {paidAmount.toLocaleString('fr-CA', { style: 'currency', currency: payment.currency, minimumFractionDigits: 2 })}</span>
                                    <span>Reste: {remainingAmount.toLocaleString('fr-CA', { style: 'currency', currency: payment.currency, minimumFractionDigits: 2 })}</span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                      className="bg-blue-600 h-2 rounded-full transition-all"
                                      style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                                    />
                                  </div>
                                  <p className="text-xs text-gray-500 mt-1 text-center">
                                    {progressPercentage.toFixed(1)}% payé
                                  </p>
                                </div>
                              )
                            }
                            return null
                          })()}
                        </div>
                      )
                    })}
                  </div>

                  {/* Note sur le taux de change */}
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
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
                            currency: 'CAD'
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

          {activeTab === 'evaluateur' && <ScenariosTab />}

          {activeTab === 'reservations' && (
            <div className="p-6">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Calendrier de réservations</h1>
              <InvestorReservationsCalendar />
            </div>
          )}

          {activeTab === 'administration' && (currentUser?.investorData?.access_level === 'admin' || currentUser?.investorData?.permissions?.administration === true) && (
            <>
              {adminSubTab === 'tresorerie' && <TreasuryDashboard />}
              {adminSubTab === 'gestion_projet' && <ProjectManagementDashboard />}
              {adminSubTab === 'budgetisation' && <BudgetDashboard />}
              {adminSubTab === 'evaluations' && (
                <div className="p-6">
                  <PropertyValuationManager />
                </div>
              )}
              {adminSubTab === 'prix_parts' && (
                <div className="p-6">
                  <SharePriceCalculator />
                </div>
              )}
              {adminSubTab === 'livre_entreprise' && (
                <div className="p-6">
                  <CorporateBookTab />
                </div>
              )}
              {adminSubTab === 'mode_emploi' && <UserGuide />}
              {adminSubTab === 'bloc_notes' && <NotesManager />}
              {!['tresorerie', 'gestion_projet', 'budgetisation', 'evaluations', 'prix_parts', 'livre_entreprise', 'mode_emploi', 'bloc_notes'].includes(adminSubTab) && (
                <AdministrationTab activeSubTab={adminSubTab} />
              )}
            </>
          )}
        </div>
      </main>

      {/* Mobile Overlay */}
      {sidebarOpen && isMobile && (
        <div
          className="fixed inset-0 bg-black/50 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* PWA Install Prompt */}
      <InstallPWAPrompt />
    </div>
  )
}
