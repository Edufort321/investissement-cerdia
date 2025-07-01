import { NextRequest, NextResponse } from 'next/server';
import { generateChatResponse } from '../../../../lib/openai';

export async function POST(request: NextRequest) {
  try {
    const { messages, context } = await request.json();
    
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages array required' }, 
        { status: 400 }
      );
    }

    const response = await generateChatResponse(messages, context);
    
    return NextResponse.json({ 
      response,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Chat API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}
