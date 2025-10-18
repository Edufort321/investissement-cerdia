import { NextResponse } from 'next/server'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function POST(req: Request) {
  const supabase = createServerComponentClient({ cookies })

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Fonction désactivée - ancienne implémentation supprimée
  return NextResponse.json(
    {
      success: false,
      error: 'Fonction proposeTask() non implémentée - table task_authorizations supprimée'
    },
    { status: 501 }
  )
}
