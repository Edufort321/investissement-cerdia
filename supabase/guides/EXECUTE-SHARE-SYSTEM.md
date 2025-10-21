# 📊 Migration - Système de Parts d'Investisseurs

## ⚠️ IMPORTANT
Cette migration introduit un système de **parts (actions)** pour les investisseurs, similaire au fonctionnement de parts d'actions en bourse.

## 🎯 Concept

### Avant:
- `total_invested` statique dans table `investors`
- Pas d'historique détaillé
- Pas de notion de valeur fluctuante

### Maintenant:
- Historique complet des investissements dans `investor_investments`
- Système de **parts fixes** avec **valeur variable**
- Calcul automatique de la performance individuelle

### Exemple:
```
2025-01-15: Investis 100,000$ à 1.00$/part → Achète 100,000 parts
2025-06-20: Investis  50,000$ à 1.10$/part → Achète  45,454 parts
Total: 145,454 parts (FIXE pour toujours)

2027: Valeur part = 2.15$/part
→ Valeur portefeuille = 145,454 × 2.15$ = 312,726$
→ Gain = 312,726$ - 150,000$ = +162,726$ (+108.5%)
```

## 📥 Exécution des Migrations

### Étape 1: Connectez-vous à Supabase Dashboard
```
https://supabase.com/dashboard
→ Votre projet
→ SQL Editor
```

### Étape 2: Exécutez les scripts dans l'ordre

#### Migration 18: investor_investments
```sql
-- Copier/coller le contenu de:
-- supabase/18-create-investor-investments.sql
```

✅ Crée:
- Table `investor_investments` (historique achats de parts)
- Vue `investor_summary` (résumé par investisseur)
- Index pour performance
- RLS activé

#### Migration 19: company_settings
```sql
-- Copier/coller le contenu de:
-- supabase/19-create-company-settings.sql
```

✅ Crée:
- Table `company_settings` (paramètres globaux)
- Fonctions helpers `get_setting()` et `update_setting()`
- Vue `share_settings` (accès rapide valeurs parts)
- Valeurs par défaut (valeur nominale = 1.00$ CAD)

### Étape 3: Vérification

```sql
-- Vérifier que les tables existent
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('investor_investments', 'company_settings');

-- Vérifier les paramètres par défaut
SELECT * FROM public.share_settings;

-- Devrait afficher:
-- nominal_share_value: 1.00
-- estimated_share_value: 1.00
```

## 📊 Structure des Données

### `investor_investments`
| Colonne                     | Type          | Description                           |
|-----------------------------|---------------|---------------------------------------|
| id                          | UUID          | Identifiant unique                    |
| investor_id                 | UUID          | Référence à investors(id)             |
| investment_date             | DATE          | Date de l'investissement              |
| amount_invested             | DECIMAL(15,2) | Montant investi en devise             |
| share_price_at_purchase     | DECIMAL(10,4) | Prix/part au moment achat (FIXE)      |
| number_of_shares            | DECIMAL(15,4) | Nombre de parts achetées (FIXE)       |
| currency                    | VARCHAR(3)    | Devise (CAD, USD, etc.)               |
| payment_method              | VARCHAR(50)   | Méthode de paiement                   |
| reference_number            | VARCHAR(100)  | Numéro de référence                   |
| notes                       | TEXT          | Notes additionnelles                  |

**Formule:**
```
number_of_shares = amount_invested ÷ share_price_at_purchase
```

### `company_settings`
| Clé                          | Valeur  | Description                                    |
|------------------------------|---------|------------------------------------------------|
| nominal_share_value          | 1.00    | Prix vente actuel d'une part (CAD)             |
| estimated_share_value        | 1.00    | Valeur estimée calculée selon ROI              |
| company_name                 | CERDIA  | Nom de l'entreprise                            |
| share_calculation_method     | ...     | Méthode calcul (weighted_roi, etc.)            |
| last_share_value_calculation | ...     | Date dernière mise à jour valeur estimée       |

## 🔄 Migration des Données Existantes

Si vous avez déjà des investisseurs avec `total_invested`, vous devrez créer des entrées d'investissement initiales:

```sql
-- Exemple: Créer un investissement initial pour chaque investisseur
INSERT INTO public.investor_investments (
  investor_id,
  investment_date,
  amount_invested,
  share_price_at_purchase,
  number_of_shares,
  currency,
  notes
)
SELECT
  id AS investor_id,
  created_at::DATE AS investment_date,
  total_invested AS amount_invested,
  1.00 AS share_price_at_purchase,
  total_invested / 1.00 AS number_of_shares,
  'CAD' AS currency,
  'Migration automatique depuis investisseurs existants' AS notes
FROM public.investors
WHERE total_invested > 0;
```

⚠️ **Attention:** Adaptez cette requête selon vos données!

## 📈 Prochaines Étapes (Frontend)

1. ✅ Migrations SQL exécutées
2. 🔄 Mettre à jour `InvestmentContext` avec nouvelles fonctions
3. 🔄 Modifier UI investisseurs (header avec valeurs parts)
4. 🔄 Ajouter formulaire "Nouvel investissement"
5. 🔄 Afficher historique investissements par investisseur
6. 🔄 Créer fonction génération PDF rapport trimestriel
7. 🔄 Implémenter calcul automatique valeur estimée selon ROI

## 🐛 Rollback (si besoin)

```sql
-- ATTENTION: Ceci supprime toutes les données!

DROP VIEW IF EXISTS public.share_settings;
DROP FUNCTION IF EXISTS update_setting(VARCHAR, TEXT);
DROP FUNCTION IF EXISTS get_setting(VARCHAR);
DROP VIEW IF EXISTS public.investor_summary;
DROP TABLE IF EXISTS public.investor_investments CASCADE;
DROP TABLE IF EXISTS public.company_settings CASCADE;
```

## 📞 Support

Pour toute question, consultez la documentation Supabase:
- Tables: https://supabase.com/docs/guides/database/tables
- RLS: https://supabase.com/docs/guides/auth/row-level-security
- Views: https://supabase.com/docs/guides/database/views

---

**Dernière mise à jour:** 2025-10-20
**Version:** 1.0.0
