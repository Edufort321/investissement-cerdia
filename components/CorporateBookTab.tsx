'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Building2, FileText, Users, Gavel, Calendar, Plus, Upload, Download, Eye, Trash2, Edit2, X, Filter, ChevronDown, DollarSign } from 'lucide-react'

interface CorporateBookEntry {
  id: string
  entry_type: string
  entry_date: string
  title: string
  description: string | null
  property_id: string | null
  transaction_id: string | null
  investor_id: string | null
  amount: number | null
  currency: string
  metadata: any
  has_documents: boolean
  status: string
  legal_reference: string | null
  notes: string | null
  created_at: string
  property_name?: string
  property_location?: string
  transaction_description?: string
  investor_name?: string
  document_count?: number
}

interface FormData {
  entry_type: string
  entry_date: string
  title: string
  description: string
  property_id: string
  transaction_id: string
  investor_id: string
  amount: string
  currency: string
  status: string
  legal_reference: string
  notes: string
  metadata: any
}

const ENTRY_TYPES = {
  property_acquisition: { label: '🏢 Achat immobilier', icon: Building2, color: 'blue' },
  property_sale: { label: '💰 Vente immobilier', icon: Building2, color: 'green' },
  share_issuance: { label: '📈 Émission de parts', icon: Users, color: 'purple' },
  share_transfer: { label: '🔄 Transfert de parts', icon: Users, color: 'orange' },
  share_redemption: { label: '📉 Rachat de parts', icon: Users, color: 'red' },
  general_meeting: { label: '👥 Assemblée générale', icon: Calendar, color: 'indigo' },
  board_meeting: { label: '🏛️ Conseil d\'administration', icon: Gavel, color: 'slate' },
  resolution: { label: '📜 Résolution', icon: FileText, color: 'amber' },
  legal_document: { label: '⚖️ Document légal', icon: FileText, color: 'gray' },
  other: { label: '📋 Autre', icon: FileText, color: 'gray' }
}

const STATUS_OPTIONS = {
  draft: { label: 'Brouillon', color: 'gray' },
  approved: { label: 'Approuvé', color: 'green' },
  filed: { label: 'Archivé', color: 'blue' }
}

export default function CorporateBookTab() {
  const [entries, setEntries] = useState<CorporateBookEntry[]>([])
  const [filteredEntries, setFilteredEntries] = useState<CorporateBookEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selectedFilter, setSelectedFilter] = useState<string>('all')
  const [properties, setProperties] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [investors, setInvestors] = useState<any[]>([])
  const [showQuickActionMenu, setShowQuickActionMenu] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [existingDocuments, setExistingDocuments] = useState<any[]>([])
  const [uploadingDocs, setUploadingDocs] = useState(false)
  const [showFilterMenu, setShowFilterMenu] = useState(false)

  const [formData, setFormData] = useState<FormData>({
    entry_type: 'property_acquisition',
    entry_date: new Date().toISOString().split('T')[0],
    title: '',
    description: '',
    property_id: '',
    transaction_id: '',
    investor_id: '',
    amount: '',
    currency: 'CAD',
    status: 'draft',
    legal_reference: '',
    notes: '',
    metadata: {}
  })

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    applyFilter()
  }, [entries, selectedFilter])

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.dropdown-menu')) {
        setShowFilterMenu(false)
        setShowQuickActionMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchData = async () => {
    setLoading(true)

    // Fetch entries
    const { data: entriesData, error: entriesError } = await supabase
      .from('corporate_book_view')
      .select('*')
      .order('entry_date', { ascending: false })

    if (entriesError) {
      console.error('Error fetching corporate book:', entriesError)
    } else {
      setEntries(entriesData || [])
    }

    // Fetch properties for dropdown
    const { data: propertiesData } = await supabase
      .from('properties')
      .select('id, name, location')
      .order('name')

    setProperties(propertiesData || [])

    // Fetch transactions for dropdown
    const { data: transactionsData } = await supabase
      .from('transactions')
      .select('id, description, date, amount')
      .order('date', { ascending: false })

    setTransactions(transactionsData || [])

    // Fetch investors for dropdown
    const { data: investorsData } = await supabase
      .from('investors')
      .select('id, first_name, last_name')
      .order('first_name')

    setInvestors(investorsData || [])

    setLoading(false)
  }

  const applyFilter = () => {
    if (selectedFilter === 'all') {
      setFilteredEntries(entries)
    } else {
      setFilteredEntries(entries.filter(e => e.entry_type === selectedFilter))
    }
  }

  // Auto-populate fields when transaction is selected
  const handleTransactionChange = (transactionId: string) => {
    setFormData({ ...formData, transaction_id: transactionId })

    if (transactionId) {
      const transaction = transactions.find(t => t.id === transactionId)
      if (transaction) {
        // Auto-fill related fields from transaction
        setFormData(prev => ({
          ...prev,
          transaction_id: transactionId,
          entry_date: transaction.date,
          amount: transaction.amount?.toString() || prev.amount,
          description: transaction.description || prev.description,
          property_id: transaction.property_id || prev.property_id
        }))
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const dataToSubmit = {
      entry_type: formData.entry_type,
      entry_date: formData.entry_date,
      title: formData.title,
      description: formData.description || null,
      property_id: formData.property_id || null,
      transaction_id: formData.transaction_id || null,
      investor_id: formData.investor_id || null,
      amount: formData.amount ? parseFloat(formData.amount) : null,
      currency: formData.currency,
      status: formData.status,
      legal_reference: formData.legal_reference || null,
      notes: formData.notes || null,
      metadata: formData.metadata
    }

    if (editingId) {
      const { error } = await supabase
        .from('corporate_book')
        .update(dataToSubmit)
        .eq('id', editingId)

      if (error) {
        console.error('Error updating entry:', error)
        alert('Erreur lors de la mise à jour')
      } else {
        // Upload new documents if any
        await uploadDocuments(editingId)
        alert('Entrée mise à jour avec succès!')
        setShowAddForm(false)
        setEditingId(null)
        setExistingDocuments([])
        resetForm()
        fetchData()
      }
    } else {
      const { data, error } = await supabase
        .from('corporate_book')
        .insert([dataToSubmit])
        .select()

      if (error) {
        console.error('Error creating entry:', error)
        alert('Erreur lors de la création')
      } else if (data && data[0]) {
        // Upload documents if any
        await uploadDocuments(data[0].id)
        alert('Entrée créée avec succès!')
        setShowAddForm(false)
        resetForm()
        fetchData()
      }
    }
  }

  const handleEdit = async (entry: CorporateBookEntry) => {
    setFormData({
      entry_type: entry.entry_type,
      entry_date: entry.entry_date,
      title: entry.title,
      description: entry.description || '',
      property_id: entry.property_id || '',
      transaction_id: entry.transaction_id || '',
      investor_id: entry.investor_id || '',
      amount: entry.amount?.toString() || '',
      currency: entry.currency,
      status: entry.status,
      legal_reference: entry.legal_reference || '',
      notes: entry.notes || '',
      metadata: entry.metadata || {}
    })
    setEditingId(entry.id)

    // Fetch existing documents for this entry
    const { data: docs } = await supabase
      .from('corporate_book_documents')
      .select('*')
      .eq('corporate_book_id', entry.id)

    setExistingDocuments(docs || [])
    setShowAddForm(true)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files)
      setUploadedFiles([...uploadedFiles, ...newFiles])
    }
  }

  const removeFile = (index: number) => {
    setUploadedFiles(uploadedFiles.filter((_, i) => i !== index))
  }

  const deleteExistingDocument = async (docId: string, storagePath: string) => {
    if (!confirm('Supprimer ce document?')) return

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('corporate-documents')
      .remove([storagePath])

    if (storageError) {
      console.error('Error deleting from storage:', storageError)
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('corporate_book_documents')
      .delete()
      .eq('id', docId)

    if (dbError) {
      console.error('Error deleting document:', dbError)
      alert('Erreur lors de la suppression du document')
    } else {
      setExistingDocuments(existingDocuments.filter(d => d.id !== docId))
      alert('Document supprimé avec succès!')
    }
  }

  const uploadDocuments = async (corporateBookId: string) => {
    if (uploadedFiles.length === 0) return

    setUploadingDocs(true)

    for (const file of uploadedFiles) {
      const fileExt = file.name.split('.').pop()
      const fileName = `${corporateBookId}/${Date.now()}_${file.name}`

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('corporate-documents')
        .upload(fileName, file)

      if (uploadError) {
        console.error('Error uploading file:', uploadError)
        continue
      }

      // Create document record
      await supabase
        .from('corporate_book_documents')
        .insert({
          corporate_book_id: corporateBookId,
          document_type: 'other',
          file_name: file.name,
          file_size: file.size,
          file_type: file.type,
          storage_path: fileName,
          is_original: true,
          is_signed: false
        })
    }

    setUploadingDocs(false)
    setUploadedFiles([])
  }

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer "${title}" ?`)) return

    const { error } = await supabase
      .from('corporate_book')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting entry:', error)
      alert('Erreur lors de la suppression')
    } else {
      alert('Entrée supprimée avec succès!')
      fetchData()
    }
  }

  const resetForm = () => {
    setFormData({
      entry_type: 'property_acquisition',
      entry_date: new Date().toISOString().split('T')[0],
      title: '',
      description: '',
      property_id: '',
      transaction_id: '',
      investor_id: '',
      amount: '',
      currency: 'CAD',
      status: 'draft',
      legal_reference: '',
      notes: '',
      metadata: {}
    })
    setUploadedFiles([])
    setExistingDocuments([])
  }

  // Quick Action: Create pre-filled entries for common events
  const handleQuickAction = (actionType: string) => {
    resetForm()
    const today = new Date().toISOString().split('T')[0]

    switch (actionType) {
      case 'general_meeting':
        setFormData({
          entry_type: 'general_meeting',
          entry_date: today,
          title: 'Assemblée Générale',
          description: '',
          property_id: '',
          transaction_id: '',
          investor_id: '',
          amount: '',
          currency: 'CAD',
          status: 'draft',
          legal_reference: '',
          notes: '',
          metadata: {}
        })
        break
      case 'board_meeting':
        setFormData({
          entry_type: 'board_meeting',
          entry_date: today,
          title: 'Réunion du Conseil d\'Administration',
          description: '',
          property_id: '',
          transaction_id: '',
          investor_id: '',
          amount: '',
          currency: 'CAD',
          status: 'draft',
          legal_reference: '',
          notes: '',
          metadata: {}
        })
        break
      case 'resolution':
        setFormData({
          entry_type: 'resolution',
          entry_date: today,
          title: 'Résolution',
          description: '',
          property_id: '',
          transaction_id: '',
          investor_id: '',
          amount: '',
          currency: 'CAD',
          status: 'draft',
          legal_reference: '',
          notes: '',
          metadata: {}
        })
        break
      case 'share_issuance':
        setFormData({
          entry_type: 'share_issuance',
          entry_date: today,
          title: 'Émission de Parts',
          description: '',
          property_id: '',
          transaction_id: '',
          investor_id: '',
          amount: '',
          currency: 'CAD',
          status: 'draft',
          legal_reference: '',
          notes: '',
          metadata: {}
        })
        break
      default:
        break
    }

    setShowQuickActionMenu(false)
    setShowAddForm(true)
    setEditingId(null)
  }

  const exportToCSV = () => {
    const headers = ['Date', 'Type', 'Titre', 'Description', 'Montant', 'Statut', 'Référence légale']
    const rows = filteredEntries.map(entry => [
      entry.entry_date,
      ENTRY_TYPES[entry.entry_type as keyof typeof ENTRY_TYPES]?.label || entry.entry_type,
      entry.title,
      entry.description || '',
      entry.amount ? `${entry.amount} ${entry.currency}` : '',
      STATUS_OPTIONS[entry.status as keyof typeof STATUS_OPTIONS]?.label || entry.status,
      entry.legal_reference || ''
    ])

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `livre_entreprise_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">Livre d'entreprise</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Registre officiel pour notaires, avocats et conformité légale • {filteredEntries.length} entrée{filteredEntries.length > 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Filter Menu */}
          <div className="relative dropdown-menu">
            <button
              onClick={() => setShowFilterMenu(!showFilterMenu)}
              className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 rounded-full text-sm font-medium transition-colors"
            >
              <Filter size={16} />
              Filtrer
              <ChevronDown size={14} />
            </button>
            {showFilterMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 overflow-y-auto dropdown-menu">
                <div className="py-2">
                  <button
                    onClick={() => { setSelectedFilter('all'); setShowFilterMenu(false); }}
                    className={`w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center justify-between text-sm ${
                      selectedFilter === 'all' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                    }`}
                  >
                    <span>Tous</span>
                    <span className="text-xs bg-gray-200 px-2 py-0.5 rounded-full">{entries.length}</span>
                  </button>
                  <div className="border-t border-gray-100 my-1"></div>
                  {Object.entries(ENTRY_TYPES).map(([key, value]) => {
                    const count = entries.filter(e => e.entry_type === key).length
                    const Icon = value.icon
                    return (
                      <button
                        key={key}
                        onClick={() => { setSelectedFilter(key); setShowFilterMenu(false); }}
                        className={`w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 text-sm ${
                          selectedFilter === key ? `bg-${value.color}-50 text-${value.color}-700 font-medium` : 'text-gray-700'
                        }`}
                      >
                        <Icon size={14} />
                        <span className="flex-1">{value.label.replace(/[🏢💰📈🔄📉👥🏛️📜⚖️📋]/g, '').trim()}</span>
                        <span className="text-xs bg-gray-200 px-2 py-0.5 rounded-full">{count}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 rounded-full text-sm font-medium transition-colors"
          >
            <Download size={16} />
            Export CSV
          </button>

          {/* Quick Action Menu */}
          <div className="relative dropdown-menu">
            <button
              onClick={() => setShowQuickActionMenu(!showQuickActionMenu)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-full text-sm font-medium transition-colors"
            >
              <Plus size={16} />
              +Action
            </button>
            {showQuickActionMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 z-50 dropdown-menu">
                <div className="py-2">
                  <button
                    onClick={() => handleQuickAction('general_meeting')}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 text-sm"
                  >
                    <Calendar size={16} className="text-indigo-600" />
                    Assemblée Générale
                  </button>
                  <button
                    onClick={() => handleQuickAction('board_meeting')}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 text-sm"
                  >
                    <Gavel size={16} className="text-slate-600" />
                    Réunion du CA
                  </button>
                  <button
                    onClick={() => handleQuickAction('resolution')}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 text-sm"
                  >
                    <FileText size={16} className="text-amber-600" />
                    Résolution
                  </button>
                  <button
                    onClick={() => handleQuickAction('share_issuance')}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 text-sm"
                  >
                    <Users size={16} className="text-purple-600" />
                    Émission de Parts
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => { resetForm(); setShowAddForm(true); setEditingId(null); }}
            className="flex items-center gap-2 px-4 py-2 bg-[#5e5e5e] hover:bg-[#3e3e3e] text-white rounded-full text-sm font-medium transition-colors"
          >
            <Plus size={16} />
            Nouvelle entrée
          </button>
        </div>
      </div>

      {/* Entries List */}
      {filteredEntries.length === 0 ? (
        <div className="bg-white p-12 rounded-lg shadow-md border border-gray-200 text-center">
          <FileText size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Aucune entrée dans le livre d'entreprise</h3>
          <p className="text-sm text-gray-500">Cliquez sur "Nouvelle entrée" ou "+Action" pour commencer</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
          {filteredEntries.map(entry => {
            const typeInfo = ENTRY_TYPES[entry.entry_type as keyof typeof ENTRY_TYPES]
            const statusInfo = STATUS_OPTIONS[entry.status as keyof typeof STATUS_OPTIONS]
            const Icon = typeInfo?.icon || FileText

            return (
              <div key={entry.id} className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
                {/* Header with icon and status */}
                <div className="p-4 sm:p-6 border-b border-gray-100">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className={`p-2 rounded-lg bg-${typeInfo?.color || 'gray'}-50 flex-shrink-0`}>
                      <Icon size={20} className={`text-${typeInfo?.color || 'gray'}-600`} />
                    </div>
                    <div className="flex flex-col gap-2 items-end">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium bg-${statusInfo?.color || 'gray'}-100 text-${statusInfo?.color || 'gray'}-800`}>
                        {statusInfo?.label || entry.status}
                      </span>
                      {entry.has_documents && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 flex items-center gap-1">
                          <FileText size={12} />
                          {entry.document_count}
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-500 mb-1">{typeInfo?.label.replace(/[🏢💰📈🔄📉👥🏛️📜⚖️📋]/g, '').trim()}</div>
                    <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg mb-2">{entry.title}</h3>
                    <div className="flex items-center text-sm text-gray-600 gap-1 mb-2">
                      <Calendar size={14} />
                      {new Date(entry.entry_date).toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                  </div>
                </div>

                {/* Body */}
                <div className="p-4 sm:p-6 space-y-3">
                  {entry.description && (
                    <p className="text-sm text-gray-600 line-clamp-3">{entry.description}</p>
                  )}

                  {/* Details */}
                  <div className="space-y-2 text-sm">
                    {entry.property_name && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Building2 size={14} className="text-purple-600" />
                        <span className="font-medium">{entry.property_name}</span>
                      </div>
                    )}
                    {entry.amount && (
                      <div className="flex items-center gap-2 text-gray-900 font-semibold">
                        <DollarSign size={14} />
                        {entry.amount.toLocaleString('fr-CA')} {entry.currency}
                      </div>
                    )}
                    {entry.legal_reference && (
                      <div className="flex items-center gap-2 text-gray-600 text-xs">
                        <Gavel size={12} />
                        {entry.legal_reference}
                      </div>
                    )}
                  </div>

                  {/* Notes preview */}
                  {entry.notes && (
                    <div className="pt-3 border-t border-gray-100">
                      <div className="text-xs text-gray-500 mb-1">Notes</div>
                      <p className="text-xs text-gray-600 line-clamp-2">{entry.notes}</p>
                    </div>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                  <div className="text-xs text-gray-500">
                    Créé le {new Date(entry.created_at).toLocaleDateString('fr-CA')}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(entry)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Modifier"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(entry.id, entry.title)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">
                {editingId ? 'Modifier l\'entrée' : 'Nouvelle entrée au livre'}
              </h3>
              <button
                onClick={() => { setShowAddForm(false); setEditingId(null); resetForm(); }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type d'entrée *
                  </label>
                  <select
                    required
                    value={formData.entry_type}
                    onChange={(e) => setFormData({ ...formData, entry_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {Object.entries(ENTRY_TYPES).map(([key, value]) => (
                      <option key={key} value={key}>{value.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.entry_date}
                    onChange={(e) => setFormData({ ...formData, entry_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Statut *
                  </label>
                  <select
                    required
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {Object.entries(STATUS_OPTIONS).map(([key, value]) => (
                      <option key={key} value={key}>{value.label}</option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Titre *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: Achat du condo 301 - Édifice Prestige"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Description détaillée de l'entrée..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Propriété liée
                  </label>
                  <select
                    value={formData.property_id}
                    onChange={(e) => setFormData({ ...formData, property_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Aucune</option>
                    {properties.map(prop => (
                      <option key={prop.id} value={prop.id}>
                        {prop.name} - {prop.location}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Transaction liée
                    <span className="ml-2 text-xs text-gray-500">(auto-remplit les champs)</span>
                  </label>
                  <select
                    value={formData.transaction_id}
                    onChange={(e) => handleTransactionChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Aucune</option>
                    {transactions.map(tx => (
                      <option key={tx.id} value={tx.id}>
                        {new Date(tx.date).toLocaleDateString('fr-CA')} - {tx.description} ({tx.amount} CAD)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Investisseur lié
                  </label>
                  <select
                    value={formData.investor_id}
                    onChange={(e) => setFormData({ ...formData, investor_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Montant
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Devise
                  </label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="CAD">CAD</option>
                    <option value="USD">USD</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Référence légale
                  </label>
                  <input
                    type="text"
                    value={formData.legal_reference}
                    onChange={(e) => setFormData({ ...formData, legal_reference: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: Acte notarié #12345, Résolution #2024-001"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Notes internes, remarques..."
                  />
                </div>

                {/* Document Upload Section */}
                <div className="sm:col-span-2 pt-4 border-t border-gray-200">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Documents légaux
                  </label>

                  {/* Existing documents */}
                  {existingDocuments.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs text-gray-600 mb-2">Documents existants:</p>
                      <div className="space-y-2">
                        {existingDocuments.map(doc => (
                          <div key={doc.id} className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200">
                            <div className="flex items-center gap-2 flex-1">
                              <FileText size={16} className="text-gray-600" />
                              <span className="text-sm text-gray-700 truncate">{doc.file_name}</span>
                              <span className="text-xs text-gray-500">
                                ({(doc.file_size / 1024).toFixed(1)} KB)
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => deleteExistingDocument(doc.id, doc.storage_path)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* File upload */}
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                    <input
                      type="file"
                      multiple
                      onChange={handleFileSelect}
                      className="hidden"
                      id="file-upload"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    />
                    <label
                      htmlFor="file-upload"
                      className="flex flex-col items-center cursor-pointer"
                    >
                      <Upload size={32} className="text-gray-400 mb-2" />
                      <span className="text-sm text-gray-600">
                        Cliquer pour ajouter des documents
                      </span>
                      <span className="text-xs text-gray-500 mt-1">
                        PDF, Word, Images (max 10 MB par fichier)
                      </span>
                    </label>
                  </div>

                  {/* Selected files */}
                  {uploadedFiles.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs text-gray-600 mb-2">Fichiers sélectionnés:</p>
                      <div className="space-y-2">
                        {uploadedFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-blue-50 rounded border border-blue-200">
                            <div className="flex items-center gap-2 flex-1">
                              <FileText size={16} className="text-blue-600" />
                              <span className="text-sm text-gray-700 truncate">{file.name}</span>
                              <span className="text-xs text-gray-500">
                                ({(file.size / 1024).toFixed(1)} KB)
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeFile(index)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => { setShowAddForm(false); setEditingId(null); resetForm(); }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={uploadingDocs}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:bg-gray-400"
                >
                  {uploadingDocs ? 'Envoi des documents...' : editingId ? 'Mettre à jour' : 'Créer l\'entrée'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
