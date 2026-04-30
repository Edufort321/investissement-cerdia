'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/contexts/LanguageContext'
import { FileText, Download, Calendar, ExternalLink } from 'lucide-react'
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
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [activeReport, setActiveReport] = useState<'T1135' | 'T2209' | 'comptable'>('T1135')
  const [generatingPDF, setGeneratingPDF] = useState(false)

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)

  useEffect(() => {
    fetchData()
  }, [selectedYear])

  useEffect(() => {
    if (activeReport === 'comptable') fetchData()
  }, [activeReport])

  const fetchData = async () => {
    try {
      setLoading(true)

      // Fetch transactions for the selected year
      const startDate = `${selectedYear}-01-01`
      const endDate = `${selectedYear}-12-31`

      const { data: transData, error: transError } = await supabase
        .from('transactions')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true })

      if (transError) throw transError

      // Fetch all properties
      const { data: propData, error: propError } = await supabase
        .from('properties')
        .select('*')

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
    // Filter foreign properties (non-CAD currency)
    const foreignProperties = properties.filter(p => p.currency && p.currency !== 'CAD')

    // Calculate total foreign assets in CAD
    const totalForeignAssets = foreignProperties.reduce((sum, prop) => {
      // Use a simplified exchange rate conversion (should be at year-end rate)
      const exchangeRate = getExchangeRate(prop.currency, 'CAD')
      return sum + (prop.total_cost * exchangeRate)
    }, 0)

    // Calculate foreign income (dividends from foreign properties)
    const foreignIncome = transactions
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
    // Group transactions by foreign country
    const byCountry = new Map<string, { income: number; taxPaid: number; taxCredit: number }>()

    transactions
      .filter(t => t.foreign_country && t.foreign_tax_paid)
      .forEach(t => {
        const country = t.foreign_country!
        const existing = byCountry.get(country) || { income: 0, taxPaid: 0, taxCredit: 0 }

        byCountry.set(country, {
          income: existing.income + (t.source_amount || t.amount),
          taxPaid: existing.taxPaid + (t.foreign_tax_paid || 0),
          taxCredit: existing.taxCredit + (t.estimated_tax_credit || 0)
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
  }

  const FISCAL_GROUPS: { label: string; color: string; cats: string[] }[] = [
    { label: 'REVENUS', color: 'green', cats: ['rental_income', 'dividend_income', 'interest_income', 'other_income'] },
    { label: 'OPEX — Déduit immédiatement', color: 'blue', cats: ['management_fee', 'insurance', 'property_tax', 'condo_fees', 'utilities', 'maintenance_repair', 'professional_fees', 'advertising', 'travel', 'interest_expense', 'bank_fees', 'other_opex'] },
    { label: 'CAPEX — Amorti sur plusieurs années', color: 'orange', cats: ['property_purchase', 'renovation', 'equipment', 'furnishing', 'acquisition_costs', 'land_improvement', 'other_capex'] },
    { label: 'FINANCEMENT', color: 'purple', cats: ['loan_principal', 'investor_capital', 'investor_repayment'] },
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
        transactions
          .filter(t => t.attachment_storage_path)
          .map(async t => {
            const { data } = await supabase.storage
              .from('transaction-attachments')
              .createSignedUrl(t.attachment_storage_path!, 60 * 60 * 24 * 365)
            if (data?.signedUrl) urlMap[t.id] = data.signedUrl
          })
      )
      // Fallback to public attachment_url if no storage path
      transactions.forEach(t => {
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
        const txs = transactions.filter(t => group.cats.includes(t.fiscal_category || ''))
        return [group.label.split('—')[0].trim(), String(txs.length), fmt(txs.reduce((s, t) => s + t.amount, 0))]
      })
      const uncatTxs = transactions.filter(t => !allCategorized.includes(t.fiscal_category || ''))
      if (uncatTxs.length > 0) summaryBody.push(['⚠ Sans catégorie', String(uncatTxs.length), fmt(uncatTxs.reduce((s, t) => s + t.amount, 0))])
      summaryBody.push(['TOTAL GÉNÉRAL', String(transactions.length), fmt(transactions.reduce((s, t) => s + t.amount, 0))])

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
      const txs = transactions.filter(t => group.cats.includes(t.fiscal_category || '')).sort((a, b) => a.date.localeCompare(b.date))
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
    const uncategorized = transactions.filter(t => !allCategorized.includes(t.fiscal_category || ''))
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

        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto flex-shrink-0">
          <Calendar size={16} className="sm:w-5 sm:h-5 text-gray-500" />
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="flex-1 sm:flex-initial px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {years.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

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
                title="Recharger les données"
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
                title="Export CSV brut pour import comptable"
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
            const uncategorized = transactions.filter(t => !allCategorized.includes(t.fiscal_category || ''))
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
    </div>
  )
}
