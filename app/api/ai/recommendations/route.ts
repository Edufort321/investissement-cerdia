import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { userProfile, products, context } = await request.json();
    
    // Recommandations de base (fonctionne sans OpenAI)
    const recommendations = products?.slice(0, 5).map((product: any, index: number) => ({
      id: `rec_${index}`,
      title: product.title || `Produit Recommandé ${index + 1}`,
      description: product.description || 'Description du produit',
      url: product.url || '#',
      price: product.price || '$99',
      category: product.category || 'Général',
      score: Math.floor(Math.random() * 30) + 70,
      reason: `Recommandé selon vos préférences`,
      emoji: ['🔥', '⭐', '💎', '🚀', '💫'][index] || '🎯'
    })) || [];
    
    return NextResponse.json({ 
      recommendations,
      count: recommendations.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Recommendations API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}
