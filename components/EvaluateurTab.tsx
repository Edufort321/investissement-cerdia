'use client'

import { useState } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { Calculator, TrendingUp, DollarSign, Home, FileText, Download } from 'lucide-react'

interface ProjectData {
  // Prix et frais initiaux
  purchasePrice: number
  currency: 'USD' | 'CAD' // Devise du prix d'achat
  initialFees: number

  // Projections marché
  annualAppreciation: number // %
  occupancyRate: number // %
  monthlyRent: number

  // Paramètres projet
  projectDuration: number // années
  annualManagementFees: number // %

  // Financement
  paymentType: 'cash' | 'financed'
  downPayment: number // %
  interestRate: number // %
  loanDuration: number // années
}

interface ScenarioResult {
  type: 'conservative' | 'moderate' | 'optimistic'
  yearlyData: YearData[]
  summary: ScenarioSummary
  evaluation: string
}

interface YearData {
  year: number
  propertyValue: number
  rentalIncome: number
  managementFees: number
  netIncome: number
  cumulativeCashflow: number
  roi: number
  netLiquidity: number
  remainingDebt: number
}

interface ScenarioSummary {
  totalReturn: number
  avgAnnualReturn: number
  totalNetIncome: number
  finalPropertyValue: number
  breakEvenYear: number
  recommendation: 'recommended' | 'consider' | 'not_recommended'
}

export default function EvaluateurTab() {
  const { t, language } = useLanguage()
  const fr = language === 'fr'

  const [projectData, setProjectData] = useState<ProjectData>({
    purchasePrice: 0,
    currency: 'USD',
    initialFees: 0,
    annualAppreciation: 5,
    occupancyRate: 80,
    monthlyRent: 0,
    projectDuration: 10,
    annualManagementFees: 10,
    paymentType: 'cash',
    downPayment: 20,
    interestRate: 5,
    loanDuration: 25
  })

  const [scenarios, setScenarios] = useState<ScenarioResult[] | null>(null)
  const [activeScenario, setActiveScenario] = useState<'conservative' | 'moderate' | 'optimistic'>('moderate')
  const [analyzing, setAnalyzing] = useState(false)

  const calculateScenarios = () => {
    setAnalyzing(true)

    // Calculer les 3 scénarios
    const conservative = calculateScenario('conservative')
    const moderate = calculateScenario('moderate')
    const optimistic = calculateScenario('optimistic')

    setScenarios([conservative, moderate, optimistic])
    setAnalyzing(false)
  }

  const calculateScenario = (type: 'conservative' | 'moderate' | 'optimistic'): ScenarioResult => {
    // Ajustements selon le scénario
    let appreciationMultiplier = 1
    let occupancyMultiplier = 1
    let rentMultiplier = 1

    if (type === 'conservative') {
      appreciationMultiplier = 0.8  // -20%
      occupancyMultiplier = 0.85    // -15%
      rentMultiplier = 0.9          // -10%
    } else if (type === 'optimistic') {
      appreciationMultiplier = 1.2  // +20%
      occupancyMultiplier = 1.1     // +10%
      rentMultiplier = 1.15         // +15%
    }

    const adjustedAppreciation = projectData.annualAppreciation * appreciationMultiplier
    const adjustedOccupancy = projectData.occupancyRate * occupancyMultiplier
    const adjustedRent = projectData.monthlyRent * rentMultiplier

    // Calculer investissement initial
    const totalInvestment = projectData.purchasePrice + projectData.initialFees
    const loanAmount = projectData.paymentType === 'financed'
      ? totalInvestment * (1 - projectData.downPayment / 100)
      : 0
    const initialCash = projectData.paymentType === 'financed'
      ? totalInvestment * (projectData.downPayment / 100)
      : totalInvestment

    // Calculer paiement mensuel hypothèque
    const monthlyPayment = projectData.paymentType === 'financed'
      ? calculateMonthlyPayment(loanAmount, projectData.interestRate, projectData.loanDuration)
      : 0

    const yearlyData: YearData[] = []
    let cumulativeCashflow = -initialCash
    let remainingDebt = loanAmount

    for (let year = 1; year <= projectData.projectDuration; year++) {
      // Valeur du bien
      const propertyValue = totalInvestment * Math.pow(1 + adjustedAppreciation / 100, year)

      // Revenus locatifs
      const annualRent = adjustedRent * 12 * (adjustedOccupancy / 100)

      // Frais de gestion
      const managementFees = annualRent * (projectData.annualManagementFees / 100)

      // Paiements hypothèque annuels
      const annualMortgagePayment = monthlyPayment * 12

      // Revenu net (loyer - frais - hypothèque)
      const netIncome = annualRent - managementFees - annualMortgagePayment

      // Cashflow cumulatif
      cumulativeCashflow += netIncome

      // Dette restante (simplifiée)
      if (remainingDebt > 0) {
        const principalPaid = calculatePrincipalPaid(loanAmount, projectData.interestRate, projectData.loanDuration, year)
        remainingDebt = loanAmount - principalPaid
      }

      // Liquidité nette
      const netLiquidity = propertyValue - remainingDebt

      // ROI
      const roi = initialCash > 0 ? ((netLiquidity - initialCash) / initialCash * 100) : 0

      yearlyData.push({
        year,
        propertyValue,
        rentalIncome: annualRent,
        managementFees,
        netIncome,
        cumulativeCashflow,
        roi,
        netLiquidity,
        remainingDebt
      })
    }

    // Calculer le résumé
    const finalYear = yearlyData[yearlyData.length - 1]
    const totalNetIncome = yearlyData.reduce((sum, y) => sum + y.netIncome, 0)
    const totalReturn = ((finalYear.netLiquidity - initialCash) / initialCash) * 100
    const avgAnnualReturn = totalReturn / projectData.projectDuration
    const breakEvenYear = yearlyData.findIndex(y => y.cumulativeCashflow > 0) + 1

    // Recommandation
    let recommendation: 'recommended' | 'consider' | 'not_recommended' = 'consider'
    if (avgAnnualReturn > 8 && breakEvenYear <= 5) {
      recommendation = 'recommended'
    } else if (avgAnnualReturn < 3 || breakEvenYear > 8) {
      recommendation = 'not_recommended'
    }

    // Générer évaluation écrite
    const evaluation = generateEvaluation(type, avgAnnualReturn, breakEvenYear, totalReturn, recommendation)

    const summary: ScenarioSummary = {
      totalReturn,
      avgAnnualReturn,
      totalNetIncome,
      finalPropertyValue: finalYear.propertyValue,
      breakEvenYear,
      recommendation
    }

    return {
      type,
      yearlyData,
      summary,
      evaluation
    }
  }

  const calculateMonthlyPayment = (principal: number, annualRate: number, years: number): number => {
    if (principal === 0) return 0
    const monthlyRate = annualRate / 100 / 12
    const numPayments = years * 12
    return principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1)
  }

  const calculatePrincipalPaid = (principal: number, annualRate: number, years: number, yearsElapsed: number): number => {
    if (principal === 0) return 0
    const monthlyRate = annualRate / 100 / 12
    const monthlyPayment = calculateMonthlyPayment(principal, annualRate, years)
    const monthsElapsed = yearsElapsed * 12

    let remainingPrincipal = principal
    for (let i = 0; i < monthsElapsed; i++) {
      const interestPayment = remainingPrincipal * monthlyRate
      const principalPayment = monthlyPayment - interestPayment
      remainingPrincipal -= principalPayment
    }

    return principal - remainingPrincipal
  }

  const generateEvaluation = (
    type: 'conservative' | 'moderate' | 'optimistic',
    avgReturn: number,
    breakEven: number,
    totalReturn: number,
    recommendation: 'recommended' | 'consider' | 'not_recommended'
  ): string => {
    const scenarioName = fr
      ? (type === 'conservative' ? 'Conservateur' : type === 'moderate' ? 'Modere' : 'Eleve')
      : (type === 'conservative' ? 'Conservative' : type === 'moderate' ? 'Moderate' : 'Optimistic')

    let viability = fr ? 'moyen' : 'moderate'
    if (avgReturn > 8 && breakEven <= 5) viability = fr ? 'bon' : 'good'
    if (avgReturn < 3 || breakEven > 8) viability = fr ? 'risque' : 'risky'

    let recText = fr ? 'a considerer avec prudence' : 'to consider with caution'
    if (recommendation === 'recommended') recText = fr ? 'recommande' : 'recommended'
    if (recommendation === 'not_recommended') recText = fr ? 'deconseille' : 'not recommended'

    let cashflowText = breakEven <= projectData.projectDuration
      ? (fr ? `Le cashflow devient positif des l'annee ${breakEven}.` : `Cashflow becomes positive from year ${breakEven}.`)
      : (fr ? 'Le cashflow reste negatif sur toute la periode.' : 'Cashflow remains negative throughout the period.')

    let strengths: string[] = []
    let concerns: string[] = []

    if (avgReturn > 8) {
      strengths.push(fr ? 'Rendement annuel moyen attractif' : 'Attractive average annual return')
    } else if (avgReturn < 3) {
      concerns.push(fr ? 'Rendement annuel moyen faible' : 'Low average annual return')
    }

    if (breakEven <= 5) {
      strengths.push(fr ? 'Point mort atteint rapidement' : 'Break-even reached quickly')
    } else if (breakEven > 7) {
      concerns.push(fr ? 'Point mort tres eloigne' : 'Break-even very distant')
    }

    if (totalReturn > 50) {
      strengths.push(fr ? 'Excellent retour sur investissement total' : 'Excellent total return on investment')
    }

    const strengthsText = strengths.length > 0
      ? (fr ? `**Points forts:** ${strengths.join(', ')}.` : `**Strengths:** ${strengths.join(', ')}.`)
      : ""

    const concernsText = concerns.length > 0
      ? (fr ? `**Points de vigilance:** ${concerns.join(', ')}.` : `**Watch points:** ${concerns.join(', ')}.`)
      : ""

    let profile = fr ? 'equilibre' : 'balanced'
    if (type === 'conservative') profile = fr ? 'conservateur' : 'conservative'
    if (type === 'optimistic') profile = fr ? 'agressif' : 'aggressive'

    return fr ? `
**Scenario ${scenarioName}**

**Viabilite:** ${viability.charAt(0).toUpperCase() + viability.slice(1)}

**Recommandation:** Projet ${recText}

${strengthsText}

${concernsText}

**Cashflow:** ${cashflowText}

**Horizon de rentabilite:** ${breakEven} ans

**Retour sur investissement total:** ${totalReturn.toFixed(1)}% sur ${projectData.projectDuration} ans

**Profil d'investisseur recommande:** ${profile.charAt(0).toUpperCase() + profile.slice(1)}
    `.trim() : `
**Scenario: ${scenarioName}**

**Viability:** ${viability.charAt(0).toUpperCase() + viability.slice(1)}

**Recommendation:** Project ${recText}

${strengthsText}

${concernsText}

**Cashflow:** ${cashflowText}

**Break-even horizon:** ${breakEven} years

**Total return on investment:** ${totalReturn.toFixed(1)}% over ${projectData.projectDuration} years

**Recommended investor profile:** ${profile.charAt(0).toUpperCase() + profile.slice(1)}
    `.trim()
  }

  const activeScenarioData = scenarios?.find(s => s.type === activeScenario)

  return (
    <div className="space-y-6 mt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{fr ? 'Evaluateur de Projets Immobiliers' : 'Real Estate Investment Evaluator'}</h2>
          <p className="text-sm sm:text-base text-gray-600 mt-1">{fr ? 'Analysez la rentabilite avec 3 scenarios automatiques' : 'Analyze profitability with 3 automatic scenarios'}</p>
        </div>
        <Calculator className="text-[#5e5e5e]" size={32} />
      </div>

      {/* Formulaire de saisie */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">{fr ? 'Donnees du projet' : 'Project data'}</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Prix et frais */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {fr ? "Prix d'achat" : 'Purchase price'} ({projectData.currency === 'USD' ? '$' : 'CAD $'})
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                value={projectData.purchasePrice || ''}
                onChange={(e) => setProjectData({...projectData, purchasePrice: parseFloat(e.target.value) || 0})}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                placeholder="250000"
              />
              <select
                value={projectData.currency}
                onChange={(e) => setProjectData({...projectData, currency: e.target.value as 'USD' | 'CAD'})}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent bg-white font-medium"
              >
                <option value="USD">USD</option>
                <option value="CAD">CAD</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{fr ? 'Frais initiaux ($)' : 'Initial fees ($)'}</label>
            <input
              type="number"
              value={projectData.initialFees || ''}
              onChange={(e) => setProjectData({...projectData, initialFees: parseFloat(e.target.value) || 0})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
              placeholder="15000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{fr ? 'Loyer mensuel estime ($)' : 'Estimated monthly rent ($)'}</label>
            <input
              type="number"
              value={projectData.monthlyRent || ''}
              onChange={(e) => setProjectData({...projectData, monthlyRent: parseFloat(e.target.value) || 0})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
              placeholder="1500"
            />
          </div>

          {/* Paramètres marché */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{fr ? 'Prise de valeur annuelle (%)' : 'Annual appreciation (%)'}</label>
            <input
              type="number"
              value={projectData.annualAppreciation || ''}
              onChange={(e) => setProjectData({...projectData, annualAppreciation: parseFloat(e.target.value) || 0})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
              placeholder="5"
              step="0.1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{fr ? "Taux d'occupation (%)" : 'Occupancy rate (%)'}</label>
            <input
              type="number"
              value={projectData.occupancyRate || ''}
              onChange={(e) => setProjectData({...projectData, occupancyRate: parseFloat(e.target.value) || 0})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
              placeholder="80"
              step="1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{fr ? 'Frais de gestion (%)' : 'Management fees (%)'}</label>
            <input
              type="number"
              value={projectData.annualManagementFees || ''}
              onChange={(e) => setProjectData({...projectData, annualManagementFees: parseFloat(e.target.value) || 0})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
              placeholder="10"
              step="0.1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{fr ? 'Duree du projet (annees)' : 'Project duration (years)'}</label>
            <input
              type="number"
              value={projectData.projectDuration || ''}
              onChange={(e) => setProjectData({...projectData, projectDuration: parseInt(e.target.value) || 10})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
              placeholder="10"
            />
          </div>

          {/* Type de paiement */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{fr ? 'Type de paiement' : 'Payment type'}</label>
            <select
              value={projectData.paymentType}
              onChange={(e) => setProjectData({...projectData, paymentType: e.target.value as 'cash' | 'financed'})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent bg-white"
            >
              <option value="cash">{fr ? 'Comptant' : 'Cash'}</option>
              <option value="financed">{fr ? 'Financement' : 'Financed'}</option>
            </select>
          </div>

          {/* Financement (conditionnel) */}
          {projectData.paymentType === 'financed' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{fr ? 'Mise de fonds (%)' : 'Down payment (%)'}</label>
                <input
                  type="number"
                  value={projectData.downPayment || ''}
                  onChange={(e) => setProjectData({...projectData, downPayment: parseFloat(e.target.value) || 0})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                  placeholder="20"
                  step="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{fr ? "Taux d'interet (%)" : 'Interest rate (%)'}</label>
                <input
                  type="number"
                  value={projectData.interestRate || ''}
                  onChange={(e) => setProjectData({...projectData, interestRate: parseFloat(e.target.value) || 0})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                  placeholder="5"
                  step="0.1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{fr ? 'Duree du pret (annees)' : 'Loan duration (years)'}</label>
                <input
                  type="number"
                  value={projectData.loanDuration || ''}
                  onChange={(e) => setProjectData({...projectData, loanDuration: parseInt(e.target.value) || 25})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                  placeholder="25"
                />
              </div>
            </>
          )}
        </div>

        {/* Bouton Analyser */}
        <div className="mt-6">
          <button
            onClick={calculateScenarios}
            disabled={analyzing || projectData.purchasePrice === 0}
            className="w-full sm:w-auto px-6 py-3 bg-[#5e5e5e] hover:bg-[#3e3e3e] text-white rounded-lg font-medium transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Calculator size={20} />
            {analyzing ? (fr ? 'Analyse en cours...' : 'Analyzing...') : (fr ? 'Analyser le projet' : 'Analyze project')}
          </button>
        </div>
      </div>

      {/* Résultats */}
      {scenarios && (
        <div className="space-y-6">
          {/* Onglets scénarios */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
            <div className="flex gap-2 overflow-x-auto">
              <button
                onClick={() => setActiveScenario('conservative')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                  activeScenario === 'conservative'
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                📉 {fr ? 'Conservateur' : 'Conservative'}
              </button>
              <button
                onClick={() => setActiveScenario('moderate')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                  activeScenario === 'moderate'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                📊 {fr ? 'Modere' : 'Moderate'}
              </button>
              <button
                onClick={() => setActiveScenario('optimistic')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                  activeScenario === 'optimistic'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                📈 {fr ? 'Eleve' : 'Optimistic'}
              </button>
            </div>
          </div>

          {/* Résumé du scénario */}
          {activeScenarioData && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
                  <div className="flex items-center gap-2 text-gray-600 text-sm mb-2">
                    <TrendingUp size={16} />
                    {fr ? 'Rendement annuel moyen' : 'Average annual return'}
                  </div>
                  <div className={`text-2xl font-bold ${
                    activeScenarioData.summary.avgAnnualReturn > 8 ? 'text-green-600' :
                    activeScenarioData.summary.avgAnnualReturn > 5 ? 'text-blue-600' : 'text-red-600'
                  }`}>
                    {activeScenarioData.summary.avgAnnualReturn.toFixed(2)}%
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
                  <div className="flex items-center gap-2 text-gray-600 text-sm mb-2">
                    <DollarSign size={16} />
                    {fr ? 'Retour total' : 'Total return'}
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {activeScenarioData.summary.totalReturn.toFixed(1)}%
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
                  <div className="flex items-center gap-2 text-gray-600 text-sm mb-2">
                    <Home size={16} />
                    {fr ? 'Valeur finale' : 'Final value'}
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {activeScenarioData.summary.finalPropertyValue.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
                  <div className="flex items-center gap-2 text-gray-600 text-sm mb-2">
                    <FileText size={16} />
                    {fr ? 'Point mort' : 'Break-even'}
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {fr ? 'Annee' : 'Year'} {activeScenarioData.summary.breakEvenYear}
                  </div>
                </div>
              </div>

              {/* Évaluation écrite */}
              <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">{fr ? 'Evaluation du projet' : 'Project evaluation'}</h3>
                <div className="prose prose-sm max-w-none">
                  {activeScenarioData.evaluation.split('\n').map((line, i) => (
                    <p key={i} className="text-gray-700 whitespace-pre-wrap">{line}</p>
                  ))}
                </div>
              </div>

              {/* Tableau des données annuelles */}
              <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 overflow-x-auto">
                <h3 className="text-lg font-bold text-gray-900 mb-4">{fr ? `Projection sur ${projectData.projectDuration} ans` : `${projectData.projectDuration}-year projection`}</h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left p-2 font-medium text-gray-700">{fr ? 'Annee' : 'Year'}</th>
                      <th className="text-right p-2 font-medium text-gray-700">{fr ? 'Valeur bien' : 'Property value'}</th>
                      <th className="text-right p-2 font-medium text-gray-700">{fr ? 'Revenus locatifs' : 'Rental income'}</th>
                      <th className="text-right p-2 font-medium text-gray-700">{fr ? 'Frais gestion' : 'Mgmt fees'}</th>
                      <th className="text-right p-2 font-medium text-gray-700">{fr ? 'Revenu net' : 'Net income'}</th>
                      <th className="text-right p-2 font-medium text-gray-700">{fr ? 'Cashflow cumule' : 'Cumul. cashflow'}</th>
                      <th className="text-right p-2 font-medium text-gray-700">ROI (%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeScenarioData.yearlyData.map((data) => (
                      <tr key={data.year} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="p-2 font-medium text-gray-900">{data.year}</td>
                        <td className="p-2 text-right text-gray-900">
                          {data.propertyValue.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
                        </td>
                        <td className="p-2 text-right text-gray-900">
                          {data.rentalIncome.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
                        </td>
                        <td className="p-2 text-right text-red-600">
                          -{data.managementFees.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
                        </td>
                        <td className={`p-2 text-right font-medium ${data.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {data.netIncome.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
                        </td>
                        <td className={`p-2 text-right font-medium ${data.cumulativeCashflow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {data.cumulativeCashflow.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
                        </td>
                        <td className={`p-2 text-right font-bold ${data.roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {data.roi.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
