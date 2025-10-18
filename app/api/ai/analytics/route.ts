import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const mockAnalytics = {
      currentVisitors: Math.floor(Math.random() * 50) + 10,
      conversionRate: (Math.random() * 5 + 2).toFixed(1),
      todayRevenue: (Math.random() * 1000 + 500).toFixed(0),
      aiScore: Math.floor(Math.random() * 20) + 80,
    };

    return NextResponse.json({
      analytics: mockAnalytics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Analytics API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}
