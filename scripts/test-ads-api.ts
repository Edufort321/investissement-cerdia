/**
 * Test Amazon Ads API : appel GET /v2/profiles sur l'endpoint NA.
 * Pas de SigV4 ici — juste un bearer token LWA + headers Ads.
 *
 * Usage : npm run test:ads-api
 *
 * Variables requises dans .env.local :
 *   AMAZON_ADS_REFRESH_TOKEN   (refresh token Ads obtenu via OAuth one-shot)
 *   AMAZON_ADS_CLIENT_ID       (Client ID du security profile LWA)
 *   AMAZON_ADS_CLIENT_SECRET   (Client Secret du security profile LWA)
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const ADS_API_HOST  = 'advertising-api.amazon.com'
const LWA_TOKEN_URL = 'https://api.amazon.com/auth/o2/token'
const CA_COUNTRY    = 'CA'

type AdsProfile = {
  profileId:     number
  countryCode:   string
  currencyCode:  string
  dailyBudget?:  number
  timezone?:     string
  accountInfo?: {
    marketplaceStringId?: string
    id?:                  string
    type?:                string
    name?:                string
  }
}

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
    // .env.local manquant
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

async function getAdsAccessToken(env: Record<string, string>): Promise<string> {
  const body = new URLSearchParams({
    grant_type:    'refresh_token',
    refresh_token: requireEnv(env, 'AMAZON_ADS_REFRESH_TOKEN'),
    client_id:     requireEnv(env, 'AMAZON_ADS_CLIENT_ID'),
    client_secret: requireEnv(env, 'AMAZON_ADS_CLIENT_SECRET'),
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
  console.log('  Test Amazon Ads API — GET /v2/profiles')
  console.log('━'.repeat(62))

  const env = loadEnv()
  const clientId = requireEnv(env, 'AMAZON_ADS_CLIENT_ID')

  console.log('🔐 Refresh LWA → access token...')
  const accessToken = await getAdsAccessToken(env)
  console.log(`✅ access_token (${accessToken.length} chars, expire dans 1h)\n`)

  const url = `https://${ADS_API_HOST}/v2/profiles`
  console.log(`📡 GET ${url}`)

  const res = await fetch(url, {
    method:  'GET',
    headers: {
      'Authorization':                       `Bearer ${accessToken}`,
      'Amazon-Advertising-API-ClientId':     clientId,
      'Content-Type':                        'application/json',
    },
  })

  const body = await res.text()
  if (!res.ok) {
    console.error(`❌ ${res.status} ${res.statusText}\n${body}`)
    if (res.status === 401 || res.status === 403) {
      console.error('\n💡 Causes fréquentes :')
      console.error('   - client_id pas whitelisté pour Ads API (étape oubliée du onboarding)')
      console.error('   - mauvais Client ID en header (doit être le LWA security profile, pas le SP-API)')
    }
    process.exit(1)
  }

  let profiles: AdsProfile[]
  try {
    profiles = JSON.parse(body)
  } catch {
    console.error(`❌ Réponse non-JSON :\n${body}`)
    process.exit(1)
  }

  console.log(`✅ ${profiles.length} profil(s) Ads accessible(s)\n`)

  for (const p of profiles) {
    const isCA = p.countryCode === CA_COUNTRY
    const flag = isCA ? '🇨🇦 ←' : '  '
    const acct = p.accountInfo?.name ?? p.accountInfo?.id ?? '(sans nom)'
    console.log(`  ${flag} profileId=${p.profileId}  ${p.countryCode}  ${p.currencyCode}  ${acct}`)
  }

  const caProfile = profiles.find(p => p.countryCode === CA_COUNTRY)
  console.log()
  if (caProfile) {
    console.log('🎉 Profil CA trouvé.')
    console.log('   ➜ Ajoute cette ligne à .env.local :')
    console.log(`      AMAZON_ADS_PROFILE_ID=${caProfile.profileId}`)
    console.log()
    console.log('   Cette valeur sera envoyée dans le header `Amazon-Advertising-API-Scope`')
    console.log('   pour tous les appels Sponsored Products à venir.')
  } else {
    console.error(`❌ Aucun profil avec countryCode='${CA_COUNTRY}'.`)
    console.error('   Causes possibles : compte Ads non lié au compte Seller CA, ou pas encore activé.')
    process.exit(2)
  }
}

main().catch(err => {
  console.error('❌ Erreur fatale :', err.message ?? err)
  process.exit(1)
})
