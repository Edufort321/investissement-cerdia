import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const SYNC_SECRET = process.env.CSECUR360_SYNC_SECRET || 'csecur360-cerdia-bridge'

function auth(req: NextRequest) {
  return req.headers.get('authorization') === `Bearer ${SYNC_SECRET}`
}

export async function GET(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data, error } = await supabase
    .from('csecur360_modules')
    .select('key, name_fr, name_en, monthly_price, sort_order, is_active, active_tenants, billable_tenants, synced_at')
    .order('sort_order')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ modules: data || [] })
}
