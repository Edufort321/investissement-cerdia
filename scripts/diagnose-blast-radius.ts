import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'; import * as path from 'path'
function loadEnv(){const c=fs.readFileSync(path.join(process.cwd(),'.env.local'),'utf8');for(const l of c.split('\n')){const t=l.trim();if(!t||t.startsWith('#'))continue;const e=t.indexOf('=');if(e<0)continue;let v=t.slice(e+1).trim();if((v.startsWith('"')&&v.endsWith('"'))||(v.startsWith("'")&&v.endsWith("'")))v=v.slice(1,-1);process.env[t.slice(0,e).trim()]=v}}
async function main(){loadEnv()
 const a=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false}})
 const PROPS=['48785cab-beb3-4844-bc67-a146d75dca5c','92fa2d93-7c49-4c0c-9e1e-8b5e6ced3606','16eddafb-47dd-4919-8f30-0444958fc7d1']
 const SCEN=['2280e3cf-d780-4e2c-a324-d8ebe45d113a','e3fc0e3e-cfaa-42bd-ad58-002c24353399','f9412c9e-51d9-470b-b961-64f7428b2a43']
 // tables référencées par property_id
 const byProp=['transactions','payment_schedules','property_valuations','property_attachments','property_links','property_management_api','investor_properties','investor_reservations','investor_debts','operational_expenses','nav_history','property_financial_summary','liabilities','project_phases','project_milestones','project_risks','contractors','scenario_bookings','budgets']
 console.log('── Lignes référençant les 3 propriétés (par property_id) ──')
 for(const t of byProp){
   const {count,error}=await a.from(t).select('*',{count:'exact',head:true}).in('property_id',PROPS)
   if(error){ if(!/does not exist|column/.test(error.message)) console.log(`  ${t.padEnd(26)}: (skip ${error.message.slice(0,40)})`); continue }
   if((count||0)>0) console.log(`  ${t.padEnd(26)}: ${count}`)
 }
 // scenarios + tables référencées par scenario_id
 console.log('\n── Scénarios + dépendances (par scenario_id / id) ──')
 const {count:sc}=await a.from('scenarios').select('*',{count:'exact',head:true}).in('id',SCEN)
 console.log(`  scenarios                 : ${sc}`)
 for(const t of ['scenario_results','scenario_votes','scenario_documents','scenario_actual_values','scenario_bookings']){
   const {count,error}=await a.from(t).select('*',{count:'exact',head:true}).in('scenario_id',SCEN)
   if(error){ if(!/does not exist|column/.test(error.message)) console.log(`  ${t.padEnd(26)}: (skip)`); continue }
   if((count||0)>0) console.log(`  ${t.padEnd(26)}: ${count}`)
 }
 // transactions liées aux payment_schedules de ces propriétés
 const {data:ps}=await a.from('payment_schedules').select('id').in('property_id',PROPS)
 const psIds=(ps??[]).map(x=>x.id)
 if(psIds.length){
   const {count}=await a.from('transactions').select('*',{count:'exact',head:true}).in('payment_schedule_id',psIds)
   console.log(`\n  transactions liées via payment_schedule_id : ${count??0}`)
 }
}
main().catch(e=>{console.error(e);process.exit(1)})
