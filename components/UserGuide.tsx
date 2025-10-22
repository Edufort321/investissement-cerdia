'use client'

import { useState } from 'react'
import { Book, ChevronDown, ChevronUp, Search, Home, Users, DollarSign, FileText, Settings, Calculator, Calendar, Briefcase, Wallet, TrendingUp, ClipboardList } from 'lucide-react'

interface GuideSection {
  id: string
  title: string
  icon: any
  content: {
    subtitle: string
    description: string
    steps?: string[]
  }[]
}

export default function UserGuide() {
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedSection, setExpandedSection] = useState<string | null>('dashboard')

  const guideSections: GuideSection[] = [
    {
      id: 'dashboard',
      title: 'Tableau de bord',
      icon: Home,
      content: [
        {
          subtitle: 'Vue d\'ensemble',
          description: 'Le tableau de bord affiche un résumé de vos investissements en temps réel.',
          steps: [
            'Total Investisseurs: Somme des apports en CAD',
            'Investissement Immobilier: Montant investi en USD converti en CAD',
            'Dépenses Opération: CAPEX + R&D',
            'Compte Courant: Fonds disponibles calculés automatiquement'
          ]
        },
        {
          subtitle: 'Taux de change',
          description: 'Le widget affiche le taux USD→CAD mis à jour quotidiennement depuis la Banque du Canada.',
        },
        {
          subtitle: 'Propriétés',
          description: 'Liste de vos propriétés avec progression des paiements et ROI attendu.',
        }
      ]
    },
    {
      id: 'projet',
      title: 'Gestion de Projets',
      icon: Briefcase,
      content: [
        {
          subtitle: 'Vue d\'ensemble',
          description: 'Gère vos projets immobiliers avec suivi des échéances et milestones.',
        },
        {
          subtitle: 'Créer un projet',
          description: 'Créez un nouveau projet en cliquant sur "Nouveau Projet".',
          steps: [
            'Entrez le nom du projet',
            'Définissez les dates de début et fin',
            'Ajoutez une description',
            'Sélectionnez le statut initial'
          ]
        },
        {
          subtitle: 'Jalons (Milestones)',
          description: 'Définissez les étapes clés du projet avec dates et livrables.',
        },
        {
          subtitle: 'Risques',
          description: 'Identifiez et gérez les risques potentiels du projet.',
        },
        {
          subtitle: 'Entrepreneurs',
          description: 'Gérez les contacts et contrats des entrepreneurs impliqués.',
        }
      ]
    },
    {
      id: 'evaluateur',
      title: 'Évaluateur / Scénarios',
      icon: Calculator,
      content: [
        {
          subtitle: 'Création de scénarios',
          description: 'Créez des scénarios d\'investissement pour évaluer la rentabilité.',
          steps: [
            'Cliquez sur "Nouveau Scénario"',
            'Entrez les informations de la propriété',
            'Définissez le prix d\'achat et frais',
            'Configurez les données promoteur (loyer, charges, etc.)',
            'Ajoutez les termes de paiement'
          ]
        },
        {
          subtitle: 'Types de scénarios',
          description: 'Trois types disponibles: Conservateur, Modéré, Optimiste avec projections financières différentes.',
        },
        {
          subtitle: 'Documents',
          description: 'Téléchargez et gérez les documents liés au scénario (contrats, plans, etc.).',
        },
        {
          subtitle: 'Vote',
          description: 'Soumettez le scénario au vote des investisseurs pour validation.',
        },
        {
          subtitle: 'Réservations (après achat)',
          description: 'Gérez le calendrier de réservation et les revenus locatifs une fois la propriété achetée.',
        }
      ]
    },
    {
      id: 'reservations',
      title: 'Calendrier de Réservations',
      icon: Calendar,
      content: [
        {
          subtitle: 'Vue du calendrier',
          description: 'Visualisez toutes les réservations pour vos propriétés louées.',
        },
        {
          subtitle: 'Créer une réservation',
          description: 'Ajoutez une nouvelle réservation en sélectionnant les dates et la propriété.',
        },
        {
          subtitle: 'Gestion',
          description: 'Modifiez ou annulez des réservations existantes.',
        }
      ]
    },
    {
      id: 'administration',
      title: 'Administration',
      icon: Settings,
      content: [
        {
          subtitle: 'Investisseurs',
          description: 'Gérez les investisseurs, leurs parts et permissions.',
          steps: [
            'Ajouter un investisseur: Entrez nom, email, actions',
            'Modifier: Cliquez sur l\'icône crayon',
            'Supprimer: Icône poubelle (avec confirmation)'
          ]
        },
        {
          subtitle: 'Transactions',
          description: 'Enregistrez toutes les transactions financières.',
          steps: [
            'Types: Investissement, Paiement, Dividende, Autre',
            'Attachez des justificatifs (factures, reçus)',
            'Liez aux investisseurs et propriétés'
          ]
        },
        {
          subtitle: 'CAPEX',
          description: 'Gérez les dépenses en capital (investissement et opération).',
        },
        {
          subtitle: 'R&D / Dividendes',
          description: 'Suivez les dépenses R&D et distributions de dividendes.',
        },
        {
          subtitle: 'Rapports Fiscaux',
          description: 'Générez des rapports fiscaux pour les autorités.',
        },
        {
          subtitle: 'Performance ROI',
          description: 'Analysez le retour sur investissement par propriété et global.',
        },
        {
          subtitle: 'Sync Revenus',
          description: 'Synchronisez les revenus depuis les plateformes de réservation (Booking.com, Airbnb).',
        }
      ]
    },
    {
      id: 'tresorerie',
      title: 'Trésorerie',
      icon: Wallet,
      content: [
        {
          subtitle: 'Vue d\'ensemble',
          description: 'Tableau de bord financier avec solde actuel, entrées/sorties du mois.',
        },
        {
          subtitle: 'Prévisions de flux',
          description: 'Visualisez les flux de trésorerie prévisionnels sur 12 mois.',
        },
        {
          subtitle: 'Rapprochement bancaire',
          description: 'Rapprochez vos transactions avec vos relevés bancaires.',
        },
        {
          subtitle: 'Calendrier de paiements',
          description: 'Gérez les paiements programmés avec alertes d\'échéance.',
        },
        {
          subtitle: 'Alertes',
          description: 'Configurez des alertes pour solde faible, paiements en retard, etc.',
        }
      ]
    },
    {
      id: 'gestion_projet',
      title: 'Gestion de Projet (Admin)',
      icon: ClipboardList,
      content: [
        {
          subtitle: 'Accès administrateur',
          description: 'Version administrative avec fonctionnalités avancées de gestion de projet.',
        },
        {
          subtitle: 'Timeline',
          description: 'Vue chronologique des projets avec dépendances.',
        },
        {
          subtitle: 'Ressources',
          description: 'Allocation des ressources (budget, personnel, matériel).',
        }
      ]
    },
    {
      id: 'budgetisation',
      title: 'Budgétisation',
      icon: DollarSign,
      content: [
        {
          subtitle: 'Création de budgets',
          description: 'Créez des budgets annuels par catégorie.',
          steps: [
            'Sélectionnez l\'année fiscale',
            'Ajoutez des lignes budgétaires (nom, catégorie, montant)',
            'Définissez les périodes (mensuel, trimestriel, annuel)',
            'Configurez les seuils d\'alerte'
          ]
        },
        {
          subtitle: 'Suivi de consommation',
          description: 'Visualisez le % de budget consommé avec indicateurs visuels (vert/orange/rouge).',
        },
        {
          subtitle: 'Analyse d\'écart',
          description: 'Comparez prévu vs réalisé pour identifier les dépassements.',
        },
        {
          subtitle: 'Approbation',
          description: 'Workflow d\'approbation pour les modifications de budget.',
        }
      ]
    },
    {
      id: 'mode_emploi',
      title: 'Mode d\'emploi',
      icon: Book,
      content: [
        {
          subtitle: 'Guide interactif',
          description: 'Ce guide que vous consultez actuellement!',
        }
      ]
    },
    {
      id: 'bloc_notes',
      title: 'Bloc-notes',
      icon: FileText,
      content: [
        {
          subtitle: 'To-Do Lists',
          description: 'Créez et gérez vos listes de tâches personnelles.',
          steps: [
            'Créez une nouvelle liste',
            'Ajoutez des tâches',
            'Cochez les tâches complétées',
            'Supprimez les tâches obsolètes'
          ]
        },
        {
          subtitle: 'Notes',
          description: 'Prenez des notes libres liées à vos projets.',
        }
      ]
    }
  ]

  const filteredSections = guideSections.filter(section =>
    section.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    section.content.some(c =>
      c.subtitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.description.toLowerCase().includes(searchTerm.toLowerCase())
    )
  )

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <Book className="text-blue-600" size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Mode d'emploi</h1>
            <p className="text-gray-600">Guide complet d'utilisation de la plateforme CERDIA</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Rechercher dans le guide..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {filteredSections.map((section) => {
          const Icon = section.icon
          const isExpanded = expandedSection === section.id

          return (
            <div key={section.id} className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
              <button
                onClick={() => setExpandedSection(isExpanded ? null : section.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Icon className="text-blue-600" size={20} />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">{section.title}</h2>
                </div>
                {isExpanded ? (
                  <ChevronUp className="text-gray-400" size={24} />
                ) : (
                  <ChevronDown className="text-gray-400" size={24} />
                )}
              </button>

              {isExpanded && (
                <div className="p-6 pt-0 space-y-6 border-t border-gray-100">
                  {section.content.map((item, index) => (
                    <div key={index} className="space-y-3">
                      <h3 className="text-lg font-semibold text-gray-800">{item.subtitle}</h3>
                      <p className="text-gray-600 leading-relaxed">{item.description}</p>
                      {item.steps && (
                        <ul className="space-y-2 mt-3">
                          {item.steps.map((step, stepIndex) => (
                            <li key={stepIndex} className="flex items-start gap-2">
                              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium mt-0.5">
                                {stepIndex + 1}
                              </span>
                              <span className="text-gray-700">{step}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {filteredSections.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">Aucun résultat trouvé pour "{searchTerm}"</p>
        </div>
      )}
    </div>
  )
}
