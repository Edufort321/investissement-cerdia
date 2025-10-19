'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/contexts/LanguageContext'
import { Upload, FileText, Download, Trash2, X } from 'lucide-react'

interface Attachment {
  id: string
  transaction_id: string
  file_name: string
  file_type: string | null
  storage_path: string
  file_size: number | null
  description: string | null
  uploaded_at: string
  uploaded_by: string | null
}

interface TransactionAttachmentsProps {
  transactionId: string | null
  onClose?: () => void
}

export default function TransactionAttachments({ transactionId, onClose }: TransactionAttachmentsProps) {
  const { t, language } = useLanguage()
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [dragActive, setDragActive] = useState(false)

  useEffect(() => {
    if (transactionId) {
      fetchAttachments()
    }
  }, [transactionId])

  const fetchAttachments = async () => {
    if (!transactionId) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('transaction_attachments')
        .select('*')
        .eq('transaction_id', transactionId)
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
    if (!files || files.length === 0 || !transactionId) return

    setUploading(true)

    try {
      // Upload multiple files
      for (let i = 0; i < files.length; i++) {
        const file = files[i]

        // Generate unique file name
        const fileExt = file.name.split('.').pop()
        const fileName = `${transactionId}/${Date.now()}_${i}_${file.name}`

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('transaction-attachments')
          .upload(fileName, file)

        if (uploadError) {
          console.error('Upload error:', uploadError)
          alert(`${t('attachments.uploadError')} ${file.name}: ${uploadError.message}`)
          continue
        }

        // Insert record in database
        const { error: dbError } = await supabase
          .from('transaction_attachments')
          .insert([{
            transaction_id: transactionId,
            file_name: file.name,
            file_type: file.type || null,
            storage_path: uploadData.path,
            file_size: file.size,
            description: null,
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
        .from('transaction-attachments')
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
        .from('transaction-attachments')
        .remove([storagePath])

      if (storageError) {
        console.error('Storage deletion error:', storageError)
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('transaction_attachments')
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

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase()
    return <FileText size={20} className="text-blue-600" />
  }

  if (!transactionId) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
        <p className="text-yellow-800 text-sm">
          {t('attachments.createTransactionFirst')}
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
        <input
          type="file"
          multiple
          onChange={(e) => handleFileUpload(e.target.files)}
          disabled={uploading}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
          id="file-upload"
        />
        <label htmlFor="file-upload" className="flex flex-col items-center gap-2 cursor-pointer">
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
      ) : attachments.length === 0 ? (
        <div className="text-center py-8 bg-white rounded-lg border border-gray-200">
          <FileText size={48} className="mx-auto text-gray-400 mb-3" />
          <p className="text-gray-600 text-sm">{t('attachments.noAttachments')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  {getFileIcon(attachment.file_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate" title={attachment.file_name}>
                    {attachment.file_name}
                  </p>
                  <p className="text-sm text-gray-600">
                    {formatFileSize(attachment.file_size)} • {new Date(attachment.uploaded_at).toLocaleDateString('fr-CA', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => handleDownload(attachment.storage_path, attachment.file_name)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title={t('attachments.downloadFile')}
                >
                  <Download size={18} />
                </button>
                <button
                  onClick={() => handleDelete(attachment.id, attachment.storage_path, attachment.file_name)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title={t('attachments.deleteFile')}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
