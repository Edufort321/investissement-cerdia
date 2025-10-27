# Script 51 : Calcul Automatique du NAV

## ⚠️ SI VOUS VOYEZ UN PRIX BIZARRE (ex: 1,4071 $)

C'est que l'ancien système de projection 5% mensuel est encore actif !

### **SOLUTION : Exécuter 2 scripts dans l'ordre**

#### **1️⃣ D'ABORD : Nettoyage**
**Fichier** : `51-CLEANUP-FIRST.sql`
- Supprime toutes les anciennes données
- Réinitialise le système

#### **2️⃣ ENSUITE : Configuration**
**Fichier** : `51-automatic-nav-calculation.sql`
- Configure le calcul automatique
- Basé sur vos transactions réelles

---

## ✅ Ce que fait le script de configuration

1. ✅ Supprime et recrée la vue `current_share_price`
2. ✅ Ajoute le champ `is_projected` à la table
3. ✅ **Supprime et recrée** la fonction `calculate_share_price()`
4. ✅ Configure le calcul automatique :
   - **Parts émises** = Somme des transactions `investissement`
   - **Actifs** = Évaluations propriétés + Liquidités
   - **NAV** = Actifs / Parts

---

## 🚀 Exécution

1. Ouvrir **Supabase Dashboard** → **SQL Editor**
2. Copier-coller le contenu de `51-automatic-nav-calculation.sql`
3. Cliquer **Run**
4. Vérifier le message de confirmation

---

## 📊 Après l'exécution

### Étape 1 : Entrer les transactions d'investissement
**Administration > Transactions**
- Type : `investissement`
- Pour chaque commanditaire qui a investi

### Étape 2 : Créer les propriétés
**Projets** ou interface propriétés
- Créer les 3 condos

### Étape 3 : Entrer les évaluations
**Administration > Évaluations**
- Type : `initial`
- Valeur d'acquisition de chaque condo

### Étape 4 : Calculer le NAV
**Administration > Prix des parts**
- Cliquer **"Calculer nouveau prix"**
- Le système calcule automatiquement !
- Vérifier et publier

### Étape 5 : Vérifier le widget
Le dashboard affiche maintenant le NAV calculé automatiquement depuis vos vraies données.

---

## 🎯 Avantages

✅ Aucune configuration manuelle
✅ Basé sur transactions réelles
✅ Transparent et auditable
✅ Prêt pour tokenisation future

---

## ❓ Support

Le guide complet est dans `51-GUIDE-AUTOMATIQUE.md`
