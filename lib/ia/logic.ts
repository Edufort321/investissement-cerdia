import { supabase } from '@/lib/supabase'

/**
 * Fonction IA qui propose automatiquement une tâche à approuver
 * TODO: Implémenter avec la nouvelle structure Supabase
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
  // Temporairement désactivé - table task_authorizations n'existe plus
  console.log('proposeTask() appelé mais non implémenté:', { user_id, type, payload, note })

  return {
    success: false,
    error: 'Fonction non implémentée - table task_authorizations supprimée'
  }
}
