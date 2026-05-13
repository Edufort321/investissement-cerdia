/**
 * Populate le tenant DEMO avec des donnees fictives realistes pour la
 * vitrine commerciale. Uses service_role qui bypasse les RLS demo_block_*.
 *
 * Usage : npx tsx scripts/seed-demo-data.ts
 *
 * Idempotent : check d'abord si les rows existent (par name/title).
 * Peut etre re-execute pour ajouter d'autres donnees.
 *
 * Pre-requis :
 *   - Migration 158 (tenant DEMO seede)
 *   - Migration 159 (demo_block_* RLS)
 *   - scripts/setup-demo-user.ts execute (demo user existe)
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

function loadEnv() {
  const envPath = path.join(process.cwd(), '.env.local')
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env.local introuvable.')
    process.exit(1)
  }
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

const DEMO_ORG_ID = 'd0000000-0000-0000-0000-000000000001'

const PROPERTIES = [
  {
    name: 'Oasis Bay Resort — Unit A305',
    location: 'Punta Cana, République Dominicaine',
    status: 'en_construction',
    total_cost: 245000,
    paid_amount: 73500,
    currency: 'USD',
    expected_roi: 8.0,
    reservation_date: '2024-09-15',
    completion_date: '2026-06-30',
    owner_occupation_days: 30,
  },
  {
    name: 'Secret Garden Villas — H212',
    location: 'Bayahibe, République Dominicaine',
    status: 'en_construction',
    total_cost: 198000,
    paid_amount: 59400,
    currency: 'USD',
    expected_roi: 7.5,
    reservation_date: '2025-02-10',
    completion_date: '2026-12-15',
    owner_occupation_days: 21,
  },
  {
    name: 'Bromont Mountain Lodge — Chalet 14',
    location: 'Bromont, Québec, Canada',
    status: 'livré',
    total_cost: 425000,
    paid_amount: 425000,
    currency: 'CAD',
    expected_roi: 6.0,
    reservation_date: '2024-04-01',
    completion_date: '2025-08-30',
    owner_occupation_days: 14,
  },
]

const INVESTORS = [
  { first_name: 'Marie',     last_name: 'Tremblay',  email: 'marie.tremblay@demo.example',     action_class: 'A', total_shares: 150000, percentage_ownership: 28 },
  { first_name: 'Jean',      last_name: 'Lavoie',    email: 'jean.lavoie@demo.example',        action_class: 'A', total_shares: 200000, percentage_ownership: 37 },
  { first_name: 'Sophie',    last_name: 'Bouchard',  email: 'sophie.bouchard@demo.example',    action_class: 'B', total_shares: 95000,  percentage_ownership: 18 },
  { first_name: 'Marc',      last_name: 'Dubois',    email: 'marc.dubois@demo.example',        action_class: 'B', total_shares: 60000,  percentage_ownership: 11 },
  { first_name: 'Catherine', last_name: 'Roy',       email: 'catherine.roy@demo.example',      action_class: 'A', total_shares: 35000,  percentage_ownership: 6  },
]

async function main() {
  loadEnv()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error('❌ NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant.')
    process.exit(1)
  }

  const admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })

  console.log('🎭 Seed DEMO tenant', DEMO_ORG_ID)

  // ── Properties ──────────────────────────────────────────
  let propsAdded = 0
  for (const p of PROPERTIES) {
    const { data: existing } = await admin
      .from('properties')
      .select('id')
      .eq('organization_id', DEMO_ORG_ID)
      .eq('name', p.name)
      .maybeSingle()
    if (existing) {
      console.log(`  ⏭️  propriété déjà présente : ${p.name}`)
      continue
    }
    const { error } = await admin.from('properties').insert({ ...p, organization_id: DEMO_ORG_ID })
    if (error) {
      console.error(`  ❌ insert property ${p.name}:`, error.message)
    } else {
      propsAdded++
      console.log(`  ✓ propriété ajoutée : ${p.name}`)
    }
  }
  console.log(`✅ ${propsAdded} propriétés ajoutées`)

  // ── Investors ───────────────────────────────────────────
  let invsAdded = 0
  for (const i of INVESTORS) {
    const { data: existing } = await admin
      .from('investors')
      .select('id')
      .eq('organization_id', DEMO_ORG_ID)
      .eq('email', i.email)
      .maybeSingle()
    if (existing) {
      console.log(`  ⏭️  investisseur déjà présent : ${i.first_name} ${i.last_name}`)
      continue
    }
    const { error } = await admin.from('investors').insert({
      ...i,
      organization_id: DEMO_ORG_ID,
      share_value: 1,
      total_invested: (i.total_shares ?? 0) * 1,
      current_value: (i.total_shares ?? 0) * 1.0562,
      investment_type: 'part',
      status: 'actif',
      join_date: '2024-01-15',
      access_level: 'investisseur',
      can_vote: true,
      username: `${i.first_name.toLowerCase()}${i.last_name.toLowerCase()}`,
      permissions: { dashboard: true, projet: true, administration: false },
    })
    if (error) {
      console.error(`  ❌ insert investor ${i.first_name} ${i.last_name}:`, error.message)
    } else {
      invsAdded++
      console.log(`  ✓ investisseur ajouté : ${i.first_name} ${i.last_name}`)
    }
  }
  console.log(`✅ ${invsAdded} investisseurs ajoutés`)

  // ── Share settings : valeur nominale 1$ pour le démo ────
  // (la view share_settings se base sur company_settings via get_setting,
  // donc on insert un row dans company_settings pour le tenant DEMO)
  const { data: existingSetting } = await admin
    .from('company_settings')
    .select('id')
    .eq('organization_id', DEMO_ORG_ID)
    .eq('setting_key', 'nominal_share_value')
    .maybeSingle()
  if (!existingSetting) {
    await admin.from('company_settings').insert({
      organization_id: DEMO_ORG_ID,
      setting_key: 'nominal_share_value',
      setting_value: '1.0562',
      setting_type: 'number',
      description: 'Valeur nominale par part DEMO',
    })
    console.log('  ✓ company_settings.nominal_share_value : 1.0562 CAD/part')
  } else {
    console.log('  ⏭️  company_settings deja present')
  }

  console.log('')
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('✅ Seed DEMO terminé.')
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('Va sur cerdia.ai/demo pour voir le résultat.')
}

main()
