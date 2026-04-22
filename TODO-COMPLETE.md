# 📋 CERDIA Investissement — TODO & État du Système
**Dernière mise à jour:** 2026-04-22

---

## 🗺️ SOURCE UNIQUE DE VÉRITÉ

```
TABLE transactions
  ├─→ Dashboard KPIs          (JS: totalInvestisseurs, compteCurrentCalcule)
  ├─→ NAV (SQL)               (calculate_realistic_nav_v2)
  ├─→ Bilan Financier         (PropertyFinancialSummary — par propriété)
  ├─→ Performance ROI         (PropertyPerformanceAnalysis — par propriété)
  ├─→ Trésorerie              (cash_balance, flux entrants/sortants)
  └─→ Rapports fiscaux        (foreign_tax_paid, source_country)

TABLE property_valuations
  └─→ NAV (SQL)               (current_property_values → appréciation composée)

TABLE investor_investments
  └─→ Parts totales           (total_shares → nav_per_share)

TABLE payment_schedules
  └─→ Dashboard               (upcoming payments, flags 🔴🟡🟢)
  └─→ ProjetTab               (progression paiement par propriété)
```

---

## ✅ COMPLÉTÉ

### Infrastructure & Base
- [x] Supabase Auth + RLS multi-niveaux (admin/investisseur)
- [x] InvestmentContext — données partagées entre tous les composants
- [x] ExchangeRateContext — taux USD/CAD Banque du Canada en temps réel
- [x] Système bilingue FR/EN (LanguageContext)

### Propriétés & Projets
- [x] CRUD complet propriétés (ProjetTab)
- [x] Payment schedules (calendrier paiements échelonnés)
- [x] Champs vente: `sale_date`, `sale_price`, `sale_currency`, `buyer_name` (mig. 106)
- [x] `origin_scenario_id` dans `properties` → lien vers scénario Évaluateur (mig. 107)
- [x] Statut `en_construction` inclus dans NAV (mig. 105 + 107)

### NAV & Évaluations
- [x] `property_valuations.currency` (USD/CAD) — évaluations multi-devise (mig. 107)
- [x] `get_property_appreciation_rate()` — taux dynamique: expected_roi → scénario → 8% (mig. 107)
- [x] `calculate_property_value_with_appreciation()` — fallback sur total_cost+reservation_date (mig. 107)
- [x] `calculate_realistic_nav_v2()` — conversion USD/CAD par devise (mig. 107)
- [x] `current_property_values` — toutes phases actives (reservation, en_construction, actif…) (mig. 107)
- [x] PropertyValuationManager — sélecteur USD/CAD + conversion CAD temps réel
- [x] NAVDashboard — taux de change live (ExchangeRateContext), badges statuts complets

### Bilan & Performance
- [x] PropertyFinancialSummary — bilan par propriété (revenus, dépenses, ROI)
- [x] PropertyPerformanceAnalysis — ROI détaillé + projections par année
- [x] Workflow complet Achat → Location → Vente dans ProjetTab

---

## 🔴 CRITIQUE — Bloquant pour comptabilité juste

### C1. Incohérence Dashboard KPIs vs NAV
**Problème:** Le Dashboard calcule le compte courant en JS avec une formule différente du NAV SQL.

Dashboard (JS):
```
compteCurrentCalcule = investissements - immobilier_CAD - dépenses[paiement|depense sans property_id]
```
NAV (SQL):
```
cash_balance = investissements - property_purchases - capex - maintenance - admin + loyers
```
Ces deux formules donnent des résultats différents pour le même portefeuille.

**Fix requis:** Aligner les deux calculs OU afficher le `cash_balance` du NAV directement sur le Dashboard (source unique).

---

### C2. Passifs absents du NAV
**Problème:** `total_liabilities = 0` hardcodé dans `calculate_realistic_nav_v2`.  
Si CERDIA a des dettes ou emprunts, le NAV est **surévalué**.

**Questions à répondre:**
- [ ] Y a-t-il des hypothèques sur les propriétés?
- [ ] Y a-t-il des prêts opérationnels?
- [ ] Les fournisseurs non payés sont-ils trackés?

**Fix requis:** Créer table `liabilities` (ou types de transactions `hypotheque`, `interet`) et les inclure dans `total_liabilities` du NAV.

---

### C3. Parts potentiellement doublées (trigger)
**Problème documenté** (TODO-NAV-PROGRESSION): Le trigger `auto_create_investor_shares_from_transactions` peut créer des doublons dans `investor_investments` si déclenché plusieurs fois.

**Symptôme:** `total_shares` affiché trop élevé → NAV par part trop bas.

**Vérification Supabase:**
```sql
SELECT investor_id, COUNT(*), SUM(number_of_shares)
FROM investor_investments
GROUP BY investor_id;
-- Comparer avec les montants réels investis
```

**Fix si confirmé:** Migrations 83 + 84 (cleanup doublons) — vérifier si déjà appliquées.

---

### C4. Transactions paiement programmé non liées
**Problème:** Quand un paiement `payment_schedule` est marqué "payé", une transaction est créée. Mais le lien `transactions.payment_schedule_id` n'est pas toujours rempli.

**Impact:** Le calcul "montant payé" dans ProjetTab peut différer du compte courant.

**Fix requis:** S'assurer que `markPaymentAsPaid()` dans InvestmentContext crée la transaction avec `payment_schedule_id` rempli ET `property_id` rempli.

---

## 🟡 IMPORTANT — Données manquantes

### D1. Évaluations initiales à créer manuellement
**État actuel:** Les propriétés en `reservation`/`en_construction` utilisent `total_cost + reservation_date` comme fallback automatique dans le NAV. C'est correct mais approximatif.

**À faire:** Pour chaque propriété existante, créer une évaluation initiale (Admin → Évaluations → Nouvelle évaluation → Type: Initiale) avec:
- Date = date de réservation
- Coût = prix d'achat en USD
- Devise = USD
- Le NAV appliquera le taux du scénario lié automatiquement

---

### D2. Catégories dépenses incomplètes pour comptabilité IFRS
**Problème:** Les transactions utilisent des types génériques (`depense`, `maintenance`, `admin`). Pour des rapports fiscaux précis, il faut distinguer:

| Catégorie OPEX | Catégorie CAPEX |
|----------------|-----------------|
| Frais de gestion | Rénovation majeure |
| Assurance propriété | Équipements |
| Taxes foncières | Améliorations |
| Frais de condo | Ameublement |
| Utilités | Acquisition |

**Fix requis:** 
- Ajouter colonne `fiscal_category` (enum) dans `transactions`
- Dropdown dans formulaire transaction avec ces catégories
- Rapport OPEX vs CAPEX par propriété

---

### D3. Revenus locatifs non synchronisés
**Problème:** Les revenus de `bookings_calendar` (calendrier réservations) ne créent pas automatiquement de transactions `loyer`.

**Impact:** Le NAV et le Bilan Financier n'incluent pas les revenus réels si non saisis manuellement.

**Fix requis:** Compléter le module "Sync Revenus" (Admin → sync_revenues) pour auto-créer transactions depuis bookings confirmés.

---

### D4. Scénario approuvé → Propriété: lien non automatisé
**Problème:** Quand un scénario passe de `approved` à `purchased`, il faut manuellement:
1. Créer la propriété dans ProjetTab
2. Mettre à jour `scenarios.converted_property_id`
3. L'`origin_scenario_id` dans properties est maintenant en DB mais non rempli automatiquement

**Fix requis:** Dans ScenariosTab, bouton "Convertir en propriété" qui:
```
INSERT INTO properties (..., origin_scenario_id = scenario.id)
UPDATE scenarios SET converted_property_id = new_property_id, status = 'purchased'
```

---

## 🟢 AMÉLIORATIONS — Non bloquant

### A1. Export PDF rapports financiers
- Rapport annuel par propriété (revenus, dépenses, ROI)
- Rapport T1135 (revenus étrangers)
- Rapport T2209 (crédits d'impôt étrangers)
- Librairie suggérée: `@react-pdf/renderer`

### A2. Snapshots NAV automatiques
**État actuel:** Snapshots NAV créés manuellement (bouton dans Admin → NAV).  
**Besoin:** Cron hebdomadaire via Supabase Edge Functions ou pg_cron.

```sql
-- pg_cron (si disponible sur Supabase Pro):
SELECT cron.schedule('nav-weekly-snapshot', '0 8 * * 1', 
  'SELECT snapshot_nav(CURRENT_DATE)');
```

### A3. Notifications email
- Paiement programmé à venir (7 jours avant)
- Évaluation biennale due (30 jours avant)
- Dividendes disponibles
- Via Supabase Edge Functions + Resend/SendGrid

### A4. Pagination transactions
**Problème:** InvestmentContext charge TOUTES les transactions au démarrage.  
**Fix:** Ajouter `.limit(100).order('date', {ascending: false})` avec pagination infinie.

### A5. Dashboard: graphiques temps réel
- Évolution NAV (LineChart)
- Répartition dépenses par catégorie (PieChart)
- Cash flow mensuel (BarChart)
- Librairie suggérée: `recharts` (déjà dans l'écosystème Next.js)

---

## 📊 MIGRATIONS À EXÉCUTER DANS L'ORDRE

```
Déjà appliquées (assumées):  1 → 106
À appliquer maintenant:      107  (multi-devise + construction NAV)
```

**Vérifier si appliquées:**
```sql
-- Dans Supabase SQL Editor:
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'property_valuations' AND column_name = 'currency';
-- Si 0 résultat → 107 pas encore appliquée
```

---

## 🔗 MATRICE D'INTERCONNEXION (État actuel)

| Donnée | Dashboard | Projet | NAV | Bilan | Trésorerie | Fiscal |
|--------|-----------|--------|-----|-------|------------|--------|
| Investissements (transactions) | ✅ JS | ✅ JS | ✅ SQL | ✅ | ✅ | ✅ |
| Paiements propriétés | ✅ JS | ✅ JS | ✅ SQL | ✅ | ⚠️ partiel | ❌ |
| Valeur propriétés | ❌ non affiché | ⚠️ partiel | ✅ SQL | ✅ | ❌ | ❌ |
| Revenus locatifs | ❌ | ✅ | ✅ SQL | ✅ | ⚠️ | ✅ |
| CAPEX | ⚠️ | ✅ | ✅ SQL | ✅ | ⚠️ | ❌ catégories |
| Parts / NAV par part | ⚠️ via share_settings | ❌ | ✅ | ❌ | ❌ | ❌ |
| Taux change USD/CAD | ✅ Context | ✅ Context | ✅ SQL | ✅ | ⚠️ | ❌ |
| Passifs / Dettes | ❌ | ❌ | ❌ hardcodé 0 | ❌ | ❌ | ❌ |

**Légende:** ✅ Interconnecté | ⚠️ Partiel/Approximatif | ❌ Manquant

---

## 🎯 PROCHAINES ÉTAPES RECOMMANDÉES (ordre prioritaire)

1. **Exécuter migration 107** dans Supabase (multi-devise + construction NAV)
2. **Créer évaluations initiales** pour chaque propriété (Admin → Évaluations)
3. **Répondre aux questions passifs** (C2) — dettes/hypothèques?
4. **Vérifier doublons parts** (C3) — requête SQL ci-dessus
5. **Aligner formule Dashboard** avec `cash_balance` du NAV (C1)
6. **Ajouter fiscal_category** aux transactions (D2)
7. **Automatiser sync revenus** booking → transactions (D3)
8. **Bouton "Convertir scénario → propriété"** dans ScenariosTab (D4)
