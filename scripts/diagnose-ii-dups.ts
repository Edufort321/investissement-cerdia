import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'; import * as path from 'path'
function loadEnv(){const c=fs.readFileSync(path.join(process.cwd(),'.env.local'),'utf8');for(const l of c.split('\n')){const t=l.trim();if(!t||t.startsWith('#'))continue;const e=t.indexOf('=');if(e<0)continue;let v=t.slice(e+1).trim();if((v.startsWith('"')&&v.endsWith('"'))||(v.startsWith("'")&&v.endsWith("'")))v=v.slice(1,-1);process.env[t.slice(0,e).trim()]=v}}
async function main(){loadEnv()
 const a=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false}})
 const {data,error}=await a.from('investor_investments').select('id,transaction_id,organization_id,investor_id,amount_invested,created_at').order('created_at',{ascending:false})
 if(error){console.log('ERREUR',error.message);return}
 console.log('total investor_investments:',data?.length)
 const byTx:Record<string,number>={}, nullOrg=[] as any[]
 for(const r of data??[]){ if(r.transaction_id) byTx[r.transaction_id]=(byTx[r.transaction_id]||0)+1; if(!r.organization_id) nullOrg.push(r) }
 const dups=Object.entries(byTx).filter(([,n])=>n>1)
 console.log('transaction_id avec >1 investor_investment (double-compte):',dups.length)
 for(const [tx,n] of dups.slice(0,10)) console.log('   tx',tx,'→',n,'lignes')
 console.log('\ninvestor_investments avec organization_id NULL:',nullOrg.length)
 for(const r of nullOrg.slice(0,10)) console.log('   ',r.id, 'tx=',r.transaction_id, 'inv=',r.investor_id)
 // org distribution
 const byOrg:Record<string,number>={}; for(const r of data??[]) byOrg[r.organization_id??'NULL']=(byOrg[r.organization_id??'NULL']||0)+1
 console.log('\nrépartition par org:',byOrg)
}
main().catch(e=>{console.error(e);process.exit(1)})
