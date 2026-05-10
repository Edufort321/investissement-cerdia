# Plan d'intégration — Agent autonome Amazon

**Source du design** : skill `C:\CERDIA\cerdia-commerce` (3 modes Manual / Conversational / Autonomous, 5 règles + IA, queue d'approbation).
**Cible** : `/commerce/admin/agent/*` dans `investissement-cerdia-main`.
**Statut Amazon d'Eric** : vendeur Seller Central actif (FBA).
**Date du plan** : 2026-05-10.

## Décisions Phase 0 (validées 2026-05-10)

- **Vercel Pro** ✓ (5 min max, crons illimités — OK)
- **Marketplace** : Canada uniquement (`A2EUQ1WTGCTBG2`). Pas de multi-marketplace pour l'instant. Le code reste filtré par `marketplace_id` au cas où on ajoute US plus tard, mais pas de complexité multi-régions API.
- **Rôles admin** : créer table `profiles` avec `role IN ('owner','admin','investor','viewer')`. Eric = `owner`. Le mot de passe partagé de `/commerce/admin` est remplacé par `requireAdmin()`.
- **Accès Amazon** : aucun secret en main → suivre `PHASE-0-CHECKLIST.md` avant Phase 1. Compte ~1-2h de travail Eric + 1-3 jours d'attente d'approbation Amazon.

---

## Vue d'ensemble

Le skill est solide mais suppose une intégration Amazon Seller existante. L'app actuelle ne fait que de l'affiliation (`commerce_products.amazon_url` = lien sortant). **80% du chantier est l'intégration Amazon en amont**, pas l'agent lui-même.

```
Phase 0 — Décisions & prérequis            (½ jour, bloquant)
Phase 1 — Préparation du terrain           (1-2 jours)
Phase 2 — Intégration Amazon Seller        (1-2 semaines, le gros morceau)
Phase 3 — Agent : analyse + inbox manual   (3-5 jours)
Phase 4 — Mode conversationnel             (2-3 jours)
Phase 5 — Mode autonomous + observabilité  (2-3 jours)
```

**Total réaliste** : 3-5 semaines de dev focalisé. La courbe de valeur est lente puis brutale : rien ne marche jusqu'à fin Phase 3, ensuite l'agent monte vite.

---

## Phase 0 — Décisions & prérequis (½ jour, BLOQUANT)

À valider avant d'écrire une ligne de code. Ces choix conditionnent toute la suite.

### 0.1 — Comptes et accès Amazon

- [ ] **Seller Central (SP-API)** : application "Selling Partner" déclarée dans Seller Central → Developer Console → app privée. Récupérer `LWA_APP_ID`, `LWA_CLIENT_SECRET`. Générer un **refresh token** via le flow OAuth (one-time).
- [ ] **AWS IAM** : créer un IAM user pour SP-API SigV4 ou utiliser un rôle assumé (`AMAZON_ROLE_ARN`). Récupérer `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`.
- [ ] **Advertising API** : déclarer une app dans Amazon Ads Console → app privée. Récupérer `AMAZON_ADS_CLIENT_ID`, `AMAZON_ADS_CLIENT_SECRET`. Générer un refresh token Ads (séparé du Seller).
- [ ] **Profile ID Ads** : `GET /v2/profiles` une fois pour récupérer le `profileId` du marketplace CA (`A2EUQ1WTGCTBG2`).
- [ ] **Marketplace** : le skill assume CA seul. Si tu vendras aussi US (`ATVPDKIKX0DER`), le préciser maintenant — tout le code multi-marketplace doit être pensé dès le départ (sinon refactor douloureux).

> **Si l'un de ces 5 items n'est pas prêt**, on ne peut pas exécuter Phase 2. C'est le chemin critique.

### 0.2 — Décisions techniques à arrêter

| Décision | Recommandation | Pourquoi |
|---|---|---|
| **Modèle de rôle admin** | Créer `profiles` avec `role IN ('owner','admin','investor')` | Le skill suppose ce pattern. L'app actuelle utilise un mot de passe partagé côté client pour `/commerce/admin` — pas viable pour l'agent (qui exécute des actions traçables par utilisateur). |
| **Stockage des prix** | Garder `numeric(10,2)` pour `commerce_products` (vitrine) ; **utiliser `integer cents` pour les nouvelles tables `amazon_*`** | Conformité au skill + standard Amazon. Pas de migration douloureuse de la vitrine. |
| **Couche IA** | Anthropic SDK (`@anthropic-ai/sdk`), modèle `claude-opus-4-7` | Le skill l'exige. `openai` reste pour les autres modules (génération d'image, scan reçu). |
| **UI** | Continuer Tailwind pur, pas de shadcn | L'app n'utilise pas shadcn. Réécrire les snippets du skill en Tailwind direct. |
| **Tables** | Composants tabulaires custom, pas `@tanstack/react-table` | Pas dans `package.json`. Pour des inbox triables on peut s'en passer ; à ré-évaluer plus tard. |
| **Préfixe des tables** | `amazon_*` (comme dans le skill) | Cohabite proprement avec `commerce_*` existant. |
| **Crons** | Vercel Cron Jobs (créer `vercel.json` à la racine) | Pas de cron actuel ; Vercel Pro le permet, déjà utilisé pour le déploiement. |

### 0.3 — Refactor préalable de `app/commerce/admin/page.tsx`

**Le fichier fait 1989 lignes single-file.** Y rajouter l'agent serait du suicide. Avant Phase 3 :

- [ ] Découper en sous-routes : `commerce/admin/produits`, `commerce/admin/transactions`, `commerce/admin/factures-gmail`, `commerce/admin/agent`. Le `page.tsx` actuel devient un index avec navigation.
- [ ] Extraire les composants (`ProductsTab`, `TransactionsTab`, `GmailInvoicesTab`) dans `components/commerce/admin/`.
- [ ] Garder la rétrocompat : URL `/commerce/admin` redirige vers `/commerce/admin/produits`.

**Estimé** : 1 jour. À planifier dans Phase 1.

---

## Phase 1 — Préparation du terrain (1-2 jours)

### 1.1 — Auth & rôles

- Migration SQL `138-create-profiles-roles.sql` :
  ```sql
  CREATE TABLE IF NOT EXISTS profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role text NOT NULL DEFAULT 'investor' CHECK (role IN ('owner','admin','investor','viewer')),
    full_name text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );
  ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
  -- Self-read + admin read all
  CREATE POLICY "self_read_profile" ON profiles FOR SELECT TO authenticated USING (id = auth.uid());
  CREATE POLICY "admin_rw_profiles" ON profiles FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('owner','admin')));
  -- Trigger : créer un profile à l'inscription
  CREATE OR REPLACE FUNCTION handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
  BEGIN INSERT INTO profiles (id, full_name) VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name'); RETURN NEW; END; $$;
  CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();
  ```
- Helper `lib/auth/admin.ts` :
  ```ts
  export async function requireAdmin(supabase) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('unauthorized')
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (!['owner','admin'].includes(profile?.role)) throw new Error('forbidden')
    return { user, role: profile.role }
  }
  ```
- Seed `eric.dufort@cerdia.ai` en `role='owner'` (one-shot SQL).
- Remplacer le mot de passe partagé de `/commerce/admin` par `requireAdmin()` au niveau du layout.

### 1.2 — Dépendances

```bash
npm install @anthropic-ai/sdk
```

`.env.local` ajouter :
```
ANTHROPIC_API_KEY=sk-ant-...
AMAZON_LWA_APP_ID=...
AMAZON_LWA_CLIENT_SECRET=...
AMAZON_ADS_CLIENT_ID=...
AMAZON_ADS_CLIENT_SECRET=...
AMAZON_REFRESH_TOKEN_ENCRYPTION_KEY=    # 32 bytes hex (généré avec openssl rand -hex 32)
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AMAZON_ROLE_ARN=arn:aws:iam::...
AMAZON_SELLER_ID=...
AMAZON_MARKETPLACE_ID=A2EUQ1WTGCTBG2
CRON_SECRET=                             # openssl rand -hex 32
ADMIN_API_TOKEN=                         # openssl rand -hex 32
```

Mettre à jour `.env.local.example` (sans valeurs).

### 1.3 — Structure de dossiers (création vide)

```
app/
  api/commerce/agent/
    analyze/route.ts          # squelette (501 not_implemented)
    execute/route.ts
    reject/route.ts
    chat/route.ts
    settings/route.ts
  api/amazon/                 # tout ce qui parle à Amazon vit ici
    sync/listings/route.ts
    sync/orders/route.ts
    sync/ads-keywords/route.ts
    sync/search-terms/route.ts
    sync/inventory/route.ts
  commerce/admin/agent/
    inbox/page.tsx
    chat/page.tsx
    history/page.tsx
    settings/page.tsx
    settings/policies/page.tsx
    layout.tsx                # nav latérale + requireAdmin

lib/
  amazon/
    sp-api-client.ts
    ads-api-client.ts
    crypto.ts                 # AES-256-GCM pour refresh tokens
    rate-limiter.ts           # token bucket par endpoint
  commerce/agent/
    types.ts
    analyze.ts
    guards.ts
    policy-matcher.ts
    rules/
      index.ts
      bid-bleeder.ts
      bid-high-acos.ts
      bid-winner.ts
      negative-harvest.ts
      price-adjust.ts
      ai-analyzer.ts
    executors/
      index.ts
      update-bid.ts
      add-negative.ts
      update-price.ts
    chat-tools.ts
```

### 1.4 — `vercel.json` (squelette)

```json
{
  "crons": [
    { "path": "/api/amazon/sync/orders",        "schedule": "0 * * * *" },
    { "path": "/api/amazon/sync/listings",      "schedule": "0 */6 * * *" },
    { "path": "/api/amazon/sync/inventory",     "schedule": "0 */3 * * *" },
    { "path": "/api/amazon/sync/ads-keywords",  "schedule": "30 */4 * * *" },
    { "path": "/api/amazon/sync/search-terms",  "schedule": "0 5 * * *" },
    { "path": "/api/commerce/agent/analyze",    "schedule": "0 6 * * *" }
  ]
}
```

> Vercel Pro requis (5 min max duration, crons illimités). À vérifier que l'abonnement actuel le couvre.

### 1.5 — Refactor du `commerce/admin/page.tsx` (voir 0.3)

---

## Phase 2 — Intégration Amazon Seller (1-2 semaines, GROS MORCEAU)

C'est ici qu'on construit le vrai pipeline de données. Sans ça, l'agent n'a rien à analyser.

### 2.1 — Stockage chiffré des credentials

Migration `139-amazon-credentials.sql` :
```sql
CREATE TABLE amazon_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  marketplace_id text NOT NULL UNIQUE,
  seller_id text NOT NULL,
  ads_profile_id bigint,
  -- Refresh tokens chiffrés AES-256-GCM
  sp_api_refresh_token_encrypted bytea NOT NULL,
  ads_api_refresh_token_encrypted bytea NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE amazon_credentials ENABLE ROW LEVEL SECURITY;
-- Aucune lecture par authenticated. Seul service_role.
```

Helper `lib/amazon/crypto.ts` :
- `encrypt(plain: string): Buffer` et `decrypt(buf: Buffer): string` avec `AMAZON_REFRESH_TOKEN_ENCRYPTION_KEY` (32 bytes hex).
- IV aléatoire 12 bytes, AuthTag 16 bytes, format de stockage : `iv ‖ authTag ‖ ciphertext`.

### 2.2 — Clients API

`lib/amazon/sp-api-client.ts` :
- `SpApiClient.fromSupabase(marketplaceId)` → charge credentials, refresh access token (cache 1h en mémoire), retourne instance.
- `client.request(method, path, { query, body, headers })` avec SigV4 sign + retry sur 429 + backoff exponentiel.
- Rate limiter par endpoint (token bucket, voir tableau dans `references/sp-api-patterns.md`).

`lib/amazon/ads-api-client.ts` :
- Plus simple : pas de SigV4, juste bearer token + 3 headers obligatoires.
- `client.request('POST', '/sp/keywords', { contentType, body })` avec respect de `Retry-After` sur 429.

### 2.3 — Tables sources (schéma minimal pour l'agent)

Migration `140-amazon-sources-schema.sql` :

```sql
-- État de synchronisation
CREATE TABLE amazon_sync_state (
  resource text PRIMARY KEY,           -- 'orders' | 'listings' | 'ads_keywords' | etc.
  last_attempted_at timestamptz,
  last_completed_at timestamptz,
  last_error text,
  is_running boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb   -- pour reportId async, etc.
);

-- Listings (catalogue + prix + stock + Buy Box)
CREATE TABLE amazon_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  marketplace_id text NOT NULL,
  asin text NOT NULL,
  sku text NOT NULL,
  title text,
  price_cents integer,
  buy_box_winner boolean,
  fulfillable_quantity integer,
  rating numeric(3,2),
  review_count integer,
  -- Garde-fous de prix (à remplir manuellement par produit)
  cogs_cents integer,
  price_min_cents integer,
  price_max_cents integer,
  map_price_cents integer,
  min_margin_pct numeric(5,2) DEFAULT 20.0,
  -- Estimation FBA fees
  fba_fees_cents integer,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (marketplace_id, sku)
);
CREATE INDEX idx_amazon_listings_asin ON amazon_listings (asin);

-- Ads keywords (avec metrics 30j agrégées)
CREATE TABLE amazon_ads_keywords (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  marketplace_id text NOT NULL,
  campaign_id bigint NOT NULL,
  ad_group_id bigint NOT NULL,
  keyword_id bigint NOT NULL,
  keyword_text text NOT NULL,
  match_type text NOT NULL,            -- BROAD | PHRASE | EXACT
  state text NOT NULL,                 -- enabled | paused | archived
  bid_cents integer NOT NULL,
  -- Metrics rolling 30j (mises à jour par le sync)
  clicks_30d integer DEFAULT 0,
  impressions_30d integer DEFAULT 0,
  spend_cents_30d integer DEFAULT 0,
  orders_30d integer DEFAULT 0,
  sales_cents_30d integer DEFAULT 0,
  acos_30d numeric(5,2),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (marketplace_id, keyword_id)
);
CREATE INDEX idx_amazon_kw_state ON amazon_ads_keywords (state);
CREATE INDEX idx_amazon_kw_acos ON amazon_ads_keywords (acos_30d);

-- Search terms report (par jour, par campagne)
CREATE TABLE amazon_search_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  marketplace_id text NOT NULL,
  date date NOT NULL,
  campaign_id bigint NOT NULL,
  ad_group_id bigint NOT NULL,
  keyword_id bigint,                   -- peut être NULL si search term sans keyword
  keyword_text text,
  match_type text,
  search_term text NOT NULL,
  impressions integer,
  clicks integer,
  spend_cents integer,
  orders_7d integer,
  sales_cents_7d integer,
  UNIQUE (marketplace_id, date, campaign_id, ad_group_id, keyword_id, search_term)
);
CREATE INDEX idx_search_terms_date ON amazon_search_terms (date DESC);
CREATE INDEX idx_search_terms_term ON amazon_search_terms (search_term);

-- Orders (pour cross-ref avec listings)
CREATE TABLE amazon_orders (
  amazon_order_id text PRIMARY KEY,
  marketplace_id text NOT NULL,
  purchase_date timestamptz NOT NULL,
  order_status text,
  order_total_cents integer,
  currency text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE amazon_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  amazon_order_id text REFERENCES amazon_orders(amazon_order_id),
  asin text NOT NULL,
  sku text,
  quantity integer NOT NULL,
  item_price_cents integer,
  UNIQUE (amazon_order_id, asin, sku)
);
```

### 2.4 — Routes de sync (5 crons)

Pour chacune, suivre le pattern de `references/sp-api-patterns.md` (auth via `CRON_SECRET`, idempotence via `dedupe_key`/upsert, mise à jour de `amazon_sync_state`).

Ordre d'implémentation (du plus simple au plus complexe) :
1. **`/api/amazon/sync/listings`** — appel synchrone simple. *0.5 j.*
2. **`/api/amazon/sync/orders`** — appel synchrone, paginé. *1 j.*
3. **`/api/amazon/sync/inventory`** — synchrone. *0.5 j.*
4. **`/api/amazon/sync/ads-keywords`** — Ads API simple, batch. *1 j.*
5. **`/api/amazon/sync/search-terms`** — **report async** (request → poll → download → parse GZIP+TSV). *2-3 j.* C'est le plus complexe — voir le pattern dans `references/cron-patterns.md`.

### 2.5 — UI simple de monitoring sync

`/commerce/admin/agent/sync-status` (server component) :
- Lit `amazon_sync_state`, affiche par resource : dernière exécution OK, dernière erreur.
- Bouton "Forcer la sync" (manuel, via `Bearer ADMIN_API_TOKEN`).

> **Critère de fin de Phase 2** : tu peux ouvrir Supabase Studio, voir tes vrais ASIN dans `amazon_listings`, tes vrais keywords dans `amazon_ads_keywords` avec leurs metrics 30j non-nulles, et 14j de search terms dans `amazon_search_terms`. Sans ça, Phase 3 n'a aucun sens.

---

## Phase 3 — Agent : analyse + inbox manual (3-5 jours)

À ce stade tu as les données. On construit le squelette de l'agent en mode `manual` uniquement (pas de chat, pas d'autonomous).

### 3.1 — Schéma de l'agent

Migration `141-agent-schema.sql` (voir `references/agent-schema.md` pour le détail complet) :
- `amazon_pending_actions`
- `amazon_optimization_log`
- `amazon_agent_settings` avec seed des 5 règles `enabled=false`

### 3.2 — Code de l'agent

- `lib/commerce/agent/types.ts` — contrat `ProposedAction` (voir `references/agent-architecture.md`).
- `lib/commerce/agent/guards.ts` — `passesHardGuards()` (bid 0.20-5$, marge mini, MAP, min/max).
- `lib/commerce/agent/rules/` — implémenter dans cet ordre :
  1. `bid-bleeder` (le plus simple, signal le plus clair). *0.5 j.*
  2. `negative-harvest`. *0.5 j.*
  3. `bid-high-acos`. *0.5 j.*
  4. `bid-winner`. *0.5 j.*
  5. `price-adjust` (le plus délicat — Buy Box + stock + marge). *1 j.*
- `lib/commerce/agent/executors/` — `update-bid.ts` (Ads API), `add-negative.ts` (Ads API), `update-price.ts` (SP-API). *1 j.*
- `lib/commerce/agent/analyze.ts` — orchestrateur (voir `references/agent-architecture.md`). *0.5 j.*
- `app/api/commerce/agent/analyze/route.ts` + `execute/route.ts` + `reject/route.ts`. *0.5 j.*

### 3.3 — Inbox UI

`/commerce/admin/agent/inbox` — voir `references/approval-inbox-ui.md`. Réécrire les snippets en Tailwind pur (pas de shadcn `<Dialog>`). Garder :
- Sélection multiple + bulk approve/reject.
- Groupement par `action_type`.
- Badge de confiance (high / medium / low).
- Description lisible du diff (`0.50 $ ↓ 0.25 $`).
- `dry_run=true` accessible via bouton dev.

### 3.4 — Activation progressive

- Lancer `analyze?dry_run=true` plusieurs fois pour valider que les règles produisent du sens sur **tes vraies données**.
- Activer une règle à la fois dans `amazon_agent_settings.enabled=true`. Commencer par `bid_bleeder` (signal le plus clair).
- Surveiller la qualité des propositions sur 7-14 jours en mode `manual` avant Phase 4.

> **Critère de fin de Phase 3** : tu reçois chaque matin une inbox avec ~5-30 propositions exploitables, tu peux en approuver 80% en 5 minutes, et l'exécution réussit sur Amazon (vérifié dans `amazon_optimization_log`). Pas de fausse alarme régulière.

---

## Phase 4 — Mode conversationnel (2-3 jours)

Pré-requis : Phase 3 stable, règles éprouvées.

- `app/commerce/admin/agent/chat/page.tsx` — UI chat avec streaming (utiliser `Anthropic` avec `stream: true`).
- `app/api/commerce/agent/chat/route.ts` — gère le tool calling (`preview_actions`, `execute_actions`, `query_data`). Voir `references/autonomy-levels.md` section "Mode conversationnel".
- System prompt en français, **règle d'or : confirmation explicite obligatoire avant `execute_actions`**.
- `chat-tools.ts` — implémentation des 3 tools.
- Logger chaque exécution chat avec `triggered_by='chat:<user_id>'` dans `amazon_optimization_log`.

> **Critère de fin de Phase 4** : tu peux écrire "réduis les bids des keywords avec ACoS > 80%, sauf ceux de la campagne X", l'agent prévisualise N actions, tu dis "procède", l'exécution se fait et est tracée.

---

## Phase 5 — Mode autonomous + observabilité (2-3 jours)

Pré-requis : Phase 4 OK, plusieurs semaines de feedback en mode manual.

### 5.1 — Tables et logique

Migration `142-autonomy-policies.sql` :
- `amazon_autonomy_policies` (voir `references/autonomy-levels.md`).
- `amazon_autonomy_executions` (compteur quotidien).
- Colonne `global_mode` sur `amazon_agent_settings` : `'paused' | 'manual' | 'mixed'`.
- RPC `amazon_increment_autonomy_count`.

`lib/commerce/agent/policy-matcher.ts` — `findMatchingPolicy()`.

Modifier `analyze.ts` pour le flow révisé :
1. `passesHardGuards()` (toujours).
2. Insérer `pending` (toujours).
3. Si `global_mode='mixed'` ET `findMatchingPolicy()` retourne une politique ET quota+horaire OK → exécuter immédiatement, logger `triggered_by='autonomous:<policy_id>'`.

### 5.2 — UI

- `/commerce/admin/agent/settings` — kill switch (3 radio buttons : Paused / Manual / Mixed).
- `/commerce/admin/agent/settings/policies` — CRUD des politiques + stats 7j par politique.
- `/commerce/admin/agent/history` — feed unifié manual + chat + autonomous, filtre par `triggered_by`, bouton rollback (utilise `amazon_optimization_log.before_value`).

### 5.3 — Onboarding progressif (semaines 7-12 de l'agent)

Suivre la séquence du SKILL.md :
1. Activer `Auto bid_bleeder safe` (`min_confidence='high'`, `max_impact_cents=500`, `daily_action_cap=20`).
2. Surveiller `amazon_optimization_log` `triggered_by LIKE 'autonomous:%'` pendant 7 jours.
3. Si OK, ajouter `Auto negative_harvest`, relâcher les caps.
4. Garder `update_price` **toujours en manual** (risque trop élevé).

> **Critère de fin de Phase 5** : 80% des propositions à faible risque s'exécutent sans intervention, tu traites 5 minutes/jour les ambigus dans l'inbox, et tu peux paser tout en un clic avant Black Friday.

---

## Risques transversaux

| Risque | Mitigation |
|---|---|
| **Quota / throttling Amazon** | Token bucket par endpoint, respect des `Retry-After`, batch ≤ 1000 |
| **Tokens chiffrés perdus si `AMAZON_REFRESH_TOKEN_ENCRYPTION_KEY` est régénérée** | Stocker la clé hors-Vercel (1Password) + scripted key rotation |
| **Cron qui se chevauche** | Lock via `amazon_sync_state.is_running` + stale lock 10min |
| **Search terms report qui prend 30 min** | Pattern à 2 crons : request + poll |
| **Action sur un `keyword_id` périmé** | Marquer `failed` avec raison ; ne pas retry auto, le prochain sync nettoiera |
| **Autonomous "fou"** : politique qui auto-exécute trop largement | `daily_action_cap` strict, `max_impact_cents` bas, kill switch Paused, `triggered_by` filtrable pour rollback en masse |
| **`commerce/admin/page.tsx` 1989 lignes** | Refactor en Phase 1 obligatoire (sans ça, dette ingérable) |
| **Mot de passe partagé `/commerce/admin` actuel** | Remplacer par `requireAdmin()` en Phase 1 (sinon l'agent exécute sans vraie identité) |
| **Cohérence multi-marketplace** | Décider en Phase 0 si CA seul ou CA+US. Tout filter par `marketplace_id` dès le départ. |

## Dépendances entre phases

```
Phase 0 ──┐
          ├─→ Phase 1 ──┐
          │             ├─→ Phase 2 ──┐
          │             │             ├─→ Phase 3 ──┐
          │             │             │             ├─→ Phase 4 ──┐
          │             │             │             │             └─→ Phase 5
```

Phase 0 et Phase 1 peuvent overlap partiellement. Phase 2 doit être **complète** avant Phase 3 (l'agent a besoin de toutes les sources). Phase 4 et 5 peuvent être faites dans n'importe quel ordre une fois Phase 3 stable.

## Estimés cumulés

| Étape | Solo focalisé | Avec interruptions |
|---|---|---|
| Phase 0 | 0.5 j | 1-2 j |
| Phase 1 | 1.5 j | 3 j |
| Phase 2 | 8-10 j | 2-3 sem |
| Phase 3 | 4-5 j | 1.5-2 sem |
| Phase 4 | 2-3 j | 1 sem |
| Phase 5 | 2-3 j | 1 sem |
| **Total** | **~3-4 semaines focalisées** | **6-10 semaines réelles** |

## Points d'arrêt naturels

- **Après Phase 1** : tu as un terrain propre, tu peux mettre en pause sans perdre de la valeur.
- **Après Phase 3** : l'agent fait déjà 80% du job. Phases 4-5 sont du raffinement, optionnelles.
- **Après Phase 4** : tu as Manual + Chat. Mode autonomous peut attendre indéfiniment si tu n'es pas confiant.

## Prochain pas concret

Démarrer Phase 0 :
1. Vérifier que ton compte Vercel est en Pro (sinon les crons sont limités à 1×/jour).
2. Créer l'app Seller Central + l'app Ads + récupérer les 5 secrets initiaux (cf. 0.1).
3. Décider Marketplace : CA seul, ou CA + US ?
4. Décider du modèle de rôle : créer `profiles` ou pattern existant ?

Une fois ces 4 décisions prises, on enchaîne sur Phase 1.
