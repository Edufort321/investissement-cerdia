import { supabase } from './supabase'

/**
 * Récupère le taux de change USD→CAD le plus récent
 */
export async function getCurrentExchangeRate(from: string = 'USD', to: string = 'CAD'): Promise<number> {
  try {
    // Si même devise, retourner 1
    if (from === to) {
      return 1.0
    }

    // Chercher le taux le plus récent dans la base de données
    const { data, error } = await supabase
      .from('exchange_rates')
      .select('rate')
      .eq('currency_from', from)
      .eq('currency_to', to)
      .order('rate_date', { ascending: false })
      .limit(1)
      .single()

    if (error || !data) {
      console.warn('Aucun taux de change trouvé, utilisation du taux par défaut 1.35')
      return 1.35 // Taux par défaut
    }

    return data.rate
  } catch (error) {
    console.error('Erreur lors de la récupération du taux de change:', error)
    return 1.35 // Taux par défaut en cas d'erreur
  }
}

/**
 * Convertit un montant USD en CAD
 */
export async function convertUSDtoCAD(amountUSD: number): Promise<number> {
  const rate = await getCurrentExchangeRate('USD', 'CAD')
  return amountUSD * rate
}

/**
 * Convertit un montant CAD en USD
 */
export async function convertCADtoUSD(amountCAD: number): Promise<number> {
  const rate = await getCurrentExchangeRate('USD', 'CAD')
  return amountCAD / rate
}

/**
 * Met à jour le taux de change USD→CAD du jour
 * (À appeler quotidiennement via un cron job ou manuellement)
 */
export async function updateExchangeRate(rate: number, source: string = 'manual'): Promise<boolean> {
  try {
    const today = new Date().toISOString().split('T')[0]

    const { error } = await supabase
      .from('exchange_rates')
      .upsert({
        currency_from: 'USD',
        currency_to: 'CAD',
        rate,
        rate_date: today,
        source
      }, {
        onConflict: 'currency_from,currency_to,rate_date'
      })

    if (error) {
      console.error('Erreur lors de la mise à jour du taux de change:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Erreur lors de la mise à jour du taux de change:', error)
    return false
  }
}
