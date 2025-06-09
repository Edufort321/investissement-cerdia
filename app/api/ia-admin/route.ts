import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const body = await req.json()
  return NextResponse.json({ result: `✅ Route IA Admin active : ${body.prompt}` })
}

export async function GET() {
  return NextResponse.json({ error: '❌ Méthode GET non autorisée.' }, { status: 405 })
}
