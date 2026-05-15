/**
 * Validation scénarios dans Supabase.
 * Usage : npx tsx scripts/validate-scenarios.ts
 */
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

function loadEnv() {
  const c = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8')
  for (const l of c.split('\n')) {
    const t = l.trim()
    if (!t || t.startsWith('#')) continue
    const e = t.indexOf('=')
    if (e === -1) continue
    let v = t.slice(e + 1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
    process.env[t.slice(0, e).trim()] = v
  }
}
loadEnv()

const CERDIA = 'c0000000-0000-0000-0000-000000000001'
const DEMO   = 'd0000000-0000-0000-0000-000000000001'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
)

async function main() {
  console.log('═══ VALIDATION SCÉNARIOS (service_role, bypass RLS) ═══\n')

  for (const [label, orgId] of [['CERDIA Globale', CERDIA], ['DEMO', DEMO]] as const) {
    const { data, count, error } = await admin
      .from('scenarios')
      .select('id, name, status, organization_id, created_at', { count: 'exact' })
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })

    if (error) { console.log(`${label} : ERREUR ${error.message}`); continue }
    console.log(`${label} — ${count} scénario(s) :`)
    data?.forEach(r => console.log(`  • [${r.status}] ${r.name}  (${r.id})`))
    console.log()
  }

  // Test vue scenarios_with_votes (utilisée par l'app)
  console.log('─── Vue scenarios_with_votes ───')
  const { data: vueData, error: vueErr } = await admin
    .from('scenarios_with_votes')
    .select('id, name, status, organization_id')
    .order('organization_id')

  if (vueErr) {
    console.log(`ERREUR sur la vue : ${vueErr.message}`)
  } else {
    console.log(`Total visible (sans filtre org) : ${vueData?.length ?? 0}`)
    vueData?.forEach(r => {
      const tenant = r.organization_id === CERDIA ? 'CERDIA' : r.organization_id === DEMO ? 'DEMO' : r.organization_id
      console.log(`  • [${r.status}] ${r.name}  → ${tenant}`)
    })
  }
}

main().catch(console.error)
