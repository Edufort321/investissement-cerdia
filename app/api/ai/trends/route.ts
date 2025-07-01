import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const trends = [
      {
        keyword: "IA & Automatisation",
        growth: 85,
        description: "L'intelligence artificielle révolutionne l'e-commerce"
      },
      {
        keyword: "Commerce Social", 
        growth: 67,
        description: "Ventes directes via TikTok et Instagram"
      },
      {
        keyword: "Personnalisation",
        growth: 54,
        description: "Expériences ultra-personnalisées"
      }
    ];
    
    return NextResponse.json({ 
      trends,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}
