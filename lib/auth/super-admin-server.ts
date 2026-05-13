/**
 * Helper d'auth super_admin pour les API routes server-side.
 *
 * L'app utilise un client Supabase avec session en localStorage (pas cookies),
 * donc requireAdmin() de lib/auth/admin.ts ne voit pas la session. À la place,
 * le client envoie son access_token dans le header Authorization, et le serveur
 * verifie via supabase.auth.getUser(token) + profiles.role = 'super_admin'.
 *
 * Usage côté API route :
 *   try {
 *     const { user, profile } = await requireSuperAdmin(request)
 *     // ... logique super_admin
 *   } catch (e) {
 *     return NextResponse.json({ error: (e as Error).message }, { status: 401 })
 *   }
 */

import { createClient } from '@supabase/supabase-js'
import type { NextRequest } from 'next/server'

export type SuperAdminProfile = {
  id: string
  email: string
  organization_id: string
  role: 'super_admin'
}

export class SuperAdminAuthError extends Error {
  constructor(public reason: 'no_token' | 'invalid_token' | 'no_profile' | 'not_super_admin') {
    super(reason)
    this.name = 'SuperAdminAuthError'
  }
}

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY missing')
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}

export async function requireSuperAdmin(request: NextRequest): Promise<{
  user: { id: string; email: string }
  profile: SuperAdminProfile
  admin: ReturnType<typeof getSupabaseAdmin>
}> {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
  const token = authHeader?.replace(/^Bearer\s+/i, '').trim()
  if (!token) throw new SuperAdminAuthError('no_token')

  const admin = getSupabaseAdmin()
  const { data: userData, error: userErr } = await admin.auth.getUser(token)
  if (userErr || !userData?.user) throw new SuperAdminAuthError('invalid_token')

  const { data: profile, error: profErr } = await admin
    .from('profiles')
    .select('id, organization_id, role')
    .eq('id', userData.user.id)
    .maybeSingle()

  if (profErr || !profile) throw new SuperAdminAuthError('no_profile')
  if (profile.role !== 'super_admin') throw new SuperAdminAuthError('not_super_admin')

  return {
    user: { id: userData.user.id, email: userData.user.email || '' },
    profile: {
      id: profile.id,
      email: userData.user.email || '',
      organization_id: profile.organization_id,
      role: 'super_admin',
    },
    admin,
  }
}
