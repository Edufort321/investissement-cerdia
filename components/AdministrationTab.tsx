'use client'

import { useState, useEffect, useRef } from 'react'
import { useInvestment } from '@/contexts/InvestmentContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { supabase } from '@/lib/supabase'
import { Users, Plus, Edit2, Trash2, Mail, Phone, Calendar, DollarSign, TrendingUp, X, Upload, FileText, Download, Filter, TrendingDown, ChevronDown, ChevronUp } from 'lucide-react'
import TaxReports from './TaxReports'
import PerformanceTracker from './PerformanceTracker'
import OccupationStats from './OccupationStats'
import BookingRevenueSync from './BookingRevenueSync'

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
  category: string
  payment_method: string
  reference_number: string
  status: string
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadingAttachment, setUploadingAttachment] = useState(false)

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
    category: 'capital',
    payment_method: 'virement',
    reference_number: '',
    status: 'complete',
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
    accountant_notes: null
  })

  // Fetch documents for selected investor
  useEffect(() => {
    if (selectedInvestorId) {
      fetchDocuments(selectedInvestorId)
    }
  }, [selectedInvestorId])

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

      let attachmentData: {
        attachment_name?: string
        attachment_url?: string
        attachment_storage_path?: string
        attachment_mime_type?: string
        attachment_size?: number
        attachment_uploaded_at?: string
      } = {}

      // Upload file to Supabase Storage if a file is selected
      if (selectedFile) {
        const year = new Date(transactionFormData.date).getFullYear()
        const investorId = transactionFormData.investor_id || 'shared'

        // Generate unique filename with transaction context
        const fileExt = selectedFile.name.split('.').pop()
        const cleanFileName = selectedFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')
        const timestamp = Date.now()
        const storagePath = `${investorId}/${year}/${timestamp}-${cleanFileName}`

        console.log('📤 Uploading file to:', storagePath)

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('transaction-attachments')
          .upload(storagePath, selectedFile, {
            cacheControl: '3600',
            upsert: false
          })

        if (uploadError) {
          console.error('❌ Upload error:', uploadError)
          throw new Error(`Erreur d'upload: ${uploadError.message}`)
        }

        // Get public URL (will need signing for private buckets)
        const { data: { publicUrl } } = supabase.storage
          .from('transaction-attachments')
          .getPublicUrl(storagePath)

        attachmentData = {
          attachment_name: selectedFile.name,
          attachment_url: publicUrl,
          attachment_storage_path: storagePath,
          attachment_mime_type: selectedFile.type,
          attachment_size: selectedFile.size,
          attachment_uploaded_at: new Date().toISOString()
        }

        console.log('✅ File uploaded successfully')
      }

      const dataToSubmit = {
        ...transactionFormData,
        ...attachmentData,
        investor_id: transactionFormData.investor_id || undefined,
        property_id: transactionFormData.property_id || undefined,
        payment_schedule_id: transactionFormData.payment_schedule_id || undefined
      }

      if (editingTransactionId) {
        const result = await updateTransaction(editingTransactionId, dataToSubmit)
        if (result.success) {
          setEditingTransactionId(null)
          resetTransactionForm()
        } else {
          alert('Erreur lors de la modification: ' + result.error)
        }
      } else {
        const result = await addTransaction(dataToSubmit)
        if (result.success) {
          // Si c'est un investissement avec un investisseur, créer l'entrée dans investor_investments
          if (dataToSubmit.type === 'investissement' && dataToSubmit.investor_id && shareSettings) {
            const investmentData = {
              investor_id: dataToSubmit.investor_id,
              investment_date: dataToSubmit.date,
              amount_invested: dataToSubmit.amount,
              currency: dataToSubmit.source_currency || 'CAD',
              payment_method: dataToSubmit.payment_method || '',
              reference_number: dataToSubmit.reference_number || '',
              notes: dataToSubmit.description || '',
            }

            const investmentResult = await addInvestment(investmentData)
            if (!investmentResult.success) {
              console.error('Erreur lors de la création de l\'investissement:', investmentResult.error)
              alert('Transaction créée mais erreur lors de la création des parts: ' + investmentResult.error)
            }
          }

          setShowAddTransactionForm(false)
          resetTransactionForm()
        } else {
          alert('Erreur lors de l\'ajout: ' + result.error)
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
      category: transaction.category,
      payment_method: transaction.payment_method,
      reference_number: transaction.reference_number || '',
      status: transaction.status,
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
      // Attachment fields
      attachment_name: transaction.attachment_name || null,
      attachment_url: transaction.attachment_url || null,
      attachment_storage_path: transaction.attachment_storage_path || null,
      attachment_mime_type: transaction.attachment_mime_type || null,
      attachment_size: transaction.attachment_size || null,
      attachment_uploaded_at: transaction.attachment_uploaded_at || null
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
      category: 'capital',
      payment_method: 'virement',
      reference_number: '',
      status: 'complete',
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
      // Attachment fields
      attachment_name: null,
      attachment_url: null,
      attachment_storage_path: null,
      attachment_mime_type: null,
      attachment_size: null,
      attachment_uploaded_at: null
    })
    setSelectedFile(null)
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
      depense: { bg: 'bg-red-100', text: 'text-red-800', label: 'Dépense' }
    }
    const badge = badges[type] || badges.investissement
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    )
  }

  // Filtrer les transactions
  const filteredTransactions = transactions.filter(t => {
    if (filterType !== 'all' && t.type !== filterType) return false
    if (filterCategory !== 'all' && t.category !== filterCategory) return false
    return true
  })

  // Calculs statistiques pour transactions
  const totalIn = filteredTransactions
    .filter(t => ['investissement', 'dividende'].includes(t.type))
    .reduce((sum, t) => sum + t.amount, 0)

  const totalOut = filteredTransactions
    .filter(t => ['paiement', 'depense'].includes(t.type))
    .reduce((sum, t) => sum + t.amount, 0)

  const balance = totalIn - totalOut

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

          {/* Estimated Share Value - Read-only */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="text-white" size={20} />
              <h3 className="text-sm font-medium text-white/90">Valeur Estimée (Selon ROI)</h3>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-white">
              {shareSettings?.estimated_share_value.toFixed(2) || '1.00'} CAD
            </p>
            <p className="text-xs text-white/70 mt-1">Calculée automatiquement</p>
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
              </div>

              {/* Footer Actions */}
              <div className="px-3 sm:px-4 md:px-5 py-2 sm:py-2.5 bg-gray-50 border-t border-gray-100 flex flex-row gap-1.5 sm:gap-2">
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

  const renderTransactionsTab = () => (
    <div className="space-y-6">
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

        <div className={`bg-gradient-to-br ${balance >= 0 ? 'from-blue-50 to-blue-100 border-blue-200' : 'from-orange-50 to-orange-100 border-orange-200'} p-4 rounded-lg border`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-sm font-medium ${balance >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>Solde</span>
            <DollarSign className={balance >= 0 ? 'text-blue-600' : 'text-orange-600'} size={20} />
          </div>
          <p className={`text-2xl font-bold ${balance >= 0 ? 'text-blue-900' : 'text-orange-900'}`}>
            {balance.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
          </p>
        </div>
      </div>

      {/* Barre d'actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <Filter size={20} className="text-gray-600 flex-shrink-0" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="flex-1 sm:flex-none px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent bg-white text-sm"
            >
              <option value="all">Tous les types</option>
              <option value="investissement">Investissement</option>
              <option value="paiement">Paiement</option>
              <option value="dividende">Dividende</option>
              <option value="depense">Dépense</option>
            </select>
          </div>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="w-full sm:w-auto px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent bg-white text-sm"
          >
            <option value="all">Toutes les catégories</option>
            <option value="capital">Capital</option>
            <option value="operation">Opération</option>
            <option value="maintenance">Maintenance</option>
            <option value="admin">Administration</option>
          </select>
        </div>

        <button
          onClick={() => setShowAddTransactionForm(!showAddTransactionForm)}
          className="flex items-center gap-2 bg-[#5e5e5e] hover:bg-[#3e3e3e] text-white px-4 py-2 rounded-full transition-colors w-full sm:w-auto justify-center"
        >
          {showAddTransactionForm ? <X size={20} /> : <Plus size={20} />}
          {showAddTransactionForm ? 'Annuler' : 'Nouvelle transaction'}
        </button>
      </div>

      {/* Formulaire */}
      {showAddTransactionForm && (
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md border border-gray-200">
          <h3 className="text-base sm:text-lg font-semibold mb-4">
            {editingTransactionId ? 'Modifier la transaction' : 'Nouvelle transaction'}
          </h3>
          <form onSubmit={handleTransactionSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date *</label>
                <input
                  type="date"
                  value={transactionFormData.date}
                  onChange={(e) => setTransactionFormData({ ...transactionFormData, date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type *</label>
                <select
                  value={transactionFormData.type}
                  onChange={(e) => setTransactionFormData({ ...transactionFormData, type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent bg-white"
                  required
                >
                  <option value="investissement">Investissement</option>
                  <option value="paiement">Paiement</option>
                  <option value="dividende">Dividende</option>
                  <option value="depense">Dépense</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Montant ($) *</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={transactionFormData.amount || ''}
                  onChange={(e) => {
                    const value = e.target.value.replace(',', '.')
                    // Permet les nombres avec point décimal, y compris pendant la saisie
                    if (value === '' || value === '.' || /^\d*\.?\d*$/.test(value)) {
                      const numValue = value === '' || value === '.' ? 0 : parseFloat(value)
                      setTransactionFormData({ ...transactionFormData, amount: isNaN(numValue) ? 0 : numValue })
                    }
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Catégorie *</label>
                <select
                  value={transactionFormData.category}
                  onChange={(e) => setTransactionFormData({ ...transactionFormData, category: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent bg-white"
                  required
                >
                  <option value="capital">Capital</option>
                  <option value="operation">Opération</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="admin">Administration</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Méthode de paiement *</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Statut *</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Investisseur</label>
                <select
                  value={transactionFormData.investor_id || ''}
                  onChange={(e) => setTransactionFormData({ ...transactionFormData, investor_id: e.target.value || null })}
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Propriété</label>
                <select
                  value={transactionFormData.property_id || ''}
                  onChange={(e) => setTransactionFormData({ ...transactionFormData, property_id: e.target.value || null, payment_schedule_id: null })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent bg-white"
                >
                  <option value="">Aucune</option>
                  {properties.map(prop => (
                    <option key={prop.id} value={prop.id}>
                      {prop.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Paiement lié (optionnel, si propriété sélectionnée) */}
              {transactionFormData.property_id && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Paiement lié (optionnel)
                    <span className="ml-1 text-xs text-gray-500">- Le paiement sera marqué comme "payé" automatiquement</span>
                  </label>
                  <select
                    value={transactionFormData.payment_schedule_id || ''}
                    onChange={(e) => setTransactionFormData({ ...transactionFormData, payment_schedule_id: e.target.value || null })}
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
                  {transactionFormData.payment_schedule_id && (
                    <p className="mt-1 text-xs text-blue-600">
                      ✓ Ce paiement sera automatiquement marqué comme "payé" lors de l'enregistrement de la transaction.
                    </p>
                  )}
                </div>
              )}

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
                <textarea
                  value={transactionFormData.description}
                  onChange={(e) => setTransactionFormData({ ...transactionFormData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                  rows={3}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Numéro de référence</label>
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
                    value={transactionFormData.source_amount || ''}
                    onChange={(e) => {
                      const value = e.target.value.replace(',', '.')
                      if (value === '' || value === '.' || /^\d*\.?\d*$/.test(value)) {
                        const sourceAmount = value === '' || value === '.' ? null : parseFloat(value)
                        setTransactionFormData({ ...transactionFormData, source_amount: sourceAmount })

                        // Calculer automatiquement le taux de change
                        if (sourceAmount && transactionFormData.amount > 0) {
                          const rate = transactionFormData.amount / sourceAmount
                          setTransactionFormData(prev => ({ ...prev, exchange_rate: parseFloat(rate.toFixed(4)) }))
                        }
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
                    value={transactionFormData.bank_fees || ''}
                    onChange={(e) => {
                      const value = e.target.value.replace(',', '.')
                      if (value === '' || value === '.' || /^\d*\.?\d*$/.test(value)) {
                        const bankFees = value === '' || value === '.' ? 0 : parseFloat(value)
                        setTransactionFormData({ ...transactionFormData, bank_fees: bankFees })

                        // Recalculer le taux avec les frais
                        if (transactionFormData.source_amount && transactionFormData.source_amount > 0) {
                          const amountMinusFees = transactionFormData.amount - bankFees
                          const rate = amountMinusFees / transactionFormData.source_amount
                          setTransactionFormData(prev => ({ ...prev, exchange_rate: parseFloat(rate.toFixed(4)) }))
                        }
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
                      const value = e.target.value.replace(',', '.')
                      if (value === '' || value === '.' || /^\d*\.?\d*$/.test(value)) {
                        const numValue = value === '' || value === '.' ? 1 : parseFloat(value)
                        setTransactionFormData({ ...transactionFormData, exchange_rate: isNaN(numValue) ? 1 : numValue })
                      }
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
                      const value = e.target.value.replace(',', '.')
                      if (value === '' || value === '.' || /^\d*\.?\d*$/.test(value)) {
                        const numValue = value === '' || value === '.' ? 0 : parseFloat(value)
                        setTransactionFormData({ ...transactionFormData, foreign_tax_paid: isNaN(numValue) ? 0 : numValue })
                      }
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
                      const value = e.target.value.replace(',', '.')
                      if (value === '' || value === '.' || /^\d*\.?\d*$/.test(value)) {
                        const numValue = value === '' || value === '.' ? 0 : parseFloat(value)
                        setTransactionFormData({ ...transactionFormData, foreign_tax_rate: isNaN(numValue) ? 0 : numValue })
                      }
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Catégorie fiscale</label>
                  <select
                    value={transactionFormData.fiscal_category || ''}
                    onChange={(e) => setTransactionFormData({ ...transactionFormData, fiscal_category: e.target.value || null })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent bg-white"
                  >
                    <option value="">Aucune</option>
                    <option value="rental_income">Revenu locatif</option>
                    <option value="management_fee">Frais de gestion</option>
                    <option value="utilities">Services publics</option>
                    <option value="insurance">Assurance</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="property_tax">Taxe foncière</option>
                    <option value="renovation">Rénovation (CAPEX)</option>
                    <option value="furnishing">Ameublement (CAPEX)</option>
                  </select>
                </div>

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

            {/* Section Pièce Jointe */}
            <div className="pt-4 border-t border-gray-200">
              <h4 className="text-sm sm:text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Upload size={18} />
                Pièce Jointe (Facture, Reçu, Photo)
              </h4>

              {/* Existing attachment display (when editing) */}
              {transactionFormData.attachment_storage_path && (
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <FileText size={20} className="text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{transactionFormData.attachment_name}</p>
                        <p className="text-sm text-gray-600">
                          {transactionFormData.attachment_size
                            ? `${(transactionFormData.attachment_size / 1024).toFixed(2)} KB`
                            : 'N/A'}
                          {' • '}
                          {transactionFormData.attachment_uploaded_at
                            ? new Date(transactionFormData.attachment_uploaded_at).toLocaleDateString('fr-CA')
                            : ''}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('Supprimer la pièce jointe actuelle ?')) {
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
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Supprimer la pièce jointe"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              )}

              {/* File upload input */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  {transactionFormData.attachment_storage_path
                    ? 'Remplacer la pièce jointe (optionnel)'
                    : 'Ajouter une pièce jointe (optionnel)'}
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        // Validate file size (10 MB max)
                        if (file.size > 10 * 1024 * 1024) {
                          alert('Fichier trop volumineux. Maximum 10 MB.')
                          e.target.value = ''
                          return
                        }
                        // Validate file type
                        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
                        if (!allowedTypes.includes(file.type) && !file.type.startsWith('image/')) {
                          alert('Type de fichier non autorisé. Formats acceptés: Images, PDF, Word.')
                          e.target.value = ''
                          return
                        }
                        setSelectedFile(file)
                      }
                    }}
                    accept="image/*,application/pdf,.doc,.docx"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#5e5e5e] file:text-white hover:file:bg-[#3e3e3e] file:cursor-pointer"
                  />
                  {selectedFile && (
                    <button
                      type="button"
                      onClick={() => setSelectedFile(null)}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Annuler la sélection"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
                {selectedFile && (
                  <p className="text-sm text-green-600 flex items-center gap-2">
                    ✓ Fichier sélectionné: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
                  </p>
                )}
                <p className="text-xs text-gray-500">
                  Formats acceptés: Images (JPG, PNG, GIF), PDF, Word • Taille max: 10 MB
                </p>
              </div>
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
      )}

      {/* Liste des transactions */}
      {filteredTransactions.length === 0 ? (
        <div className="bg-white p-12 rounded-lg shadow-md text-center">
          <DollarSign size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucune transaction</h3>
          <p className="text-gray-600 mb-4">
            {filterType !== 'all' || filterCategory !== 'all'
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
                        {transaction.attachment_storage_path ? (
                          <button
                            onClick={async () => {
                              try {
                                const { data, error } = await supabase.storage
                                  .from('transaction-attachments')
                                  .download(transaction.attachment_storage_path!)

                                if (error) throw error

                                // Create blob URL and download
                                const url = URL.createObjectURL(data)
                                const a = document.createElement('a')
                                a.href = url
                                a.download = transaction.attachment_name || 'fichier'
                                document.body.appendChild(a)
                                a.click()
                                document.body.removeChild(a)
                                URL.revokeObjectURL(url)
                              } catch (error: any) {
                                alert('Erreur lors du téléchargement: ' + error.message)
                              }
                            }}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors"
                            title={`Télécharger: ${transaction.attachment_name}`}
                          >
                            <FileText size={16} />
                            <Download size={14} />
                          </button>
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
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
    </div>
  )
}
