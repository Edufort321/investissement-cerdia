# 📊 GUIDE D'INSTALLATION - Système de Scénarios

## 🎯 Objectif

Installer le système complet de gestion de scénarios d'évaluation immobilière avec vote des investisseurs et conversion en projets actifs.

---

## 🔄 Nouveau Flux de Travail

```
┌─────────────────┐
│ 1. Créer        │  Nom, prix, données promoteur
│    Scénario     │  → Analyser (3 scénarios auto)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 2. Vote         │  Investisseurs votent
│    Investisseurs│  → Majorité requise (> 50%)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 3. Approuvé?    │  Si oui → Marquer "Acheté"
│                 │  → Conversion automatique
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 4. Projet Actif │  Apparaît dans onglet Projets
│                 │  avec toutes les données
└─────────────────┘
```

---

## 📋 ÉTAPE 1: Installation SQL

### Scripts à exécuter dans l'ordre

#### 1.1 Script 20 - Tables de scénarios

```sql
-- Exécuter: supabase/20-create-scenarios.sql
```

**Tables créées:**
- `scenarios` - Scénarios d'évaluation
- `scenario_results` - Résultats d'analyse (conservateur/modéré/élevé)
- `scenario_votes` - Votes des investisseurs
- `scenario_documents` - Documents promoteur

**Fonctions créées:**
- `get_scenario_vote_status()` - Calcule statut de vote
- `scenarios_with_votes` (vue) - Scénarios avec statistiques de vote

**Vérification:**
```sql
SELECT COUNT(*) FROM information_schema.tables
WHERE table_schema = 'public' AND table_name LIKE 'scenario%';
-- Attendu: 4 tables
```

#### 1.2 Script 21 - Storage policies

```sql
-- Exécuter: supabase/21-scenario-storage-policies.sql
```

**Policies créées:**
- Upload documents
- View documents
- Delete documents
- Update documents

---

## 📋 ÉTAPE 2: Configuration Storage

### 2.1 Créer le bucket

**Dashboard Supabase → Storage → Create Bucket**

| Paramètre | Valeur |
|-----------|--------|
| Nom | `scenario-documents` |
| Type | **Privé** (Private) |
| Limite fichier | 50 MB |
| Types autorisés | PDF, images, Excel, Word, PowerPoint |

### 2.2 Vérifier les policies

```sql
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'objects'
AND policyname LIKE '%scenario%';
```

Vous devriez voir 4 policies.

---

## 📋 ÉTAPE 3: Structure des Données

### 3.1 Statuts d'un scénario

| Statut | Description | Actions possibles |
|--------|-------------|-------------------|
| `draft` | Brouillon | Éditer, Soumettre au vote |
| `pending_vote` | En attente de vote | Voter |
| `approved` | Approuvé (majorité) | Marquer "Acheté" |
| `rejected` | Rejeté | Archiver |
| `purchased` | Acheté (converti) | Voir projet actif |

### 3.2 Données du promoteur (JSON)

```json
{
  "monthly_rent": 1500,
  "annual_appreciation": 5,
  "occupancy_rate": 80,
  "management_fees": 10,
  "project_duration": 10
}
```

### 3.3 Termes de paiement optionnels (JSON)

```json
[
  {
    "label": "Acompte 20%",
    "amount_type": "percentage",
    "percentage": 20,
    "fixed_amount": 0,
    "due_date": "2025-01-15"
  },
  {
    "label": "Frais notaire",
    "amount_type": "fixed_amount",
    "percentage": 0,
    "fixed_amount": 5000,
    "due_date": "2025-02-01"
  }
]
```

---

## 📋 ÉTAPE 4: Système de Vote

### 4.1 Logique de vote

**Règles:**
- Un investisseur = 1 vote
- Peut voter `approve` ou `reject`
- Peut changer son vote avant approbation
- Majorité simple requise (> 50%)
- Minimum 2 votes requis

**Exemple:**
```
4 investisseurs au total
3 ont voté: 2 approve, 1 reject
→ 66.7% d'approbation
→ Majorité atteinte ✅
→ Statut devient "approved"
```

### 4.2 Vérifier le statut de vote

```sql
SELECT * FROM get_scenario_vote_status('scenario-uuid');

-- Retourne:
-- total_votes: 3
-- approve_votes: 2
-- reject_votes: 1
-- approval_percentage: 66.67
-- is_approved: true
```

---

## 📋 ÉTAPE 5: Conversion en Projet

### 5.1 Processus de conversion

Quand un scénario `approved` est marqué "Acheté":

1. **Créer nouvelle propriété** dans table `properties`
   ```sql
   INSERT INTO properties (
     name,
     location,
     status,
     total_cost,
     paid_amount,
     currency,
     expected_roi,
     ...
   ) VALUES (...);
   ```

2. **Créer termes de paiement** dans `payment_schedules`
   ```sql
   -- Pour chaque terme défini dans le scénario
   INSERT INTO payment_schedules (...);
   ```

3. **Mettre à jour scénario**
   ```sql
   UPDATE scenarios SET
     status = 'purchased',
     converted_property_id = NEW_PROPERTY_ID,
     converted_at = NOW()
   WHERE id = SCENARIO_ID;
   ```

4. **Copier documents** vers `property-attachments`

### 5.2 Vérification post-conversion

```sql
-- Vérifier le scénario converti
SELECT id, name, status, converted_property_id, converted_at
FROM scenarios
WHERE status = 'purchased';

-- Vérifier le projet créé
SELECT id, name, status, total_cost
FROM properties
WHERE id = (SELECT converted_property_id FROM scenarios WHERE ...);

-- Vérifier les termes de paiement
SELECT term_label, amount, due_date, status
FROM payment_schedules
WHERE property_id = ...;
```

---

## 📋 ÉTAPE 6: Upload de Documents

### 6.1 Structure des chemins

```
scenario-documents/
├── {scenario-id-1}/
│   ├── brochure-promoteur.pdf
│   ├── plan-financier.xlsx
│   └── photos/
│       ├── vue-1.jpg
│       └── vue-2.jpg
├── {scenario-id-2}/
│   ├── contrat-preliminaire.pdf
│   └── etude-marche.pdf
```

### 6.2 Types de fichiers autorisés

| Type | Extension | MIME Type |
|------|-----------|-----------|
| PDF | `.pdf` | `application/pdf` |
| Images | `.jpg, .png, .gif, .webp` | `image/*` |
| Excel | `.xlsx` | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` |
| Word | `.docx` | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` |
| PowerPoint | `.pptx` | `application/vnd.openxmlformats-officedocument.presentationml.presentation` |

---

## 📋 ÉTAPE 7: Export PDF

### 7.1 Contenu du PDF généré

Le PDF d'évaluation doit contenir:

**Page de garde:**
- Logo CERDIA
- Titre: "Évaluation de Projet Immobilier"
- Nom du projet
- Date de création

**Résumé exécutif:**
- Prix d'achat
- Coût total (avec frais)
- ROI attendu (scénario modéré)
- Recommandation

**Analyse des 3 scénarios:**
Pour chaque scénario (Conservateur, Modéré, Élevé):
- Tableau financier sur 10 ans
- Graphiques d'évolution
- Évaluation écrite
- Points forts et vigilance

**Statut de vote:**
- Nombre de votes
- % d'approbation
- Liste des votants (optionnel)

**Annexes:**
- Documents du promoteur
- Termes de paiement détaillés

---

## ✅ CHECKLIST INSTALLATION

- [ ] Script 20 exécuté (tables scenarios)
- [ ] Script 21 exécuté (storage policies)
- [ ] Bucket `scenario-documents` créé
- [ ] Vérification: 4 tables scenarios créées
- [ ] Vérification: fonction `get_scenario_vote_status` existe
- [ ] Vérification: vue `scenarios_with_votes` existe
- [ ] Vérification: policies storage actives
- [ ] Interface de création de scénario implémentée
- [ ] Système de vote implémenté
- [ ] Conversion en projet implémentée
- [ ] Export PDF implémenté

---

## 🧪 TEST DU SYSTÈME

### Test 1: Créer un scénario

```sql
INSERT INTO scenarios (name, purchase_price, initial_fees, promoter_data, created_by)
VALUES (
  'Test - Punta Cana Resort',
  250000,
  15000,
  '{
    "monthly_rent": 1500,
    "annual_appreciation": 5,
    "occupancy_rate": 80,
    "management_fees": 10,
    "project_duration": 10
  }'::jsonb,
  (SELECT id FROM investors LIMIT 1)
)
RETURNING id;
```

### Test 2: Voter sur le scénario

```sql
-- Vote 1: Approbation
INSERT INTO scenario_votes (scenario_id, investor_id, vote, comment)
VALUES (
  'SCENARIO_ID',
  (SELECT id FROM investors WHERE email = 'eric.dufort@cerdia.com'),
  'approve',
  'Excellent projet, je recommande'
);

-- Vote 2: Approbation
INSERT INTO scenario_votes (scenario_id, investor_id, vote)
VALUES (
  'SCENARIO_ID',
  (SELECT id FROM investors WHERE email = 'chad.rodrigue@cerdia.com'),
  'approve'
);

-- Vérifier le statut
SELECT * FROM scenarios_with_votes WHERE id = 'SCENARIO_ID';
```

### Test 3: Marquer comme approuvé

```sql
UPDATE scenarios
SET status = 'approved'
WHERE id = 'SCENARIO_ID'
AND is_approved = true;
```

---

## 🆘 DÉPANNAGE

### Problème: "Bucket does not exist"

**Solution:**
1. Aller dans Dashboard Supabase → Storage
2. Créer bucket `scenario-documents` (type Privé)
3. Exécuter script 21 à nouveau

### Problème: "Permission denied" lors upload

**Solution:**
```sql
-- Vérifier les policies
SELECT * FROM pg_policies WHERE tablename = 'objects';

-- Réexécuter script 21 si nécessaire
```

### Problème: Vote ne change pas le statut

**Solution:**
```sql
-- Vérifier la fonction de calcul
SELECT * FROM get_scenario_vote_status('scenario-id');

-- Vérifier le nombre minimum de votes (2 requis)
```

---

## 📚 RESSOURCES

- [Supabase Storage Docs](https://supabase.com/docs/guides/storage)
- [Supabase RLS Docs](https://supabase.com/docs/guides/auth/row-level-security)
- [jsPDF Documentation](https://github.com/parallax/jsPDF) - Pour export PDF

---

**Version:** 1.0
**Dernière mise à jour:** Octobre 2025
**Auteur:** Équipe CERDIA
