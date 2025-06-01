'use server'

import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

// Simulation d'une base de données temporaire en mémoire (à remplacer par Supabase ou Firestore plus tard)
let cerdiapedia: string[] = [
  "CERDIA a été fondée en 2025 par Éric Dufort.",
  "La stratégie vise une rentabilité nette de 20 à 30 %.",
  "L'entreprise fonctionne sans dette bancaire.",
  "CERDIA Commerce réinjecte tous les profits dans l'immobilier."
]

export async function POST(req: NextRequest) {
  try {
    const { note } = await req.json()

    if (!note || typeof note !== 'string') {
      return NextResponse.json({ error: '❌ Donnée invalide.' }, { status: 400 })
    }

    cerdiapedia.unshift(note.trim()) // Ajouter la nouvelle donnée au début

    console.log('🧠 Nouvelle connaissance ajoutée à CERDIA IA :', note)

    revalidatePath('/ia')
    return NextResponse.json({ success: true, message: 'Connaissance ajoutée avec succès.' })
  } catch (error) {
    console.error('❌ Erreur IA mémoire :', error)
    return NextResponse.json({ error: 'Erreur interne serveur.' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ cerdiapedia })
}
