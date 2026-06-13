import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'; import * as path from 'path'
function loadEnv(){const c=fs.readFileSync(path.join(process.cwd(),'.env.local'),'utf8');for(const l of c.split('\n')){const t=l.trim();if(!t||t.startsWith('#'))continue;const e=t.indexOf('=');if(e<0)continue;let v=t.slice(e+1).trim();if((v.startsWith('"')&&v.endsWith('"'))||(v.startsWith("'")&&v.endsWith("'")))v=v.slice(1,-1);process.env[t.slice(0,e).trim()]=v}}
async function main(){loadEnv()
 const a=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false}})
 const {data:users}=await a.auth.admin.listUsers()
 const eric=users.users.find(u=>u.email?.toLowerCase()==='eric.dufort@cerdia.ai')
 console.log('Eric user_id =', eric?.id, ' meta.org=', eric?.user_metadata?.organization_id)
 if(!eric) return
 const {data:profs}=await a.from('profiles').select('id,organization_id,role').eq('id',eric.id)
 console.log('\nprofiles pour Eric:'); for(const p of profs??[]) console.log('  ',p)
 const {data:invs}=await a.from('investors').select('id,first_name,last_name,user_id,organization_id,email').eq('user_id',eric.id)
 console.log(`\ninvestors avec user_id=Eric : ${invs?.length}`); for(const i of invs??[]) console.log('  ',i.organization_id, i.first_name, i.last_name, i.email, i.id)
 // tous les investors par org (compte + doublons user_id)
 const {data:allInv}=await a.from('investors').select('user_id,organization_id')
 const byOrg:Record<string,number>={}, dupUser:Record<string,number>={}
 for(const i of allInv??[]){ byOrg[i.organization_id]=(byOrg[i.organization_id]||0)+1; if(i.user_id){dupUser[i.user_id]=(dupUser[i.user_id]||0)+1} }
 console.log('\ninvestors count par org:', byOrg)
 console.log('user_id présents dans >1 investor:', Object.entries(dupUser).filter(([,n])=>n>1))
}
main().catch(e=>{console.error(e);process.exit(1)})
