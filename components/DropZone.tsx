'use client'

import { useState, useCallback } from 'react'
import { Upload, Camera, Folder } from 'lucide-react'

interface ProcessedFile {
  file: File
  name: string
  size: number
  type: string
  url: string
  lastModified: number
}

interface DropZoneProps {
  onFilesSelected?: (files: ProcessedFile[]) => void
  accept?: string
  multiple?: boolean
  className?: string
  maxSize?: number // en MB
  showCamera?: boolean // Support prise de photo mobile
  showFolderSelect?: boolean // Support sélection de dossier
  label?: string
}

export function DropZone({
  onFilesSelected,
  accept = 'image/*',
  multiple = true,
  className = '',
  maxSize = 10,
  showCamera = false,
  showFolderSelect = false,
  label = 'Glissez-déposez vos fichiers ici ou'
}: DropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // Vérifier si on sort vraiment de la zone
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      setIsUploading(true)
      await handleFiles(files)
      setIsUploading(false)
    }
  }, [])

  const handleFileInput = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      setIsUploading(true)
      await handleFiles(files)
      setIsUploading(false)
      // Reset input pour permettre la resélection du même fichier
      e.target.value = ''
    }
  }, [])

  const handleFiles = async (files: File[]) => {
    try {
      // Filtrer les fichiers selon le type accepté
      const filteredFiles = files.filter(file => {
        console.log(`🔍 Fichier: ${file.name}, Type MIME: "${file.type}", Taille: ${file.size}`)

        // Cas spécial: accept = "image/*" uniquement
        if (accept === 'image/*') {
          return file.type.startsWith('image/')
        }

        // Vérifier chaque type accepté séparément
        const isAccepted = accept.split(',').some(acceptType => {
          const trimmedType = acceptType.trim()

          // Wildcard (ex: "image/*", "video/*")
          if (trimmedType.includes('/*')) {
            const baseType = trimmedType.split('/')[0]
            const matches = file.type.startsWith(baseType + '/')
            console.log(`  ✓ Wildcard ${trimmedType}: ${matches}`)
            return matches
          }

          // Extension (commence par .)
          if (trimmedType.startsWith('.')) {
            const matches = file.name.toLowerCase().endsWith(trimmedType.toLowerCase())
            console.log(`  ✓ Extension ${trimmedType}: ${matches}`)
            return matches
          }

          // MIME type exact
          const matches = file.type === trimmedType
          console.log(`  ✓ MIME type ${trimmedType}: ${matches}`)
          return matches
        })

        console.log(`  → Résultat: ${isAccepted ? '✅ ACCEPTÉ' : '❌ REJETÉ'}`)
        return isAccepted
      })

      // Vérifier la taille
      const validFiles = filteredFiles.filter(file => {
        const sizeInMB = file.size / (1024 * 1024)
        if (sizeInMB > maxSize) {
          console.warn(`Fichier ${file.name} trop volumineux (${sizeInMB.toFixed(2)}MB > ${maxSize}MB)`)
          return false
        }
        return true
      })

      if (validFiles.length === 0) {
        console.warn('Aucun fichier valide sélectionné')
        return
      }

      // Limiter à 1 fichier si multiple = false
      const filesToProcess = multiple ? validFiles : [validFiles[0]]

      // Convertir les fichiers en base64
      const processedFiles = await Promise.all(
        filesToProcess.map(async (file) => {
          return new Promise<ProcessedFile>((resolve) => {
            const reader = new FileReader()
            reader.onload = (e) => {
              resolve({
                file,
                name: file.name,
                size: file.size,
                type: file.type,
                url: e.target?.result as string,
                lastModified: file.lastModified
              })
            }
            reader.readAsDataURL(file)
          })
        })
      )

      onFilesSelected?.(processedFiles)
    } catch (error) {
      console.error('Erreur lors du traitement des fichiers:', error)
    }
  }

  return (
    <div
      className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200 ${
        isDragOver
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-300 hover:border-gray-400 bg-white'
      } ${className}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <input
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleFileInput}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        disabled={isUploading}
        id="file-input"
      />

      {showCamera && (
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileInput}
          className="hidden"
          disabled={isUploading}
          id="camera-input"
        />
      )}

      {showFolderSelect && (
        <input
          type="file"
          // @ts-ignore - webkitdirectory is not in TypeScript types but supported by browsers
          webkitdirectory=""
          directory=""
          multiple
          onChange={handleFileInput}
          className="hidden"
          disabled={isUploading}
          id="folder-input"
        />
      )}

      <div className="flex flex-col items-center space-y-3">
        {isUploading ? (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <p className="text-gray-600">Traitement des fichiers...</p>
          </>
        ) : (
          <>
            <div className={`p-3 rounded-full ${
              isDragOver ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'
            }`}>
              <Upload size={32} />
            </div>

            {isDragOver ? (
              <p className="text-blue-600 font-medium">
                Relâchez pour déposer les fichiers
              </p>
            ) : (
              <>
                <p className="text-gray-600">
                  {label}{' '}
                  <label htmlFor="file-input" className="text-blue-600 font-medium cursor-pointer hover:underline">
                    cliquez pour sélectionner
                  </label>
                </p>

                <div className="text-sm text-gray-500">
                  {accept === 'image/*' && (
                    <p>Images acceptées : JPG, PNG, GIF, WebP</p>
                  )}
                  {multiple && (
                    <p>Sélection multiple autorisée</p>
                  )}
                  <p>Taille maximale : {maxSize}MB</p>
                </div>

                {/* Boutons supplémentaires */}
                {(showCamera || showFolderSelect) && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {showCamera && (
                      <label
                        htmlFor="camera-input"
                        className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-2"
                      >
                        <Camera size={16} />
                        Prendre une photo
                      </label>
                    )}

                    {showFolderSelect && (
                      <label
                        htmlFor="folder-input"
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-2"
                      >
                        <Folder size={16} />
                        Sélectionner un dossier
                      </label>
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
