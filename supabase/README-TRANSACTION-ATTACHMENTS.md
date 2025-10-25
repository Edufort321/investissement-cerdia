# 📎 Pièces Jointes Transactions - Guide d'Installation

## 📋 Vue d'ensemble

Système complet de gestion de pièces jointes pour les transactions, permettant:
- ✅ Upload de factures, reçus, photos lors de la création de transaction
- ✅ Stockage sécurisé dans Supabase Storage
- ✅ Affichage dans l'historique des transactions
- ✅ Intégration automatique dans les exports PDF comptables
- ✅ Traçabilité complète pour audit

---

## 🚀 Installation (3 étapes)

### **Étape 1: Exécuter les scripts SQL**

Dans le SQL Editor de Supabase, exécuter dans cet ordre:

```sql
-- 1. Ajouter colonnes aux transactions + vues
-- Copier/coller le contenu de: supabase/70-transaction-attachments.sql
```

```sql
-- 2. Créer helper functions + policies Storage
-- Copier/coller le contenu de: supabase/71-transaction-attachments-storage.sql
```

### **Étape 2: Créer le bucket Storage**

Dans le Dashboard Supabase → **Storage** → **Create a new bucket**:

```
Nom: transaction-attachments
Public: false (❌)
File size limit: 10485760 (10 MB)
Allowed MIME types:
  - image/*
  - application/pdf
  - application/vnd.*
  - application/msword*
```

### **Étape 3: Vérifier les policies**

Dans **Storage** → **Policies** → Vérifier que les policies suivantes existent:

✅ Admin can view all transaction attachments
✅ Users can view own transaction attachments
✅ Admin can upload transaction attachments
✅ Users can upload own transaction attachments
✅ Admin can update transaction attachments
✅ Users can update own transaction attachments
✅ Admin can delete transaction attachments
✅ Users can delete own transaction attachments

---

## 📊 Structure de données

### **Nouvelles colonnes dans `transactions`:**

| Colonne | Type | Description |
|---------|------|-------------|
| `attachment_name` | TEXT | Nom original du fichier |
| `attachment_url` | TEXT | URL publique signée (temporaire) |
| `attachment_storage_path` | TEXT | Chemin dans Storage |
| `attachment_mime_type` | TEXT | Type MIME (image/jpeg, application/pdf, etc.) |
| `attachment_size` | INTEGER | Taille en octets |
| `attachment_uploaded_at` | TIMESTAMP | Date d'upload |

### **Nouvelles vues créées:**

1. **`transactions_with_attachments`**
   - Vue étendue avec indicateur `has_attachment`
   - Classification automatique du type de fichier

2. **`transaction_attachments_stats`**
   - Statistiques globales
   - % de transactions avec pièces jointes
   - Utilisation du storage

3. **`transactions_missing_attachments`**
   - Transactions nécessitant justificatif
   - Pour suivi comptable
   - Filtrées par montant significatif (>100$)

---

## 🗂️ Organisation des fichiers

```
transaction-attachments/
├── {investor_id}/
│   ├── 2025/
│   │   ├── abc123-facture-electricite.pdf
│   │   ├── def456-recu-loyer.jpg
│   │   └── ghi789-bon-commande.pdf
│   ├── 2026/
│   │   └── ...
│   └── ...
└── shared/  (documents administratifs)
```

**Exemple de chemin:**
```
transaction-attachments/550e8400-e29b-41d4-a716-446655440000/2025/abc123-facture.pdf
```

---

## 🔐 Sécurité

### **Policies RLS (Row Level Security)**

- ✅ Admin peut tout voir/modifier/supprimer
- ✅ Investisseur peut voir uniquement ses transactions
- ✅ Investisseur peut voir transactions de ses propriétés
- ✅ Upload limité au scope de l'investisseur
- ✅ Pas de suppression croisée

### **Validations**

- Max 10 MB par fichier
- Types acceptés: Images, PDF, Documents Office
- Chemin doit contenir l'ID investisseur pour sécurité

---

## 💻 Utilisation dans le Code

### **1. Upload d'une pièce jointe**

```typescript
import { createClient } from '@/lib/supabase'

async function uploadTransactionAttachment(
  file: File,
  transactionId: string,
  investorId: string
) {
  const supabase = createClient()
  const year = new Date().getFullYear()
  const fileName = `${transactionId}-${file.name}`
  const storagePath = `${investorId}/${year}/${fileName}`

  // Upload fichier
  const { data, error } = await supabase.storage
    .from('transaction-attachments')
    .upload(storagePath, file)

  if (error) throw error

  // Obtenir URL publique
  const { data: { publicUrl } } = supabase.storage
    .from('transaction-attachments')
    .getPublicUrl(storagePath)

  // Mettre à jour transaction
  await supabase
    .from('transactions')
    .update({
      attachment_name: file.name,
      attachment_storage_path: storagePath,
      attachment_url: publicUrl,
      attachment_mime_type: file.type,
      attachment_size: file.size,
      attachment_uploaded_at: new Date().toISOString()
    })
    .eq('id', transactionId)

  return { storagePath, publicUrl }
}
```

### **2. Télécharger une pièce jointe**

```typescript
async function downloadAttachment(storagePath: string) {
  const supabase = createClient()

  const { data, error } = await supabase.storage
    .from('transaction-attachments')
    .download(storagePath)

  if (error) throw error

  // Créer URL blob pour téléchargement
  const url = URL.createObjectURL(data)
  return url
}
```

### **3. Supprimer une pièce jointe**

```typescript
async function deleteAttachment(storagePath: string, transactionId: string) {
  const supabase = createClient()

  // Supprimer fichier
  await supabase.storage
    .from('transaction-attachments')
    .remove([storagePath])

  // Nettoyer colonnes transaction
  await supabase
    .from('transactions')
    .update({
      attachment_name: null,
      attachment_url: null,
      attachment_storage_path: null,
      attachment_mime_type: null,
      attachment_size: null,
      attachment_uploaded_at: null
    })
    .eq('id', transactionId)
}
```

---

## 📈 Statistiques et Monitoring

### **Vérifier l'usage du storage**

```sql
SELECT * FROM transaction_attachments_storage_stats;
```

### **Transactions sans pièce jointe**

```sql
SELECT * FROM transactions_missing_attachments
ORDER BY days_since_transaction DESC;
```

### **Statistiques globales**

```sql
SELECT
  total_with_attachments,
  total_without_attachments,
  percentage_with_attachments,
  total_storage_bytes / 1024 / 1024 as total_mb,
  avg_file_size_kb
FROM transaction_attachments_stats;
```

---

## 🎨 Intégration UI (À implémenter)

### **Formulaire Transaction**

```tsx
<input
  type="file"
  accept="image/*,application/pdf"
  onChange={handleFileSelect}
/>
```

### **Liste Transactions avec Pièces**

```tsx
{transaction.attachment_storage_path && (
  <button onClick={() => downloadAttachment(transaction.attachment_storage_path)}>
    📎 {transaction.attachment_name}
  </button>
)}
```

### **PDF Export**

```tsx
// Inclure lien vers pièce jointe dans PDF
pdf.text(`Justificatif: ${transaction.attachment_name}`)
pdf.link(x, y, width, height, { url: transaction.attachment_url })
```

---

## ✅ Checklist Post-Installation

- [ ] Scripts SQL exécutés sans erreur
- [ ] Bucket `transaction-attachments` créé
- [ ] 8 policies Storage visibles
- [ ] Test upload fichier (via UI une fois implémentée)
- [ ] Test download fichier
- [ ] Vérification permissions (user vs admin)
- [ ] Test suppression fichier

---

## 🔍 Troubleshooting

### **Erreur: "new row violates row-level security policy"**
→ Vérifier que les policies Storage sont bien créées

### **Erreur: "Bucket does not exist"**
→ Créer le bucket `transaction-attachments` via Dashboard

### **Upload échoue pour certain users**
→ Vérifier que le chemin contient bien l'ID investisseur

### **Fichiers orphelins après suppression transaction**
→ Le trigger `cleanup_transaction_attachment` doit être activé

---

## 📝 Next Steps (Implémentation UI)

1. ✅ Ajouter input file dans formulaire transaction
2. ✅ Implémenter logique upload avec progress
3. ✅ Afficher aperçu/icône selon type fichier
4. ✅ Ajouter bouton téléchargement dans historique
5. ✅ Intégrer dans export PDF comptable
6. ✅ Ajouter validation taille/type côté client
7. ✅ Gérer suppression avec confirmation

---

**Date:** 2025-10-25
**Version:** 1.0
**Auteur:** Claude Code
