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
  const { data, error } = await supabase.from('csecur360_vendors').select('*').order('name')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ vendors: data || [] })
}

export async function POST(req: NextRequest) {
  if (!(await auth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { name, email, phone, commission_rate, notes } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'name requis' }, { status: 400 })

  const { data, error } = await supabase.from('csecur360_vendors').insert({
    id: crypto.randomUUID(),
    name: name.trim(),
    email: email?.trim() || null,
    phone: phone?.trim() || null,
    commission_rate: typeof commission_rate === 'number' ? commission_rate : 0.20,
    notes: notes?.trim() || null,
    synced_at: new Date().toISOString(),
  }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ vendor: data })
}

export async function PATCH(req: NextRequest) {
  if (!(await auth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, ...updates } = await req.json()
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })
  const allowed = ['name', 'email', 'phone', 'commission_rate', 'is_active', 'notes']
  const safe = Object.fromEntries(Object.entries(updates).filter(([k]) => allowed.includes(k)))
  const { error } = await supabase.from('csecur360_vendors').update(safe).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  if (!(await auth(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })
  const { error } = await supabase.from('csecur360_vendors').update({ is_active: false }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
