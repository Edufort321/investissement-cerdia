'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/contexts/LanguageContext'
import { useOrganization } from '@/contexts/OrganizationContext'
import { FileText, Download, Calendar, ExternalLink, Filter, Share2 } from 'lucide-react'
import jsPDF from 'jspdf'

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
  const [activeReport, setActiveReport] = useState<'T1135' | 'T2209' | 'comptable' | 'multi_juridiction'>('T1135')
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

      const { data: transData, error: transError } = await supabase
        .from('transactions')
        .select('*')
        .eq('organization_id', orgId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true })

      if (transError) throw transError

      const { data: propData, error: propError } = await supabase
        .from('properties')
        .select('*')
        .eq('organization_id', orgId)

      if (propError) throw propError

      setTransactions(transData || [])
      setProperties(propData || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateT1135Data = (): T1135Data => {
    const foreignProperties = properties.filter(p => p.currency && p.currency !== 'CAD')
    const totalForeignAssets = foreignProperties.reduce((sum, prop) => {
      const exchangeRate = getExchangeRate(prop.currency, 'CAD')
      return sum + (prop.total_cost * exchangeRate)
    }, 0)
    const foreignIncome = filteredTransactions
      .filter(t => t.type === 'dividende' && t.source_currency && t.source_currency !== 'CAD')
      .reduce((sum, t) => sum + (t.amount || 0), 0)

    return {
      year: selectedYear,
      totalForeignAssets,
      properties: foreignProperties.map(p => ({
        name: p.name,
        location: p.location,
        country: extractCountry(p.location),
        cost: p.total_cost,
        currency: p.currency,
        costCAD: p.total_cost * getExchangeRate(p.currency, 'CAD')
      })),
      foreignIncome,
      foreignGains: 0 // Would need additional data for capital gains
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

    return {
      year: selectedYear,
      totalForeignIncome: byCountryArray.reduce((sum, c) => sum + c.income, 0),
      totalForeignTaxPaid: byCountryArray.reduce((sum, c) => sum + c.taxPaid, 0),
      totalTaxCredit: byCountryArray.reduce((sum, c) => sum + c.taxCredit, 0),
      byCountry: byCountryArray
    }
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
    const revenueByCountry = new Map<string, {
      transactionCount: number
      totalSalesTax: number
      totalStateTax: number
      totalFederalWithholding: number
      totalGross: number
      alreadyWithheld: number  // foreign_tax_paid on revenue transactions (withheld by payer)
    }>()

    filteredTransactions.forEach((t: any) => {
      if (!t.tax_country) return
      const key = t.tax_country as string
      const cur = revenueByCountry.get(key) || {
        transactionCount: 0, totalSalesTax: 0, totalStateTax: 0, totalFederalWithholding: 0, totalGross: 0, alreadyWithheld: 0,
      }
      revenueByCountry.set(key, {
        transactionCount: cur.transactionCount + 1,
        totalSalesTax: cur.totalSalesTax + (Number(t.sales_tax_amount) || 0),
        totalStateTax: cur.totalStateTax + (Number(t.state_income_tax_amt) || 0),
        totalFederalWithholding: cur.totalFederalWithholding + (Number(t.federal_withholding) || 0),
        totalGross: cur.totalGross + (Number(t.amount) || 0),
        alreadyWithheld: cur.alreadyWithheld + (Number(t.foreign_tax_paid) || 0),
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
      const totalTaxEstimated = data.totalSalesTax + data.totalStateTax + data.totalFederalWithholding
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

  const getExchangeRate = (from: string, to: string): number => {
    // Simplified exchange rates (should be fetched from API or database)
    const rates: { [key: string]: number } = {
      'USD_CAD': 1.35,
      'EUR_CAD': 1.45,
      'MAD_CAD': 0.135,
      'CAD_CAD': 1.0
    }
    return rates[`${from}_${to}`] || 1.0
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

  const exportT1135ToPDF = () => {
    const data = calculateT1135Data()
    const doc = new jsPDF()

    // Title
    doc.setFontSize(18)
    doc.text('T1135 - Foreign Income Verification Statement', 20, 20)
    doc.setFontSize(12)
    doc.text(`Tax Year: ${data.year}`, 20, 30)

    let y = 45

    // Summary
    doc.setFontSize(14)
    doc.text('Summary', 20, y)
    y += 10
    doc.setFontSize(10)
    doc.text(`Total Foreign Assets: ${formatCurrency(data.totalForeignAssets)}`, 25, y)
    y += 7
    doc.text(`Foreign Income: ${formatCurrency(data.foreignIncome)}`, 25, y)
    y += 15

    // Properties Detail
    doc.setFontSize(14)
    doc.text('Foreign Properties', 20, y)
    y += 10

    data.properties.forEach((prop, index) => {
      if (y > 270) {
        doc.addPage()
        y = 20
      }

      doc.setFontSize(10)
      doc.text(`${index + 1}. ${prop.name}`, 25, y)
      y += 7
      doc.text(`   Location: ${prop.location}`, 25, y)
      y += 7
      doc.text(`   Cost: ${formatCurrency(prop.cost, prop.currency)} (${formatCurrency(prop.costCAD, 'CAD')})`, 25, y)
      y += 10
    })

    // Footer
    doc.setFontSize(8)
    doc.text('Generated by CERDIA Investment Platform', 20, 285)
    doc.text(new Date().toLocaleString(language === 'fr' ? 'fr-CA' : 'en-CA'), 150, 285)

    // Save
    doc.save(`T1135_${data.year}_CERDIA.pdf`)
  }

  const exportT2209ToPDF = () => {
    const data = calculateT2209Data()
    const doc = new jsPDF()

    // Title
    doc.setFontSize(18)
    doc.text('T2209 - Federal Foreign Tax Credits', 20, 20)
    doc.setFontSize(12)
    doc.text(`Tax Year: ${data.year}`, 20, 30)

    let y = 45

    // Summary
    doc.setFontSize(14)
    doc.text('Summary', 20, y)
    y += 10
    doc.setFontSize(10)
    doc.text(`Total Foreign Income: ${formatCurrency(data.totalForeignIncome)}`, 25, y)
    y += 7
    doc.text(`Total Foreign Tax Paid: ${formatCurrency(data.totalForeignTaxPaid)}`, 25, y)
    y += 7
    doc.text(`Total Tax Credit: ${formatCurrency(data.totalTaxCredit)}`, 25, y)
    y += 15

    // By Country
    doc.setFontSize(14)
    doc.text('Foreign Tax Credits by Country', 20, y)
    y += 10

    data.byCountry.forEach((country, index) => {
      if (y > 270) {
        doc.addPage()
        y = 20
      }

      doc.setFontSize(12)
      doc.text(`${country.country}`, 25, y)
      y += 8
      doc.setFontSize(10)
      doc.text(`   Foreign Income: ${formatCurrency(country.income)}`, 25, y)
      y += 7
      doc.text(`   Foreign Tax Paid: ${formatCurrency(country.taxPaid)}`, 25, y)
      y += 7
      doc.text(`   Tax Credit: ${formatCurrency(country.taxCredit)}`, 25, y)
      y += 12
    })

    // Footer
    doc.setFontSize(8)
    doc.text('Generated by CERDIA Investment Platform', 20, 285)
    doc.text(new Date().toLocaleString(language === 'fr' ? 'fr-CA' : 'en-CA'), 150, 285)

    // Save
    doc.save(`T2209_${data.year}_CERDIA.pdf`)
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

          {/* Properties Table */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 bg-gray-50 border-b border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
              <h4 className="text-sm sm:text-base font-semibold text-gray-900 truncate">{t('taxReports.foreignPropertiesDetail')}</h4>
              <button
                onClick={exportT1135ToPDF}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex-shrink-0"
              >
                <Download size={14} className="sm:w-[18px] sm:h-[18px]" />
                <span>{t('taxReports.exportPDF')}</span>
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
                    <th className="px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('projects.name')}</th>
                    <th className="px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('projects.location')}</th>
                    <th className="px-4 md:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('taxReports.country')}</th>
                    <th className="px-4 md:px-6 py-2 sm:py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('taxReports.originalCost')}</th>
                    <th className="px-4 md:px-6 py-2 sm:py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('taxReports.costCAD')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {t1135Data.properties.map((prop, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 md:px-6 py-3 sm:py-4 text-sm font-medium text-gray-900">{prop.name}</td>
                      <td className="px-4 md:px-6 py-3 sm:py-4 text-sm text-gray-600">{prop.location}</td>
                      <td className="px-4 md:px-6 py-3 sm:py-4 text-sm text-gray-600">{prop.country}</td>
                      <td className="px-4 md:px-6 py-3 sm:py-4 text-sm text-gray-900 text-right whitespace-nowrap">
                        {formatCurrency(prop.cost, prop.currency)}
                      </td>
                      <td className="px-4 md:px-6 py-3 sm:py-4 text-sm font-medium text-gray-900 text-right whitespace-nowrap">
                        {formatCurrency(prop.costCAD)}
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

      {/* T2209 Report */}
      {activeReport === 'T2209' && (
        <div className="space-y-4 sm:space-y-6">
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

          {/* By Country Table */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 bg-gray-50 border-b border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
              <h4 className="text-sm sm:text-base font-semibold text-gray-900 truncate">{t('taxReports.byCountry')}</h4>
              <button
                onClick={exportT2209ToPDF}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex-shrink-0"
              >
                <Download size={14} className="sm:w-[18px] sm:h-[18px]" />
                <span>{t('taxReports.exportPDF')}</span>
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
              }
              const [bg, border, labelColor, amtColor] = colorMap[group.color].split(' ')
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
            const borderColor = { green: 'border-green-300', blue: 'border-blue-300', orange: 'border-orange-300', purple: 'border-purple-300' }[group.color]
            const headerBg = { green: 'bg-green-50', blue: 'bg-blue-50', orange: 'bg-orange-50', purple: 'bg-purple-50' }[group.color]

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
    </div>
  )
}
