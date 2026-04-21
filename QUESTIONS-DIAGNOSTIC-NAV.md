# ❓ QUESTIONS DIAGNOSTIC - Valeurs Propriétés à 0$

## 🔴 PROBLÈME IDENTIFIÉ
Vous avez **3 propriétés en cours d'achat** mais les valeurs affichées sont à **0$** dans Administration/NAV.

---

## 📋 QUESTIONS IMMÉDIATES (Pour diagnostic)

### Question 1: Statut des Propriétés 🔴 CRITIQUE

**La vue `current_property_values` filtre sur ces statuts:**
```sql
WHERE p.status IN ('acquired', 'complete', 'en_location')
```

**Quel est le statut EXACT de vos 3 propriétés en cours d'achat?**

Pour vérifier:
1. Allez dans **Administration → Propriétés** (ou Projets)
2. Cliquez sur chaque propriété
3. Notez le **statut exact**

Statuts possibles:
- [ ] `pending` - En attente
- [ ] `reserved` - Réservée
- [ ] `in_progress` - En cours de construction
- [ ] `under_contract` - Sous contrat
- [ ] `acquired` - Acquise
- [ ] `complete` - Complétée
- [ ] `en_location` - En location
- [ ] Autre: _______________

**Réponse:**
- Propriété 1: Statut = _______________
- Propriété 2: Statut = _______________
- Propriété 3: Statut = _______________

---

### Question 2: Prix d'Achat Renseigné 🔴 CRITIQUE

**Pour qu'une propriété ait une valeur, il faut:**
- Le champ `total_cost` (prix d'achat total) doit être renseigné

**Le prix d'achat est-il renseigné pour chaque propriété?**

Pour vérifier:
1. Dans la fiche de chaque propriété
2. Cherchez le champ "Prix total" ou "Total Cost"

**Réponse:**
- Propriété 1: Prix = _______________ (devise: USD/CAD)
- Propriété 2: Prix = _______________ (devise: USD/CAD)
- Propriété 3: Prix = _______________ (devise: USD/CAD)

---

### Question 3: Évaluation Initiale 🔴 CRITIQUE

**Pour que le calcul d'appréciation fonctionne, il faut:**
- Une évaluation initiale dans la table `property_valuations`
- Avec `valuation_type = 'initial'`

**Y a-t-il une section "Évaluations" dans votre interface?**
- [ ] OUI → Vérifiez si vos 3 propriétés ont une évaluation initiale
- [ ] NON → Les évaluations doivent être créées automatiquement

**Si OUI, pour chaque propriété:**
- Propriété 1: A une évaluation initiale? [ ] OUI [ ] NON
- Propriété 2: A une évaluation initiale? [ ] OUI [ ] NON
- Propriété 3: A une évaluation initiale? [ ] OUI [ ] NON

---

## 🔍 DIAGNOSTIC RAPIDE

**Scénario A: Propriétés ont mauvais statut**
- Si statut = 'reserved' ou 'pending' ou autre que 'acquired'/'complete'/'en_location'
- **Solution:** Modifier la vue pour inclure ces statuts

**Scénario B: Prix d'achat manquant**
- Si `total_cost` est vide ou NULL
- **Solution:** Renseigner le prix d'achat dans chaque propriété

**Scénario C: Évaluation initiale manquante**
- Si pas d'évaluation avec `valuation_type = 'initial'`
- **Solution:** Créer trigger auto ou ajouter manuellement les évaluations

**Scénario D: Combinaison des trois**
- Tous les problèmes ci-dessus
- **Solution:** Corriger dans l'ordre: 1) Prix, 2) Évaluation, 3) Statut/Vue

---

## 🎯 PROCHAINES ÉTAPES SELON DIAGNOSTIC

### Si Scénario A (Mauvais statut)

**Je vais:**
1. Créer migration pour modifier la vue `current_property_values`
2. Inclure les statuts en cours d'achat
3. Redéployer pour voir les propriétés

**Code à ajouter:**
```sql
WHERE p.status IN (
  'reserved',      -- NOUVEAU: Propriétés réservées
  'in_progress',   -- NOUVEAU: En cours d'achat
  'acquired',      -- Existant
  'complete',      -- Existant
  'en_location'    -- Existant
)
```

### Si Scénario B (Prix manquant)

**Vous devez:**
1. Aller dans chaque fiche propriété
2. Renseigner le champ "Prix total" / "Total Cost"
3. Sauvegarder
4. Rafraîchir la page NAV

### Si Scénario C (Évaluation manquante)

**Je vais:**
1. Vérifier si trigger existe pour créer évaluation auto
2. Si non: Créer trigger `auto_create_initial_valuation`
3. Ou: Créer manuellement les évaluations manquantes via SQL

---

## 💡 INFORMATION SUPPLÉMENTAIRE UTILE

**Pour m'aider à mieux diagnostiquer, pouvez-vous aussi:**

1. **Aller sur Supabase Dashboard → SQL Editor**
2. **Exécuter cette requête:**

```sql
-- Voir toutes les propriétés et leur statut
SELECT
  id,
  name,
  status,
  total_cost,
  currency,
  reservation_date,
  completion_date,
  created_at
FROM properties
ORDER BY created_at DESC
LIMIT 10;
```

3. **Copier-coller le résultat ici**

Et aussi:

```sql
-- Voir les évaluations existantes
SELECT
  pv.id,
  p.name as property_name,
  pv.valuation_type,
  pv.valuation_date,
  pv.acquisition_cost,
  pv.current_market_value
FROM property_valuations pv
JOIN properties p ON pv.property_id = p.id
ORDER BY pv.created_at DESC
LIMIT 10;
```

4. **Copier-coller le résultat ici**

Avec ces informations, je pourrai identifier **EXACTEMENT** le problème et le corriger immédiatement! 🚀

---

## 📞 FORMAT DE RÉPONSE ATTENDU

**Pour aller vite, répondez comme ça:**

```
PROPRIÉTÉ 1:
- Nom: [nom]
- Statut: [statut exact]
- Prix: [montant] [USD/CAD]
- Évaluation initiale: [OUI/NON]

PROPRIÉTÉ 2:
- Nom: [nom]
- Statut: [statut exact]
- Prix: [montant] [USD/CAD]
- Évaluation initiale: [OUI/NON]

PROPRIÉTÉ 3:
- Nom: [nom]
- Statut: [statut exact]
- Prix: [montant] [USD/CAD]
- Évaluation initiale: [OUI/NON]
```

Ou simplement coller les résultats des 2 requêtes SQL ci-dessus! 👍
