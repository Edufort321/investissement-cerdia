'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/contexts/LanguageContext'
import { Upload, FileText, Download, Trash2, X, Image as ImageIcon, FileCheck, FileSpreadsheet } from 'lucide-react'

interface Attachment {
  id: string
  property_id: string
  file_name: string
  file_type: string | null
  storage_path: string
  file_size: number | null
  description: string | null
  attachment_category: 'photo' | 'document' | 'plan' | 'contract' | 'invoice' | 'general'
  uploaded_at: string
  uploaded_by: string | null
}

interface ProjectAttachmentsProps {
  propertyId: string | null
  onClose?: () => void
}

export default function ProjectAttachments({ propertyId, onClose }: ProjectAttachmentsProps) {
  const { t, language } = useLanguage()
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [dragActive, setDragActive] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [uploadCategory, setUploadCategory] = useState<Attachment['attachment_category']>('photo')

  useEffect(() => {
    if (propertyId) {
      fetchAttachments()
    }
  }, [propertyId])

  const fetchAttachments = async () => {
    if (!propertyId) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('property_attachments')
        .select('*')
        .eq('property_id', propertyId)
        .order('uploaded_at', { ascending: false })

      if (error) throw error
      setAttachments(data || [])
    } catch (error) {
      console.error('Error fetching attachments:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !propertyId) return

    setUploading(true)

    try {
      // Upload multiple files
      for (let i = 0; i < files.length; i++) {
        const file = files[i]

        // Generate unique file name
        const fileExt = file.name.split('.').pop()
        const fileName = `${propertyId}/${uploadCategory}/${Date.now()}_${i}_${file.name}`

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('property-attachments')
          .upload(fileName, file)

        if (uploadError) {
          console.error('Upload error:', uploadError)
          alert(`${t('attachments.uploadError')} ${file.name}: ${uploadError.message}`)
          continue
        }

        // Insert record in database
        const { error: dbError } = await supabase
          .from('property_attachments')
          .insert([{
            property_id: propertyId,
            file_name: file.name,
            file_type: file.type || null,
            storage_path: uploadData.path,
            file_size: file.size,
            description: null,
            attachment_category: uploadCategory,
            uploaded_by: null // Will be set by RLS/trigger if needed
          }])

        if (dbError) {
          console.error('Database error:', dbError)
          alert(`${t('attachments.uploadError')} ${file.name}: ${dbError.message}`)
        }
      }

      await fetchAttachments()
      alert(t('attachments.uploadSuccess'))
    } catch (error: any) {
      alert(t('attachments.uploadError') + ': ' + error.message)
    } finally {
      setUploading(false)
    }
  }

  const handleDownload = async (storagePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('property-attachments')
        .download(storagePath)

      if (error) throw error

      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      a.click()
      URL.revokeObjectURL(url)
    } catch (error: any) {
      alert(t('attachments.downloadError') + ': ' + error.message)
    }
  }

  const handleDelete = async (attachmentId: string, storagePath: string, fileName: string) => {
    if (!confirm(`${t('attachments.deleteConfirm')} "${fileName}" ?`)) return

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('property-attachments')
        .remove([storagePath])

      if (storageError) {
        console.error('Storage deletion error:', storageError)
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('property_attachments')
        .delete()
        .eq('id', attachmentId)

      if (dbError) throw dbError

      await fetchAttachments()
      alert(t('attachments.deleteSuccess'))
    } catch (error: any) {
      alert(t('attachments.deleteError') + ': ' + error.message)
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files)
    }
  }

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'N/A'
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'photo':
        return <ImageIcon size={20} className="text-purple-600" />
      case 'contract':
        return <FileCheck size={20} className="text-green-600" />
      case 'invoice':
        return <FileSpreadsheet size={20} className="text-orange-600" />
      case 'plan':
        return <FileText size={20} className="text-blue-600" />
      default:
        return <FileText size={20} className="text-gray-600" />
    }
  }

  const getCategoryLabel = (category: string) => {
    const labels: { [key: string]: string } = {
      photo: language === 'fr' ? 'Photo' : 'Photo',
      document: language === 'fr' ? 'Document' : 'Document',
      plan: language === 'fr' ? 'Plan' : 'Plan',
      contract: language === 'fr' ? 'Contrat' : 'Contract',
      invoice: language === 'fr' ? 'Facture' : 'Invoice',
      general: language === 'fr' ? 'Général' : 'General'
    }
    return labels[category] || category
  }

  const filteredAttachments = selectedCategory === 'all'
    ? attachments
    : attachments.filter(a => a.attachment_category === selectedCategory)

  const categories = ['all', 'photo', 'document', 'plan', 'contract', 'invoice', 'general']

  if (!propertyId) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
        <p className="text-yellow-800 text-sm">
          {language === 'fr'
            ? 'Veuillez d\'abord créer le projet avant d\'ajouter des pièces jointes.'
            : 'Please create the project first before adding attachments.'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-md font-semibold text-gray-900">{t('attachments.title')}</h4>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            title={t('attachments.close')}
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              selectedCategory === cat
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {cat === 'all'
              ? (language === 'fr' ? 'Tout' : 'All')
              : getCategoryLabel(cat)}
          </button>
        ))}
      </div>

      {/* Upload Zone */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 transition-colors ${
          dragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 bg-gray-50'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {language === 'fr' ? 'Catégorie' : 'Category'}
          </label>
          <select
            value={uploadCategory}
            onChange={(e) => setUploadCategory(e.target.value as Attachment['attachment_category'])}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          >
            <option value="photo">{getCategoryLabel('photo')}</option>
            <option value="document">{getCategoryLabel('document')}</option>
            <option value="plan">{getCategoryLabel('plan')}</option>
            <option value="contract">{getCategoryLabel('contract')}</option>
            <option value="invoice">{getCategoryLabel('invoice')}</option>
            <option value="general">{getCategoryLabel('general')}</option>
          </select>
        </div>

        <input
          type="file"
          multiple
          onChange={(e) => handleFileUpload(e.target.files)}
          disabled={uploading}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
          id="file-upload-project"
        />
        <label htmlFor="file-upload-project" className="flex flex-col items-center gap-2 cursor-pointer">
          <Upload size={32} className={uploading ? 'text-gray-400' : 'text-gray-600'} />
          <span className="text-sm font-medium text-gray-700">
            {uploading
              ? t('attachments.uploading')
              : t('attachments.dragDrop')}
          </span>
          <span className="text-xs text-gray-500">
            {t('attachments.supportedFormats')}
          </span>
        </label>
      </div>

      {/* Attachments List */}
      {loading ? (
        <div className="text-center py-8">
          <p className="text-gray-500">{t('attachments.loading')}</p>
        </div>
      ) : filteredAttachments.length === 0 ? (
        <div className="text-center py-8 bg-white rounded-lg border border-gray-200">
          <FileText size={48} className="mx-auto text-gray-400 mb-3" />
          <p className="text-gray-600 text-sm">
            {selectedCategory === 'all'
              ? t('attachments.noAttachments')
              : `${language === 'fr' ? 'Aucune pièce jointe dans' : 'No attachments in'} ${getCategoryLabel(selectedCategory)}`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredAttachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex flex-col p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  {getCategoryIcon(attachment.attachment_category)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate" title={attachment.file_name}>
                    {attachment.file_name}
                  </p>
                  <span className="inline-block px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded mt-1">
                    {getCategoryLabel(attachment.attachment_category)}
                  </span>
                </div>
              </div>

              <p className="text-xs text-gray-600 mb-3">
                {formatFileSize(attachment.file_size)} • {new Date(attachment.uploaded_at).toLocaleDateString(language === 'fr' ? 'fr-CA' : 'en-CA', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })}
              </p>

              <div className="flex items-center gap-2 mt-auto">
                <button
                  onClick={() => handleDownload(attachment.storage_path, attachment.file_name)}
                  className="flex-1 p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-sm font-medium"
                  title={t('attachments.downloadFile')}
                >
                  <Download size={16} className="inline mr-1" />
                  {language === 'fr' ? 'Télécharger' : 'Download'}
                </button>
                <button
                  onClick={() => handleDelete(attachment.id, attachment.storage_path, attachment.file_name)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title={t('attachments.deleteFile')}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
