# Guide : NAV Automatique depuis Transactions Réelles

## 🎯 Comment ça fonctionne maintenant

Le NAV se calcule **automatiquement** à partir de vos vraies données :

### **Formule automatique :**

```
Parts émises = Somme des transactions 'investissement'
Actifs = Évaluations propriétés + Liquidités
Liquidités = Investissements - Dépenses
NAV = Actifs / Parts
```

---

## ✅ Workflow complet (dans l'ordre)

### **1. Commanditaires investissent**

Allez dans **Administration > Transactions** et créez les transactions d'investissement :

| Date | Commanditaire | Type | Montant | Description |
|------|---------------|------|---------|-------------|
| 2025-03-15 | Jean Tremblay | `investissement` | 50 000 $ | Achat de 50 000 parts |
| 2025-03-20 | Marie Dubois | `investissement` | 30 000 $ | Achat de 30 000 parts |
| 2025-04-10 | Pierre Martin | `investissement` | 100 000 $ | Achat de 100 000 parts |

**Résultat automatique :**
- Total investi : 180 000 $
- Parts émises : 180 000 parts
- Prix par part : 1,00 $ (au début)

---

### **2. Acquisition immobilière (Condo 1)**

**Date : 20 mars 2025**

#### A. Créer la transaction de dépense
**Administration > Transactions**
- Date : 2025-03-20
- Type : `depense`
- Montant : 240 300 $ (178k$ US × 1,35)
- Description : "Acquisition Condo 1 - Préconstruction"

#### B. Créer l'évaluation initiale
**Administration > Évaluations**
- Propriété : Condo 1
- Date : 2025-03-20
- Type : `initial`
- Coût acquisition : 240 300 $
- Valeur marchande : 240 300 $
- Prochaine évaluation : 2027-03-20

**Résultat automatique :**
- Actifs immobiliers : 240 300 $
- Liquidités : 180 000 - 240 300 = -60 300 $ (déficit)
- Parts : 180 000

⚠️ **Déficit** : Il manque 60 300 $ d'investissements !

---

### **3. Ajuster les investissements**

Si vos commanditaires ont investi **820 000 $** au total, entrez TOUTES les transactions :

```
Total investi : 820 000 $
Total dépensé : 606 000 $ (3 condos)
Liquidités : 214 000 $
```

---

### **4. Calculer le NAV**

**Administration > Prix des parts**

1. Cliquez **"Calculer nouveau prix"**
2. Sélectionnez la date : 2025-03-20
3. Type : `special` (acquisition)
4. Notes : "Acquisition 3 condos"
5. Cliquez **"Calculer"**

**Le système calcule automatiquement :**

```
Investissements : 820 000 $
Propriétés : 606 000 $ (évaluations)
Liquidités : 214 000 $ (820k - 606k)
Total actifs : 820 000 $
Parts : 820 000
NAV = 820 000 / 820 000 = 1,00 $
```

6. Vérifiez le calcul
7. Cliquez **"Publier"**

---

### **5. Livraison + Appréciation (Mars 2026)**

**Le Condo 1 est livré et vaut maintenant 264 000 $ (+10%)**

#### A. Créer nouvelle évaluation
**Administration > Évaluations**
- Propriété : Condo 1
- Date : 2026-03-20
- Type : `biennial`
- Coût acquisition : 240 300 $ (inchangé)
- Valeur marchande : **264 000 $** (+10%)
- Prochaine évaluation : 2028-03-20

#### B. Recalculer NAV
**Administration > Prix des parts** → **"Calculer"**

**Le système recalcule automatiquement :**

```
Investissements : 820 000 $ (inchangé)
Propriétés : 630 000 $ (606k + 24k appréciation)
Liquidités : 214 000 $ (inchangé)
Total actifs : 844 000 $
Parts : 820 000
NAV = 844 000 / 820 000 = 1,029 $ (+2,9%)
```

🎉 **Les commanditaires ont gagné 2,9% !**

---

### **6. Revenus locatifs réinvestis**

**Le Condo 1 génère 12 000 $ de revenus en 2026**

#### A. Créer transaction revenu
**Administration > Transactions**
- Type : `dividende` (ou créer type `revenu_locatif`)
- Montant : 12 000 $
- Description : "Revenus Condo 1 - 2026"

#### B. Réinvestir dans nouveau condo
**Administration > Transactions**
- Type : `depense`
- Montant : 12 000 $
- Description : "Acompte Condo 4"

#### C. Évaluer nouveau condo
**Administration > Évaluations**
- Créer évaluation initiale du Condo 4

#### D. Recalculer NAV
**Le système calcule automatiquement :**

```
Actifs : +12 000 $ (nouvel acompte)
Parts : 820 000 (inchangé - revenus réinvestis)
NAV augmente encore !
```

---

## 📊 Exemple complet sur 3 ans

### **Mars 2025 : Lancement**
```
Investissements : 820 000 $
Condos (3) : 606 000 $
Liquidités : 214 000 $
Parts : 820 000
NAV = 1,00 $
```

### **Mars 2026 : Livraison Condo 1 (+10%)**
```
Investissements : 820 000 $
Condos : 630 000 $ (+24k appréciation)
Liquidités : 214 000 $
Parts : 820 000
NAV = 1,029 $ (+2,9%)
```

### **Juin 2026 : Revenus réinvestis**
```
Investissements : 820 000 $
Condos : 630 000 $
Liquidités : 226 000 $ (+12k revenus)
Parts : 820 000
NAV = 1,044 $ (+4,4%)
```

### **2027 : Livraison Condos 2 & 3 (+8%)**
```
Investissements : 820 000 $
Condos : 679 000 $ (+49k appréciation)
Liquidités : 226 000 $
Parts : 820 000
NAV = 1,104 $ (+10,4%)
```

### **2028 : Vente Condo 1 (300k$) + Réinvest**
```
Investissements : 820 000 $
Condos : 679 000 $ (2 & 3) + 300k (nouveaux)
Liquidités : 5 000 $
Parts : 820 000
NAV = 1,200 $ (+20%)
```

---

## ✅ Avantages de cette approche

1. ✅ **Aucune configuration manuelle** - Tout calculé depuis transactions
2. ✅ **Transparent** - Chaque calcul basé sur données réelles
3. ✅ **Auditabilité** - Historique complet des transactions
4. ✅ **Flexible** - S'adapte à n'importe quel scénario
5. ✅ **Automatique** - Recalcul instantané à chaque évaluation

---

## 🚀 Actions immédiates

1. **Exécuter script 51** dans Supabase SQL Editor
2. **Entrer TOUTES les transactions d'investissement** des commanditaires
3. **Créer les 3 propriétés** dans l'interface
4. **Entrer les évaluations initiales** des 3 condos
5. **Calculer le NAV** - Le système fait tout automatiquement !
6. **Publier** - Le graphique montre l'évolution réelle

---

## 📈 Le graphique montrera

```
1,00 $ ━━━━━━━━━━━━━━━━━━ (mars 2025 - mars 2026)
       ↗
1,03 $ ━━━━━━━━ (après livraison Condo 1)
          ↗
1,04 $ ━━━━━━ (revenus réinvestis)
             ↗
1,10 $ ━━━━ (livraisons 2 & 3)
               ↗
1,20 $ ━━ (vente + réinvestissement)
```

**Comme la bourse - basé sur événements réels !** 🎯
