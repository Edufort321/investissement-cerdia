import { NextResponse } from 'next/server'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { proposeTask } from '@/lib/ia/logic'

export async function POST(req: Request) {
  const supabase = createServerComponentClient({ cookies })

  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { type, payload, note } = body

  if (!type || !payload) {
    return NextResponse.json(
      { error: 'Missing task type or payload' },
      { status: 400 }
    )
  }

  const result = await proposeTask({
    user_id: user.id,
    type,
    payload,
    note
  })

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  return NextResponse.json({ success: true, task: result.data }, { status: 200 })
}
