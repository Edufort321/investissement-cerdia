import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { authorizeCommerce } from '@/lib/auth/commerce-auth'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Auth : secret de pont OU session admin connectée (incl. org_commerce). Voir lib/auth/commerce-auth.ts.
const auth = authorizeCommerce

export async function GET(req: NextRequest) {
  if (!(await auth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data, error } = await supabase
    .from('csecur360_modules')
    .select('key, name_fr, name_en, monthly_price, sort_order, is_active, active_tenants, billable_tenants, synced_at')
    .order('sort_order')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ modules: data || [] })
}

// POST → c-secur360 POUSSE un module (produit) en temps réel à sa création/mise à jour.
// Upsert par clé ; auth par secret de pont. Accepte un module ou un tableau de modules.
export async function POST(req: NextRequest) {
  if (!(await auth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  let body: any = {}
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON invalide' }, { status: 400 }) }
  const list: any[] = Array.isArray(body) ? body : (Array.isArray(body.modules) ? body.modules : [body])
  const rows = list
    .filter(m => m && m.key)
    .map(m => ({
      key: String(m.key),
      name_fr: m.name_fr ?? m.nameFr ?? String(m.key),
      name_en: m.name_en ?? m.nameEn ?? String(m.key),
      monthly_price: m.monthly_price != null ? Number(m.monthly_price) : (m.monthlyPrice != null ? Number(m.monthlyPrice) : 0),
      sort_order: m.sort_order != null ? Number(m.sort_order) : (m.sortOrder != null ? Number(m.sortOrder) : 0),
      is_active: m.is_active != null ? !!m.is_active : (m.isActive != null ? !!m.isActive : true),
      ...(m.active_tenants != null ? { active_tenants: Number(m.active_tenants) } : {}),
      ...(m.billable_tenants != null ? { billable_tenants: Number(m.billable_tenants) } : {}),
      synced_at: new Date().toISOString(),
    }))
  if (!rows.length) return NextResponse.json({ error: 'Aucun module valide (clé requise).' }, { status: 400 })
  const { error } = await supabase.from('csecur360_modules').upsert(rows, { onConflict: 'key' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, upserted: rows.length })
}
