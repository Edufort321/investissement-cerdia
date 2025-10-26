import { jsPDF } from 'jspdf'
import 'jspdf-autotable'

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF
    lastAutoTable: {
      finalY: number
    }
  }
}

interface ScenarioData {
  name: string
  unit_number: string
  address: string
  country: string
  state_region: string
  promoter_name: string
  purchase_price: number
  promoter_data: {
    monthly_rent: number
    rent_type: 'monthly' | 'nightly'
    rent_currency: string
    annual_appreciation: number
    occupancy_rate: number
    management_fees: number
    project_duration: number
    tax_rate: number
    annual_rent_increase: number
  }
  status: string
  delivery_date?: string
}

interface ActualValue {
  year: number
  property_value?: number
  rental_income?: number
  management_fees?: number
  net_income?: number
  occupancy_rate?: number
}

interface ScenarioResult {
  scenario_type: string
  yearly_data: any[]
  summary: {
    total_return: number
    avg_annual_return: number
    total_net_income: number
    final_property_value: number
    break_even_year: number
    recommendation: 'recommended' | 'consider' | 'not_recommended'
    irr: number
    npv: number
    total_depreciation_savings: number
    capital_gains_tax: number
    net_proceeds_after_sale: number
  }
}

export function useExportPDF() {

  // Fonction utilitaire pour formater la devise
  const formatCurrency = (amount: number, currency: string = 'CAD') => {
    return new Intl.NumberFormat('fr-CA', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  // Export d'un scénario complet
  const exportScenarioPDF = async (scenario: ScenarioData, results: ScenarioResult[]) => {
    const doc = new jsPDF()
    let yPos = 20

    // En-tête
    doc.setFontSize(20)
    doc.setTextColor(40, 40, 40)
    doc.text('RAPPORT D\'INVESTISSEMENT', 105, yPos, { align: 'center' })

    yPos += 10
    doc.setFontSize(16)
    doc.text(scenario.name, 105, yPos, { align: 'center' })

    yPos += 15
    doc.setFontSize(10)
    doc.setTextColor(100, 100, 100)
    doc.text(`Généré le ${new Date().toLocaleDateString('fr-CA')}`, 105, yPos, { align: 'center' })

    // Section: Informations du projet
    yPos += 15
    doc.setFontSize(14)
    doc.setTextColor(40, 40, 40)
    doc.text('INFORMATIONS DU PROJET', 20, yPos)

    yPos += 10
    doc.autoTable({
      startY: yPos,
      head: [['Propriété', 'Valeur']],
      body: [
        ['Nom du projet', scenario.name],
        ['Unité', scenario.unit_number],
        ['Adresse', `${scenario.address}, ${scenario.state_region}, ${scenario.country}`],
        ['Promoteur', scenario.promoter_name],
        ['Prix d\'achat', formatCurrency(scenario.purchase_price, scenario.promoter_data.rent_currency)],
        ['Statut', scenario.status === 'purchased' ? 'Acheté' : scenario.status === 'approved' ? 'Approuvé' : scenario.status === 'pending_vote' ? 'En vote' : 'Brouillon'],
        ['Date de livraison', scenario.delivery_date || 'Non définie']
      ],
      theme: 'striped',
      headStyles: { fillColor: [94, 94, 94] },
      margin: { left: 20, right: 20 }
    })

    // Section: Paramètres financiers
    yPos = doc.lastAutoTable.finalY + 15
    doc.setFontSize(14)
    doc.text('PARAMÈTRES FINANCIERS', 20, yPos)

    yPos += 10
    doc.autoTable({
      startY: yPos,
      head: [['Paramètre', 'Valeur']],
      body: [
        ['Loyer ' + (scenario.promoter_data.rent_type === 'monthly' ? 'mensuel' : 'journalier'),
         formatCurrency(scenario.promoter_data.monthly_rent, scenario.promoter_data.rent_currency)],
        ['Appréciation annuelle', `${scenario.promoter_data.annual_appreciation}%`],
        ['Taux d\'occupation', `${scenario.promoter_data.occupancy_rate}%`],
        ['Frais de gestion', `${scenario.promoter_data.management_fees}%`],
        ['Durée du projet', `${scenario.promoter_data.project_duration} ans`],
        ['Taux d\'imposition', `${scenario.promoter_data.tax_rate}%`],
        ['Augmentation locative annuelle', `${scenario.promoter_data.annual_rent_increase}%`]
      ],
      theme: 'striped',
      headStyles: { fillColor: [94, 94, 94] },
      margin: { left: 20, right: 20 }
    })

    // Section: Projections par scénario
    for (const result of results) {
      // Nouvelle page pour chaque scénario
      doc.addPage()
      yPos = 20

      doc.setFontSize(14)
      doc.text(`SCÉNARIO ${result.scenario_type.toUpperCase()}`, 20, yPos)

      // Résumé du scénario
      yPos += 10
      const finalCashflow = result.yearly_data[result.yearly_data.length - 1]?.cumulative_cashflow || 0

      doc.autoTable({
        startY: yPos,
        head: [['Métrique', 'Valeur']],
        body: [
          ['Valeur finale propriété', formatCurrency(result.summary.final_property_value, 'CAD')],
          ['Revenus nets totaux', formatCurrency(result.summary.total_net_income, 'CAD')],
          ['Cashflow cumulé final', formatCurrency(finalCashflow, 'CAD')],
          ['Retour total', `${result.summary.total_return.toFixed(2)}%`],
          ['Rendement annuel moyen', `${result.summary.avg_annual_return.toFixed(2)}%`],
          ['Break-even', `Année ${result.summary.break_even_year}`],
          ['IRR', `${result.summary.irr.toFixed(2)}%`],
          ['NPV', formatCurrency(result.summary.npv, 'CAD')],
          ['Économies dépréciation', formatCurrency(result.summary.total_depreciation_savings, 'CAD')],
          ['Impôt plus-value', formatCurrency(result.summary.capital_gains_tax, 'CAD')],
          ['Valeur nette après vente', formatCurrency(result.summary.net_proceeds_after_sale, 'CAD')]
        ],
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] },
        margin: { left: 20, right: 20 }
      })

      // Tableau annuel
      yPos = doc.lastAutoTable.finalY + 10
      const yearlyBody = result.yearly_data.map(year => [
        `Année ${year.year}`,
        formatCurrency(year.property_value, scenario.promoter_data.rent_currency),
        formatCurrency(year.rental_income, scenario.promoter_data.rent_currency),
        formatCurrency(year.net_income, scenario.promoter_data.rent_currency),
        formatCurrency(year.cumulative_cashflow, scenario.promoter_data.rent_currency),
        `${year.roi.toFixed(2)}%`
      ])

      doc.autoTable({
        startY: yPos,
        head: [['Année', 'Valeur propriété', 'Revenus locatifs', 'Revenus nets', 'Cashflow cumulé', 'ROI']],
        body: yearlyBody,
        theme: 'striped',
        headStyles: { fillColor: [94, 94, 94], fontSize: 9 },
        bodyStyles: { fontSize: 8 },
        margin: { left: 20, right: 20 }
      })
    }

    // Pied de page
    const pageCount = doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setTextColor(150, 150, 150)
      doc.text(
        `Page ${i} sur ${pageCount}`,
        105,
        290,
        { align: 'center' }
      )
      doc.text(
        'Généré par CERDIA Investissement',
        105,
        285,
        { align: 'center' }
      )
    }

    // Sauvegarder
    doc.save(`Scenario_${scenario.name.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.pdf`)
  }

  // Export d'un projet avec valeurs réelles
  const exportProjectPDF = async (
    scenario: ScenarioData,
    results: ScenarioResult[],
    actualValues: ActualValue[]
  ) => {
    const doc = new jsPDF()
    let yPos = 20

    // En-tête
    doc.setFontSize(20)
    doc.setTextColor(40, 40, 40)
    doc.text('RAPPORT DE PERFORMANCE', 105, yPos, { align: 'center' })

    yPos += 10
    doc.setFontSize(16)
    doc.text(scenario.name, 105, yPos, { align: 'center' })

    yPos += 15
    doc.setFontSize(10)
    doc.setTextColor(100, 100, 100)
    doc.text(`Généré le ${new Date().toLocaleDateString('fr-CA')}`, 105, yPos, { align: 'center' })

    // Informations du projet
    yPos += 15
    doc.setFontSize(14)
    doc.setTextColor(40, 40, 40)
    doc.text('INFORMATIONS DU PROJET', 20, yPos)

    yPos += 10
    doc.autoTable({
      startY: yPos,
      head: [['Propriété', 'Valeur']],
      body: [
        ['Nom du projet', scenario.name],
        ['Unité', scenario.unit_number],
        ['Adresse', `${scenario.address}, ${scenario.state_region}, ${scenario.country}`],
        ['Prix d\'achat', formatCurrency(scenario.purchase_price, scenario.promoter_data.rent_currency)],
        ['Statut', 'ACHETÉ ✓']
      ],
      theme: 'striped',
      headStyles: { fillColor: [34, 197, 94] },
      margin: { left: 20, right: 20 }
    })

    // Comparaison Projections vs Réalité
    if (actualValues.length > 0) {
      doc.addPage()
      yPos = 20

      doc.setFontSize(14)
      doc.text('COMPARAISON: PROJECTIONS VS RÉALITÉ', 20, yPos)

      yPos += 10

      // Trouver le scénario modéré pour la comparaison
      const moderateScenario = results.find(r => r.scenario_type === 'moderate')

      if (moderateScenario) {
        const comparisonBody = actualValues.map(actual => {
          const projected = moderateScenario.yearly_data.find(y => y.year === actual.year)
          return [
            `Année ${actual.year}`,
            projected ? formatCurrency(projected.rental_income, scenario.promoter_data.rent_currency) : 'N/A',
            actual.rental_income ? formatCurrency(actual.rental_income, scenario.promoter_data.rent_currency) : 'N/A',
            projected && actual.rental_income
              ? `${(((actual.rental_income - projected.rental_income) / projected.rental_income) * 100).toFixed(1)}%`
              : 'N/A',
            actual.occupancy_rate ? `${actual.occupancy_rate}%` : 'N/A'
          ]
        })

        doc.autoTable({
          startY: yPos,
          head: [['Année', 'Revenus projetés', 'Revenus réels', 'Écart', 'Taux occupation']],
          body: comparisonBody,
          theme: 'grid',
          headStyles: { fillColor: [59, 130, 246] },
          margin: { left: 20, right: 20 }
        })
      }
    }

    // Pied de page
    const pageCount = doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setTextColor(150, 150, 150)
      doc.text(
        `Page ${i} sur ${pageCount}`,
        105,
        290,
        { align: 'center' }
      )
      doc.text(
        'Généré par CERDIA Investissement',
        105,
        285,
        { align: 'center' }
      )
    }

    // Sauvegarder
    doc.save(`Projet_${scenario.name.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.pdf`)
  }

  return {
    exportScenarioPDF,
    exportProjectPDF
  }
}
