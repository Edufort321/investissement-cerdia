import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdminToken, adminAuthError } from '@/lib/auth/require-admin-token'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function generateToken(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let token = ''
  const array = new Uint8Array(48)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array)
    for (let i = 0; i < array.length; i++) token += chars[array[i] % chars.length]
  } else {
    for (let i = 0; i < 48; i++) token += chars[Math.floor(Math.random() * chars.length)]
  }
  return token
}

// POST — create a new accountant token
export async function POST(req: NextRequest) {
  try {
    // 🔒 Auth admin. Le token est TOUJOURS scopé à l'org du caller (anti-BOLA) :
    // on ignore tout organization_id fourni par un org_admin et on force celui de
    // son profil ; seul un super_admin peut viser une autre org explicitement.
    let caller
    try {
      caller = await requireAdminToken(req)
    } catch (e) {
      return adminAuthError(e)
    }

    const body = await req.json().catch(() => ({} as any))
    const { label, tabs, selected_year, filter_period, expires_days } = body

    const organization_id = caller.profile.isSuperAdmin
      ? (body.organization_id || caller.profile.organization_id)
      : caller.profile.organization_id

    if (!organization_id) {
      return NextResponse.json({ error: 'organization_id required' }, { status: 400 })
    }

    const token = generateToken()
    const expiryDays = Math.min(Math.max(expires_days || 30, 1), 365)

    const { data, error } = await supabase
      .from('accountant_tokens')
      .insert({
        organization_id,
        token,
        label: label || null,
        tabs: tabs || ['transactions', 'rapports_fiscaux'],
        selected_year: selected_year || null,
        filter_period: filter_period || 'annual',
        expires_at: new Date(Date.now() + expiryDays * 86400000).toISOString(),
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ token: data.token, id: data.id, expires_at: data.expires_at })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// GET — verify a token and return its config (for the share page)
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'token required' }, { status: 400 })

  const { data, error } = await supabase
    .from('accountant_tokens')
    .select('*')
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (error || !data) return NextResponse.json({ error: 'Token invalide ou expiré' }, { status: 404 })

  // Increment access count
  await supabase
    .from('accountant_tokens')
    .update({ access_count: (data.access_count || 0) + 1, last_accessed: new Date().toISOString() })
    .eq('id', data.id)

  return NextResponse.json({
    organization_id: data.organization_id,
    tabs: data.tabs,
    selected_year: data.selected_year,
    filter_period: data.filter_period,
    label: data.label,
    expires_at: data.expires_at,
  })
}

// DELETE — revoke a token
export async function DELETE(req: NextRequest) {
  // 🔒 Auth admin + scope org : on ne peut révoquer que les tokens de sa propre org.
  let caller
  try {
    caller = await requireAdminToken(req)
  } catch (e) {
    return adminAuthError(e)
  }

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  let del = supabase.from('accountant_tokens').delete().eq('id', id)
  // Un org_admin ne peut supprimer que dans son org ; super_admin partout.
  if (!caller.profile.isSuperAdmin) {
    del = del.eq('organization_id', caller.profile.organization_id as string)
  }
  const { error } = await del

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
