import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { authorizeCommerce } from '@/lib/auth/commerce-auth'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Fail-secure : pas de secret par défaut (voir csecur360/route.ts).
const SYNC_SECRET = process.env.CSECUR360_SYNC_SECRET
// URL de C-Secur360 (appel SORTANT). En prod, surtout PAS localhost (sinon « fetch failed »). On retombe
// sur l'URL publique connue si l'env n'est pas configuré.
const CSECUR360_API_URL = (process.env.CSECUR360_API_URL || process.env.NEXT_PUBLIC_CSECUR360_URL || 'https://www.c-secur360.ca').replace(/\/$/, '')

// POST /api/commerce/csecur360/sync
// Tire tous les tenants + vendeurs depuis C-Secur360 et upsert localement.
// Déclencheur : admin commerce connecté (session) OU secret de pont. L'appel SORTANT vers C-Secur360,
// lui, utilise toujours le secret de pont serveur→serveur (jamais la session du navigateur).
export async function POST(req: NextRequest) {
  if (!(await authorizeCommerce(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!SYNC_SECRET) {
    return NextResponse.json({ error: 'CSECUR360_SYNC_SECRET non configuré côté serveur — synchronisation impossible.' }, { status: 503 })
  }

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${SYNC_SECRET}`,
  }

  let vendorsSynced = 0
  let clientsSynced = 0
  const errors: string[] = []

  // Supprime localement les lignes ABSENTES de la source (suppression propagée). Garde-fou : on ne
  // purge QUE si la source a renvoyé une liste valide (jamais sur un fetch en échec, sinon on viderait
  // tout). Pour CERDIA (org interne), on ne touche pas si jamais elle est mirrorée ici.
  async function pruneMissing(table: string, col: string, keepKeys: (string | number)[]) {
    const { data: existing } = await supabase.from(table).select(col)
    const keep = new Set(keepKeys.map(String))
    const toDelete = (existing || []).map((r: any) => r[col]).filter((k: any) => !keep.has(String(k)))
    if (toDelete.length) await supabase.from(table).delete().in(col, toDelete)
    return toDelete.length
  }

  try {
    // 1. Pull vendeurs
    const vRes = await fetch(`${CSECUR360_API_URL}/api/admin/vendors`, { headers })
    if (vRes.ok) {
      const { vendors } = await vRes.json()
      if (Array.isArray(vendors)) {
        if (vendors.length > 0) {
          const { error } = await supabase.from('csecur360_vendors').upsert(
            vendors.map((v: any) => ({
              id: v.id,
              name: v.name,
              email: v.email || null,
              phone: v.phone || null,
              commission_rate: Number(v.commission_rate ?? 0.20),
              is_active: v.is_active !== false,
              notes: v.notes || null,
              synced_at: new Date().toISOString(),
            })),
            { onConflict: 'id' }
          )
          if (error) errors.push(`vendors: ${error.message}`)
          else vendorsSynced = vendors.length
        }
        await pruneMissing('csecur360_vendors', 'id', vendors.map((v: any) => v.id))
      }
    } else {
      errors.push(`vendors fetch: HTTP ${vRes.status}`)
    }
  } catch (e: any) {
    errors.push(`vendors: ${e.message}`)
  }

  try {
    // 2. Pull tenants
    const tRes = await fetch(`${CSECUR360_API_URL}/api/admin/tenants`, { headers })
    if (tRes.ok) {
      const { tenants } = await tRes.json()
      if (Array.isArray(tenants)) {
        if (tenants.length > 0) {
          const { error } = await supabase.from('csecur360_clients').upsert(
            tenants.map((t: any) => {
              const billable = t.billable !== false
              // Non-facturable (démo / case décochée) => revenu 0 dans le miroir (cohérent avec C-Secur).
              const annual = billable ? Number(t.annualRevenue || 0) : 0
              return {
                id: t.id,
                company_name: t.companyName || t.id,
                admin_email: t.adminEmail || t.billing_email || null,
                plan: t.plan || 'professional',
                monthly_revenue: Math.round(annual / 12 * 100) / 100,
                annual_revenue: annual,
                modules_count: Object.keys(t.modules || {}).length || 0,
                sites_count: 1,
                status: t.archived ? 'archived' : t.isActive === false ? 'suspended' : 'active',
                vendor_id: t.vendor_id || null,
                billable,
                synced_at: new Date().toISOString(),
              }
            }),
            { onConflict: 'id' }
          )
          if (error) errors.push(`clients: ${error.message}`)
          else clientsSynced = tenants.length
        }
        await pruneMissing('csecur360_clients', 'id', tenants.map((t: any) => t.id))
      }
    } else {
      errors.push(`tenants fetch: HTTP ${tRes.status}`)
    }
  } catch (e: any) {
    errors.push(`clients: ${e.message}`)
  }

  let modulesSynced = 0
  try {
    // 3. Pull modules catalogue
    const mRes = await fetch(`${CSECUR360_API_URL}/api/admin/modules`, { headers })
    if (mRes.ok) {
      const { modules } = await mRes.json()
      if (Array.isArray(modules)) {
        if (modules.length > 0) {
          const { error } = await supabase.from('csecur360_modules').upsert(
            modules.map((m: any) => ({
              key: m.key,
              name_fr: m.name_fr,
              name_en: m.name_en,
              monthly_price: Number(m.monthly_price ?? 0),
              sort_order: Number(m.sort_order ?? 0),
              is_active: m.is_active !== false,
              active_tenants: Number(m.active_tenants ?? 0),
              billable_tenants: Number(m.billable_tenants ?? 0),
              synced_at: new Date().toISOString(),
            })),
            { onConflict: 'key' }
          )
          if (error) errors.push(`modules: ${error.message}`)
          else modulesSynced = modules.length
        }
        await pruneMissing('csecur360_modules', 'key', modules.map((m: any) => m.key))
      }
    } else {
      errors.push(`modules fetch: HTTP ${mRes.status}`)
    }
  } catch (e: any) {
    errors.push(`modules: ${e.message}`)
  }

  return NextResponse.json({
    ok: errors.length === 0,
    vendorsSynced,
    clientsSynced,
    modulesSynced,
    errors,
    syncedAt: new Date().toISOString(),
  })
}
