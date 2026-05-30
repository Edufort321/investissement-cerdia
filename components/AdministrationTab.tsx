'use client'

import { useState, useEffect, useRef } from 'react'
import { useInvestment } from '@/contexts/InvestmentContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { useOrganization } from '@/contexts/OrganizationContext'
import { supabase } from '@/lib/supabase'
import { useNAVTimeline } from '@/hooks/useNAVTimeline'
import { useFinancialSummary } from '@/hooks/useFinancialSummary'
import { useOwnerDays } from '@/hooks/useOwnerDays'
import { Users, Plus, Edit2, Trash2, Mail, Phone, Calendar, DollarSign, TrendingUp, X, Upload, FileText, Download, Filter, TrendingDown, ChevronDown, ChevronUp, FileDown, Paperclip, Menu, ArrowLeftRight } from 'lucide-react'
import TransactionAttachmentsManager from './admin/TransactionAttachmentsManager'
import MonthlyControl from './admin/MonthlyControl'
import TaxReports from './TaxReports'
import PerformanceTracker from './PerformanceTracker'
import OccupationStats from './OccupationStats'
import BookingRevenueSync from './BookingRevenueSync'
import InvestorDebts from './InvestorDebts'
import PropertyValuationManager from './PropertyValuationManager'

interface InvestorFormData {
  user_id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  username: string
  password: string // Mot de passe généré automatiquement
  action_class: string
  total_shares: number
  share_value: number
  total_invested: number
  current_value: number
  percentage_ownership: number
  investment_type: string
  status: string
  join_date: string
  can_vote: boolean
  access_level: string
  permissions: {
    dashboard: boolean
    projet: boolean
    administration: boolean
  }
}

interface TransactionFormData {
  date: string
  type: string
  amount: number
  description: string
  investor_id: string | null
  property_id: string | null
  payment_schedule_id: string | null // Lien vers paiement programmé
  payment_completion_status: 'full' | 'partial' | null // Si paiement complet ou partiel
  category: string
  payment_method: string
  reference_number: string
  status: string
  // NEW: Payment source fields (Migration 90)
  payment_source?: 'compte_courant' | 'investisseur_direct' | 'capex'
  investor_payment_type?: 'achat_parts' | 'dette_a_rembourser'
  affects_compte_courant?: boolean
  // International tax fields
  source_currency: string
  source_amount: number | null
  exchange_rate: number
  source_country: string | null
  bank_fees: number // Frais bancaires/conversion
  foreign_tax_paid: number
  foreign_tax_rate: number
  tax_credit_claimable: number
  fiscal_category: string | null
  vendor_name: string | null
  accountant_notes: string | null
  // Attachment fields (single file per transaction)
  attachment_name?: string | null
  attachment_url?: string | null
  attachment_storage_path?: string | null
  attachment_mime_type?: string | null
  attachment_size?: number | null
  attachment_uploaded_at?: string | null
  // New features (migration 115)
  target_account?: 'compte_courant' | 'capex' | null
  transfer_source?: 'compte_courant' | 'capex' | null
  occurrence_type?: 'unique' | 'récurrent'
  recurrence_frequency?: 'quotidien' | 'hebdomadaire' | 'mensuel' | 'trimestriel' | 'annuel' | null
  recurrence_end_date?: string | null
  recurrence_no_end?: boolean
  // Tax jurisdiction fields (migration 193)
  tax_country?: string | null
  tax_state_province?: string | null
  rental_type?: 'short_term' | 'long_term' | null
  owner_fiscal_status?: 'resident' | 'non_resident' | 'foreign_entity' | null
  is_furnished?: boolean
  is_confotur?: boolean
  sales_tax_amount?: number | null
  state_income_tax_amt?: number | null
  federal_withholding?: number | null
}

interface Document {
  id: string
  name: string
  type: string
  storage_path: string
  file_size: number
  uploaded_at: string
  description: string | null
  investor_id: string | null
}

type SubTabType = 'investisseurs' | 'transactions' | 'capex' | 'rd_dividendes' | 'rapports_fiscaux' | 'performance' | 'sync_revenues' | 'tresorerie' | 'gestion_projet' | 'budgetisation' | 'evaluations' | 'prix_parts' | 'livre_entreprise' | 'mode_emploi' | 'bloc_notes'

interface AdministrationTabProps {
  activeSubTab: SubTabType
}

export default function AdministrationTab({ activeSubTab }: AdministrationTabProps) {
  const {
    investors,
    transactions,
    properties,
    paymentSchedules,
    capexAccounts,
    rndAccounts,
    shareSettings,
    investorSummaries,
    investorInvestments,
    addInvestor,
    updateInvestor,
    deleteInvestor,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    updateNominalShareValue,
    addInvestment,
    loading
  } = useInvestment()

  const { t, language } = useLanguage()
  const fr = language === 'fr'
  const { organization } = useOrganization()
  const orgId = organization?.id ?? null
  const { current: navCurrent } = useNAVTimeline(orgId)
  const { summary: financialSummary } = useFinancialSummary(null, orgId)
  const { entitledDays, remainingDays, totalProjectDays } = useOwnerDays()

  // Refs
  const investorFormRef = useRef<HTMLDivElement>(null)

  // Investors state
  const [showAddInvestorForm, setShowAddInvestorForm] = useState(false)
  const [editingInvestorId, setEditingInvestorId] = useState<string | null>(null)
  const [selectedInvestorId, setSelectedInvestorId] = useState<string | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [uploading, setUploading] = useState(false)
  const [expandedInvestorHistory, setExpandedInvestorHistory] = useState<string | null>(null)
  const [expandedOccupationStats, setExpandedOccupationStats] = useState<string | null>(null)

  // Share settings state
  const [editingNominalValue, setEditingNominalValue] = useState(false)
  const [nominalValueInput, setNominalValueInput] = useState<string>('')
  const [savingNominalValue, setSavingNominalValue] = useState(false)

  // Transactions state
  const [showAddTransactionForm, setShowAddTransactionForm] = useState(false)
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null)
  const [txDirection, setTxDirection] = useState<'revenu' | 'depense' | 'neutre'>('revenu')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterYear, setFilterYear] = useState<string>('all')
  const [txInnerTab, setTxInnerTab] = useState<'liste' | 'guide'>('liste')
  const [showTxMenu, setShowTxMenu] = useState(false)
  const [showMonthlyControl, setShowMonthlyControl] = useState(false)
  const [monthlyStatus, setMonthlyStatus] = useState<'ok' | 'late' | 'unknown'>('unknown')
  const [exportingPDF, setExportingPDF] = useState(false)
  const [pdfIncludeLinks, setPdfIncludeLinks] = useState(true)
  const [exportingInvestorId, setExportingInvestorId] = useState<string | null>(null)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [uploadingAttachment, setUploadingAttachment] = useState(false)
  const [attachmentCounts, setAttachmentCounts] = useState<Record<string, number>>({})

  // Tax jurisdiction rates (from DB — loaded dynamically when country/state changes)
  const [taxRates, setTaxRates] = useState<any[]>([])
  const [taxBreakdown, setTaxBreakdown] = useState<{
    salesTax: number; stateTax: number; federalWithholding: number; total: number
    salesLabel: string; stateLabel: string; federalLabel: string
    filingNote: string; isConfoturExempt: boolean
  } | null>(null)

  // Gmail invoice linking
  const [gmailInvoices, setGmailInvoices] = useState<Array<{ id: string; vendor_name: string | null; document_date: string | null; amount: number | null; currency: string | null; category: string }>>([])
  const [linkedGmailId, setLinkedGmailId] = useState<string>('')
  const [linkedGmailCompany, setLinkedGmailCompany] = useState<string>('CERDIA Globale')

  // Dividend simulator state
  const [dividendYear, setDividendYear] = useState<number>(new Date().getFullYear())
  const [dividendAmount, setDividendAmount] = useState<number>(0)
  const [dividendDate, setDividendDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [capexReservePct, setCapexReservePct] = useState<number>(20)
  const [distributingDividends, setDistributingDividends] = useState<boolean>(false)

  // Year-end election system
  type DividendElection = 'cash' | 'reinvest'
  interface DeclarationDraft {
    fiscal_year: number
    declaration_date: string
    total_amount: number
    nav_per_share: number
    notes: string
  }
  interface InvestorElection {
    investor_id: string
    election: DividendElection
  }
  interface DividendDeclaration {
    id: string
    fiscal_year: number
    declaration_date: string
    total_amount: number
    nav_per_share: number
    total_shares: number
    status: 'draft' | 'elected' | 'executed'
    notes: string | null
    executed_at: string | null
    created_at: string
    elections?: Array<{
      id: string
      investor_id: string
      investor_shares: number
      ownership_pct: number
      dividend_amount: number
      election: DividendElection
      shares_issued: number | null
      t5_issued: boolean
    }>
  }
  const [showDeclarationForm, setShowDeclarationForm] = useState(false)
  const [declarationDraft, setDeclarationDraft] = useState<DeclarationDraft>({
    fiscal_year: new Date().getFullYear(),
    declaration_date: new Date().toISOString().split('T')[0],
    total_amount: 0,
    nav_per_share: 0,
    notes: '',
  })
  const [investorElections, setInvestorElections] = useState<Record<string, DividendElection>>({})
  const [savingDeclaration, setSavingDeclaration] = useState(false)
  const [executingDeclaration, setExecutingDeclaration] = useState<string | null>(null)
  const [declarations, setDeclarations] = useState<DividendDeclaration[]>([])
  const [loadingDeclarations, setLoadingDeclarations] = useState(false)
  const [expandedDeclaration, setExpandedDeclaration] = useState<string | null>(null)

  useEffect(() => {
    if (!showAddTransactionForm) return
    supabase.from('gmail_invoices').select('id,vendor_name,document_date,amount,currency,category')
      .in('category', ['FACTURE', 'RECU_PAIEMENT'])
      .is('cerdia_company', null)
      .is('deleted_at', null)
      .order('document_date', { ascending: false })
      .then(({ data }) => setGmailInvoices(data ?? []))
  }, [showAddTransactionForm])

  const [investorFormData, setInvestorFormData] = useState<InvestorFormData>({
    user_id: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    username: '',
    password: '',
    action_class: 'A',
    total_shares: 0,
    share_value: 1000,
    total_invested: 0,
    current_value: 0,
    percentage_ownership: 0,
    investment_type: 'part',
    status: 'actif',
    join_date: new Date().toISOString().split('T')[0],
    can_vote: true,
    access_level: 'investisseur',
    permissions: {
      dashboard: true,
      projet: false,
      administration: false
    }
  })

  const [transactionFormData, setTransactionFormData] = useState<TransactionFormData>({
    date: new Date().toISOString().split('T')[0],
    type: 'investissement',
    amount: 0,
    description: '',
    investor_id: null,
    property_id: null,
    payment_schedule_id: null,
    payment_completion_status: null,
    category: 'projet',
    payment_method: 'virement',
    reference_number: '',
    status: 'complete',
    payment_source: 'compte_courant',
    investor_payment_type: undefined,
    affects_compte_courant: true,
    source_currency: 'CAD',
    source_amount: null,
    exchange_rate: 1.0,
    source_country: null,
    bank_fees: 0,
    foreign_tax_paid: 0,
    foreign_tax_rate: 0,
    tax_credit_claimable: 0,
    fiscal_category: null,
    vendor_name: null,
    accountant_notes: null,
    target_account: null,
    transfer_source: null,
    occurrence_type: 'unique',
    recurrence_frequency: null,
    recurrence_end_date: null,
    recurrence_no_end: false,
    tax_country: null,
    tax_state_province: null,
    rental_type: null,
    owner_fiscal_status: null,
    is_furnished: false,
    is_confotur: false,
    sales_tax_amount: null,
    state_income_tax_amt: null,
    federal_withholding: null,
  })

  // Fetch documents for selected investor
  useEffect(() => {
    if (selectedInvestorId) {
      fetchDocuments(selectedInvestorId)
    }
  }, [selectedInvestorId])

  useEffect(() => {
    if (transactions.length === 0) return
    const ids = transactions.map((t: any) => t.id).filter(Boolean)
    supabase
      .from('transaction_attachments')
      .select('transaction_id')
      .in('transaction_id', ids)
      .then(({ data }) => {
        if (!data) return
        const counts: Record<string, number> = {}
        data.forEach((row: any) => {
          counts[row.transaction_id] = (counts[row.transaction_id] || 0) + 1
        })
        setAttachmentCounts(counts)
      })
  }, [transactions])

  useEffect(() => {
    const d = new Date()
    const prevStart = new Date(d.getFullYear(), d.getMonth() - 1, 1).toISOString().split('T')[0]
    supabase
      .from('monthly_verifications')
      .select('period_start, period_end')
      .lte('period_start', prevStart)
      .gte('period_end', prevStart)
      .limit(1)
      .then(({ data }) => setMonthlyStatus(data && data.length > 0 ? 'ok' : 'late'))
  }, [])

  const fetchDeclarations = async () => {
    setLoadingDeclarations(true)
    try {
      const { data: decls } = await supabase
        .from('dividend_declarations')
        .select('*')
        .order('declaration_date', { ascending: false })
      if (!decls) return
      const ids = decls.map((d: any) => d.id)
      const { data: elecs } = ids.length > 0
        ? await supabase.from('dividend_investor_elections').select('*').in('declaration_id', ids)
        : { data: [] }
      setDeclarations(decls.map((d: any) => ({
        ...d,
        elections: (elecs ?? []).filter((e: any) => e.declaration_id === d.id),
      })))
    } finally {
      setLoadingDeclarations(false)
    }
  }

  useEffect(() => { fetchDeclarations() }, [])

  const fetchDocuments = async (investorId: string) => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('investor_id', investorId)
        .order('uploaded_at', { ascending: false })

      if (error) throw error
      setDocuments(data || [])
    } catch (error) {
      console.error('Error fetching documents:', error)
    }
  }

  // ==========================================
  // PASSWORD GENERATOR
  // ==========================================

  const generatePassword = (firstName: string, lastName: string): string => {
    // Génère 3 chiffres aléatoires (100-999)
    const randomNumbers = Math.floor(100 + Math.random() * 900)

    // Première lettre du prénom (majuscule)
    const firstInitial = firstName.charAt(0).toUpperCase()

    // 3 premières lettres du nom (minuscules)
    const lastInitials = lastName.substring(0, 3).toLowerCase()

    // 2 caractères spéciaux fixes
    const specialChars = '!$'

    // Format: [3 chiffres][1 lettre prénom][3 lettres nom][2 caractères]
    // Exemple: 321Eduf!$
    return `${randomNumbers}${firstInitial}${lastInitials}${specialChars}`
  }

  // ==========================================
  // OWNERSHIP PERCENTAGE CALCULATOR
  // ==========================================

  const calculateOwnershipPercentage = (currentShares: number): number => {
    // Calculer le total de parts de tous les investisseurs (sauf celui en cours d'édition)
    const otherInvestorsTotalShares = investors
      .filter(inv => inv.id !== editingInvestorId)
      .reduce((sum, inv) => sum + (inv.total_shares || 0), 0)

    // Total incluant l'investisseur actuel
    const totalShares = otherInvestorsTotalShares + currentShares

    // Si le total est 0, retourner 0
    if (totalShares === 0) return 0

    // Calculer le pourcentage
    return (currentShares / totalShares) * 100
  }

  // ==========================================
  // INVESTOR HANDLERS
  // ==========================================

  const handleInvestorSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    console.log('🔷 [handleInvestorSubmit] Début de soumission du formulaire')
    console.log('🔷 [handleInvestorSubmit] Mode:', editingInvestorId ? 'ÉDITION' : 'AJOUT')

    const nominalValue = shareSettings?.nominal_share_value || 1000
    const totalInvested = investorFormData.total_invested
    const currentValue = investorFormData.total_shares * nominalValue
    const ownershipPercentage = calculateOwnershipPercentage(investorFormData.total_shares)

    if (editingInvestorId) {
      // Mode édition : garder le password seulement s'il est renseigné (pour réinitialisation)
      const { password, ...baseData } = investorFormData
      const dataToSubmit = {
        ...baseData,
        ...(password ? { password } : {}), // Inclure password seulement si présent
        user_id: investorFormData.user_id || undefined, // TypeScript strict: undefined au lieu de null
        action_class: investorFormData.action_class || 'A',
        share_value: nominalValue,
        current_value: currentValue,
        total_invested: totalInvested,
        percentage_ownership: ownershipPercentage
      }

      console.log('🔷 [handleInvestorSubmit] Données de modification (password masqué):', {
        ...dataToSubmit,
        password: dataToSubmit.password ? '***' : undefined
      })

      const result = await updateInvestor(editingInvestorId, dataToSubmit)
      if (result.success) {
        console.log('✅ [handleInvestorSubmit] Investisseur modifié avec succès')
        setEditingInvestorId(null)
        resetInvestorForm()
        alert(fr ? '✅ Investisseur modifie avec succes!' : '✅ Investor updated successfully!')
      } else {
        console.error('❌ [handleInvestorSubmit] Échec de la modification:', result.error)
        alert(fr ? `❌ Erreur lors de la modification:\n\n${result.error}\n\nConsultez la console (F12) pour plus de details.` : `❌ Error updating investor:\n\n${result.error}\n\nCheck the console (F12) for details.`)
      }
    } else {
      // Mode ajout : garder le password pour créer le compte Auth
      const dataToSubmit = {
        ...investorFormData,
        user_id: investorFormData.user_id || undefined,
        action_class: investorFormData.action_class || 'A',
        share_value: nominalValue,
        current_value: currentValue,
        total_invested: totalInvested,
        percentage_ownership: ownershipPercentage
      }

      console.log('🔷 [handleInvestorSubmit] Données d\'ajout (password masqué):', {
        ...dataToSubmit,
        password: dataToSubmit.password ? '***' : undefined
      })

      if (!dataToSubmit.email) {
        console.error('❌ [handleInvestorSubmit] Email manquant')
        alert(`❌ ${t('investors.emailRequired')}`)
        return
      }

      // Auto-genere le password s'il est vide ou trop court (min 8 chars Supabase Auth)
      if (!dataToSubmit.password || dataToSubmit.password.length < 8) {
        if (!dataToSubmit.first_name || !dataToSubmit.last_name) {
          alert(`❌ ${t('investors.fillFirstLastName')}`)
          return
        }
        const autoPwd = generatePassword(dataToSubmit.first_name, dataToSubmit.last_name)
        dataToSubmit.password = autoPwd
        setInvestorFormData(prev => ({ ...prev, password: autoPwd }))
        console.log('🔑 [handleInvestorSubmit] Mot de passe auto-genere')
      }

      const result = await addInvestor(dataToSubmit)
      if (result.success) {
        console.log('✅ [handleInvestorSubmit] Investisseur créé avec succès')
        setShowAddInvestorForm(false)
        resetInvestorForm()
        alert(fr ? `✅ Investisseur cree avec succes!\n\nEmail: ${dataToSubmit.email}\n\nL'investisseur peut maintenant se connecter avec son email et mot de passe.` : `✅ Investor created successfully!\n\nEmail: ${dataToSubmit.email}\n\nThe investor can now log in with their email and password.`)
      } else {
        console.error('❌ [handleInvestorSubmit] Échec de la création:', result.error)
        alert(fr ? `❌ Erreur lors de la creation de l'investisseur:\n\n${result.error}\n\n⚠️ IMPORTANT: Consultez la console du navigateur (F12) pour les logs detailles.` : `❌ Error creating investor:\n\n${result.error}\n\n⚠️ IMPORTANT: Check the browser console (F12) for detailed logs.`)
      }
    }
  }

  const handleEditInvestor = (investor: any) => {
    setEditingInvestorId(investor.id)
    setInvestorFormData({
      user_id: investor.user_id,
      first_name: investor.first_name,
      last_name: investor.last_name,
      email: investor.email,
      phone: investor.phone,
      username: investor.username,
      password: '', // Ne pas afficher le mot de passe en mode édition
      action_class: investor.action_class,
      total_shares: investor.total_shares,
      share_value: investor.share_value,
      total_invested: investor.total_invested,
      current_value: investor.current_value,
      percentage_ownership: investor.percentage_ownership,
      investment_type: investor.investment_type,
      status: investor.status,
      join_date: investor.join_date.split('T')[0],
      can_vote: investor.can_vote !== undefined ? investor.can_vote : true,
      access_level: investor.access_level,
      permissions: investor.permissions
    })
    setShowAddInvestorForm(true)

    // Scroll vers le formulaire après un court délai pour permettre le rendu
    setTimeout(() => {
      investorFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  }

  const handleDeleteInvestor = async (id: string, name: string) => {
    if (confirm(fr ? `Etes-vous sur de vouloir supprimer l'investisseur "${name}" ?` : `Are you sure you want to delete the investor "${name}"?`)) {
      const result = await deleteInvestor(id)
      if (!result.success) {
        alert(fr ? 'Erreur lors de la suppression: ' + result.error : 'Delete error: ' + result.error)
      }
    }
  }

  // SHARE VALUE HANDLERS
  // ==========================================

  const handleSaveNominalValue = async () => {
    const newValue = parseFloat(nominalValueInput)

    if (isNaN(newValue) || newValue <= 0) {
      alert('Veuillez entrer une valeur valide supérieure à 0')
      return
    }

    setSavingNominalValue(true)
    const result = await updateNominalShareValue(newValue)
    setSavingNominalValue(false)

    if (result.success) {
      setEditingNominalValue(false)
      setNominalValueInput('')
    } else {
      alert('Erreur lors de la mise à jour: ' + result.error)
    }
  }

  const handleCancelNominalValueEdit = () => {
    setEditingNominalValue(false)
    setNominalValueInput('')
  }

  const handleStartEditNominalValue = () => {
    setNominalValueInput((shareSettings?.nominal_share_value ?? 1).toFixed(2))
    setEditingNominalValue(true)
  }

  // ==========================================

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !selectedInvestorId) return

    const file = e.target.files[0]
    setUploading(true)

    try {
      const fileName = `${selectedInvestorId}/${Date.now()}_${file.name}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      const { error: dbError } = await supabase
        .from('documents')
        .insert([{
          name: file.name,
          type: 'autre',
          storage_path: uploadData.path,
          file_size: file.size,
          investor_id: selectedInvestorId,
          description: null
        }])

      if (dbError) throw dbError

      await fetchDocuments(selectedInvestorId)
      alert('Document téléchargé avec succès!')
    } catch (error: any) {
      alert('Erreur lors du téléchargement: ' + error.message)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleDownloadDocument = async (storagePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .download(storagePath)

      if (error) throw error

      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      a.click()
      URL.revokeObjectURL(url)
    } catch (error: any) {
      alert('Erreur lors du téléchargement: ' + error.message)
    }
  }

  const handleDeleteDocument = async (documentId: string, storagePath: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) return

    try {
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([storagePath])

      if (storageError) throw storageError

      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId)

      if (dbError) throw dbError

      if (selectedInvestorId) {
        await fetchDocuments(selectedInvestorId)
      }
      alert('Document supprimé avec succès!')
    } catch (error: any) {
      alert('Erreur lors de la suppression: ' + error.message)
    }
  }

  const resetInvestorForm = () => {
    setInvestorFormData({
      user_id: '',
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      username: '',
      password: '',
      action_class: 'A',
      total_shares: 0,
      share_value: shareSettings?.nominal_share_value || 1000,
      total_invested: 0,
      current_value: 0,
      percentage_ownership: 0,
      investment_type: 'capital',
      status: 'actif',
      join_date: new Date().toISOString().split('T')[0],
      can_vote: true,
      access_level: 'investisseur',
      permissions: {
        dashboard: true,
        projet: false,
        administration: false
      }
    })
    setShowAddInvestorForm(false)
    setEditingInvestorId(null)
  }

  const handleToggleAddInvestor = () => {
    if (!showAddInvestorForm) {
      // Ouverture du formulaire : réinitialiser les champs
      resetInvestorForm()
      setShowAddInvestorForm(true)
    } else {
      // Fermeture du formulaire
      setShowAddInvestorForm(false)
      setEditingInvestorId(null)
    }
  }

  // ==========================================
  // TRANSACTION HANDLERS
  // ==========================================

  const handleTransactionSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setUploadingAttachment(true)

      const uploadPendingFiles = async (transactionId: string) => {
        for (const file of pendingFiles) {
          const timestamp = Date.now()
          const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
          const storagePath = `${transactionId}/${timestamp}-${cleanFileName}`
          const { error: uploadError } = await supabase.storage
            .from('transaction-documents')
            .upload(storagePath, file, { cacheControl: '3600', upsert: false })
          if (!uploadError) {
            await supabase.from('transaction_attachments').insert([{
              transaction_id: transactionId,
              file_name: file.name,
              file_size: file.size,
              file_type: file.type || 'application/octet-stream',
              storage_path: storagePath
            }])
          }
        }
      }

      // Convertir toutes les valeurs numériques en nombres
      // Les champs frontend-only (occurrence_type, recurrence_*) sont supprimés par destructuration
      // pour éviter que Supabase JS les inclue dans la liste "columns" et cause un 400
      const {
        occurrence_type: _ot,
        recurrence_frequency: _rf,
        recurrence_end_date: _red,
        recurrence_no_end: _rne,
        ...formBase
      } = transactionFormData

      const dataToSubmit = {
        ...formBase,
        amount: typeof formBase.amount === 'string' ? parseFloat(formBase.amount) || 0 : formBase.amount,
        source_amount: typeof formBase.source_amount === 'string' ? (formBase.source_amount ? parseFloat(formBase.source_amount) : null) : formBase.source_amount,
        exchange_rate: typeof formBase.exchange_rate === 'string' ? parseFloat(formBase.exchange_rate) || 1 : formBase.exchange_rate,
        bank_fees: typeof formBase.bank_fees === 'string' ? parseFloat(formBase.bank_fees) || 0 : formBase.bank_fees,
        foreign_tax_paid: typeof formBase.foreign_tax_paid === 'string' ? parseFloat(formBase.foreign_tax_paid) || 0 : formBase.foreign_tax_paid,
        foreign_tax_rate: typeof formBase.foreign_tax_rate === 'string' ? parseFloat(formBase.foreign_tax_rate) || 0 : formBase.foreign_tax_rate,
        investor_id: formBase.investor_id || undefined,
        property_id: formBase.property_id || undefined,
        payment_schedule_id: formBase.payment_schedule_id || undefined,
        // Tax jurisdiction fields (migration 193)
        tax_country: formBase.tax_country || null,
        tax_state_province: formBase.tax_state_province || null,
        rental_type: formBase.rental_type || null,
        owner_fiscal_status: formBase.owner_fiscal_status || null,
        is_furnished: !!formBase.is_furnished,
        is_confotur: !!formBase.is_confotur,
        sales_tax_amount: formBase.sales_tax_amount ?? null,
        state_income_tax_amt: formBase.state_income_tax_amt ?? null,
        federal_withholding: formBase.federal_withholding ?? null,
      }

      if (editingTransactionId) {
        const result = await updateTransaction(editingTransactionId, dataToSubmit)
        if (result.success) {
          setEditingTransactionId(null)
          setShowAddTransactionForm(false)
          resetTransactionForm()
          alert('✅ Transaction modifiée avec succès!')
        } else {
          alert('Erreur lors de la modification: ' + result.error)
        }
      } else if (
        transactionFormData.type === 'paiement' &&
        transactionFormData.occurrence_type === 'récurrent' &&
        transactionFormData.recurrence_frequency
      ) {
        const startDate = new Date(transactionFormData.date)
        const endDate = transactionFormData.recurrence_no_end || !transactionFormData.recurrence_end_date
          ? null
          : new Date(transactionFormData.recurrence_end_date)

        const dates: string[] = []
        let cur = new Date(startDate)

        const advance = (d: Date) => {
          switch (transactionFormData.recurrence_frequency) {
            case 'quotidien':    d.setDate(d.getDate() + 1); break
            case 'hebdomadaire': d.setDate(d.getDate() + 7); break
            case 'mensuel':      d.setMonth(d.getMonth() + 1); break
            case 'trimestriel':  d.setMonth(d.getMonth() + 3); break
            case 'annuel':       d.setFullYear(d.getFullYear() + 1); break
          }
        }

        while (!endDate || cur <= endDate) {
          dates.push(cur.toISOString().split('T')[0])
          advance(cur)
          if (!endDate && dates.length >= 120) break
        }

        let errors = 0
        for (const d of dates) {
          const res = await addTransaction({ ...dataToSubmit, date: d })
          if (!res.success) errors++
        }
        if (errors > 0) {
          alert(`⚠️ ${errors} transaction(s) n'ont pas pu être créées.`)
        } else {
          alert(`✅ ${dates.length} transactions récurrentes créées.`)
        }
        setShowAddTransactionForm(false)
        resetTransactionForm()
      } else {
        const result = await addTransaction(dataToSubmit)
        if (result.success) {
          if (pendingFiles.length > 0 && result.data?.id) {
            await uploadPendingFiles(result.data.id)
          }
          // Link gmail invoice if selected
          if (linkedGmailId) {
            await supabase.from('gmail_invoices')
              .update({ cerdia_company: linkedGmailCompany, synced_at: new Date().toISOString() })
              .eq('id', linkedGmailId)
            setLinkedGmailId('')
          }
          setShowAddTransactionForm(false)
          resetTransactionForm()
        } else {
          alert("Erreur lors de l'ajout: " + result.error)
        }
      }
    } catch (error: any) {
      console.error('❌ Error in handleTransactionSubmit:', error)
      alert('Erreur: ' + error.message)
    } finally {
      setUploadingAttachment(false)
    }
  }

  const handleEditTransaction = (transaction: any) => {
    setEditingTransactionId(transaction.id)
    setTxDirection(txDirFromType(transaction.type ?? 'investissement'))
    setTransactionFormData({
      date: transaction.date.split('T')[0],
      type: transaction.type,
      amount: transaction.amount,
      description: transaction.description,
      investor_id: transaction.investor_id,
      property_id: transaction.property_id,
      payment_schedule_id: transaction.payment_schedule_id || null,
      payment_completion_status: transaction.payment_completion_status || null,
      category: transaction.category,
      payment_method: transaction.payment_method,
      reference_number: transaction.reference_number || '',
      status: transaction.status,
      // NEW: Payment source fields
      payment_source: transaction.payment_source || 'compte_courant',
      investor_payment_type: transaction.investor_payment_type || undefined,
      affects_compte_courant: transaction.affects_compte_courant !== undefined ? transaction.affects_compte_courant : true,
      // International tax fields
      source_currency: transaction.source_currency || 'CAD',
      source_amount: transaction.source_amount || null,
      exchange_rate: transaction.exchange_rate || 1.0,
      source_country: transaction.source_country || null,
      bank_fees: transaction.bank_fees || 0,
      foreign_tax_paid: transaction.foreign_tax_paid || 0,
      foreign_tax_rate: transaction.foreign_tax_rate || 0,
      tax_credit_claimable: transaction.tax_credit_claimable || 0,
      fiscal_category: transaction.fiscal_category || null,
      vendor_name: transaction.vendor_name || null,
      accountant_notes: transaction.accountant_notes || null,
      attachment_name: transaction.attachment_name || null,
      attachment_url: transaction.attachment_url || null,
      attachment_storage_path: transaction.attachment_storage_path || null,
      attachment_mime_type: transaction.attachment_mime_type || null,
      attachment_size: transaction.attachment_size || null,
      attachment_uploaded_at: transaction.attachment_uploaded_at || null,
      target_account: transaction.target_account || null,
      transfer_source: transaction.transfer_source || null,
      occurrence_type: 'unique',
      recurrence_frequency: null,
      recurrence_end_date: null,
      recurrence_no_end: false,
      tax_country: (transaction as any).tax_country || null,
      tax_state_province: (transaction as any).tax_state_province || null,
      rental_type: (transaction as any).rental_type || null,
      owner_fiscal_status: (transaction as any).owner_fiscal_status || null,
      is_furnished: (transaction as any).is_furnished || false,
      is_confotur: false,
      sales_tax_amount: null,
      state_income_tax_amt: null,
      federal_withholding: null,
    })
    setShowAddTransactionForm(true)
  }

  const handleDeleteTransaction = async (id: string, description: string) => {
    if (confirm(`Êtes-vous sûr de vouloir supprimer la transaction "${description}" ?`)) {
      const result = await deleteTransaction(id)
      if (!result.success) {
        alert('Erreur lors de la suppression: ' + result.error)
      }
    }
  }

  const TX_REVENU_TYPES  = ['investissement', 'loyer', 'loyer_locatif', 'revenu', 'dividende']
  const TX_DEPENSE_TYPES = ['paiement', 'depense', 'capex', 'maintenance', 'admin', 'remboursement_investisseur']

  // ─── Tax jurisdiction: charger les taux depuis la DB ────────────────
  const loadTaxRatesForJurisdiction = async (country: string, stateProvince?: string | null) => {
    if (!country || country === 'OTHER') { setTaxRates([]); setTaxBreakdown(null); return }
    const query = supabase
      .from('tax_jurisdiction_rates')
      .select('*')
      .eq('country_code', country)
      .is('organization_id', null)   // taux globaux uniquement
    const { data } = await query
    setTaxRates(data || [])
  }

  const computeTaxBreakdown = (
    rates: any[], form: TransactionFormData, gross: number
  ) => {
    if (!form.tax_country || form.tax_country === 'OTHER' || gross <= 0) {
      setTaxBreakdown(null); return
    }
    const isNR = form.owner_fiscal_status !== 'resident'
    const isShortTerm = form.rental_type === 'short_term'
    const isFurnished = !!form.is_furnished
    const isConfotur = !!form.is_confotur

    const federalRate = rates.find(r => r.jurisdiction_level === 'federal')
    const stateRate = rates.find(r =>
      r.jurisdiction_code === (form.tax_state_province || '') &&
      (r.jurisdiction_level === 'state' || r.jurisdiction_level === 'province')
    )

    let salesTax = 0; let salesLabel = ''
    let stateTax = 0; let stateLabel = ''
    let federalWithholding = 0; let federalLabel = ''

    // Taxe de vente / TVA / ITBIS / IVA
    if (isShortTerm && !isConfotur) {
      if (stateRate?.sales_tax_rate > 0) {
        salesTax += gross * stateRate.sales_tax_rate / 100
        salesLabel = `Taxe de vente ${stateRate.jurisdiction_name} ${stateRate.sales_tax_rate}%`
      }
      if (federalRate?.vat_rate > 0) {
        const vatApplies = (form.tax_country === 'DO') ||
          (form.tax_country === 'MX' && isFurnished) ||
          (form.tax_country === 'CA' && federalRate.vat_applies_short_term)
        if (vatApplies) {
          salesTax += gross * federalRate.vat_rate / 100
          salesLabel += (salesLabel ? ' + ' : '') +
            `TVA/ITBIS/IVA ${federalRate.vat_rate}%`
        }
      }
    }

    // Impôt État/Province
    if (isNR && stateRate?.income_tax_rate) {
      stateTax = gross * stateRate.income_tax_rate / 100
      stateLabel = `Impôt ${stateRate.jurisdiction_name} ${stateRate.income_tax_rate}% (NR)`
    }

    // Retenue fédérale NR
    if (isNR && federalRate?.withholding_rate_nr > 0 && !isConfotur) {
      federalWithholding = gross * federalRate.withholding_rate_nr / 100
      federalLabel = `Retenue fédérale ${federalRate.withholding_rate_nr}% (NR)`
    }

    const filing = stateRate?.filing_deadline_note || federalRate?.filing_deadline_note || ''

    setTaxBreakdown({
      salesTax, stateTax, federalWithholding,
      total: salesTax + stateTax + federalWithholding,
      salesLabel: salesLabel || (salesTax > 0 ? 'Taxe de vente' : ''),
      stateLabel: stateLabel || (stateTax > 0 ? 'Impôt État/Province' : ''),
      federalLabel: federalLabel || (federalWithholding > 0 ? 'Retenue fédérale' : ''),
      filingNote: filing,
      isConfoturExempt: isConfotur && form.tax_country === 'DO',
    })

    // Mettre à jour les champs de formulaire (pour enregistrement)
    setTransactionFormData(prev => ({
      ...prev,
      sales_tax_amount: salesTax || null,
      state_income_tax_amt: stateTax || null,
      federal_withholding: federalWithholding || null,
    }))
  }

  // Recharger les taux quand le pays ou la juridiction change
  useEffect(() => {
    loadTaxRatesForJurisdiction(
      transactionFormData.tax_country || '',
      transactionFormData.tax_state_province
    )
  }, [transactionFormData.tax_country, transactionFormData.tax_state_province])

  // Recalculer la ventilation quand un paramètre fiscal change
  useEffect(() => {
    const gross = typeof transactionFormData.amount === 'number'
      ? transactionFormData.amount
      : parseFloat(transactionFormData.amount as any) || 0
    computeTaxBreakdown(taxRates, transactionFormData, gross)
  }, [
    taxRates,
    transactionFormData.amount,
    transactionFormData.rental_type,
    transactionFormData.owner_fiscal_status,
    transactionFormData.is_furnished,
    transactionFormData.is_confotur,
    transactionFormData.tax_state_province,
  ])
  // ────────────────────────────────────────────────────────────────────

  const txDirFromType = (type: string): 'revenu' | 'depense' | 'neutre' => {
    if (TX_REVENU_TYPES.includes(type))  return 'revenu'
    if (type === 'transfert')             return 'neutre'
    return 'depense'
  }

  const switchTxDirection = (d: 'revenu' | 'depense' | 'neutre') => {
    setTxDirection(d)
    const defaultType = d === 'revenu' ? 'investissement' : d === 'depense' ? 'paiement' : 'transfert'
    setTransactionFormData(prev => ({
      ...prev,
      type: defaultType,
      fiscal_category: null,
      target_account: null,
      transfer_source: null,
      occurrence_type: 'unique',
      recurrence_frequency: null,
      recurrence_end_date: null,
      recurrence_no_end: false,
    }))
  }

  const resetTransactionForm = () => {
    setTxDirection('revenu')
    setTransactionFormData({
      date: new Date().toISOString().split('T')[0],
      type: 'investissement',
      amount: 0,
      description: '',
      investor_id: null,
      property_id: null,
      payment_schedule_id: null,
      payment_completion_status: null,
      category: 'projet', // Changed from 'capital' to 'projet'
      payment_method: 'virement',
      reference_number: '',
      status: 'complete',
      // NEW: Payment source fields
      payment_source: 'compte_courant',
      investor_payment_type: undefined,
      affects_compte_courant: true,
      // International tax fields defaults
      source_currency: 'CAD',
      source_amount: null,
      exchange_rate: 1.0,
      source_country: null,
      bank_fees: 0,
      foreign_tax_paid: 0,
      foreign_tax_rate: 0,
      tax_credit_claimable: 0,
      fiscal_category: null,
      vendor_name: null,
      accountant_notes: null,
      attachment_name: null,
      attachment_url: null,
      attachment_storage_path: null,
      attachment_mime_type: null,
      attachment_size: null,
      attachment_uploaded_at: null,
      target_account: null,
      transfer_source: null,
      occurrence_type: 'unique',
      recurrence_frequency: null,
      recurrence_end_date: null,
      recurrence_no_end: false
    })
    setPendingFiles([])
    setShowAddTransactionForm(false)
    setEditingTransactionId(null)
  }

  // ==========================================
  // UTILITY FUNCTIONS
  // ==========================================

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      actif: { bg: 'bg-green-100', text: 'text-green-800', label: 'Actif' },
      inactif: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Inactif' },
      suspendu: { bg: 'bg-red-100', text: 'text-red-800', label: 'Suspendu' }
    }
    const badge = badges[status] || badges.actif
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    )
  }

  const getTypeIcon = (type: string) => {
    if (TX_REVENU_TYPES.includes(type)) return <TrendingUp className="text-green-600" size={20} />
    if (type === 'transfert') return <ArrowLeftRight className="text-indigo-600" size={20} />
    return <TrendingDown className="text-red-600" size={20} />
  }

  const getTypeBadge = (type: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      investissement: { bg: 'bg-green-100', text: 'text-green-800', label: fr ? 'Investissement' : 'Investment' },
      paiement: { bg: 'bg-blue-100', text: 'text-blue-800', label: fr ? 'Paiement' : 'Payment' },
      dividende: { bg: 'bg-purple-100', text: 'text-purple-800', label: fr ? 'Dividende' : 'Dividend' },
      depense: { bg: 'bg-red-100', text: 'text-red-800', label: fr ? 'Depense' : 'Expense' },
      loyer: { bg: 'bg-emerald-100', text: 'text-emerald-800', label: fr ? 'Loyer' : 'Rent' },
      loyer_locatif: { bg: 'bg-teal-100', text: 'text-teal-800', label: fr ? 'Revenu locatif' : 'Rental income' },
      revenu: { bg: 'bg-cyan-100', text: 'text-cyan-800', label: fr ? 'Revenu' : 'Revenue' },
      transfert: { bg: 'bg-indigo-100', text: 'text-indigo-800', label: fr ? 'Transfert' : 'Transfer' },
      capex: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'CAPEX' },
      maintenance: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Maintenance' },
      admin: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Admin' },
      remboursement_investisseur: { bg: 'bg-pink-100', text: 'text-pink-800', label: fr ? 'Remboursement' : 'Reimbursement' }
    }
    const badge = badges[type] || { bg: 'bg-gray-100', text: 'text-gray-700', label: type }
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    )
  }

  // Années disponibles dérivées des transactions existantes
  const availableYears = Array.from(new Set(
    (transactions || [])
      .filter(t => t && t.date)
      .map(t => new Date(t.date).getFullYear())
  )).sort((a, b) => b - a)

  // Filtrer les transactions (exclure cancelled pour cohérence avec SQL)
  const filteredTransactions = (transactions || []).filter(t => {
    if (!t) return false
    if (t.status === 'cancelled') return false
    if (filterType !== 'all' && t.type !== filterType) return false
    if (filterCategory !== 'all' && t.category !== filterCategory) return false
    if (filterYear !== 'all' && new Date(t.date).getFullYear().toString() !== filterYear) return false
    return true
  })

  const isFiltered = filterType !== 'all' || filterCategory !== 'all' || filterYear !== 'all'

  // Calculs statistiques pour transactions (avec vérifications de sécurité)
  const totalIn = filteredTransactions
    .filter(t => t && t.type && ['investissement', 'loyer', 'loyer_locatif', 'revenu', 'dividende'].includes(t.type))
    .reduce((sum, t) => sum + Math.abs(t.amount || 0), 0)

  const totalOut = filteredTransactions
    .filter(t => t && t.type && ['achat_propriete', 'capex', 'maintenance', 'admin', 'depense', 'remboursement_investisseur', 'paiement'].includes(t.type))
    .reduce((sum, t) => sum + Math.abs(t.amount || 0), 0)

  const balance = totalIn - totalOut

  // ==========================================
  // EXPORT FICHE INVESTISSEUR PDF
  // ==========================================

  const exportInvestorPDF = async (investor: any) => {
    setExportingInvestorId(investor.id)
    try {
      const jsPDF = (await import('jspdf')).default
      const autoTable = (await import('jspdf-autotable')).default

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

      // ── Helpers ──────────────────────────────────────────────────────────────
      const safeNum = (n: number) =>
        Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
      const fmtCAD = (n: number | null | undefined) =>
        n == null ? '-' : safeNum(n) + ' $ CAD'
      const fmtPct = (n: number | null | undefined) =>
        n == null ? '-' : `${n >= 0 ? '+' : ''}${Number(n).toFixed(2)}%`
      const fmtDate = (d: string | null | undefined) =>
        d ? new Date(d).toLocaleDateString('fr-CA', { year: 'numeric', month: 'long', day: 'numeric' }) : '-'

      const loadBase64 = async (url: string) => {
        try {
          const blob = await (await fetch(url)).blob()
          return await new Promise<string>((res, rej) => {
            const r = new FileReader(); r.onloadend = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(blob)
          })
        } catch { return '' }
      }
      const getLogoSize = (b64: string, maxH: number) => new Promise<{ w: number; h: number }>(resolve => {
        const img = new Image()
        img.onload = () => { const ratio = img.naturalHeight / (img.naturalWidth || 1); resolve({ w: maxH / ratio, h: maxH }) }
        img.onerror = () => resolve({ w: maxH * 3, h: maxH })
        img.src = b64
      })

      const logo = await loadBase64('/logo-cerdia3.png')
      const today = new Date().toLocaleDateString('fr-CA', { year: 'numeric', month: 'long', day: 'numeric' })

      const addHeader = async (pageDoc: typeof doc, subtitle: string) => {
        if (logo) {
          try { const { w, h } = await getLogoSize(logo, 12); pageDoc.addImage(logo, 'PNG', 15, 8, w, h) } catch {}
        }
        pageDoc.setFontSize(16); pageDoc.setTextColor(94, 94, 94)
        pageDoc.text('Fiche Investisseur', 200, 14, { align: 'right' })
        pageDoc.setFontSize(9); pageDoc.setTextColor(130, 130, 130)
        pageDoc.text(subtitle, 200, 21, { align: 'right' })
        pageDoc.setDrawColor(94, 94, 94); pageDoc.setLineWidth(0.5)
        pageDoc.line(15, 26, 195, 26)
        return 33
      }

      const fullName = `${investor.first_name} ${investor.last_name}`
      let y = await addHeader(doc, `${fullName} — ${today}`)

      // ── Données résumé ───────────────────────────────────────────────────────
      const summary = investorSummaries.find((s: any) => s.investor_id === investor.id)
      const investments = (investorInvestments || []).filter((i: any) => i.investor_id === investor.id)
        .sort((a: any, b: any) => new Date(b.investment_date).getTime() - new Date(a.investment_date).getTime())

      const entitled = entitledDays(investor.percentage_ownership ?? 0)
      const remaining = remainingDays(investor.id, investor.percentage_ownership ?? 0)
      const used = entitled - remaining
      const usedPct = entitled > 0 ? Math.round((used / entitled) * 100) : 0

      const statusLabel: Record<string, string> = {
        actif: 'Actif', inactif: 'Inactif', suspendu: 'Suspendu', en_attente: 'En attente'
      }
      const accessLabel = investor.access_level === 'admin' ? 'Administrateur' : 'Investisseur'

      // ═══════════════════════════════════════════════════════════════════════
      // 1. INFORMATIONS PERSONNELLES
      // ═══════════════════════════════════════════════════════════════════════
      doc.setFontSize(11); doc.setTextColor(60, 60, 60)
      doc.text('Informations personnelles', 15, y); y += 5

      autoTable(doc, {
        startY: y,
        body: [
          ['Nom complet', fullName, 'Identifiant', `@${investor.username}`],
          ['Courriel', investor.email || '-', 'Telephone', investor.phone || '-'],
          ['Date adhesion', fmtDate(investor.join_date), 'Statut', statusLabel[investor.status] || investor.status],
          ["Type d'investissement", investor.investment_type || '-', 'Niveau acces', accessLabel],
          ['Classe action', investor.action_class || '-', 'Droit de vote', investor.can_vote ? 'Oui' : 'Non'],
        ],
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: {
          0: { cellWidth: 45, fontStyle: 'bold', fillColor: [245, 245, 245] },
          1: { cellWidth: 55 },
          2: { cellWidth: 45, fontStyle: 'bold', fillColor: [245, 245, 245] },
          3: { cellWidth: 40 },
        },
      })
      y = (doc as any).lastAutoTable.finalY + 8

      // ═══════════════════════════════════════════════════════════════════════
      // 2. KPIs FINANCIERS
      // ═══════════════════════════════════════════════════════════════════════
      doc.setFontSize(11); doc.setTextColor(60, 60, 60)
      doc.text('Indicateurs financiers', 15, y); y += 5

      const roi = summary?.roi_percentage ?? null
      autoTable(doc, {
        startY: y,
        head: [['Total investi', 'Valeur actuelle', 'Nombre de parts', 'ROI', 'Propriete (%)']],
        body: [[
          fmtCAD(summary?.total_amount_invested),
          fmtCAD(summary?.current_value),
          summary?.total_shares != null ? Number(summary.total_shares).toFixed(4) : '-',
          fmtPct(roi),
          `${Number(investor.percentage_ownership ?? 0).toFixed(4)}%`,
        ]],
        theme: 'grid',
        headStyles: { fillColor: [94, 94, 94], textColor: 255, fontStyle: 'bold', fontSize: 9 },
        bodyStyles: { fontSize: 10, cellPadding: 4, halign: 'center' },
      })
      y = (doc as any).lastAutoTable.finalY + 8

      // ═══════════════════════════════════════════════════════════════════════
      // 3. JOURS PROPRIETAIRE
      // ═══════════════════════════════════════════════════════════════════════
      if (totalProjectDays > 0) {
        doc.setFontSize(11); doc.setTextColor(60, 60, 60)
        doc.text('Jours proprietaire', 15, y); y += 5

        autoTable(doc, {
          startY: y,
          head: [['Jours attribues', 'Jours utilises', 'Jours restants', 'Taux utilisation']],
          body: [[
            `${entitled} jours`,
            `${used} jours`,
            `${remaining} jours`,
            `${usedPct}%`,
          ]],
          theme: 'grid',
          headStyles: { fillColor: [94, 94, 94], textColor: 255, fontStyle: 'bold', fontSize: 9 },
          bodyStyles: { fontSize: 10, cellPadding: 4, halign: 'center' },
        })
        y = (doc as any).lastAutoTable.finalY + 8
      }

      // ═══════════════════════════════════════════════════════════════════════
      // 4. HISTORIQUE DES INVESTISSEMENTS (nouvelle page si nécessaire)
      // ═══════════════════════════════════════════════════════════════════════
      if (investments.length > 0) {
        if (y > 210) { doc.addPage(); y = await addHeader(doc, `${fullName} — Historique des investissements`) }
        else {
          doc.setFontSize(11); doc.setTextColor(60, 60, 60)
          doc.text(`Historique des investissements (${investments.length})`, 15, y); y += 5
        }

        const investRows = investments.map((inv: any) => [
          fmtDate(inv.investment_date),
          fmtCAD(inv.amount_invested),
          `${Number(inv.share_price_at_purchase ?? 0).toFixed(4)} $`,
          Number(inv.number_of_shares ?? 0).toFixed(4),
          inv.payment_method || '-',
          inv.reference_number || '-',
          inv.notes || '-',
        ])

        autoTable(doc, {
          startY: y,
          head: [['Date', 'Montant', 'Prix / part', 'Nb parts', 'Mode paiement', 'Reference', 'Notes']],
          body: investRows,
          theme: 'striped',
          headStyles: { fillColor: [94, 94, 94], textColor: 255, fontStyle: 'bold', fontSize: 8 },
          bodyStyles: { fontSize: 8, cellPadding: 2.5 },
          columnStyles: {
            0: { cellWidth: 26 },
            1: { cellWidth: 28, halign: 'right' },
            2: { cellWidth: 22, halign: 'right' },
            3: { cellWidth: 18, halign: 'right' },
            4: { cellWidth: 28 },
            5: { cellWidth: 28 },
            6: { cellWidth: 35 },
          },
        })
      }

      // ── Pied de page ─────────────────────────────────────────────────────────
      const pageCount = doc.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.3)
        doc.line(15, 280, 195, 280)
        doc.setFontSize(8); doc.setTextColor(130, 130, 130)
        doc.text('CERDIA — Document confidentiel', 105, 285, { align: 'center' })
        doc.text(`Page ${i} sur ${pageCount}`, 105, 290, { align: 'center' })
        doc.text(`Genere le ${today}`, 200, 290, { align: 'right' })
      }

      const safeName = fullName.replace(/[^a-zA-Z0-9]/g, '_')
      doc.save(`fiche_investisseur_${safeName}_${new Date().toISOString().split('T')[0]}.pdf`)
    } catch (err: any) {
      alert('Erreur lors de la generation du PDF: ' + err.message)
    } finally {
      setExportingInvestorId(null)
    }
  }

  // ==========================================
  // SUB-TAB CONTENT RENDERERS
  // ==========================================

  const renderInvestisseursTab = () => (
    <div className="space-y-4 sm:space-y-6 max-w-full overflow-x-hidden px-1 sm:px-0">
      {/* Share Values Header */}
      <div className="bg-gradient-to-r from-[#5e5e5e] to-[#3e3e3e] rounded-lg p-4 sm:p-6 shadow-lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          {/* Nominal Share Value - Editable */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <DollarSign className="text-white" size={20} />
                <h3 className="text-sm font-medium text-white/90">Valeur Nominale (Prix de vente)</h3>
              </div>
              {!editingNominalValue && (
                <button
                  onClick={handleStartEditNominalValue}
                  className="text-white/80 hover:text-white transition-colors"
                  title={fr ? 'Modifier la valeur nominale' : 'Edit nominal value'}
                >
                  <Edit2 size={16} />
                </button>
              )}
            </div>
            {editingNominalValue ? (
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={nominalValueInput}
                  onChange={(e) => setNominalValueInput(e.target.value)}
                  className="flex-1 px-3 py-2 bg-white rounded-lg text-gray-900 focus:ring-2 focus:ring-white/50 focus:outline-none"
                  placeholder="1.00"
                  disabled={savingNominalValue}
                />
                <button
                  onClick={handleSaveNominalValue}
                  disabled={savingNominalValue}
                  className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 text-sm"
                >
                  {savingNominalValue ? 'Sauvegarde...' : 'Sauver'}
                </button>
                <button
                  onClick={handleCancelNominalValueEdit}
                  disabled={savingNominalValue}
                  className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <p className="text-2xl sm:text-3xl font-bold text-white">
                {(shareSettings?.nominal_share_value ?? 1).toFixed(2)} CAD
              </p>
            )}
            <p className="text-xs text-white/70 mt-1">Par part</p>
          </div>

          {/* NAV actuel — source: get_nav_timeline() */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="text-white" size={20} />
              <h3 className="text-sm font-medium text-white/90">NAV / Part (Valeur actuelle)</h3>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-white">
              {navCurrent ? (navCurrent.nav_per_share ?? 1).toFixed(4) : '1.0000'} CAD
            </p>
            <p className="text-xs text-white/70 mt-1">Source: get_nav_timeline()</p>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 break-words">{t('investors.title')}</h2>
          <p className="text-xs sm:text-sm md:text-base text-gray-600 mt-1 break-words">{t('investors.subtitle')}</p>
        </div>
        <button
          onClick={handleToggleAddInvestor}
          className="flex items-center gap-2 bg-[#5e5e5e] hover:bg-[#3e3e3e] text-white px-3 sm:px-4 py-2 rounded-full transition-colors w-full sm:w-auto justify-center flex-shrink-0 text-sm sm:text-base"
        >
          {showAddInvestorForm ? <X size={18} className="sm:w-5 sm:h-5" /> : <Plus size={18} className="sm:w-5 sm:h-5" />}
          {showAddInvestorForm ? t('common.cancel') : t('investors.add')}
        </button>
      </div>

      {/* Add/Edit Investor Form */}
      {showAddInvestorForm && (
        <div ref={investorFormRef} className="bg-white p-3 sm:p-4 md:p-6 rounded-lg shadow-md border border-gray-200 max-w-full overflow-hidden">
          <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 break-words">
            {editingInvestorId ? t('investors.edit') : t('investors.new')}
          </h3>
          <form onSubmit={handleInvestorSubmit} className="space-y-3 sm:space-y-4 max-w-full">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 max-w-full">
              {/* Informations personnelles */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('investors.firstName')} *</label>
                <input
                  type="text"
                  value={investorFormData.first_name}
                  onChange={(e) => setInvestorFormData({ ...investorFormData, first_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('investors.lastName')} *</label>
                <input
                  type="text"
                  value={investorFormData.last_name}
                  onChange={(e) => setInvestorFormData({ ...investorFormData, last_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('investors.email')} *</label>
                <input
                  type="email"
                  value={investorFormData.email}
                  onChange={(e) => setInvestorFormData({ ...investorFormData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('investors.phone')}</label>
                <input
                  type="tel"
                  value={investorFormData.phone}
                  onChange={(e) => setInvestorFormData({ ...investorFormData, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('investors.username')} *</label>
                <input
                  type="text"
                  value={investorFormData.username}
                  onChange={(e) => setInvestorFormData({ ...investorFormData, username: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                  required
                />
              </div>

              {/* Mot de passe généré automatiquement */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('investors.password')} {!editingInvestorId && '*'}
                  <span className="text-xs text-gray-500 ml-2">
                    ({t('investors.passwordFormat')})
                  </span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={investorFormData.password}
                    onChange={(e) => setInvestorFormData({ ...investorFormData, password: e.target.value })}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent font-mono"
                    placeholder={t('investors.passwordPlaceholder')}
                    required={!editingInvestorId}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (investorFormData.first_name && investorFormData.last_name) {
                        const generatedPassword = generatePassword(investorFormData.first_name, investorFormData.last_name)
                        setInvestorFormData({ ...investorFormData, password: generatedPassword })
                      } else {
                        alert(t('investors.fillFirstLastName'))
                      }
                    }}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors whitespace-nowrap"
                  >
                    {t('investors.generate')}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  ℹ️ {editingInvestorId ? t('investors.passwordHintReset') : t('investors.passwordHintWillCreateAuth')}
                </p>
              </div>

              {/* Informations d'investissement */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('investors.totalShares')}
                  <span className="text-xs text-gray-500 ml-2">({t('investors.calculatedFromTx')})</span>
                </label>
                <input
                  type="number"
                  value={investorFormData.total_shares}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                  min="0"
                  step="1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  ℹ️ {t('investors.calculatedFromTx')}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('investors.shareValue')} (CAD $)
                  <span className="text-xs text-gray-500 ml-2">({t('investors.calculatedFromNominal')})</span>
                </label>
                <input
                  type="number"
                  value={shareSettings?.nominal_share_value || investorFormData.share_value}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                  min="0"
                  step="0.01"
                />
                <p className="text-xs text-gray-500 mt-1">
                  ℹ️ {t('investors.modifyNominalNote')}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('investors.totalInvested')} (CAD $)
                  <span className="text-xs text-gray-500 ml-2">({t('investors.calculatedFromTx')})</span>
                </label>
                <input
                  type="number"
                  value={investorFormData.total_invested}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                  min="0"
                  step="0.01"
                />
                <p className="text-xs text-gray-500 mt-1">
                  ℹ️ {t('investors.calculatedFromTx')}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('investors.percentOwnership')}
                  <span className="text-xs text-gray-500 ml-2">({t('investors.calculatedAuto')})</span>
                </label>
                <input
                  type="number"
                  value={calculateOwnershipPercentage(investorFormData.total_shares).toFixed(2)}
                  disabled
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                  min="0"
                  max="100"
                  step="0.01"
                />
                <p className="text-xs text-gray-500 mt-1">
                  ℹ️ {t('investors.calculatedFromRatio')}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('investors.investmentType')} *</label>
                <select
                  value={investorFormData.investment_type}
                  onChange={(e) => setInvestorFormData({ ...investorFormData, investment_type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent bg-white"
                  required
                >
                  <option value="part">{t('investors.investmentTypeShare')}</option>
                  <option value="immobilier">{t('investors.investmentTypeRealEstate')}</option>
                  <option value="actions">{t('investors.investmentTypeStocks')}</option>
                  <option value="mixte">{t('investors.investmentTypeMixed')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('investors.status')} *</label>
                <select
                  value={investorFormData.status}
                  onChange={(e) => setInvestorFormData({ ...investorFormData, status: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent bg-white"
                  required
                >
                  <option value="actif">{t('status.active')}</option>
                  <option value="inactif">{t('status.inactive')}</option>
                  <option value="suspendu">{t('status.suspended')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('investors.joinDate')} *</label>
                <input
                  type="date"
                  value={investorFormData.join_date}
                  onChange={(e) => setInvestorFormData({ ...investorFormData, join_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('investors.accessLevel')} *</label>
                <select
                  value={investorFormData.access_level}
                  onChange={(e) => setInvestorFormData({ ...investorFormData, access_level: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent bg-white"
                  required
                >
                  <option value="investisseur">{t('investors.accessLevelInvestor')}</option>
                  <option value="admin">{t('investors.accessLevelAdmin')}</option>
                </select>
              </div>
            </div>

            {/* Permissions */}
            <div className="pt-4 border-t border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-3">Permissions</label>
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={investorFormData.permissions.dashboard}
                    onChange={(e) => setInvestorFormData({
                      ...investorFormData,
                      permissions: { ...investorFormData.permissions, dashboard: e.target.checked }
                    })}
                    className="w-4 h-4 text-[#5e5e5e] focus:ring-[#5e5e5e] rounded"
                  />
                  <span className="text-sm text-gray-700">Dashboard</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={investorFormData.permissions.projet}
                    onChange={(e) => setInvestorFormData({
                      ...investorFormData,
                      permissions: { ...investorFormData.permissions, projet: e.target.checked }
                    })}
                    className="w-4 h-4 text-[#5e5e5e] focus:ring-[#5e5e5e] rounded"
                  />
                  <span className="text-sm text-gray-700">{t('investors.permissionProjet')}</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={investorFormData.permissions.administration}
                    onChange={(e) => setInvestorFormData({
                      ...investorFormData,
                      permissions: { ...investorFormData.permissions, administration: e.target.checked }
                    })}
                    className="w-4 h-4 text-[#5e5e5e] focus:ring-[#5e5e5e] rounded"
                  />
                  <span className="text-sm text-gray-700">{t('investors.permissionAdministration')}</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={investorFormData.can_vote}
                    onChange={(e) => setInvestorFormData({
                      ...investorFormData,
                      can_vote: e.target.checked
                    })}
                    className="w-4 h-4 text-[#5e5e5e] focus:ring-[#5e5e5e] rounded"
                  />
                  <span className="text-sm text-gray-700">{t('investors.votingRights')}</span>
                </label>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto bg-[#5e5e5e] hover:bg-[#3e3e3e] text-white px-6 py-2 rounded-full transition-colors disabled:opacity-50"
              >
                {loading ? t('common.saving') : editingInvestorId ? t('common.edit') : t('common.add')}
              </button>
              <button
                type="button"
                onClick={resetInvestorForm}
                className="w-full sm:w-auto bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-2 rounded-full transition-colors"
              >
                {t('common.cancel')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Investors List */}
      {investors.length === 0 ? (
        <div className="bg-white p-8 sm:p-12 rounded-lg shadow-md text-center">
          <Users size={40} className="sm:w-12 sm:h-12 mx-auto text-gray-400 mb-3 sm:mb-4" />
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">Aucun investisseur</h3>
          <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4">Commencez par ajouter votre premier investisseur</p>
          <button
            onClick={handleToggleAddInvestor}
            className="bg-[#5e5e5e] hover:bg-[#3e3e3e] text-white px-4 sm:px-6 py-2 rounded-full transition-colors text-sm sm:text-base"
          >
            Ajouter un investisseur
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 md:gap-5 max-w-full">
          {investors.map((investor) => {
            // Trouver les données calculées pour cet investisseur
            const summary = investorSummaries.find(s => s.investor_id === investor.id)
            const totalInvested = summary?.total_amount_invested || 0
            const totalShares = summary?.total_shares || 0
            const currentValue = summary?.current_value || 0
            const gainLoss = summary?.gain_loss || 0
            const roiPercentage = summary?.roi_percentage || 0

            return (
            <div key={investor.id} className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow min-w-0 max-w-full flex flex-col">
              {/* Header */}
              <div className="p-3 sm:p-4 md:p-5 border-b border-gray-100">
                <div className="flex items-start justify-between mb-2 sm:mb-3 gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-semibold text-sm sm:text-base flex-shrink-0">
                      {investor.first_name.charAt(0)}{investor.last_name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm sm:text-base md:text-lg font-bold text-gray-900 truncate">{investor.first_name} {investor.last_name}</h3>
                      <p className="text-xs text-gray-600 truncate">@{investor.username}</p>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    {getStatusBadge(investor.status)}
                  </div>
                </div>

                <div className="space-y-1 sm:space-y-1.5 text-xs">
                  <div className="flex items-center text-gray-600 gap-1.5 sm:gap-2">
                    <Mail size={12} className="sm:w-3.5 sm:h-3.5 flex-shrink-0" />
                    <span className="truncate">{investor.email}</span>
                  </div>
                  {investor.phone && (
                    <div className="flex items-center text-gray-600 gap-1.5 sm:gap-2">
                      <Phone size={12} className="sm:w-3.5 sm:h-3.5 flex-shrink-0" />
                      <span className="truncate">{investor.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center text-gray-600 gap-1.5 sm:gap-2">
                    <Calendar size={12} className="sm:w-3.5 sm:h-3.5 flex-shrink-0" />
                    <span className="truncate">Membre depuis {investor.join_date}</span>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="p-3 sm:p-4 md:p-5 space-y-2 sm:space-y-3 flex-1">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1 text-gray-600 text-[10px] sm:text-xs mb-0.5 sm:mb-1">
                      <DollarSign size={11} className="sm:w-3 sm:h-3 flex-shrink-0" />
                      <span className="truncate">Total investi</span>
                    </div>
                    <div className="font-bold text-gray-900 text-xs sm:text-sm md:text-base truncate">
                      {totalInvested.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1 text-gray-600 text-[10px] sm:text-xs mb-0.5 sm:mb-1">
                      <TrendingUp size={11} className="sm:w-3 sm:h-3 flex-shrink-0" />
                      <span className="truncate">Valeur actuelle</span>
                    </div>
                    <div className="font-bold text-green-600 text-xs sm:text-sm md:text-base truncate">
                      {currentValue.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="text-gray-600 text-[10px] sm:text-xs mb-0.5 sm:mb-1 truncate">Parts</div>
                    <div className="font-bold text-gray-900 text-xs sm:text-sm md:text-base truncate">{totalShares.toLocaleString()}</div>
                  </div>
                  <div className="min-w-0">
                    <div className="text-gray-600 text-[10px] sm:text-xs mb-0.5 sm:mb-1 truncate">ROI</div>
                    <div className={`font-bold text-xs sm:text-sm md:text-base truncate ${(roiPercentage ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {(roiPercentage ?? 0) >= 0 ? '+' : ''}{(roiPercentage ?? 0).toFixed(2)}%
                    </div>
                  </div>

                  {/* Jours propriétaire — pleine largeur */}
                  {totalProjectDays > 0 && (() => {
                    const pct = investor.percentage_ownership ?? 0
                    const entitled = entitledDays(pct)
                    const remaining = remainingDays(investor.id, pct)
                    const used = entitled - remaining
                    const usedPct = entitled > 0 ? Math.round((used / entitled) * 100) : 0
                    return (
                      <div className="col-span-2 min-w-0 mt-1">
                        <div className="flex items-center justify-between text-[10px] sm:text-xs text-gray-600 mb-0.5">
                          <span className="flex items-center gap-1">
                            <Calendar size={10} className="flex-shrink-0" />
                            Jours propriétaire {new Date().getFullYear()}
                          </span>
                          <span className={`font-bold text-xs ${remaining <= 0 ? 'text-red-600' : remaining < entitled * 0.25 ? 'text-orange-600' : 'text-green-600'}`}>
                            {remaining} / {entitled} j
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${usedPct > 75 ? 'bg-red-500' : usedPct > 50 ? 'bg-orange-500' : 'bg-green-500'}`}
                            style={{ width: `${Math.min(usedPct, 100)}%` }}
                          />
                        </div>
                      </div>
                    )
                  })()}
                </div>

                <div className="pt-1.5 sm:pt-2 border-t border-gray-100">
                  <div className="text-[10px] sm:text-xs text-gray-600 mb-1 truncate">Type: {investor.investment_type}</div>
                  <div className="text-[10px] sm:text-xs text-gray-500 truncate">
                    Accès: {investor.access_level === 'admin' ? 'Administrateur' : 'Investisseur'}
                  </div>
                </div>

                {/* Investment History Section */}
                <div className="pt-2 sm:pt-3 border-t border-gray-100 mt-2 sm:mt-3">
                  <button
                    onClick={() => setExpandedInvestorHistory(expandedInvestorHistory === investor.id ? null : investor.id)}
                    className="w-full flex items-center justify-between text-xs sm:text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                  >
                    <span>Historique des investissements ({investorInvestments.filter(inv => inv.investor_id === investor.id).length})</span>
                    {expandedInvestorHistory === investor.id ? (
                      <ChevronUp size={16} />
                    ) : (
                      <ChevronDown size={16} />
                    )}
                  </button>

                  {expandedInvestorHistory === investor.id && (
                    <div className="mt-2 space-y-2 max-h-60 overflow-y-auto">
                      {investorInvestments
                        .filter(inv => inv.investor_id === investor.id)
                        .sort((a, b) => new Date(b.investment_date).getTime() - new Date(a.investment_date).getTime())
                        .map((investment) => (
                          <div key={investment.id} className="bg-gray-50 rounded-lg p-2 sm:p-3 text-xs">
                            <div className="flex items-start justify-between mb-1.5">
                              <div className="flex items-center gap-1.5 text-gray-600">
                                <Calendar size={12} />
                                <span className="font-medium">
                                  {new Date(investment.investment_date).toLocaleDateString('fr-CA')}
                                </span>
                              </div>
                              <div className="text-green-600 font-bold">
                                {investment.amount_invested.toLocaleString('fr-CA', { style: 'currency', currency: investment.currency })}
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-[10px] text-gray-600">
                              <div>
                                <span className="font-medium">Prix/part:</span>{' '}
                                {(investment.share_price_at_purchase ?? 0).toFixed(4)} CAD
                              </div>
                              <div>
                                <span className="font-medium">Parts:</span>{' '}
                                {(investment.number_of_shares ?? 0).toFixed(4)}
                              </div>
                              {investment.payment_method && (
                                <div className="col-span-2">
                                  <span className="font-medium">Paiement:</span>{' '}
                                  {investment.payment_method}
                                </div>
                              )}
                              {investment.reference_number && (
                                <div className="col-span-2">
                                  <span className="font-medium">Réf:</span>{' '}
                                  {investment.reference_number}
                                </div>
                              )}
                              {investment.notes && (
                                <div className="col-span-2 mt-1 pt-1 border-t border-gray-200">
                                  <span className="font-medium">Notes:</span>{' '}
                                  <span className="text-gray-500">{investment.notes}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      {investorInvestments.filter(inv => inv.investor_id === investor.id).length === 0 && (
                        <div className="text-center py-4 text-gray-500 text-xs">
                          Aucun investissement enregistré
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Occupation Stats Section */}
                <div className="pt-2 sm:pt-3 border-t border-gray-100 mt-2 sm:mt-3">
                  <button
                    onClick={() => setExpandedOccupationStats(expandedOccupationStats === investor.id ? null : investor.id)}
                    className="w-full flex items-center justify-between text-xs sm:text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                  >
                    <span>{fr ? "Taux d'occupation personnel" : 'Personal occupancy rate'}</span>
                    {expandedOccupationStats === investor.id ? (
                      <ChevronUp size={16} />
                    ) : (
                      <ChevronDown size={16} />
                    )}
                  </button>

                  {expandedOccupationStats === investor.id && (
                    <div className="mt-3">
                      <OccupationStats
                        type="investor"
                        id={investor.id}
                        showDetails={false}
                      />
                    </div>
                  )}
                </div>

                {/* Investor Debts Section */}
                <div className="pt-2 sm:pt-3 border-t border-gray-100 mt-2 sm:mt-3">
                  <InvestorDebts
                    investorId={investor.id}
                    investorName={`${investor.first_name} ${investor.last_name}`}
                  />
                </div>
              </div>

              {/* Footer Actions */}
              <div className="px-3 sm:px-4 md:px-5 py-2 sm:py-2.5 bg-gray-50 border-t border-gray-100 flex flex-row gap-1.5 sm:gap-2">
                <button
                  onClick={() => exportInvestorPDF(investor)}
                  disabled={exportingInvestorId === investor.id}
                  className="flex-1 flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors text-xs sm:text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  title={fr ? 'Exporter la fiche en PDF' : 'Export profile to PDF'}
                >
                  <FileDown size={14} className="sm:w-4 sm:h-4" />
                  <span className="hidden xs:inline">
                    {exportingInvestorId === investor.id ? '...' : 'PDF'}
                  </span>
                </button>
                <button
                  onClick={() => setSelectedInvestorId(investor.id)}
                  className="flex-1 flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-xs sm:text-sm font-medium"
                >
                  <FileText size={14} className="sm:w-4 sm:h-4" />
                  <span className="hidden xs:inline">Docs</span>
                </button>
                <button
                  onClick={() => handleEditInvestor(investor)}
                  className="flex-1 flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-xs sm:text-sm font-medium"
                >
                  <Edit2 size={14} className="sm:w-4 sm:h-4" />
                  <span className="hidden xs:inline">Modifier</span>
                </button>
                <button
                  onClick={() => handleDeleteInvestor(investor.id, `${investor.first_name} ${investor.last_name}`)}
                  className="flex-1 flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-xs sm:text-sm font-medium"
                >
                  <Trash2 size={14} className="sm:w-4 sm:h-4" />
                  <span className="hidden xs:inline">Supprimer</span>
                </button>
              </div>
            </div>
            )
          })}
        </div>
      )}

      {/* Documents Modal */}
      {selectedInvestorId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-[98vw] sm:max-w-[95vw] md:max-w-3xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden">
            <div className="p-3 sm:p-4 md:p-6 border-b border-gray-200 flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 truncate">Documents</h3>
                <p className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1 truncate">
                  {investors.find(i => i.id === selectedInvestorId)?.first_name} {investors.find(i => i.id === selectedInvestorId)?.last_name}
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedInvestorId(null)
                  setDocuments([])
                }}
                className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
              >
                <X size={18} className="sm:w-5 sm:h-5" />
              </button>
            </div>

            <div className="p-3 sm:p-4 md:p-6 overflow-y-auto max-h-[calc(95vh-100px)] sm:max-h-[calc(90vh-140px)]">
              {/* Upload Section */}
              <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <label className="flex flex-col items-center gap-1.5 sm:gap-2 cursor-pointer">
                  <Upload size={28} className="sm:w-8 sm:h-8 text-gray-400" />
                  <span className="text-xs sm:text-sm font-medium text-gray-700 text-center px-2">
                    {uploading ? 'Téléchargement en cours...' : 'Cliquez pour télécharger un document'}
                  </span>
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                  />
                </label>
              </div>

              {/* Documents List */}
              {documents.length === 0 ? (
                <div className="text-center py-8 sm:py-12">
                  <FileText size={40} className="sm:w-12 sm:h-12 mx-auto text-gray-400 mb-3 sm:mb-4" />
                  <p className="text-sm sm:text-base text-gray-600">Aucun document pour cet investisseur</p>
                </div>
              ) : (
                <div className="space-y-2 sm:space-y-3">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between gap-2 p-2.5 sm:p-3 md:p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors min-w-0">
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <FileText size={16} className="sm:w-5 sm:h-5 text-blue-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-gray-900 text-xs sm:text-sm md:text-base truncate">{doc.name}</p>
                          <p className="text-[10px] sm:text-xs text-gray-600 truncate">
                            {(doc.file_size / 1024).toFixed(2)} KB • {new Date(doc.uploaded_at).toLocaleDateString('fr-CA')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleDownloadDocument(doc.storage_path, doc.name)}
                          className="p-1.5 sm:p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title={fr ? 'Telecharger' : 'Download'}
                        >
                          <Download size={16} className="sm:w-[18px] sm:h-[18px]" />
                        </button>
                        <button
                          onClick={() => handleDeleteDocument(doc.id, doc.storage_path)}
                          className="p-1.5 sm:p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title={fr ? 'Supprimer' : 'Delete'}
                        >
                          <Trash2 size={16} className="sm:w-[18px] sm:h-[18px]" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )

  const exportTransactionsPDF = async () => {
    setExportingPDF(true)
    try {
      const jsPDF = (await import('jspdf')).default
      const autoTable = (await import('jspdf-autotable')).default

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

      const loadImageAsBase64 = async (url: string): Promise<string> => {
        try {
          const res = await fetch(url)
          const blob = await res.blob()
          return new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onloadend = () => resolve(reader.result as string)
            reader.onerror = reject
            reader.readAsDataURL(blob)
          })
        } catch { return '' }
      }

      const getImageSize = (base64: string, maxHeightMm: number): Promise<{ w: number; h: number }> =>
        new Promise(resolve => {
          const img = new Image()
          img.onload = () => {
            const ratio = img.naturalWidth > 0 ? img.naturalHeight / img.naturalWidth : 1
            const h = maxHeightMm
            const w = h / ratio
            resolve({ w, h })
          }
          img.onerror = () => resolve({ w: maxHeightMm * 3, h: maxHeightMm })
          img.src = base64
        })

      const addPageHeader = async (pageDoc: typeof doc, subtitle: string) => {
        const logoBase64 = await loadImageAsBase64('/logo-cerdia3.png')
        if (logoBase64) {
          try {
            const { w, h } = await getImageSize(logoBase64, 12)
            pageDoc.addImage(logoBase64, 'PNG', 15, 8, w, h)
          } catch {}
        }
        pageDoc.setFontSize(18)
        pageDoc.setTextColor(94, 94, 94)
        pageDoc.text('Rapport de transactions', 200, 17, { align: 'right' })
        pageDoc.setFontSize(9)
        pageDoc.setTextColor(130, 130, 130)
        pageDoc.text(subtitle, 200, 24, { align: 'right' })
        pageDoc.setDrawColor(94, 94, 94)
        pageDoc.setLineWidth(0.5)
        pageDoc.line(15, 29, 195, 29)
        return 36
      }

      const fmt = (n: number) =>
        n.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })

      const typeLabels: Record<string, string> = {
        investissement: 'Investissement', loyer: 'Loyer', loyer_locatif: 'Revenu locatif',
        revenu: 'Revenu', dividende: 'Dividende', paiement: 'Paiement',
        depense: 'Dépense', capex: 'CAPEX', maintenance: 'Maintenance',
        admin: 'Administration', remboursement_investisseur: 'Remboursement', transfert: 'Transfert',
      }

      const filterParts = [
        filterYear !== 'all' ? `Année: ${filterYear}` : '',
        filterType !== 'all' ? `Type: ${typeLabels[filterType] || filterType}` : '',
        filterCategory !== 'all' ? `Catégorie: ${filterCategory}` : '',
      ].filter(Boolean)
      const filterLabel = filterParts.length > 0 ? filterParts.join(' | ') : 'Toutes les transactions'

      let yPos = await addPageHeader(doc, filterLabel)

      // Résumé financier
      doc.setFontSize(11)
      doc.setTextColor(60, 60, 60)
      doc.text('Résumé financier', 15, yPos)
      yPos += 5

      autoTable(doc, {
        startY: yPos,
        head: [['Entrées totales', 'Sorties totales', 'Balance']],
        body: [[fmt(totalIn), fmt(totalOut), fmt(balance)]],
        theme: 'grid',
        headStyles: { fillColor: [94, 94, 94], textColor: 255, fontStyle: 'bold', fontSize: 10 },
        bodyStyles: { fontSize: 10, cellPadding: 4 },
        columnStyles: { 0: { halign: 'right' }, 1: { halign: 'right' }, 2: { halign: 'right' } },
      })

      yPos = (doc as any).lastAutoTable.finalY + 10

      // Table des transactions
      doc.setFontSize(11)
      doc.setTextColor(60, 60, 60)
      doc.text(`Transactions (${filteredTransactions.length})`, 15, yPos)
      yPos += 5

      // Générer des URLs signées (valides 1 an) si l'option est activée
      const signedUrlMap: Record<string, string> = {}
      if (pdfIncludeLinks) {
        await Promise.all(
          filteredTransactions
            .filter(t => t.attachment_storage_path)
            .map(async t => {
              const { data } = await supabase.storage
                .from('transaction-attachments')
                .createSignedUrl(t.attachment_storage_path!, 60 * 60 * 24 * 365)
              if (data?.signedUrl) signedUrlMap[t.id] = data.signedUrl
            })
        )
      }

      const rows = filteredTransactions.map(t => {
        const investor = investors.find(i => i.id === t.investor_id)
        const property = properties.find(p => p.id === t.property_id)
        const desc = [
          t.description,
          investor ? `Investisseur: ${investor.first_name} ${investor.last_name}` : '',
          property ? `Propriété: ${property.name}` : '',
        ].filter(Boolean).join('\n')
        const statut = t.status === 'complete' ? 'Complété' : t.status === 'en_attente' ? 'En attente' : 'Annulé'
        return [
          new Date(t.date).toLocaleDateString('fr-CA'),
          typeLabels[t.type] || t.type,
          desc,
          fmt(t.amount),
          statut,
          t.attachment_name || '-',
        ]
      })

      autoTable(doc, {
        startY: yPos,
        head: [['Date', 'Type', 'Description', 'Montant', 'Statut', 'Pièce jointe']],
        body: rows,
        theme: 'striped',
        headStyles: { fillColor: [94, 94, 94], textColor: 255, fontStyle: 'bold', fontSize: 9 },
        bodyStyles: { fontSize: 8, cellPadding: 2.5 },
        columnStyles: {
          0: { cellWidth: 22 },
          1: { cellWidth: 26 },
          2: { cellWidth: 62 },
          3: { cellWidth: 25, halign: 'right' },
          4: { cellWidth: 20 },
          5: { cellWidth: 30 },
        },
        // Colorer en bleu les cellules "Pièce jointe" qui ont une URL signée
        didParseCell: (data: any) => {
          if (data.section === 'body' && data.column.index === 5) {
            const tx = filteredTransactions[data.row.index]
            if (tx && signedUrlMap[tx.id]) {
              data.cell.styles.textColor = [0, 102, 204]
            }
          }
        },
        // Ajouter un lien cliquable + soulignement sur les cellules avec URL signée
        didDrawCell: (data: any) => {
          if (data.section === 'body' && data.column.index === 5) {
            const tx = filteredTransactions[data.row.index]
            const signedUrl = tx && signedUrlMap[tx.id]
            if (signedUrl) {
              doc.link(data.cell.x, data.cell.y, data.cell.width, data.cell.height, { url: signedUrl })
              doc.setDrawColor(0, 102, 204)
              doc.setLineWidth(0.15)
              const textY = data.cell.y + data.cell.height - 1.5
              doc.line(data.cell.x + 1, textY, data.cell.x + data.cell.width - 1, textY)
            }
          }
        },
      })

      // Pièces jointes : images embarquées, autres référencées
      const withAttachments = filteredTransactions.filter(t => t.attachment_storage_path)
      if (withAttachments.length > 0) {
        const logoBase64 = await loadImageAsBase64('/logo-cerdia3.png')
        for (const t of withAttachments) {
          try {
            const { data, error } = await supabase.storage
              .from('transaction-attachments')
              .download(t.attachment_storage_path!)
            if (error || !data) continue

            const ext = (t.attachment_name || '').split('.').pop()?.toLowerCase() || ''
            const isImage = ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'gif'].includes(ext)

            doc.addPage()
            // En-tête page pièce jointe
            if (logoBase64) {
              try {
                const { w, h } = await getImageSize(logoBase64, 12)
                doc.addImage(logoBase64, 'PNG', 15, 8, w, h)
              } catch {}
            }
            doc.setFontSize(14)
            doc.setTextColor(94, 94, 94)
            doc.text('Pièce jointe', 200, 17, { align: 'right' })
            doc.setFontSize(9)
            doc.setTextColor(130, 130, 130)
            doc.text(
              `${new Date(t.date).toLocaleDateString('fr-CA')} — ${t.description}`,
              200, 24, { align: 'right' }
            )
            doc.setDrawColor(94, 94, 94)
            doc.setLineWidth(0.5)
            doc.line(15, 29, 195, 29)

            if (isImage) {
              const imgBase64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader()
                reader.onloadend = () => resolve(reader.result as string)
                reader.onerror = reject
                reader.readAsDataURL(data)
              })
              // Calculer les dimensions en maintenant le ratio
              const img = new Image()
              img.src = imgBase64
              await new Promise<void>(r => { img.onload = () => r() })
              const maxW = 180
              const maxH = 230
              const ratio = img.width > 0 ? img.height / img.width : 1
              const pdfW = maxW
              const pdfH = Math.min(pdfW * ratio, maxH)
              const format = ext === 'jpg' || ext === 'jpeg' ? 'JPEG' : 'PNG'
              doc.addImage(imgBase64, format, 15, 36, pdfW, pdfH)
            } else {
              doc.setFontSize(10)
              doc.setTextColor(80, 80, 80)
              doc.text(`Fichier: ${t.attachment_name}`, 15, 42)
              const signedUrl = signedUrlMap[t.id]
              if (signedUrl) {
                doc.setFontSize(9)
                doc.setTextColor(0, 102, 204)
                doc.text('Cliquer ici pour ouvrir le fichier', 15, 52)
                doc.link(15, 48, 80, 7, { url: signedUrl })
                doc.setDrawColor(0, 102, 204)
                doc.setLineWidth(0.15)
                doc.line(15, 53.5, 75, 53.5)
              } else {
                doc.setFontSize(9)
                doc.setTextColor(130, 130, 130)
                doc.text('(Fichier non previsualisable — liens desactives)', 15, 50)
              }
            }
          } catch {}
        }
      }

      // Pied de page sur toutes les pages
      const pageCount = doc.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setDrawColor(200, 200, 200)
        doc.setLineWidth(0.3)
        doc.line(15, 280, 195, 280)
        doc.setFontSize(8)
        doc.setTextColor(130, 130, 130)
        doc.text('CERDIA — Rapport de transactions confidentiel', 105, 285, { align: 'center' })
        doc.text(`Page ${i} sur ${pageCount}`, 105, 290, { align: 'center' })
        doc.text(
          `Généré le ${new Date().toLocaleDateString('fr-CA', { year: 'numeric', month: 'long', day: 'numeric' })}`,
          200, 290, { align: 'right' }
        )
      }

      const yearSuffix = filterYear !== 'all' ? `_${filterYear}` : ''
      doc.save(`transactions_cerdia${yearSuffix}_${new Date().toISOString().split('T')[0]}.pdf`)
    } catch (err: any) {
      alert('Erreur lors de la génération du PDF: ' + err.message)
    } finally {
      setExportingPDF(false)
    }
  }

  const renderTransactionGuide = () => (
    <div className="space-y-6 max-w-3xl">

      {/* Intro */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
        <h3 className="text-base font-bold text-blue-900 mb-1">{fr ? 'Guide de saisie — Transactions' : 'Data Entry Guide — Transactions'}</h3>
        <p className="text-sm text-blue-800">
          {fr
            ? <>Ce guide explique comment enregistrer correctement une transaction pour que les rapports financiers, le NAV et les déclarations fiscales soient exacts. Chaque transaction doit être accompagnée d'une <strong>pièce jointe (facture ou reçu)</strong> comme preuve comptable.</>
            : <>This guide explains how to correctly record a transaction so that financial reports, NAV, and tax returns are accurate. Each transaction must be accompanied by an <strong>attachment (invoice or receipt)</strong> as accounting proof.</>
          }
        </p>
      </div>

      {/* Étape 1 */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="bg-gray-800 text-white px-4 py-2.5 flex items-center gap-2">
          <span className="bg-white text-gray-800 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">1</span>
          <span className="font-semibold text-sm">{fr ? 'Champs obligatoires' : 'Required fields'}</span>
        </div>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(fr ? [
              { champ: '📅 Date', desc: 'Date réelle de la transaction (pas la date de saisie). Pour une facture reçue le 15 mars, inscrire 2025-03-15.' },
              { champ: '📋 Type', desc: "Catégorie principale de la transaction (ex: Dépense, Paiement, Investissement). Détermine l'impact sur le compte courant." },
              { champ: '💰 Montant', desc: "Montant dans la devise d'origine (USD ou CAD). Le système convertit automatiquement en CAD via le taux du jour." },
              { champ: '📝 Description', desc: 'Description courte et précise. Ex: "Facture électricité mars 2025 — Plaza Colonia" (éviter "dépense" seul).' },
            ] : [
              { champ: '📅 Date', desc: 'Actual date of the transaction (not the entry date). For an invoice received March 15, enter 2025-03-15.' },
              { champ: '📋 Type', desc: 'Main transaction category (e.g. Expense, Payment, Investment). Determines the impact on the current account.' },
              { champ: '💰 Amount', desc: 'Amount in the original currency (USD or CAD). The system automatically converts to CAD at the current rate.' },
              { champ: '📝 Description', desc: 'Short and precise description. E.g. "Electricity bill March 2025 — Plaza Colonia" (avoid "expense" alone).' },
            ]).map(({ champ, desc }) => (
              <div key={champ} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                <div className="font-semibold text-sm text-gray-800 mb-1">{champ}</div>
                <div className="text-xs text-gray-600">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Étape 2 */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="bg-gray-800 text-white px-4 py-2.5 flex items-center gap-2">
          <span className="bg-white text-gray-800 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">2</span>
          <span className="font-semibold text-sm">{fr ? 'Catégorie fiscale — choisir le bon type' : 'Fiscal category — choosing the right type'}</span>
        </div>
        <div className="p-4 space-y-3">
          <p className="text-xs text-gray-600 mb-3">
            {fr ? 'La catégorie fiscale détermine le traitement comptable et fiscal. En cas de doute, consultez votre comptable.' : 'The fiscal category determines the accounting and tax treatment. If in doubt, consult your accountant.'}
          </p>

          {/* OPEX */}
          <div>
            <div className="text-xs font-bold text-green-700 uppercase tracking-wide mb-2">{fr ? "OPEX — Déduit l'année courante" : 'OPEX — Deducted in current year'}</div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-green-50">
                    <th className="text-left p-2 text-green-800 font-semibold border border-green-100">{fr ? 'Catégorie' : 'Category'}</th>
                    <th className="text-left p-2 text-green-800 font-semibold border border-green-100">{fr ? 'Exemples' : 'Examples'}</th>
                    <th className="text-left p-2 text-green-800 font-semibold border border-green-100">{fr ? 'Preuve requise' : 'Required proof'}</th>
                  </tr>
                </thead>
                <tbody>
                  {(fr ? [
                    ['Frais de gestion', 'Honoraires gestionnaire immobilier, commission agence', 'Facture + contrat'],
                    ['Assurance propriété', "Prime annuelle, assurance responsabilité", "Police d'assurance ou reçu"],
                    ['Taxes foncières', 'Taxes municipales, scolaires', 'Avis de cotisation municipal'],
                    ['Frais de condo', 'Charges mensuelles copropriété', 'Relevé de charges'],
                    ['Services publics', 'Électricité, eau, gaz, internet', 'Facture du fournisseur'],
                    ['Entretien & réparations', 'Peinture, plomberie mineure, nettoyage', 'Facture entrepreneur'],
                    ['Intérêts hypothécaires', 'Intérêts sur prêt (pas le capital)', 'Relevé annuel prêteur'],
                    ['Honoraires professionnels', 'Comptable, avocat, notaire (suivi)', 'Facture professionnelle'],
                  ] : [
                    ['Management fees', 'Property manager fees, agency commission', 'Invoice + contract'],
                    ['Property insurance', 'Annual premium, liability insurance', 'Insurance policy or receipt'],
                    ['Property taxes', 'Municipal, school taxes', 'Municipal assessment notice'],
                    ['Condo fees', 'Monthly condo charges', 'Charge statement'],
                    ['Utilities', 'Electricity, water, gas, internet', "Provider's invoice"],
                    ['Maintenance & repairs', 'Paint, minor plumbing, cleaning', "Contractor's invoice"],
                    ['Mortgage interest', 'Loan interest (not principal)', 'Annual lender statement'],
                    ['Professional fees', 'Accountant, lawyer, notary (ongoing)', 'Professional invoice'],
                  ]).map(([cat, ex, preuve]) => (
                    <tr key={cat} className="border-b border-green-50 hover:bg-green-50/50">
                      <td className="p-2 border border-green-100 font-medium text-gray-800">{cat}</td>
                      <td className="p-2 border border-green-100 text-gray-600">{ex}</td>
                      <td className="p-2 border border-green-100 text-gray-500 italic">{preuve}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* CAPEX */}
          <div className="mt-4">
            <div className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-2">{fr ? 'CAPEX — Amorti sur plusieurs années' : 'CAPEX — Amortized over multiple years'}</div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-blue-50">
                    <th className="text-left p-2 text-blue-800 font-semibold border border-blue-100">{fr ? 'Catégorie' : 'Category'}</th>
                    <th className="text-left p-2 text-blue-800 font-semibold border border-blue-100">{fr ? 'Exemples' : 'Examples'}</th>
                    <th className="text-left p-2 text-blue-800 font-semibold border border-blue-100">{fr ? 'Preuve requise' : 'Required proof'}</th>
                  </tr>
                </thead>
                <tbody>
                  {(fr ? [
                    ['Rénovation majeure', 'Refaire la toiture, fenêtres, fondations, salle de bain complète', 'Contrat + factures entrepreneur'],
                    ['Équipements', "Électroménagers, système HVAC, chauffe-eau", "Facture d'achat + bon de livraison"],
                    ['Ameublement', 'Meubles, décorations pour location meublée', "Factures d'achat"],
                    ["Frais d'acquisition", 'Notaire, inspection, droits de mutation', 'Facture notaire + relevé'],
                  ] : [
                    ['Major renovation', 'Roof, windows, foundations, complete bathroom redo', 'Contract + contractor invoices'],
                    ['Equipment', 'Appliances, HVAC system, water heater', 'Purchase invoice + delivery note'],
                    ['Furnishing', 'Furniture, décor for furnished rental', 'Purchase invoices'],
                    ['Acquisition costs', 'Notary, inspection, transfer taxes', 'Notary invoice + statement'],
                  ]).map(([cat, ex, preuve]) => (
                    <tr key={cat} className="border-b border-blue-50 hover:bg-blue-50/50">
                      <td className="p-2 border border-blue-100 font-medium text-gray-800">{cat}</td>
                      <td className="p-2 border border-blue-100 text-gray-600">{ex}</td>
                      <td className="p-2 border border-blue-100 text-gray-500 italic">{preuve}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-2">
            <p className="text-xs text-amber-800">
              {fr
                ? <><strong>Règle clé OPEX vs CAPEX :</strong> Si la dépense <em>améliore ou prolonge la durée de vie</em> de la propriété → CAPEX. Si elle <em>maintient l'état existant</em> → OPEX. En cas de doute pour un montant {'>'} 1 000 $, consultez votre comptable.</>
                : <><strong>Key OPEX vs CAPEX rule:</strong> If the expense <em>improves or extends the life</em> of the property → CAPEX. If it <em>maintains the existing condition</em> → OPEX. When in doubt for amounts {'>'} $1,000, consult your accountant.</>
              }
            </p>
          </div>
        </div>
      </div>

      {/* Étape 3 */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="bg-gray-800 text-white px-4 py-2.5 flex items-center gap-2">
          <span className="bg-white text-gray-800 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">3</span>
          <span className="font-semibold text-sm">{fr ? 'Pièces jointes — preuve comptable obligatoire' : 'Attachments — mandatory accounting proof'}</span>
        </div>
        <div className="p-4 space-y-3">
          <p className="text-xs text-gray-600">
            {fr
              ? "Toute transaction doit être appuyée par un document justificatif. Sans preuve, la dépense peut être refusée lors d'une vérification fiscale (ARC / RQ)."
              : 'Every transaction must be supported by a backing document. Without proof, the expense may be rejected during a tax audit (CRA / RQ).'}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(fr ? [
              { icon: '🧾', titre: 'Facture fournisseur', desc: 'Numéro de facture, date, description, montant, TPS/TVQ, nom fournisseur' },
              { icon: '🏦', titre: 'Relevé bancaire', desc: 'Extrait montrant le débit avec date et montant correspondants' },
              { icon: '📸', titre: 'Reçu photo', desc: 'Photo lisible du reçu. Assurez-vous que la date, le montant et le vendeur sont visibles' },
            ] : [
              { icon: '🧾', titre: 'Supplier invoice', desc: 'Invoice number, date, description, amount, GST/QST, supplier name' },
              { icon: '🏦', titre: 'Bank statement', desc: 'Extract showing the debit with corresponding date and amount' },
              { icon: '📸', titre: 'Photo receipt', desc: 'Legible photo of the receipt. Ensure the date, amount, and vendor are visible' },
            ]).map(({ icon, titre, desc }) => (
              <div key={titre} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <div className="text-2xl mb-1">{icon}</div>
                <div className="font-semibold text-sm text-gray-800 mb-1">{titre}</div>
                <div className="text-xs text-gray-600">{desc}</div>
              </div>
            ))}
          </div>

          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 mt-2">
            <div className="font-semibold text-sm text-gray-800 mb-2">{fr ? 'Comment joindre un fichier :' : 'How to attach a file:'}</div>
            <ol className="text-xs text-gray-700 space-y-2">
              <li className="flex items-start gap-2"><span className="bg-gray-800 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center flex-shrink-0 mt-0.5">1</span> {fr ? <> Cliquer sur <strong>"Nouvelle transaction"</strong> ou ouvrir une transaction existante via le bouton pièce jointe 📎</> : <> Click <strong>"New transaction"</strong> or open an existing transaction via the attachment button 📎</>}</li>
              <li className="flex items-start gap-2"><span className="bg-gray-800 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center flex-shrink-0 mt-0.5">2</span> {fr ? <> Défiler jusqu'à la section <strong>"Pièces jointes"</strong> en bas du formulaire</> : <> Scroll to the <strong>"Attachments"</strong> section at the bottom of the form</>}</li>
              <li className="flex items-start gap-2"><span className="bg-gray-800 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center flex-shrink-0 mt-0.5">3</span> {fr ? <> Cliquer sur <strong>"Choisir des fichiers"</strong> ou glisser-déposer directement</> : <> Click <strong>"Choose files"</strong> or drag and drop directly</>}</li>
              <li className="flex items-start gap-2"><span className="bg-gray-800 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center flex-shrink-0 mt-0.5">4</span> {fr ? <> Formats acceptés : <strong>PDF, JPG, PNG, HEIC</strong> — taille max 10 MB par fichier</> : <> Accepted formats: <strong>PDF, JPG, PNG, HEIC</strong> — max 10 MB per file</>}</li>
              <li className="flex items-start gap-2"><span className="bg-gray-800 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center flex-shrink-0 mt-0.5">5</span> {fr ? " Pour une transaction existante : les pièces jointes s'ajoutent immédiatement sans re-sauvegarder" : ' For an existing transaction: attachments are added immediately without re-saving'}</li>
            </ol>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-xs text-red-800">
              {fr
                ? <><strong>Important :</strong> Joindre la facture <em>originale</em> du fournisseur (pas un relevé de carte de crédit seul). Pour les transactions en USD, la facture en USD est suffisante — le système conserve le taux de conversion.</>
                : <><strong>Important:</strong> Attach the <em>original</em> supplier invoice (not just a credit card statement). For USD transactions, the USD invoice is sufficient — the system retains the conversion rate.</>
              }
            </p>
          </div>
        </div>
      </div>

      {/* Étape 4 */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="bg-gray-800 text-white px-4 py-2.5 flex items-center gap-2">
          <span className="bg-white text-gray-800 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">4</span>
          <span className="font-semibold text-sm">{fr ? 'Transactions en devise étrangère (USD)' : 'Foreign currency transactions (USD)'}</span>
        </div>
        <div className="p-4 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(fr ? [
              { champ: 'Devise source', desc: 'Sélectionner USD si la facture est en dollars américains' },
              { champ: 'Montant source', desc: 'Montant exact de la facture en USD (ex: 2 500,00)' },
              { champ: 'Taux de change', desc: 'Taux USD/CAD au jour de la transaction (Banque du Canada). Le système propose le taux du jour automatiquement.' },
              { champ: 'Pays source', desc: "Pays de l'émetteur de la facture (ex: Panama, États-Unis). Requis pour T1135." },
            ] : [
              { champ: 'Source currency', desc: 'Select USD if the invoice is in US dollars' },
              { champ: 'Source amount', desc: 'Exact invoice amount in USD (e.g. 2,500.00)' },
              { champ: 'Exchange rate', desc: 'USD/CAD rate on the transaction date (Bank of Canada). The system automatically suggests the daily rate.' },
              { champ: 'Source country', desc: 'Country of the invoice issuer (e.g. Panama, United States). Required for T1135.' },
            ]).map(({ champ, desc }) => (
              <div key={champ} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                <div className="font-semibold text-sm text-gray-800 mb-1">{champ}</div>
                <div className="text-xs text-gray-600">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Raccourci */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <div className="font-semibold text-sm text-gray-800 mb-2">{fr ? 'Résumé — checklist avant de sauvegarder' : 'Summary — checklist before saving'}</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {(fr ? [
            '✅ Date = date réelle de la facture',
            '✅ Type correspond au flux (entrée/sortie)',
            '✅ Catégorie fiscale sélectionnée',
            '✅ Description précise (propriété + nature)',
            '✅ Propriété liée si applicable',
            '✅ Pièce jointe (facture ou reçu) ajoutée',
            '✅ Devise USD renseignée si facture en USD',
            '✅ Notes comptable si situation particulière',
          ] : [
            '✅ Date = actual date of the invoice',
            '✅ Type matches the cash flow (in/out)',
            '✅ Fiscal category selected',
            '✅ Precise description (property + nature)',
            '✅ Property linked if applicable',
            '✅ Attachment (invoice or receipt) added',
            '✅ USD currency filled if invoice is in USD',
            '✅ Accounting notes if special situation',
          ]).map(item => (
            <div key={item} className="text-xs text-gray-700 bg-white rounded px-2 py-1.5 border border-gray-100">{item}</div>
          ))}
        </div>
      </div>

    </div>
  )

  const renderTransactionsTab = () => (
    <div className="space-y-6">
      {/* Barre supérieure : hamburger + statut mensuel + Nouvelle transaction */}
      <div className="flex items-center justify-between gap-3">
        {/* Gauche : hamburger + badge statut mensuel */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              onClick={() => setShowTxMenu(v => !v)}
              className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 bg-white rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Menu size={18} />
              <span className="hidden sm:inline text-gray-700">Menu</span>
            </button>
            {showTxMenu && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowTxMenu(false)} />
                <div className="absolute left-0 top-full mt-1 z-40 bg-white border border-gray-200 rounded-xl shadow-lg w-72 py-1 overflow-hidden">
                  {/* Filtres */}
                  <div className="px-4 pt-2 pb-3 space-y-2 border-b border-gray-100">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{t('admin.tx.filters')}</p>
                    <select
                      value={filterType} onChange={e => setFilterType(e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:ring-1 focus:ring-gray-400"
                    >
                      <option value="all">{t('transactions.allTypes')}</option>
                      <option value="investissement">{fr ? 'Investissement' : 'Investment'}</option>
                      <option value="loyer">{fr ? 'Loyer' : 'Rent'}</option>
                      <option value="loyer_locatif">{fr ? 'Revenu locatif' : 'Rental income'}</option>
                      <option value="revenu">{fr ? 'Revenu' : 'Revenue'}</option>
                      <option value="dividende">{fr ? 'Dividende' : 'Dividend'}</option>
                      <option value="paiement">{fr ? 'Paiement' : 'Payment'}</option>
                      <option value="depense">{fr ? 'Dépense' : 'Expense'}</option>
                      <option value="capex">CAPEX</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="admin">Administration</option>
                      <option value="remboursement_investisseur">{fr ? 'Remboursement investisseur' : 'Investor repayment'}</option>
                      <option value="transfert">{fr ? 'Transfert' : 'Transfer'}</option>
                    </select>
                    <select
                      value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:ring-1 focus:ring-gray-400"
                    >
                      <option value="all">{t('transactions.allCategories')}</option>
                      <option value="capital">Capital</option>
                      <option value="operation">{fr ? 'Opération' : 'Operation'}</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="admin">Administration</option>
                    </select>
                    <select
                      value={filterYear} onChange={e => setFilterYear(e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:ring-1 focus:ring-gray-400"
                    >
                      <option value="all">{t('admin.tx.allYears')}</option>
                      {availableYears.map(y => (
                        <option key={y} value={y.toString()}>{y}</option>
                      ))}
                    </select>
                  </div>

                  {/* Actions */}
                  <button
                    onClick={() => { setShowMonthlyControl(true); setShowTxMenu(false) }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    🗓️ {t('admin.tx.monthlyControl')}
                  </button>
                  <button
                    onClick={() => { setTxInnerTab(txInnerTab === 'guide' ? 'liste' : 'guide'); setShowTxMenu(false) }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors ${txInnerTab === 'guide' ? 'text-gray-900 font-semibold bg-gray-50' : 'text-gray-700'}`}
                  >
                    📖 {t('admin.tx.dataEntryGuide')}
                  </button>
                  <div className="border-t border-gray-100 my-1" />
                  <button
                    onClick={() => { exportTransactionsPDF(); setShowTxMenu(false) }}
                    disabled={exportingPDF}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    <FileDown size={15} />
                    {exportingPDF ? t('admin.tx.generating') : t('admin.tx.exportPDF')}
                  </button>
                  <div className="px-4 py-2">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-500">
                      <input type="checkbox" checked={pdfIncludeLinks} onChange={e => setPdfIncludeLinks(e.target.checked)} className="accent-gray-700 w-3.5 h-3.5" />
                      {t('admin.tx.includePJLinks')}
                    </label>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Badge statut contrôle mensuel */}
          <button
            onClick={() => setShowMonthlyControl(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              monthlyStatus === 'ok'
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : monthlyStatus === 'late'
                ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 animate-pulse'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {monthlyStatus === 'ok' ? '✅' : monthlyStatus === 'late' ? '⚠️' : '🗓️'}
            <span className="hidden sm:inline">
              {monthlyStatus === 'ok' ? t('admin.tx.balanceValidated') : monthlyStatus === 'late' ? t('admin.tx.controlLate') : t('admin.tx.monthlyControl')}
            </span>
          </button>
        </div>

        {/* Bouton Nouvelle Transaction toujours visible */}
        <button
          onClick={() => { setTxInnerTab('liste'); setShowAddTransactionForm(!showAddTransactionForm) }}
          className="flex items-center gap-2 bg-[#5e5e5e] hover:bg-[#3e3e3e] text-white px-4 py-2 rounded-full transition-colors text-sm font-medium"
        >
          {showAddTransactionForm ? <X size={18} /> : <Plus size={18} />}
          {showAddTransactionForm ? t('common.cancel') : t('transactions.new')}
        </button>
      </div>

      {/* Modal contrôle mensuel */}
      {showMonthlyControl && (
        <>
          <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setShowMonthlyControl(false)} />
          <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-8 px-4 pointer-events-none">
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl pointer-events-auto">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h3 className="text-base font-semibold text-gray-800">🗓️ Contrôle mensuel</h3>
                <button onClick={() => setShowMonthlyControl(false)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                  <X size={18} className="text-gray-500" />
                </button>
              </div>
              <div className="p-6">
                <MonthlyControl
                  onClose={() => setShowMonthlyControl(false)}
                  onStatusChange={setMonthlyStatus}
                />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Contenu selon onglet actif */}
      {txInnerTab === 'guide' && renderTransactionGuide()}

      {/* Contenu onglet Liste (contenu existant) */}
      {txInnerTab === 'liste' && <div className="space-y-6">

      {/* Header avec statistiques */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-green-700">{t('transactions.totalIn')}</span>
            <TrendingUp className="text-green-600" size={20} />
          </div>
          <p className="text-2xl font-bold text-green-900">
            {totalIn.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
          </p>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-lg border border-red-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-red-700">{t('transactions.totalOut')}</span>
            <TrendingDown className="text-red-600" size={20} />
          </div>
          <p className="text-2xl font-bold text-red-900">
            {totalOut.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
          </p>
        </div>

        {(() => {
          const displayBalance = isFiltered ? balance : (financialSummary?.compte_courant_balance ?? balance)
          const isPos = displayBalance >= 0
          return (
            <div className={`bg-gradient-to-br ${isPos ? 'from-blue-50 to-blue-100 border-blue-200' : 'from-orange-50 to-orange-100 border-orange-200'} p-4 rounded-lg border`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-sm font-medium ${isPos ? 'text-blue-700' : 'text-orange-700'}`}>
                  {isFiltered ? t('admin.tx.filteredBalance') : t('admin.tx.currentAccountBalance')}
                </span>
                <DollarSign className={isPos ? 'text-blue-600' : 'text-orange-600'} size={20} />
              </div>
              <p className={`text-2xl font-bold ${isPos ? 'text-blue-900' : 'text-orange-900'}`}>
                {displayBalance.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
              </p>
              {isFiltered && (
                <p className="text-xs text-gray-500 mt-1">Global: {(financialSummary?.compte_courant_balance ?? 0).toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}</p>
              )}
            </div>
          )
        })()}
      </div>

      {/* Backdrop modal édition */}
      {showAddTransactionForm && editingTransactionId && (
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={resetTransactionForm} />
      )}

      {/* Formulaire — inline pour ajout, modal pour édition */}
      {showAddTransactionForm && (
        <div className={editingTransactionId
          ? 'fixed inset-0 z-50 overflow-y-auto flex items-start justify-center p-4 pt-10 pb-8'
          : 'bg-white p-4 sm:p-6 rounded-lg shadow-md border border-gray-200'
        }>
          <div className={editingTransactionId
            ? 'bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-4xl p-4 sm:p-6 my-auto'
            : 'w-full'
          }>
          <h3 className="text-base sm:text-lg font-semibold mb-4">
            {editingTransactionId ? t('transactions.edit') : t('transactions.new')}
          </h3>
          <form onSubmit={handleTransactionSubmit} className="space-y-6">

            {/* ── Sélecteur direction ── */}
            <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
              {([
                { key: 'revenu',  label: fr ? '↑ Revenu'   : '↑ Revenue',  cls: 'bg-green-500'  },
                { key: 'depense', label: fr ? '↓ Dépense'  : '↓ Expense',  cls: 'bg-red-500'    },
                { key: 'neutre',  label: fr ? '↔ Neutre'   : '↔ Neutral',  cls: 'bg-indigo-500' },
              ] as { key: 'revenu'|'depense'|'neutre'; label: string; cls: string }[]).map(({ key, label, cls }) => (
                <button key={key} type="button"
                  onClick={() => switchTxDirection(key)}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    txDirection === key ? `${cls} text-white shadow-sm` : 'text-gray-500 hover:text-gray-700'
                  }`}>
                  {label}
                </button>
              ))}
            </div>

            {/* SECTION 1: INFORMATIONS DE BASE */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">📅 Date *</label>
                <input
                  type="date"
                  value={transactionFormData.date}
                  onChange={(e) => setTransactionFormData({ ...transactionFormData, date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                  required
                />
              </div>

              {/* Type — filtré par direction */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{fr ? "📋 Type *" : '📋 Type *'}</label>
                <select
                  value={transactionFormData.type}
                  onChange={(e) => setTransactionFormData({
                    ...transactionFormData,
                    type: e.target.value,
                    target_account: null,
                    transfer_source: null,
                    occurrence_type: 'unique',
                    recurrence_frequency: null,
                    recurrence_end_date: null,
                    recurrence_no_end: false
                  })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent bg-white"
                  required
                >
                  {txDirection === 'revenu' && <>
                    <option value="investissement">{fr ? 'Investissement' : 'Investment'}</option>
                    <option value="loyer">{fr ? 'Loyer' : 'Rent'}</option>
                    <option value="loyer_locatif">{fr ? 'Revenu locatif (avec compte dest.)' : 'Rental income (with dest. account)'}</option>
                    <option value="revenu">{fr ? 'Revenu général' : 'General revenue'}</option>
                    <option value="dividende">{fr ? 'Dividende' : 'Dividend'}</option>
                  </>}
                  {txDirection === 'depense' && <>
                    <option value="paiement">{fr ? 'Paiement' : 'Payment'}</option>
                    <option value="depense">{fr ? 'Dépense' : 'Expense'}</option>
                    <option value="capex">CAPEX</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="admin">Administration</option>
                    <option value="remboursement_investisseur">{fr ? 'Remboursement investisseur' : 'Investor repayment'}</option>
                  </>}
                  {txDirection === 'neutre' && <>
                    <option value="transfert">{fr ? 'Transfert (courant ↔ CAPEX)' : 'Transfer (current ↔ CAPEX)'}</option>
                  </>}
                </select>
              </div>

              {/* Catégorie fiscale — filtrée par direction */}
              {txDirection !== 'neutre' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{fr ? '🧾 Catégorie fiscale' : '🧾 Fiscal category'}</label>
                  <select
                    value={transactionFormData.fiscal_category || ''}
                    onChange={(e) => setTransactionFormData({ ...transactionFormData, fiscal_category: e.target.value || null })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent bg-white"
                  >
                    <option value="">{fr ? '— Aucune —' : '— None —'}</option>
                    {txDirection === 'revenu' && <>
                      <optgroup label={fr ? '── REVENUS ──' : '── REVENUES ──'}>
                        <option value="rental_income">{fr ? 'Revenu locatif' : 'Rental income'}</option>
                        <option value="dividend_income">{fr ? 'Dividende / distribution' : 'Dividend / distribution'}</option>
                        <option value="interest_income">{fr ? 'Intérêts reçus' : 'Interest received'}</option>
                        <option value="other_income">{fr ? 'Autre revenu' : 'Other revenue'}</option>
                      </optgroup>
                    </>}
                    {txDirection === 'depense' && <>
                      <optgroup label={fr ? '── OPEX (déduit immédiatement) ──' : '── OPEX (deducted immediately) ──'}>
                        <option value="management_fee">{fr ? 'Frais de gestion' : 'Management fees'}</option>
                        <option value="insurance">{fr ? 'Assurance propriété' : 'Property insurance'}</option>
                        <option value="property_tax">{fr ? 'Taxes foncières' : 'Property taxes'}</option>
                        <option value="condo_fees">{fr ? 'Frais de condo / charges' : 'Condo fees / charges'}</option>
                        <option value="utilities">{fr ? 'Services publics (eau, élec.)' : 'Utilities (water, electricity)'}</option>
                        <option value="maintenance_repair">{fr ? 'Entretien & réparations' : 'Maintenance & repairs'}</option>
                        <option value="professional_fees">{fr ? 'Honoraires prof. (comptable, notaire)' : 'Professional fees (accountant, notary)'}</option>
                        <option value="advertising">{fr ? 'Publicité / location' : 'Advertising / rental'}</option>
                        <option value="travel">{fr ? 'Frais de déplacement' : 'Travel expenses'}</option>
                        <option value="interest_expense">{fr ? 'Intérêts hypothécaires' : 'Mortgage interest'}</option>
                        <option value="bank_fees">{fr ? 'Frais bancaires / conversion' : 'Bank / conversion fees'}</option>
                        <option value="other_opex">{fr ? 'Autre OPEX' : 'Other OPEX'}</option>
                      </optgroup>
                      <optgroup label={fr ? '── CAPEX (amorti sur plusieurs années) ──' : '── CAPEX (amortized over multiple years) ──'}>
                        <option value="property_purchase">{fr ? "Acquisition propriété (prix d'achat)" : 'Property acquisition (purchase price)'}</option>
                        <option value="renovation">{fr ? 'Rénovation majeure' : 'Major renovation'}</option>
                        <option value="equipment">{fr ? 'Équipements & appareils' : 'Equipment & appliances'}</option>
                        <option value="furnishing">{fr ? 'Ameublement' : 'Furnishing'}</option>
                        <option value="acquisition_costs">{fr ? "Frais d'acquisition (notaire, inspection)" : 'Acquisition costs (notary, inspection)'}</option>
                        <option value="land_improvement">{fr ? 'Amélioration terrain' : 'Land improvement'}</option>
                        <option value="other_capex">{fr ? 'Autre CAPEX' : 'Other CAPEX'}</option>
                      </optgroup>
                      <optgroup label={fr ? '── FINANCEMENT ──' : '── FINANCING ──'}>
                        <option value="loan_principal">{fr ? 'Remboursement capital prêt' : 'Loan principal repayment'}</option>
                        <option value="investor_capital">{fr ? 'Capital investisseur' : 'Investor capital'}</option>
                        <option value="investor_repayment">{fr ? 'Remboursement investisseur' : 'Investor repayment'}</option>
                      </optgroup>
                      <optgroup label={fr ? '── REMISES FISCALES ──' : '── TAX REMITTANCES ──'}>
                        <option value="sales_tax_remittance">{fr ? 'Remise taxe de vente / TVA (FL DR-15, QST, ITBIS…)' : 'Sales tax / VAT remittance (FL DR-15, QST, ITBIS…)'}</option>
                        <option value="income_tax_remittance">{fr ? 'Remise impôt sur le revenu NR (Form 1040-NR, T1…)' : 'NR income tax remittance (Form 1040-NR, T1…)'}</option>
                        <option value="withholding_remittance">{fr ? 'Remise retenue à la source (IRS 1042-S, ARC NR4…)' : 'Withholding remittance (IRS 1042-S, ARC NR4…)'}</option>
                      </optgroup>
                    </>}
                  </select>
                </div>
              )}
            </div>

            {/* SECTION 1b: REVENU LOCATIF — compte destination */}
            {transactionFormData.type === 'loyer_locatif' && (
              <div className="border-2 border-teal-300 rounded-lg p-4 bg-teal-50">
                <label className="block text-sm font-medium text-gray-900 mb-3">{fr ? '🏦 Compte de destination *' : '🏦 Destination account *'}</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setTransactionFormData({ ...transactionFormData, target_account: 'compte_courant' })}
                    className={`px-4 py-3 rounded-lg border-2 transition-all text-left ${
                      transactionFormData.target_account === 'compte_courant'
                        ? 'border-teal-500 bg-teal-100 text-teal-900 font-semibold'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-teal-300'
                    }`}
                  >
                    🏢 {fr ? 'COMPTE COURANT' : 'CURRENT ACCOUNT'}
                    <div className="text-xs mt-1 opacity-75">{fr ? 'Le revenu va dans le compte courant' : 'Revenue goes into current account'}</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTransactionFormData({ ...transactionFormData, target_account: 'capex' })}
                    className={`px-4 py-3 rounded-lg border-2 transition-all text-left ${
                      transactionFormData.target_account === 'capex'
                        ? 'border-teal-500 bg-teal-100 text-teal-900 font-semibold'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-teal-300'
                    }`}
                  >
                    🏗️ CAPEX
                    <div className="text-xs mt-1 opacity-75">{fr ? 'Le revenu va dans la réserve CAPEX' : 'Revenue goes into CAPEX reserve'}</div>
                  </button>
                </div>
                {!transactionFormData.target_account && (
                  <p className="text-xs text-red-600 mt-2">⚠️ {fr ? 'Veuillez sélectionner un compte de destination' : 'Please select a destination account'}</p>
                )}
              </div>
            )}

            {/* SECTION 1c: PAIEMENT RÉCURRENT */}
            {transactionFormData.type === 'paiement' && (
              <div className="border-2 border-orange-300 rounded-lg p-4 bg-orange-50">
                <label className="block text-sm font-medium text-gray-900 mb-3">{fr ? '🔁 Occurrence du paiement' : '🔁 Payment occurrence'}</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <button
                    type="button"
                    onClick={() => setTransactionFormData({ ...transactionFormData, occurrence_type: 'unique', recurrence_frequency: null, recurrence_end_date: null, recurrence_no_end: false })}
                    className={`px-4 py-3 rounded-lg border-2 transition-all text-left ${
                      transactionFormData.occurrence_type !== 'récurrent'
                        ? 'border-orange-500 bg-orange-100 text-orange-900 font-semibold'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-orange-300'
                    }`}
                  >
                    1️⃣ {fr ? 'UNIQUE' : 'ONE-TIME'}
                    <div className="text-xs mt-1 opacity-75">{fr ? 'Un seul paiement' : 'Single payment'}</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTransactionFormData({ ...transactionFormData, occurrence_type: 'récurrent', recurrence_frequency: 'mensuel' })}
                    className={`px-4 py-3 rounded-lg border-2 transition-all text-left ${
                      transactionFormData.occurrence_type === 'récurrent'
                        ? 'border-orange-500 bg-orange-100 text-orange-900 font-semibold'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-orange-300'
                    }`}
                  >
                    🔁 {fr ? 'RÉCURRENT' : 'RECURRING'}
                    <div className="text-xs mt-1 opacity-75">{fr ? 'Paiements répétés' : 'Repeated payments'}</div>
                  </button>
                </div>
                {transactionFormData.occurrence_type === 'récurrent' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{fr ? 'Fréquence' : 'Frequency'}</label>
                      <select
                        value={transactionFormData.recurrence_frequency || 'mensuel'}
                        onChange={(e) => setTransactionFormData({ ...transactionFormData, recurrence_frequency: e.target.value as any })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] bg-white text-sm"
                      >
                        <option value="quotidien">{fr ? 'Quotidien' : 'Daily'}</option>
                        <option value="hebdomadaire">{fr ? 'Hebdomadaire' : 'Weekly'}</option>
                        <option value="mensuel">{fr ? 'Mensuel' : 'Monthly'}</option>
                        <option value="trimestriel">{fr ? 'Trimestriel' : 'Quarterly'}</option>
                        <option value="annuel">{fr ? 'Annuel' : 'Annual'}</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{fr ? 'Date de fin' : 'End date'}</label>
                      <input
                        type="date"
                        value={transactionFormData.recurrence_end_date || ''}
                        onChange={(e) => setTransactionFormData({ ...transactionFormData, recurrence_end_date: e.target.value || null, recurrence_no_end: false })}
                        disabled={!!transactionFormData.recurrence_no_end}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] text-sm disabled:bg-gray-100"
                      />
                      <label className="flex items-center gap-2 mt-1 text-xs text-gray-600">
                        <input
                          type="checkbox"
                          checked={!!transactionFormData.recurrence_no_end}
                          onChange={(e) => setTransactionFormData({ ...transactionFormData, recurrence_no_end: e.target.checked, recurrence_end_date: null })}
                        />
                        {fr ? 'Pas de date de fin (max 120 occurrences)' : 'No end date (max 120 occurrences)'}
                      </label>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* SECTION 1d: TRANSFERT entre courant et CAPEX */}
            {transactionFormData.type === 'transfert' && (
              <div className="border-2 border-indigo-300 rounded-lg p-4 bg-indigo-50">
                <label className="block text-sm font-medium text-gray-900 mb-3">{fr ? '↔️ Compte source du transfert *' : '↔️ Transfer source account *'}</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setTransactionFormData({ ...transactionFormData, transfer_source: 'compte_courant', target_account: 'capex' })}
                    className={`px-4 py-3 rounded-lg border-2 transition-all text-left ${
                      transactionFormData.transfer_source === 'compte_courant'
                        ? 'border-indigo-500 bg-indigo-100 text-indigo-900 font-semibold'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-indigo-300'
                    }`}
                  >
                    🏢 {fr ? 'COURANT → CAPEX' : 'CURRENT → CAPEX'}
                    <div className="text-xs mt-1 opacity-75">{fr ? 'Transférer du compte courant vers CAPEX' : 'Transfer from current account to CAPEX'}</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTransactionFormData({ ...transactionFormData, transfer_source: 'capex', target_account: 'compte_courant' })}
                    className={`px-4 py-3 rounded-lg border-2 transition-all text-left ${
                      transactionFormData.transfer_source === 'capex'
                        ? 'border-indigo-500 bg-indigo-100 text-indigo-900 font-semibold'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-indigo-300'
                    }`}
                  >
                    🏗️ {fr ? 'CAPEX → COURANT' : 'CAPEX → CURRENT'}
                    <div className="text-xs mt-1 opacity-75">{fr ? 'Transférer du CAPEX vers le compte courant' : 'Transfer from CAPEX to current account'}</div>
                  </button>
                </div>
                {!transactionFormData.transfer_source && (
                  <p className="text-xs text-red-600 mt-2">⚠️ {fr ? 'Veuillez sélectionner le sens du transfert' : 'Please select the transfer direction'}</p>
                )}
              </div>
            )}

            {/* SECTION 2: SOURCE DE L'ARGENT - NOUVEAU! */}
            <div className="border-2 border-indigo-300 rounded-lg p-4 bg-indigo-50">
              <label className="block text-sm font-medium text-gray-900 mb-3">{fr ? "💰 D'où vient l'argent? *" : '💰 Where does the money come from? *'}</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setTransactionFormData({
                    ...transactionFormData,
                    payment_source: 'compte_courant',
                    investor_payment_type: undefined,
                    affects_compte_courant: true
                  })}
                  disabled={!!transactionFormData.investor_id}
                  className={`px-4 py-3 rounded-lg border-2 transition-all ${
                    transactionFormData.payment_source === 'compte_courant'
                      ? 'border-blue-500 bg-blue-100 text-blue-900 font-semibold'
                      : transactionFormData.investor_id
                      ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-blue-300'
                  }`}
                >
                  🏢 {fr ? 'COMPTE COURANT' : 'CURRENT ACCOUNT'}
                  <div className="text-xs mt-1 opacity-75">{fr ? "L'entreprise paie" : 'Company pays'}</div>
                </button>

                <button
                  type="button"
                  onClick={() => setTransactionFormData({
                    ...transactionFormData,
                    payment_source: 'capex',
                    investor_payment_type: undefined,
                    affects_compte_courant: false
                  })}
                  disabled={!!transactionFormData.investor_id}
                  className={`px-4 py-3 rounded-lg border-2 transition-all ${
                    transactionFormData.payment_source === 'capex'
                      ? 'border-purple-500 bg-purple-100 text-purple-900 font-semibold'
                      : transactionFormData.investor_id
                      ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-purple-300'
                  }`}
                >
                  🏗️ CAPEX
                  <div className="text-xs mt-1 opacity-75">{fr ? 'Budget CAPEX' : 'CAPEX budget'}</div>
                </button>

                <button
                  type="button"
                  onClick={() => setTransactionFormData({
                    ...transactionFormData,
                    payment_source: 'investisseur_direct',
                    affects_compte_courant: false
                  })}
                  className={`px-4 py-3 rounded-lg border-2 transition-all ${
                    transactionFormData.payment_source === 'investisseur_direct' || transactionFormData.investor_id
                      ? 'border-green-500 bg-green-100 text-green-900 font-semibold'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-green-300'
                  }`}
                >
                  👤 {fr ? 'INVESTISSEUR' : 'INVESTOR'}
                  <div className="text-xs mt-1 opacity-75">{fr ? 'Payé directement' : 'Paid directly'}</div>
                </button>
              </div>
              {transactionFormData.investor_id && (
                <p className="text-xs text-green-700 mt-2">
                  {fr ? 'ℹ️ Un investisseur est sélectionné → La source est automatiquement "Investisseur direct"' : 'ℹ️ An investor is selected → Source is automatically "Direct investor"'}
                </p>
              )}
            </div>

            {/* SECTION 3: DEVISE + MONTANT + CATÉGORIE */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{fr ? '💱 Devise *' : '💱 Currency *'}</label>
                <select
                  value={transactionFormData.source_currency}
                  onChange={(e) => setTransactionFormData({ ...transactionFormData, source_currency: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent bg-white"
                >
                  <option value="CAD">CAD — Dollar canadien</option>
                  <option value="USD">USD — Dollar américain</option>
                  <option value="DOP">DOP — Peso dominicain</option>
                  <option value="EUR">EUR — Euro</option>
                  <option value="MXN">MXN — Peso mexicain</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {fr ? `💵 Montant (${transactionFormData.source_currency}) *` : `💵 Amount (${transactionFormData.source_currency}) *`}
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={transactionFormData.amount}
                  onFocus={(e) => { if (Number(transactionFormData.amount) === 0) e.target.select() }}
                  onChange={(e) => {
                    let value = e.target.value.replace(',', '.')
                    if (value === '' || value === '.' || value === '-' || /^-?\d*\.?\d*$/.test(value)) {
                      setTransactionFormData({ ...transactionFormData, amount: value as any })
                    }
                  }}
                  onBlur={(e) => {
                    const numValue = parseFloat(e.target.value) || 0
                    setTransactionFormData({ ...transactionFormData, amount: numValue })
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{fr ? "📂 Catégorie (Où va l'argent) *" : '📂 Category (Where does money go) *'}</label>
                <select
                  value={transactionFormData.category}
                  onChange={(e) => setTransactionFormData({
                    ...transactionFormData,
                    category: e.target.value,
                    // Reset property si on quitte la catégorie Projet
                    property_id: e.target.value === 'projet' ? transactionFormData.property_id : null
                  })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent bg-white"
                  required
                >
                  <option value="projet">{fr ? '🏠 Projet (Propriété)' : '🏠 Project (Property)'}</option>
                  <option value="capex">{fr ? '🏗️ CAPEX (Transfert réserve)' : '🏗️ CAPEX (Reserve transfer)'}</option>
                  <option value="operation">{fr ? '⚙️ Opération (Coûts opération)' : '⚙️ Operation (Operating costs)'}</option>
                  <option value="maintenance">{fr ? '🔧 Maintenance (Coûts opération)' : '🔧 Maintenance (Operating costs)'}</option>
                  <option value="admin">{fr ? '📋 Administration (Coûts opération)' : '📋 Administration (Operating costs)'}</option>
                </select>
              </div>
            </div>

            {/* SECTION 4: SÉLECTEUR PROPRIÉTÉ (Visible seulement si catégorie = Projet) */}
            {transactionFormData.category === 'projet' && (
              <div className="border-2 border-yellow-300 rounded-lg p-4 bg-yellow-50">
                <label className="block text-sm font-medium text-gray-900 mb-2">{fr ? '🏠 Propriété associée *' : '🏠 Associated property *'}</label>
                <select
                  value={transactionFormData.property_id || ''}
                  onChange={(e) => setTransactionFormData({
                    ...transactionFormData,
                    property_id: e.target.value || null,
                    payment_schedule_id: null
                  })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent bg-white"
                  required
                >
                  <option value="">{fr ? '-- Sélectionner une propriété --' : '-- Select a property --'}</option>
                  {properties.map(prop => (
                    <option key={prop.id} value={prop.id}>
                      {prop.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* SECTION 5: DÉTAILS TRANSACTION */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{fr ? '💳 Méthode de paiement *' : '💳 Payment method *'}</label>
                <select
                  value={transactionFormData.payment_method}
                  onChange={(e) => setTransactionFormData({ ...transactionFormData, payment_method: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent bg-white"
                  required
                >
                  <option value="virement">{fr ? 'Virement' : 'Wire transfer'}</option>
                  <option value="cheque">{fr ? 'Chèque' : 'Cheque'}</option>
                  <option value="especes">{fr ? 'Espèces' : 'Cash'}</option>
                  <option value="carte">{fr ? 'Carte' : 'Card'}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{fr ? '✅ Statut *' : '✅ Status *'}</label>
                <select
                  value={transactionFormData.status}
                  onChange={(e) => setTransactionFormData({ ...transactionFormData, status: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent bg-white"
                  required
                >
                  <option value="complete">{fr ? 'Complété' : 'Completed'}</option>
                  <option value="en_attente">{fr ? 'En attente' : 'Pending'}</option>
                  <option value="annule">{fr ? 'Annulé' : 'Cancelled'}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{fr ? '👤 Investisseur (optionnel)' : '👤 Investor (optional)'}</label>
                <select
                  value={transactionFormData.investor_id || ''}
                  onChange={(e) => {
                    const investorId = e.target.value || null
                    setTransactionFormData({
                      ...transactionFormData,
                      investor_id: investorId,
                      // Si investisseur sélectionné, forcer source à "investisseur_direct"
                      payment_source: investorId ? 'investisseur_direct' : 'compte_courant',
                      affects_compte_courant: !investorId
                    })
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent bg-white"
                >
                  <option value="">{fr ? 'Aucun' : 'None'}</option>
                  {investors.map(inv => (
                    <option key={inv.id} value={inv.id}>
                      {inv.first_name} {inv.last_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* SECTION 6: SI INVESTISSEUR SÉLECTIONNÉ - Type de paiement */}
            {transactionFormData.investor_id && (
              <div className="border-2 border-green-300 rounded-lg p-4 bg-green-50">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">{fr ? '💰 Type de paiement investisseur' : '💰 Investor payment type'}</h4>
                <p className="text-xs text-gray-600 mb-3">{fr ? "L'investisseur paie directement - précisez le type:" : 'The investor pays directly — specify the type:'}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setTransactionFormData({
                      ...transactionFormData,
                      investor_payment_type: 'achat_parts'
                    })}
                    className={`px-4 py-3 rounded-lg border-2 transition-all text-left ${
                      transactionFormData.investor_payment_type === 'achat_parts'
                        ? 'border-purple-500 bg-purple-100 text-purple-900 font-semibold'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-purple-300'
                    }`}
                  >
                    💵 {fr ? 'ACHAT DE PARTS' : 'SHARE PURCHASE'}
                    <div className="text-xs mt-1 opacity-75">{fr ? "L'investisseur achète des parts avec son propre argent" : 'The investor purchases shares with their own money'}</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTransactionFormData({
                      ...transactionFormData,
                      investor_payment_type: 'dette_a_rembourser'
                    })}
                    className={`px-4 py-3 rounded-lg border-2 transition-all text-left ${
                      transactionFormData.investor_payment_type === 'dette_a_rembourser'
                        ? 'border-orange-500 bg-orange-100 text-orange-900 font-semibold'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-orange-300'
                    }`}
                  >
                    📝 {fr ? 'DETTE À REMBOURSER' : 'DEBT TO REPAY'}
                    <div className="text-xs mt-1 opacity-75">{fr ? "L'entreprise doit rembourser cet investisseur" : 'The company must repay this investor'}</div>
                  </button>
                </div>

                {transactionFormData.investor_payment_type === 'dette_a_rembourser' && (
                  <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <p className="text-xs text-orange-800">
                      {fr ? '⚠️ Une dette sera automatiquement créée pour cet investisseur. Elle apparaîtra dans le tableau des dettes à rembourser.' : '⚠️ A debt will be automatically created for this investor. It will appear in the debt repayment table.'}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* SECTION 7: PAIEMENT PROGRAMMÉ (si propriété sélectionnée) */}
            {transactionFormData.property_id && (
              <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {fr ? 'Paiement lié (optionnel)' : 'Linked payment (optional)'}
                    </label>
                    <select
                      value={transactionFormData.payment_schedule_id || ''}
                      onChange={(e) => setTransactionFormData({ ...transactionFormData, payment_schedule_id: e.target.value || null, payment_completion_status: e.target.value ? 'full' : null })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent bg-white"
                    >
                      <option value="">{fr ? 'Aucun paiement lié' : 'No linked payment'}</option>
                      {paymentSchedules
                        .filter(ps => ps.property_id === transactionFormData.property_id && (ps.status === 'pending' || ps.status === 'overdue'))
                        .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
                        .map(payment => {
                          const dueDate = new Date(payment.due_date)
                          const today = new Date()
                          const isOverdue = dueDate < today
                          return (
                            <option key={payment.id} value={payment.id}>
                              {payment.term_label} - {payment.amount.toLocaleString('fr-CA', { style: 'currency', currency: payment.currency })}
                              {' '}({dueDate.toLocaleDateString('fr-CA')})
                              {isOverdue ? (fr ? ' 🔴 EN RETARD' : ' 🔴 OVERDUE') : ''}
                            </option>
                          )
                        })
                      }
                    </select>
                  </div>

                  {/* Statut du paiement lié */}
                  {transactionFormData.payment_schedule_id && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {fr ? 'Statut du paiement' : 'Payment status'}
                      </label>
                      <select
                        value={transactionFormData.payment_completion_status || 'full'}
                        onChange={(e) => setTransactionFormData({ ...transactionFormData, payment_completion_status: e.target.value as 'full' | 'partial' })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent bg-white"
                      >
                        <option value="full">{fr ? '✅ Paiement complet - Le paiement sera marqué comme "payé"' : '✅ Full payment - The payment will be marked as "paid"'}</option>
                        <option value="partial">{fr ? '⚠️ Paiement partiel - Le paiement restera "en attente"' : '⚠️ Partial payment - The payment will remain "pending"'}</option>
                      </select>
                      {transactionFormData.payment_completion_status === 'full' && (
                        <p className="mt-1 text-xs text-green-600">
                          {fr ? '✓ Ce paiement sera automatiquement marqué comme "payé" lors de l\'enregistrement de la transaction.' : '✓ This payment will be automatically marked as "paid" when the transaction is saved.'}
                        </p>
                      )}
                      {transactionFormData.payment_completion_status === 'partial' && (
                        <p className="mt-1 text-xs text-orange-600">
                          {fr ? '⚠️ Ce paiement restera en attente. Vous pourrez créer une autre transaction pour compléter le paiement.' : '⚠️ This payment will remain pending. You can create another transaction to complete the payment.'}
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}

            {/* SECTION 8: DESCRIPTION ET RÉFÉRENCE */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">📝 Description *</label>
                <textarea
                  value={transactionFormData.description}
                  onChange={(e) => setTransactionFormData({ ...transactionFormData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                  rows={3}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{fr ? '🔢 Numéro de référence' : '🔢 Reference number'}</label>
                <input
                  type="text"
                  value={transactionFormData.reference_number}
                  onChange={(e) => setTransactionFormData({ ...transactionFormData, reference_number: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                  placeholder="Ex: TRX-2025-001"
                />
              </div>
            </div>

            {/* Section Fiscalité Internationale */}
            <div className="pt-4 border-t border-gray-200">
              <h4 className="text-sm sm:text-base font-semibold text-gray-900 mb-3">{fr ? 'Fiscalité Internationale (Optionnel)' : 'International Taxation (Optional)'}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                {/* Conversion de devise — visible seulement si non-CAD */}
                {transactionFormData.source_currency !== 'CAD' && (<>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {fr ? `Montant en ${transactionFormData.source_currency} (original)` : `Amount in ${transactionFormData.source_currency} (original)`}
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={transactionFormData.source_amount ?? ''}
                      onChange={(e) => {
                        let value = e.target.value.replace(',', '.')
                        if (value === '' || value === '.' || /^\d*\.?\d*$/.test(value)) {
                          setTransactionFormData({ ...transactionFormData, source_amount: value === '' ? null : value as any })
                        }
                      }}
                      onBlur={(e) => {
                        const sourceAmount = e.target.value ? parseFloat(e.target.value) : null
                        setTransactionFormData({ ...transactionFormData, source_amount: sourceAmount })

                        // Calculer automatiquement le taux de change
                        if (sourceAmount && typeof transactionFormData.amount === 'number' && transactionFormData.amount > 0) {
                          const rate = transactionFormData.amount / sourceAmount
                          setTransactionFormData(prev => ({ ...prev, exchange_rate: parseFloat(rate.toFixed(4)) }))
                        }
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                      placeholder={fr ? 'Montant original' : 'Original amount'}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{fr ? 'Frais bancaires/conversion (CAD $)' : 'Bank/conversion fees (CAD $)'}</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={transactionFormData.bank_fees}
                      onChange={(e) => {
                        let value = e.target.value.replace(',', '.')
                        if (value === '' || value === '.' || /^\d*\.?\d*$/.test(value)) {
                          setTransactionFormData({ ...transactionFormData, bank_fees: value === '' ? 0 : value as any })
                        }
                      }}
                      onBlur={(e) => {
                        const bankFees = parseFloat(e.target.value) || 0
                        setTransactionFormData({ ...transactionFormData, bank_fees: bankFees })

                        // Recalculer le taux avec les frais
                        if (typeof transactionFormData.source_amount === 'number' && transactionFormData.source_amount > 0) {
                          const amount = typeof transactionFormData.amount === 'number' ? transactionFormData.amount : parseFloat(transactionFormData.amount as any) || 0
                          const amountMinusFees = amount - bankFees
                          const rate = amountMinusFees / transactionFormData.source_amount
                          setTransactionFormData(prev => ({ ...prev, exchange_rate: parseFloat(rate.toFixed(4)) }))
                        }
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{fr ? 'Taux de change (calculé auto)' : 'Exchange rate (auto-calculated)'}</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={transactionFormData.exchange_rate}
                      onChange={(e) => {
                        let value = e.target.value.replace(',', '.')
                        if (value === '' || value === '.' || /^\d*\.?\d*$/.test(value)) {
                          setTransactionFormData({ ...transactionFormData, exchange_rate: value === '' ? 1 : value as any })
                        }
                      }}
                      onBlur={(e) => {
                        const numValue = parseFloat(e.target.value) || 1
                        setTransactionFormData({ ...transactionFormData, exchange_rate: numValue })
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent bg-gray-50"
                      placeholder="1.0000"
                    />
                    <p className="text-xs text-gray-500 mt-1">{fr ? 'Se calcule automatiquement ou modifiable manuellement' : 'Auto-calculated or manually editable'}</p>
                  </div>
                </>)}

                {/* ── Juridiction fiscale ─────────────────────────────── */}
                <div className="sm:col-span-2 border-t border-dashed border-gray-300 pt-4 mt-2">
                  <h5 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    🏛️ {fr ? 'Juridiction fiscale' : 'Tax Jurisdiction'}
                    <span className="text-xs font-normal text-gray-500">{fr ? '— taux chargés depuis la base de données' : '— rates loaded from database'}</span>
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Pays */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{fr ? 'Pays' : 'Country'}</label>
                      <select
                        value={transactionFormData.tax_country || ''}
                        onChange={e => setTransactionFormData(f => ({
                          ...f, tax_country: e.target.value || null,
                          tax_state_province: null,
                          source_country: e.target.value === 'CA' ? 'Canada' : e.target.value === 'US' ? 'États-Unis' : e.target.value === 'DO' ? 'République Dominicaine' : e.target.value === 'MX' ? 'Mexique' : f.source_country
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] bg-white text-sm"
                      >
                        <option value="">— {fr ? 'Sélectionner' : 'Select'} —</option>
                        <option value="CA">🇨🇦 Canada</option>
                        <option value="US">🇺🇸 États-Unis</option>
                        <option value="DO">🇩🇴 Rép. Dominicaine</option>
                        <option value="MX">🇲🇽 Mexique</option>
                        <option value="OTHER">{fr ? 'Autre pays' : 'Other country'}</option>
                      </select>
                    </div>

                    {/* État / Province (conditionnel) */}
                    {transactionFormData.tax_country === 'US' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{fr ? 'État' : 'State'}</label>
                        <select
                          value={transactionFormData.tax_state_province || ''}
                          onChange={e => setTransactionFormData(f => ({ ...f, tax_state_province: e.target.value || null }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] bg-white text-sm"
                        >
                          <option value="">— {fr ? 'État' : 'State'} —</option>
                          <option value="FL">Floride (FL) — 6% sales tax, pas d'impôt revenu</option>
                          <option value="NY">New York (NY) — 4% + 6.85% impôt NR</option>
                          <option value="CA">Californie (CA) — 13.3% impôt NR</option>
                          <option value="TX">Texas (TX) — 6% sales tax, pas d'impôt revenu</option>
                          <option value="NV">Nevada (NV) — pas d'impôt revenu</option>
                          <option value="WA">Washington — pas d'impôt revenu</option>
                          <option value="OTHER_US">{fr ? 'Autre état' : 'Other state'}</option>
                        </select>
                      </div>
                    )}
                    {transactionFormData.tax_country === 'CA' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{fr ? 'Province' : 'Province'}</label>
                        <select
                          value={transactionFormData.tax_state_province || ''}
                          onChange={e => setTransactionFormData(f => ({ ...f, tax_state_province: e.target.value || null }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] bg-white text-sm"
                        >
                          <option value="">— Province —</option>
                          <option value="QC">Québec (QC) — 14.5% NR + QST</option>
                          <option value="ON">Ontario (ON) — 11.16% NR</option>
                          <option value="BC">Colombie-Britannique (BC) — 12.29% NR</option>
                          <option value="AB">Alberta (AB) — pas d'impôt provincial</option>
                        </select>
                      </div>
                    )}

                    {/* Type de location (si revenu) */}
                    {txDirection === 'revenu' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{fr ? 'Type de location' : 'Rental type'}</label>
                        <select
                          value={transactionFormData.rental_type || ''}
                          onChange={e => setTransactionFormData(f => ({ ...f, rental_type: (e.target.value || null) as any }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] bg-white text-sm"
                        >
                          <option value="">—</option>
                          <option value="short_term">
                            {fr ? 'Court terme (taxe de vente applicable)' : 'Short term (sales tax applies)'}
                          </option>
                          <option value="long_term">
                            {fr ? 'Long terme (location résidentielle)' : 'Long term (residential rental)'}
                          </option>
                        </select>
                      </div>
                    )}

                    {/* Statut fiscal propriétaire */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{fr ? 'Statut fiscal propriétaire' : 'Owner fiscal status'}</label>
                      <select
                        value={transactionFormData.owner_fiscal_status || ''}
                        onChange={e => setTransactionFormData(f => ({ ...f, owner_fiscal_status: (e.target.value || null) as any }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] bg-white text-sm"
                      >
                        <option value="">—</option>
                        <option value="resident">{fr ? 'Résident' : 'Resident'}</option>
                        <option value="non_resident">{fr ? 'Non-résident' : 'Non-resident'}</option>
                        <option value="foreign_entity">{fr ? 'Entité étrangère' : 'Foreign entity'}</option>
                      </select>
                    </div>

                    {/* Flags DR / Mexique */}
                    {(transactionFormData.tax_country === 'MX' || transactionFormData.tax_country === 'DO') && (
                      <div className="flex flex-wrap gap-4 items-center">
                        <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                          <input type="checkbox" checked={!!transactionFormData.is_furnished}
                            onChange={e => setTransactionFormData(f => ({ ...f, is_furnished: e.target.checked }))}
                            className="rounded"
                          />
                          {fr ? 'Location meublée' : 'Furnished rental'}
                          {transactionFormData.tax_country === 'MX' && <span className="text-xs text-orange-600">(IVA 16%)</span>}
                        </label>
                        {transactionFormData.tax_country === 'DO' && (
                          <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                            <input type="checkbox" checked={!!transactionFormData.is_confotur}
                              onChange={e => setTransactionFormData(f => ({ ...f, is_confotur: e.target.checked }))}
                              className="rounded"
                            />
                            Confotur <span className="text-xs text-green-600">(exonération ~15 ans)</span>
                          </label>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Ventilation fiscale calculée (read-only) */}
                {taxBreakdown && (taxBreakdown.salesTax > 0 || taxBreakdown.stateTax > 0 || taxBreakdown.federalWithholding > 0) && (
                  <div className="sm:col-span-2 bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <h5 className="text-sm font-semibold text-amber-900 mb-3">
                      📊 {fr ? 'Ventilation fiscale estimée' : 'Estimated tax breakdown'}
                      {taxBreakdown.isConfoturExempt && <span className="ml-2 text-green-700 font-normal">(Confotur — exonéré)</span>}
                    </h5>
                    <div className="space-y-2 text-sm">
                      {taxBreakdown.salesTax > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-amber-800">{taxBreakdown.salesLabel || (fr ? 'Taxe de vente / TVA' : 'Sales tax / VAT')}</span>
                          <span className="font-semibold text-amber-900">
                            {taxBreakdown.salesTax.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD' })}
                          </span>
                        </div>
                      )}
                      {taxBreakdown.stateTax > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-amber-800">{taxBreakdown.stateLabel || (fr ? 'Impôt État/Province' : 'State/Province tax')}</span>
                          <span className="font-semibold text-amber-900">
                            {taxBreakdown.stateTax.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD' })}
                          </span>
                        </div>
                      )}
                      {taxBreakdown.federalWithholding > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-amber-800">{taxBreakdown.federalLabel || (fr ? 'Retenue fédérale (NR)' : 'Federal withholding (NR)')}</span>
                          <span className="font-semibold text-amber-900">
                            {taxBreakdown.federalWithholding.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD' })}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between items-center border-t border-amber-300 pt-2 mt-2">
                        <span className="font-semibold text-amber-900">{fr ? 'Total taxes estimées' : 'Total estimated taxes'}</span>
                        <span className="font-bold text-amber-900">
                          {taxBreakdown.total.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD' })}
                        </span>
                      </div>
                    </div>
                    {taxBreakdown.filingNote && (
                      <p className="mt-3 text-xs text-amber-700 border-t border-amber-200 pt-2">
                        📅 {fr ? 'Échéance :' : 'Deadline:'} {taxBreakdown.filingNote}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-amber-600 italic">
                      ⚠️ {fr ? 'Estimation à titre indicatif — faire valider par un CPA.' : 'Indicative estimate — validate with a CPA.'}
                    </p>
                  </div>
                )}

                {/* ── Conformité en 1 clic ─────────────────────────────── */}
                {(() => {
                  const isRevenu = txDirection === 'revenu'
                  const hasTaxCountry = !!transactionFormData.tax_country
                  const checks = [
                    { ok: !!transactionFormData.fiscal_category, label: fr ? 'Catégorie fiscale' : 'Fiscal category' },
                    { ok: hasTaxCountry, label: fr ? 'Pays/juridiction' : 'Tax country' },
                    { ok: transactionFormData.source_currency === 'CAD' || !!transactionFormData.source_amount, label: fr ? 'Montant source (si devise ≠ CAD)' : 'Source amount (if non-CAD)' },
                    { ok: !isRevenu || !hasTaxCountry || !!transactionFormData.rental_type, label: fr ? 'Type de location (revenu)' : 'Rental type (income)' },
                    { ok: !isRevenu || !hasTaxCountry || !!transactionFormData.owner_fiscal_status, label: fr ? 'Statut fiscal propriétaire' : 'Owner fiscal status' },
                    { ok: !!transactionFormData.description, label: fr ? 'Description' : 'Description' },
                    { ok: !['management_fee','professional_fees','insurance'].includes(transactionFormData.fiscal_category||'') || !!transactionFormData.vendor_name, label: fr ? 'Fournisseur (OPEX)' : 'Vendor (OPEX)' },
                  ]
                  const score = checks.filter(c => c.ok).length
                  const pct = Math.round((score / checks.length) * 100)
                  const color = pct === 100 ? 'green' : pct >= 70 ? 'amber' : 'red'
                  const bgCls = color === 'green' ? 'bg-green-50 border-green-200' : color === 'amber' ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'
                  const textCls = color === 'green' ? 'text-green-800' : color === 'amber' ? 'text-amber-800' : 'text-red-800'
                  const barCls = color === 'green' ? 'bg-green-500' : color === 'amber' ? 'bg-amber-500' : 'bg-red-500'
                  return (
                    <div className={`sm:col-span-2 border rounded-xl p-3 ${bgCls}`}>
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`text-xs font-semibold ${textCls}`}>
                          {fr ? `Conformité fiscale : ${score}/${checks.length}` : `Fiscal compliance: ${score}/${checks.length}`}
                        </span>
                        <div className="flex-1 bg-white/60 rounded-full h-1.5">
                          <div className={`h-1.5 rounded-full transition-all ${barCls}`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className={`text-xs font-bold ${textCls}`}>{pct}%</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
                        {checks.map((c, i) => (
                          <div key={i} className="flex items-center gap-1 text-xs">
                            <span className="text-base">{c.ok ? '✅' : '⬜'}</span>
                            <span className={c.ok ? 'text-gray-500 line-through' : `font-medium ${textCls}`}>{c.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })()}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{fr ? 'Impôt étranger payé (CAD $)' : 'Foreign tax paid (CAD $)'}</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={transactionFormData.foreign_tax_paid}
                    onChange={(e) => {
                      let value = e.target.value.replace(',', '.')
                      if (value === '' || value === '.' || /^\d*\.?\d*$/.test(value)) {
                        setTransactionFormData({ ...transactionFormData, foreign_tax_paid: value === '' ? 0 : value as any })
                      }
                    }}
                    onBlur={(e) => {
                      const numValue = parseFloat(e.target.value) || 0
                      setTransactionFormData({ ...transactionFormData, foreign_tax_paid: numValue })
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{fr ? 'Taux impôt étranger (%)' : 'Foreign tax rate (%)'}</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={transactionFormData.foreign_tax_rate}
                    onChange={(e) => {
                      let value = e.target.value.replace(',', '.')
                      if (value === '' || value === '.' || /^\d*\.?\d*$/.test(value)) {
                        setTransactionFormData({ ...transactionFormData, foreign_tax_rate: value === '' ? 0 : value as any })
                      }
                    }}
                    onBlur={(e) => {
                      const numValue = parseFloat(e.target.value) || 0
                      setTransactionFormData({ ...transactionFormData, foreign_tax_rate: numValue })
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>

                {/* Lier une facture Gmail */}
                {gmailInvoices.length > 0 && (
                  <div className="sm:col-span-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-4">
                    <label className="block text-sm font-semibold text-blue-800 dark:text-blue-300 mb-3">
                      {fr ? '📬 Associer une facture Gmail (optionnel)' : '📬 Link a Gmail invoice (optional)'}
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{fr ? 'Facture Gmail non assignée' : 'Unassigned Gmail invoice'}</label>
                        <select
                          value={linkedGmailId}
                          onChange={e => {
                            const id = e.target.value
                            setLinkedGmailId(id)
                            if (id) {
                              const inv = gmailInvoices.find(i => i.id === id)
                              if (inv && !transactionFormData.vendor_name) {
                                setTransactionFormData(f => ({ ...f, vendor_name: inv.vendor_name }))
                              }
                            }
                          }}
                          className="w-full px-3 py-2 text-sm border border-blue-300 dark:border-blue-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                          <option value="">{fr ? '— Aucune —' : '— None —'}</option>
                          {gmailInvoices.map(inv => (
                            <option key={inv.id} value={inv.id}>
                              {inv.document_date ?? '?'} · {inv.vendor_name ?? 'Inconnu'} · {inv.amount ? `${inv.amount} ${inv.currency ?? 'CAD'}` : '—'} [{inv.category === 'FACTURE' ? 'Facture' : 'Reçu'}]
                            </option>
                          ))}
                        </select>
                      </div>
                      {linkedGmailId && (
                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{fr ? 'Assigner à la compagnie' : 'Assign to company'}</label>
                          <select
                            value={linkedGmailCompany}
                            onChange={e => setLinkedGmailCompany(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-blue-300 dark:border-blue-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
                          >
                            <option value="CERDIA Globale">CERDIA Globale</option>
                            <option value="CERDIA S.E.C.">CERDIA S.E.C.</option>
                            <option value="Commerce CERDIA">Commerce CERDIA</option>
                          </select>
                          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                            {fr ? '✓ La facture sera assignée et retirée de la liste "À classer"' : '✓ The invoice will be assigned and removed from the "To classify" list'}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{fr ? 'Nom du vendeur/compagnie' : 'Vendor/company name'}</label>
                  <input
                    type="text"
                    value={transactionFormData.vendor_name || ''}
                    onChange={(e) => setTransactionFormData({ ...transactionFormData, vendor_name: e.target.value || null })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                    placeholder={fr ? 'Nom du fournisseur' : 'Supplier name'}
                  />
                </div>

                {/* Crédit impôt calculé automatiquement (read-only) */}
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">{fr ? "Crédit d'impôt réclamable (calculé auto)" : 'Claimable tax credit (auto-calculated)'}</label>
                  <input
                    type="number"
                    value={transactionFormData.tax_credit_claimable}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                    readOnly
                    disabled
                  />
                  <p className="text-xs text-gray-500 mt-1">{fr ? 'Ce montant est calculé automatiquement par le système' : 'This amount is automatically calculated by the system'}</p>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">{fr ? 'Notes comptable' : 'Accounting notes'}</label>
                  <textarea
                    value={transactionFormData.accountant_notes || ''}
                    onChange={(e) => setTransactionFormData({ ...transactionFormData, accountant_notes: e.target.value || null })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                    rows={2}
                    placeholder={fr ? 'Notes pour le comptable...' : 'Notes for accountant...'}
                  />
                </div>
              </div>
            </div>

            {/* Section Pièces Jointes */}
            <div className="pt-4 border-t border-gray-200">
              <h4 className="text-sm sm:text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Paperclip size={18} />
                {fr ? 'Pièces Jointes' : 'Attachments'}
              </h4>

              {editingTransactionId ? (
                <div className="space-y-4">
                  {/* Pièce jointe legacy (ancienne, 1 seul fichier) — rétrocompatibilité */}
                  {transactionFormData.attachment_storage_path && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-xs font-medium text-yellow-700 mb-2">{fr ? 'Ancienne pièce jointe (format précédent)' : 'Legacy attachment (previous format)'}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <FileText size={18} className="text-yellow-600 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">{transactionFormData.attachment_name}</p>
                            <p className="text-xs text-gray-500">
                              {transactionFormData.attachment_size
                                ? `${(transactionFormData.attachment_size / 1024).toFixed(1)} KB`
                                : ''}
                              {transactionFormData.attachment_uploaded_at
                                ? ` • ${new Date(transactionFormData.attachment_uploaded_at).toLocaleDateString('fr-CA')}`
                                : ''}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm('Supprimer cet ancien fichier ?')) {
                              setTransactionFormData({
                                ...transactionFormData,
                                attachment_name: null,
                                attachment_url: null,
                                attachment_storage_path: null,
                                attachment_mime_type: null,
                                attachment_size: null,
                                attachment_uploaded_at: null
                              })
                            }
                          }}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                          title={fr ? 'Supprimer' : 'Delete'}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  )}
                  {/* Gestionnaire multi-fichiers (nouveau système) */}
                  <TransactionAttachmentsManager transactionId={editingTransactionId} />
                </div>
              ) : (
                /* Mode création : sélecteur multi-fichiers en attente */
                <div className="space-y-3">
                  <p className="text-xs text-gray-500">{fr ? 'Les pièces jointes seront uploadées après la création de la transaction.' : 'Attachments will be uploaded after the transaction is created.'}</p>
                  <input
                    type="file"
                    multiple
                    accept="*/*"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || [])
                      const valid = files.filter(f => {
                        if (f.size > 10 * 1024 * 1024) {
                          alert(fr ? `"${f.name}" dépasse 10 MB et ne sera pas ajouté.` : `"${f.name}" exceeds 10 MB and will not be added.`)
                          return false
                        }
                        return true
                      })
                      setPendingFiles(prev => [...prev, ...valid])
                      e.target.value = ''
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#5e5e5e] file:text-white hover:file:bg-[#3e3e3e] file:cursor-pointer"
                  />
                  {pendingFiles.length > 0 && (
                    <div className="space-y-1.5">
                      {pendingFiles.map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg text-sm">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <FileText size={14} className="text-gray-400 flex-shrink-0" />
                            <span className="truncate text-gray-900">{file.name}</span>
                            <span className="text-xs text-gray-400 flex-shrink-0">({(file.size / 1024).toFixed(1)} KB)</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setPendingFiles(prev => prev.filter((_, i) => i !== idx))}
                            className="ml-2 p-1 text-red-500 hover:bg-red-50 rounded transition-colors flex-shrink-0"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-gray-400">{fr ? 'Tous formats acceptés • Max 10 MB par fichier' : 'All formats accepted • Max 10 MB per file'}</p>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <button
                type="submit"
                disabled={loading || uploadingAttachment}
                className="w-full sm:w-auto bg-[#5e5e5e] hover:bg-[#3e3e3e] text-white px-6 py-2 rounded-full transition-colors disabled:opacity-50"
              >
                {uploadingAttachment
                  ? t('admin.tx.uploading')
                  : loading
                  ? t('common.saving')
                  : editingTransactionId
                  ? t('common.edit')
                  : t('common.add')}
              </button>
              <button
                type="button"
                onClick={resetTransactionForm}
                className="w-full sm:w-auto bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-2 rounded-full transition-colors"
              >
                {t('common.cancel')}
              </button>
            </div>
          </form>
          </div>
        </div>
      )}

      {/* Liste des transactions */}
      {filteredTransactions.length === 0 ? (
        <div className="bg-white p-12 rounded-lg shadow-md text-center">
          <DollarSign size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('transactions.noTransactions')}</h3>
          <p className="text-gray-600 mb-4">
            {isFiltered
              ? t('transactions.noMatch')
              : t('transactions.addFirst')}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full min-w-[640px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('transactions.date')}</th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('transactions.type')}</th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('transactions.description')}</th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('transactions.amount')}</th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('transactions.status')}</th>
                  <th className="px-3 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">{t('admin.tx.attachmentCol')}</th>
                  <th className="sticky right-0 z-10 bg-gray-50 px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider shadow-[-8px_0_8px_-6px_rgba(0,0,0,0.1)]">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTransactions.map((transaction) => {
                  const investor = investors.find(i => i.id === transaction.investor_id)
                  const property = properties.find(p => p.id === transaction.property_id)

                  return (
                    <tr key={transaction.id} className="group hover:bg-gray-50 transition-colors">
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-900">
                          <Calendar size={14} className="text-gray-400 hidden sm:inline" />
                          {new Date(transaction.date).toLocaleDateString('fr-CA')}
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                        {getTypeBadge(transaction.type)}
                        {transaction.fiscal_category ? (
                          <div className="mt-1">
                            <span className="inline-block px-1.5 py-0.5 text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 rounded">
                              {({
                                rental_income: 'Rev. locatif', dividend_income: 'Dividende', interest_income: 'Intérêts reçus', other_income: 'Autre revenu',
                                management_fee: 'Gest.', insurance: 'Assurance', property_tax: 'Taxes fonc.', condo_fees: 'Condo', utilities: 'Services pub.', maintenance_repair: 'Entretien', professional_fees: 'Honoraires', advertising: 'Publicité', travel: 'Déplacement', interest_expense: 'Intérêts hyp.', bank_fees: 'Frais banc.', other_opex: 'Autre OPEX',
                                sales_tax_remittance: '🧾 Remise taxe vente', income_tax_remittance: '🏛️ Remise impôt NR', withholding_remittance: '🏦 Remise retenue',
                                property_purchase: 'Achat propriété', renovation: 'Rénovation', equipment: 'Équipements', furnishing: 'Ameublement', acquisition_costs: "Frais acquis.", land_improvement: 'Amél. terrain', other_capex: 'Autre CAPEX',
                                loan_principal: 'Rembours. prêt', investor_capital: 'Capital inv.', investor_repayment: 'Rembours. inv.',
                              } as Record<string, string>)[transaction.fiscal_category] || transaction.fiscal_category}
                            </span>
                          </div>
                        ) : (
                          <div className="mt-1">
                            <span className="inline-block px-1.5 py-0.5 text-[10px] font-medium bg-amber-50 text-amber-600 border border-amber-200 rounded">
                              ⚠ cat. fiscale?
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-3 sm:px-6 py-4 max-w-[220px]">
                        <div className="group relative">
                          <div className="text-xs sm:text-sm font-medium text-gray-900 truncate cursor-default" title={transaction.description}>
                            {transaction.description}
                          </div>
                          <div className="pointer-events-none absolute left-0 top-full z-30 mt-1 hidden w-72 rounded-lg bg-gray-900 px-3 py-2 text-xs text-white shadow-xl group-hover:block whitespace-normal break-words">
                            {transaction.description}
                          </div>
                        </div>
                        {investor && (
                          <div className="text-xs text-gray-500 truncate">{fr ? 'Investisseur' : 'Investor'}: {investor.first_name} {investor.last_name}</div>
                        )}
                        {property && (
                          <div className="text-xs text-gray-500 truncate">{fr ? 'Propriété' : 'Property'}: {property.name}</div>
                        )}
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                        <div className={`flex items-center gap-1 text-xs sm:text-sm font-semibold ${
                          TX_REVENU_TYPES.includes(transaction.type) ? 'text-green-600' :
                          transaction.type === 'transfert' ? 'text-indigo-600' : 'text-red-600'
                        }`}>
                          {getTypeIcon(transaction.type)}
                          {Math.abs(transaction.amount).toLocaleString('fr-CA', { style: 'currency', currency: 'CAD' })}
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          transaction.status === 'complete' ? 'bg-green-100 text-green-800' :
                          transaction.status === 'en_attente' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {transaction.status === 'complete' ? (fr ? 'Complété' : 'Completed') :
                           transaction.status === 'en_attente' ? (fr ? 'En attente' : 'Pending') : (fr ? 'Annulé' : 'Cancelled')}
                        </span>
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-center">
                        {(() => {
                          const newCount = attachmentCounts[transaction.id] || 0
                          const hasLegacy = !!transaction.attachment_storage_path
                          const total = newCount + (hasLegacy ? 1 : 0)
                          if (total === 0) return <span className="text-gray-400 text-xs">-</span>
                          return (
                            <button
                              onClick={() => handleEditTransaction(transaction)}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors text-xs font-medium"
                              title={`${total} pièce(s) jointe(s) — cliquer pour gérer`}
                            >
                              <Paperclip size={14} />
                              <span>{total}</span>
                            </button>
                          )
                        })()}
                      </td>
                      <td className="sticky right-0 z-10 bg-white group-hover:bg-gray-50 px-3 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-medium shadow-[-8px_0_8px_-6px_rgba(0,0,0,0.08)]">
                        <div className="flex items-center justify-end gap-1 sm:gap-2">
                          <button
                            onClick={() => handleEditTransaction(transaction)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title={fr ? 'Modifier' : 'Edit'}
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteTransaction(transaction.id, transaction.description)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title={fr ? 'Supprimer' : 'Delete'}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      </div>}
    </div>
  )

  const renderCompteCourantTab = () => {
    // État pour le compte courant
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
    const [compteCourant, setCompteCourant] = useState<any>(null)
    const [byProject, setByProject] = useState<any[]>([])
    const [showRecategorize, setShowRecategorize] = useState(false)
    const [recategorizeTransaction, setRecategorizeTransaction] = useState<any>(null)

    // Charger les données du compte courant
    useEffect(() => {
      fetchCompteCourant()
    }, [selectedYear, selectedMonth])

    const fetchCompteCourant = async () => {
      try {
        // Récupérer la vue mensuelle
        const { data: monthlyData, error: monthlyError } = await supabase
          .from('compte_courant_mensuel')
          .select('*')
          .eq('year', selectedYear)
          .eq('month', selectedMonth)
          .single()

        if (monthlyError && monthlyError.code !== 'PGRST116') throw monthlyError
        setCompteCourant(monthlyData || null)

        // Récupérer la vue par projet
        const { data: projectData, error: projectError } = await supabase
          .from('compte_courant_par_projet')
          .select('*')
          .eq('year', selectedYear)
          .eq('month', selectedMonth)

        if (projectError) throw projectError
        setByProject(projectData || [])
      } catch (error) {
        console.error('Erreur lors du chargement du compte courant:', error)
      }
    }

    const handleRecategorize = async (transaction: any, newOperationType: string, newProjectCategory: string) => {
      try {
        const { error } = await supabase
          .from('transactions')
          .update({
            operation_type: newOperationType,
            project_category: newProjectCategory,
            auto_categorized: false
          })
          .eq('id', transaction.id)

        if (error) throw error

        setShowRecategorize(false)
        setRecategorizeTransaction(null)
        await fetchCompteCourant()
        alert('Transaction recatégorisée avec succès!')
      } catch (error: any) {
        alert('Erreur lors de la recatégorisation: ' + error.message)
      }
    }

    const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
                        'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']

    return (
      <div className="space-y-6">
        {/* Header avec sélection période */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Compte Courant</h2>
            <p className="text-gray-600 mt-1">Vue agrégée des transactions par catégorie</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent bg-white"
            >
              {monthNames.map((name, idx) => (
                <option key={idx} value={idx + 1}>{name}</option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent bg-white"
            >
              {[2023, 2024, 2025, 2026, 2027].map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>

        {!compteCourant ? (
          <div className="bg-white p-12 rounded-lg shadow-md text-center">
            <DollarSign size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{fr ? 'Aucune donnee' : 'No data'}</h3>
            <p className="text-gray-600">{fr ? `Aucune transaction pour ${monthNames[selectedMonth - 1]} ${selectedYear}` : `No transactions for ${monthNames[selectedMonth - 1]} ${selectedYear}`}</p>
          </div>
        ) : (
          <>
            {/* Résumé principal */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg border border-green-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-green-700">{fr ? 'Total Revenus' : 'Total Revenue'}</span>
                  <TrendingUp className="text-green-600" size={24} />
                </div>
                <p className="text-3xl font-bold text-green-900">
                  {(compteCourant.total_revenues || 0).toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
                </p>
                <div className="text-xs text-green-700 mt-2">
                  {compteCourant.nombre_transactions} transactions
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-blue-700">{fr ? 'Couts Operation' : 'Operation Costs'}</span>
                  <TrendingDown className="text-blue-600" size={24} />
                </div>
                <p className="text-3xl font-bold text-blue-900">
                  {(compteCourant.total_operational_costs || 0).toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
                </p>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg border border-purple-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-purple-700">{fr ? 'Depenses Projet' : 'Project Expenses'}</span>
                  <TrendingDown className="text-purple-600" size={24} />
                </div>
                <p className="text-3xl font-bold text-purple-900">
                  {(compteCourant.total_project_expenses || 0).toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
                </p>
              </div>

              <div className={`bg-gradient-to-br ${(compteCourant.net_income || 0) >= 0 ? 'from-emerald-50 to-emerald-100 border-emerald-200' : 'from-orange-50 to-orange-100 border-orange-200'} p-6 rounded-lg border`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm font-medium ${(compteCourant.net_income || 0) >= 0 ? 'text-emerald-700' : 'text-orange-700'}`}>
                    {fr ? 'Revenu Net' : 'Net Revenue'}
                  </span>
                  <DollarSign className={(compteCourant.net_income || 0) >= 0 ? 'text-emerald-600' : 'text-orange-600'} size={24} />
                </div>
                <p className={`text-3xl font-bold ${(compteCourant.net_income || 0) >= 0 ? 'text-emerald-900' : 'text-orange-900'}`}>
                  {(compteCourant.net_income || 0).toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
                </p>
              </div>
            </div>

            {/* Détails par catégorie */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {/* Détails Revenus */}
              <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  {fr ? 'Details Revenus' : 'Revenue Details'}
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">{fr ? 'Revenus locatifs' : 'Rental income'}</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {(compteCourant.rental_income || 0).toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">{fr ? 'Autres revenus' : 'Other income'}</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {(compteCourant.other_income || 0).toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Détails Coûts Opération */}
              <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  {fr ? 'Details Couts Operation' : 'Operation Cost Details'}
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">{fr ? 'Frais gestion' : 'Management fees'}</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {(compteCourant.management_fees || 0).toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">{fr ? 'Services publics' : 'Utilities'}</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {(compteCourant.utilities || 0).toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Assurances</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {(compteCourant.insurance || 0).toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Maintenance</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {(compteCourant.maintenance || 0).toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">{fr ? 'Taxes foncieres' : 'Property taxes'}</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {(compteCourant.property_taxes || 0).toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Détails Dépenses Projet */}
              <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                  {fr ? 'Details Depenses Projet' : 'Project Expense Details'}
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">{fr ? 'Renovations' : 'Renovations'}</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {(compteCourant.renovation_costs || 0).toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">{fr ? 'Ameublement' : 'Furnishing'}</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {(compteCourant.furnishing_costs || 0).toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">{fr ? 'Autres projets' : 'Other projects'}</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {(compteCourant.other_project_costs || 0).toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Vue par projet */}
            {byProject.length > 0 && (
              <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                  <h3 className="text-lg font-semibold text-gray-900">{fr ? 'Details par Projet' : 'Details by Project'}</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{fr ? 'Projet' : 'Project'}</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{fr ? 'Localisation' : 'Location'}</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{fr ? 'Revenus' : 'Revenue'}</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{fr ? 'Couts Oper.' : 'Op. Costs'}</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{fr ? 'Dep. Projet' : 'Proj. Exp.'}</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{fr ? 'Revenu Net' : 'Net Revenue'}</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {byProject.map((project) => (
                        <tr key={project.property_id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{project.property_name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-600">{project.location}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <span className="text-sm font-semibold text-green-600">
                              {(project.revenues || 0).toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <span className="text-sm font-semibold text-blue-600">
                              {(project.operational_costs || 0).toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <span className="text-sm font-semibold text-purple-600">
                              {(project.project_expenses || 0).toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <span className={`text-sm font-bold ${(project.net_income || 0) >= 0 ? 'text-emerald-600' : 'text-orange-600'}`}>
                              {(project.net_income || 0).toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  const renderCapexTab = () => {
    // Calculer le total CAPEX depuis les comptes
    const totalInvestmentCapex = capexAccounts.reduce((sum, acc) => sum + (acc.investment_capex || 0), 0)
    const totalOperationCapex = capexAccounts.reduce((sum, acc) => sum + (acc.operation_capex || 0), 0)
    const totalCapex = totalInvestmentCapex + totalOperationCapex

    // Transactions CAPEX
    const capexTransactions = transactions.filter(t => t.type === 'capex')
    const totalCapexTransactions = capexTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0)

    return (
      <div className="space-y-6">
        {/* Header Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-700">{fr ? 'CAPEX Investissement' : 'Investment CAPEX'}</span>
              <DollarSign className="text-blue-600" size={20} />
            </div>
            <p className="text-2xl font-bold text-blue-900">
              {totalInvestmentCapex.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
            </p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg border border-purple-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-purple-700">{fr ? 'CAPEX Operation' : 'Operation CAPEX'}</span>
              <DollarSign className="text-purple-600" size={20} />
            </div>
            <p className="text-2xl font-bold text-purple-900">
              {totalOperationCapex.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
            </p>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg border border-green-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-green-700">{fr ? 'Total Reserve CAPEX' : 'Total CAPEX Reserve'}</span>
              <TrendingUp className="text-green-600" size={20} />
            </div>
            <p className="text-2xl font-bold text-green-900">
              {totalCapex.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
            </p>
          </div>
        </div>

        {/* Transactions CAPEX */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <DollarSign size={20} className="text-blue-600" />
            {fr ? `Depenses CAPEX (${capexTransactions.length} transactions)` : `CAPEX Expenses (${capexTransactions.length} transactions)`}
          </h3>

          {capexTransactions.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">{fr ? 'Aucune depense CAPEX pour le moment' : 'No CAPEX expenses yet'}</p>
            </div>
          ) : (
            <>
              <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-700">{fr ? 'Total depense en CAPEX' : 'Total spent on CAPEX'}</span>
                  <span className="text-xl font-bold text-blue-900">
                    {totalCapexTransactions.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{fr ? 'Categorie' : 'Category'}</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{fr ? 'Montant' : 'Amount'}</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {capexTransactions
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map((transaction) => (
                      <tr key={transaction.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{new Date(transaction.date).toLocaleDateString('fr-CA')}</div>
                        </td>
                        <td className="px-6 py-4 max-w-[220px]">
                          <div className="group relative">
                            <div className="text-sm font-medium text-gray-900 truncate cursor-default" title={transaction.description}>
                              {transaction.description}
                            </div>
                            <div className="pointer-events-none absolute left-0 top-full z-30 mt-1 hidden w-72 rounded-lg bg-gray-900 px-3 py-2 text-xs text-white shadow-xl group-hover:block whitespace-normal break-words">
                              {transaction.description}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                            {transaction.category || 'CAPEX'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <span className="text-sm font-semibold text-gray-900">
                            {Math.abs(transaction.amount).toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  // ── Save declaration draft ──────────────────────────────────────────────
  const saveDeclaration = async () => {
    if (declarationDraft.total_amount <= 0 || declarationDraft.nav_per_share <= 0) {
      alert(fr ? 'Montant total et NAV/part requis.' : 'Total amount and NAV/share required.')
      return
    }
    setSavingDeclaration(true)
    try {
      const sharesTotal = investorSummaries.reduce((sum: number, s: any) => sum + (s.total_shares || 0), 0)
      const { data: decl, error } = await supabase
        .from('dividend_declarations')
        .insert({
          fiscal_year: declarationDraft.fiscal_year,
          declaration_date: declarationDraft.declaration_date,
          total_amount: declarationDraft.total_amount,
          nav_per_share: declarationDraft.nav_per_share,
          total_shares: sharesTotal,
          notes: declarationDraft.notes || null,
          status: 'draft',
        })
        .select()
        .single()
      if (error) throw error

      // Pre-create elections for all investors (default = cash)
      const electionsToInsert = investorSummaries.map((s: any) => {
        const pct = sharesTotal > 0 ? s.total_shares / sharesTotal : 0
        const amount = Math.round(declarationDraft.total_amount * pct * 100) / 100
        return {
          declaration_id: decl.id,
          investor_id: s.investor_id,
          investor_shares: s.total_shares,
          ownership_pct: pct,
          dividend_amount: amount,
          election: investorElections[s.investor_id] ?? 'cash',
        }
      })
      if (electionsToInsert.length > 0) {
        await supabase.from('dividend_investor_elections').insert(electionsToInsert)
      }

      await fetchDeclarations()
      setShowDeclarationForm(false)
      setDeclarationDraft({ fiscal_year: new Date().getFullYear(), declaration_date: new Date().toISOString().split('T')[0], total_amount: 0, nav_per_share: 0, notes: '' })
      setInvestorElections({})
      alert(fr ? '✅ Déclaration enregistrée. Les investisseurs peuvent maintenant élire.' : '✅ Declaration saved. Investors can now elect.')
    } catch (err: any) {
      alert((fr ? 'Erreur: ' : 'Error: ') + err.message)
    } finally {
      setSavingDeclaration(false)
    }
  }

  // ── Execute declaration (create transactions + shares) ──────────────────
  const executeDeclaration = async (decl: any) => {
    if (!confirm(fr
      ? `Exécuter la distribution "${decl.fiscal_year}" de ${decl.total_amount.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })} ? Cette action est irréversible.`
      : `Execute "${decl.fiscal_year}" distribution of ${decl.total_amount.toLocaleString('en-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}? This action is irreversible.`
    )) return

    setExecutingDeclaration(decl.id)
    try {
      const elections = decl.elections ?? []
      for (const elec of elections) {
        if (elec.dividend_amount <= 0) continue
        const inv = investors.find((i: any) => i.id === elec.investor_id)
        if (!inv) continue

        if (elec.election === 'cash') {
          const { data: tx } = await supabase.from('transactions').insert({
            date: decl.declaration_date,
            type: 'dividende',
            amount: -Math.round(elec.dividend_amount * 100) / 100,
            description: `Dividende ${decl.fiscal_year} — ${(elec.ownership_pct * 100).toFixed(2)}% (${elec.investor_shares} parts) — Encaissement`,
            investor_id: elec.investor_id,
            category: 'dividende',
            payment_method: 'virement',
            status: 'complete',
            source_currency: 'CAD',
            exchange_rate: 1.0,
            fiscal_category: 'dividend_income',
          }).select().single()
          await supabase.from('dividend_investor_elections').update({
            cash_transaction_id: tx?.id,
            t5_issued: true,
            elected_at: new Date().toISOString(),
          }).eq('id', elec.id)
        } else {
          // Reinvest: create reinvestissement transaction + new investor_investments row
          const sharesIssued = Math.round((elec.dividend_amount / decl.nav_per_share) * 1000000) / 1000000
          const { data: tx } = await supabase.from('transactions').insert({
            date: decl.declaration_date,
            type: 'reinvestissement_dividende',
            amount: -Math.round(elec.dividend_amount * 100) / 100,
            description: `Réinvestissement dividende ${decl.fiscal_year} — ${sharesIssued.toFixed(4)} parts @ ${decl.nav_per_share.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 2 })}/part`,
            investor_id: elec.investor_id,
            category: 'reinvestissement',
            payment_method: 'virement',
            status: 'complete',
            source_currency: 'CAD',
            exchange_rate: 1.0,
            fiscal_category: 'dividend_income',
          }).select().single()
          // Issue new shares
          await supabase.from('investor_investments').insert({
            investor_id: elec.investor_id,
            number_of_shares: sharesIssued,
            investment_date: decl.declaration_date,
            amount_invested: elec.dividend_amount,
            share_price: decl.nav_per_share,
            notes: `Réinvestissement dividende ${decl.fiscal_year}`,
            status: 'active',
          })
          await supabase.from('dividend_investor_elections').update({
            shares_issued: sharesIssued,
            reinvest_transaction_id: tx?.id,
            t5_issued: true,
            elected_at: new Date().toISOString(),
          }).eq('id', elec.id)
        }
      }

      // Mark declaration as executed
      await supabase.from('dividend_declarations').update({
        status: 'executed',
        executed_at: new Date().toISOString(),
      }).eq('id', decl.id)

      await fetchDeclarations()
      alert(fr ? '✅ Distribution exécutée! Transactions créées, parts émises, T5 marqués.' : '✅ Distribution executed! Transactions created, shares issued, T5 marked.')
    } catch (err: any) {
      alert((fr ? 'Erreur: ' : 'Error: ') + err.message)
    } finally {
      setExecutingDeclaration(null)
    }
  }

  // ── Update single investor election ─────────────────────────────────────
  const updateElectionInDb = async (declId: string, elecId: string, newElection: 'cash' | 'reinvest') => {
    await supabase.from('dividend_investor_elections')
      .update({ election: newElection, elected_at: new Date().toISOString() })
      .eq('id', elecId)
    setDeclarations(prev => prev.map(d => d.id !== declId ? d : {
      ...d,
      elections: (d.elections ?? []).map(e => e.id === elecId ? { ...e, election: newElection } : e),
    }))
  }

  // ── Generate dividend receipt PDF ────────────────────────────────────────
  const [generatingReceiptFor, setGeneratingReceiptFor] = useState<string | null>(null)
  const [quarterlyYear, setQuarterlyYear] = useState<number>(new Date().getFullYear())
  const [quarterlyQ, setQuarterlyQ] = useState<number>(Math.ceil((new Date().getMonth() + 1) / 3))
  const [generatingQuarterly, setGeneratingQuarterly] = useState<string | null>(null)

  const generateDividendReceipt = async (decl: any, elec: any) => {
    const inv = investors.find((i: any) => i.id === elec.investor_id)
    if (!inv) return
    setGeneratingReceiptFor(elec.id)
    try {
      const jsPDF = (await import('jspdf')).default
      const autoTable = (await import('jspdf-autotable')).default
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

      const fmtCAD = (n: number) => n.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 2 })
      const fmtDate = (d: string) => new Date(d).toLocaleDateString('fr-CA', { year: 'numeric', month: 'long', day: 'numeric' })

      const loadBase64 = async (url: string) => {
        try {
          const blob = await (await fetch(url)).blob()
          return await new Promise<string>((res, rej) => {
            const r = new FileReader(); r.onloadend = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(blob)
          })
        } catch { return '' }
      }

      const logo = await loadBase64('/logo-cerdia3.png')
      const today = new Date().toLocaleDateString('fr-CA', { year: 'numeric', month: 'long', day: 'numeric' })
      const receiptNo = `DIV-${decl.fiscal_year}-${inv.last_name?.toUpperCase() ?? 'INV'}-${Date.now().toString().slice(-4)}`

      // ── En-tête ──────────────────────────────────────────────────────────
      if (logo) {
        try {
          const img = new Image()
          img.src = logo
          await new Promise(r => { img.onload = r; img.onerror = r })
          const ratio = img.naturalHeight / (img.naturalWidth || 1)
          const h = 12; const w = h / ratio
          doc.addImage(logo, 'PNG', 15, 8, w, h)
        } catch {}
      }
      doc.setFontSize(18); doc.setTextColor(180, 120, 0)
      doc.text('REÇU DE DISTRIBUTION', 200, 13, { align: 'right' })
      doc.setFontSize(9); doc.setTextColor(130, 130, 130)
      doc.text(`N° ${receiptNo}`, 200, 20, { align: 'right' })
      doc.text(`Émis le : ${today}`, 200, 25, { align: 'right' })
      doc.setDrawColor(180, 120, 0); doc.setLineWidth(0.8)
      doc.line(15, 30, 195, 30)

      let y = 37

      // ── Bloc investisseur ────────────────────────────────────────────────
      doc.setFontSize(10); doc.setTextColor(60, 60, 60)
      doc.text('Émis à :', 15, y)
      doc.setFontSize(13); doc.setTextColor(20, 20, 20)
      doc.text(`${inv.first_name} ${inv.last_name}`, 15, y + 6)
      doc.setFontSize(9); doc.setTextColor(100, 100, 100)
      if (inv.email) doc.text(inv.email, 15, y + 12)
      if ((inv as any).address) doc.text((inv as any).address, 15, y + 17)

      doc.setFontSize(10); doc.setTextColor(60, 60, 60)
      doc.text('Émetteur :', 120, y)
      doc.setFontSize(11); doc.setTextColor(20, 20, 20)
      doc.text('CERDIA SEC', 120, y + 6)
      doc.setFontSize(9); doc.setTextColor(100, 100, 100)
      doc.text('eric.dufort@cerdia.ai', 120, y + 12)
      doc.text('Québec, Canada', 120, y + 17)

      y += 28
      doc.setDrawColor(220, 220, 220); doc.setLineWidth(0.3)
      doc.line(15, y, 195, y)
      y += 7

      // ── Détails de la distribution ───────────────────────────────────────
      doc.setFontSize(11); doc.setTextColor(60, 60, 60)
      doc.text('Détails de la distribution', 15, y); y += 5

      autoTable(doc, {
        startY: y,
        head: [['Paramètre', 'Valeur']],
        body: [
          ['Année fiscale', String(decl.fiscal_year)],
          ['Date de déclaration', fmtDate(decl.declaration_date)],
          ['Montant total de la distribution', fmtCAD(decl.total_amount)],
          ['NAV par part au moment de la déclaration', fmtCAD(decl.nav_per_share)],
          ['Parts détenues', elec.investor_shares.toLocaleString('fr-CA', { maximumFractionDigits: 4 })],
          ['Pourcentage de propriété', (elec.ownership_pct * 100).toFixed(4) + ' %'],
          ['Montant attribué à cet investisseur', fmtCAD(elec.dividend_amount)],
          ['Élection', elec.election === 'reinvest'
            ? `Réinvestissement — ${Number(elec.shares_issued || 0).toFixed(6)} parts nouvelles émises`
            : 'Encaissement (virement bancaire)'],
        ],
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [180, 120, 0], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [255, 248, 230] },
        margin: { left: 15, right: 15 },
      })

      y = (doc as any).lastAutoTable.finalY + 8

      // ── Bloc fiscal ──────────────────────────────────────────────────────
      doc.setFontSize(11); doc.setTextColor(60, 60, 60)
      doc.text('Obligations fiscales — À déclarer', 15, y); y += 5

      const taxLines: [string, string][] = [
        ['Formulaire T5 (Dividendes de sociétés canadiennes)',
          `Oui — montant imposable : ${fmtCAD(elec.dividend_amount)}`],
        ['Année d\'imposition', String(decl.fiscal_year)],
        ['Nature du revenu', 'Dividende de société par actions (non déterminé)'],
        ['Taux de majoration (2024+)', '15 % — montant majoré : ' + fmtCAD(elec.dividend_amount * 1.15)],
        ['Crédit d\'impôt fédéral pour dividendes', (elec.dividend_amount * 1.15 * 0.090301).toFixed(2) + ' $ CAD'],
        ['Déclaration requise', 'Annexe 4 (T1 canadien) + relevé provincial si applicable'],
      ]

      if (elec.election === 'reinvest' && elec.shares_issued) {
        taxLines.push(
          ['Prix de base rajusté (PBR) des parts réinvesties',
            `${fmtCAD(decl.nav_per_share)} × ${Number(elec.shares_issued).toFixed(6)} parts`],
          ['Rappel', 'Le réinvestissement NE reporte PAS l\'impôt — le T5 est émis dans tous les cas'],
        )
      }

      autoTable(doc, {
        startY: y,
        head: [['Élément fiscal', 'Détail']],
        body: taxLines,
        styles: { fontSize: 8.5, cellPadding: 2.5 },
        headStyles: { fillColor: [60, 80, 140], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [240, 244, 255] },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 90 } },
        margin: { left: 15, right: 15 },
      })

      y = (doc as any).lastAutoTable.finalY + 8

      // ── Mention légale ───────────────────────────────────────────────────
      if (y > 240) { doc.addPage(); y = 15 }

      doc.setDrawColor(200, 50, 50); doc.setLineWidth(0.5)
      doc.rect(15, y, 180, 42, 'S')
      doc.setFontSize(9); doc.setTextColor(180, 30, 30)
      doc.text('⚠  AVERTISSEMENT FISCAL ET LÉGAL', 20, y + 6)
      doc.setFontSize(8); doc.setTextColor(80, 30, 30)
      const legalText = doc.splitTextToSize([
        '1. Ce reçu constitue une preuve de distribution et doit être conservé avec vos dossiers fiscaux (minimum 7 ans).',
        '2. Le montant indiqué doit être déclaré dans votre déclaration de revenus canadienne (T1) pour l\'année fiscale indiquée.',
        '3. CERDIA SEC émettra le feuillet T5 officiel au plus tard le 28 février de l\'année suivante.',
        '4. Si vous avez des investissements dans des propriétés situées aux États-Unis ou en République Dominicaine, des obligations fiscales locales peuvent également s\'appliquer (T1135 si > 100 000 $, IRNR RD, etc.).',
        '5. Consultez un fiscaliste ou comptable agréé (CPA) pour toute question relative à votre situation personnelle.',
        '6. En cas de réinvestissement, le prix de base rajusté (PBR) de vos nouvelles parts correspond au NAV/part à la date de déclaration.',
      ].join(' '), 170)
      doc.text(legalText, 20, y + 13)

      y += 50

      // ── Signature ────────────────────────────────────────────────────────
      if (y > 260) { doc.addPage(); y = 15 }
      doc.setFontSize(9); doc.setTextColor(100, 100, 100)
      doc.text('Signé électroniquement par CERDIA SEC', 15, y)
      doc.text(`Généré le : ${today}`, 195, y, { align: 'right' })

      doc.save(`CERDIA-Recu-Dividende-${decl.fiscal_year}-${inv.last_name}.pdf`)
    } catch (err: any) {
      alert((fr ? 'Erreur PDF: ' : 'PDF Error: ') + err.message)
    } finally {
      setGeneratingReceiptFor(null)
    }
  }

  // ── Pending report requests (from cron) ─────────────────────────────────
  const [pendingReportRequests, setPendingReportRequests] = useState<Array<{
    id: string; investor_id: string; fiscal_year: number; quarter: number
  }>>([])
  const [batchProgress, setBatchProgress] = useState<{ done: number; total: number; current: string } | null>(null)
  const [batchYear, setBatchYear] = useState<number>(new Date().getFullYear())

  useEffect(() => {
    supabase.from('investor_report_requests')
      .select('id, investor_id, fiscal_year, quarter')
      .eq('status', 'pending')
      .then(({ data }) => setPendingReportRequests(data ?? []))
  }, [])

  // ── Internal: build one quarterly PDF → return ArrayBuffer ─────────────
  const _buildQuarterlyPDFBuffer = async (inv: any, year: number, q: number): Promise<ArrayBuffer> => {
    const jsPDF = (await import('jspdf')).default
    const autoTable = (await import('jspdf-autotable')).default
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

    const qStart = new Date(year, (q - 1) * 3, 1)
    const qEnd   = new Date(year, q * 3, 0)
    const qLabel = `T${q} ${year}`
    const fmtD   = (d: Date) => d.toLocaleDateString('fr-CA', { year: 'numeric', month: 'long', day: 'numeric' })
    const fmtCAD = (n: number) => n.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 2 })
    const today  = new Date().toLocaleDateString('fr-CA', { year: 'numeric', month: 'long', day: 'numeric' })

    const loadBase64 = async (url: string) => {
      try {
        const blob = await (await fetch(url)).blob()
        return await new Promise<string>((res, rej) => {
          const r = new FileReader(); r.onloadend = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(blob)
        })
      } catch { return '' }
    }
    const logo = await loadBase64('/logo-cerdia3.png')

    const invTxs = transactions.filter((t: any) =>
      t.investor_id === inv.id &&
      new Date(t.date) >= qStart && new Date(t.date) <= qEnd
    ).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())

    const allTxs = transactions.filter((t: any) =>
      new Date(t.date) >= qStart && new Date(t.date) <= qEnd
    )

    const summary = investorSummaries.find((s: any) => s.investor_id === inv.id)
    const sharesTotal = investorSummaries.reduce((sum: number, s: any) => sum + (s.total_shares || 0), 0)
    const ownershipPct = sharesTotal > 0 ? (summary?.total_shares ?? 0) / sharesTotal : 0

    const qRevenue = allTxs.filter((t: any) => ['loyer', 'loyer_locatif', 'revenu', 'dividende_recu'].includes(t.type)).reduce((s: number, t: any) => s + Math.abs(t.amount), 0)
    const qExpense = allTxs.filter((t: any) => ['depense', 'maintenance', 'admin', 'rnd', 'capex'].includes(t.type)).reduce((s: number, t: any) => s + Math.abs(t.amount), 0)
    const qNet    = qRevenue - qExpense

    const navPerShareCurrent = (navCurrent as any)?.nav_per_share ?? shareSettings?.nominal_share_value ?? 0
    const investorPortfolioValue = (summary?.total_shares ?? 0) * navPerShareCurrent

    if (logo) {
      try {
        const img = new Image(); img.src = logo
        await new Promise(r => { img.onload = r; img.onerror = r })
        const ratio = img.naturalHeight / (img.naturalWidth || 1)
        const h = 12; doc.addImage(logo, 'PNG', 15, 8, h / ratio, h)
      } catch {}
    }
    doc.setFontSize(18); doc.setTextColor(40, 70, 140)
    doc.text(`RAPPORT TRIMESTRIEL ${qLabel}`, 200, 13, { align: 'right' })
    doc.setFontSize(9); doc.setTextColor(130, 130, 130)
    doc.text(`Émis le : ${today}`, 200, 20, { align: 'right' })
    doc.text(`Période : ${fmtD(qStart)} — ${fmtD(qEnd)}`, 200, 25, { align: 'right' })
    doc.setDrawColor(40, 70, 140); doc.setLineWidth(0.8); doc.line(15, 30, 195, 30)

    let y = 38

    doc.setFontSize(10); doc.setTextColor(80, 80, 80); doc.text('Investisseur :', 15, y)
    doc.setFontSize(13); doc.setTextColor(20, 20, 20); doc.text(`${inv.first_name} ${inv.last_name}`, 15, y + 6)
    doc.setFontSize(9); doc.setTextColor(100, 100, 100)
    if (inv.email) doc.text(inv.email, 15, y + 12)
    doc.setFontSize(10); doc.setTextColor(80, 80, 80); doc.text('CERDIA SEC', 120, y + 6)
    doc.setFontSize(8); doc.setTextColor(100, 100, 100); doc.text('eric.dufort@cerdia.ai', 120, y + 12)
    y += 24
    doc.setDrawColor(220, 220, 220); doc.line(15, y, 195, y); y += 7

    doc.setFontSize(11); doc.setTextColor(40, 70, 140); doc.text('Profil de portefeuille', 15, y); y += 5
    autoTable(doc, {
      startY: y,
      head: [['Indicateur', 'Valeur']],
      body: [
        ['Parts détenues', (summary?.total_shares ?? 0).toLocaleString('fr-CA', { maximumFractionDigits: 4 })],
        ['Pourcentage de propriété', (ownershipPct * 100).toFixed(4) + ' %'],
        ['NAV par part', fmtCAD(navPerShareCurrent)],
        ['Valeur totale du portefeuille', fmtCAD(investorPortfolioValue)],
      ],
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [40, 70, 140], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [240, 244, 255] },
      margin: { left: 15, right: 15 },
    })
    y = (doc as any).lastAutoTable.finalY + 8

    doc.setFontSize(11); doc.setTextColor(40, 70, 140)
    doc.text(`Performance ${qLabel} (portefeuille CERDIA)`, 15, y); y += 5
    autoTable(doc, {
      startY: y,
      head: [['Élément', 'Portefeuille global', `Quote-part ${(ownershipPct * 100).toFixed(2)}%`]],
      body: [
        ['Revenus bruts', fmtCAD(qRevenue), fmtCAD(qRevenue * ownershipPct)],
        ['Dépenses d\'exploitation', fmtCAD(qExpense), fmtCAD(qExpense * ownershipPct)],
        ['Résultat net', fmtCAD(qNet), fmtCAD(qNet * ownershipPct)],
      ],
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [40, 100, 60], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [240, 255, 245] },
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right', fontStyle: 'bold' } },
      margin: { left: 15, right: 15 },
    })
    y = (doc as any).lastAutoTable.finalY + 8

    if (invTxs.length > 0) {
      if (y > 200) { doc.addPage(); y = 15 }
      doc.setFontSize(11); doc.setTextColor(40, 70, 140)
      doc.text(`Vos transactions ${qLabel}`, 15, y); y += 5
      autoTable(doc, {
        startY: y,
        head: [['Date', 'Description', 'Type', 'Montant (CAD)']],
        body: invTxs.map((t: any) => [
          new Date(t.date).toLocaleDateString('fr-CA'),
          t.description || '—',
          t.type || '—',
          (t.amount < 0 ? '(' : '') + fmtCAD(Math.abs(t.amount)) + (t.amount < 0 ? ')' : ''),
        ]),
        styles: { fontSize: 8, cellPadding: 2.5 },
        headStyles: { fillColor: [40, 70, 140], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 255] },
        columnStyles: { 3: { halign: 'right', fontStyle: 'bold' } },
        margin: { left: 15, right: 15 },
      })
      y = (doc as any).lastAutoTable.finalY + 8
    }

    if (y > 230) { doc.addPage(); y = 15 }
    doc.setDrawColor(180, 100, 0); doc.setLineWidth(0.4); doc.rect(15, y, 180, 36, 'S')
    doc.setFontSize(9); doc.setTextColor(140, 70, 0); doc.text('NOTE FISCALE TRIMESTRIELLE', 20, y + 6)
    doc.setFontSize(8); doc.setTextColor(80, 50, 0)
    const fiscalNote = doc.splitTextToSize([
      'Ce rapport est fourni à titre informatif. Les revenus de source étrangère (RD, USA) peuvent être assujettis à une retenue à la source locale.',
      'Si la juste valeur marchande de vos biens étrangers dépasse 100 000 $ CAD, le formulaire T1135 est requis.',
      'Conservez ce rapport avec vos dossiers fiscaux. Consultez votre comptable (CPA) pour toute question fiscale.',
    ].join(' '), 170)
    doc.text(fiscalNote, 20, y + 13)
    doc.setFontSize(8); doc.setTextColor(160, 160, 160)
    doc.text('CERDIA SEC — Rapport confidentiel — À usage fiscal uniquement', 105, 287, { align: 'center' })

    return doc.output('arraybuffer')
  }

  // ── Quarterly investor report PDF ───────────────────────────────────────
  const generateQuarterlyReport = async (
    investorId: string,
    opts?: { year?: number; q?: number; requestId?: string; saveOnly?: boolean }
  ): Promise<boolean> => {
    const inv = investors.find((i: any) => i.id === investorId)
    if (!inv) return false

    const year = opts?.year ?? quarterlyYear
    const q    = opts?.q    ?? quarterlyQ

    if (!opts?.saveOnly) setGeneratingQuarterly(investorId + '-' + year + '-' + q)
    try {
      const qLabel = `T${q} ${year}`

      // ── Build PDF via shared helper ──────────────────────────────────────
      const pdfBuffer = await _buildQuarterlyPDFBuffer(inv, year, q)

      // ── Sauvegarde dans Storage + historique investisseur ────────────────
      const pdfBlob = new Blob([pdfBuffer], { type: 'application/pdf' })
      const formData = new FormData()
      formData.append('pdf', pdfBlob, `CERDIA-Rapport-${qLabel}-${inv.last_name}.pdf`)
      formData.append('investor_id', investorId)
      formData.append('investor_name', `${inv.first_name} ${inv.last_name}`)
      formData.append('fiscal_year', String(year))
      formData.append('quarter', String(q))
      if (opts?.requestId) formData.append('request_id', opts.requestId)

      const res = await fetch('/api/investors/save-report', { method: 'POST', body: formData })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Upload failed' }))
        throw new Error(err.error)
      }

      // Télécharge aussi localement (sauf en mode batch silencieux)
      if (!opts?.saveOnly) {
        const url = URL.createObjectURL(pdfBlob)
        const a = document.createElement('a')
        a.href = url; a.download = `CERDIA-Rapport-${qLabel}-${inv.last_name}.pdf`; a.click()
        URL.revokeObjectURL(url)
      }

      return true
    } catch (err: any) {
      if (!opts?.saveOnly) alert('Erreur PDF: ' + err.message)
      return false
    } finally {
      if (!opts?.saveOnly) setGeneratingQuarterly(null)
    }
  }

  // ── Batch: generate all 4 quarters for all investors in a year ──────────
  const generateAllYearReports = async () => {
    const activeInvestors = investors.filter((inv: any) =>
      investorSummaries.some((s: any) => s.investor_id === inv.id && (s.total_shares || 0) > 0)
    )
    const total = activeInvestors.length * 4
    setBatchProgress({ done: 0, total, current: '' })

    let done = 0
    for (const q of [1, 2, 3, 4]) {
      for (const inv of activeInvestors) {
        setBatchProgress({ done, total, current: `T${q} — ${inv.first_name} ${inv.last_name}` })
        await generateQuarterlyReport(inv.id, { year: batchYear, q, saveOnly: true })
        done++
        setBatchProgress({ done, total, current: `T${q} — ${inv.first_name} ${inv.last_name}` })
        // Small delay to avoid overwhelming the server
        await new Promise(r => setTimeout(r, 300))
      }
    }
    setBatchProgress(null)
    alert(fr
      ? `✅ ${total} rapports générés et sauvegardés dans l'historique des investisseurs.`
      : `✅ ${total} reports generated and saved to investor history.`)
  }

  // ── Generate pending reports from cron ──────────────────────────────────
  const generatePendingReports = async () => {
    if (pendingReportRequests.length === 0) return
    setBatchProgress({ done: 0, total: pendingReportRequests.length, current: '' })
    let done = 0
    for (const req of pendingReportRequests) {
      const inv = investors.find((i: any) => i.id === req.investor_id)
      setBatchProgress({ done, total: pendingReportRequests.length, current: inv ? `T${req.quarter} ${req.fiscal_year} — ${inv.first_name} ${inv.last_name}` : req.investor_id })
      await generateQuarterlyReport(req.investor_id, {
        year: req.fiscal_year,
        q: req.quarter,
        requestId: req.id,
        saveOnly: true,
      })
      done++
      await new Promise(r => setTimeout(r, 300))
    }
    setPendingReportRequests([])
    setBatchProgress(null)
    alert(fr ? `✅ ${done} rapports en attente générés.` : `✅ ${done} pending reports generated.`)
  }

  // ── Bundle annuel par investisseur (ZIP T1+T2+T3+T4) ────────────────────
  const [generatingBundle, setGeneratingBundle] = useState<string | null>(null)
  const [bundleAllYear, setBundleAllYear] = useState<number>(new Date().getFullYear())
  const [generatingBundleAll, setGeneratingBundleAll] = useState(false)

  const generateInvestorBundle = async (investorId: string, year: number) => {
    const inv = investors.find((i: any) => i.id === investorId)
    if (!inv) return
    setGeneratingBundle(investorId)
    try {
      const JSZip = (await import('jszip')).default
      const zip = new JSZip()
      const lastName = (inv.last_name || 'INV').toUpperCase()

      // Génère T1→T4 et les ajoute au ZIP + sauvegarde dans historique
      for (const q of [1, 2, 3, 4] as const) {
        const buffer = await _buildQuarterlyPDFBuffer(inv, year, q)
        const filename = `CERDIA-T${q}-${year}-${lastName}.pdf`
        zip.file(filename, buffer)

        // Sauvegarde aussi dans l'historique investisseur
        const blob = new Blob([buffer], { type: 'application/pdf' })
        const fd = new FormData()
        fd.append('pdf', blob, filename)
        fd.append('investor_id', investorId)
        fd.append('investor_name', `${inv.first_name} ${inv.last_name}`)
        fd.append('fiscal_year', String(year))
        fd.append('quarter', String(q))
        await fetch('/api/investors/save-report', { method: 'POST', body: fd }).catch(() => {})
      }

      // Télécharge le ZIP
      const zipBuffer = await zip.generateAsync({ type: 'arraybuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } })
      const url = URL.createObjectURL(new Blob([zipBuffer], { type: 'application/zip' }))
      const a = document.createElement('a')
      a.href = url; a.download = `CERDIA-Bundle-${year}-${lastName}.zip`; a.click()
      URL.revokeObjectURL(url)
    } catch (err: any) {
      alert('Erreur bundle: ' + err.message)
    } finally {
      setGeneratingBundle(null)
    }
  }

  const generateAllBundles = async () => {
    const activeInvestors = investors.filter((inv: any) =>
      investorSummaries.some((s: any) => s.investor_id === inv.id && (s.total_shares || 0) > 0)
    ).sort((a: any, b: any) => {
      const sA = investorSummaries.find((s: any) => s.investor_id === a.id)?.total_shares ?? 0
      const sB = investorSummaries.find((s: any) => s.investor_id === b.id)?.total_shares ?? 0
      return sB - sA
    })

    setGeneratingBundleAll(true)
    const total = activeInvestors.length * 4
    setBatchProgress({ done: 0, total, current: '' })
    try {
      const JSZip = (await import('jszip')).default

      let done = 0
      for (const inv of activeInvestors) {
        const lastName = (inv.last_name || 'INV').toUpperCase()
        const zip = new JSZip()

        for (const q of [1, 2, 3, 4] as const) {
          setBatchProgress({ done, total, current: `T${q} — ${inv.first_name} ${inv.last_name}` })
          const bufferReal = await _buildQuarterlyPDFBuffer(inv, bundleAllYear, q)
          const filename = `CERDIA-T${q}-${bundleAllYear}-${lastName}.pdf`
          zip.file(filename, bufferReal)

          const blob = new Blob([bufferReal], { type: 'application/pdf' })
          const fd = new FormData()
          fd.append('pdf', blob, filename)
          fd.append('investor_id', inv.id)
          fd.append('investor_name', `${inv.first_name} ${inv.last_name}`)
          fd.append('fiscal_year', String(bundleAllYear))
          fd.append('quarter', String(q))
          await fetch('/api/investors/save-report', { method: 'POST', body: fd }).catch(() => {})

          done++
          setBatchProgress({ done, total, current: `T${q} — ${inv.first_name} ${inv.last_name}` })
          await new Promise(r => setTimeout(r, 200))
        }

        // Download this investor's ZIP immediately
        const zipBuffer = await zip.generateAsync({ type: 'arraybuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } })
        const url = URL.createObjectURL(new Blob([zipBuffer], { type: 'application/zip' }))
        const a = document.createElement('a'); a.href = url
        a.download = `CERDIA-Bundle-${bundleAllYear}-${lastName}.zip`; a.click()
        URL.revokeObjectURL(url)
        await new Promise(r => setTimeout(r, 500))
      }
    } finally {
      setBatchProgress(null)
      setGeneratingBundleAll(false)
    }
  }

  const renderRdDividendesTab = () => {
    // ── Données R&D ───────────────────────────────────────────────────────
    const totalInvestmentRnd = rndAccounts.reduce((sum, acc) => sum + (acc.investment_capex || 0), 0)
    const totalOperationRnd = rndAccounts.reduce((sum, acc) => sum + (acc.operation_capex || 0), 0)
    const rndTransactions = transactions.filter(t => t.type === 'rnd')
    const totalRndSpent = rndTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0)

    // ── Dividendes distribués ─────────────────────────────────────────────
    const dividendeTransactions = transactions.filter(t => t.type === 'dividende')
    const totalDividendsDistributed = dividendeTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0)
    const dividendsByInvestor = investors.map(investor => {
      const investorDividends = dividendeTransactions.filter(t => t.investor_id === investor.id)
      const totalReceived = investorDividends.reduce((sum, t) => sum + Math.abs(t.amount), 0)
      return { investor, totalReceived, transactionCount: investorDividends.length }
    }).filter(item => item.totalReceived > 0).sort((a, b) => b.totalReceived - a.totalReceived)

    // ── Simulateur de distribution intelligente ───────────────────────────
    const REVENU_TYPES = ['loyer', 'loyer_locatif', 'revenu', 'dividende_recu']
    const DEPENSE_TYPES = ['depense', 'maintenance', 'admin', 'rnd', 'capex']

    const yearTx = transactions.filter(t => new Date(t.date).getFullYear() === dividendYear)
    const annualRevenues = yearTx
      .filter(t => REVENU_TYPES.includes(t.type))
      .reduce((sum, t) => sum + Math.abs(t.amount), 0)
    const annualExpenses = yearTx
      .filter(t => DEPENSE_TYPES.includes(t.type))
      .reduce((sum, t) => sum + Math.abs(t.amount), 0)
    const netIncome = annualRevenues - annualExpenses

    const compteCourantBalance = financialSummary?.compte_courant_balance ?? 0
    const capexBalance = financialSummary?.capex_balance ?? 0
    const capexReserve = compteCourantBalance * (capexReservePct / 100)
    const maxDistributable = Math.max(0, compteCourantBalance - capexReserve)
    const recommendedDistribution = Math.max(0, Math.min(netIncome * 0.8, maxDistributable))

    // Parts par investisseur
    const totalShares = investorSummaries.reduce((sum, s) => sum + (s.total_shares || 0), 0)
    const investorAllocations = investorSummaries
      .filter(s => (s.total_shares || 0) > 0)
      .map(summary => {
        const investor = investors.find(inv => inv.id === summary.investor_id)
        const pct = totalShares > 0 ? (summary.total_shares / totalShares) : 0
        const amount = dividendAmount * pct
        return { investor, summary, pct, amount }
      })
      .filter(a => a.investor)
      .sort((a, b) => b.pct - a.pct)

    const handleDistributeDividends = async () => {
      if (dividendAmount <= 0 || investorAllocations.length === 0) return
      if (!confirm(fr
        ? `Confirmer la distribution de ${dividendAmount.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })} en dividendes à ${investorAllocations.length} investisseurs ?`
        : `Confirm distribution of ${dividendAmount.toLocaleString('en-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })} in dividends to ${investorAllocations.length} investors?`
      )) return

      setDistributingDividends(true)
      try {
        for (const alloc of investorAllocations) {
          if (!alloc.investor || alloc.amount <= 0) continue
          await addTransaction({
            date: dividendDate,
            type: 'dividende',
            amount: -Math.round(alloc.amount * 100) / 100,
            description: fr
              ? `Dividende ${dividendYear} — ${alloc.pct.toFixed(2)}% (${alloc.summary.total_shares} parts)`
              : `Dividend ${dividendYear} — ${alloc.pct.toFixed(2)}% (${alloc.summary.total_shares} shares)`,
            investor_id: alloc.investor.id,
            property_id: null,
            payment_schedule_id: null,
            category: 'dividende',
            payment_method: 'virement',
            reference_number: '',
            status: 'complete',
            source_currency: 'CAD',
            source_amount: null,
            exchange_rate: 1.0,
            source_country: null,
            foreign_tax_paid: 0,
            foreign_tax_rate: 0,
            tax_credit_claimable: 0,
            fiscal_category: 'dividend_income',
            vendor_name: null,
            accountant_notes: null,
          } as any)
        }
        alert(fr ? '✅ Dividendes distribués avec succès!' : '✅ Dividends distributed successfully!')
        setDividendAmount(0)
      } catch (err: any) {
        alert((fr ? 'Erreur: ' : 'Error: ') + err.message)
      } finally {
        setDistributingDividends(false)
      }
    }

    const fmtCAD = (n: number) => n.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })
    const fmtPct = (n: number) => (n * 100).toFixed(2) + '%'

    const navPerShare = (navCurrent as any)?.nav_per_share ?? shareSettings?.nominal_share_value ?? 0

    return (
      <div className="space-y-6">

        {/* ── Fin d'année — Profil & Élection ─────────────────────────────── */}
        <div className="bg-white rounded-xl shadow-md border border-amber-200 overflow-hidden">
          <div className="bg-gradient-to-r from-amber-500 to-amber-700 px-6 py-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>🏦</span>
                {fr ? 'Profil de fin d\'année — Distribution & Réinvestissement' : 'Year-end Profile — Distribution & Reinvestment'}
              </h3>
              <p className="text-amber-100 text-sm mt-1">
                {fr ? 'Déclarez un dividende, recueillez les élections (encaissement ou réinvestissement), puis exécutez.' : 'Declare a dividend, collect elections (cash or reinvest), then execute.'}
              </p>
            </div>
            <button
              onClick={() => setShowDeclarationForm(!showDeclarationForm)}
              className="px-4 py-2 bg-white text-amber-700 text-sm font-semibold rounded-lg hover:bg-amber-50 transition-colors"
            >
              {showDeclarationForm ? (fr ? '✕ Fermer' : '✕ Close') : (fr ? '+ Nouvelle déclaration' : '+ New declaration')}
            </button>
          </div>

          {/* ── Formulaire de déclaration ── */}
          {showDeclarationForm && (
            <div className="p-6 border-b border-amber-100 bg-amber-50 space-y-4">
              <h4 className="text-sm font-semibold text-amber-900">{fr ? 'Paramètres de la déclaration' : 'Declaration parameters'}</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{fr ? 'Année fiscale' : 'Fiscal year'}</label>
                  <select
                    value={declarationDraft.fiscal_year}
                    onChange={e => setDeclarationDraft({ ...declarationDraft, fiscal_year: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                  >
                    {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{fr ? 'Date de déclaration' : 'Declaration date'}</label>
                  <input
                    type="date"
                    value={declarationDraft.declaration_date}
                    onChange={e => setDeclarationDraft({ ...declarationDraft, declaration_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{fr ? 'Montant total (CAD)' : 'Total amount (CAD)'}</label>
                  <input
                    type="number"
                    value={declarationDraft.total_amount || ''}
                    onChange={e => setDeclarationDraft({ ...declarationDraft, total_amount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    placeholder="Ex: 30000"
                    min={0} step={100}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {fr ? 'NAV/part (CAD)' : 'NAV/share (CAD)'}
                    {navPerShare > 0 && (
                      <button
                        onClick={() => setDeclarationDraft({ ...declarationDraft, nav_per_share: navPerShare })}
                        className="ml-2 text-amber-600 underline text-xs"
                      >
                        {fr ? `Utiliser NAV actuel (${navPerShare.toFixed(2)})` : `Use current NAV (${navPerShare.toFixed(2)})`}
                      </button>
                    )}
                  </label>
                  <input
                    type="number"
                    value={declarationDraft.nav_per_share || ''}
                    onChange={e => setDeclarationDraft({ ...declarationDraft, nav_per_share: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    placeholder="Ex: 1250.00"
                    min={0} step={0.01}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{fr ? 'Notes internes' : 'Internal notes'}</label>
                <input
                  type="text"
                  value={declarationDraft.notes}
                  onChange={e => setDeclarationDraft({ ...declarationDraft, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder={fr ? 'Ex: Distribution fin 2025 — revenu net locatif DR+FL' : 'Ex: 2025 year-end — rental net income DR+FL'}
                />
              </div>

              {/* Répartition prévisionnelle + élections initiales */}
              {declarationDraft.total_amount > 0 && declarationDraft.nav_per_share > 0 && investorSummaries.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">{fr ? 'Élections par investisseur' : 'Per-investor elections'}</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-amber-100">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-amber-800">{fr ? 'Investisseur' : 'Investor'}</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-amber-800">{fr ? 'Parts' : 'Shares'}</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-amber-800">%</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-amber-800">{fr ? 'Dividende' : 'Dividend'}</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-amber-800">{fr ? 'Parts si rénv.' : 'Shares if reinv.'}</th>
                          <th className="px-3 py-2 text-center text-xs font-medium text-amber-800">{fr ? 'Élection' : 'Election'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {investorSummaries.filter(s => (s.total_shares || 0) > 0).map(s => {
                          const inv = investors.find((i: any) => i.id === s.investor_id)
                          const pct = totalShares > 0 ? s.total_shares / totalShares : 0
                          const amount = Math.round(declarationDraft.total_amount * pct * 100) / 100
                          const newShares = declarationDraft.nav_per_share > 0 ? amount / declarationDraft.nav_per_share : 0
                          const election = investorElections[s.investor_id] ?? 'cash'
                          return (
                            <tr key={s.investor_id} className={`hover:bg-amber-50 ${election === 'reinvest' ? 'bg-green-50' : ''}`}>
                              <td className="px-3 py-2 font-medium text-gray-900">{inv ? `${inv.first_name} ${inv.last_name}` : s.investor_id}</td>
                              <td className="px-3 py-2 text-right text-gray-700">{s.total_shares.toLocaleString()}</td>
                              <td className="px-3 py-2 text-right"><span className="bg-amber-100 text-amber-700 text-xs px-1.5 py-0.5 rounded-full">{(pct * 100).toFixed(2)}%</span></td>
                              <td className="px-3 py-2 text-right font-bold text-amber-700">{amount.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 2 })}</td>
                              <td className="px-3 py-2 text-right text-green-700">{election === 'reinvest' ? `+${newShares.toFixed(4)}` : '—'}</td>
                              <td className="px-3 py-2">
                                <div className="flex gap-2 justify-center">
                                  <button
                                    onClick={() => setInvestorElections(prev => ({ ...prev, [s.investor_id]: 'cash' }))}
                                    className={`px-2 py-1 text-xs rounded-lg border font-medium transition-colors ${election === 'cash' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'}`}
                                  >
                                    {fr ? 'Encaissement' : 'Cash'}
                                  </button>
                                  <button
                                    onClick={() => setInvestorElections(prev => ({ ...prev, [s.investor_id]: 'reinvest' }))}
                                    className={`px-2 py-1 text-xs rounded-lg border font-medium transition-colors ${election === 'reinvest' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-300 hover:border-green-400'}`}
                                  >
                                    {fr ? 'Réinvestir' : 'Reinvest'}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                      <tfoot className="bg-gray-50">
                        <tr>
                          <td className="px-3 py-2 text-xs font-bold text-gray-700" colSpan={3}>{fr ? 'Total' : 'Total'}</td>
                          <td className="px-3 py-2 text-right text-xs font-bold text-amber-800">
                            {declarationDraft.total_amount.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 2 })}
                          </td>
                          <td colSpan={2} className="px-3 py-2 text-right text-xs text-gray-500">
                            {fr ? '⚠️ T5 émis dans tous les cas (réinvestissement = report d\'impôt NON permis au Canada)' : '⚠️ T5 issued in all cases (reinvestment ≠ tax deferral under Canadian law)'}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  onClick={saveDeclaration}
                  disabled={savingDeclaration || declarationDraft.total_amount <= 0 || declarationDraft.nav_per_share <= 0}
                  className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-400 text-white font-semibold rounded-xl transition-colors flex items-center gap-2"
                >
                  {savingDeclaration ? <><span className="animate-spin">⟳</span> {fr ? 'Enregistrement...' : 'Saving...'}</> : <><span>💾</span> {fr ? 'Enregistrer la déclaration' : 'Save declaration'}</>}
                </button>
              </div>
            </div>
          )}

          {/* ── Historique des déclarations ── */}
          <div className="p-6 space-y-4">
            {loadingDeclarations ? (
              <div className="text-center py-6 text-gray-400 text-sm">{fr ? 'Chargement...' : 'Loading...'}</div>
            ) : declarations.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <span className="text-4xl block mb-3">📋</span>
                <p className="text-sm">{fr ? 'Aucune déclaration — utilisez le bouton + ci-dessus.' : 'No declarations yet — use the + button above.'}</p>
              </div>
            ) : (
              declarations.map(decl => {
                const cashAmt = (decl.elections ?? []).filter(e => e.election === 'cash').reduce((s, e) => s + e.dividend_amount, 0)
                const reinvestAmt = (decl.elections ?? []).filter(e => e.election === 'reinvest').reduce((s, e) => s + e.dividend_amount, 0)
                const isOpen = expandedDeclaration === decl.id
                const statusColors: Record<string, string> = {
                  draft: 'bg-yellow-100 text-yellow-800 border-yellow-200',
                  elected: 'bg-blue-100 text-blue-800 border-blue-200',
                  executed: 'bg-green-100 text-green-800 border-green-200',
                }
                const statusLabels: Record<string, string> = {
                  draft: fr ? 'Brouillon' : 'Draft',
                  elected: fr ? 'Élu' : 'Elected',
                  executed: fr ? 'Exécuté' : 'Executed',
                }
                return (
                  <div key={decl.id} className="border border-amber-200 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setExpandedDeclaration(isOpen ? null : decl.id)}
                      className="w-full px-5 py-4 flex items-center justify-between hover:bg-amber-50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-4">
                        <div>
                          <div className="text-sm font-bold text-gray-900">
                            {fr ? `Dividende ${decl.fiscal_year}` : `Dividend ${decl.fiscal_year}`}
                            {' — '}
                            {decl.total_amount.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {new Date(decl.declaration_date).toLocaleDateString('fr-CA')}
                            {' · '}
                            {fr ? `NAV: ${decl.nav_per_share.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 2 })}/part` : `NAV: ${decl.nav_per_share.toFixed(2)}/share`}
                            {' · '}
                            {(decl.elections ?? []).length} {fr ? 'investisseur(s)' : 'investor(s)'}
                          </div>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusColors[decl.status]}`}>
                          {statusLabels[decl.status]}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right text-xs">
                          <div className="text-blue-600 font-medium">{fr ? 'Encaissement' : 'Cash'}: {cashAmt.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}</div>
                          <div className="text-green-600 font-medium">{fr ? 'Réinv.' : 'Reinv.'}: {reinvestAmt.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}</div>
                        </div>
                        <span className="text-gray-400">{isOpen ? '▲' : '▼'}</span>
                      </div>
                    </button>

                    {isOpen && (
                      <div className="border-t border-amber-100 p-5 bg-white space-y-4">
                        {decl.notes && <p className="text-xs text-gray-500 italic">{decl.notes}</p>}

                        <div className="overflow-x-auto">
                          <table className="min-w-full text-sm">
                            <thead className="bg-amber-50">
                              <tr>
                                <th className="px-3 py-2 text-left text-xs font-medium text-amber-700">{fr ? 'Investisseur' : 'Investor'}</th>
                                <th className="px-3 py-2 text-right text-xs font-medium text-amber-700">{fr ? 'Parts' : 'Shares'}</th>
                                <th className="px-3 py-2 text-right text-xs font-medium text-amber-700">%</th>
                                <th className="px-3 py-2 text-right text-xs font-medium text-amber-700">{fr ? 'Dividende' : 'Dividend'}</th>
                                <th className="px-3 py-2 text-center text-xs font-medium text-amber-700">{fr ? 'Décision' : 'Decision'}</th>
                                <th className="px-3 py-2 text-right text-xs font-medium text-amber-700">{fr ? 'Parts émises' : 'Shares issued'}</th>
                                <th className="px-3 py-2 text-center text-xs font-medium text-amber-700">T5</th>
                                <th className="px-3 py-2 text-center text-xs font-medium text-amber-700">{fr ? 'Reçu' : 'Receipt'}</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {(decl.elections ?? []).map(elec => {
                                const inv = investors.find((i: any) => i.id === elec.investor_id)
                                return (
                                  <tr key={elec.id} className="hover:bg-amber-50">
                                    <td className="px-3 py-2 font-medium text-gray-900">{inv ? `${inv.first_name} ${inv.last_name}` : elec.investor_id}</td>
                                    <td className="px-3 py-2 text-right text-gray-600">{elec.investor_shares.toLocaleString()}</td>
                                    <td className="px-3 py-2 text-right"><span className="bg-amber-100 text-amber-700 text-xs px-1.5 py-0.5 rounded-full">{(elec.ownership_pct * 100).toFixed(2)}%</span></td>
                                    <td className="px-3 py-2 text-right font-bold text-amber-700">{elec.dividend_amount.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 2 })}</td>
                                    <td className="px-3 py-2 text-center">
                                      {decl.status === 'executed' ? (
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${elec.election === 'reinvest' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-blue-100 text-blue-700 border-blue-200'}`}>
                                          {elec.election === 'reinvest' ? (fr ? 'Réinvesti' : 'Reinvested') : (fr ? 'Encaissé' : 'Cashed')}
                                        </span>
                                      ) : (
                                        <div className="flex gap-1 justify-center">
                                          <button
                                            onClick={() => updateElectionInDb(decl.id, elec.id, 'cash')}
                                            className={`px-2 py-0.5 text-xs rounded border font-medium ${elec.election === 'cash' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-500 border-gray-300'}`}
                                          >{fr ? 'Encaissement' : 'Cash'}</button>
                                          <button
                                            onClick={() => updateElectionInDb(decl.id, elec.id, 'reinvest')}
                                            className={`px-2 py-0.5 text-xs rounded border font-medium ${elec.election === 'reinvest' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-500 border-gray-300'}`}
                                          >{fr ? 'Réinvestir' : 'Reinvest'}</button>
                                        </div>
                                      )}
                                    </td>
                                    <td className="px-3 py-2 text-right text-green-700 text-xs">
                                      {elec.shares_issued ? `+${Number(elec.shares_issued).toFixed(4)}` : '—'}
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                      {elec.t5_issued ? <span className="text-green-600 text-xs font-bold">✓</span> : <span className="text-gray-300 text-xs">—</span>}
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                      <button
                                        onClick={() => generateDividendReceipt(decl, elec)}
                                        disabled={generatingReceiptFor === elec.id}
                                        className="px-2 py-0.5 text-xs bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-300 rounded font-medium transition-colors disabled:opacity-50"
                                        title={fr ? 'Générer le reçu PDF' : 'Generate PDF receipt'}
                                      >
                                        {generatingReceiptFor === elec.id ? '⟳' : '📄 PDF'}
                                      </button>
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>

                        {decl.status !== 'executed' && (
                          <div className="flex justify-end gap-3">
                            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 max-w-sm">
                              {fr
                                ? '⚠️ Le T5 est émis dans tous les cas — le réinvestissement n\'est PAS un report d\'impôt au Canada.'
                                : '⚠️ T5 is issued in all cases — reinvestment is NOT a tax deferral under Canadian law.'}
                            </div>
                            <button
                              onClick={() => executeDeclaration(decl)}
                              disabled={executingDeclaration === decl.id}
                              className="px-5 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold rounded-xl transition-colors flex items-center gap-2"
                            >
                              {executingDeclaration === decl.id
                                ? <><span className="animate-spin">⟳</span> {fr ? 'Exécution...' : 'Executing...'}</>
                                : <><span>▶</span> {fr ? 'Exécuter la distribution' : 'Execute distribution'}</>}
                            </button>
                          </div>
                        )}

                        {decl.status === 'executed' && decl.executed_at && (
                          <p className="text-xs text-green-600 text-right">
                            ✅ {fr ? `Exécuté le ${new Date(decl.executed_at).toLocaleDateString('fr-CA')}` : `Executed on ${new Date(decl.executed_at).toLocaleDateString('en-CA')}`}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* ── Simulateur de distribution intelligente ── */}
        <div className="bg-white rounded-xl shadow-md border border-purple-100 overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600 to-purple-800 px-6 py-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <DollarSign size={20} />
              {fr ? 'Simulateur de Distribution Intelligente' : 'Smart Distribution Simulator'}
            </h3>
            <p className="text-purple-200 text-sm mt-1">
              {fr ? 'Calcul automatique basé sur revenus annuels, compte courant et réserve CAPEX' : 'Auto-calculation from annual revenues, compte courant and CAPEX reserve'}
            </p>
          </div>

          <div className="p-6 space-y-6">
            {/* Année et paramètres */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{fr ? 'Année fiscale' : 'Fiscal year'}</label>
                <select
                  value={dividendYear}
                  onChange={e => setDividendYear(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                >
                  {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{fr ? `Réserve compte courant (${capexReservePct}%)` : `CC reserve (${capexReservePct}%)`}</label>
                <input
                  type="range" min={0} max={50} step={5}
                  value={capexReservePct}
                  onChange={e => setCapexReservePct(Number(e.target.value))}
                  className="w-full"
                />
                <div className="text-xs text-gray-500 text-right">{fmtCAD(capexReserve)}</div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{fr ? 'Date de distribution' : 'Distribution date'}</label>
                <input
                  type="date"
                  value={dividendDate}
                  onChange={e => setDividendDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </div>

            {/* Analyse financière */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="text-xs text-green-600 font-medium">{fr ? `Revenus ${dividendYear}` : `${dividendYear} revenues`}</div>
                <div className="text-lg font-bold text-green-800">{fmtCAD(annualRevenues)}</div>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="text-xs text-red-600 font-medium">{fr ? `Dépenses ${dividendYear}` : `${dividendYear} expenses`}</div>
                <div className="text-lg font-bold text-red-800">{fmtCAD(annualExpenses)}</div>
              </div>
              <div className={`border rounded-lg p-3 ${netIncome >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'}`}>
                <div className={`text-xs font-medium ${netIncome >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>{fr ? 'Revenu net' : 'Net income'}</div>
                <div className={`text-lg font-bold ${netIncome >= 0 ? 'text-blue-800' : 'text-orange-800'}`}>{fmtCAD(netIncome)}</div>
              </div>
              <div className="bg-teal-50 border border-teal-200 rounded-lg p-3">
                <div className="text-xs text-teal-600 font-medium">{fr ? 'Solde C/C disponible' : 'Available CC balance'}</div>
                <div className="text-lg font-bold text-teal-800">{fmtCAD(compteCourantBalance)}</div>
              </div>
            </div>

            {/* Recommandation */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-purple-900">{fr ? 'Montant recommandé à distribuer' : 'Recommended distribution amount'}</div>
                  <div className="text-xs text-purple-600 mt-0.5">
                    {fr
                      ? `80% du revenu net, plafonné au C/C disponible (${fmtCAD(maxDistributable)}) après réserve`
                      : `80% of net income, capped at available CC (${fmtCAD(maxDistributable)}) after reserve`}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-bold text-purple-700">{fmtCAD(recommendedDistribution)}</span>
                  <button
                    onClick={() => setDividendAmount(Math.round(recommendedDistribution))}
                    className="px-3 py-1.5 bg-purple-600 text-white text-xs font-medium rounded-lg hover:bg-purple-700"
                  >
                    {fr ? 'Utiliser' : 'Use'}
                  </button>
                </div>
              </div>
            </div>

            {/* Montant personnalisé */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {fr ? 'Montant total à distribuer (CAD)' : 'Total amount to distribute (CAD)'}
              </label>
              <div className="flex gap-3">
                <input
                  type="number"
                  value={dividendAmount || ''}
                  onChange={e => setDividendAmount(parseFloat(e.target.value) || 0)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400"
                  placeholder="Ex: 25000"
                  min={0}
                  step={100}
                />
                <button
                  onClick={() => setDividendAmount(0)}
                  className="px-3 py-2 text-gray-500 hover:text-red-500 border border-gray-300 rounded-lg"
                  title={fr ? 'Réinitialiser' : 'Reset'}
                >×</button>
              </div>
              {dividendAmount > maxDistributable && (
                <p className="text-xs text-red-600 mt-1">
                  ⚠️ {fr ? `Dépasse le C/C disponible après réserve (${fmtCAD(maxDistributable)})` : `Exceeds available CC after reserve (${fmtCAD(maxDistributable)})`}
                </p>
              )}
            </div>

            {/* Répartition par investisseur */}
            {dividendAmount > 0 && investorAllocations.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">
                  {fr ? `Répartition pour ${investorAllocations.length} investisseurs` : `Breakdown for ${investorAllocations.length} investors`}
                </h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-purple-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-purple-700">{fr ? 'Investisseur' : 'Investor'}</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-purple-700">{fr ? 'Parts' : 'Shares'}</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-purple-700">%</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-purple-700">{fr ? 'Montant' : 'Amount'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {investorAllocations.map(({ investor, summary, pct, amount }) => (
                        <tr key={summary.investor_id} className="hover:bg-purple-50/50">
                          <td className="px-4 py-2.5">
                            <div className="text-sm font-medium text-gray-900">
                              {investor?.first_name} {investor?.last_name}
                            </div>
                            <div className="text-xs text-gray-500">{(investor as any)?.action_class || 'A'}</div>
                          </td>
                          <td className="px-4 py-2.5 text-right text-sm text-gray-700">{summary.total_shares.toLocaleString()}</td>
                          <td className="px-4 py-2.5 text-right">
                            <span className="inline-block bg-purple-100 text-purple-700 text-xs font-medium px-2 py-0.5 rounded-full">
                              {fmtPct(pct)}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right text-sm font-bold text-purple-700">{fmtCAD(amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td className="px-4 py-2 text-sm font-bold text-gray-700" colSpan={3}>{fr ? 'Total' : 'Total'}</td>
                        <td className="px-4 py-2 text-right text-sm font-bold text-purple-800">{fmtCAD(dividendAmount)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <button
                  onClick={handleDistributeDividends}
                  disabled={distributingDividends || dividendAmount <= 0}
                  className="mt-4 w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {distributingDividends ? (
                    <><span className="animate-spin">⟳</span> {fr ? 'Distribution en cours...' : 'Distributing...'}</>
                  ) : (
                    <><DollarSign size={18} /> {fr ? `Distribuer ${fmtCAD(dividendAmount)} aux investisseurs` : `Distribute ${fmtCAD(dividendAmount)} to investors`}</>
                  )}
                </button>
              </div>
            )}

            {totalShares === 0 && (
              <div className="text-center py-6 text-gray-500 text-sm">
                {fr ? 'Aucune part enregistrée — ajoutez des investisseurs avec des parts pour activer le simulateur.' : 'No shares recorded — add investors with shares to enable the simulator.'}
              </div>
            )}
          </div>
        </div>

        {/* ── Header Stats ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 p-6 rounded-lg border border-cyan-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-cyan-700">{fr ? 'R&D Investissement' : 'Investment R&D'}</span>
              <TrendingUp className="text-cyan-600" size={20} />
            </div>
            <p className="text-2xl font-bold text-cyan-900">{fmtCAD(totalInvestmentRnd)}</p>
          </div>
          <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-6 rounded-lg border border-indigo-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-indigo-700">{fr ? 'R&D Operation' : 'Operation R&D'}</span>
              <TrendingUp className="text-indigo-600" size={20} />
            </div>
            <p className="text-2xl font-bold text-indigo-900">{fmtCAD(totalOperationRnd)}</p>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg border border-purple-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-purple-700">{fr ? 'Total Dividendes Distribués' : 'Total Dividends Distributed'}</span>
              <DollarSign className="text-purple-600" size={20} />
            </div>
            <p className="text-2xl font-bold text-purple-900">{fmtCAD(totalDividendsDistributed)}</p>
          </div>
        </div>

        {/* ── Section R&D ───────────────────────────────────────────────────── */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp size={20} className="text-cyan-600" />
            {fr ? `Depenses R&D (${rndTransactions.length} transactions)` : `R&D Expenses (${rndTransactions.length} transactions)`}
          </h3>
          {rndTransactions.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <TrendingUp size={48} className="mx-auto text-gray-400 mb-4" />
              <p>{fr ? 'Aucune depense R&D pour le moment' : 'No R&D expenses yet'}</p>
            </div>
          ) : (
            <>
              <div className="mb-4 p-4 bg-cyan-50 rounded-lg border border-cyan-200 flex items-center justify-between">
                <span className="text-sm font-medium text-cyan-700">{fr ? 'Total depense en R&D' : 'Total spent on R&D'}</span>
                <span className="text-xl font-bold text-cyan-900">{fmtCAD(totalRndSpent)}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{fr ? 'Categorie' : 'Category'}</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{fr ? 'Montant' : 'Amount'}</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {rndTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((tx) => (
                      <tr key={tx.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{new Date(tx.date).toLocaleDateString('fr-CA')}</td>
                        <td className="px-6 py-4 max-w-[220px] text-sm font-medium text-gray-900 truncate" title={tx.description}>{tx.description}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-cyan-100 text-cyan-800">{tx.category || 'R&D'}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-gray-900">{fmtCAD(Math.abs(tx.amount))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* ── Historique Dividendes ─────────────────────────────────────────── */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <DollarSign size={20} className="text-purple-600" />
            {fr ? `Historique Dividendes (${dividendeTransactions.length} distributions)` : `Dividend History (${dividendeTransactions.length} distributions)`}
          </h3>
          {dividendeTransactions.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <DollarSign size={48} className="mx-auto text-gray-400 mb-4" />
              <p>{fr ? 'Aucun dividende distribue — utilisez le simulateur ci-dessus' : 'No dividends distributed — use the simulator above'}</p>
            </div>
          ) : (
            <>
              <div className="mb-4 p-4 bg-purple-50 rounded-lg border border-purple-200 flex items-center justify-between">
                <span className="text-sm font-medium text-purple-700">{fr ? 'Total distribue (tous temps)' : 'Total distributed (all time)'}</span>
                <span className="text-xl font-bold text-purple-900">{fmtCAD(totalDividendsDistributed)}</span>
              </div>
              {dividendsByInvestor.length > 0 && (
                <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                  <h4 className="text-sm font-semibold text-purple-900 mb-3">{fr ? 'Cumulatif par Investisseur' : 'Cumulative by Investor'}</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {dividendsByInvestor.map(({ investor, totalReceived, transactionCount }) => (
                      <div key={investor.id} className="bg-white p-3 rounded-lg border border-purple-100">
                        <div className="text-sm font-medium text-gray-900">{investor.first_name} {investor.last_name}</div>
                        <div className="text-xs text-gray-500 mt-1">{transactionCount} {fr ? 'paiement(s)' : 'payment(s)'}</div>
                        <div className="text-lg font-bold text-purple-600 mt-2">{fmtCAD(totalReceived)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{fr ? 'Investisseur' : 'Investor'}</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{fr ? 'Montant' : 'Amount'}</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {dividendeTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((tx) => {
                      const inv = investors.find(i => i.id === tx.investor_id)
                      return (
                        <tr key={tx.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{new Date(tx.date).toLocaleDateString('fr-CA')}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{inv ? `${inv.first_name} ${inv.last_name}` : 'Non assigné'}</td>
                          <td className="px-6 py-4 max-w-[220px] text-sm text-gray-900 truncate" title={tx.description}>{tx.description}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-purple-600">{fmtCAD(Math.abs(tx.amount))}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* ── Rapport trimestriel PDF ────────────────────────────────────── */}
        <div className="bg-white rounded-xl shadow-md border border-blue-200 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-6 py-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span>📊</span>
              {fr ? 'Rapports trimestriels — Investisseurs' : 'Quarterly Reports — Investors'}
            </h3>
            <p className="text-blue-200 text-sm mt-1">
              {fr
                ? 'PDF sauvegardé dans l\'historique de chaque investisseur · KPIs · Performance · Transactions · Notes fiscales'
                : 'PDF saved to each investor\'s history · KPIs · Performance · Transactions · Tax notes'}
            </p>
          </div>

          <div className="p-5 space-y-5">

            {/* ── Bannière rapports en attente (cron) ── */}
            {pendingReportRequests.length > 0 && (
              <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-amber-900">
                    🔔 {pendingReportRequests.length} {fr ? 'rapport(s) trimestriel(s) en attente de génération' : 'quarterly report(s) pending generation'}
                  </div>
                  <div className="text-xs text-amber-700 mt-0.5">
                    {fr ? 'Créés automatiquement par le cron trimestriel Vercel' : 'Created automatically by Vercel quarterly cron'}
                  </div>
                </div>
                <button
                  onClick={generatePendingReports}
                  disabled={!!batchProgress}
                  className="shrink-0 px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-400 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  {fr ? 'Générer maintenant' : 'Generate now'}
                </button>
              </div>
            )}

            {/* ── Barre de progression batch ── */}
            {batchProgress && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-xs text-blue-800 font-medium">
                  <span>{fr ? 'Génération en cours...' : 'Generating...'} {batchProgress.done} / {batchProgress.total}</span>
                  <span>{Math.round(batchProgress.done / batchProgress.total * 100)}%</span>
                </div>
                <div className="h-2 bg-blue-200 rounded-full overflow-hidden">
                  <div
                    className="h-2 bg-blue-600 rounded-full transition-all duration-300"
                    style={{ width: `${Math.round(batchProgress.done / batchProgress.total * 100)}%` }}
                  />
                </div>
                {batchProgress.current && (
                  <div className="text-xs text-blue-600 truncate">📄 {batchProgress.current}</div>
                )}
              </div>
            )}

            {/* ── Mode : Année complète × tous (4 trimestres) ── */}
            <div className="border border-indigo-200 rounded-xl bg-indigo-50/40 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">🗓️</span>
                <div>
                  <div className="text-sm font-semibold text-indigo-900">
                    {fr ? 'Générer l\'année complète — 4 trimestres × tous les investisseurs' : 'Generate full year — 4 quarters × all investors'}
                  </div>
                  <div className="text-xs text-indigo-600">
                    {fr ? 'Rapports classés T1→T4, sauvegardés dans l\'historique de chaque investisseur. Aucun téléchargement local.' : 'Reports sorted T1→T4, saved to each investor\'s history. No local download.'}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="block text-xs font-medium text-indigo-700 mb-1">{fr ? 'Année fiscale' : 'Fiscal year'}</label>
                  <select
                    value={batchYear}
                    onChange={e => setBatchYear(Number(e.target.value))}
                    className="px-3 py-2 border border-indigo-200 rounded-lg text-sm bg-white"
                    disabled={!!batchProgress}
                  >
                    {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div className="text-xs text-indigo-500 pb-2">
                  {(() => {
                    const activeCount = investors.filter((inv: any) =>
                      investorSummaries.some((s: any) => s.investor_id === inv.id && (s.total_shares || 0) > 0)
                    ).length
                    return `${activeCount} ${fr ? 'investisseur(s)' : 'investor(s)'} × 4 = ${activeCount * 4} ${fr ? 'rapports' : 'reports'}`
                  })()}
                </div>
                <button
                  onClick={generateAllYearReports}
                  disabled={!!batchProgress}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-2"
                >
                  {batchProgress
                    ? <><span className="animate-spin">⟳</span> {fr ? 'En cours...' : 'In progress...'}</>
                    : <><span>🚀</span> {fr ? `Générer tous les rapports ${batchYear}` : `Generate all ${batchYear} reports`}</>}
                </button>
              </div>
            </div>

            {/* ── Mode : Trimestre individuel ── */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{fr ? 'Année' : 'Year'}</label>
                  <select
                    value={quarterlyYear}
                    onChange={e => setQuarterlyYear(Number(e.target.value))}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                    disabled={!!batchProgress}
                  >
                    {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{fr ? 'Trimestre' : 'Quarter'}</label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map(q => (
                      <button
                        key={q}
                        onClick={() => setQuarterlyQ(q)}
                        className={`px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                          quarterlyQ === q
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                        }`}
                        disabled={!!batchProgress}
                      >
                        T{q}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="pb-0.5 text-xs text-gray-400">
                  {fr ? '— PDF téléchargé localement + sauvegardé en historique' : '— PDF downloaded locally + saved to history'}
                </div>
              </div>

              {/* Cartes investisseurs triées par % décroissant */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {investors
                  .filter((inv: any) => investorSummaries.some((s: any) => s.investor_id === inv.id && (s.total_shares || 0) > 0))
                  .map((inv: any) => {
                    const s = investorSummaries.find((s: any) => s.investor_id === inv.id)
                    const sharesTotal = investorSummaries.reduce((sum: number, s: any) => sum + (s.total_shares || 0), 0)
                    const pct = sharesTotal > 0 ? (s?.total_shares ?? 0) / sharesTotal * 100 : 0
                    const key = inv.id + '-' + quarterlyYear + '-' + quarterlyQ
                    return (
                      <div key={inv.id} className="border border-blue-100 rounded-lg p-3 flex items-center justify-between bg-blue-50/30 hover:bg-blue-50 transition-colors">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-gray-900 truncate">{inv.first_name} {inv.last_name}</div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {(s?.total_shares ?? 0).toLocaleString('fr-CA', { maximumFractionDigits: 4 })} {fr ? 'parts' : 'shares'}
                            <span className="mx-1">·</span>
                            <span className="font-medium text-blue-600">{pct.toFixed(2)}%</span>
                          </div>
                        </div>
                        <button
                          onClick={() => generateQuarterlyReport(inv.id, { year: quarterlyYear, q: quarterlyQ })}
                          disabled={!!batchProgress || generatingQuarterly === key}
                          className="shrink-0 ml-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1"
                        >
                          {generatingQuarterly === key
                            ? <><span className="animate-spin">⟳</span> PDF...</>
                            : <>📄 T{quarterlyQ} {quarterlyYear}</>}
                        </button>
                      </div>
                    )
                  })
                  .sort((a: any, b: any) => {
                    const pctA = investorSummaries.find((s: any) => s.investor_id === a.key)?.total_shares ?? 0
                    const pctB = investorSummaries.find((s: any) => s.investor_id === b.key)?.total_shares ?? 0
                    return pctB - pctA
                  })}
              </div>
            </div>
          </div>
        </div>

        {/* ── Bundle annuel par investisseur ────────────────────────────────── */}
        <div className="bg-white rounded-xl shadow-md border border-violet-200 overflow-hidden">
          <div className="bg-gradient-to-r from-violet-600 to-violet-800 px-6 py-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span>📦</span>
              {fr ? 'Bundle annuel — ZIP prêt à partager par investisseur' : 'Annual Bundle — ZIP ready to share per investor'}
            </h3>
            <p className="text-violet-200 text-sm mt-1">
              {fr
                ? 'Génère un ZIP contenant les 4 rapports trimestriels (T1→T4). Chaque PDF est aussi sauvegardé dans l\'historique de l\'investisseur.'
                : 'Generates a ZIP with all 4 quarterly reports (T1→T4). Each PDF is also saved to the investor\'s document history.'}
            </p>
          </div>
          <div className="p-5 space-y-4">

            {/* Mode "tous les investisseurs" */}
            <div className="border border-violet-200 rounded-xl bg-violet-50/40 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">🚀</span>
                <div>
                  <div className="text-sm font-semibold text-violet-900">
                    {fr ? 'Générer tous les bundles d\'un coup — un ZIP par investisseur' : 'Generate all bundles at once — one ZIP per investor'}
                  </div>
                  <div className="text-xs text-violet-600">
                    {fr
                      ? 'Chaque ZIP se télécharge automatiquement dès qu\'il est prêt. Classés par % de propriété décroissant.'
                      : 'Each ZIP downloads automatically as soon as it\'s ready. Sorted by ownership % descending.'}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="block text-xs font-medium text-violet-700 mb-1">{fr ? 'Année fiscale' : 'Fiscal year'}</label>
                  <select
                    value={bundleAllYear}
                    onChange={e => setBundleAllYear(Number(e.target.value))}
                    className="px-3 py-2 border border-violet-200 rounded-lg text-sm bg-white"
                    disabled={!!batchProgress || generatingBundleAll}
                  >
                    {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <button
                  onClick={generateAllBundles}
                  disabled={!!batchProgress || generatingBundleAll}
                  className="px-5 py-2 bg-violet-600 hover:bg-violet-700 disabled:bg-gray-400 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-2"
                >
                  {generatingBundleAll
                    ? <><span className="animate-spin">⟳</span> {fr ? 'Génération...' : 'Generating...'}</>
                    : <><span>📦</span> {fr ? `Bundle tous — ${bundleAllYear}` : `Bundle all — ${bundleAllYear}`}</>}
                </button>
              </div>
            </div>

            {/* Cartes individuelles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {investors
                .filter((inv: any) => investorSummaries.some((s: any) => s.investor_id === inv.id && (s.total_shares || 0) > 0))
                .sort((a: any, b: any) => {
                  const sA = investorSummaries.find((s: any) => s.investor_id === a.id)?.total_shares ?? 0
                  const sB = investorSummaries.find((s: any) => s.investor_id === b.id)?.total_shares ?? 0
                  return sB - sA
                })
                .map((inv: any) => {
                  const s = investorSummaries.find((s: any) => s.investor_id === inv.id)
                  const sharesTotal = investorSummaries.reduce((sum: number, s: any) => sum + (s.total_shares || 0), 0)
                  const pct = sharesTotal > 0 ? (s?.total_shares ?? 0) / sharesTotal * 100 : 0
                  const isGenerating = generatingBundle === inv.id
                  return (
                    <div key={inv.id} className="border border-violet-100 rounded-xl p-4 bg-violet-50/30 hover:bg-violet-50 transition-colors">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="text-sm font-semibold text-gray-900">{inv.first_name} {inv.last_name}</div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {(s?.total_shares ?? 0).toLocaleString('fr-CA', { maximumFractionDigits: 4 })} {fr ? 'parts' : 'shares'}
                            <span className="mx-1">·</span>
                            <span className="font-semibold text-violet-600">{pct.toFixed(2)}%</span>
                          </div>
                        </div>
                        <span className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-medium border border-violet-200">
                          #{Math.round(pct * 100) / 100 > 0 ? Math.round(pct) : '—'}%
                        </span>
                      </div>
                      <div className="text-xs text-gray-400 mb-3 flex gap-1 flex-wrap">
                        {[1, 2, 3, 4].map(q => (
                          <span key={q} className="bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-mono">T{q}</span>
                        ))}
                        <span className="text-gray-300">→</span>
                        <span className="text-violet-500 font-medium">.zip</span>
                      </div>
                      <div className="flex gap-2">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">{fr ? 'Année' : 'Year'}</label>
                          <select
                            className="px-2 py-1 border border-gray-200 rounded text-xs bg-white"
                            defaultValue={bundleAllYear}
                            id={`bundle-year-${inv.id}`}
                            disabled={isGenerating || generatingBundleAll}
                          >
                            {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                          </select>
                        </div>
                        <button
                          onClick={() => {
                            const sel = document.getElementById(`bundle-year-${inv.id}`) as HTMLSelectElement
                            const yr = sel ? parseInt(sel.value) : bundleAllYear
                            generateInvestorBundle(inv.id, yr)
                          }}
                          disabled={isGenerating || generatingBundleAll || !!batchProgress}
                          className="mt-auto px-4 py-1.5 bg-violet-600 hover:bg-violet-700 disabled:bg-gray-400 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
                        >
                          {isGenerating
                            ? <><span className="animate-spin text-sm">⟳</span> ZIP...</>
                            : <><span>📦</span> Bundle</>}
                        </button>
                      </div>
                    </div>
                  )
                })}
            </div>

            <div className="text-xs text-gray-400 bg-gray-50 rounded-lg p-3">
              💡 {fr
                ? 'Le ZIP se télécharge dans votre dossier Téléchargements. Chaque rapport PDF est aussi enregistré dans l\'onglet Documents de l\'investisseur (visible depuis Administration > Investisseurs > fiche).'
                : 'The ZIP downloads to your Downloads folder. Each PDF is also saved under the investor\'s Documents tab (visible in Administration > Investors > profile).'}
            </div>
          </div>
        </div>

      </div>
    )
  }

  // ==========================================
  // MAIN RENDER
  // ==========================================

  return (
    <div className="space-y-6 max-w-full overflow-x-hidden">
      {/* Content Area */}
      {activeSubTab === 'investisseurs' && renderInvestisseursTab()}
      {activeSubTab === 'transactions' && renderTransactionsTab()}
      {activeSubTab === 'capex' && renderCapexTab()}
      {activeSubTab === 'rd_dividendes' && renderRdDividendesTab()}
      {activeSubTab === 'rapports_fiscaux' && <TaxReports />}
      {activeSubTab === 'performance' && <PerformanceTracker />}
      {activeSubTab === 'sync_revenues' && <BookingRevenueSync />}
      {activeSubTab === 'evaluations' && <PropertyValuationManager />}
    </div>
  )
}
