import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
    const body = await req.json()
    const { organization_id, label, tabs, selected_year, filter_period, expires_days } = body

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
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error } = await supabase
    .from('accountant_tokens')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
