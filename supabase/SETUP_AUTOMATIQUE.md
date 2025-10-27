# 🤖 Configuration Automatique du Storage

## ⚠️ MÉTHODE RECOMMANDÉE: SCRIPT SQL 47

**La méthode recommandée pour créer le bucket voyage-photos est d'utiliser le script SQL 47** qui crée automatiquement TOUS les buckets de l'application d'un seul coup.

Voir la section "Méthode SQL (Recommandée)" ci-dessous.

---

## 🎯 Objectif

Créer automatiquement le bucket `voyage-photos` avec les bonnes configurations.

## 🚀 Méthodes disponibles

### ✅ Méthode 1: Script SQL 47 (RECOMMANDÉE)

**Avantage:** Crée TOUS les buckets (5 au total) d'un seul coup via SQL.

1. **Ouvrir Supabase Dashboard**
   ```
   https://app.supabase.com
   → Sélectionnez votre projet
   → SQL Editor
   ```

2. **Exécuter le script 47**
   ```
   SQL Editor → New query
   → Copiez-collez: supabase/47-create-all-storage-buckets.sql
   → RUN ▶️
   ```

3. **✅ Terminé!**
   - 5 buckets créés automatiquement
   - `voyage-photos` est maintenant disponible

**Vérifier que voyage-photos existe:**
```sql
SELECT * FROM public.check_voyage_photos_bucket();
```

---

### Méthode 2: Script TypeScript (Alternative)

**Avantage:** Peut être automatisé dans CI/CD.

#### Prérequis

1. Obtenir la clé Service Role:
   - https://app.supabase.com
   - Settings > API
   - Copiez la clé **service_role** (⚠️ secret!)

2. Configurer `.env.local`:
   ```env
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...votre_cle_ici
   ```

#### Exécution

```bash
npm run setup:storage
```

Ou directement:
```bash
npx ts-node supabase/setup-storage.ts
```

#### Que fait le script?

1. ✅ Vérifie si le bucket existe déjà
2. ✅ Crée le bucket `voyage-photos` si nécessaire
3. ✅ Configure:
   - Type: Privé (non public)
   - Taille max: 5 MB
   - Types autorisés: JPEG, PNG, WebP, PDF
4. ℹ️ Affiche les instructions pour les policies

## 📝 Après l'exécution

**✅ Avec la méthode SQL 47:**
- Le bucket est créé automatiquement
- Exécutez ensuite la migration 014 pour créer les policies automatiquement

**Avec la méthode TypeScript:**
- Le bucket est créé par le script
- Vous devez ensuite exécuter manuellement la migration 014 pour les policies

**Migration 014 (policies automatiques):**
```sql
-- Dans SQL Editor, exécutez:
migrations/014_create_voyage_photos_policies.sql
```

Cela créera automatiquement les 4 policies:
- ✅ INSERT (upload)
- ✅ SELECT (download - uniquement SES photos)
- ✅ UPDATE (modification métadonnées)
- ✅ DELETE (suppression - uniquement SES photos)

## 🐛 Dépannage

### Erreur: "Variables d'environnement manquantes"

➡️ Assurez-vous que `.env.local` contient:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### Erreur: "Bucket already exists"

➡️ C'est normal! Le bucket existe déjà, rien à faire.

### Erreur: "Permission denied"

➡️ Vérifiez que la clé `SUPABASE_SERVICE_ROLE_KEY` est correcte.

## ⏱️ Temps estimé

**Méthode SQL (recommandée):**
- 30 secondes pour le script 47 (bucket)
- 10 secondes pour la migration 014 (policies)
- **Total: moins d'1 minute** ⚡

**Méthode TypeScript:**
- 30 secondes pour npm run setup:storage
- 10 secondes pour la migration 014
- **Total: moins d'1 minute**

## 🎉 Résultat

Après exécution, vous aurez:

- ✅ Bucket `voyage-photos` créé automatiquement
- ✅ Configuration correcte (privé, 5 MB max)
- ✅ Policies créées automatiquement (INSERT, SELECT, UPDATE, DELETE)
- ✅ Sécurité: Chaque utilisateur accède uniquement à SES photos

## 📚 Fichiers créés

- `supabase/setup-storage.ts` - Script TypeScript
- `supabase/migrations/013_create_storage_bucket.sql` - Migration SQL (référence)
- `package.json` - Script npm ajouté

---

**Prêt?** Lancez: `npm run setup:storage`
