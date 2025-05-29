import { NextRequest, NextResponse } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  const supabase = createMiddlewareClient({ cookies })
  const formData = await req.formData()
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { error, data } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    console.error('❌ Erreur connexion:', error.message)
    return NextResponse.json({ error: error.message }, { status: 401 })
  }

  console.log('✅ Connexion réussie pour', email)
  return NextResponse.redirect(new URL('/dashboard', req.url)) // ou autre destination
}
