'use client'

import { Summary, Transaction, Dividend } from '@/types/investment'
import { Printer } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

interface PrintableReportProps {
  type: 'trimestriel' | 'annuel' | 'mensuel'
  period: string
  summary: Summary
  transactions?: Transaction[]
  dividends?: Dividend[]
}

export default function PrintableReport({
  type,
  period,
  summary,
  transactions = [],
  dividends = []
}: PrintableReportProps) {
  const { language } = useLanguage()
  const fr = language === 'fr'
  const locale = fr ? 'fr-CA' : 'en-CA'

  const handlePrint = () => { window.print() }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(amount)

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div className="space-y-6">
      {/* Bouton d'impression - caché à l'impression */}
      <div className="print:hidden flex justify-end">
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 bg-[#5e5e5e] hover:bg-[#3e3e3e] text-white px-6 py-3 rounded-full transition-colors"
        >
          <Printer size={20} />
          {fr ? 'Imprimer le rapport' : 'Print report'}
        </button>
      </div>

      {/* Contenu imprimable */}
      <div className="bg-white p-8 print:p-0">
        {/* En-tête */}
        <div className="border-b-2 border-gray-900 pb-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {summary.companyName}
              </h1>
              <p className="text-lg text-gray-600">
                {fr ? `Rapport ${type}` : `${type} report`} - {period}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">{fr ? 'Date du rapport' : 'Report date'}</p>
              <p className="text-lg font-semibold">{formatDate(summary.lastUpdated)}</p>
            </div>
          </div>
        </div>

        {/* Sommaire exécutif */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{fr ? 'Sommaire Exécutif' : 'Executive Summary'}</h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">{fr ? 'Valeur Totale' : 'Total Value'}</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(summary.currentTotalValue)}
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">{fr ? 'Total Investi' : 'Total Invested'}</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(summary.totalInvested)}
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">{fr ? "Nombre d'Actions" : 'Number of Shares'}</p>
              <p className="text-2xl font-bold text-gray-900">
                {summary.totalShares.toFixed(2)}
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">ROI</p>
              <p className="text-2xl font-bold text-green-600">
                {((summary.currentTotalValue / summary.totalInvested - 1) * 100).toFixed(1)}%
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">{fr ? 'Compte Courant' : 'Current Account'}</p>
              <p className="text-lg font-bold text-blue-900">
                {formatCurrency(summary.currentAccount)}
              </p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">{fr ? 'Compte CAPEX' : 'CAPEX Account'}</p>
              <p className="text-lg font-bold text-purple-900">
                {formatCurrency(summary.capexAccount)}
              </p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">{fr ? 'Liquidité Disponible' : 'Available Liquidity'}</p>
              <p className="text-lg font-bold text-green-900">
                {formatCurrency(summary.availableLiquidity)}
              </p>
            </div>
          </div>
        </section>

        {/* Répartition des investisseurs */}
        <section className="mb-8 page-break-before">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{fr ? 'Répartition des Investisseurs' : 'Investor Breakdown'}</h2>
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-900">
                <th className="text-left py-3 font-semibold">{fr ? 'Investisseur' : 'Investor'}</th>
                <th className="text-right py-3 font-semibold">{fr ? 'Investi' : 'Invested'}</th>
                <th className="text-right py-3 font-semibold">{fr ? 'Actions' : 'Shares'}</th>
                <th className="text-right py-3 font-semibold">{fr ? 'Valeur Actuelle' : 'Current Value'}</th>
                <th className="text-right py-3 font-semibold">% {fr ? 'Part' : 'Share'}</th>
              </tr>
            </thead>
            <tbody>
              {summary.investors.map((investor) => (
                <tr key={investor.id} className="border-b border-gray-200">
                  <td className="py-3">{investor.name}</td>
                  <td className="text-right">{formatCurrency(investor.invested)}</td>
                  <td className="text-right">{investor.shares.toFixed(2)}</td>
                  <td className="text-right">{formatCurrency(investor.currentValue)}</td>
                  <td className="text-right font-semibold">{investor.percentage}%</td>
                </tr>
              ))}
              <tr className="border-t-2 border-gray-900 font-bold">
                <td className="py-3">TOTAL</td>
                <td className="text-right">
                  {formatCurrency(summary.investors.reduce((sum, inv) => sum + inv.invested, 0))}
                </td>
                <td className="text-right">
                  {summary.investors.reduce((sum, inv) => sum + inv.shares, 0).toFixed(2)}
                </td>
                <td className="text-right">
                  {formatCurrency(summary.investors.reduce((sum, inv) => sum + inv.currentValue, 0))}
                </td>
                <td className="text-right">100%</td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* Portefeuille immobilier */}
        <section className="mb-8 page-break-before">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{fr ? 'Portefeuille Immobilier' : 'Real Estate Portfolio'}</h2>
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-900">
                <th className="text-left py-3 font-semibold">{fr ? 'Propriété' : 'Property'}</th>
                <th className="text-right py-3 font-semibold">{fr ? 'Coût Total' : 'Total Cost'}</th>
                <th className="text-right py-3 font-semibold">{fr ? 'Montant Payé' : 'Amount Paid'}</th>
                <th className="text-right py-3 font-semibold">{fr ? 'Solde' : 'Balance'}</th>
                <th className="text-left py-3 font-semibold">{fr ? 'Statut' : 'Status'}</th>
              </tr>
            </thead>
            <tbody>
              {summary.properties.map((property) => (
                <tr key={property.id} className="border-b border-gray-200">
                  <td className="py-3">{property.name}</td>
                  <td className="text-right">{formatCurrency(property.totalCost)}</td>
                  <td className="text-right">{formatCurrency(property.paidAmount)}</td>
                  <td className="text-right">{formatCurrency(property.totalCost - property.paidAmount)}</td>
                  <td className="text-left capitalize">{property.status.replace('_', ' ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Transactions récentes */}
        {transactions.length > 0 && (
          <section className="mb-8 page-break-before">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {fr ? 'Transactions de la période' : 'Period transactions'}
            </h2>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b-2 border-gray-900">
                  <th className="text-left py-2 font-semibold">{fr ? 'Date' : 'Date'}</th>
                  <th className="text-left py-2 font-semibold">{fr ? 'Description' : 'Description'}</th>
                  <th className="text-left py-2 font-semibold">{fr ? 'Type' : 'Type'}</th>
                  <th className="text-right py-2 font-semibold">{fr ? 'Montant' : 'Amount'}</th>
                </tr>
              </thead>
              <tbody>
                {transactions.slice(0, 50).map((transaction) => (
                  <tr key={transaction.id} className="border-b border-gray-100">
                    <td className="py-2">{formatDate(transaction.date)}</td>
                    <td className="py-2">{transaction.description}</td>
                    <td className="py-2 capitalize">{transaction.type}</td>
                    <td className="text-right">{formatCurrency(transaction.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* Dividendes */}
        {dividends.length > 0 && (
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">{fr ? 'Dividendes Distribués' : 'Distributed Dividends'}</h2>
            {dividends.map((dividend) => (
              <div key={dividend.id} className="mb-6">
                <h3 className="text-lg font-semibold mb-3">
                  Année {dividend.year} {dividend.quarter && `- Q${dividend.quarter}`}
                </h3>
                <div className="bg-gray-50 p-4 rounded-lg mb-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">{fr ? 'Montant Total' : 'Total Amount'}</p>
                      <p className="text-xl font-bold">{formatCurrency(dividend.totalAmount)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">{fr ? 'Par Action' : 'Per Share'}</p>
                      <p className="text-xl font-bold">{formatCurrency(dividend.amountPerShare)}</p>
                    </div>
                  </div>
                </div>
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-gray-300">
                      <th className="text-left py-2 font-semibold">{fr ? 'Investisseur' : 'Investor'}</th>
                      <th className="text-right py-2 font-semibold">{fr ? 'Actions' : 'Shares'}</th>
                      <th className="text-right py-2 font-semibold">{fr ? 'Montant' : 'Amount'}</th>
                      <th className="text-left py-2 font-semibold">{fr ? 'Statut' : 'Status'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dividend.investorAllocations.map((allocation) => (
                      <tr key={allocation.investorId} className="border-b border-gray-100">
                        <td className="py-2">{allocation.investorName}</td>
                        <td className="text-right">{allocation.shares.toFixed(2)}</td>
                        <td className="text-right">{formatCurrency(allocation.amount)}</td>
                        <td className="text-left">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            allocation.paid
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {allocation.paid ? (fr ? 'Payé' : 'Paid') : (fr ? 'En attente' : 'Pending')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </section>
        )}

        {/* Pied de page */}
        <footer className="mt-12 pt-6 border-t-2 border-gray-900">
          <div className="text-center text-sm text-gray-600">
            <p>{fr ? 'Ce rapport a été généré automatiquement par le système de gestion CERDIA' : 'This report was automatically generated by the CERDIA management system'}</p>
            <p className="mt-1">© {new Date().getFullYear()} {summary.companyName} - {fr ? 'Tous droits réservés' : 'All rights reserved'}</p>
          </div>
        </footer>
      </div>

      <style jsx global>{`
        @media print {
          @page {
            margin: 2cm;
            size: letter;
          }

          .page-break-before {
            page-break-before: always;
          }

          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }

          .print\\:hidden {
            display: none !important;
          }

          .print\\:p-0 {
            padding: 0 !important;
          }
        }
      `}</style>
    </div>
  )
}
