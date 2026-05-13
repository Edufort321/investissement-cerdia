/**
 * Helper d'auth admin pour Server Components et API routes.
 * Verifie que l'utilisateur est connecte ET a un role admin multi-tenant
 * (super_admin pour CERDIA staff, org_admin pour le boss d'un tenant).
 *
 * Pre-requis : migrations 139 (table profiles) + 145 (multi-tenant rename) executees.
 *
 * Usage Server Component :
 *   const { user, supabase } = await requireAdmin()
 *
 * Usage API route :
 *   try { await requireAdmin() }
 *   catch (e) { return NextResponse.json({ error: e.message }, { status: 401/403 }) }
 */

import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import type { SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export type AdminRole = 'super_admin' | 'org_admin' | 'owner' | 'admin'

export type AdminContext = {
  user:            { id: string; email?: string }
  role:            AdminRole
  organizationId:  string | null
  isSuperAdmin:    boolean
  supabase:        SupabaseClient
}

export class UnauthorizedError extends Error {
  constructor(public reason: 'no_session' | 'no_profile' | 'insufficient_role') {
    super(reason)
    this.name = 'UnauthorizedError'
  }
}

export async function requireAdmin(): Promise<AdminContext> {
  const supabase = createServerComponentClient({ cookies })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new UnauthorizedError('no_session')

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role, organization_id')
    .eq('id', user.id)
    .single()

  if (error || !profile) throw new UnauthorizedError('no_profile')
  // Accepte les nouveaux noms (post-mig 145) + les anciens (compat transition)
  const allowed: AdminRole[] = ['super_admin', 'org_admin', 'owner', 'admin']
  if (!allowed.includes(profile.role as AdminRole)) throw new UnauthorizedError('insufficient_role')

  return {
    user:           { id: user.id, email: user.email ?? undefined },
    role:           profile.role as AdminRole,
    organizationId: (profile as any).organization_id ?? null,
    isSuperAdmin:   profile.role === 'super_admin' || profile.role === 'owner',
    supabase,
  }
}

/** Variante non-throwing : retourne null au lieu de throw. Utile pour les layouts qui veulent rediriger. */
export async function getAdminContext(): Promise<AdminContext | null> {
  try {
    return await requireAdmin()
  } catch {
    return null
  }
}
