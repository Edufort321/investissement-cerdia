import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface ExchangeRateObservation {
  d: string // date YYYY-MM-DD
  FXUSDCAD: {
    v: string // value
  }
}

interface BankOfCanadaResponse {
  observations: ExchangeRateObservation[]
}

/**
 * API Route pour récupérer le taux de change USD→CAD depuis la Banque du Canada
 *
 * GET /api/exchange-rate?days=30
 *
 * Retourne:
 * {
 *   current: { date: "2025-01-15", rate: 1.3456 },
 *   history: [{ date: "2025-01-15", rate: 1.3456 }, ...]
 * }
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '30')

    // Date de fin: aujourd'hui
    const endDate = new Date()
    // Date de début: X jours avant
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Format YYYY-MM-DD
    const startDateStr = startDate.toISOString().split('T')[0]
    const endDateStr = endDate.toISOString().split('T')[0]

    // Appel à l'API Valet de la Banque du Canada
    // Série FXUSDCAD = taux USD vers CAD
    const apiUrl = `https://www.banqueducanada.ca/valet/observations/FXUSDCAD/json?start_date=${startDateStr}&end_date=${endDateStr}`

    console.log('Fetching exchange rates from Bank of Canada:', apiUrl)

    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'CERDIA Investment Platform'
      },
      // Cache pour 1 heure (les taux sont publiés quotidiennement)
      next: { revalidate: 3600 }
    })

    if (!response.ok) {
      throw new Error(`Bank of Canada API error: ${response.status} ${response.statusText}`)
    }

    const data: BankOfCanadaResponse = await response.json()

    if (!data.observations || data.observations.length === 0) {
      throw new Error('No exchange rate data available')
    }

    // Transformer les données
    const history = data.observations
      .filter(obs => obs.FXUSDCAD && obs.FXUSDCAD.v)
      .map(obs => ({
        date: obs.d,
        rate: parseFloat(obs.FXUSDCAD.v)
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    // Le taux le plus récent
    const current = history[history.length - 1]

    return NextResponse.json({
      current,
      history,
      source: 'Bank of Canada',
      lastUpdated: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error fetching exchange rate:', error)

    // Retourner un taux par défaut en cas d'erreur
    return NextResponse.json(
      {
        current: {
          date: new Date().toISOString().split('T')[0],
          rate: 1.35
        },
        history: [],
        source: 'Fallback (API unavailable)',
        error: error instanceof Error ? error.message : 'Unknown error',
        lastUpdated: new Date().toISOString()
      },
      { status: 200 } // Retourner 200 avec données de fallback
    )
  }
}
