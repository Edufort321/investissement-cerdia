'use client'

import { Summary, Transaction, Dividend } from '@/types/investment'
import { Printer } from 'lucide-react'

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

  const handlePrint = () => {
    window.print()
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-CA', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <div className="space-y-6">
      {/* Bouton d'impression - caché à l'impression */}
      <div className="print:hidden flex justify-end">
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 bg-[#5e5e5e] hover:bg-[#3e3e3e] text-white px-6 py-3 rounded-full transition-colors"
        >
          <Printer size={20} />
          Imprimer le rapport
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
                Rapport {type} - {period}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Date du rapport</p>
              <p className="text-lg font-semibold">{formatDate(summary.lastUpdated)}</p>
            </div>
          </div>
        </div>

        {/* Sommaire exécutif */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Sommaire Exécutif</h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Valeur Totale</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(summary.currentTotalValue)}
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Total Investi</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(summary.totalInvested)}
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Nombre d'Actions</p>
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
              <p className="text-sm text-gray-600 mb-1">Compte Courant</p>
              <p className="text-lg font-bold text-blue-900">
                {formatCurrency(summary.currentAccount)}
              </p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Compte CAPEX</p>
              <p className="text-lg font-bold text-purple-900">
                {formatCurrency(summary.capexAccount)}
              </p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Liquidité Disponible</p>
              <p className="text-lg font-bold text-green-900">
                {formatCurrency(summary.availableLiquidity)}
              </p>
            </div>
          </div>
        </section>

        {/* Répartition des investisseurs */}
        <section className="mb-8 page-break-before">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Répartition des Investisseurs</h2>
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-900">
                <th className="text-left py-3 font-semibold">Investisseur</th>
                <th className="text-right py-3 font-semibold">Investi</th>
                <th className="text-right py-3 font-semibold">Actions</th>
                <th className="text-right py-3 font-semibold">Valeur Actuelle</th>
                <th className="text-right py-3 font-semibold">% Part</th>
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
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Portefeuille Immobilier</h2>
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-900">
                <th className="text-left py-3 font-semibold">Propriété</th>
                <th className="text-right py-3 font-semibold">Coût Total</th>
                <th className="text-right py-3 font-semibold">Montant Payé</th>
                <th className="text-right py-3 font-semibold">Solde</th>
                <th className="text-left py-3 font-semibold">Statut</th>
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
              Transactions de la période
            </h2>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b-2 border-gray-900">
                  <th className="text-left py-2 font-semibold">Date</th>
                  <th className="text-left py-2 font-semibold">Description</th>
                  <th className="text-left py-2 font-semibold">Type</th>
                  <th className="text-right py-2 font-semibold">Montant</th>
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
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Dividendes Distribués</h2>
            {dividends.map((dividend) => (
              <div key={dividend.id} className="mb-6">
                <h3 className="text-lg font-semibold mb-3">
                  Année {dividend.year} {dividend.quarter && `- Q${dividend.quarter}`}
                </h3>
                <div className="bg-gray-50 p-4 rounded-lg mb-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Montant Total</p>
                      <p className="text-xl font-bold">{formatCurrency(dividend.totalAmount)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Par Action</p>
                      <p className="text-xl font-bold">{formatCurrency(dividend.amountPerShare)}</p>
                    </div>
                  </div>
                </div>
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-gray-300">
                      <th className="text-left py-2 font-semibold">Investisseur</th>
                      <th className="text-right py-2 font-semibold">Actions</th>
                      <th className="text-right py-2 font-semibold">Montant</th>
                      <th className="text-left py-2 font-semibold">Statut</th>
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
                            {allocation.paid ? 'Payé' : 'En attente'}
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
            <p>Ce rapport a été généré automatiquement par le système de gestion CERDIA</p>
            <p className="mt-1">© {new Date().getFullYear()} {summary.companyName} - Tous droits réservés</p>
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
