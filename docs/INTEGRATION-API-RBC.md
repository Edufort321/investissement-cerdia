# Guide d'Intégration API RBC pour Transactions Automatiques

## Vue d'ensemble

Ce document explique comment intégrer l'API bancaire RBC (Banque Royale du Canada) pour importer automatiquement les transactions et les classifier selon les projets d'investissement.

## ⚠️ Points importants avant de commencer

### 1. Accès API RBC

RBC ne fournit **PAS** d'API publique directe aux développeurs individuels ou petites entreprises. Les options sont:

#### Option A: RBC Developer Portal (Entreprises uniquement)
- **Requis**: Être client corporatif RBC avec compte commercial
- **Process**: Demande formelle via gestionnaire de compte RBC
- **Coût**: Variables selon volume de transactions
- **Délai**: 2-6 mois d'approbation
- **APIs disponibles**:
  - Account Information API
  - Payment Initiation API
  - Funds Confirmation API
  - Transaction History API

#### Option B: Services bancaires en ligne (Manuelle)
- **Gratuit** mais manuel
- Exportation CSV/OFX depuis RBC Banque en Ligne
- Import périodique dans l'application
- **Recommandé pour débuter**

#### Option C: Services d'agrégation tiers (RECOMMANDÉ)
Utiliser un service d'agrégation bancaire certifié:

**🌟 Flinks (Recommandé pour Canada)**
- ✅ Support complet RBC
- ✅ Conforme aux normes canadiennes
- ✅ API REST moderne
- ✅ Classification automatique disponible
- 💰 ~$0.10-0.50 par connexion utilisateur/mois
- 🔗 https://flinks.com

**Plaid (Alternative)**
- ✅ Support RBC limité au Canada
- ✅ Bonne documentation
- ✅ Classification des transactions
- 💰 Gratuit jusqu'à 100 utilisateurs, puis payant
- 🔗 https://plaid.com

**Finmo (Spécialiste canadien)**
- ✅ 100% canadien, support excellent RBC
- ✅ Focus sur marchés immobiliers
- 💰 Prix sur demande
- 🔗 https://finmo.ca

### 2. Conformité et Sécurité

#### Réglementations canadiennes
- **FINTRAC**: Obligations anti-blanchiment d'argent
- **Loi sur la protection des renseignements personnels**: PIPEDA
- **Open Banking Canada**: En développement, déploiement prévu 2025-2026

#### Sécurité requise
- ✅ Chiffrement end-to-end (TLS 1.3+)
- ✅ Stockage sécurisé des credentials bancaires
- ✅ OAuth 2.0 pour authentification
- ✅ Logs d'audit complets
- ✅ Consentement explicite utilisateur

---

## Architecture d'intégration recommandée

### Solution recommandée: Flinks + Classification IA

```
┌─────────────────┐
│  Compte RBC     │
│  (Utilisateur)  │
└────────┬────────┘
         │
         │ (Connexion sécurisée via Flinks)
         │
         ▼
┌─────────────────┐
│  API Flinks     │
│  • Auth OAuth2  │
│  • Sync trans.  │
└────────┬────────┘
         │
         │ (Webhook ou Polling)
         │
         ▼
┌─────────────────────────────────┐
│  CERDIA Backend API             │
│  /api/banking/webhook           │
│                                 │
│  1. Récupérer transactions      │
│  2. Classifier avec IA/règles   │
│  3. Créer dans Supabase         │
└─────────────────────────────────┘
         │
         ▼
┌─────────────────┐
│  Base de données│
│  Supabase       │
│  • transactions │
│  • properties   │
└─────────────────┘
```

---

## Implémentation Step-by-Step

### Étape 1: Inscription Flinks

1. Créer compte développeur: https://dashboard.flinks.com
2. Obtenir credentials:
   - `FLINKS_CLIENT_ID`
   - `FLINKS_CLIENT_SECRET`
3. Choisir environnement:
   - Sandbox (développement)
   - Production

### Étape 2: Configuration environnement

Ajouter à `.env.local`:

```bash
# Flinks API
FLINKS_CLIENT_ID=your_client_id_here
FLINKS_CLIENT_SECRET=your_client_secret_here
FLINKS_ENVIRONMENT=sandbox # ou 'production'
FLINKS_REDIRECT_URL=https://votre-domaine.com/api/banking/callback

# Classification IA (optionnel)
OPENAI_API_KEY=sk-... # Déjà configuré dans votre projet
```

### Étape 3: Installer SDK

```bash
npm install @flinks/node-sdk
```

### Étape 4: Créer API Routes

#### `/app/api/banking/connect/route.ts`
Initialise la connexion bancaire

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const FLINKS_API_URL = process.env.FLINKS_ENVIRONMENT === 'production'
  ? 'https://api.flinks.com'
  : 'https://sandbox.flinks.com'

export async function POST(request: NextRequest) {
  try {
    const { investor_id } = await request.json()

    // Créer une session Flinks Connect
    const response = await fetch(`${FLINKS_API_URL}/v3/Authorize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        institution: 'FlinksCapital', // RBC = 'RoyalBank'
        redirectUrl: process.env.FLINKS_REDIRECT_URL,
        customerId: investor_id,
        language: 'fr',
      })
    })

    const data = await response.json()

    return NextResponse.json({
      loginUrl: data.loginUrl,
      requestId: data.requestId
    })

  } catch (error: any) {
    console.error('Flinks connect error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
```

#### `/app/api/banking/callback/route.ts`
Traite le retour après connexion bancaire

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const requestId = searchParams.get('requestId')
    const loginId = searchParams.get('loginId')

    if (!requestId || !loginId) {
      throw new Error('Missing requestId or loginId')
    }

    // Récupérer les comptes liés
    const accountsResponse = await fetch(
      `${FLINKS_API_URL}/v3/${requestId}/accounts`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.FLINKS_CLIENT_SECRET}`
        }
      }
    )

    const accountsData = await accountsResponse.json()

    // Sauvegarder la connexion bancaire
    await supabaseAdmin
      .from('bank_connections')
      .insert({
        investor_id: accountsData.customerId,
        institution: 'RBC',
        login_id: loginId,
        request_id: requestId,
        accounts: accountsData.accounts,
        status: 'active'
      })

    // Déclencher sync initial
    await syncTransactions(loginId)

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?bank=connected`
    )

  } catch (error: any) {
    console.error('Callback error:', error)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?bank=error&message=${error.message}`
    )
  }
}
```

#### `/app/api/banking/sync/route.ts`
Synchronise les transactions

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

async function syncTransactions(loginId: string) {
  // Récupérer les transactions depuis Flinks
  const response = await fetch(
    `${FLINKS_API_URL}/v3/${loginId}/accounts/transactions`,
    {
      headers: {
        'Authorization': `Bearer ${process.env.FLINKS_CLIENT_SECRET}`
      }
    }
  )

  const data = await response.json()

  for (const account of data.accounts) {
    for (const transaction of account.transactions) {

      // Classifier la transaction avec IA
      const classification = await classifyTransaction(transaction)

      // Créer transaction dans Supabase
      await supabaseAdmin
        .from('transactions')
        .upsert({
          investor_id: data.customerId,
          property_id: classification.property_id,
          date: transaction.date,
          description: transaction.description,
          amount: transaction.amount,
          type: transaction.amount > 0 ? 'investissement' : 'dépense',
          category: classification.category,
          source: 'rbc_api',
          external_id: transaction.id,
          metadata: {
            bank_account: account.accountNumber,
            original_description: transaction.description,
            merchant: transaction.merchant,
            confidence: classification.confidence
          }
        }, {
          onConflict: 'external_id'
        })
    }
  }
}

async function classifyTransaction(transaction: any) {
  // Utiliser OpenAI pour classifier intelligemment
  const prompt = `
Tu es un assistant de classification de transactions bancaires pour un gestionnaire d'investissements immobiliers.

Transaction:
- Description: ${transaction.description}
- Montant: ${transaction.amount} CAD
- Merchant: ${transaction.merchant || 'N/A'}

Propriétés disponibles dans le système:
- Triplex Hochelaga (ID: prop-1): 1234 rue Hochelaga
- Duplex Rosemont (ID: prop-2): 5678 avenue Rosemont

Classifie cette transaction en JSON:
{
  "property_id": "prop-1 ou prop-2 ou null",
  "category": "hypothèque|taxes|réparations|assurance|revenus_location|frais_gestion|autre",
  "confidence": 0.0 à 1.0,
  "reason": "explication courte"
}
`

  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' }
  })

  const result = JSON.parse(completion.choices[0].message.content || '{}')
  return result
}

export async function POST(request: NextRequest) {
  try {
    const { login_id } = await request.json()

    await syncTransactions(login_id)

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Sync error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
```

### Étape 5: Créer table `bank_connections`

```sql
-- supabase/70-bank-connections.sql

CREATE TABLE IF NOT EXISTS bank_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  investor_id UUID NOT NULL REFERENCES investors(id) ON DELETE CASCADE,

  institution VARCHAR(50) NOT NULL, -- 'RBC', 'TD', etc.
  login_id TEXT NOT NULL,
  request_id TEXT NOT NULL,

  accounts JSONB, -- Détails des comptes bancaires liés

  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'error')),

  last_sync_at TIMESTAMPTZ,
  next_sync_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bank_connections_investor ON bank_connections(investor_id);
CREATE INDEX idx_bank_connections_login_id ON bank_connections(login_id);

-- RLS Policies
ALTER TABLE bank_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own bank connections"
ON bank_connections FOR SELECT
TO authenticated
USING (
  investor_id = (SELECT id FROM investors WHERE user_id = auth.uid())
  OR
  (SELECT access_level FROM investors WHERE user_id = auth.uid()) = 'admin'
);

CREATE POLICY "Only admins manage bank connections"
ON bank_connections FOR ALL
TO authenticated
USING ((SELECT access_level FROM investors WHERE user_id = auth.uid()) = 'admin');
```

### Étape 6: Ajouter colonne `external_id` à transactions

```sql
-- supabase/71-add-external-id.sql

ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS external_id TEXT UNIQUE;

CREATE INDEX idx_transactions_external_id ON transactions(external_id);

COMMENT ON COLUMN transactions.external_id IS 'ID unique depuis API bancaire (Flinks)';
```

### Étape 7: UI - Bouton de connexion bancaire

Ajouter dans `components/TransactionsTab.tsx`:

```typescript
const handleConnectBank = async () => {
  try {
    const response = await fetch('/api/banking/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ investor_id: currentInvestor.id })
    })

    const data = await response.json()

    // Ouvrir Flinks Connect dans popup
    window.open(data.loginUrl, 'flinks-connect', 'width=500,height=700')

  } catch (error) {
    console.error('Connect error:', error)
  }
}

// Dans le JSX:
<button
  onClick={handleConnectBank}
  className="px-4 py-2 bg-blue-600 text-white rounded-lg">
  🏦 Connecter RBC
</button>
```

---

## Classification automatique des transactions

### Approche 1: Règles basiques

```typescript
function classifyByRules(transaction: any, properties: any[]) {
  const desc = transaction.description.toLowerCase()

  // Hypothèque
  if (desc.includes('rbc mortgage') || desc.includes('hypothèque')) {
    return { category: 'hypothèque', confidence: 0.9 }
  }

  // Taxes municipales
  if (desc.includes('ville de montreal') || desc.includes('taxes')) {
    return { category: 'taxes', confidence: 0.95 }
  }

  // Revenus de location (dépôts récurrents)
  if (transaction.amount > 0 && transaction.recurring) {
    return { category: 'revenus_location', confidence: 0.7 }
  }

  // Défaut
  return { category: 'autre', confidence: 0.3 }
}
```

### Approche 2: IA avancée (OpenAI)

Voir exemple dans `/api/banking/sync/route.ts` ci-dessus.

**Avantages**:
- ✅ Comprend le contexte
- ✅ S'améliore avec exemples
- ✅ Détecte patterns complexes

**Coûts estimés**:
- ~$0.001 par classification
- ~$1 pour 1000 transactions

---

## Synchronisation automatique

### Option 1: Webhooks Flinks

```typescript
// app/api/banking/webhook/route.ts

export async function POST(request: NextRequest) {
  const body = await request.json()

  // Vérifier signature webhook
  const signature = request.headers.get('x-flinks-signature')
  if (!verifySignature(body, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  // Traiter événement
  if (body.event === 'account.updated') {
    await syncTransactions(body.data.loginId)
  }

  return NextResponse.json({ received: true })
}
```

### Option 2: Cron Job quotidien

```typescript
// app/api/cron/sync-banks/route.ts

export async function GET(request: NextRequest) {
  // Vérifier token Vercel Cron
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Récupérer toutes les connexions actives
  const { data: connections } = await supabaseAdmin
    .from('bank_connections')
    .select('*')
    .eq('status', 'active')

  // Synchroniser chaque connexion
  for (const conn of connections || []) {
    await syncTransactions(conn.login_id)
  }

  return NextResponse.json({ synced: connections?.length })
}
```

Configurer dans `vercel.json`:

```json
{
  "crons": [{
    "path": "/api/cron/sync-banks",
    "schedule": "0 2 * * *"
  }]
}
```

---

## Sécurité et bonnes pratiques

### 1. Ne jamais stocker credentials bancaires

❌ **JAMAIS**:
```typescript
// NE PAS FAIRE ÇA
await supabase.insert({
  username: 'jean.dupont',
  password: 'motdepasse123'
})
```

✅ **TOUJOURS** utiliser OAuth/tokens:
```typescript
// Flinks gère l'auth de façon sécurisée
const { loginUrl } = await flinks.authorize()
```

### 2. Chiffrer données sensibles

```typescript
import crypto from 'crypto'

const algorithm = 'aes-256-gcm'
const key = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex')

function encrypt(text: string) {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(algorithm, key, iv)
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()

  return {
    encrypted: encrypted.toString('hex'),
    iv: iv.toString('hex'),
    tag: tag.toString('hex')
  }
}
```

### 3. Logs d'audit

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action VARCHAR(50) NOT NULL,
  investor_id UUID REFERENCES investors(id),
  details JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Coûts estimés

### Flinks
- **Setup**: Gratuit
- **Par utilisateur actif**: $0.10-0.50/mois
- **Par sync**: $0.01
- **Estimation 50 investisseurs**: ~$25-50/mois

### OpenAI (Classification IA)
- **Par transaction**: ~$0.001
- **1000 transactions/mois**: ~$1
- **Estimation**: ~$5-10/mois

### Infrastructure
- **Supabase**: Déjà inclus
- **Vercel Crons**: Gratuit (Hobby plan)

**Total estimé**: $30-60/mois pour 50 investisseurs actifs

---

## Alternatives à considérer

### Import manuel CSV/OFX

**Avantages**:
- ✅ Gratuit
- ✅ Contrôle total
- ✅ Pas de dépendances externes

**Inconvénients**:
- ❌ Manuel (effort utilisateur)
- ❌ Pas de classification auto
- ❌ Risque d'oublis

**Implémentation**:

```typescript
// Composant d'import CSV
function ImportCSV() {
  const handleFileUpload = async (file: File) => {
    const text = await file.text()
    const lines = text.split('\n')

    // Parser CSV RBC (format standard)
    for (const line of lines.slice(1)) { // Skip header
      const [date, description, debit, credit, balance] = line.split(',')

      await supabase.from('transactions').insert({
        date,
        description,
        amount: credit || `-${debit}`,
        type: credit ? 'investissement' : 'dépense'
      })
    }
  }

  return (
    <input
      type="file"
      accept=".csv"
      onChange={(e) => handleFileUpload(e.target.files[0])}
    />
  )
}
```

---

## Prochaines étapes recommandées

### Phase 1: MVP (Maintenant)
1. ✅ Import manuel CSV/OFX
2. ✅ Classification manuelle par utilisateur
3. ✅ Apprentissage des patterns

### Phase 2: Semi-automatique (1-3 mois)
1. Règles de classification basiques
2. Suggestions IA avec confirmation utilisateur
3. Export rapports automatiques

### Phase 3: Full auto (3-6 mois)
1. Intégration Flinks
2. Classification IA automatique
3. Webhooks temps réel
4. Réconciliation automatique

---

## Support et ressources

### Documentation officielle
- Flinks: https://docs.flinks.com
- Plaid: https://plaid.com/docs/
- Open Banking Canada: https://www.canada.ca/open-banking

### Contact
Pour questions techniques sur cette intégration:
- GitHub Issues: [Créer un issue]
- Email support: support@cerdia-invest.com

---

**Dernière mise à jour**: 2025-10-24
**Version**: 1.0
**Auteur**: Claude Code (Assistant IA)
