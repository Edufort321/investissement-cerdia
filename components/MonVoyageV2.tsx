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
  Eye,
  Shield,
  Zap,
  Star,
  Printer,
  CreditCard,
  FolderOpen,
  FileText,
  Globe,
  Sparkles,
  Menu,
  ArrowLeft,
  Edit2,
  Save
} from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter, useSearchParams } from 'next/navigation'
import { loadStripe } from '@stripe/stripe-js'
import { Evenement, Voyage, Depense, ChecklistItem, Waypoint } from '@/types/voyage'
import VoyageList from './VoyageList'
import GaleriePublique from './GaleriePublique'
import { voyageService, evenementService, depenseService, checklistService, waypointService } from '@/lib/voyage-service'
import VoyageSidebar, { VoyageView } from './voyage/VoyageSidebar'
import VoyageDashboard from './voyage/VoyageDashboard'
import VoyageTimeline from './voyage/VoyageTimeline'
import VoyageChecklist from './voyage/VoyageChecklist'
import VoyageExpenses from './voyage/VoyageExpenses'
import VoyageBudget from './voyage/VoyageBudget'
import VoyageShare, { SharePreferences } from './voyage/VoyageShare'
import CreateTripModal from './voyage/CreateTripModal'
import AddEventModal from './voyage/AddEventModal'
import EditEventModal from './voyage/EditEventModal'
import dynamic from 'next/dynamic'

// Import dynamique pour VoyageMap (car Leaflet utilise window)
const VoyageMap = dynamic(() => import('./voyage/VoyageMap'), {
  ssr: false,
  loading: () => <div className="p-6 text-gray-400">Chargement de la carte...</div>
})

// Types
type UserMode = 'investor' | 'free' | 'single' | 'full' | null

interface UserSession {
  mode: UserMode
  expiresAt?: string
  tripId?: string
  userId?: string
}

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '')

export default function MonVoyageV2() {
  const { language, t } = useLanguage()
  const { currentUser } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  // Dériver isInvestor depuis currentUser
  const isInvestor = currentUser?.investorData !== null && currentUser?.investorData !== undefined

  const [userSession, setUserSession] = useState<UserSession | null>(null)
  const [showModeSelection, setShowModeSelection] = useState(true)
  const [showVoyageChoice, setShowVoyageChoice] = useState(false) // Nouveau/Consulter
  const [showVoyageList, setShowVoyageList] = useState(false) // Liste des voyages
  const [showGalerie, setShowGalerie] = useState(false) // Galerie publique
  const [voyageActif, setVoyageActif] = useState<Voyage | null>(null)
  const [voyageActifId, setVoyageActifId] = useState<string | null>(null) // ID du voyage actif dans la DB
  const [currentView, setCurrentView] = useState<VoyageView>('dashboard')
  const [paymentProcessing, setPaymentProcessing] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showAddEventModal, setShowAddEventModal] = useState(false)
  const [showEditEventModal, setShowEditEventModal] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<Evenement | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [tempTitle, setTempTitle] = useState('')
  const [sharePreferences, setSharePreferences] = useState<SharePreferences>({
    timeline: true,
    checklist: true,
    photos: true,
    budget: false,
    map: true
  })

  // Initialiser la sidebar fermée sur mobile au montage
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(true) // Ouverte sur desktop
      } else {
        setSidebarOpen(false) // Fermée sur mobile
      }
    }

    handleResize() // Initial check
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Handle Stripe payment success/cancel
  useEffect(() => {
    const sessionId = searchParams.get('session_id')
    const mode = searchParams.get('mode') as 'single' | 'full' | null
    const canceled = searchParams.get('canceled')

    if (canceled) {
      alert(language === 'fr' ? 'Paiement annulé' : 'Payment canceled')
      // Clean up URL
      router.replace('/mon-voyage')
      return
    }

    if (sessionId && mode) {
      // Payment successful - activate the session
      const expiresAt = mode === 'single'
        ? new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000).toISOString() // 6 months
        : undefined // No expiration for full mode

      const session: UserSession = {
        mode,
        expiresAt
      }
      localStorage.setItem('monVoyageSession', JSON.stringify(session))
      setUserSession(session)
      setShowModeSelection(false)
      setShowVoyageChoice(true) // Afficher le choix Nouveau/Consulter/Galerie

      // Clean up URL
      router.replace('/mon-voyage')
    }
  }, [searchParams, language, router])

  // Charger la session depuis localStorage
  useEffect(() => {
    const savedSession = localStorage.getItem('monVoyageSession')
    if (savedSession) {
      const session: UserSession = JSON.parse(savedSession)

      // Vérifier si la session n'est pas expirée
      if (session.expiresAt) {
        const now = new Date()
        const expires = new Date(session.expiresAt)
        if (now < expires) {
          setUserSession(session)
          setShowModeSelection(false)
          loadVoyage(session)
        } else {
          // Session expirée
          localStorage.removeItem('monVoyageSession')
        }
      } else {
        setUserSession(session)
        setShowModeSelection(false)
        loadVoyage(session)
      }
    }
  }, [])

  const loadVoyage = (session: UserSession) => {
    if (session.mode === 'free') {
      // Charger depuis localStorage
      const savedVoyage = localStorage.getItem('monVoyageFree')
      if (savedVoyage) {
        setVoyageActif(JSON.parse(savedVoyage))
      } else {
        // Mode gratuit sans voyage - afficher le choix
        setShowVoyageChoice(true)
      }
    } else {
      // Pour les modes payants, afficher le choix Nouveau/Consulter
      setShowVoyageChoice(true)
    }
  }

  // Fonction pour créer un nouveau voyage (Supabase ou localStorage selon le mode)
  const handleCreateNewVoyage = async (data: {
    titre: string
    dateDebut: string
    dateFin: string
    budget?: number
    devise: string
  }) => {
    // TOUJOURS utiliser le mode gratuit si pas d'utilisateur authentifié ou mode gratuit
    const isGratuit = !currentUser || !userSession || userSession.mode === 'free'

    // Mode gratuit - Créer en localStorage uniquement
    if (isGratuit) {
      const voyageLocal: Voyage = {
        id: Date.now().toString(),
        userId: '', // Free mode - no authenticated user
        titre: data.titre,
        dateDebut: data.dateDebut,
        dateFin: data.dateFin,
        budget: data.budget,
        devise: data.devise,
        evenements: [],
        depenses: [],
        checklist: [
          { id: '1', texte: language === 'fr' ? 'Vérifier passeports' : 'Check passports', complete: false },
          { id: '2', texte: language === 'fr' ? 'Réserver billets d\'avion' : 'Book flight tickets', complete: false },
          { id: '3', texte: language === 'fr' ? 'Assurance voyage' : 'Travel insurance', complete: false }
        ],
        partage: {
          actif: false,
          lien: '',
          enDirect: false
        }
      }
      localStorage.setItem('monVoyageFree', JSON.stringify(voyageLocal))
      setVoyageActif(voyageLocal)
      setShowVoyageChoice(false)
      setShowCreateModal(false)
      return
    }

    // Modes payants - Créer dans Supabase
    if (!currentUser) {
      alert(language === 'fr' ? 'Erreur: Utilisateur non connecté' : 'Error: User not logged in')
      return
    }

    try {
      console.log('🔵 Création voyage avec:', {
        user_id: currentUser.id,
        titre: data.titre,
        mode_achat: userSession.mode
      })

      const nouveauVoyage = await voyageService.create({
        user_id: currentUser.id,
        titre: data.titre,
        date_debut: data.dateDebut,
        date_fin: data.dateFin,
        budget: data.budget || 0,
        devise: data.devise,
        mode_achat: userSession.mode as 'investor' | 'single' | 'full',
        expire_at: userSession.expiresAt
      })

      console.log('✅ Voyage créé:', nouveauVoyage)

      if (nouveauVoyage) {
        await loadVoyageFromDB(nouveauVoyage.id)
        setShowCreateModal(false)
      }
    } catch (error: any) {
      console.error('🔴 Erreur création voyage:', error)
      console.error('🔴 Message:', error?.message)
      console.error('🔴 Details:', error?.details)
      console.error('🔴 Hint:', error?.hint)
      console.error('🔴 Code:', error?.code)
      alert(language === 'fr'
        ? `Erreur lors de la création du voyage:\n${error?.message || error}`
        : `Error creating trip:\n${error?.message || error}`)
    }
  }

  const handleGenerateWithAI = async (data: {
    destination: string
    dateDebut: string
    dateFin: string
    budget?: number
    devise: string
  }) => {
    if (!userSession) {
      alert(language === 'fr' ? 'Erreur: Session non trouvée' : 'Error: Session not found')
      return
    }

    try {
      // Afficher un message de chargement
      alert(language === 'fr'
        ? 'Génération du voyage avec IA... Cela peut prendre quelques secondes.'
        : 'Generating trip with AI... This may take a few seconds.')

      // Appeler l'API d'IA pour générer l'itinéraire
      const response = await fetch('/api/ai/generate-trip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destination: data.destination,
          dateDebut: data.dateDebut,
          dateFin: data.dateFin,
          budget: data.budget,
          devise: data.devise,
          language
        })
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to generate trip')
      }

      // Créer le voyage avec les données générées par l'IA
      const voyageData = {
        titre: data.destination,
        dateDebut: data.dateDebut,
        dateFin: data.dateFin,
        budget: data.budget,
        devise: data.devise
      }

      // Créer le voyage de base
      await handleCreateNewVoyage(voyageData)

      // Si des événements ont été générés, les ajouter
      if (result.itinerary && result.itinerary.length > 0 && voyageActif) {
        const updatedEvents: Evenement[] = [...voyageActif.evenements]
        for (const event of result.itinerary) {
          const newEvent: Evenement = {
            id: `event_${Date.now()}_${Math.random()}`,
            type: event.type || 'activite',
            titre: event.titre,
            date: event.date,
            heureDebut: event.heureDebut,
            heureFin: event.heureFin,
            lieu: event.lieu,
            prix: event.prix,
            devise: voyageActif.devise,
            notes: event.notes
          }
          updatedEvents.push(newEvent)
        }

        const updatedVoyage = {
          ...voyageActif,
          evenements: updatedEvents
        } as Voyage
        setVoyageActif(updatedVoyage)

        if (userSession?.mode === 'free') {
          localStorage.setItem('monVoyageFree', JSON.stringify(updatedVoyage))
        }
      }

      setShowCreateModal(false)
      alert(language === 'fr'
        ? 'Voyage généré avec succès!'
        : 'Trip generated successfully!')

    } catch (error: any) {
      console.error('Erreur génération AI:', error)
      alert(language === 'fr'
        ? `Erreur: ${error.message}`
        : `Error: ${error.message}`)
    }
  }

  // Fonction pour charger un voyage depuis Supabase
  const loadVoyageFromDB = async (voyageId: string) => {
    try {
      const voyageDB = await voyageService.getById(voyageId)
      if (!voyageDB) {
        alert(language === 'fr' ? 'Voyage introuvable' : 'Trip not found')
        return
      }

      // Charger tous les éléments liés
      const [evenements, depenses, checklist] = await Promise.all([
        evenementService.getByVoyage(voyageId),
        depenseService.getByVoyage(voyageId),
        checklistService.getByVoyage(voyageId)
      ])

      // Convertir au format Voyage
      const voyage: Voyage = {
        id: voyageDB.id,
        userId: voyageDB.user_id,
        titre: voyageDB.titre,
        dateDebut: voyageDB.date_debut,
        dateFin: voyageDB.date_fin,
        budget: voyageDB.budget,
        devise: voyageDB.devise,
        evenements: evenements.map(e => ({
          id: e.id,
          type: e.type,
          titre: e.titre,
          date: e.date,
          heureDebut: e.heure_debut || '',
          heureFin: e.heure_fin || '',
          lieu: e.lieu || '',
          prix: e.prix,
          devise: e.devise,
          notes: e.notes,
          transport: e.transport
        })),
        depenses: depenses.map(d => ({
          id: d.id,
          date: d.date,
          categorie: d.categorie,
          description: d.description || '',
          montant: d.montant,
          devise: d.devise
        })),
        checklist: checklist.map(c => ({
          id: c.id,
          texte: c.texte,
          complete: c.complete
        })),
        partage: {
          actif: false,
          lien: `https://cerdia.com/voyage/${voyageId}`,
          enDirect: false
        }
      }

      setVoyageActif(voyage)
      setVoyageActifId(voyageId)
      setShowVoyageList(false)
      setShowVoyageChoice(false)
    } catch (error) {
      console.error('Erreur chargement voyage:', error)
      alert(language === 'fr' ? 'Erreur lors du chargement du voyage' : 'Error loading trip')
    }
  }

  const handleModeSelection = (mode: UserMode) => {
    if (mode === 'investor') {
      // Vérifier si l'utilisateur est déjà connecté comme investisseur
      if (currentUser && isInvestor) {
        // Activer directement le mode investisseur
        const investorSession: UserSession = {
          mode: 'investor',
          userId: currentUser.id
        }
        setUserSession(investorSession)
        setShowModeSelection(false)
        setShowVoyageChoice(true)
      } else {
        // Rediriger vers la page de connexion investisseur avec retour vers Mon Voyage
        router.push('/connexion?redirect=/mon-voyage')
      }
    } else if (mode === 'free') {
      // Mode gratuit - session jusqu'à la fermeture (localStorage uniquement)
      const session: UserSession = { mode: 'free' }
      localStorage.setItem('monVoyageSession', JSON.stringify(session))
      setUserSession(session)
      setShowModeSelection(false)
      setShowVoyageChoice(true) // Afficher le choix Nouveau/Consulter
    } else if (mode === 'single' || mode === 'full') {
      // Modes payants - rediriger vers Stripe
      handleStripePayment(mode)
    }
  }

  const handleStripePayment = async (mode: 'single' | 'full') => {
    setPaymentProcessing(true)

    try {
      // Call API to create Stripe checkout session
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mode,
          userId: currentUser?.id || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session')
      }

      // Check if we're in demo mode
      if (data.demo) {
        const price = mode === 'single' ? '5$' : '15$'
        alert(
          language === 'fr'
            ? `🎭 MODE DÉMO\n\nPaiement de ${price} CAD simulé avec succès!\n\n💡 Pour activer les vrais paiements Stripe, consultez STRIPE_SETUP.md`
            : `🎭 DEMO MODE\n\n${price} CAD payment simulated successfully!\n\n💡 To enable real Stripe payments, see STRIPE_SETUP.md`
        )
      }

      // Redirect to checkout (or success page in demo mode)
      window.location.href = data.url
    } catch (error) {
      console.error('Payment error:', error)
      alert(
        language === 'fr'
          ? 'Erreur lors du paiement. Veuillez réessayer.'
          : 'Payment error. Please try again.'
      )
      setPaymentProcessing(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const handleLogout = () => {
    if (userSession?.mode === 'free') {
      const confirm = window.confirm(language === 'fr'
        ? 'Attention: En mode gratuit, vos données seront perdues. Voulez-vous imprimer avant de quitter?'
        : 'Warning: In free mode, your data will be lost. Do you want to print before leaving?')
      if (confirm) {
        handlePrint()
      }
    }
    localStorage.removeItem('monVoyageSession')
    localStorage.removeItem('monVoyageFree')
    setUserSession(null)
    setShowModeSelection(true)
    setVoyageActif(null)
  }

  // Handlers pour les événements, dépenses, checklist, etc.
  const handleAddEvent = () => {
    setShowAddEventModal(true)
  }

  const handleOptimizeRoute = async (optimizedEvents: Evenement[]) => {
    if (!voyageActif) return

    // Update voyage with optimized event order
    const updatedVoyage = {
      ...voyageActif,
      evenements: optimizedEvents
    } as Voyage

    setVoyageActif(updatedVoyage)

    // Save to localStorage or Supabase depending on mode
    const isGratuit = !currentUser || !userSession || userSession.mode === 'free'

    if (isGratuit) {
      // Mode gratuit : localStorage
      localStorage.setItem('monVoyageFree', JSON.stringify(updatedVoyage))
    } else {
      // Mode payant : L'ordre optimisé est sauvegardé dans le state local
      // Les événements individuels existent déjà dans Supabase
      // TODO: Ajouter champ 'ordre' dans EvenementDB pour persister l'ordre optimisé
    }
  }

  const handleSaveEvent = async (eventData: {
    type: 'transport' | 'hotel' | 'activity' | 'restaurant'
    titre: string
    date: string
    lieu: string
    adresse?: string
    villeDepart?: string
    villeArrivee?: string
    dateArrivee?: string
    heureArrivee?: string
    numeroVol?: string
    compagnie?: string
    prix?: number
    notes?: string
    transportMode?: 'plane' | 'train' | 'car' | 'bus' | 'bike' | 'walk' | 'boat'
    duration?: number
    fromLocation?: string
    coordinates?: { lat: number; lng: number }
    rating?: number
    heureDebut?: string
    heureFin?: string
    waypoints?: Waypoint[]
    externalLink?: string
  }) => {
    if (!voyageActif) return

    // Mapper les types d'événements
    const typeMap: Record<string, 'vol' | 'hebergement' | 'activite' | 'transport' | 'condo'> = {
      'hotel': 'hebergement',
      'activity': 'activite',
      'restaurant': 'activite',
      'transport': 'transport'
    }

    const mappedType = typeMap[eventData.type] || 'activite'

    const newEvent: Evenement = {
      id: Date.now().toString(),
      type: mappedType,
      titre: eventData.titre,
      date: eventData.date,
      heureDebut: eventData.heureDebut,
      heureFin: eventData.heureFin,
      lieu: eventData.lieu,
      adresse: eventData.adresse,
      villeDepart: eventData.villeDepart,
      villeArrivee: eventData.villeArrivee,
      dateArrivee: eventData.dateArrivee,
      heureArrivee: eventData.heureArrivee,
      numeroVol: eventData.numeroVol,
      compagnie: eventData.compagnie,
      prix: eventData.prix,
      devise: voyageActif.devise,
      notes: eventData.notes,
      coordonnees: eventData.coordinates,
      transport: eventData.transportMode,
      transportMode: eventData.transportMode,
      duration: eventData.duration,
      fromLocation: eventData.fromLocation,
      rating: eventData.rating,
      waypoints: eventData.waypoints,
      externalLink: eventData.externalLink
    }

    // Mettre à jour l'état local d'abord (optimistic update)
    const updatedVoyage = {
      ...voyageActif,
      evenements: [...voyageActif.evenements, newEvent]
    } as Voyage
    setVoyageActif(updatedVoyage)

    // Sauvegarder dans Supabase si mode payant (investor/single/full)
    const isGratuit = !currentUser || !userSession || userSession.mode === 'free'

    if (!isGratuit && voyageActif.id && voyageActif.id !== 'temp-free-trip') {
      try {
        const evenementDB = await evenementService.create({
          voyage_id: voyageActif.id,
          type: mappedType,
          titre: eventData.titre,
          date: eventData.date,
          heure_debut: eventData.heureDebut,
          heure_fin: eventData.heureFin,
          lieu: eventData.lieu,
          adresse: eventData.adresse,
          coordonnees: eventData.coordinates,
          ville_depart: eventData.villeDepart,
          ville_arrivee: eventData.villeArrivee,
          numero_vol: eventData.numeroVol,
          compagnie: eventData.compagnie,
          heure_arrivee: eventData.heureArrivee,
          date_arrivee: eventData.dateArrivee,
          transport_mode: eventData.transportMode,
          duration: eventData.duration,
          from_location: eventData.fromLocation,
          rating: eventData.rating,
          prix: eventData.prix,
          devise: voyageActif.devise,
          notes: eventData.notes,
          transport: eventData.transportMode,
          external_link: eventData.externalLink
        })

        if (evenementDB) {
          // Mettre à jour l'ID local avec l'ID Supabase
          newEvent.id = evenementDB.id
          setVoyageActif({
            ...updatedVoyage,
            evenements: updatedVoyage.evenements.map(e =>
              e.id === Date.now().toString() ? { ...e, id: evenementDB.id } : e
            )
          } as Voyage)
          console.log('✅ Événement sauvegardé dans Supabase:', evenementDB.id)

          // Sauvegarder les waypoints si présents
          if (eventData.waypoints && eventData.waypoints.length > 0) {
            try {
              for (const waypoint of eventData.waypoints) {
                await waypointService.create({
                  evenement_id: evenementDB.id,
                  nom: waypoint.nom,
                  description: waypoint.description,
                  ordre: waypoint.ordre,
                  coordonnees: waypoint.coordonnees,
                  adresse: waypoint.adresse,
                  photo_url: waypoint.photoUrl,
                  visited: waypoint.visited,
                  notes: waypoint.notes
                })
              }
              console.log(`✅ ${eventData.waypoints.length} waypoint(s) sauvegardé(s)`)
            } catch (error) {
              console.error('❌ Erreur sauvegarde waypoints:', error)
            }
          }
        }
      } catch (error) {
        console.error('❌ Erreur sauvegarde événement Supabase:', error)
        alert(language === 'fr'
          ? 'Erreur lors de la sauvegarde de l\'événement'
          : 'Error saving event')
      }
    } else if (isGratuit) {
      // Mode gratuit : localStorage uniquement
      localStorage.setItem('monVoyageFree', JSON.stringify(updatedVoyage))
    }
  }

  const handleEditEvent = async (eventId: string, updates: Partial<Evenement>) => {
    if (!voyageActif) return

    // Mettre à jour l'état local d'abord (optimistic update)
    const updatedEvenements = voyageActif.evenements.map(e =>
      e.id === eventId ? { ...e, ...updates } : e
    )
    const updatedVoyage = {
      ...voyageActif,
      evenements: updatedEvenements
    } as Voyage
    setVoyageActif(updatedVoyage)

    // Sauvegarder dans Supabase si mode payant
    const isGratuit = !currentUser || !userSession || userSession.mode === 'free'

    if (!isGratuit && voyageActif.id && voyageActif.id !== 'temp-free-trip') {
      try {
        // Préparer les données pour Supabase (snake_case)
        const supabaseUpdates: any = {}
        if (updates.titre !== undefined) supabaseUpdates.titre = updates.titre
        if (updates.date !== undefined) supabaseUpdates.date = updates.date
        if (updates.lieu !== undefined) supabaseUpdates.lieu = updates.lieu
        if (updates.adresse !== undefined) supabaseUpdates.adresse = updates.adresse
        if (updates.villeDepart !== undefined) supabaseUpdates.ville_depart = updates.villeDepart
        if (updates.villeArrivee !== undefined) supabaseUpdates.ville_arrivee = updates.villeArrivee
        if (updates.dateArrivee !== undefined) supabaseUpdates.date_arrivee = updates.dateArrivee
        if (updates.heureArrivee !== undefined) supabaseUpdates.heure_arrivee = updates.heureArrivee
        if (updates.heureDebut !== undefined) supabaseUpdates.heure_debut = updates.heureDebut
        if (updates.heureFin !== undefined) supabaseUpdates.heure_fin = updates.heureFin
        if (updates.prix !== undefined) supabaseUpdates.prix = updates.prix
        if (updates.notes !== undefined) supabaseUpdates.notes = updates.notes
        if (updates.transportMode !== undefined) {
          supabaseUpdates.transport_mode = updates.transportMode
          supabaseUpdates.transport = updates.transportMode
        }
        if (updates.duration !== undefined) supabaseUpdates.duration = updates.duration
        if (updates.rating !== undefined) supabaseUpdates.rating = updates.rating
        if (updates.coordonnees !== undefined) supabaseUpdates.coordonnees = updates.coordonnees
        if (updates.externalLink !== undefined) supabaseUpdates.external_link = updates.externalLink

        await evenementService.update(eventId, supabaseUpdates)
        console.log('✅ Événement mis à jour dans Supabase:', eventId)

        // Mettre à jour les waypoints si fournis
        if (updates.waypoints !== undefined) {
          try {
            // Récupérer les waypoints existants
            const existingWaypoints = await waypointService.getByEvent(eventId)

            // Supprimer tous les waypoints existants
            for (const waypoint of existingWaypoints) {
              await waypointService.delete(waypoint.id)
            }

            // Créer les nouveaux waypoints
            if (updates.waypoints && updates.waypoints.length > 0) {
              for (const waypoint of updates.waypoints) {
                await waypointService.create({
                  evenement_id: eventId,
                  nom: waypoint.nom,
                  description: waypoint.description,
                  ordre: waypoint.ordre,
                  coordonnees: waypoint.coordonnees,
                  adresse: waypoint.adresse,
                  photo_url: waypoint.photoUrl,
                  visited: waypoint.visited,
                  notes: waypoint.notes
                })
              }
              console.log(`✅ ${updates.waypoints.length} waypoint(s) mis à jour`)
            } else {
              console.log('✅ Waypoints supprimés')
            }
          } catch (error) {
            console.error('❌ Erreur mise à jour waypoints:', error)
          }
        }
      } catch (error) {
        console.error('❌ Erreur mise à jour événement Supabase:', error)
        // Rollback
        setVoyageActif(voyageActif)
        alert(language === 'fr'
          ? 'Erreur lors de la mise à jour de l\'événement'
          : 'Error updating event')
        throw error
      }
    } else if (isGratuit) {
      // Mode gratuit : localStorage uniquement
      localStorage.setItem('monVoyageFree', JSON.stringify(updatedVoyage))
    }
  }

  const handleDeleteEvent = async (eventId: string) => {
    if (!voyageActif) return

    // Mettre à jour l'état local d'abord (optimistic update)
    const updatedEvenements = voyageActif.evenements.filter(e => e.id !== eventId)
    const updatedVoyage = {
      ...voyageActif,
      evenements: updatedEvenements
    } as Voyage
    setVoyageActif(updatedVoyage)

    // Sauvegarder dans Supabase si mode payant
    const isGratuit = !currentUser || !userSession || userSession.mode === 'free'

    if (!isGratuit && voyageActif.id && voyageActif.id !== 'temp-free-trip') {
      try {
        await evenementService.delete(eventId)
        console.log('✅ Événement supprimé de Supabase:', eventId)
      } catch (error) {
        console.error('❌ Erreur suppression événement Supabase:', error)
        // Rollback
        setVoyageActif(voyageActif)
        alert(language === 'fr'
          ? 'Erreur lors de la suppression de l\'événement'
          : 'Error deleting event')
        throw error
      }
    } else if (isGratuit) {
      // Mode gratuit : localStorage uniquement
      localStorage.setItem('monVoyageFree', JSON.stringify(updatedVoyage))
    }
  }

  const handleImportFromEmail = async (eventData: any) => {
    if (!voyageActif) return

    // L'événement est déjà formaté par bookingToEvent() dans le composant EmailImport
    const newEvent: Evenement = {
      ...eventData,
      devise: eventData.devise || voyageActif.devise
    }

    // Mettre à jour l'état local
    const updatedVoyage = {
      ...voyageActif,
      evenements: [...voyageActif.evenements, newEvent]
    } as Voyage

    setVoyageActif(updatedVoyage)

    // Save to localStorage or Supabase
    const isGratuit = !currentUser || !userSession || userSession.mode === 'free'

    if (isGratuit) {
      localStorage.setItem('monVoyageFree', JSON.stringify(updatedVoyage))
    } else {
      // TODO: Sauvegarder dans Supabase si mode payant
    }
  }

  const handleAddExpense = () => {
    alert('TODO: Ouvrir modal pour ajouter dépense')
  }

  const handleAddExpenseFromReceipt = async (expenseData: Partial<Depense>) => {
    if (!voyageActif) return

    const newExpense: Depense = {
      id: expenseData.id || Date.now().toString(),
      date: expenseData.date || new Date().toISOString().split('T')[0],
      categorie: expenseData.categorie || 'Autre',
      description: expenseData.description || '',
      montant: expenseData.montant || 0,
      devise: expenseData.devise || voyageActif.devise,
      photos: expenseData.photos || []
    }

    // Mettre à jour l'état local (optimistic update)
    const updatedVoyage = {
      ...voyageActif,
      depenses: [...voyageActif.depenses, newExpense]
    }
    setVoyageActif(updatedVoyage)

    // Sauvegarder dans Supabase si mode payant
    const isGratuit = !currentUser || !userSession || userSession.mode === 'free'

    if (!isGratuit && voyageActif.id && voyageActif.id !== 'temp-free-trip') {
      try {
        const depenseDB = await depenseService.create({
          voyage_id: voyageActif.id,
          date: newExpense.date,
          categorie: newExpense.categorie,
          description: newExpense.description,
          montant: newExpense.montant,
          devise: newExpense.devise
        })

        if (depenseDB) {
          // Mettre à jour l'ID local avec l'ID Supabase
          newExpense.id = depenseDB.id
          setVoyageActif({
            ...updatedVoyage,
            depenses: updatedVoyage.depenses.map(d =>
              d.id === expenseData.id ? { ...d, id: depenseDB.id } : d
            )
          })
          console.log('✅ Dépense sauvegardée dans Supabase:', depenseDB.id)
        }
      } catch (error) {
        console.error('❌ Erreur sauvegarde dépense Supabase:', error)
        alert(language === 'fr'
          ? 'Erreur lors de la sauvegarde de la dépense'
          : 'Error saving expense')
      }
    } else if (isGratuit) {
      // Mode gratuit : localStorage uniquement
      localStorage.setItem('monVoyageFree', JSON.stringify(updatedVoyage))
    }
  }

  const handleToggleChecklist = async (itemId: string) => {
    if (!voyageActif) return
    const item = voyageActif.checklist.find(i => i.id === itemId)
    if (!item) return

    // Mettre à jour l'état local (optimistic update)
    item.complete = !item.complete
    const updatedVoyage = { ...voyageActif }
    setVoyageActif(updatedVoyage)

    // Sauvegarder dans Supabase si mode payant
    const isGratuit = !currentUser || !userSession || userSession.mode === 'free'

    if (!isGratuit && voyageActif.id && voyageActif.id !== 'temp-free-trip') {
      try {
        await checklistService.toggle(itemId, item.complete)
        console.log('✅ Checklist mise à jour dans Supabase:', itemId, item.complete)
      } catch (error) {
        console.error('❌ Erreur mise à jour checklist Supabase:', error)
        // Rollback
        item.complete = !item.complete
        setVoyageActif({ ...voyageActif })
      }
    } else if (isGratuit) {
      // Mode gratuit : localStorage uniquement
      localStorage.setItem('monVoyageFree', JSON.stringify(updatedVoyage))
    }
  }

  const handleAddChecklistItem = async (text: string) => {
    if (!voyageActif) return
    const newItem: ChecklistItem = {
      id: Date.now().toString(),
      texte: text,
      complete: false
    }

    // Mettre à jour l'état local (optimistic update)
    const updatedVoyage = {
      ...voyageActif,
      checklist: [...voyageActif.checklist, newItem]
    }
    setVoyageActif(updatedVoyage)

    // Sauvegarder dans Supabase si mode payant
    const isGratuit = !currentUser || !userSession || userSession.mode === 'free'

    if (!isGratuit && voyageActif.id && voyageActif.id !== 'temp-free-trip') {
      try {
        const checklistDB = await checklistService.create({
          voyage_id: voyageActif.id,
          texte: newItem.texte,
          complete: newItem.complete,
          ordre: voyageActif.checklist.length
        })

        if (checklistDB) {
          // Mettre à jour l'ID local avec l'ID Supabase
          newItem.id = checklistDB.id
          setVoyageActif({
            ...updatedVoyage,
            checklist: updatedVoyage.checklist.map(c =>
              c.id === Date.now().toString() ? { ...c, id: checklistDB.id } : c
            )
          })
          console.log('✅ Item checklist sauvegardé dans Supabase:', checklistDB.id)
        }
      } catch (error) {
        console.error('❌ Erreur sauvegarde checklist Supabase:', error)
        alert(language === 'fr'
          ? 'Erreur lors de la sauvegarde de l\'item'
          : 'Error saving checklist item')
      }
    } else if (isGratuit) {
      // Mode gratuit : localStorage uniquement
      localStorage.setItem('monVoyageFree', JSON.stringify(updatedVoyage))
    }
  }

  const handleDeleteChecklistItem = async (itemId: string) => {
    if (!voyageActif) return

    // Mettre à jour l'état local (optimistic update)
    const updatedVoyage = {
      ...voyageActif,
      checklist: voyageActif.checklist.filter(i => i.id !== itemId)
    }
    setVoyageActif(updatedVoyage)

    // Sauvegarder dans Supabase si mode payant
    const isGratuit = !currentUser || !userSession || userSession.mode === 'free'

    if (!isGratuit && voyageActif.id && voyageActif.id !== 'temp-free-trip') {
      try {
        await checklistService.delete(itemId)
        console.log('✅ Item checklist supprimé de Supabase:', itemId)
      } catch (error) {
        console.error('❌ Erreur suppression checklist Supabase:', error)
        // Rollback
        setVoyageActif(voyageActif)
        alert(language === 'fr'
          ? 'Erreur lors de la suppression de l\'item'
          : 'Error deleting checklist item')
      }
    } else if (isGratuit) {
      // Mode gratuit : localStorage uniquement
      localStorage.setItem('monVoyageFree', JSON.stringify(updatedVoyage))
    }
  }

  const handleDeleteExpense = async (depenseId: string) => {
    if (!voyageActif) return

    // Mettre à jour l'état local (optimistic update)
    const updatedVoyage = {
      ...voyageActif,
      depenses: voyageActif.depenses.filter(d => d.id !== depenseId)
    }
    setVoyageActif(updatedVoyage)

    // Sauvegarder dans Supabase si mode payant
    const isGratuit = !currentUser || !userSession || userSession.mode === 'free'

    if (!isGratuit && voyageActif.id && voyageActif.id !== 'temp-free-trip') {
      try {
        await depenseService.delete(depenseId)
        console.log('✅ Dépense supprimée de Supabase:', depenseId)
      } catch (error) {
        console.error('❌ Erreur suppression dépense Supabase:', error)
        // Rollback
        setVoyageActif(voyageActif)
        alert(language === 'fr'
          ? 'Erreur lors de la suppression de la dépense'
          : 'Error deleting expense')
      }
    } else if (isGratuit) {
      // Mode gratuit : localStorage uniquement
      localStorage.setItem('monVoyageFree', JSON.stringify(updatedVoyage))
    }
  }

  const handleGenerateShareLink = () => {
    alert('TODO: Générer lien de partage')
  }

  const handleToggleLive = () => {
    alert('TODO: Toggle live mode')
  }

  const handleSharePreferencesChange = async (newPrefs: SharePreferences) => {
    setSharePreferences(newPrefs)
    // TODO: Sauvegarder dans Supabase (future feature)
    console.log('📤 Préférences de partage mises à jour:', newPrefs)
  }

  const handleAddTransport = (event: Evenement) => {
    if (!voyageActif) return
    const updatedVoyage = {
      ...voyageActif,
      evenements: [...voyageActif.evenements, event]
    } as Voyage
    setVoyageActif(updatedVoyage)
    alert(`Transport ajouté: ${event.titre}`)
  }

  const handleEditBudget = async (newBudgetValue: number) => {
    if (!voyageActif) return

    // Mettre à jour l'état local (optimistic update)
    const updatedVoyage = {
      ...voyageActif,
      budget: newBudgetValue
    }
    setVoyageActif(updatedVoyage)

    // Sauvegarder dans Supabase si mode payant
    const isGratuit = !currentUser || !userSession || userSession.mode === 'free'

    if (!isGratuit && voyageActif.id && voyageActif.id !== 'temp-free-trip') {
      try {
        await voyageService.update(voyageActif.id, {
          budget: newBudgetValue
        })
        console.log('✅ Budget sauvegardé dans Supabase:', newBudgetValue)
      } catch (error) {
        console.error('❌ Erreur sauvegarde budget Supabase:', error)
        // Revenir à l'ancienne valeur en cas d'erreur
        setVoyageActif(voyageActif)
        throw error // Propager l'erreur pour que VoyageBudget puisse l'afficher
      }
    } else if (isGratuit) {
      // Mode gratuit : localStorage uniquement
      localStorage.setItem('monVoyageFree', JSON.stringify(updatedVoyage))
    }
  }

  const handleGenerateCoverImage = async () => {
    if (!voyageActif) return

    const confirm = window.confirm(
      language === 'fr'
        ? 'Générer une image de couverture avec IA pour ce voyage?'
        : 'Generate an AI cover image for this trip?'
    )

    if (!confirm) return

    try {
      const response = await fetch('/api/ai/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titre: voyageActif.titre,
          language
        })
      })

      const data = await response.json()

      if (data.success && data.imageUrl) {
        setVoyageActif({
          ...voyageActif,
          coverImage: data.imageUrl
        })
        // TODO: Sauvegarder dans Supabase
        alert(language === 'fr' ? 'Image générée avec succès!' : 'Image generated successfully!')
      } else {
        throw new Error(data.error || 'Erreur inconnue')
      }
    } catch (error: any) {
      console.error('Erreur génération image:', error)
      alert(
        language === 'fr'
          ? `Erreur lors de la génération de l'image: ${error.message}`
          : `Error generating image: ${error.message}`
      )
    }
  }

  // Écran de sélection des modes
  if (showModeSelection || !userSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 pt-16 sm:pt-20 md:pt-24 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-gray-100 mb-3">
              {t('voyage.title')}
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              {t('voyage.subtitle')}
            </p>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-8 text-center">
            {t('voyage.selectMode')}
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Mode Investisseur */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border-2 border-indigo-600 dark:border-indigo-400 overflow-hidden relative">
              {currentUser && isInvestor && (
                <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  {language === 'fr' ? 'Connecté' : 'Connected'}
                </div>
              )}
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
                <Shield className="w-12 h-12 mb-3" />
                <h3 className="text-2xl font-bold mb-2">{t('voyage.modeInvestor')}</h3>
                <div className="text-3xl font-bold my-4">{t('voyage.free')}</div>
              </div>
              <div className="p-6">
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  {t('voyage.modeInvestorDesc')}
                </p>
                <ul className="space-y-2 mb-6">
                  <li className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <Check className="w-4 h-4 text-green-600" />
                    {language === 'fr' ? 'Accès illimité' : 'Unlimited access'}
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <Check className="w-4 h-4 text-green-600" />
                    {language === 'fr' ? 'Toutes fonctionnalités' : 'All features'}
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <Check className="w-4 h-4 text-green-600" />
                    {language === 'fr' ? 'Support prioritaire' : 'Priority support'}
                  </li>
                </ul>
                <button
                  onClick={() => handleModeSelection('investor')}
                  className="w-full bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition font-semibold"
                >
                  {currentUser && isInvestor
                    ? (language === 'fr' ? 'Accéder' : 'Access')
                    : t('voyage.login')
                  }
                </button>
              </div>
            </div>

            {/* Mode Gratuit */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border-2 border-gray-300 dark:border-gray-600 overflow-hidden">
              <div className="bg-gradient-to-r from-gray-600 to-gray-700 p-6 text-white">
                <Printer className="w-12 h-12 mb-3" />
                <h3 className="text-2xl font-bold mb-2">{t('voyage.modeFree')}</h3>
                <div className="text-3xl font-bold my-4">{t('voyage.free')}</div>
              </div>
              <div className="p-6">
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  {t('voyage.modeFreeDesc')}
                </p>
                <ul className="space-y-2 mb-6">
                  <li className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <Check className="w-4 h-4 text-green-600" />
                    {language === 'fr' ? 'Impression uniquement' : 'Print only'}
                  </li>
                  <li className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                    <X className="w-4 h-4" />
                    {language === 'fr' ? 'Données perdues à la fermeture' : 'Data lost on close'}
                  </li>
                  <li className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                    <X className="w-4 h-4" />
                    {language === 'fr' ? 'Pas de sauvegarde' : 'No save'}
                  </li>
                </ul>
                <button
                  onClick={() => handleModeSelection('free')}
                  className="w-full bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition font-semibold"
                >
                  {t('voyage.continue')}
                </button>
              </div>
            </div>

            {/* Mode 5$ - Un Voyage */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border-2 border-green-600 dark:border-green-400 overflow-hidden">
              <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-6 text-white">
                <Zap className="w-12 h-12 mb-3" />
                <h3 className="text-2xl font-bold mb-2">{t('voyage.modeSingle')}</h3>
                <div className="text-3xl font-bold my-4">{t('voyage.price5')}</div>
              </div>
              <div className="p-6">
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  {t('voyage.modeSingleDesc')}
                </p>
                <ul className="space-y-2 mb-6">
                  <li className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <Check className="w-4 h-4 text-green-600" />
                    {language === 'fr' ? 'Un voyage' : 'One trip'}
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <Check className="w-4 h-4 text-green-600" />
                    {language === 'fr' ? 'Valide 6 mois' : 'Valid 6 months'}
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <Check className="w-4 h-4 text-green-600" />
                    {language === 'fr' ? 'Toutes fonctionnalités' : 'All features'}
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <Check className="w-4 h-4 text-green-600" />
                    {language === 'fr' ? 'Impression illimitée' : 'Unlimited print'}
                  </li>
                </ul>
                <button
                  onClick={() => handleModeSelection('single')}
                  disabled={paymentProcessing}
                  className="w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition font-semibold flex items-center justify-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {paymentProcessing ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      {language === 'fr' ? 'Traitement...' : 'Processing...'}
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5" />
                      {t('voyage.purchase')}
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Mode 15$ - Application Complète */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border-2 border-purple-600 dark:border-purple-400 overflow-hidden relative">
              <div className="absolute top-4 right-4">
                <div className="bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-xs font-bold">
                  {language === 'fr' ? 'RECOMMANDÉ' : 'RECOMMENDED'}
                </div>
              </div>
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 text-white">
                <Star className="w-12 h-12 mb-3" />
                <h3 className="text-2xl font-bold mb-2">{t('voyage.modeFull')}</h3>
                <div className="text-3xl font-bold my-4">{t('voyage.price15')}</div>
              </div>
              <div className="p-6">
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  {t('voyage.modeFullDesc')}
                </p>
                <ul className="space-y-2 mb-6">
                  <li className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <Check className="w-4 h-4 text-green-600" />
                    {language === 'fr' ? 'Voyages illimités' : 'Unlimited trips'}
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <Check className="w-4 h-4 text-green-600" />
                    {language === 'fr' ? 'Accès à vie' : 'Lifetime access'}
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <Check className="w-4 h-4 text-green-600" />
                    {language === 'fr' ? 'Toutes fonctionnalités' : 'All features'}
                  </li>
                  <li className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <Check className="w-4 h-4 text-green-600" />
                    {language === 'fr' ? 'Mises à jour gratuites' : 'Free updates'}
                  </li>
                </ul>
                <button
                  onClick={() => handleModeSelection('full')}
                  disabled={paymentProcessing}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg hover:from-purple-700 hover:to-pink-700 transition font-semibold flex items-center justify-center gap-2 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed"
                >
                  {paymentProcessing ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      {language === 'fr' ? 'Traitement...' : 'Processing...'}
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5" />
                      {t('voyage.purchase')}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Écran de choix Nouveau/Consulter pour les investisseurs
  if (showVoyageChoice && !voyageActif) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 pt-16 sm:pt-20 md:pt-24 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-3">
              {language === 'fr' ? 'Mon Voyage' : 'My Trip'}
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              {language === 'fr'
                ? 'Que souhaitez-vous faire?'
                : 'What would you like to do?'}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* Nouveau voyage */}
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-all duration-300 hover:scale-105 border-2 border-transparent hover:border-indigo-500"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Plus className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                {language === 'fr' ? 'Nouveau Voyage' : 'New Trip'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {language === 'fr'
                  ? 'Créer un nouveau voyage à planifier'
                  : 'Create a new trip to plan'}
              </p>
            </button>

            {/* Consulter voyages existants - Uniquement pour modes payants */}
            {userSession.mode !== 'free' && (
              <button
                onClick={() => {
                  setShowVoyageChoice(false)
                  setShowVoyageList(true)
                }}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-all duration-300 hover:scale-105 border-2 border-transparent hover:border-purple-500"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FolderOpen className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                  {language === 'fr' ? 'Mes Voyages' : 'My Trips'}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {language === 'fr'
                    ? 'Consulter et gérer mes voyages existants'
                    : 'View and manage my existing trips'}
                </p>
              </button>
            )}

            {/* Explorer les modèles */}
            <button
              onClick={() => {
                setShowVoyageChoice(false)
                setShowGalerie(true)
              }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-all duration-300 hover:scale-105 border-2 border-transparent hover:border-blue-500"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Globe className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center justify-center gap-2">
                {language === 'fr' ? 'Galerie' : 'Gallery'}
                <Sparkles className="w-5 h-5 text-yellow-500" />
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {language === 'fr'
                  ? 'Explorer les voyages et templates publics'
                  : 'Explore public trips and templates'}
              </p>
            </button>
          </div>

          {/* Bouton retour (déconnexion) */}
          <div className="text-center mt-8">
            <button
              onClick={handleLogout}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            >
              ← {language === 'fr' ? 'Déconnexion' : 'Logout'}
            </button>
          </div>
        </div>

        {/* Create Trip Modal */}
        <CreateTripModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateNewVoyage}
          onGenerateWithAI={handleGenerateWithAI}
          language={language}
        />

        {/* Add Event Modal */}
        <AddEventModal
          isOpen={showAddEventModal}
          onClose={() => setShowAddEventModal(false)}
          onAdd={handleSaveEvent}
          language={language}
          tripCurrency={'CAD'}
        />
      </div>
    )
  }

  // Liste des voyages existants
  if (showVoyageList && userSession) {
    return (
      <>
        <VoyageList
          userId={userSession.userId || currentUser?.id || ''}
          userMode={userSession.mode}
          onSelectVoyage={async (voyageId) => {
            // Charger le voyage depuis la DB
            const voyage = await voyageService.getById(voyageId)
            if (voyage) {
              // Convertir VoyageDB en Voyage
              const voyageComplet: Voyage = {
                id: voyage.id,
                userId: voyage.user_id,
                titre: voyage.titre,
                dateDebut: voyage.date_debut,
                dateFin: voyage.date_fin,
                budget: voyage.budget || undefined,
                devise: voyage.devise,
                evenements: [], // À charger depuis evenementService
                depenses: [], // À charger depuis depenseService
                checklist: [], // À charger depuis checklistService
                partage: {
                  actif: false,
                  lien: '',
                  enDirect: false
                }
              }
              setVoyageActif(voyageComplet)
              setVoyageActifId(voyageId)
              setShowVoyageList(false)
            }
          }}
          onCreateNew={() => {
            setShowCreateModal(true)
          }}
          onBack={() => {
            setShowVoyageList(false)
            setShowVoyageChoice(true)
          }}
        />

        {/* Create Trip Modal */}
        <CreateTripModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateNewVoyage}
          onGenerateWithAI={handleGenerateWithAI}
          language={language}
        />
      </>
    )
  }

  // Galerie publique
  if (showGalerie && userSession) {
    return (
      <GaleriePublique
        onClose={() => {
          setShowGalerie(false)
          setShowVoyageChoice(true)
        }}
        onUseTemplate={async (templateId) => {
          // TODO: Ouvrir dialogue pour obtenir les détails du nouveau voyage
          // Pour l'instant, fermer la galerie
          setShowGalerie(false)
          setShowVoyageChoice(true)
        }}
        showTemplatesOnly={false}
      />
    )
  }

  // Interface principale (après sélection du mode)
  if (!voyageActif || !userSession) {
    return <div className="p-6">{language === 'fr' ? 'Chargement...' : 'Loading...'}</div>
  }

  // Calculer les dépenses totales
  const totalSpent = voyageActif.evenements.reduce((sum, event) => sum + (event.prix || 0), 0) +
                     voyageActif.depenses.reduce((sum, depense) => sum + depense.montant, 0)

  // Handlers pour l'édition du titre
  const handleEditTitle = () => {
    setTempTitle(voyageActif.titre)
    setEditingTitle(true)
  }

  const handleSaveTitle = async () => {
    if (tempTitle.trim()) {
      setVoyageActif({
        ...voyageActif,
        titre: tempTitle.trim()
      })

      // Sauvegarder dans Supabase si on a un ID
      if (voyageActifId) {
        await voyageService.update(voyageActifId, { titre: tempTitle.trim() })
      }

      setEditingTitle(false)
    }
  }

  const handleCancelEditTitle = () => {
    setTempTitle('')
    setEditingTitle(false)
  }

  const handleBackToVoyages = () => {
    setVoyageActif(null)
    setVoyageActifId(null)
    setShowVoyageChoice(true)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header avec titre éditable et flèche de retour */}
      <div className="fixed top-12 sm:top-14 md:top-16 lg:top-[60px] left-0 right-0 z-20 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3 max-w-7xl mx-auto">
          {/* Flèche de retour */}
          <button
            onClick={handleBackToVoyages}
            className="flex items-center gap-2 px-3 py-2 text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline text-sm font-medium">
              {language === 'fr' ? 'Mes Voyages' : 'My Trips'}
            </span>
          </button>

          {/* Titre éditable */}
          <div className="flex-1 flex items-center justify-center gap-2 mx-4">
            {editingTitle ? (
              <div className="flex items-center gap-2 max-w-md w-full">
                <input
                  type="text"
                  value={tempTitle}
                  onChange={(e) => setTempTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveTitle()
                    if (e.key === 'Escape') handleCancelEditTitle()
                  }}
                  className="flex-1 px-3 py-2 text-lg font-bold text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-gray-700 border border-indigo-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  autoFocus
                />
                <button
                  onClick={handleSaveTitle}
                  className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition"
                >
                  <Save className="w-5 h-5" />
                </button>
                <button
                  onClick={handleCancelEditTitle}
                  className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleEditTitle}
                className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition group"
              >
                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {voyageActif.titre}
                </h1>
                <Edit2 className="w-4 h-4 text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition" />
              </button>
            )}
          </div>

          {/* Espace pour équilibrer le layout */}
          <div className="w-24 sm:w-32"></div>
        </div>
      </div>

      <div className="flex pt-24 sm:pt-28 md:pt-32 lg:pt-36">
        {/* Hamburger Menu Button - Mobile Only (même style que header) */}
        <button
          onClick={() => setSidebarOpen(true)}
          className={`fixed top-24 sm:top-28 md:top-32 lg:top-36 left-4 z-30 lg:hidden p-2 bg-[#5e5e5e] text-white rounded-full hover:bg-[#3e3e3e] transition ${sidebarOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        >
          <Menu size={20} />
        </button>

        {/* Sidebar */}
        <VoyageSidebar
          currentView={currentView}
          onViewChange={setCurrentView}
          onNewTrip={() => {
            setShowVoyageChoice(true)
            setVoyageActif(null)
          }}
          tripTitle={voyageActif.titre}
          language={language}
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          budget={voyageActif.budget}
          totalSpent={totalSpent}
          devise={voyageActif.devise}
        />

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto min-h-screen">
        {currentView === 'dashboard' && (
          <VoyageDashboard
            voyage={voyageActif}
            onAddEvent={handleAddEvent}
            language={language}
          />
        )}

        {currentView === 'timeline' && (
          <VoyageTimeline
            voyage={voyageActif}
            onAddEvent={handleAddEvent}
            onEditEvent={(event) => {
              setSelectedEvent(event)
              setShowEditEventModal(true)
            }}
            onDeleteEvent={handleDeleteEvent}
            onOptimizeRoute={handleOptimizeRoute}
            onImportFromEmail={handleImportFromEmail}
            language={language}
          />
        )}

        {currentView === 'checklist' && (
          <VoyageChecklist
            voyage={voyageActif}
            onToggle={handleToggleChecklist}
            onAdd={handleAddChecklistItem}
            onDelete={handleDeleteChecklistItem}
            language={language}
          />
        )}

        {currentView === 'expenses' && (
          <VoyageExpenses
            voyage={voyageActif}
            onAdd={handleAddExpense}
            onDelete={handleDeleteExpense}
            onAddFromReceipt={handleAddExpenseFromReceipt}
            language={language}
          />
        )}

        {currentView === 'budget' && (
          <VoyageBudget
            voyage={voyageActif}
            language={language}
            onBudgetChange={handleEditBudget}
          />
        )}

        {currentView === 'share' && (
          <VoyageShare
            voyage={voyageActif}
            onGenerateLink={handleGenerateShareLink}
            onToggleLive={handleToggleLive}
            shareLink={voyageActif.partage.lien}
            isLive={voyageActif.partage.enDirect}
            language={language}
            sharePreferences={sharePreferences}
            onSharePreferencesChange={handleSharePreferencesChange}
          />
        )}

        {currentView === 'map' && (
          <VoyageMap
            voyage={voyageActif}
            onAddTransport={handleAddTransport}
            language={language}
          />
        )}
        </div>
      </div>

      {/* Add Event Modal - Placé à la racine pour être toujours accessible */}
      <AddEventModal
        isOpen={showAddEventModal}
        onClose={() => setShowAddEventModal(false)}
        onAdd={handleSaveEvent}
        language={language}
        tripCurrency={voyageActif?.devise || 'CAD'}
      />

      {/* Edit Event Modal */}
      {selectedEvent && (
        <EditEventModal
          isOpen={showEditEventModal}
          onClose={() => {
            setShowEditEventModal(false)
            setSelectedEvent(null)
          }}
          onSave={handleEditEvent}
          onDelete={handleDeleteEvent}
          event={selectedEvent}
          language={language}
          tripCurrency={voyageActif?.devise || 'CAD'}
        />
      )}
    </div>
  )
}
