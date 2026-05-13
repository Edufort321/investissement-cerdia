/**
 * Crée (ou met a jour) le user demo@cerdia.ai pour le tenant DEMO public.
 *
 * Usage :
 *   npx tsx scripts/setup-demo-user.ts
 *
 * Email : demo@cerdia.ai
 * Password : Demo2026!CERDIA  (public, hardcode dans /demo page)
 * Tenant : d0000000-0000-0000-0000-000000000001 (DEMO — Plateforme CERDIA)
 * Role : org_admin (acces complet aux tabs pour la demo, edition tolérée)
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

const DEMO_EMAIL    = 'demo@cerdia.ai'
const DEMO_PASSWORD = 'Demo2026!CERDIA'
const DEMO_ORG_ID   = 'd0000000-0000-0000-0000-000000000001'

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

  // 1. Verifie/crée le tenant DEMO
  const { data: org } = await admin
    .from('organizations')
    .select('id, name')
    .eq('id', DEMO_ORG_ID)
    .maybeSingle()
  if (!org) {
    console.error(`❌ Tenant DEMO ${DEMO_ORG_ID} introuvable. Applique migration 158 d'abord.`)
    process.exit(1)
  }
  console.log(`✓ Tenant DEMO trouvé : ${org.name}`)

  // 2. Cherche si le user existe deja
  const { data: usersList, error: listErr } = await admin.auth.admin.listUsers()
  if (listErr) {
    console.error('❌ listUsers failed:', listErr.message)
    process.exit(1)
  }
  let existingUser = usersList.users.find(u => u.email?.toLowerCase() === DEMO_EMAIL.toLowerCase())

  let userId: string
  if (existingUser) {
    // Met à jour le password (au cas où il aurait changé)
    const { error: updErr } = await admin.auth.admin.updateUserById(existingUser.id, {
      password: DEMO_PASSWORD,
      user_metadata: {
        full_name: 'Démo CERDIA',
        organization_id: DEMO_ORG_ID,
        role: 'org_admin',
      },
    })
    if (updErr) {
      console.error('❌ updateUserById failed:', updErr.message)
      process.exit(1)
    }
    userId = existingUser.id
    console.log(`✓ User existant mis à jour : ${DEMO_EMAIL} (id: ${userId})`)
  } else {
    // Crée le user
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: {
        full_name: 'Démo CERDIA',
        organization_id: DEMO_ORG_ID,
        role: 'org_admin',
      },
    })
    if (createErr || !created?.user) {
      console.error('❌ createUser failed:', createErr?.message)
      process.exit(1)
    }
    userId = created.user.id
    console.log(`✓ User créé : ${DEMO_EMAIL} (id: ${userId})`)
  }

  // 3. Vérifie le profile (le trigger handle_new_user devrait l'avoir créé avec les bonnes valeurs depuis raw_user_meta_data)
  const { data: profile } = await admin
    .from('profiles')
    .select('id, organization_id, role, onboarding_completed')
    .eq('id', userId)
    .maybeSingle()

  if (!profile || profile.organization_id !== DEMO_ORG_ID || profile.role !== 'org_admin') {
    // Force update
    const { error: profErr } = await admin.from('profiles').upsert({
      id: userId,
      organization_id: DEMO_ORG_ID,
      role: 'org_admin',
      full_name: 'Démo CERDIA',
      onboarding_completed: true,
    })
    if (profErr) {
      console.error('❌ profile upsert failed:', profErr.message)
      process.exit(1)
    }
    console.log(`✓ Profile forcé : organization_id=${DEMO_ORG_ID}, role=org_admin`)
  } else {
    console.log(`✓ Profile déjà OK : organization_id=${profile.organization_id}, role=${profile.role}`)
  }

  console.log('\n═══════════════════════════════════════════════════════════════')
  console.log('✅ DEMO USER configuré')
  console.log('═══════════════════════════════════════════════════════════════')
  console.log(`Email    : ${DEMO_EMAIL}`)
  console.log(`Password : ${DEMO_PASSWORD}`)
  console.log(`User ID  : ${userId}`)
  console.log(`Tenant   : ${DEMO_ORG_ID} (DEMO — Plateforme CERDIA)`)
  console.log(`Role     : org_admin`)
  console.log('')
  console.log('La page /demo auto-login avec ces creds.')
  console.log('Tu peux maintenant peupler le tenant via /commerce/admin → Organisations → Voir comme DEMO.')
}

main()
