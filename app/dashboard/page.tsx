'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { LayoutDashboard, FolderKanban, Settings, LogOut, Menu, X } from 'lucide-react'

type TabType = 'dashboard' | 'projet' | 'administration'

interface Investor {
  id: string
  firstName: string
  lastName: string
  phone: string
  email: string
  username: string
  amount: number
  investmentType: 'immobilier' | 'actions' | 'mixte'
  status: 'actif' | 'inactif'
  accessLevel: 'investisseur'
  permissions: {
    dashboard: boolean
    projet: boolean
    administration: boolean
  }
  createdAt: string
}

export default function DashboardPage() {
  const { currentUser, isAuthenticated, logout } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabType>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [isMobile, setIsMobile] = useState(false)

  // Gestion des investisseurs
  const [investors, setInvestors] = useState<Investor[]>([])
  const [newFirstName, setNewFirstName] = useState('')
  const [newLastName, setNewLastName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newUsername, setNewUsername] = useState('')
  const [newAmount, setNewAmount] = useState('')
  const [newType, setNewType] = useState<'immobilier' | 'actions' | 'mixte'>('immobilier')
  const [permissions, setPermissions] = useState({
    dashboard: true,
    projet: false,
    administration: false
  })

  // Gérer la vue mobile/desktop
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024
      setIsMobile(mobile)
      setSidebarOpen(!mobile) // Fermé sur mobile, ouvert sur desktop
    }

    handleResize() // Initialiser
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Charger les investisseurs depuis localStorage
  useEffect(() => {
    const savedInvestors = localStorage.getItem('cerdia-investors')
    if (savedInvestors) {
      try {
        setInvestors(JSON.parse(savedInvestors))
      } catch (error) {
        console.error('Error loading investors:', error)
      }
    }
  }, [])

  // Sauvegarder les investisseurs dans localStorage
  useEffect(() => {
    if (investors.length > 0) {
      localStorage.setItem('cerdia-investors', JSON.stringify(investors))
    }
  }, [investors])

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/connexion')
    }
  }, [isAuthenticated, router])

  const handleLogout = async () => {
    await logout()
    router.push('/')
  }

  const handleAddInvestor = (e: React.FormEvent) => {
    e.preventDefault()

    if (!newFirstName.trim() || !newLastName.trim() || !newPhone || !newEmail || !newUsername || !newAmount) {
      alert('Veuillez remplir tous les champs obligatoires')
      return
    }

    const newInvestor: Investor = {
      id: Date.now().toString(),
      firstName: newFirstName.trim(),
      lastName: newLastName.trim(),
      phone: newPhone,
      email: newEmail,
      username: newUsername,
      amount: parseFloat(newAmount),
      investmentType: newType,
      status: 'actif',
      accessLevel: 'investisseur',
      permissions: { ...permissions },
      createdAt: new Date().toISOString()
    }

    setInvestors([...investors, newInvestor])

    // Reset form
    setNewFirstName('')
    setNewLastName('')
    setNewPhone('')
    setNewEmail('')
    setNewUsername('')
    setNewAmount('')
    setNewType('immobilier')
    setPermissions({
      dashboard: true,
      projet: false,
      administration: false
    })
  }

  const handlePermissionChange = (tab: 'dashboard' | 'projet' | 'administration') => {
    setPermissions(prev => ({
      ...prev,
      [tab]: !prev[tab]
    }))
  }

  const handleDeleteInvestor = (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet investisseur ?')) {
      setInvestors(investors.filter(inv => inv.id !== id))
    }
  }

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
                    if (isMobile) setSidebarOpen(false) // Fermer sur mobile après sélection
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

      {/* Hamburger Menu - Visible only on mobile, below header */}
      {isMobile && (
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="fixed top-20 left-4 z-40 p-2 bg-[#5e5e5e] text-white rounded-full shadow-lg hover:bg-[#3e3e3e] transition-colors"
        >
          <Menu size={20} />
        </button>
      )}

      {/* Main Content */}
      <main className={`flex-1 transition-all duration-300 ${sidebarOpen && !isMobile ? 'ml-64' : 'ml-0'} ${isMobile ? 'pt-32' : 'pt-16'}`}>
        {/* Content Area */}
        <div className="p-6 max-w-7xl mx-auto">
          {activeTab === 'dashboard' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Vue d'ensemble</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* Stats Cards */}
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-gray-600 text-sm font-medium mb-2">Total Investissements</h3>
                  <p className="text-3xl font-bold text-gray-900">700 000 $</p>
                  <p className="text-sm text-green-600 mt-2">+3.2% ce mois</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-gray-600 text-sm font-medium mb-2">Propriétés</h3>
                  <p className="text-3xl font-bold text-gray-900">3</p>
                  <p className="text-sm text-gray-600 mt-2">Actives</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-gray-600 text-sm font-medium mb-2">Revenus Mensuels</h3>
                  <p className="text-3xl font-bold text-gray-900">6 670 $</p>
                  <p className="text-sm text-blue-600 mt-2">Objectif atteint</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-gray-600 text-sm font-medium mb-2">ROI Annuel</h3>
                  <p className="text-3xl font-bold text-gray-900">10.2%</p>
                  <p className="text-sm text-green-600 mt-2">+1.5% vs projection</p>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-4">Activité récente</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-4 pb-4 border-b">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <FolderKanban size={20} className="text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">Paiement reçu - Oasis Bay A301</p>
                      <p className="text-sm text-gray-600">Il y a 2 heures</p>
                    </div>
                    <span className="text-green-600 font-semibold">+2,100 $</span>
                  </div>
                  <div className="flex items-center gap-4 pb-4 border-b">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <Settings size={20} className="text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">Rapport mensuel généré</p>
                      <p className="text-sm text-gray-600">Il y a 1 jour</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'projet' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Gestion des Projets</h2>
              <div className="bg-white p-6 rounded-lg shadow">
                <p className="text-gray-600">Le gestionnaire d'investissement et le suivi de paiement seront intégrés ici.</p>
                <p className="text-sm text-gray-500 mt-2">En construction...</p>
              </div>
            </div>
          )}

          {activeTab === 'administration' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold mb-4">Administration</h2>

              {/* Gestion des Investisseurs */}
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="font-semibold mb-4 text-lg flex items-center gap-2">
                  <Settings size={20} />
                  Gestion des Investisseurs
                </h3>

                {/* Formulaire d'ajout d'investisseur */}
                <form onSubmit={handleAddInvestor} className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
                  <h4 className="font-medium mb-4">Ajouter un nouvel investisseur</h4>

                  {/* Informations personnelles */}
                  <div className="mb-6">
                    <h5 className="text-sm font-semibold text-gray-700 mb-3">Informations personnelles</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Prénom *
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: Jean"
                          className="w-full border border-gray-300 rounded-lg px-4 py-2"
                          value={newFirstName}
                          onChange={(e) => setNewFirstName(e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Nom *
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: Dupont"
                          className="w-full border border-gray-300 rounded-lg px-4 py-2"
                          value={newLastName}
                          onChange={(e) => setNewLastName(e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Numéro de téléphone *
                        </label>
                        <input
                          type="tel"
                          placeholder="Ex: (514) 555-1234"
                          className="w-full border border-gray-300 rounded-lg px-4 py-2"
                          value={newPhone}
                          onChange={(e) => setNewPhone(e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Adresse courriel *
                        </label>
                        <input
                          type="email"
                          placeholder="Ex: jean.dupont@exemple.com"
                          className="w-full border border-gray-300 rounded-lg px-4 py-2"
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Informations de connexion */}
                  <div className="mb-6">
                    <h5 className="text-sm font-semibold text-gray-700 mb-3">Informations de connexion</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Nom d'utilisateur *
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: jdupont"
                          className="w-full border border-gray-300 rounded-lg px-4 py-2"
                          value={newUsername}
                          onChange={(e) => setNewUsername(e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Niveau d'accès
                        </label>
                        <input
                          type="text"
                          value="Investisseur"
                          className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-gray-100"
                          disabled
                        />
                      </div>
                    </div>
                  </div>

                  {/* Informations d'investissement */}
                  <div className="mb-6">
                    <h5 className="text-sm font-semibold text-gray-700 mb-3">Informations d'investissement</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Montant investi ($) *
                        </label>
                        <input
                          type="number"
                          placeholder="Ex: 25000"
                          className="w-full border border-gray-300 rounded-lg px-4 py-2"
                          value={newAmount}
                          onChange={(e) => setNewAmount(e.target.value)}
                          min="0"
                          step="0.01"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Type d'investissement *
                        </label>
                        <select
                          className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-white"
                          value={newType}
                          onChange={(e) => setNewType(e.target.value as 'immobilier' | 'actions' | 'mixte')}
                          required
                        >
                          <option value="immobilier">Immobilier</option>
                          <option value="actions">Actions</option>
                          <option value="mixte">Mixte</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Permissions d'accès */}
                  <div className="mb-6">
                    <h5 className="text-sm font-semibold text-gray-700 mb-3">Permissions d'accès aux onglets</h5>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={permissions.dashboard}
                          onChange={() => handlePermissionChange('dashboard')}
                          className="w-4 h-4 rounded border-gray-300"
                        />
                        <span className="text-sm text-gray-700">Dashboard</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={permissions.projet}
                          onChange={() => handlePermissionChange('projet')}
                          className="w-4 h-4 rounded border-gray-300"
                        />
                        <span className="text-sm text-gray-700">Projet</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={permissions.administration}
                          onChange={() => handlePermissionChange('administration')}
                          className="w-4 h-4 rounded border-gray-300"
                        />
                        <span className="text-sm text-gray-700">Administration</span>
                      </label>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="mt-4 bg-[#5e5e5e] hover:bg-[#3e3e3e] text-white px-6 py-2 rounded-full transition-colors"
                  >
                    + Ajouter l'investisseur
                  </button>
                </form>

                {/* Liste des investisseurs */}
                <div>
                  <h4 className="font-medium mb-4">
                    Liste des investisseurs actifs ({investors.length})
                  </h4>
                  {investors.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <p>Aucun investisseur ajouté pour le moment.</p>
                      <p className="text-sm mt-2">Utilisez le formulaire ci-dessus pour ajouter des investisseurs.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b-2 border-gray-200">
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">Nom complet</th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">Utilisateur</th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">Téléphone</th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">Courriel</th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">Montant</th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">Type</th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">Permissions</th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">Statut</th>
                            <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {investors.map((investor) => (
                            <tr key={investor.id} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-3 px-4">
                                {investor.firstName} {investor.lastName}
                              </td>
                              <td className="py-3 px-4 text-gray-600">{investor.username}</td>
                              <td className="py-3 px-4 text-sm text-gray-600">{investor.phone}</td>
                              <td className="py-3 px-4 text-sm text-gray-600">{investor.email}</td>
                              <td className="py-3 px-4 font-semibold">
                                {investor.amount.toLocaleString('fr-CA', {
                                  style: 'currency',
                                  currency: 'USD',
                                  minimumFractionDigits: 0,
                                  maximumFractionDigits: 0
                                })}
                              </td>
                              <td className="py-3 px-4">
                                <span className={`px-2 py-1 rounded-full text-xs ${
                                  investor.investmentType === 'immobilier'
                                    ? 'bg-blue-100 text-blue-800'
                                    : investor.investmentType === 'actions'
                                    ? 'bg-purple-100 text-purple-800'
                                    : 'bg-green-100 text-green-800'
                                }`}>
                                  {investor.investmentType.charAt(0).toUpperCase() + investor.investmentType.slice(1)}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex flex-wrap gap-1">
                                  {investor.permissions.dashboard && (
                                    <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">D</span>
                                  )}
                                  {investor.permissions.projet && (
                                    <span className="px-2 py-1 bg-green-50 text-green-700 rounded text-xs">P</span>
                                  )}
                                  {investor.permissions.administration && (
                                    <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs">A</span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <span className={`px-2 py-1 rounded-full text-xs ${
                                  investor.status === 'actif'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {investor.status.charAt(0).toUpperCase() + investor.status.slice(1)}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <button
                                  onClick={() => handleDeleteInvestor(investor.id)}
                                  className="text-red-600 hover:text-red-800 text-sm font-medium"
                                >
                                  Supprimer
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Paramètres généraux */}
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="font-semibold mb-4">Paramètres généraux</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notifications
                    </label>
                    <select className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-white">
                      <option>Activer toutes les notifications</option>
                      <option>Notifications importantes uniquement</option>
                      <option>Désactiver</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Langue
                    </label>
                    <select className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-white">
                      <option>Français</option>
                      <option>English</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
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
    </div>
  )
}
