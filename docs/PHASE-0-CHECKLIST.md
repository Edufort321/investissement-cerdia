# Phase 0 — Checklist accès Amazon

Guide pas-à-pas pour récupérer les 5 secrets nécessaires avant qu'on puisse démarrer Phase 1 du plan agent.

**Temps Eric estimé** : 1-2 h de travail actif + 1-3 jours d'attente d'approbation Amazon.
**Pré-requis** : compte Seller Central CA actif, accès admin AWS, marque enregistrée Brand Registry (recommandé pour Ads).

---

## Vue d'ensemble : les 5 secrets

| # | Secret | Source | Format |
|---|---|---|---|
| 1 | `AMAZON_LWA_APP_ID` (Seller) | Seller Central → Developer Console | `amzn1.application-oa2-client.xxx` |
| 2 | `AMAZON_LWA_CLIENT_SECRET` (Seller) | Idem | string opaque |
| 3 | `SP_API_REFRESH_TOKEN` | Self-authorize après création de l'app | `Atzr|...` |
| 4 | `AMAZON_ADS_CLIENT_ID` + `AMAZON_ADS_CLIENT_SECRET` + `ADS_REFRESH_TOKEN` | Amazon Ads Console (séparé du Seller) | `amzn1.application-oa2-client.xxx` + secret + token |
| 5 | `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` | AWS IAM | clé/secret |

Plus 2 valeurs non-secrètes :
- `AMAZON_SELLER_ID` (Merchant Token, visible dans Seller Central → Compte vendeur).
- `ads_profile_id` Canada (à récupérer une fois après l'OAuth Ads, stocké en DB).

---

## Section 1 — SP-API (Selling Partner API)

### 1.1 — Inscription comme développeur

1. Ouvrir https://sellercentral.amazon.ca/sellingpartner/developerconsole
2. Si premier accès : remplir le formulaire "Devenir développeur" (nom, contact, raison : "outil interne d'optimisation de mon propre compte Seller").
3. **Approbation Amazon** : 1-3 jours ouvrables. Tu reçois un email quand c'est validé.

### 1.2 — Créer l'application SP-API

Une fois développeur approuvé :

1. Developer Console → "Add new app client"
2. **App name** : `CERDIA Commerce Agent` (ou ce que tu veux)
3. **API type** : `SP API`
4. **Roles** demandés (cocher uniquement ce qu'on utilise, sinon Amazon peut rejeter pour over-scope) :
   - ✅ `Inventory and Order Tracking` → orders, shipments
   - ✅ `Pricing` → update price (Phase 3+)
   - ✅ `Product Listing` → listings details
   - ✅ `Amazon Fulfillment` → FBA inventory
   - ❌ Ne PAS cocher : Direct-to-Consumer Shipping, Tax Remittance, etc.
5. **OAuth Login URI** : laisser vide pour app privée (self-use).
6. **OAuth Redirect URI** : `https://cerdia.ai/api/amazon/oauth/callback` (on créera la route plus tard ; pour le self-authorize ce n'est même pas appelé).
7. Cliquer "Save and exit". L'app est en statut "Draft".

### 1.3 — Récupérer LWA credentials

1. Dans la liste, à côté de l'app : "View" → onglet "LWA credentials".
2. Copier :
   - **App ID** (format `amzn1.application-oa2-client.xxxxxxxx`) → `AMAZON_LWA_APP_ID`
   - **Client Secret** (cliquer "Show") → `AMAZON_LWA_CLIENT_SECRET`
3. Stocker dans 1Password (ou ton gestionnaire de secrets), surtout pas dans Git.

### 1.4 — Self-authorize pour récupérer le refresh token

L'app étant privée à ton propre compte, on peut sauter le flow OAuth public.

1. Dans la même page : "Authorize" → "Self-authorize" (bouton sous l'app).
2. Tu reçois un **refresh token** au format `Atzr|IwEBI...` — copier dans 1Password → `SP_API_REFRESH_TOKEN`.
3. Ce token a une durée de vie longue (>1 an si utilisé régulièrement). On le chiffrera AES-256-GCM avant de le stocker dans Supabase (`amazon_credentials.sp_api_refresh_token_encrypted`).

### 1.5 — Récupérer ton Seller ID (Merchant Token)

1. Seller Central → Settings (engrenage en haut à droite) → Account Info.
2. Section "Business Information" → "Merchant Token" : c'est ton `AMAZON_SELLER_ID`. Format : `A1B2C3D4E5F6G7`.

---

## Section 2 — Amazon Ads API (Sponsored Products)

C'est un produit séparé du SP-API, avec sa propre console et ses propres credentials.

### 2.1 — Inscription Ads API

1. Ouvrir https://advertising.amazon.com/API/docs/en-us/setting-up/overview
2. Cliquer "Apply for access" → remplir le formulaire (raison : "internal tool for managing my own Sponsored Products campaigns").
3. **Approbation Amazon** : généralement 1-2 jours ouvrables. Email de confirmation.

### 2.2 — Créer l'application Ads

1. Une fois approuvé : https://advertising.amazon.com/API/docs/en-us/setting-up/step-1-create-lwa-app
2. **Note importante** : Amazon Ads utilise les apps Login with Amazon (LWA) du **portail développeur Amazon** (developer.amazon.com), pas Seller Central. C'est confusant mais c'est comme ça.
3. Aller sur https://developer.amazon.com/loginwithamazon/console/site/lwa/overview.html
4. "Create a New Security Profile" :
   - Name: `CERDIA Ads`
   - Description: `Internal Sponsored Products optimization`
   - Privacy Notice URL: `https://cerdia.ai/privacy`
5. Une fois créé : copier
   - **Client ID** → `AMAZON_ADS_CLIENT_ID`
   - **Client Secret** → `AMAZON_ADS_CLIENT_SECRET`

### 2.3 — Allowed Origins / Allowed Return URLs

Dans le security profile → Web Settings :
- **Allowed Origins** : `https://cerdia.ai`
- **Allowed Return URLs** : `https://cerdia.ai/api/amazon/ads/oauth/callback`

### 2.4 — Whitelister le client_id pour Ads API

Étape spécifique Ads (l'erreur classique : on a une app LWA mais elle n'est pas autorisée pour l'Ads API spécifiquement) :

1. Soumettre le `Client ID` via le portail Ads API (le lien arrive dans l'email d'approbation 2.1).
2. Attendre 1-2 jours qu'Amazon le lie à ton compte Ads.

### 2.5 — Générer le refresh token Ads

Le seul moyen propre est de faire le flow OAuth une fois manuellement.

URL d'autorisation à coller dans ton navigateur (en remplaçant `<CLIENT_ID>`) :

```
https://www.amazon.com/ap/oa?client_id=<CLIENT_ID>&scope=advertising::campaign_management&response_type=code&redirect_uri=https://cerdia.ai/api/amazon/ads/oauth/callback
```

Comme la route callback n'existe pas encore, Amazon va te rediriger vers `https://cerdia.ai/api/amazon/ads/oauth/callback?code=ANxxxxxxxxxxxx`. Copier le `code` depuis la barre d'URL avant de fermer.

Ensuite échanger le code contre un refresh token (one-shot, depuis ton terminal) :

```bash
curl -X POST https://api.amazon.com/auth/o2/token \
  -d "grant_type=authorization_code" \
  -d "code=ANxxxxxxxxxxxx" \
  -d "redirect_uri=https://cerdia.ai/api/amazon/ads/oauth/callback" \
  -d "client_id=<CLIENT_ID>" \
  -d "client_secret=<CLIENT_SECRET>"
```

Réponse :
```json
{
  "access_token": "Atza|...",
  "refresh_token": "Atzr|...",
  "token_type": "bearer",
  "expires_in": 3600
}
```

Copier `refresh_token` → `ADS_REFRESH_TOKEN` dans 1Password.

### 2.6 — Récupérer le profileId Canada

```bash
curl -X GET https://advertising-api.amazon.com/v2/profiles \
  -H "Amazon-Advertising-API-ClientId: <CLIENT_ID>" \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

(Utiliser un access token frais issu du refresh, pas le refresh lui-même.)

Réponse — chercher l'objet où `countryCode='CA'` :
```json
[
  { "profileId": 1234567890, "countryCode": "CA", "currencyCode": "CAD", "accountInfo": {...} },
  { "profileId": 9876543210, "countryCode": "US", ... }
]
```

Stocker `profileId` (numérique) → c'est `ads_profile_id` qu'on mettra dans `amazon_credentials`.

---

## Section 3 — AWS IAM (pour SigV4 signing du SP-API)

SP-API exige que chaque requête soit signée AWS Signature V4 — il faut un IAM user (ou un rôle) avec une policy minimale.

### 3.1 — Créer l'IAM user

1. Console AWS → IAM → Users → "Create user"
2. **User name** : `cerdia-sp-api`
3. **Access type** : ✅ Programmatic access (clé d'accès, pas de mot de passe)
4. **Permissions** : "Attach policies directly" → créer une policy custom :

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["execute-api:Invoke"],
      "Resource": "arn:aws:execute-api:us-east-1:*:*"
    }
  ]
}
```

(SP-API NA endpoint = us-east-1. Si jamais tu ajoutes EU, ajouter `eu-west-1`.)

5. Créer l'utilisateur. Sur la page de confirmation : copier
   - **Access key ID** → `AWS_ACCESS_KEY_ID`
   - **Secret access key** → `AWS_SECRET_ACCESS_KEY`

### 3.2 — Pas besoin de Role ARN ?

L'ancien flow SP-API exigeait un `AssumeRole` via STS. Depuis 2023, Amazon a simplifié : le client SDK peut signer directement avec l'IAM user. Donc `AMAZON_ROLE_ARN` est **optionnel** pour notre cas (on peut le laisser vide).

Si tu veux la rigueur supplémentaire (rotation, audit), créer un rôle qui assume l'IAM user, mais ça ajoute de la complexité pour peu de gain en self-use.

---

## Section 4 — Génération des secrets locaux

À générer **toi-même** sur ta machine, ne pas demander à Amazon.

```bash
# Clé de chiffrement pour stocker les refresh tokens dans Supabase
openssl rand -hex 32
# → AMAZON_REFRESH_TOKEN_ENCRYPTION_KEY=...

# Secret pour authentifier les crons Vercel (vérifié dans le header x-vercel-cron-secret)
openssl rand -hex 32
# → CRON_SECRET=...

# Token Bearer pour les appels admin manuels (curl en dev)
openssl rand -hex 32
# → ADMIN_API_TOKEN=...
```

**Important** : si tu perds `AMAZON_REFRESH_TOKEN_ENCRYPTION_KEY`, tu perds l'accès à tous les refresh tokens chiffrés en DB. Backup obligatoire (1Password + un endroit hors-Vercel).

---

## Section 5 — Récap des valeurs à mettre dans `.env.local`

À la fin de la Phase 0, tu dois avoir collecté :

```env
# SP-API (Section 1)
AMAZON_LWA_APP_ID=amzn1.application-oa2-client.xxxxxxxx
AMAZON_LWA_CLIENT_SECRET=xxxxxxxx
SP_API_REFRESH_TOKEN=Atzr|xxxxxxxx
AMAZON_SELLER_ID=A1B2C3D4E5F6G7
AMAZON_MARKETPLACE_ID=A2EUQ1WTGCTBG2

# Ads API (Section 2)
AMAZON_ADS_CLIENT_ID=amzn1.application-oa2-client.yyyyyyyy
AMAZON_ADS_CLIENT_SECRET=yyyyyyyy
ADS_REFRESH_TOKEN=Atzr|yyyyyyyy
# ads_profile_id : on le mettra en DB plus tard, pas en env

# AWS (Section 3)
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
# AMAZON_ROLE_ARN=  # vide, optionnel

# Locaux (Section 4)
AMAZON_REFRESH_TOKEN_ENCRYPTION_KEY=  # 64 chars hex
CRON_SECRET=  # 64 chars hex
ADMIN_API_TOKEN=  # 64 chars hex

# Anthropic (Phase 1)
ANTHROPIC_API_KEY=sk-ant-...
```

Et 2 valeurs **à mettre aussi sur Vercel** (Project Settings → Environment Variables) : tout ce qui est nécessaire en prod, donc tous les secrets ci-dessus sauf ce qui est purement local.

---

## Section 6 — Test de validation

Avant de passer en Phase 1, vérifier que les credentials marchent vraiment.

### Test SP-API (un appel simple)

```bash
# 1. Récupérer un access token fresh
curl -X POST https://api.amazon.com/auth/o2/token \
  -d "grant_type=refresh_token" \
  -d "refresh_token=$SP_API_REFRESH_TOKEN" \
  -d "client_id=$AMAZON_LWA_APP_ID" \
  -d "client_secret=$AMAZON_LWA_CLIENT_SECRET"
# → { "access_token": "Atza|...", ... }
```

L'appel SigV4 lui-même demande un client signé — on le validera en début de Phase 2 quand le `SpApiClient` sera écrit. Si le refresh ci-dessus retourne un access_token, c'est déjà un excellent signal.

### Test Ads API

```bash
# 1. Refresh
curl -X POST https://api.amazon.com/auth/o2/token \
  -d "grant_type=refresh_token" \
  -d "refresh_token=$ADS_REFRESH_TOKEN" \
  -d "client_id=$AMAZON_ADS_CLIENT_ID" \
  -d "client_secret=$AMAZON_ADS_CLIENT_SECRET"
# → { "access_token": "...", ... }

# 2. List profiles (ne demande pas de signing)
curl -X GET https://advertising-api.amazon.com/v2/profiles \
  -H "Amazon-Advertising-API-ClientId: $AMAZON_ADS_CLIENT_ID" \
  -H "Authorization: Bearer <access_token_from_above>"
# → array de profiles, dont CA
```

Si les 2 retournent du JSON valide → tout est prêt.

---

## Pièges fréquents

| Symptôme | Cause | Fix |
|---|---|---|
| `403 Unauthorized` au refresh SP-API | App pas encore approuvée par Amazon | Attendre l'email de Section 1.1 |
| `400 invalid_grant` au refresh Ads | client_id pas whitelisté pour Ads API | Section 2.4 (étape souvent oubliée) |
| `403` sur `/v2/profiles` Ads | Mauvais header `Amazon-Advertising-API-ClientId` (pas le LWA App ID) | Doit être le `AMAZON_ADS_CLIENT_ID` (Ads), pas celui du SP-API |
| `SignatureDoesNotMatch` SP-API | IAM policy manque `execute-api:Invoke` | Section 3.1 |
| Refresh token retourne 200 mais access_token marche pas pour l'API | Mauvais marketplace ou mauvaise région d'endpoint | NA = us-east-1 (CA, US, MX). EU = eu-west-1 (FR, DE, etc.) |

---

## Quand tu as fini

1. Cocher la dernière case de la section 6 (les 2 tests retournent du JSON valide).
2. Confirmer dans la conversation : "Phase 0 done, tous les secrets en main".
3. On enchaîne sur Phase 1 (création de la table `profiles`, install Anthropic SDK, refactor de `commerce/admin/page.tsx`, structure des dossiers, `vercel.json`).

Si tu bloques à une étape : me dire **exactement** où, je te débloque sans avancer plus loin.
