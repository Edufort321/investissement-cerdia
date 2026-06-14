import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import { requireSuperAdminToken } from '@/lib/auth/require-admin-token'

// Gestion des ADMINISTRATEURS COMMERCE. Crée un vrai compte Supabase Auth (connexion DIRECTE sur CERDIA
// avec email + mot de passe) + profil rôle COMMERCE par défaut (`org_commerce` = accès /commerce SANS la
// zone investisseur). Appelable : (a) par le pont C-Secur360 (secret), (b) directement depuis l'admin
// CERDIA par un super_admin (gestion native). org rattachée à CERDIA Globale.
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const SYNC_SECRET = process.env.CSECUR360_SYNC_SECRET
const CERDIA_ORG = 'c0000000-0000-0000-0000-000000000001'
const ALLOWED_ROLES = ['org_commerce', 'org_admin', 'super_admin']

function isSync(req: NextRequest) { return !!SYNC_SECRET && req.headers.get('authorization') === `Bearer ${SYNC_SECRET}` }
async function authorize(req: NextRequest): Promise<boolean> {
  if (isSync(req)) return true
  try { await requireSuperAdminToken(req); return true } catch { return false }
}

async function findUserIdByEmail(email: string): Promise<string | null> {
  const target = email.toLowerCase()
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 })
    if (error || !data?.users?.length) return null
    const hit = data.users.find(u => (u.email || '').toLowerCase() === target)
    if (hit) return hit.id
    if (data.users.length < 1000) return null
  }
  return null
}

// GET → liste des administrateurs commerce (super_admin seulement).
export async function GET(req: NextRequest) {
  try { await requireSuperAdminToken(req) } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const { data: profs } = await supabase.from('profiles').select('id, role, full_name').in('role', ['org_commerce', 'org_admin'])
  const ids = new Set((profs || []).map(p => p.id))
  const emails: Record<string, string> = {}
  for (let page = 1; page <= 10 && ids.size; page++) {
    const { data } = await supabase.auth.admin.listUsers({ page, perPage: 1000 })
    if (!data?.users?.length) break
    for (const u of data.users) if (ids.has(u.id)) emails[u.id] = u.email || ''
    if (data.users.length < 1000) break
  }
  const admins = (profs || []).map(p => ({ id: p.id, role: p.role, name: p.full_name, email: emails[p.id] || '' }))
  return NextResponse.json({ admins })
}

export async function POST(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  let body: any = {}
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON invalide' }, { status: 400 }) }
  const email = String(body.email || '').trim().toLowerCase()
  if (!email) return NextResponse.json({ error: 'email requis' }, { status: 400 })
  const name = body.name || body.full_name || email.split('@')[0]
  // Par défaut : COMMERCE seulement (org_commerce). Élevable explicitement via body.role.
  const role = ALLOWED_ROLES.includes(body.role) ? body.role : 'org_commerce'
  const providedPwd = typeof body.password === 'string' && body.password ? body.password : null
  const password = providedPwd || ('Cer' + crypto.randomBytes(9).toString('base64').replace(/[^a-zA-Z0-9]/g, '') + '!9')

  try {
    let userId: string | null = null
    let created = false
    const { data: cr, error: ce } = await supabase.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: name } })
    if (cr?.user) { userId = cr.user.id; created = true }
    else {
      userId = await findUserIdByEmail(email)
      if (!userId) return NextResponse.json({ error: ce?.message || 'Création/identification impossible' }, { status: 500 })
      if (providedPwd) await supabase.auth.admin.updateUserById(userId, { password, email_confirm: true, user_metadata: { full_name: name } })
    }

    // Profil : rôle + organisation (CERDIA Globale). Upsert (le trigger a pu créer la ligne).
    const { error: pe } = await supabase.from('profiles').upsert({ id: userId, role, full_name: name, organization_id: CERDIA_ORG }, { onConflict: 'id' })
    if (pe) return NextResponse.json({ error: 'Profil : ' + pe.message }, { status: 500 })

    let recoveryLink: string | undefined
    if (!providedPwd) {
      try { const { data: link } = await supabase.auth.admin.generateLink({ type: 'recovery', email }); recoveryLink = (link as any)?.properties?.action_link } catch {}
    }
    return NextResponse.json({ ok: true, created, role, email, samePassword: !!providedPwd, recoveryLink })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erreur' }, { status: 500 })
  }
}

// DELETE → révoque l'accès commerce (rétrograde le rôle). super_admin seulement.
export async function DELETE(req: NextRequest) {
  try { await requireSuperAdminToken(req) } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })
  const { error } = await supabase.from('profiles').update({ role: 'org_viewer' }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
