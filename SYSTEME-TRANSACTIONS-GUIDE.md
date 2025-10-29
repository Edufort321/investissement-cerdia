# 🎯 GUIDE COMPLET - SYSTÈME TRANSACTIONS CERDIA

## 📋 Vue d'ensemble

Le système de transactions est le **CŒUR** de l'application CERDIA. Toutes les données financières sont calculées depuis cette source unique de vérité.

```
┌─────────────────────────────────────────────────────────┐
│            FORMULAIRE TRANSACTION                        │
│         (Source unique de vérité)                        │
└──────────────────┬──────────────────────────────────────┘
                   │
    ┌──────────────┼──────────────┐
    │              │              │
    ▼              ▼              ▼
┌─────────┐  ┌──────────┐  ┌──────────────┐
│  PARTS  │  │  COMPTE  │  │    CAPEX     │
│ INVESTI │  │ COURANT  │  │   RÉSERVE    │
│ SSEURS  │  │          │  │              │
└────┬────┘  └────┬─────┘  └──────┬───────┘
     │            │                │
     └────────────┼────────────────┘
                  │
                  ▼
          ┌───────────────┐
          │  DASHBOARDS   │
          │   NAV / ROI   │
          └───────────────┘
```

---

## 🏗️ ARCHITECTURE DU FORMULAIRE

### SECTION 1: Type
**À quoi sert l'argent?**
- Investissement
- Paiement
- Dividende
- Dépense

### SECTION 2: Source de l'argent 💰
**D'où vient l'argent?**

| Source | Description | Affecte Compte Courant? |
|--------|-------------|-------------------------|
| 🏢 **Compte Courant** | L'entreprise paie avec ses liquidités | ✅ Oui (sortie) |
| 🏗️ **CAPEX** | Utilise la réserve CAPEX | ❌ Non |
| 👤 **Investisseur Direct** | L'investisseur paie de sa poche | ❌ Non |

**Logique automatique:**
- Si vous sélectionnez un investisseur → Source devient automatiquement "Investisseur Direct"
- Les boutons Compte Courant et CAPEX se désactivent

### SECTION 3: Catégorie
**Où va l'argent dans l'application?**

| Catégorie | Description | Visible dans |
|-----------|-------------|--------------|
| 🏠 **Projet** | Dépense liée à une propriété | Vue propriété + `v_property_cashflow` |
| 🏗️ **CAPEX** | Transfert vers réserve CAPEX | `v_capex_summary` |
| ⚙️ **Opération** | Coûts opérationnels | `v_operational_costs` + Compte courant |
| 🔧 **Maintenance** | Coûts de maintenance | `v_operational_costs` + Compte courant |
| 📋 **Administration** | Coûts administratifs | `v_operational_costs` + Compte courant |

### SECTION 4: Propriété (conditionnelle)
**Visible SEULEMENT si catégorie = "Projet"**
- Sélecteur de propriété
- Lie la transaction à une propriété spécifique

### SECTION 5: Investisseur (optionnel)
**Si sélectionné:**
- Force la source à "Investisseur Direct"
- Affiche la section suivante

### SECTION 6: Type paiement investisseur (conditionnelle)
**Visible SEULEMENT si investisseur sélectionné**

| Type | Description | Crée |
|------|-------------|------|
| 💵 **Achat de Parts** | L'investisseur investit | Parts dans `investor_investments` |
| 📝 **Dette à Rembourser** | L'entreprise doit rembourser | Dette dans `investor_debts` |

---

## 🔧 TRIGGERS AUTOMATIQUES

### 1. `validate_transaction()` - BEFORE INSERT/UPDATE
**Valide et corrige automatiquement:**
- Si `investor_id` présent → Force `payment_source = 'investisseur_direct'`
- Si `payment_source = 'capex'` → Force `affects_compte_courant = FALSE`
- Si `payment_source = 'compte_courant'` → Force `affects_compte_courant = TRUE`
- Si `category = 'capex'` → Vérifie que montant est négatif (sortie)

### 2. `auto_create_investor_shares_from_transactions()` - AFTER INSERT
**Crée automatiquement les parts:**
- Si `type = 'investissement'` ET `investor_id` présent
- Calcule nombre de parts = `amount / nominal_share_value`
- Insert dans `investor_investments`
- Vérifie doublons avant insertion

### 3. `auto_update_investor_shares_on_transaction_update()` - AFTER UPDATE
**Met à jour les parts:**
- Si transaction modifiée
- Update `investor_investments` correspondant
- Ou crée nouvelle entrée si besoin

### 4. `auto_delete_investor_shares_on_transaction_delete()` - BEFORE DELETE
**Supprime les parts:**
- Si transaction supprimée
- DELETE `investor_investments` lié

### 5. `sync_share_value_to_investors()` - AFTER UPDATE company_settings
**Synchronise valeur nominale:**
- Si `nominal_share_value` change
- Met à jour `investors.share_value` pour TOUS
- Recalcule `current_value = total_shares × new_value`

### 6. `auto_recalculate_after_investment_*()` - AFTER INSERT/UPDATE/DELETE
**Recalcule totaux investisseurs:**
- Après chaque modification dans `investor_investments`
- Appelle `recalculate_investor_totals(investor_id)`
- Met à jour `total_shares`, `total_invested`, `percentage_ownership`, `current_value`

---

## 📊 VUES SQL CALCULÉES TEMPS RÉEL

### 1. `v_capex_summary`
**CAPEX par année**
```sql
SELECT * FROM v_capex_summary WHERE year = 2025;
```
Colonnes:
- `year` - Année
- `capex_received` - CAPEX reçu (entrées)
- `capex_spent` - CAPEX dépensé (sorties)
- `capex_balance` - Balance nette
- `transaction_count` - Nombre de transactions

### 2. `v_compte_courant_monthly`
**Compte courant mensuel**
```sql
SELECT * FROM v_compte_courant_monthly WHERE year = 2025 AND month = 1;
```
Colonnes:
- `year`, `month`, `period` (YYYY-MM)
- `total_inflow` - Entrées totales
- `total_outflow` - Sorties totales
- `net_balance` - Balance nette
- `cout_operation`, `cout_maintenance`, `cout_admin`, `cout_projet` - Détails par catégorie

### 3. `v_compte_courant_yearly`
**Compte courant annuel (agrégation)**
```sql
SELECT * FROM v_compte_courant_yearly WHERE year = 2025;
```

### 4. `v_property_cashflow`
**Flux financiers par propriété**
```sql
SELECT * FROM v_property_cashflow WHERE property_name = 'Secret Garden';
```
Colonnes:
- `property_id`, `property_name`, `year`
- `total_invested` - Investissements initiaux
- `total_expenses` - Dépenses projet
- `total_revenue` - Revenus (loyers)
- `net_cashflow` - Balance nette

### 5. `v_cashflow_by_source`
**Flux par source de paiement**
```sql
SELECT * FROM v_cashflow_by_source WHERE payment_source = 'compte_courant';
```
Colonnes:
- `year`, `month`, `payment_source`
- `total_inflow`, `total_outflow`, `net_balance`

### 6. `v_operational_costs`
**Coûts opérationnels détaillés**
```sql
SELECT * FROM v_operational_costs WHERE category = 'maintenance';
```
Colonnes:
- `year`, `month`, `category`, `property_id`
- `total_cost`, `transaction_count`, `avg_cost`

---

## 🔍 FONCTIONS SQL UTILITAIRES

### 1. `get_financial_summary(year)`
**Résumé financier global**

```sql
-- Résumé 2025
SELECT * FROM get_financial_summary(2025);

-- Résumé toutes années
SELECT * FROM get_financial_summary(NULL);
```

Retourne:
| metric | value | category |
|--------|-------|----------|
| Total Investisseurs | 500,000.00 | investissement |
| Compte Courant Balance | 125,000.00 | compte_courant |
| CAPEX Balance | 50,000.00 | capex |
| Dépenses Projets | 180,000.00 | projet |
| Coûts Opération | 25,000.00 | operation |

### 2. `recalculate_investor_totals(investor_id)`
**Recalcule un investisseur**
```sql
SELECT recalculate_investor_totals('uuid-investor-id');
```

### 3. `recalculate_all_investors()`
**Recalcule TOUS les investisseurs**
```sql
SELECT * FROM recalculate_all_investors();
```
Retourne table avec:
- `investor_id`, `investor_name`
- `old_shares`, `new_shares`
- Utile pour voir les changements

### 4. `clean_duplicate_investments()`
**Nettoie les doublons**
```sql
SELECT * FROM clean_duplicate_investments();
```

### 5. `calculate_share_price()`
**Calcule prix par part (NAV)**
```sql
SELECT calculate_share_price();
```
Formule:
```
NAV = (Total Actifs - Total Passifs) / Total Parts

Actifs = Évaluations propriétés + Liquidités compte courant
Passifs = Dettes
Parts = SUM(investor_investments.number_of_shares)
```

---

## 🎯 FLUX DE DONNÉES COMPLETS

### Exemple 1: Investissement de 10,000$ par Chad

**Action utilisateur:**
1. Formulaire: Type = Investissement, Montant = 10,000$, Investisseur = Chad

**Ce qui se passe automatiquement:**
1. `validate_transaction()` → Force `payment_source = 'investisseur_direct'`
2. INSERT dans `transactions`
3. `auto_create_investor_shares_from_transactions()` → Crée parts dans `investor_investments`
   - Calcul: 10,000$ ÷ 1.00$ = 10,000 parts
4. `auto_recalculate_after_investment_insert()` → Recalcule totaux Chad
   - `total_shares` += 10,000
   - `total_invested` += 10,000$
   - `current_value` = total_shares × 1.00$
   - `percentage_ownership` = parts Chad / total parts global

**Visible dans:**
- Dashboard principal: Total Investisseurs +10,000$
- Profil Chad: Parts +10,000, Total investi +10,000$
- Vue `v_cashflow_by_source`: investisseur_direct +10,000$

### Exemple 2: Paiement 5,000$ depuis CAPEX pour projet

**Action utilisateur:**
1. Formulaire: Type = Paiement, Montant = -5,000$, Source = CAPEX, Catégorie = Projet, Propriété = Secret Garden

**Ce qui se passe automatiquement:**
1. `validate_transaction()` → Force `affects_compte_courant = FALSE`
2. INSERT dans `transactions`

**Visible dans:**
- Vue `v_capex_summary`: capex_spent +5,000$ (année courante)
- Vue `v_property_cashflow`: Secret Garden expenses +5,000$
- Vue `v_cashflow_by_source`: capex outflow +5,000$
- Compte courant: **PAS AFFECTÉ** ✅

### Exemple 3: Transfert 25,000$ vers réserve CAPEX

**Action utilisateur:**
1. Formulaire: Type = Dépense, Montant = -25,000$, Source = Compte Courant, Catégorie = CAPEX

**Ce qui se passe automatiquement:**
1. `validate_transaction()` → Vérifie montant négatif ✅
2. INSERT dans `transactions`

**Visible dans:**
- Vue `v_capex_summary`: capex_received +25,000$
- Vue `v_compte_courant_monthly`: outflow +25,000$
- Balance compte courant: -25,000$
- Balance CAPEX: +25,000$

### Exemple 4: Investisseur paie 3,000$ pour frais (dette)

**Action utilisateur:**
1. Formulaire: Type = Dépense, Montant = 3,000$, Investisseur = Chad, Type paiement = Dette à rembourser, Catégorie = Maintenance

**Ce qui se passe automatiquement:**
1. `validate_transaction()` → Force `payment_source = 'investisseur_direct'`
2. INSERT dans `transactions`
3. `create_investor_debt_from_transaction()` → Crée dette dans `investor_debts`
   - `amount = 3,000$`, `status = 'active'`

**Visible dans:**
- Table `investor_debts`: Nouvelle dette Chad 3,000$
- Vue `v_operational_costs`: maintenance +3,000$
- Profil Chad: Section "Dettes à rembourser"
- Compte courant: **PAS AFFECTÉ** ✅ (c'est Chad qui a payé)

---

## 🧪 TESTS RECOMMANDÉS

### Test 1: Création investissement
```sql
-- 1. Créer transaction via UI
-- 2. Vérifier parts créées
SELECT * FROM investor_investments WHERE investor_id = 'chad-uuid';

-- 3. Vérifier totaux recalculés
SELECT first_name, last_name, total_shares, total_invested, current_value
FROM investors WHERE id = 'chad-uuid';
```

### Test 2: Changement valeur nominale
```sql
-- 1. Changer à 1.50$
UPDATE company_settings
SET setting_value = '1.50'
WHERE setting_key = 'nominal_share_value';

-- 2. Vérifier TOUS les investisseurs ont été mis à jour
SELECT first_name, last_name, share_value, current_value, total_shares
FROM investors;

-- 3. Remettre à 1.00$
UPDATE company_settings
SET setting_value = '1.00'
WHERE setting_key = 'nominal_share_value';
```

### Test 3: CAPEX flows
```sql
-- 1. Créer transfert CAPEX via UI (Catégorie = CAPEX, Source = Compte Courant)
-- 2. Vérifier vue
SELECT * FROM v_capex_summary WHERE year = EXTRACT(YEAR FROM CURRENT_DATE);

-- 3. Créer dépense CAPEX via UI (Source = CAPEX, Catégorie = Projet)
-- 4. Vérifier balance
SELECT * FROM v_capex_summary WHERE year = EXTRACT(YEAR FROM CURRENT_DATE);
```

### Test 4: Compte courant
```sql
-- 1. Vérifier balance mensuelle
SELECT * FROM v_compte_courant_monthly WHERE year = 2025 ORDER BY month DESC;

-- 2. Vérifier qu'une transaction CAPEX n'affecte PAS le compte courant
-- Créer dépense avec Source = CAPEX
-- Vérifier que net_balance n'a pas bougé
SELECT * FROM v_compte_courant_monthly WHERE year = 2025 AND month = EXTRACT(MONTH FROM CURRENT_DATE);
```

### Test 5: Suppression transaction
```sql
-- 1. Noter les parts de Chad avant
SELECT total_shares FROM investors WHERE id = 'chad-uuid';

-- 2. Supprimer une transaction investissement de Chad via UI
-- 3. Vérifier parts supprimées
SELECT total_shares FROM investors WHERE id = 'chad-uuid';

-- 4. Vérifier investor_investments
SELECT COUNT(*) FROM investor_investments WHERE investor_id = 'chad-uuid';
```

---

## ⚠️ POINTS IMPORTANTS

### 1. Ne JAMAIS modifier directement:
- ❌ `investors.total_shares`
- ❌ `investors.total_invested`
- ❌ `investors.current_value`
- ❌ `investor_investments` (sauf via transaction)

**Pourquoi?** Ces valeurs sont calculées automatiquement. Modifications manuelles seront écrasées.

### 2. Toujours passer par le formulaire transaction
✅ Créer/Modifier/Supprimer via UI
✅ Les triggers font le reste

### 3. Tables obsolètes (ne plus utiliser):
- ⚠️ `capex_accounts` - Utiliser `v_capex_summary` à la place
- ⚠️ `current_accounts` - Utiliser `v_compte_courant_yearly` à la place
- ⚠️ `rnd_accounts` - Intégré dans système transactions

**Peuvent être supprimées après validation complète du nouveau système**

### 4. Performance
- Les vues sont calculées en temps réel = toujours à jour
- Index créés sur colonnes clés
- Utiliser `get_financial_summary()` pour dashboard plutôt que multiples requêtes

---

## 🚀 PROCHAINES ÉTAPES

### Phase 1: Validation ✅
1. Exécuter migrations SQL dans l'ordre
2. Tester formulaire transaction
3. Vérifier que toutes les vues retournent des données

### Phase 2: Dashboards (À faire)
1. Mettre à jour Dashboard principal pour utiliser vues
2. Créer dashboard CAPEX dédié (utilise `v_capex_summary`)
3. Créer dashboard Compte Courant (utilise `v_compte_courant_monthly`)
4. Améliorer dashboard NAV

### Phase 3: Nettoyage (Optionnel)
1. Supprimer tables obsolètes (92, 93)
2. Archiver anciennes migrations
3. Documentation finale

---

## 📞 SUPPORT

**En cas de problème:**

1. **Données incohérentes?**
   ```sql
   SELECT * FROM recalculate_all_investors();
   ```

2. **Parts manquantes?**
   ```sql
   SELECT * FROM clean_duplicate_investments();
   SELECT * FROM recalculate_all_investors();
   ```

3. **Valeur actuelle = 0$?**
   ```sql
   UPDATE company_settings
   SET setting_value = setting_value
   WHERE setting_key = 'nominal_share_value';
   ```

4. **Vérifier triggers actifs:**
   ```sql
   SELECT trigger_name, event_manipulation, action_statement
   FROM information_schema.triggers
   WHERE event_object_table = 'transactions';
   ```

---

**Date de création:** 2025-01-28
**Version:** 1.0
**Auteur:** Claude Code + Équipe CERDIA
