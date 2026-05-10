/**
 * /api/amazon/sync/orders
 *
 * Pull les commandes Seller Central via SP-API GetOrders + GetOrderItems,
 * upsert dans amazon_orders / amazon_order_items, met a jour amazon_sync_state.
 *
 * Auth : Vercel cron (x-vercel-cron-secret) ou Bearer ADMIN_API_TOKEN.
 *
 * Query :
 *   ?backfill=N  → pull les N derniers jours (sinon : depuis last_completed_at)
 *
 * Si SP-API pas configure (credentials absents) → 503 not_configured.
 *
 * Reference pattern : references/sp-api-patterns.md du skill cerdia-commerce.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { authorizeCronOrAdmin } from '@/lib/amazon/route-auth'
import { SpApiClient, NotConfiguredError, SpApiError } from '@/lib/amazon/sp-api-client'

export const dynamic    = 'force-dynamic'
export const maxDuration = 300

const RESOURCE       = 'orders'
const STALE_LOCK_MIN = 10

type SpOrder = {
  AmazonOrderId:       string
  PurchaseDate:        string
  LastUpdateDate?:     string
  OrderStatus?:        string
  FulfillmentChannel?: string
  SalesChannel?:       string
  OrderTotal?:         { Amount: string; CurrencyCode: string }
  NumberOfItemsShipped?: number
  NumberOfItemsUnshipped?: number
  IsBusinessOrder?:    boolean
  IsPremiumOrder?:     boolean
}

type SpOrderItem = {
  ASIN:                  string
  SellerSKU?:            string
  Title?:                string
  QuantityOrdered:       number
  QuantityShipped?:      number
  ItemPrice?:            { Amount: string; CurrencyCode: string }
  ItemTax?:              { Amount: string; CurrencyCode: string }
  ShippingPrice?:        { Amount: string; CurrencyCode: string }
}

function dollarsToCents(s?: string): number | null {
  if (!s) return null
  const n = Number(s)
  return Number.isFinite(n) ? Math.round(n * 100) : null
}

export async function POST(req: NextRequest) {
  const fail = authorizeCronOrAdmin(req)
  if (fail) return fail

  // Init SP-API client (throws NotConfiguredError si credentials absents)
  let client: SpApiClient
  try {
    client = SpApiClient.fromEnv()
  } catch (err) {
    if (err instanceof NotConfiguredError) {
      return NextResponse.json(
        { ok: false, error: 'not_configured', missing: err.missing },
        { status: 503 },
      )
    }
    throw err
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  const url            = new URL(req.url)
  const backfillDays   = Number(url.searchParams.get('backfill') ?? '0')
  const marketplaceId  = process.env.AMAZON_MARKETPLACE_ID!

  // ── Lock + idempotence via amazon_sync_state ─────────────────
  const { data: state } = await supabase
    .from('amazon_sync_state')
    .select('last_completed_at, last_attempted_at, is_running')
    .eq('resource', RESOURCE)
    .maybeSingle()

  if (state?.is_running && state.last_attempted_at) {
    const startedAgoMin = (Date.now() - new Date(state.last_attempted_at).getTime()) / 60_000
    if (startedAgoMin < STALE_LOCK_MIN) {
      return NextResponse.json({ ok: false, skipped: 'already_running' }, { status: 409 })
    }
  }

  await supabase.from('amazon_sync_state').upsert({
    resource:          RESOURCE,
    last_attempted_at: new Date().toISOString(),
    is_running:        true,
    last_error:        null,
  }, { onConflict: 'resource' })

  let totalImported = 0
  try {
    const since = backfillDays > 0
      ? new Date(Date.now() - backfillDays * 86400_000).toISOString()
      : (state?.last_completed_at ?? new Date(Date.now() - 30 * 86400_000).toISOString())

    let nextToken: string | undefined
    do {
      const params: Record<string, string | number> = {
        MarketplaceIds: marketplaceId,
        CreatedAfter:   since,
        MaxResultsPerPage: 100,
      }
      if (nextToken) params.NextToken = nextToken

      const result = await client.request<{
        payload?: { Orders?: SpOrder[]; NextToken?: string }
      }>('GET', '/orders/v0/orders', { query: params })

      const orders = result.payload?.Orders ?? []
      nextToken    = result.payload?.NextToken

      if (orders.length > 0) {
        const orderRows = orders.map(o => ({
          amazon_order_id:     o.AmazonOrderId,
          marketplace_id:      marketplaceId,
          purchase_date:       o.PurchaseDate,
          last_update_date:    o.LastUpdateDate ?? null,
          order_status:        o.OrderStatus ?? null,
          fulfillment_channel: o.FulfillmentChannel ?? null,
          sales_channel:       o.SalesChannel ?? null,
          order_total_cents:   dollarsToCents(o.OrderTotal?.Amount),
          currency:            o.OrderTotal?.CurrencyCode ?? null,
          number_of_items:     (o.NumberOfItemsShipped ?? 0) + (o.NumberOfItemsUnshipped ?? 0),
          is_business_order:   o.IsBusinessOrder ?? null,
          is_premium_order:    o.IsPremiumOrder ?? null,
          raw:                 o,
          updated_at:          new Date().toISOString(),
        }))

        const { error: orderErr } = await supabase
          .from('amazon_orders')
          .upsert(orderRows, { onConflict: 'amazon_order_id' })

        if (orderErr) throw new Error(`upsert orders: ${orderErr.message}`)

        // Pull les line items pour chaque order (rate limit ~0.5 req/s)
        for (const o of orders) {
          try {
            const itemsRes = await client.request<{
              payload?: { OrderItems?: SpOrderItem[]; NextToken?: string }
            }>('GET', `/orders/v0/orders/${encodeURIComponent(o.AmazonOrderId)}/orderItems`)

            const items = itemsRes.payload?.OrderItems ?? []
            if (items.length > 0) {
              const itemRows = items.map(it => ({
                amazon_order_id:      o.AmazonOrderId,
                asin:                 it.ASIN,
                seller_sku:           it.SellerSKU ?? null,
                title:                it.Title ?? null,
                quantity_ordered:     it.QuantityOrdered,
                quantity_shipped:     it.QuantityShipped ?? null,
                item_price_cents:     dollarsToCents(it.ItemPrice?.Amount),
                item_tax_cents:       dollarsToCents(it.ItemTax?.Amount),
                shipping_price_cents: dollarsToCents(it.ShippingPrice?.Amount),
                currency:             it.ItemPrice?.CurrencyCode ?? null,
              }))
              await supabase
                .from('amazon_order_items')
                .upsert(itemRows, { onConflict: 'amazon_order_id,asin,seller_sku' })
            }
          } catch (itemErr) {
            console.warn(`order items fetch failed for ${o.AmazonOrderId}:`, itemErr)
          }
        }

        totalImported += orderRows.length
      }
    } while (nextToken)

    await supabase.from('amazon_sync_state').upsert({
      resource:          RESOURCE,
      last_completed_at: new Date().toISOString(),
      is_running:        false,
      last_error:        null,
      rows_imported:     totalImported,
    }, { onConflict: 'resource' })

    return NextResponse.json({
      ok:       true,
      resource: RESOURCE,
      imported: totalImported,
      since:    backfillDays > 0 ? `${backfillDays}d backfill` : (state?.last_completed_at ?? 'first run'),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await supabase.from('amazon_sync_state').upsert({
      resource:    RESOURCE,
      is_running:  false,
      last_error:  message,
    }, { onConflict: 'resource' })

    if (err instanceof SpApiError) {
      return NextResponse.json({ ok: false, error: 'sp_api_error', status: err.status, body: err.body }, { status: 502 })
    }
    return NextResponse.json({ ok: false, error: 'sync_failed', message }, { status: 500 })
  }
}

export async function GET(req: NextRequest) { return POST(req) }
