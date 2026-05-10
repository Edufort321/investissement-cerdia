/**
 * Helper d'auth admin pour Server Components et API routes.
 * Verifie que l'utilisateur est connecte ET a un role 'owner' ou 'admin'.
 *
 * Pre-requis : migration 139 (table profiles + roles) executee.
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

export type AdminContext = {
  user:     { id: string; email?: string }
  role:     'owner' | 'admin'
  supabase: SupabaseClient
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
    .select('role')
    .eq('id', user.id)
    .single()

  if (error || !profile) throw new UnauthorizedError('no_profile')
  if (!['owner', 'admin'].includes(profile.role)) throw new UnauthorizedError('insufficient_role')

  return {
    user:     { id: user.id, email: user.email ?? undefined },
    role:     profile.role as 'owner' | 'admin',
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
