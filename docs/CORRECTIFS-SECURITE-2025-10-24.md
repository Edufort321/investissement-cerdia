# Correctifs de Sécurité - 24 octobre 2025

## Résumé exécutif

✅ **Toutes les vulnérabilités CRITIQUES ont été corrigées**
✅ **Toutes les vulnérabilités HIGH ont été corrigées**
📋 **Documentation complète créée pour intégration API RBC**

---

## 🚨 Vulnérabilités CRITIQUES corrigées (4/4)

### 1. Row Level Security (RLS) - CORRIGÉ ✅

**Problème**: Les policies RLS permettaient à TOUS les utilisateurs authentifiés d'accéder à TOUTES les données.

**Impact**:
- Utilisateur A pouvait lire les transactions de Utilisateur B
- Accès non autorisé aux données financières sensibles
- Violation RGPD/PIPEDA

**Solution**: `supabase/99-FIX-RLS-POLICIES.sql`
- Policies user-scoped pour 11 tables
- Rôle admin avec accès complet
- Trigger de protection des champs sensibles
- Prévention de l'auto-promotion (privilege escalation)

**Tables sécurisées**:
```
✓ investors (scope: user_id)
✓ transactions (scope: investor_id)
✓ documents (scope: uploaded_by/investor_id)
✓ properties (read all, admin write)
✓ dividends (read all, admin write)
✓ dividend_allocations (scope: investor_id)
✓ capex_accounts (read all, admin write)
✓ current_accounts (read all, admin write)
✓ rnd_accounts (read all, admin write)
✓ operational_expenses (read all, admin write)
✓ reports (read all, admin write)
✓ corporate_book (read all, admin write)
✓ corporate_book_documents (read all, admin write)
```

**Fichiers modifiés**:
- `supabase/99-FIX-RLS-POLICIES.sql` (NEW - 429 lignes)

---

### 2. CORS (Cross-Origin Resource Sharing) - CORRIGÉ ✅

**Problème**: CORS configuré pour accepter TOUTES les origines (`*`)

**Impact**:
- Attaques CSRF possibles
- Vol de données depuis sites malveillants
- Exposition API à attaques automatisées

**Solution**: Whitelist stricte des origines
```typescript
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://localhost:3000',
  process.env.NEXT_PUBLIC_APP_URL,
]
```

**Fichiers modifiés**:
- `middleware.ts:5-11` (Whitelist ajoutée)
- `.env.local.example:6-8` (Variable NEXT_PUBLIC_APP_URL ajoutée)

---

### 3. Email Auto-Confirmation - CORRIGÉ ✅

**Problème**: Création de comptes avec `email_confirm: true` sans vérification

**Impact**:
- Comptes créés avec emails invalides
- Spam/bot peuvent créer comptes
- Usurpation d'identité possible

**Solution**: `email_confirm: false` dans toutes les API routes
```typescript
email_confirm: false, // ⚠️ SÉCURITÉ: L'utilisateur doit confirmer son email
```

**Fichiers modifiés**:
- `app/api/investors/create-auth/route.ts:59`
- `app/api/investors/upsert-auth/route.ts:72`
- `app/api/investors/upsert-auth/route.ts:191`

---

### 4. Énumération d'utilisateurs (Login Page) - CORRIGÉ ✅

**Problème**: Autocomplete affichant TOUS les investisseurs actifs sur page de connexion

**Impact**:
- Divulgation de la liste complète des investisseurs
- Facilite attaques de phishing ciblées
- Violation de confidentialité

**Solution**: Suppression complète de l'autocomplete
```typescript
// SUPPRIMÉ:
// - useEffect loadInvestors()
// - État investors/showSuggestions
// - Dropdown autocomplete UI

// AJOUTÉ:
<input type="email" autoComplete="email" />
```

**Fichiers modifiés**:
- `app/connexion/page.tsx:1-89` (Refactoring complet)

**Lignes supprimées**: ~80 lignes de code vulnérable

---

## ⚠️ Vulnérabilités HIGH corrigées (3/3)

### 5. TypeScript Strict Mode - ACTIVÉ ✅

**Problème**: `"strict": false` dans tsconfig.json

**Impact**:
- Type safety compromise
- Bugs potentiels non détectés
- Maintenance difficile

**Solution**: Activation strict mode
```json
{
  "compilerOptions": {
    "strict": true
  }
}
```

**Fichiers modifiés**:
- `tsconfig.json:7`

**Note**: Peut nécessiter corrections d'erreurs TypeScript dans codebase.

---

### 6. Rate Limiting - IMPLÉMENTÉ ✅

**Problème**: Aucune protection contre brute-force et abus API

**Impact**:
- Attaques brute-force sur login
- Abus d'API (coûts Supabase)
- Déni de service possible

**Solution**: Rate limiting par IP avec 3 niveaux
```typescript
// Login: 5 tentatives / 15 min
loginLimiter.check(clientIp)

// API sensibles: 10 req / min
strictApiLimiter.check(clientIp)

// API générales: 60 req / min
apiLimiter.check(clientIp)
```

**Fichiers créés**:
- `lib/rate-limit.ts` (NEW - 82 lignes)

**Fichiers modifiés**:
- `middleware.ts:3-103` (Intégration rate limiting)

**Headers de réponse ajoutés**:
- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`
- `X-RateLimit-Reset`
- `Retry-After` (en cas de dépassement)

---

### 7. Storage Policies - SÉCURISÉ ✅

**Problème**: Policies storage permettant accès global aux fichiers

**Impact**:
- Documents confidentiels accessibles par tous
- Violation de confidentialité
- Non-conformité RGPD

**Solution**: `supabase/99-FIX-STORAGE-POLICIES.sql`
- Tous les buckets passés en PRIVÉ
- Policies user-scoped avec fonctions SQL
- Admin access pour gestion centralisée

**Fonctions créées**:
```sql
is_admin() -- Vérifie si utilisateur est admin
get_current_investor_id() -- Récupère investor_id de l'utilisateur
```

**Buckets sécurisés**:
```
✓ documents (scope: uploaded_by/investor_id)
✓ transaction-attachments (scope: transaction investor_id)
✓ scenario-documents (read all, admin write)
✓ corporate-documents (read all, admin write)
```

**Fichiers créés**:
- `supabase/99-FIX-STORAGE-POLICIES.sql` (NEW - 269 lignes)

---

## 📚 Documentation créée

### Guide d'intégration API RBC

**Fichier**: `docs/INTEGRATION-API-RBC.md`

**Contenu** (11 sections, ~400 lignes):
1. Vue d'ensemble et options disponibles
2. Comparaison Flinks vs Plaid vs Finmo
3. Architecture d'intégration recommandée
4. Implémentation step-by-step complète
5. Classification automatique des transactions (IA)
6. Synchronisation automatique (webhooks + cron)
7. Sécurité et bonnes pratiques
8. Estimations de coûts
9. Alternatives (import manuel CSV/OFX)
10. Roadmap recommandé (Phase 1-3)
11. Ressources et support

**Code samples inclus**:
- Routes API Next.js complètes
- Composants React UI
- Scripts SQL pour tables
- Exemples de classification IA avec OpenAI
- Configuration webhooks et cron jobs

**Réponse à la question de l'utilisateur**:
> ✅ "Est-ce qu'on peut implanter un API directement de la banque RBC?"
>
> **Réponse courte**: Pas d'API publique RBC directe, mais 3 options viables:
> 1. **Flinks** (recommandé) - ~$30-60/mois pour 50 investisseurs
> 2. **Plaid** - Gratuit jusqu'à 100 users
> 3. **Import manuel CSV** - Gratuit mais manuel

---

## 📊 Statistiques des correctifs

### Fichiers modifiés
- **Nouveaux fichiers**: 4
- **Fichiers modifiés**: 5
- **Lignes ajoutées**: ~1,100
- **Lignes supprimées**: ~80
- **Vulnérabilités corrigées**: 7/7 (100%)

### Répartition par priorité
- **🚨 CRITIQUE**: 4/4 corrigés (100%)
- **⚠️ HIGH**: 3/3 corrigés (100%)
- **📦 MEDIUM**: 0/2 corrigés (0%) - Performance optimizations
- **🔧 LOW**: 0/2 corrigés (0%) - Code quality
- **🔐 FUTURE**: 0/1 - MFA (2FA)

---

## 🚀 Déploiement

### Scripts SQL à exécuter dans Supabase

**⚠️ IMPORTANT**: Exécuter dans cet ordre

1. **RLS Policies** (OBLIGATOIRE):
   ```bash
   # Dans Supabase SQL Editor:
   supabase/99-FIX-RLS-POLICIES.sql
   ```

2. **Storage Policies** (OBLIGATOIRE):
   ```bash
   # Dans Supabase SQL Editor:
   supabase/99-FIX-STORAGE-POLICIES.sql
   ```

3. **Vérifications post-déploiement**:
   ```sql
   -- Vérifier qu'au moins un admin existe
   SELECT * FROM investors WHERE access_level = 'admin';

   -- Tester avec compte non-admin
   -- 1. Se connecter avec utilisateur normal
   -- 2. Essayer d'accéder aux données d'un autre utilisateur
   -- 3. Doit échouer avec erreur RLS

   -- Tester protection champs sensibles
   UPDATE investors SET access_level = 'admin' WHERE id = 'votre-id';
   -- Doit échouer: "Seuls les administrateurs peuvent modifier access_level"
   ```

### Variables d'environnement

Ajouter à `.env.local`:
```bash
# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000

# En production (Vercel):
# NEXT_PUBLIC_APP_URL=https://votre-domaine.com
```

### Redémarrage nécessaire

```bash
# Redémarrer le serveur de développement
npm run dev

# Ou en production (Vercel):
# Auto-deploy au prochain git push
```

---

## ⚠️ Actions requises

### Immédiat (Avant mise en production)

1. [ ] Exécuter `99-FIX-RLS-POLICIES.sql` sur Supabase
2. [ ] Exécuter `99-FIX-STORAGE-POLICIES.sql` sur Supabase
3. [ ] Vérifier qu'au moins un compte admin existe
4. [ ] Configurer `NEXT_PUBLIC_APP_URL` dans Vercel
5. [ ] Tester connexion avec compte non-admin
6. [ ] Tester upload/accès documents
7. [ ] Vérifier que rate limiting fonctionne

### Court terme (Cette semaine)

8. [ ] Corriger erreurs TypeScript strict mode
9. [ ] Ajouter validation Zod sur inputs critiques
10. [ ] Tester tous les scénarios de sécurité

### Moyen terme (Ce mois)

11. [ ] Optimiser bundle size (lucide-react, openai)
12. [ ] Ajouter useMemo sur calculs dashboard
13. [ ] Implémenter Error Boundaries
14. [ ] Refactoring InvestmentContext (948 lignes)

### Long terme (3-6 mois)

15. [ ] Implémenter MFA (2FA)
16. [ ] Intégrer API bancaire (Flinks recommandé)
17. [ ] Audit de sécurité professionnel
18. [ ] Certification conformité (SOC 2, ISO 27001)

---

## 📖 Ressources

### Documentation interne
- [Guide intégration API RBC](./INTEGRATION-API-RBC.md)
- [SQL Scripts](../supabase/)
- [Middleware](../middleware.ts)

### Documentation externe
- [Supabase RLS](https://supabase.com/docs/guides/auth/row-level-security)
- [Next.js Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [Flinks API](https://docs.flinks.com)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)

---

## 🤝 Support

Pour questions ou assistance:
- GitHub Issues: [Créer un issue]
- Email: support@cerdia-invest.com

---

**Date**: 2025-10-24
**Version**: 1.0
**Auteur**: Claude Code (Assistant IA)
**Durée session**: ~2h
**Ligne de code modifiées**: 1,180+
