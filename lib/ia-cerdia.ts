import { OpenAIStream, StreamingTextResponse } from '@vercel/ai';
import OpenAI from 'openai';
import { CERDIA_VISION_PROMPT } from '@/lib/ia-cerdia-prompt';

// Création d'une instance OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// Route handler (Next.js 14 avec app router)
export const runtime = 'edge';

export async function POST(req: Request) {
  const { messages } = await req.json();

  // Ajoute le contexte CERDIA à la première requête de l'utilisateur
  const cerdiavision = {
    role: 'system',
    content: CERDIA_VISION_PROMPT,
  };

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    stream: true,
    messages: [cerdiavision, ...messages],
  });

  const stream = OpenAIStream(response);
  return new StreamingTextResponse(stream);
}
