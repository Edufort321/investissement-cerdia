/**
 * Reset password d'un user via Supabase Admin API.
 *
 * Usage :
 *   npx tsx scripts/reset-password.ts <email> <new-password>
 *
 * Exemple :
 *   npx tsx scripts/reset-password.ts eric.dufort@cerdia.ai '321Eduf!$'
 *
 * Pré-requis : SUPABASE_SERVICE_ROLE_KEY et NEXT_PUBLIC_SUPABASE_URL dans .env.local
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

// Charge .env.local manuellement (sans depender d'un autre package)
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
    // Retire les guillemets si présents
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    process.env[key] = value
  }
}

async function main() {
  loadEnv()

  const [, , email, password] = process.argv
  if (!email || !password) {
    console.error('Usage: npx tsx scripts/reset-password.ts <email> <new-password>')
    process.exit(1)
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error('❌ NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant dans .env.local')
    process.exit(1)
  }

  const admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })

  // 1. Trouve le user_id par email
  const { data: usersList, error: listErr } = await admin.auth.admin.listUsers()
  if (listErr) {
    console.error('❌ listUsers failed:', listErr.message)
    process.exit(1)
  }
  const user = usersList.users.find(u => u.email?.toLowerCase() === email.toLowerCase())
  if (!user) {
    console.error(`❌ Aucun user avec email ${email}`)
    process.exit(1)
  }

  // 2. Update password
  const { data, error } = await admin.auth.admin.updateUserById(user.id, {
    password,
  })

  if (error) {
    console.error('❌ updateUserById failed:', error.message)
    process.exit(1)
  }

  console.log(`✅ Password mis à jour pour ${data.user?.email} (id: ${data.user?.id})`)
  console.log(`   Tu peux maintenant te connecter sur /connexion avec ce mot de passe.`)
}

main()
