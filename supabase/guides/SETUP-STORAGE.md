# 📦 Configuration Supabase Storage - Buckets

## 🎯 Buckets à créer dans Supabase Dashboard

### 1. **documents** (Déjà existant)
**But:** Stocker les documents des investisseurs (contrats, pièces d'identité, etc.)

### 2. **transaction-attachments** ⚠️ À CRÉER
**But:** Stocker les pièces jointes des transactions (factures, reçus, justificatifs)

### 3. **property-attachments** ⚠️ À CRÉER
**But:** Stocker les fichiers liés aux propriétés (photos, plans, contrats, rapports)

---

## 🔧 Comment créer un bucket

### Étape 1: Accéder à Supabase Storage
1. Aller sur https://supabase.com/dashboard
2. Sélectionner votre projet CERDIA
3. Dans le menu de gauche, cliquer sur **Storage**

### Étape 2: Créer le bucket `transaction-attachments`
1. Cliquer sur **New bucket**
2. Nom: `transaction-attachments`
3. **Public bucket:** ❌ NON (privé, accessible uniquement aux utilisateurs authentifiés)
4. **File size limit:** 10 MB
5. **Allowed MIME types:** (laisser vide pour tout accepter, ou spécifier)
   - `application/pdf`
   - `image/jpeg`
   - `image/png`
   - `image/webp`
   - `application/vnd.openxmlformats-officedocument.wordprocessingml.document` (DOCX)
   - `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` (XLSX)
6. Cliquer sur **Create bucket**

### Étape 3: Créer le bucket `property-attachments`
Répéter les mêmes étapes avec le nom `property-attachments`

---

## 🔐 Row Level Security (RLS) Policies

### Pour `transaction-attachments`

#### Policy 1: **Select (Read)**
```sql
CREATE POLICY "Users can view transaction attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'transaction-attachments');
```

#### Policy 2: **Insert (Upload)**
```sql
CREATE POLICY "Users can upload transaction attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'transaction-attachments');
```

#### Policy 3: **Delete**
```sql
CREATE POLICY "Users can delete transaction attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'transaction-attachments');
```

---

### Pour `property-attachments`

#### Policy 1: **Select (Read)**
```sql
CREATE POLICY "Users can view property attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'property-attachments');
```

#### Policy 2: **Insert (Upload)**
```sql
CREATE POLICY "Users can upload property attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'property-attachments');
```

#### Policy 3: **Delete**
```sql
CREATE POLICY "Users can delete property attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'property-attachments');
```

---

## 📋 Vérification

### SQL pour vérifier les buckets créés
```sql
SELECT * FROM storage.buckets;
```

### SQL pour vérifier les policies
```sql
SELECT * FROM pg_policies WHERE tablename = 'objects';
```

---

## 🎯 Structure des chemins (paths)

### transaction-attachments
```
transaction-attachments/
  └── {transaction_id}/
      ├── invoice_2025-01-15.pdf
      ├── receipt_001.jpg
      └── contract_signed.pdf
```

### property-attachments
```
property-attachments/
  └── {property_id}/
      ├── photos/
      │   ├── exterior_front.jpg
      │   ├── interior_living.jpg
      │   └── view.jpg
      ├── plans/
      │   └── floor_plan.pdf
      └── contracts/
          └── purchase_agreement.pdf
```

---

## ✅ Checklist

- [ ] Bucket `transaction-attachments` créé
- [ ] Bucket `property-attachments` créé
- [ ] RLS policies `transaction-attachments` appliquées (3 policies)
- [ ] RLS policies `property-attachments` appliquées (3 policies)
- [ ] Test upload fichier
- [ ] Test download fichier
- [ ] Test delete fichier

---

## 🔗 Documentation Supabase Storage
https://supabase.com/docs/guides/storage
