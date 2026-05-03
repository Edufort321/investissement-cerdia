import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Fresh anon client — no session inheritance, truly anonymous
const supabaseAnon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
)

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const path = formData.get('path') as string | null

    if (!file || !path) {
      return NextResponse.json({ error: 'Fichier ou chemin manquant' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { error } = await supabaseAnon.storage
      .from('attachments')
      .upload(path, buffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: true,
      })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const { data: urlData } = supabaseAnon.storage.from('attachments').getPublicUrl(path)

    return NextResponse.json({ url: urlData.publicUrl, path })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
