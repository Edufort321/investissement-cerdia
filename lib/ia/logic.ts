import { createClient } from '@supabase/supabase-js'
import { Database } from '@/lib/database.types'

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Utiliser clé sécurisée pour écriture avec RLS
)

/**
 * Fonction IA qui propose automatiquement une tâche à approuver
 */
export async function proposeTask({
  user_id,
  type,
  payload,
  note = ''
}: {
  user_id: string
  type: string
  payload: Record<string, any>
  note?: string
}) {
  const { data, error } = await supabase.from('task_authorizations').insert([
    {
      user_id,
      task_id: crypto.randomUUID(), // tâche liée ou générée dynamiquement
      type,
      payload,
      status: 'pending',
      note
    }
  ])

  if (error) {
    console.error('❌ Erreur proposeTask():', error)
    return { success: false, error }
  }

  console.log('✅ Tâche IA insérée :', data)
  return { success: true, data }
}
