'use client'

import { useState, useEffect } from 'react'
import { useInvestment } from '@/contexts/InvestmentContext'
import { supabase } from '@/lib/supabase'
import { Users, Plus, Edit2, Trash2, Mail, Phone, Calendar, DollarSign, TrendingUp, X, Upload, FileText, Download, ExternalLink } from 'lucide-react'

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

export default function AdministrationTab() {
  const { investors, addInvestor, updateInvestor, deleteInvestor, loading } = useInvestment()

  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selectedInvestorId, setSelectedInvestorId] = useState<string | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [uploading, setUploading] = useState(false)

  const [formData, setFormData] = useState<InvestorFormData>({
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Calculate current_value and percentage_ownership
    const totalInvested = formData.total_invested
    const currentValue = formData.total_shares * formData.share_value

    const dataToSubmit = {
      ...formData,
      current_value: currentValue,
      total_invested: totalInvested
    }

    if (editingId) {
      const result = await updateInvestor(editingId, dataToSubmit)
      if (result.success) {
        setEditingId(null)
        resetForm()
      } else {
        alert('Erreur lors de la modification: ' + result.error)
      }
    } else {
      const result = await addInvestor(dataToSubmit)
      if (result.success) {
        setShowAddForm(false)
        resetForm()
      } else {
        alert('Erreur lors de l\'ajout: ' + result.error)
      }
    }
  }

  const handleEdit = (investor: any) => {
    setEditingId(investor.id)
    setFormData({
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
    setShowAddForm(true)
  }

  const handleDelete = async (id: string, name: string) => {
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
      // Upload to Supabase Storage
      const fileName = `${selectedInvestorId}/${Date.now()}_${file.name}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      // Create document record
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

      // Refresh documents
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

      // Create download link
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
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([storagePath])

      if (storageError) throw storageError

      // Delete from database
      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId)

      if (dbError) throw dbError

      // Refresh documents
      if (selectedInvestorId) {
        await fetchDocuments(selectedInvestorId)
      }
      alert('Document supprimé avec succès!')
    } catch (error: any) {
      alert('Erreur lors de la suppression: ' + error.message)
    }
  }

  const resetForm = () => {
    setFormData({
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
    setShowAddForm(false)
    setEditingId(null)
  }

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestion des Investisseurs</h2>
          <p className="text-gray-600 mt-1">Gérez les investisseurs et leurs documents</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 bg-[#5e5e5e] hover:bg-[#3e3e3e] text-white px-4 py-2 rounded-full transition-colors"
        >
          {showAddForm ? <X size={20} /> : <Plus size={20} />}
          {showAddForm ? 'Annuler' : 'Ajouter un investisseur'}
        </button>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">
            {editingId ? 'Modifier l\'investisseur' : 'Nouvel investisseur'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Informations personnelles */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prénom *
                </label>
                <input
                  type="text"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom *
                </label>
                <input
                  type="text"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Téléphone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom d'utilisateur *
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                  required
                />
              </div>

              {/* Informations d'investissement */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Classe d'action *
                </label>
                <select
                  value={formData.action_class}
                  onChange={(e) => setFormData({ ...formData, action_class: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent bg-white"
                  required
                >
                  <option value="A">Classe A</option>
                  <option value="B">Classe B</option>
                  <option value="C">Classe C</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Total actions *
                </label>
                <input
                  type="number"
                  value={formData.total_shares}
                  onChange={(e) => setFormData({ ...formData, total_shares: parseFloat(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                  min="0"
                  step="1"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Valeur par action ($) *
                </label>
                <input
                  type="number"
                  value={formData.share_value}
                  onChange={(e) => setFormData({ ...formData, share_value: parseFloat(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                  min="0"
                  step="0.01"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Total investi ($) *
                </label>
                <input
                  type="number"
                  value={formData.total_invested}
                  onChange={(e) => setFormData({ ...formData, total_invested: parseFloat(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                  min="0"
                  step="0.01"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  % de propriété *
                </label>
                <input
                  type="number"
                  value={formData.percentage_ownership}
                  onChange={(e) => setFormData({ ...formData, percentage_ownership: parseFloat(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                  min="0"
                  max="100"
                  step="0.01"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type d'investissement *
                </label>
                <select
                  value={formData.investment_type}
                  onChange={(e) => setFormData({ ...formData, investment_type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent bg-white"
                  required
                >
                  <option value="capital">Capital</option>
                  <option value="dette">Dette</option>
                  <option value="mixte">Mixte</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Statut *
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent bg-white"
                  required
                >
                  <option value="actif">Actif</option>
                  <option value="inactif">Inactif</option>
                  <option value="suspendu">Suspendu</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date d'adhésion *
                </label>
                <input
                  type="date"
                  value={formData.join_date}
                  onChange={(e) => setFormData({ ...formData, join_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Niveau d'accès *
                </label>
                <select
                  value={formData.access_level}
                  onChange={(e) => setFormData({ ...formData, access_level: e.target.value })}
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
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Permissions
              </label>
              <div className="flex gap-6">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.permissions.dashboard}
                    onChange={(e) => setFormData({
                      ...formData,
                      permissions: { ...formData.permissions, dashboard: e.target.checked }
                    })}
                    className="w-4 h-4 text-[#5e5e5e] focus:ring-[#5e5e5e] rounded"
                  />
                  <span className="text-sm text-gray-700">Dashboard</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.permissions.projet}
                    onChange={(e) => setFormData({
                      ...formData,
                      permissions: { ...formData.permissions, projet: e.target.checked }
                    })}
                    className="w-4 h-4 text-[#5e5e5e] focus:ring-[#5e5e5e] rounded"
                  />
                  <span className="text-sm text-gray-700">Projet</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.permissions.administration}
                    onChange={(e) => setFormData({
                      ...formData,
                      permissions: { ...formData.permissions, administration: e.target.checked }
                    })}
                    className="w-4 h-4 text-[#5e5e5e] focus:ring-[#5e5e5e] rounded"
                  />
                  <span className="text-sm text-gray-700">Administration</span>
                </label>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="bg-[#5e5e5e] hover:bg-[#3e3e3e] text-white px-6 py-2 rounded-full transition-colors disabled:opacity-50"
              >
                {loading ? 'Enregistrement...' : editingId ? 'Modifier' : 'Ajouter'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-2 rounded-full transition-colors"
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
            onClick={() => setShowAddForm(true)}
            className="bg-[#5e5e5e] hover:bg-[#3e3e3e] text-white px-6 py-2 rounded-full transition-colors"
          >
            Ajouter un investisseur
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
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
                      {investor.total_invested.toLocaleString('fr-CA', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 text-gray-600 text-xs mb-1">
                      <TrendingUp size={12} />
                      Valeur actuelle
                    </div>
                    <div className="font-bold text-green-600">
                      {investor.current_value.toLocaleString('fr-CA', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-600 text-xs mb-1">Actions</div>
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
              <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex gap-2">
                <button
                  onClick={() => setSelectedInvestorId(investor.id)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm font-medium"
                >
                  <FileText size={16} />
                  Documents
                </button>
                <button
                  onClick={() => handleEdit(investor)}
                  className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => handleDelete(investor.id, `${investor.first_name} ${investor.last_name}`)}
                  className="flex items-center justify-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-medium"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Documents Modal */}
      {selectedInvestorId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
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

            {/* Modal Body */}
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
}
