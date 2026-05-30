import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdminToken, adminAuthError } from '@/lib/auth/require-admin-token'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  // Use service_role key to bypass RLS — commerce admin has its own auth
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}

export async function POST(request: NextRequest) {
  try {
    // 🔒 Auth admin : sans ça, n'importe qui uploadait/écrasait un fichier arbitraire.
    try {
      await requireAdminToken(request)
    } catch (e) {
      return adminAuthError(e)
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const path = formData.get('path') as string | null

    if (!file || !path) {
      return NextResponse.json({ error: 'Fichier ou chemin manquant' }, { status: 400 })
    }

    // Anti path-traversal : refuse les chemins absolus ou remontants.
    if (path.includes('..') || path.startsWith('/') || path.includes('\\')) {
      return NextResponse.json({ error: 'Chemin invalide' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    const arrayBuffer = await file.arrayBuffer()
    const uint8 = new Uint8Array(arrayBuffer)

    const { error } = await supabase.storage
      .from('attachments')
      .upload(path, uint8, {
        contentType: file.type || 'application/octet-stream',
        upsert: true,
      })

    if (error) {
      console.error('[commerce/upload] Supabase error:', error.message)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const { data: urlData } = supabase.storage.from('attachments').getPublicUrl(path)

    return NextResponse.json({ url: urlData.publicUrl, path })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[commerce/upload] Caught error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
