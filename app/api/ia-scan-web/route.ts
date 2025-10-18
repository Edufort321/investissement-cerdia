import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { url } = await req.json()

  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'URL invalide' }, { status: 400 })
  }

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo',
        messages: [
          {
            role: 'system',
            content:
              'Tu es une IA stratégique pour CERDIA. Scanne la page suivante et résume ce qu’elle contient, avec un regard sur les opportunités, tendances ou anomalies utiles pour un investisseur.',
          },
          {
            role: 'user',
            content: `Voici l’URL à analyser : ${url}`,
          },
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'browse_web',
              description: 'Outil de navigation web pour consulter des pages en temps réel',
              parameters: {
                url: { type: 'string', description: 'URL complète de la page à analyser' },
              },
            },
          },
        ],
        tool_choice: 'auto',
        temperature: 0.7,
      }),
    })

    const data = await res.json()

    return NextResponse.json({
      result: data?.choices?.[0]?.message?.content ?? 'Aucune réponse générée.',
    })
  } catch (err) {
    console.error('Erreur IA Web:', err)
    return NextResponse.json({ error: 'Erreur lors de l’analyse IA' }, { status: 500 })
  }
}
