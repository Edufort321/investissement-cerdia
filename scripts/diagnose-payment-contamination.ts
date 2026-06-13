/**
 * Diagnostic de contamination du calendrier des paiements.
 *
 * Liste, pour le tenant CERDIA Globale, les payment_schedules et la propriété
 * liée afin de reperer les entrees qui proviennent du tenant DEMO
 * (noms "Démo", "Secret Garden", property_id pointant vers le tenant DEMO, etc.)
 *
 * Read-only. Usage : npx tsx scripts/diagnose-payment-contamination.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

function loadEnv() {
  const envPath = path.join(process.cwd(), '.env.local')
  const content = fs.readFileSync(envPath, 'utf8')
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    process.env[key] = value
  }
}

const CERDIA_ORG_ID = 'c0000000-0000-0000-0000-000000000001'
const DEMO_ORG_ID   = 'd0000000-0000-0000-0000-000000000001'

async function main() {
  loadEnv()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })

  // ── orgs ──
  const { data: orgs } = await admin
    .from('organizations').select('id, name, is_demo').order('name')
  console.log('── Organizations ──')
  for (const o of orgs ?? []) console.log(`  ${o.id}  is_demo=${o.is_demo}  ${o.name}`)

  // ── compte payment_schedules par org ──
  console.log('\n── payment_schedules count par organization_id ──')
  for (const o of orgs ?? []) {
    const { count } = await admin.from('payment_schedules')
      .select('*', { count: 'exact', head: true }).eq('organization_id', o.id)
    console.log(`  ${(o.name as string).padEnd(28)} : ${count ?? 0}`)
  }
  const { count: nullCount } = await admin.from('payment_schedules')
    .select('*', { count: 'exact', head: true }).is('organization_id', null)
  console.log(`  ${'(organization_id NULL)'.padEnd(28)} : ${nullCount ?? 0}`)

  // ── détail payment_schedules du tenant CERDIA Globale ──
  console.log('\n── payment_schedules de CERDIA Globale (avec propriété liée) ──')
  const { data: ps, error } = await admin
    .from('payment_schedules')
    .select('id, property_id, term_label, due_date, status, amount, currency, organization_id')
    .eq('organization_id', CERDIA_ORG_ID)
    .order('due_date')
  if (error) { console.log('ERREUR', error.message); return }

  // charge les propriétés concernées pour afficher leur nom + org
  const propIds = Array.from(new Set((ps ?? []).map(p => p.property_id).filter(Boolean)))
  const { data: props } = await admin
    .from('properties')
    .select('id, name, organization_id')
    .in('id', propIds.length ? propIds : ['00000000-0000-0000-0000-000000000000'])
  const propMap = new Map((props ?? []).map(p => [p.id, p]))

  console.log(`  total = ${ps?.length ?? 0}\n`)
  for (const p of ps ?? []) {
    const prop = propMap.get(p.property_id)
    const propName = prop?.name ?? '(propriété introuvable)'
    const propOrg = prop?.organization_id ?? '?'
    const crossTenant = prop && propOrg !== CERDIA_ORG_ID ? '  ⚠️ PROP DANS AUTRE ORG' : ''
    const demoLike = /d[ée]mo|secret garden/i.test(`${p.term_label} ${propName}`) ? '  ⚠️ DEMO-LIKE' : ''
    console.log(`  ${p.due_date ?? '????-??-??'} | ${String(p.status).padEnd(8)} | ${propName.padEnd(24)} | ${p.term_label ?? ''}${crossTenant}${demoLike}`)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
