import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { requireAIUser } from '@/lib/auth/ai-guard'

let _openai: OpenAI | null = null
function getOpenAI(): OpenAI {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  return _openai
}
export async function POST(request: NextRequest) {
  try {
    // 🔒 OWASP API4 : auth + quota (Vision coûteux)
    const guard = await requireAIUser(request, 'vision')
    if (guard.error) return guard.error

    const { imageBase64, language = 'fr' } = await request.json()

    if (!imageBase64) {
      return NextResponse.json(
        { error: language === 'fr' ? 'Image requise' : 'Image required' },
        { status: 400 }
      )
    }

    const prompt = language === 'fr'
      ? `Analyse cette photo de facture/reçu et extrait les informations suivantes:

1. Nom du restaurant/commerce
2. Montant total payé (le plus important, le montant final après taxes et pourboires)
3. Devise (si visible, sinon assume CAD)
4. Date de la transaction
5. Catégorie (restaurant, transport, hébergement, activité, autre)
6. Articles/items principaux (liste courte si visible)

Retourne UNIQUEMENT un JSON valide avec ce format exact (pas de markdown, pas de code block):
{
  "nom": "Nom du commerce",
  "montant": nombre_decimal,
  "devise": "CAD|USD|EUR|autre",
  "date": "YYYY-MM-DD",
  "categorie": "restaurant|transport|hebergement|activite|autre",
  "items": ["item1", "item2"],
  "notes": "Notes additionnelles si pertinent"
}

Si tu ne peux pas lire une information, utilise null.`
      : `Analyze this receipt/bill photo and extract the following information:

1. Restaurant/business name
2. Total amount paid (most important, final amount after taxes and tips)
3. Currency (if visible, otherwise assume CAD)
4. Transaction date
5. Category (restaurant, transport, accommodation, activity, other)
6. Main items (short list if visible)

Return ONLY valid JSON with this exact format (no markdown, no code block):
{
  "nom": "Business name",
  "montant": decimal_number,
  "devise": "CAD|USD|EUR|other",
  "date": "YYYY-MM-DD",
  "categorie": "restaurant|transport|accommodation|activity|other",
  "items": ["item1", "item2"],
  "notes": "Additional notes if relevant"
}

If you cannot read information, use null.`

    console.log('📸 Analyse de facture avec OpenAI Vision...')

    const completion = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: language === 'fr'
            ? "Tu es un expert en lecture et analyse de factures. Tu extrais précisément les informations de reçus et factures. Tu réponds UNIQUEMENT en JSON valide."
            : "You are an expert in reading and analyzing receipts. You precisely extract information from receipts and bills. You respond ONLY in valid JSON."
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: prompt
            },
            {
              type: "image_url",
              image_url: {
                url: imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`
              }
            }
          ]
        }
      ],
      temperature: 0.2,
      max_tokens: 1000
    })

    let responseText = completion.choices[0]?.message?.content || ''

    // Nettoyer la réponse
    responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

    console.log('📝 Réponse IA:', responseText.substring(0, 200))

    let receiptData
    try {
      receiptData = JSON.parse(responseText)
    } catch (parseError) {
      console.error('❌ Erreur parsing JSON:', parseError)
      console.error('📄 Contenu reçu:', responseText)
      throw new Error('Format de réponse invalide de l\'IA')
    }

    // Valider les données essentielles
    if (!receiptData.nom && !receiptData.montant) {
      throw new Error('Impossible d\'extraire les informations de la facture')
    }

    console.log('✅ Facture analysée:', {
      nom: receiptData.nom,
      montant: receiptData.montant,
      devise: receiptData.devise
    })

    return NextResponse.json({
      success: true,
      receipt: receiptData
    })

  } catch (error: any) {
    console.error('🔴 Erreur scan facture:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Erreur lors de l\'analyse de la facture',
        details: error.toString()
      },
      { status: 500 }
    )
  }
}
