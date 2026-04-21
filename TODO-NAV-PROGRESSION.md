# 📋 TODO LIST - Progression NAV & Valeur des Parts

## 🎯 OBJECTIF
Afficher la valeur réelle des propriétés et calculer le NAV par part en temps réel.

---

## ✅ COMPLÉTÉ

- [x] Analyser tables et vues existantes dans Supabase
- [x] Créer dashboard NAV avec toutes les sections
- [x] Ajouter portfolio détaillé par propriété
- [x] Ajouter flux de trésorerie complet
- [x] Ajouter calcul NAV détaillé (Actifs - Passifs)
- [x] Créer script migrations nettoyage (102-104)
- [x] Créer document analyse existant vs manquant
- [x] Déployer sur Vercel

---

## 🔴 EN COURS

### 1. Diagnostiquer pourquoi valeurs propriétés = 0$
**Problème:** 3 propriétés en cours d'achat mais valeurs affichées à 0$

**Hypothèses possibles:**
- ❓ Les propriétés ont un statut différent de 'acquired'/'complete'/'en_location'
- ❓ Pas d'évaluation initiale dans table `property_valuations`
- ❓ Le filtre de la vue `current_property_values` exclut les propriétés en cours

**Actions à faire:**
1. Vérifier le **statut exact** des 3 propriétés
2. Vérifier si elles ont une **évaluation initiale**
3. Ajuster la vue ou créer les évaluations manquantes

---

## ⏳ À FAIRE (Par ordre de priorité)

### PHASE 1: Corriger affichage valeurs propriétés

- [ ] **1.1** Identifier statut des 3 propriétés en cours d'achat
- [ ] **1.2** Vérifier présence évaluations initiales
- [ ] **1.3** Corriger données ou vue selon diagnostic
- [ ] **1.4** Tester affichage valeurs dans NAV

### PHASE 2: Nettoyer la base de données

- [ ] **2.1** Exécuter migrations nettoyage sur Supabase
  - Script: `APPLY-CRITICAL-FIXES-102-104.sql`
  - Corrige: Triple création, doublons, vue NAV vide

### PHASE 3: Identifier transactions manquantes

- [ ] **3.1** Répondre aux 5 questions critiques (voir section QUESTIONS)
- [ ] **3.2** Créer migration pour types manquants (si nécessaire)
- [ ] **3.3** Mettre à jour fonction `calculate_realistic_nav_v2()`
- [ ] **3.4** Afficher nouvelles catégories dans dashboard

### PHASE 4: Vérification finale

- [ ] **4.1** Vérifier toutes les sections du dashboard NAV
- [ ] **4.2** Vérifier calcul NAV par part correct
- [ ] **4.3** Vérifier flux de trésorerie complet
- [ ] **4.4** Tester création d'un investissement (pas de triple création)

---

## ❓ QUESTIONS CRITIQUES À RÉPONDRE

### Questions sur les transactions (Phase 3)

**Pour identifier les types de transactions manquants:**

#### Q1: Hypothèques et Prêts 🔴 CRITIQUE
- ❓ **Avez-vous des hypothèques** sur les propriétés?
  - [ ] OUI → Besoin type `hypotheque`
  - [ ] NON → Passifs = 0 est correct

- ❓ **Payez-vous des intérêts** sur ces prêts?
  - [ ] OUI → Besoin type `interet`
  - [ ] NON → Pas applicable

**Impact:** Si OUI, le NAV actuel est SURÉVALUÉ car passifs = 0

#### Q2: Taxes Foncières 🔴 CRITIQUE
- ❓ **Payez-vous des taxes foncières/municipales?**
  - [ ] OUI → Besoin type `taxe_fonciere`
  - [ ] NON → Pas de propriété encore ou inclus ailleurs

- ❓ **Si OUI, comment sont-elles trackées actuellement?**
  - [ ] Dans type `depense`
  - [ ] Dans type `admin`
  - [ ] Dans type `maintenance`
  - [ ] Pas trackées du tout

**Impact:** Si pas trackées, le cash flow est SURÉVALUÉ

#### Q3: Assurances Immobilières 🔴 CRITIQUE
- ❓ **Payez-vous des assurances** pour les propriétés?
  - [ ] OUI → Besoin type `assurance`
  - [ ] NON → Pas encore ou inclus ailleurs

- ❓ **Si OUI, comment sont-elles trackées?**
  - [ ] Dans type `depense`
  - [ ] Dans type `admin`
  - [ ] Pas trackées du tout

**Impact:** Si pas trackées, le cash flow est SURÉVALUÉ

#### Q4: Frais de Condo 🟡 MOYEN
- ❓ **Y a-t-il des frais de copropriété/condo?**
  - [ ] OUI → Besoin type `frais_condo`
  - [ ] NON → Pas de condo
  - [ ] Inclus dans autre catégorie

#### Q5: Utilités 🟡 MOYEN
- ❓ **Qui paie les utilités** (eau, électricité, gaz)?
  - [ ] PROPRIÉTAIRE → Besoin type `utilites`
  - [ ] LOCATAIRE → Pas nécessaire
  - [ ] Inclus dans autre catégorie

---

## 📊 DIAGNOSTIC VALEURS À 0$ (En cours)

### Étape 1: Vérifier statut des propriétés

**La vue `current_property_values` filtre sur:**
```sql
WHERE p.status IN ('acquired', 'complete', 'en_location')
```

**Statuts possibles dans votre système:**
- `pending` - En attente
- `reserved` - Réservée
- `in_progress` - En cours
- `acquired` - Acquise ✅
- `complete` - Complétée ✅
- `en_location` - En location ✅

**Question:** Quel est le **statut exact** de vos 3 propriétés en cours d'achat?

### Étape 2: Vérifier évaluations initiales

**Pour qu'une propriété ait une valeur, il faut:**
1. Propriété dans la table `properties` avec `total_cost` renseigné
2. **Évaluation initiale** dans `property_valuations`:
   - `valuation_type = 'initial'`
   - `acquisition_cost` renseigné
   - `current_market_value` renseigné

**Question:** Les 3 propriétés ont-elles des évaluations initiales dans `property_valuations`?

### Étape 3: Solutions possibles

**Solution A:** Si propriétés ont statut différent (ex: 'reserved', 'in_progress')
- Modifier vue `current_property_values` pour inclure ces statuts

**Solution B:** Si évaluations initiales manquent
- Créer automatiquement évaluation initiale quand propriété est ajoutée
- Ou ajouter manuellement les évaluations manquantes

**Solution C:** Si propriétés pas encore dans `properties`
- Ajouter les propriétés en cours d'achat

---

## 🎯 PROCHAINES ACTIONS IMMÉDIATES

### Action 1: Diagnostiquer valeurs 0$ (MAINTENANT)

**Vous devez me donner ces informations:**

1. **Quel est le statut** de vos 3 propriétés?
   - Allez dans Administration → Propriétés
   - Notez le statut exact de chacune

2. **Ces propriétés ont-elles un prix d'achat** (`total_cost`)?
   - Vérifiez dans la fiche de chaque propriété

3. **Y a-t-il une évaluation initiale** pour chacune?
   - Vérifiez dans Administration → Évaluations (si existe)
   - Ou donnez-moi accès à Supabase pour vérifier

### Action 2: Une fois diagnostic fait

**Je vais:**
- Créer la correction appropriée (vue, trigger, ou données)
- Tester que les valeurs s'affichent
- Continuer avec les phases suivantes

---

## 📝 NOTES IMPORTANTES

### Ce qui est déjà en place:
- ✅ Table `property_valuations` existe
- ✅ Vue `current_property_values` existe
- ✅ Fonction `calculate_property_value_with_appreciation()` existe
- ✅ Dashboard NAV complet avec portfolio

### Ce qui pourrait manquer:
- ⚠️ Données dans `property_valuations` pour vos propriétés
- ⚠️ Propriétés avec bon statut
- ⚠️ Trigger pour créer évaluation initiale automatiquement

### Workflow idéal (à implémenter si manquant):
1. Propriété ajoutée → Statut 'reserved' ou 'in_progress'
2. À l'achat → Statut passe à 'acquired'
3. Trigger auto-crée évaluation initiale avec `total_cost`
4. Fonction calcule appréciation 8%/an depuis cette date
5. À la livraison → Évaluation réelle remplace le scénario
6. Aux 2 ans → Réévaluation (rappel automatique)

---

## 🔄 SUIVI PROGRESSION

**Dernière mise à jour:** Session actuelle

**État actuel:**
- Dashboard NAV: ✅ Déployé
- Portfolio propriétés: ✅ Affiché
- Valeurs propriétés: ❌ À 0$ (en diagnostic)
- Migrations nettoyage: ⏳ À exécuter
- Types transactions: ⏳ À identifier

**Prochaine étape:**
→ Diagnostiquer pourquoi valeurs = 0$ avec vos informations

---

## 📞 INFORMATIONS ATTENDUES DE VOTRE PART

Pour continuer, j'ai besoin de:

1. **Statut des 3 propriétés** (ex: 'reserved', 'in_progress', etc.)
2. **Prix d'achat de chaque propriété** (est-ce renseigné?)
3. **Y a-t-il des évaluations initiales?** (oui/non pour chacune)

Une fois ces infos fournies, je pourrai corriger immédiatement! 🚀
