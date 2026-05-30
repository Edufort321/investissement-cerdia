'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/contexts/LanguageContext'
import { useOrganization } from '@/contexts/OrganizationContext'
import { FileText, Download, Calendar, ExternalLink, Filter, Share2, Info } from 'lucide-react'
import jsPDF from 'jspdf'
import PropertyFiscalPanel from './PropertyFiscalPanel'

interface Transaction {
  id: string
  date: string
  type: string
  amount: number
  description: string
  source_currency?: string
  source_amount?: number
  exchange_rate?: number
  foreign_country?: string
  foreign_tax_paid?: number
  foreign_tax_rate?: number
  estimated_tax_credit?: number
  property_id: string | null
  fiscal_category?: string | null
  vendor_name?: string | null
  accountant_notes?: string | null
  attachment_name?: string | null
  attachment_url?: string | null
  attachment_storage_path?: string | null
}

interface Property {
  id: string
  name: string
  location: string
  total_cost: number
  currency: string
  status?: string
  sale_price?: number
  sale_date?: string
  property_type?: string
  country_code?: string
  state_province?: string
  county_code?: string
  firpta_withholding_amount?: number
  firpta_form_8288_submitted?: boolean
  firpta_withholding_refunded?: boolean
}

interface T1135Data {
  year: number
  totalForeignAssets: number
  properties: Array<{
    name: string
    location: string
    country: string
    cost: number
    currency: string
    costCAD: number
  }>
  foreignIncome: number
  foreignGains: number
}

interface T2209Data {
  year: number
  totalForeignIncome: number
  totalForeignTaxPaid: number
  totalTaxCredit: number
  byCountry: Array<{
    country: string
    income: number
    taxPaid: number
    taxCredit: number
  }>
}

export default function TaxReports() {
  const { t, language } = useLanguage()
  const fr = language === 'fr'
  const { organization } = useOrganization()
  const orgId = organization?.id ?? null
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [activeReport, setActiveReport] = useState<'T1135' | 'T2209' | 'comptable' | 'multi_juridiction' | 'controle_cpa'>('T1135')
  const [generatingCPAReview, setGeneratingCPAReview] = useState(false)
  const [jurisdictionRates, setJurisdictionRates] = useState<any[]>([])
  const [generatingPDF, setGeneratingPDF] = useState(false)
  const [filterPeriod, setFilterPeriod] = useState<string>('annual')
  const [exportingCSV, setExportingCSV] = useState(false)
  const [generatingPackage, setGeneratingPackage] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [shareLabel, setShareLabel] = useState('')
  const [shareExpiry, setShareExpiry] = useState(30)
  const [shareTabs, setShareTabs] = useState<string[]>(['transactions', 'rapports_fiscaux'])
  const [shareLink, setShareLink] = useState('')
  const [generatingShare, setGeneratingShare] = useState(false)
  const [generatingMJPDF, setGeneratingMJPDF] = useState(false)
  // Taux de change annuels (chargés depuis exchange_rates_annual)
  const [annualRates, setAnnualRates] = useState<Map<string, number>>(new Map([
    ['USD_2025', 1.3950], ['USD_2024', 1.3601], ['USD_2023', 1.3497], ['USD_2022', 1.3013],
    ['EUR_2025', 1.5400], ['EUR_2024', 1.4779], ['EUR_2023', 1.4641],
    ['DOP_2025', 0.02380], ['DOP_2024', 0.02320], ['DOP_2023', 0.02440],
    ['MXN_2025', 0.06890], ['MXN_2024', 0.07825], ['MXN_2023', 0.07820],
  ]))
  // T2209 : revenu imposable canadien pour calcul plafond 15%
  const [canadianTaxableIncome, setCanadianTaxableIncome] = useState<number>(0)
  const [fiscalYearSettings, setFiscalYearSettings] = useState<any>(null)
  const [savingFiscalSettings, setSavingFiscalSettings] = useState(false)
  // CCA persistence
  const [savingCCA, setSavingCCA] = useState(false)
  // T2209 carryback UI
  const [t2209CarrybackYear, setT2209CarrybackYear] = useState<number>(0)
  const [t2209CarrybackAmount, setT2209CarrybackAmount] = useState<number>(0)
  const [t1AdjSubmitted, setT1AdjSubmitted] = useState(false)
  const [t1AdjDate, setT1AdjDate] = useState('')
  const [t1AdjRef, setT1AdjRef] = useState('')
  const [savingCarryback, setSavingCarryback] = useState(false)
  const [savingT2209History, setSavingT2209History] = useState(false)

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)

  // Filter transactions by selected period (all computations use this)
  const filteredTransactions = useMemo(() => {
    if (filterPeriod === 'annual') return transactions
    if (filterPeriod.startsWith('Q')) {
      const q = parseInt(filterPeriod[1])
      const months = [(q - 1) * 3 + 1, (q - 1) * 3 + 2, (q - 1) * 3 + 3]
      return transactions.filter(t => months.includes(new Date(t.date).getMonth() + 1))
    }
    if (filterPeriod.startsWith('M')) {
      const m = parseInt(filterPeriod.slice(1))
      return transactions.filter(t => new Date(t.date).getMonth() + 1 === m)
    }
    return transactions
  }, [transactions, filterPeriod])

  const MONTH_NAMES_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
  const MONTH_NAMES_EN = ['January','February','March','April','May','June','July','August','September','October','November','December']

  useEffect(() => {
    if (orgId) fetchData()
  }, [selectedYear, orgId])

  useEffect(() => {
    if ((activeReport === 'comptable' || activeReport === 'multi_juridiction') && orgId) fetchData()
  }, [activeReport])

  useEffect(() => {
    if (activeReport === 'multi_juridiction' && orgId) {
      supabase
        .from('tax_jurisdiction_rates')
        .select('country_code,jurisdiction_code,jurisdiction_name,filing_deadline_note,jurisdiction_level')
        .or(`organization_id.is.null,organization_id.eq.${orgId}`)
        .eq('jurisdiction_level', 'federal')
        .order('country_code')
        .then(({ data }) => setJurisdictionRates(data || []))
    }
  }, [activeReport, orgId])

  const fetchData = async () => {
    if (!orgId) return
    try {
      setLoading(true)

      const startDate = `${selectedYear}-01-01`
      const endDate = `${selectedYear}-12-31`

      const [transResult, propResult, ratesResult, fiscalResult] = await Promise.all([
        supabase.from('transactions').select('*').eq('organization_id', orgId)
          .gte('date', startDate).lte('date', endDate).order('date', { ascending: true }),
        supabase.from('properties').select('*').eq('organization_id', orgId),
        supabase.from('exchange_rates_annual').select('currency_from, annual_avg_rate')
          .eq('currency_to', 'CAD').in('year', [selectedYear, selectedYear - 1, selectedYear - 2]),
        supabase.from('fiscal_year_settings').select('*')
          .eq('organization_id', orgId).eq('fiscal_year', selectedYear).maybeSingle(),
      ])

      if (transResult.error) throw transResult.error
      if (propResult.error) throw propResult.error

      setTransactions(transResult.data || [])
      setProperties(propResult.data || [])

      // Mettre à jour le cache des taux de change avec les données DB
      if (ratesResult.data && ratesResult.data.length > 0) {
        setAnnualRates(prev => {
          const next = new Map(prev)
          ratesResult.data!.forEach((r: any) => {
            next.set(`${r.currency_from}_${selectedYear}`, r.annual_avg_rate)
          })
          return next
        })
      }

      // Paramètres fiscaux de l'année
      if (fiscalResult.data) {
        setFiscalYearSettings(fiscalResult.data)
        setCanadianTaxableIncome(fiscalResult.data.canadian_taxable_income || 0)
        setT2209CarrybackYear(fiscalResult.data.t2209_carryback_year || 0)
        setT2209CarrybackAmount(fiscalResult.data.t2209_carryback_amount || 0)
        setT1AdjSubmitted(fiscalResult.data.t1_adj_submitted || false)
        setT1AdjDate(fiscalResult.data.t1_adj_submission_date || '')
        setT1AdjRef(fiscalResult.data.t1_adj_reference || '')
      } else {
        setFiscalYearSettings(null)
        setCanadianTaxableIncome(0)
        setT2209CarrybackYear(0)
        setT2209CarrybackAmount(0)
        setT1AdjSubmitted(false)
        setT1AdjDate('')
        setT1AdjRef('')
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateT1135Data = (): T1135Data => {
    const foreignProperties = properties.filter(p => p.currency && p.currency !== 'CAD')

    // CRA exige juste valeur marchande — on utilise current_market_value_cad si dispo, sinon coût achat
    const totalForeignAssets = foreignProperties.reduce((sum, prop) => {
      const p = prop as any
      const valueCAD = p.current_market_value_cad ?? (prop.total_cost * getExchangeRate(prop.currency))
      return sum + valueCAD
    }, 0)

    const foreignIncome = filteredTransactions
      .filter(t => t.source_currency && t.source_currency !== 'CAD' &&
        ['rental_income', 'dividend_income', 'interest_income', 'other_income'].includes(t.fiscal_category || t.type))
      .reduce((sum, t) => sum + (t.amount || 0), 0)

    // Gains en capital sur ventes de propriétés étrangères
    const foreignGains = filteredTransactions
      .filter((t: any) => t.fiscal_category === 'property_sale_foreign' && t.tax_country && t.tax_country !== 'CA')
      .reduce((sum, t) => sum + Math.max(0, t.amount || 0), 0)

    return {
      year: selectedYear,
      totalForeignAssets,
      properties: foreignProperties.map(p => {
        const pa = p as any
        const valueCAD = pa.current_market_value_cad ?? (p.total_cost * getExchangeRate(p.currency))
        return {
          name: p.name,
          location: p.location,
          country: extractCountry(p.location),
          cost: p.total_cost,
          currency: p.currency,
          costCAD: valueCAD,
          hasValuation: !!pa.current_market_value_cad,
          valuationDate: pa.valuation_date ?? null,
          t1135Category: pa.t1135_category ?? '5',
        }
      }),
      foreignIncome,
      foreignGains,
    }
  }

  const calculateFIRPTAData = () => {
    // FIRPTA s'applique à la VENTE de biens immobiliers US par des non-résidents
    const soldUSProperties = properties.filter(p =>
      p.status === 'vendu' &&
      (p.country_code === 'US' || p.currency === 'USD') &&
      p.sale_price && p.sale_price > 0
    )
    return soldUSProperties.map(p => {
      const salePrice = p.sale_price || 0
      const salePriceCAD = salePrice * getExchangeRate(p.currency || 'USD')
      const withholdingPct = 15
      const withholdingAmountUSD = p.firpta_withholding_amount ?? (salePrice * withholdingPct / 100)
      const withholdingAmountCAD = withholdingAmountUSD * getExchangeRate(p.currency || 'USD')
      const saleYear = p.sale_date ? new Date(p.sale_date).getFullYear() : null
      const form8288Deadline = p.sale_date ? (() => {
        const d = new Date(p.sale_date)
        d.setDate(d.getDate() + 20)
        return d.toISOString().split('T')[0]
      })() : null
      return {
        propertyName: p.name,
        saleDate: p.sale_date || null,
        saleYear,
        salePriceUSD: salePrice,
        salePriceCAD,
        withholdingAmountUSD,
        withholdingAmountCAD,
        form8288Deadline,
        form8288Submitted: p.firpta_form_8288_submitted ?? false,
        withholdingRefunded: p.firpta_withholding_refunded ?? false,
        stateProvince: p.state_province || null,
      }
    })
  }

  const calculateCCAData = () => {
    const CCA_RATES: Record<string, number> = {
      Class1: 0.04, Class8: 0.20, Class13: 0.20,
      US_Res: 0.03636, US_Com: 0.02564,
    }
    const CCA_LABELS: Record<string, string> = {
      Class1: 'Classe 1 (4% — Bâtiment résidentiel)',
      Class8: 'Classe 8 (20% — Mobilier/Ameublement)',
      Class13: 'Classe 13 (20% — Améliorations locatives)',
      US_Res: '27,5 ans (3,636%/an — Résidentiel USA)',
      US_Com: '39 ans (2,564%/an — Commercial USA)',
    }
    const LAND_PCT = 0.20 // 20% terrain par défaut

    return properties.filter(p => {
      // CCA applicable : propriétés actives (pas terrain seul, pas vendu)
      const pa = p as any
      return p.status !== 'vendu' && p.status !== 'en_vente' && pa.property_type !== 'terrain'
    }).map(p => {
      const pa = p as any
      const ccaClass = pa.cca_class || (pa.country_code === 'US' ? 'US_Res' : 'Class1')
      const rate = CCA_RATES[ccaClass] ?? 0.04
      const acqYear = pa.reservation_date
        ? new Date(pa.reservation_date).getFullYear()
        : selectedYear - 1
      const buildingCost = p.total_cost * (1 - LAND_PCT) * getExchangeRate(p.currency)
      // Calcul UCC approximatif (declining balance depuis l'année d'acquisition)
      let ucc = buildingCost
      for (let y = acqYear; y < selectedYear; y++) {
        const deduct = y === acqYear ? ucc * rate * 0.5 : ucc * rate
        ucc = Math.max(0, ucc - deduct)
      }
      const uccOpen = ucc
      const isFirstYear = acqYear === selectedYear
      const ccaThisYear = Math.min(uccOpen, uccOpen * rate * (isFirstYear ? 0.5 : 1))
      const uccClose = uccOpen - ccaThisYear
      return {
        propertyName: p.name,
        location: p.location,
        propertyType: pa.property_type || 'condo',
        countryCode: pa.country_code || 'CA',
        ccaClass,
        ccaLabel: CCA_LABELS[ccaClass] || ccaClass,
        acquisitionYear: acqYear,
        buildingCost,
        landCost: p.total_cost * LAND_PCT * getExchangeRate(p.currency),
        uccOpen,
        ccaThisYear,
        uccClose,
        isFirstYear,
        hasCcaClass: !!pa.cca_class,
      }
    }).filter(d => d.buildingCost > 0)
  }

  const saveFiscalYearSettings = async () => {
    if (!orgId) return
    setSavingFiscalSettings(true)
    try {
      await supabase.from('fiscal_year_settings').upsert({
        organization_id: orgId,
        fiscal_year: selectedYear,
        canadian_taxable_income: canadianTaxableIncome || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'organization_id,fiscal_year' })
    } finally {
      setSavingFiscalSettings(false)
    }
  }

  const saveCCAToDb = async () => {
    if (!orgId) return
    setSavingCCA(true)
    try {
      const rows = calculateCCAData()
      for (const d of rows) {
        const prop = properties.find(p => p.name === d.propertyName)
        if (!prop) continue
        await supabase.from('cca_schedule').upsert({
          organization_id: orgId,
          property_id: prop.id,
          fiscal_year: selectedYear,
          cca_class: d.ccaClass,
          cca_rate: (() => {
            const r: Record<string, number> = { Class1: 0.04, Class8: 0.20, Class13: 0.20, US_Res: 0.03636, US_Com: 0.02564 }
            return r[d.ccaClass] ?? 0.04
          })(),
          ucc_open: Math.round(d.uccOpen * 100) / 100,
          additions: 0,
          disposals: 0,
          half_year_rule_applied: d.isFirstYear,
          cca_deducted: Math.round(d.ccaThisYear * 100) / 100,
          ucc_close: Math.round(d.uccClose * 100) / 100,
          land_allocation_pct: 20,
          building_cost: Math.round(d.buildingCost * 100) / 100,
          source: 'calculated',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'property_id,fiscal_year,cca_class' })
      }
      alert(`✅ CCA ${selectedYear} sauvegardée pour ${rows.length} propriété(s)`)
    } catch (err: any) {
      alert('Erreur: ' + err.message)
    } finally {
      setSavingCCA(false)
    }
  }

  const saveT2209Carryback = async () => {
    if (!orgId || !t2209CarrybackYear || !t2209CarrybackAmount) return
    setSavingCarryback(true)
    try {
      const d = t2209Data as any
      await supabase.from('fiscal_year_settings').upsert({
        organization_id: orgId,
        fiscal_year: selectedYear,
        canadian_taxable_income: canadianTaxableIncome || null,
        t2209_credit_eligible: d.usableCredit ?? 0,
        t2209_credit_used: d.usableCredit ?? 0,
        t2209_carryforward_remaining: d.carryforward ?? 0,
        t2209_carryback_year: t2209CarrybackYear || null,
        t2209_carryback_amount: t2209CarrybackAmount || null,
        t1_adj_submitted: t1AdjSubmitted,
        t1_adj_submission_date: t1AdjDate || null,
        t1_adj_reference: t1AdjRef || null,
        filing_status: t1AdjSubmitted ? 'filed' : 'draft',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'organization_id,fiscal_year' })
      setFiscalYearSettings((prev: any) => ({
        ...prev,
        t2209_carryback_year: t2209CarrybackYear,
        t2209_carryback_amount: t2209CarrybackAmount,
        t1_adj_submitted: t1AdjSubmitted,
        t1_adj_submission_date: t1AdjDate || null,
        t1_adj_reference: t1AdjRef || null,
      }))
      alert('✅ Carryback T2209 sauvegardé')
    } catch (err: any) {
      alert('Erreur: ' + err.message)
    } finally {
      setSavingCarryback(false)
    }
  }

  const saveT2209ToHistory = async () => {
    if (!orgId) return
    setSavingT2209History(true)
    try {
      const d = t2209Data as any
      const breakdownJson = (t2209Data.byCountry || []).map((c: any) => ({
        country: c.country,
        income_cad: c.income,
        tax_paid: c.taxPaid,
        tax_credit: c.taxCredit,
      }))
      await supabase.from('foreign_tax_credit_history').upsert({
        organization_id: orgId,
        fiscal_year: selectedYear,
        foreign_income_cad: t2209Data.totalForeignIncome ?? 0,
        foreign_tax_paid_cad: t2209Data.totalForeignTaxPaid ?? 0,
        t2209_credit_eligible: d.usableCredit ?? 0,
        t2209_credit_used: d.usableCredit ?? 0,
        t2209_credit_unused: d.carryforward ?? 0,
        carryforward_remaining: d.carryforward ?? 0,
        breakdown_by_country: breakdownJson.length > 0 ? breakdownJson : null,
        source: 'calculated',
        filing_status: t1AdjSubmitted ? 'filed' : 'draft',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'organization_id,fiscal_year' })
      alert(`✅ Historique T2209 ${selectedYear} sauvegardé`)
    } catch (err: any) {
      alert('Erreur: ' + err.message)
    } finally {
      setSavingT2209History(false)
    }
  }

  const calculateT2209Data = (): T2209Data => {
    // Group transactions by foreign country (using tax_country or source_country)
    const byCountry = new Map<string, { income: number; taxPaid: number; taxCredit: number }>()

    filteredTransactions
      .filter(t => ((t as any).tax_country || (t as any).source_country) && (t.foreign_tax_paid || 0) > 0)
      .forEach(t => {
        const countryCode = (t as any).tax_country as string | undefined
        const country = countryCode
          ? ({ CA: 'Canada', US: 'États-Unis', DO: 'Rép. Dominicaine', MX: 'Mexique' }[countryCode] || countryCode)
          : ((t as any).source_country || 'Inconnu')
        const existing = byCountry.get(country) || { income: 0, taxPaid: 0, taxCredit: 0 }

        byCountry.set(country, {
          income: existing.income + (t.source_amount || t.amount),
          taxPaid: existing.taxPaid + (t.foreign_tax_paid || 0),
          taxCredit: existing.taxCredit + ((t as any).tax_credit_claimable || t.foreign_tax_paid || 0)
        })
      })

    const byCountryArray = Array.from(byCountry.entries()).map(([country, data]) => ({
      country,
      ...data
    }))

    const totalForeignIncome = byCountryArray.reduce((sum, c) => sum + c.income, 0)
    const totalForeignTaxPaid = byCountryArray.reduce((sum, c) => sum + c.taxPaid, 0)
    const totalTaxCredit = byCountryArray.reduce((sum, c) => sum + c.taxCredit, 0)

    // Plafond 15% ARC pour revenus de biens (loyers passifs)
    // Crédit = MIN(impôt étranger payé, 15% × revenu net étranger)
    const plafond15 = canadianTaxableIncome > 0 ? canadianTaxableIncome * 0.15 : null
    const usableCredit = plafond15 !== null ? Math.min(totalTaxCredit, plafond15) : totalTaxCredit
    const carryforward = plafond15 !== null ? Math.max(0, totalTaxCredit - plafond15) : 0
    const priorCarryforward = fiscalYearSettings?.t2209_carryforward_from_prior || 0

    return {
      year: selectedYear,
      totalForeignIncome,
      totalForeignTaxPaid,
      totalTaxCredit,
      byCountry: byCountryArray,
      // Extended fields
      plafond15,
      usableCredit,
      carryforward,
      priorCarryforward,
      netUsableCredit: Math.min(usableCredit + priorCarryforward, plafond15 ?? usableCredit + priorCarryforward),
    } as any
  }

  const COUNTRY_DISPLAY: Record<string, { name: string; flag: string }> = {
    CA: { name: 'Canada', flag: '🇨🇦' },
    US: { name: 'États-Unis', flag: '🇺🇸' },
    DO: { name: 'Rép. Dominicaine', flag: '🇩🇴' },
    MX: { name: 'Mexique', flag: '🇲🇽' },
    OTHER: { name: 'Autre', flag: '🌐' },
  }

  const calculateMultiJurisdictionData = () => {
    // Revenue transactions with a tax jurisdiction
    // On utilise tax_country si défini, sinon on tente de dériver depuis la propriété liée
    const resolveCountry = (t: any): string | null => {
      if (t.tax_country) return t.tax_country as string
      if (t.property_id) {
        const prop = properties.find(p => p.id === t.property_id) as any
        if (prop?.country_code && prop.country_code !== 'CA') return prop.country_code
        // Inférer depuis la devise source
        if (t.source_currency === 'USD') return 'US'
        if (t.source_currency === 'DOP') return 'DO'
        if (t.source_currency === 'MXN') return 'MX'
      }
      return null
    }

    const revenueByCountry = new Map<string, {
      transactionCount: number
      totalSalesTax: number
      totalStateTax: number
      totalFederalWithholding: number
      totalGross: number
      alreadyWithheld: number  // foreign_tax_paid on revenue transactions (withheld by payer)
      itbisEstimated: number   // ITBIS DR estimé (location court terme)
      tdtEstimated: number     // TDT Florida estimé
      irnrEstimated: number    // IRNR RD 27% non-résidents (revenus locatifs)
    }>()

    filteredTransactions.forEach((t: any) => {
      const key = resolveCountry(t)
      if (!key) return
      const cur = revenueByCountry.get(key) || {
        transactionCount: 0, totalSalesTax: 0, totalStateTax: 0, totalFederalWithholding: 0,
        totalGross: 0, alreadyWithheld: 0, itbisEstimated: 0, tdtEstimated: 0, irnrEstimated: 0,
      }
      // ITBIS DR (18%) : locations touristiques DR — court terme (≤30 j) OU meublées
      // (ITBIS frappe le locatif meublé/touristique en RD, pas seulement le court terme).
      // La valeur saisie en transaction (sales_tax_amount) prime sur l'estimation.
      const isRentalIncome = ['loyer', 'loyer_locatif', 'revenu'].includes(t.type)
      const durDays: number = t.rental_duration_days ?? 0
      const itbisApplies = key === 'DO' && isRentalIncome && !(t.is_confotur)
        && ((durDays > 0 && durDays <= 30) || t.is_furnished === true)
      const itbisSaved = Number(t.sales_tax_amount)
      const itbisEstimate = !itbisApplies ? 0
        : (Number.isFinite(itbisSaved) && itbisSaved > 0 ? itbisSaved : (Number(t.amount) || 0) * 0.18)
      // IRNR RD 27% (non-résidents, revenus locatifs, court et long terme).
      // Le montant saisi (irnr_amount) prime ; sinon estimation au taux saisi (irnr_rate) ou 27%.
      const irnrApplies = key === 'DO' && isRentalIncome && !(t.is_confotur) && (Number(t.foreign_tax_paid) || 0) === 0
      const irnrSaved = Number(t.irnr_amount)
      const irnrRate = Number.isFinite(Number(t.irnr_rate)) && Number(t.irnr_rate) > 0 ? Number(t.irnr_rate) / 100 : 0.27
      const irnrEstimate = !irnrApplies ? 0
        : (Number.isFinite(irnrSaved) && irnrSaved > 0 ? irnrSaved : (Number(t.amount) || 0) * irnrRate)
      // TDT Florida : montant saisi (county_tdt_amount) prime ; sinon taux saisi
      // (county_tdt_rate) ou table de référence par comté.
      const prop = t.property_id ? (properties.find(p => p.id === t.property_id) as any) : null
      const countyCode = prop?.county_code ?? null
      const FL_TDT: Record<string, number> = {
        'FL-MIAMI': 0.06, 'FL-BROWARD': 0.05, 'FL-ORANGE': 0.06, 'FL-OSCEOLA': 0.06,
        'FL-PINELLAS': 0.06, 'FL-HILLSBOROUGH': 0.05, 'FL-COLLIER': 0.05, 'FL-KEYS': 0.05,
      }
      const tdtApplies = key === 'US' && isRentalIncome && durDays > 0 && durDays <= 182
      const tdtSaved = Number(t.county_tdt_amount)
      const tdtRate = Number.isFinite(Number(t.county_tdt_rate)) && Number(t.county_tdt_rate) > 0
        ? Number(t.county_tdt_rate) / 100
        : (countyCode && FL_TDT[countyCode] ? FL_TDT[countyCode] : 0)
      const tdtEstimate = !tdtApplies ? 0
        : (Number.isFinite(tdtSaved) && tdtSaved > 0 ? tdtSaved : (Number(t.amount) || 0) * tdtRate)
      // Mexique : IVA 16% (locations meublées) → colonne Taxe vente/TVA ;
      // ISR 25% retenue non-résident → colonne Retenue NR. Valeur saisie prime.
      const isMXrental = key === 'MX' && isRentalIncome
      const ivaEstimate = (isMXrental && t.is_furnished === true) ? (Number(t.amount) || 0) * 0.16 : 0
      const isrEstimate = (isMXrental && (Number(t.foreign_tax_paid) || 0) === 0) ? (Number(t.amount) || 0) * 0.25 : 0
      // Contribution finale : valeur saisie (sales_tax_amount / federal_withholding) si > 0,
      // sinon estimation Mexique (0 pour les autres pays → comportement inchangé).
      const savedSalesTax = Number(t.sales_tax_amount) || 0
      const salesTaxContribution = savedSalesTax > 0 ? savedSalesTax : ivaEstimate
      const savedFedWithholding = Number(t.federal_withholding) || 0
      const fedWithholdingContribution = savedFedWithholding > 0 ? savedFedWithholding : isrEstimate

      revenueByCountry.set(key, {
        transactionCount: cur.transactionCount + 1,
        totalSalesTax: cur.totalSalesTax + salesTaxContribution,
        totalStateTax: cur.totalStateTax + (Number(t.state_income_tax_amt) || 0),
        totalFederalWithholding: cur.totalFederalWithholding + fedWithholdingContribution,
        totalGross: cur.totalGross + (Number(t.amount) || 0),
        alreadyWithheld: cur.alreadyWithheld + (Number(t.foreign_tax_paid) || 0),
        itbisEstimated: cur.itbisEstimated + itbisEstimate,
        tdtEstimated: cur.tdtEstimated + tdtEstimate,
        irnrEstimated: cur.irnrEstimated + irnrEstimate,
      })
    })

    // Tax remittance expense transactions per country
    const remittedByCountry = new Map<string, number>()
    filteredTransactions.forEach((t: any) => {
      if (!t.tax_country) return
      if (!TAX_REMITTANCE_CATS.includes(t.fiscal_category)) return
      const key = t.tax_country as string
      remittedByCountry.set(key, (remittedByCountry.get(key) || 0) + (Number(t.amount) || 0))
    })

    const rows = Array.from(revenueByCountry.entries()).map(([code, data]) => {
      // Inclure ITBIS, TDT et IRNR dans le total estimé
      const totalTaxEstimated = data.totalSalesTax + data.totalStateTax + data.totalFederalWithholding
        + data.itbisEstimated + data.tdtEstimated + data.irnrEstimated
      const alreadyRemitted = remittedByCountry.get(code) || 0
      const netOwing = Math.max(0, totalTaxEstimated - data.alreadyWithheld - alreadyRemitted)
      const status: 'ok' | 'partial' | 'owing' =
        netOwing === 0 ? 'ok' : netOwing < totalTaxEstimated * 0.5 ? 'partial' : 'owing'
      return {
        country_code: code,
        ...(COUNTRY_DISPLAY[code] || { name: code, flag: '🌐' }),
        ...data,
        totalTax: totalTaxEstimated,
        alreadyRemitted,
        netOwing,
        status,
        filingDeadline: jurisdictionRates.find(r => r.country_code === code)?.filing_deadline_note || null,
        irnrEstimated: data.irnrEstimated,
      }
    }).sort((a, b) => b.netOwing - a.netOwing)

    const uncovered = filteredTransactions.filter((t: any) =>
      t.source_currency && t.source_currency !== 'CAD' && !t.tax_country
    )

    return {
      rows,
      totalSalesTax: rows.reduce((s, r) => s + r.totalSalesTax, 0),
      totalStateTax: rows.reduce((s, r) => s + r.totalStateTax, 0),
      totalFederalWithholding: rows.reduce((s, r) => s + r.totalFederalWithholding, 0),
      totalTax: rows.reduce((s, r) => s + r.totalTax, 0),
      totalAlreadyWithheld: rows.reduce((s, r) => s + r.alreadyWithheld, 0),
      totalAlreadyRemitted: rows.reduce((s, r) => s + r.alreadyRemitted, 0),
      totalNetOwing: rows.reduce((s, r) => s + r.netOwing, 0),
      uncovered,
    }
  }

  // Taux annuel moyen officiel BdC — utilise le cache chargé depuis DB
  const getExchangeRate = (from: string, _to: string = 'CAD', year?: number): number => {
    if (from === 'CAD') return 1.0
    const y = year ?? selectedYear
    return annualRates.get(`${from}_${y}`)
      ?? annualRates.get(`${from}_${y - 1}`)
      ?? ({ USD: 1.36, EUR: 1.48, DOP: 0.023, MXN: 0.078 } as Record<string, number>)[from]
      ?? 1.0
  }

  const extractCountry = (location: string): string => {
    // Extract country from location string (e.g., "Marrakech, Maroc" -> "Maroc")
    const parts = location.split(',')
    return parts.length > 1 ? parts[parts.length - 1].trim() : location
  }

  const formatCurrency = (amount: number, currency: string = 'CAD'): string => {
    return new Intl.NumberFormat(language === 'fr' ? 'fr-CA' : 'en-CA', {
      style: 'currency',
      currency: currency
    }).format(amount)
  }

  const getPeriodLabel = (): string => {
    if (filterPeriod === 'annual') return fr ? `Année ${selectedYear}` : `Year ${selectedYear}`
    if (filterPeriod.startsWith('Q')) return `T${filterPeriod[1]} ${selectedYear}`
    if (filterPeriod.startsWith('M')) {
      const m = parseInt(filterPeriod.slice(1)) - 1
      return `${fr ? MONTH_NAMES_FR[m] : MONTH_NAMES_EN[m]} ${selectedYear}`
    }
    return String(selectedYear)
  }

  const exportToCSV = () => {
    setExportingCSV(true)
    try {
      const COUNTRY_NAMES: Record<string, string> = { CA: 'Canada', US: 'États-Unis', DO: 'Rép. Dominicaine', MX: 'Mexique' }
      const headers = [
        'Date', 'Type', 'Description', 'Montant CAD', 'Devise source', 'Montant source',
        'Taux de change', 'Frais bancaires', 'Pays fiscal', 'Catégorie fiscale',
        'Impôt étranger payé', 'Taux impôt %', 'Crédit impôt réclamable',
        'Taxe vente calculée', 'Impôt État/Province calculé', 'Retenue fédérale NR calculée',
        'Type location', 'Statut fiscal propriétaire', 'Meublé', 'Confotur',
        'Vendeur/Compagnie', 'Notes comptable', 'Pièce jointe'
      ]
      const rows = filteredTransactions.map((t: any) => [
        t.date, t.type, `"${(t.description || '').replace(/"/g, '""')}"`,
        t.amount, t.source_currency || 'CAD', t.source_amount || '',
        t.exchange_rate || 1, t.bank_fees || 0,
        COUNTRY_NAMES[t.tax_country] || t.source_country || '',
        t.fiscal_category || '',
        t.foreign_tax_paid || 0, t.foreign_tax_rate || 0, t.tax_credit_claimable || 0,
        t.sales_tax_amount || 0, t.state_income_tax_amt || 0, t.federal_withholding || 0,
        t.rental_type || '', t.owner_fiscal_status || '',
        t.is_furnished ? 'Oui' : '', t.is_confotur ? 'Oui' : '',
        `"${(t.vendor_name || '').replace(/"/g, '""')}"`,
        `"${(t.accountant_notes || '').replace(/"/g, '""')}"`,
        t.attachment_name || ''
      ])
      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
      const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `CERDIA_transactions_${selectedYear}_${filterPeriod}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExportingCSV(false)
    }
  }

  const generateShareLink = async () => {
    if (!orgId) return
    setGeneratingShare(true)
    try {
      const res = await fetch('/api/accountant-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization_id: orgId,
          label: shareLabel || `Rapport ${selectedYear} — ${new Date().toLocaleDateString('fr-CA')}`,
          tabs: shareTabs,
          selected_year: selectedYear,
          filter_period: filterPeriod,
          expires_days: shareExpiry,
        })
      })
      const data = await res.json()
      if (data.token) {
        const url = `${window.location.origin}/share/comptable?t=${data.token}`
        setShareLink(url)
      }
    } finally {
      setGeneratingShare(false)
    }
  }

  // ── Contrôle CPA : construit la liste des points à faire valider ──────────
  // Combine des limites STRUCTURELLES connues (toujours présentes) + des points
  // contextuels selon les juridictions réellement présentes dans les données.
  type CPAItem = { severity: 'action' | 'limite' | 'info'; title: string; detail: string; question?: string }
  const buildCPAReviewItems = (): CPAItem[] => {
    const mj = calculateMultiJurisdictionData()
    const countries = new Set(mj.rows.map(r => r.country_code))
    const items: CPAItem[] = []

    // 1) Nature de l'outil — toujours
    items.push({
      severity: 'limite',
      title: fr ? 'Montants = estimations de planification, pas des déclarations' : 'Amounts = planning estimates, not filings',
      detail: fr
        ? 'L\'app calcule des montants indicatifs (retenues, taxes de vente, crédits). Les déductions, arrondis et cas particuliers d\'une déclaration officielle ne sont pas tous reproduits.'
        : 'The app computes indicative amounts. Deductions, rounding and edge cases of an official filing are not all reproduced.',
    })

    // 2) Taux à confirmer à la date de déclaration — toujours
    items.push({
      severity: 'action',
      title: fr ? 'Confirmer les taux fiscaux à la date de déclaration' : 'Confirm tax rates as of filing date',
      detail: fr
        ? 'Taux préchargés : IRNR RD 27 %, ITBIS RD 18 %, FIRPTA US 15 %, retenue fédérale US 30 %, TDT Floride 5-6 %/comté, plafond T2209 15 %, seuil T1135 100 000 $ CAD. À valider (ils changent dans le temps).'
        : 'Preloaded rates must be validated (they change over time).',
      question: fr ? 'Ces taux sont-ils à jour pour l\'année visée ?' : 'Are these rates current for the target year?',
    })

    // 3) T1135 — si actifs étrangers
    const t1135 = calculateT1135Data()
    if (t1135.totalForeignAssets > 0) {
      items.push({
        severity: t1135.totalForeignAssets > 100000 ? 'action' : 'info',
        title: `T1135 — ${fr ? 'Avoirs étrangers' : 'Foreign assets'} : ${formatCurrency(t1135.totalForeignAssets)}`,
        detail: t1135.totalForeignAssets > 100000
          ? (fr ? 'Seuil de 100 000 $ CAD dépassé → déclaration T1135 OBLIGATOIRE. Méthode détaillée si ≥ 250 000 $.' : 'Over $100K CAD → T1135 REQUIRED.')
          : (fr ? 'Sous le seuil de 100 000 $ — pas d\'obligation T1135 cette année, à reconfirmer.' : 'Under $100K — no T1135 obligation, to reconfirm.'),
        question: fr ? 'La juste valeur marchande des biens étrangers est-elle à jour au 31 déc. ?' : 'Is foreign FMV current as of Dec 31?',
      })
    }

    // 4) Confotur — si DR
    if (countries.has('DO')) {
      items.push({
        severity: 'action',
        title: fr ? '🇩🇴 Confotur (RD) — exonération à confirmer' : '🇩🇴 Confotur (DR) — exemption to confirm',
        detail: fr
          ? 'Les transactions RD marquées Confotur sont exonérées d\'IRNR/ITBIS dans l\'estimation. Valider la certification (Loi 158-01) et sa durée (10-15 ans).'
          : 'DR transactions flagged Confotur are exempted in the estimate. Validate certification and duration.',
        question: fr ? 'La certification Confotur est-elle valide et non expirée ?' : 'Is Confotur certification valid and not expired?',
      })
      items.push({
        severity: 'limite',
        title: fr ? '🇩🇴 ITBIS long terme RD' : '🇩🇴 DR long-term ITBIS',
        detail: fr
          ? 'L\'ITBIS est estimé pour les locations meublées ou ≤30 j. La frontière exacte court/long terme en RD doit être confirmée auprès de la DGII.'
          : 'ITBIS estimated for furnished or ≤30-day rentals. Confirm short/long-term boundary with DGII.',
      })
    }

    // 5) US — 871(d) / FIRPTA / net basis
    if (countries.has('US')) {
      items.push({
        severity: 'action',
        title: fr ? '🇺🇸 Élection 871(d) / Net Basis' : '🇺🇸 871(d) / Net Basis election',
        detail: fr
          ? 'Sans élection 871(d), retenue de 30 % sur le loyer BRUT. Avec élection, imposition sur le NET. Vérifier que l\'élection est faite et documentée (ITIN/EIN requis).'
          : 'Without 871(d), 30% on GROSS rent. With election, taxed on NET.',
        question: fr ? 'L\'élection 871(d) est-elle faite pour chaque propriété US louée ?' : 'Is 871(d) elected for each rented US property?',
      })
      items.push({
        severity: 'info',
        title: fr ? '🇺🇸 FIRPTA à la vente' : '🇺🇸 FIRPTA on sale',
        detail: fr
          ? '15 % du prix de vente brut retenu par l\'acheteur (non-résident). Récupérable via 1040-NR si l\'impôt réel est inférieur. Form 8288 sous 20 jours.'
          : '15% of gross sale price withheld. Recoverable via 1040-NR.',
      })
    }

    // 6) Mexique — implémenté mais à valider
    if (countries.has('MX')) {
      items.push({
        severity: 'limite',
        title: fr ? '🇲🇽 Mexique — estimation récente' : '🇲🇽 Mexico — recent estimate',
        detail: fr
          ? 'ISR 25 % NR + IVA 16 % (meublé) viennent d\'être ajoutés. Valider l\'option société étrangère (30 %), la zone frontalière (IVA 8 %) et les paiements provisionnels ISR.'
          : 'ISR 25% NR + IVA 16% (furnished) recently added. Validate foreign-entity option and provisional payments.',
        question: fr ? 'Le statut fiscal mexicain (particulier vs société) est-il confirmé ?' : 'Is the Mexican tax status confirmed?',
      })
    }

    // 7) Transactions étrangères sans juridiction
    if (mj.uncovered.length > 0) {
      items.push({
        severity: 'action',
        title: fr ? `${mj.uncovered.length} transaction(s) en devise étrangère sans pays` : `${mj.uncovered.length} foreign-currency tx without country`,
        detail: fr
          ? 'Ces transactions ne sont pas rattachées à une juridiction → obligations non tracées. Ouvrir chaque transaction et sélectionner le pays.'
          : 'These transactions are not linked to a jurisdiction → obligations not tracked.',
      })
    }

    // 8) Solde estimé dû
    if (mj.totalNetOwing > 0) {
      items.push({
        severity: 'info',
        title: `${fr ? 'Solde fiscal estimé dû' : 'Estimated tax owing'} : ${formatCurrency(mj.totalNetOwing)}`,
        detail: fr
          ? 'Somme des obligations estimées non encore retenues/remises, toutes juridictions confondues. À rapprocher des remises réelles.'
          : 'Sum of estimated obligations not yet withheld/remitted.',
      })
    }

    return items
  }

  const exportCPAReviewPDF = async () => {
    setGeneratingCPAReview(true)
    try {
      const jsPDF = (await import('jspdf')).default
      const autoTable = (await import('jspdf-autotable')).default
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const items = buildCPAReviewItems()
      const today = new Date().toLocaleDateString('fr-CA', { year: 'numeric', month: 'long', day: 'numeric' })

      // jsPDF (Helvetica) ne supporte que Latin-1 : les emojis (🇺🇸 ❓ …) et certains
      // symboles (→ ≥ ⚠) s'affichent en caractères parasites et cassent le retour
      // à la ligne. On nettoie chaque chaîne avant insertion dans le PDF.
      const pdfSafe = (s: string): string =>
        (s || '')
          // Ponctuation typographique -> ASCII (jsPDF Helvetica = Latin-1 seulement)
          .replace(/[—–]/g, '-').replace(/[’‘]/g, "'")
          .replace(/[“”]/g, '"').replace(/…/g, '...')
          .replace(/→/g, '->').replace(/≥/g, '>=').replace(/≤/g, '<=').replace(/€/g, 'EUR')
          .replace(/❓/g, '?')
          // Emojis & symboles hors Latin-1 : paires de surrogates (plans astraux,
          // inclut drapeaux régionaux 🇺🇸 et pictogrammes 🧾⚠✅) + flèches/symboles BMP.
          .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '')
          .replace(/[←-⇿☀-➿⬀-⯿︀-️™‰]/g, '')
          .replace(/[ \t]{2,}/g, ' ')
          .replace(/ *\n */g, '\n')
          .trim()

      doc.setFontSize(17); doc.setTextColor(190, 18, 60)
      doc.text(fr ? 'CONTROLE FISCAL — REVUE CPA' : 'TAX CONTROL — CPA REVIEW', 15, 18)
      doc.setFontSize(9); doc.setTextColor(110, 110, 110)
      doc.text(pdfSafe(`CERDIA SEC — ${getPeriodLabel()} — ${fr ? 'Genere le' : 'Generated'} ${today}`), 15, 25)
      doc.setDrawColor(190, 18, 60); doc.setLineWidth(0.6); doc.line(15, 29, 195, 29)

      doc.setFontSize(8); doc.setTextColor(80, 80, 80)
      const intro = doc.splitTextToSize(pdfSafe(
        fr
          ? 'Document destine a votre comptable / fiscaliste (CPA). Les montants produits par l\'application CERDIA sont des ESTIMATIONS de planification, et non des declarations fiscales officielles. Merci de valider chaque point ci-dessous avant toute production de declaration. L\'outil n\'assume aucune responsabilite fiscale.'
          : 'Document for your accountant (CPA). CERDIA figures are planning ESTIMATES, not official filings. Please validate each item below before filing. The tool assumes no tax liability.'),
        180)
      doc.text(intro, 15, 36)

      const sevLabel: Record<string, string> = {
        action: fr ? 'A VALIDER' : 'VALIDATE',
        limite: fr ? 'LIMITE' : 'LIMITATION',
        info:   'INFO',
      }
      const sevColor: Record<string, [number, number, number]> = {
        action: [220, 38, 38], limite: [217, 119, 6], info: [37, 99, 235],
      }

      autoTable(doc, {
        startY: 50,
        head: [[fr ? 'Priorite' : 'Priority', fr ? 'Point a valider' : 'Item', fr ? 'Detail / Question' : 'Detail / Question']],
        body: items.map(it => [
          sevLabel[it.severity],
          pdfSafe(it.title),
          pdfSafe(it.detail + (it.question ? `\n\n? ${it.question}` : '')),
        ]),
        theme: 'grid',
        margin: { left: 15, right: 15 },
        tableWidth: 180,
        headStyles: { fillColor: [190, 18, 60], textColor: 255, fontStyle: 'bold', fontSize: 8 },
        bodyStyles: { fontSize: 8, cellPadding: 2.5, valign: 'top', overflow: 'linebreak' },
        columnStyles: {
          0: { cellWidth: 20, fontStyle: 'bold', overflow: 'linebreak' },
          1: { cellWidth: 52, fontStyle: 'bold', overflow: 'linebreak' },
          2: { cellWidth: 108, overflow: 'linebreak' },
        },
        didParseCell: (data: any) => {
          if (data.section === 'body' && data.column.index === 0) {
            const sev = items[data.row.index]?.severity
            if (sev) data.cell.styles.textColor = sevColor[sev]
          }
        },
      })

      let y = (doc as any).lastAutoTable.finalY + 8
      if (y > 250) { doc.addPage(); y = 20 }
      doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.3); doc.rect(15, y, 180, 28)
      doc.setFontSize(8); doc.setTextColor(90, 90, 90)
      doc.text(pdfSafe(fr ? 'Avis du fiscaliste :' : 'Tax professional notes:'), 18, y + 6)
      doc.setFontSize(7); doc.setTextColor(150, 150, 150)
      doc.text(pdfSafe(fr ? '(espace reserve aux commentaires de votre CPA)' : '(space for your CPA comments)'), 18, y + 12)
      doc.text(pdfSafe(fr ? 'Signature / Date : ____________________________' : 'Signature / Date: ____________________________'), 18, y + 24)

      doc.setFontSize(7); doc.setTextColor(160, 160, 160)
      doc.text(pdfSafe('CERDIA SEC — eric.dufort@cerdia.ai — ' + (fr ? 'Confidentiel' : 'Confidential')), 105, 287, { align: 'center' })

      doc.save(`controle_fiscal_CPA_${selectedYear}_${filterPeriod}_CERDIA.pdf`)
    } catch (e: any) {
      alert((fr ? 'Erreur PDF : ' : 'PDF error: ') + e.message)
    } finally {
      setGeneratingCPAReview(false)
    }
  }

  const exportT1135ToPDF = async () => {
    setGeneratingPDF(true)
    try {
      const jsPDF = (await import('jspdf')).default
      const autoTable = (await import('jspdf-autotable')).default
      const data = calculateT1135Data()
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

      const loadImageAsBase64 = async (url: string): Promise<string> => {
        try {
          const res = await fetch(url)
          const blob = await res.blob()
          return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onloadend = () => resolve(reader.result as string)
            reader.onerror = reject
            reader.readAsDataURL(blob)
          })
        } catch { return '' }
      }
      const getImageSize = (base64: string, maxH: number): Promise<{ w: number; h: number }> =>
        new Promise(resolve => {
          const img = new Image()
          img.onload = () => { const r = img.naturalHeight / (img.naturalWidth || 1); resolve({ w: maxH / r, h: maxH }) }
          img.onerror = () => resolve({ w: maxH * 3, h: maxH })
          img.src = base64
        })

      const logoBase64 = await loadImageAsBase64('/logo-cerdia3.png')
      const fmt = (n: number, cur = 'CAD') => n.toLocaleString('fr-CA', { style: 'currency', currency: cur, minimumFractionDigits: 0 })
      const subtitle = `T1135 — Bilan de vérification du revenu étranger — ${getPeriodLabel()} — Généré le ${new Date().toLocaleDateString('fr-CA')}`

      const addPageHeader = async (): Promise<number> => {
        if (logoBase64) {
          try { const { w, h } = await getImageSize(logoBase64, 12); doc.addImage(logoBase64, 'PNG', 15, 8, w, h) } catch {}
        }
        doc.setFontSize(16); doc.setTextColor(94, 94, 94)
        doc.text('T1135 — Bilan des avoirs étrangers', 195, 16, { align: 'right' })
        doc.setFontSize(7); doc.setTextColor(130, 130, 130)
        doc.text(subtitle, 195, 23, { align: 'right' })
        doc.setDrawColor(94, 94, 94); doc.setLineWidth(0.5); doc.line(15, 28, 195, 28)
        return 34
      }

      let yPos = await addPageHeader()

      // Sommaire KPIs
      autoTable(doc, {
        startY: yPos,
        head: [['Actifs étrangers totaux (CAD)', 'Revenus étrangers', 'Propriétés déclarées', 'Seuil T1135 (100 000 $)']],
        body: [[
          fmt(data.totalForeignAssets),
          fmt(data.foreignIncome),
          String(data.properties.length),
          data.totalForeignAssets > 100000 ? '⚠️ OBLIGATOIRE' : '✅ Sous le seuil',
        ]],
        theme: 'grid', margin: { left: 15, right: 15 },
        headStyles: { fillColor: [29, 78, 216], textColor: 255, fontStyle: 'bold', fontSize: 8, halign: 'center' },
        bodyStyles: { fontSize: 10, cellPadding: 4, halign: 'center', fontStyle: 'bold' },
        didParseCell: (d: any) => {
          if (d.section === 'body' && d.column.index === 3)
            d.cell.styles.textColor = data.totalForeignAssets > 100000 ? [220, 38, 38] : [22, 163, 74]
        },
      })
      yPos = (doc as any).lastAutoTable.finalY + 8

      // Info ARC
      doc.setFontSize(8); doc.setTextColor(120, 80, 0)
      doc.setFont('helvetica', 'italic')
      doc.text('⚠  Méthode simplifiée (Partie A) si coût total < 250 000 $ en tout temps. Méthode détaillée (Partie B) si ≥ 250 000 $.  Délai : 6 mois après fin d\'exercice.', 15, yPos, { maxWidth: 180 })
      doc.setFont('helvetica', 'normal'); doc.setTextColor(60, 60, 60)
      yPos += 9

      // Tableau propriétés (Catégorie 5 T1135 — Biens immobiliers étrangers)
      doc.setFontSize(9); doc.setFont('helvetica', 'bold')
      doc.text('Catégorie 5 — Biens immobiliers étrangers (Partie B détaillée)', 15, yPos)
      doc.setFont('helvetica', 'normal'); yPos += 3

      autoTable(doc, {
        startY: yPos,
        head: [['#', 'Propriété', 'Localisation', 'Pays', 'Devise', `Coût d'acquisition`, 'Coût CAD (FNACC approx.)', 'Revenu brut']],
        body: data.properties.length > 0
          ? data.properties.map((p, i) => [
              String(i + 1), p.name, p.location, p.country, p.currency,
              fmt(p.cost, p.currency), fmt(p.costCAD), '—',
            ])
          : [['—', 'Aucune propriété étrangère enregistrée', '', '', '', '', '', '']],
        theme: 'striped', margin: { left: 15, right: 15 },
        headStyles: { fillColor: [29, 78, 216], textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
        bodyStyles: { fontSize: 8, cellPadding: 2.5 },
        columnStyles: {
          0: { cellWidth: 7, halign: 'center' }, 1: { cellWidth: 35 }, 2: { cellWidth: 35 },
          3: { cellWidth: 18 }, 4: { cellWidth: 12 },
          5: { cellWidth: 22, halign: 'right' }, 6: { cellWidth: 27, halign: 'right', fontStyle: 'bold' }, 7: { cellWidth: 14, halign: 'right' },
        },
      })
      yPos = (doc as any).lastAutoTable.finalY + 8

      // Champs manquants (note CPA)
      doc.setFontSize(8); doc.setTextColor(60, 60, 60)
      doc.setFont('helvetica', 'bold'); doc.text('Champs à compléter avec votre CPA pour T1135 complet :', 15, yPos)
      doc.setFont('helvetica', 'normal'); yPos += 5

      autoTable(doc, {
        startY: yPos,
        head: [['Champ CRA requis', 'Dans CERDIA', 'Action requise']],
        body: [
          ['Valeur marchande 31-déc. (juste valeur)', '⚠️ Coût d\'achat utilisé', 'Ajouter évaluation courante'],
          ['Valeur maximale dans l\'année', '❌ Absent', 'Saisir manuellement'],
          ['Numéro de compte étranger', '❌ Absent', 'Ajouter à la propriété'],
          ['Gains/pertes en capital', '❌ Toujours 0', 'Enregistrer transactions de vente'],
          ['Revenu brut par propriété', '⚠️ Agrégé', 'Ventilation par propriété OK dans Comptable'],
          ['Taux de change (date d\'acquisition)', '⚠️ Taux fixe 1,35', 'Vérifier taux historique BdC'],
        ],
        theme: 'grid', margin: { left: 15, right: 15 },
        headStyles: { fillColor: [120, 53, 15], textColor: 255, fontStyle: 'bold', fontSize: 8 },
        bodyStyles: { fontSize: 7.5, cellPadding: 2.5 },
        columnStyles: { 0: { cellWidth: 68 }, 1: { cellWidth: 55 }, 2: { cellWidth: 57 } },
        didParseCell: (d: any) => {
          if (d.section === 'body' && d.column.index === 1) {
            d.cell.styles.textColor = d.cell.text[0]?.startsWith('❌') ? [220, 38, 38] : [180, 120, 0]
          }
        },
      })
      yPos = (doc as any).lastAutoTable.finalY + 6

      // Pénalités
      doc.setFontSize(7); doc.setTextColor(180, 0, 0); doc.setFont('helvetica', 'italic')
      doc.text('Pénalités ARC : 25 $/jour (min. 100 $, max. 2 500 $) pour production tardive. Faute grave : 5 % du coût max. des biens non déclarés (jusqu\'à 40 000 $/an). Délai de vérification prolongé de +3 ans.', 15, yPos, { maxWidth: 180 })
      doc.setFont('helvetica', 'normal')
      yPos += 10

      doc.setFontSize(7); doc.setTextColor(160, 160, 160)
      doc.text('Document préparatoire — Faire valider par un CPA avant dépôt auprès de l\'ARC  |  Généré par CERDIA Investment Platform', 15, yPos)

      doc.save(`T1135_${data.year}_${filterPeriod}_CERDIA.pdf`)
    } catch (e) {
      console.error(e)
      alert('Erreur lors de la génération du PDF T1135')
    } finally {
      setGeneratingPDF(false)
    }
  }

  const exportT2209ToPDF = async () => {
    setGeneratingPDF(true)
    try {
      const jsPDF = (await import('jspdf')).default
      const autoTable = (await import('jspdf-autotable')).default
      const data = calculateT2209Data()
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

      const loadImageAsBase64 = async (url: string): Promise<string> => {
        try {
          const res = await fetch(url)
          const blob = await res.blob()
          return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onloadend = () => resolve(reader.result as string)
            reader.onerror = reject
            reader.readAsDataURL(blob)
          })
        } catch { return '' }
      }
      const getImageSize = (base64: string, maxH: number): Promise<{ w: number; h: number }> =>
        new Promise(resolve => {
          const img = new Image()
          img.onload = () => { const r = img.naturalHeight / (img.naturalWidth || 1); resolve({ w: maxH / r, h: maxH }) }
          img.onerror = () => resolve({ w: maxH * 3, h: maxH })
          img.src = base64
        })

      const logoBase64 = await loadImageAsBase64('/logo-cerdia3.png')
      const fmt = (n: number) => n.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })
      const subtitle = `T2209 — Crédits fédéraux pour impôt étranger — ${getPeriodLabel()} — Généré le ${new Date().toLocaleDateString('fr-CA')}`

      const addPageHeader = async (): Promise<number> => {
        if (logoBase64) {
          try { const { w, h } = await getImageSize(logoBase64, 12); doc.addImage(logoBase64, 'PNG', 15, 8, w, h) } catch {}
        }
        doc.setFontSize(16); doc.setTextColor(94, 94, 94)
        doc.text('T2209 — Crédits pour impôt étranger', 195, 16, { align: 'right' })
        doc.setFontSize(7); doc.setTextColor(130, 130, 130)
        doc.text(subtitle, 195, 23, { align: 'right' })
        doc.setDrawColor(94, 94, 94); doc.setLineWidth(0.5); doc.line(15, 28, 195, 28)
        return 34
      }

      let yPos = await addPageHeader()

      // KPI sommaire
      autoTable(doc, {
        startY: yPos,
        head: [['Revenu étranger total', 'Impôt étranger payé', 'Crédit réclamable (ligne 40500)', 'Report disponible (carryforward)']],
        body: [[
          fmt(data.totalForeignIncome),
          fmt(data.totalForeignTaxPaid),
          fmt(data.totalTaxCredit),
          '— (à calculer avec CPA)',
        ]],
        theme: 'grid', margin: { left: 15, right: 15 },
        headStyles: { fillColor: [21, 128, 61], textColor: 255, fontStyle: 'bold', fontSize: 8, halign: 'center' },
        bodyStyles: { fontSize: 10, cellPadding: 4, halign: 'center', fontStyle: 'bold' },
      })
      yPos = (doc as any).lastAutoTable.finalY + 6

      // Règle du plafond
      doc.setFontSize(8); doc.setTextColor(120, 80, 0); doc.setFont('helvetica', 'italic')
      doc.text('Règle ARC : crédit limité à l\'impôt canadien payable sur le revenu étranger. Pour revenus de biens (loyers passifs) : plafond 15 % du revenu net. Carryforward 10 ans / carryback 3 ans.', 15, yPos, { maxWidth: 180 })
      doc.setFont('helvetica', 'normal'); doc.setTextColor(60, 60, 60)
      yPos += 9

      // Tableau par pays
      doc.setFontSize(9); doc.setFont('helvetica', 'bold')
      doc.text('Détail par pays — Ventilation pour annexe T2209', 15, yPos)
      doc.setFont('helvetica', 'normal'); yPos += 3

      autoTable(doc, {
        startY: yPos,
        head: [['Pays', 'Revenu étranger (CAD)', 'Impôt payé (CAD)', 'Crédit réclamable', '% effectif', 'Statut']],
        body: data.byCountry.length > 0
          ? [
              ...data.byCountry.map(c => {
                const pct = c.income > 0 ? ((c.taxPaid / c.income) * 100).toFixed(1) + ' %' : '—'
                const ok = c.taxCredit >= c.taxPaid
                return [c.country, fmt(c.income), fmt(c.taxPaid), fmt(c.taxCredit), pct, ok ? '✅ Plafond OK' : '⚠️ Limité']
              }),
              ['TOTAL', fmt(data.totalForeignIncome), fmt(data.totalForeignTaxPaid), fmt(data.totalTaxCredit), '', ''],
            ]
          : [['Aucune transaction avec impôt étranger payé pour cette période', '', '', '', '', '']],
        theme: 'striped', margin: { left: 15, right: 15 },
        headStyles: { fillColor: [21, 128, 61], textColor: 255, fontStyle: 'bold', fontSize: 8 },
        bodyStyles: { fontSize: 9, cellPadding: 3 },
        columnStyles: {
          0: { cellWidth: 35 }, 1: { cellWidth: 37, halign: 'right' },
          2: { cellWidth: 35, halign: 'right' }, 3: { cellWidth: 35, halign: 'right', fontStyle: 'bold' },
          4: { cellWidth: 18, halign: 'center' }, 5: { cellWidth: 20, halign: 'center' },
        },
        didParseCell: (d: any) => {
          if (d.section === 'body') {
            const isTotal = data.byCountry.length > 0 && d.row.index === data.byCountry.length
            if (isTotal) d.cell.styles.fontStyle = 'bold'
            if (d.column.index === 5 && !isTotal) {
              d.cell.styles.textColor = d.cell.text[0]?.startsWith('✅') ? [22, 163, 74] : [180, 120, 0]
            }
          }
        },
      })
      yPos = (doc as any).lastAutoTable.finalY + 8

      // Champs manquants (note CPA)
      doc.setFontSize(9); doc.setFont('helvetica', 'bold')
      doc.text('Points à valider avec votre CPA avant dépôt T2209 :', 15, yPos)
      doc.setFont('helvetica', 'normal'); yPos += 3

      autoTable(doc, {
        startY: yPos,
        head: [['Point de vérification', 'Dans CERDIA', 'Action']],
        body: [
          ['Plafond 15 % revenu net (revenus de biens)', '❌ Non calculé', 'Fournir revenu imposable canadien à CPA'],
          ['Impôt étranger converti au taux du jour de PAIEMENT', '⚠️ Taux fixe 1,35', 'Vérifier taux historique BdC par transaction'],
          ['Carryforward crédits inutilisés (années N-1 à N-10)', '❌ Non suivi', 'CPA vérifie solde crédits reportés'],
          ['Ventilation par catégorie de revenu (emploi/bien/entreprise)', '⚠️ Par pays seulement', 'T2209 exige catégorie séparée'],
          ['Taux marginal québécois (26,5 % utilisé — taux moyen approx.)', '⚠️ Approximatif', 'Taux réel selon tranche + QC combiné'],
        ],
        theme: 'grid', margin: { left: 15, right: 15 },
        headStyles: { fillColor: [120, 53, 15], textColor: 255, fontStyle: 'bold', fontSize: 8 },
        bodyStyles: { fontSize: 7.5, cellPadding: 2.5 },
        columnStyles: { 0: { cellWidth: 75 }, 1: { cellWidth: 50 }, 2: { cellWidth: 55 } },
        didParseCell: (d: any) => {
          if (d.section === 'body' && d.column.index === 1) {
            d.cell.styles.textColor = d.cell.text[0]?.startsWith('❌') ? [220, 38, 38] : [180, 120, 0]
          }
        },
      })
      yPos = (doc as any).lastAutoTable.finalY + 6

      doc.setFontSize(7); doc.setTextColor(160, 160, 160)
      doc.text('Document préparatoire — Faire valider par un CPA avant dépôt auprès de l\'ARC (ligne 40500 de la T2)  |  Généré par CERDIA Investment Platform', 15, yPos)

      doc.save(`T2209_${data.year}_${filterPeriod}_CERDIA.pdf`)
    } catch (e) {
      console.error(e)
      alert('Erreur lors de la génération du PDF T2209')
    } finally {
      setGeneratingPDF(false)
    }
  }

  const FISCAL_LABELS: Record<string, string> = {
    rental_income: 'Revenu locatif', dividend_income: 'Dividende / distribution',
    interest_income: 'Intérêts reçus', other_income: 'Autre revenu',
    management_fee: 'Frais de gestion', insurance: 'Assurance propriété',
    property_tax: 'Taxes foncières', condo_fees: 'Frais de condo / charges',
    utilities: 'Services publics (eau, élec.)', maintenance_repair: 'Entretien & réparations',
    professional_fees: 'Honoraires prof. (comptable, notaire)', advertising: 'Publicité / location',
    travel: 'Frais de déplacement', interest_expense: 'Intérêts hypothécaires',
    bank_fees: 'Frais bancaires / conversion', other_opex: 'Autre OPEX',
    property_purchase: 'Acquisition propriété (prix d\'achat)',
    renovation: 'Rénovation majeure', equipment: 'Équipements & appareils',
    furnishing: 'Ameublement', acquisition_costs: "Frais d'acquisition (notaire, inspection)",
    land_improvement: 'Amélioration terrain', other_capex: 'Autre CAPEX',
    loan_principal: 'Remboursement capital prêt', investor_capital: 'Capital investisseur',
    investor_repayment: 'Remboursement investisseur',
    sales_tax_remittance: 'Remise taxe de vente / TVA',
    income_tax_remittance: 'Remise impôt sur le revenu NR',
    withholding_remittance: 'Remise retenue à la source',
  }

  const TAX_REMITTANCE_CATS = ['sales_tax_remittance', 'income_tax_remittance', 'withholding_remittance']

  const FISCAL_GROUPS: { label: string; color: string; cats: string[] }[] = [
    { label: 'REVENUS', color: 'green', cats: ['rental_income', 'dividend_income', 'interest_income', 'other_income'] },
    { label: 'OPEX — Déduit immédiatement', color: 'blue', cats: ['management_fee', 'insurance', 'property_tax', 'condo_fees', 'utilities', 'maintenance_repair', 'professional_fees', 'advertising', 'travel', 'interest_expense', 'bank_fees', 'other_opex'] },
    { label: 'CAPEX — Amorti sur plusieurs années', color: 'orange', cats: ['property_purchase', 'renovation', 'equipment', 'furnishing', 'acquisition_costs', 'land_improvement', 'other_capex'] },
    { label: 'FINANCEMENT', color: 'purple', cats: ['loan_principal', 'investor_capital', 'investor_repayment'] },
    { label: 'REMISES FISCALES', color: 'red', cats: TAX_REMITTANCE_CATS },
  ]

  const allCategorized = FISCAL_GROUPS.flatMap(g => g.cats)

  const generateComptablePDF = async () => {
    setGeneratingPDF(true)
    try {
      const jsPDF = (await import('jspdf')).default
      const autoTable = (await import('jspdf-autotable')).default

      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

      const loadImageAsBase64 = async (url: string): Promise<string> => {
        try {
          const res = await fetch(url)
          const blob = await res.blob()
          return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onloadend = () => resolve(reader.result as string)
            reader.onerror = reject
            reader.readAsDataURL(blob)
          })
        } catch { return '' }
      }

      const getImageSize = (base64: string, maxH: number): Promise<{ w: number; h: number }> =>
        new Promise(resolve => {
          const img = new Image()
          img.onload = () => {
            const ratio = img.naturalWidth > 0 ? img.naturalHeight / img.naturalWidth : 1
            resolve({ w: maxH / ratio, h: maxH })
          }
          img.onerror = () => resolve({ w: maxH * 3, h: maxH })
          img.src = base64
        })

      const logoBase64 = await loadImageAsBase64('/logo-cerdia3.png')

      const addPageHeader = async (subtitle: string): Promise<number> => {
        if (logoBase64) {
          try {
            const { w, h } = await getImageSize(logoBase64, 12)
            doc.addImage(logoBase64, 'PNG', 15, 8, w, h)
          } catch {}
        }
        doc.setFontSize(18)
        doc.setTextColor(94, 94, 94)
        doc.text('Rapport Comptable', 282, 17, { align: 'right' })
        doc.setFontSize(9)
        doc.setTextColor(130, 130, 130)
        doc.text(subtitle, 282, 24, { align: 'right' })
        doc.setDrawColor(94, 94, 94)
        doc.setLineWidth(0.5)
        doc.line(15, 29, 282, 29)
        return 36
      }

      const fmt = (n: number) =>
        n.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })

      const fmtDate = (d: string) => {
        const date = new Date(d)
        return isNaN(date.getTime()) ? d : date.toLocaleDateString('fr-CA')
      }

      // Signed URLs for clickable links
      const urlMap: Record<string, string> = {}
      await Promise.all(
        filteredTransactions
          .filter(t => t.attachment_storage_path)
          .map(async t => {
            const { data } = await supabase.storage
              .from('transaction-attachments')
              .createSignedUrl(t.attachment_storage_path!, 60 * 60 * 24 * 365)
            if (data?.signedUrl) urlMap[t.id] = data.signedUrl
          })
      )
      // Fallback to public attachment_url if no storage path
      filteredTransactions.forEach(t => {
        if (!urlMap[t.id] && t.attachment_url) urlMap[t.id] = t.attachment_url
      })

      const subtitle = `Année fiscale ${selectedYear} — Généré le ${new Date().toLocaleDateString('fr-CA')}`
      let yPos = await addPageHeader(subtitle)

      // Summary table
      doc.setFontSize(10)
      doc.setTextColor(60, 60, 60)
      doc.text('Résumé par groupe fiscal', 15, yPos)
      yPos += 4

      const summaryBody = FISCAL_GROUPS.map(group => {
        const txs = filteredTransactions.filter(t => group.cats.includes(t.fiscal_category || ''))
        return [group.label.split('—')[0].trim(), String(txs.length), fmt(txs.reduce((s, t) => s + t.amount, 0))]
      })
      const uncatTxs = filteredTransactions.filter(t => !allCategorized.includes(t.fiscal_category || ''))
      if (uncatTxs.length > 0) summaryBody.push(['⚠ Sans catégorie', String(uncatTxs.length), fmt(uncatTxs.reduce((s, t) => s + t.amount, 0))])
      summaryBody.push(['TOTAL GÉNÉRAL', String(filteredTransactions.length), fmt(filteredTransactions.reduce((s, t) => s + t.amount, 0))])

      autoTable(doc, {
        startY: yPos,
        head: [['Groupe', 'Transactions', 'Montant']],
        body: summaryBody,
        theme: 'grid',
        margin: { left: 15, right: 15 },
        headStyles: { fillColor: [94, 94, 94], textColor: 255, fontStyle: 'bold', fontSize: 9 },
        bodyStyles: { fontSize: 9, cellPadding: 3 },
        columnStyles: { 0: { cellWidth: 140 }, 1: { cellWidth: 30, halign: 'center' }, 2: { cellWidth: 40, halign: 'right' } },
        didParseCell: (data: any) => {
          if (data.section === 'body' && data.row.index === summaryBody.length - 1) {
            data.cell.styles.fontStyle = 'bold'
          }
        },
      })

      yPos = (doc as any).lastAutoTable.finalY + 12

      // Group colors [R, G, B]
      const groupColors: Record<string, [number, number, number]> = {
        green: [21, 128, 61], blue: [29, 78, 216], orange: [194, 65, 12], purple: [109, 40, 217],
      }

      const addGroupTable = async (groupLabel: string, color: [number, number, number], txs: Transaction[]) => {
        if (yPos > 175) {
          doc.addPage()
          yPos = await addPageHeader(subtitle)
        }

        const groupTotal = txs.reduce((s, t) => s + t.amount, 0)
        doc.setFontSize(10)
        doc.setTextColor(color[0], color[1], color[2])
        doc.setFont('helvetica', 'bold')
        doc.text(`${groupLabel}`, 15, yPos)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(60, 60, 60)
        doc.setFontSize(9)
        doc.text(`Total: ${fmt(groupTotal)}`, 282, yPos, { align: 'right' })
        yPos += 3

        const rows = txs.map(tx => {
          const prop = properties.find(p => p.id === tx.property_id)
          return [
            fmtDate(tx.date),
            FISCAL_LABELS[tx.fiscal_category || ''] || '—',
            prop?.name || '—',
            tx.description.replace(/\n/g, ' '),
            tx.vendor_name || '—',
            fmt(tx.amount),
            urlMap[tx.id] ? (tx.attachment_name || 'Voir') : '—',
          ]
        })

        autoTable(doc, {
          startY: yPos,
          head: [['Date', 'Catégorie', 'Propriété', 'Description', 'Vendeur', 'Montant', 'Pièce jointe']],
          body: rows,
          theme: 'striped',
          headStyles: { fillColor: color, textColor: 255, fontStyle: 'bold', fontSize: 8 },
          bodyStyles: { fontSize: 7.5, cellPadding: 2 },
          margin: { left: 15, right: 15 },
          columnStyles: {
            0: { cellWidth: 20 },   // Date
            1: { cellWidth: 42 },   // Catégorie
            2: { cellWidth: 30 },   // Propriété
            3: { cellWidth: 82 },   // Description
            4: { cellWidth: 30 },   // Vendeur
            5: { cellWidth: 22, halign: 'right' }, // Montant
            6: { cellWidth: 21 },   // Pièce jointe
          },
          // Total: 20+42+30+82+30+22+21 = 247mm dans 267mm utiles ✓
          didParseCell: (data: any) => {
            if (data.section === 'body' && data.column.index === 6) {
              const tx = txs[data.row.index]
              if (tx && urlMap[tx.id]) data.cell.styles.textColor = [0, 102, 204]
            }
          },
          didDrawCell: (data: any) => {
            if (data.section === 'body' && data.column.index === 6) {
              const tx = txs[data.row.index]
              const url = tx && urlMap[tx.id]
              if (url) {
                doc.link(data.cell.x, data.cell.y, data.cell.width, data.cell.height, { url })
                doc.setDrawColor(0, 102, 204)
                doc.setLineWidth(0.15)
                doc.line(data.cell.x + 1, data.cell.y + data.cell.height - 1.5, data.cell.x + data.cell.width - 1, data.cell.y + data.cell.height - 1.5)
              }
            }
          },
        })

        yPos = (doc as any).lastAutoTable.finalY + 10
      }

      for (const group of FISCAL_GROUPS) {
        const txs = transactions
          .filter(t => group.cats.includes(t.fiscal_category || ''))
          .sort((a, b) => a.date.localeCompare(b.date))
        if (txs.length > 0) await addGroupTable(group.label, groupColors[group.color], txs)
      }

      // Uncategorized
      if (uncatTxs.length > 0) {
        await addGroupTable('⚠ Sans catégorie fiscale — à compléter', [160, 100, 0], uncatTxs.sort((a, b) => a.date.localeCompare(b.date)))
      }

      doc.save(`rapport_comptable_${selectedYear}_CERDIA.pdf`)
    } catch (e) {
      console.error(e)
      alert('Erreur lors de la génération du PDF')
    } finally {
      setGeneratingPDF(false)
    }
  }

  const generateComptableCSV = () => {
    const esc = (s: string | number | null | undefined) =>
      `"${String(s ?? '').replace(/"/g, '""')}"`
    const fmtDate = (d: string) => {
      const date = new Date(d)
      return isNaN(date.getTime()) ? d : date.toLocaleDateString('fr-CA')
    }
    const header = ['Date', 'Groupe Fiscal', 'Catégorie Fiscale', 'Propriété', 'Type', 'Description',
      'Vendeur/Compagnie', 'Montant (CAD)', 'Notes Comptable', 'Pièce jointe', 'URL Pièce jointe']
    const rows: string[] = [
      `"CERDIA Investment — Rapport Comptable ${selectedYear}"`,
      `"Généré le ${new Date().toLocaleDateString('fr-CA')}"`,
      '',
      header.map(esc).join(','),
    ]
    let grandTotal = 0
    for (const group of FISCAL_GROUPS) {
      const txs = filteredTransactions.filter(t => group.cats.includes(t.fiscal_category || '')).sort((a, b) => a.date.localeCompare(b.date))
      if (txs.length === 0) continue
      const groupTotal = txs.reduce((sum, t) => sum + t.amount, 0)
      grandTotal += groupTotal
      for (const tx of txs) {
        const prop = properties.find(p => p.id === tx.property_id)
        rows.push([fmtDate(tx.date), group.label, FISCAL_LABELS[tx.fiscal_category || ''] || '', prop?.name || '', tx.type, tx.description.replace(/\n/g, ' '), tx.vendor_name || '', tx.amount.toFixed(2), tx.accountant_notes || '', tx.attachment_name || '', tx.attachment_url || ''].map(esc).join(','))
      }
      rows.push(['', `SOUS-TOTAL — ${group.label}`, '', '', '', '', '', groupTotal.toFixed(2), '', '', ''].map(esc).join(','))
      rows.push('')
    }
    const uncategorized = filteredTransactions.filter(t => !allCategorized.includes(t.fiscal_category || ''))
    if (uncategorized.length > 0) {
      for (const tx of uncategorized.sort((a, b) => a.date.localeCompare(b.date))) {
        const prop = properties.find(p => p.id === tx.property_id)
        rows.push([fmtDate(tx.date), 'Sans catégorie', '', prop?.name || '', tx.type, tx.description.replace(/\n/g, ' '), tx.vendor_name || '', tx.amount.toFixed(2), tx.accountant_notes || '', tx.attachment_name || '', tx.attachment_url || ''].map(esc).join(','))
      }
      rows.push('')
    }
    rows.push(['', 'TOTAL GÉNÉRAL', '', '', '', '', '', grandTotal.toFixed(2), '', '', ''].map(esc).join(','))
    const blob = new Blob(['﻿' + rows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `rapport_comptable_${selectedYear}_CERDIA.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportMultiJuridictionPDF = async () => {
    setGeneratingMJPDF(true)
    try {
      const jsPDF = (await import('jspdf')).default
      const autoTable = (await import('jspdf-autotable')).default
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
      const mjData = calculateMultiJurisdictionData()

      const loadImageAsBase64 = async (url: string): Promise<string> => {
        try {
          const res = await fetch(url)
          const blob = await res.blob()
          return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onloadend = () => resolve(reader.result as string)
            reader.onerror = reject
            reader.readAsDataURL(blob)
          })
        } catch { return '' }
      }

      const getImageSize = (base64: string, maxH: number): Promise<{ w: number; h: number }> =>
        new Promise(resolve => {
          const img = new Image()
          img.onload = () => {
            const ratio = img.naturalWidth > 0 ? img.naturalHeight / img.naturalWidth : 1
            resolve({ w: maxH / ratio, h: maxH })
          }
          img.onerror = () => resolve({ w: maxH * 3, h: maxH })
          img.src = base64
        })

      const logoBase64 = await loadImageAsBase64('/logo-cerdia3.png')
      const periodLabel = getPeriodLabel()
      const subtitle = `Rapport fiscal Multi-Juridiction — ${periodLabel} — Généré le ${new Date().toLocaleDateString('fr-CA')}`

      const addPageHeader = async (): Promise<number> => {
        if (logoBase64) {
          try {
            const { w, h } = await getImageSize(logoBase64, 12)
            doc.addImage(logoBase64, 'PNG', 15, 8, w, h)
          } catch {}
        }
        doc.setFontSize(16)
        doc.setTextColor(94, 94, 94)
        doc.text('Rapport Fiscal Multi-Juridiction', 282, 16, { align: 'right' })
        doc.setFontSize(8)
        doc.setTextColor(130, 130, 130)
        doc.text(subtitle, 282, 23, { align: 'right' })
        doc.setDrawColor(94, 94, 94)
        doc.setLineWidth(0.5)
        doc.line(15, 28, 282, 28)
        return 34
      }

      const fmt = (n: number) =>
        n.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })

      let yPos = await addPageHeader()

      // KPI summary table
      doc.setFontSize(9)
      doc.setTextColor(60, 60, 60)
      doc.setFont('helvetica', 'bold')
      doc.text('Sommaire', 15, yPos)
      doc.setFont('helvetica', 'normal')
      yPos += 3

      autoTable(doc, {
        startY: yPos,
        head: [['Revenu brut tracé', 'Taxe de vente / TVA', 'Impôt État/Province', 'Retenue fédérale NR', 'Total estimé dû', 'Solde net à payer']],
        body: [[
          fmt(mjData.rows.reduce((s, r) => s + r.totalGross, 0)),
          fmt(mjData.totalSalesTax),
          fmt(mjData.totalStateTax),
          fmt(mjData.totalFederalWithholding),
          fmt(mjData.totalTax),
          fmt(mjData.totalNetOwing),
        ]],
        theme: 'grid',
        margin: { left: 15, right: 15 },
        headStyles: { fillColor: [55, 65, 81], textColor: 255, fontStyle: 'bold', fontSize: 8, halign: 'center' },
        bodyStyles: { fontSize: 9, cellPadding: 3, halign: 'center', fontStyle: 'bold' },
        didParseCell: (data: any) => {
          if (data.section === 'body' && data.column.index === 5) {
            data.cell.styles.textColor = mjData.totalNetOwing > 0 ? [220, 38, 38] : [22, 163, 74]
          }
        },
      })

      yPos = (doc as any).lastAutoTable.finalY + 8

      // Reconciliation table per country
      doc.setFontSize(9)
      doc.setTextColor(60, 60, 60)
      doc.setFont('helvetica', 'bold')
      doc.text('Réconciliation fiscale par pays', 15, yPos)
      doc.setFont('helvetica', 'normal')
      yPos += 3

      if (mjData.rows.length > 0) {
        const recoHead = ['Pays', 'Revenu brut', 'Taxe vente', 'Impôt État', 'Retenue NR', 'Total estimé', 'Déjà retenu', 'Remis', 'Solde dû', 'Statut']
        const recoBody = mjData.rows.map(row => [
          `${row.flag} ${row.name}`,
          fmt(row.totalGross),
          row.totalSalesTax > 0 ? fmt(row.totalSalesTax) : '—',
          row.totalStateTax > 0 ? fmt(row.totalStateTax) : '—',
          row.totalFederalWithholding > 0 ? fmt(row.totalFederalWithholding) : '—',
          fmt(row.totalTax),
          row.alreadyWithheld > 0 ? fmt(row.alreadyWithheld) : '—',
          row.alreadyRemitted > 0 ? fmt(row.alreadyRemitted) : '—',
          fmt(row.netOwing),
          row.status === 'ok' ? 'Réglé ✓' : row.status === 'partial' ? 'Partiel' : 'À payer',
        ])
        // Totals row
        recoBody.push([
          'TOTAL',
          fmt(mjData.rows.reduce((s, r) => s + r.totalGross, 0)),
          fmt(mjData.totalSalesTax),
          fmt(mjData.totalStateTax),
          fmt(mjData.totalFederalWithholding),
          fmt(mjData.totalTax),
          fmt(mjData.totalAlreadyWithheld),
          fmt(mjData.totalAlreadyRemitted),
          fmt(mjData.totalNetOwing),
          '',
        ])

        autoTable(doc, {
          startY: yPos,
          head: [recoHead],
          body: recoBody,
          theme: 'striped',
          margin: { left: 15, right: 15 },
          headStyles: { fillColor: [31, 41, 55], textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
          bodyStyles: { fontSize: 7.5, cellPadding: 2 },
          columnStyles: {
            0: { cellWidth: 32 },
            1: { cellWidth: 24, halign: 'right' },
            2: { cellWidth: 22, halign: 'right' },
            3: { cellWidth: 22, halign: 'right' },
            4: { cellWidth: 22, halign: 'right' },
            5: { cellWidth: 24, halign: 'right', fontStyle: 'bold' },
            6: { cellWidth: 24, halign: 'right' },
            7: { cellWidth: 22, halign: 'right' },
            8: { cellWidth: 24, halign: 'right', fontStyle: 'bold' },
            9: { cellWidth: 18, halign: 'center' },
          },
          didParseCell: (data: any) => {
            if (data.section === 'body') {
              const isTotal = data.row.index === recoBody.length - 1
              if (isTotal) data.cell.styles.fontStyle = 'bold'
              if (data.column.index === 8 && !isTotal) {
                const row = mjData.rows[data.row.index]
                if (row) data.cell.styles.textColor = row.netOwing > 0 ? [220, 38, 38] : [22, 163, 74]
              }
              if (data.column.index === 9 && !isTotal) {
                const row = mjData.rows[data.row.index]
                if (row) data.cell.styles.textColor = row.status === 'ok' ? [22, 163, 74] : row.status === 'partial' ? [180, 120, 0] : [220, 38, 38]
              }
            }
          },
        })

        yPos = (doc as any).lastAutoTable.finalY + 8
      } else {
        doc.setFontSize(9)
        doc.setTextColor(150, 150, 150)
        doc.text('Aucune transaction avec juridiction fiscale pour cette période.', 15, yPos)
        yPos += 10
      }

      // Filing deadlines (if any)
      const rowsWithDeadlines = mjData.rows.filter(row => jurisdictionRates.find(r => r.country_code === row.country_code)?.filing_deadline_note)
      if (rowsWithDeadlines.length > 0) {
        if (yPos > 170) { doc.addPage(); yPos = await addPageHeader() }
        doc.setFontSize(9)
        doc.setTextColor(60, 60, 60)
        doc.setFont('helvetica', 'bold')
        doc.text('Échéances de déclaration', 15, yPos)
        doc.setFont('helvetica', 'normal')
        yPos += 3

        autoTable(doc, {
          startY: yPos,
          head: [['Pays', 'Échéances & obligations', 'Statut']],
          body: rowsWithDeadlines.map(row => {
            const rate = jurisdictionRates.find(r => r.country_code === row.country_code)
            return [
              `${row.flag} ${row.name}`,
              rate?.filing_deadline_note || '',
              row.status === 'ok' ? 'Réglé' : row.status === 'partial' ? 'Partiel' : 'À payer',
            ]
          }),
          theme: 'grid',
          margin: { left: 15, right: 15 },
          headStyles: { fillColor: [29, 78, 216], textColor: 255, fontStyle: 'bold', fontSize: 8 },
          bodyStyles: { fontSize: 8, cellPadding: 3 },
          columnStyles: { 0: { cellWidth: 30 }, 1: { cellWidth: 195 }, 2: { cellWidth: 22, halign: 'center' } },
          didParseCell: (data: any) => {
            if (data.section === 'body' && data.column.index === 2) {
              const row = rowsWithDeadlines[data.row.index]
              if (row) data.cell.styles.textColor = row.status === 'ok' ? [22, 163, 74] : row.status === 'partial' ? [180, 120, 0] : [220, 38, 38]
            }
          },
        })

        yPos = (doc as any).lastAutoTable.finalY + 8
      }

      // Canadian compliance notes
      if (yPos > 165) { doc.addPage(); yPos = await addPageHeader() }
      doc.setFontSize(9)
      doc.setTextColor(60, 60, 60)
      doc.setFont('helvetica', 'bold')
      doc.text('Conformité canadienne — Formulaires à remettre à votre CPA', 15, yPos)
      doc.setFont('helvetica', 'normal')
      yPos += 3

      const complianceRows: string[][] = [
        ['T1135', 'Bilan des avoirs étrangers', 'Obligatoire si actifs étrangers > 100 000 $ CAD. Échéance : 30 avril (ou 15 juin si T1 prolongé).'],
        ['T2209', 'Crédit impôt étranger fédéral', 'Réclamez l\'impôt payé à l\'étranger pour éviter la double imposition. Annexe T2209 jointe à votre T1.'],
      ]
      if (mjData.rows.some(r => r.country_code === 'US')) {
        complianceRows.push(['FIRPTA', 'Retenue à la vente (États-Unis)', '15% du prix de vente brut retenu à l\'acheteur. Récupérable via Form 1040-NR si impôt réel < 15%.'])
        complianceRows.push(['Net Basis Election', 'Schedule E (États-Unis)', 'Option : payer 30% sur le revenu NET après déductions. Très avantageux — discutez avec votre CPA.'])
      }
      if (mjData.rows.some(r => r.country_code === 'DO')) {
        complianceRows.push(['Confotur', 'Exonération fiscale DR', 'Exonération IR, IPI, transfert jusqu\'à 15 ans sur projets approuvés. Activer la case Confotur dans vos transactions DR.'])
      }

      autoTable(doc, {
        startY: yPos,
        head: [['Formulaire', 'Description', 'Notes']],
        body: complianceRows,
        theme: 'grid',
        margin: { left: 15, right: 15 },
        headStyles: { fillColor: [21, 128, 61], textColor: 255, fontStyle: 'bold', fontSize: 8 },
        bodyStyles: { fontSize: 7.5, cellPadding: 3 },
        columnStyles: { 0: { cellWidth: 32 }, 1: { cellWidth: 55 }, 2: { cellWidth: 160 } },
      })

      yPos = (doc as any).lastAutoTable.finalY + 6

      // CPA disclaimer
      doc.setFontSize(7)
      doc.setTextColor(160, 160, 160)
      doc.setFont('helvetica', 'italic')
      doc.text('⚠  Estimation à titre indicatif — Faire valider par un CPA avant toute déclaration fiscale.  |  Généré par CERDIA Investment Platform', 15, yPos)
      doc.setFont('helvetica', 'normal')

      doc.save(`rapport_multi_juridiction_${selectedYear}_${filterPeriod}_CERDIA.pdf`)
    } catch (e) {
      console.error(e)
      alert('Erreur lors de la génération du PDF')
    } finally {
      setGeneratingMJPDF(false)
    }
  }

  const t1135Data = calculateT1135Data()
  const t2209Data = calculateT2209Data()
  const firptaData = calculateFIRPTAData()
  const ccaData = calculateCCAData()

  // Check if T1135 is required (foreign assets > $100,000 CAD)
  const t1135Required = t1135Data.totalForeignAssets > 100000

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6 px-1 sm:px-0 max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 break-words">
            {t('taxReports.title')}
          </h3>
          <p className="text-xs sm:text-sm text-gray-600 mt-1 break-words">
            {t('taxReports.subtitle')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto flex-shrink-0">
          {/* Year */}
          <div className="flex items-center gap-1">
            <Calendar size={15} className="text-gray-400" />
            <select
              value={selectedYear}
              onChange={(e) => { setSelectedYear(Number(e.target.value)); setFilterPeriod('annual') }}
              className="px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {years.map(year => <option key={year} value={year}>{year}</option>)}
            </select>
          </div>
          {/* Period filter */}
          <div className="flex items-center gap-1">
            <Filter size={13} className="text-gray-400" />
            <select
              value={filterPeriod}
              onChange={(e) => setFilterPeriod(e.target.value)}
              className="px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="annual">{fr ? 'Annuel' : 'Annual'}</option>
              <optgroup label={fr ? '── Trimestre ──' : '── Quarter ──'}>
                <option value="Q1">Q1 (Jan–Mar)</option>
                <option value="Q2">Q2 (Avr–Jun)</option>
                <option value="Q3">Q3 (Jul–Sep)</option>
                <option value="Q4">Q4 (Oct–Déc)</option>
              </optgroup>
              <optgroup label={fr ? '── Mensuel ──' : '── Monthly ──'}>
                {(fr ? MONTH_NAMES_FR : MONTH_NAMES_EN).map((name, i) => (
                  <option key={i} value={`M${i + 1}`}>{name}</option>
                ))}
              </optgroup>
            </select>
          </div>
          {/* CSV Export */}
          <button
            onClick={exportToCSV}
            disabled={exportingCSV || filteredTransactions.length === 0}
            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            title={fr ? 'Exporter en CSV pour comptable' : 'Export CSV for accountant'}
          >
            <Download size={13} />
            CSV
          </button>
          {/* Share with accountant */}
          <button
            onClick={() => { setShareLink(''); setShowShareModal(true) }}
            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            title={fr ? 'Partager avec comptable' : 'Share with accountant'}
          >
            <Share2 size={13} />
            {fr ? 'Partager' : 'Share'}
          </button>
        </div>
      </div>

      {/* Share with accountant modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="bg-blue-600 text-white px-5 py-4 rounded-t-2xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Share2 size={18} />
                <h3 className="font-semibold">{fr ? 'Lien comptable sécurisé' : 'Secure accountant link'}</h3>
              </div>
              <button onClick={() => setShowShareModal(false)} className="text-blue-200 hover:text-white text-xl">×</button>
            </div>
            <div className="p-5 space-y-4">
              {!shareLink ? (<>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">{fr ? 'Libellé (pour votre suivi)' : 'Label (for your reference)'}</label>
                  <input
                    type="text"
                    value={shareLabel}
                    onChange={e => setShareLabel(e.target.value)}
                    placeholder={fr ? `Ex: Pour CPA Martin — T1 ${selectedYear}` : `E.g. For CPA Martin — T1 ${selectedYear}`}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">{fr ? 'Onglets accessibles' : 'Accessible tabs'}</label>
                  <div className="flex flex-col gap-2">
                    {[['transactions','📋 Transactions'],['rapports_fiscaux','📊 Rapports Fiscaux'],['livre_entreprise','📖 Livre Entreprise']].map(([val, label]) => (
                      <label key={val} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={shareTabs.includes(val)}
                          onChange={e => setShareTabs(prev => e.target.checked ? [...prev, val] : prev.filter(t => t !== val))}
                          className="rounded"
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">{fr ? `Expire dans (jours) : ${shareExpiry}` : `Expires in (days): ${shareExpiry}`}</label>
                  <input type="range" min={1} max={365} value={shareExpiry} onChange={e => setShareExpiry(parseInt(e.target.value))} className="w-full" />
                  <div className="flex justify-between text-xs text-gray-400 mt-1"><span>1j</span><span>30j</span><span>1 an</span></div>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                  ⚠️ {fr ? 'Le lien donne accès en LECTURE SEULE aux données sélectionnées. Partagez uniquement avec des personnes de confiance.' : 'The link gives READ-ONLY access to selected data. Share only with trusted persons.'}
                </div>
                <button
                  onClick={generateShareLink}
                  disabled={generatingShare || shareTabs.length === 0}
                  className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {generatingShare ? '⏳ Génération…' : (fr ? '🔗 Générer le lien' : '🔗 Generate link')}
                </button>
              </>) : (
                <div className="space-y-3">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
                    ✅ {fr ? 'Lien généré avec succès !' : 'Link generated successfully!'}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">{fr ? 'Lien à transmettre au comptable' : 'Link to send to accountant'}</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={shareLink}
                        className="flex-1 px-3 py-2 text-xs border border-gray-300 rounded-lg bg-gray-50 font-mono"
                      />
                      <button
                        onClick={() => { navigator.clipboard.writeText(shareLink); alert(fr ? 'Lien copié !' : 'Link copied!') }}
                        className="px-3 py-2 bg-gray-800 text-white rounded-lg text-xs hover:bg-gray-700"
                      >
                        {fr ? 'Copier' : 'Copy'}
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    {fr ? `Expire dans ${shareExpiry} jours · Lecture seule · Onglets : ${shareTabs.join(', ')}` : `Expires in ${shareExpiry} days · Read-only · Tabs: ${shareTabs.join(', ')}`}
                  </p>
                  <button onClick={() => { setShowShareModal(false); setShareLink('') }} className="w-full py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                    {fr ? 'Fermer' : 'Close'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Period banner */}
      {filterPeriod !== 'annual' && (
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
          <Filter size={14} />
          <span>{fr ? 'Filtre actif :' : 'Active filter:'} <strong>{getPeriodLabel()}</strong></span>
          <span className="text-blue-500">— {filteredTransactions.length} {fr ? 'transactions' : 'transactions'}</span>
          <button onClick={() => setFilterPeriod('annual')} className="ml-auto text-xs text-blue-600 hover:underline">{fr ? 'Effacer' : 'Clear'}</button>
        </div>
      )}

      {/* Report Tabs */}
      <div className="border-b border-gray-200 -mx-1 sm:mx-0 overflow-x-auto">
        <div className="flex gap-2 sm:gap-4 min-w-max px-1 sm:px-0">
          <button
            onClick={() => setActiveReport('T1135')}
            className={`px-3 sm:px-4 py-2 text-xs sm:text-sm md:text-base font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeReport === 'T1135'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            T1135 - {t('taxReports.foreignAssets')}
          </button>
          <button
            onClick={() => setActiveReport('T2209')}
            className={`px-3 sm:px-4 py-2 text-xs sm:text-sm md:text-base font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeReport === 'T2209'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            T2209 - {t('taxReports.foreignTaxCredits')}
          </button>
          <button
            onClick={() => setActiveReport('comptable')}
            className={`px-3 sm:px-4 py-2 text-xs sm:text-sm md:text-base font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeReport === 'comptable'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            📊 Rapport Comptable
          </button>
          <button
            onClick={() => setActiveReport('multi_juridiction')}
            className={`px-3 sm:px-4 py-2 text-xs sm:text-sm md:text-base font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeReport === 'multi_juridiction'
                ? 'border-amber-600 text-amber-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            🌎 Multi-Juridiction
          </button>
          <button
            onClick={() => setActiveReport('controle_cpa')}
            className={`px-3 sm:px-4 py-2 text-xs sm:text-sm md:text-base font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeReport === 'controle_cpa'
                ? 'border-rose-600 text-rose-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            🧾 {fr ? 'Contrôle CPA' : 'CPA Review'}
          </button>
        </div>
      </div>

      {/* T1135 Report */}
      {activeReport === 'T1135' && (
        <div className="space-y-4 sm:space-y-6">
          {/* Warning if required */}
          {t1135Required && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 sm:p-4">
              <p className="text-xs sm:text-sm md:text-base text-yellow-800 font-medium">
                ⚠️ {t('taxReports.t1135Required')}
              </p>
            </div>
          )}

          {/* T1135 — Méthode simplifiée vs détaillée */}
          {(() => {
            const isSimplified = t1135Data.totalForeignAssets < 250000
            return (
              <div className={`rounded-lg border p-3 flex items-center justify-between gap-3 ${isSimplified ? 'bg-teal-50 border-teal-200' : 'bg-amber-50 border-amber-200'}`}>
                <div>
                  <p className={`text-sm font-semibold ${isSimplified ? 'text-teal-800' : 'text-amber-800'}`}>
                    {isSimplified
                      ? '✅ Méthode simplifiée (Partie A) — Coût total < 250 000 $'
                      : '⚠️ Méthode détaillée requise (Partie B) — Coût total ≥ 250 000 $'}
                  </p>
                  <p className={`text-xs mt-0.5 ${isSimplified ? 'text-teal-600' : 'text-amber-700'}`}>
                    {isSimplified
                      ? `Coût total estimé : ${formatCurrency(t1135Data.totalForeignAssets)} — Formulaire T1135 Partie A (simplifié). Valeur max en tout temps de l'année.`
                      : `Coût total estimé : ${formatCurrency(t1135Data.totalForeignAssets)} — Formulaire T1135 Partie B obligatoire. Détail par propriété, par pays, revenus bruts et gains/pertes.`}
                  </p>
                </div>
                <span className={`shrink-0 px-2 py-1 text-xs font-bold rounded-full ${isSimplified ? 'bg-teal-100 text-teal-700' : 'bg-amber-100 text-amber-700'}`}>
                  {isSimplified ? 'Partie A' : 'Partie B'}
                </span>
              </div>
            )
          })()}

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
              <p className="text-xs sm:text-sm text-blue-700 mb-1 truncate">{t('taxReports.totalForeignAssets')}</p>
              <p className="text-lg sm:text-xl md:text-2xl font-bold text-blue-900 truncate">
                {formatCurrency(t1135Data.totalForeignAssets)}
              </p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4">
              <p className="text-xs sm:text-sm text-green-700 mb-1 truncate">{t('taxReports.foreignIncome')}</p>
              <p className="text-lg sm:text-xl md:text-2xl font-bold text-green-900 truncate">
                {formatCurrency(t1135Data.foreignIncome)}
              </p>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 sm:p-4">
              <p className="text-xs sm:text-sm text-purple-700 mb-1 truncate">{t('taxReports.foreignProperties')}</p>
              <p className="text-lg sm:text-xl md:text-2xl font-bold text-purple-900">
                {t1135Data.properties.length}
              </p>
            </div>
          </div>

          {/* Panneau données fiscales propriétés */}
          <PropertyFiscalPanel properties={properties as any} onSaved={fetchData} />

          {/* Taux de change utilisés */}
          <div className="flex flex-wrap gap-2 text-xs text-gray-500">
            <span className="font-medium text-gray-600">Taux BdC {selectedYear} :</span>
            {['USD','EUR','DOP','MXN'].map(cur => (
              <span key={cur} className="bg-gray-100 px-2 py-0.5 rounded">
                {cur}/CAD = {getExchangeRate(cur).toFixed(4)}
              </span>
            ))}
            <span className="text-gray-400 italic">(Banque du Canada — moyennes annuelles officielles)</span>
          </div>

          {/* Properties Table */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 bg-gray-50 border-b border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
              <h4 className="text-sm sm:text-base font-semibold text-gray-900 truncate">{t('taxReports.foreignPropertiesDetail')}</h4>
              <button
                onClick={exportT1135ToPDF}
                disabled={generatingPDF}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex-shrink-0 disabled:opacity-50"
              >
                <Download size={14} className="sm:w-[18px] sm:h-[18px]" />
                <span>{generatingPDF ? '⏳ Génération…' : (fr ? 'Exporter PDF' : 'Export PDF')}</span>
              </button>
            </div>

            {/* Mobile View: Cards */}
            <div className="md:hidden divide-y divide-gray-200">
              {t1135Data.properties.length === 0 ? (
                <div className="px-3 py-6 text-center text-xs text-gray-500">
                  {t('taxReports.noForeignAssets')}
                </div>
              ) : (
                t1135Data.properties.map((prop, index) => (
                  <div key={index} className="p-3 space-y-2">
                    <div className="font-medium text-sm text-gray-900 break-words">{prop.name}</div>
                    <div className="text-xs text-gray-600 break-words">{prop.location}</div>
                    <div className="text-xs text-gray-500">{prop.country}</div>
                    <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                      <span className="text-xs text-gray-600">{t('taxReports.originalCost')}:</span>
                      <span className="text-xs font-medium text-gray-900">{formatCurrency(prop.cost, prop.currency)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-600">{t('taxReports.costCAD')}:</span>
                      <span className="text-xs font-bold text-gray-900">{formatCurrency(prop.costCAD)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Desktop View: Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('projects.name')}</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('projects.location')}</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Cat.</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">{t('taxReports.originalCost')}</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                      Valeur CAD *
                      <span className="ml-1 text-amber-500" title="CRA exige juste valeur marchande">⚠</span>
                    </th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Évaluée</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {t1135Data.properties.map((prop: any, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{prop.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{prop.location}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 text-center">
                        <span className="bg-blue-100 text-blue-700 text-xs px-1.5 py-0.5 rounded">Cat. {prop.t1135Category}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right whitespace-nowrap">
                        {formatCurrency(prop.cost, prop.currency)}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-right whitespace-nowrap">
                        <span className={prop.hasValuation ? 'text-green-700' : 'text-amber-600'}>
                          {formatCurrency(prop.costCAD)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-sm">
                        {prop.hasValuation
                          ? <span title={`Évalué le ${prop.valuationDate}`} className="text-green-600">✅</span>
                          : <span title="Valeur marchande non renseignée — coût d'achat utilisé" className="text-amber-500">⚠️</span>}
                      </td>
                    </tr>
                  ))}
                  {t1135Data.properties.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500">
                        {t('taxReports.noForeignAssets')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* FIRPTA — Retenue à la vente USA */}
      {activeReport === 'T1135' && firptaData.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mt-4">
          <h4 className="text-sm font-bold text-red-800 flex items-center gap-2 mb-3">
            🇺🇸 FIRPTA — Retenue à la source sur ventes immobilières USA
            <span title="Foreign Investment in Real Property Tax Act : 15% du prix de vente brut est retenu par l'acheteur et remis à l'IRS. Form 8288 dans 20 jours suivant la clôture.">
              <Info size={13} className="text-red-400 cursor-help" />
            </span>
          </h4>
          <div className="space-y-3">
            {firptaData.map((f, i) => (
              <div key={i} className="bg-white border border-red-100 rounded-lg p-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{f.propertyName}</p>
                    <p className="text-xs text-gray-500">
                      Vendu le {f.saleDate ? new Date(f.saleDate).toLocaleDateString('fr-CA') : '—'}
                      {f.stateProvince ? ` · ${f.stateProvince}` : ''}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {f.form8288Submitted
                      ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Form 8288 ✅</span>
                      : <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Form 8288 ⚠️ Non soumis</span>
                    }
                    {f.withholdingRefunded &&
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Remboursé via 1040-NR ✅</span>
                    }
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-gray-50 rounded p-2">
                    <p className="text-gray-500">Prix de vente</p>
                    <p className="font-bold text-gray-900">{formatCurrency(f.salePriceUSD)} USD</p>
                  </div>
                  <div className="bg-red-50 rounded p-2">
                    <p className="text-gray-500">Retenue FIRPTA 15%</p>
                    <p className="font-bold text-red-700">{formatCurrency(f.withholdingAmountUSD)} USD</p>
                    <p className="text-gray-400">≈ {formatCurrency(f.withholdingAmountCAD)} CAD</p>
                  </div>
                  <div className="bg-amber-50 rounded p-2">
                    <p className="text-gray-500">Échéance Form 8288</p>
                    <p className="font-bold text-amber-700">{f.form8288Deadline ? new Date(f.form8288Deadline).toLocaleDateString('fr-CA') : '—'}</p>
                    <p className="text-gray-400 text-[10px]">20 jours après clôture</p>
                  </div>
                </div>
                <p className="text-xs text-red-600 mt-2">
                  💡 Si impôt réel &lt; retenue FIRPTA, réclamez le remboursement via Form 1040-NR. Discutez avec votre CPA américain.
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CCA / FNACC — Déduction pour amortissement (T1135) */}
      {activeReport === 'T1135' && ccaData.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mt-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-bold text-green-800 flex items-center gap-2">
              📊 CCA / FNACC — Déduction pour amortissement {selectedYear}
              <span title="La DPA (déduction pour amortissement) réduit votre revenu locatif imposable. Bâtiment = Class 1 (4%/an), ameublement = Class 8 (20%/an). Règle de la demi-année en année d'acquisition.">
                <Info size={13} className="text-green-400 cursor-help" />
              </span>
            </h4>
            <button
              onClick={saveCCAToDb}
              disabled={savingCCA}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              title="Sauvegarder le tableau CCA dans la base de données (table cca_schedule)"
            >
              {savingCCA ? '⏳' : '💾'} {savingCCA ? 'Sauvegarde...' : 'Sauvegarder en DB'}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-green-100 text-green-800">
                  <th className="px-3 py-2 text-left font-semibold">Propriété</th>
                  <th className="px-3 py-2 text-left font-semibold">Classe CCA</th>
                  <th className="px-3 py-2 text-right font-semibold">FNACC début</th>
                  <th className="px-3 py-2 text-right font-semibold">DPA {selectedYear}</th>
                  <th className="px-3 py-2 text-right font-semibold">FNACC fin</th>
                  <th className="px-3 py-2 text-center font-semibold">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-green-100">
                {ccaData.map((d, i) => (
                  <tr key={i} className="hover:bg-green-50">
                    <td className="px-3 py-2">
                      <p className="font-medium text-gray-900">{d.propertyName}</p>
                      <p className="text-gray-500">{d.location}</p>
                    </td>
                    <td className="px-3 py-2 text-gray-700">
                      {d.hasCcaClass
                        ? <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded">{d.ccaLabel}</span>
                        : <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded" title="Classe estimée — à confirmer avec votre CPA">⚠️ {d.ccaLabel}</span>
                      }
                    </td>
                    <td className="px-3 py-2 text-right text-gray-900">{formatCurrency(d.uccOpen)}</td>
                    <td className="px-3 py-2 text-right font-semibold text-green-700">
                      − {formatCurrency(d.ccaThisYear)}
                      {d.isFirstYear && <span className="block text-gray-400 font-normal text-[10px]">½ année d'acquisition</span>}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-700">{formatCurrency(d.uccClose)}</td>
                    <td className="px-3 py-2 text-center">
                      {d.countryCode !== 'CA' &&
                        <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                          {d.countryCode === 'US' ? '1040-NR' : d.countryCode}
                        </span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-green-100 font-semibold">
                  <td className="px-3 py-2 text-green-800" colSpan={3}>Total DPA estimée {selectedYear}</td>
                  <td className="px-3 py-2 text-right text-green-800">
                    − {formatCurrency(ccaData.reduce((s, d) => s + d.ccaThisYear, 0))}
                  </td>
                  <td className="px-3 py-2 text-right text-green-800">
                    {formatCurrency(ccaData.reduce((s, d) => s + d.uccClose, 0))}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="text-xs text-green-600 mt-2">
            💡 Terrain non amortissable (20% exclu). Classes confirmées par votre CPA — ces estimations sont calculées en décroissant depuis l'année d'acquisition.
            Configurez la classe CCA dans l'onglet Projets (édition de propriété).
          </p>
        </div>
      )}

      {/* T2209 Report */}
      {activeReport === 'T2209' && (
        <div className="space-y-4 sm:space-y-6">

          {/* Panneau revenu imposable canadien — plafond 15% ARC */}
          <div className="bg-white border border-blue-200 rounded-xl p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h4 className="text-sm font-semibold text-blue-900 flex items-center gap-1">
                  🍁 Plafond 15% ARC — Revenu imposable canadien {selectedYear}
                  <span title="CRA : crédit T2209 limité à 15% du revenu net étranger pour revenus de biens (loyers passifs). Carryforward 10 ans.">
                    <Info size={13} className="text-blue-400 cursor-help" />
                  </span>
                </h4>
                <p className="text-xs text-blue-600 mt-0.5">Requis pour calculer le plafond réel de crédit réclamable (ligne 40500 T2)</p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={saveFiscalYearSettings}
                  disabled={savingFiscalSettings}
                  className="text-xs px-2.5 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {savingFiscalSettings ? '⏳' : '💾 Sauver'}
                </button>
                <button
                  onClick={saveT2209ToHistory}
                  disabled={savingT2209History}
                  className="text-xs px-2.5 py-1.5 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50"
                  title="Sauvegarder l'historique annuel T2209 dans foreign_tax_credit_history"
                >
                  {savingT2209History ? '⏳' : '📋 Historique'}
                </button>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Revenu imposable canadien total (CAD)</label>
                <input
                  type="number"
                  value={canadianTaxableIncome || ''}
                  onChange={e => setCanadianTaxableIncome(e.target.value ? parseFloat(e.target.value) : 0)}
                  onBlur={saveFiscalYearSettings}
                  placeholder="Ex : 180 000"
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {canadianTaxableIncome > 0 && (() => {
                const d = t2209Data as any
                return (<>
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                    <p className="text-xs text-blue-600 mb-0.5">Plafond 15% (max crédit)</p>
                    <p className="text-base font-bold text-blue-900">{formatCurrency(d.plafond15 ?? 0)}</p>
                    <p className="text-xs text-blue-500">= {canadianTaxableIncome.toLocaleString('fr-CA')} × 15%</p>
                  </div>
                  <div className={`rounded-lg p-3 border ${d.carryforward > 0 ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-100'}`}>
                    <p className={`text-xs mb-0.5 ${d.carryforward > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                      {d.carryforward > 0 ? '⚠️ Crédit inutilisable (carryforward 10 ans)' : '✅ Crédit pleinement utilisable'}
                    </p>
                    <p className={`text-base font-bold ${d.carryforward > 0 ? 'text-amber-900' : 'text-green-900'}`}>
                      {d.carryforward > 0 ? formatCurrency(d.carryforward) : formatCurrency(d.usableCredit ?? 0)}
                    </p>
                    {d.carryforward > 0 && <p className="text-xs text-amber-600">Utilisable en ligne 40500 : {formatCurrency(d.usableCredit ?? 0)}</p>}
                  </div>
                </>)
              })()}
            </div>
            {canadianTaxableIncome === 0 && (
              <p className="mt-2 text-xs text-amber-600">⚠️ Sans revenu imposable canadien, le plafond 15% ne peut être calculé — crédit potentiellement surestimé.</p>
            )}
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
              <p className="text-xs sm:text-sm text-blue-700 mb-1 truncate">{t('taxReports.totalForeignIncome')}</p>
              <p className="text-lg sm:text-xl md:text-2xl font-bold text-blue-900 truncate">
                {formatCurrency(t2209Data.totalForeignIncome)}
              </p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4">
              <p className="text-xs sm:text-sm text-red-700 mb-1 truncate">{t('taxReports.totalForeignTaxPaid')}</p>
              <p className="text-lg sm:text-xl md:text-2xl font-bold text-red-900 truncate">
                {formatCurrency(t2209Data.totalForeignTaxPaid)}
              </p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4">
              <p className="text-xs sm:text-sm text-green-700 mb-1 truncate">{t('taxReports.totalTaxCredit')}</p>
              <p className="text-lg sm:text-xl md:text-2xl font-bold text-green-900 truncate">
                {formatCurrency(t2209Data.totalTaxCredit)}
              </p>
            </div>
          </div>

          {/* T2209 Carryback / Carryforward Panel */}
          {(() => {
            const d = t2209Data as any
            const carryforwardPrior = fiscalYearSettings?.t2209_carryforward_remaining ?? 0
            const savedCarrybackYear = fiscalYearSettings?.t2209_carryback_year
            const savedT1AdjSubmitted = fiscalYearSettings?.t1_adj_submitted
            return (
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 space-y-4">
                <h4 className="text-sm font-bold text-indigo-900 flex items-center gap-2">
                  🔄 Report T2209 — Carryforward / Carryback
                  <span title="Carryforward : crédits non utilisés reportés aux années suivantes (illimité). Carryback : crédits appliqués à des déclarations antérieures via formulaire T1-ADJ (3 ans max).">
                    <Info size={13} className="text-indigo-400 cursor-help" />
                  </span>
                </h4>

                {/* Résumé carryforward */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-white border border-indigo-100 rounded-lg p-3">
                    <p className="text-xs text-indigo-600 mb-0.5">Crédit utilisable {selectedYear}</p>
                    <p className="text-base font-bold text-indigo-900">{formatCurrency(d.usableCredit ?? 0)}</p>
                  </div>
                  <div className={`border rounded-lg p-3 ${(d.carryforward ?? 0) > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-indigo-100'}`}>
                    <p className={`text-xs mb-0.5 ${(d.carryforward ?? 0) > 0 ? 'text-amber-600' : 'text-indigo-600'}`}>Carryforward généré {selectedYear}</p>
                    <p className={`text-base font-bold ${(d.carryforward ?? 0) > 0 ? 'text-amber-800' : 'text-indigo-900'}`}>{formatCurrency(d.carryforward ?? 0)}</p>
                    {(d.carryforward ?? 0) > 0 && <p className="text-xs text-amber-500">Reporté aux années suivantes</p>}
                  </div>
                  <div className="bg-white border border-indigo-100 rounded-lg p-3">
                    <p className="text-xs text-indigo-600 mb-0.5">Carryforward d'années antérieures</p>
                    <p className="text-base font-bold text-indigo-900">{formatCurrency(carryforwardPrior)}</p>
                    {savedCarrybackYear && <p className="text-xs text-green-600">Carryback appliqué → {savedCarrybackYear}</p>}
                  </div>
                </div>

                {/* Formulaire carryback */}
                <div className="border-t border-indigo-200 pt-4">
                  <p className="text-xs font-semibold text-indigo-800 mb-3">
                    Appliquer un carryback (report rétrospectif — T1-ADJ)
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Année cible du carryback (N-1 à N-3)</label>
                      <select
                        value={t2209CarrybackYear || ''}
                        onChange={e => setT2209CarrybackYear(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg bg-white"
                      >
                        <option value="">— Sélectionner —</option>
                        {[selectedYear - 1, selectedYear - 2, selectedYear - 3].map(y => (
                          <option key={y} value={y}>{y} (N-{selectedYear - y})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Montant du carryback (CAD)</label>
                      <input
                        type="number"
                        value={t2209CarrybackAmount || ''}
                        onChange={e => setT2209CarrybackAmount(parseFloat(e.target.value) || 0)}
                        placeholder={`Max : ${formatCurrency(d.carryforward ?? 0)}`}
                        className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg"
                        min={0}
                        max={d.carryforward ?? 0}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">T1-ADJ soumis ?</label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={t1AdjSubmitted}
                          onChange={e => setT1AdjSubmitted(e.target.checked)}
                          className="w-4 h-4 text-indigo-600"
                        />
                        <span className="text-sm text-gray-700">Formulaire T1-ADJ soumis à l'ARC</span>
                      </label>
                    </div>
                    {t1AdjSubmitted && (
                      <>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Date de soumission</label>
                          <input
                            type="date"
                            value={t1AdjDate}
                            onChange={e => setT1AdjDate(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Référence ARC (optionnel)</label>
                          <input
                            type="text"
                            value={t1AdjRef}
                            onChange={e => setT1AdjRef(e.target.value)}
                            placeholder="Ex: XXXXX-XXXXXX"
                            className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg"
                          />
                        </div>
                      </>
                    )}
                  </div>
                  <button
                    onClick={saveT2209Carryback}
                    disabled={savingCarryback || (!t2209CarrybackYear && !t1AdjSubmitted)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {savingCarryback ? '⏳ Sauvegarde...' : '💾 Sauvegarder le carryback T2209'}
                  </button>
                  {savedCarrybackYear && savedT1AdjSubmitted && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                      ✅ T1-ADJ soumis — Carryback {selectedYear} → {savedCarrybackYear} enregistré
                    </div>
                  )}
                </div>
              </div>
            )
          })()}

          {/* By Country Table */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 bg-gray-50 border-b border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
              <h4 className="text-sm sm:text-base font-semibold text-gray-900 truncate">{t('taxReports.byCountry')}</h4>
              <button
                onClick={exportT2209ToPDF}
                disabled={generatingPDF}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex-shrink-0 disabled:opacity-50"
              >
                <Download size={14} className="sm:w-[18px] sm:h-[18px]" />
                <span>{generatingPDF ? '⏳ Génération…' : (fr ? 'Exporter PDF' : 'Export PDF')}</span>
              </button>
            </div>

            {/* Mobile View: Cards */}
            <div className="md:hidden divide-y divide-gray-200">
              {t2209Data.byCountry.length === 0 ? (
                <div className="px-3 py-6 text-center text-xs text-gray-500">
                  {t('taxReports.noForeignTaxData')}
                </div>
              ) : (
                t2209Data.byCountry.map((country, index) => (
                  <div key={index} className="p-3 space-y-2">
                    <div className="font-medium text-sm text-gray-900 mb-2">{country.country}</div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-600">{t('taxReports.foreignIncome')}:</span>
                      <span className="text-xs font-medium text-gray-900">{formatCurrency(country.income)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-600">{t('taxReports.taxPaid')}:</span>
                      <span className="text-xs font-medium text-gray-900">{formatCurrency(country.taxPaid)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                      <span className="text-xs text-gray-600">{t('taxReports.taxCredit')}:</span>
                      <span className="text-xs font-bold text-green-600">{formatCurrency(country.taxCredit)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Desktop View: Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('taxReports.country')}</th>
                    <th className="px-4 md:px-6 py-2 sm:py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('taxReports.foreignIncome')}</th>
                    <th className="px-4 md:px-6 py-2 sm:py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('taxReports.taxPaid')}</th>
                    <th className="px-4 md:px-6 py-2 sm:py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('taxReports.taxCredit')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {t2209Data.byCountry.map((country, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 md:px-6 py-3 sm:py-4 text-sm font-medium text-gray-900">{country.country}</td>
                      <td className="px-4 md:px-6 py-3 sm:py-4 text-sm text-gray-900 text-right whitespace-nowrap">
                        {formatCurrency(country.income)}
                      </td>
                      <td className="px-4 md:px-6 py-3 sm:py-4 text-sm text-gray-900 text-right whitespace-nowrap">
                        {formatCurrency(country.taxPaid)}
                      </td>
                      <td className="px-4 md:px-6 py-3 sm:py-4 text-sm font-medium text-green-600 text-right whitespace-nowrap">
                        {formatCurrency(country.taxCredit)}
                      </td>
                    </tr>
                  ))}
                  {t2209Data.byCountry.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-500">
                        {t('taxReports.noForeignTaxData')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      {/* Rapport Comptable */}
      {activeReport === 'comptable' && (
        <div className="space-y-4 sm:space-y-6">
          {/* Header + Export */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <h4 className="text-base font-semibold text-gray-900">Rapport Comptable</h4>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500"
              >
                {years.map(year => <option key={year} value={year}>{year}</option>)}
              </select>
              <button
                onClick={fetchData}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                title={language === 'fr' ? 'Recharger les donnees' : 'Reload data'}
              >
                <Calendar size={14} className={loading ? 'animate-spin' : ''} />
                {loading ? 'Chargement...' : 'Actualiser'}
              </button>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={generateComptablePDF}
                disabled={generatingPDF || loading}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                <Download size={16} />
                {generatingPDF ? 'Génération...' : 'Exporter PDF'}
              </button>
              <button
                onClick={generateComptableCSV}
                disabled={loading}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-white text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                title={language === 'fr' ? 'Export CSV brut pour import comptable' : 'Raw CSV export for accounting import'}
              >
                <FileText size={14} />
                CSV
              </button>
            </div>
          </div>
          {loading && (
            <div className="text-center py-8 text-sm text-gray-500">Chargement des transactions...</div>
          )}

          {/* Résumé rapide */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {FISCAL_GROUPS.map(group => {
              const total = transactions
                .filter(t => group.cats.includes(t.fiscal_category || ''))
                .reduce((sum, t) => sum + t.amount, 0)
              const colorMap: Record<string, string> = {
                green: 'bg-green-50 border-green-200 text-green-700 text-green-900',
                blue: 'bg-blue-50 border-blue-200 text-blue-700 text-blue-900',
                orange: 'bg-orange-50 border-orange-200 text-orange-700 text-orange-900',
                purple: 'bg-purple-50 border-purple-200 text-purple-700 text-purple-900',
                red: 'bg-red-50 border-red-200 text-red-700 text-red-900',
              }
              const [bg, border, labelColor, amtColor] = (colorMap[group.color] ?? colorMap.blue).split(' ')
              return (
                <div key={group.label} className={`${bg} border ${border} rounded-lg p-3`}>
                  <p className={`text-xs font-medium ${labelColor} mb-1 leading-tight`}>{group.label.split('—')[0].trim()}</p>
                  <p className={`text-base font-bold ${amtColor}`}>
                    {formatCurrency(total)}
                  </p>
                </div>
              )
            })}
          </div>

          {/* Groupes */}
          {FISCAL_GROUPS.map(group => {
            const txs = transactions
              .filter(t => group.cats.includes(t.fiscal_category || ''))
              .sort((a, b) => a.date.localeCompare(b.date))
            if (txs.length === 0) return null
            const groupTotal = txs.reduce((sum, t) => sum + t.amount, 0)
            const borderColor = ({ green: 'border-green-300', blue: 'border-blue-300', orange: 'border-orange-300', purple: 'border-purple-300', red: 'border-red-300' } as Record<string,string>)[group.color] ?? 'border-gray-300'
            const headerBg = ({ green: 'bg-green-50', blue: 'bg-blue-50', orange: 'bg-orange-50', purple: 'bg-purple-50', red: 'bg-red-50' } as Record<string,string>)[group.color] ?? 'bg-gray-50'

            return (
              <div key={group.label} className={`border ${borderColor} rounded-lg overflow-hidden`}>
                <div className={`${headerBg} px-4 py-3 flex items-center justify-between`}>
                  <h5 className="text-sm font-semibold text-gray-800">{group.label}</h5>
                  <span className="text-sm font-bold text-gray-900">{formatCurrency(groupTotal)}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wide">Date</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wide">Catégorie</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wide">Propriété</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wide">Description</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wide">Vendeur</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase tracking-wide">Montant</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wide">Pièce jointe</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {txs.map(tx => {
                        const prop = properties.find(p => p.id === tx.property_id)
                        return (
                          <tr key={tx.id} className="hover:bg-gray-50">
                            <td className="px-3 py-2 whitespace-nowrap text-gray-700">{tx.date}</td>
                            <td className="px-3 py-2 text-gray-600">{FISCAL_LABELS[tx.fiscal_category || ''] || '—'}</td>
                            <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{prop?.name || '—'}</td>
                            <td className="px-3 py-2 text-gray-800 max-w-[200px] truncate" title={tx.description}>{tx.description}</td>
                            <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{tx.vendor_name || '—'}</td>
                            <td className="px-3 py-2 text-right font-medium text-gray-900 whitespace-nowrap">{formatCurrency(tx.amount)}</td>
                            <td className="px-3 py-2">
                              {tx.attachment_url ? (
                                <a
                                  href={tx.attachment_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline whitespace-nowrap"
                                >
                                  <ExternalLink size={11} />
                                  {tx.attachment_name || 'Voir'}
                                </a>
                              ) : (
                                <span className="text-gray-300">—</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}

          {/* Sans catégorie */}
          {(() => {
            const uncategorized = filteredTransactions.filter(t => !allCategorized.includes(t.fiscal_category || ''))
            if (uncategorized.length === 0) return null
            return (
              <div className="border border-gray-300 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 flex items-center justify-between">
                  <h5 className="text-sm font-semibold text-gray-600">⚠️ Sans catégorie fiscale ({uncategorized.length})</h5>
                  <span className="text-xs text-gray-400">À catégoriser avant envoi au comptable</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">Type</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">Description</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">Montant</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">Pièce jointe</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {uncategorized.map(tx => (
                        <tr key={tx.id} className="hover:bg-yellow-50">
                          <td className="px-3 py-2 whitespace-nowrap text-gray-700">{tx.date}</td>
                          <td className="px-3 py-2 text-gray-600">{tx.type}</td>
                          <td className="px-3 py-2 text-gray-800 max-w-[200px] truncate">{tx.description}</td>
                          <td className="px-3 py-2 text-right font-medium text-gray-900 whitespace-nowrap">{formatCurrency(tx.amount)}</td>
                          <td className="px-3 py-2">
                            {tx.attachment_url ? (
                              <a href={tx.attachment_url} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline">
                                <ExternalLink size={11} />
                                {tx.attachment_name || 'Voir'}
                              </a>
                            ) : <span className="text-gray-300">—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })()}
        </div>
      )}

      {/* Multi-Juridiction Report */}
      {activeReport === 'multi_juridiction' && (() => {
        const mjData = calculateMultiJurisdictionData()
        return (
          <div className="space-y-5">

            {/* Summary cards — 6 KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                <p className="text-xs text-green-700 mb-1">{fr ? 'Revenu brut tracé' : 'Tracked gross income'}</p>
                <p className="text-base font-bold text-green-900">{formatCurrency(mjData.rows.reduce((s, r) => s + r.totalGross, 0))}</p>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="text-xs text-amber-700 mb-1">{fr ? 'Taxe de vente / TVA' : 'Sales tax / VAT'}</p>
                <p className="text-base font-bold text-amber-900">{formatCurrency(mjData.totalSalesTax)}</p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                <p className="text-xs text-blue-700 mb-1">{fr ? 'Impôt État/Province' : 'State/Province tax'}</p>
                <p className="text-base font-bold text-blue-900">{formatCurrency(mjData.totalStateTax)}</p>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-3">
                <p className="text-xs text-purple-700 mb-1">{fr ? 'Retenue fédérale NR' : 'Federal NR withholding'}</p>
                <p className="text-base font-bold text-purple-900">{formatCurrency(mjData.totalFederalWithholding)}</p>
              </div>
              <div className="bg-gray-100 border border-gray-300 rounded-xl p-3">
                <p className="text-xs text-gray-600 mb-1">{fr ? 'Total estimé dû' : 'Total estimated due'}</p>
                <p className="text-base font-bold text-gray-900">{formatCurrency(mjData.totalTax)}</p>
              </div>
              <div className={`rounded-xl p-3 border ${mjData.totalNetOwing > 0 ? 'bg-red-50 border-red-300' : 'bg-green-50 border-green-300'}`}>
                <p className={`text-xs mb-1 ${mjData.totalNetOwing > 0 ? 'text-red-700' : 'text-green-700'}`}>{fr ? '⚠️ Solde à payer' : '⚠️ Balance owing'}</p>
                <p className={`text-base font-bold ${mjData.totalNetOwing > 0 ? 'text-red-900' : 'text-green-900'}`}>{formatCurrency(mjData.totalNetOwing)}</p>
              </div>
            </div>

            {/* Compliance warning — foreign transactions without jurisdiction */}
            {mjData.uncovered.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-300 rounded-xl p-4 flex gap-3">
                <span className="text-yellow-600 text-xl flex-shrink-0">⚠️</span>
                <div>
                  <p className="text-sm font-semibold text-yellow-900">
                    {mjData.uncovered.length} {fr ? 'transaction(s) en devise étrangère sans juridiction fiscale' : 'foreign-currency transaction(s) without tax jurisdiction'}
                  </p>
                  <p className="text-xs text-yellow-700 mt-1">
                    {fr ? 'Ouvrez chaque transaction et sélectionnez le pays — sinon ces obligations ne seront pas tracées.' : 'Open each transaction and select the country — otherwise these obligations will not be tracked.'}
                  </p>
                  <ul className="mt-2 space-y-0.5">
                    {mjData.uncovered.slice(0, 4).map((t: any) => (
                      <li key={t.id} className="text-xs text-yellow-800">• {t.date} · {t.description} · {formatCurrency(t.amount)} ({t.source_currency})</li>
                    ))}
                    {mjData.uncovered.length > 4 && <li className="text-xs text-yellow-600 italic">+{mjData.uncovered.length - 4} autres…</li>}
                  </ul>
                </div>
              </div>
            )}

            {mjData.rows.length === 0 ? (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center space-y-2">
                <p className="text-sm font-medium text-gray-600">{fr ? 'Aucune transaction avec juridiction fiscale pour cette année.' : 'No transactions with tax jurisdiction for this year.'}</p>
                <p className="text-xs text-gray-400">{fr ? 'Dans le formulaire de transaction → Fiscalité Internationale → sélectionnez le pays.' : 'In transaction form → International Taxation → select the country.'}</p>
              </div>
            ) : (<>

              {/* Reconciliation table per country */}
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="bg-gray-800 text-white px-4 py-3 flex items-center justify-between">
                  <h4 className="text-sm font-semibold">🔄 {fr ? 'Réconciliation fiscale par pays' : 'Tax reconciliation by country'} — {selectedYear}</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">{fr ? 'Estimé vs retenu/remis' : 'Estimated vs withheld/remitted'}</span>
                    <button
                      onClick={exportMultiJuridictionPDF}
                      disabled={generatingMJPDF}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs bg-white/10 hover:bg-white/20 text-white rounded-lg border border-white/20 transition-colors disabled:opacity-50"
                      title={fr ? 'Exporter PDF multi-juridiction' : 'Export multi-jurisdiction PDF'}
                    >
                      <Download size={12} />
                      {generatingMJPDF ? '⏳' : 'PDF'}
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200 text-xs">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">{fr ? 'Pays' : 'Country'}</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">{fr ? 'Revenu brut' : 'Gross'}</th>
                        <th className="px-3 py-2 text-right font-medium text-amber-600 uppercase">{fr ? 'Taxe vente' : 'Sales tax'}</th>
                        <th className="px-3 py-2 text-right font-medium text-blue-600 uppercase">{fr ? 'Impôt État' : 'State tax'}</th>
                        <th className="px-3 py-2 text-right font-medium text-purple-600 uppercase">{fr ? 'Retenue NR' : 'Withholding'}</th>
                        <th className="px-3 py-2 text-right font-medium text-rose-600 uppercase">IRNR RD</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-700 uppercase">{fr ? 'Total estimé' : 'Estimated'}</th>
                        <th className="px-3 py-2 text-right font-medium text-green-600 uppercase">{fr ? 'Déjà retenu' : 'Withheld'}</th>
                        <th className="px-3 py-2 text-right font-medium text-teal-600 uppercase">{fr ? 'Remis' : 'Remitted'}</th>
                        <th className="px-3 py-2 text-right font-medium text-red-600 uppercase">{fr ? 'Solde dû' : 'Owing'}</th>
                        <th className="px-3 py-2 text-center font-medium text-gray-500 uppercase">{fr ? 'Statut' : 'Status'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {mjData.rows.map(row => (
                        <tr key={row.country_code} className="hover:bg-gray-50">
                          <td className="px-3 py-3 font-medium text-gray-900 whitespace-nowrap">{row.flag} {row.name}</td>
                          <td className="px-3 py-3 text-right text-gray-600 whitespace-nowrap">{formatCurrency(row.totalGross)}</td>
                          <td className="px-3 py-3 text-right text-amber-700 whitespace-nowrap">{row.totalSalesTax > 0 ? formatCurrency(row.totalSalesTax) : <span className="text-gray-300">—</span>}</td>
                          <td className="px-3 py-3 text-right text-blue-700 whitespace-nowrap">{row.totalStateTax > 0 ? formatCurrency(row.totalStateTax) : <span className="text-gray-300">—</span>}</td>
                          <td className="px-3 py-3 text-right text-purple-700 whitespace-nowrap">{row.totalFederalWithholding > 0 ? formatCurrency(row.totalFederalWithholding) : <span className="text-gray-300">—</span>}</td>
                          <td className="px-3 py-3 text-right text-rose-700 whitespace-nowrap">
                            {(row as any).irnrEstimated > 0 ? (
                              <span title="IRNR 27% — Impuesto sobre la Renta No Residentes (RD)">{formatCurrency((row as any).irnrEstimated)}</span>
                            ) : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="px-3 py-3 text-right font-semibold text-gray-900 whitespace-nowrap">{formatCurrency(row.totalTax)}</td>
                          <td className="px-3 py-3 text-right text-green-700 whitespace-nowrap">{row.alreadyWithheld > 0 ? formatCurrency(row.alreadyWithheld) : <span className="text-gray-300">—</span>}</td>
                          <td className="px-3 py-3 text-right text-teal-700 whitespace-nowrap">{row.alreadyRemitted > 0 ? formatCurrency(row.alreadyRemitted) : <span className="text-gray-300">—</span>}</td>
                          <td className="px-3 py-3 text-right font-bold whitespace-nowrap" style={{ color: row.netOwing > 0 ? '#dc2626' : '#16a34a' }}>
                            {formatCurrency(row.netOwing)}
                          </td>
                          <td className="px-3 py-3 text-center text-lg">
                            {row.status === 'ok' ? '✅' : row.status === 'partial' ? '🟡' : '🔴'}
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-gray-100 font-bold text-xs">
                        <td className="px-3 py-2 text-gray-900">TOTAL</td>
                        <td className="px-3 py-2 text-right text-gray-700">{formatCurrency(mjData.rows.reduce((s, r) => s + r.totalGross, 0))}</td>
                        <td className="px-3 py-2 text-right text-amber-800">{formatCurrency(mjData.totalSalesTax)}</td>
                        <td className="px-3 py-2 text-right text-blue-800">{formatCurrency(mjData.totalStateTax)}</td>
                        <td className="px-3 py-2 text-right text-purple-800">{formatCurrency(mjData.totalFederalWithholding)}</td>
                        <td className="px-3 py-2 text-right text-rose-800">{formatCurrency(mjData.rows.reduce((s, r) => s + ((r as any).irnrEstimated ?? 0), 0))}</td>
                        <td className="px-3 py-2 text-right text-gray-900">{formatCurrency(mjData.totalTax)}</td>
                        <td className="px-3 py-2 text-right text-green-800">{formatCurrency(mjData.totalAlreadyWithheld)}</td>
                        <td className="px-3 py-2 text-right text-teal-800">{formatCurrency(mjData.totalAlreadyRemitted)}</td>
                        <td className="px-3 py-2 text-right" style={{ color: mjData.totalNetOwing > 0 ? '#dc2626' : '#16a34a' }}>{formatCurrency(mjData.totalNetOwing)}</td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-500 flex gap-4">
                  <span>✅ = {fr ? 'Réglé' : 'Settled'}</span>
                  <span>🟡 = {fr ? 'Partiellement payé' : 'Partially paid'}</span>
                  <span>🔴 = {fr ? 'Montant dû' : 'Amount owing'}</span>
                  <span className="ml-2 text-teal-600">{fr ? '« Déjà retenu » = impôt prélevé par le payeur avant remise' : '"Withheld" = tax deducted by payer before remitting'}</span>
                </div>
              </div>

              {/* How to record a tax payment */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <h5 className="text-sm font-semibold text-blue-900 mb-2">
                  💡 {fr ? 'Comment enregistrer un paiement de taxe ?' : 'How to record a tax payment?'}
                </h5>
                <div className="text-xs text-blue-800 space-y-1">
                  <p>1. {fr ? 'Créez une transaction DÉPENSE' : 'Create an EXPENSE transaction'}</p>
                  <p>2. {fr ? 'Catégorie fiscale → « Remises Fiscales » → choisissez le type' : 'Fiscal category → « Tax Remittances » → choose the type'}</p>
                  <p>3. {fr ? 'Pays → même pays que le revenu correspondant' : 'Country → same country as the corresponding income'}</p>
                  <p>4. {fr ? 'Le Solde dû ci-dessus se mettra à jour automatiquement' : 'The Balance owing above will update automatically'}</p>
                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-1 text-blue-700">
                    <span className="bg-blue-100 rounded px-2 py-1">🧾 Remise taxe de vente → FL: DR-15 mensuel</span>
                    <span className="bg-blue-100 rounded px-2 py-1">🏛️ Remise impôt NR → IRS Form 1040-NR / ARC T1</span>
                    <span className="bg-blue-100 rounded px-2 py-1">🏦 Remise retenue source → IRS 1042-S / ARC NR4</span>
                  </div>
                </div>
              </div>

              {/* Filing deadlines */}
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="bg-blue-700 text-white px-4 py-3">
                  <h4 className="text-sm font-semibold">📅 {fr ? 'Échéances de déclaration' : 'Filing deadlines'} — {selectedYear}</h4>
                </div>
                <div className="divide-y divide-gray-100">
                  {mjData.rows.map(row => {
                    const rate = jurisdictionRates.find(r => r.country_code === row.country_code)
                    if (!rate?.filing_deadline_note) return null
                    return (
                      <div key={row.country_code} className="px-4 py-3 flex items-start gap-3">
                        <span className="text-2xl flex-shrink-0">{row.flag}</span>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-900">{row.name}</p>
                          <p className="text-xs text-gray-600 mt-0.5">{rate.filing_deadline_note}</p>
                        </div>
                        <span className={`text-xs font-medium px-2 py-1 rounded-full flex-shrink-0 ${row.status === 'ok' ? 'bg-green-100 text-green-700' : row.status === 'partial' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                          {row.status === 'ok' ? (fr ? 'Réglé' : 'Settled') : row.status === 'partial' ? (fr ? 'Partiel' : 'Partial') : (fr ? 'À payer' : 'Owing')}
                        </span>
                      </div>
                    )
                  })}
                  {mjData.rows.every(row => !jurisdictionRates.find(r => r.country_code === row.country_code)?.filing_deadline_note) && (
                    <p className="px-4 py-4 text-sm text-gray-400 text-center">{fr ? 'Aucune échéance disponible — migrations 192-193 à exécuter dans Supabase.' : 'No deadlines available — run migrations 192-193 in Supabase.'}</p>
                  )}
                </div>
              </div>

              {/* Canadian compliance guide */}
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="bg-emerald-700 text-white px-4 py-3">
                  <h4 className="text-sm font-semibold">🍁 {fr ? 'Conformité canadienne — Formulaires à remettre à votre CPA' : 'Canadian compliance — Forms to provide to your CPA'}</h4>
                </div>
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="border border-gray-200 rounded-lg p-3 space-y-1">
                    <p className="font-semibold text-gray-900">📋 T1135 — Bilan des avoirs étrangers</p>
                    <p className="text-gray-600">{fr ? 'Obligatoire si actifs étrangers > 100 000 $ CAD' : 'Required if foreign assets > $100K CAD'}</p>
                    <p className="text-gray-500">{fr ? 'Échéance : 30 avril (ou 15 juin si T1 prolongé)' : 'Deadline: April 30 (or June 15 if T1 extended)'}</p>
                  </div>
                  <div className="border border-gray-200 rounded-lg p-3 space-y-1">
                    <p className="font-semibold text-gray-900">📋 T2209 — Crédit impôt étranger fédéral</p>
                    <p className="text-gray-600">{fr ? 'Réclamez l\'impôt payé à l\'étranger pour éviter la double imposition' : 'Claim foreign tax paid to avoid double taxation'}</p>
                    <p className="text-gray-500">{fr ? 'Annexe T2209 jointe à votre T1' : 'Schedule T2209 attached to your T1'}</p>
                  </div>
                  {mjData.rows.some(r => r.country_code === 'US') && (
                    <div className="border border-blue-200 rounded-lg p-3 space-y-1 bg-blue-50">
                      <p className="font-semibold text-blue-900">🇺🇸 FIRPTA — Retenue à la vente (États-Unis)</p>
                      <p className="text-blue-700">{fr ? '15% du prix de vente brut retenu à l\'acheteur' : '15% of gross sale price withheld by buyer'}</p>
                      <p className="text-blue-600">{fr ? 'Récupérable via Form 1040-NR si impôt réel < 15%' : 'Recoverable via Form 1040-NR if actual tax < 15%'}</p>
                    </div>
                  )}
                  {mjData.rows.some(r => r.country_code === 'US') && (
                    <div className="border border-blue-200 rounded-lg p-3 space-y-1 bg-blue-50">
                      <p className="font-semibold text-blue-900">🇺🇸 Net Basis Election (Schedule E)</p>
                      <p className="text-blue-700">{fr ? 'Option : payer 30% sur le revenu NET (après déductions) au lieu du brut' : 'Option: pay 30% on NET income (after deductions) instead of gross'}</p>
                      <p className="text-blue-600">{fr ? 'Très avantageux — discutez avec votre CPA' : 'Very advantageous — discuss with your CPA'}</p>
                    </div>
                  )}
                  {mjData.rows.some(r => r.country_code === 'DO') && (
                    <div className="border border-green-200 rounded-lg p-3 space-y-1 bg-green-50">
                      <p className="font-semibold text-green-900">🇩🇴 Confotur — Exonération fiscale DR</p>
                      <p className="text-green-700">{fr ? 'Exonération IR, IPI, transfert jusqu\'à 15 ans sur projets approuvés' : 'Exemption from income tax, IPI, transfer for up to 15 years'}</p>
                      <p className="text-green-600">{fr ? 'Activer la case Confotur dans vos transactions locatives DR' : 'Enable the Confotur checkbox in your DR rental transactions'}</p>
                    </div>
                  )}
                </div>
              </div>

            </>)}

            <p className="text-xs text-gray-400 italic text-center">
              ⚠️ {fr ? 'Estimation à titre indicatif — faire valider par un CPA avant toute déclaration fiscale.' : 'Indicative estimates — validate with a CPA before filing.'}
            </p>
          </div>
        )
      })()}

      {activeReport === 'controle_cpa' && (() => {
        const items = buildCPAReviewItems()
        const bySeverity = (sev: string) => items.filter(i => i.severity === sev)
        const sevStyle: Record<string, { bg: string; border: string; text: string; label: string }> = {
          action:  { bg: 'bg-red-50',    border: 'border-red-200',    text: 'text-red-800',    label: fr ? 'À valider — action' : 'To validate — action' },
          limite:  { bg: 'bg-amber-50',  border: 'border-amber-200',  text: 'text-amber-800',  label: fr ? 'Limite connue' : 'Known limitation' },
          info:    { bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-800',   label: 'Information' },
        }
        return (
          <div className="space-y-5">
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-3">
              <span className="text-2xl flex-shrink-0">🧾</span>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-rose-900">
                  {fr ? 'Contrôle fiscal — Document de revue pour votre comptable (CPA)' : 'Tax control — Review document for your accountant (CPA)'}
                </h3>
                <p className="text-xs text-rose-700 mt-1">
                  {fr
                    ? 'Cette page liste les points à faire VALIDER par un fiscaliste avant toute déclaration. Les montants de l\'app sont des ESTIMATIONS de planification, pas des déclarations officielles. Exportez le PDF et transmettez-le à votre CPA.'
                    : 'This page lists items to be VALIDATED by a tax professional before filing. The app figures are planning ESTIMATES, not official filings. Export the PDF and send it to your CPA.'}
                </p>
              </div>
              <button
                onClick={exportCPAReviewPDF}
                disabled={generatingCPAReview}
                className="flex items-center gap-1.5 px-3 py-2 text-xs bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors disabled:opacity-50 flex-shrink-0"
              >
                <Download size={13} />
                {generatingCPAReview ? '⏳' : (fr ? 'Exporter PDF CPA' : 'Export CPA PDF')}
              </button>
            </div>

            {(['action', 'limite', 'info'] as const).map(sev => {
              const list = bySeverity(sev)
              if (list.length === 0) return null
              const st = sevStyle[sev]
              return (
                <div key={sev} className="space-y-2">
                  <h4 className={`text-xs font-bold uppercase tracking-wide ${st.text}`}>{st.label} ({list.length})</h4>
                  {list.map((it, idx) => (
                    <div key={idx} className={`${st.bg} ${st.border} border rounded-xl p-3`}>
                      <p className={`text-sm font-semibold ${st.text}`}>{it.title}</p>
                      <p className="text-xs text-gray-600 mt-1">{it.detail}</p>
                      {it.question && (
                        <p className="text-xs text-gray-800 mt-1.5 italic">❓ {it.question}</p>
                      )}
                    </div>
                  ))}
                </div>
              )
            })}

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-xs text-gray-500">
              {fr
                ? 'CERDIA SEC — Document généré automatiquement. Les taux fiscaux (IRNR 27 %, ITBIS 18 %, FIRPTA 15 %, TDT 5-6 %, T2209 15 %, seuil T1135 100 000 $) sont préchargés et doivent être confirmés à la date de la déclaration. Aucune responsabilité fiscale n\'est assumée par l\'outil.'
                : 'CERDIA SEC — Auto-generated document. Tax rates are preloaded and must be confirmed as of filing date. The tool assumes no tax liability.'}
            </div>
          </div>
        )
      })()}
    </div>
  )
}
