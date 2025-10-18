'use client'

import { useState, useRef } from 'react'
import { Upload, File, X, Download, Eye } from 'lucide-react'
import { Document } from '@/types/investment'

interface FileUploadProps {
  onFilesUploaded: (documents: Document[]) => void
  maxFiles?: number
  maxSizeMB?: number
  acceptedTypes?: string[]
  existingDocuments?: Document[]
  onRemoveDocument?: (docId: string) => void
}

export default function FileUpload({
  onFilesUploaded,
  maxFiles = 10,
  maxSizeMB = 10,
  acceptedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  existingDocuments = [],
  onRemoveDocument
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setError('')
    setUploading(true)

    try {
      const newDocuments: Document[] = []

      for (let i = 0; i < files.length; i++) {
        const file = files[i]

        // Vérifier le type de fichier
        if (!acceptedTypes.includes(file.type)) {
          setError(`Type de fichier non accepté: ${file.name}`)
          continue
        }

        // Vérifier la taille du fichier
        const fileSizeMB = file.size / (1024 * 1024)
        if (fileSizeMB > maxSizeMB) {
          setError(`Fichier trop volumineux: ${file.name} (max ${maxSizeMB}MB)`)
          continue
        }

        // Vérifier le nombre max de fichiers
        if (existingDocuments.length + newDocuments.length >= maxFiles) {
          setError(`Nombre maximum de fichiers atteint (${maxFiles})`)
          break
        }

        // Convertir en base64 pour stockage localStorage
        const base64 = await fileToBase64(file)

        const document: Document = {
          id: Date.now().toString() + i,
          name: file.name,
          type: getDocumentType(file.name),
          url: base64,
          fileSize: file.size,
          uploadedAt: new Date().toISOString(),
          uploadedBy: 'current-user', // À remplacer par l'utilisateur actuel
          description: ''
        }

        newDocuments.push(document)
      }

      if (newDocuments.length > 0) {
        onFilesUploaded(newDocuments)
      }

      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

    } catch (err) {
      console.error('Error uploading files:', err)
      setError('Erreur lors du téléchargement des fichiers')
    } finally {
      setUploading(false)
    }
  }

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = error => reject(error)
    })
  }

  const getDocumentType = (filename: string): Document['type'] => {
    const ext = filename.toLowerCase().split('.').pop()
    if (ext === 'pdf') return 'contrat'
    if (['jpg', 'jpeg', 'png'].includes(ext || '')) return 'recu'
    if (['xls', 'xlsx'].includes(ext || '')) return 'rapport'
    return 'autre'
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const downloadDocument = (doc: Document) => {
    const link = document.createElement('a')
    link.href = doc.url
    link.download = doc.name
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const viewDocument = (doc: Document) => {
    window.open(doc.url, '_blank')
  }

  return (
    <div className="space-y-4">
      {/* Zone de upload */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={handleFileChange}
          className="hidden"
          id="file-upload"
        />
        <label
          htmlFor="file-upload"
          className="cursor-pointer flex flex-col items-center gap-3"
        >
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
            <Upload size={24} className="text-gray-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700">
              Cliquez pour télécharger ou glissez-déposez
            </p>
            <p className="text-xs text-gray-500 mt-1">
              PDF, Excel, Images (max {maxSizeMB}MB par fichier)
            </p>
          </div>
        </label>

        {uploading && (
          <div className="mt-4">
            <div className="w-8 h-8 border-4 border-gray-300 border-t-gray-900 rounded-full animate-spin mx-auto"></div>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}
      </div>

      {/* Liste des documents existants */}
      {existingDocuments.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-700">
            Documents attachés ({existingDocuments.length}/{maxFiles})
          </h4>
          <div className="space-y-2">
            {existingDocuments.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1">
                  <File size={20} className="text-gray-600" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {doc.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(doc.fileSize)} • {new Date(doc.uploadedAt).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => viewDocument(doc)}
                    className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                    title="Voir"
                  >
                    <Eye size={16} className="text-gray-600" />
                  </button>
                  <button
                    onClick={() => downloadDocument(doc)}
                    className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                    title="Télécharger"
                  >
                    <Download size={16} className="text-gray-600" />
                  </button>
                  {onRemoveDocument && (
                    <button
                      onClick={() => onRemoveDocument(doc.id)}
                      className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                      title="Supprimer"
                    >
                      <X size={16} className="text-red-600" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
