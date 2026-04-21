# 📊 DIAGNOSTIC COMPLET - Calcul NAV en Temps Réel

## ✅ Ce qui est DÉJÀ tracké et calculé

### 1. **ENTRÉES (Argent qui entre)**
- ✅ **Investissements des commanditaires** (`type = 'investissement'`)
- ✅ **Revenus locatifs** (`type = 'loyer'`)

### 2. **SORTIES (Argent qui sort)**
- ✅ **Achats de propriétés** (`type = 'investissement'` + `property_id`)
- ✅ **CAPEX** - Améliorations (`type = 'capex'`)
- ✅ **Maintenance** (`type = 'maintenance'`)
- ✅ **Administration** (`type = 'admin'`)

### 3. **PROPRIÉTÉS**
- ✅ **Valeur d'achat** (prix payé en USD)
- ✅ **Conversion USD → CAD** (avec taux de change)
- ✅ **Valeur actuelle** (appréciation 8%/an)
- ✅ **Date d'acquisition** (pour calculer appréciation)
- ✅ **Statut** (`acquired`, `complete`, `en_location`)

### 4. **CALCULS NAV**
- ✅ **Solde compte courant** = Entrées - Sorties
- ✅ **Total actifs** = Trésorerie + Propriétés
- ✅ **Total passifs** = 0 (actuellement)
- ✅ **NAV** = Actifs - Passifs
- ✅ **NAV par part** = NAV / Nombre de parts

---

## ⚠️ Ce qui POURRAIT manquer (Normes à vérifier)

### 1. **PASSIFS (Dettes)**
| Type | Tracké? | Importance | Action requise |
|------|---------|------------|----------------|
| Hypothèques / Prêts | ❌ NON | 🔴 CRITIQUE | Ajouter type `mortgage` |
| Intérêts sur prêts | ❌ NON | 🔴 CRITIQUE | Ajouter type `interest` |
| Ligne de crédit | ❌ NON | 🟡 MOYEN | Ajouter si applicable |

**Impact:** Actuellement `total_liabilities = 0`, donc le NAV est SURÉVALUÉ si des prêts existent.

### 2. **DÉPENSES D'ACHAT (Frais de clôture)**
| Type | Tracké? | Importance | Action requise |
|------|---------|------------|----------------|
| Frais d'avocat | ❓ PARTIEL | 🟡 MOYEN | Vérifier si dans CAPEX |
| Frais de notaire | ❓ PARTIEL | 🟡 MOYEN | Vérifier si dans CAPEX |
| Inspection pré-achat | ❓ PARTIEL | 🟢 FAIBLE | Vérifier si dans CAPEX |
| Frais de courtage | ❓ PARTIEL | 🟡 MOYEN | Vérifier si dans CAPEX |

**Impact:** Ces frais devraient être dans le prix d'achat ou en CAPEX.

### 3. **DÉPENSES OPÉRATIONNELLES RÉCURRENTES**
| Type | Tracké? | Importance | Action requise |
|------|---------|------------|----------------|
| Taxes foncières | ❌ NON | 🔴 CRITIQUE | Ajouter type `property_tax` |
| Assurances immobilières | ❌ NON | 🔴 CRITIQUE | Ajouter type `insurance` |
| Frais de gestion (property manager) | ❓ PARTIEL | 🟡 MOYEN | Vérifier si dans admin |
| Frais de condo (si applicable) | ❌ NON | 🟡 MOYEN | Ajouter type `condo_fees` |
| Utilités (si propriétaire paie) | ❌ NON | 🟡 MOYEN | Ajouter type `utilities` |

**Impact:** Ces dépenses réduisent le cash flow et donc le NAV.

### 4. **REVENUS SUPPLÉMENTAIRES**
| Type | Tracké? | Importance | Action requise |
|------|---------|------------|----------------|
| Revenus de stationnement | ❓ PARTIEL | 🟢 FAIBLE | Vérifier si dans loyer |
| Revenus de buanderie | ❓ PARTIEL | 🟢 FAIBLE | Vérifier si dans loyer |
| Pénalités de retard | ❌ NON | 🟢 FAIBLE | Optionnel |

### 5. **APPRÉCIATION RÉELLE vs SCÉNARIO**
| Élément | Actuel | Idéal | Action requise |
|---------|--------|-------|----------------|
| Appréciation | 8%/an automatique | Évaluation réelle | Système de rappel |
| Évaluation initiale | À l'achat | À la livraison | Workflow à implémenter |
| Réévaluation | ❌ NON | Aux 2 ans | Système de rappel |

**Impact:** Le NAV actuel utilise un SCÉNARIO (8%/an). Pour un NAV précis, il faut des évaluations réelles.

---

## 🎯 RECOMMANDATIONS CRITIQUES

### Priority 1 - PASSIFS (Critique pour NAV)
**Si vous avez des prêts/hypothèques, le NAV est FAUX actuellement!**

Ajouter ces types de transactions:
```sql
-- Nouveau types à ajouter dans transactions
'mortgage'      -- Hypothèque (montant emprunté)
'interest'      -- Intérêts sur prêts
'loan'          -- Autre prêt
```

### Priority 2 - DÉPENSES OPÉRATIONNELLES
Ajouter ces types de transactions récurrentes:
```sql
'property_tax'  -- Taxes foncières
'insurance'     -- Assurances
'condo_fees'    -- Frais de condo
'utilities'     -- Utilités (eau, électricité, gaz)
```

### Priority 3 - APPRÉCIATION RÉELLE
Implémenter:
1. **Évaluation à la livraison** - Capturer valeur réelle
2. **Rappel automatique** - Évaluation aux 2 ans
3. **Override manuel** - Permettre d'entrer évaluation réelle

---

## 📋 ÉTAT ACTUEL du CALCUL NAV

### Formule actuelle:
```
ACTIFS = Compte courant + Valeur propriétés (8%/an)

Compte courant =
  + Investissements
  + Revenus locatifs
  - Achats propriétés
  - CAPEX
  - Maintenance
  - Administration

NAV = ACTIFS - PASSIFS (actuellement = 0 ❌)

NAV par part = NAV / Nombre de parts
```

### Ce qui manque dans le calcul:
```diff
Compte courant =
  + Investissements
  + Revenus locatifs
+ + Autres revenus (parking, buanderie)
  - Achats propriétés
  - CAPEX
  - Maintenance
  - Administration
+ - Taxes foncières ❌ MANQUANT
+ - Assurances ❌ MANQUANT
+ - Frais de condo ❌ MANQUANT
+ - Utilités ❌ MANQUANT
+ - Intérêts sur prêts ❌ MANQUANT

+ PASSIFS = Hypothèques + Prêts ❌ MANQUANT

NAV = ACTIFS - PASSIFS
```

---

## ✅ PLAN D'ACTION

### Étape 1: Identifier les transactions manquantes
**QUESTION POUR VOUS:**
1. ❓ Avez-vous des **hypothèques ou prêts** sur les propriétés?
2. ❓ Payez-vous des **taxes foncières**? (Si oui, trackées comment?)
3. ❓ Payez-vous des **assurances**? (Si oui, trackées comment?)
4. ❓ Y a-t-il des **frais de condo**?
5. ❓ Qui paie les **utilités** (locataire ou propriétaire)?

### Étape 2: Ajouter les types de transactions manquants
Une fois identifiés, je peux:
1. Ajouter les nouveaux types dans la base
2. Mettre à jour la fonction `calculate_realistic_nav_v2()`
3. Afficher ces nouvelles catégories dans le dashboard NAV

### Étape 3: Implémenter système d'évaluation réelle
1. Ajouter champ "valeur évaluée" dans property_valuations
2. Système de rappel pour évaluation aux 2 ans
3. Override automatique du 8% quand évaluation réelle existe

---

## 🔍 VÉRIFICATION IMMÉDIATE

Pour vérifier l'état actuel, allez sur **Administration → NAV** et vérifiez:

1. **Flux de trésorerie - SORTIES:**
   - Y a-t-il des dépenses qui devraient apparaître mais n'y sont pas?

2. **Solde compte courant:**
   - Est-ce que ce montant semble correct?
   - Manque-t-il des dépenses récurrentes?

3. **NAV Total:**
   - Ce montant vous semble-t-il réaliste?
   - Si vous avez des prêts, le NAV devrait être plus bas

---

## 💡 CONCLUSION

Le système calcule déjà le NAV en temps réel, mais il pourrait être **incomplet** selon vos opérations réelles.

**Les éléments CRITIQUES à vérifier:**
1. 🔴 **PASSIFS** - Prêts/hypothèques
2. 🔴 **Taxes foncières** - Dépense récurrente importante
3. 🔴 **Assurances** - Dépense récurrente importante
4. 🟡 **Appréciation réelle** vs scénario 8%

**Répondez aux questions de l'Étape 1** et je vais ajuster le système pour capturer toutes les données nécessaires!
