/**
 * DELETE /api/admin/organizations/:id
 *
 * Cascade delete d'un tenant — pour les test/demo. Reserve super_admin.
 *
 * Etapes :
 *   1. Verifie super_admin
 *   2. Refuse si plan = 'internal' (CERDIA Globale intouchable)
 *   3. Verifie qu'il n'y a PAS de donnees lourdes liees (properties,
 *      transactions, commerce_products, etc.) — si oui, refuse et
 *      suggere d'archiver à la place
 *   4. Recupere les profiles lies → supprime les auth.users
 *      correspondants (les profiles cascadent via la FK
 *      auth.users.id ON DELETE CASCADE de mig 139)
 *   5. DELETE de l'organisation
 *
 * Réponse :
 *   200 { deleted: true, profiles_removed: N }
 *   409 { error: 'has_data', tables: [...] }
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin, SuperAdminAuthError } from '@/lib/auth/super-admin-server'

// Tables a verifier avant cascade delete — si l'une d'elles a des rows
// liees au tenant, on refuse la suppression et on suggere "Archiver".
const PROTECTED_TABLES = [
  'properties',
  'transactions',
  'investor_investments',
  'commerce_products',
  'commerce_transactions',
  'gmail_invoices',
  'liabilities',
  'bank_accounts',
  'budgets',
  'scenarios',
] as const

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
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
  const orgId = params.id

  // 1. Charge l'org pour verifier le plan
  const { data: org, error: orgErr } = await admin
    .from('organizations')
    .select('id, name, plan')
    .eq('id', orgId)
    .maybeSingle()

  if (orgErr || !org) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }
  if (org.plan === 'internal') {
    return NextResponse.json({ error: 'cannot_delete_internal' }, { status: 403 })
  }

  // 2. Verifie qu'il n'y a pas de donnees lourdes liees
  const tablesWithData: string[] = []
  for (const table of PROTECTED_TABLES) {
    const { count, error } = await admin
      .from(table)
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', orgId)
    if (error) {
      // Table inexistante ou erreur — skip
      continue
    }
    if ((count || 0) > 0) {
      tablesWithData.push(`${table} (${count})`)
    }
  }

  if (tablesWithData.length > 0) {
    return NextResponse.json(
      {
        error: 'has_data',
        message: "L'organisation a des données liées et ne peut pas être supprimée. Archive-la à la place.",
        tables: tablesWithData,
      },
      { status: 409 },
    )
  }

  // 3. Recupere les profiles lies a cette org
  const { data: profiles, error: profilesErr } = await admin
    .from('profiles')
    .select('id')
    .eq('organization_id', orgId)

  if (profilesErr) {
    return NextResponse.json({ error: 'fetch_profiles_failed', detail: profilesErr.message }, { status: 500 })
  }

  // 4. Supprime les auth.users (cascade vers profiles via FK ON DELETE CASCADE de mig 139)
  let profilesRemoved = 0
  for (const p of profiles || []) {
    const { error: delUserErr } = await admin.auth.admin.deleteUser(p.id)
    if (delUserErr) {
      console.error('[org delete] deleteUser failed for', p.id, delUserErr)
      // On continue — on essaye de supprimer les autres
    } else {
      profilesRemoved++
    }
  }

  // 5. DELETE de l'organisation
  const { error: delOrgErr } = await admin
    .from('organizations')
    .delete()
    .eq('id', orgId)

  if (delOrgErr) {
    return NextResponse.json(
      { error: 'delete_org_failed', detail: delOrgErr.message },
      { status: 500 },
    )
  }

  return NextResponse.json({
    deleted: true,
    org_id: orgId,
    org_name: org.name,
    profiles_removed: profilesRemoved,
  })
}
