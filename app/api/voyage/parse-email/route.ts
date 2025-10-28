import { NextRequest, NextResponse } from 'next/server'
import { parseEmail } from '@/lib/email-parser'

/**
 * POST /api/voyage/parse-email
 * Parse un email de confirmation de voyage et retourne les données extraites
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { subject, emailBody } = body

    if (!subject || !emailBody) {
      return NextResponse.json(
        { error: 'Subject et emailBody requis' },
        { status: 400 }
      )
    }

    // Parse l'email
    const booking = parseEmail(subject, emailBody)

    if (!booking) {
      return NextResponse.json(
        {
          error: 'Aucune réservation détectée',
          suggestion: 'Assurez-vous que l\'email contient une confirmation de vol, hôtel, location de voiture ou activité'
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      booking
    })

  } catch (error) {
    console.error('Erreur parsing email:', error)
    return NextResponse.json(
      { error: 'Erreur lors du parsing de l\'email' },
      { status: 500 }
    )
  }
}
