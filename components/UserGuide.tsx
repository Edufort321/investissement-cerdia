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
        description: 'Le formulaire T1135 est obligatoire pour les résidents canadiens possédant des biens étrangers dont le coût total dépasse 100 000 $ CAD. La plateforme détecte automatiquement la méthode requise.',
        steps: [
          'Seuil de déclaration : coût total ≥ 100 000 $ CAD à tout moment de l\'année',
          'Méthode simplifiée (Partie A) — coût total < 250 000 $ : valeur approximative, revenu brut, gains/pertes. Plus facile à remplir.',
          'Méthode détaillée (Partie B) — coût total ≥ 250 000 $ : détail complet par propriété — coût, valeur marchande en fin d\'année, revenu brut, gain/perte en capital.',
          'Catégorie 6 (notre cas) : Biens immobiliers étrangers (RD, USA)',
          'La plateforme bascule automatiquement entre Partie A et Partie B selon le total calculé',
          'Date limite : 30 avril (T1 standard) ou 15 juin (travailleurs autonomes)',
          'Pénalité si omis : 2 500 $ minimum + 5% de la valeur maximale (pouvant atteindre 25 000 $)'
        ],
        note: 'Si vous possédez des propriétés en RD ET aux USA, additionnez les coûts pour déterminer Partie A ou B. Le système le calcule depuis vos projets.',
        badge: 'T1135 ARC'
      },
      {
        subtitle: 'T2209 — Crédit d\'impôt étranger (double imposition)',
        description: 'Le T2209 évite la double imposition sur vos revenus étrangers. Vous payez l\'impôt à l\'étranger (RD, USA), puis réclamez un crédit équivalent sur votre déclaration canadienne (ligne 40500). Le crédit est plafonné à 15% du revenu étranger net.',
        steps: [
          'Étape 1 : Saisir l\'impôt payé à l\'étranger dans chaque transaction (champ "Impôt étranger payé")',
          'Étape 2 : Dans TaxReports → T2209, saisir votre revenu imposable canadien total pour calculer le plafond 15%',
          'Plafond = 15% × revenu étranger net (revenus locatifs après dépenses)',
          'Si impôt étranger payé > plafond : l\'excédent devient un CARRYFORWARD (report aux années suivantes — illimité)',
          'Si impôt étranger payé < plafond : vous n\'avez pas maximisé votre crédit (revoir les retenues)',
          'Carryback 3 ans : si vous n\'avez pas pu utiliser le crédit cette année, remplir T1-ADJ pour modifier les 3 dernières déclarations',
          'Bouton "Historique" → sauvegarde dans foreign_tax_credit_history pour chaque année',
          'Rapport par pays : US, RD, MX calculés séparément (exiger votre CPA)'
        ],
        note: 'Pour CERDIA : les retenues IRNR (RD) et FIRPTA/IRS (USA) constituent les principales sources de crédit T2209. Saisir ces montants dans foreign_tax_paid à chaque transaction.',
        badge: 'T2209'
      },
      {
        subtitle: 'T2209 Carryback — Récupérer l\'impôt des 3 dernières années',
        description: 'Si vous avez payé beaucoup d\'impôt étranger cette année mais peu les années précédentes (ex : première année avec des propriétés en RD), vous pouvez reporter le crédit en arrière sur les 3 dernières années via formulaire T1-ADJ.',
        steps: [
          'Accéder : TaxReports → T2209 → panneau "Report T2209 — Carryforward / Carryback"',
          'Vérifier le carryforward généré (crédit non utilisé cette année)',
          'Sélectionner l\'année cible : N-1, N-2 ou N-3 (jusqu\'à 3 ans en arrière)',
          'Saisir le montant à appliquer (max = carryforward disponible)',
          'Cocher "T1-ADJ soumis" dès que vous envoyez le formulaire à l\'ARC',
          'Ajouter la date de soumission et le numéro de référence ARC',
          'Délai traitement ARC : 8 à 16 semaines. L\'ARC réémet un avis de cotisation.'
        ],
        note: 'Le T1-ADJ se soumet par courrier ou par Mon Dossier ARC. Avoir votre avis de cotisation original de l\'année en question. Un CPA peut faire cela pour vous.',
        badge: 'T1-ADJ'
      },
      {
        subtitle: 'W-8BEN — Certificat de statut étranger (USA)',
        description: 'Le W-8BEN (Certificate of Foreign Status of Beneficial Owner) est le formulaire IRS qui certifie que vous êtes un NON-résident américain. Il est essentiel pour réduire ou éliminer la retenue automatique de 30% sur vos revenus de source américaine.',
        steps: [
          'À soumettre à : votre gestionnaire de propriété, votre banque américaine, toute entité qui vous paie des revenus US',
          'Effet : réduit la retenue à la source de 30% (taux NR standard) → 0% sous la convention Canada-USA pour les revenus d\'intérêts',
          'Pour les LOYERS : le W-8BEN seul ne suffit pas — il faut combiner avec W-8ECI (voir ci-dessous)',
          'Validité : 3 ans. À renouveler avant expiration.',
          'Remplir : Nom, adresse canadienne, NAS ou ITIN, pays de résidence (Canada), article de convention (Article VI pour les loyers)',
          'Signer et dater. Envoyer en version papier ou électronique selon les exigences du payeur.',
          'Dans la plateforme : cocher "W-8BEN soumis" + date dans la fiche de la propriété (Gestion des Projets → Modifier)'
        ],
        note: 'IMPORTANT : Le W-8BEN ne vous exempte PAS de la retenue sur les loyers. Pour les revenus locatifs, le W-8ECI est le formulaire clé. Le W-8BEN est utile surtout pour les intérêts et dividendes de source américaine.',
        badge: 'W-8BEN IRS'
      },
      {
        subtitle: 'W-8ECI — Élection ECI (revenus locatifs USA)',
        description: 'Le W-8ECI (Effectively Connected Income) est le formulaire le plus important pour les propriétaires non-résidents en Floride. Il déclare que vos revenus locatifs sont "effectivement connectés" à un commerce américain, ce qui vous permet d\'être taxé sur le REVENU NET (avec déductions) plutôt que sur le brut.',
        steps: [
          'SANS W-8ECI : votre gestionnaire doit retenir 30% sur le LOYER BRUT → vous avez perdu sur les dépenses',
          'AVEC W-8ECI : retenue ÉLIMINÉE → vous déclarez et payez l\'impôt US sur votre REVENU NET (loyers - dépenses - dépréciation)',
          'Étape 1 : Obtenir un ITIN (Individual Taxpayer Identification Number) si vous n\'en avez pas — formulaire W-7, ~6-10 semaines de délai',
          'Étape 2 : Remplir W-8ECI avec votre ITIN et le soumettre à votre gestionnaire immobilier',
          'Étape 3 : Déposer Form 1040-NR (non-resident alien income tax return) chaque année — échéance 15 juin',
          'Vous pouvez déduire : intérêts hypothécaires, dépréciation MACRS (27.5 ans résidentiel, 39 ans commercial), réparations, frais de gestion',
          'Dans la plateforme : saisir la date W-8ECI dans la fiche propriété US',
          'L\'impôt US net payé génère un crédit T2209 au Canada → pratiquement aucune double imposition'
        ],
        note: 'Pour CERDIA avec des propriétés en Floride : W-8ECI + 1040-NR est la stratégie optimale. Les économies sur les déductions (surtout dépréciation MACRS) dépassent largement le coût de préparation du 1040-NR. Consulter un comptable canadien-américain (Serbinski, Altro Associates, etc.).',
        badge: 'W-8ECI IRS'
      },
      {
        subtitle: 'FIRPTA — Retenue USA à la vente d\'un immeuble',
        description: 'FIRPTA (Foreign Investment in Real Property Tax Act) impose une retenue obligatoire lors de la vente d\'un bien immobilier américain par un non-résident. C\'est l\'ACHETEUR qui retient et envoie l\'argent à l\'IRS.',
        steps: [
          'Taux standard : 15% du PRIX DE VENTE BRUT (pas du gain — du prix total)',
          'Exemple : vente à 500 000 $ → 75 000 $ retenus par l\'acheteur vers l\'IRS',
          'Taux réduit 10% : si prix de vente < 1 000 000 $ ET acheteur occupe le bien comme résidence principale',
          'Form 8288 : l\'acheteur doit soumettre dans les 20 jours suivant la clôture',
          'Récupération : en déposant Form 1040-NR, vous réclamez le net (retenue - impôt réel sur le gain)',
          'Si le gain net est inférieur à 15% du prix, vous récupérez la différence (souvent plusieurs mois d\'attente)',
          'Withholding Certificate (Form 8288-B) : à demander AVANT la clôture si vous prévoyez un remboursement important',
          'Dans la plateforme TaxReports → T1135 → section FIRPTA : calcul automatique depuis la date de vente'
        ],
        note: 'Stratégie : si vous vendez à plus de 1 M$, demandez un Withholding Certificate (Form 8288-B) à l\'IRS avant la clôture pour réduire la retenue au montant réel de l\'impôt. Délai IRS : 90 jours.',
        badge: 'FIRPTA 15%'
      },
      {
        subtitle: 'IRNR RD — Retenue non-résidents République Dominicaine',
        description: 'L\'IRNR (Impuesto sobre la Renta de No Residentes) est l\'équivalent dominicain de la retenue pour non-résidents. Taux : 27% sur les revenus locatifs bruts. Le locataire ou gestionnaire retient l\'impôt avant de vous remettre le loyer.',
        steps: [
          'Taux : 27% du revenu locatif BRUT pour les non-résidents (Canadiens inclus)',
          'Retenu par : le locataire (paiement mensuel direct à la DGII) ou votre gestionnaire immobilier',
          'Déclaration annuelle : IR-2 (déclaration de revenus RD) à déposer avant le 31 mars',
          'Exonération Confotur : si votre propriété est certifiée Confotur (zone touristique agréée Loi 158-01), l\'IRNR peut être exonéré pendant la période de grâce',
          'Dans la plateforme : le montant IRNR est estimé automatiquement à 27% pour chaque revenu locatif RD non-Confotur sans impôt étranger saisi',
          'Saisir l\'IRNR réel retenu dans le champ "Impôt étranger payé" de la transaction → génère le crédit T2209',
          'Colonne IRNR visible dans le tableau Multi-juridiction (TaxReports)',
          'L\'IRNR retenu = crédit T2209 réclamable au Canada (ligne 40500)'
        ],
        note: 'Pratique CERDIA : votre gestionnaire RD (ex: Century21, réseau local) devrait vous remettre un reçu mensuel de la retenue IRNR. Conservez ces reçus pour appuyer votre T2209 au Canada.',
        badge: 'IRNR RD 27%'
      },
      {
        subtitle: 'ITBIS RD — TVA sur locations court terme',
        description: 'L\'ITBIS (Impuesto sobre Transferencias de Bienes Industrializados y Servicios) est la TVA dominicaine à 18%. Elle s\'applique uniquement aux locations touristiques court terme (≤30 nuits). Les locations long terme (résidentielles) en sont exemptées.',
        steps: [
          'Taux : 18% sur le montant brut de la location court terme',
          'Déclenché si : location ≤ 30 nuits ET propriété en RD',
          'Exonération Confotur : propriétés certifiées Loi 158-01 sont exonérées d\'ITBIS',
          'Déclaration mensuelle à la DGII (avant le 20 du mois suivant)',
          'Dans la plateforme : saisir la durée en jours dans la transaction → le système affiche l\'ITBIS estimé',
          'Champ is_confotur sur la transaction = exonération automatique',
          'Les plateformes (Airbnb) collectent et versent l\'ITBIS automatiquement en RD depuis 2021'
        ],
        note: 'ITBIS ≠ IRNR : ce sont deux obligations distinctes. ITBIS = TVA sur le service (court terme seulement). IRNR = impôt sur le revenu du non-résident (long et court terme).',
        badge: 'ITBIS 18%'
      },
      {
        subtitle: 'TDT Florida — Tourist Development Tax',
        description: 'La TDT est une taxe de comté en Floride sur les locations courtes (≤182 jours). Elle s\'ajoute à la Sales Tax de l\'État de 6%. Les taux varient par comté. La plateforme calcule et sauvegarde automatiquement le montant TDT lors de la saisie d\'une transaction.',
        steps: [
          'Miami-Dade : TDT 6% + Sales Tax 6% = 12% total sur le loyer brut',
          'Orange / Osceola (Orlando, Disney) : TDT 6% + Sales Tax 6% = 12% total',
          'Pinellas (St. Petersburg) : TDT 6% + Sales Tax 6% = 12% total',
          'Broward / Hillsborough / Collier / Keys : TDT 5% + Sales Tax 6% = 11% total',
          'Déclaration mensuelle : Florida Dept. of Revenue (DR-15) pour Sales Tax + déclaration comté séparée pour TDT',
          'Auto-save : quand vous saisissez une transaction pour une propriété FL avec durée ≤182j, county_tdt_amount et county_tdt_rate sont sauvegardés automatiquement',
          'Airbnb / VRBO collectent parfois la taxe directement (vérifier avec votre gestionnaire)'
        ],
        note: 'Les plateformes de location (Airbnb) sont "marketplace facilitators" en Floride — elles collectent et remettent Sales Tax + TDT directement depuis 2020. Si vous passez par un gestionnaire privé, c\'est votre responsabilité.',
        badge: 'TDT Florida'
      },
      {
        subtitle: 'CCA / FNACC — Déduction pour amortissement (DPA)',
        description: 'La CCA (Capital Cost Allowance) est la déduction fiscale canadienne pour l\'usure du bâtiment. Elle réduit votre revenu locatif imposable. Aux USA, l\'équivalent s\'appelle MACRS (Modified Accelerated Cost Recovery System).',
        steps: [
          'Classe 1 Canada (4%/an) : bâtiment résidentiel ou commercial (95% des propriétés)',
          'Classe 8 Canada (20%/an) : mobilier, équipements, appareils électroménagers',
          'Classe 13 Canada (20%/an) : améliorations locatives (renovations d\'un logement loué)',
          'USA Résidentiel (MACRS 27.5 ans = 3.636%/an) : toute propriété résidentielle US',
          'USA Commercial (MACRS 39 ans = 2.564%/an) : immeuble à usage commercial US',
          'Règle de la demi-année (Canada) : l\'année d\'acquisition, seulement 50% du taux normal',
          'Le terrain n\'est PAS amortissable — exclure 20% du coût total (défaut plateforme)',
          'DPA optionnelle : vous choisissez chaque année combien déduire (max = calcul CCA)',
          'Bouton "Sauvegarder en DB" dans TaxReports → T1135 → CCA pour archiver dans cca_schedule'
        ],
        note: 'Stratégie : ne déduire la DPA que si vous avez du revenu locatif NET positif. La DPA réduit le coût en capital → au moment de la vente, le gain imposable sera plus grand (récupération d\'amortissement — inclure cela dans votre planification de sortie).',
        badge: 'CCA / MACRS'
      },
      {
        subtitle: 'Multi-juridiction — Vue consolidée et piste d\'audit',
        description: 'L\'onglet Multi-juridiction du rapport fiscal consolide toutes les obligations fiscales par pays pour l\'année sélectionnée. C\'est la vue de référence pour préparer votre rencontre avec le comptable.',
        steps: [
          'Colonnes : Pays | Revenu brut | Taxe vente | Impôt État | Retenue NR | IRNR RD | Total estimé | Déjà retenu | Remis | Solde dû | Statut',
          'Résolution pays : depuis tax_country de la transaction → country_code de la propriété → devise source (USD→US, DOP→DO)',
          'IRNR RD : colonne dédiée pour les estimations de retenue 27% République Dominicaine',
          'Statut ✅ = tout est remis | 🟡 = partiel | 🔴 = solde dû',
          'Pour enregistrer un paiement : créer une transaction DÉPENSE → catégorie fiscale "Remises Fiscales"',
          'Exporter PDF multi-juridiction pour le comptable ou l\'ARC',
          'Ajouter les remises dans les transactions pour que le "Solde dû" se mette à zéro'
        ],
        note: 'Ce rapport est votre outil principal de conformité fiscale internationale. Viser "Solde dû = 0 $" pour chaque pays avant le 30 avril.'
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
