import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { authorizeCommerce } from '@/lib/auth/commerce-auth'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Auth : secret de pont (serveur→serveur) OU session admin connectée (super_admin … org_commerce).
// Voir lib/auth/commerce-auth.ts.

// GET → liste tous les clients C-Secur360 avec totaux
export async function GET(req: NextRequest) {
  if (!(await authorizeCommerce(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('csecur360_clients')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const totalMonthly = (data || []).reduce((s, r) => s + Number(r.monthly_revenue || 0), 0)
  const totalAnnual = (data || []).reduce((s, r) => s + Number(r.annual_revenue || 0), 0)
  const activeCount = (data || []).filter(r => r.status === 'active').length

  return NextResponse.json({ clients: data || [], totalMonthly, totalAnnual, activeCount })
}

// POST → creer ou mettre a jour un client depuis C-Secur360
export async function POST(req: NextRequest) {
  if (!(await authorizeCommerce(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { id, company_name, admin_email, plan, monthly_revenue, annual_revenue, modules_count, sites_count, status, billable } = body

    if (!id || !company_name) {
      return NextResponse.json({ error: 'id et company_name requis' }, { status: 400 })
    }

    // billable transmis par C-Secur (démo/non-facturable => false). Si non-facturable, revenu forcé à 0
    // dans le miroir (évite l'ARR fantôme). Défaut true seulement si le champ est absent (compat).
    const isBillable = billable !== false
    const { error } = await supabase.from('csecur360_clients').upsert({
      id,
      company_name,
      admin_email: admin_email || null,
      plan: plan || 'professional',
      monthly_revenue: isBillable ? Number(monthly_revenue || 0) : 0,
      annual_revenue: isBillable ? Number(annual_revenue || 0) : 0,
      modules_count: Number(modules_count || 0),
      sites_count: Number(sites_count || 1),
      status: status || 'active',
      billable: isBillable,
      synced_at: new Date().toISOString(),
    }, { onConflict: 'id' })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true, id })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erreur' }, { status: 500 })
  }
}

// PATCH → mettre a jour le statut (suspension, annulation)
export async function PATCH(req: NextRequest) {
  if (!(await authorizeCommerce(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id, status } = await req.json()
    if (!id || !status) return NextResponse.json({ error: 'id et status requis' }, { status: 400 })

    const { error } = await supabase
      .from('csecur360_clients')
      .update({ status, synced_at: new Date().toISOString() })
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erreur' }, { status: 500 })
  }
}
