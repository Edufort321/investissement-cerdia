# 📊 Guide des Systèmes de Paiements Échelonnés et Compte Courant

## ✅ Nouveautés Implémentées

### 1. Système de Paiements Échelonnés

#### Fonctionnalités:
- ✅ **Acompte de réservation** qui se déduit automatiquement du total
- ✅ **Montant réel payé en CAD** avec taux de change enregistré
- ✅ **Total payé en CAD** pour voir le coût réel en économie canadienne
- ✅ **3 modes de paiement**:
  - Paiement unique
  - Termes fixes (ex: 50% / 20% / 20% / 10%)
  - Mensuel dégressif
- ✅ **Alertes automatiques** X jours avant l'échéance

#### Nouvelles Colonnes dans `properties`:
```sql
- currency                 -- USD ou CAD
- payment_schedule_type    -- one_time, fixed_terms, monthly_degressive
- reservation_deposit      -- Acompte de réservation
- reservation_deposit_cad  -- Acompte en CAD
- total_paid_cad          -- Total payé en CAD (économie canadienne)
- payment_start_date      -- Date début paiements
- payment_end_date        -- Date fin paiements
```

#### Nouvelle Table `payment_schedules`:
```sql
- property_id             -- Lien vers propriété
- term_number            -- Numéro du terme (1, 2, 3...)
- term_label             -- Label (ex: "Acompte", "Versement final")
- percentage             -- % du total (pour termes fixes)
- amount                 -- Montant à payer
- currency               -- USD ou CAD
- amount_paid_cad        -- Montant réellement payé en CAD
- exchange_rate_used     -- Taux utilisé lors du paiement
- due_date              -- Date d'échéance
- paid_date             -- Date de paiement effectif
- status                -- pending, paid, overdue, cancelled
- alert_days_before     -- Jours avant pour alerter
- alert_sent            -- Alerte envoyée?
```

---

### 2. Système de Compte Courant 2025

#### Fonctionnalités:
- ✅ **Auto-catégorisation intelligente** des transactions
- ✅ **3 types d'opérations**:
  - **Revenus** (loyers, dividendes)
  - **Coûts d'opération** (gestion, utilities, assurances, taxes, maintenance)
  - **Dépenses de projet** (rénovations, ameublement)
- ✅ **Association automatique** aux bons projets
- ✅ **Regroupement mensuel** automatique
- ✅ **Vue par projet** pour suivi détaillé

#### Nouvelles Colonnes dans `transactions`:
```sql
- operation_type        -- cout_operation, revenu, depense_projet
- project_category      -- management, utilities, insurance, renovation, etc.
- auto_categorized      -- TRUE si catégorisé automatiquement
```

#### Nouvelle Table `current_accounts`:
```sql
- year, month                    -- Période
- total_revenues                 -- Total revenus
- total_operational_costs        -- Total coûts opération
- total_project_expenses         -- Total dépenses projet

-- Détails revenus:
- rental_income                  -- Revenus locatifs
- other_income                   -- Autres revenus

-- Détails coûts opération:
- management_fees                -- Frais gestion
- utilities                      -- Services publics
- insurance                      -- Assurances
- maintenance                    -- Maintenance
- property_taxes                 -- Taxes foncières

-- Détails dépenses projet:
- renovation_costs               -- Rénovations
- furnishing_costs               -- Ameublement
- other_project_costs            -- Autres dépenses

- net_income                     -- Balance (calculé auto)
```

---

## 🚀 Installation dans Supabase

### Étape 1: Exécuter les scripts SQL

1. Va dans **Supabase Dashboard** > **SQL Editor**
2. Clique **New Query**
3. Exécute d'abord `supabase/9-add-payment-schedules.sql`
4. Puis exécute `supabase/10-add-compte-courant.sql`

---

## 📖 Guide d'Utilisation

### A. Créer un Calendrier de Paiements

#### Exemple 1: Termes Fixes (50% / 20% / 20% / 10%)

```sql
SELECT * FROM generate_payment_schedule(
  'uuid-de-la-propriete',
  'fixed_terms',
  150000.00,
  'USD',
  '2025-01-01',
  '[
    {"label": "Acompte", "percentage": 50, "days_offset": 0},
    {"label": "2e versement", "percentage": 20, "days_offset": 30},
    {"label": "3e versement", "percentage": 20, "days_offset": 60},
    {"label": "Versement final", "percentage": 10, "days_offset": 90}
  ]'::JSONB
);
```

#### Exemple 2: Paiement Unique

```sql
SELECT * FROM generate_payment_schedule(
  'uuid-de-la-propriete',
  'one_time',
  150000.00,
  'USD',
  '2025-03-01',
  NULL
);
```

### B. Voir les Paiements à Venir (Alertes)

```sql
-- Tous les paiements qui nécessitent une alerte ou sont en retard
SELECT * FROM upcoming_payments
WHERE alert_status IN ('alert', 'overdue');

-- Paiements des 30 prochains jours
SELECT * FROM upcoming_payments
WHERE days_until_due <= 30 AND days_until_due >= 0;
```

### C. Résumé des Paiements d'une Propriété

```sql
SELECT * FROM get_property_payment_summary('uuid-de-la-propriete');
```

Retourne:
- Total à payer
- Total payé
- Total en attente
- Total en retard
- Nombre de termes total
- Nombre de termes payés
- Date du prochain paiement
- Montant du prochain paiement

### D. Marquer un Paiement comme Payé

```sql
UPDATE payment_schedules
SET
  status = 'paid',
  paid_date = '2025-01-15',
  amount_paid_cad = 101250.00,      -- Montant réel payé en CAD
  exchange_rate_used = 1.35          -- Taux de change USD→CAD
WHERE id = 'uuid-du-paiement';
```

### E. Catégoriser une Transaction Manuellement

```sql
UPDATE transactions
SET
  operation_type = 'cout_operation',
  project_category = 'utilities',
  auto_categorized = FALSE           -- FALSE car manuel
WHERE id = 'uuid-de-la-transaction';
```

### F. Voir le Compte Courant d'un Mois

```sql
-- Résumé détaillé
SELECT * FROM get_current_account_summary(2025, 1);

-- Vue globale
SELECT * FROM current_accounts
WHERE year = 2025 AND month = 1;
```

### G. Voir le Compte Courant par Projet

```sql
SELECT * FROM current_account_by_project
WHERE year = 2025 AND month = 1;
```

---

## 🎯 Auto-Catégorisation - Mots-Clés

Le système reconnaît automatiquement ces mots dans les descriptions:

### Revenus:
- loyer, revenu, rental, dividende

### Coûts d'Opération:
- **Gestion**: gestion, management
- **Utilities**: électricité, electricity, eau, water
- **Assurances**: assurance, insurance
- **Taxes**: taxe, tax
- **Maintenance**: maintenance, entretien

### Dépenses de Projet:
- **Rénovations**: rénovation, renovation, amélioration, construction
- **Ameublement**: meuble, furniture
- **Autres**: amélioration, construction

---

## 📊 Exemples de Requêtes Utiles

### 1. Tous les Paiements en Retard

```sql
SELECT
  ps.*,
  p.name as property_name,
  p.location
FROM payment_schedules ps
JOIN properties p ON p.id = ps.property_id
WHERE ps.status = 'overdue'
ORDER BY ps.due_date;
```

### 2. Total Payé en CAD par Propriété

```sql
SELECT
  p.name,
  p.location,
  p.currency as property_currency,
  p.total_cost,
  p.reservation_deposit,
  p.total_paid_cad,
  COALESCE(SUM(ps.amount_paid_cad), 0) as total_terms_paid_cad
FROM properties p
LEFT JOIN payment_schedules ps ON ps.property_id = p.id AND ps.status = 'paid'
GROUP BY p.id, p.name, p.location, p.currency, p.total_cost, p.reservation_deposit, p.total_paid_cad;
```

### 3. Performance Mensuelle (Revenus vs Dépenses)

```sql
SELECT
  year,
  month,
  total_revenues,
  total_operational_costs,
  total_project_expenses,
  net_income,
  ROUND((net_income / NULLIF(total_revenues, 0)) * 100, 2) as profit_margin_pct
FROM current_accounts
ORDER BY year DESC, month DESC;
```

### 4. Transactions Non Catégorisées

```sql
SELECT * FROM transactions
WHERE operation_type IS NULL
ORDER BY date DESC;
```

---

## ⚠️ Important

1. **Taux de Change**: Le système enregistre le taux utilisé lors du paiement. Mettez-le à jour manuellement si nécessaire.

2. **Mise à Jour Automatique**: Les comptes courants se mettent à jour automatiquement quand vous ajoutez/modifiez/supprimez une transaction.

3. **Acompte de Réservation**: L'acompte se déduit automatiquement du total lors du calcul des termes.

4. **Catégorisation**: Les transactions sont auto-catégorisées à l'insertion. Vous pouvez toujours modifier manuellement.

---

## 🔄 Prochaines Étapes

1. ✅ Scripts SQL créés et testés
2. ⏳ Exécuter dans Supabase
3. ⏳ Créer l'interface UI dans ProjetTab
4. ⏳ Créer l'interface UI dans Compte Courant
5. ⏳ Implémenter les alertes visuelles
6. ⏳ Créer les rapports imprimables

---

## 📞 Support

Les fichiers SQL sont dans:
- `supabase/9-add-payment-schedules.sql`
- `supabase/10-add-compte-courant.sql`

Toutes les fonctions, triggers et vues sont documentés dans les scripts SQL.
