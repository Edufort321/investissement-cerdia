'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Upload, File, Download, Trash2, Paperclip, AlertCircle, X } from 'lucide-react'

interface Attachment {
  id: string
  transaction_id: string
  file_name: string
  file_size: number
  mime_type: string
  storage_path: string
  uploaded_at: string
  uploaded_by: string | null
  description: string | null
}

interface TransactionAttachmentsManagerProps {
  transactionId: string
}

export default function TransactionAttachmentsManager({ transactionId }: TransactionAttachmentsManagerProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadAttachments()
  }, [transactionId])

  const loadAttachments = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('transaction_attachments')
        .select('*')
        .eq('transaction_id', transactionId)
        .order('uploaded_at', { ascending: false })

      if (fetchError) throw fetchError

      setAttachments(data || [])
    } catch (err: any) {
      console.error('Erreur lors du chargement des pièces jointes:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    setError(null)

    try {
      // Upload tous les fichiers sélectionnés
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        await uploadFile(file)
      }

      // Recharger la liste
      await loadAttachments()

      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (err: any) {
      console.error('Erreur lors de l\'upload:', err)
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  const uploadFile = async (file: File) => {
    // Générer le chemin de stockage
    const timestamp = Date.now()
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const storagePath = `${transactionId}/${timestamp}-${cleanFileName}`

    // Upload vers Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('transaction-documents')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      throw new Error(`Erreur d'upload: ${uploadError.message}`)
    }

    // Créer l'entrée en base de données
    const { error: dbError } = await supabase
      .from('transaction_attachments')
      .insert([{
        transaction_id: transactionId,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type || 'application/octet-stream',
        storage_path: storagePath
      }])

    if (dbError) {
      // Si erreur DB, supprimer le fichier uploadé
      await supabase.storage
        .from('transaction-documents')
        .remove([storagePath])

      throw new Error(`Erreur lors de l'enregistrement: ${dbError.message}`)
    }
  }

  const handleDownload = async (attachment: Attachment) => {
    try {
      const { data, error: downloadError } = await supabase.storage
        .from('transaction-documents')
        .download(attachment.storage_path)

      if (downloadError) throw downloadError

      // Créer un lien de téléchargement
      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = attachment.file_name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err: any) {
      console.error('Erreur lors du téléchargement:', err)
      alert('Erreur lors du téléchargement: ' + err.message)
    }
  }

  const handleDelete = async (attachment: Attachment) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer "${attachment.file_name}" ?`)) {
      return
    }

    try {
      // Supprimer de la base de données
      const { error: dbError } = await supabase
        .from('transaction_attachments')
        .delete()
        .eq('id', attachment.id)

      if (dbError) throw dbError

      // Supprimer du storage
      const { error: storageError } = await supabase.storage
        .from('transaction-documents')
        .remove([attachment.storage_path])

      if (storageError) {
        console.warn('Erreur lors de la suppression du fichier:', storageError)
        // Ne pas throw, l'entrée DB est déjà supprimée
      }

      // Recharger la liste
      await loadAttachments()
    } catch (err: any) {
      console.error('Erreur lors de la suppression:', err)
      alert('Erreur lors de la suppression: ' + err.message)
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const getFileIcon = (mimeType: string): string => {
    if (mimeType.startsWith('image/')) return '🖼️'
    if (mimeType.startsWith('video/')) return '🎥'
    if (mimeType.includes('pdf')) return '📄'
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return '📊'
    if (mimeType.includes('document') || mimeType.includes('word')) return '📝'
    if (mimeType.includes('zip') || mimeType.includes('rar')) return '📦'
    return '📎'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header avec bouton upload */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Paperclip size={20} className="text-gray-600 dark:text-gray-400" />
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
            Pièces jointes ({attachments.length})
          </h3>
        </div>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          <Upload size={16} />
          {uploading ? 'Upload en cours...' : 'Ajouter'}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          accept="*/*"
        />
      </div>

      {/* Message d'erreur */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex gap-3">
            <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
            <div className="text-sm text-red-800 dark:text-red-300">
              <p className="font-medium">Erreur</p>
              <p>{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Liste des pièces jointes */}
      {attachments.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <File size={48} className="mx-auto mb-3 opacity-30" />
          <p>Aucune pièce jointe</p>
          <p className="text-sm mt-1">Cliquez sur "Ajouter" pour uploader des documents</p>
        </div>
      ) : (
        <div className="space-y-2">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="text-2xl flex-shrink-0">
                  {getFileIcon(attachment.mime_type)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                    {attachment.file_name}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                    <span>{formatFileSize(attachment.file_size)}</span>
                    <span>•</span>
                    <span>
                      {new Date(attachment.uploaded_at).toLocaleDateString('fr-CA', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => handleDownload(attachment)}
                  className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded transition-colors"
                  title="Télécharger"
                >
                  <Download size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(attachment)}
                  className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                  title="Supprimer"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info sur les types de fichiers acceptés */}
      <div className="text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
        <p>💡 Vous pouvez uploader plusieurs fichiers à la fois (PDF, images, Excel, Word, etc.)</p>
      </div>
    </div>
  )
}
