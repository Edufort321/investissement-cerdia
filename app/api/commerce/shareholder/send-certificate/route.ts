/**
 * POST /api/commerce/shareholder/send-certificate
 *
 * Archive le certificat de souscription d'actions (PDF signé, généré côté client
 * avec le logo) dans le bucket `corporate-documents`, puis l'envoie par courriel
 * à l'actionnaire via Resend.
 *
 * Auth : admin (super_admin / org_admin) via Bearer token. Upload + écriture DB
 * via service_role (caller.admin). Conforme à la convention CERDIA : upload
 * server-side, octets en Uint8Array (jamais Buffer).
 *
 * Body : { shareholderId: string, pdfBase64: string }  (pdfBase64 = data URL ou base64 brut)
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdminToken, adminAuthError } from '@/lib/auth/require-admin-token'

const BUCKET = 'corporate-documents'

export async function POST(request: NextRequest) {
  let caller
  try {
    caller = await requireAdminToken(request)
  } catch (e) {
    return adminAuthError(e)
  }

  const body = await request.json().catch(() => ({} as any))
  const shareholderId = (body.shareholderId as string) || ''
  const pdfBase64 = (body.pdfBase64 as string) || ''
  if (!shareholderId || !pdfBase64) {
    return NextResponse.json({ error: 'shareholderId et pdfBase64 requis' }, { status: 400 })
  }

  // Charge l'actionnaire (service_role).
  const { data: sh, error: shErr } = await caller.admin
    .from('company_shareholders')
    .select('id, full_name, email')
    .eq('id', shareholderId)
    .maybeSingle()
  if (shErr || !sh) {
    return NextResponse.json({ error: 'actionnaire introuvable' }, { status: 404 })
  }

  // Décode le base64 (retire le préfixe data URL éventuel) en Uint8Array.
  const raw = pdfBase64.includes(',') ? pdfBase64.slice(pdfBase64.indexOf(',') + 1) : pdfBase64
  let bytes: Uint8Array
  try {
    bytes = Uint8Array.from(Buffer.from(raw, 'base64'))
  } catch {
    return NextResponse.json({ error: 'pdfBase64 invalide' }, { status: 400 })
  }

  const safeName = sh.full_name.replace(/[^a-z0-9]/gi, '_')
  const path = `shareholders/${shareholderId}/certificat-${safeName}-${Date.now()}.pdf`

  // Archive le PDF dans le bucket privé.
  const { error: upErr } = await caller.admin.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: 'application/pdf', upsert: true })
  if (upErr) {
    return NextResponse.json({ error: `archivage échoué : ${upErr.message}` }, { status: 500 })
  }

  // Envoi courriel (best-effort) si l'actionnaire a un courriel + clé Resend présente.
  const now = new Date().toISOString()
  let emailed = false
  let emailError: string | null = null
  const apiKey = process.env.RESEND_API_KEY
  if (!sh.email) {
    emailError = 'actionnaire sans courriel'
  } else if (!apiKey) {
    emailError = 'RESEND_API_KEY absent'
  } else {
    try {
      const { Resend } = await import('resend')
      const resend = new Resend(apiKey)
      const from = process.env.SUPPORT_EMAIL_FROM || 'CERDIA <support@cerdia.ai>'
      await resend.emails.send({
        from,
        to: sh.email,
        subject: 'CERDIA — Votre certificat de souscription d\'actions',
        text:
          `Bonjour ${sh.full_name},\n\n` +
          `Vous trouverez ci-joint votre certificat de souscription d'actions signé électroniquement, ` +
          `émis par CERDIA. Ce document est scellé par une empreinte d'intégrité (SHA-256) et horodaté.\n\n` +
          `Merci de votre confiance,\nCERDIA`,
        attachments: [{ filename: `certificat-${safeName}.pdf`, content: Buffer.from(bytes) }],
      })
      emailed = true
    } catch (err: any) {
      emailError = err?.message || 'échec envoi courriel'
      console.error('[send-certificate] email failed:', err)
    }
  }

  // Met à jour la trace d'archivage / envoi.
  await caller.admin
    .from('company_shareholders')
    .update({
      certificate_path: path,
      ...(emailed ? { certificate_sent_at: now, certificate_sent_to: sh.email } : {}),
    })
    .eq('id', shareholderId)

  return NextResponse.json({ success: true, path, emailed, emailError })
}
