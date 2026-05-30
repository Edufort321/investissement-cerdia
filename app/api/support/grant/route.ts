/**
 * POST /api/support/grant   → le tenant ACTIVE l'accès support CERDIA (consentement)
 * DELETE /api/support/grant  → le tenant RÉVOQUE l'accès
 *
 * - Auth : org_admin du tenant (token Bearer). Le grant est TOUJOURS scopé à
 *   l'organisation du caller (anti-BOLA) — on ignore tout organization_id du body.
 * - À l'activation : insère un support_access_grant + envoie un courriel à
 *   eric.dufort@cerdia.ai (notification d'accès accordé).
 *
 * Sécurité : sans grant actif, le super_admin ne voit PAS les données du tenant
 * (cf. migration 211, fonction super_admin_can_access).
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdminToken, adminAuthError } from '@/lib/auth/require-admin-token'

const SUPPORT_EMAIL = 'eric.dufort@cerdia.ai'
const DURATION_HOURS: Record<string, number> = { '24h': 24, '7d': 24 * 7, '30d': 24 * 30 }

export async function POST(request: NextRequest) {
  let caller
  try {
    caller = await requireAdminToken(request)
  } catch (e) {
    return adminAuthError(e)
  }
  const orgId = caller.profile.organization_id
  if (!orgId) return NextResponse.json({ error: 'no organization' }, { status: 400 })

  const body = await request.json().catch(() => ({} as any))
  const duration = (body.duration as string) || '7d'
  const reason = (body.reason as string) || null
  const hours = DURATION_HOURS[duration] ?? DURATION_HOURS['7d']
  const expiresAt = new Date(Date.now() + hours * 3600_000).toISOString()

  // Insère le grant via service_role (le helper expose `admin`).
  const { data: grant, error } = await caller.admin
    .from('support_access_grants')
    .insert({
      organization_id: orgId,
      granted_by: caller.profile.id,
      reason,
      expires_at: expiresAt,
    })
    .select('id, expires_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Récupère le nom de l'org pour le courriel.
  const { data: org } = await caller.admin
    .from('organizations').select('name, slug').eq('id', orgId).maybeSingle()

  // Notifie CERDIA par courriel (best-effort : n'échoue pas la requête si l'email rate).
  await notifySupportEmail({
    orgName: org?.name || orgId,
    orgSlug: org?.slug || null,
    grantedByEmail: caller.profile.email,
    expiresAt,
    reason,
  }).catch(err => console.error('[support/grant] email failed:', err))

  return NextResponse.json({ success: true, grant_id: grant.id, expires_at: grant.expires_at })
}

export async function DELETE(request: NextRequest) {
  let caller
  try {
    caller = await requireAdminToken(request)
  } catch (e) {
    return adminAuthError(e)
  }
  const orgId = caller.profile.organization_id
  if (!orgId) return NextResponse.json({ error: 'no organization' }, { status: 400 })

  // Révoque tous les grants actifs de l'org du caller.
  const { error } = await caller.admin
    .from('support_access_grants')
    .update({ revoked_at: new Date().toISOString() })
    .eq('organization_id', orgId)
    .is('revoked_at', null)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

async function notifySupportEmail(p: {
  orgName: string
  orgSlug: string | null
  grantedByEmail: string
  expiresAt: string
  reason: string | null
}) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('[support/grant] RESEND_API_KEY absent — courriel non envoyé')
    return
  }
  const { Resend } = await import('resend')
  const resend = new Resend(apiKey)
  const from = process.env.SUPPORT_EMAIL_FROM || 'CERDIA <support@cerdia.ai>'
  const exp = new Date(p.expiresAt).toLocaleString('fr-CA')

  await resend.emails.send({
    from,
    to: SUPPORT_EMAIL,
    subject: `🔓 Accès support activé — ${p.orgName}`,
    text:
      `Le tenant « ${p.orgName} »${p.orgSlug ? ` (${p.orgSlug})` : ''} a ACTIVÉ l'accès support CERDIA.\n\n` +
      `Activé par : ${p.grantedByEmail}\n` +
      `Expire le : ${exp}\n` +
      (p.reason ? `Motif : ${p.reason}\n` : '') +
      `\nTu peux maintenant accéder à ce tenant via « View as » dans le panneau super-admin. ` +
      `L'accès se coupera automatiquement à l'expiration.`,
  })
}
