'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/contexts/LanguageContext'
import { FileText, Download, Calendar } from 'lucide-react'
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
  const [activeReport, setActiveReport] = useState<'T1135' | 'T2209'>('T1135')

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)

  useEffect(() => {
    fetchData()
  }, [selectedYear])

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-gray-900">
            {t('taxReports.title')}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {t('taxReports.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Calendar size={20} className="text-gray-500" />
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {years.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Report Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveReport('T1135')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeReport === 'T1135'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            T1135 - {t('taxReports.foreignAssets')}
          </button>
          <button
            onClick={() => setActiveReport('T2209')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeReport === 'T2209'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            T2209 - {t('taxReports.foreignTaxCredits')}
          </button>
        </div>
      </div>

      {/* T1135 Report */}
      {activeReport === 'T1135' && (
        <div className="space-y-6">
          {/* Warning if required */}
          {t1135Required && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-yellow-800 font-medium">
                ⚠️ {t('taxReports.t1135Required')}
              </p>
            </div>
          )}

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-700 mb-1">{t('taxReports.totalForeignAssets')}</p>
              <p className="text-2xl font-bold text-blue-900">
                {formatCurrency(t1135Data.totalForeignAssets)}
              </p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-700 mb-1">{t('taxReports.foreignIncome')}</p>
              <p className="text-2xl font-bold text-green-900">
                {formatCurrency(t1135Data.foreignIncome)}
              </p>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <p className="text-sm text-purple-700 mb-1">{t('taxReports.foreignProperties')}</p>
              <p className="text-2xl font-bold text-purple-900">
                {t1135Data.properties.length}
              </p>
            </div>
          </div>

          {/* Properties Table */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <h4 className="font-semibold text-gray-900">{t('taxReports.foreignPropertiesDetail')}</h4>
              <button
                onClick={exportT1135ToPDF}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Download size={18} />
                {t('taxReports.exportPDF')}
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('projects.name')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('projects.location')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('taxReports.country')}</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('taxReports.originalCost')}</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('taxReports.costCAD')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {t1135Data.properties.map((prop, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{prop.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{prop.location}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{prop.country}</td>
                      <td className="px-6 py-4 text-sm text-gray-900 text-right">
                        {formatCurrency(prop.cost, prop.currency)}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 text-right">
                        {formatCurrency(prop.costCAD)}
                      </td>
                    </tr>
                  ))}
                  {t1135Data.properties.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
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
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-700 mb-1">{t('taxReports.totalForeignIncome')}</p>
              <p className="text-2xl font-bold text-blue-900">
                {formatCurrency(t2209Data.totalForeignIncome)}
              </p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-700 mb-1">{t('taxReports.totalForeignTaxPaid')}</p>
              <p className="text-2xl font-bold text-red-900">
                {formatCurrency(t2209Data.totalForeignTaxPaid)}
              </p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-700 mb-1">{t('taxReports.totalTaxCredit')}</p>
              <p className="text-2xl font-bold text-green-900">
                {formatCurrency(t2209Data.totalTaxCredit)}
              </p>
            </div>
          </div>

          {/* By Country Table */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <h4 className="font-semibold text-gray-900">{t('taxReports.byCountry')}</h4>
              <button
                onClick={exportT2209ToPDF}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Download size={18} />
                {t('taxReports.exportPDF')}
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('taxReports.country')}</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('taxReports.foreignIncome')}</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('taxReports.taxPaid')}</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('taxReports.taxCredit')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {t2209Data.byCountry.map((country, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{country.country}</td>
                      <td className="px-6 py-4 text-sm text-gray-900 text-right">
                        {formatCurrency(country.income)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 text-right">
                        {formatCurrency(country.taxPaid)}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-green-600 text-right">
                        {formatCurrency(country.taxCredit)}
                      </td>
                    </tr>
                  ))}
                  {t2209Data.byCountry.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
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
    </div>
  )
}
