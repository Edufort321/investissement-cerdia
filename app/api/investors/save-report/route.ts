/**
 * POST /api/investors/save-report
 *
 * Reçoit un PDF généré côté client (jsPDF) et :
 *   1. L'uploade dans le bucket Supabase Storage « documents »
 *      au path {investor_id}/rapports/CERDIA-Rapport-T{Q}-{Y}-{name}.pdf
 *   2. Insère un enregistrement dans la table documents
 *   3. (Optionnel) Marque la demande investor_report_requests comme done
 *
 * FormData attendu :
 *   pdf           Blob   — fichier PDF
 *   investor_id   string
 *   investor_name string — utilisé dans le nom de fichier
 *   fiscal_year   string
 *   quarter       string (1-4)
 *   request_id    string (optionnel) — id de investor_report_requests
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdminToken, adminAuthError } from '@/lib/auth/require-admin-token'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}

export async function POST(request: NextRequest) {
  try {
    // 🔒 Auth obligatoire : seul un admin peut uploader un rapport investisseur.
    try {
      await requireAdminToken(request)
    } catch (e) {
      return adminAuthError(e)
    }

    const formData = await request.formData()

    const pdfBlob   = formData.get('pdf')           as File | null
    const investorId   = formData.get('investor_id')   as string | null
    const investorName = formData.get('investor_name') as string | null
    const fiscalYear   = formData.get('fiscal_year')   as string | null
    const quarter      = formData.get('quarter')       as string | null
    const requestId    = formData.get('request_id')    as string | null

    // ── Validation des champs requis ─────────────────────────────────────
    if (!pdfBlob || !investorId || !investorName || !fiscalYear || !quarter) {
      return NextResponse.json(
        { error: 'Champs requis manquants : pdf, investor_id, investor_name, fiscal_year, quarter' },
        { status: 400 }
      )
    }

    const year = parseInt(fiscalYear, 10)
    const q    = parseInt(quarter, 10)

    if (isNaN(year) || isNaN(q) || q < 1 || q > 4) {
      return NextResponse.json(
        { error: 'fiscal_year ou quarter invalide' },
        { status: 400 }
      )
    }

    // Sanitise le nom pour le chemin de stockage (retire les caractères problématiques)
    const safeName = investorName.replace(/[^a-zA-Z0-9À-ÿ\s-]/g, '').trim().replace(/\s+/g, '-')
    const fileName = `CERDIA-Rapport-T${q}-${year}-${safeName}.pdf`
    const storagePath = `${investorId}/rapports/${fileName}`

    const supabase = getSupabaseAdmin()

    // ── 1. Upload dans Storage ───────────────────────────────────────────
    const arrayBuffer = await pdfBlob.arrayBuffer()
    const uint8       = new Uint8Array(arrayBuffer)

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(storagePath, uint8, {
        contentType: 'application/pdf',
        upsert: true,
      })

    if (uploadError) {
      console.error('[save-report] Storage upload error:', uploadError.message)
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    // ── 2. Insertion dans la table documents ─────────────────────────────
    const { data: docData, error: docError } = await supabase
      .from('documents')
      .insert({
        name:         fileName,
        type:         'rapport_trimestriel',
        storage_path: storagePath,
        file_size:    pdfBlob.size,
        investor_id:  investorId,
        description:  `Rapport trimestriel T${q} ${year}`,
      })
      .select('id')
      .single()

    if (docError) {
      console.error('[save-report] Document insert error:', docError.message)
      return NextResponse.json({ error: docError.message }, { status: 500 })
    }

    const documentId: string = docData.id

    // ── 3. Mise à jour de investor_report_requests (optionnel) ───────────
    if (requestId) {
      const { error: reqError } = await supabase
        .from('investor_report_requests')
        .update({
          status:       'done',
          document_id:  documentId,
          generated_at: new Date().toISOString(),
        })
        .eq('id', requestId)

      if (reqError) {
        // Non-bloquant : on log mais on ne fait pas échouer la réponse
        console.warn('[save-report] Could not update request status:', reqError.message)
      }
    }

    return NextResponse.json({
      success:      true,
      document_id:  documentId,
      storage_path: storagePath,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[save-report] Caught error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
