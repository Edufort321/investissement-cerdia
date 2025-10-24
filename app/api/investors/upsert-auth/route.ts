import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { upsertInvestorSchema, formatZodErrors } from '@/lib/validation'

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
    console.log('🔵 [upsert-auth] API called')

    const body = await request.json()

    // ⚠️ SÉCURITÉ: Validation Zod stricte
    const validation = upsertInvestorSchema.safeParse(body)

    if (!validation.success) {
      console.error('❌ [upsert-auth] Validation failed:', validation.error)
      return NextResponse.json(
        {
          error: 'Validation échouée',
          details: formatZodErrors(validation.error)
        },
        { status: 400 }
      )
    }

    const { email, password, firstName, lastName, user_id } = validation.data

    console.log('🔵 [upsert-auth] Request data:', {
      email,
      firstName,
      lastName,
      hasPassword: !!password,
      user_id: user_id || 'none'
    })

    // Vérifier que la clé service est disponible
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ [upsert-auth] SUPABASE_SERVICE_ROLE_KEY is not configured')
      return NextResponse.json(
        { error: 'Server configuration error: Missing SUPABASE_SERVICE_ROLE_KEY. Please configure it in Vercel Environment Variables.' },
        { status: 500 }
      )
    }

    // Si un user_id est fourni, on met à jour directement ce compte
    if (user_id) {
      console.log('🟡 [upsert-auth] user_id fourni, mise à jour directe du compte:', user_id)

      const updateData: any = {
        user_metadata: {
          first_name: firstName,
          last_name: lastName
        }
      }

      // Mettre à jour l'email si fourni
      if (email) {
        updateData.email = email
        updateData.email_confirm = false // ⚠️ SÉCURITÉ: L'utilisateur doit confirmer le nouvel email
      }

      // Mettre à jour le mot de passe si fourni
      if (password) {
        updateData.password = password
      }

      console.log('🟡 [upsert-auth] Données de mise à jour:', {
        ...updateData,
        password: updateData.password ? '***' : undefined
      })

      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        user_id,
        updateData
      )

      if (updateError) {
        console.error('❌ [upsert-auth] Erreur lors de la mise à jour:', updateError)
        return NextResponse.json(
          { error: `Failed to update user: ${updateError.message}` },
          { status: 500 }
        )
      }

      console.log('✅ [upsert-auth] Compte Auth mis à jour avec succès')

      return NextResponse.json({
        success: true,
        user_id: user_id,
        email: email,
        existed: true,
        message: 'User updated successfully'
      })
    }

    // Sinon, vérifier si l'email existe déjà dans Auth
    console.log('🔵 [upsert-auth] Vérification si l\'email existe déjà dans Auth...')

    const { data, error: listError } = await supabaseAdmin.auth.admin.listUsers()

    if (listError) {
      console.error('❌ [upsert-auth] Erreur lors de la récupération de la liste des utilisateurs:', listError)
      return NextResponse.json(
        { error: `Failed to check existing users: ${listError.message}` },
        { status: 500 }
      )
    }

    const existingUsers = data?.users || []
    console.log('🔵 [upsert-auth] Nombre total d\'utilisateurs Auth:', existingUsers.length)

    const existingUser = existingUsers.find((u: any) => u.email === email)

    if (existingUser) {
      console.log('🟡 [upsert-auth] Utilisateur existant trouvé! user_id:', existingUser.id)

      const updateData: any = {
        user_metadata: {
          first_name: firstName || existingUser.user_metadata?.first_name,
          last_name: lastName || existingUser.user_metadata?.last_name
        }
      }

      // Si un mot de passe est fourni, le mettre à jour
      if (password) {
        console.log('🟡 [upsert-auth] Mise à jour du mot de passe...')
        updateData.password = password
      } else {
        console.log('⚪ [upsert-auth] Pas de mot de passe fourni, pas de mise à jour du password')
      }

      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        existingUser.id,
        updateData
      )

      if (updateError) {
        console.error('❌ [upsert-auth] Erreur lors de la mise à jour:', updateError)
        return NextResponse.json(
          { error: `Failed to update user: ${updateError.message}` },
          { status: 500 }
        )
      }

      console.log('✅ [upsert-auth] Utilisateur existant mis à jour avec succès')

      return NextResponse.json({
        success: true,
        user_id: existingUser.id,
        email: existingUser.email,
        existed: true,
        message: password ? 'Existing user found, updated' : 'Existing user found, metadata updated'
      })

    } else {
      console.log('🟢 [upsert-auth] Aucun utilisateur existant, création d\'un nouveau compte...')

      if (!password) {
        console.error('❌ [upsert-auth] Mot de passe requis pour créer un nouveau compte')
        return NextResponse.json(
          { error: 'Password is required to create a new auth account' },
          { status: 400 }
        )
      }

      if (!firstName || !lastName) {
        console.error('❌ [upsert-auth] firstName et lastName requis pour créer un nouveau compte')
        return NextResponse.json(
          { error: 'firstName and lastName are required to create a new auth account' },
          { status: 400 }
        )
      }

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
        console.error('❌ [upsert-auth] Erreur lors de la création du compte:', authError)
        return NextResponse.json(
          { error: `Failed to create auth account: ${authError.message}` },
          { status: 500 }
        )
      }

      console.log('✅ [upsert-auth] Nouveau compte créé avec succès! user_id:', authData.user?.id)

      return NextResponse.json({
        success: true,
        user_id: authData.user?.id,
        email: authData.user?.email,
        existed: false,
        message: 'New auth account created successfully'
      })
    }

  } catch (error: any) {
    console.error('❌ [upsert-auth] API Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
