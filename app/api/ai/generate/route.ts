import { NextRequest, NextResponse } from 'next/server';
import { generateContent } from '../../../../lib/openai';

export async function POST(request: NextRequest) {
  try {
    const contentRequest = await request.json();
    
    if (!contentRequest.type || !contentRequest.subject) {
      return NextResponse.json(
        { error: 'Type and subject required' }, 
        { status: 400 }
      );
    }

    const content = await generateContent(contentRequest);
    
    return NextResponse.json({ 
      content,
      type: contentRequest.type,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Content Generation API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}
