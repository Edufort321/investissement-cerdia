import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { rateLimit } from '@/lib/rate-limit'

/**
 * Lien de remplissage portfolio (/portfolio/fill/[token]) : délivre une URL d'upload SIGNÉE
 * vers le bucket « portfolio », après validation du fill_token (mig.224/225).
 * - Le chemin est imposé par le serveur (<profile_id>/...) : impossible d'écraser les fichiers d'un autre.
 * - Le fichier part directement du navigateur vers Supabase (pas de limite 4,5 Mo Vercel ; vidéos OK).
 * - service_role utilisé ici seulement (serveur).
 */
const limiter = rateLimit({ interval: 60_000, uniqueTokenPerInterval: 60 })

const KINDS = ['headshot_url', 'cover_url', 'item', 'crop'] as const
type Kind = typeof KINDS[number]
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const EXT_RE = /^[a-z0-9]{2,5}$/

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    if (!limiter.check(`fill-upload:${ip}`).success) {
      return NextResponse.json({ error: 'Trop de requêtes, réessaie dans une minute.' }, { status: 429 })
    }
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Configuration serveur manquante' }, { status: 500 })
    }

    const body = await request.json().catch(() => null) as
      { token?: string; kind?: string; ext?: string; contentType?: string } | null
    const token = body?.token ?? ''
    const kind = body?.kind as Kind
    const ext = (body?.ext ?? '').toLowerCase()
    const contentType = body?.contentType ?? ''

    if (!UUID_RE.test(token) || !KINDS.includes(kind) || !EXT_RE.test(ext)
        || !(contentType.startsWith('image/') || contentType.startsWith('video/'))) {
      return NextResponse.json({ error: 'Requête invalide' }, { status: 400 })
    }
    if (kind !== 'item' && !contentType.startsWith('image/')) {
      return NextResponse.json({ error: 'Image attendue' }, { status: 400 })
    }

    const sb = admin()
    const { data: profile } = await sb.from('portfolio_profiles').select('id').eq('fill_token', token).maybeSingle()
    if (!profile) return NextResponse.json({ error: 'Lien invalide' }, { status: 403 })

    const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const path = kind === 'item'   ? `${profile.id}/items/${stamp}.${ext}`
               : kind === 'crop'   ? `${profile.id}/items/${stamp}-crop.${ext}`
               : `${profile.id}/${kind}-${stamp}.${ext}`

    const { data, error } = await sb.storage.from('portfolio').createSignedUploadUrl(path)
    if (error || !data) {
      console.error('[portfolio/fill-upload]', error?.message)
      return NextResponse.json({ error: error?.message ?? 'Erreur stockage' }, { status: 500 })
    }
    const { data: pub } = sb.storage.from('portfolio').getPublicUrl(path)
    return NextResponse.json({ path, signedToken: data.token, publicUrl: pub.publicUrl })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[portfolio/fill-upload]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
