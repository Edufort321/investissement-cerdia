# Livre d'Entreprise (Corporate Book) - Guide de Déploiement

## 📋 Vue d'ensemble

Le **Livre d'Entreprise** est un système complet de gestion des événements corporatifs et documents légaux pour la conformité, les notaires et les avocats.

### Fonctionnalités principales

✅ **10 types d'entrées corporatives:**
- Achats et ventes immobiliers
- Émission, transfert et rachat de parts
- Assemblées générales et conseils d'administration
- Résolutions et documents légaux

✅ **Auto-remplissage intelligent:**
- Sélectionnez une transaction pour remplir automatiquement les champs
- Les données critiques (date, montant, propriété) sont pompées depuis les transactions

✅ **Actions rapides (+Action):**
- Créez rapidement des entrées pré-remplies pour les événements courants
- Assemblées générales, réunions du CA, résolutions, émissions de parts

✅ **Gestion de documents:**
- Upload multiple de documents (PDF, Word, Images)
- Stockage sécurisé dans Supabase Storage
- Gestion de documents existants (suppression, visualisation)

✅ **Export et conformité:**
- Export CSV pour audits et due diligence
- Filtrage par type d'entrée
- Statuts: Brouillon, Approuvé, Archivé

---

## 🚀 Étapes de Déploiement

### Étape 1: Créer les tables de base de données

Exécutez le script SQL pour créer les tables `corporate_book` et `corporate_book_documents`:

```bash
# Dans Supabase Dashboard > SQL Editor
# Exécuter: supabase/60-corporate-book.sql
```

Ce script créera:
- ✅ Table `corporate_book` (entrées principales)
- ✅ Table `corporate_book_documents` (documents attachés)
- ✅ Vue `corporate_book_view` (données jointes)
- ✅ Politiques RLS (Row Level Security)
- ✅ Triggers (mise à jour timestamps, compteur documents)

### Étape 2: Créer le bucket de stockage

Exécutez le script pour créer le bucket Supabase Storage:

```bash
# Dans Supabase Dashboard > SQL Editor
# Exécuter: supabase/61-corporate-documents-storage.sql
```

Ce script créera:
- ✅ Bucket `corporate-documents` (privé)
- ✅ Politiques RLS pour le bucket (lecture, upload, mise à jour, suppression)

**IMPORTANT:** Vérifiez que le bucket est bien créé:
1. Allez dans Supabase Dashboard > Storage
2. Vérifiez que le bucket `corporate-documents` existe
3. Vérifiez que "Public" est désactivé (bucket privé)

### Étape 3: Vérifier l'intégration dans le dashboard

Le composant `CorporateBookTab` est déjà intégré dans le dashboard:

```typescript
// app/dashboard/page.tsx
// Onglet: Administration > Livre d'entreprise
```

Accès: **Dashboard > Administration > Livre d'entreprise**

---

## 📊 Structure des Données

### Table: corporate_book

| Champ | Type | Description |
|-------|------|-------------|
| id | UUID | Identifiant unique |
| entry_type | VARCHAR | Type d'entrée (property_acquisition, share_issuance, etc.) |
| entry_date | DATE | Date de l'événement |
| title | VARCHAR | Titre de l'entrée |
| description | TEXT | Description détaillée |
| property_id | UUID | Lien vers propriété (optionnel) |
| transaction_id | UUID | Lien vers transaction (optionnel) |
| partner_id | UUID | Lien vers partenaire (optionnel) |
| amount | DECIMAL | Montant financier (optionnel) |
| currency | VARCHAR | Devise (CAD/USD) |
| status | VARCHAR | Statut (draft/approved/filed) |
| legal_reference | VARCHAR | Référence légale (ex: Acte #12345) |
| notes | TEXT | Notes internes |
| metadata | JSONB | Métadonnées flexibles |
| has_documents | BOOLEAN | Indicateur de documents attachés |

### Table: corporate_book_documents

| Champ | Type | Description |
|-------|------|-------------|
| id | UUID | Identifiant unique |
| corporate_book_id | UUID | Lien vers entrée corporate_book |
| document_type | VARCHAR | Type de document (deed, contract, resolution, etc.) |
| file_name | VARCHAR | Nom du fichier |
| file_size | INTEGER | Taille en bytes |
| file_type | VARCHAR | Type MIME |
| storage_path | TEXT | Chemin dans Supabase Storage |
| is_original | BOOLEAN | Document original? |
| is_signed | BOOLEAN | Document signé? |

---

## 🔧 Guide d'Utilisation

### Créer une nouvelle entrée

1. **Onglet Administration > Livre d'entreprise**
2. Cliquez sur **"Nouvelle entrée"** ou **"+Action"** pour entrée rapide
3. Sélectionnez le type d'entrée
4. **Auto-remplissage:** Sélectionnez une transaction liée pour remplir automatiquement les champs
5. Ajoutez des documents (optionnel)
6. Cliquez sur **"Créer l'entrée"**

### Utiliser +Action (Actions rapides)

Le bouton **+Action** permet de créer rapidement des entrées pré-remplies:

- **Assemblée Générale**: Crée une entrée pour AG avec date du jour
- **Réunion du CA**: Crée une entrée pour conseil d'administration
- **Résolution**: Crée une entrée pour résolution corporative
- **Émission de Parts**: Crée une entrée pour émission de parts

### Uploader des documents

1. Lors de la création/modification d'une entrée
2. Dans la section **"Documents légaux"**
3. Cliquez sur la zone de drop ou sélectionnez des fichiers
4. Formats acceptés: PDF, Word, JPG, PNG
5. Taille max: 10 MB par fichier
6. Les documents sont uploadés automatiquement lors de la sauvegarde

### Filtrer les entrées

- Utilisez les boutons de filtre en haut de la liste
- Filtrez par type d'entrée (achats immobiliers, parts, réunions, etc.)
- Le compteur affiche le nombre d'entrées par type

### Exporter les données

- Cliquez sur **"Exporter CSV"**
- Le fichier CSV contient: Date, Type, Titre, Description, Montant, Statut, Référence légale
- Utile pour audits, due diligence, rapports fiscaux

---

## 🔒 Sécurité et Permissions

### Row Level Security (RLS)

Toutes les tables ont RLS activé avec les politiques suivantes:

**Tables corporate_book et corporate_book_documents:**
- SELECT: Tous les utilisateurs authentifiés ✅
- INSERT: Tous les utilisateurs authentifiés ✅
- UPDATE: Tous les utilisateurs authentifiés ✅
- DELETE: Tous les utilisateurs authentifiés ✅

**Bucket Storage corporate-documents:**
- Lecture: Utilisateurs authentifiés ✅
- Upload: Utilisateurs authentifiés ✅
- Mise à jour: Utilisateurs authentifiés ✅
- Suppression: Utilisateurs authentifiés ✅

> **Note:** Les politiques peuvent être affinées selon les besoins (ex: restreindre la suppression aux admins uniquement)

---

## 🧪 Tests de Validation

### Checklist de validation

- [ ] Les tables `corporate_book` et `corporate_book_documents` existent
- [ ] La vue `corporate_book_view` fonctionne
- [ ] Le bucket `corporate-documents` est créé et privé
- [ ] L'onglet "Livre d'entreprise" apparaît dans Administration
- [ ] Création d'une nouvelle entrée fonctionne
- [ ] +Action crée des entrées pré-remplies
- [ ] Sélection d'une transaction remplit automatiquement les champs
- [ ] Upload de documents fonctionne (PDF, Word, Images)
- [ ] Suppression de documents fonctionne
- [ ] Export CSV fonctionne
- [ ] Filtrage par type d'entrée fonctionne
- [ ] Modification d'une entrée existante fonctionne
- [ ] Suppression d'une entrée fonctionne

### Cas de test recommandés

1. **Test achat immobilier:**
   - Créer une entrée de type "Achat immobilier"
   - Lier à une propriété existante
   - Lier à une transaction existante (devrait auto-remplir les champs)
   - Uploader un contrat de vente (PDF)
   - Vérifier que le document apparaît dans la liste

2. **Test émission de parts:**
   - Utiliser +Action > Émission de Parts
   - Remplir les détails (nombre de parts, investisseur)
   - Uploader une convention de commanditaire
   - Changer le statut de "Brouillon" à "Approuvé"

3. **Test assemblée générale:**
   - Utiliser +Action > Assemblée Générale
   - Ajouter date de réunion et participants
   - Uploader procès-verbal (PDF)
   - Archiver (statut "Archivé")

4. **Test export CSV:**
   - Créer plusieurs entrées de types différents
   - Exporter en CSV
   - Vérifier que toutes les données sont présentes

---

## 📝 Types d'Entrées Disponibles

| Type | Description | Usage typique |
|------|-------------|---------------|
| 🏢 Achat immobilier | Acquisition de propriété | Acte notarié, contrat de vente |
| 💰 Vente immobilier | Vente de propriété | Acte de vente, documents de transfert |
| 📈 Émission de parts | Création de nouvelles parts | Convention de commanditaire, certificat |
| 🔄 Transfert de parts | Transfert entre partenaires | Contrat de transfert, consentement |
| 📉 Rachat de parts | Rachat par la société | Convention de rachat, paiement |
| 👥 Assemblée générale | AG annuelle ou extraordinaire | Procès-verbal, résolutions votées |
| 🏛️ Conseil d'administration | Réunion du CA | Procès-verbal, décisions du CA |
| 📜 Résolution | Résolution corporative | Résolution signée, autorisations |
| ⚖️ Document légal | Tout autre document légal | Avis juridique, opinion légale |
| 📋 Autre | Autre événement corporatif | À définir selon besoin |

---

## 🛠️ Maintenance et Support

### Requêtes SQL utiles

**Compter les entrées par type:**
```sql
SELECT entry_type, COUNT(*) as count
FROM corporate_book
GROUP BY entry_type
ORDER BY count DESC;
```

**Voir les entrées sans documents:**
```sql
SELECT * FROM corporate_book
WHERE has_documents = FALSE
ORDER BY entry_date DESC;
```

**Statistiques de documents:**
```sql
SELECT
  cb.entry_type,
  COUNT(cbd.id) as document_count,
  SUM(cbd.file_size) / 1024 / 1024 as total_mb
FROM corporate_book cb
LEFT JOIN corporate_book_documents cbd ON cb.id = cbd.corporate_book_id
GROUP BY cb.entry_type;
```

### Tâches de maintenance

- **Backup mensuel:** Exporter CSV de toutes les entrées
- **Nettoyage:** Supprimer les brouillons de plus de 6 mois
- **Archivage:** Déplacer les entrées de plus de 2 ans vers statut "Archivé"
- **Audit:** Vérifier que tous les achats immobiliers ont des actes notariés attachés

---

## 🎯 Prochaines Étapes (Futures Améliorations)

- [ ] Formulaires électroniques pour conventions de commanditaire
- [ ] Signatures électroniques intégrées
- [ ] Notifications automatiques pour événements importants
- [ ] Workflow d'approbation (brouillon → approuvé → archivé)
- [ ] Intégration avec calendrier pour assemblées et réunions
- [ ] Génération automatique de rapports annuels
- [ ] Recherche full-text dans les documents PDF

---

## 📞 Support

Pour toute question ou problème:
1. Vérifiez que les scripts SQL ont bien été exécutés
2. Vérifiez que le bucket Supabase Storage existe
3. Consultez les logs du serveur Next.js
4. Consultez les erreurs dans la console du navigateur

**Date de création:** 2025-10-24
**Version:** 1.0
**Statut:** Production Ready ✅
