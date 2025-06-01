'use server'

import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";
import { CERDIA_VISION_PROMPT } from "@/lib/ia-cerdia-prompt";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  const { prompt } = await req.json();

  const contextCheckPrompt = `Voici un message reçu : "${prompt}".
Réponds uniquement si la question est liée à : l'investissement immobilier CERDIA, la fiscalité internationale pour les investisseurs CERDIA, la plateforme CERDIAIA, le commerce électronique CERDIA Commerce, ou le plan d'affaires CERDIA 2025-2045.

Si ce n'est pas en lien avec ces sujets, réponds : "❌ Cette section est réservée exclusivement aux questions en lien avec la vision stratégique de CERDIA."
Sinon, applique le plan suivant :
${CERDIA_VISION_PROMPT}

Réponds de façon structurée, professionnelle et fidèle à la vision.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: CERDIA_VISION_PROMPT },
        { role: "user", content: contextCheckPrompt }
      ],
      temperature: 0.7
    });

    const answer = response.choices[0].message.content;
    return NextResponse.json({ reply: answer });
  } catch (error) {
    return NextResponse.json({ reply: "❌ Une erreur est survenue lors de la communication avec l'IA CERDIA." });
  }
}
