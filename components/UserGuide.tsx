'use client'

import { useState } from 'react'
import {
  Book, ChevronDown, ChevronUp, Search, Home, Users, DollarSign, FileText,
  Settings, Calculator, Calendar, Briefcase, Wallet, TrendingUp, ClipboardList,
  Globe, BarChart2, Building2, AlertCircle, CheckCircle, Info, Landmark, ShieldCheck
} from 'lucide-react'

interface Section {
  id: string
  title: string
  icon: any
  color: string
  items: {
    subtitle: string
    description: string
    steps?: string[]
    note?: string
    badge?: string
  }[]
}

const SECTIONS: Section[] = [
  {
    id: 'architecture',
    title: 'Architecture de la plateforme',
    icon: Building2,
    color: 'gray',
    items: [
      {
        subtitle: 'Structure générale',
        description: 'CERDIA est une plateforme Next.js 14 (App Router) + Supabase PostgreSQL. Chaque donnée est isolée par organisation (RLS). La navigation principale comporte 5 onglets : Dashboard, Projets, Évaluateur, Réservations, Administration.',
        steps: [
          'Dashboard — KPIs globaux, NAV, taux de change live (Banque du Canada)',
          'Projets — Propriétés converties depuis scénarios, calendrier de paiements',
          'Évaluateur — Création et analyse de scénarios d\'investissement',
          'Réservations — Calendrier des séjours propriétaires et locataires',
          'Administration — Tout le back-office : transactions, investisseurs, fiscal, dividendes'
        ]
      },
      {
        subtitle: 'Modèle de données clé',
        description: 'La table transactions est la source de vérité centrale. Elle alimente le Dashboard (KPIs), le NAV (calculate_realistic_nav_v2), les rapports fiscaux (T1135/T2209) et le calcul de trésorerie. Toute saisie de transaction doit passer par l\'onglet Transactions ou Admin.',
        steps: [
          'transactions → Dashboard KPIs, NAV, Bilan, Trésorerie, Rapports fiscaux',
          'property_valuations → NAV (valeur marché actuelle des propriétés)',
          'investor_investments → Parts totales (base NAV/part)',
          'payment_schedules → Échéanciers de paiement par projet',
          'cca_schedule → Amortissement fiscal FNACC (DPA) par propriété'
        ]
      },
      {
        subtitle: 'Devises et taux de change',
        description: 'CAD est la devise de présentation. USD, DOP, EUR, MXN sont convertis via ExchangeRateContext (Banque du Canada API Valet, taux quotidien). Chaque transaction conserve la devise d\'origine (source_currency + source_amount) ET le montant CAD converti (amount).',
        note: 'Ne jamais saisir des montants CAD "à la main" pour des transactions en USD — utiliser source_currency=USD et source_amount, l\'exchange_rate se calcule automatiquement.'
      }
    ]
  },
  {
    id: 'dashboard',
    title: 'Dashboard — Vue d\'ensemble',
    icon: Home,
    color: 'blue',
    items: [
      {
        subtitle: 'KPIs principaux',
        description: 'Le dashboard affiche en temps réel : Valeur totale du portefeuille (NAV), Rendement moyen du portefeuille, Compte courant disponible, Nombre de propriétés actives, Parts en circulation, NAV par part.',
        steps: [
          'NAV globale = Valeur marchande des propriétés - Passifs + Liquidités',
          'NAV/part = NAV globale ÷ total des parts en circulation',
          'Compte courant = somme des transactions affectant le C/C (affects_compte_courant = true)',
          'Le taux de change USD/CAD est affiché en direct depuis la Banque du Canada'
        ]
      },
      {
        subtitle: 'Graphiques et historique',
        description: 'Le NAV Timeline Chart affiche l\'évolution de la valeur nette sur 12+ mois. Les entrées sont créées automatiquement à chaque mise à jour de valuation ou transaction importante.',
        note: 'Le graphique NAV se base sur la table nav_timeline. Si la courbe semble incorrecte, vérifier les property_valuations et les transactions sans property_id.'
      },
      {
        subtitle: 'Taux de change live',
        description: 'Les taux USD/CAD, EUR/CAD et DOP/CAD (peso dominicain) sont récupérés via l\'API Valet de la Banque du Canada. Un cache de 6h évite les appels excessifs. En cas d\'échec API, un taux de repli (1.35 USD/CAD) est utilisé.',
        badge: 'Live API'
      }
    ]
  },
  {
    id: 'projets',
    title: 'Onglet Projets — Propriétés',
    icon: Briefcase,
    color: 'indigo',
    items: [
      {
        subtitle: 'Création d\'une propriété',
        description: 'Les propriétés ne se créent PAS manuellement — elles sont générées automatiquement quand un scénario est marqué "Acheté" dans l\'Évaluateur. Les données du scénario (nom, localisation, prix, devise) sont copiées dans la propriété.',
        steps: [
          '1. Créer un scénario dans l\'Évaluateur',
          '2. Analyser les 3 projections (pessimiste / modéré / optimiste)',
          '3. Voter et marquer "Acheté" → la propriété est créée automatiquement',
          '4. Modifier la propriété via le bouton Éditer dans l\'onglet Projets'
        ]
      },
      {
        subtitle: 'Types de propriété',
        description: 'Chaque propriété a un type qui affecte les calculs fiscaux (CCA, TDT, ITBIS).',
        steps: [
          'Condo / Appartement — Standard, CCA Classe 1 (4%/an)',
          'Maison / Villa — Standard, CCA Classe 1',
          'Condo-hôtel (location touristique) — ITBIS RD 18% applicable, TDT Florida',
          'Multiplex — CCA Classe 1, revenus locatifs multiples',
          'Commercial — CCA US_Com (2.564%/an si USA), 39 ans',
          'Terrain / Lot — NON amortissable (pas de CCA)',
          'Chalet / Vacances — CCA Classe 1',
          'Préconstruction — Pas encore livré, échéancier de paiements seulement'
        ]
      },
      {
        subtitle: 'Juridiction fiscale (Pays → État → Comté)',
        description: 'Le champ Pays détermine la fiscalité applicable. La cascade Pays → État → Comté permet un calcul précis des taxes locales.',
        steps: [
          '🇨🇦 Canada → Province (QC/ON/BC/AB) → CCA Classe 1/8/13 applicable',
          '🇺🇸 USA → État (FL/NY/CA/TX/NV) → Florida: comté TDT + Sales Tax 6%',
          '🇩🇴 Rép. Dominicaine → ITBIS 18% si location court terme (≤30 nuits)',
          '🇲🇽 Mexique → Fiscalité mexicaine (non-résident)',
          'Le country_code est dérivé automatiquement depuis le champ Location lors de la conversion scénario→propriété'
        ]
      },
      {
        subtitle: 'Classe CCA / FNACC (amortissement fiscal)',
        description: 'La classe CCA détermine le taux d\'amortissement déductible fiscalement (Déduction pour Amortissement = DPA). Visible dans TaxReports → T1135.',
        steps: [
          'Classe 1 — Bâtiment résidentiel Canada : 4%/an (méthode dégressante)',
          'Classe 8 — Mobilier, électroménager, équipement : 20%/an',
          'Classe 13 — Améliorations locatives (bail) : 20%/an',
          'US_Res — Résidentiel USA : 3.636%/an (27.5 ans linéaire)',
          'US_Com — Commercial USA : 2.564%/an (39 ans linéaire)',
          'Règle de la demi-année : en année d\'acquisition, seulement 50% du taux normal est déductible'
        ],
        note: 'Le terrain n\'est JAMAIS amortissable. Par défaut 20% du coût total est attribué au terrain (land_allocation_pct).'
      },
      {
        subtitle: 'Calendrier de paiements',
        description: 'Chaque propriété peut avoir un échéancier de paiements (payment_schedules). Les versements apparaissent dans le Dashboard avec alertes rouge/jaune selon l\'échéance.',
        steps: [
          'Ajouter des versements via le gestionnaire de paiements (icône agenda)',
          'Statuts : En attente, Payé, En retard, Partiel, Annulé',
          'Lier une transaction à un versement via le champ payment_schedule_id',
          'Le PDF de fiche projet inclut le calendrier complet et le graphique prévu vs réel'
        ]
      },
      {
        subtitle: 'Export PDF — Fiche Projet',
        description: 'Le bouton PDF génère un rapport complet : informations générales, progression financière, scénario d\'analyse, bilan budgétaire, calendrier de paiements, historique transactions, pièces jointes. Les images sont incluses dans le PDF.',
        badge: 'jsPDF'
      }
    ]
  },
  {
    id: 'evaluateur',
    title: 'Évaluateur — Scénarios d\'investissement',
    icon: Calculator,
    color: 'purple',
    items: [
      {
        subtitle: 'Créer un scénario',
        description: 'Un scénario simule un investissement immobilier potentiel. Il calcule 3 projections automatiques (pessimiste, modéré, optimiste) sur la période spécifiée.',
        steps: [
          'Saisir : Nom, Localisation, Type de propriété, Pays',
          'Prix d\'achat (USD ou CAD), Mise de fonds, Revenus locatifs annuels attendus',
          'Taux d\'appreciation annuelle du bien, Durée de détention',
          'Frais d\'exploitation estimés (gestion, maintenance, taxes municipales)',
          'Cliquer "Analyser" pour générer les 3 projections'
        ]
      },
      {
        subtitle: 'Résultats : 3 projections',
        description: 'Chaque scénario calcule automatiquement : Pessimiste (−20% revenus, −30% appréciation), Modéré (base), Optimiste (+20% revenus, +20% appréciation). Les métriques incluent : ROI total, rendement annuel moyen, année de break-even, flux de trésorerie cumulé.',
        badge: 'Calcul automatique'
      },
      {
        subtitle: 'Marquer comme Acheté',
        description: 'Quand un investissement est confirmé, marquer le scénario "Acheté". Cette action crée automatiquement une propriété dans l\'onglet Projets, avec héritage du type, du pays, de l\'état/province et du comté si disponibles.',
        note: 'Une fois marqué acheté, le scénario ne peut plus être supprimé (propriété dépendante). Pour annuler : supprimer d\'abord la propriété.'
      },
      {
        subtitle: 'Documents et vote',
        description: 'Joindre des documents au scénario (contrats, plans, photos). Les investisseurs avec droit de vote peuvent approuver/rejeter un scénario depuis leur portail.',
        steps: [
          'Importer des documents (PDF, images, Excel)',
          'Activer le vote pour les parties prenantes',
          'Suivre les votes en temps réel',
          'Exporter un rapport PDF du scénario pour présentation'
        ]
      }
    ]
  },
  {
    id: 'reservations',
    title: 'Réservations — Calendrier Propriétaires',
    icon: Calendar,
    color: 'teal',
    items: [
      {
        subtitle: 'Calendrier des séjours',
        description: 'Module MonVoyage — Suivi des séjours des propriétaires dans leurs unités. Affiche la disponibilité par propriété, les dates occupées, et les statistiques d\'occupation.',
        steps: [
          'Créer un séjour : choisir la propriété, les dates, le nombre de personnes',
          'Gérer les points de passage (waypoints) du voyage',
          'Calculer le temps de trajet entre les étapes',
          'Scanner les reçus (OCR Tesseract) pour les dépenses du voyage',
          'Partager l\'itinéraire avec les autres voyageurs'
        ]
      },
      {
        subtitle: 'Statistiques d\'occupation',
        description: 'L\'OccupationStats calcule automatiquement les jours d\'utilisation vs disponibles par propriété. Utile pour : optimiser la location, calculer le ratio propriétaire vs locataire pour la fiscalité (surtout TDT Florida et ITBIS RD).',
        note: 'Les jours propriétaires (owner_occupation_days) affectent directement le calcul du ROI locatif dans les scénarios.'
      }
    ]
  },
  {
    id: 'transactions',
    title: 'Transactions — Types et catégories',
    icon: DollarSign,
    color: 'green',
    items: [
      {
        subtitle: 'Types de transactions (direction)',
        description: 'Chaque transaction a un type qui détermine son impact sur les KPIs et la trésorerie.',
        steps: [
          '🟢 REVENUS : loyer, loyer_locatif, revenu, dividende_recu, investissement',
          '🔴 DÉPENSES : depense, capex, maintenance, admin, rnd',
          '🔵 NEUTRE : transfert, paiement (achat parts), dividende (distribution)',
          'Le type fiscal_category affine la classification : rental_income, dividend_income, capital_gain, foreign_income...'
        ]
      },
      {
        subtitle: 'Transactions internationales (multi-devise)',
        description: 'Pour les transactions en USD, DOP, EUR : saisir source_currency + source_amount. Le montant CAD (amount) sera calculé automatiquement. Conserver le taux de change utilisé (exchange_rate) pour la piste d\'audit fiscale.',
        steps: [
          'source_currency : USD, DOP, EUR, MXN',
          'source_amount : montant dans la devise d\'origine',
          'exchange_rate : taux utilisé pour la conversion en CAD',
          'source_country : pays source du revenu (US, DO, MX...)',
          'foreign_tax_paid : impôt retenu à la source dans le pays étranger (en CAD)',
          'Utilisé pour le calcul T2209 (crédit d\'impôt étranger)'
        ]
      },
      {
        subtitle: 'Fiscalité automatique — Florida TDT',
        description: 'Quand une transaction est liée à une propriété en Floride (country_code=US, state_province=FL), le formulaire affiche automatiquement le calcul TDT (Tourist Development Tax) + Sales Tax de l\'État.',
        steps: [
          'Sales Tax État Florida : 6% (toujours applicable)',
          'TDT comté Miami-Dade : +6% (total 12%)',
          'TDT Broward, Hillsborough, Collier, Keys : +5% (total 11%)',
          'TDT Orange, Osceola, Pinellas : +6% (total 12%)',
          'Applicable aux locations court terme (≤182 jours en Floride)',
          'Déclaration mensuelle séparée (Florida Dept. of Revenue + comté)'
        ],
        badge: 'TDT Florida'
      },
      {
        subtitle: 'Fiscalité automatique — ITBIS République Dominicaine',
        description: 'Pour les propriétés en RD (country_code=DO), l\'ITBIS (équivalent TVA 18%) s\'applique aux locations court terme (≤30 nuits). Les locations Confotur (zones touristiques agréées) sont exonérées.',
        steps: [
          'ITBIS 18% sur le montant brut de la location',
          'Exonéré si la propriété bénéficie du statut Confotur',
          'rental_duration_days : saisir la durée pour déterminer court/long terme',
          'IRNR 27% pour les non-résidents (retenue à la source par le locataire)'
        ],
        badge: 'ITBIS RD'
      },
      {
        subtitle: 'Pièces jointes (reçus, factures)',
        description: 'Chaque transaction peut avoir une pièce jointe (PDF, image). Upload via une route API server-side avec SUPABASE_SERVICE_ROLE_KEY — jamais exposée côté client.',
        note: 'Le bucket S3 Supabase est "transaction-attachments" (public pour les URLs signées). Les uploads passent par /api/storage/upload-transaction.'
      }
    ]
  },
  {
    id: 'dividendes',
    title: 'R&D et Dividendes — Distribution intelligente',
    icon: TrendingUp,
    color: 'purple',
    items: [
      {
        subtitle: 'Simulateur de distribution de dividendes',
        description: 'Le simulateur calcule automatiquement le montant distribuable optimal basé sur 3 sources de données : revenus annuels nets, solde compte courant, et réserve CAPEX configurable.',
        steps: [
          '1. Sélectionner l\'année fiscale (ex: 2025 ou 2026)',
          '2. Ajuster le % de réserve sur le compte courant (défaut 20%)',
          '3. Le système calcule : Revenus − Dépenses = Revenu net',
          '4. Recommandation = min(80% du revenu net, C/C disponible après réserve)',
          '5. Cliquer "Utiliser" pour appliquer la recommandation ou saisir un montant manuel',
          '6. La répartition est calculée pro-rata selon le nombre de parts de chaque investisseur',
          '7. Confirmer → les transactions dividende sont créées automatiquement pour chaque investisseur'
        ],
        badge: 'Nouveau'
      },
      {
        subtitle: 'Répartition pro-rata par parts',
        description: 'Le montant de dividende de chaque investisseur est calculé : Montant_investisseur = Total_à_distribuer × (Parts_investisseur ÷ Total_parts). La table investor_summaries (vue SQL) agrège les parts par investisseur.',
        steps: [
          'Parts de classe A : droit de vote + distribution',
          'Parts de classe B : distribution seulement (sans vote)',
          'Parts de classe C : préférence en cas de liquidation',
          'Les parts sont créées via l\'onglet Investisseurs lors des paiements'
        ]
      },
      {
        subtitle: 'Historique des distributions',
        description: 'L\'historique affiche toutes les transactions de type "dividende" par investisseur, avec le total cumulatif. Les transactions créées via le simulateur sont automatiquement liées à l\'investisseur (investor_id).',
        note: 'Les dividendes CERDIA SEC sont des dividendes sur parts de société — ils s\'affichent dans T1135 si la valeur totale des biens étrangers dépasse 100 000 $.'
      },
      {
        subtitle: 'Dépenses R&D',
        description: 'Les transactions de type "rnd" alimentent cette section. Les comptes R&D (rnd_accounts) contiennent les montants budgétés pour la R&D d\'investissement et opérationnelle.',
        note: 'Les dépenses R&D peuvent être déductibles fiscalement — consulter un CPA pour la qualification SR&ED (Scientific Research & Experimental Development).'
      }
    ]
  },
  {
    id: 'fiscal',
    title: 'Rapports Fiscaux — Multi-juridictions',
    icon: Globe,
    color: 'red',
    items: [
      {
        subtitle: 'T1135 — Biens étrangers (ARC Canada)',
        description: 'Le formulaire T1135 est obligatoire pour les résidents canadiens possédant des biens étrangers dont le coût total dépasse 100 000 $ CAD. À remplir avec la déclaration T1 annuelle.',
        steps: [
          'Méthode simplifiée (< 250 000 $) : valeur approximative, revenu, gains',
          'Méthode détaillée (≥ 250 000 $) : détail par propriété, catégorie ARC 1-7',
          'Catégorie 1 : Fonds (dépôts, obligations)',
          'Catégorie 4 : Actions de sociétés étrangères cotées',
          'Catégorie 6 : Biens immobiliers étrangers (notre cas : RD, USA)',
          'Catégorie 7 : Autres biens étrangers',
          'Date limite : même que la déclaration T1 (30 avril ou 15 juin pour travailleurs autonomes)'
        ],
        badge: 'ARC'
      },
      {
        subtitle: 'T2209 — Crédit d\'impôt pour revenus étrangers',
        description: 'Évite la double imposition. Le crédit est plafonné à 15% du revenu étranger net. L\'excédent non utilisé peut être reporté (carryforward illimité) ou reporté en arrière 3 ans (carryback — formulaire T1-ADJ).',
        steps: [
          'Base de calcul : impôts étrangers payés (retenues à la source)',
          'Plafond : 15% × revenu étranger net (après déductions)',
          'Carryforward : illimité — report aux années suivantes',
          'Carryback 3 ans : remplir T1-ADJ pour modifier les 3 dernières déclarations',
          'Report par pays : US, RD, MX doivent être calculés séparément',
          'La table foreign_tax_credit_history (migration 199) suit l\'historique annuel'
        ],
        badge: 'T2209'
      },
      {
        subtitle: 'FIRPTA — Retenue USA à la vente',
        description: 'Lors de la vente d\'un bien immobilier aux États-Unis par un non-résident, l\'acheteur doit retenir 15% du prix de vente brut et le transmettre à l\'IRS (Form 8288 dans les 20 jours suivant la clôture).',
        steps: [
          'Taux standard : 15% du prix de vente brut',
          'Taux réduit possible : 10% si prix < 1 000 000 $ et acheteur occupe le bien',
          'Form 8288 : à soumettre dans les 20 jours après la clôture',
          'Remboursement partiel possible via déclaration NR (non-resident return)',
          'Le système affiche la deadline automatiquement depuis la date de vente',
          'Champs : firpta_withholding_amount, firpta_form_8288_submitted, firpta_withholding_refunded'
        ],
        badge: 'FIRPTA'
      },
      {
        subtitle: 'CCA / FNACC — Amortissement fiscal Canada',
        description: 'La Déduction pour Amortissement (DPA) réduit le revenu imposable canadien. Le calcul est basé sur la Fraction Non Amortie du Coût en Capital (FNACC). Méthode dégressante pour la plupart des classes.',
        steps: [
          'FNACC début = Coût du bâtiment (terrain exclu, défaut 20%)',
          'Année 1 : DPA = FNACC × taux × 50% (règle de la demi-année)',
          'Années suivantes : DPA = FNACC × taux',
          'La DPA ne peut pas créer une perte locative dans certains cas',
          'La table cca_schedule (migration 198) stocke l\'historique annuel',
          'La fonction calculate_cca_estimate() fait le calcul via SQL'
        ],
        note: 'La DPA/CCA est facultative chaque année. Stratégie fiscale : déduire seulement si on a du revenu locatif positif à compenser.'
      },
      {
        subtitle: 'TDT Florida — Tourist Development Tax',
        description: 'Taxe locale de la Floride sur les locations courtes (≤182 jours). S\'ajoute à la Sales Tax État 6%. Collectée par l\'opérateur et remise mensuellement.',
        steps: [
          'Miami-Dade : TDT 6% + Sales Tax 6% = 12% total',
          'Orange/Osceola (Orlando/Disney) : TDT 6% + Sales Tax 6% = 12% total',
          'Pinellas : TDT 6% + Sales Tax 6% = 12% total',
          'Broward/Hillsborough/Collier/Keys : TDT 5% + Sales Tax 6% = 11% total',
          'Déclaration mensuelle : Florida Dept. of Revenue + comté séparément',
          'Les plateformes (Airbnb, VRBO) collectent parfois la taxe automatiquement'
        ],
        badge: 'Florida TDT'
      },
      {
        subtitle: 'ITBIS RD — TVA République Dominicaine',
        description: 'L\'ITBIS (Impuesto sobre Transferencias de Bienes Industrializados y Servicios) est la TVA dominicaine à 18%. S\'applique aux locations touristiques court terme (≤30 nuits).',
        steps: [
          'Taux : 18% sur le montant brut de la location',
          'Exonération Confotur : si la propriété est dans une zone touristique agréée',
          'IRNR 27% : pour les non-résidents, retenue sur les revenus locatifs',
          'Déclaration mensuelle à la DGII (Dirección General de Impuestos Internos)',
          'Le champ is_confotur sur la transaction permet d\'appliquer l\'exonération'
        ],
        badge: 'ITBIS RD 18%'
      },
      {
        subtitle: 'Multi-juridiction — Vue consolidée',
        description: 'L\'onglet Multi-juridiction du rapport fiscal consolide les obligations par pays, avec les totaux d\'impôts retenus, les ITBIS/TDT estimés, et les crédits T2209 disponibles.',
        steps: [
          'La résolution du pays se fait depuis : tax_country sur la transaction, OU country_code de la propriété liée, OU devise source (USD→US, DOP→DO)',
          'Les totaux incluent : impôts retenus, TDT estimée, ITBIS estimé',
          'Exporter en PDF pour le comptable ou l\'ARC'
        ]
      }
    ]
  },
  {
    id: 'investisseurs',
    title: 'Investisseurs et Parts',
    icon: Users,
    color: 'indigo',
    items: [
      {
        subtitle: 'Structure des parts CERDIA SEC',
        description: 'CERDIA est une société par actions (SEC) avec 3 classes de parts : A (fondateurs, vote + distribution), B (investisseurs passifs, distribution seulement), C (préférence liquidation). La NAV/part est calculée en divisant la NAV totale par le nombre de parts en circulation.',
        steps: [
          'Parts Classe A : Éric Dufort — droit de vote + participation aux bénéfices',
          'Parts Classe B : Investisseurs externes — distribution de dividendes seulement',
          'Parts Classe C : Participation préférentielle en cas de dissolution',
          'Prix de la part : modifiable dans l\'onglet Prix des Parts (shareSettings)',
          'Valeur estimée = NAV calculée ÷ total des parts'
        ]
      },
      {
        subtitle: 'Ajouter un investisseur',
        description: 'Créer le profil complet de l\'investisseur avec ses accès (Dashboard/Projets/Administration). Le système génère automatiquement un mot de passe sécurisé.',
        steps: [
          'Saisir : Prénom, Nom, Email, Téléphone, Classe de parts (A/B/C)',
          'Nombre de parts et valeur initiale investie',
          'Permissions : Dashboard (toujours), Projets (optionnel), Administration (admin seulement)',
          'Un email d\'invitation est envoyé automatiquement avec le mot de passe généré'
        ]
      },
      {
        subtitle: 'Fiche investisseur PDF',
        description: 'Exporter une fiche personnalisée par investisseur : parts détenues, valeur actuelle, ROI, historique des transactions, dividendes reçus. Formaté pour remise officielle.',
        badge: 'jsPDF'
      }
    ]
  },
  {
    id: 'tresorerie',
    title: 'Trésorerie et Flux de Caisse',
    icon: Wallet,
    color: 'teal',
    items: [
      {
        subtitle: 'Compte Courant',
        description: 'Le compte courant (C/C) est la trésorerie opérationnelle. Le solde est calculé depuis les transactions avec affects_compte_courant=true. Les transferts entre C/C et CAPEX sont tracés comme transactions de type "transfert".',
        steps: [
          'Solde C/C = somme des flux entrants − flux sortants (affects_compte_courant)',
          'Le Dashboard affiche le solde actuel en temps réel',
          'Transactions C/C → type: loyer, depense, admin, maintenance, dividende',
          'Les investissements (achat de parts) affectent aussi le C/C si payment_source=compte_courant'
        ]
      },
      {
        subtitle: 'CAPEX — Compte d\'immobilisation',
        description: 'Le CAPEX (Capital Expenditures) finance les investissements immobiliers long terme. Séparé du C/C opérationnel. Chaque dépense CAPEX réduit l\'actif net disponible.',
        steps: [
          'Alimentation : transactions de type "capex" ou transferts depuis C/C',
          'Utilisation : paiements de propriétés, rénovations majeures, équipements',
          'Solde CAPEX : affiché dans le Dashboard et le Simulateur de dividendes',
          'Une réserve CAPEX recommandée (défaut 20% du C/C) est protégée lors des distributions'
        ]
      },
      {
        subtitle: 'Prévisions de flux de caisse',
        description: 'Le CashFlowForecast projette les entrées et sorties sur 12 mois : revenus locatifs attendus, versements de propriétés à venir, dépenses récurrentes.',
        badge: 'Prévision 12 mois'
      },
      {
        subtitle: 'Réconciliation bancaire',
        description: 'Le BankReconciliation permet de valider les transactions CERDIA vs les relevés bancaires. Marquer chaque ligne comme "réconciliée" pour clôturer la période.',
        note: 'La réconciliation mensuelle est recommandée avant le contrôle mensuel (MonthlyControl). Exporter un rapport de réconciliation pour le comptable.'
      },
      {
        subtitle: 'Alertes de trésorerie',
        description: 'Le système génère automatiquement des alertes : paiements en retard, solde C/C sous un seuil minimum, versements de propriétés imminent (30/7 jours).',
        steps: [
          '🔴 Paiement en retard : échéance dépassée, action requise',
          '🟡 Paiement dans 7 jours : à anticiper',
          '⚠️ Solde C/C faible : sous le seuil de sécurité configuré',
          '📅 Versement à venir : préparation recommandée'
        ]
      }
    ]
  },
  {
    id: 'nav',
    title: 'NAV — Valeur Nette d\'Actif',
    icon: BarChart2,
    color: 'amber',
    items: [
      {
        subtitle: 'Calcul de la NAV',
        description: 'La NAV (Net Asset Value) est calculée par la fonction PostgreSQL calculate_realistic_nav_v2(). Elle agrège : valeur marchande des propriétés (property_valuations), liquidités (compte courant + CAPEX), moins les passifs (liabilities).',
        steps: [
          'NAV = Valeur marchande propriétés + Liquidités − Passifs',
          'Valeur marchande = property_valuations.current_value (mise à jour manuelle ou automatique)',
          'Si pas de valuation : coût d\'acquisition × (1 + taux_appréciation)^années',
          'NAV/part = NAV totale ÷ total des parts en circulation',
          'L\'historique NAV est sauvegardé dans nav_timeline pour le graphique'
        ]
      },
      {
        subtitle: 'Mise à jour des valuations',
        description: 'Les évaluations de propriétés (PropertyValuationManager) permettent de saisir la valeur marchande actuelle, basée sur des évaluations professionnelles ou des comparables du marché.',
        steps: [
          'Saisir la valeur marchande actuelle en USD ou en devise locale',
          'Date d\'évaluation : utilisée pour calculer l\'appréciation annualisée',
          'Source : évaluateur agréé, valeur fiscale municipale, estimation personnelle',
          'La NAV se recalcule automatiquement après mise à jour'
        ],
        badge: 'Valuation'
      },
      {
        subtitle: 'Prix des parts et dilution',
        description: 'Le prix de vente d\'une nouvelle part est fixé manuellement dans "Prix des Parts". Il peut être différent de la valeur calculée (NAV/part) pour tenir compte d\'une prime de contrôle ou d\'un escompte de liquidité.',
        note: 'Chaque émission de nouvelles parts dilue la valeur des parts existantes. Calculer l\'impact avant toute nouvelle émission.'
      }
    ]
  },
  {
    id: 'budgetisation',
    title: 'Budgétisation',
    icon: ClipboardList,
    color: 'orange',
    items: [
      {
        subtitle: 'Créer un budget annuel',
        description: 'Le module de budgétisation permet de définir des budgets par catégorie et propriété. Les transactions réelles sont comparées au budget pour générer des écarts.',
        steps: [
          '1. Créer le budget via BudgetEditor (année, catégories, montants)',
          '2. Les transactions se classent automatiquement selon leur type/catégorie',
          '3. BudgetOverview affiche le réalisé vs planifié',
          '4. VarianceAnalysis met en évidence les dépassements significatifs',
          '5. BudgetAlerts génère des alertes si seuil de dépassement atteint (ex: +10%)'
        ]
      },
      {
        subtitle: 'Suivi de consommation',
        description: 'Le tableau de bord budget (BudgetDashboard) affiche en temps réel : budget total alloué, montant consommé, solde restant, taux de consommation par catégorie.',
        badge: 'Temps réel'
      }
    ]
  },
  {
    id: 'commerce',
    title: 'Commerce et Factures',
    icon: Landmark,
    color: 'rose',
    items: [
      {
        subtitle: 'Module Commerce',
        description: 'Gestion des produits CERDIA (vente directe, licences), des factures reçues via Gmail, et de la facturation. Chaque produit a un code GS1/ASIN, un type fiscal (Entrée/Sortie/Neutre), et un prix net de profit.',
        steps: [
          'Produits : créer via /commerce/admin, configurer le type fiscal',
          'Factures Gmail : importées automatiquement depuis la boîte Gmail liée',
          'Catégories : FACTURE, RECU_PAIEMENT, CONTRAT, DEVIS',
          'Lier une facture Gmail à une transaction CERDIA pour la piste d\'audit'
        ]
      },
      {
        subtitle: 'Factures et reçus',
        description: 'L\'InvoiceGenerator crée des factures PDF professionnelles avec le logo CERDIA, les coordonnées de la société, la ventilation des taxes (TPS/TVQ si applicable).',
        badge: 'PDF + TPS/TVQ'
      }
    ]
  },
  {
    id: 'securite',
    title: 'Sécurité et Accès',
    icon: ShieldCheck,
    color: 'gray',
    items: [
      {
        subtitle: 'Row Level Security (RLS)',
        description: 'Toutes les tables Supabase ont le RLS activé. Les investisseurs ne voient que les données de leur organisation. Les admins voient toutes les organisations (mode SuperAdmin avec override org_id).',
        steps: [
          'Chaque table a une policy basée sur auth.uid() et organization_id',
          'Les routes API server-side utilisent SUPABASE_SERVICE_ROLE_KEY (jamais exposée côté client)',
          'Les uploads de fichiers passent par /api/storage/upload-* (service_role)',
          'Les URLs signées sont valides 365 jours pour les pièces jointes'
        ]
      },
      {
        subtitle: 'Rôles et permissions',
        description: 'Trois niveaux d\'accès : Admin (accès total), Investisseur (dashboard + projets selon permission), Comptable (accès en lecture via token temporaire migration 194).',
        steps: [
          'Admin : toutes les fonctions + gestion des investisseurs',
          'Investisseur : Dashboard (toujours), Projets et Admin si autorisé',
          'Comptable : lien partagé temporaire avec token UUID (accountant_tokens)',
          'SuperAdmin (Eric) : peut basculer l\'organisation cible pour support'
        ]
      },
      {
        subtitle: 'PWA et Mobile',
        description: 'La plateforme est une Progressive Web App installable. Un build Capacitor génère les apps Android et iOS natives. Ne pas modifier public/sw.js manuellement — il est régénéré par next-pwa à chaque build.',
        note: 'Pour le build mobile : npm run build:mobile puis npx cap sync. Android Studio est requis pour le build Android.'
      }
    ]
  }
]

const COLOR_MAP: Record<string, { bg: string; border: string; text: string; iconBg: string }> = {
  gray:   { bg: 'bg-gray-50',   border: 'border-gray-200',   text: 'text-gray-700',   iconBg: 'bg-gray-100' },
  blue:   { bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-700',   iconBg: 'bg-blue-100' },
  indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700', iconBg: 'bg-indigo-100' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', iconBg: 'bg-purple-100' },
  teal:   { bg: 'bg-teal-50',   border: 'border-teal-200',   text: 'text-teal-700',   iconBg: 'bg-teal-100' },
  green:  { bg: 'bg-green-50',  border: 'border-green-200',  text: 'text-green-700',  iconBg: 'bg-green-100' },
  red:    { bg: 'bg-red-50',    border: 'border-red-200',    text: 'text-red-700',    iconBg: 'bg-red-100' },
  amber:  { bg: 'bg-amber-50',  border: 'border-amber-200',  text: 'text-amber-700',  iconBg: 'bg-amber-100' },
  orange: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', iconBg: 'bg-orange-100' },
  rose:   { bg: 'bg-rose-50',   border: 'border-rose-200',   text: 'text-rose-700',   iconBg: 'bg-rose-100' },
}

export default function UserGuide() {
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedSection, setExpandedSection] = useState<string | null>('architecture')

  const filtered = SECTIONS.filter(s =>
    !searchTerm ||
    s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.items.some(i =>
      i.subtitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.description.toLowerCase().includes(searchTerm.toLowerCase())
    )
  )

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
          <Book className="text-blue-600" size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mode d'emploi — CERDIA Platform</h1>
          <p className="text-gray-500 text-sm mt-1">Guide complet de toutes les fonctionnalités • Version 2026</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          type="text"
          placeholder="Rechercher dans le guide..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent text-sm"
        />
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Modules', value: '12+' },
          { label: 'Migrations SQL', value: '199+' },
          { label: 'Juridictions', value: '4 pays' },
          { label: 'Rapports PDF', value: '6 types' },
        ].map(stat => (
          <div key={stat.label} className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
            <div className="text-xl font-bold text-gray-800">{stat.value}</div>
            <div className="text-xs text-gray-500">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Sections */}
      <div className="space-y-3">
        {filtered.map(section => {
          const Icon = section.icon
          const colors = COLOR_MAP[section.color] ?? COLOR_MAP.gray
          const isExpanded = expandedSection === section.id

          return (
            <div key={section.id} className={`border rounded-xl overflow-hidden ${colors.border}`}>
              <button
                onClick={() => setExpandedSection(isExpanded ? null : section.id)}
                className={`w-full flex items-center justify-between p-4 text-left transition-colors ${isExpanded ? colors.bg : 'bg-white hover:bg-gray-50'}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg ${colors.iconBg} flex items-center justify-center shrink-0`}>
                    <Icon size={18} className={colors.text} />
                  </div>
                  <span className={`font-semibold text-sm sm:text-base ${colors.text}`}>{section.title}</span>
                  <span className="text-xs text-gray-400 hidden sm:inline">({section.items.length} rubriques)</span>
                </div>
                {isExpanded ? <ChevronUp size={18} className="text-gray-500 shrink-0" /> : <ChevronDown size={18} className="text-gray-500 shrink-0" />}
              </button>

              {isExpanded && (
                <div className="divide-y divide-gray-100 bg-white">
                  {section.items.map((item, idx) => (
                    <div key={idx} className="p-4 sm:p-5">
                      <div className="flex items-start gap-2 mb-2">
                        <h3 className="font-semibold text-gray-800 text-sm">{item.subtitle}</h3>
                        {item.badge && (
                          <span className={`shrink-0 px-2 py-0.5 text-xs font-medium rounded-full ${colors.bg} ${colors.text} border ${colors.border}`}>
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-gray-600 text-sm leading-relaxed mb-3">{item.description}</p>
                      {item.steps && (
                        <ul className="space-y-1.5">
                          {item.steps.map((step, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                              <CheckCircle size={14} className={`${colors.text} mt-0.5 shrink-0`} />
                              <span>{step}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      {item.note && (
                        <div className="mt-3 flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                          <AlertCircle size={14} className="text-amber-600 mt-0.5 shrink-0" />
                          <p className="text-xs text-amber-700">{item.note}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}

        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Search size={40} className="mx-auto mb-3 text-gray-300" />
            <p>Aucun résultat pour "<strong>{searchTerm}</strong>"</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center gap-2 p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <Info size={16} className="text-blue-600 shrink-0" />
        <p className="text-xs text-blue-700">
          Ce guide est maintenu à jour avec le code source. Dernière mise à jour : 2026-05-28.
          Pour toute question technique, contacter eric.dufort@cerdia.ai.
        </p>
      </div>
    </div>
  )
}
