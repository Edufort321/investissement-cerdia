# ✅ INSTRUCTIONS FINALES - VERSION SIMPLE

## 🎯 SCRIPTS SQL À EXÉCUTER (DANS L'ORDRE)

### 0️⃣ Script 94-cleanup-orphaned-investments.sql (SI DONNÉES RÉSIDUELLES)

**Fichier :** `supabase/migrations-investisseur/94-cleanup-orphaned-investments.sql`

**À exécuter SEULEMENT si :** Vous avez des parts ou montants résiduels après avoir supprimé des transactions

**Ce qu'il fait :**
- 🔍 Identifie les investissements orphelins (sans transaction associée)
- 🗑️ Supprime ces entrées orphelines
- 🔄 Recalcule tous les totaux
- ✅ Vérifie que les triggers fonctionnent

**Comment :**
1. Ouvrez Supabase → SQL Editor
2. Copiez/collez **TOUT** le contenu de `94-cleanup-orphaned-investments.sql`
3. **RUN**

**Résultat attendu :**
```
✅ MIGRATION 94 TERMINÉE
Tous les investisseurs devraient avoir: Parts = 0, Total investi = 0$
```

---

### 1️⃣ Script 90-FINAL.sql (OBLIGATOIRE)

**Fichier :** `supabase/migrations-investisseur/90-FINAL.sql`

**Ce qu'il fait :**
- ✅ Ajoute colonnes manquantes
- ✅ Crée table dettes
- ✅ Crée tous les triggers automatiques
- ✅ Synchronise valeur actuelle = parts × valeur nominale

**Comment :**
1. Ouvrez Supabase → SQL Editor
2. Copiez/collez **TOUT** le contenu de `90-FINAL.sql`
3. **RUN**

**Résultat attendu :**
```
NOTICE: ✅ MIGRATION 90 TERMINÉE
```

---

### 2️⃣ Script 91-FINAL.sql (OBLIGATOIRE)

**Fichier :** `supabase/migrations-investisseur/91-FINAL.sql`

**Ce qu'il fait :**
- ✅ Nettoie les doublons
- ✅ Recalcule tous les totaux
- ✅ Affiche rapport avant/après

**Comment :**
1. Ouvrez Supabase → SQL Editor
2. Copiez/collez **TOUT** le contenu de `91-FINAL.sql`
3. **RUN**

**Résultat attendu :**
- Tous les investisseurs : `✅ OK`
- Valeur actuelle ≠ 0$
- ROI cohérent

---

### 3️⃣ Script 95-complete-transaction-system.sql (OBLIGATOIRE)

**Fichier :** `supabase/migrations-investisseur/95-complete-transaction-system.sql`

**Ce qu'il fait :**
- ✅ Finalise le système transactions comme source unique
- ✅ Support CAPEX comme source de paiement
- ✅ Crée 6 vues SQL calculées temps réel:
  - `v_capex_summary` - CAPEX par année
  - `v_compte_courant_monthly` - Compte courant mensuel
  - `v_compte_courant_yearly` - Compte courant annuel
  - `v_property_cashflow` - Flux par propriété
  - `v_cashflow_by_source` - Flux par source
  - `v_operational_costs` - Coûts opération
- ✅ Fonction `get_financial_summary(year)` - Résumé financier
- ✅ Trigger `validate_transaction()` - Validation automatique
- ✅ Migration données existantes

**Comment :**
1. Ouvrez Supabase → SQL Editor
2. Copiez/collez **TOUT** le contenu de `95-complete-transaction-system.sql`
3. **RUN**

**Résultat attendu :**
```
✅ MIGRATION 95 TERMINÉE
6 vues créées + 2 fonctions + 1 trigger
```

---

### 4️⃣ Script 92 (OPTIONNEL)

**Fichier :** `supabase/migrations-investisseur/92-identify-unused-tables.sql`

**Ce qu'il fait :**
- 📊 Liste tables vides
- **Ne supprime rien**

**À exécuter SEULEMENT si :** Vous voulez voir quelles tables sont vides

---

### 5️⃣ Script 93 (OPTIONNEL - DANGER)

**Fichier :** `supabase/migrations-investisseur/93-cleanup-unused-tables.sql`

**Ce qu'il fait :**
- 🗑️ Supprime tables inutiles
- **TOUT EST COMMENTÉ**

**À exécuter SEULEMENT si :**
- Vous avez fait un BACKUP
- Vous êtes SÛR de ne plus en avoir besoin

---

## ✅ TEST APRÈS 90 + 91

**Vérifier que le système fonctionne :**

```sql
-- Changer valeur nominale à 1.50$
UPDATE company_settings
SET setting_value = '1.50'
WHERE setting_key = 'nominal_share_value';

-- Vérifier que TOUT s'ajuste automatiquement
SELECT
  first_name || ' ' || last_name AS investisseur,
  total_shares AS parts,
  share_value AS valeur_par_part,
  current_value AS valeur_actuelle,
  CASE
    WHEN total_invested > 0 THEN
      ROUND(((current_value - total_invested) / total_invested * 100)::numeric, 2)
    ELSE 0
  END AS roi_pourcent
FROM investors;
```

**✅ Pour Chad (200,000 parts) vous devriez voir :**
- `valeur_par_part` : **1.50**
- `valeur_actuelle` : **300,000.00**
- `roi_pourcent` : **+50.00**

**🎉 Si ça marche, remettez à 1.00$ :**

```sql
UPDATE company_settings
SET setting_value = '1.00'
WHERE setting_key = 'nominal_share_value';
```

---

## 📋 RÉSUMÉ

| Script | Obligatoire ? | Description |
|--------|--------------|-------------|
| **94-cleanup-orphaned-investments.sql** | ⚠️ Si résiduel | Nettoyer données orphelines (à faire EN PREMIER si besoin) |
| **90-FINAL.sql** | ✅ OUI | Corrections principales |
| **91-FINAL.sql** | ✅ OUI | Nettoyage + recalcul |
| **95-complete-transaction-system.sql** | ✅ OUI | Système complet + vues calculées temps réel |
| 92-identify-unused-tables.sql | ⚠️ Optionnel | Voir tables vides (info seulement) |
| 93-cleanup-unused-tables.sql | ⚠️ Optionnel | Supprimer tables (danger) |

---

## ❓ DÉPANNAGE

### Problème : Valeur actuelle toujours à 0$

```sql
-- Forcer sync
UPDATE company_settings
SET setting_value = setting_value
WHERE setting_key = 'nominal_share_value';

-- Ou recalculer manuellement
SELECT recalculate_all_investors();
```

### Problème : Parts pas retirées après suppression

```sql
SELECT recalculate_all_investors();
```

### Problème : Doublons persistent

```sql
SELECT * FROM clean_duplicate_investments();
SELECT * FROM recalculate_all_investors();
```

---

**C'EST TOUT ! 🚀**

Exécutez **90-FINAL.sql** puis **91-FINAL.sql** et testez !
