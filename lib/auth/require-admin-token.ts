/**
 * Helper d'auth pour les API routes server-side qui utilisent service_role.
 *
 * L'app stocke la session Supabase en localStorage (pas cookies), donc le client
 * envoie son access_token dans le header `Authorization: Bearer <token>`. Ce helper
 * valide le token, charge le profil, et vérifie le rôle.
 *
 * Deux niveaux :
 *   - requireAdminToken(request)        → super_admin OU org_admin/owner/admin
 *   - requireSuperAdminToken(request)   → super_admin/owner uniquement
 *
 * Retourne aussi `organization_id` du caller (pour scoper les opérations au tenant).
 *
 * Usage :
 *   try {
 *     const { profile, admin } = await requireAdminToken(request)
 *     // ... opération autorisée, profile.organization_id = tenant du caller
 *   } catch (e) {
 *     return adminAuthError(e)
 *   }
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

export type AdminTokenProfile = {
  id: string
  email: string
  organization_id: string | null
  role: string
  isSuperAdmin: boolean
}

export class AdminTokenError extends Error {
  constructor(public reason: 'no_token' | 'invalid_token' | 'no_profile' | 'insufficient_role') {
    super(reason)
    this.name = 'AdminTokenError'
  }
}

const ADMIN_ROLES = ['super_admin', 'owner', 'org_admin', 'admin']
const SUPER_ROLES = ['super_admin', 'owner']

function getServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY missing')
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}

async function authenticate(
  request: NextRequest,
  allowedRoles: string[]
): Promise<{ profile: AdminTokenProfile; admin: SupabaseClient }> {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
  const token = authHeader?.replace(/^Bearer\s+/i, '').trim()
  if (!token) throw new AdminTokenError('no_token')

  const admin = getServiceClient()
  const { data: userData, error: userErr } = await admin.auth.getUser(token)
  if (userErr || !userData?.user) throw new AdminTokenError('invalid_token')

  const { data: profile, error: profErr } = await admin
    .from('profiles')
    .select('id, organization_id, role')
    .eq('id', userData.user.id)
    .maybeSingle()

  if (profErr || !profile) throw new AdminTokenError('no_profile')
  if (!allowedRoles.includes(profile.role as string)) throw new AdminTokenError('insufficient_role')

  return {
    profile: {
      id: profile.id,
      email: userData.user.email || '',
      organization_id: (profile as any).organization_id ?? null,
      role: profile.role as string,
      isSuperAdmin: SUPER_ROLES.includes(profile.role as string),
    },
    admin,
  }
}

/** Exige un admin (super_admin OU org_admin/owner/admin). */
export function requireAdminToken(request: NextRequest) {
  return authenticate(request, ADMIN_ROLES)
}

/** Exige un super_admin (staff CERDIA) ou owner. */
export function requireSuperAdminToken(request: NextRequest) {
  return authenticate(request, SUPER_ROLES)
}

/** Convertit une AdminTokenError en réponse HTTP appropriée (401/403). */
export function adminAuthError(e: unknown): NextResponse {
  if (e instanceof AdminTokenError) {
    const status = e.reason === 'insufficient_role' ? 403 : 401
    return NextResponse.json({ error: `unauthorized: ${e.reason}` }, { status })
  }
  const msg = e instanceof Error ? e.message : 'unauthorized'
  return NextResponse.json({ error: msg }, { status: 401 })
}
