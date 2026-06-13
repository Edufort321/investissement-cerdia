import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'; import * as path from 'path'
function loadEnv(){const c=fs.readFileSync(path.join(process.cwd(),'.env.local'),'utf8');for(const l of c.split('\n')){const t=l.trim();if(!t||t.startsWith('#'))continue;const e=t.indexOf('=');if(e<0)continue;let v=t.slice(e+1).trim();if((v.startsWith('"')&&v.endsWith('"'))||(v.startsWith("'")&&v.endsWith("'")))v=v.slice(1,-1);process.env[t.slice(0,e).trim()]=v}}
async function main(){loadEnv()
  const a=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false}})
  const {data,error}=await a.from('organizations').select('id,name,plan,status,is_demo,is_billable,vendor_id,settings,created_at').order('created_at')
  if(error){console.error(error);return}
  console.log(`\nTOTAL ORGS: ${data?.length}\n`)
  for(const o of data??[]){
    const sp=(o.settings as any)?.saas_pricing?.annual_amount_cad
    console.log(`• ${o.name}`)
    console.log(`    plan=${o.plan} | status=${o.status} | is_demo=${o.is_demo} | is_billable=${o.is_billable} | vendor=${o.vendor_id?'oui':'non'}`)
    console.log(`    saas_pricing.annual_amount_cad=${sp ?? '(aucun)'}`)
    // Reproduit la logique de app/commerce/admin/page.tsx
    const isExternal = o.plan !== 'internal'
    const countsAsBillable = isExternal && o.status === 'active' && o.is_billable && !o.is_demo
    const countsAsDemo = isExternal && (o.is_demo || !o.is_billable)
    console.log(`    -> externe=${isExternal} | compte FACTURABLE=${countsAsBillable} | compte DEMO/non-fact=${countsAsDemo}`)
    console.log('')
  }
}
main().catch(e=>{console.error(e);process.exit(1)})
