/**
 * POST /api/admin/organizations/:id/renew
 *
 * Renouvelle un tenant pour 1 an (action manuelle du super_admin
 * apres reception du paiement).
 *
 * - Push next_renewal_date de +1 an a partir de la date courante
 *   (ou de l'ancienne date si toujours future)
 * - Si status = 'suspended' → reactive (status='active', suspended_at=NULL)
 * - Reset last_reminder_sent_at à NULL pour le prochain cycle
 *
 * Auth : super_admin uniquement.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin, SuperAdminAuthError } from '@/lib/auth/super-admin-server'

export async function POST(
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

  // Charge l'org pour calculer le nouveau renewal date
  const { data: org, error: orgErr } = await admin
    .from('organizations')
    .select('id, name, plan, status, next_renewal_date')
    .eq('id', orgId)
    .maybeSingle()

  if (orgErr || !org) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }
  if (org.plan === 'internal') {
    return NextResponse.json({ error: 'cannot_renew_internal' }, { status: 403 })
  }

  // Si le renewal est encore dans le futur, on le push d'1 an depuis cette date.
  // Sinon on push d'1 an depuis aujourd'hui.
  const now = new Date()
  const today = now.toISOString().split('T')[0]
  let baseDate: Date
  if (org.next_renewal_date && org.next_renewal_date > today) {
    baseDate = new Date(org.next_renewal_date)
  } else {
    baseDate = now
  }
  baseDate.setFullYear(baseDate.getFullYear() + 1)
  const newRenewal = baseDate.toISOString().split('T')[0]

  const updates: any = {
    next_renewal_date: newRenewal,
    last_reminder_sent_at: null,
  }
  // Si suspendu, on reactive
  if (org.status === 'suspended') {
    updates.status = 'active'
    updates.suspended_at = null
  }

  const { error: updErr } = await admin
    .from('organizations')
    .update(updates)
    .eq('id', orgId)

  if (updErr) {
    return NextResponse.json({ error: 'update_failed', detail: updErr.message }, { status: 500 })
  }

  return NextResponse.json({
    renewed: true,
    org_id: orgId,
    org_name: org.name,
    previous_renewal: org.next_renewal_date,
    next_renewal: newRenewal,
    reactivated: org.status === 'suspended',
  })
}
