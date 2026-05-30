/**
 * Abonnement Stripe d'une organisation (tenant) — app investissement + C-Secur360.
 *
 * POST   /api/admin/organizations/[id]/subscription  → crée le customer + l'abonnement
 *        annuel et renvoie l'URL de paiement (Stripe Checkout, mode subscription).
 * DELETE → annule l'abonnement (à la fin de la période en cours).
 *
 * Auth : super_admin uniquement (c'est l'admin CERDIA qui déclenche la facturation).
 * Réutilise requireSuperAdminToken (token Bearer + rôle super_admin).
 */

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { requireSuperAdminToken, adminAuthError } from '@/lib/auth/require-admin-token'

const stripeKey = process.env.STRIPE_SECRET_KEY || ''
const stripe = stripeKey.startsWith('sk_')
  ? new Stripe(stripeKey, { apiVersion: '2025-09-30.clover' as any })
  : null

const PRICE_ANNUAL = process.env.STRIPE_PRICE_ANNUAL || ''
const PRICE_ADDON_SITE = process.env.STRIPE_PRICE_ADDON_SITE_ANNUAL || ''

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  let caller
  try {
    caller = await requireSuperAdminToken(request)
  } catch (e) {
    return adminAuthError(e)
  }
  if (!stripe) return NextResponse.json({ error: 'Stripe non configuré (STRIPE_SECRET_KEY)' }, { status: 500 })
  if (!PRICE_ANNUAL) return NextResponse.json({ error: 'STRIPE_PRICE_ANNUAL manquant' }, { status: 500 })

  const orgId = params.id
  const body = await request.json().catch(() => ({} as any))
  const withSiteAddon = body.with_site_addon === true

  // Charge l'org (service_role via le helper).
  const { data: org, error: orgErr } = await caller.admin
    .from('organizations')
    .select('id, name, billing_email, contact_email, stripe_customer_id')
    .eq('id', orgId)
    .maybeSingle()
  if (orgErr || !org) return NextResponse.json({ error: 'organisation introuvable' }, { status: 404 })

  // 1. Customer Stripe (réutilise s'il existe déjà).
  let customerId = org.stripe_customer_id as string | null
  if (!customerId) {
    const customer = await stripe.customers.create({
      name: org.name,
      email: org.billing_email || org.contact_email || undefined,
      metadata: { organization_id: orgId },
    })
    customerId = customer.id
    await caller.admin.from('organizations').update({ stripe_customer_id: customerId }).eq('id', orgId)
  }

  // 2. Lignes d'abonnement : price annuel (+ add-on site optionnel).
  const lineItems: { price: string; quantity: number }[] = [{ price: PRICE_ANNUAL, quantity: 1 }]
  if (withSiteAddon && PRICE_ADDON_SITE) lineItems.push({ price: PRICE_ADDON_SITE, quantity: 1 })

  // 3. Checkout en mode subscription (le tenant paie ; renouvellement auto par Stripe).
  const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || ''
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: lineItems,
    success_url: `${origin}/admin?subscription=success&org=${orgId}`,
    cancel_url: `${origin}/admin?subscription=canceled&org=${orgId}`,
    metadata: { organization_id: orgId, plan: withSiteAddon ? 'annual+site' : 'annual' },
    subscription_data: { metadata: { organization_id: orgId } },
  })

  await caller.admin.from('organizations')
    .update({ subscription_plan: withSiteAddon ? 'annual+site' : 'annual' })
    .eq('id', orgId)

  return NextResponse.json({ url: session.url, customer_id: customerId })
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  let caller
  try {
    caller = await requireSuperAdminToken(request)
  } catch (e) {
    return adminAuthError(e)
  }
  if (!stripe) return NextResponse.json({ error: 'Stripe non configuré' }, { status: 500 })

  const { data: org } = await caller.admin
    .from('organizations')
    .select('stripe_subscription_id')
    .eq('id', params.id)
    .maybeSingle()

  const subId = org?.stripe_subscription_id as string | null
  if (!subId) return NextResponse.json({ error: 'aucun abonnement actif' }, { status: 400 })

  // Annule à la fin de la période (le tenant garde l'accès jusqu'à l'échéance payée).
  await stripe.subscriptions.update(subId, { cancel_at_period_end: true })
  await caller.admin.from('organizations')
    .update({ subscription_status: 'canceling' })
    .eq('id', params.id)

  return NextResponse.json({ success: true })
}
