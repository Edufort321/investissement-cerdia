import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
    const body = await request.json()
    const { user_id, password } = body

    // Validation
    if (!user_id || !password) {
      return NextResponse.json(
        { error: 'Missing required fields: user_id, password' },
        { status: 400 }
      )
    }

    // Réinitialiser le mot de passe
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      user_id,
      { password }
    )

    if (authError) {
      console.error('Error resetting password:', authError)
      return NextResponse.json(
        { error: `Failed to reset password: ${authError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully'
    })

  } catch (error: any) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
