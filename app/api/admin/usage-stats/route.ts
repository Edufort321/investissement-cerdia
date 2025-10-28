import { NextRequest, NextResponse } from 'next/server'
import { apiCostTracker, calculateTripPrice, formatCost } from '@/lib/api-pricing'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const profitMargin = parseFloat(searchParams.get('margin') || '0.5') // 50% par défaut

    const usage = apiCostTracker.getUsageDetails()
    const pricing = calculateTripPrice(usage, profitMargin)

    return NextResponse.json({
      success: true,
      stats: {
        // Détails par API
        usage: usage.map((u) => ({
          api: u.apiName,
          calls: u.calls,
          cost: u.cost,
          costFormatted: formatCost(u.cost),
          inputTokens: u.inputTokens,
          outputTokens: u.outputTokens,
        })),

        // Totaux
        totalCost: pricing.totalCost,
        totalCostFormatted: formatCost(pricing.totalCost),

        // Prix de vente
        profitMargin: profitMargin * 100, // 50% → 50
        sellingPrice: pricing.sellingPrice,
        sellingPriceFormatted: formatCost(pricing.sellingPrice),

        // Profit
        profit: pricing.profit,
        profitFormatted: formatCost(pricing.profit),

        // Timestamp
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error: any) {
    console.error('Erreur stats usage:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Erreur lors de la récupération des stats',
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json()

    if (action === 'reset') {
      apiCostTracker.reset()
      return NextResponse.json({
        success: true,
        message: 'Statistiques réinitialisées',
      })
    }

    return NextResponse.json(
      { error: 'Action non supportée' },
      { status: 400 }
    )
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
