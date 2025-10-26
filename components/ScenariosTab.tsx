'use client'

import { useState, useEffect } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useInvestment } from '@/contexts/InvestmentContext'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { getCurrentExchangeRate } from '@/lib/exchangeRate'
import {
  Calculator, TrendingUp, DollarSign, Home, FileText, Upload,
  Vote, CheckCircle, XCircle, Clock, ShoppingCart, Download,
  FileUp, Trash2, Eye, ChevronDown, ChevronUp, AlertCircle, Plus, X
} from 'lucide-react'
import { DropZone } from './DropZone'
import { BookingsCalendar } from './BookingsCalendar'
import OccupationStats from './OccupationStats'
import ShareLinkManager from './ShareLinkManager'

// Types
interface Scenario {
  id: string
  name: string
  main_photo_url?: string
  unit_number: string
  address: string
  country: string
  state_region: string
  promoter_name: string
  broker_name: string
  broker_email: string
  company_name: string
  purchase_price: number
  purchase_currency?: 'USD' | 'CAD' // Devise du prix d'achat
  exchange_rate_at_creation?: number // Taux de change USD→CAD à la création
  initial_fees: number
  initial_fees_distribution?: 'equal' | 'first_payment' // Répartition des frais initiaux
  deduct_initial_from_first_term: boolean // Déduire l'acompte du premier terme?
  transaction_fees: TransactionFees
  construction_status: 'in_progress' | 'completed'
  delivery_date?: string
  completion_year?: number
  promoter_data: PromoterData
  payment_terms: PaymentTerm[]
  recurring_fees?: RecurringFee[] // Frais récurrents (HOA, entretien, etc.)
  status: 'draft' | 'pending_vote' | 'pending_transfer' | 'approved' | 'rejected' | 'purchased'
  created_by: string
  created_at: string
  converted_property_id?: string
  converted_at?: string
  // Stats de vote (depuis scenarios_with_votes)
  total_votes?: number
  approve_votes?: number
  reject_votes?: number
  approval_percentage?: number
  is_approved?: boolean
}

interface PromoterData {
  monthly_rent: number
  rent_type: 'monthly' | 'nightly'
  rent_currency: 'CAD' | 'USD'
  annual_appreciation: number
  occupancy_rate: number
  management_fees: number
  project_duration: number
  tax_rate: number // Taux d'imposition sur revenus locatifs (%)
  annual_rent_increase: number // Augmentation locative annuelle (%)
}

interface TransactionFees {
  type: 'percentage' | 'fixed_amount'
  percentage?: number
  fixed_amount?: number
  currency?: 'CAD' | 'USD'
}

interface PaymentTerm {
  label: string
  amount_type: 'percentage' | 'fixed_amount'
  percentage?: number
  fixed_amount?: number
  due_date: string
}

interface RecurringFee {
  label: string // "HOA Fees", "Entretien pelouse", "Piscine"
  amount: number
  frequency: 'monthly' | 'annual'
  currency: 'USD' | 'CAD'
}

interface ActualValue {
  id?: string
  scenario_id: string
  year: number
  property_value?: number
  rental_income?: number
  management_fees?: number
  net_income?: number
  cumulative_cashflow?: number
  occupancy_rate?: number
  notes?: string
}

interface ScenarioResult {
  id?: string
  scenario_id: string
  scenario_type: 'conservative' | 'moderate' | 'optimistic'
  yearly_data: YearData[]
  summary: ScenarioSummary
  evaluation_text: string
}

interface YearData {
  year: number
  property_value: number
  rental_income: number
  management_fees: number
  net_income: number
  cumulative_cashflow: number
  roi: number
}

interface ScenarioSummary {
  total_return: number
  avg_annual_return: number
  total_net_income: number
  final_property_value: number
  break_even_year: number
  recommendation: 'recommended' | 'consider' | 'not_recommended'
}

interface ScenarioVote {
  id: string
  scenario_id: string
  investor_id: string
  investor_name: string
  vote: 'approve' | 'reject'
  comment?: string
  voted_at: string
}

interface ScenarioDocument {
  id: string
  scenario_id: string
  file_name: string
  file_url: string
  file_type: string
  file_size: number
  uploaded_at: string
}

interface VoteStatus {
  total_votes: number
  approve_votes: number
  reject_votes: number
  approval_percentage: number
  is_approved: boolean
  total_eligible_voters: number
}

export default function ScenariosTab() {
  const { t } = useLanguage()
  const { investors } = useInvestment()
  const { currentUser } = useAuth()

  // État
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null)
  const [scenarioResults, setScenarioResults] = useState<ScenarioResult[]>([])
  const [votes, setVotes] = useState<ScenarioVote[]>([])
  const [documents, setDocuments] = useState<ScenarioDocument[]>([])
  const [voteStatus, setVoteStatus] = useState<VoteStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [activeView, setActiveView] = useState<'list' | 'create' | 'details'>('list')
  const [activeScenarioType, setActiveScenarioType] = useState<'conservative' | 'moderate' | 'optimistic'>('moderate')
  const [actualValues, setActualValues] = useState<ActualValue[]>([])
  const [editingActualYear, setEditingActualYear] = useState<number | null>(null)
  const [expandedScenario, setExpandedScenario] = useState<string | null>(null)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [detailTab, setDetailTab] = useState<'overview' | 'bookings' | 'share'>('overview')
  const [exchangeRate, setExchangeRate] = useState<number>(1.35) // Taux USD→CAD

  // Formulaire création scénario
  const [formData, setFormData] = useState({
    name: '',
    main_photo_url: '',
    unit_number: '',
    address: '',
    country: '',
    state_region: '',
    promoter_name: '',
    broker_name: '',
    broker_email: '',
    company_name: '',
    purchase_price: 0,
    purchase_currency: 'USD' as 'USD' | 'CAD',
    initial_fees: 0,
    initial_fees_distribution: 'first_payment' as 'equal' | 'first_payment',
    deduct_initial_from_first_term: false,
    transaction_fees: {
      type: 'percentage' as 'percentage' | 'fixed_amount',
      percentage: 0,
      fixed_amount: 0,
      currency: 'USD' as 'CAD' | 'USD'
    },
    construction_status: 'in_progress' as 'in_progress' | 'completed',
    delivery_date: '',
    completion_year: new Date().getFullYear(),
    promoter_data: {
      monthly_rent: 0,
      rent_type: 'monthly' as 'monthly' | 'nightly',
      rent_currency: 'USD' as 'CAD' | 'USD',
      annual_appreciation: 5,
      occupancy_rate: 80,
      management_fees: 10,
      project_duration: 10,
      tax_rate: 27, // Taux par défaut 27%
      annual_rent_increase: 2 // Augmentation locative 2%
    },
    payment_terms: [] as PaymentTerm[],
    recurring_fees: [] as RecurringFee[]
  })

  // Charger le taux de change au montage
  useEffect(() => {
    const loadExchangeRate = async () => {
      const rate = await getCurrentExchangeRate('USD', 'CAD')
      setExchangeRate(rate)
      console.log('🔵 [SCENARIOS] Taux de change chargé:', rate)
    }
    loadExchangeRate()
  }, [])

  // Charger les scénarios
  useEffect(() => {
    loadScenarios()
  }, [])

  // Charger détails du scénario sélectionné
  useEffect(() => {
    if (selectedScenario) {
      loadScenarioDetails(selectedScenario.id)
    }
  }, [selectedScenario])

  // Helper: Calculer le coût total avec frais de transaction
  const calculateTotalCost = (scenario: Scenario): number => {
    const baseAmount = scenario.purchase_price + scenario.initial_fees

    // Vérifier si transaction_fees existe (pour les anciens scénarios)
    if (!scenario.transaction_fees) {
      return baseAmount
    }

    if (scenario.transaction_fees.type === 'percentage') {
      const percentage = scenario.transaction_fees.percentage ?? 0
      const transactionAmount = scenario.purchase_price * (percentage / 100)
      return baseAmount + transactionAmount
    } else {
      // fixed_amount
      const fixedAmount = scenario.transaction_fees.fixed_amount ?? 0
      return baseAmount + fixedAmount
    }
  }

  // Helper: Calculer seulement le montant des frais de transaction
  const calculateTransactionFeesAmount = (scenario: Scenario): number => {
    // Vérifier si transaction_fees existe (pour les anciens scénarios)
    if (!scenario.transaction_fees) {
      return 0
    }

    if (scenario.transaction_fees.type === 'percentage') {
      const percentage = scenario.transaction_fees.percentage ?? 0
      return scenario.purchase_price * (percentage / 100)
    } else {
      const fixedAmount = scenario.transaction_fees.fixed_amount ?? 0
      return fixedAmount
    }
  }

  const loadScenarios = async () => {
    console.log('🔵 [SCENARIOS] Chargement des scénarios...')
    try {
      // Timeout de 10 secondes pour éviter les blocages infinis
      const timeoutPromise = new Promise<null>((resolve) => {
        setTimeout(() => {
          console.warn('⚠️ [SCENARIOS] Timeout lors du chargement des scénarios')
          resolve(null)
        }, 10000)
      })

      const dataPromise = supabase
        .from('scenarios_with_votes')
        .select('*')
        .order('created_at', { ascending: false })

      const result = await Promise.race([dataPromise, timeoutPromise])

      if (!result) {
        console.error('🔴 [SCENARIOS] Timeout - scénarios non chargés')
        setScenarios([])
        return
      }

      const { data, error } = result as any

      if (error) {
        console.error('🔴 [SCENARIOS] Erreur lors du chargement:', error)
        throw error
      }

      console.log('✅ [SCENARIOS] Scénarios chargés:', data?.length || 0)
      setScenarios(data || [])
    } catch (error) {
      console.error('🔴 [SCENARIOS] Exception:', error)
      setScenarios([])
    } finally {
      console.log('✅ [SCENARIOS] Chargement terminé')
      setLoading(false)
    }
  }

  const loadScenarioDetails = async (scenarioId: string) => {
    try {
      // Charger résultats
      const { data: resultsData, error: resultsError } = await supabase
        .from('scenario_results')
        .select('*')
        .eq('scenario_id', scenarioId)

      if (resultsError) throw resultsError
      setScenarioResults(resultsData || [])

      // Charger votes
      const { data: votesData, error: votesError } = await supabase
        .from('scenario_votes')
        .select(`
          *,
          investor:investors(first_name, last_name)
        `)
        .eq('scenario_id', scenarioId)

      if (votesError) throw votesError

      const formattedVotes = votesData?.map(v => ({
        id: v.id,
        scenario_id: v.scenario_id,
        investor_id: v.investor_id,
        investor_name: `${v.investor.first_name} ${v.investor.last_name}`,
        vote: v.vote,
        comment: v.comment,
        voted_at: v.voted_at
      })) || []

      setVotes(formattedVotes)

      // Charger statut de vote
      const { data: statusData, error: statusError } = await supabase
        .rpc('get_scenario_vote_status', { scenario_uuid: scenarioId })

      if (statusError) throw statusError
      if (statusData && statusData.length > 0) {
        setVoteStatus(statusData[0])
      }

      // Charger documents
      const { data: docsData, error: docsError } = await supabase
        .from('scenario_documents')
        .select('*')
        .eq('scenario_id', scenarioId)
        .order('created_at', { ascending: false })

      if (docsError) throw docsError
      setDocuments(docsData || [])

      // Charger valeurs réelles (pour projets achetés)
      await loadActualValues(scenarioId)

    } catch (error) {
      console.error('Error loading scenario details:', error)
    }
  }

  const createScenario = async () => {
    if (!currentUser || !formData.name || formData.purchase_price === 0) {
      alert(t('scenarios.fillRequired'))
      return
    }

    console.log('🔵 [SCENARIOS] Création du scénario:', formData.name)
    try {
      // Timeout de 15 secondes pour l'enregistrement
      const timeoutPromise = new Promise<null>((resolve) => {
        setTimeout(() => {
          console.warn('⚠️ [SCENARIOS] Timeout lors de la création du scénario')
          resolve(null)
        }, 15000)
      })

      const insertPromise = supabase
        .from('scenarios')
        .insert([{
          name: formData.name,
          unit_number: formData.unit_number,
          address: formData.address,
          country: formData.country,
          state_region: formData.state_region,
          promoter_name: formData.promoter_name,
          broker_name: formData.broker_name,
          broker_email: formData.broker_email,
          company_name: formData.company_name,
          purchase_price: formData.purchase_price,
          purchase_currency: formData.purchase_currency,
          exchange_rate_at_creation: exchangeRate,
          initial_fees: formData.initial_fees,
          initial_fees_distribution: formData.initial_fees_distribution,
          deduct_initial_from_first_term: formData.deduct_initial_from_first_term,
          transaction_fees: formData.transaction_fees,
          construction_status: formData.construction_status,
          delivery_date: formData.construction_status === 'in_progress' && formData.delivery_date ? formData.delivery_date : null,
          completion_year: formData.construction_status === 'completed' && formData.completion_year ? formData.completion_year : null,
          promoter_data: formData.promoter_data,
          payment_terms: formData.payment_terms,
          recurring_fees: formData.recurring_fees || [],
          status: 'draft',
          created_by: currentUser.investorData?.id
        }])
        .select()
        .single()

      const result = await Promise.race([insertPromise, timeoutPromise])

      if (!result) {
        console.error('🔴 [SCENARIOS] Timeout - scénario non créé')
        alert('Timeout: Le scénario n\'a pas pu être enregistré. Vérifiez votre connexion.')
        return
      }

      const { data, error } = result as any

      if (error) {
        console.error('🔴 [SCENARIOS] Erreur lors de la création:', error)
        throw error
      }

      console.log('✅ [SCENARIOS] Scénario créé avec succès:', data.id)

      setScenarios([data, ...scenarios])
      setSelectedScenario(data)
      setActiveView('details')

      // Réinitialiser le formulaire
      setFormData({
        name: '',
        main_photo_url: '',
        unit_number: '',
        address: '',
        country: '',
        state_region: '',
        promoter_name: '',
        broker_name: '',
        broker_email: '',
        company_name: '',
        purchase_price: 0,
        purchase_currency: 'USD' as 'USD' | 'CAD',
        initial_fees: 0,
        initial_fees_distribution: 'first_payment' as 'equal' | 'first_payment',
        deduct_initial_from_first_term: false,
        transaction_fees: {
          type: 'percentage',
          percentage: 0,
          fixed_amount: 0,
          currency: 'USD'
        },
        construction_status: 'in_progress',
        delivery_date: '',
        completion_year: new Date().getFullYear(),
        promoter_data: {
          monthly_rent: 0,
          rent_type: 'monthly',
          rent_currency: 'USD',
          annual_appreciation: 5,
          occupancy_rate: 80,
          management_fees: 10,
          project_duration: 10,
          tax_rate: 27,
          annual_rent_increase: 2
        },
        payment_terms: [],
        recurring_fees: []
      })

      alert(t('scenarios.created'))
    } catch (error) {
      console.error('Error creating scenario:', error)
      alert(t('scenarios.createError'))
    }
  }

  const analyzeScenario = async () => {
    if (!selectedScenario) return

    setAnalyzing(true)

    try {
      // Calculer les 3 scénarios avec le taux de change actuel
      const conservative = calculateScenario(selectedScenario, 'conservative', exchangeRate)
      const moderate = calculateScenario(selectedScenario, 'moderate', exchangeRate)
      const optimistic = calculateScenario(selectedScenario, 'optimistic', exchangeRate)

      // Sauvegarder dans la base de données
      const resultsToInsert = [conservative, moderate, optimistic].map(result => ({
        scenario_id: selectedScenario.id,
        scenario_type: result.scenario_type,
        yearly_data: result.yearly_data,
        summary: result.summary,
        evaluation_text: result.evaluation_text
      }))

      // Supprimer les anciens résultats
      await supabase
        .from('scenario_results')
        .delete()
        .eq('scenario_id', selectedScenario.id)

      // Insérer nouveaux résultats
      const { data, error } = await supabase
        .from('scenario_results')
        .insert(resultsToInsert)
        .select()

      if (error) throw error

      setScenarioResults(data)
      alert(t('scenarios.analyzed'))

    } catch (error) {
      console.error('Error analyzing scenario:', error)
      alert(t('scenarios.analyzeError'))
    } finally {
      setAnalyzing(false)
    }
  }

  const calculateScenario = (scenario: Scenario, type: 'conservative' | 'moderate' | 'optimistic', currentExchangeRate: number): ScenarioResult => {
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

    const pd = scenario.promoter_data
    const adjustedAppreciation = pd.annual_appreciation * appreciationMultiplier
    const adjustedOccupancy = pd.occupancy_rate * occupancyMultiplier
    const adjustedRent = pd.monthly_rent * rentMultiplier

    // Calculs des taux de change
    // Taux actuel pour l'investissement initial
    const currentRate = currentExchangeRate
    // Taux futur avec +5% de risque pour les revenus
    const futureRate = currentRate * 1.05

    console.log(`🔵 [SCENARIOS] Taux actuel: ${currentRate}, Taux futur (+5%): ${futureRate}`)

    // Investissement initial en USD converti en CAD
    const totalInvestmentUSD = calculateTotalCost(scenario)
    const initialCashCAD = totalInvestmentUSD * currentRate

    const yearlyData: YearData[] = []
    let cumulativeCashflow = -initialCashCAD

    for (let year = 1; year <= pd.project_duration; year++) {
      // Valeur de la propriété en USD, puis convertie en CAD avec le taux futur
      const propertyValueUSD = totalInvestmentUSD * Math.pow(1 + adjustedAppreciation / 100, year)
      const propertyValueCAD = propertyValueUSD * futureRate

      // Revenus locatifs en USD, convertis en CAD avec le taux futur
      // Adapter selon le type de location (mensuelle ou nuitée)
      let annualRentUSD: number
      if (pd.rent_type === 'nightly') {
        // Location à la nuit: tarif × 365 jours × taux d'occupation
        annualRentUSD = adjustedRent * 365 * (adjustedOccupancy / 100)
      } else {
        // Location mensuelle: loyer × 12 mois
        annualRentUSD = adjustedRent * 12
      }
      const annualRentCAD = annualRentUSD * futureRate

      // Frais de gestion, impôts et revenu net en CAD
      const managementFeesCAD = annualRentCAD * (pd.management_fees / 100)
      const grossIncomeCAD = annualRentCAD - managementFeesCAD
      const taxesCAD = grossIncomeCAD * (pd.tax_rate / 100)
      const netIncomeCAD = grossIncomeCAD - taxesCAD

      cumulativeCashflow += netIncomeCAD

      const roi = initialCashCAD > 0 ? ((propertyValueCAD - initialCashCAD + cumulativeCashflow) / initialCashCAD * 100) : 0

      yearlyData.push({
        year,
        property_value: propertyValueCAD,
        rental_income: annualRentCAD,
        management_fees: managementFeesCAD,
        net_income: netIncomeCAD,
        cumulative_cashflow: cumulativeCashflow,
        roi
      })
    }

    const finalYear = yearlyData[yearlyData.length - 1]
    const totalNetIncome = yearlyData.reduce((sum, y) => sum + y.net_income, 0)
    const totalReturn = ((finalYear.property_value - initialCashCAD + totalNetIncome) / initialCashCAD) * 100
    const avgAnnualReturn = totalReturn / pd.project_duration
    const breakEvenYear = yearlyData.findIndex(y => y.cumulative_cashflow > 0) + 1

    let recommendation: 'recommended' | 'consider' | 'not_recommended' = 'consider'
    if (avgAnnualReturn > 8 && breakEvenYear <= 5) {
      recommendation = 'recommended'
    } else if (avgAnnualReturn < 3 || breakEvenYear > 8) {
      recommendation = 'not_recommended'
    }

    const evaluation_text = generateEvaluation(type, avgAnnualReturn, breakEvenYear, totalReturn, recommendation, pd.project_duration, t)

    const summary: ScenarioSummary = {
      total_return: totalReturn,
      avg_annual_return: avgAnnualReturn,
      total_net_income: totalNetIncome,
      final_property_value: finalYear.property_value,
      break_even_year: breakEvenYear,
      recommendation
    }

    return {
      scenario_id: scenario.id,
      scenario_type: type,
      yearly_data: yearlyData,
      summary,
      evaluation_text
    }
  }

  const generateEvaluation = (
    type: 'conservative' | 'moderate' | 'optimistic',
    avgReturn: number,
    breakEven: number,
    totalReturn: number,
    recommendation: 'recommended' | 'consider' | 'not_recommended',
    duration: number,
    translate: (key: string) => string
  ): string => {
    const scenarioName = type === 'conservative' ? translate('scenarioType.conservative') : type === 'moderate' ? translate('scenarioType.moderate') : translate('scenarioType.optimistic')
    let recText = translate('scenarioResults.toConsider')
    if (recommendation === 'recommended') recText = translate('scenarioResults.recommended')
    if (recommendation === 'not_recommended') recText = translate('scenarioResults.notRecommended')

    return `**${translate('scenarioResults.scenarioLabel')} ${scenarioName}**

**${translate('scenarioResults.recommendation')}:** ${translate('scenarioResults.project')} ${recText}

**${translate('scenarioResults.avgAnnualReturn')}:** ${avgReturn.toFixed(2)}%
**${translate('scenarioResults.breakEven')}:** ${translate('scenarioResults.year')} ${breakEven}
**${translate('scenarioResults.totalReturn')}:** ${totalReturn.toFixed(1)}% ${translate('scenarioResults.over')} ${duration} ${translate('common.years')}

${avgReturn > 8 ? '✅ ' + translate('scenarioResults.attractiveReturn') : avgReturn < 3 ? '⚠️ ' + translate('scenarioResults.lowReturn') : '📊 ' + translate('scenarioResults.moderateReturn')}
${breakEven <= 5 ? '✅ ' + translate('scenarioResults.quickBreakEven') : breakEven > 7 ? '⚠️ ' + translate('scenarioResults.distantBreakEven') : '📊 ' + translate('scenarioResults.acceptableBreakEven')}`
  }

  const submitForVote = async () => {
    if (!selectedScenario || scenarioResults.length === 0) {
      alert(t('scenarioConvert.analyzeFirst'))
      return
    }

    try {
      const { error } = await supabase
        .from('scenarios')
        .update({ status: 'pending_vote' })
        .eq('id', selectedScenario.id)

      if (error) throw error

      setSelectedScenario({ ...selectedScenario, status: 'pending_vote' })
      await loadScenarios()
      alert(t('scenarios.submitted'))
    } catch (error) {
      console.error('Error submitting for vote:', error)
      alert(t('scenarios.submitError'))
    }
  }

  const castVote = async (voteChoice: 'approve' | 'reject', comment?: string) => {
    if (!selectedScenario || !currentUser) return

    // Vérifier si l'investisseur a le droit de vote
    const currentInvestor = investors.find(inv => inv.user_id === currentUser.id)
    if (!currentInvestor?.can_vote) {
      alert(t('voting.noVotingPermission'))
      return
    }

    try {
      // Vérifier si vote existe déjà
      const { data: existingVote } = await supabase
        .from('scenario_votes')
        .select('id')
        .eq('scenario_id', selectedScenario.id)
        .eq('investor_id', currentInvestor.id)
        .single()

      if (existingVote) {
        // Mettre à jour vote existant
        const { error } = await supabase
          .from('scenario_votes')
          .update({ vote: voteChoice, comment })
          .eq('id', existingVote.id)

        if (error) throw error
      } else {
        // Créer nouveau vote
        const { error } = await supabase
          .from('scenario_votes')
          .insert([{
            scenario_id: selectedScenario.id,
            investor_id: currentInvestor.id,
            vote: voteChoice,
            comment
          }])

        if (error) throw error
      }

      await loadScenarioDetails(selectedScenario.id)
      alert(t('voting.voteRecorded'))
    } catch (error) {
      console.error('Error casting vote:', error)
      alert(t('voting.voteError'))
    }
  }

  const forceApproval = async () => {
    if (!selectedScenario) return

    // Vérifier si l'utilisateur est admin
    const currentInvestor = currentUser ? investors.find(inv => inv.user_id === currentUser.id) : null
    if (!currentInvestor || currentInvestor.access_level !== 'admin') {
      alert(t('voting.onlyAdminsCanForce'))
      return
    }

    if (!confirm(t('voting.forceConfirm'))) return

    try {
      const { error } = await supabase
        .from('scenarios')
        .update({ status: 'approved' })
        .eq('id', selectedScenario.id)

      if (error) throw error

      setSelectedScenario({ ...selectedScenario, status: 'approved' })
      await loadScenarios()
      alert(t('voting.forcedSuccess'))
    } catch (error) {
      console.error('Error forcing approval:', error)
      alert(t('voting.forceError'))
    }
  }

  const deleteScenario = async () => {
    if (!selectedScenario) return

    const scenarioName = getFullName(selectedScenario.name, selectedScenario.unit_number)

    // Avertissement spécial si le scénario a été converti en projet
    let confirmMessage = `Êtes-vous sûr de vouloir supprimer le scénario "${scenarioName}" ?\n\nCette action est irréversible.`

    if (selectedScenario.status === 'purchased' && selectedScenario.converted_property_id) {
      confirmMessage = `⚠️ ATTENTION: Ce scénario a été converti en projet!\n\nSupprimer ce scénario "${scenarioName}" ne supprimera PAS le projet associé.\nVous devrez supprimer le projet manuellement dans l'onglet Projets si nécessaire.\n\nVoulez-vous continuer?`
    }

    if (!confirm(confirmMessage)) {
      return
    }

    try {
      const { error } = await supabase
        .from('scenarios')
        .delete()
        .eq('id', selectedScenario.id)

      if (error) throw error

      alert(`Scénario "${scenarioName}" supprimé avec succès`)
      setActiveView('list')
      await loadScenarios()
    } catch (error) {
      console.error('Error deleting scenario:', error)
      alert('Erreur lors de la suppression du scénario')
    }
  }

  const markAsPurchased = async () => {
    if (!selectedScenario || selectedScenario.status !== 'approved') {
      alert(t('scenarioConvert.mustBeApproved'))
      return
    }

    if (!confirm(t('scenarioConvert.confirmConversion'))) return

    try {
      // Récupérer le taux de change actuel (temps réel) pour la conversion
      const currentExchangeRate = await getCurrentExchangeRate('USD', 'CAD')
      console.log('🔵 [CONVERSION] Taux de change actuel:', currentExchangeRate)

      // Créer la propriété
      const propertyData = {
        name: getFullName(selectedScenario.name, selectedScenario.unit_number),
        location: selectedScenario.address || t('scenarios.toBeDefinedLocation'),
        status: 'reservation',
        total_cost: calculateTotalCost(selectedScenario),
        paid_amount: 0,
        expected_roi: scenarioResults.find(r => r.scenario_type === 'moderate')?.summary.avg_annual_return || 0,
        reservation_date: new Date().toISOString(),
        main_photo_url: selectedScenario.main_photo_url || null,
        recurring_fees: selectedScenario.recurring_fees || []
      }

      const { data: property, error: propError } = await supabase
        .from('properties')
        .insert([propertyData])
        .select()
        .single()

      if (propError) throw propError

      // Créer les termes de paiement si définis
      console.log('🔵 [CONVERSION] Payment terms du scénario:', selectedScenario.payment_terms)

      if (selectedScenario.payment_terms && selectedScenario.payment_terms.length > 0) {
        const termsToInsert = selectedScenario.payment_terms
          .filter(term => term.due_date && term.due_date.trim() !== '') // Ignorer les termes sans date
          .map((term, index) => {
            let amount = term.amount_type === 'percentage'
              ? (selectedScenario.purchase_price * (term.percentage || 0) / 100)
              : (term.fixed_amount || 0)

            // Déduire l'acompte initial du premier terme si l'option est activée
            if (index === 0 && selectedScenario.deduct_initial_from_first_term && selectedScenario.initial_fees > 0) {
              amount = amount - selectedScenario.initial_fees
            }

            return {
              property_id: property.id,
              term_label: term.label,
              amount,
              currency: selectedScenario.purchase_currency || 'USD',
              exchange_rate_used: currentExchangeRate, // Taux actuel lors de la conversion
              due_date: term.due_date,
              status: 'pending',
              term_number: index + 1
            }
          })

        console.log('🔵 [CONVERSION] Termes filtrés (avec dates):', termsToInsert.length)
        console.log('🔵 [CONVERSION] Termes à insérer:', termsToInsert)

        if (termsToInsert.length > 0) {
          console.log('🔵 [CONVERSION] Insertion de', termsToInsert.length, 'termes de paiement...')

          const { data: insertedTerms, error: termsError } = await supabase
            .from('payment_schedules')
            .insert(termsToInsert)
            .select()

          if (termsError) {
            console.error('❌ [CONVERSION] Erreur insertion payment_schedules:', termsError)
            throw termsError
          }

          console.log('✅ [CONVERSION] Payment schedules créés:', insertedTerms)
        } else {
          console.warn('⚠️ [CONVERSION] Aucun terme avec date valide à insérer')
        }
      } else {
        console.warn('⚠️ [CONVERSION] Pas de payment_terms définis dans le scénario')
      }

      // Transférer les pièces jointes du scénario vers la propriété
      console.log('🔵 [CONVERSION] Début du transfert des pièces jointes...')

      try {
        // Lister tous les fichiers du scénario
        const { data: scenarioFiles, error: listError } = await supabase.storage
          .from('scenario-documents')
          .list(selectedScenario.id, {
            limit: 100,
            offset: 0,
            sortBy: { column: 'name', order: 'asc' }
          })

        if (listError) {
          console.warn('⚠️ [CONVERSION] Erreur lors de la liste des fichiers:', listError)
        } else if (scenarioFiles && scenarioFiles.length > 0) {
          console.log(`🔵 [CONVERSION] ${scenarioFiles.length} fichier(s) trouvé(s) dans le scénario`)

          let copiedCount = 0
          let errorCount = 0

          for (const file of scenarioFiles) {
            try {
              // Ignorer les dossiers
              if (file.id === null) continue

              const sourcePath = `${selectedScenario.id}/${file.name}`
              const destPath = `${property.id}/${file.name}`

              console.log(`🔵 [CONVERSION] Copie: ${sourcePath} → ${destPath}`)

              // Télécharger le fichier depuis le scénario
              const { data: fileData, error: downloadError } = await supabase.storage
                .from('scenario-documents')
                .download(sourcePath)

              if (downloadError) {
                console.error(`❌ [CONVERSION] Erreur téléchargement ${file.name}:`, downloadError)
                errorCount++
                continue
              }

              // Upload vers le bucket de la propriété
              const { error: uploadError } = await supabase.storage
                .from('property-attachments')
                .upload(destPath, fileData, {
                  contentType: file.metadata?.mimetype || 'application/octet-stream',
                  upsert: false
                })

              if (uploadError) {
                console.error(`❌ [CONVERSION] Erreur upload ${file.name}:`, uploadError)
                errorCount++
                continue
              }

              // Créer l'entrée dans property_attachments
              const { error: dbError } = await supabase
                .from('property_attachments')
                .insert({
                  property_id: property.id,
                  file_name: file.name,
                  file_type: file.metadata?.mimetype || 'application/octet-stream',
                  storage_path: destPath,
                  file_size: file.metadata?.size || 0,
                  description: `Transféré depuis scénario: ${selectedScenario.name}`,
                  attachment_category: file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? 'photo' : 'document'
                })

              if (dbError) {
                console.error(`❌ [CONVERSION] Erreur DB ${file.name}:`, dbError)
                errorCount++
                continue
              }

              copiedCount++
              console.log(`✅ [CONVERSION] Fichier copié: ${file.name}`)

            } catch (fileError) {
              console.error(`❌ [CONVERSION] Erreur fichier ${file.name}:`, fileError)
              errorCount++
            }
          }

          console.log(`✅ [CONVERSION] Transfert terminé: ${copiedCount} réussi(s), ${errorCount} erreur(s)`)
        } else {
          console.log('ℹ️ [CONVERSION] Aucune pièce jointe à transférer')
        }
      } catch (transferError) {
        console.error('❌ [CONVERSION] Erreur globale transfert pièces jointes:', transferError)
        // On ne bloque pas la conversion même si le transfert échoue
      }

      // Mettre à jour le scénario
      const { error: updateError } = await supabase
        .from('scenarios')
        .update({
          status: 'purchased',
          converted_property_id: property.id,
          converted_at: new Date().toISOString()
        })
        .eq('id', selectedScenario.id)

      if (updateError) throw updateError

      alert(t('scenarioConvert.success'))
      setActiveView('list')
      await loadScenarios()

    } catch (error) {
      console.error('Error marking as purchased:', error)
      alert(t('scenarioConvert.error'))
    }
  }

  const uploadMainPhoto = async (files: any[]) => {
    if (files.length === 0) return

    const file = files[0].file
    const maxSize = 10 * 1024 * 1024 // 10MB

    if (file.size > maxSize) {
      alert('La photo est trop volumineuse (max 10MB)')
      return
    }

    setUploadingFile(true)

    try {
      // Si en mode création (pas de scenario ID encore), on stocke temporairement en base64
      if (!selectedScenario) {
        setFormData({...formData, main_photo_url: files[0].url})
        setUploadingFile(false)
        return
      }

      // Si scenario existe déjà, upload vers Supabase
      const timestamp = Date.now()
      const filePath = `${selectedScenario.id}/main-photo-${timestamp}.${file.name.split('.').pop()}`

      const { error: uploadError } = await supabase.storage
        .from('scenario-documents')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('scenario-documents')
        .getPublicUrl(filePath)

      const { error: updateError } = await supabase
        .from('scenarios')
        .update({ main_photo_url: publicUrl })
        .eq('id', selectedScenario.id)

      if (updateError) throw updateError

      setSelectedScenario({...selectedScenario, main_photo_url: publicUrl})
      alert('Photo principale uploadée avec succès!')

    } catch (error) {
      console.error('Error uploading main photo:', error)
      alert('Erreur lors de l\'upload de la photo')
    } finally {
      setUploadingFile(false)
    }
  }

  const uploadDocuments = async (files: any[]) => {
    if (!selectedScenario || files.length === 0) return

    const maxSize = 50 * 1024 * 1024 // 50MB
    setUploadingFile(true)

    // Fonction pour normaliser les noms de fichiers (supprimer accents, caractères spéciaux)
    const sanitizeFileName = (fileName: string): string => {
      // Séparer nom et extension
      const lastDot = fileName.lastIndexOf('.')
      const name = lastDot > 0 ? fileName.substring(0, lastDot) : fileName
      const ext = lastDot > 0 ? fileName.substring(lastDot) : ''

      // Normaliser le nom (supprimer accents)
      const normalized = name
        .normalize('NFD') // Décomposer les caractères accentués
        .replace(/[\u0300-\u036f]/g, '') // Supprimer les diacritiques
        .replace(/\s+/g, '-') // Remplacer espaces par tirets
        .replace(/[^a-zA-Z0-9._-]/g, '') // Supprimer caractères spéciaux
        .toLowerCase() // Tout en minuscules

      return normalized + ext.toLowerCase()
    }

    try {
      for (const processedFile of files) {
        const file = processedFile.file

        if (file.size > maxSize) {
          alert(`${file.name}: ${t('scenarioDocuments.fileTooLarge')}`)
          continue
        }

        const timestamp = Date.now()
        const sanitizedName = sanitizeFileName(file.name)
        const filePath = `${selectedScenario.id}/${timestamp}-${sanitizedName}`

        const { error: uploadError } = await supabase.storage
          .from('scenario-documents')
          .upload(filePath, file)

        if (uploadError) {
          console.error(`Error uploading ${file.name}:`, uploadError)
          continue
        }

        const { data: { publicUrl } } = supabase.storage
          .from('scenario-documents')
          .getPublicUrl(filePath)

        const { error: dbError } = await supabase
          .from('scenario_documents')
          .insert([{
            scenario_id: selectedScenario.id,
            file_name: file.name,
            file_url: publicUrl,
            file_type: file.type,
            file_size: file.size
          }])

        if (dbError) {
          console.error(`Error saving ${file.name} to database:`, dbError)
        }
      }

      await loadScenarioDetails(selectedScenario.id)
      alert(t('scenarioDocuments.uploadSuccess'))

    } catch (error) {
      console.error('Error uploading documents:', error)
      alert(t('scenarioDocuments.uploadError'))
    } finally {
      setUploadingFile(false)
    }
  }

  const uploadDocument = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedScenario || !event.target.files || event.target.files.length === 0) return

    const file = event.target.files[0]
    const maxSize = 50 * 1024 * 1024 // 50MB

    if (file.size > maxSize) {
      alert(t('scenarioDocuments.fileTooLarge'))
      return
    }

    setUploadingFile(true)

    try {
      const filePath = `${selectedScenario.id}/${file.name}`

      const { error: uploadError } = await supabase.storage
        .from('scenario-documents')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('scenario-documents')
        .getPublicUrl(filePath)

      const { error: dbError } = await supabase
        .from('scenario_documents')
        .insert([{
          scenario_id: selectedScenario.id,
          file_name: file.name,
          file_url: publicUrl,
          file_type: file.type,
          file_size: file.size
        }])

      if (dbError) throw dbError

      await loadScenarioDetails(selectedScenario.id)
      alert(t('scenarioDocuments.uploadSuccess'))

    } catch (error) {
      console.error('Error uploading document:', error)
      alert(t('scenarioDocuments.uploadError'))
    } finally {
      setUploadingFile(false)
      event.target.value = ''
    }
  }

  const deleteDocument = async (docId: string, filePath: string) => {
    if (!confirm(t('scenarioDocuments.deleteConfirm'))) return

    try {
      // Supprimer du storage
      const { error: storageError } = await supabase.storage
        .from('scenario-documents')
        .remove([filePath])

      if (storageError) throw storageError

      // Supprimer de la base
      const { error: dbError } = await supabase
        .from('scenario_documents')
        .delete()
        .eq('id', docId)

      if (dbError) throw dbError

      await loadScenarioDetails(selectedScenario!.id)
      alert(t('scenarioDocuments.deleteSuccess'))

    } catch (error) {
      console.error('Error deleting document:', error)
      alert(t('scenarioDocuments.deleteError'))
    }
  }

  // Charger les valeurs réelles
  const loadActualValues = async (scenarioId: string) => {
    try {
      const { data, error } = await supabase
        .from('scenario_actual_values')
        .select('*')
        .eq('scenario_id', scenarioId)
        .order('year', { ascending: true })

      if (error) throw error
      setActualValues(data || [])
    } catch (error) {
      console.error('Error loading actual values:', error)
    }
  }

  // Sauvegarder/Mettre à jour une valeur réelle
  const saveActualValue = async (actualValue: ActualValue) => {
    if (!selectedScenario) return

    try {
      const { data, error } = await supabase
        .from('scenario_actual_values')
        .upsert({
          scenario_id: selectedScenario.id,
          year: actualValue.year,
          property_value: actualValue.property_value,
          rental_income: actualValue.rental_income,
          management_fees: actualValue.management_fees,
          net_income: actualValue.net_income,
          cumulative_cashflow: actualValue.cumulative_cashflow,
          occupancy_rate: actualValue.occupancy_rate,
          notes: actualValue.notes
        }, {
          onConflict: 'scenario_id,year'
        })
        .select()
        .single()

      if (error) throw error

      // Recharger les valeurs
      await loadActualValues(selectedScenario.id)
      setEditingActualYear(null)
      alert('Valeurs réelles sauvegardées!')

    } catch (error) {
      console.error('Error saving actual value:', error)
      alert('Erreur lors de la sauvegarde des valeurs réelles')
    }
  }

  // Helper pour afficher le nom complet avec # d'unité
  const getFullName = (name: string, unitNumber?: string) => {
    if (unitNumber && unitNumber.trim() !== '') {
      return `${name} ${unitNumber}`
    }
    return name
  }

  const getStatusBadge = (status: Scenario['status']) => {
    const badges = {
      draft: { bg: 'bg-gray-100', text: 'text-gray-700', label: t('scenarioStatus.draft'), icon: FileText },
      pending_vote: { bg: 'bg-blue-100', text: 'text-blue-700', label: t('scenarioStatus.pending_vote'), icon: Vote },
      pending_transfer: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'En attente de transfert', icon: TrendingUp },
      approved: { bg: 'bg-green-100', text: 'text-green-700', label: t('scenarioStatus.approved'), icon: CheckCircle },
      rejected: { bg: 'bg-red-100', text: 'text-red-700', label: t('scenarioStatus.rejected'), icon: XCircle },
      purchased: { bg: 'bg-purple-100', text: 'text-purple-700', label: t('scenarioStatus.purchased'), icon: ShoppingCart }
    }

    const badge = badges[status]
    const Icon = badge.icon

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${badge.bg} ${badge.text}`}>
        <Icon size={14} />
        {badge.label}
      </span>
    )
  }

  const currentInvestor = currentUser ? investors.find(inv => inv.user_id === currentUser.id) : null
  const currentUserVote = currentInvestor ? votes.find(v => v.investor_id === currentInvestor.id) : null
  const canVote = currentInvestor?.can_vote && selectedScenario?.status === 'pending_vote'

  // Vue liste des scénarios
  if (activeView === 'list') {
    return (
      <div className="space-y-6 mt-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{t('scenarios.title')}</h2>
            <p className="text-sm sm:text-base text-gray-600 mt-1">{t('scenarios.subtitle')}</p>
          </div>
          <button
            onClick={() => setActiveView('create')}
            className="px-4 py-2 bg-[#5e5e5e] hover:bg-[#3e3e3e] text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <Calculator size={20} />
            {t('scenarios.newScenario')}
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <Clock className="animate-spin mx-auto text-gray-400" size={48} />
            <p className="text-gray-600 mt-4">{t('common.loading')}</p>
          </div>
        ) : scenarios.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-12 text-center">
            <Calculator className="mx-auto text-gray-400" size={64} />
            <h3 className="text-lg font-bold text-gray-900 mt-4">{t('scenarios.noScenarios')}</h3>
            <p className="text-gray-600 mt-2">{t('scenarios.createFirst')}</p>
            <button
              onClick={() => setActiveView('create')}
              className="mt-4 px-4 py-2 bg-[#5e5e5e] hover:bg-[#3e3e3e] text-white rounded-lg font-medium transition-colors"
            >
              {t('scenarios.create')}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {scenarios.map(scenario => (
              <div key={scenario.id} className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h3 className="text-lg font-bold text-gray-900">{getFullName(scenario.name, scenario.unit_number)}</h3>
                      {getStatusBadge(scenario.status)}
                      {/* Afficher le taux d'acceptation si en vote ou en attente de transfert */}
                      {(scenario.status === 'pending_vote' || scenario.status === 'pending_transfer') && scenario.total_votes !== undefined && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full font-medium">
                            {scenario.approval_percentage?.toFixed(0)}% acceptation
                          </span>
                          <span className="text-gray-600">
                            ({scenario.total_votes} votes)
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                      <div>
                        <p className="text-xs text-gray-600">{t('scenarios.purchasePrice').replace(' ($)', '')}</p>
                        <p className="text-sm font-bold text-gray-900">
                          {scenario.purchase_price.toLocaleString('fr-CA', { style: 'currency', currency: 'USD' })}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">{t('projects.totalCost')}</p>
                        <p className="text-sm font-bold text-gray-900">
                          {calculateTotalCost(scenario).toLocaleString('fr-CA', { style: 'currency', currency: 'USD' })}
                        </p>
                        {calculateTransactionFeesAmount(scenario) > 0 && (
                          <p className="text-xs text-gray-500 mt-1">
                            (dont {calculateTransactionFeesAmount(scenario).toLocaleString('fr-CA', { style: 'currency', currency: 'USD' })} frais)
                          </p>
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">
                          {scenario.promoter_data.rent_type === 'nightly' ? t('scenarios.nightly') : t('scenarios.monthly')} revenu
                        </p>
                        <p className="text-sm font-bold text-gray-900">
                          {scenario.promoter_data.monthly_rent.toLocaleString('fr-CA', { style: 'currency', currency: 'USD' })}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">{t('projects.duration')}</p>
                        <p className="text-sm font-bold text-gray-900">{scenario.promoter_data.project_duration} {t('common.years')}</p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedScenario(scenario)
                      setActiveView('details')
                    }}
                    className="ml-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    <Eye size={16} />
                    {t('scenarios.view')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Vue création scénario
  if (activeView === 'create') {
    return (
      <div className="space-y-6 mt-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{t('scenarios.newScenario')}</h2>
            <p className="text-sm sm:text-base text-gray-600 mt-1">{t('scenarios.subtitle')}</p>
          </div>
          <button
            onClick={() => setActiveView('list')}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors"
          >
            {t('scenarios.back')}
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 space-y-6">
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4">{t('scenarios.basicInfo')}</h3>

            {/* Photo principale et nom du projet */}
            <div className="flex flex-col md:flex-row gap-6 mb-6">
              {/* Photo principale à gauche */}
              <div className="w-full md:w-64 flex-shrink-0">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Photo principale</label>
                {formData.main_photo_url ? (
                  <div className="relative group">
                    <div className="w-full h-48 bg-gray-100 dark:bg-gray-700 rounded-lg shadow-md overflow-hidden flex items-center justify-center">
                      <img
                        src={formData.main_photo_url}
                        alt="Photo principale"
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                    <button
                      onClick={() => setFormData({...formData, main_photo_url: ''})}
                      className="absolute top-2 right-2 p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="h-48">
                    <DropZone
                      onFilesSelected={uploadMainPhoto}
                      accept="image/*"
                      multiple={false}
                      maxSize={10}
                      label="Photo du projet"
                      className="h-full"
                    />
                  </div>
                )}
              </div>

              {/* Nom du projet à droite */}
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('scenarios.name')} *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                  placeholder="Ex: Villa Punta Cana - Phase 2"
                />
              </div>
            </div>

            {/* Autres champs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('scenarios.unitNumber')}</label>
                <input
                  type="text"
                  value={formData.unit_number}
                  onChange={(e) => setFormData({...formData, unit_number: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                  placeholder="Ex: 305"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('scenarios.address')}</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                  placeholder="Ex: Avenida Barceló, Bávaro"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('scenarios.country')}</label>
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => setFormData({...formData, country: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                  placeholder="Ex: République Dominicaine"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('scenarios.stateRegion')}</label>
                <input
                  type="text"
                  value={formData.state_region}
                  onChange={(e) => setFormData({...formData, state_region: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                  placeholder="Ex: La Altagracia"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('scenarios.promoterName')}</label>
                <input
                  type="text"
                  value={formData.promoter_name}
                  onChange={(e) => setFormData({...formData, promoter_name: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                  placeholder="Ex: Juan Pérez"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('scenarios.companyName')}</label>
                <input
                  type="text"
                  value={formData.company_name}
                  onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                  placeholder="Ex: Caribbean Real Estate Inc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('scenarios.brokerName')}</label>
                <input
                  type="text"
                  value={formData.broker_name}
                  onChange={(e) => setFormData({...formData, broker_name: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                  placeholder="Ex: Maria Rodriguez"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('scenarios.brokerEmail')}</label>
                <input
                  type="email"
                  value={formData.broker_email}
                  onChange={(e) => setFormData({...formData, broker_email: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                  placeholder="Ex: maria.rodriguez@realestate.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('scenarios.purchasePrice')} *</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={formData.purchase_price || ''}
                    onChange={(e) => setFormData({...formData, purchase_price: parseFloat(e.target.value) || 0})}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                    placeholder="250000"
                  />
                  <select
                    value={formData.purchase_currency}
                    onChange={(e) => setFormData({...formData, purchase_currency: e.target.value as 'USD' | 'CAD'})}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                  >
                    <option value="USD">USD $</option>
                    <option value="CAD">CAD $</option>
                  </select>
                </div>
                {formData.purchase_price > 0 && formData.purchase_currency === 'USD' && (
                  <p className="mt-2 text-sm text-gray-600">
                    ≈ {(formData.purchase_price * exchangeRate).toLocaleString('fr-CA', { style: 'currency', currency: 'CAD' })}
                    <span className="text-xs ml-1">(taux: {exchangeRate.toFixed(4)})</span>
                  </p>
                )}
                {formData.purchase_price > 0 && formData.purchase_currency === 'CAD' && (
                  <p className="mt-2 text-sm text-gray-600">
                    ≈ {(formData.purchase_price / exchangeRate).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                    <span className="text-xs ml-1">(taux: {exchangeRate.toFixed(4)})</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('scenarios.initialFees')}</label>
                <input
                  type="number"
                  value={formData.initial_fees || ''}
                  onChange={(e) => setFormData({...formData, initial_fees: parseFloat(e.target.value) || 0})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                  placeholder="15000"
                />
                {formData.initial_fees > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-sm font-medium text-gray-700">Répartition des frais initiaux:</p>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="radio"
                        name="initial_fees_distribution"
                        value="first_payment"
                        checked={formData.initial_fees_distribution === 'first_payment'}
                        onChange={(e) => setFormData({...formData, initial_fees_distribution: e.target.value as 'equal' | 'first_payment'})}
                        className="border-gray-300 text-[#5e5e5e] focus:ring-[#5e5e5e]"
                      />
                      <span>Appliquer au premier paiement</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="radio"
                        name="initial_fees_distribution"
                        value="equal"
                        checked={formData.initial_fees_distribution === 'equal'}
                        onChange={(e) => setFormData({...formData, initial_fees_distribution: e.target.value as 'equal' | 'first_payment'})}
                        className="border-gray-300 text-[#5e5e5e] focus:ring-[#5e5e5e]"
                      />
                      <span>Répartir également sur tous les termes</span>
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* Frais de Transaction */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('scenarios.transactionFeesType')}</label>
                <select
                  value={formData.transaction_fees.type}
                  onChange={(e) => setFormData({
                    ...formData,
                    transaction_fees: {
                      ...formData.transaction_fees,
                      type: e.target.value as 'percentage' | 'fixed_amount'
                    }
                  })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                >
                  <option value="percentage">{t('scenarios.percentage')}</option>
                  <option value="fixed_amount">{t('scenarios.fixedAmount')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {formData.transaction_fees.type === 'percentage' ? t('scenarios.percentageValue') : t('scenarios.amountValue')}
                </label>
                <input
                  type="number"
                  value={formData.transaction_fees.type === 'percentage'
                    ? (formData.transaction_fees.percentage || '')
                    : (formData.transaction_fees.fixed_amount || '')}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value) || 0
                    setFormData({
                      ...formData,
                      transaction_fees: {
                        ...formData.transaction_fees,
                        ...(formData.transaction_fees.type === 'percentage'
                          ? { percentage: value }
                          : { fixed_amount: value }
                        )
                      }
                    })
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                  placeholder={formData.transaction_fees.type === 'percentage' ? '2.5' : '5000'}
                  step={formData.transaction_fees.type === 'percentage' ? '0.1' : '100'}
                />
              </div>

              {formData.transaction_fees.type === 'fixed_amount' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('scenarios.currency')}</label>
                  <select
                    value={formData.transaction_fees.currency}
                    onChange={(e) => setFormData({
                      ...formData,
                      transaction_fees: {
                        ...formData.transaction_fees,
                        currency: e.target.value as 'CAD' | 'USD'
                      }
                    })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                  >
                    <option value="CAD">CAD $</option>
                    <option value="USD">USD $</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Statut de Construction */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4">{t('scenarios.constructionStatus')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('scenarios.constructionStatusLabel')}</label>
                <select
                  value={formData.construction_status}
                  onChange={(e) => setFormData({
                    ...formData,
                    construction_status: e.target.value as 'in_progress' | 'completed'
                  })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                >
                  <option value="in_progress">{t('scenarios.inProgress')}</option>
                  <option value="completed">{t('scenarios.completed')}</option>
                </select>
              </div>

              {formData.construction_status === 'in_progress' ? (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('scenarios.deliveryDate')}</label>
                  <input
                    type="date"
                    value={formData.delivery_date}
                    onChange={(e) => setFormData({...formData, delivery_date: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                  />
                </div>
              ) : (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('scenarios.completionYear')}</label>
                  <input
                    type="number"
                    value={formData.completion_year || ''}
                    onChange={(e) => setFormData({...formData, completion_year: parseInt(e.target.value) || new Date().getFullYear()})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                    placeholder="2024"
                    min="1900"
                    max="2100"
                  />
                </div>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4">{t('scenarios.promoterData')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('scenarios.rentAmount')}</label>
                <input
                  type="number"
                  value={formData.promoter_data.monthly_rent || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    promoter_data: {...formData.promoter_data, monthly_rent: parseFloat(e.target.value) || 0}
                  })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                  placeholder="1500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('scenarios.rentType')}</label>
                <select
                  value={formData.promoter_data.rent_type}
                  onChange={(e) => setFormData({
                    ...formData,
                    promoter_data: {...formData.promoter_data, rent_type: e.target.value as 'monthly' | 'nightly'}
                  })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                >
                  <option value="monthly">{t('scenarios.monthly')}</option>
                  <option value="nightly">{t('scenarios.nightly')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('scenarios.rentCurrency')}</label>
                <select
                  value={formData.promoter_data.rent_currency}
                  onChange={(e) => setFormData({
                    ...formData,
                    promoter_data: {...formData.promoter_data, rent_currency: e.target.value as 'CAD' | 'USD'}
                  })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                >
                  <option value="CAD">CAD $</option>
                  <option value="USD">USD $</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('scenarios.annualAppreciation')}</label>
                <input
                  type="number"
                  value={formData.promoter_data.annual_appreciation || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    promoter_data: {...formData.promoter_data, annual_appreciation: parseFloat(e.target.value) || 0}
                  })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                  placeholder="5"
                  step="0.1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('scenarios.occupancyRate')}</label>
                <input
                  type="number"
                  value={formData.promoter_data.occupancy_rate || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    promoter_data: {...formData.promoter_data, occupancy_rate: parseFloat(e.target.value) || 0}
                  })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                  placeholder="80"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('scenarios.managementFees')}</label>
                <input
                  type="number"
                  value={formData.promoter_data.management_fees || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    promoter_data: {...formData.promoter_data, management_fees: parseFloat(e.target.value) || 0}
                  })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                  placeholder="10"
                  step="0.1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('scenarios.projectDuration')}</label>
                <input
                  type="number"
                  value={formData.promoter_data.project_duration || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    promoter_data: {...formData.promoter_data, project_duration: parseInt(e.target.value) || 10}
                  })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                  placeholder="10"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('scenarios.taxRate')}</label>
                <input
                  type="number"
                  value={formData.promoter_data.tax_rate || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    promoter_data: {...formData.promoter_data, tax_rate: parseFloat(e.target.value) || 27}
                  })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                  placeholder="27"
                  step="0.1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('scenarios.annualRentIncrease')}</label>
                <input
                  type="number"
                  value={formData.promoter_data.annual_rent_increase || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    promoter_data: {...formData.promoter_data, annual_rent_increase: parseFloat(e.target.value) || 2}
                  })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                  placeholder="2"
                  step="0.1"
                />
              </div>
            </div>
          </div>

          {/* Section Termes de Paiement */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">{t('scenarios.paymentTerms')}</h3>
              <button
                type="button"
                onClick={() => {
                  setFormData({
                    ...formData,
                    payment_terms: [
                      ...formData.payment_terms,
                      {
                        label: '',
                        amount_type: 'percentage',
                        percentage: 0,
                        fixed_amount: 0,
                        due_date: ''
                      }
                    ]
                  })
                }}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
              >
                <Plus size={16} />
                {t('scenarios.addTerm')}
              </button>
            </div>

            {formData.payment_terms.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">{t('scenarios.noPaymentTerms')}</p>
            ) : (
              <div className="space-y-3">
                {formData.payment_terms.map((term, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">{t('scenarios.termLabel')}</label>
                        <input
                          type="text"
                          value={term.label}
                          onChange={(e) => {
                            const newTerms = [...formData.payment_terms]
                            newTerms[index].label = e.target.value
                            setFormData({...formData, payment_terms: newTerms})
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                          placeholder={t('scenarios.termLabelPlaceholder')}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">{t('scenarios.amountType')}</label>
                        <select
                          value={term.amount_type}
                          onChange={(e) => {
                            const newTerms = [...formData.payment_terms]
                            newTerms[index].amount_type = e.target.value as 'percentage' | 'fixed_amount'
                            setFormData({...formData, payment_terms: newTerms})
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                        >
                          <option value="percentage">{t('scenarios.percentage')}</option>
                          <option value="fixed_amount">{t('scenarios.fixedAmount')}</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          {term.amount_type === 'percentage' ? t('scenarios.percentageValue') : t('scenarios.amountUSD')}
                        </label>
                        <input
                          type="number"
                          value={term.amount_type === 'percentage' ? (term.percentage || '') : (term.fixed_amount || '')}
                          onChange={(e) => {
                            const newTerms = [...formData.payment_terms]
                            if (term.amount_type === 'percentage') {
                              newTerms[index].percentage = parseFloat(e.target.value) || 0
                            } else {
                              newTerms[index].fixed_amount = parseFloat(e.target.value) || 0
                            }
                            setFormData({...formData, payment_terms: newTerms})
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                          placeholder={term.amount_type === 'percentage' ? '10' : '25000'}
                          step={term.amount_type === 'percentage' ? '0.1' : '100'}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">{t('scenarios.dueDate')}</label>
                        <div className="flex gap-2">
                          <input
                            type="date"
                            value={term.due_date}
                            onChange={(e) => {
                              const newTerms = [...formData.payment_terms]
                              newTerms[index].due_date = e.target.value
                              setFormData({...formData, payment_terms: newTerms})
                            }}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const newTerms = formData.payment_terms.filter((_, i) => i !== index)
                              setFormData({...formData, payment_terms: newTerms})
                            }}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Afficher le montant calculé si pourcentage */}
                    {term.amount_type === 'percentage' && (term.percentage ?? 0) > 0 && formData.purchase_price > 0 && (
                      <div className="mt-2 text-xs text-gray-600">
                        {t('scenarios.calculatedAmount')}: {((formData.purchase_price * (term.percentage ?? 0)) / 100).toLocaleString('fr-CA', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section Frais Récurrents */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Frais récurrents</h3>
                <p className="text-xs text-gray-600 mt-1">HOA, entretien pelouse, piscine, etc.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFormData({
                    ...formData,
                    recurring_fees: [
                      ...(formData.recurring_fees || []),
                      {
                        label: '',
                        amount: 0,
                        frequency: 'monthly',
                        currency: 'USD'
                      }
                    ]
                  })
                }}
                className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
              >
                <Plus size={16} />
                Ajouter frais
              </button>
            </div>

            {!formData.recurring_fees || formData.recurring_fees.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">Aucun frais récurrent ajouté</p>
            ) : (
              <div className="space-y-3">
                {formData.recurring_fees.map((fee, index) => (
                  <div key={index} className="border border-green-200 rounded-lg p-4 bg-green-50">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Type de frais</label>
                        <input
                          type="text"
                          value={fee.label}
                          onChange={(e) => {
                            const newFees = [...(formData.recurring_fees || [])]
                            newFees[index].label = e.target.value
                            setFormData({...formData, recurring_fees: newFees})
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          placeholder="HOA, Pelouse, Piscine..."
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Montant</label>
                        <input
                          type="number"
                          value={fee.amount || ''}
                          onChange={(e) => {
                            const newFees = [...(formData.recurring_fees || [])]
                            newFees[index].amount = parseFloat(e.target.value) || 0
                            setFormData({...formData, recurring_fees: newFees})
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          placeholder="150"
                          step="10"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Fréquence</label>
                        <select
                          value={fee.frequency}
                          onChange={(e) => {
                            const newFees = [...(formData.recurring_fees || [])]
                            newFees[index].frequency = e.target.value as 'monthly' | 'annual'
                            setFormData({...formData, recurring_fees: newFees})
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        >
                          <option value="monthly">Mensuel</option>
                          <option value="annual">Annuel</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Devise</label>
                        <div className="flex gap-2">
                          <select
                            value={fee.currency}
                            onChange={(e) => {
                              const newFees = [...(formData.recurring_fees || [])]
                              newFees[index].currency = e.target.value as 'USD' | 'CAD'
                              setFormData({...formData, recurring_fees: newFees})
                            }}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          >
                            <option value="USD">USD</option>
                            <option value="CAD">CAD</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => {
                              const newFees = (formData.recurring_fees || []).filter((_, i) => i !== index)
                              setFormData({...formData, recurring_fees: newFees})
                            }}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Afficher équivalent mensuel si annuel */}
                    {fee.frequency === 'annual' && fee.amount > 0 && (
                      <div className="mt-2 text-xs text-gray-600">
                        Équivalent mensuel: {(fee.amount / 12).toLocaleString('fr-CA', { style: 'currency', currency: fee.currency })}
                      </div>
                    )}
                  </div>
                ))}

                {/* Total des frais récurrents */}
                {formData.recurring_fees && formData.recurring_fees.length > 0 && (
                  <div className="bg-green-100 border border-green-300 rounded-lg p-3">
                    <div className="text-sm font-semibold text-green-900">
                      Total frais récurrents (mensuel):
                      {' '}
                      {formData.recurring_fees
                        .reduce((total, fee) => {
                          const monthlyAmount = fee.frequency === 'annual' ? fee.amount / 12 : fee.amount
                          return total + monthlyAmount
                        }, 0)
                        .toLocaleString('fr-CA', { style: 'currency', currency: 'USD' })}
                      {' USD/mois'}
                    </div>
                    <div className="text-xs text-green-700 mt-1">
                      Total annuel:
                      {' '}
                      {formData.recurring_fees
                        .reduce((total, fee) => {
                          const annualAmount = fee.frequency === 'monthly' ? fee.amount * 12 : fee.amount
                          return total + annualAmount
                        }, 0)
                        .toLocaleString('fr-CA', { style: 'currency', currency: 'USD' })}
                      {' USD/an'}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-4 justify-end pt-4 border-t border-gray-200">
            <button
              onClick={() => setActiveView('list')}
              className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={createScenario}
              disabled={!formData.name || formData.purchase_price === 0}
              className="px-6 py-2 bg-[#5e5e5e] hover:bg-[#3e3e3e] text-white rounded-lg font-medium transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {t('scenarios.create')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Vue détails scénario
  if (activeView === 'details' && selectedScenario) {
    const activeResult = scenarioResults.find(r => r.scenario_type === activeScenarioType)

    return (
      <div className="space-y-6 mt-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{getFullName(selectedScenario.name, selectedScenario.unit_number)}</h2>
            <div className="flex items-center gap-2 mt-2">
              {getStatusBadge(selectedScenario.status)}
            </div>
          </div>
          <button
            onClick={() => {
              setActiveView('list')
              setSelectedScenario(null)
              setScenarioResults([])
              setVotes([])
              setDocuments([])
              setVoteStatus(null)
            }}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors"
          >
            {t('scenarios.back')}
          </button>
        </div>

        {/* Actions selon le statut */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
          <div className="flex flex-wrap gap-3">
            {selectedScenario.status === 'draft' && (
              <>
                <button
                  onClick={analyzeScenario}
                  disabled={analyzing}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:bg-gray-400 flex items-center gap-2"
                >
                  <Calculator size={16} />
                  {analyzing ? t('scenarios.analyzing') : t('scenarios.analyze')}
                </button>
                {scenarioResults.length > 0 && (
                  <button
                    onClick={submitForVote}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    <Vote size={16} />
                    {t('scenarios.submitForVote')}
                  </button>
                )}
              </>
            )}

            {/* Bouton forcer approbation (admin uniquement) */}
            {selectedScenario.status === 'pending_vote' && currentInvestor?.access_level === 'admin' && (
              <button
                onClick={forceApproval}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 border-2 border-orange-800"
              >
                <AlertCircle size={16} />
                {t('scenarios.forceApproval')}
              </button>
            )}

            {selectedScenario.status === 'approved' && (
              <button
                onClick={markAsPurchased}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <ShoppingCart size={16} />
                {t('scenarios.markAsPurchased')}
              </button>
            )}

            {/* Bouton Supprimer (brouillon ou admin) */}
            {(selectedScenario.status === 'draft' || currentInvestor?.access_level === 'admin') && (
              <button
                onClick={deleteScenario}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <Trash2 size={16} />
                Supprimer
              </button>
            )}

            <button
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <Download size={16} />
              {t('scenarios.exportPDF')}
            </button>
          </div>
        </div>

        {/* Onglets de navigation */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-2">
          <div className="flex gap-2">
            <button
              onClick={() => setDetailTab('overview')}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                detailTab === 'overview'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Vue d'ensemble
            </button>
            {selectedScenario.status === 'purchased' && (
              <button
                onClick={() => setDetailTab('bookings')}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                  detailTab === 'bookings'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Calendrier de bookings
              </button>
            )}
            <button
              onClick={() => setDetailTab('share')}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                detailTab === 'share'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Partager
            </button>
          </div>
        </div>

        {/* Contenu de l'onglet Vue d'ensemble */}
        {detailTab === 'overview' && (
          <>
            {/* Documents */}
            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">{t('scenarios.promoterDocuments')}</h3>

          {/* Zone de drag & drop pour documents */}
          {selectedScenario.status !== 'purchased' && (
            <div className="mb-6">
              <DropZone
                onFilesSelected={uploadDocuments}
                accept="image/*,.pdf,.xlsx,.docx,.pptx"
                multiple={true}
                maxSize={50}
                showCamera={true}
                showFolderSelect={true}
                label="Glissez-déposez vos documents et photos ici ou"
              />
            </div>
          )}

          {/* Liste des documents */}
          {documents.length === 0 ? (
            <p className="text-gray-600 text-sm text-center py-8">{t('scenarioDocuments.noDocuments')}</p>
          ) : (
            <div className="space-y-2">
              {documents.map(doc => (
                <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText size={20} className="text-gray-600" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{doc.file_name}</p>
                      <p className="text-xs text-gray-600">{(doc.file_size / 1024).toFixed(0)} KB</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <a
                      href={doc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Eye size={16} />
                    </a>
                    {selectedScenario.status !== 'purchased' && (
                      <button
                        onClick={() => deleteDocument(doc.id, `${selectedScenario.id}/${doc.file_name}`)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Résultats d'analyse */}
        {scenarioResults.length > 0 && (
          <>
            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
              <div className="flex gap-2 overflow-x-auto">
                <button
                  onClick={() => setActiveScenarioType('conservative')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                    activeScenarioType === 'conservative'
                      ? 'bg-orange-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  📉 {t('scenarioType.conservative')}
                </button>
                <button
                  onClick={() => setActiveScenarioType('moderate')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                    activeScenarioType === 'moderate'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  📊 {t('scenarioType.moderate')}
                </button>
                <button
                  onClick={() => setActiveScenarioType('optimistic')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                    activeScenarioType === 'optimistic'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  📈 {t('scenarioType.optimistic')}
                </button>
              </div>
            </div>

            {activeResult && (
              <>
                {/* Note sur les taux de change */}
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign size={16} className="text-blue-700" />
                    <div className="text-sm font-bold text-blue-900">Projections en dollars canadiens (CAD)</div>
                  </div>
                  <div className="text-xs text-blue-800 space-y-1">
                    <p>• <strong>Investissement initial:</strong> Converti au taux actuel USD→CAD: {exchangeRate.toFixed(4)}</p>
                    <p>• <strong>Revenus futurs:</strong> Convertis avec un taux ajusté (+5% risque change): {(exchangeRate * 1.05).toFixed(4)}</p>
                    <p className="text-blue-600 mt-2 italic">Les projections reflètent le risque de fluctuation du taux de change sur la durée du projet</p>
                  </div>
                </div>

                {/* Métriques clés */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
                    <div className="flex items-center gap-2 text-gray-600 text-sm mb-2">
                      <TrendingUp size={16} />
                      {t('scenarioResults.avgAnnualReturn')}
                    </div>
                    <div className={`text-2xl font-bold ${
                      activeResult.summary.avg_annual_return > 8 ? 'text-green-600' :
                      activeResult.summary.avg_annual_return > 5 ? 'text-blue-600' : 'text-red-600'
                    }`}>
                      {activeResult.summary.avg_annual_return.toFixed(2)}%
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
                    <div className="flex items-center gap-2 text-gray-600 text-sm mb-2">
                      <DollarSign size={16} />
                      {t('scenarioResults.totalReturn')}
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                      {activeResult.summary.total_return.toFixed(1)}%
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
                    <div className="flex items-center gap-2 text-gray-600 text-sm mb-2">
                      <Home size={16} />
                      {t('scenarioResults.finalValue')}
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                      {activeResult.summary.final_property_value.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
                    <div className="flex items-center gap-2 text-gray-600 text-sm mb-2">
                      <FileText size={16} />
                      {t('scenarioResults.breakEven')}
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                      {t('scenarioResults.year')} {activeResult.summary.break_even_year}
                    </div>
                  </div>
                </div>

                {/* Évaluation écrite */}
                <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">{t('scenarioResults.evaluation')}</h3>
                  <div className="prose prose-sm max-w-none whitespace-pre-line text-gray-700">
                    {activeResult.evaluation_text}
                  </div>
                </div>

                {/* Tableau projection */}
                <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 overflow-x-auto">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">{t('scenarioResults.projection')}</h3>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="text-left p-2 font-medium text-gray-700">{t('scenarioResults.year')}</th>
                        <th className="text-right p-2 font-medium text-gray-700">{t('scenarioResults.propertyValue')}</th>
                        <th className="text-right p-2 font-medium text-gray-700">{t('scenarioResults.revenues')}</th>
                        <th className="text-right p-2 font-medium text-gray-700">{t('scenarioResults.fees')}</th>
                        <th className="text-right p-2 font-medium text-gray-700">{t('scenarioResults.net')}</th>
                        <th className="text-right p-2 font-medium text-gray-700">{t('scenarioResults.cashflow')}</th>
                        <th className="text-right p-2 font-medium text-gray-700">ROI (%)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeResult.yearly_data.map((data) => (
                        <tr key={data.year} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="p-2 font-medium text-gray-900">{data.year}</td>
                          <td className="p-2 text-right text-gray-900">
                            {data.property_value.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
                          </td>
                          <td className="p-2 text-right text-gray-900">
                            {data.rental_income.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
                          </td>
                          <td className="p-2 text-right text-red-600">
                            -{data.management_fees.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
                          </td>
                          <td className={`p-2 text-right font-medium ${data.net_income >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {data.net_income.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
                          </td>
                          <td className={`p-2 text-right font-medium ${data.cumulative_cashflow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {data.cumulative_cashflow.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
                          </td>
                          <td className={`p-2 text-right font-bold ${data.roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {data.roi.toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Tableau comparatif Projections vs Réelles (uniquement pour projets achetés) */}
                {selectedScenario.status === 'purchased' && (
                  <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 overflow-x-auto">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-gray-900">Projections vs Valeurs Réelles</h3>
                      <button
                        onClick={() => setEditingActualYear(editingActualYear ? null : 1)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors text-sm"
                      >
                        {editingActualYear ? 'Annuler' : 'Saisir valeurs réelles'}
                      </button>
                    </div>

                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b-2 border-gray-300 bg-gray-50">
                          <th className="text-left p-2 font-medium text-gray-700">{t('scenarioResults.year')}</th>
                          <th colSpan={3} className="text-center p-2 font-medium text-blue-700 border-r-2 border-gray-300">PROJECTION</th>
                          <th colSpan={3} className="text-center p-2 font-medium text-green-700">VALEURS RÉELLES</th>
                        </tr>
                        <tr className="border-b border-gray-200 bg-gray-50">
                          <th className="text-left p-2"></th>
                          <th className="text-right p-2 text-xs text-gray-600">Valeur bien</th>
                          <th className="text-right p-2 text-xs text-gray-600">Revenus</th>
                          <th className="text-right p-2 text-xs text-gray-600 border-r-2 border-gray-300">Net</th>
                          <th className="text-right p-2 text-xs text-gray-600">Valeur bien</th>
                          <th className="text-right p-2 text-xs text-gray-600">Revenus</th>
                          <th className="text-right p-2 text-xs text-gray-600">Net</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeResult.yearly_data.map((projected) => {
                          const actual = actualValues.find(a => a.year === projected.year)
                          const isEditing = editingActualYear === projected.year

                          return (
                            <tr key={projected.year} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="p-2 font-medium text-gray-900">
                                {projected.year}
                                {!actual && editingActualYear && (
                                  <button
                                    onClick={() => setEditingActualYear(projected.year)}
                                    className="ml-2 text-xs text-blue-600 hover:underline"
                                  >
                                    Saisir
                                  </button>
                                )}
                              </td>

                              {/* PROJECTION */}
                              <td className="p-2 text-right text-gray-700 text-xs">
                                {projected.property_value.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
                              </td>
                              <td className="p-2 text-right text-gray-700 text-xs">
                                {projected.rental_income.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
                              </td>
                              <td className="p-2 text-right text-gray-700 text-xs border-r-2 border-gray-300">
                                {projected.net_income.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
                              </td>

                              {/* VALEURS RÉELLES */}
                              {isEditing ? (
                                <>
                                  <td className="p-1">
                                    <input
                                      type="number"
                                      placeholder="Valeur"
                                      defaultValue={actual?.property_value || ''}
                                      onBlur={(e) => {
                                        const newActual = {
                                          ...actual,
                                          scenario_id: selectedScenario.id,
                                          year: projected.year,
                                          property_value: parseFloat(e.target.value) || undefined
                                        } as ActualValue
                                        saveActualValue(newActual)
                                      }}
                                      className="w-full px-2 py-1 text-xs border rounded"
                                    />
                                  </td>
                                  <td className="p-1">
                                    <input
                                      type="number"
                                      placeholder="Revenus"
                                      defaultValue={actual?.rental_income || ''}
                                      onBlur={(e) => {
                                        const newActual = {
                                          ...actual,
                                          scenario_id: selectedScenario.id,
                                          year: projected.year,
                                          rental_income: parseFloat(e.target.value) || undefined
                                        } as ActualValue
                                        saveActualValue(newActual)
                                      }}
                                      className="w-full px-2 py-1 text-xs border rounded"
                                    />
                                  </td>
                                  <td className="p-1">
                                    <input
                                      type="number"
                                      placeholder="Net"
                                      defaultValue={actual?.net_income || ''}
                                      onBlur={(e) => {
                                        const newActual = {
                                          ...actual,
                                          scenario_id: selectedScenario.id,
                                          year: projected.year,
                                          net_income: parseFloat(e.target.value) || undefined
                                        } as ActualValue
                                        saveActualValue(newActual)
                                      }}
                                      className="w-full px-2 py-1 text-xs border rounded"
                                    />
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td className={`p-2 text-right font-medium text-xs ${
                                    actual?.property_value
                                      ? (actual.property_value >= projected.property_value ? 'text-green-600' : 'text-red-600')
                                      : 'text-gray-400'
                                  }`}>
                                    {actual?.property_value
                                      ? actual.property_value.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })
                                      : '—'
                                    }
                                  </td>
                                  <td className={`p-2 text-right font-medium text-xs ${
                                    actual?.rental_income
                                      ? (actual.rental_income >= projected.rental_income ? 'text-green-600' : 'text-red-600')
                                      : 'text-gray-400'
                                  }`}>
                                    {actual?.rental_income
                                      ? actual.rental_income.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })
                                      : '—'
                                    }
                                  </td>
                                  <td className={`p-2 text-right font-medium text-xs ${
                                    actual?.net_income
                                      ? (actual.net_income >= projected.net_income ? 'text-green-600' : 'text-red-600')
                                      : 'text-gray-400'
                                  }`}>
                                    {actual?.net_income
                                      ? actual.net_income.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })
                                      : '—'
                                    }
                                    {actual && (
                                      <button
                                        onClick={() => setEditingActualYear(projected.year)}
                                        className="ml-2 text-blue-600 hover:underline"
                                      >
                                        ✎
                                      </button>
                                    )}
                                  </td>
                                </>
                              )}
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>

                    <div className="mt-4 text-xs text-gray-600">
                      <p>💡 <strong>Code couleur:</strong></p>
                      <p className="text-green-600">• Vert = Valeur réelle ≥ Projection (bon)</p>
                      <p className="text-red-600">• Rouge = Valeur réelle &lt; Projection (attention)</p>
                      <p className="text-gray-400">• Gris = Pas encore de données</p>
                    </div>
                  </div>
                )}

                {/* Graphiques comparatifs Projections vs Réelles */}
                {selectedScenario.status === 'purchased' && actualValues.length > 0 && (
                  <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-6">Graphiques comparatifs</h3>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Graphique Valeur du bien */}
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">Valeur du bien</h4>
                        <div className="relative h-64 border border-gray-200 rounded-lg p-4">
                          {(() => {
                            const maxValue = Math.max(
                              ...activeResult.yearly_data.map(d => d.property_value),
                              ...actualValues.filter(a => a.property_value).map(a => a.property_value!)
                            )
                            const minValue = Math.min(
                              ...activeResult.yearly_data.map(d => d.property_value),
                              ...actualValues.filter(a => a.property_value).map(a => a.property_value!)
                            )
                            const range = maxValue - minValue
                            const padding = range * 0.1

                            return (
                              <svg className="w-full h-full">
                                {/* Grille horizontale */}
                                {[0, 25, 50, 75, 100].map((percent) => (
                                  <g key={percent}>
                                    <line
                                      x1="0%"
                                      y1={`${100 - percent}%`}
                                      x2="100%"
                                      y2={`${100 - percent}%`}
                                      stroke="#e5e7eb"
                                      strokeWidth="1"
                                    />
                                    <text
                                      x="0"
                                      y={`${100 - percent}%`}
                                      dy="-4"
                                      fontSize="10"
                                      fill="#6b7280"
                                    >
                                      ${((minValue - padding + (maxValue - minValue + 2 * padding) * percent / 100) / 1000).toFixed(0)}k
                                    </text>
                                  </g>
                                ))}

                                {/* Ligne des projections (bleu) */}
                                <polyline
                                  points={activeResult.yearly_data.map((d, i) => {
                                    const x = (i / (activeResult.yearly_data.length - 1)) * 100
                                    const y = 100 - ((d.property_value - minValue + padding) / (maxValue - minValue + 2 * padding) * 100)
                                    return `${x},${y}`
                                  }).join(' ')}
                                  fill="none"
                                  stroke="#3b82f6"
                                  strokeWidth="2"
                                />

                                {/* Points des projections */}
                                {activeResult.yearly_data.map((d, i) => {
                                  const x = (i / (activeResult.yearly_data.length - 1)) * 100
                                  const y = 100 - ((d.property_value - minValue + padding) / (maxValue - minValue + 2 * padding) * 100)
                                  return (
                                    <circle
                                      key={i}
                                      cx={`${x}%`}
                                      cy={`${y}%`}
                                      r="4"
                                      fill="#3b82f6"
                                    />
                                  )
                                })}

                                {/* Ligne des valeurs réelles (vert/rouge) */}
                                {actualValues.filter(a => a.property_value).length > 1 && (
                                  <polyline
                                    points={actualValues.filter(a => a.property_value).map((actual) => {
                                      const i = actual.year - 1
                                      const x = (i / (activeResult.yearly_data.length - 1)) * 100
                                      const y = 100 - ((actual.property_value! - minValue + padding) / (maxValue - minValue + 2 * padding) * 100)
                                      return `${x},${y}`
                                    }).join(' ')}
                                    fill="none"
                                    stroke="#10b981"
                                    strokeWidth="2"
                                    strokeDasharray="5,5"
                                  />
                                )}

                                {/* Points des valeurs réelles */}
                                {actualValues.filter(a => a.property_value).map((actual) => {
                                  const i = actual.year - 1
                                  const projected = activeResult.yearly_data[i]
                                  const x = (i / (activeResult.yearly_data.length - 1)) * 100
                                  const y = 100 - ((actual.property_value! - minValue + padding) / (maxValue - minValue + 2 * padding) * 100)
                                  const isGood = actual.property_value! >= projected.property_value
                                  return (
                                    <circle
                                      key={actual.year}
                                      cx={`${x}%`}
                                      cy={`${y}%`}
                                      r="5"
                                      fill={isGood ? '#10b981' : '#ef4444'}
                                      stroke="white"
                                      strokeWidth="2"
                                    />
                                  )
                                })}

                                {/* Légendes des années en bas */}
                                {activeResult.yearly_data.map((d, i) => {
                                  const x = (i / (activeResult.yearly_data.length - 1)) * 100
                                  return (
                                    <text
                                      key={i}
                                      x={`${x}%`}
                                      y="100%"
                                      textAnchor="middle"
                                      fontSize="10"
                                      fill="#6b7280"
                                    >
                                      An {d.year}
                                    </text>
                                  )
                                })}
                              </svg>
                            )
                          })()}
                        </div>
                        <div className="flex items-center justify-center gap-4 mt-2 text-xs">
                          <div className="flex items-center gap-1">
                            <div className="w-4 h-0.5 bg-blue-500"></div>
                            <span className="text-gray-600">Projection</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-4 h-0.5 bg-green-500 border-dashed border-t-2 border-green-500"></div>
                            <span className="text-gray-600">Réel</span>
                          </div>
                        </div>
                      </div>

                      {/* Graphique Revenus locatifs */}
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">Revenus locatifs</h4>
                        <div className="relative h-64 border border-gray-200 rounded-lg p-4">
                          {(() => {
                            const maxValue = Math.max(
                              ...activeResult.yearly_data.map(d => d.rental_income),
                              ...actualValues.filter(a => a.rental_income).map(a => a.rental_income!)
                            )
                            const minValue = Math.min(
                              ...activeResult.yearly_data.map(d => d.rental_income),
                              ...actualValues.filter(a => a.rental_income).map(a => a.rental_income!)
                            )
                            const range = maxValue - minValue
                            const padding = range * 0.1

                            return (
                              <svg className="w-full h-full">
                                {/* Grille horizontale */}
                                {[0, 25, 50, 75, 100].map((percent) => (
                                  <g key={percent}>
                                    <line
                                      x1="0%"
                                      y1={`${100 - percent}%`}
                                      x2="100%"
                                      y2={`${100 - percent}%`}
                                      stroke="#e5e7eb"
                                      strokeWidth="1"
                                    />
                                    <text
                                      x="0"
                                      y={`${100 - percent}%`}
                                      dy="-4"
                                      fontSize="10"
                                      fill="#6b7280"
                                    >
                                      ${((minValue - padding + (maxValue - minValue + 2 * padding) * percent / 100) / 1000).toFixed(0)}k
                                    </text>
                                  </g>
                                ))}

                                {/* Ligne des projections */}
                                <polyline
                                  points={activeResult.yearly_data.map((d, i) => {
                                    const x = (i / (activeResult.yearly_data.length - 1)) * 100
                                    const y = 100 - ((d.rental_income - minValue + padding) / (maxValue - minValue + 2 * padding) * 100)
                                    return `${x},${y}`
                                  }).join(' ')}
                                  fill="none"
                                  stroke="#3b82f6"
                                  strokeWidth="2"
                                />

                                {/* Points des projections */}
                                {activeResult.yearly_data.map((d, i) => {
                                  const x = (i / (activeResult.yearly_data.length - 1)) * 100
                                  const y = 100 - ((d.rental_income - minValue + padding) / (maxValue - minValue + 2 * padding) * 100)
                                  return (
                                    <circle
                                      key={i}
                                      cx={`${x}%`}
                                      cy={`${y}%`}
                                      r="4"
                                      fill="#3b82f6"
                                    />
                                  )
                                })}

                                {/* Ligne des valeurs réelles */}
                                {actualValues.filter(a => a.rental_income).length > 1 && (
                                  <polyline
                                    points={actualValues.filter(a => a.rental_income).map((actual) => {
                                      const i = actual.year - 1
                                      const x = (i / (activeResult.yearly_data.length - 1)) * 100
                                      const y = 100 - ((actual.rental_income! - minValue + padding) / (maxValue - minValue + 2 * padding) * 100)
                                      return `${x},${y}`
                                    }).join(' ')}
                                    fill="none"
                                    stroke="#10b981"
                                    strokeWidth="2"
                                    strokeDasharray="5,5"
                                  />
                                )}

                                {/* Points des valeurs réelles */}
                                {actualValues.filter(a => a.rental_income).map((actual) => {
                                  const i = actual.year - 1
                                  const projected = activeResult.yearly_data[i]
                                  const x = (i / (activeResult.yearly_data.length - 1)) * 100
                                  const y = 100 - ((actual.rental_income! - minValue + padding) / (maxValue - minValue + 2 * padding) * 100)
                                  const isGood = actual.rental_income! >= projected.rental_income
                                  return (
                                    <circle
                                      key={actual.year}
                                      cx={`${x}%`}
                                      cy={`${y}%`}
                                      r="5"
                                      fill={isGood ? '#10b981' : '#ef4444'}
                                      stroke="white"
                                      strokeWidth="2"
                                    />
                                  )
                                })}

                                {/* Légendes des années */}
                                {activeResult.yearly_data.map((d, i) => {
                                  const x = (i / (activeResult.yearly_data.length - 1)) * 100
                                  return (
                                    <text
                                      key={i}
                                      x={`${x}%`}
                                      y="100%"
                                      textAnchor="middle"
                                      fontSize="10"
                                      fill="#6b7280"
                                    >
                                      An {d.year}
                                    </text>
                                  )
                                })}
                              </svg>
                            )
                          })()}
                        </div>
                        <div className="flex items-center justify-center gap-4 mt-2 text-xs">
                          <div className="flex items-center gap-1">
                            <div className="w-4 h-0.5 bg-blue-500"></div>
                            <span className="text-gray-600">Projection</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-4 h-0.5 bg-green-500 border-dashed border-t-2 border-green-500"></div>
                            <span className="text-gray-600">Réel</span>
                          </div>
                        </div>
                      </div>

                      {/* Graphique Revenu net */}
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">Revenu net</h4>
                        <div className="relative h-64 border border-gray-200 rounded-lg p-4">
                          {(() => {
                            const maxValue = Math.max(
                              ...activeResult.yearly_data.map(d => d.net_income),
                              ...actualValues.filter(a => a.net_income).map(a => a.net_income!)
                            )
                            const minValue = Math.min(
                              ...activeResult.yearly_data.map(d => d.net_income),
                              ...actualValues.filter(a => a.net_income).map(a => a.net_income!)
                            )
                            const range = maxValue - minValue
                            const padding = range * 0.1

                            return (
                              <svg className="w-full h-full">
                                {/* Grille horizontale */}
                                {[0, 25, 50, 75, 100].map((percent) => (
                                  <g key={percent}>
                                    <line
                                      x1="0%"
                                      y1={`${100 - percent}%`}
                                      x2="100%"
                                      y2={`${100 - percent}%`}
                                      stroke="#e5e7eb"
                                      strokeWidth="1"
                                    />
                                    <text
                                      x="0"
                                      y={`${100 - percent}%`}
                                      dy="-4"
                                      fontSize="10"
                                      fill="#6b7280"
                                    >
                                      ${((minValue - padding + (maxValue - minValue + 2 * padding) * percent / 100) / 1000).toFixed(0)}k
                                    </text>
                                  </g>
                                ))}

                                {/* Ligne des projections */}
                                <polyline
                                  points={activeResult.yearly_data.map((d, i) => {
                                    const x = (i / (activeResult.yearly_data.length - 1)) * 100
                                    const y = 100 - ((d.net_income - minValue + padding) / (maxValue - minValue + 2 * padding) * 100)
                                    return `${x},${y}`
                                  }).join(' ')}
                                  fill="none"
                                  stroke="#3b82f6"
                                  strokeWidth="2"
                                />

                                {/* Points des projections */}
                                {activeResult.yearly_data.map((d, i) => {
                                  const x = (i / (activeResult.yearly_data.length - 1)) * 100
                                  const y = 100 - ((d.net_income - minValue + padding) / (maxValue - minValue + 2 * padding) * 100)
                                  return (
                                    <circle
                                      key={i}
                                      cx={`${x}%`}
                                      cy={`${y}%`}
                                      r="4"
                                      fill="#3b82f6"
                                    />
                                  )
                                })}

                                {/* Ligne des valeurs réelles */}
                                {actualValues.filter(a => a.net_income).length > 1 && (
                                  <polyline
                                    points={actualValues.filter(a => a.net_income).map((actual) => {
                                      const i = actual.year - 1
                                      const x = (i / (activeResult.yearly_data.length - 1)) * 100
                                      const y = 100 - ((actual.net_income! - minValue + padding) / (maxValue - minValue + 2 * padding) * 100)
                                      return `${x},${y}`
                                    }).join(' ')}
                                    fill="none"
                                    stroke="#10b981"
                                    strokeWidth="2"
                                    strokeDasharray="5,5"
                                  />
                                )}

                                {/* Points des valeurs réelles */}
                                {actualValues.filter(a => a.net_income).map((actual) => {
                                  const i = actual.year - 1
                                  const projected = activeResult.yearly_data[i]
                                  const x = (i / (activeResult.yearly_data.length - 1)) * 100
                                  const y = 100 - ((actual.net_income! - minValue + padding) / (maxValue - minValue + 2 * padding) * 100)
                                  const isGood = actual.net_income! >= projected.net_income
                                  return (
                                    <circle
                                      key={actual.year}
                                      cx={`${x}%`}
                                      cy={`${y}%`}
                                      r="5"
                                      fill={isGood ? '#10b981' : '#ef4444'}
                                      stroke="white"
                                      strokeWidth="2"
                                    />
                                  )
                                })}

                                {/* Légendes des années */}
                                {activeResult.yearly_data.map((d, i) => {
                                  const x = (i / (activeResult.yearly_data.length - 1)) * 100
                                  return (
                                    <text
                                      key={i}
                                      x={`${x}%`}
                                      y="100%"
                                      textAnchor="middle"
                                      fontSize="10"
                                      fill="#6b7280"
                                    >
                                      An {d.year}
                                    </text>
                                  )
                                })}
                              </svg>
                            )
                          })()}
                        </div>
                        <div className="flex items-center justify-center gap-4 mt-2 text-xs">
                          <div className="flex items-center gap-1">
                            <div className="w-4 h-0.5 bg-blue-500"></div>
                            <span className="text-gray-600">Projection</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-4 h-0.5 bg-green-500 border-dashed border-t-2 border-green-500"></div>
                            <span className="text-gray-600">Réel</span>
                          </div>
                        </div>
                      </div>

                      {/* Graphique Cashflow cumulatif */}
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">Cashflow cumulatif</h4>
                        <div className="relative h-64 border border-gray-200 rounded-lg p-4">
                          {(() => {
                            const maxValue = Math.max(
                              ...activeResult.yearly_data.map(d => d.cumulative_cashflow),
                              ...actualValues.filter(a => a.cumulative_cashflow).map(a => a.cumulative_cashflow!)
                            )
                            const minValue = Math.min(
                              ...activeResult.yearly_data.map(d => d.cumulative_cashflow),
                              ...actualValues.filter(a => a.cumulative_cashflow).map(a => a.cumulative_cashflow!)
                            )
                            const range = maxValue - minValue
                            const padding = range * 0.1

                            return (
                              <svg className="w-full h-full">
                                {/* Grille horizontale */}
                                {[0, 25, 50, 75, 100].map((percent) => (
                                  <g key={percent}>
                                    <line
                                      x1="0%"
                                      y1={`${100 - percent}%`}
                                      x2="100%"
                                      y2={`${100 - percent}%`}
                                      stroke="#e5e7eb"
                                      strokeWidth="1"
                                    />
                                    <text
                                      x="0"
                                      y={`${100 - percent}%`}
                                      dy="-4"
                                      fontSize="10"
                                      fill="#6b7280"
                                    >
                                      ${((minValue - padding + (maxValue - minValue + 2 * padding) * percent / 100) / 1000).toFixed(0)}k
                                    </text>
                                  </g>
                                ))}

                                {/* Ligne des projections */}
                                <polyline
                                  points={activeResult.yearly_data.map((d, i) => {
                                    const x = (i / (activeResult.yearly_data.length - 1)) * 100
                                    const y = 100 - ((d.cumulative_cashflow - minValue + padding) / (maxValue - minValue + 2 * padding) * 100)
                                    return `${x},${y}`
                                  }).join(' ')}
                                  fill="none"
                                  stroke="#3b82f6"
                                  strokeWidth="2"
                                />

                                {/* Points des projections */}
                                {activeResult.yearly_data.map((d, i) => {
                                  const x = (i / (activeResult.yearly_data.length - 1)) * 100
                                  const y = 100 - ((d.cumulative_cashflow - minValue + padding) / (maxValue - minValue + 2 * padding) * 100)
                                  return (
                                    <circle
                                      key={i}
                                      cx={`${x}%`}
                                      cy={`${y}%`}
                                      r="4"
                                      fill="#3b82f6"
                                    />
                                  )
                                })}

                                {/* Ligne des valeurs réelles */}
                                {actualValues.filter(a => a.cumulative_cashflow).length > 1 && (
                                  <polyline
                                    points={actualValues.filter(a => a.cumulative_cashflow).map((actual) => {
                                      const i = actual.year - 1
                                      const x = (i / (activeResult.yearly_data.length - 1)) * 100
                                      const y = 100 - ((actual.cumulative_cashflow! - minValue + padding) / (maxValue - minValue + 2 * padding) * 100)
                                      return `${x},${y}`
                                    }).join(' ')}
                                    fill="none"
                                    stroke="#10b981"
                                    strokeWidth="2"
                                    strokeDasharray="5,5"
                                  />
                                )}

                                {/* Points des valeurs réelles */}
                                {actualValues.filter(a => a.cumulative_cashflow).map((actual) => {
                                  const i = actual.year - 1
                                  const projected = activeResult.yearly_data[i]
                                  const x = (i / (activeResult.yearly_data.length - 1)) * 100
                                  const y = 100 - ((actual.cumulative_cashflow! - minValue + padding) / (maxValue - minValue + 2 * padding) * 100)
                                  const isGood = actual.cumulative_cashflow! >= projected.cumulative_cashflow
                                  return (
                                    <circle
                                      key={actual.year}
                                      cx={`${x}%`}
                                      cy={`${y}%`}
                                      r="5"
                                      fill={isGood ? '#10b981' : '#ef4444'}
                                      stroke="white"
                                      strokeWidth="2"
                                    />
                                  )
                                })}

                                {/* Légendes des années */}
                                {activeResult.yearly_data.map((d, i) => {
                                  const x = (i / (activeResult.yearly_data.length - 1)) * 100
                                  return (
                                    <text
                                      key={i}
                                      x={`${x}%`}
                                      y="100%"
                                      textAnchor="middle"
                                      fontSize="10"
                                      fill="#6b7280"
                                    >
                                      An {d.year}
                                    </text>
                                  )
                                })}
                              </svg>
                            )
                          })()}
                        </div>
                        <div className="flex items-center justify-center gap-4 mt-2 text-xs">
                          <div className="flex items-center gap-1">
                            <div className="w-4 h-0.5 bg-blue-500"></div>
                            <span className="text-gray-600">Projection</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-4 h-0.5 bg-green-500 border-dashed border-t-2 border-green-500"></div>
                            <span className="text-gray-600">Réel</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-sm text-blue-900">
                        <strong>💡 Interprétation:</strong>
                      </p>
                      <ul className="mt-2 text-sm text-blue-800 space-y-1">
                        <li>• <strong className="text-green-600">Points verts</strong> = Performance réelle ≥ projection (objectif atteint ou dépassé)</li>
                        <li>• <strong className="text-red-600">Points rouges</strong> = Performance réelle &lt; projection (sous-performance)</li>
                        <li>• <strong className="text-blue-600">Ligne continue</strong> = Projections initiales du scénario</li>
                        <li>• <strong className="text-green-600">Ligne pointillée</strong> = Évolution réelle du projet</li>
                      </ul>
                    </div>
                  </div>
                )}

                {/* Analyse des revenus locatifs */}
                <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 overflow-x-auto">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">{t('scenarios.rentalIncomeAnalysis')}</h3>

                  {(() => {
                    // Calculate nightly rate
                    const baseRent = selectedScenario.promoter_data.monthly_rent || 0
                    const nightlyRate = selectedScenario.promoter_data.rent_type === 'monthly'
                      ? baseRent / 30
                      : baseRent
                    const managementFeesPercent = selectedScenario.promoter_data.management_fees || 56
                    const taxRate = selectedScenario.promoter_data.tax_rate || 27
                    const currency = selectedScenario.promoter_data.rent_currency || 'USD'

                    // Generate occupancy rates from 55% to 85% in 5% increments
                    const occupancyRates = [55, 60, 65, 70, 75, 80, 85]

                    const analysisData = occupancyRates.map(occupancy => {
                      const nights = Math.round((365 * occupancy) / 100 * 100) / 100
                      const annualIncome = nights * nightlyRate
                      const managementFees = annualIncome * (managementFeesPercent / 100)
                      const annualRevenue = annualIncome - managementFees
                      const tax = annualRevenue * (taxRate / 100)
                      const netIncome = annualRevenue - tax

                      return {
                        occupancy,
                        nights,
                        nightlyRate,
                        annualIncome,
                        managementFeesPercent,
                        managementFees,
                        annualRevenue,
                        taxRate,
                        tax,
                        netIncome
                      }
                    })

                    return (
                      <table className="w-full text-xs sm:text-sm">
                        <thead>
                          <tr className="border-b border-gray-200 bg-gray-50">
                            <th className="text-left p-2 font-medium text-gray-700">{t('scenarios.occupancyRate')}</th>
                            <th className="text-right p-2 font-medium text-gray-700">{t('scenarios.numberOfNights')}</th>
                            <th className="text-right p-2 font-medium text-gray-700">{t('scenarios.accommodationPrice')}</th>
                            <th className="text-right p-2 font-medium text-gray-700">{t('scenarios.annualIncome')}</th>
                            <th className="text-right p-2 font-medium text-gray-700">{t('scenarios.managementFees')}</th>
                            <th className="text-right p-2 font-medium text-gray-700">{t('scenarios.annualRevenue')}</th>
                            <th className="text-right p-2 font-medium text-gray-700">{t('scenarios.tax')}</th>
                            <th className="text-right p-2 font-medium text-gray-700">{t('scenarios.netIncome')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analysisData.map((data, idx) => (
                            <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="p-2 font-medium text-gray-900">{data.occupancy}%</td>
                              <td className="p-2 text-right text-gray-900">{data.nights.toFixed(2)}</td>
                              <td className="p-2 text-right text-gray-900">
                                {data.nightlyRate.toLocaleString('fr-CA', {
                                  style: 'currency',
                                  currency: currency,
                                  minimumFractionDigits: 2
                                })}
                              </td>
                              <td className="p-2 text-right text-gray-900">
                                {data.annualIncome.toLocaleString('fr-CA', {
                                  style: 'currency',
                                  currency: currency,
                                  minimumFractionDigits: 2
                                })}
                              </td>
                              <td className="p-2 text-right text-red-600">
                                {data.managementFeesPercent}% ({data.managementFees.toLocaleString('fr-CA', {
                                  style: 'currency',
                                  currency: currency,
                                  minimumFractionDigits: 2
                                })})
                              </td>
                              <td className="p-2 text-right text-gray-900">
                                {data.annualRevenue.toLocaleString('fr-CA', {
                                  style: 'currency',
                                  currency: currency,
                                  minimumFractionDigits: 2
                                })}
                              </td>
                              <td className="p-2 text-right text-red-600">
                                {data.taxRate}% ({data.tax.toLocaleString('fr-CA', {
                                  style: 'currency',
                                  currency: currency,
                                  minimumFractionDigits: 2
                                })})
                              </td>
                              <td className="p-2 text-right font-bold text-green-600">
                                {data.netIncome.toLocaleString('fr-CA', {
                                  style: 'currency',
                                  currency: currency,
                                  minimumFractionDigits: 2
                                })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )
                  })()}

                  {/* Simple visualization */}
                  <div className="mt-6">
                    <h4 className="text-sm font-bold text-gray-900 mb-3">{t('scenarios.netIncomeComparison')}</h4>
                    <div className="space-y-2">
                      {(() => {
                        const baseRent = selectedScenario.promoter_data.monthly_rent || 0
                        const nightlyRate = selectedScenario.promoter_data.rent_type === 'monthly'
                          ? baseRent / 30
                          : baseRent
                        const managementFeesPercent = selectedScenario.promoter_data.management_fees || 56
                        const taxRate = selectedScenario.promoter_data.tax_rate || 27
                        const occupancyRates = [55, 60, 65, 70, 75, 80, 85]

                        const chartData = occupancyRates.map(occupancy => {
                          const nights = (365 * occupancy) / 100
                          const annualIncome = nights * nightlyRate
                          const managementFees = annualIncome * (managementFeesPercent / 100)
                          const annualRevenue = annualIncome - managementFees
                          const tax = annualRevenue * (taxRate / 100)
                          const netIncome = annualRevenue - tax
                          return { occupancy, netIncome }
                        })

                        const maxIncome = Math.max(...chartData.map(d => d.netIncome))

                        return chartData.map((data, idx) => (
                          <div key={idx} className="flex items-center gap-3">
                            <span className="text-xs font-medium text-gray-700 w-12">{data.occupancy}%</span>
                            <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
                              <div
                                className="bg-gradient-to-r from-green-500 to-green-600 h-6 rounded-full flex items-center justify-end pr-2"
                                style={{ width: `${(data.netIncome / maxIncome) * 100}%` }}
                              >
                                <span className="text-xs font-bold text-white">
                                  {data.netIncome.toLocaleString('fr-CA', {
                                    style: 'currency',
                                    currency: selectedScenario.promoter_data.rent_currency || 'USD',
                                    minimumFractionDigits: 0
                                  })}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))
                      })()}
                    </div>
                  </div>
                </div>

                {/* ROI Timeline avec augmentation locative */}
                <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 overflow-x-auto">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">{t('scenarios.roiTimeline')}</h3>

                  {(() => {
                    const purchasePrice = calculateTotalCost(selectedScenario)
                    const baseRent = selectedScenario.promoter_data.monthly_rent || 0
                    const nightlyRate = selectedScenario.promoter_data.rent_type === 'monthly'
                      ? baseRent / 30
                      : baseRent
                    const occupancyRate = selectedScenario.promoter_data.occupancy_rate || 80
                    const managementFeesPercent = selectedScenario.promoter_data.management_fees || 56
                    const taxRate = selectedScenario.promoter_data.tax_rate || 27
                    const annualRentIncrease = selectedScenario.promoter_data.annual_rent_increase || 2
                    const projectDuration = selectedScenario.promoter_data.project_duration || 10
                    const currency = selectedScenario.promoter_data.rent_currency || 'USD'

                    let cumulativeIncome = 0
                    const timelineData: Array<{
                      year: number
                      nightlyRate: number
                      annualIncome: number
                      netIncome: number
                      cumulativeIncome: number
                      roi: number
                    }> = []

                    for (let year = 1; year <= projectDuration; year++) {
                      // Apply progressive rent increase
                      const yearlyNightlyRate = nightlyRate * Math.pow(1 + (annualRentIncrease / 100), year - 1)
                      const nights = (365 * occupancyRate) / 100
                      const annualIncome = nights * yearlyNightlyRate
                      const managementFees = annualIncome * (managementFeesPercent / 100)
                      const annualRevenue = annualIncome - managementFees
                      const tax = annualRevenue * (taxRate / 100)
                      const netIncome = annualRevenue - tax

                      cumulativeIncome += netIncome
                      const roi = ((cumulativeIncome / purchasePrice) * 100)

                      timelineData.push({
                        year,
                        nightlyRate: yearlyNightlyRate,
                        annualIncome,
                        netIncome,
                        cumulativeIncome,
                        roi
                      })
                    }

                    return (
                      <>
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-200 bg-gray-50">
                              <th className="text-left p-2 font-medium text-gray-700">{t('scenarioResults.year')}</th>
                              <th className="text-right p-2 font-medium text-gray-700">{t('scenarios.nightlyRate')}</th>
                              <th className="text-right p-2 font-medium text-gray-700">{t('scenarios.annualIncome')}</th>
                              <th className="text-right p-2 font-medium text-gray-700">{t('scenarios.netIncome')}</th>
                              <th className="text-right p-2 font-medium text-gray-700">{t('scenarios.cumulativeIncome')}</th>
                              <th className="text-right p-2 font-medium text-gray-700">ROI</th>
                            </tr>
                          </thead>
                          <tbody>
                            {timelineData.map((data) => (
                              <tr key={data.year} className="border-b border-gray-100 hover:bg-gray-50">
                                <td className="p-2 font-medium text-gray-900">{data.year}</td>
                                <td className="p-2 text-right text-gray-900">
                                  {data.nightlyRate.toLocaleString('fr-CA', {
                                    style: 'currency',
                                    currency: currency,
                                    minimumFractionDigits: 2
                                  })}
                                </td>
                                <td className="p-2 text-right text-gray-900">
                                  {data.annualIncome.toLocaleString('fr-CA', {
                                    style: 'currency',
                                    currency: currency,
                                    minimumFractionDigits: 0
                                  })}
                                </td>
                                <td className="p-2 text-right text-green-600 font-medium">
                                  {data.netIncome.toLocaleString('fr-CA', {
                                    style: 'currency',
                                    currency: currency,
                                    minimumFractionDigits: 0
                                  })}
                                </td>
                                <td className="p-2 text-right text-blue-600 font-medium">
                                  {data.cumulativeIncome.toLocaleString('fr-CA', {
                                    style: 'currency',
                                    currency: currency,
                                    minimumFractionDigits: 0
                                  })}
                                </td>
                                <td className={`p-2 text-right font-bold ${data.roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {data.roi.toFixed(2)}%
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>

                        {/* ROI Progress Visualization */}
                        <div className="mt-6">
                          <h4 className="text-sm font-bold text-gray-900 mb-3">{t('scenarios.roiProgress')}</h4>
                          <div className="space-y-2">
                            {timelineData.map((data) => {
                              const maxROI = timelineData[timelineData.length - 1].roi
                              const widthPercent = maxROI > 0 ? Math.min((data.roi / maxROI) * 100, 100) : 0

                              return (
                                <div key={data.year} className="flex items-center gap-3">
                                  <span className="text-xs font-medium text-gray-700 w-16">{t('scenarioResults.year')} {data.year}</span>
                                  <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
                                    <div
                                      className="bg-gradient-to-r from-blue-500 to-blue-600 h-6 rounded-full flex items-center justify-end pr-2"
                                      style={{ width: `${widthPercent}%` }}
                                    >
                                      <span className="text-xs font-bold text-white">
                                        {data.roi.toFixed(1)}%
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </>
                    )
                  })()}
                </div>
              </>
            )}
          </>
        )}
          </>
        )}

        {/* Contenu de l'onglet Bookings */}
        {detailTab === 'bookings' && selectedScenario.status === 'purchased' && (
          <div className="space-y-6">
            {/* Stats d'occupation */}
            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
              <OccupationStats
                type="project"
                id={selectedScenario.id}
                showDetails={true}
              />
            </div>

            {/* Calendrier de bookings */}
            <BookingsCalendar
              scenarioId={selectedScenario.id}
              currency={selectedScenario.promoter_data.rent_currency}
              defaultNightlyRate={selectedScenario.promoter_data.rent_type === 'nightly'
                ? selectedScenario.promoter_data.monthly_rent
                : Math.round(selectedScenario.promoter_data.monthly_rent / 30)
              }
            />
          </div>
        )}

        {/* Contenu de l'onglet Partage */}
        {detailTab === 'share' && (
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <ShareLinkManager
              scenarioId={selectedScenario.id}
              scenarioName={getFullName(selectedScenario.name, selectedScenario.unit_number)}
            />
          </div>
        )}

        {/* Section de vote */}
        {selectedScenario.status === 'pending_vote' && voteStatus && (
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">{t('voting.status')}</h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-700 font-medium">{t('voting.votesReceived')}</p>
                <p className="text-2xl font-bold text-blue-900">{voteStatus.total_votes} / {voteStatus.total_eligible_voters}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-green-700 font-medium">{t('voting.approvals')}</p>
                <p className="text-2xl font-bold text-green-900">{voteStatus.approve_votes}</p>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <p className="text-sm text-red-700 font-medium">{t('voting.rejections')}</p>
                <p className="text-2xl font-bold text-red-900">{voteStatus.reject_votes}</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <p className="text-sm text-purple-700 font-medium">{t('voting.approvalRate')}</p>
                <p className="text-2xl font-bold text-purple-900">{voteStatus.approval_percentage.toFixed(1)}%</p>
              </div>
            </div>

            {canVote && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-900 mb-3">
                  {currentUserVote ? t('voting.yourVote') + ': ' + (currentUserVote.vote === 'approve' ? '✅ ' + t('voting.approve') : '❌ ' + t('voting.reject')) : t('voting.yourVote') + ':'}
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => castVote('approve')}
                    className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                  >
                    ✅ {t('voting.approve')}
                  </button>
                  <button
                    onClick={() => castVote('reject')}
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                  >
                    ❌ {t('voting.reject')}
                  </button>
                </div>
              </div>
            )}

            <div>
              <h4 className="text-sm font-bold text-gray-900 mb-3">{t('voting.individualVotes')} ({votes.length})</h4>
              <div className="space-y-2">
                {votes.map(vote => (
                  <div key={vote.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{vote.investor_name}</p>
                      {vote.comment && <p className="text-xs text-gray-600 mt-1">{vote.comment}</p>}
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      vote.vote === 'approve' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {vote.vote === 'approve' ? '✅ ' + t('voting.approve') : '❌ ' + t('voting.reject')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return null
}
