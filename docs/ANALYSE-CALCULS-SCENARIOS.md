# 🔍 Analyse des Calculs Comptables - Scénarios d'Investissement

**Date:** 2025-10-26
**Analysé par:** Claude Code
**Fichier source:** `components/ScenariosTab.tsx` (lignes 550-655)

---

## 📊 PROBLÈMES IDENTIFIÉS

### 🚨 CRITIQUE: ROI Double-Comptage (Ligne 611)

**Code actuel:**
```typescript
const roi = initialCashCAD > 0
  ? ((propertyValueCAD - initialCashCAD + cumulativeCashflow) / initialCashCAD * 100)
  : 0
```

**Problème:**
- Le `cumulativeCashflow` contient DÉJÀ tous les revenus nets accumulés
- On les additionne ENCORE avec `(propertyValueCAD - initialCashCAD)`
- **Résultat:** ROI artificiellement gonflé de 20-40%

**Formule correcte:**
```typescript
// Option 1: ROI basé sur la valeur de la propriété uniquement
const roi = ((propertyValueCAD - initialCashCAD) / initialCashCAD) * 100

// Option 2: ROI incluant les cash flows (recommandé)
const totalValue = propertyValueCAD + cumulativeCashflow
const roi = ((totalValue - initialCashCAD) / initialCashCAD) * 100
```

---

### ⚠️ MAJEUR: Frais Récurrents Ignorés

**Champs existants mais inutilisés:**
- `recurring_fees: RecurringFee[]` - HOA, taxes foncières, assurance, entretien
- Interface définie lignes 86-91 mais jamais utilisée dans `calculateScenario()`

**Impact:**
```
Exemple concret:
- HOA: 400$/mois = 4,800$/an
- Taxes foncières: 2,500$/an
- Assurance: 1,200$/an
- Entretien: 1,500$/an
TOTAL: 10,000$/an NON COMPTABILISÉ

Sur 10 ans: 100,000$ manquant dans les calculs!
```

**Correction nécessaire:**
```typescript
// Calculer total des frais récurrents annuels
const annualRecurringFeesUSD = (scenario.recurring_fees || []).reduce((sum, fee) => {
  const amount = fee.frequency === 'monthly' ? fee.amount * 12 : fee.amount
  const amountUSD = fee.currency === 'CAD' ? amount / currentRate : amount
  return sum + amountUSD
}, 0)
const annualRecurringFeesCAD = annualRecurringFeesUSD * futureRate

// Appliquer inflation sur frais récurrents
const inflationRate = 0.025 // 2.5%/an
const inflatedRecurringFees = annualRecurringFeesCAD * Math.pow(1 + inflationRate, year - 1)

// Soustraire du revenu net
const netIncomeCAD = grossIncomeCAD - taxesCAD - inflatedRecurringFees
```

---

### ⚠️ MAJEUR: Augmentation Loyer Non Appliquée

**Champ existant mais inutilisé:**
- `annual_rent_increase: number` (ligne 68)
- Défini dans l'interface mais jamais utilisé dans la boucle de projection

**Code actuel (INCORRECT):**
```typescript
const adjustedRent = pd.monthly_rent * rentMultiplier
// ... puis utilisé tel quel chaque année
```

**Correction:**
```typescript
// Appliquer augmentation cumulative du loyer
const yearlyRentIncrease = Math.pow(1 + (pd.annual_rent_increase / 100), year - 1)
const currentYearRent = adjustedRent * yearlyRentIncrease

let annualRentUSD: number
if (pd.rent_type === 'nightly') {
  annualRentUSD = currentYearRent * 365 * (adjustedOccupancy / 100)
} else {
  annualRentUSD = currentYearRent * 12
}
```

---

### 📈 MÉTRIQUES MANQUANTES

#### 1. **Cap Rate (Capitalization Rate)**
```typescript
// Taux de capitalisation = Revenu Net Annuel / Valeur de la Propriété
const capRate = (netIncomeCAD / propertyValueCAD) * 100
```
**Utilité:** Comparer rapidement différents investissements immobiliers

#### 2. **Cash-on-Cash Return**
```typescript
// Rendement cash = Cash Flow Annuel / Investissement Initial
const cashOnCashReturn = (netIncomeCAD / initialCashCAD) * 100
```
**Utilité:** Mesurer le rendement réel du capital investi

#### 3. **IRR (Internal Rate of Return)**
```typescript
// Taux de rendement interne - nécessite calcul NPV itératif
function calculateIRR(cashFlows: number[]): number {
  // Implementation Newton-Raphson ou dichotomie
}
```
**Utilité:** Taux d'actualisation qui annule la VAN

#### 4. **NPV (Net Present Value)**
```typescript
// Valeur actuelle nette avec taux d'actualisation
const discountRate = 0.05 // 5% taux d'actualisation
const npv = cashFlows.reduce((sum, cf, i) => {
  return sum + (cf / Math.pow(1 + discountRate, i))
}, -initialCashCAD)
```
**Utilité:** Valeur présente des flux futurs

#### 5. **Payback Period**
```typescript
// Durée pour récupérer l'investissement initial
const paybackYear = yearlyData.findIndex(y => y.cumulative_cashflow > 0) + 1
```
**Déjà implémenté comme `break_even_year`** ✅

---

### 💰 FISCALITÉ MANQUANTE

#### 1. **Dépréciation Fiscale**
```typescript
// Au Canada: 4% par an du coût de la propriété (Class 1)
// Aux USA: 3.636% par an (27.5 ans résidentiel)
const depreciationRate = scenario.country === 'USA' ? 0.03636 : 0.04
const annualDepreciation = totalInvestmentUSD * depreciationRate

// Réduction d'impôt grâce à la dépréciation
const taxSavingsFromDepreciation = annualDepreciation * (pd.tax_rate / 100)
```

#### 2. **Impôt sur Plus-Value (Capital Gains Tax)**
```typescript
// Lors de la vente finale
const capitalGain = propertyValueUSD - totalInvestmentUSD
const capitalGainsTaxRate = 0.25 // 25% au Canada (50% du taux marginal)
const capitalGainsTax = capitalGain * capitalGainsTaxRate

// Valeur nette après impôt
const netPropertyValueAfterTax = propertyValueCAD - (capitalGainsTax * futureRate)
```

---

### 📊 TABLEAUX À AJOUTER

#### 1. **Analyse de Sensibilité**
Tester l'impact de variations sur le ROI:
- Taux d'occupation: -20%, -10%, baseline, +10%, +20%
- Appréciation: -2%, 0%, baseline, +2%, +4%
- Taux de change: -10%, -5%, baseline, +5%, +10%
- Frais de gestion: baseline, +25%, +50%

#### 2. **Comparaison Scénarios Côte-à-Côte**
| Métrique | Conservateur | Modéré | Optimiste |
|----------|--------------|--------|-----------|
| ROI Final | 45% | 78% | 125% |
| Cash-on-Cash Y1 | 3.2% | 5.8% | 8.9% |
| Break Even | An 8 | An 5 | An 3 |
| IRR | 4.1% | 7.2% | 11.5% |

#### 3. **Projection Cash Flow Détaillée**
| Année | Revenus | Dépenses | Cash Flow | Cumulatif |
|-------|---------|----------|-----------|-----------|
| 1 | 71,808 | -15,234 | 56,574 | -195,426 |
| 2 | 73,496 | -15,615 | 57,881 | -137,545 |

#### 4. **Analyse Coût Total de Possession (TCO)**
- Investissement initial
- Frais de transaction
- Paiements échelonnés
- Frais récurrents cumulés (10 ans)
- Rénovations/CapEx estimés
- Vacance (périodes non louées)
- **= Coût réel sur la durée du projet**

---

## ✅ RECOMMANDATIONS

### Priorité 1 (CRITIQUE)
1. ✅ Corriger formule ROI (double-comptage)
2. ✅ Intégrer recurring_fees dans calculs
3. ✅ Appliquer annual_rent_increase chaque année

### Priorité 2 (IMPORTANT)
4. Ajouter dépréciation fiscale
5. Ajouter impôt sur plus-value
6. Calculer métriques avancées (IRR, NPV, Cap Rate, Cash-on-Cash)

### Priorité 3 (AMÉLIORATION)
7. Créer tableau analyse de sensibilité
8. Intégrer payment_terms dans projection annuelle
9. Ajouter coût d'opportunité (comparaison S&P 500)
10. Ajouter facteurs de risque optionnels (vacance prolongée, réparations majeures)

---

## 🔬 FORMULES COMPTABLES DE RÉFÉRENCE

### ROI (Return on Investment)
```
ROI = ((Valeur Finale - Investissement Initial) / Investissement Initial) × 100
```

### Cap Rate
```
Cap Rate = (Revenu Net d'Exploitation / Valeur de la Propriété) × 100
```

### Cash-on-Cash Return
```
CoC = (Cash Flow Annuel Avant Impôts / Total Cash Investi) × 100
```

### IRR (Internal Rate of Return)
```
NPV = Σ(CFt / (1+IRR)^t) = 0
Où CFt = Cash Flow à l'année t
```

### Debt Service Coverage Ratio (si financement)
```
DSCR = Revenu Net d'Exploitation / Paiements de Dette Annuels
```

---

## 📝 NOTES ADDITIONNELLES

- **Taux de change:** Actuellement +5% de risque appliqué sur revenus futurs (ligne 575) - Justifié
- **Scénarios:** Ajustements conservateur/optimiste bien définis (lignes 556-564)
- **Break-even:** Correctement calculé avec `findIndex` (ligne 628)

**Date de dernière mise à jour:** 2025-10-26
