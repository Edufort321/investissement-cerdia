import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function POST(req: NextRequest) {
  const { vision } = await req.json()

  if (!vision) {
    return NextResponse.json({ error: '❌ Vision manquante.' }, { status: 400 })
  }

  const completion = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY ?? ''}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content:
            "Tu es l’IA chef stratégique de Investissement CERDIA. Structure et analyse des visions à long terme, organise les étapes, identifie les leviers d'action, propose des modules IA.",
        },
        { role: 'user', content: vision },
      ],
      temperature: 0.5,
    }),
  })

  const json = await completion.json()
  const result = json.choices?.[0]?.message?.content ?? 'Réponse indisponible.'

  return NextResponse.json({ result })
}
