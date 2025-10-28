# 🚀 INSTRUCTIONS FINALES - DÉPLOIEMENT CORRIGÉ

## ⚠️ CORRECTION IMPORTANTE

Le script **90b** avait une erreur (trigger sur vue). Utilisez maintenant **90c** (version corrigée).

---

## 📝 ÉTAPES À SUIVRE (5 MINUTES)

### ✅ ÉTAPE 1: Script principal (90c)

**Dans l'éditeur SQL de Supabase :**

1. Ouvrez le fichier : `supabase/migrations-investisseur/90c-CORRECT-supabase-version.sql`
2. **Copiez TOUT** (Ctrl+A, Ctrl+C)
3. **Collez dans l'éditeur SQL** de Supabase
4. **Cliquez sur RUN**

**⏱️ Temps :** ~5-10 secondes

**✅ Vérification :**
```
NOTICE:  ✅ =============================================
NOTICE:  ✅ MIGRATION 90C TERMINÉE AVEC SUCCÈS
NOTICE:  ✅ =============================================
```

---

### ✅ ÉTAPE 2: Nettoyage (91b)

**Dans l'éditeur SQL de Supabase :**

1. Ouvrez : `supabase/migrations-investisseur/91b-supabase-cleanup.sql`
2. **Copiez TOUT**
3. **Collez et RUN**

**✅ Résultat attendu :**
- Tous les investisseurs : `✅ OK`
- Valeur actuelle ≠ 0$
- ROI cohérent

---

### ✅ ÉTAPE 3: Tester changement valeur nominale

**IMPORTANT : Utilisez `company_settings` (table), PAS `share_settings` (vue)**

```sql
-- ✅ CORRECT: Mise à jour via company_settings
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
FROM investors
ORDER BY first_name;
```

**✅ Résultat pour Chad (200,000 parts) :**
- `share_value` : **1.50**
- `valeur_actuelle` : **300,000.00** (200,000 × 1.50)
- `roi_pourcent` : **+50.00**

**🎉 C'EST AUTOMATIQUE !**

---

## 📊 COMPRENDRE LE SYSTÈME

### Comment ça marche ?

```
1. Vous changez : company_settings.setting_value (nominal_share_value)
                           ↓
2. Trigger détecte : auto_sync_share_value_to_investors
                           ↓
3. Met à jour AUTOMATIQUEMENT :
   - investors.share_value = nouvelle valeur
   - investors.current_value = parts × nouvelle valeur
                           ↓
4. ROI recalculé automatiquement dans l'interface
```

### Exemples

**Chad Rodrigue : 200,000 parts, 200,000$ investi**

| Valeur nominale | Valeur actuelle | ROI |
|----------------|-----------------|-----|
| 1.00$ | 200,000$ | 0% |
| 1.50$ | 300,000$ | +50% |
| 2.00$ | 400,000$ | +100% |
| 0.80$ | 160,000$ | -20% |

---

## 🧹 BONUS: Nettoyer tables inutiles (optionnel)

### Identifier tables vides

```sql
-- Copiez/collez le contenu de :
-- supabase/migrations-investisseur/92-identify-unused-tables.sql
```

### Supprimer tables inutiles

**⚠️ Faites un BACKUP d'abord !**

```sql
-- Exemple: Supprimer tables VOYAGE (si pas utilisées)
DROP TABLE IF EXISTS photos CASCADE;
DROP TABLE IF EXISTS depenses CASCADE;
DROP TABLE IF EXISTS evenements CASCADE;
DROP TABLE IF EXISTS checklist CASCADE;
DROP TABLE IF EXISTS partage CASCADE;
DROP TABLE IF EXISTS voyages CASCADE;

-- Vérifier
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
```

---

## ✅ CHECKLIST FINALE

- [ ] Script 90c exécuté → Message "✅ MIGRATION 90C TERMINÉE"
- [ ] Script 91b exécuté → Tous investisseurs `✅ OK`
- [ ] Valeur actuelle ≠ 0$ pour tous
- [ ] Test changement valeur nominale → Tout s'ajuste automatiquement
- [ ] Redémarrer serveur : `npm run dev`
- [ ] Tester modification transaction → Fonctionne !
- [ ] Tester suppression transaction → Parts retirées !

---

## 🐛 DÉPANNAGE

### Problème : "share_settings" is a view

**Solution :** Vous avez utilisé 90b au lieu de 90c. Utilisez **90c-CORRECT-supabase-version.sql**

### Problème : Valeur actuelle toujours à 0$

**Solution :**
```sql
-- Forcer synchronisation
UPDATE company_settings
SET setting_value = setting_value
WHERE setting_key = 'nominal_share_value';

-- Ou recalculer manuellement
SELECT recalculate_all_investors();
```

### Problème : Changement valeur nominale ne fonctionne pas

**Vérifiez que vous utilisez la TABLE, pas la VUE :**

```sql
-- ❌ INCORRECT (vue)
UPDATE share_settings SET nominal_share_value = 1.50;

-- ✅ CORRECT (table)
UPDATE company_settings
SET setting_value = '1.50'
WHERE setting_key = 'nominal_share_value';
```

### Problème : Parts pas retirées après suppression

```sql
-- Recalculer manuellement
SELECT recalculate_all_investors();
```

---

## 🎯 RÉSUMÉ

**Fichier principal :** `90c-CORRECT-supabase-version.sql` (pas 90b !)

**Pour changer valeur nominale :**
```sql
UPDATE company_settings
SET setting_value = 'NOUVELLE_VALEUR'
WHERE setting_key = 'nominal_share_value';
```

**Pour recalculer manuellement :**
```sql
SELECT recalculate_all_investors();
```

**Temps total :** 5-10 minutes

---

**Bon déploiement ! 🚀**
