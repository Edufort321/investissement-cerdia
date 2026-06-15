# CLAUDE.md — Mémoire projet (lue automatiquement au démarrage)

## Identité du projet
- **Nom** : CERDIA (plateforme investissement + Commerce CERDIA). Agrégateur parent de C-Secur360.
- **Prod** : https://www.cerdia.ai — **Déploiement Vercel** (auto sur push).
- **Repo** : github.com/Edufort321/investissement-cerdia — **branche `main`**.
- **Stack** : Next.js (App Router) + Supabase (Postgres + Auth + RLS + Storage) + TailwindCSS. Langue : **français**.
- **Supabase** : projet `svwolnvknfmakgmjhoml` (DISTINCT de C-Secur360). Service role = serveur seulement.
- **Admin Commerce** : `/commerce/admin` (onglets Produits, Transactions, …, C-Secur360, Livre d'entreprise, Admins, Guide opérateur).

## Rôles & cloisonnement (important)
- `super_admin` (Eric) = tout. `org_commerce` = **accès complet à l'admin Commerce** SAUF la **zone investisseur** (bloquée par `CommerceRoleGuard`).
- **Pont C-Secur360 ↔ CERDIA** : les données (produits/finance/admins) **REMONTENT vers CERDIA** ; 2 Supabase distincts. Endpoints `/api/commerce/csecur360/*` (auth = secret de pont OU session admin via `requireAdminToken`). Le Livre d'entreprise est **cloisonné par `organization_id`** (CERDIA Globale).

## Qui travaille ? (à demander au début)
- **Eric** : connaît tout, va vite. **Benjamin** (associé) : consignes claires pas-à-pas (voir onglet **« Guide opérateur »** dans /commerce/admin), surtout migrations et déploiement.

## Règles non négociables
- **RLS obligatoire** sur toute nouvelle table. service_role jamais appelé côté client.
- **Jamais `git push` ni migration en prod sans l'accord d'Eric.**
- **Migrations** : appliquées en **collant le SQL dans l'éditeur SQL du BON projet Supabase** (`svwolnvknfmakgmjhoml` pour CERDIA), puis Run (PAS `supabase db push`). Fichiers idempotents dans `supabase/migrations-investisseur/`.
- ⚠️ Ce repo a souvent des fichiers modifiés non commités (ProjetTab, InvestmentContext, sw.js) → **ne committer QUE les fichiers ciblés**, jamais `git add -A` à l'aveugle.
- **Type-check `npx tsc --noEmit` avant de pousser.**

## Synchronisation Git (jamais de zip)
Le code de référence est sur **GitHub**, pas un zip. **Au début d'une session : `git pull`** pour partir de la dernière version, et `git push` (fichiers ciblés) sur `main` avec l'accord d'Eric. Nouveau portable = installer Node/Git/Claude Code + `gh auth login`, puis `git clone` une fois ; ensuite pull/push fonctionnent (push exige l'auth GitHub).

## Workflow à l'arrivée sur une tâche
0. **`git pull`** d'abord (partir de la dernière version).
1. Lire ce CLAUDE.md (+ la mémoire persistante de la session si présente).
2. Explorer `app/`, `app/commerce/admin/`, `supabase/migrations-investisseur/`, `lib/`, `components/`.
3. Demander : « **DÉPANNAGE ou DÉVELOPPEMENT** ? », attendre la consigne, proposer un plan.
4. Commiter (fichiers ciblés), pousser sur `main` sur accord, tenir la mémoire à jour.

## Emplacements clés
- Admin commerce : `app/commerce/admin/page.tsx` + `components/admin/*Tab.tsx`.
- Auth admin : `lib/auth/require-admin-token.ts`, `lib/auth/commerce-auth.ts`.
- Migrations : `supabase/migrations-investisseur/`. Env : `.env.local` (jamais commit).
