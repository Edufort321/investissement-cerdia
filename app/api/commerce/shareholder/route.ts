import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdminToken, adminAuthError } from '@/lib/auth/require-admin-token'

// Livre d'entreprise (actionnaires) — accès via service_role pour l'admin commerce CONNECTÉ
// (super_admin … org_commerce). Contourne le RLS de company_shareholders (limité à super_admin/org_admin)
// tout en gardant un contrôle d'accès strict par session admin. Données sensibles (équité) : jamais anon.
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(req: NextRequest) {
  try { await requireAdminToken(req) } catch (e) { return adminAuthError(e) }
  const { data, error } = await supabase.from('company_shareholders').select('*').order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ shareholders: data || [] })
}

export async function POST(req: NextRequest) {
  try { await requireAdminToken(req) } catch (e) { return adminAuthError(e) }
  let payload: any
  try { payload = await req.json() } catch { return NextResponse.json({ error: 'JSON invalide' }, { status: 400 }) }
  if (!payload || typeof payload !== 'object') return NextResponse.json({ error: 'Données invalides' }, { status: 400 })
  const { error } = await supabase.from('company_shareholders').insert(payload)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  try { await requireAdminToken(req) } catch (e) { return adminAuthError(e) }
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })
  const { error } = await supabase.from('company_shareholders').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
