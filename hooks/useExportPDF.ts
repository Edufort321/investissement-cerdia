import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface ScenarioData {
  name: string
  unit_number?: string
  address?: string
  country?: string
  state_region?: string
  promoter_name?: string
  broker_name?: string
  company_name?: string
  purchase_price: number
  description?: string
  purchase_currency?: 'USD' | 'CAD'
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

  // Fonction pour charger une image et la convertir en base64
  const loadImageAsBase64 = async (url: string): Promise<string> => {
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })
    } catch (error) {
      console.error('Error loading image:', error)
      return ''
    }
  }

  // Fonction pour ajouter l'en-tête avec logo
  const addHeader = async (doc: jsPDF, title: string, subtitle: string) => {
    // Charger le logo
    const logoBase64 = await loadImageAsBase64('/logo-cerdia3.png')

    // Ajouter le logo en haut à gauche avec ratio correct pour éviter l'écrasement
    if (logoBase64) {
      try {
        // Dimensions réduites avec ratio 3:1 pour un logo horizontal équilibré
        doc.addImage(logoBase64, 'PNG', 15, 10, 24, 8)
      } catch (error) {
        console.error('Error adding logo:', error)
      }
    }

    // Titre principal à droite du logo
    doc.setFontSize(20)
    doc.setTextColor(94, 94, 94)
    doc.text(title, 200, 17, { align: 'right' })

    // Sous-titre
    doc.setFontSize(12)
    doc.setTextColor(120, 120, 120)
    doc.text(subtitle, 200, 24, { align: 'right' })

    // Ligne de séparation
    doc.setDrawColor(94, 94, 94)
    doc.setLineWidth(0.5)
    doc.line(15, 30, 195, 30)

    return 35
  }

  // Fonction pour ajouter le pied de page
  const addFooter = (doc: jsPDF) => {
    const pageCount = doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)

      // Ligne de séparation en bas
      doc.setDrawColor(200, 200, 200)
      doc.setLineWidth(0.3)
      doc.line(15, 280, 195, 280)

      // Texte du pied de page
      doc.setFontSize(8)
      doc.setTextColor(120, 120, 120)
      doc.text(
        'CERDIA Investissement - Rapport genere automatiquement',
        105,
        285,
        { align: 'center' }
      )
      doc.text(
        `Page ${i} sur ${pageCount}`,
        105,
        290,
        { align: 'center' }
      )
      doc.text(
        `Genere le ${new Date().toLocaleDateString('fr-CA', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}`,
        200,
        290,
        { align: 'right' }
      )
    }
  }

  // Fonction pour dessiner un graphique linéaire
  const drawLineChart = (
    doc: jsPDF,
    x: number,
    y: number,
    width: number,
    height: number,
    data: number[],
    color: number[],
    title: string,
    yAxisLabel: string
  ) => {
    // Cadre du graphique
    doc.setDrawColor(200, 200, 200)
    doc.setLineWidth(0.5)
    doc.rect(x, y, width, height, 'S')

    // Titre
    doc.setFontSize(10)
    doc.setTextColor(60, 60, 60)
    doc.text(title, x + width / 2, y - 3, { align: 'center' })

    // Trouver min/max pour l'échelle
    const maxValue = Math.max(...data)
    const minValue = Math.min(...data, 0)
    const range = maxValue - minValue

    if (range === 0) return

    // Dessiner les axes
    doc.setDrawColor(150, 150, 150)
    doc.line(x, y + height, x + width, y + height) // Axe X
    doc.line(x, y, x, y + height) // Axe Y

    // Dessiner la ligne
    doc.setDrawColor(color[0], color[1], color[2])
    doc.setLineWidth(2)

    const pointSpacing = width / (data.length - 1)
    for (let i = 0; i < data.length - 1; i++) {
      const x1 = x + i * pointSpacing
      const y1 = y + height - ((data[i] - minValue) / range) * height
      const x2 = x + (i + 1) * pointSpacing
      const y2 = y + height - ((data[i + 1] - minValue) / range) * height
      doc.line(x1, y1, x2, y2)
    }

    // Points sur la ligne
    doc.setFillColor(color[0], color[1], color[2])
    data.forEach((value, i) => {
      const px = x + i * pointSpacing
      const py = y + height - ((value - minValue) / range) * height
      doc.circle(px, py, 1, 'F')
    })

    // Label Y-axis
    doc.setFontSize(7)
    doc.setTextColor(120, 120, 120)
    doc.text(yAxisLabel, x - 2, y + height / 2, { align: 'right', angle: 90 })
  }

  // Fonction pour dessiner un graphique en barres comparatif
  const drawComparisonBarChart = (
    doc: jsPDF,
    x: number,
    y: number,
    width: number,
    height: number,
    scenarios: { label: string; value: number; color: number[] }[],
    title: string
  ) => {
    // Titre
    doc.setFontSize(10)
    doc.setTextColor(60, 60, 60)
    doc.text(title, x + width / 2, y - 3, { align: 'center' })

    // Cadre
    doc.setDrawColor(200, 200, 200)
    doc.setLineWidth(0.5)
    doc.rect(x, y, width, height, 'S')

    // Trouver la valeur max
    const maxValue = Math.max(...scenarios.map(s => s.value))
    if (maxValue === 0) return

    const barWidth = width / scenarios.length * 0.7
    const spacing = width / scenarios.length

    scenarios.forEach((scenario, i) => {
      const barHeight = (scenario.value / maxValue) * height * 0.9
      const barX = x + i * spacing + spacing / 2 - barWidth / 2
      const barY = y + height - barHeight

      // Dessiner la barre
      doc.setFillColor(scenario.color[0], scenario.color[1], scenario.color[2])
      doc.rect(barX, barY, barWidth, barHeight, 'F')

      // Label
      doc.setFontSize(7)
      doc.setTextColor(60, 60, 60)
      doc.text(scenario.label, barX + barWidth / 2, y + height + 4, { align: 'center' })

      // Valeur au-dessus de la barre
      doc.setFontSize(7)
      doc.text(`${scenario.value.toFixed(1)}%`, barX + barWidth / 2, barY - 2, { align: 'center' })
    })
  }

  // Export d'un scénario complet
  const exportScenarioPDF = async (scenario: ScenarioData, results: ScenarioResult[]) => {
    const doc = new jsPDF()

    // En-tête avec logo
    let yPos = await addHeader(doc, 'RAPPORT D\'ANALYSE', scenario.name)
    yPos += 5

    // Encadré avec informations clés
    doc.setFillColor(249, 250, 251)
    doc.rect(15, yPos, 180, 25, 'F')
    doc.setDrawColor(229, 231, 235)
    doc.rect(15, yPos, 180, 25, 'S')

    yPos += 7
    doc.setFontSize(10)
    doc.setTextColor(60, 60, 60)
    doc.text('TYPE DE DOCUMENT:', 20, yPos)
    doc.text('Analyse d\'investissement immobilier', 70, yPos)

    yPos += 6
    doc.text('STATUT:', 20, yPos)
    const statusText = scenario.status === 'purchased' ? 'ACHETE' :
                       scenario.status === 'approved' ? 'APPROUVE' :
                       scenario.status === 'pending_vote' ? 'EN VOTE' : 'BROUILLON'
    doc.text(statusText, 70, yPos)

    yPos += 6
    doc.text('DATE DE LIVRAISON:', 20, yPos)
    doc.text(scenario.delivery_date || 'Non definie', 70, yPos)

    yPos += 15

    // Section: Description du projet (si disponible)
    if (scenario.description && scenario.description.trim()) {
      doc.setFontSize(14)
      doc.setTextColor(94, 94, 94)
      doc.text('DESCRIPTION DU PROJET', 15, yPos)

      yPos += 7
      doc.setFontSize(10)
      doc.setTextColor(60, 60, 60)

      // Découper la description en lignes
      const descLines = doc.splitTextToSize(scenario.description, 180)
      doc.text(descLines, 15, yPos)
      yPos += (descLines.length * 5) + 10
    }

    // Section: Informations du projet
    doc.setFontSize(14)
    doc.setTextColor(94, 94, 94)
    doc.text('INFORMATIONS DU PROJET', 15, yPos)
    yPos += 5

    // Construire l'adresse complète en gérant les valeurs manquantes
    const addressParts = [scenario.address, scenario.state_region, scenario.country].filter(Boolean)
    const fullAddress = addressParts.length > 0 ? addressParts.join(', ') : 'N/A'

    // Déterminer la devise d'affichage
    const displayCurrency = scenario.purchase_currency || scenario.promoter_data.rent_currency || 'USD'

    autoTable(doc, {
      startY: yPos,
      head: [['Propriete', 'Valeur']],
      body: [
        ['Nom du projet', scenario.name || 'N/A'],
        ['Unite', scenario.unit_number || 'N/A'],
        ['Adresse', fullAddress],
        ['Promoteur', scenario.promoter_name || 'N/A'],
        ['Courtier', scenario.broker_name || 'N/A'],
        ['Compagnie', scenario.company_name || 'N/A'],
        ['Prix d\'achat', formatCurrency(scenario.purchase_price, displayCurrency)]
      ],
      theme: 'striped',
      headStyles: {
        fillColor: [94, 94, 94],
        fontSize: 11,
        fontStyle: 'bold',
        textColor: [255, 255, 255]
      },
      bodyStyles: {
        fontSize: 10,
        textColor: [60, 60, 60]
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251]
      },
      margin: { left: 15, right: 15 }
    })

    // Section: Paramètres financiers
    yPos = (doc as any).lastAutoTable.finalY + 15
    doc.setFontSize(14)
    doc.setTextColor(94, 94, 94)
    doc.text('PARAMETRES FINANCIERS', 15, yPos)
    yPos += 5

    autoTable(doc, {
      startY: yPos,
      head: [['Parametre', 'Valeur']],
      body: [
        ['Type de loyer', scenario.promoter_data.rent_type === 'monthly' ? 'Mensuel' : 'Journalier'],
        ['Loyer ' + (scenario.promoter_data.rent_type === 'monthly' ? 'mensuel' : 'journalier'),
         formatCurrency(scenario.promoter_data.monthly_rent, scenario.promoter_data.rent_currency)],
        ['Appreciation annuelle', `${scenario.promoter_data.annual_appreciation}%`],
        ['Taux d\'occupation', `${scenario.promoter_data.occupancy_rate}%`],
        ['Frais de gestion', `${scenario.promoter_data.management_fees}%`],
        ['Duree du projet', `${scenario.promoter_data.project_duration} ans`],
        ['Taux d\'imposition', `${scenario.promoter_data.tax_rate}%`],
        ['Augmentation locative annuelle', `${scenario.promoter_data.annual_rent_increase}%`]
      ],
      theme: 'striped',
      headStyles: {
        fillColor: [94, 94, 94],
        fontSize: 11,
        fontStyle: 'bold',
        textColor: [255, 255, 255]
      },
      bodyStyles: {
        fontSize: 10,
        textColor: [60, 60, 60]
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251]
      },
      margin: { left: 15, right: 15 }
    })

    // Section: Projections par scénario
    for (const result of results) {
      // Nouvelle page pour chaque scénario
      doc.addPage()
      yPos = await addHeader(doc, 'SCÉNARIO ' + result.scenario_type.toUpperCase(), scenario.name)
      yPos += 10

      // Indicateur de recommandation
      const recColor = result.summary.recommendation === 'recommended' ? [34, 197, 94] :
                       result.summary.recommendation === 'consider' ? [234, 179, 8] :
                       [239, 68, 68]

      doc.setFillColor(recColor[0], recColor[1], recColor[2])
      doc.setDrawColor(recColor[0], recColor[1], recColor[2])
      doc.rect(15, yPos, 180, 12, 'FD')

      doc.setFontSize(12)
      doc.setTextColor(255, 255, 255)
      const recText = result.summary.recommendation === 'recommended' ? 'PROJET RECOMMANDE' :
                     result.summary.recommendation === 'consider' ? 'PROJET A CONSIDERER' :
                     'PROJET NON RECOMMANDE'
      doc.text(recText, 105, yPos + 8, { align: 'center' })

      yPos += 20

      // Résumé du scénario avec style amélioré
      const finalCashflow = result.yearly_data[result.yearly_data.length - 1]?.cumulative_cashflow || 0

      autoTable(doc, {
        startY: yPos,
        head: [['Metrique cle', 'Valeur']],
        body: [
          ['Valeur finale du bien', formatCurrency(result.summary.final_property_value, 'CAD')],
          ['Revenus nets totaux', formatCurrency(result.summary.total_net_income, 'CAD')],
          ['Cashflow cumule final', formatCurrency(finalCashflow, 'CAD')],
          ['Retour sur investissement total', `${result.summary.total_return.toFixed(2)}%`],
          ['Rendement annuel moyen', `${result.summary.avg_annual_return.toFixed(2)}%`],
          ['Annee de break-even', `Annee ${result.summary.break_even_year}`],
          ['Taux de rendement interne (IRR)', `${result.summary.irr.toFixed(2)}%`],
          ['Valeur actuelle nette (VAN)', formatCurrency(result.summary.npv, 'CAD')],
          ['Economies de depreciation', formatCurrency(result.summary.total_depreciation_savings, 'CAD')],
          ['Impot sur la plus-value', formatCurrency(result.summary.capital_gains_tax, 'CAD')],
          ['Liquidite nette apres vente', formatCurrency(result.summary.net_proceeds_after_sale, 'CAD')]
        ],
        theme: 'grid',
        headStyles: {
          fillColor: [59, 130, 246],
          fontSize: 11,
          fontStyle: 'bold',
          textColor: [255, 255, 255]
        },
        bodyStyles: {
          fontSize: 10,
          textColor: [60, 60, 60]
        },
        columnStyles: {
          0: { fontStyle: 'bold' },
          1: { halign: 'right' }
        },
        margin: { left: 15, right: 15 }
      })

      // Graphiques de projection
      yPos = (doc as any).lastAutoTable.finalY + 15

      // Définir la couleur selon le type de scénario
      const scenarioColor = result.scenario_type === 'conservative' ? [34, 197, 94] :
                           result.scenario_type === 'moderate' ? [59, 130, 246] :
                           [239, 68, 68]

      // Graphique 1: Évolution du Cashflow Cumulé
      const cashflowData = result.yearly_data.map(y => y.cumulative_cashflow / 1000) // En milliers
      drawLineChart(
        doc,
        15,
        yPos,
        85,
        50,
        cashflowData,
        scenarioColor,
        'Evolution du Cashflow Cumule',
        'Milliers $'
      )

      // Graphique 2: Évolution de la Valeur de la Propriété
      const propertyValueData = result.yearly_data.map(y => y.property_value / 1000) // En milliers
      drawLineChart(
        doc,
        110,
        yPos,
        85,
        50,
        propertyValueData,
        scenarioColor,
        'Evolution de la Valeur du Bien',
        'Milliers $'
      )

      yPos += 60

      // Tableau annuel détaillé
      doc.setFontSize(12)
      doc.setTextColor(94, 94, 94)
      doc.text('PROJECTION ANNUELLE DETAILLEE', 15, yPos)
      yPos += 5

      const yearlyBody = result.yearly_data.map(year => [
        `Annee ${year.year}`,
        formatCurrency(year.property_value, scenario.promoter_data.rent_currency),
        formatCurrency(year.rental_income, scenario.promoter_data.rent_currency),
        formatCurrency(year.net_income, scenario.promoter_data.rent_currency),
        formatCurrency(year.cumulative_cashflow, scenario.promoter_data.rent_currency),
        `${year.roi.toFixed(2)}%`
      ])

      autoTable(doc, {
        startY: yPos,
        head: [['Annee', 'Valeur du bien', 'Revenus locatifs', 'Revenus nets', 'Cashflow cumule', 'ROI']],
        body: yearlyBody,
        theme: 'striped',
        headStyles: {
          fillColor: [94, 94, 94],
          fontSize: 9,
          fontStyle: 'bold',
          textColor: [255, 255, 255],
          halign: 'center'
        },
        bodyStyles: {
          fontSize: 8,
          textColor: [60, 60, 60]
        },
        columnStyles: {
          0: { halign: 'center', fontStyle: 'bold' },
          1: { halign: 'right' },
          2: { halign: 'right' },
          3: { halign: 'right' },
          4: { halign: 'right' },
          5: { halign: 'right', fontStyle: 'bold' }
        },
        alternateRowStyles: {
          fillColor: [249, 250, 251]
        },
        margin: { left: 15, right: 15 }
      })
    }

    // Page de comparaison finale
    doc.addPage()
    yPos = await addHeader(doc, 'COMPARAISON DES SCENARIOS', scenario.name)
    yPos += 15

    // Titre
    doc.setFontSize(14)
    doc.setTextColor(94, 94, 94)
    doc.text('ANALYSE COMPARATIVE DES 3 SCENARIOS', 105, yPos, { align: 'center' })
    yPos += 15

    // Graphique comparatif: ROI Moyen Annuel
    const roiComparison = results.map(r => ({
      label: r.scenario_type === 'conservative' ? 'Conserv.' :
             r.scenario_type === 'moderate' ? 'Modere' : 'Eleve',
      value: r.summary.avg_annual_return,
      color: r.scenario_type === 'conservative' ? [34, 197, 94] :
             r.scenario_type === 'moderate' ? [59, 130, 246] :
             [239, 68, 68]
    }))

    drawComparisonBarChart(
      doc,
      15,
      yPos,
      180,
      50,
      roiComparison,
      'Rendement Annuel Moyen (%)'
    )

    yPos += 65

    // Graphique comparatif: Retour Total
    const totalReturnComparison = results.map(r => ({
      label: r.scenario_type === 'conservative' ? 'Conserv.' :
             r.scenario_type === 'moderate' ? 'Modere' : 'Eleve',
      value: r.summary.total_return,
      color: r.scenario_type === 'conservative' ? [34, 197, 94] :
             r.scenario_type === 'moderate' ? [59, 130, 246] :
             [239, 68, 68]
    }))

    drawComparisonBarChart(
      doc,
      15,
      yPos,
      180,
      50,
      totalReturnComparison,
      'Retour sur Investissement Total (%)'
    )

    yPos += 65

    // Tableau récapitulatif
    doc.setFontSize(12)
    doc.setTextColor(94, 94, 94)
    doc.text('TABLEAU RECAPITULATIF', 15, yPos)
    yPos += 5

    const comparisonBody = results.map(r => [
      r.scenario_type === 'conservative' ? 'Conservateur' :
      r.scenario_type === 'moderate' ? 'Modere' :
      'Eleve',
      formatCurrency(r.summary.final_property_value, 'CAD'),
      formatCurrency(r.summary.total_net_income, 'CAD'),
      `${r.summary.avg_annual_return.toFixed(2)}%`,
      `${r.summary.total_return.toFixed(2)}%`,
      `Annee ${r.summary.break_even_year}`,
      r.summary.recommendation === 'recommended' ? 'Recommande' :
      r.summary.recommendation === 'consider' ? 'A considerer' :
      'Non recommande'
    ])

    autoTable(doc, {
      startY: yPos,
      head: [['Scenario', 'Valeur finale', 'Revenus nets', 'ROI moyen', 'ROI total', 'Break-even', 'Recommandation']],
      body: comparisonBody,
      theme: 'striped',
      headStyles: {
        fillColor: [94, 94, 94],
        fontSize: 9,
        fontStyle: 'bold',
        textColor: [255, 255, 255],
        halign: 'center'
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [60, 60, 60]
      },
      columnStyles: {
        0: { fontStyle: 'bold', halign: 'center' },
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right', fontStyle: 'bold' },
        4: { halign: 'right', fontStyle: 'bold' },
        5: { halign: 'center' },
        6: { halign: 'center', fontStyle: 'bold' }
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251]
      },
      margin: { left: 15, right: 15 }
    })

    // Ajouter les pieds de page
    addFooter(doc)

    // Sauvegarder
    const fileName = `Rapport_${scenario.name.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
    doc.save(fileName)
  }

  // Export d'un projet avec valeurs réelles
  const exportProjectPDF = async (
    scenario: ScenarioData,
    results: ScenarioResult[],
    actualValues: ActualValue[]
  ) => {
    const doc = new jsPDF()

    // En-tête avec logo
    let yPos = await addHeader(doc, 'RAPPORT DE PERFORMANCE', scenario.name)
    yPos += 5

    // Encadré vert pour projet acheté
    doc.setFillColor(220, 252, 231)
    doc.rect(15, yPos, 180, 12, 'F')
    doc.setDrawColor(34, 197, 94)
    doc.rect(15, yPos, 180, 12, 'S')

    doc.setFontSize(12)
    doc.setTextColor(22, 163, 74)
    doc.text('PROJET ACHETE - SUIVI DES PERFORMANCES', 105, yPos + 8, { align: 'center' })

    yPos += 20

    // Section: Description du projet (si disponible)
    if (scenario.description && scenario.description.trim()) {
      doc.setFontSize(14)
      doc.setTextColor(94, 94, 94)
      doc.text('DESCRIPTION DU PROJET', 15, yPos)

      yPos += 7
      doc.setFontSize(10)
      doc.setTextColor(60, 60, 60)

      const descLines = doc.splitTextToSize(scenario.description, 180)
      doc.text(descLines, 15, yPos)
      yPos += (descLines.length * 5) + 10
    }

    // Construire l'adresse complète
    const addressParts2 = [scenario.address, scenario.state_region, scenario.country].filter(Boolean)
    const fullAddress2 = addressParts2.length > 0 ? addressParts2.join(', ') : 'N/A'

    // Informations du projet
    doc.setFontSize(14)
    doc.setTextColor(94, 94, 94)
    doc.text('INFORMATIONS DU PROJET', 15, yPos)
    yPos += 5

    autoTable(doc, {
      startY: yPos,
      head: [['Propriete', 'Valeur']],
      body: [
        ['Nom du projet', scenario.name || 'N/A'],
        ['Unite', scenario.unit_number || 'N/A'],
        ['Adresse', fullAddress2],
        ['Promoteur', scenario.promoter_name || 'N/A'],
        ['Prix d\'achat', formatCurrency(scenario.purchase_price, scenario.promoter_data.rent_currency)],
        ['Date de livraison', scenario.delivery_date || 'Non definie']
      ],
      theme: 'striped',
      headStyles: {
        fillColor: [34, 197, 94],
        fontSize: 11,
        fontStyle: 'bold',
        textColor: [255, 255, 255]
      },
      bodyStyles: {
        fontSize: 10,
        textColor: [60, 60, 60]
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251]
      },
      margin: { left: 15, right: 15 }
    })

    // Comparaison Projections vs Réalité
    if (actualValues.length > 0) {
      doc.addPage()
      yPos = await addHeader(doc, 'COMPARAISON', 'Projections vs Réalité')
      yPos += 10

      // Trouver le scénario modéré pour la comparaison
      const moderateScenario = results.find(r => r.scenario_type === 'moderate')

      if (moderateScenario) {
        const comparisonBody = actualValues.map(actual => {
          const projected = moderateScenario.yearly_data.find(y => y.year === actual.year)
          const variance = projected && actual.rental_income
            ? ((actual.rental_income - projected.rental_income) / projected.rental_income) * 100
            : 0

          return [
            `Année ${actual.year}`,
            projected ? formatCurrency(projected.rental_income, scenario.promoter_data.rent_currency) : 'N/A',
            actual.rental_income ? formatCurrency(actual.rental_income, scenario.promoter_data.rent_currency) : 'N/A',
            variance !== 0 ? `${variance > 0 ? '+' : ''}${variance.toFixed(1)}%` : 'N/A',
            actual.occupancy_rate ? `${actual.occupancy_rate}%` : 'N/A'
          ]
        })

        autoTable(doc, {
          startY: yPos,
          head: [['Annee', 'Revenus projetes', 'Revenus reels', 'Ecart (%)', 'Taux d\'occupation']],
          body: comparisonBody,
          theme: 'grid',
          headStyles: {
            fillColor: [59, 130, 246],
            fontSize: 10,
            fontStyle: 'bold',
            textColor: [255, 255, 255],
            halign: 'center'
          },
          bodyStyles: {
            fontSize: 9,
            textColor: [60, 60, 60]
          },
          columnStyles: {
            0: { halign: 'center', fontStyle: 'bold' },
            1: { halign: 'right' },
            2: { halign: 'right' },
            3: { halign: 'center', fontStyle: 'bold' },
            4: { halign: 'center' }
          },
          margin: { left: 15, right: 15 }
        })
      }
    }

    // Ajouter les pieds de page
    addFooter(doc)

    // Sauvegarder
    const fileName = `Performance_${scenario.name.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
    doc.save(fileName)
  }

  return {
    exportScenarioPDF,
    exportProjectPDF
  }
}
