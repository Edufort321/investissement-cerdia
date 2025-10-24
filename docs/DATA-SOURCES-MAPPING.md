# Mapping des Sources de Données - Vue Projet

Ce document mappe toutes les données réelles qui doivent être affichées dans la vue Projet, et indique d'où elles viennent (quel module/vue SQL).

---

## 🎯 Objectif

Au lieu de recalculer les données réelles, **réutiliser** les calculs existants des modules:
- Rapports Fiscaux
- Performance ROI
- Sync Revenus
- Trésorerie
- Gestion Projet
- Budgétisation

---

## 📊 Sources de données identifiées

### 1. **Performance ROI** (`property_performance` view)

**Fichier SQL**: `13-add-roi-performance-tracking.sql`
**Composant**: `PerformanceTracker.tsx`

**Données calculées**:
```sql
✅ total_revenue       -- Somme des dividendes (type='dividende')
✅ total_expenses      -- Somme des paiements et dépenses
✅ actual_roi          -- ROI réel (revenus / coût total * 100)
✅ annualized_roi      -- ROI annualisé sur 12 mois
✅ roi_variance        -- Écart entre ROI réel et attendu (%)
✅ months_since_reservation -- Nombre de mois depuis début
✅ performance_status  -- Excellent / Good / Warning / Critical / Pending
✅ performance_message -- Message descriptif du statut
```

**Utilisation dans Projet**:
- Onglet "Résumé": Afficher ROI actuel vs projeté
- Onglet "Revenus": Montrer revenus réels accumulés
- Onglet "Bilan": ROI pour calcul de plus-value

---

### 2. **Rapports Fiscaux** (`TaxReports.tsx`)

**À explorer**: Types de rapports disponibles

**Données potentielles**:
- Revenus imposables par année
- Déductions fiscales
- Taxes payées
- Documents fiscaux liés au projet

**Utilisation dans Projet**:
- Onglet "Documents": Rapports fiscaux générés
- Onglet "Bilan": Impact fiscal sur rentabilité nette

---

### 3. **Sync Revenus** (`BookingRevenueSync.tsx`)

**Fonction**: Synchroniser les revenus de réservations (Airbnb, etc.)

**Données potentielles**:
- Revenus locatifs par mois
- Taux d'occupation réel
- Revenus moyens par nuit
- Comparaison avec projections

**Utilisation dans Projet**:
- Onglet "Revenus": Détail des revenus locatifs réels
- Comparaison loyer mensuel projeté vs réel
- Taux occupation réel vs projeté (85%)

---

### 4. **Trésorerie** (`TreasuryDashboard.tsx` + `TreasuryAlerts.tsx`)

**Fonction**: Gestion de trésorerie et alertes

**Données potentielles**:
- Cash flow mensuel
- Alertes de paiements en retard
- Solde disponible
- Projections de trésorerie

**Utilisation dans Projet**:
- Onglet "Paiements": Alertes de retard
- Onglet "Bilan": Situation de trésorerie actuelle

---

### 5. **Gestion Projet** (`ProgressReporting.tsx`?)

**Fonction**: Suivi de l'avancement du projet

**Données potentielles**:
- Timeline du projet
- Étapes complétées vs restantes
- Dates clés (réservation, livraison, occupation)
- Documents de suivi

**Utilisation dans Projet**:
- Onglet "Résumé": Timeline visuelle
- Onglet "Bilan": Historique des événements

---

### 6. **Budgétisation** (`BudgetDashboard.tsx` + composants)

**Fonction**: Budgets et suivi des dépenses

**Données calculées**:
- Budget prévu par catégorie
- Dépenses réelles par catégorie
- Écarts budget vs réel
- Alertes de dépassement

**Utilisation dans Projet**:
- Onglet "Résumé": Bilan budgétaire (déjà implémenté partiellement)
- Onglet "Transactions": Catégorisation des dépenses
- Onglet "Bilan": Synthèse budgétaire finale

---

## 🔄 Flux de données pour la Vue Projet

### Scénario → Projet (Conversion)

**Données transférées**:
```typescript
{
  // Identifiants
  converted_property_id: UUID,
  converted_at: timestamp,

  // Données financières
  purchase_price: number,
  initial_fees: number,
  transaction_fees: {...},
  total_cost: number,

  // Projections (à sauvegarder pour comparaison)
  projected_roi_conservative: {...},
  projected_roi_moderate: {...},
  projected_roi_optimistic: {...},

  // Données promoteur
  monthly_rent: number,
  rent_type: 'monthly' | 'nightly',
  occupation_rate: number,
  project_duration: number,

  // Termes de paiement
  payment_terms: [...],
  deduct_initial_from_first_term: boolean,

  // Media
  main_photo_url: string,
  documents: [...] // À implémenter
}
```

### Projet → Affichage

**Sources de données réelles**:
```typescript
// ROI et Performance
const performance = await supabase
  .from('property_performance')
  .select('*')
  .eq('property_id', propertyId)
  .single()

// Transactions filtrées
const transactions = await supabase
  .from('transactions')
  .select('*')
  .eq('property_id', propertyId)
  .gte('date', startDate) // Filtre par période
  .lte('date', endDate)

// Payment Schedules
const payments = await supabase
  .from('payment_schedules')
  .select('*')
  .eq('property_id', propertyId)

// Occupation (si applicable)
const occupation = await supabase
  .from('occupation_stats_view') // Si existe
  .eq('property_id', propertyId)

// Budget
const budget = await supabase
  .from('budget_tracking_view') // Si existe
  .eq('property_id', propertyId)
```

---

## 📋 Plan d'implémentation

### Phase 1: Exploration (EN COURS)
- [x] Identifier property_performance
- [ ] Explorer TaxReports
- [ ] Explorer BookingRevenueSync
- [ ] Explorer TreasuryDashboard
- [ ] Explorer BudgetDashboard
- [ ] Lister toutes les vues SQL disponibles

### Phase 2: Intégration données
- [ ] Créer hook `useProjectData(propertyId)`
- [ ] Agréger toutes les sources de données
- [ ] Ajouter filtres par période
- [ ] Sauvegarder projections du scénario

### Phase 3: Interface UI
- [ ] Créer composant avec onglets
- [ ] Onglet Résumé avec toutes données
- [ ] Onglet Revenus avec comparaison
- [ ] Onglet Transactions avec filtres
- [ ] Onglet Documents
- [ ] Onglet Bilan

### Phase 4: Export PDF
- [ ] Installer react-pdf
- [ ] Template PDF professionnel
- [ ] Inclure toutes les données
- [ ] Graphiques intégrés

---

**Next**: Explorer les autres composants pour compléter le mapping

**Date**: 2025-01-24
**Status**: En cours
