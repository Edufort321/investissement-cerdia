import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";
import { CERDIA_VISION_PROMPT } from "@/lib/ia-cerdia-prompt";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function POST(req: NextRequest) {
  const { userMessage } = await req.json();

  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      { role: "system", content: CERDIA_VISION_PROMPT },
      { role: "user", content: userMessage }
    ],
    temperature: 0.7
  });

  return NextResponse.json({
    reply: response.choices[0].message.content
  });
}
