import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// BdC Valet API series codes
const BDC_SERIES: Record<string, string> = {
  USD: 'FXUSDCAD',
  EUR: 'FXEURCAD',
  MXN: 'FXMXNCAD',
  GBP: 'FXGBPCAD',
  // DOP not available from BdC — use cross-rate fallback
}

async function fetchBdCRate(currency: string, dateStr: string): Promise<number | null> {
  const series = BDC_SERIES[currency]
  if (!series) return null

  const url = `https://www.banqueducanada.ca/valet/observations/${series}/json?start_date=${dateStr}&end_date=${dateStr}`
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' }, next: { revalidate: 3600 } })
    if (!res.ok) return null
    const data = await res.json()
    const obs = data.observations?.[0]
    const val = obs?.[series]?.v
    return val ? parseFloat(val) : null
  } catch {
    return null
  }
}

async function fetchBdCAnnualAvg(currency: string, year: number): Promise<number | null> {
  const series = BDC_SERIES[currency]
  if (!series) return null

  const url = `https://www.banqueducanada.ca/valet/observations/${series}/json?start_date=${year}-01-01&end_date=${year}-12-31`
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } })
    if (!res.ok) return null
    const data = await res.json()
    const obs: any[] = data.observations || []
    const vals = obs.map((o: any) => parseFloat(o[series]?.v)).filter(v => !isNaN(v))
    if (vals.length === 0) return null
    return vals.reduce((s, v) => s + v, 0) / vals.length
  } catch {
    return null
  }
}

// GET /api/exchange-rate-history?currency=USD&year=2024&type=annual
// GET /api/exchange-rate-history?currency=USD&date=2024-03-15
// GET /api/exchange-rate-history?year=2024&all=true   → all currencies for a year
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const currency = searchParams.get('currency')?.toUpperCase()
  const year = searchParams.get('year') ? parseInt(searchParams.get('year')!) : null
  const date = searchParams.get('date')
  const type = searchParams.get('type') // 'annual' | 'spot'
  const all = searchParams.get('all') === 'true'

  try {
    // Return all annual rates for a year
    if (all && year) {
      const { data } = await supabase
        .from('exchange_rates_annual')
        .select('currency_from, annual_avg_rate, source, notes')
        .eq('year', year)
        .eq('currency_to', 'CAD')
      return NextResponse.json({ year, rates: data || [] })
    }

    if (!currency) return NextResponse.json({ error: 'currency required' }, { status: 400 })

    // Annual average rate
    if (type === 'annual' || (year && !date)) {
      const targetYear = year || new Date().getFullYear()

      // Check DB cache first
      const { data: cached } = await supabase
        .from('exchange_rates_annual')
        .select('annual_avg_rate, source, notes')
        .eq('year', targetYear)
        .eq('currency_from', currency)
        .eq('currency_to', 'CAD')
        .single()

      if (cached) {
        return NextResponse.json({ currency, year: targetYear, rate: cached.annual_avg_rate, source: cached.source, notes: cached.notes, cached: true })
      }

      // Fetch from BdC
      const rate = await fetchBdCAnnualAvg(currency, targetYear)
      if (rate) {
        await supabase.from('exchange_rates_annual').upsert({
          year: targetYear, currency_from: currency, currency_to: 'CAD',
          annual_avg_rate: rate, source: 'bank_of_canada_api'
        }, { onConflict: 'year,currency_from,currency_to' })
        return NextResponse.json({ currency, year: targetYear, rate, source: 'bank_of_canada_api', cached: false })
      }

      return NextResponse.json({ currency, year: targetYear, rate: null, source: 'not_available', cached: false })
    }

    // Spot rate for a specific date
    if (date) {
      // Check DB cache
      const { data: cached } = await supabase
        .from('exchange_rates')
        .select('rate, source')
        .eq('currency_from', currency)
        .eq('currency_to', 'CAD')
        .eq('rate_date', date)
        .single()

      if (cached) {
        return NextResponse.json({ currency, date, rate: cached.rate, source: cached.source, cached: true })
      }

      // Fetch from BdC
      const rate = await fetchBdCRate(currency, date)
      if (rate) {
        await supabase.from('exchange_rates').upsert({
          currency_from: currency, currency_to: 'CAD', rate, rate_date: date, source: 'bank_of_canada_api'
        }, { onConflict: 'currency_from,currency_to,rate_date' })
        return NextResponse.json({ currency, date, rate, source: 'bank_of_canada_api', cached: false })
      }

      // Fallback: nearest date in DB
      const { data: nearest } = await supabase
        .from('exchange_rates')
        .select('rate, rate_date, source')
        .eq('currency_from', currency)
        .eq('currency_to', 'CAD')
        .lte('rate_date', date)
        .order('rate_date', { ascending: false })
        .limit(1)
        .single()

      if (nearest) {
        return NextResponse.json({ currency, date, rate: nearest.rate, source: `nearest_${nearest.rate_date}`, cached: true })
      }

      return NextResponse.json({ currency, date, rate: null, source: 'not_available' })
    }

    return NextResponse.json({ error: 'Provide year or date parameter' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// POST /api/exchange-rate-history — upsert manual rate
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { currency, year, date, rate, notes } = body

    if (!currency || !rate) return NextResponse.json({ error: 'currency and rate required' }, { status: 400 })

    if (year && !date) {
      const { error } = await supabase.from('exchange_rates_annual').upsert({
        year, currency_from: currency.toUpperCase(), currency_to: 'CAD',
        annual_avg_rate: rate, source: 'manual', notes: notes || null
      }, { onConflict: 'year,currency_from,currency_to' })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true, type: 'annual', year, currency, rate })
    }

    if (date) {
      const { error } = await supabase.from('exchange_rates').upsert({
        currency_from: currency.toUpperCase(), currency_to: 'CAD',
        rate, rate_date: date, source: 'manual'
      }, { onConflict: 'currency_from,currency_to,rate_date' })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true, type: 'spot', date, currency, rate })
    }

    return NextResponse.json({ error: 'Provide year or date' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
