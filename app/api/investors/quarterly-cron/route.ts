/**
 * GET /api/investors/quarterly-cron
 *
 * Cron trimestriel (via vercel.json) qui crée les demandes de rapports
 * trimestriels PDF pour tous les investisseurs actifs.
 *
 * - Calcule le trimestre courant et l'année fiscale
 * - Insère dans investor_report_requests (ON CONFLICT DO NOTHING)
 *   pour chaque investisseur
 * - L'admin peut ensuite voir les demandes en attente et déclencher
 *   la génération depuis AdministrationTab
 *
 * Auth : header Authorization: Bearer <CRON_SECRET>
 *        ou Bearer <ADMIN_API_TOKEN> pour les tests manuels
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}

function authorizeRequest(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!token) return false
  const cronSecret  = process.env.CRON_SECRET
  const adminToken  = process.env.ADMIN_API_TOKEN
  return token === cronSecret || token === adminToken
}

/** Retourne le trimestre (1-4) correspondant au mois donné (0-indexed). */
function currentQuarter(month: number): number {
  return Math.ceil((month + 1) / 3)
}

export async function GET(request: NextRequest) {
  if (!authorizeRequest(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const now    = new Date()
  const year   = now.getFullYear()
  const quarter = currentQuarter(now.getMonth())

  const supabase = getSupabaseAdmin()

  // ── 1. Récupère tous les investor IDs ────────────────────────────────
  const { data: investors, error: investorsError } = await supabase
    .from('investors')
    .select('id')

  if (investorsError) {
    console.error('[quarterly-cron] Could not fetch investors:', investorsError.message)
    return NextResponse.json({ error: investorsError.message }, { status: 500 })
  }

  if (!investors || investors.length === 0) {
    return NextResponse.json({ created: 0, fiscal_year: year, quarter })
  }

  // ── 2. Insère les demandes (ON CONFLICT DO NOTHING via upsert ignoreMerge) ─
  // Supabase JS v2 ne supporte pas ON CONFLICT DO NOTHING directement,
  // on insère chaque demande individuellement avec ignoreDuplicates via
  // l'option onConflict de upsert.
  const requests = investors.map((inv: { id: string }) => ({
    investor_id:  inv.id,
    fiscal_year:  year,
    quarter:      quarter,
    status:       'pending' as const,
  }))

  const { data: inserted, error: insertError } = await supabase
    .from('investor_report_requests')
    .upsert(requests, {
      onConflict:        'investor_id,fiscal_year,quarter',
      ignoreDuplicates:  true,
    })
    .select('id')

  if (insertError) {
    console.error('[quarterly-cron] Insert error:', insertError.message)
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  const created = inserted?.length ?? 0

  console.log(
    `[quarterly-cron] T${quarter} ${year} — ${created} demande(s) créée(s) sur ${investors.length} investisseur(s)`
  )

  return NextResponse.json({
    fiscal_year: year,
    quarter,
    total_investors: investors.length,
    created,
  })
}
