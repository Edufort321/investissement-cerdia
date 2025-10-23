import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Vérifier que les variables d'environnement sont définies
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL is not defined')
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY is not defined')
}

// Créer un client Supabase avec la clé de service (admin)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function POST(request: NextRequest) {
  try {
    console.log('🔵 [reset-password] API called')

    const body = await request.json()
    const { user_id, password } = body

    console.log('🔵 [reset-password] Request data:', { user_id, hasPassword: !!password })

    // Validation
    if (!user_id || !password) {
      console.error('❌ [reset-password] Missing required fields')
      return NextResponse.json(
        { error: 'Missing required fields: user_id, password' },
        { status: 400 }
      )
    }

    // Vérifier que la clé service est disponible
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ [reset-password] SUPABASE_SERVICE_ROLE_KEY is not configured')
      return NextResponse.json(
        { error: 'Server configuration error: Missing SUPABASE_SERVICE_ROLE_KEY. Please configure it in Vercel Environment Variables.' },
        { status: 500 }
      )
    }

    console.log('🔵 [reset-password] Resetting password for user:', user_id)

    // Réinitialiser le mot de passe
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      user_id,
      { password }
    )

    if (authError) {
      console.error('❌ [reset-password] Supabase Auth error:', authError)
      return NextResponse.json(
        { error: `Failed to reset password: ${authError.message}` },
        { status: 500 }
      )
    }

    console.log('✅ [reset-password] Password reset successfully')

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully'
    })

  } catch (error: any) {
    console.error('❌ [reset-password] API Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
