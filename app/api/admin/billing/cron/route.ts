/**
 * GET /api/admin/billing/cron
 *
 * Cron quotidien (via vercel.json) qui gère le cycle de facturation :
 *   1. Marque les organisations dont le renouvellement arrive dans <= 60j
 *      (last_reminder_sent_at = NOW) — futur : envoie un email
 *   2. Suspend les organisations dont le renouvellement est en retard >= 30j
 *      (status = 'suspended', suspended_at = NOW)
 *
 * Auth : via CRON_SECRET dans le header Authorization (Vercel Cron) ou
 *        ADMIN_API_TOKEN pour les triggers manuels.
 *
 * Réponse :
 *   200 { reminders: N, suspensions: M }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}

function authorizeRequest(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!token) return false
  const cronSecret = process.env.CRON_SECRET
  const adminToken = process.env.ADMIN_API_TOKEN
  return token === cronSecret || token === adminToken
}

export async function GET(request: NextRequest) {
  if (!authorizeRequest(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const admin = getSupabaseAdmin()
  const now = new Date()
  const today = now.toISOString().split('T')[0]
  const in60Days = new Date(now); in60Days.setDate(in60Days.getDate() + 60)
  const in60DaysStr = in60Days.toISOString().split('T')[0]
  const minus30Days = new Date(now); minus30Days.setDate(minus30Days.getDate() - 30)
  const minus30DaysStr = minus30Days.toISOString().split('T')[0]
  const reminderCooldown = new Date(now); reminderCooldown.setDate(reminderCooldown.getDate() - 30)

  // ── 1. Rappels 60j ────────────────────────────────────────
  // Tenants dont :
  //   - plan != internal (CERDIA ne se facture pas)
  //   - status = 'active'
  //   - next_renewal_date BETWEEN today AND today+60
  //   - last_reminder_sent_at IS NULL OR last_reminder_sent_at < now-30j
  const { data: needsReminder } = await admin
    .from('organizations')
    .select('id, name, next_renewal_date, last_reminder_sent_at')
    .eq('status', 'active')
    .neq('plan', 'internal')
    .neq('plan', 'demo')
    .gte('next_renewal_date', today)
    .lte('next_renewal_date', in60DaysStr)

  const remindersToSend = (needsReminder || []).filter(o => {
    if (!o.last_reminder_sent_at) return true
    return new Date(o.last_reminder_sent_at) < reminderCooldown
  })

  let reminderCount = 0
  for (const org of remindersToSend) {
    // TODO Phase 3.3.2 : envoyer email via Resend/SendGrid au tenant org_admin + a Eric
    // Pour MVP, on track juste le timestamp
    await admin
      .from('organizations')
      .update({ last_reminder_sent_at: now.toISOString() })
      .eq('id', org.id)
    console.log(`[billing/cron] reminder logged for ${org.name} (renewal ${org.next_renewal_date})`)
    reminderCount++
  }

  // ── 2. Suspensions automatiques ───────────────────────────
  // Tenants dont :
  //   - plan != internal/demo
  //   - status = 'active'
  //   - next_renewal_date < today - 30j
  const { data: toSuspend } = await admin
    .from('organizations')
    .select('id, name, next_renewal_date')
    .eq('status', 'active')
    .neq('plan', 'internal')
    .neq('plan', 'demo')
    .lt('next_renewal_date', minus30DaysStr)

  let suspensionCount = 0
  for (const org of toSuspend || []) {
    await admin
      .from('organizations')
      .update({
        status: 'suspended',
        suspended_at: now.toISOString(),
      })
      .eq('id', org.id)
    console.log(`[billing/cron] SUSPENDED ${org.name} (renewal was ${org.next_renewal_date})`)
    suspensionCount++
  }

  return NextResponse.json({
    timestamp: now.toISOString(),
    reminders: reminderCount,
    suspensions: suspensionCount,
    reminder_orgs: remindersToSend.map(o => ({ id: o.id, name: o.name, renewal: o.next_renewal_date })),
    suspended_orgs: (toSuspend || []).map(o => ({ id: o.id, name: o.name, renewal: o.next_renewal_date })),
  })
}
