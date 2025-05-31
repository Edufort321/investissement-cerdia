import { OpenAIStream, StreamingTextResponse } from 'ai'
import OpenAI from 'openai'
import { CERDIA_VISION_PROMPT } from '@/lib/ia-cerdia-prompt'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export const runtime = 'edge'

export async function POST(req: Request) {
  const { prompt } = await req.json()

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    stream: true,
    messages: [
      { role: 'system', content: CERDIA_VISION_PROMPT },
      { role: 'user', content: prompt }
    ]
  })

  const stream = OpenAIStream(response)
  return new StreamingTextResponse(stream)
}
