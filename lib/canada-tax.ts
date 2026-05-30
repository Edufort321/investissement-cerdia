/**
 * Taxes de vente canadiennes par province/territoire — source unique de vérité.
 *
 * Modèle « place of supply » : la taxe applicable dépend de la province du CLIENT
 * (lieu de fourniture), pas de celle du vendeur. Utilisé par le module Commerce
 * (facturation) et réutilisable par le module immobilier.
 *
 * Structure : chaque province a une composante FÉDÉRALE (GST/TPS 5 % partout sauf
 * provinces à TVH) et une composante PROVINCIALE (QST, PST, RST) OU une taxe
 * HARMONISÉE (HST/TVH) qui combine les deux en un seul taux.
 *
 * Phase 1 = Canada. La phase 2 (US sales tax par État) viendra dans un fichier
 * séparé `lib/us-tax.ts` sur le même patron.
 *
 * ⚠️ Taux 2025/2026 — à faire valider par un CPA avant production (voir onglet
 * Contrôle CPA). Les taux provinciaux changent dans le temps.
 */

export type ProvinceCode =
  | 'AB' | 'BC' | 'MB' | 'NB' | 'NL' | 'NS' | 'NT' | 'NU' | 'ON' | 'PE' | 'QC' | 'SK' | 'YT'

export interface ProvinceTax {
  code: ProvinceCode
  name: string
  /** Taxe fédérale (GST/TPS). 0 pour les provinces à TVH harmonisée. */
  gst: number
  /** Taxe provinciale (QST/PST/RST) OU TVH harmonisée. */
  provincial: number
  /** Libellé de la composante provinciale, pour l'affichage et les PDF. */
  provincialLabel: 'TVQ' | 'PST' | 'RST' | 'TVH' | 'HST' | null
  /** true si `provincial` représente une taxe HARMONISÉE (HST/TVH) et non une PST séparée. */
  harmonized: boolean
}

/**
 * Taux par province (2025/2026).
 * - QC : TPS 5 % + TVQ 9,975 %
 * - ON : TVH 13 % (harmonisée)
 * - NB, NL, NS, PE : TVH 15 % (NS = 14 % depuis avril 2025)
 * - BC : TPS 5 % + PST 7 %
 * - SK : TPS 5 % + PST 6 %
 * - MB : TPS 5 % + RST 7 %
 * - AB, NT, NU, YT : TPS 5 % seulement (pas de taxe provinciale)
 */
export const CANADA_TAX: Record<ProvinceCode, ProvinceTax> = {
  QC: { code: 'QC', name: 'Québec',                gst: 0.05, provincial: 0.09975, provincialLabel: 'TVQ', harmonized: false },
  ON: { code: 'ON', name: 'Ontario',              gst: 0,    provincial: 0.13,    provincialLabel: 'TVH', harmonized: true  },
  BC: { code: 'BC', name: 'Colombie-Britannique', gst: 0.05, provincial: 0.07,    provincialLabel: 'PST', harmonized: false },
  AB: { code: 'AB', name: 'Alberta',              gst: 0.05, provincial: 0,       provincialLabel: null,  harmonized: false },
  SK: { code: 'SK', name: 'Saskatchewan',         gst: 0.05, provincial: 0.06,    provincialLabel: 'PST', harmonized: false },
  MB: { code: 'MB', name: 'Manitoba',             gst: 0.05, provincial: 0.07,    provincialLabel: 'RST', harmonized: false },
  NB: { code: 'NB', name: 'Nouveau-Brunswick',    gst: 0,    provincial: 0.15,    provincialLabel: 'TVH', harmonized: true  },
  NL: { code: 'NL', name: 'Terre-Neuve-et-Labrador', gst: 0, provincial: 0.15,    provincialLabel: 'TVH', harmonized: true  },
  NS: { code: 'NS', name: 'Nouvelle-Écosse',      gst: 0,    provincial: 0.14,    provincialLabel: 'TVH', harmonized: true  },
  PE: { code: 'PE', name: 'Île-du-Prince-Édouard', gst: 0,   provincial: 0.15,    provincialLabel: 'TVH', harmonized: true  },
  NT: { code: 'NT', name: 'Territoires du Nord-Ouest', gst: 0.05, provincial: 0,  provincialLabel: null,  harmonized: false },
  NU: { code: 'NU', name: 'Nunavut',              gst: 0.05, provincial: 0,       provincialLabel: null,  harmonized: false },
  YT: { code: 'YT', name: 'Yukon',                gst: 0.05, provincial: 0,       provincialLabel: null,  harmonized: false },
}

/** Liste ordonnée pour les menus déroulants (QC et ON en tête — les plus fréquents). */
export const PROVINCE_OPTIONS: ProvinceTax[] = [
  CANADA_TAX.QC, CANADA_TAX.ON, CANADA_TAX.BC, CANADA_TAX.AB, CANADA_TAX.SK,
  CANADA_TAX.MB, CANADA_TAX.NB, CANADA_TAX.NL, CANADA_TAX.NS, CANADA_TAX.PE,
  CANADA_TAX.NT, CANADA_TAX.NU, CANADA_TAX.YT,
]

export interface TaxComputation {
  province: ProvinceCode
  taxableBase: number
  /** Montant de la taxe fédérale (GST/TPS). */
  gstAmount: number
  /** Montant de la taxe provinciale ou harmonisée. */
  provincialAmount: number
  gstRate: number
  provincialRate: number
  provincialLabel: ProvinceTax['provincialLabel']
  harmonized: boolean
}

const round2 = (n: number) => Math.round(n * 100) / 100

/**
 * Calcule les taxes sur une base taxable donnée selon la province du client.
 * Pas de « taxe sur taxe » : GST et provinciale s'appliquent toutes deux à la base.
 *
 * @param taxableBase  Montant taxable (somme des items taxables, hors taxes)
 * @param province     Code province du CLIENT (place of supply)
 * @param opts.applyGst        Permet de désactiver la GST (ex. client exonéré). Défaut true.
 * @param opts.applyProvincial Permet de désactiver la provinciale. Défaut true.
 */
export function computeCanadaTax(
  taxableBase: number,
  province: ProvinceCode,
  opts: { applyGst?: boolean; applyProvincial?: boolean } = {}
): TaxComputation {
  const p = CANADA_TAX[province] ?? CANADA_TAX.QC
  const applyGst = opts.applyGst !== false
  const applyProvincial = opts.applyProvincial !== false
  const base = Math.max(0, Number(taxableBase) || 0)

  return {
    province: p.code,
    taxableBase: round2(base),
    gstAmount: applyGst ? round2(base * p.gst) : 0,
    provincialAmount: applyProvincial ? round2(base * p.provincial) : 0,
    gstRate: p.gst,
    provincialRate: p.provincial,
    provincialLabel: p.provincialLabel,
    harmonized: p.harmonized,
  }
}

/** Libellé court de la taxe fédérale selon la province (TVH masque la GST). */
export function federalTaxLabel(province: ProvinceCode): string {
  return CANADA_TAX[province]?.harmonized ? '' : 'TPS'
}
