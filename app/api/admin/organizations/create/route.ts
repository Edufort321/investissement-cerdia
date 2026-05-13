/**
 * POST /api/admin/organizations/create
 *
 * Creation one-click d'un nouveau tenant.
 * Reserve aux super_admin (Eric).
 *
 * Body :
 *   {
 *     name: string,              // requis, nom de l'organisation
 *     slug?: string,             // optionnel (auto-genere depuis name)
 *     admin_email: string,       // requis, email du futur org_admin
 *     admin_full_name?: string,  // optionnel
 *     plan?: 'basic' | 'pro' | 'enterprise' | 'demo' | 'internal',
 *     logo_url?: string,
 *     annual_amount_cad?: number,
 *     start_date?: string,       // ISO date
 *   }
 *
 * Réponse 200 :
 *   {
 *     organization: { id, name, slug, plan, ... },
 *     admin_user_id: string,
 *     magic_link: string,        // a copier-coller au client pour qu'il se connecte
 *     temp_password: string,     // password temporaire en clair (a montrer 1 fois a Eric)
 *   }
 *
 * Pre-requis :
 *   - Migration 145 (organizations table)
 *   - Migration 151 (handle_new_user trigger qui lit user_metadata)
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin, SuperAdminAuthError } from '@/lib/auth/super-admin-server'
import crypto from 'crypto'

function slugify(input: string): string {
  return input
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

function generatePassword(): string {
  // 24 chars : lettres + chiffres, suffisant pour un mdp temporaire
  return crypto.randomBytes(18).toString('base64').replace(/[+/=]/g, '').slice(0, 24)
}

export async function POST(request: NextRequest) {
  let auth
  try {
    auth = await requireSuperAdmin(request)
  } catch (e) {
    if (e instanceof SuperAdminAuthError) {
      const status = e.reason === 'no_token' || e.reason === 'invalid_token' ? 401 : 403
      return NextResponse.json({ error: e.reason }, { status })
    }
    return NextResponse.json({ error: 'auth_failed' }, { status: 500 })
  }

  const { admin } = auth

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  // ── Validation ───────────────────────────────────────────
  const name: string = String(body?.name || '').trim()
  const admin_email: string = String(body?.admin_email || '').trim().toLowerCase()
  if (!name) return NextResponse.json({ error: 'name_required' }, { status: 400 })
  if (!admin_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(admin_email)) {
    return NextResponse.json({ error: 'invalid_email' }, { status: 400 })
  }
  const slug: string = (body?.slug ? String(body.slug) : slugify(name)).slice(0, 60)
  const plan: string = ['basic', 'pro', 'enterprise', 'demo', 'internal'].includes(body?.plan) ? body.plan : 'basic'
  const logo_url: string | null = body?.logo_url ? String(body.logo_url) : null
  const admin_full_name: string = String(body?.admin_full_name || '').trim() || admin_email
  const annual_amount_cad: number | null = typeof body?.annual_amount_cad === 'number' ? body.annual_amount_cad : null
  const start_date: string | null = body?.start_date ? String(body.start_date) : null

  // ── 1. INSERT organizations ──────────────────────────────
  const initialSettings = {
    currency_primary: 'CAD',
    currencies_enabled: ['CAD'],
    tax_jurisdiction: 'CA',
    modules: { investment: true, commerce: true, gmail: true, amazon: false },
    billing: {
      annual_amount_cad: annual_amount_cad ?? null,
      start_date: start_date ?? null,
    },
  }

  const { data: org, error: orgErr } = await admin
    .from('organizations')
    .insert({
      name,
      slug,
      logo_url,
      plan,
      status: 'active',
      settings: initialSettings,
    })
    .select('id, name, slug, plan, status, logo_url, created_at')
    .single()

  if (orgErr || !org) {
    console.error('[organizations/create] insert org failed:', orgErr)
    const isUnique = String(orgErr?.message || '').includes('duplicate key')
    return NextResponse.json(
      { error: isUnique ? 'slug_already_used' : 'insert_org_failed', detail: orgErr?.message },
      { status: 500 },
    )
  }

  // ── 2. createUser (auth.users) + auto-profile via trigger ─
  const temp_password = generatePassword()
  const { data: createdUser, error: userErr } = await admin.auth.admin.createUser({
    email: admin_email,
    password: temp_password,
    email_confirm: true, // skip email verification — Eric envoie le link manuellement
    user_metadata: {
      full_name: admin_full_name,
      organization_id: org.id,
      role: 'org_admin',
    },
  })

  if (userErr || !createdUser?.user) {
    // Rollback : on supprime l'organisation créée
    await admin.from('organizations').delete().eq('id', org.id)
    console.error('[organizations/create] createUser failed:', userErr)
    return NextResponse.json(
      { error: 'create_user_failed', detail: userErr?.message },
      { status: 500 },
    )
  }

  // ── 3. Verifier que le profile a bien ete cree avec le bon org_id ─
  // (le trigger handle_new_user le fait, mais on verifie + on update au cas où)
  const { data: profileCheck } = await admin
    .from('profiles')
    .select('id, organization_id, role, full_name')
    .eq('id', createdUser.user.id)
    .maybeSingle()

  if (!profileCheck || profileCheck.organization_id !== org.id) {
    // Soit le trigger n'a pas lu les metadata (mig 151 pas appliquee ?), soit
    // le profile n'existe pas. On le force.
    await admin.from('profiles').upsert({
      id: createdUser.user.id,
      organization_id: org.id,
      role: 'org_admin',
      full_name: admin_full_name,
      onboarding_completed: false,
    })
  }

  // ── 4. Generer un magic link a partager au client ────────
  // redirectTo : apres validation du link, l'utilisateur atterrit sur /dashboard
  const origin = new URL(request.url).origin
  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: admin_email,
    options: {
      redirectTo: `${origin}/dashboard`,
    },
  })

  if (linkErr) {
    console.error('[organizations/create] generateLink failed:', linkErr)
    // Pas fatal — on retourne quand meme l'org créée + le password temporaire
  }

  return NextResponse.json({
    organization: org,
    admin_user_id: createdUser.user.id,
    magic_link: linkData?.properties?.action_link || null,
    temp_password,
  })
}
