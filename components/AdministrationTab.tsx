'use client'

import { useState, useEffect, useRef } from 'react'
import { useInvestment } from '@/contexts/InvestmentContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { supabase } from '@/lib/supabase'
import { useNAVTimeline } from '@/hooks/useNAVTimeline'
import { useFinancialSummary } from '@/hooks/useFinancialSummary'
import { useOwnerDays } from '@/hooks/useOwnerDays'
import { Users, Plus, Edit2, Trash2, Mail, Phone, Calendar, DollarSign, TrendingUp, X, Upload, FileText, Download, Filter, TrendingDown, ChevronDown, ChevronUp, FileDown, Paperclip, Menu } from 'lucide-react'
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

  const { t } = useLanguage()
  const { current: navCurrent } = useNAVTimeline()
  const { summary: financialSummary } = useFinancialSummary(null)
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

  // Gmail invoice linking
  const [gmailInvoices, setGmailInvoices] = useState<Array<{ id: string; vendor_name: string | null; document_date: string | null; amount: number | null; currency: string | null; category: string }>>([])
  const [linkedGmailId, setLinkedGmailId] = useState<string>('')
  const [linkedGmailCompany, setLinkedGmailCompany] = useState<string>('CERDIA Globale')

  useEffect(() => {
    if (!showAddTransactionForm) return
    supabase.from('gmail_invoices').select('id,vendor_name,document_date,amount,currency,category')
      .in('category', ['FACTURE', 'RECU_PAIEMENT'])
      .is('cerdia_company', null)
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
    recurrence_no_end: false
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
        alert('✅ Investisseur modifié avec succès!')
      } else {
        console.error('❌ [handleInvestorSubmit] Échec de la modification:', result.error)
        alert(`❌ Erreur lors de la modification:\n\n${result.error}\n\nConsultez la console (F12) pour plus de détails.`)
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
        alert('❌ L\'email est obligatoire pour créer un investisseur')
        return
      }

      if (!dataToSubmit.password) {
        console.error('❌ [handleInvestorSubmit] Mot de passe manquant')
        alert('❌ Le mot de passe est obligatoire pour créer un investisseur.\n\nUtilisez le bouton "Générer un mot de passe".')
        return
      }

      const result = await addInvestor(dataToSubmit)
      if (result.success) {
        console.log('✅ [handleInvestorSubmit] Investisseur créé avec succès')
        setShowAddInvestorForm(false)
        resetInvestorForm()
        alert(`✅ Investisseur créé avec succès!\n\nEmail: ${dataToSubmit.email}\n\nL'investisseur peut maintenant se connecter avec son email et mot de passe.`)
      } else {
        console.error('❌ [handleInvestorSubmit] Échec de la création:', result.error)
        alert(`❌ Erreur lors de la création de l'investisseur:\n\n${result.error}\n\n⚠️ IMPORTANT: Consultez la console du navigateur (appuyez sur F12) pour voir les logs détaillés et identifier le problème.`)
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
    if (confirm(`Êtes-vous sûr de vouloir supprimer l'investisseur "${name}" ?`)) {
      const result = await deleteInvestor(id)
      if (!result.success) {
        alert('Erreur lors de la suppression: ' + result.error)
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
    setNominalValueInput(shareSettings?.nominal_share_value.toFixed(2) || '1.00')
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
      recurrence_no_end: false
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

  const resetTransactionForm = () => {
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
    if (['investissement', 'dividende'].includes(type)) {
      return <TrendingUp className="text-green-600" size={20} />
    }
    return <TrendingDown className="text-red-600" size={20} />
  }

  const getTypeBadge = (type: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      investissement: { bg: 'bg-green-100', text: 'text-green-800', label: 'Investissement' },
      paiement: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Paiement' },
      dividende: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Dividende' },
      depense: { bg: 'bg-red-100', text: 'text-red-800', label: 'Dépense' },
      loyer: { bg: 'bg-emerald-100', text: 'text-emerald-800', label: 'Loyer' },
      loyer_locatif: { bg: 'bg-teal-100', text: 'text-teal-800', label: 'Revenu locatif' },
      revenu: { bg: 'bg-cyan-100', text: 'text-cyan-800', label: 'Revenu' },
      transfert: { bg: 'bg-indigo-100', text: 'text-indigo-800', label: 'Transfert' },
      capex: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'CAPEX' },
      maintenance: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Maintenance' },
      admin: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Admin' },
      remboursement_investisseur: { bg: 'bg-pink-100', text: 'text-pink-800', label: 'Remboursement' }
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
                  title="Modifier la valeur nominale"
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
                {shareSettings?.nominal_share_value.toFixed(2) || '1.00'} CAD
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
              {navCurrent ? navCurrent.nav_per_share.toFixed(4) : '1.0000'} CAD
            </p>
            <p className="text-xs text-white/70 mt-1">Source: get_nav_timeline()</p>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 break-words">Gestion des Investisseurs</h2>
          <p className="text-xs sm:text-sm md:text-base text-gray-600 mt-1 break-words">Gérez les investisseurs et leurs documents</p>
        </div>
        <button
          onClick={handleToggleAddInvestor}
          className="flex items-center gap-2 bg-[#5e5e5e] hover:bg-[#3e3e3e] text-white px-3 sm:px-4 py-2 rounded-full transition-colors w-full sm:w-auto justify-center flex-shrink-0 text-sm sm:text-base"
        >
          {showAddInvestorForm ? <X size={18} className="sm:w-5 sm:h-5" /> : <Plus size={18} className="sm:w-5 sm:h-5" />}
          {showAddInvestorForm ? 'Annuler' : 'Ajouter un investisseur'}
        </button>
      </div>

      {/* Add/Edit Investor Form */}
      {showAddInvestorForm && (
        <div ref={investorFormRef} className="bg-white p-3 sm:p-4 md:p-6 rounded-lg shadow-md border border-gray-200 max-w-full overflow-hidden">
          <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 break-words">
            {editingInvestorId ? 'Modifier l\'investisseur' : 'Nouvel investisseur'}
          </h3>
          <form onSubmit={handleInvestorSubmit} className="space-y-3 sm:space-y-4 max-w-full">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 max-w-full">
              {/* Informations personnelles */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Prénom *</label>
                <input
                  type="text"
                  value={investorFormData.first_name}
                  onChange={(e) => setInvestorFormData({ ...investorFormData, first_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nom *</label>
                <input
                  type="text"
                  value={investorFormData.last_name}
                  onChange={(e) => setInvestorFormData({ ...investorFormData, last_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                <input
                  type="email"
                  value={investorFormData.email}
                  onChange={(e) => setInvestorFormData({ ...investorFormData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Téléphone</label>
                <input
                  type="tel"
                  value={investorFormData.phone}
                  onChange={(e) => setInvestorFormData({ ...investorFormData, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nom d'utilisateur *</label>
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
                  Mot de passe {!editingInvestorId && '*'}
                  <span className="text-xs text-gray-500 ml-2">
                    (Format: 3 chiffres + 1 lettre prénom + 3 lettres nom + 2 caractères)
                  </span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={investorFormData.password}
                    onChange={(e) => setInvestorFormData({ ...investorFormData, password: e.target.value })}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent font-mono"
                    placeholder="Cliquez sur 'Générer'"
                    required={!editingInvestorId}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (investorFormData.first_name && investorFormData.last_name) {
                        const generatedPassword = generatePassword(investorFormData.first_name, investorFormData.last_name)
                        setInvestorFormData({ ...investorFormData, password: generatedPassword })
                      } else {
                        alert('Veuillez d\'abord remplir le prénom et le nom')
                      }
                    }}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors whitespace-nowrap"
                  >
                    Générer
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  ℹ️ {editingInvestorId
                    ? 'Générez un nouveau mot de passe pour réinitialiser l\'accès de cet investisseur'
                    : 'Ce mot de passe sera utilisé pour créer le compte Supabase Auth'}
                </p>
              </div>

              {/* Informations d'investissement */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Total parts
                  <span className="text-xs text-gray-500 ml-2">(Calculé automatiquement depuis les transactions)</span>
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
                  ℹ️ Ce champ est calculé automatiquement à partir des transactions
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Valeur par part (CAD $)
                  <span className="text-xs text-gray-500 ml-2">(Défini par la valeur nominale globale)</span>
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
                  ℹ️ Modifiez la valeur via l'onglet "Valeur Nominale (Prix de vente)" en haut de la page
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Total investi (CAD $)
                  <span className="text-xs text-gray-500 ml-2">(Calculé automatiquement depuis les transactions)</span>
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
                  ℹ️ Ce champ est calculé automatiquement à partir des transactions
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  % de propriété
                  <span className="text-xs text-gray-500 ml-2">(Calculé automatiquement)</span>
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
                  ℹ️ Ce champ est calculé automatiquement à partir du ratio de parts de l'investisseur versus le total du groupe
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type d'investissement *</label>
                <select
                  value={investorFormData.investment_type}
                  onChange={(e) => setInvestorFormData({ ...investorFormData, investment_type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent bg-white"
                  required
                >
                  <option value="part">Part (Société à commandite)</option>
                  <option value="immobilier">Immobilier</option>
                  <option value="actions">Actions</option>
                  <option value="mixte">Mixte</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Statut *</label>
                <select
                  value={investorFormData.status}
                  onChange={(e) => setInvestorFormData({ ...investorFormData, status: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent bg-white"
                  required
                >
                  <option value="actif">Actif</option>
                  <option value="inactif">Inactif</option>
                  <option value="suspendu">Suspendu</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date d'adhésion *</label>
                <input
                  type="date"
                  value={investorFormData.join_date}
                  onChange={(e) => setInvestorFormData({ ...investorFormData, join_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Niveau d'accès *</label>
                <select
                  value={investorFormData.access_level}
                  onChange={(e) => setInvestorFormData({ ...investorFormData, access_level: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent bg-white"
                  required
                >
                  <option value="investisseur">Investisseur</option>
                  <option value="admin">Administrateur</option>
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
                  <span className="text-sm text-gray-700">Projet</span>
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
                  <span className="text-sm text-gray-700">Administration</span>
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
                {loading ? 'Enregistrement...' : editingInvestorId ? 'Modifier' : 'Ajouter'}
              </button>
              <button
                type="button"
                onClick={resetInvestorForm}
                className="w-full sm:w-auto bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-2 rounded-full transition-colors"
              >
                Annuler
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
                    <div className={`font-bold text-xs sm:text-sm md:text-base truncate ${roiPercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {roiPercentage >= 0 ? '+' : ''}{roiPercentage.toFixed(2)}%
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
                                {investment.share_price_at_purchase.toFixed(4)} CAD
                              </div>
                              <div>
                                <span className="font-medium">Parts:</span>{' '}
                                {investment.number_of_shares.toFixed(4)}
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
                    <span>Taux d'occupation personnel</span>
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
                  title="Exporter la fiche en PDF"
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
                          title="Télécharger"
                        >
                          <Download size={16} className="sm:w-[18px] sm:h-[18px]" />
                        </button>
                        <button
                          onClick={() => handleDeleteDocument(doc.id, doc.storage_path)}
                          className="p-1.5 sm:p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Supprimer"
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
        <h3 className="text-base font-bold text-blue-900 mb-1">Guide de saisie — Transactions</h3>
        <p className="text-sm text-blue-800">
          Ce guide explique comment enregistrer correctement une transaction pour que les rapports financiers,
          le NAV et les déclarations fiscales soient exacts. Chaque transaction doit être accompagnée
          d'une <strong>pièce jointe (facture ou reçu)</strong> comme preuve comptable.
        </p>
      </div>

      {/* Étape 1 */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="bg-gray-800 text-white px-4 py-2.5 flex items-center gap-2">
          <span className="bg-white text-gray-800 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">1</span>
          <span className="font-semibold text-sm">Champs obligatoires</span>
        </div>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { champ: '📅 Date', desc: 'Date réelle de la transaction (pas la date de saisie). Pour une facture reçue le 15 mars, inscrire 2025-03-15.' },
              { champ: '📋 Type', desc: 'Catégorie principale de la transaction (ex: Dépense, Paiement, Investissement). Détermine l\'impact sur le compte courant.' },
              { champ: '💰 Montant', desc: 'Montant dans la devise d\'origine (USD ou CAD). Le système convertit automatiquement en CAD via le taux du jour.' },
              { champ: '📝 Description', desc: 'Description courte et précise. Ex: "Facture électricité mars 2025 — Plaza Colonia" (éviter "dépense" seul).' },
            ].map(({ champ, desc }) => (
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
          <span className="font-semibold text-sm">Catégorie fiscale — choisir le bon type</span>
        </div>
        <div className="p-4 space-y-3">
          <p className="text-xs text-gray-600 mb-3">
            La catégorie fiscale détermine le traitement comptable et fiscal. En cas de doute, consultez votre comptable.
          </p>

          {/* OPEX */}
          <div>
            <div className="text-xs font-bold text-green-700 uppercase tracking-wide mb-2">OPEX — Déduit l'année courante</div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-green-50">
                    <th className="text-left p-2 text-green-800 font-semibold border border-green-100">Catégorie</th>
                    <th className="text-left p-2 text-green-800 font-semibold border border-green-100">Exemples</th>
                    <th className="text-left p-2 text-green-800 font-semibold border border-green-100">Preuve requise</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Frais de gestion', 'Honoraires gestionnaire immobilier, commission agence', 'Facture + contrat'],
                    ['Assurance propriété', 'Prime annuelle, assurance responsabilité', 'Police d\'assurance ou reçu'],
                    ['Taxes foncières', 'Taxes municipales, scolaires', 'Avis de cotisation municipal'],
                    ['Frais de condo', 'Charges mensuelles copropriété', 'Relevé de charges'],
                    ['Services publics', 'Électricité, eau, gaz, internet', 'Facture du fournisseur'],
                    ['Entretien & réparations', 'Peinture, plomberie mineure, nettoyage', 'Facture entrepreneur'],
                    ['Intérêts hypothécaires', 'Intérêts sur prêt (pas le capital)', 'Relevé annuel prêteur'],
                    ['Honoraires professionnels', 'Comptable, avocat, notaire (suivi)', 'Facture professionnelle'],
                  ].map(([cat, ex, preuve]) => (
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
            <div className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-2">CAPEX — Amorti sur plusieurs années</div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-blue-50">
                    <th className="text-left p-2 text-blue-800 font-semibold border border-blue-100">Catégorie</th>
                    <th className="text-left p-2 text-blue-800 font-semibold border border-blue-100">Exemples</th>
                    <th className="text-left p-2 text-blue-800 font-semibold border border-blue-100">Preuve requise</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Rénovation majeure', 'Refaire la toiture, fenêtres, fondations, salle de bain complète', 'Contrat + factures entrepreneur'],
                    ['Équipements', 'Électroménagers, système HVAC, chauffe-eau', 'Facture d\'achat + bon de livraison'],
                    ['Ameublement', 'Meubles, décorations pour location meublée', 'Factures d\'achat'],
                    ['Frais d\'acquisition', 'Notaire, inspection, droits de mutation', 'Facture notaire + relevé'],
                  ].map(([cat, ex, preuve]) => (
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
              <strong>Règle clé OPEX vs CAPEX :</strong> Si la dépense <em>améliore ou prolonge la durée de vie</em> de la propriété → CAPEX.
              Si elle <em>maintient l'état existant</em> → OPEX. En cas de doute pour un montant {'>'} 1 000 $, consultez votre comptable.
            </p>
          </div>
        </div>
      </div>

      {/* Étape 3 */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="bg-gray-800 text-white px-4 py-2.5 flex items-center gap-2">
          <span className="bg-white text-gray-800 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">3</span>
          <span className="font-semibold text-sm">Pièces jointes — preuve comptable obligatoire</span>
        </div>
        <div className="p-4 space-y-3">
          <p className="text-xs text-gray-600">
            Toute transaction doit être appuyée par un document justificatif. Sans preuve, la dépense peut être
            refusée lors d'une vérification fiscale (ARC / RQ).
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { icon: '🧾', titre: 'Facture fournisseur', desc: 'Numéro de facture, date, description, montant, TPS/TVQ, nom fournisseur' },
              { icon: '🏦', titre: 'Relevé bancaire', desc: 'Extrait montrant le débit avec date et montant correspondants' },
              { icon: '📸', titre: 'Reçu photo', desc: 'Photo lisible du reçu. Assurez-vous que la date, le montant et le vendeur sont visibles' },
            ].map(({ icon, titre, desc }) => (
              <div key={titre} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <div className="text-2xl mb-1">{icon}</div>
                <div className="font-semibold text-sm text-gray-800 mb-1">{titre}</div>
                <div className="text-xs text-gray-600">{desc}</div>
              </div>
            ))}
          </div>

          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 mt-2">
            <div className="font-semibold text-sm text-gray-800 mb-2">Comment joindre un fichier :</div>
            <ol className="text-xs text-gray-700 space-y-2">
              <li className="flex items-start gap-2"><span className="bg-gray-800 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center flex-shrink-0 mt-0.5">1</span> Cliquer sur <strong>"Nouvelle transaction"</strong> ou ouvrir une transaction existante via le bouton pièce jointe 📎</li>
              <li className="flex items-start gap-2"><span className="bg-gray-800 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center flex-shrink-0 mt-0.5">2</span> Défiler jusqu'à la section <strong>"Pièces jointes"</strong> en bas du formulaire</li>
              <li className="flex items-start gap-2"><span className="bg-gray-800 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center flex-shrink-0 mt-0.5">3</span> Cliquer sur <strong>"Choisir des fichiers"</strong> ou glisser-déposer directement</li>
              <li className="flex items-start gap-2"><span className="bg-gray-800 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center flex-shrink-0 mt-0.5">4</span> Formats acceptés : <strong>PDF, JPG, PNG, HEIC</strong> — taille max 10 MB par fichier</li>
              <li className="flex items-start gap-2"><span className="bg-gray-800 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center flex-shrink-0 mt-0.5">5</span> Pour une transaction existante : les pièces jointes s'ajoutent immédiatement sans re-sauvegarder</li>
            </ol>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-xs text-red-800">
              <strong>Important :</strong> Joindre la facture <em>originale</em> du fournisseur (pas un relevé de carte de crédit seul).
              Pour les transactions en USD, la facture en USD est suffisante — le système conserve le taux de conversion.
            </p>
          </div>
        </div>
      </div>

      {/* Étape 4 */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="bg-gray-800 text-white px-4 py-2.5 flex items-center gap-2">
          <span className="bg-white text-gray-800 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">4</span>
          <span className="font-semibold text-sm">Transactions en devise étrangère (USD)</span>
        </div>
        <div className="p-4 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { champ: 'Devise source', desc: 'Sélectionner USD si la facture est en dollars américains' },
              { champ: 'Montant source', desc: 'Montant exact de la facture en USD (ex: 2 500,00)' },
              { champ: 'Taux de change', desc: 'Taux USD/CAD au jour de la transaction (Banque du Canada). Le système propose le taux du jour automatiquement.' },
              { champ: 'Pays source', desc: 'Pays de l\'émetteur de la facture (ex: Panama, États-Unis). Requis pour T1135.' },
            ].map(({ champ, desc }) => (
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
        <div className="font-semibold text-sm text-gray-800 mb-2">Résumé — checklist avant de sauvegarder</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {[
            '✅ Date = date réelle de la facture',
            '✅ Type correspond au flux (entrée/sortie)',
            '✅ Catégorie fiscale sélectionnée',
            '✅ Description précise (propriété + nature)',
            '✅ Propriété liée si applicable',
            '✅ Pièce jointe (facture ou reçu) ajoutée',
            '✅ Devise USD renseignée si facture en USD',
            '✅ Notes comptable si situation particulière',
          ].map(item => (
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
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Filtres</p>
                    <select
                      value={filterType} onChange={e => setFilterType(e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:ring-1 focus:ring-gray-400"
                    >
                      <option value="all">Tous les types</option>
                      <option value="investissement">Investissement</option>
                      <option value="loyer">Loyer</option>
                      <option value="loyer_locatif">Revenu locatif</option>
                      <option value="revenu">Revenu</option>
                      <option value="dividende">Dividende</option>
                      <option value="paiement">Paiement</option>
                      <option value="depense">Dépense</option>
                      <option value="capex">CAPEX</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="admin">Administration</option>
                      <option value="remboursement_investisseur">Remboursement investisseur</option>
                      <option value="transfert">Transfert</option>
                    </select>
                    <select
                      value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:ring-1 focus:ring-gray-400"
                    >
                      <option value="all">Toutes les catégories</option>
                      <option value="capital">Capital</option>
                      <option value="operation">Opération</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="admin">Administration</option>
                    </select>
                    <select
                      value={filterYear} onChange={e => setFilterYear(e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:ring-1 focus:ring-gray-400"
                    >
                      <option value="all">Toutes les années</option>
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
                    🗓️ Contrôle mensuel
                  </button>
                  <button
                    onClick={() => { setTxInnerTab(txInnerTab === 'guide' ? 'liste' : 'guide'); setShowTxMenu(false) }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors ${txInnerTab === 'guide' ? 'text-gray-900 font-semibold bg-gray-50' : 'text-gray-700'}`}
                  >
                    📖 Guide de saisie
                  </button>
                  <div className="border-t border-gray-100 my-1" />
                  <button
                    onClick={() => { exportTransactionsPDF(); setShowTxMenu(false) }}
                    disabled={exportingPDF}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    <FileDown size={15} />
                    {exportingPDF ? 'Génération...' : 'Exporter PDF'}
                  </button>
                  <div className="px-4 py-2">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-500">
                      <input type="checkbox" checked={pdfIncludeLinks} onChange={e => setPdfIncludeLinks(e.target.checked)} className="accent-gray-700 w-3.5 h-3.5" />
                      Inclure liens PJ dans PDF
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
              {monthlyStatus === 'ok' ? 'Solde validé' : monthlyStatus === 'late' ? 'Contrôle en retard' : 'Contrôle mensuel'}
            </span>
          </button>
        </div>

        {/* Bouton Nouvelle Transaction toujours visible */}
        <button
          onClick={() => { setTxInnerTab('liste'); setShowAddTransactionForm(!showAddTransactionForm) }}
          className="flex items-center gap-2 bg-[#5e5e5e] hover:bg-[#3e3e3e] text-white px-4 py-2 rounded-full transition-colors text-sm font-medium"
        >
          {showAddTransactionForm ? <X size={18} /> : <Plus size={18} />}
          {showAddTransactionForm ? 'Annuler' : 'Nouvelle transaction'}
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
            <span className="text-sm font-medium text-green-700">Entrées</span>
            <TrendingUp className="text-green-600" size={20} />
          </div>
          <p className="text-2xl font-bold text-green-900">
            {totalIn.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
          </p>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-lg border border-red-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-red-700">Sorties</span>
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
                  {isFiltered ? 'Solde (filtré)' : 'Solde Compte Courant'}
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
            {editingTransactionId ? 'Modifier la transaction' : 'Nouvelle transaction'}
          </h3>
          <form onSubmit={handleTransactionSubmit} className="space-y-6">
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">📋 Type (À quoi sert l'argent) *</label>
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
                  <optgroup label="── Entrées d'argent ──">
                    <option value="investissement">Investissement</option>
                    <option value="loyer">Loyer</option>
                    <option value="loyer_locatif">Revenu locatif (avec compte dest.)</option>
                    <option value="revenu">Revenu général</option>
                    <option value="dividende">Dividende</option>
                  </optgroup>
                  <optgroup label="── Sorties d'argent ──">
                    <option value="paiement">Paiement</option>
                    <option value="depense">Dépense</option>
                    <option value="capex">CAPEX</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="admin">Administration</option>
                    <option value="remboursement_investisseur">Remboursement investisseur</option>
                  </optgroup>
                  <optgroup label="── Autre ──">
                    <option value="transfert">Transfert (courant ↔ CAPEX)</option>
                  </optgroup>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">🧾 Catégorie fiscale</label>
                <select
                  value={transactionFormData.fiscal_category || ''}
                  onChange={(e) => setTransactionFormData({ ...transactionFormData, fiscal_category: e.target.value || null })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent bg-white"
                >
                  <option value="">— Aucune —</option>
                  <optgroup label="── REVENUS ──">
                    <option value="rental_income">Revenu locatif</option>
                    <option value="dividend_income">Dividende / distribution</option>
                    <option value="interest_income">Intérêts reçus</option>
                    <option value="other_income">Autre revenu</option>
                  </optgroup>
                  <optgroup label="── OPEX (déduit immédiatement) ──">
                    <option value="management_fee">Frais de gestion</option>
                    <option value="insurance">Assurance propriété</option>
                    <option value="property_tax">Taxes foncières</option>
                    <option value="condo_fees">Frais de condo / charges</option>
                    <option value="utilities">Services publics (eau, élec.)</option>
                    <option value="maintenance_repair">Entretien & réparations</option>
                    <option value="professional_fees">Honoraires prof. (comptable, notaire)</option>
                    <option value="advertising">Publicité / location</option>
                    <option value="travel">Frais de déplacement</option>
                    <option value="interest_expense">Intérêts hypothécaires</option>
                    <option value="bank_fees">Frais bancaires / conversion</option>
                    <option value="other_opex">Autre OPEX</option>
                  </optgroup>
                  <optgroup label="── CAPEX (amorti sur plusieurs années) ──">
                    <option value="property_purchase">Acquisition propriété (prix d'achat)</option>
                    <option value="renovation">Rénovation majeure</option>
                    <option value="equipment">Équipements & appareils</option>
                    <option value="furnishing">Ameublement</option>
                    <option value="acquisition_costs">Frais d'acquisition (notaire, inspection)</option>
                    <option value="land_improvement">Amélioration terrain</option>
                    <option value="other_capex">Autre CAPEX</option>
                  </optgroup>
                  <optgroup label="── FINANCEMENT ──">
                    <option value="loan_principal">Remboursement capital prêt</option>
                    <option value="investor_capital">Capital investisseur</option>
                    <option value="investor_repayment">Remboursement investisseur</option>
                  </optgroup>
                </select>
              </div>
            </div>

            {/* SECTION 1b: REVENU LOCATIF — compte destination */}
            {transactionFormData.type === 'loyer_locatif' && (
              <div className="border-2 border-teal-300 rounded-lg p-4 bg-teal-50">
                <label className="block text-sm font-medium text-gray-900 mb-3">🏦 Compte de destination *</label>
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
                    🏢 COMPTE COURANT
                    <div className="text-xs mt-1 opacity-75">Le revenu va dans le compte courant</div>
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
                    <div className="text-xs mt-1 opacity-75">Le revenu va dans la réserve CAPEX</div>
                  </button>
                </div>
                {!transactionFormData.target_account && (
                  <p className="text-xs text-red-600 mt-2">⚠️ Veuillez sélectionner un compte de destination</p>
                )}
              </div>
            )}

            {/* SECTION 1c: PAIEMENT RÉCURRENT */}
            {transactionFormData.type === 'paiement' && (
              <div className="border-2 border-orange-300 rounded-lg p-4 bg-orange-50">
                <label className="block text-sm font-medium text-gray-900 mb-3">🔁 Occurrence du paiement</label>
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
                    1️⃣ UNIQUE
                    <div className="text-xs mt-1 opacity-75">Un seul paiement</div>
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
                    🔁 RÉCURRENT
                    <div className="text-xs mt-1 opacity-75">Paiements répétés</div>
                  </button>
                </div>
                {transactionFormData.occurrence_type === 'récurrent' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Fréquence</label>
                      <select
                        value={transactionFormData.recurrence_frequency || 'mensuel'}
                        onChange={(e) => setTransactionFormData({ ...transactionFormData, recurrence_frequency: e.target.value as any })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] bg-white text-sm"
                      >
                        <option value="quotidien">Quotidien</option>
                        <option value="hebdomadaire">Hebdomadaire</option>
                        <option value="mensuel">Mensuel</option>
                        <option value="trimestriel">Trimestriel</option>
                        <option value="annuel">Annuel</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date de fin</label>
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
                        Pas de date de fin (max 120 occurrences)
                      </label>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* SECTION 1d: TRANSFERT entre courant et CAPEX */}
            {transactionFormData.type === 'transfert' && (
              <div className="border-2 border-indigo-300 rounded-lg p-4 bg-indigo-50">
                <label className="block text-sm font-medium text-gray-900 mb-3">↔️ Compte source du transfert *</label>
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
                    🏢 COURANT → CAPEX
                    <div className="text-xs mt-1 opacity-75">Transférer du compte courant vers CAPEX</div>
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
                    🏗️ CAPEX → COURANT
                    <div className="text-xs mt-1 opacity-75">Transférer du CAPEX vers le compte courant</div>
                  </button>
                </div>
                {!transactionFormData.transfer_source && (
                  <p className="text-xs text-red-600 mt-2">⚠️ Veuillez sélectionner le sens du transfert</p>
                )}
              </div>
            )}

            {/* SECTION 2: SOURCE DE L'ARGENT - NOUVEAU! */}
            <div className="border-2 border-indigo-300 rounded-lg p-4 bg-indigo-50">
              <label className="block text-sm font-medium text-gray-900 mb-3">💰 D'où vient l'argent? *</label>
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
                  🏢 COMPTE COURANT
                  <div className="text-xs mt-1 opacity-75">L'entreprise paie</div>
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
                  <div className="text-xs mt-1 opacity-75">Budget CAPEX</div>
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
                  👤 INVESTISSEUR
                  <div className="text-xs mt-1 opacity-75">Payé directement</div>
                </button>
              </div>
              {transactionFormData.investor_id && (
                <p className="text-xs text-green-700 mt-2">
                  ℹ️ Un investisseur est sélectionné → La source est automatiquement "Investisseur direct"
                </p>
              )}
            </div>

            {/* SECTION 3: MONTANT ET CATÉGORIE */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">💵 Montant ($) *</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={transactionFormData.amount}
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
                <label className="block text-sm font-medium text-gray-700 mb-2">📂 Catégorie (Où va l'argent) *</label>
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
                  <option value="projet">🏠 Projet (Propriété)</option>
                  <option value="capex">🏗️ CAPEX (Transfert réserve)</option>
                  <option value="operation">⚙️ Opération (Coûts opération)</option>
                  <option value="maintenance">🔧 Maintenance (Coûts opération)</option>
                  <option value="admin">📋 Administration (Coûts opération)</option>
                </select>
              </div>
            </div>

            {/* SECTION 4: SÉLECTEUR PROPRIÉTÉ (Visible seulement si catégorie = Projet) */}
            {transactionFormData.category === 'projet' && (
              <div className="border-2 border-yellow-300 rounded-lg p-4 bg-yellow-50">
                <label className="block text-sm font-medium text-gray-900 mb-2">🏠 Propriété associée *</label>
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
                  <option value="">-- Sélectionner une propriété --</option>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">💳 Méthode de paiement *</label>
                <select
                  value={transactionFormData.payment_method}
                  onChange={(e) => setTransactionFormData({ ...transactionFormData, payment_method: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent bg-white"
                  required
                >
                  <option value="virement">Virement</option>
                  <option value="cheque">Chèque</option>
                  <option value="especes">Espèces</option>
                  <option value="carte">Carte</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">✅ Statut *</label>
                <select
                  value={transactionFormData.status}
                  onChange={(e) => setTransactionFormData({ ...transactionFormData, status: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent bg-white"
                  required
                >
                  <option value="complete">Complété</option>
                  <option value="en_attente">En attente</option>
                  <option value="annule">Annulé</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">👤 Investisseur (optionnel)</label>
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
                  <option value="">Aucun</option>
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
                <h4 className="text-sm font-semibold text-gray-900 mb-3">💰 Type de paiement investisseur</h4>
                <p className="text-xs text-gray-600 mb-3">L'investisseur paie directement - précisez le type:</p>
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
                    💵 ACHAT DE PARTS
                    <div className="text-xs mt-1 opacity-75">L'investisseur achète des parts avec son propre argent</div>
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
                    📝 DETTE À REMBOURSER
                    <div className="text-xs mt-1 opacity-75">L'entreprise doit rembourser cet investisseur</div>
                  </button>
                </div>

                {transactionFormData.investor_payment_type === 'dette_a_rembourser' && (
                  <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <p className="text-xs text-orange-800">
                      ⚠️ Une dette sera automatiquement créée pour cet investisseur.
                      Elle apparaîtra dans le tableau des dettes à rembourser.
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
                      Paiement lié (optionnel)
                    </label>
                    <select
                      value={transactionFormData.payment_schedule_id || ''}
                      onChange={(e) => setTransactionFormData({ ...transactionFormData, payment_schedule_id: e.target.value || null, payment_completion_status: e.target.value ? 'full' : null })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent bg-white"
                    >
                      <option value="">Aucun paiement lié</option>
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
                              {isOverdue ? ' 🔴 EN RETARD' : ''}
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
                        Statut du paiement
                      </label>
                      <select
                        value={transactionFormData.payment_completion_status || 'full'}
                        onChange={(e) => setTransactionFormData({ ...transactionFormData, payment_completion_status: e.target.value as 'full' | 'partial' })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent bg-white"
                      >
                        <option value="full">✅ Paiement complet - Le paiement sera marqué comme "payé"</option>
                        <option value="partial">⚠️ Paiement partiel - Le paiement restera "en attente"</option>
                      </select>
                      {transactionFormData.payment_completion_status === 'full' && (
                        <p className="mt-1 text-xs text-green-600">
                          ✓ Ce paiement sera automatiquement marqué comme "payé" lors de l'enregistrement de la transaction.
                        </p>
                      )}
                      {transactionFormData.payment_completion_status === 'partial' && (
                        <p className="mt-1 text-xs text-orange-600">
                          ⚠️ Ce paiement restera en attente. Vous pourrez créer une autre transaction pour compléter le paiement.
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
                <label className="block text-sm font-medium text-gray-700 mb-2">🔢 Numéro de référence</label>
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
              <h4 className="text-sm sm:text-base font-semibold text-gray-900 mb-3">Fiscalité Internationale (Optionnel)</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Devise source</label>
                  <select
                    value={transactionFormData.source_currency}
                    onChange={(e) => setTransactionFormData({ ...transactionFormData, source_currency: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent bg-white"
                  >
                    <option value="CAD">CAD $</option>
                    <option value="USD">USD $</option>
                    <option value="DOP">DOP (Peso Dominicain)</option>
                    <option value="EUR">EUR €</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Montant devise source</label>
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
                    placeholder="Montant original"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Frais bancaires/conversion (CAD $)</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Taux de change (calculé auto)</label>
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
                  <p className="text-xs text-gray-500 mt-1">Se calcule automatiquement ou modifiable manuellement</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Pays source</label>
                  <input
                    type="text"
                    value={transactionFormData.source_country || ''}
                    onChange={(e) => setTransactionFormData({ ...transactionFormData, source_country: e.target.value || null })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                    placeholder="Ex: République Dominicaine"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Impôt étranger payé (CAD $)</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Taux impôt étranger (%)</label>
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
                      📬 Associer une facture Gmail (optionnel)
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Facture Gmail non assignée</label>
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
                          <option value="">— Aucune —</option>
                          {gmailInvoices.map(inv => (
                            <option key={inv.id} value={inv.id}>
                              {inv.document_date ?? '?'} · {inv.vendor_name ?? 'Inconnu'} · {inv.amount ? `${inv.amount} ${inv.currency ?? 'CAD'}` : '—'} [{inv.category === 'FACTURE' ? 'Facture' : 'Reçu'}]
                            </option>
                          ))}
                        </select>
                      </div>
                      {linkedGmailId && (
                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Assigner à la compagnie</label>
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
                            ✓ La facture sera assignée et retirée de la liste "À classer"
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nom du vendeur/compagnie</label>
                  <input
                    type="text"
                    value={transactionFormData.vendor_name || ''}
                    onChange={(e) => setTransactionFormData({ ...transactionFormData, vendor_name: e.target.value || null })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                    placeholder="Nom du fournisseur"
                  />
                </div>

                {/* Crédit impôt calculé automatiquement (read-only) */}
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Crédit d'impôt réclamable (calculé auto)</label>
                  <input
                    type="number"
                    value={transactionFormData.tax_credit_claimable}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                    readOnly
                    disabled
                  />
                  <p className="text-xs text-gray-500 mt-1">Ce montant est calculé automatiquement par le système</p>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes comptable</label>
                  <textarea
                    value={transactionFormData.accountant_notes || ''}
                    onChange={(e) => setTransactionFormData({ ...transactionFormData, accountant_notes: e.target.value || null })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                    rows={2}
                    placeholder="Notes pour le comptable..."
                  />
                </div>
              </div>
            </div>

            {/* Section Pièces Jointes */}
            <div className="pt-4 border-t border-gray-200">
              <h4 className="text-sm sm:text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Paperclip size={18} />
                Pièces Jointes
              </h4>

              {editingTransactionId ? (
                <div className="space-y-4">
                  {/* Pièce jointe legacy (ancienne, 1 seul fichier) — rétrocompatibilité */}
                  {transactionFormData.attachment_storage_path && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-xs font-medium text-yellow-700 mb-2">Ancienne pièce jointe (format précédent)</p>
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
                          title="Supprimer"
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
                  <p className="text-xs text-gray-500">Les pièces jointes seront uploadées après la création de la transaction.</p>
                  <input
                    type="file"
                    multiple
                    accept="*/*"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || [])
                      const valid = files.filter(f => {
                        if (f.size > 10 * 1024 * 1024) {
                          alert(`"${f.name}" dépasse 10 MB et ne sera pas ajouté.`)
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
                  <p className="text-xs text-gray-400">Tous formats acceptés • Max 10 MB par fichier</p>
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
                  ? 'Upload en cours...'
                  : loading
                  ? 'Enregistrement...'
                  : editingTransactionId
                  ? 'Modifier'
                  : 'Ajouter'}
              </button>
              <button
                type="button"
                onClick={resetTransactionForm}
                className="w-full sm:w-auto bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-2 rounded-full transition-colors"
              >
                Annuler
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
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucune transaction</h3>
          <p className="text-gray-600 mb-4">
            {isFiltered
              ? 'Aucune transaction ne correspond aux filtres sélectionnés'
              : 'Commencez par ajouter votre première transaction'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full min-w-[640px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Montant</th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                  <th className="px-3 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Pièce jointe</th>
                  <th className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTransactions.map((transaction) => {
                  const investor = investors.find(i => i.id === transaction.investor_id)
                  const property = properties.find(p => p.id === transaction.property_id)

                  return (
                    <tr key={transaction.id} className="hover:bg-gray-50 transition-colors">
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
                      <td className="px-3 sm:px-6 py-4">
                        <div className="text-xs sm:text-sm font-medium text-gray-900">{transaction.description}</div>
                        {investor && (
                          <div className="text-xs text-gray-500">Investisseur: {investor.first_name} {investor.last_name}</div>
                        )}
                        {property && (
                          <div className="text-xs text-gray-500">Propriété: {property.name}</div>
                        )}
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                        <div className={`flex items-center gap-1 text-xs sm:text-sm font-semibold ${
                          ['investissement', 'dividende'].includes(transaction.type) ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {getTypeIcon(transaction.type)}
                          {transaction.amount.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD' })}
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          transaction.status === 'complete' ? 'bg-green-100 text-green-800' :
                          transaction.status === 'en_attente' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {transaction.status === 'complete' ? 'Complété' :
                           transaction.status === 'en_attente' ? 'En attente' : 'Annulé'}
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
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-1 sm:gap-2">
                          <button
                            onClick={() => handleEditTransaction(transaction)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Modifier"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteTransaction(transaction.id, transaction.description)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Supprimer"
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
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucune donnée</h3>
            <p className="text-gray-600">Aucune transaction pour {monthNames[selectedMonth - 1]} {selectedYear}</p>
          </div>
        ) : (
          <>
            {/* Résumé principal */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg border border-green-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-green-700">Total Revenus</span>
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
                  <span className="text-sm font-medium text-blue-700">Coûts Opération</span>
                  <TrendingDown className="text-blue-600" size={24} />
                </div>
                <p className="text-3xl font-bold text-blue-900">
                  {(compteCourant.total_operational_costs || 0).toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
                </p>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg border border-purple-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-purple-700">Dépenses Projet</span>
                  <TrendingDown className="text-purple-600" size={24} />
                </div>
                <p className="text-3xl font-bold text-purple-900">
                  {(compteCourant.total_project_expenses || 0).toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
                </p>
              </div>

              <div className={`bg-gradient-to-br ${(compteCourant.net_income || 0) >= 0 ? 'from-emerald-50 to-emerald-100 border-emerald-200' : 'from-orange-50 to-orange-100 border-orange-200'} p-6 rounded-lg border`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm font-medium ${(compteCourant.net_income || 0) >= 0 ? 'text-emerald-700' : 'text-orange-700'}`}>
                    Revenu Net
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
                  Détails Revenus
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Revenus locatifs</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {(compteCourant.rental_income || 0).toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Autres revenus</span>
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
                  Détails Coûts Opération
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Frais gestion</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {(compteCourant.management_fees || 0).toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Services publics</span>
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
                    <span className="text-sm text-gray-600">Taxes foncières</span>
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
                  Détails Dépenses Projet
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Rénovations</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {(compteCourant.renovation_costs || 0).toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Ameublement</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {(compteCourant.furnishing_costs || 0).toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Autres projets</span>
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
                  <h3 className="text-lg font-semibold text-gray-900">Détails par Projet</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Projet</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Localisation</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Revenus</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Coûts Opér.</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Dép. Projet</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Revenu Net</th>
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
              <span className="text-sm font-medium text-blue-700">CAPEX Investissement</span>
              <DollarSign className="text-blue-600" size={20} />
            </div>
            <p className="text-2xl font-bold text-blue-900">
              {totalInvestmentCapex.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
            </p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg border border-purple-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-purple-700">CAPEX Opération</span>
              <DollarSign className="text-purple-600" size={20} />
            </div>
            <p className="text-2xl font-bold text-purple-900">
              {totalOperationCapex.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
            </p>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg border border-green-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-green-700">Total Réserve CAPEX</span>
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
            Dépenses CAPEX ({capexTransactions.length} transactions)
          </h3>

          {capexTransactions.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">Aucune dépense CAPEX pour le moment</p>
            </div>
          ) : (
            <>
              <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-700">Total dépensé en CAPEX</span>
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
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Catégorie</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Montant</th>
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
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{transaction.description}</div>
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

  const renderRdDividendesTab = () => {
    // Calculer les totaux R&D depuis les comptes
    const totalInvestmentRnd = rndAccounts.reduce((sum, acc) => sum + (acc.investment_capex || 0), 0)
    const totalOperationRnd = rndAccounts.reduce((sum, acc) => sum + (acc.operation_capex || 0), 0)
    const totalDividends = rndAccounts.reduce((sum, acc) => sum + (acc.dividend_total || 0), 0)

    // Transactions R&D et Dividendes
    const rndTransactions = transactions.filter(t => t.type === 'rnd')
    const dividendeTransactions = transactions.filter(t => t.type === 'dividende')
    const totalRndSpent = rndTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0)
    const totalDividendsDistributed = dividendeTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0)

    // Dividendes par investisseur
    const dividendsByInvestor = investors.map(investor => {
      const investorDividends = dividendeTransactions.filter(t => t.investor_id === investor.id)
      const totalReceived = investorDividends.reduce((sum, t) => sum + Math.abs(t.amount), 0)
      return {
        investor,
        totalReceived,
        transactionCount: investorDividends.length
      }
    }).filter(item => item.totalReceived > 0)
    .sort((a, b) => b.totalReceived - a.totalReceived)

    return (
      <div className="space-y-6">
        {/* Header Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 p-6 rounded-lg border border-cyan-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-cyan-700">R&D Investissement</span>
              <TrendingUp className="text-cyan-600" size={20} />
            </div>
            <p className="text-2xl font-bold text-cyan-900">
              {totalInvestmentRnd.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
            </p>
          </div>

          <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-6 rounded-lg border border-indigo-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-indigo-700">R&D Opération</span>
              <TrendingUp className="text-indigo-600" size={20} />
            </div>
            <p className="text-2xl font-bold text-indigo-900">
              {totalOperationRnd.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
            </p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg border border-purple-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-purple-700">Total Dividendes</span>
              <DollarSign className="text-purple-600" size={20} />
            </div>
            <p className="text-2xl font-bold text-purple-900">
              {totalDividends.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
            </p>
          </div>
        </div>

        {/* Section R&D */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp size={20} className="text-cyan-600" />
            Dépenses R&D ({rndTransactions.length} transactions)
          </h3>

          {rndTransactions.length === 0 ? (
            <div className="text-center py-12">
              <TrendingUp size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">Aucune dépense R&D pour le moment</p>
            </div>
          ) : (
            <>
              <div className="mb-4 p-4 bg-cyan-50 rounded-lg border border-cyan-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-cyan-700">Total dépensé en R&D</span>
                  <span className="text-xl font-bold text-cyan-900">
                    {totalRndSpent.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Catégorie</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Montant</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {rndTransactions
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map((transaction) => (
                      <tr key={transaction.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{new Date(transaction.date).toLocaleDateString('fr-CA')}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{transaction.description}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 text-xs font-medium rounded-full bg-cyan-100 text-cyan-800">
                            {transaction.category || 'R&D'}
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

        {/* Section Dividendes */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <DollarSign size={20} className="text-purple-600" />
            Dividendes Distribués ({dividendeTransactions.length} transactions)
          </h3>

          {dividendeTransactions.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">Aucun dividende distribué pour le moment</p>
            </div>
          ) : (
            <>
              <div className="mb-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-purple-700">Total distribué</span>
                  <span className="text-xl font-bold text-purple-900">
                    {totalDividendsDistributed.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
                  </span>
                </div>
              </div>

              {/* Dividendes par investisseur */}
              {dividendsByInvestor.length > 0 && (
                <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                  <h4 className="text-sm font-semibold text-purple-900 mb-3">Répartition par Investisseur</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {dividendsByInvestor.map(({ investor, totalReceived, transactionCount }) => (
                      <div key={investor.id} className="bg-white p-3 rounded-lg border border-purple-100">
                        <div className="text-sm font-medium text-gray-900">
                          {investor.first_name} {investor.last_name}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {transactionCount} paiement{transactionCount > 1 ? 's' : ''}
                        </div>
                        <div className="text-lg font-bold text-purple-600 mt-2">
                          {totalReceived.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tableau des transactions dividendes */}
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Investisseur</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Montant</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {dividendeTransactions
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map((transaction) => {
                        const investor = investors.find(inv => inv.id === transaction.investor_id)
                        return (
                          <tr key={transaction.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{new Date(transaction.date).toLocaleDateString('fr-CA')}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {investor ? `${investor.first_name} ${investor.last_name}` : 'Non assigné'}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-900">{transaction.description}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <span className="text-sm font-semibold text-purple-600">
                                {Math.abs(transaction.amount).toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                  </tbody>
                </table>
              </div>
            </>
          )}
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
