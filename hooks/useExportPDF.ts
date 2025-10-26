import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface ScenarioData {
  name: string
  unit_number: string
  address: string
  country: string
  state_region: string
  promoter_name: string
  broker_name?: string
  company_name?: string
  purchase_price: number
  description?: string
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

    // Ajouter le logo en haut à gauche
    if (logoBase64) {
      try {
        doc.addImage(logoBase64, 'PNG', 15, 10, 40, 15)
      } catch (error) {
        console.error('Error adding logo:', error)
      }
    }

    // Titre principal à droite du logo
    doc.setFontSize(22)
    doc.setTextColor(94, 94, 94)
    doc.setFont('helvetica', 'bold')
    doc.text(title, 200, 18, { align: 'right' })

    // Sous-titre
    doc.setFontSize(14)
    doc.setTextColor(120, 120, 120)
    doc.setFont('helvetica', 'normal')
    doc.text(subtitle, 200, 25, { align: 'right' })

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
      doc.setFont('helvetica', 'normal')
      doc.text(
        'CERDIA Investissement - Rapport généré automatiquement',
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
        `Généré le ${new Date().toLocaleDateString('fr-CA', {
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
    doc.setFont('helvetica', 'bold')
    doc.text('TYPE DE DOCUMENT:', 20, yPos)
    doc.setFont('helvetica', 'normal')
    doc.text('Analyse d\'investissement immobilier', 70, yPos)

    yPos += 6
    doc.setFont('helvetica', 'bold')
    doc.text('STATUT:', 20, yPos)
    doc.setFont('helvetica', 'normal')
    const statusText = scenario.status === 'purchased' ? 'ACHETÉ' :
                       scenario.status === 'approved' ? 'APPROUVÉ' :
                       scenario.status === 'pending_vote' ? 'EN VOTE' : 'BROUILLON'
    doc.text(statusText, 70, yPos)

    yPos += 6
    doc.setFont('helvetica', 'bold')
    doc.text('DATE DE LIVRAISON:', 20, yPos)
    doc.setFont('helvetica', 'normal')
    doc.text(scenario.delivery_date || 'Non définie', 70, yPos)

    yPos += 15

    // Section: Description du projet (si disponible)
    if (scenario.description && scenario.description.trim()) {
      doc.setFontSize(14)
      doc.setTextColor(94, 94, 94)
      doc.setFont('helvetica', 'bold')
      doc.text('DESCRIPTION DU PROJET', 15, yPos)

      yPos += 7
      doc.setFontSize(10)
      doc.setTextColor(60, 60, 60)
      doc.setFont('helvetica', 'normal')

      // Découper la description en lignes
      const descLines = doc.splitTextToSize(scenario.description, 180)
      doc.text(descLines, 15, yPos)
      yPos += (descLines.length * 5) + 10
    }

    // Section: Informations du projet
    doc.setFontSize(14)
    doc.setTextColor(94, 94, 94)
    doc.setFont('helvetica', 'bold')
    doc.text('INFORMATIONS DU PROJET', 15, yPos)
    yPos += 5

    autoTable(doc, {
      startY: yPos,
      head: [['Propriété', 'Valeur']],
      body: [
        ['Nom du projet', scenario.name],
        ['Unité', scenario.unit_number || 'N/A'],
        ['Adresse', `${scenario.address}, ${scenario.state_region}, ${scenario.country}`],
        ['Promoteur', scenario.promoter_name || 'N/A'],
        ['Courtier', scenario.broker_name || 'N/A'],
        ['Compagnie', scenario.company_name || 'N/A'],
        ['Prix d\'achat', formatCurrency(scenario.purchase_price, scenario.promoter_data.rent_currency)]
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
    doc.setFont('helvetica', 'bold')
    doc.text('PARAMÈTRES FINANCIERS', 15, yPos)
    yPos += 5

    autoTable(doc, {
      startY: yPos,
      head: [['Paramètre', 'Valeur']],
      body: [
        ['Type de loyer', scenario.promoter_data.rent_type === 'monthly' ? 'Mensuel' : 'Journalier'],
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
      doc.setFont('helvetica', 'bold')
      const recText = result.summary.recommendation === 'recommended' ? '✓ PROJET RECOMMANDÉ' :
                     result.summary.recommendation === 'consider' ? '⚠ PROJET À CONSIDÉRER' :
                     '✗ PROJET NON RECOMMANDÉ'
      doc.text(recText, 105, yPos + 8, { align: 'center' })

      yPos += 20

      // Résumé du scénario avec style amélioré
      const finalCashflow = result.yearly_data[result.yearly_data.length - 1]?.cumulative_cashflow || 0

      autoTable(doc, {
        startY: yPos,
        head: [['Métrique clé', 'Valeur']],
        body: [
          ['Valeur finale du bien', formatCurrency(result.summary.final_property_value, 'CAD')],
          ['Revenus nets totaux', formatCurrency(result.summary.total_net_income, 'CAD')],
          ['Cashflow cumulé final', formatCurrency(finalCashflow, 'CAD')],
          ['Retour sur investissement total', `${result.summary.total_return.toFixed(2)}%`],
          ['Rendement annuel moyen', `${result.summary.avg_annual_return.toFixed(2)}%`],
          ['Année de break-even', `Année ${result.summary.break_even_year}`],
          ['Taux de rendement interne (IRR)', `${result.summary.irr.toFixed(2)}%`],
          ['Valeur actuelle nette (VAN)', formatCurrency(result.summary.npv, 'CAD')],
          ['Économies de dépréciation', formatCurrency(result.summary.total_depreciation_savings, 'CAD')],
          ['Impôt sur la plus-value', formatCurrency(result.summary.capital_gains_tax, 'CAD')],
          ['Liquidité nette après vente', formatCurrency(result.summary.net_proceeds_after_sale, 'CAD')]
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

      // Tableau annuel détaillé
      yPos = (doc as any).lastAutoTable.finalY + 15

      doc.setFontSize(12)
      doc.setTextColor(94, 94, 94)
      doc.setFont('helvetica', 'bold')
      doc.text('PROJECTION ANNUELLE DÉTAILLÉE', 15, yPos)
      yPos += 5

      const yearlyBody = result.yearly_data.map(year => [
        `Année ${year.year}`,
        formatCurrency(year.property_value, scenario.promoter_data.rent_currency),
        formatCurrency(year.rental_income, scenario.promoter_data.rent_currency),
        formatCurrency(year.net_income, scenario.promoter_data.rent_currency),
        formatCurrency(year.cumulative_cashflow, scenario.promoter_data.rent_currency),
        `${year.roi.toFixed(2)}%`
      ])

      autoTable(doc, {
        startY: yPos,
        head: [['Année', 'Valeur du bien', 'Revenus locatifs', 'Revenus nets', 'Cashflow cumulé', 'ROI']],
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
    doc.setFont('helvetica', 'bold')
    doc.text('✓ PROJET ACHETÉ - SUIVI DES PERFORMANCES', 105, yPos + 8, { align: 'center' })

    yPos += 20

    // Section: Description du projet (si disponible)
    if (scenario.description && scenario.description.trim()) {
      doc.setFontSize(14)
      doc.setTextColor(94, 94, 94)
      doc.setFont('helvetica', 'bold')
      doc.text('DESCRIPTION DU PROJET', 15, yPos)

      yPos += 7
      doc.setFontSize(10)
      doc.setTextColor(60, 60, 60)
      doc.setFont('helvetica', 'normal')

      const descLines = doc.splitTextToSize(scenario.description, 180)
      doc.text(descLines, 15, yPos)
      yPos += (descLines.length * 5) + 10
    }

    // Informations du projet
    doc.setFontSize(14)
    doc.setTextColor(94, 94, 94)
    doc.setFont('helvetica', 'bold')
    doc.text('INFORMATIONS DU PROJET', 15, yPos)
    yPos += 5

    autoTable(doc, {
      startY: yPos,
      head: [['Propriété', 'Valeur']],
      body: [
        ['Nom du projet', scenario.name],
        ['Unité', scenario.unit_number || 'N/A'],
        ['Adresse', `${scenario.address}, ${scenario.state_region}, ${scenario.country}`],
        ['Promoteur', scenario.promoter_name || 'N/A'],
        ['Prix d\'achat', formatCurrency(scenario.purchase_price, scenario.promoter_data.rent_currency)],
        ['Date de livraison', scenario.delivery_date || 'Non définie']
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
          head: [['Année', 'Revenus projetés', 'Revenus réels', 'Écart (%)', 'Taux d\'occupation']],
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
