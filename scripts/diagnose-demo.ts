/**
 * Diagnostic du tenant DEMO.
 *
 * Verifie pourquoi un visiteur (connecte comme demo@cerdia.ai) ne voit
 * aucune donnee alors que Eric en super_admin "View as DEMO" voit tout.
 *
 * Usage : npx tsx scripts/diagnose-demo.ts
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

const DEMO_EMAIL  = 'demo@cerdia.ai'
const DEMO_PASS   = 'Demo2026!CERDIA'
const DEMO_ORG_ID = 'd0000000-0000-0000-0000-000000000001'

// Tables tenant-scoped representatives a tester
const TABLES = [
  'properties',
  'transactions',
  'investors',
  'payment_schedules',
  'investor_investments',
  'company_settings',
  'capex_accounts',
  'current_accounts',
]

async function main() {
  loadEnv()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  if (!url || !serviceKey || !anonKey) {
    console.error('Manque NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_ANON_KEY')
    process.exit(1)
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })

  console.log('═══════════════════════════════════════════════════════════')
  console.log(' DIAGNOSTIC TENANT DEMO')
  console.log('═══════════════════════════════════════════════════════════\n')

  // ── 1. Le user demo existe-t-il ? ──────────────────────────
  const { data: usersList } = await admin.auth.admin.listUsers()
  const demoUser = usersList.users.find(u => u.email?.toLowerCase() === DEMO_EMAIL)
  if (!demoUser) {
    console.log('❌ User demo@cerdia.ai INTROUVABLE dans auth.users.')
    console.log('   → Lance : npx tsx scripts/setup-demo-user.ts')
    process.exit(0)
  }
  console.log(`✓ User demo trouve : id = ${demoUser.id}`)
  console.log(`  user_metadata.organization_id = ${demoUser.user_metadata?.organization_id ?? '(absent)'}`)
  console.log(`  user_metadata.role            = ${demoUser.user_metadata?.role ?? '(absent)'}`)

  // ── 2. Son profile ─────────────────────────────────────────
  const { data: profile, error: profErr } = await admin
    .from('profiles')
    .select('id, organization_id, role, onboarding_completed')
    .eq('id', demoUser.id)
    .maybeSingle()

  if (profErr) {
    console.log(`❌ Erreur lecture profile : ${profErr.message}`)
  } else if (!profile) {
    console.log('❌ AUCUN profile pour le user demo → auth_get_org_id() retourne NULL → RLS bloque tout.')
    console.log('   → Lance : npx tsx scripts/setup-demo-user.ts')
  } else {
    const okOrg = profile.organization_id === DEMO_ORG_ID
    console.log(`${okOrg ? '✓' : '❌'} profile.organization_id = ${profile.organization_id} ${okOrg ? '' : '(DEVRAIT etre ' + DEMO_ORG_ID + ')'}`)
    console.log(`  profile.role = ${profile.role}`)
  }

  // ── 3. Le tenant DEMO ──────────────────────────────────────
  const { data: org } = await admin
    .from('organizations')
    .select('id, name, status, is_demo')
    .eq('id', DEMO_ORG_ID)
    .maybeSingle()
  if (!org) {
    console.log(`❌ Organisation DEMO ${DEMO_ORG_ID} introuvable.`)
  } else {
    console.log(`✓ Org DEMO : ${org.name} | status=${org.status} | is_demo=${org.is_demo}`)
  }

  // ── 4. Compte des rows par table pour l'org DEMO (service_role, bypass RLS) ─
  console.log('\n── Rows avec organization_id = DEMO (vu par service_role, sans RLS) ──')
  for (const t of TABLES) {
    const { count, error } = await admin
      .from(t)
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', DEMO_ORG_ID)
    if (error) {
      console.log(`  ${t.padEnd(24)} : ERREUR ${error.message}`)
    } else {
      console.log(`  ${t.padEnd(24)} : ${count ?? 0}`)
    }
  }

  // ── 5. Test reel : se connecter COMME le user demo et lire ─
  console.log('\n── Lecture en tant que demo@cerdia.ai (RLS actif, comme un visiteur) ──')
  const asDemo = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
  const { error: signInErr } = await asDemo.auth.signInWithPassword({
    email: DEMO_EMAIL,
    password: DEMO_PASS,
  })
  if (signInErr) {
    console.log(`❌ Connexion demo echouee : ${signInErr.message}`)
    process.exit(0)
  }
  console.log('✓ Connecte comme demo@cerdia.ai\n')

  // 5a. Ce que les contextes de l'app lisent en premier
  const { data: ownProfile, error: profReadErr } = await asDemo
    .from('profiles').select('*').eq('id', demoUser.id).maybeSingle()
  console.log(`  profiles (self)          : ${profReadErr ? 'ERREUR ' + profReadErr.message : ownProfile ? 'OK org=' + ownProfile.organization_id + ' role=' + ownProfile.role : 'NULL (bloque -> OrgContext casse)'}`)

  const { data: ownOrg, error: orgReadErr } = await asDemo
    .from('organizations').select('*').eq('id', DEMO_ORG_ID).maybeSingle()
  console.log(`  organizations (DEMO)     : ${orgReadErr ? 'ERREUR ' + orgReadErr.message : ownOrg ? 'OK ' + ownOrg.name : 'NULL (bloque -> organization=null dans l app)'}`)

  console.log('')
  for (const t of TABLES) {
    const { data, count, error } = await asDemo
      .from(t)
      .select('*', { count: 'exact' })
      .limit(1)
    if (error) {
      console.log(`  ${t.padEnd(24)} : ERREUR ${error.code ?? ''} ${error.message}`)
    } else {
      console.log(`  ${t.padEnd(24)} : ${count ?? (data?.length ?? 0)} visible(s)`)
    }
  }

  // verifie aussi ce que la RPC auth_get_org_id renvoie pour ce user
  const { data: orgIdRpc, error: rpcErr } = await asDemo.rpc('auth_get_org_id')
  if (rpcErr) {
    console.log(`\n  auth_get_org_id() : ERREUR ${rpcErr.message}`)
  } else {
    const ok = orgIdRpc === DEMO_ORG_ID
    console.log(`\n  ${ok ? '✓' : '❌'} auth_get_org_id() retourne : ${orgIdRpc} ${ok ? '' : '(DEVRAIT etre ' + DEMO_ORG_ID + ')'}`)
  }

  await asDemo.auth.signOut()
  console.log('\n═══════════════════════════════════════════════════════════')
  console.log(' Fin du diagnostic')
  console.log('═══════════════════════════════════════════════════════════')
}

main().catch(e => { console.error(e); process.exit(1) })
