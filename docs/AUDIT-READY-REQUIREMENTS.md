# Exigences: Système Audit-Ready & Investor-Ready

## 🎯 Objectifs

Le système doit être prêt pour:
1. ✅ **Audit comptable** - Vérification externe par comptable/auditeur
2. ✅ **Rapport comptable annuel** - États financiers conformes
3. ✅ **Présentation entreprise** - Pitch deck investisseurs/acheteurs
4. ✅ **Vente/Due diligence** - Package complet pour revente propriétés ou entreprise

---

## 📊 1. Audit Comptable

### Exigences pour audit:

**Traçabilité complète**:
- [ ] Chaque transaction avec justificatif (reçu, facture, contrat)
- [ ] Historique immuable (qui a créé/modifié, quand)
- [ ] Numéros de transaction séquentiels
- [ ] Rapprochements bancaires
- [ ] Journal général (G/L) complet

**Documents requis**:
- [ ] Grand livre général (General Ledger)
- [ ] Balance de vérification (Trial Balance)
- [ ] Journaux auxiliaires (sub-ledgers):
  - Journal des achats
  - Journal des ventes/revenus
  - Journal de banque
  - Journal des salaires (si applicable)

**Rapports comptables**:
- [ ] État des résultats (Income Statement)
- [ ] Bilan (Balance Sheet)
- [ ] État des flux de trésorerie (Cash Flow Statement)
- [ ] Notes aux états financiers

**Conformité fiscale**:
- [ ] TPS/TVQ collectée et payée
- [ ] Retenues à la source (si applicable)
- [ ] Déclarations fiscales T2 (corporative)
- [ ] Déclarations T5013 (société de personnes) si applicable
- [ ] Feuillets fiscaux investisseurs (T5, T3, etc.)

### Exports requis pour audit:

```typescript
// 1. Export Grand Livre Général (CSV/Excel)
interface GeneralLedgerExport {
  date: Date
  transaction_id: string
  account_code: string        // 1000-Actifs, 2000-Passifs, etc.
  account_name: string
  description: string
  debit: number
  credit: number
  balance: number
  reference: string          // Numéro facture/reçu
  created_by: string
  verified: boolean
  supporting_doc_url: string // Lien vers justificatif
}

// 2. Export Balance de Vérification
interface TrialBalanceExport {
  account_code: string
  account_name: string
  account_type: 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense'
  debit_total: number
  credit_total: number
  balance: number
}

// 3. Export Rapprochement Bancaire
interface BankReconciliationExport {
  date: Date
  bank_statement_balance: number
  outstanding_deposits: number
  outstanding_checks: number
  adjusted_bank_balance: number
  book_balance: number
  reconciliation_items: ReconciliationItem[]
  reconciled_by: string
  verified: boolean
}
```

---

## 📈 2. Rapports Comptables

### États financiers annuels:

**1. État des résultats (Income Statement)**
```
CERDIA INC.
État des résultats
Pour l'exercice terminé le 31 décembre 2025

REVENUS
  Revenus locatifs                     45,000$
  Dividendes                            2,500$
  Gain sur vente de propriété          15,000$
                                      --------
  Total des revenus                    62,500$

CHARGES
  Frais de gestion                      4,500$
  Entretien et réparations              3,200$
  Taxes municipales                     2,800$
  Assurances                            1,500$
  Intérêts sur emprunt                  5,000$
  Amortissement                         8,000$
  Frais professionnels                  2,000$
                                      --------
  Total des charges                    27,000$

BÉNÉFICE NET                           35,500$
========
```

**2. Bilan (Balance Sheet)**
```
CERDIA INC.
Bilan
Au 31 décembre 2025

ACTIF
  Actif à court terme
    Encaisse                            25,000$
    Placements à court terme            10,000$
    Débiteurs                            3,000$
                                       --------
    Total actif à court terme           38,000$

  Immobilisations
    Propriétés immobilières            500,000$
    Moins: Amortissement cumulé        (40,000$)
                                       --------
    Immobilisations nettes             460,000$

TOTAL DE L'ACTIF                       498,000$
========

PASSIF ET AVOIR DES ACTIONNAIRES
  Passif à court terme
    Créditeurs                           5,000$
    Taxes à payer                        2,000$
                                       --------
    Total passif à court terme           7,000$

  Passif à long terme
    Emprunt hypothécaire               200,000$

  Avoir des actionnaires
    Capital-actions                    100,000$
    Bénéfices non répartis             191,000$
                                       --------
    Total avoir                        291,000$

TOTAL DU PASSIF ET AVOIR               498,000$
========
```

**3. État des flux de trésorerie**
```
CERDIA INC.
État des flux de trésorerie
Pour l'exercice terminé le 31 décembre 2025

ACTIVITÉS D'EXPLOITATION
  Bénéfice net                          35,500$
  Ajustements:
    Amortissement                        8,000$
    Variation débiteurs                 (1,000$)
    Variation créditeurs                 2,000$
                                       --------
  Flux de trésorerie - exploitation     44,500$

ACTIVITÉS D'INVESTISSEMENT
  Acquisition de propriétés           (150,000$)
  Produit de vente de propriété         80,000$
                                       --------
  Flux de trésorerie - investissement  (70,000$)

ACTIVITÉS DE FINANCEMENT
  Emprunt hypothécaire                  50,000$
  Remboursement emprunt                (10,000$)
  Dividendes versés                     (8,000$)
                                       --------
  Flux de trésorerie - financement      32,000$

AUGMENTATION DE L'ENCAISSE                6,500$
ENCAISSE AU DÉBUT                        18,500$
ENCAISSE À LA FIN                        25,000$
========
```

### Exports requis:

- [ ] PDF formaté professionnel
- [ ] Excel avec formules
- [ ] CSV pour import dans logiciel comptable
- [ ] SAGE/QuickBooks/Xero compatible

---

## 🎤 3. Présentation Entreprise

### Pitch Deck auto-généré (10-15 slides):

**Slide 1: Couverture**
- Logo CERDIA
- "Plateforme d'investissement immobilier"
- Valeur totale du portefeuille
- Date génération

**Slide 2: Sommaire Exécutif**
- Nombre de propriétés
- Valeur totale actifs
- Nombre d'investisseurs
- ROI moyen
- Croissance YoY

**Slide 3: Portefeuille**
- Liste des propriétés avec photos
- Localisation (carte)
- Statut de chaque projet
- Valeur actuelle vs acquisition

**Slide 4: Performance Financière**
- Graphique revenus 3 dernières années
- Graphique croissance actifs
- ROI par propriété
- Comparaison avec marché

**Slide 5: Structure de Capital**
- Répartition actionnaires
- Capital investi par classe
- Dividendes distribués
- Bénéfices réinvestis

**Slide 6: Projections**
- Projets en cours
- Pipeline d'acquisitions
- Projections 3-5 ans
- Stratégie de croissance

**Slide 7: Gestion des Risques**
- Diversification géographique
- Types de propriétés
- Taux d'occupation
- Couverture assurance

**Slide 8: Due Diligence**
- Tous les états financiers disponibles
- Audits complétés
- Conformité fiscale
- Documents légaux

**Slide 9: Contact**
- Informations entreprise
- Personnes-ressources
- Site web / portail investisseurs

### Formats d'export:

- [ ] **PowerPoint (.pptx)** - Éditable
- [ ] **PDF** - Présentation finale
- [ ] **Google Slides** - Partage en ligne
- [ ] **Impression** - Version papier haute qualité

---

## 💼 4. Vente / Due Diligence

### Package Due Diligence par propriété:

**Documents légaux**:
- [ ] Titre de propriété (deed)
- [ ] Contrat d'achat original
- [ ] Assurances (preuve de couverture)
- [ ] Permis et certifications
- [ ] Inspection pré-achat
- [ ] Évaluations municipales

**Documents financiers**:
- [ ] Tous les payment_schedules
- [ ] Tous les reçus de paiement
- [ ] Historique complet des transactions
- [ ] Rapprochements bancaires
- [ ] États de revenus locatifs
- [ ] Déclarations fiscales spécifiques à la propriété

**Documents opérationnels**:
- [ ] Contrats de location (si applicable)
- [ ] Historique d'occupation
- [ ] Factures d'entretien
- [ ] Garanties équipements
- [ ] Plans et devis

**Analyses et projections**:
- [ ] Scénario d'origine avec projections
- [ ] Performance réelle vs projections
- [ ] Analyse comparative marché
- [ ] Potentiel de plus-value
- [ ] Risques identifiés

### Virtual Data Room (VDR):

Structure de dossiers pour due diligence:

```
📁 CERDIA - Due Diligence
  📁 1. Corporate Documents
    - Statuts incorporation
    - Registre actionnaires
    - Procès-verbaux
    - Conventions actionnaires

  📁 2. Financial Statements
    - États financiers 3 ans
    - Rapports audit
    - Déclarations fiscales
    - Rapprochements bancaires

  📁 3. Properties
    📁 Oasis Bay A301
      - Titre propriété
      - Contrat achat
      - Historique transactions
      - Photos
      - Évaluations
    📁 [Autre propriété]
      ...

  📁 4. Contracts
    - Contrats gestion
    - Contrats location
    - Contrats service

  📁 5. Legal & Compliance
    - Permis
    - Assurances
    - Conformités

  📁 6. Projections
    - Scénarios originaux
    - Business plan
    - Projections 5 ans
```

### Checklist de vente:

- [ ] Tous les documents justificatifs scannés et organisés
- [ ] Aucune transaction sans reçu
- [ ] Toutes les taxes payées à jour
- [ ] Rapprochements bancaires à jour
- [ ] États financiers certifiés
- [ ] Aucun litige en cours
- [ ] Polices d'assurance actives
- [ ] Permis et licences valides
- [ ] Évaluations récentes (<1 an)
- [ ] Titre de propriété clair (no liens)

---

## 🔒 5. Audit Trail & Traçabilité

### Historique immuable:

Chaque transaction doit enregistrer:
```typescript
interface AuditTrail {
  action_id: UUID
  timestamp: Date
  user_id: UUID
  user_name: string
  action_type: 'CREATE' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'VERIFY'
  table_name: string
  record_id: UUID
  old_values: JSON | null
  new_values: JSON
  ip_address: string
  user_agent: string
  notes: string | null
}
```

**Règles**:
- ❌ Aucune suppression physique (soft delete seulement)
- ✅ Toute modification enregistrée dans audit_trail
- ✅ Qui/Quand/Quoi toujours documenté
- ✅ Approbations requises pour opérations critiques
- ✅ Vérification en 2 étapes (maker/checker)

### Rapports d'audit:

- [ ] Log de toutes les modifications (derniers 12 mois)
- [ ] Transactions non vérifiées
- [ ] Documents manquants
- [ ] Écarts budgétaires >10%
- [ ] Paiements en retard
- [ ] Anomalies détectées

---

## 🚀 Plan d'implémentation

### Phase 1: Infrastructure (2-3 jours)
- [ ] Table audit_trail
- [ ] Triggers sur toutes les tables importantes
- [ ] Vues SQL pour rapports comptables
- [ ] Migration documents existants

### Phase 2: Exports Comptables (2-3 jours)
- [ ] Export Grand Livre
- [ ] Export Balance de Vérification
- [ ] États financiers auto-générés
- [ ] Format Excel/CSV

### Phase 3: Package Due Diligence (2 jours)
- [ ] Structure VDR
- [ ] Checklist validation documents
- [ ] Export ZIP complet par propriété
- [ ] Génération automatique index

### Phase 4: Présentation (1-2 jours)
- [ ] Template PowerPoint
- [ ] Auto-génération slides
- [ ] Graphiques intégrés
- [ ] Export multi-format

### Phase 5: Validation & Tests (1 jour)
- [ ] Test avec comptable réel
- [ ] Validation formats exports
- [ ] Tests audits
- [ ] Documentation utilisateur

---

**Total estimé**: 8-11 jours de développement

**Priorisation**: Infrastructure → Exports → Package → Présentation

**Date**: 2025-01-24
**Status**: Spécification approuvée
