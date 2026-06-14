import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdminToken, adminAuthError } from '@/lib/auth/require-admin-token'

// Livre d'entreprise (actionnaires) de COMMERCE CERDIA — accès via service_role pour l'admin commerce
// CONNECTÉ (super_admin … org_commerce). Données sensibles (équité) : jamais anon.
//
// CLOISONNEMENT INTER-COMPAGNIES (demande Eric) : Commerce CERDIA et les tenants/investisseur sont des
// COMPAGNIES SÉPARÉES. Ce registre est donc strictement borné à l'organisation Commerce CERDIA via
// `organization_id = COMMERCE_ORG`. Lecture, écriture ET suppression sont filtrées sur cette org : on ne
// voit jamais le livre d'une autre compagnie et on ne peut jamais en supprimer une ligne (fin de la
// contamination / suppression croisée avec la zone investisseur).
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const COMMERCE_ORG = 'c0000000-0000-0000-0000-000000000001' // CERDIA Globale (compagnie Commerce CERDIA)

export async function GET(req: NextRequest) {
  try { await requireAdminToken(req) } catch (e) { return adminAuthError(e) }
  const { data, error } = await supabase.from('company_shareholders')
    .select('*').eq('organization_id', COMMERCE_ORG).order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ shareholders: data || [] })
}

export async function POST(req: NextRequest) {
  try { await requireAdminToken(req) } catch (e) { return adminAuthError(e) }
  let payload: any
  try { payload = await req.json() } catch { return NextResponse.json({ error: 'JSON invalide' }, { status: 400 }) }
  if (!payload || typeof payload !== 'object') return NextResponse.json({ error: 'Données invalides' }, { status: 400 })
  // Force l'organisation Commerce CERDIA (jamais celle envoyée par le client) — isolation garantie.
  const row = { ...payload, organization_id: COMMERCE_ORG }
  const { error } = await supabase.from('company_shareholders').insert(row)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  try { await requireAdminToken(req) } catch (e) { return adminAuthError(e) }
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })
  // Suppression bornée à l'org Commerce : impossible d'effacer le livre d'une autre compagnie.
  const { error } = await supabase.from('company_shareholders').delete().eq('id', id).eq('organization_id', COMMERCE_ORG)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
