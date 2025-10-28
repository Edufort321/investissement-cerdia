'use client'

import React, { useState, useEffect } from 'react'
import {
  Calendar,
  DollarSign,
  MapPin,
  Plane,
  Hotel,
  Activity,
  Plus,
  Trash2,
  Check,
  X,
  Share2,
  Camera,
  Link as LinkIcon,
  Facebook,
  Twitter,
  Instagram,
  Clock,
  TrendingUp,
  Download,
  Users,
  Eye
} from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

interface Event {
  id: string
  type: 'vol' | 'hebergement' | 'activite' | 'transport' | 'condo'
  titre: string
  date: string
  heureDebut: string
  heureFin: string
  lieu: string
  prix?: number
  devise: string
  notes?: string
  transport?: string
  photos?: string[]
}

interface Depense {
  id: string
  date: string
  categorie: string
  description: string
  montant: number
  devise: string
  photos?: string[]
}

interface ChecklistItem {
  id: string
  texte: string
  complete: boolean
}

interface Voyage {
  id: string
  titre: string
  dateDebut: string
  dateFin: string
  budget?: number
  devise: string
  evenements: Event[]
  depenses: Depense[]
  checklist: ChecklistItem[]
  partage: {
    actif: boolean
    lien: string
    enDirect: boolean
  }
}

export default function MonVoyage() {
  const { language, t } = useLanguage()
  const [estInvestisseur, setEstInvestisseur] = useState(false) // Simuler l'état d'auth
  const [voyageActif, setVoyageActif] = useState<Voyage | null>(null)
  const [vueActive, setVueActive] = useState<'dashboard' | 'timeline' | 'checklist' | 'depenses' | 'budget' | 'partage'>('dashboard')
  const [showAddEvent, setShowAddEvent] = useState(false)
  const [newEvent, setNewEvent] = useState<Partial<Event>>({
    type: 'activite',
    devise: 'CAD'
  })

  // Initialiser un voyage exemple
  useEffect(() => {
    const voyageDemo: Voyage = {
      id: '1',
      titre: language === 'fr' ? 'Mon Voyage à Paris' : 'My Trip to Paris',
      dateDebut: '2025-05-15',
      dateFin: '2025-05-22',
      budget: 8000,
      devise: 'CAD',
      evenements: [
        {
          id: '1',
          type: 'vol',
          titre: 'Vol AC123 → Paris',
          date: '2025-05-15',
          heureDebut: '06:00',
          heureFin: '14:00',
          lieu: 'Aéroport YUL → CDG',
          prix: 1200,
          devise: 'CAD',
          transport: 'Avion'
        },
        {
          id: '2',
          type: 'condo',
          titre: 'Condo CERDIA #45',
          date: '2025-05-15',
          heureDebut: '15:30',
          heureFin: '2025-05-22',
          lieu: 'Paris 8e arrondissement',
          prix: 1500,
          devise: 'CAD',
          notes: 'Réservation CERDIA Location'
        },
        {
          id: '3',
          type: 'activite',
          titre: 'Visite du Louvre',
          date: '2025-05-16',
          heureDebut: '10:00',
          heureFin: '14:00',
          lieu: 'Musée du Louvre',
          prix: 45,
          devise: 'CAD'
        },
        {
          id: '4',
          type: 'activite',
          titre: 'Dîner Restaurant Le Parisien',
          date: '2025-05-16',
          heureDebut: '20:00',
          heureFin: '22:30',
          lieu: 'Le Parisien, Champs-Élysées',
          prix: 180,
          devise: 'CAD'
        }
      ],
      depenses: [
        {
          id: '1',
          date: '2025-05-15',
          categorie: 'Transport',
          description: 'Taxi aéroport',
          montant: 65,
          devise: 'CAD',
          photos: []
        }
      ],
      checklist: [
        { id: '1', texte: language === 'fr' ? 'Vérifier passeports' : 'Check passports', complete: true },
        { id: '2', texte: language === 'fr' ? 'Réserver billets d\'avion' : 'Book flight tickets', complete: true },
        { id: '3', texte: language === 'fr' ? 'Réserver hébergement' : 'Book accommodation', complete: true },
        { id: '4', texte: language === 'fr' ? 'Assurance voyage' : 'Travel insurance', complete: false },
        { id: '5', texte: language === 'fr' ? 'Échanger de la monnaie' : 'Exchange currency', complete: false }
      ],
      partage: {
        actif: false,
        lien: `https://cerdia.com/voyage/partage/${Math.random().toString(36).substr(2, 9)}`,
        enDirect: false
      }
    }
    setVoyageActif(voyageDemo)
  }, [language])

  const formatCurrency = (montant: number, devise: string = 'CAD') => {
    return new Intl.NumberFormat(language === 'fr' ? 'fr-CA' : 'en-CA', {
      style: 'currency',
      currency: devise,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(montant)
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString(language === 'fr' ? 'fr-CA' : 'en-CA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const calculerBudgetUtilise = () => {
    if (!voyageActif) return 0
    const totalEvenements = voyageActif.evenements.reduce((sum, e) => sum + (e.prix || 0), 0)
    const totalDepenses = voyageActif.depenses.reduce((sum, d) => sum + d.montant, 0)
    return totalEvenements + totalDepenses
  }

  const calculerPourcentageBudget = () => {
    if (!voyageActif || !voyageActif.budget) return 0
    const utilise = calculerBudgetUtilise()
    return (utilise / voyageActif.budget) * 100
  }

  const toggleChecklistItem = (id: string) => {
    if (!voyageActif) return
    setVoyageActif({
      ...voyageActif,
      checklist: voyageActif.checklist.map(item =>
        item.id === id ? { ...item, complete: !item.complete } : item
      )
    })
  }

  const calculerProgressionChecklist = () => {
    if (!voyageActif) return 0
    const completes = voyageActif.checklist.filter(item => item.complete).length
    return (completes / voyageActif.checklist.length) * 100
  }

  const activerPartage = () => {
    if (!voyageActif) return
    setVoyageActif({
      ...voyageActif,
      partage: {
        ...voyageActif.partage,
        actif: true,
        enDirect: true
      }
    })
  }

  const copierLienPartage = () => {
    if (!voyageActif) return
    navigator.clipboard.writeText(voyageActif.partage.lien)
    alert(language === 'fr' ? 'Lien copié!' : 'Link copied!')
  }

  // Écran d'authentification / paiement pour les visiteurs
  if (!estInvestisseur) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 pt-20 p-6">
        <div className="max-w-4xl mx-auto">
          {/* Écran de paiement */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 md:p-12">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                {language === 'fr' ? 'Mon Voyage CERDIA' : 'My CERDIA Journey'}
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                {language === 'fr'
                  ? 'Planifiez votre voyage parfait avec l\'IA'
                  : 'Plan your perfect trip with AI'}
              </p>
            </div>

            {/* Avantages */}
            <div className="grid md:grid-cols-2 gap-4 mb-8">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-600 p-6 rounded-xl">
                <Calendar className="w-8 h-8 text-indigo-600 dark:text-indigo-400 mb-3" />
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  {language === 'fr' ? 'Timeline 24/7' : '24/7 Timeline'}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {language === 'fr'
                    ? 'Visualisez chaque heure de votre voyage'
                    : 'Visualize every hour of your trip'}
                </p>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-gray-700 dark:to-gray-600 p-6 rounded-xl">
                <TrendingUp className="w-8 h-8 text-green-600 dark:text-green-400 mb-3" />
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  {language === 'fr' ? 'Gestion Budget' : 'Budget Management'}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {language === 'fr'
                    ? 'Suivez vos dépenses en temps réel'
                    : 'Track expenses in real-time'}
                </p>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-700 dark:to-gray-600 p-6 rounded-xl">
                <Share2 className="w-8 h-8 text-purple-600 dark:text-purple-400 mb-3" />
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  {language === 'fr' ? 'Mode "Me Suivre"' : 'Follow Me Mode'}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {language === 'fr'
                    ? 'Partagez votre voyage en direct'
                    : 'Share your trip live'}
                </p>
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-gray-700 dark:to-gray-600 p-6 rounded-xl">
                <Activity className="w-8 h-8 text-orange-600 dark:text-orange-400 mb-3" />
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  {language === 'fr' ? 'Suggestions IA' : 'AI Suggestions'}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {language === 'fr'
                    ? 'Activités suggérées par intelligence artificielle'
                    : 'Activities suggested by AI'}
                </p>
              </div>
            </div>

            {/* Prix */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-8 text-white text-center mb-6">
              <p className="text-sm opacity-90 mb-2">
                {language === 'fr' ? 'Prix par planification' : 'Price per planning'}
              </p>
              <div className="text-5xl font-bold mb-2">15 CAD</div>
              <p className="text-sm opacity-90">
                {language === 'fr' ? 'Accès complet et illimité' : 'Full unlimited access'}
              </p>
            </div>

            {/* Boutons */}
            <div className="space-y-3">
              <button
                onClick={() => setEstInvestisseur(true)}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition shadow-lg"
              >
                {language === 'fr' ? 'Débloquer (15 CAD)' : 'Unlock (15 CAD)'}
              </button>

              <div className="text-center text-sm text-gray-600 dark:text-gray-400">
                {language === 'fr' ? 'ou' : 'or'}
              </div>

              <button
                onClick={() => alert(language === 'fr' ? 'Redirection vers la page d\'investisseur' : 'Redirect to investor page')}
                className="w-full border-2 border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 px-8 py-4 rounded-xl text-lg font-semibold hover:bg-indigo-50 dark:hover:bg-gray-700 transition"
              >
                {language === 'fr' ? 'Devenir Investisseur CERDIA' : 'Become CERDIA Investor'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Interface principale pour les investisseurs
  if (!voyageActif) {
    return <div className="p-6">{language === 'fr' ? 'Chargement...' : 'Loading...'}</div>
  }

  const budgetUtilise = calculerBudgetUtilise()
  const pourcentageBudget = calculerPourcentageBudget()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-20 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* En-tête */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl shadow-xl p-8 text-white mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">{voyageActif.titre}</h1>
              <p className="text-indigo-100">
                <Calendar className="w-4 h-4 inline mr-2" />
                {formatDate(voyageActif.dateDebut)} - {formatDate(voyageActif.dateFin)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-indigo-100 mb-1">
                {language === 'fr' ? 'Budget' : 'Budget'}
              </p>
              <div className="text-2xl font-bold">
                {voyageActif.budget ? formatCurrency(voyageActif.budget, voyageActif.devise) : 'N/A'}
              </div>
              <p className="text-sm text-indigo-100">
                {formatCurrency(budgetUtilise, voyageActif.devise)} {language === 'fr' ? 'utilisé' : 'used'}
              </p>
            </div>
          </div>

          {/* Barre de progression budget */}
          {voyageActif.budget && (
            <div className="mt-4">
              <div className="flex justify-between text-sm mb-2">
                <span>{Math.round(pourcentageBudget)}%</span>
                <span className={pourcentageBudget > 90 ? 'text-red-200' : 'text-indigo-100'}>
                  {pourcentageBudget > 90 && '⚠️ '}
                  {formatCurrency(voyageActif.budget - budgetUtilise, voyageActif.devise)} {language === 'fr' ? 'restant' : 'remaining'}
                </span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all duration-500 ${
                    pourcentageBudget > 90 ? 'bg-red-400' : pourcentageBudget > 75 ? 'bg-yellow-400' : 'bg-green-400'
                  }`}
                  style={{ width: `${Math.min(pourcentageBudget, 100)}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>

        {/* Menu de navigation */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-2 mb-6 flex flex-wrap gap-2">
          {[
            { id: 'dashboard', icon: Activity, label: language === 'fr' ? 'Vue d\'ensemble' : 'Overview' },
            { id: 'timeline', icon: Clock, label: 'Timeline' },
            { id: 'checklist', icon: Check, label: 'Checklist' },
            { id: 'depenses', icon: DollarSign, label: language === 'fr' ? 'Dépenses' : 'Expenses' },
            { id: 'budget', icon: TrendingUp, label: 'Budget' },
            { id: 'partage', icon: Share2, label: language === 'fr' ? 'Partage' : 'Share' }
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setVueActive(item.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                vueActive === item.id
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </div>

        {/* Contenu selon la vue active */}
        {vueActive === 'dashboard' && (
          <div className="grid md:grid-cols-3 gap-6 mb-6">
            {/* Statistiques */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {language === 'fr' ? 'Événements' : 'Events'}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {voyageActif.evenements.length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {language === 'fr' ? 'Total dépensé' : 'Total spent'}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {formatCurrency(budgetUtilise, voyageActif.devise)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                  <Check className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Checklist</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {voyageActif.checklist.filter(i => i.complete).length}/{voyageActif.checklist.length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {vueActive === 'timeline' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {language === 'fr' ? 'Timeline du Voyage' : 'Trip Timeline'}
              </h2>
              <button
                onClick={() => setShowAddEvent(true)}
                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
              >
                <Plus className="w-4 h-4" />
                {language === 'fr' ? 'Ajouter' : 'Add'}
              </button>
            </div>

            {/* Liste des événements */}
            <div className="space-y-4">
              {voyageActif.evenements
                .sort((a, b) => new Date(`${a.date} ${a.heureDebut}`).getTime() - new Date(`${b.date} ${b.heureDebut}`).getTime())
                .map(event => (
                  <div
                    key={event.id}
                    className={`p-4 rounded-lg border-2 ${
                      event.type === 'vol' ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-700' :
                      event.type === 'condo' ? 'bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-700' :
                      event.type === 'hebergement' ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-700' :
                      event.type === 'activite' ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-700' :
                      'bg-gray-50 border-gray-200 dark:bg-gray-700 dark:border-gray-600'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {event.type === 'vol' && <Plane className="w-5 h-5 text-blue-600" />}
                          {event.type === 'condo' && <Hotel className="w-5 h-5 text-purple-600" />}
                          {event.type === 'hebergement' && <Hotel className="w-5 h-5 text-green-600" />}
                          {event.type === 'activite' && <Activity className="w-5 h-5 text-yellow-600" />}
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100">{event.titre}</h3>
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                          <p>
                            <Clock className="w-4 h-4 inline mr-1" />
                            {formatDate(event.date)} • {event.heureDebut} - {event.heureFin}
                          </p>
                          <p>
                            <MapPin className="w-4 h-4 inline mr-1" />
                            {event.lieu}
                          </p>
                          {event.prix && (
                            <p className="font-semibold text-gray-900 dark:text-gray-100">
                              <DollarSign className="w-4 h-4 inline mr-1" />
                              {formatCurrency(event.prix, event.devise)}
                            </p>
                          )}
                        </div>
                      </div>
                      <button className="text-red-500 hover:text-red-700">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {vueActive === 'checklist' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                {language === 'fr' ? 'Checklist de Voyage' : 'Travel Checklist'}
              </h2>
              <div className="mb-4">
                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                  <span>{language === 'fr' ? 'Progression' : 'Progress'}</span>
                  <span>{Math.round(calculerProgressionChecklist())}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${calculerProgressionChecklist()}%` }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {voyageActif.checklist.map(item => (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 p-4 rounded-lg border-2 transition ${
                    item.complete
                      ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-700'
                      : 'bg-white border-gray-200 dark:bg-gray-700 dark:border-gray-600'
                  }`}
                >
                  <button
                    onClick={() => toggleChecklistItem(item.id)}
                    className={`w-6 h-6 rounded border-2 flex items-center justify-center transition ${
                      item.complete
                        ? 'bg-green-600 border-green-600'
                        : 'border-gray-300 dark:border-gray-600 hover:border-indigo-600'
                    }`}
                  >
                    {item.complete && <Check className="w-4 h-4 text-white" />}
                  </button>
                  <span
                    className={`flex-1 ${
                      item.complete
                        ? 'line-through text-gray-500 dark:text-gray-400'
                        : 'text-gray-900 dark:text-gray-100'
                    }`}
                  >
                    {item.texte}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {vueActive === 'partage' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
              {language === 'fr' ? 'Mode "Me Suivre"' : 'Follow Me Mode'}
            </h2>

            {!voyageActif.partage.actif ? (
              <div className="text-center py-12">
                <Share2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  {language === 'fr'
                    ? 'Partagez votre voyage en temps réel avec vos amis et famille'
                    : 'Share your trip in real-time with friends and family'}
                </p>
                <button
                  onClick={activerPartage}
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-3 rounded-lg hover:from-indigo-700 hover:to-purple-700 transition"
                >
                  {language === 'fr' ? 'Activer le partage' : 'Activate sharing'}
                </button>
              </div>
            ) : (
              <div>
                {voyageActif.partage.enDirect && (
                  <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-700 rounded-lg p-4 mb-6 flex items-center gap-3">
                    <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></div>
                    <span className="font-semibold text-red-600 dark:text-red-400">
                      {language === 'fr' ? 'EN DIRECT' : 'LIVE'}
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {language === 'fr' ? 'Lien de partage' : 'Share link'}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={voyageActif.partage.lien}
                      readOnly
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                    <button
                      onClick={copierLienPartage}
                      className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
                    >
                      <LinkIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 mb-6">
                  <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
                    <Facebook className="w-5 h-5" />
                    Facebook
                  </button>
                  <button className="flex items-center gap-2 bg-sky-500 text-white px-4 py-2 rounded-lg hover:bg-sky-600 transition">
                    <Twitter className="w-5 h-5" />
                    Twitter
                  </button>
                  <button className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-lg hover:from-purple-700 hover:to-pink-700 transition">
                    <Instagram className="w-5 h-5" />
                    Instagram
                  </button>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <Eye className="w-5 h-5" />
                    <span>{language === 'fr' ? '12 personnes suivent votre voyage' : '12 people following your trip'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
