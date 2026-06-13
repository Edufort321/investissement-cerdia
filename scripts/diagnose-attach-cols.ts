import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'; import * as path from 'path'
function loadEnv(){const c=fs.readFileSync(path.join(process.cwd(),'.env.local'),'utf8');for(const l of c.split('\n')){const t=l.trim();if(!t||t.startsWith('#'))continue;const e=t.indexOf('=');if(e<0)continue;let v=t.slice(e+1).trim();if((v.startsWith('"')&&v.endsWith('"'))||(v.startsWith("'")&&v.endsWith("'")))v=v.slice(1,-1);process.env[t.slice(0,e).trim()]=v}}
async function main(){loadEnv()
 const a=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false}})
 const cols=['id','property_id','file_name','file_type','storage_path','file_size','description','attachment_category','uploaded_by','uploaded_at','organization_id']
 for(const c of cols){
   const {error}=await a.from('property_attachments').select(c).limit(1)
   console.log((error?'❌ MANQUE':'✅ existe ').padEnd(10), c, error?'→ '+error.message.slice(0,60):'')
 }
 // un échantillon de ligne
 const {data}=await a.from('property_attachments').select('*').limit(1)
 console.log('\nColonnes réelles d\'une ligne:', data&&data[0]?Object.keys(data[0]):'(table vide)')
}
main().catch(e=>{console.error(e);process.exit(1)})
