# 🚀 INSTRUCTIONS SUPABASE - 6 ÉTAPES

## 📁 FICHIERS DISPONIBLES (Dans l'ordre!)

```
1️⃣  1-cleanup.sql          → Nettoie tout
2️⃣  2-create-tables.sql    → Crée les 11 tables
3️⃣  3-create-indexes.sql   → Ajoute les indexes
4️⃣  4-create-triggers.sql  → Ajoute triggers et vue
5️⃣  5-enable-rls.sql       → Active la sécurité
6️⃣  6-insert-data.sql      → Insère les données
7️⃣  7-storage-policies.sql → Configure Storage
```

---

## 🎯 PROCÉDURE COMPLÈTE

### ÉTAPE 1: Nettoyage

1. Ouvre Supabase: https://svwolnvknfmakgmjhoml.supabase.co
2. Va dans **SQL Editor** (menu gauche)
3. Clique **+ New Query**
4. Copie TOUT le contenu de `1-cleanup.sql`
5. Colle et clique **RUN**

✅ **Résultat attendu**: Message "NETTOYAGE TERMINÉ"

---

### ÉTAPE 2: Création des tables

1. Clique **+ New Query** (nouvelle requête!)
2. Copie TOUT le contenu de `2-create-tables.sql`
3. Colle et clique **RUN**

✅ **Résultat attendu**: Message "11 TABLES CRÉÉES"

**Vérifie:**
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

Tu devrais voir 11 tables:
- capex_accounts
- current_accounts
- dividend_allocations
- dividends
- documents
- investors
- operational_expenses
- properties
- reports
- rnd_accounts
- transactions

---

### ÉTAPE 3: Création des indexes

1. Clique **+ New Query**
2. Copie TOUT le contenu de `3-create-indexes.sql`
3. Colle et clique **RUN**

✅ **Résultat attendu**: Message "INDEXES CRÉÉS"

---

### ÉTAPE 4: Création des triggers

1. Clique **+ New Query**
2. Copie TOUT le contenu de `4-create-triggers.sql`
3. Colle et clique **RUN**

✅ **Résultat attendu**: Message "TRIGGERS ET FONCTIONS CRÉÉS"

---

### ÉTAPE 5: Activation de la sécurité (RLS)

1. Clique **+ New Query**
2. Copie TOUT le contenu de `5-enable-rls.sql`
3. Colle et clique **RUN**

✅ **Résultat attendu**: Message "RLS ACTIVÉ"

---

### ÉTAPE 6: Insertion des données

1. Clique **+ New Query**
2. Copie TOUT le contenu de `6-insert-data.sql`
3. Colle et clique **RUN**

✅ **Résultat attendu**: Message "DONNÉES INSÉRÉES - BASE DE DONNÉES COMPLÈTE!"

**Vérifie les données:**
```sql
-- Voir les investisseurs
SELECT first_name, last_name, total_invested, percentage_ownership
FROM investors
ORDER BY total_invested DESC;

-- Voir les propriétés
SELECT name, location, status, total_cost, paid_amount
FROM properties;

-- Voir le sommaire
SELECT * FROM summary_view;
```

Tu devrais voir:
- ✅ 4 investisseurs (Éric, Chad, Alexandre, Pierre)
- ✅ 3 propriétés (Oasis Bay A301, A302, Secret Garden H-212)
- ✅ Le sommaire avec la valeur totale

---

### ÉTAPE 7: Configuration Storage

1. Clique **+ New Query**
2. Copie TOUT le contenu de `7-storage-policies.sql`
3. Colle et clique **RUN**

✅ **Résultat attendu**: Message "STORAGE CONFIGURÉ - Bucket documents prêt!"

**Note**: Si le bucket n'existe pas encore, il sera créé automatiquement. Les politiques permettent aux utilisateurs authentifiés d'uploader, lire et supprimer des documents.

---

## ✅ VÉRIFICATION FINALE

Exécute cette requête pour tout vérifier:
```sql
SELECT
  (SELECT COUNT(*) FROM investors) as investisseurs,
  (SELECT COUNT(*) FROM properties) as proprietes,
  (SELECT COUNT(*) FROM capex_accounts) as capex,
  (SELECT COUNT(*) FROM current_accounts) as courant,
  (SELECT COUNT(*) FROM rnd_accounts) as rnd,
  (SELECT SUM(total_invested) FROM investors) as total_investi;
```

**Résultat attendu:**
- investisseurs: 4
- proprietes: 3
- capex: 1
- courant: 1
- rnd: 1
- total_investi: 344915.19

---

## 🆘 EN CAS D'ERREUR

**Si une étape bloque:**
1. Note le numéro de l'étape (1 à 6)
2. Copie le message d'erreur complet
3. Envoie-moi ces infos

**Si tu veux recommencer:**
- Exécute juste l'étape 1 (cleanup) et recommence!

---

## 🚀 APRÈS AVOIR TERMINÉ

Confirme-moi que tout est fait et je continue avec le code de l'application!
