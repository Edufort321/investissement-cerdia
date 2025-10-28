# 🚀 Guide Rapide - Correction "0 parts"

## Problème actuel

- **Dashboard principal**: 0 parts ❌
- **Administration**: 17,597.34 parts ❌
- **Attendu**: 10,259.56 parts (basé sur 10,259.56 $ investi)

## Solution en 3 étapes

### Étape 1: Exécuter le script de déploiement

1. Allez sur https://app.supabase.com
2. Ouvrez votre projet CERDIA
3. Cliquez sur **SQL Editor** dans le menu de gauche
4. Cliquez sur **New query**
5. Copiez-collez TOUT le contenu du fichier `DEPLOY_ALL_FIXES.sql`
6. Cliquez sur **RUN** ▶️

### Étape 2: Vérifier les résultats

Après l'exécution, vous verrez dans les logs:

```
🔄 RECALCUL DES PARTS POUR TOUS LES INVESTISSEURS
═══════════════════════════════════════════════════

  ✅ Eric Dufort: 10259.56 parts (10259.56 $ investi)

📊 RÉSUMÉ: 1 investisseur(s) avec parts
```

**Important**: Si vous voyez un nombre différent de 10,259.56 parts, cela signifie qu'il y a des doublons dans la table `investor_investments`.

### Étape 3: Rafraîchir le dashboard

1. Retournez sur votre dashboard: http://localhost:3000/dashboard
2. Appuyez sur **Ctrl + Shift + R** (ou Cmd + Shift + R sur Mac) pour forcer le rafraîchissement
3. Vous devriez maintenant voir:

```
Eric Dufort
100.00% du portefeuille
10 259,56 $
10 259,56 parts  ✅
```

## Ce qui a été corrigé

| Migration | Correction |
|-----------|------------|
| **75** | Ajout colonnes manquantes (payment_schedule_id, source_currency, source_amount) |
| **76** | Correction trigger cash_flow pour éviter les erreurs |
| **77** | Calcul automatique des parts lors de l'ajout de transactions |
| **78** | Autorisation de suppression de transactions |
| **79** | Gestion des modifications de transactions |
| **80** | ⭐ Recalcul rétroactif des parts pour transactions existantes |
| **81** | ⭐ NAV réaliste avec appréciation 8% annuelle |
| **82** | ⭐ Synchronisation automatique investors.total_shares |

## Vérification du NAV

Après le déploiement, votre NAV sera calculé comme suit:

```
Situation actuelle:
- Investissement total: 10,259.56 $ CAD
- Propriété Oasis Bay A302: 35,600 $ USD
- Taux de change: ~1.40
- Valeur propriété en CAD: ~49,840 $ CAD

NAV = Actifs totaux / Parts totales
NAV = 49,840 $ / 10,259.56 parts
NAV = ~4.86 $ par part

Dans 1 an (avec appréciation 8%):
- Valeur propriété: 35,600 × 1.08 = 38,448 $ USD (~53,827 $ CAD)
- NAV par part: 53,827 / 10,259.56 = ~5.25 $
```

## Si vous avez des problèmes

### Problème: Nombre de parts incorrect (pas 10,259.56)

**Solution**: Il y a probablement des doublons dans `investor_investments`.

Vérifiez avec cette requête:
```sql
SELECT
  investment_date,
  amount_invested,
  number_of_shares,
  COUNT(*) as nb_doublons
FROM investor_investments
WHERE investor_id = (SELECT id FROM investors WHERE last_name = 'Dufort')
GROUP BY investment_date, amount_invested, number_of_shares
HAVING COUNT(*) > 1;
```

Si vous trouvez des doublons, supprimez-les:
```sql
-- Attention: Vérifiez d'abord les résultats avant de supprimer!
DELETE FROM investor_investments
WHERE id NOT IN (
  SELECT MIN(id)
  FROM investor_investments
  GROUP BY investor_id, investment_date, amount_invested
);
```

### Problème: Dashboard affiche toujours 0 parts

1. Vérifiez que la migration 82 s'est bien exécutée
2. Vérifiez dans la table `investors`:
```sql
SELECT first_name, last_name, total_shares, total_invested
FROM investors;
```

Si `total_shares` est toujours à 0, exécutez manuellement:
```sql
UPDATE investors
SET total_shares = (
  SELECT COALESCE(SUM(number_of_shares), 0)
  FROM investor_investments
  WHERE investor_id = investors.id
);
```

### Problème: NAV toujours à 1.00 $

1. Vérifiez que vous avez au moins une propriété avec statut "acquired"
2. Vérifiez que l'évaluation initiale a été créée:
```sql
SELECT * FROM property_valuations WHERE valuation_type = 'initial';
```

Si aucune évaluation n'existe, marquez la propriété comme "acquired":
```sql
UPDATE properties
SET status = 'acquired'
WHERE name LIKE '%Oasis Bay%';
```

## Support

Si les problèmes persistent:
1. Copiez les logs de l'exécution du script
2. Exécutez ces requêtes de diagnostic:
```sql
-- Combien de transactions d'investissement?
SELECT COUNT(*), SUM(amount) FROM transactions WHERE type = 'investissement';

-- Combien de parts créées?
SELECT COUNT(*), SUM(number_of_shares) FROM investor_investments;

-- Détail par investisseur
SELECT * FROM investor_summary;
```

---

**Date**: 27 octobre 2025
**Priorité**: 🔴 CRITIQUE
**Temps estimé**: 5 minutes
**Fichier à exécuter**: `DEPLOY_ALL_FIXES.sql`
