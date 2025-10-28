import { NextRequest, NextResponse } from 'next/server'
import { apiCostTracker } from '@/lib/api-pricing'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const address = searchParams.get('address')

    if (!address) {
      return NextResponse.json(
        { error: 'Address parameter is required' },
        { status: 400 }
      )
    }

    // Utiliser l'API Nominatim d'OpenStreetMap (gratuite, pas de clé requise)
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
      {
        headers: {
          'User-Agent': 'CERDIAVoyageApp/1.0'
        }
      }
    )

    const data = await response.json()

    // 💰 Tracker l'utilisation (gratuit)
    apiCostTracker.trackCall('nominatim')

    if (data && data.length > 0) {
      const result = data[0]
      return NextResponse.json({
        success: true,
        coordinates: {
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon)
        },
        displayName: result.display_name
      })
    } else {
      return NextResponse.json({
        success: false,
        error: 'Location not found'
      }, { status: 404 })
    }

  } catch (error: any) {
    console.error('Geocoding error:', error)
    return NextResponse.json(
      { error: 'Geocoding failed', details: error.message },
      { status: 500 }
    )
  }
}
