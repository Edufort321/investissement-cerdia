'use client'

import React, { useState, useRef } from 'react'
import { Camera, Upload, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { createWorker } from 'tesseract.js'

interface ReceiptData {
  amount: number | null
  currency: string
  date: string | null
  merchant: string | null
  category: string
  rawText: string
}

interface ReceiptScannerProps {
  isOpen: boolean
  onClose: () => void
  onScanComplete: (data: ReceiptData) => void
  language?: string
  tripCurrency?: string
}

export default function ReceiptScanner({
  isOpen,
  onClose,
  onScanComplete,
  language = 'fr',
  tripCurrency = 'CAD'
}: ReceiptScannerProps) {
  const [scanning, setScanning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [scanResult, setScanResult] = useState<ReceiptData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const t = (key: string) => {
    const translations: Record<string, { fr: string; en: string }> = {
      'title': { fr: 'Scanner un reçu', en: 'Scan a receipt' },
      'takePhoto': { fr: 'Prendre une photo', en: 'Take a photo' },
      'uploadPhoto': { fr: 'Télécharger une photo', en: 'Upload a photo' },
      'scanning': { fr: 'Analyse en cours...', en: 'Scanning...' },
      'cancel': { fr: 'Annuler', en: 'Cancel' },
      'useThisReceipt': { fr: 'Utiliser ce reçu', en: 'Use this receipt' },
      'scanAnother': { fr: 'Scanner un autre', en: 'Scan another' },
      'amount': { fr: 'Montant', en: 'Amount' },
      'date': { fr: 'Date', en: 'Date' },
      'merchant': { fr: 'Marchand', en: 'Merchant' },
      'category': { fr: 'Catégorie', en: 'Category' },
      'error': { fr: 'Erreur lors du scan', en: 'Scan error' },
      'noAmountFound': { fr: 'Aucun montant détecté', en: 'No amount detected' },
    }
    return translations[key]?.[language as 'fr' | 'en'] || key
  }

  // Catégorisation automatique basée sur mots-clés
  const categorizeReceipt = (text: string): string => {
    const lowerText = text.toLowerCase()

    // Restaurant / Nourriture
    if (lowerText.includes('restaurant') || lowerText.includes('cafe') ||
        lowerText.includes('bar') || lowerText.includes('food') ||
        lowerText.includes('meal') || lowerText.includes('dinner') ||
        lowerText.includes('lunch') || lowerText.includes('breakfast')) {
      return language === 'fr' ? 'Restaurant' : 'Restaurant'
    }

    // Transport
    if (lowerText.includes('uber') || lowerText.includes('taxi') ||
        lowerText.includes('transport') || lowerText.includes('metro') ||
        lowerText.includes('bus') || lowerText.includes('train')) {
      return language === 'fr' ? 'Transport' : 'Transport'
    }

    // Hébergement
    if (lowerText.includes('hotel') || lowerText.includes('airbnb') ||
        lowerText.includes('lodging') || lowerText.includes('accommodation')) {
      return language === 'fr' ? 'Hébergement' : 'Accommodation'
    }

    // Shopping
    if (lowerText.includes('shop') || lowerText.includes('store') ||
        lowerText.includes('market') || lowerText.includes('boutique')) {
      return language === 'fr' ? 'Shopping' : 'Shopping'
    }

    // Activités
    if (lowerText.includes('museum') || lowerText.includes('ticket') ||
        lowerText.includes('tour') || lowerText.includes('activity') ||
        lowerText.includes('musée')) {
      return language === 'fr' ? 'Activités' : 'Activities'
    }

    return language === 'fr' ? 'Autre' : 'Other'
  }

  // Extraction du montant depuis le texte OCR
  const extractAmount = (text: string): number | null => {
    // Patterns pour trouver le montant total
    const patterns = [
      /total[:\s]*[€$£¥]\s*(\d+[.,]\d{2})/i,
      /total[:\s]*(\d+[.,]\d{2})\s*[€$£¥]/i,
      /montant[:\s]*[€$£¥]\s*(\d+[.,]\d{2})/i,
      /montant[:\s]*(\d+[.,]\d{2})\s*[€$£¥]/i,
      /amount[:\s]*[€$£¥]\s*(\d+[.,]\d{2})/i,
      /amount[:\s]*(\d+[.,]\d{2})\s*[€$£¥]/i,
      /[€$£¥]\s*(\d+[.,]\d{2})/,
      /(\d+[.,]\d{2})\s*[€$£¥]/,
    ]

    for (const pattern of patterns) {
      const match = text.match(pattern)
      if (match && match[1]) {
        const amountStr = match[1].replace(',', '.')
        const amount = parseFloat(amountStr)
        if (!isNaN(amount) && amount > 0 && amount < 100000) {
          return amount
        }
      }
    }

    return null
  }

  // Extraction de la date
  const extractDate = (text: string): string | null => {
    const datePatterns = [
      /(\d{4}[-/]\d{2}[-/]\d{2})/,  // YYYY-MM-DD ou YYYY/MM/DD
      /(\d{2}[-/]\d{2}[-/]\d{4})/,  // DD-MM-YYYY ou DD/MM/YYYY
      /(\d{2}[-/]\d{2}[-/]\d{2})/,  // DD-MM-YY ou DD/MM/YY
    ]

    for (const pattern of datePatterns) {
      const match = text.match(pattern)
      if (match && match[1]) {
        return match[1]
      }
    }

    return new Date().toISOString().split('T')[0]
  }

  // Extraction du nom du marchand
  const extractMerchant = (text: string): string | null => {
    // Prendre les premiers mots (souvent le nom du commerce)
    const lines = text.split('\n').filter(line => line.trim().length > 0)
    if (lines.length > 0) {
      const firstLine = lines[0].trim()
      if (firstLine.length > 2 && firstLine.length < 100) {
        return firstLine
      }
    }
    return null
  }

  const processImage = async (file: File) => {
    setScanning(true)
    setProgress(0)
    setError(null)
    setScanResult(null)

    try {
      // Créer une preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)

      // Initialiser Tesseract worker
      const worker = await createWorker('eng', 1, {
        logger: m => {
          if (m.status === 'recognizing text') {
            setProgress(Math.round(m.progress * 100))
          }
        }
      })

      // Effectuer l'OCR
      const { data: { text } } = await worker.recognize(file)

      console.log('📝 Texte OCR extrait:', text)

      // Extraire les données
      const amount = extractAmount(text)
      const date = extractDate(text)
      const merchant = extractMerchant(text)
      const category = categorizeReceipt(text)

      const receiptData: ReceiptData = {
        amount,
        currency: tripCurrency,
        date,
        merchant,
        category,
        rawText: text
      }

      setScanResult(receiptData)

      // Terminer le worker
      await worker.terminate()

      if (!amount) {
        setError(t('noAmountFound'))
      }

    } catch (err) {
      console.error('Erreur OCR:', err)
      setError(t('error'))
    } finally {
      setScanning(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      processImage(file)
    }
  }

  const handleCameraCapture = () => {
    fileInputRef.current?.click()
  }

  const handleUseReceipt = () => {
    if (scanResult) {
      onScanComplete(scanResult)
      handleClose()
    }
  }

  const handleScanAnother = () => {
    setImagePreview(null)
    setScanResult(null)
    setError(null)
    setProgress(0)
  }

  const handleClose = () => {
    handleScanAnother()
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center shadow-md">
              <Camera className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {t('title')}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
          >
            <X className="w-6 h-6 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Image Preview */}
          {imagePreview && (
            <div className="relative">
              <img
                src={imagePreview}
                alt="Receipt preview"
                className="w-full h-auto max-h-64 object-contain rounded-lg border border-gray-300 dark:border-gray-600"
              />
            </div>
          )}

          {/* Scanning Progress */}
          {scanning && (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-3 text-indigo-600 dark:text-indigo-400">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span className="font-semibold">{t('scanning')}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                {progress}%
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              <span className="text-red-600 dark:text-red-400">{error}</span>
            </div>
          )}

          {/* Scan Result */}
          {scanResult && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-semibold">
                <CheckCircle className="w-5 h-5" />
                <span>Scan terminé!</span>
              </div>

              <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                {scanResult.amount && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{t('amount')}:</span>
                    <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                      {scanResult.amount.toFixed(2)} {scanResult.currency}
                    </span>
                  </div>
                )}

                {scanResult.date && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{t('date')}:</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">{scanResult.date}</span>
                  </div>
                )}

                {scanResult.merchant && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{t('merchant')}:</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">{scanResult.merchant}</span>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{t('category')}:</span>
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400">{scanResult.category}</span>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {!scanning && !scanResult && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileSelect}
                className="hidden"
              />

              <button
                onClick={handleCameraCapture}
                className="flex flex-col items-center justify-center gap-3 p-6 border-2 border-indigo-500 dark:border-indigo-400 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition"
              >
                <Camera className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
                <span className="font-semibold text-gray-900 dark:text-gray-100">{t('takePhoto')}</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-3 p-6 border-2 border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              >
                <Upload className="w-10 h-10 text-gray-600 dark:text-gray-400" />
                <span className="font-semibold text-gray-900 dark:text-gray-100">{t('uploadPhoto')}</span>
              </button>
            </div>
          )}

          {/* Result Actions */}
          {scanResult && (
            <div className="flex gap-3">
              <button
                onClick={handleScanAnother}
                className="flex-1 px-6 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition font-semibold"
              >
                {t('scanAnother')}
              </button>
              <button
                onClick={handleUseReceipt}
                disabled={!scanResult.amount}
                className="flex-1 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed shadow-md"
              >
                {t('useThisReceipt')}
              </button>
            </div>
          )}

          {/* Cancel Button */}
          {!scanResult && (
            <button
              onClick={handleClose}
              disabled={scanning}
              className="w-full px-6 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition font-semibold disabled:opacity-50"
            >
              {t('cancel')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
