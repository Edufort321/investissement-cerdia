/**
 * SP-API client minimal — refresh LWA → SigV4 (aws4fetch) → fetch.
 *
 * Usage :
 *   const client = await SpApiClient.fromEnv()
 *   const res = await client.request('GET', '/orders/v0/orders', {
 *     query: { MarketplaceIds: 'A2EUQ1WTGCTBG2', CreatedAfter: '2026-04-01' },
 *   })
 *
 * Endpoint NA pour CA/US/MX : sellingpartnerapi-na.amazon.com (us-east-1).
 * EU = sellingpartnerapi-eu.amazon.com (eu-west-1) — non utilisé ici.
 *
 * Cache l'access_token en mémoire (TTL ~55 min, refresh auto si expiré).
 * Throws si une variable d'environnement manque (NotConfiguredError).
 */

import { AwsClient } from 'aws4fetch'

const SP_API_HOST    = 'sellingpartnerapi-na.amazon.com'
const AWS_REGION     = 'us-east-1'
const LWA_TOKEN_URL  = 'https://api.amazon.com/auth/o2/token'

export class NotConfiguredError extends Error {
  constructor(public missing: string[]) {
    super(`SP-API not configured: missing ${missing.join(', ')}`)
    this.name = 'NotConfiguredError'
  }
}

export class SpApiError extends Error {
  constructor(public status: number, public body: string) {
    super(`SP-API ${status}: ${body.slice(0, 500)}`)
    this.name = 'SpApiError'
  }
}

type CachedToken = { token: string; expiresAt: number }

export class SpApiClient {
  private aws:        AwsClient
  private clientId:   string
  private clientSecret: string
  private refreshToken: string
  private cached:     CachedToken | null = null

  private constructor(opts: {
    clientId: string
    clientSecret: string
    refreshToken: string
    awsAccessKeyId: string
    awsSecretAccessKey: string
  }) {
    this.clientId     = opts.clientId
    this.clientSecret = opts.clientSecret
    this.refreshToken = opts.refreshToken
    this.aws = new AwsClient({
      accessKeyId:     opts.awsAccessKeyId,
      secretAccessKey: opts.awsSecretAccessKey,
      service:         'execute-api',
      region:          AWS_REGION,
    })
  }

  /** Construit un client depuis process.env. Throws NotConfiguredError si une variable manque. */
  static fromEnv(): SpApiClient {
    const required = [
      'AMAZON_LWA_APP_ID',
      'AMAZON_LWA_CLIENT_SECRET',
      'AMAZON_REFRESH_TOKEN',
      'AWS_ACCESS_KEY_ID',
      'AWS_SECRET_ACCESS_KEY',
    ] as const
    const missing = required.filter(k => !process.env[k])
    if (missing.length > 0) throw new NotConfiguredError(missing)

    return new SpApiClient({
      clientId:           process.env.AMAZON_LWA_APP_ID!,
      clientSecret:       process.env.AMAZON_LWA_CLIENT_SECRET!,
      refreshToken:       process.env.AMAZON_REFRESH_TOKEN!,
      awsAccessKeyId:     process.env.AWS_ACCESS_KEY_ID!,
      awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    })
  }

  /** Récupère un access token LWA frais (cache 55 min). */
  private async getAccessToken(): Promise<string> {
    if (this.cached && this.cached.expiresAt > Date.now() + 60_000) {
      return this.cached.token
    }
    const body = new URLSearchParams({
      grant_type:    'refresh_token',
      refresh_token: this.refreshToken,
      client_id:     this.clientId,
      client_secret: this.clientSecret,
    })
    const res = await fetch(LWA_TOKEN_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    })
    if (!res.ok) {
      const text = await res.text()
      throw new SpApiError(res.status, `LWA refresh failed: ${text}`)
    }
    const json = (await res.json()) as { access_token: string; expires_in: number }
    this.cached = {
      token:     json.access_token,
      expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000,
    }
    return json.access_token
  }

  /**
   * Effectue un appel SP-API signé.
   * Auto-retry une fois sur 401 (token périmé) et exponential backoff sur 429.
   */
  async request<T = unknown>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    path:   string,
    opts:   { query?: Record<string, string | number | undefined>; body?: unknown } = {},
  ): Promise<T> {
    const url = new URL(`https://${SP_API_HOST}${path}`)
    if (opts.query) {
      for (const [k, v] of Object.entries(opts.query)) {
        if (v !== undefined && v !== null) url.searchParams.set(k, String(v))
      }
    }

    let attempt = 0
    while (true) {
      const accessToken = await this.getAccessToken()
      const init: RequestInit = {
        method,
        headers: {
          'x-amz-access-token': accessToken,
          'host':               SP_API_HOST,
          ...(opts.body ? { 'Content-Type': 'application/json' } : {}),
        },
        body: opts.body ? JSON.stringify(opts.body) : undefined,
      }

      const res = await this.aws.fetch(url.toString(), init)

      if (res.status === 401 && attempt === 0) {
        // Token a peut-être expiré entre 2 calls — invalide cache et retry une fois
        this.cached = null
        attempt++
        continue
      }

      if (res.status === 429) {
        const retryAfter = Number(res.headers.get('Retry-After') ?? '1') * 1000
        if (attempt >= 3) {
          const text = await res.text()
          throw new SpApiError(429, `Rate limited after ${attempt} retries: ${text}`)
        }
        await new Promise(r => setTimeout(r, retryAfter * Math.pow(2, attempt)))
        attempt++
        continue
      }

      const text = await res.text()
      if (!res.ok) throw new SpApiError(res.status, text)

      try {
        return JSON.parse(text) as T
      } catch {
        return text as unknown as T
      }
    }
  }
}
