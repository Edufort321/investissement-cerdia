'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, DollarSign, Calendar, Building2, X, ExternalLink } from 'lucide-react'

interface PropertyFinancialSummaryProps {
  propertyId: string
  propertyName: string
  totalCost: number
  currency: string
  status: string
  reservationDate?: string
  completionDate?: string
  saleDate?: string
  salePrice?: number
  saleCurrency?: string
  transactions: any[]
  onOpenPerformanceROI?: () => void
}

interface FinancialData {
  // Revenus
  rentalIncome: number
  otherIncome: number
  totalRevenues: number

  // Dépenses
  maintenanceCosts: number
  capexCosts: number
  managementFees: number
  taxes: number
  insurance: number
  adminCosts: number
  otherExpenses: number
  totalExpenses: number

  // Performance
  netIncome: number
  cashFlow: number
  roiAnnualized: number

  // Si vendu
  saleProfit?: number
  totalROI?: number
}

export default function PropertyFinancialSummary({
  propertyId,
  propertyName,
  totalCost,
  currency,
  status,
  reservationDate,
  completionDate,
  saleDate,
  salePrice,
  saleCurrency,
  transactions,
  onOpenPerformanceROI
}: PropertyFinancialSummaryProps) {
  const [financialData, setFinancialData] = useState<FinancialData>({
    rentalIncome: 0,
    otherIncome: 0,
    totalRevenues: 0,
    maintenanceCosts: 0,
    capexCosts: 0,
    managementFees: 0,
    taxes: 0,
    insurance: 0,
    adminCosts: 0,
    otherExpenses: 0,
    totalExpenses: 0,
    netIncome: 0,
    cashFlow: 0,
    roiAnnualized: 0
  })

  useEffect(() => {
    calculateFinancials()
  }, [propertyId, transactions])

  const calculateFinancials = () => {
    const propertyTxs = transactions.filter(t => t.property_id === propertyId)

    // REVENUS
    const rentalIncome = propertyTxs
      .filter(t => t.type === 'loyer' || (t.type === 'dividende' && (t.description?.toLowerCase().includes('loyer') || t.description?.toLowerCase().includes('location'))))
      .reduce((sum, t) => sum + (t.source_amount || t.amount), 0)

    const otherIncome = propertyTxs
      .filter(t => t.type === 'dividende' && !(t.description?.toLowerCase().includes('loyer') || t.description?.toLowerCase().includes('location')))
      .reduce((sum, t) => sum + (t.source_amount || t.amount), 0)

    const totalRevenues = rentalIncome + otherIncome

    // DÉPENSES
    const maintenanceCosts = propertyTxs
      .filter(t => t.type === 'maintenance' || (t.type === 'depense' && (t.description?.toLowerCase().includes('maintenance') || t.description?.toLowerCase().includes('réparation'))))
      .reduce((sum, t) => sum + (t.source_amount || t.amount), 0)

    const capexCosts = propertyTxs
      .filter(t => t.type === 'capex')
      .reduce((sum, t) => sum + (t.source_amount || t.amount), 0)

    const managementFees = propertyTxs
      .filter(t => (t.type === 'depense' || t.type === 'admin') && t.description?.toLowerCase().includes('gestion'))
      .reduce((sum, t) => sum + (t.source_amount || t.amount), 0)

    const taxes = propertyTxs
      .filter(t => t.type === 'depense' && (t.description?.toLowerCase().includes('taxe') || t.description?.toLowerCase().includes('municipal')))
      .reduce((sum, t) => sum + (t.source_amount || t.amount), 0)

    const insurance = propertyTxs
      .filter(t => t.type === 'depense' && t.description?.toLowerCase().includes('assurance'))
      .reduce((sum, t) => sum + (t.source_amount || t.amount), 0)

    const adminCosts = propertyTxs
      .filter(t => t.type === 'admin' && !t.description?.toLowerCase().includes('gestion'))
      .reduce((sum, t) => sum + (t.source_amount || t.amount), 0)

    const otherExpenses = propertyTxs
      .filter(t => t.type === 'depense' &&
        !t.description?.toLowerCase().includes('maintenance') &&
        !t.description?.toLowerCase().includes('gestion') &&
        !t.description?.toLowerCase().includes('taxe') &&
        !t.description?.toLowerCase().includes('assurance'))
      .reduce((sum, t) => sum + (t.source_amount || t.amount), 0)

    const totalExpenses = maintenanceCosts + capexCosts + managementFees + taxes + insurance + adminCosts + otherExpenses

    // PERFORMANCE
    const netIncome = totalRevenues - totalExpenses
    const cashFlow = netIncome - totalCost

    // Calculer années depuis acquisition
    const acquisitionDate = reservationDate || completionDate
    const yearsHeld = acquisitionDate
      ? (new Date().getTime() - new Date(acquisitionDate).getTime()) / (1000 * 60 * 60 * 24 * 365)
      : 1

    const roiAnnualized = totalCost > 0 && yearsHeld > 0
      ? (netIncome / totalCost / yearsHeld) * 100
      : 0

    // SI VENDU
    let saleProfit: number | undefined
    let totalROI: number | undefined

    if (status === 'vendu' && salePrice) {
      saleProfit = (salePrice + totalRevenues) - (totalCost + totalExpenses)
      totalROI = totalCost > 0 ? (saleProfit / totalCost) * 100 : 0
    }

    setFinancialData({
      rentalIncome,
      otherIncome,
      totalRevenues,
      maintenanceCosts,
      capexCosts,
      managementFees,
      taxes,
      insurance,
      adminCosts,
      otherExpenses,
      totalExpenses,
      netIncome,
      cashFlow,
      roiAnnualized,
      saleProfit,
      totalROI
    })
  }

  const formatCurrency = (amount: number, curr: string = currency) => {
    return new Intl.NumberFormat('fr-CA', {
      style: 'currency',
      currency: curr,
      minimumFractionDigits: 0
    }).format(amount)
  }

  const isProfit = financialData.netIncome >= 0

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Building2 size={24} className="text-blue-600" />
            Bilan Financier
          </h2>
          <p className="text-sm text-gray-600 mt-1">{propertyName}</p>
        </div>
        {onOpenPerformanceROI && (
          <button
            onClick={onOpenPerformanceROI}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Analyse ROI détaillée
            <ExternalLink size={16} />
          </button>
        )}
      </div>

      {/* Investissement Initial */}
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
        <h3 className="text-sm font-bold text-blue-900 mb-3">💰 INVESTISSEMENT INITIAL</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-blue-700">Coût d'achat</div>
            <div className="text-2xl font-bold text-blue-900">{formatCurrency(totalCost)}</div>
          </div>
          {reservationDate && (
            <div>
              <div className="text-xs text-blue-700">Date d'acquisition</div>
              <div className="text-sm font-medium text-blue-900">
                {new Date(reservationDate).toLocaleDateString('fr-CA')}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Revenus */}
      <div className="bg-green-50 rounded-lg p-4 border border-green-200">
        <h3 className="text-sm font-bold text-green-900 mb-3">📈 REVENUS CUMULÉS</h3>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-green-700">💰 Revenus locatifs</span>
            <span className="text-sm font-medium text-green-900">
              {formatCurrency(financialData.rentalIncome)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-green-700">💵 Autres revenus</span>
            <span className="text-sm font-medium text-green-900">
              {formatCurrency(financialData.otherIncome)}
            </span>
          </div>
          <div className="border-t border-green-300 pt-2 mt-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-green-900">TOTAL REVENUS</span>
              <span className="text-lg font-bold text-green-900">
                {formatCurrency(financialData.totalRevenues)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Dépenses */}
      <div className="bg-red-50 rounded-lg p-4 border border-red-200">
        <h3 className="text-sm font-bold text-red-900 mb-3">📉 DÉPENSES CUMULÉES</h3>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-red-700">🔧 Maintenance</span>
            <span className="text-sm font-medium text-red-900">
              {formatCurrency(financialData.maintenanceCosts)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-red-700">🏗️ Améliorations (CAPEX)</span>
            <span className="text-sm font-medium text-red-900">
              {formatCurrency(financialData.capexCosts)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-red-700">📋 Frais de gestion</span>
            <span className="text-sm font-medium text-red-900">
              {formatCurrency(financialData.managementFees)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-red-700">🏛️ Taxes foncières</span>
            <span className="text-sm font-medium text-red-900">
              {formatCurrency(financialData.taxes)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-red-700">🛡️ Assurances</span>
            <span className="text-sm font-medium text-red-900">
              {formatCurrency(financialData.insurance)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-red-700">📊 Administratif</span>
            <span className="text-sm font-medium text-red-900">
              {formatCurrency(financialData.adminCosts)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-red-700">💼 Autres dépenses</span>
            <span className="text-sm font-medium text-red-900">
              {formatCurrency(financialData.otherExpenses)}
            </span>
          </div>
          <div className="border-t border-red-300 pt-2 mt-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-red-900">TOTAL DÉPENSES</span>
              <span className="text-lg font-bold text-red-900">
                {formatCurrency(financialData.totalExpenses)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Performance */}
      <div className={`${isProfit ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'} rounded-lg p-4 border`}>
        <h3 className={`text-sm font-bold ${isProfit ? 'text-green-900' : 'text-orange-900'} mb-3`}>
          💵 PERFORMANCE
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className={`text-sm font-medium ${isProfit ? 'text-green-700' : 'text-orange-700'}`}>
              Revenu net
            </span>
            <span className={`text-xl font-bold flex items-center gap-1 ${isProfit ? 'text-green-900' : 'text-orange-900'}`}>
              {isProfit ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
              {formatCurrency(financialData.netIncome)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className={`text-xs ${isProfit ? 'text-green-700' : 'text-orange-700'}`}>
              ROI annualisé
            </span>
            <span className={`text-lg font-bold ${isProfit ? 'text-green-900' : 'text-orange-900'}`}>
              {financialData.roiAnnualized.toFixed(2)}%
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className={`text-xs ${isProfit ? 'text-green-700' : 'text-orange-700'}`}>
              Cash-flow cumulé
            </span>
            <span className={`text-base font-medium ${isProfit ? 'text-green-900' : 'text-orange-900'}`}>
              {formatCurrency(financialData.cashFlow)}
            </span>
          </div>
        </div>
      </div>

      {/* Si vendu */}
      {status === 'vendu' && salePrice && (
        <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
          <h3 className="text-sm font-bold text-purple-900 mb-3">💸 VENTE</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs text-purple-700">Prix de vente</span>
              <span className="text-lg font-bold text-purple-900">
                {formatCurrency(salePrice, saleCurrency || currency)}
              </span>
            </div>
            {saleDate && (
              <div className="flex justify-between items-center">
                <span className="text-xs text-purple-700">Date de vente</span>
                <span className="text-sm font-medium text-purple-900">
                  {new Date(saleDate).toLocaleDateString('fr-CA')}
                </span>
              </div>
            )}
            {financialData.saleProfit !== undefined && (
              <>
                <div className="border-t border-purple-300 pt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-purple-900">💎 Gain/Perte net</span>
                    <span className={`text-xl font-bold ${financialData.saleProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(financialData.saleProfit, saleCurrency || currency)}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-purple-900">📈 ROI TOTAL</span>
                  <span className={`text-2xl font-bold ${financialData.totalROI && financialData.totalROI >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {financialData.totalROI?.toFixed(2)}%
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Aide */}
      <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
        <p className="text-xs text-gray-600">
          💡 <strong>Source des données:</strong> Toutes les valeurs sont calculées automatiquement depuis les transactions enregistrées dans <strong>Administration → Transactions</strong>.
          Les données sont synchronisées en temps réel avec l'analyse ROI détaillée.
        </p>
      </div>
    </div>
  )
}
