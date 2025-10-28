import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function POST(request: NextRequest) {
  try {
    const { titre, language = 'fr' } = await request.json()

    if (!titre) {
      return NextResponse.json(
        { error: 'Le titre du voyage est requis' },
        { status: 400 }
      )
    }

    // Créer un prompt optimisé pour DALL-E
    const prompt = language === 'fr'
      ? `Une belle image de couverture pour un voyage intitulé "${titre}". Style photographique, panoramique, inspirant, lumineux, haute qualité.`
      : `A beautiful cover image for a trip titled "${titre}". Photographic style, panoramic, inspiring, bright, high quality.`

    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: "1792x1024", // Format paysage
      quality: "standard",
    })

    const imageUrl = response.data?.[0]?.url

    if (!imageUrl) {
      throw new Error('Aucune image générée')
    }

    return NextResponse.json({
      success: true,
      imageUrl,
      prompt
    })

  } catch (error: any) {
    console.error('Erreur DALL-E:', error)
    return NextResponse.json(
      {
        error: 'Erreur lors de la génération de l\'image',
        details: error.message
      },
      { status: 500 }
    )
  }
}
