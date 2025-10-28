# 🔧 Fix: Parts et NAV - Guide d'exécution

## Problèmes à résoudre

1. **17,597.34 parts au lieu de 10,259.56** → Doublons dans la base de données
2. **NAV à 4.85 $ au lieu de ~1.08 $** → Calcul trop agressif
3. **Dashboard affiche 0 parts** → Synchronisation manquante

---

## Solution en 2 étapes

### Étape 1: Nettoyer les doublons (MIGRATION 83)

**Quoi:** Supprime les enregistrements dupliqués dans `investor_investments`

**Comment:**
1. Allez sur https://app.supabase.com
2. SQL Editor → New query
3. Copiez-collez le contenu de **`83-cleanup-duplicate-shares.sql`**
4. Cliquez **RUN** ▶️

**Résultat attendu:**
```
🔍 RECHERCHE DES DOUBLONS
⚠️  DOUBLON TROUVÉ:
  Investisseur: Eric Dufort
  Date: 2025-xx-xx
  Montant: xxxx $
  Nombre de copies: 2

🗑️  SUPPRESSION DES DOUBLONS
✅ X enregistrement(s) supprimé(s)

✅ VÉRIFICATION FINALE
Prix de la part: 1.00 $
Montant total investi: 10,259.56 $ CAD
Parts totales: 10,259.56
Parts attendues: 10,259.56
✅ SUCCÈS: Les parts correspondent au montant investi!
```

---

### Étape 2: Corriger le calcul du NAV (MIGRATION 84)

**Quoi:** Calcule le NAV de façon réaliste basé sur les flux de trésorerie réels

**Comment:**
1. Toujours sur Supabase SQL Editor
2. New query
3. Copiez-collez le contenu de **`84-fix-realistic-nav-calculation.sql`**
4. Cliquez **RUN** ▶️

**Résultat attendu:**
```
📊 TEST DU CALCUL NAV RÉALISTE V2

💰 FLUX DE TRÉSORERIE:
  Investissements      : 10,259.56 $ CAD (X transactions)
  Achats propriétés    : 2,921.78 $ CAD (Y transactions)
  CAPEX                : 0.00 $ CAD (0 transactions)
  Maintenance          : 0.00 $ CAD (0 transactions)
  Administration       : 0.00 $ CAD (0 transactions)
  Revenus locatifs     : 0.00 $ CAD (0 transactions)

TRÉSORERIE:
  Solde compte courant: 7,337.78 $ CAD

PROPRIÉTÉS:
  Valeur initiale: 49,840 $ CAD
  Valeur actuelle: 49,840 $ CAD (au départ, pas encore d'appréciation)
  Appréciation: 0 $ CAD (0.00%)

📊 RÉSULTAT NAV:
  Actifs totaux: 57,177.78 $ CAD
  NAV: 57,177.78 $ CAD
  Parts totales: 10,259.56
  NAV par part: 5.57 $ CAD  ← ENCORE TROP ÉLEVÉ, VOIR EXPLICATION CI-DESSOUS
  Performance: 457.00%
```

---

## ⚠️ IMPORTANT: Pourquoi le NAV est encore élevé?

Le NAV calculé (5.57 $) est encore trop élevé parce que:

**Mon calcul actuel:**
```
Investissements: 10,259.56 $ CAD
Achats propriétés: 2,921.78 $ CAD
Trésorerie: 10,259.56 - 2,921.78 = 7,337.78 $ CAD
Propriétés: 49,840 $ CAD (valeur Oasis Bay)
Actifs totaux: 7,337.78 + 49,840 = 57,177.78 $ CAD
NAV: 57,177.78 / 10,259.56 parts = 5.57 $ ❌
```

**Le problème:**
- Si vous avez investi 10,259.56 $ et acheté une propriété de 49,840 $, il manque ~39,580 $
- Soit il y a eu d'autres investissements non comptés
- Soit il y a un prêt/hypothèque
- Soit la propriété a été achetée en plusieurs versements

**Ce qu'il faut:**
- Vérifier que TOUS les investissements sont dans la table `transactions` avec `type='investissement'`
- Ajouter les passifs (prêts) si applicable
- Vérifier que les paiements de propriété sont bien enregistrés

---

## Questions pour vous

Pour que je puisse corriger le calcul du NAV:

1. **Total réellement investi**: Est-ce vraiment 10,259.56 $ ou y a-t-il d'autres investissements?

2. **Prix de la propriété Oasis Bay**:
   - Prix en USD: 35,600 $?
   - Taux de change utilisé: 1.3995?
   - Prix en CAD: 49,822 $?

3. **Combien avez-vous payé pour la propriété jusqu'à maintenant?**
   - Acompte/mise de fonds?
   - Paiements effectués?

4. **Y a-t-il un prêt/hypothèque?**
   - Montant du prêt?
   - À inclure dans les passifs

---

## Calcul NAV attendu (exemple)

**Si la situation est:**
- Investi: 10,259.56 $ CAD
- Acompte propriété: 2,921.78 $ CAD
- Reste en liquidités: 7,337.78 $ CAD
- Prêt pour financer le reste: 46,918 $ CAD

**Alors le NAV devrait être:**
```
Actifs:
  Liquidités: 7,337.78 $
  Propriété: 49,840 $
  Total: 57,177.78 $

Passifs:
  Prêt: 46,918 $

NAV = 57,177.78 - 46,918 = 10,259.78 $
NAV par part = 10,259.78 / 10,259.56 = 1.00 $ ✅

Après 1 an (propriété +8%):
  Propriété: 49,840 × 1.08 = 53,827 $
  NAV = (7,337.78 + 53,827) - 46,918 = 14,246.78 $
  NAV par part = 14,246.78 / 10,259.56 = 1.39 $ ✅
```

---

## Prochaines étapes

1. **Exécutez les migrations 83 et 84**
2. **Regardez les résultats dans les logs**
3. **Répondez aux questions ci-dessus**
4. Je vais ajuster la migration 84 pour calculer le NAV correctement

---

**Date:** 27 octobre 2025
**Migrations:** 83 (doublons) + 84 (NAV)
**Status:** En attente de vos réponses pour finaliser le calcul NAV
