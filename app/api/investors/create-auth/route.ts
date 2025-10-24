import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createInvestorSchema, formatZodErrors } from '@/lib/validation'

// Vérifier que les variables d'environnement sont définies
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL is not defined')
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY is not defined')
}

// Créer un client Supabase avec la clé de service (admin)
// IMPORTANT: Cette clé ne doit JAMAIS être exposée côté client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Clé de service (admin)
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function POST(request: NextRequest) {
  try {
    console.log('🔵 [create-auth] API called')

    const body = await request.json()

    // ⚠️ SÉCURITÉ: Validation Zod stricte
    const validation = createInvestorSchema.safeParse(body)

    if (!validation.success) {
      console.error('❌ [create-auth] Validation failed:', validation.error)
      return NextResponse.json(
        {
          error: 'Validation échouée',
          details: formatZodErrors(validation.error)
        },
        { status: 400 }
      )
    }

    const { email, password, firstName, lastName } = validation.data

    console.log('🔵 [create-auth] Request data:', { email, firstName, lastName, hasPassword: !!password })

    // Vérifier que la clé service est disponible
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ [create-auth] SUPABASE_SERVICE_ROLE_KEY is not configured')
      return NextResponse.json(
        { error: 'Server configuration error: Missing SUPABASE_SERVICE_ROLE_KEY. Please configure it in Vercel Environment Variables.' },
        { status: 500 }
      )
    }

    console.log('🔵 [create-auth] Creating user in Supabase Auth...')

    // Créer l'utilisateur dans Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: false, // ⚠️ SÉCURITÉ: L'utilisateur doit confirmer son email
      user_metadata: {
        first_name: firstName,
        last_name: lastName
      }
    })

    if (authError) {
      console.error('❌ [create-auth] Supabase Auth error:', authError)
      return NextResponse.json(
        { error: `Failed to create auth account: ${authError.message}` },
        { status: 500 }
      )
    }

    console.log('✅ [create-auth] User created successfully:', authData.user?.id)

    // Retourner le user_id créé
    return NextResponse.json({
      success: true,
      user_id: authData.user?.id,
      email: authData.user?.email
    })

  } catch (error: any) {
    console.error('❌ [create-auth] API Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
