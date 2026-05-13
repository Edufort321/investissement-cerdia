/**
 * DELETE /api/admin/organizations/:id
 *
 * Cascade delete d'un tenant — pour les test/demo. Reserve super_admin.
 *
 * Etapes :
 *   1. Verifie super_admin
 *   2. Refuse si plan = 'internal' (CERDIA Globale intouchable)
 *   3. Scan TOUTES les tables avec organization_id FK → si une seule a
 *      des rows, refuse avec la liste (suggere d'archiver à la place)
 *   4. Recupere les profiles lies → supprime les auth.users
 *      correspondants (les profiles cascadent via la FK
 *      auth.users.id ON DELETE CASCADE de mig 139)
 *   5. DELETE de l'organisation
 *
 * Réponse :
 *   200 { deleted: true, profiles_removed: N }
 *   409 { error: 'has_data', tables: [...] }
 *   500 { error: '...', detail: '...' } avec stack
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin, SuperAdminAuthError } from '@/lib/auth/super-admin-server'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
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

    if (orgErr) {
      return NextResponse.json({ error: 'fetch_org_failed', detail: orgErr.message }, { status: 500 })
    }
    if (!org) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }
    if (org.plan === 'internal') {
      return NextResponse.json({ error: 'cannot_delete_internal' }, { status: 403 })
    }

    // 2. Scan TOUTES les tables avec organization_id pour pre-check
    const { data: tablesWithOrgId, error: scanErr } = await admin
      .from('information_schema.columns' as any)
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('column_name', 'organization_id')

    // Fallback : si la query information_schema echoue (RLS, perms),
    // on utilise une liste hardcoded etoffee
    const FALLBACK_TABLES = [
      'properties', 'transactions', 'investor_investments', 'investors',
      'investor_debts', 'investor_reservations', 'investor_properties',
      'property_attachments', 'property_links', 'property_valuations',
      'property_management_api',
      'commerce_products', 'commerce_transactions', 'commerce_platforms',
      'gmail_invoices',
      'invoice_clients', 'invoices', 'invoice_items',
      'liabilities', 'bank_accounts', 'bank_transactions',
      'cash_flow_forecast', 'payment_obligations', 'treasury_alerts',
      'budgets', 'budget_categories', 'budget_lines', 'budget_revisions',
      'budget_approvals', 'budget_alerts',
      'scenarios', 'scenario_results', 'scenario_votes', 'scenario_documents',
      'scenario_actual_values', 'scenario_bookings',
      'contractors', 'project_phases', 'project_milestones', 'project_risks',
      'project_assignments', 'project_documents',
      'capex_accounts', 'current_accounts', 'rnd_accounts',
      'operational_expenses', 'reports', 'documents',
      'dividends', 'dividend_allocations',
      'nav_history', 'share_price_history', 'share_links',
      'payment_schedules', 'transaction_attachments',
      'audit_log', 'monthly_verifications',
      'corporate_book', 'corporate_book_documents', 'company_settings',
      'todo_lists', 'tasks', 'notes',
    ]
    const tablesToCheck: string[] = scanErr || !tablesWithOrgId
      ? FALLBACK_TABLES
      : tablesWithOrgId.map((r: any) => r.table_name).filter(
          (t: string) => t !== 'profiles' && t !== 'organizations'
        )

    const tablesWithData: string[] = []
    for (const table of tablesToCheck) {
      try {
        const { count, error } = await admin
          .from(table)
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', orgId)
        if (error) continue // table introuvable ou autre, skip
        if ((count || 0) > 0) {
          tablesWithData.push(`${table} (${count})`)
        }
      } catch {
        continue
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
    const profileErrors: string[] = []
    for (const p of profiles || []) {
      const { error: delUserErr } = await admin.auth.admin.deleteUser(p.id)
      if (delUserErr) {
        console.error('[org delete] deleteUser failed for', p.id, delUserErr)
        profileErrors.push(`${p.id}: ${delUserErr.message}`)
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
        {
          error: 'delete_org_failed',
          detail: delOrgErr.message,
          profile_errors: profileErrors,
          profiles_removed: profilesRemoved,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      deleted: true,
      org_id: orgId,
      org_name: org.name,
      profiles_removed: profilesRemoved,
      profile_errors: profileErrors.length > 0 ? profileErrors : undefined,
    })
  } catch (e: any) {
    console.error('[org delete] unexpected error:', e)
    return NextResponse.json(
      {
        error: 'unexpected',
        detail: e?.message || String(e),
      },
      { status: 500 },
    )
  }
}
