'use server'

import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { revalidatePath } from 'next/cache'

// Mémoire dynamique pour apprentissage complémentaire (manuel ou API)
let cerdiapedia: string[] = [
  "CERDIA a été fondée en 2025 par Éric Dufort.",
  "La stratégie vise une rentabilité nette de 15 à 20 %.",
  "L'entreprise fonctionne sans dette bancaire.",
  "CERDIA Commerce réinjecte tous les profits dans l'immobilier."
]

export async function POST(req: NextRequest) {
  try {
    const { note } = await req.json()

    if (!note || typeof note !== 'string') {
      return NextResponse.json({ error: '❌ Donnée invalide.' }, { status: 400 })
    }

    cerdiapedia.unshift(note.trim())

    console.log('🧠 Nouvelle connaissance ajoutée à CERDIA IA :', note)

    revalidatePath('/ia')
    return NextResponse.json({ success: true, message: 'Connaissance ajoutée avec succès.' })
  } catch (error) {
    console.error('❌ Erreur IA mémoire :', error)
    return NextResponse.json({ error: 'Erreur interne serveur.' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const vision = await readFile('/mnt/data/vision_cerdia_2025_2045.txt', 'utf-8')
    return NextResponse.json({ cerdiapedia, vision })
  } catch (err) {
    console.error('❌ Erreur lecture fichier vision :', err)
    return NextResponse.json({ error: 'Erreur de lecture du fichier vision.' }, { status: 500 })
  }
}
