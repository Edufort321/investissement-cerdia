/**
 * Test SP-API : appel GET /sellers/v1/marketplaceParticipations sur l'endpoint NA
 * (us-east-1). Valide en un seul script :
 *   1. Le LWA refresh token → access token
 *   2. La signature SigV4 via aws4fetch
 *   3. Que le compte Seller a accès au marketplace CA (A2EUQ1WTGCTBG2)
 *
 * Usage : npm run test:sp-api
 *
 * Variables requises dans .env.local :
 *   AMAZON_REFRESH_TOKEN         (refresh token SP-API obtenu via self-authorize)
 *   AMAZON_LWA_APP_ID            (Client ID de l'app SP-API)
 *   AMAZON_LWA_CLIENT_SECRET     (Client Secret de l'app SP-API)
 *   AWS_ACCESS_KEY_ID            (IAM user pour SigV4)
 *   AWS_SECRET_ACCESS_KEY        (IAM user pour SigV4)
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { AwsClient } from 'aws4fetch'

const SP_API_HOST    = 'sellingpartnerapi-na.amazon.com'
const AWS_REGION     = 'us-east-1'
const CA_MARKETPLACE = 'A2EUQ1WTGCTBG2'
const LWA_TOKEN_URL  = 'https://api.amazon.com/auth/o2/token'

function loadEnv(): Record<string, string> {
  const env: Record<string, string> = {}
  try {
    const text = readFileSync(join(process.cwd(), '.env.local'), 'utf8')
    for (const raw of text.split('\n')) {
      const line = raw.trim()
      if (!line || line.startsWith('#')) continue
      const idx = line.indexOf('=')
      if (idx === -1) continue
      env[line.slice(0, idx).trim()] = line.slice(idx + 1).trim()
    }
  } catch {
    // .env.local manquant : on retombe sur process.env uniquement
  }
  return env
}

function requireEnv(env: Record<string, string>, name: string): string {
  const v = env[name] ?? process.env[name]
  if (!v) {
    console.error(`❌ Variable manquante : ${name} (chercher dans .env.local du projet)`)
    process.exit(1)
  }
  return v
}

async function getLwaAccessToken(env: Record<string, string>): Promise<string> {
  const body = new URLSearchParams({
    grant_type:    'refresh_token',
    refresh_token: requireEnv(env, 'AMAZON_REFRESH_TOKEN'),
    client_id:     requireEnv(env, 'AMAZON_LWA_APP_ID'),
    client_secret: requireEnv(env, 'AMAZON_LWA_CLIENT_SECRET'),
  })

  const res = await fetch(LWA_TOKEN_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`LWA refresh failed (${res.status}) : ${text}`)
  }

  const json = (await res.json()) as { access_token: string }
  return json.access_token
}

async function main() {
  console.log('━'.repeat(62))
  console.log('  Test SP-API — GET /sellers/v1/marketplaceParticipations')
  console.log('━'.repeat(62))

  const env = loadEnv()

  console.log('🔐 Refresh LWA → access token...')
  const accessToken = await getLwaAccessToken(env)
  console.log(`✅ access_token (${accessToken.length} chars, expire dans 1h)\n`)

  const aws = new AwsClient({
    accessKeyId:     requireEnv(env, 'AWS_ACCESS_KEY_ID'),
    secretAccessKey: requireEnv(env, 'AWS_SECRET_ACCESS_KEY'),
    service:         'execute-api',
    region:          AWS_REGION,
  })

  const url = `https://${SP_API_HOST}/sellers/v1/marketplaceParticipations`
  console.log(`📡 GET ${url}`)

  const res = await aws.fetch(url, {
    method:  'GET',
    headers: {
      'x-amz-access-token': accessToken,
      'host':               SP_API_HOST,
    },
  })

  const body = await res.text()
  if (!res.ok) {
    console.error(`❌ ${res.status} ${res.statusText}\n${body}`)
    process.exit(1)
  }

  let payload: { payload?: Array<{ marketplace: { id: string; name: string; countryCode: string; defaultCurrencyCode: string }; participation: { isParticipating: boolean; hasSuspendedListings: boolean } }> }
  try {
    payload = JSON.parse(body)
  } catch {
    console.error(`❌ Réponse non-JSON :\n${body}`)
    process.exit(1)
  }

  const list = payload.payload ?? []
  console.log(`✅ ${list.length} marketplace(s) accessible(s)\n`)

  for (const m of list) {
    const isCA   = m.marketplace.id === CA_MARKETPLACE
    const flag   = isCA ? '🇨🇦 ←' : '  '
    const active = m.participation.isParticipating ? 'actif' : 'inactif'
    console.log(`  ${flag} ${m.marketplace.id}  ${m.marketplace.countryCode}  ${m.marketplace.name.padEnd(30)} ${m.marketplace.defaultCurrencyCode}  ${active}`)
  }

  const ca = list.find(m => m.marketplace.id === CA_MARKETPLACE)
  console.log()
  if (ca && ca.participation.isParticipating) {
    console.log('🎉 SP-API marche, marketplace CA actif. Tu peux passer à test:ads-api.')
  } else if (ca) {
    console.warn('⚠️  Marketplace CA trouvé mais isParticipating=false. Ton compte Seller CA est suspendu/inactif.')
    process.exit(2)
  } else {
    console.error(`❌ Marketplace CA (${CA_MARKETPLACE}) absent de la liste. Mauvais compte Seller ou région NA pas configurée.`)
    process.exit(2)
  }
}

main().catch(err => {
  console.error('❌ Erreur fatale :', err.message ?? err)
  process.exit(1)
})
