import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { prompt } = await req.json()
  return NextResponse.json({
    result: `✅ Route IA Admin active : ${prompt}`,
  })
}

