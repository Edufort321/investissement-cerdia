'use client'

import { useState, useEffect } from 'react'
import { useInvestment } from '@/contexts/InvestmentContext'
import { supabase } from '@/lib/supabase'
import { Users, Plus, Edit2, Trash2, Mail, Phone, Calendar, DollarSign, TrendingUp, X, Upload, FileText, Download, Filter, TrendingDown } from 'lucide-react'
import TransactionAttachments from './TransactionAttachments'
import TaxReports from './TaxReports'
import PerformanceTracker from './PerformanceTracker'

interface InvestorFormData {
  user_id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  username: string
  action_class: string
  total_shares: number
  share_value: number
  total_invested: number
  current_value: number
  percentage_ownership: number
  investment_type: string
  status: string
  join_date: string
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
  category: string
  payment_method: string
  reference_number: string
  status: string
  // International tax fields
  source_currency: string
  source_amount: number | null
  exchange_rate: number
  source_country: string | null
  foreign_tax_paid: number
  foreign_tax_rate: number
  tax_credit_claimable: number
  fiscal_category: string | null
  vendor_name: string | null
  accountant_notes: string | null
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

type SubTabType = 'investisseurs' | 'transactions' | 'capex' | 'rd_dividendes' | 'rapports_fiscaux' | 'performance'

export default function AdministrationTab() {
  const { investors, transactions, properties, addInvestor, updateInvestor, deleteInvestor, addTransaction, updateTransaction, deleteTransaction, loading } = useInvestment()

  // Sub-tab state
  const [activeSubTab, setActiveSubTab] = useState<SubTabType>('investisseurs')

  // Investors state
  const [showAddInvestorForm, setShowAddInvestorForm] = useState(false)
  const [editingInvestorId, setEditingInvestorId] = useState<string | null>(null)
  const [selectedInvestorId, setSelectedInvestorId] = useState<string | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [uploading, setUploading] = useState(false)

  // Transactions state
  const [showAddTransactionForm, setShowAddTransactionForm] = useState(false)
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null)
  const [filterType, setFilterType] = useState<string>('all')
  const [filterCategory, setFilterCategory] = useState<string>('all')

  const [investorFormData, setInvestorFormData] = useState<InvestorFormData>({
    user_id: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    username: '',
    action_class: 'A',
    total_shares: 0,
    share_value: 1000,
    total_invested: 0,
    current_value: 0,
    percentage_ownership: 0,
    investment_type: 'capital',
    status: 'actif',
    join_date: new Date().toISOString().split('T')[0],
    access_level: 'investor',
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
    category: 'capital',
    payment_method: 'virement',
    reference_number: '',
    status: 'complete',
    // International tax fields defaults
    source_currency: 'CAD',
    source_amount: null,
    exchange_rate: 1.0,
    source_country: null,
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
  // INVESTOR HANDLERS
  // ==========================================

  const handleInvestorSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const totalInvested = investorFormData.total_invested
    const currentValue = investorFormData.total_shares * investorFormData.share_value

    const dataToSubmit = {
      ...investorFormData,
      current_value: currentValue,
      total_invested: totalInvested
    }

    if (editingInvestorId) {
      const result = await updateInvestor(editingInvestorId, dataToSubmit)
      if (result.success) {
        setEditingInvestorId(null)
        resetInvestorForm()
      } else {
        alert('Erreur lors de la modification: ' + result.error)
      }
    } else {
      const result = await addInvestor(dataToSubmit)
      if (result.success) {
        setShowAddInvestorForm(false)
        resetInvestorForm()
      } else {
        alert('Erreur lors de l\'ajout: ' + result.error)
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
      action_class: investor.action_class,
      total_shares: investor.total_shares,
      share_value: investor.share_value,
      total_invested: investor.total_invested,
      current_value: investor.current_value,
      percentage_ownership: investor.percentage_ownership,
      investment_type: investor.investment_type,
      status: investor.status,
      join_date: investor.join_date.split('T')[0],
      access_level: investor.access_level,
      permissions: investor.permissions
    })
    setShowAddInvestorForm(true)
  }

  const handleDeleteInvestor = async (id: string, name: string) => {
    if (confirm(`Êtes-vous sûr de vouloir supprimer l'investisseur "${name}" ?`)) {
      const result = await deleteInvestor(id)
      if (!result.success) {
        alert('Erreur lors de la suppression: ' + result.error)
      }
    }
  }

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
      action_class: 'A',
      total_shares: 0,
      share_value: 1000,
      total_invested: 0,
      current_value: 0,
      percentage_ownership: 0,
      investment_type: 'capital',
      status: 'actif',
      join_date: new Date().toISOString().split('T')[0],
      access_level: 'investor',
      permissions: {
        dashboard: true,
        projet: false,
        administration: false
      }
    })
    setShowAddInvestorForm(false)
    setEditingInvestorId(null)
  }

  // ==========================================
  // TRANSACTION HANDLERS
  // ==========================================

  const handleTransactionSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const dataToSubmit = {
      ...transactionFormData,
      investor_id: transactionFormData.investor_id || null,
      property_id: transactionFormData.property_id || null
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
        setShowAddTransactionForm(false)
        resetTransactionForm()
      } else {
        alert('Erreur lors de l\'ajout: ' + result.error)
      }
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
      category: transaction.category,
      payment_method: transaction.payment_method,
      reference_number: transaction.reference_number || '',
      status: transaction.status,
      // International tax fields
      source_currency: transaction.source_currency || 'CAD',
      source_amount: transaction.source_amount || null,
      exchange_rate: transaction.exchange_rate || 1.0,
      source_country: transaction.source_country || null,
      foreign_tax_paid: transaction.foreign_tax_paid || 0,
      foreign_tax_rate: transaction.foreign_tax_rate || 0,
      tax_credit_claimable: transaction.tax_credit_claimable || 0,
      fiscal_category: transaction.fiscal_category || null,
      vendor_name: transaction.vendor_name || null,
      accountant_notes: transaction.accountant_notes || null
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
      category: 'capital',
      payment_method: 'virement',
      reference_number: '',
      status: 'complete',
      // International tax fields defaults
      source_currency: 'CAD',
      source_amount: null,
      exchange_rate: 1.0,
      source_country: null,
      foreign_tax_paid: 0,
      foreign_tax_rate: 0,
      tax_credit_claimable: 0,
      fiscal_category: null,
      vendor_name: null,
      accountant_notes: null
    })
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Gestion des Investisseurs</h2>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Gérez les investisseurs et leurs documents</p>
        </div>
        <button
          onClick={() => setShowAddInvestorForm(!showAddInvestorForm)}
          className="flex items-center gap-2 bg-[#5e5e5e] hover:bg-[#3e3e3e] text-white px-4 py-2 rounded-full transition-colors w-full sm:w-auto justify-center"
        >
          {showAddInvestorForm ? <X size={20} /> : <Plus size={20} />}
          {showAddInvestorForm ? 'Annuler' : 'Ajouter un investisseur'}
        </button>
      </div>

      {/* Add/Edit Form */}
      {showAddInvestorForm && (
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md border border-gray-200">
          <h3 className="text-base sm:text-lg font-semibold mb-4">
            {editingInvestorId ? 'Modifier l\'investisseur' : 'Nouvel investisseur'}
          </h3>
          <form onSubmit={handleInvestorSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

              {/* Informations d'investissement */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Classe de parts *</label>
                <select
                  value={investorFormData.action_class}
                  onChange={(e) => setInvestorFormData({ ...investorFormData, action_class: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent bg-white"
                  required
                >
                  <option value="A">Classe A</option>
                  <option value="B">Classe B</option>
                  <option value="C">Classe C</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Total parts *</label>
                <input
                  type="number"
                  value={investorFormData.total_shares}
                  onChange={(e) => setInvestorFormData({ ...investorFormData, total_shares: parseFloat(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                  min="0"
                  step="1"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Valeur par part (CAD $) *</label>
                <input
                  type="number"
                  value={investorFormData.share_value}
                  onChange={(e) => setInvestorFormData({ ...investorFormData, share_value: parseFloat(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                  min="0"
                  step="0.01"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Total investi (CAD $) *</label>
                <input
                  type="number"
                  value={investorFormData.total_invested}
                  onChange={(e) => setInvestorFormData({ ...investorFormData, total_invested: parseFloat(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                  min="0"
                  step="0.01"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">% de propriété *</label>
                <input
                  type="number"
                  value={investorFormData.percentage_ownership}
                  onChange={(e) => setInvestorFormData({ ...investorFormData, percentage_ownership: parseFloat(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                  min="0"
                  max="100"
                  step="0.01"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type d'investissement *</label>
                <select
                  value={investorFormData.investment_type}
                  onChange={(e) => setInvestorFormData({ ...investorFormData, investment_type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent bg-white"
                  required
                >
                  <option value="capital">Capital</option>
                  <option value="dette">Dette</option>
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
                  <option value="investor">Investisseur</option>
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
        <div className="bg-white p-12 rounded-lg shadow-md text-center">
          <Users size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucun investisseur</h3>
          <p className="text-gray-600 mb-4">Commencez par ajouter votre premier investisseur</p>
          <button
            onClick={() => setShowAddInvestorForm(true)}
            className="bg-[#5e5e5e] hover:bg-[#3e3e3e] text-white px-6 py-2 rounded-full transition-colors"
          >
            Ajouter un investisseur
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
          {investors.map((investor) => (
            <div key={investor.id} className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
              {/* Header */}
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-semibold text-lg">
                      {investor.first_name.charAt(0)}{investor.last_name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{investor.first_name} {investor.last_name}</h3>
                      <p className="text-sm text-gray-600">@{investor.username}</p>
                    </div>
                  </div>
                  {getStatusBadge(investor.status)}
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center text-gray-600 gap-2">
                    <Mail size={14} />
                    {investor.email}
                  </div>
                  {investor.phone && (
                    <div className="flex items-center text-gray-600 gap-2">
                      <Phone size={14} />
                      {investor.phone}
                    </div>
                  )}
                  <div className="flex items-center text-gray-600 gap-2">
                    <Calendar size={14} />
                    Membre depuis {new Date(investor.join_date).toLocaleDateString('fr-CA')}
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="p-6 space-y-4">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center gap-1 text-gray-600 text-xs mb-1">
                      <DollarSign size={12} />
                      Total investi
                    </div>
                    <div className="font-bold text-gray-900">
                      {investor.total_invested.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 text-gray-600 text-xs mb-1">
                      <TrendingUp size={12} />
                      Valeur actuelle
                    </div>
                    <div className="font-bold text-green-600">
                      {investor.current_value.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-600 text-xs mb-1">Parts</div>
                    <div className="font-bold text-gray-900">{investor.total_shares.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-gray-600 text-xs mb-1">Propriété</div>
                    <div className="font-bold text-gray-900">{investor.percentage_ownership.toFixed(2)}%</div>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-100">
                  <div className="text-xs text-gray-600 mb-2">Classe {investor.action_class} • {investor.investment_type}</div>
                  <div className="text-xs text-gray-500">
                    Accès: {investor.access_level === 'admin' ? 'Administrateur' : 'Investisseur'}
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="px-4 sm:px-6 py-3 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row gap-2">
                <button
                  onClick={() => setSelectedInvestorId(investor.id)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm font-medium"
                >
                  <FileText size={16} />
                  <span className="sm:inline">Documents</span>
                </button>
                <button
                  onClick={() => handleEditInvestor(investor)}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
                >
                  <Edit2 size={16} />
                  <span className="sm:hidden">Modifier</span>
                </button>
                <button
                  onClick={() => handleDeleteInvestor(investor.id, `${investor.first_name} ${investor.last_name}`)}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-medium"
                >
                  <Trash2 size={16} />
                  <span className="sm:hidden">Supprimer</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Documents Modal */}
      {selectedInvestorId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-[95vw] sm:max-w-3xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Documents</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {investors.find(i => i.id === selectedInvestorId)?.first_name} {investors.find(i => i.id === selectedInvestorId)?.last_name}
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedInvestorId(null)
                  setDocuments([])
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              {/* Upload Section */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <label className="flex flex-col items-center gap-2 cursor-pointer">
                  <Upload size={32} className="text-gray-400" />
                  <span className="text-sm font-medium text-gray-700">
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
                <div className="text-center py-12">
                  <FileText size={48} className="mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600">Aucun document pour cet investisseur</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <FileText size={20} className="text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{doc.name}</p>
                          <p className="text-sm text-gray-600">
                            {(doc.file_size / 1024).toFixed(2)} KB • {new Date(doc.uploaded_at).toLocaleDateString('fr-CA')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDownloadDocument(doc.storage_path, doc.name)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Télécharger"
                        >
                          <Download size={18} />
                        </button>
                        <button
                          onClick={() => handleDeleteDocument(doc.id, doc.storage_path)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 size={18} />
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
            {totalIn.toLocaleString('fr-CA', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })}
          </p>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-lg border border-red-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-red-700">Sorties</span>
            <TrendingDown className="text-red-600" size={20} />
          </div>
          <p className="text-2xl font-bold text-red-900">
            {totalOut.toLocaleString('fr-CA', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })}
          </p>
        </div>

        <div className={`bg-gradient-to-br ${balance >= 0 ? 'from-blue-50 to-blue-100 border-blue-200' : 'from-orange-50 to-orange-100 border-orange-200'} p-4 rounded-lg border`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-sm font-medium ${balance >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>Solde</span>
            <DollarSign className={balance >= 0 ? 'text-blue-600' : 'text-orange-600'} size={20} />
          </div>
          <p className={`text-2xl font-bold ${balance >= 0 ? 'text-blue-900' : 'text-orange-900'}`}>
            {balance.toLocaleString('fr-CA', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })}
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
                  type="number"
                  value={transactionFormData.amount}
                  onChange={(e) => setTransactionFormData({ ...transactionFormData, amount: parseFloat(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                  min="0"
                  step="0.01"
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
                  onChange={(e) => setTransactionFormData({ ...transactionFormData, property_id: e.target.value || null })}
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
                    type="number"
                    value={transactionFormData.source_amount || ''}
                    onChange={(e) => setTransactionFormData({ ...transactionFormData, source_amount: e.target.value ? parseFloat(e.target.value) : null })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                    min="0"
                    step="0.01"
                    placeholder="Montant original"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Taux de change</label>
                  <input
                    type="number"
                    value={transactionFormData.exchange_rate}
                    onChange={(e) => setTransactionFormData({ ...transactionFormData, exchange_rate: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                    min="0"
                    step="0.0001"
                    placeholder="1.0000"
                  />
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
                    type="number"
                    value={transactionFormData.foreign_tax_paid}
                    onChange={(e) => setTransactionFormData({ ...transactionFormData, foreign_tax_paid: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                    min="0"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Taux impôt étranger (%)</label>
                  <input
                    type="number"
                    value={transactionFormData.foreign_tax_rate}
                    onChange={(e) => setTransactionFormData({ ...transactionFormData, foreign_tax_rate: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                    min="0"
                    max="100"
                    step="0.01"
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

            {/* Section Pièces Jointes - Seulement lors de l'édition */}
            {editingTransactionId && (
              <div className="pt-4 border-t border-gray-200">
                <TransactionAttachments transactionId={editingTransactionId} />
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto bg-[#5e5e5e] hover:bg-[#3e3e3e] text-white px-6 py-2 rounded-full transition-colors disabled:opacity-50"
              >
                {loading ? 'Enregistrement...' : editingTransactionId ? 'Modifier' : 'Ajouter'}
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
                          {transaction.amount.toLocaleString('fr-CA', { style: 'currency', currency: 'USD' })}
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

  const renderCapexTab = () => (
    <div className="space-y-6">
      <div className="bg-white p-12 rounded-lg shadow-md text-center">
        <DollarSign size={48} className="mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">CAPEX 2025</h3>
        <p className="text-gray-600">Module en développement - Gestion des dépenses en capital</p>
      </div>
    </div>
  )

  const renderRdDividendesTab = () => (
    <div className="space-y-6">
      <div className="bg-white p-12 rounded-lg shadow-md text-center">
        <DollarSign size={48} className="mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">R&D et Dividendes</h3>
        <p className="text-gray-600">Module en développement - Gestion des dividendes et R&D</p>
      </div>
    </div>
  )

  // ==========================================
  // MAIN RENDER
  // ==========================================

  return (
    <div className="space-y-6">
      {/* Sub-Tab Navigation */}
      <div className="sticky top-16 md:top-20 z-30 bg-gray-100 border-b border-gray-200 -mx-6 px-6 pt-2">
        <nav className="-mb-px flex space-x-4 md:space-x-8 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => setActiveSubTab('investisseurs')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeSubTab === 'investisseurs'
                ? 'border-[#5e5e5e] text-[#5e5e5e]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Investisseurs
          </button>
          <button
            onClick={() => setActiveSubTab('transactions')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeSubTab === 'transactions'
                ? 'border-[#5e5e5e] text-[#5e5e5e]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Transactions
          </button>
          <button
            onClick={() => setActiveSubTab('capex')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeSubTab === 'capex'
                ? 'border-[#5e5e5e] text-[#5e5e5e]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            CAPEX 2025
          </button>
          <button
            onClick={() => setActiveSubTab('rd_dividendes')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeSubTab === 'rd_dividendes'
                ? 'border-[#5e5e5e] text-[#5e5e5e]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            R&D / Dividendes
          </button>
          <button
            onClick={() => setActiveSubTab('rapports_fiscaux')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeSubTab === 'rapports_fiscaux'
                ? 'border-[#5e5e5e] text-[#5e5e5e]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Rapports Fiscaux
          </button>
          <button
            onClick={() => setActiveSubTab('performance')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeSubTab === 'performance'
                ? 'border-[#5e5e5e] text-[#5e5e5e]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Performance ROI
          </button>
        </nav>
      </div>

      {/* Content Area */}
      {activeSubTab === 'investisseurs' && renderInvestisseursTab()}
      {activeSubTab === 'transactions' && renderTransactionsTab()}
      {activeSubTab === 'capex' && renderCapexTab()}
      {activeSubTab === 'rd_dividendes' && renderRdDividendesTab()}
      {activeSubTab === 'rapports_fiscaux' && <TaxReports />}
      {activeSubTab === 'performance' && <PerformanceTracker />}
    </div>
  )
}
