# Spécifications: Vue Projet Complète

## 🎯 Objectif

Quand un scénario est converti en projet, l'onglet **Projet** doit afficher une vue complète permettant de:
1. Voir toutes les données du scénario d'origine
2. Comparer les projections (scénario) vs la réalité (transactions)
3. Suivre les revenus réels vs les revenus projetés
4. Filtrer et analyser les transactions par période
5. Générer un bilan PDF pour la revente

---

## 📋 Fonctionnalités requises

### 1. **Données du scénario transférées au projet**

Lors de la conversion scénario → projet, transférer:

✅ **Déjà fait:**
- Photo principale
- Prix d'achat, acompte initial
- Termes de paiement (payment_schedules)
- Coût total avec frais de transaction

❌ **À faire:**
- Pièces jointes (documents PDF, Excel, etc.)
- Projections ROI (conservative, moderate, optimistic)
- Données promoteur (loyer mensuel, taux occupation, etc.)
- Données de construction (statut, date livraison)

### 2. **Section "Scénario d'origine" dans Projet**

Afficher dans le projet toutes les infos du scénario:

```
┌─────────────────────────────────────────────────┐
│ 📊 Scénario d'origine: Oasis Bay A301          │
├─────────────────────────────────────────────────┤
│ Créé le: 2025-01-24                            │
│ Promoteur: XYZ Development                      │
│ Statut construction: En construction            │
│ Livraison prévue: 2026-06-30                   │
│                                                 │
│ Prix d'achat: 178,000 USD                       │
│ Acompte initial: 2,000 USD                      │
│ Frais transaction: 3,560 USD (2%)              │
│ Coût total: 181,560 USD                         │
│                                                 │
│ Loyer mensuel prévu: 350 USD                    │
│ Taux occupation: 85%                            │
│ Durée projection: 10 ans                        │
│                                                 │
│ [Voir projections ROI détaillées] ↓            │
└─────────────────────────────────────────────────┘
```

### 3. **Onglets dans la vue Projet**

Organiser l'information en onglets:

```
┌─────────────────────────────────────────────────┐
│ [Résumé] [Paiements] [Revenus] [Transactions]  │
│                     [Documents] [Bilan]         │
├─────────────────────────────────────────────────┤
│                                                 │
│  Contenu de l'onglet actif                     │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Onglet "Résumé"** (actuel):
- Photo principale
- Bilan budgétaire (prévu vs réel)
- Échéancier paiements
- Infos du scénario d'origine

**Onglet "Paiements"**:
- Liste des termes de paiement
- Statut de chaque terme
- Graphique comparatif (déjà fait)
- Lien vers transactions associées

**Onglet "Revenus"** (NOUVEAU):
- **Revenus projetés** (du scénario)
  - Loyer mensuel × occupation × 12 mois
  - Par année sur 10 ans
  - En CAD avec taux de change

- **Revenus réels** (des transactions)
  - Revenus locatifs encaissés
  - Par mois / année
  - Comparaison avec projections

- **Graphique** revenus prévus vs réels

**Onglet "Transactions"** (AMÉLIORÉ):
- Liste de toutes les transactions du projet
- **Filtres**:
  - Par type (investissement, revenu locatif, dépense, etc.)
  - Par période: Mois, Année, Total
  - Par statut (vérifié, en attente)
- Totaux par catégorie
- Export CSV

**Onglet "Documents"**:
- Documents du scénario (transférés)
- Documents du projet (ajoutés après)
- Upload de nouveaux documents
- Catégories: Photos, Contrats, Factures, Plans, Autre

**Onglet "Bilan"** (NOUVEAU):
- Vue d'ensemble pour revente
- Sections:
  1. Informations générales
  2. Investissement total (prévu vs réel)
  3. Revenus (prévus vs réels)
  4. ROI actuel vs projeté
  5. Timeline du projet
  6. Documents importants
- **Bouton "Imprimer PDF"** pour générer le bilan

### 4. **Filtres sur les transactions**

Interface de filtres:

```
┌─────────────────────────────────────────────────┐
│ Transactions du projet                          │
├─────────────────────────────────────────────────┤
│                                                 │
│ Période: [Tout] [2025] [2024] [Jan 2025] ▼    │
│ Type: [Tous] [Revenus] [Dépenses] ▼           │
│ Statut: [Tous] [Vérifié] [En attente] ▼       │
│                                                 │
│ ┌───────────────────────────────────────────┐  │
│ │ 2025-01-15 | Loyer Janvier | +350 USD    │  │
│ │ 2025-01-10 | 1er versement | -35,600 USD │  │
│ │ 2024-12-20 | Acompte       | -2,000 USD  │  │
│ └───────────────────────────────────────────┘  │
│                                                 │
│ Total période: -37,250 USD                     │
│                                                 │
│ [Export CSV] [Export PDF]                      │
└─────────────────────────────────────────────────┘
```

### 5. **Export PDF Bilan**

Générer un PDF professionnel avec:

**Page 1: Informations générales**
- Nom du projet + Photo
- Adresse
- Date création / conversion
- Statut actuel

**Page 2: Investissement**
- Tableau comparatif prévu vs réel
- Coût total, termes de paiement
- Économies ou dépassements

**Page 3: Revenus et ROI**
- Revenus projetés vs réels
- Graphique évolution
- ROI prévu vs actuel
- Projection sur durée restante

**Page 4: Timeline**
- Historique des événements clés
- Paiements effectués
- Documents importants

**Page 5: Documents annexes**
- Liste des documents disponibles
- QR code vers dossier en ligne (optionnel)

---

## 🔧 Implémentation technique

### Étape 1: Migration SQL - Lien documents scénario → projet

```sql
-- Ajouter colonne dans property_attachments pour lier aux scénarios
ALTER TABLE property_attachments
ADD COLUMN IF NOT EXISTS source_scenario_id UUID REFERENCES scenarios(id);

-- Fonction pour copier documents lors conversion
CREATE FUNCTION copy_scenario_documents_to_property(
  p_scenario_id UUID,
  p_property_id UUID
) ...
```

### Étape 2: Sauvegarder les projections ROI dans le projet

Créer une table `property_projections`:
```sql
CREATE TABLE property_projections (
  id UUID PRIMARY KEY,
  property_id UUID REFERENCES properties(id),
  scenario_type VARCHAR(20), -- conservative, moderate, optimistic
  year INTEGER,
  projected_revenue_cad DECIMAL(12,2),
  projected_expenses_cad DECIMAL(12,2),
  projected_roi DECIMAL(5,2),
  ...
)
```

### Étape 3: Suivre les revenus réels

Utiliser les transactions existantes avec:
- `type = 'rental_income'` (à ajouter si n'existe pas)
- Lien vers `property_id`
- Grouper par mois/année pour comparaison

### Étape 4: Composant React avec onglets

```tsx
// ProjetDetailedView.tsx
<Tabs>
  <TabList>
    <Tab>Résumé</Tab>
    <Tab>Paiements</Tab>
    <Tab>Revenus</Tab>
    <Tab>Transactions</Tab>
    <Tab>Documents</Tab>
    <Tab>Bilan</Tab>
  </TabList>

  <TabPanel>Résumé...</TabPanel>
  <TabPanel>Paiements...</TabPanel>
  <TabPanel>Revenus vs Projections...</TabPanel>
  <TabPanel>Transactions avec filtres...</TabPanel>
  <TabPanel>Documents...</TabPanel>
  <TabPanel>Bilan + Export PDF...</TabPanel>
</Tabs>
```

### Étape 5: Export PDF avec react-pdf

```tsx
import { PDFDownloadLink, Document, Page } from '@react-pdf/renderer'

<PDFDownloadLink
  document={<BilanPDF property={property} scenario={scenario} />}
  fileName={`bilan-${property.name}.pdf`}
>
  Télécharger bilan PDF
</PDFDownloadLink>
```

---

## 📊 Ordre de priorité

### Phase 1 (Critique):
1. ✅ Transférer documents scénario → projet
2. ✅ Afficher toutes données scénario dans projet
3. ✅ Onglet Revenus avec comparaison prévu/réel

### Phase 2 (Important):
4. ✅ Filtres avancés sur transactions
5. ✅ Onglet Bilan complet

### Phase 3 (Amélioration):
6. ✅ Export PDF bilan professionnel
7. ✅ Graphiques avancés
8. ✅ Export CSV transactions

---

## 🎯 Résultat attendu

Après implémentation, un investisseur pourra:

1. **Ouvrir un projet** et voir immédiatement:
   - Toutes les infos du scénario d'origine
   - Comparaison prévu vs réel (budget, revenus, ROI)
   - Timeline complète du projet

2. **Analyser les revenus**:
   - Voir si les revenus locatifs correspondent aux projections
   - Identifier les écarts mois par mois
   - Projeter les revenus futurs ajustés

3. **Préparer la revente**:
   - Générer un bilan PDF professionnel
   - Montrer l'historique complet d'investissement
   - Prouver le ROI réel vs projeté
   - Fournir tous les documents aux acheteurs potentiels

---

**Date**: 2025-01-24
**Version**: 1.0
**Status**: Spécification approuvée
