/**
 * Etat des lignes `scenarios` par organisation + recherche de backups.
 * Usage : npx tsx scripts/check-scenarios.ts
 */
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

function loadEnv() {
  const content = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8')
  for (const line of content.split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const eq = t.indexOf('=')
    if (eq === -1) continue
    let v = t.slice(eq + 1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
    process.env[t.slice(0, eq).trim()] = v
  }
}

const CERDIA = 'c0000000-0000-0000-0000-000000000001'
const DEMO   = 'd0000000-0000-0000-0000-000000000001'

async function main() {
  loadEnv()
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })

  console.log('═══ ETAT TABLE scenarios ═══\n')

  // colonnes (pour savoir s'il y a un soft-delete)
  const { data: sample } = await admin.from('scenarios').select('*').limit(1)
  const cols = sample && sample[0] ? Object.keys(sample[0]) : []
  console.log('Colonnes :', cols.join(', ') || '(table vide)')
  const hasDeletedAt = cols.includes('deleted_at')
  console.log('Soft-delete (deleted_at) :', hasDeletedAt ? 'OUI' : 'NON')
  console.log('')

  // counts par org (service_role = bypass RLS = voit tout)
  for (const [label, org] of [['CERDIA Globale', CERDIA], ['DEMO', DEMO]] as const) {
    const { count } = await admin.from('scenarios').select('*', { count: 'exact', head: true }).eq('organization_id', org)
    console.log(`${label.padEnd(16)} : ${count ?? 0} scenario(s)`)
    if (hasDeletedAt) {
      const { count: active } = await admin.from('scenarios').select('*', { count: 'exact', head: true }).eq('organization_id', org).is('deleted_at', null)
      const { count: deleted } = await admin.from('scenarios').select('*', { count: 'exact', head: true }).eq('organization_id', org).not('deleted_at', 'is', null)
      console.log(`${' '.repeat(16)}   dont actifs=${active ?? 0}, soft-deleted=${deleted ?? 0}`)
    }
  }

  // toutes orgs confondues
  const { count: total } = await admin.from('scenarios').select('*', { count: 'exact', head: true })
  console.log(`\nTOTAL toutes orgs : ${total ?? 0}`)

  // liste detaillee CERDIA Globale
  console.log('\n── Scenarios CERDIA Globale (detail) ──')
  const { data: cerdiaRows } = await admin.from('scenarios')
    .select('id, name, created_at' + (hasDeletedAt ? ', deleted_at' : ''))
    .eq('organization_id', CERDIA).order('created_at', { ascending: true })
  for (const r of cerdiaRows || []) {
    console.log(`  ${(r as any).name?.padEnd(35) ?? '(sans nom)'} | cree ${(r as any).created_at?.slice(0,10)}${hasDeletedAt ? ' | deleted_at=' + ((r as any).deleted_at ?? 'null') : ''}`)
  }

  // recherche de tables de backup (on tente des noms connus)
  console.log('\n── Tables de backup contenant "scenario" ──')
  for (const guess of ['scenarios_backup', 'scenarios_backup_20260513', 'scenarios_backup_20260514', 'backup_scenarios']) {
    const { count, error } = await admin.from(guess).select('*', { count: 'exact', head: true })
    if (!error) console.log(`  TROUVE : ${guess} (${count ?? 0} lignes)`)
  }
  console.log('  (si rien ci-dessus : pas de table de backup evidente)')

  console.log('\n═══ FIN ═══')
}

main().catch(e => { console.error(e); process.exit(1) })
