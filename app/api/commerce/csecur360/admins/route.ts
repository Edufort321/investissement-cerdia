import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

// Reçoit un administrateur poussé par C-Secur360 et crée/maj le compte CERDIA correspondant
// (Supabase Auth + profil). Auth par secret de pont (fail-secure). « Même mot de passe à la création » :
// si un mot de passe est fourni (nouvel admin, en clair), le compte CERDIA a le MÊME identifiant.
// Sinon (admin existant re-poussé), on crée avec un mot de passe temporaire + lien de réinitialisation.
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const SYNC_SECRET = process.env.CSECUR360_SYNC_SECRET
function auth(req: NextRequest) { return !!SYNC_SECRET && req.headers.get('authorization') === `Bearer ${SYNC_SECRET}` }

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

export async function POST(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  let body: any = {}
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON invalide' }, { status: 400 }) }
  const email = String(body.email || '').trim().toLowerCase()
  if (!email) return NextResponse.json({ error: 'email requis' }, { status: 400 })
  const name = body.name || body.full_name || email.split('@')[0]
  // c-secur super_admin -> CERDIA super_admin (accès plateforme). Modifiable via body.role.
  const role = body.role === 'org_admin' ? 'org_admin' : 'super_admin'
  const providedPwd = typeof body.password === 'string' && body.password ? body.password : null
  const password = providedPwd || ('Cer' + crypto.randomBytes(9).toString('base64').replace(/[^a-zA-Z0-9]/g, '') + '!9')

  try {
    let userId: string | null = null
    let created = false
    const { data: cr, error: ce } = await supabase.auth.admin.createUser({
      email, password, email_confirm: true, user_metadata: { full_name: name },
    })
    if (cr?.user) { userId = cr.user.id; created = true }
    else {
      // Existe déjà -> on récupère l'id et on met à jour (mot de passe seulement si fourni).
      userId = await findUserIdByEmail(email)
      if (!userId) return NextResponse.json({ error: ce?.message || 'Création/identification impossible' }, { status: 500 })
      if (providedPwd) await supabase.auth.admin.updateUserById(userId, { password, email_confirm: true, user_metadata: { full_name: name } })
    }

    // Profil : rôle administrateur (le trigger on_auth_user_created a pu créer la ligne -> upsert).
    const { error: pe } = await supabase.from('profiles').upsert({ id: userId, role, full_name: name }, { onConflict: 'id' })
    if (pe) return NextResponse.json({ error: 'Profil : ' + pe.message }, { status: 500 })

    // Pas de mot de passe fourni -> lien de réinitialisation pour que l'admin définisse le sien.
    let recoveryLink: string | undefined
    if (!providedPwd) {
      try {
        const { data: link } = await supabase.auth.admin.generateLink({ type: 'recovery', email })
        recoveryLink = (link as any)?.properties?.action_link
      } catch { /* SMTP/lien optionnel */ }
    }
    return NextResponse.json({ ok: true, created, role, email, samePassword: !!providedPwd, recoveryLink })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erreur' }, { status: 500 })
  }
}
