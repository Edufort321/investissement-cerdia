import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'; import * as path from 'path'
function loadEnv(){const c=fs.readFileSync(path.join(process.cwd(),'.env.local'),'utf8');for(const l of c.split('\n')){const t=l.trim();if(!t||t.startsWith('#'))continue;const e=t.indexOf('=');if(e<0)continue;let v=t.slice(e+1).trim();if((v.startsWith('"')&&v.endsWith('"'))||(v.startsWith("'")&&v.endsWith("'")))v=v.slice(1,-1);process.env[t.slice(0,e).trim()]=v}}
const C='c0000000-0000-0000-0000-000000000001', D='d0000000-0000-0000-0000-000000000001'
async function main(){loadEnv()
 const a=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false}})
 for(const [name,id] of [['CERDIA Globale',C],['DEMO',D]]){
   console.log(`\n══ ${name} (${id}) ══`)
   const {data:p}=await a.from('properties').select('id,name,created_at').eq('organization_id',id).order('created_at')
   console.log(' PROPERTIES:'); for(const x of p??[]) console.log(`   ${x.created_at?.slice(0,10)} | ${x.name} | ${x.id}`)
   const {data:s}=await a.from('scenarios').select('id,name,status,converted_property_id,created_at').eq('organization_id',id).order('created_at')
   console.log(' SCENARIOS:'); for(const x of s??[]) console.log(`   ${x.created_at?.slice(0,10)} | ${x.status} | conv=${x.converted_property_id?'oui':'non'} | ${x.name} | ${x.id}`)
 }
}
main().catch(e=>{console.error(e);process.exit(1)})
