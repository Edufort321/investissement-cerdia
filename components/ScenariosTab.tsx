'use client'

import { useState, useEffect } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useInvestment } from '@/contexts/InvestmentContext'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import {
  Calculator, TrendingUp, DollarSign, Home, FileText, Upload,
  Vote, CheckCircle, XCircle, Clock, ShoppingCart, Download,
  FileUp, Trash2, Eye, ChevronDown, ChevronUp, AlertCircle
} from 'lucide-react'

// Types
interface Scenario {
  id: string
  name: string
  purchase_price: number
  initial_fees: number
  promoter_data: PromoterData
  payment_terms: PaymentTerm[]
  status: 'draft' | 'pending_vote' | 'approved' | 'rejected' | 'purchased'
  created_by: string
  created_at: string
  converted_property_id?: string
  converted_at?: string
}

interface PromoterData {
  monthly_rent: number
  annual_appreciation: number
  occupancy_rate: number
  management_fees: number
  project_duration: number
}

interface PaymentTerm {
  label: string
  amount_type: 'percentage' | 'fixed_amount'
  percentage?: number
  fixed_amount?: number
  due_date: string
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
  const { investors, currentUser } = useInvestment()
  const supabase = createClientComponentClient()

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
  const [expandedScenario, setExpandedScenario] = useState<string | null>(null)
  const [uploadingFile, setUploadingFile] = useState(false)

  // Formulaire création scénario
  const [formData, setFormData] = useState({
    name: '',
    purchase_price: 0,
    initial_fees: 0,
    promoter_data: {
      monthly_rent: 0,
      annual_appreciation: 5,
      occupancy_rate: 80,
      management_fees: 10,
      project_duration: 10
    },
    payment_terms: [] as PaymentTerm[]
  })

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

  const loadScenarios = async () => {
    try {
      const { data, error } = await supabase
        .from('scenarios')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setScenarios(data || [])
    } catch (error) {
      console.error('Error loading scenarios:', error)
    } finally {
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
        .order('uploaded_at', { ascending: false })

      if (docsError) throw docsError
      setDocuments(docsData || [])

    } catch (error) {
      console.error('Error loading scenario details:', error)
    }
  }

  const createScenario = async () => {
    if (!currentUser || !formData.name || formData.purchase_price === 0) {
      alert('Veuillez remplir tous les champs obligatoires')
      return
    }

    try {
      const { data, error } = await supabase
        .from('scenarios')
        .insert([{
          name: formData.name,
          purchase_price: formData.purchase_price,
          initial_fees: formData.initial_fees,
          promoter_data: formData.promoter_data,
          payment_terms: formData.payment_terms,
          status: 'draft',
          created_by: currentUser.id
        }])
        .select()
        .single()

      if (error) throw error

      setScenarios([data, ...scenarios])
      setSelectedScenario(data)
      setActiveView('details')

      // Réinitialiser le formulaire
      setFormData({
        name: '',
        purchase_price: 0,
        initial_fees: 0,
        promoter_data: {
          monthly_rent: 0,
          annual_appreciation: 5,
          occupancy_rate: 80,
          management_fees: 10,
          project_duration: 10
        },
        payment_terms: []
      })

      alert('Scénario créé avec succès!')
    } catch (error) {
      console.error('Error creating scenario:', error)
      alert('Erreur lors de la création du scénario')
    }
  }

  const analyzeScenario = async () => {
    if (!selectedScenario) return

    setAnalyzing(true)

    try {
      // Calculer les 3 scénarios
      const conservative = calculateScenario(selectedScenario, 'conservative')
      const moderate = calculateScenario(selectedScenario, 'moderate')
      const optimistic = calculateScenario(selectedScenario, 'optimistic')

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
      alert('Analyse terminée! Les 3 scénarios ont été générés.')

    } catch (error) {
      console.error('Error analyzing scenario:', error)
      alert('Erreur lors de l\'analyse du scénario')
    } finally {
      setAnalyzing(false)
    }
  }

  const calculateScenario = (scenario: Scenario, type: 'conservative' | 'moderate' | 'optimistic'): ScenarioResult => {
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

    const totalInvestment = scenario.purchase_price + scenario.initial_fees
    const initialCash = totalInvestment

    const yearlyData: YearData[] = []
    let cumulativeCashflow = -initialCash

    for (let year = 1; year <= pd.project_duration; year++) {
      const propertyValue = totalInvestment * Math.pow(1 + adjustedAppreciation / 100, year)
      const annualRent = adjustedRent * 12 * (adjustedOccupancy / 100)
      const managementFees = annualRent * (pd.management_fees / 100)
      const netIncome = annualRent - managementFees

      cumulativeCashflow += netIncome

      const roi = initialCash > 0 ? ((propertyValue - initialCash + cumulativeCashflow) / initialCash * 100) : 0

      yearlyData.push({
        year,
        property_value: propertyValue,
        rental_income: annualRent,
        management_fees: managementFees,
        net_income: netIncome,
        cumulative_cashflow: cumulativeCashflow,
        roi
      })
    }

    const finalYear = yearlyData[yearlyData.length - 1]
    const totalNetIncome = yearlyData.reduce((sum, y) => sum + y.net_income, 0)
    const totalReturn = ((finalYear.property_value - initialCash + totalNetIncome) / initialCash) * 100
    const avgAnnualReturn = totalReturn / pd.project_duration
    const breakEvenYear = yearlyData.findIndex(y => y.cumulative_cashflow > 0) + 1

    let recommendation: 'recommended' | 'consider' | 'not_recommended' = 'consider'
    if (avgAnnualReturn > 8 && breakEvenYear <= 5) {
      recommendation = 'recommended'
    } else if (avgAnnualReturn < 3 || breakEvenYear > 8) {
      recommendation = 'not_recommended'
    }

    const evaluation_text = generateEvaluation(type, avgAnnualReturn, breakEvenYear, totalReturn, recommendation, pd.project_duration)

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
    duration: number
  ): string => {
    const scenarioName = type === 'conservative' ? 'Conservateur' : type === 'moderate' ? 'Modéré' : 'Élevé'
    let recText = 'à considérer avec prudence'
    if (recommendation === 'recommended') recText = 'recommandé'
    if (recommendation === 'not_recommended') recText = 'déconseillé'

    return `**Scénario ${scenarioName}**

**Recommandation:** Projet ${recText}

**Rendement annuel moyen:** ${avgAnnualReturn.toFixed(2)}%
**Point mort:** Année ${breakEven}
**Retour total:** ${totalReturn.toFixed(1)}% sur ${duration} ans

${avgReturn > 8 ? '✅ Rendement attractif' : avgReturn < 3 ? '⚠️ Rendement faible' : '📊 Rendement modéré'}
${breakEven <= 5 ? '✅ Point mort rapide' : breakEven > 7 ? '⚠️ Point mort éloigné' : '📊 Point mort acceptable'}`
  }

  const submitForVote = async () => {
    if (!selectedScenario || scenarioResults.length === 0) {
      alert('Veuillez d\'abord analyser le scénario avant de le soumettre au vote')
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
      alert('Scénario soumis au vote des investisseurs!')
    } catch (error) {
      console.error('Error submitting for vote:', error)
      alert('Erreur lors de la soumission au vote')
    }
  }

  const castVote = async (voteChoice: 'approve' | 'reject', comment?: string) => {
    if (!selectedScenario || !currentUser) return

    // Vérifier si l'investisseur a le droit de vote
    const currentInvestor = investors.find(inv => inv.user_id === currentUser.id)
    if (!currentInvestor?.can_vote) {
      alert('Vous n\'avez pas la permission de voter sur ce scénario')
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
      alert('Vote enregistré!')
    } catch (error) {
      console.error('Error casting vote:', error)
      alert('Erreur lors de l\'enregistrement du vote')
    }
  }

  const forceApproval = async () => {
    if (!selectedScenario) return

    // Vérifier si l'utilisateur est admin
    const currentInvestor = currentUser ? investors.find(inv => inv.user_id === currentUser.id) : null
    if (!currentInvestor || currentInvestor.access_level !== 'admin') {
      alert('Seuls les administrateurs peuvent forcer l\'approbation')
      return
    }

    if (!confirm('⚠️ Êtes-vous sûr de vouloir FORCER l\'approbation de ce scénario?\n\nCeci contourne le système de vote normal et marque le scénario comme approuvé par les investisseurs.')) return

    try {
      const { error } = await supabase
        .from('scenarios')
        .update({ status: 'approved' })
        .eq('id', selectedScenario.id)

      if (error) throw error

      setSelectedScenario({ ...selectedScenario, status: 'approved' })
      await loadScenarios()
      alert('✅ Scénario marqué comme approuvé (forcé par admin)')
    } catch (error) {
      console.error('Error forcing approval:', error)
      alert('Erreur lors du forçage de l\'approbation')
    }
  }

  const markAsPurchased = async () => {
    if (!selectedScenario || selectedScenario.status !== 'approved') {
      alert('Le scénario doit être approuvé avant de le marquer comme acheté')
      return
    }

    if (!confirm('Voulez-vous convertir ce scénario en projet actif?')) return

    try {
      // Créer la propriété
      const propertyData = {
        name: selectedScenario.name,
        location: 'À définir',
        status: 'active',
        total_cost: selectedScenario.purchase_price + selectedScenario.initial_fees,
        paid_amount: 0,
        currency: 'USD',
        expected_roi: scenarioResults.find(r => r.scenario_type === 'moderate')?.summary.avg_annual_return || 0,
        property_type: 'residential',
        acquisition_date: new Date().toISOString().split('T')[0]
      }

      const { data: property, error: propError } = await supabase
        .from('properties')
        .insert([propertyData])
        .select()
        .single()

      if (propError) throw propError

      // Créer les termes de paiement si définis
      if (selectedScenario.payment_terms && selectedScenario.payment_terms.length > 0) {
        const termsToInsert = selectedScenario.payment_terms.map(term => {
          const amount = term.amount_type === 'percentage'
            ? (selectedScenario.purchase_price * (term.percentage || 0) / 100)
            : (term.fixed_amount || 0)

          return {
            property_id: property.id,
            term_label: term.label,
            amount,
            currency: 'USD',
            due_date: term.due_date,
            status: 'pending'
          }
        })

        const { error: termsError } = await supabase
          .from('payment_schedules')
          .insert(termsToInsert)

        if (termsError) throw termsError
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

      alert('Scénario converti en projet actif avec succès!')
      setActiveView('list')
      await loadScenarios()

    } catch (error) {
      console.error('Error marking as purchased:', error)
      alert('Erreur lors de la conversion en projet')
    }
  }

  const uploadDocument = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedScenario || !event.target.files || event.target.files.length === 0) return

    const file = event.target.files[0]
    const maxSize = 50 * 1024 * 1024 // 50MB

    if (file.size > maxSize) {
      alert('Le fichier est trop volumineux (max 50MB)')
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
      alert('Document uploadé avec succès!')

    } catch (error) {
      console.error('Error uploading document:', error)
      alert('Erreur lors de l\'upload du document')
    } finally {
      setUploadingFile(false)
      event.target.value = ''
    }
  }

  const deleteDocument = async (docId: string, filePath: string) => {
    if (!confirm('Voulez-vous vraiment supprimer ce document?')) return

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
      alert('Document supprimé')

    } catch (error) {
      console.error('Error deleting document:', error)
      alert('Erreur lors de la suppression')
    }
  }

  const getStatusBadge = (status: Scenario['status']) => {
    const badges = {
      draft: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Brouillon', icon: FileText },
      pending_vote: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'En vote', icon: Vote },
      approved: { bg: 'bg-green-100', text: 'text-green-700', label: 'Approuvé', icon: CheckCircle },
      rejected: { bg: 'bg-red-100', text: 'text-red-700', label: 'Rejeté', icon: XCircle },
      purchased: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Acheté', icon: ShoppingCart }
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
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Scénarios d'Évaluation</h2>
            <p className="text-sm sm:text-base text-gray-600 mt-1">Créer, analyser et voter sur les opportunités d'investissement</p>
          </div>
          <button
            onClick={() => setActiveView('create')}
            className="px-4 py-2 bg-[#5e5e5e] hover:bg-[#3e3e3e] text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <Calculator size={20} />
            Nouveau scénario
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <Clock className="animate-spin mx-auto text-gray-400" size={48} />
            <p className="text-gray-600 mt-4">Chargement...</p>
          </div>
        ) : scenarios.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-12 text-center">
            <Calculator className="mx-auto text-gray-400" size={64} />
            <h3 className="text-lg font-bold text-gray-900 mt-4">Aucun scénario</h3>
            <p className="text-gray-600 mt-2">Créez votre premier scénario d'évaluation</p>
            <button
              onClick={() => setActiveView('create')}
              className="mt-4 px-4 py-2 bg-[#5e5e5e] hover:bg-[#3e3e3e] text-white rounded-lg font-medium transition-colors"
            >
              Créer un scénario
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {scenarios.map(scenario => (
              <div key={scenario.id} className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-gray-900">{scenario.name}</h3>
                      {getStatusBadge(scenario.status)}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                      <div>
                        <p className="text-xs text-gray-600">Prix d'achat</p>
                        <p className="text-sm font-bold text-gray-900">
                          {scenario.purchase_price.toLocaleString('fr-CA', { style: 'currency', currency: 'USD' })}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Coût total</p>
                        <p className="text-sm font-bold text-gray-900">
                          {(scenario.purchase_price + scenario.initial_fees).toLocaleString('fr-CA', { style: 'currency', currency: 'USD' })}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Loyer mensuel</p>
                        <p className="text-sm font-bold text-gray-900">
                          {scenario.promoter_data.monthly_rent.toLocaleString('fr-CA', { style: 'currency', currency: 'USD' })}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Durée</p>
                        <p className="text-sm font-bold text-gray-900">{scenario.promoter_data.project_duration} ans</p>
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
                    Voir
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
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Nouveau Scénario</h2>
            <p className="text-sm sm:text-base text-gray-600 mt-1">Créer une évaluation pour une opportunité d'investissement</p>
          </div>
          <button
            onClick={() => setActiveView('list')}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors"
          >
            Retour
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 space-y-6">
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4">Informations de base</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Nom du projet *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                  placeholder="Ex: Villa Punta Cana - Phase 2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Prix d'achat ($) *</label>
                <input
                  type="number"
                  value={formData.purchase_price || ''}
                  onChange={(e) => setFormData({...formData, purchase_price: parseFloat(e.target.value) || 0})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                  placeholder="250000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Frais initiaux ($)</label>
                <input
                  type="number"
                  value={formData.initial_fees || ''}
                  onChange={(e) => setFormData({...formData, initial_fees: parseFloat(e.target.value) || 0})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                  placeholder="15000"
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4">Données du promoteur</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Loyer mensuel ($)</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Appréciation annuelle (%)</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Taux d'occupation (%)</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Frais de gestion (%)</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Durée du projet (années)</label>
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
            </div>
          </div>

          <div className="flex gap-4 justify-end pt-4 border-t border-gray-200">
            <button
              onClick={() => setActiveView('list')}
              className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={createScenario}
              disabled={!formData.name || formData.purchase_price === 0}
              className="px-6 py-2 bg-[#5e5e5e] hover:bg-[#3e3e3e] text-white rounded-lg font-medium transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Créer le scénario
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
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{selectedScenario.name}</h2>
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
            Retour
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
                  {analyzing ? 'Analyse en cours...' : 'Analyser'}
                </button>
                {scenarioResults.length > 0 && (
                  <button
                    onClick={submitForVote}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    <Vote size={16} />
                    Soumettre au vote
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
                Forcer l'approbation (Admin)
              </button>
            )}

            {selectedScenario.status === 'approved' && (
              <button
                onClick={markAsPurchased}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <ShoppingCart size={16} />
                Marquer comme acheté
              </button>
            )}

            <button
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <Download size={16} />
              Exporter PDF
            </button>
          </div>
        </div>

        {/* Documents */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">Documents du promoteur</h3>
            {selectedScenario.status === 'draft' && (
              <label className="px-4 py-2 bg-[#5e5e5e] hover:bg-[#3e3e3e] text-white rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-2">
                <FileUp size={16} />
                {uploadingFile ? 'Upload...' : 'Ajouter'}
                <input
                  type="file"
                  onChange={uploadDocument}
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png,.xlsx,.docx,.pptx"
                  disabled={uploadingFile}
                />
              </label>
            )}
          </div>

          {documents.length === 0 ? (
            <p className="text-gray-600 text-sm text-center py-8">Aucun document</p>
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
                    {selectedScenario.status === 'draft' && (
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
                  📉 Conservateur
                </button>
                <button
                  onClick={() => setActiveScenarioType('moderate')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                    activeScenarioType === 'moderate'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  📊 Modéré
                </button>
                <button
                  onClick={() => setActiveScenarioType('optimistic')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                    activeScenarioType === 'optimistic'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  📈 Élevé
                </button>
              </div>
            </div>

            {activeResult && (
              <>
                {/* Métriques clés */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
                    <div className="flex items-center gap-2 text-gray-600 text-sm mb-2">
                      <TrendingUp size={16} />
                      Rendement annuel moyen
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
                      Retour total
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                      {activeResult.summary.total_return.toFixed(1)}%
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
                    <div className="flex items-center gap-2 text-gray-600 text-sm mb-2">
                      <Home size={16} />
                      Valeur finale
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                      {activeResult.summary.final_property_value.toLocaleString('fr-CA', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })}
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
                    <div className="flex items-center gap-2 text-gray-600 text-sm mb-2">
                      <FileText size={16} />
                      Point mort
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                      Année {activeResult.summary.break_even_year}
                    </div>
                  </div>
                </div>

                {/* Évaluation écrite */}
                <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Évaluation</h3>
                  <div className="prose prose-sm max-w-none whitespace-pre-line text-gray-700">
                    {activeResult.evaluation_text}
                  </div>
                </div>

                {/* Tableau projection */}
                <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 overflow-x-auto">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Projection annuelle</h3>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="text-left p-2 font-medium text-gray-700">Année</th>
                        <th className="text-right p-2 font-medium text-gray-700">Valeur bien</th>
                        <th className="text-right p-2 font-medium text-gray-700">Revenus</th>
                        <th className="text-right p-2 font-medium text-gray-700">Frais</th>
                        <th className="text-right p-2 font-medium text-gray-700">Net</th>
                        <th className="text-right p-2 font-medium text-gray-700">Cashflow</th>
                        <th className="text-right p-2 font-medium text-gray-700">ROI (%)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeResult.yearly_data.map((data) => (
                        <tr key={data.year} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="p-2 font-medium text-gray-900">{data.year}</td>
                          <td className="p-2 text-right text-gray-900">
                            {data.property_value.toLocaleString('fr-CA', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })}
                          </td>
                          <td className="p-2 text-right text-gray-900">
                            {data.rental_income.toLocaleString('fr-CA', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })}
                          </td>
                          <td className="p-2 text-right text-red-600">
                            -{data.management_fees.toLocaleString('fr-CA', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })}
                          </td>
                          <td className={`p-2 text-right font-medium ${data.net_income >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {data.net_income.toLocaleString('fr-CA', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })}
                          </td>
                          <td className={`p-2 text-right font-medium ${data.cumulative_cashflow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {data.cumulative_cashflow.toLocaleString('fr-CA', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })}
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
          </>
        )}

        {/* Section de vote */}
        {selectedScenario.status === 'pending_vote' && voteStatus && (
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Statut du vote</h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-700 font-medium">Votes reçus</p>
                <p className="text-2xl font-bold text-blue-900">{voteStatus.total_votes} / {voteStatus.total_eligible_voters}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-green-700 font-medium">Approbations</p>
                <p className="text-2xl font-bold text-green-900">{voteStatus.approve_votes}</p>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <p className="text-sm text-red-700 font-medium">Rejets</p>
                <p className="text-2xl font-bold text-red-900">{voteStatus.reject_votes}</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <p className="text-sm text-purple-700 font-medium">Taux d'approbation</p>
                <p className="text-2xl font-bold text-purple-900">{voteStatus.approval_percentage.toFixed(1)}%</p>
              </div>
            </div>

            {canVote && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-900 mb-3">
                  {currentUserVote ? 'Vous avez voté: ' + (currentUserVote.vote === 'approve' ? '✅ Approuver' : '❌ Rejeter') : 'Votre vote:'}
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => castVote('approve')}
                    className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                  >
                    ✅ Approuver
                  </button>
                  <button
                    onClick={() => castVote('reject')}
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                  >
                    ❌ Rejeter
                  </button>
                </div>
              </div>
            )}

            <div>
              <h4 className="text-sm font-bold text-gray-900 mb-3">Votes individuels ({votes.length})</h4>
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
                      {vote.vote === 'approve' ? '✅ Approuver' : '❌ Rejeter'}
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
