'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Building2, FileText, Users, Gavel, Calendar, Plus, Upload, Trash2, Edit2, X, Filter, ChevronDown, DollarSign, FileDown } from 'lucide-react'

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
  const [exportingCorporateBookPDF, setExportingCorporateBookPDF] = useState(false)
  const [pdfIncludeLinks, setPdfIncludeLinks] = useState(true)
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('list')

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

  const exportCorporateBookPDF = async () => {
    setExportingCorporateBookPDF(true)
    try {
      const jsPDF = (await import('jspdf')).default
      const autoTable = (await import('jspdf-autotable')).default
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

      const C = {
        dark:   [62,62,62]    as [number,number,number],
        mid:    [94,94,94]    as [number,number,number],
        white:  [255,255,255] as [number,number,number],
        blue:   [37,99,235]   as [number,number,number],
        blueL:  [239,246,255] as [number,number,number],
        green:  [22,163,74]   as [number,number,number],
        greenL: [240,253,244] as [number,number,number],
        purple: [124,58,237]  as [number,number,number],
        orange: [234,88,12]   as [number,number,number],
        red:    [220,38,38]   as [number,number,number],
        amber:  [217,119,6]   as [number,number,number],
        indigo: [67,56,202]   as [number,number,number],
        slate:  [71,85,105]   as [number,number,number],
        gray:   [156,163,175] as [number,number,number],
        grayL:  [243,244,246] as [number,number,number],
        text:   [31,41,55]    as [number,number,number],
        sub:    [107,114,128] as [number,number,number],
      }

      const box = (x: number, y: number, w: number, h: number, fill: [number,number,number], border?: [number,number,number]) => {
        doc.setFillColor(...fill)
        if (border) { doc.setDrawColor(...border); doc.rect(x, y, w, h, 'FD') }
        else doc.rect(x, y, w, h, 'F')
      }

      const sectionTitle = (title: string, yPos: number, color: [number,number,number] = C.mid) => {
        box(15, yPos, 180, 7, color)
        doc.setTextColor(...C.white)
        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.text(title.toUpperCase(), 18, yPos + 5)
        doc.setTextColor(...C.text)
        return yPos + 10
      }

      const addFooter = (pageNum: number, totalPages: number) => {
        const pageH = doc.internal.pageSize.getHeight()
        box(0, pageH - 12, 210, 12, C.dark)
        doc.setTextColor(...C.white)
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.text("CERDIA - Livre d'Entreprise", 15, pageH - 4)
        doc.text(new Date().toLocaleDateString('fr-CA'), 105, pageH - 4, { align: 'center' })
        doc.text(`Page ${pageNum} / ${totalPages}`, 190, pageH - 4, { align: 'right' })
        doc.setTextColor(...C.text)
      }

      const typeColorMap: Record<string, [number,number,number]> = {
        property_acquisition: C.blue,   property_sale: C.green,
        share_issuance:       C.purple, share_transfer: C.orange,
        share_redemption:     C.red,    general_meeting: C.indigo,
        board_meeting:        C.slate,  resolution: C.amber,
        legal_document:       C.gray,   other: C.gray,
      }
      const typeLabelMap: Record<string, string> = {
        property_acquisition: 'Achat immobilier',    property_sale: 'Vente immobilier',
        share_issuance:       'Emission de parts',   share_transfer: 'Transfert de parts',
        share_redemption:     'Rachat de parts',     general_meeting: 'Assemblee generale',
        board_meeting:        "Conseil d'admin.",    resolution: 'Resolution',
        legal_document:       'Document legal',      other: 'Autre',
      }

      // Generate signed URLs for all documents
      const signedUrlMap: Record<string, { name: string; url: string }[]> = {}
      if (pdfIncludeLinks) {
        await Promise.all(
          filteredEntries.filter(e => e.has_documents).map(async entry => {
            const { data: docs } = await supabase
              .from('corporate_book_documents')
              .select('id, file_name, storage_path')
              .eq('corporate_book_id', entry.id)
            if (!docs || docs.length === 0) return
            const docUrls: { name: string; url: string }[] = []
            await Promise.all(docs.map(async (d: any) => {
              const { data: signed } = await supabase.storage
                .from('corporate-documents')
                .createSignedUrl(d.storage_path, 60 * 60 * 24 * 365)
              if (signed?.signedUrl) docUrls.push({ name: d.file_name, url: signed.signedUrl })
            }))
            if (docUrls.length > 0) signedUrlMap[entry.id] = docUrls
          })
        )
      }

      // ─── PAGE 1: BANNIERE + STATS + TABLE ─────────────────────────────────

      box(0, 0, 210, 38, C.dark)
      doc.setTextColor(...C.white)
      doc.setFontSize(22)
      doc.setFont('helvetica', 'bold')
      doc.text("LIVRE D'ENTREPRISE", 105, 15, { align: 'center' })
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text('CERDIA - Registre corporatif officiel', 105, 23, { align: 'center' })
      doc.setFontSize(9)
      doc.text(`Exporte le ${new Date().toLocaleDateString('fr-CA')} - ${filteredEntries.length} entree(s)`, 105, 31, { align: 'center' })
      doc.setTextColor(...C.text)

      let y = 45

      // Stats cards par type
      const typeCounts: Record<string, number> = {}
      filteredEntries.forEach(e => { typeCounts[e.entry_type] = (typeCounts[e.entry_type] || 0) + 1 })
      const activeTypes = Object.entries(typeCounts).filter(([,c]) => c > 0)

      if (activeTypes.length > 0) {
        y = sectionTitle("Resume par type d'entree", y, C.dark)
        const cardW = 55, cardH = 16, gap = 5
        let cx = 15, cy = y
        activeTypes.forEach(([type, count], i) => {
          if (i > 0 && i % 3 === 0) { cx = 15; cy += cardH + gap }
          const color = typeColorMap[type] || C.gray
          const lightColor: [number,number,number] = [
            Math.min(255, color[0] + 175),
            Math.min(255, color[1] + 175),
            Math.min(255, color[2] + 175),
          ]
          box(cx, cy, cardW, cardH, lightColor)
          box(cx, cy, 4, cardH, color)
          doc.setTextColor(...color)
          doc.setFontSize(15)
          doc.setFont('helvetica', 'bold')
          doc.text(count.toString(), cx + 8, cy + 11)
          doc.setFontSize(6.5)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(...C.text)
          doc.text(typeLabelMap[type] || type, cx + 8, cy + 15)
          cx += cardW + gap
        })
        y = cy + cardH + gap + 3
      }

      // Table principale
      y = sectionTitle('Registre des entrees', y, C.dark)

      const tableRows = filteredEntries.map(entry => {
        const docs = signedUrlMap[entry.id]
        return [
          new Date(entry.entry_date).toLocaleDateString('fr-CA'),
          typeLabelMap[entry.entry_type] || entry.entry_type,
          entry.title,
          entry.amount ? `${entry.amount.toLocaleString('fr-CA')} ${entry.currency}` : '-',
          STATUS_OPTIONS[entry.status as keyof typeof STATUS_OPTIONS]?.label || entry.status,
          docs ? `${docs.length} doc.` : (entry.has_documents ? '...' : '-'),
        ]
      })

      autoTable(doc, {
        startY: y,
        head: [['Date', 'Type', 'Titre', 'Montant', 'Statut', 'Docs']],
        body: tableRows,
        margin: { left: 15, right: 15 },
        styles: { fontSize: 8, cellPadding: 3, overflow: 'linebreak' },
        headStyles: { fillColor: C.dark, textColor: C.white, fontStyle: 'bold' },
        columnStyles: {
          0: { cellWidth: 22 },
          1: { cellWidth: 38 },
          2: { cellWidth: 57 },
          3: { cellWidth: 27 },
          4: { cellWidth: 20 },
          5: { cellWidth: 16 },
        },
        didParseCell: (data: any) => {
          if (data.section !== 'body') return
          const entry = filteredEntries[data.row.index]
          if (!entry) return
          if (data.column.index === 4) {
            if (entry.status === 'approved') { data.cell.styles.fillColor = [240,253,244]; data.cell.styles.textColor = [22,163,74] }
            else if (entry.status === 'filed') { data.cell.styles.fillColor = [239,246,255]; data.cell.styles.textColor = [37,99,235] }
            else { data.cell.styles.fillColor = [243,244,246]; data.cell.styles.textColor = [107,114,128] }
          }
          if (data.column.index === 5 && signedUrlMap[entry.id]) {
            data.cell.styles.fillColor = [239,246,255]
            data.cell.styles.textColor = [37,99,235]
          }
        },
        didDrawCell: (data: any) => {
          if (data.section !== 'body' || data.column.index !== 5) return
          const entry = filteredEntries[data.row.index]
          const docs = signedUrlMap[entry?.id]
          if (docs && docs.length > 0) {
            doc.link(data.cell.x, data.cell.y, data.cell.width, data.cell.height, { url: docs[0].url })
            doc.setDrawColor(37, 99, 235)
            doc.setLineWidth(0.3)
            doc.line(data.cell.x + 1, data.cell.y + data.cell.height - 1.5, data.cell.x + data.cell.width - 1, data.cell.y + data.cell.height - 1.5)
          }
        },
      })

      // ─── PAGE 2+: DETAILS ET DOCUMENTS ────────────────────────────────────

      const detailedEntries = filteredEntries.filter(e => e.description || e.notes || e.legal_reference || signedUrlMap[e.id])

      if (detailedEntries.length > 0) {
        doc.addPage()
        box(0, 0, 210, 22, C.dark)
        doc.setTextColor(...C.white)
        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.text('DETAILS ET DOCUMENTS', 105, 14, { align: 'center' })
        doc.setTextColor(...C.text)
        y = 30

        for (const entry of detailedEntries) {
          const descLines  = entry.description ? doc.splitTextToSize(entry.description, 160) : []
          const noteLines2 = entry.notes       ? doc.splitTextToSize(entry.notes, 155)       : []
          const docCount   = signedUrlMap[entry.id]?.length || 0
          const estimatedH = 18
            + descLines.length * 4 + (descLines.length > 0 ? 3 : 0)
            + (entry.legal_reference ? 5 : 0)
            + noteLines2.length * 4 + (noteLines2.length > 0 ? 7 : 0)
            + docCount * 6 + (docCount > 0 ? 10 : 0)
            + 6

          if (y + estimatedH > 272) {
            doc.addPage()
            box(0, 0, 210, 22, C.dark)
            doc.setTextColor(...C.white)
            doc.setFontSize(14)
            doc.setFont('helvetica', 'bold')
            doc.text('DETAILS ET DOCUMENTS (suite)', 105, 14, { align: 'center' })
            doc.setTextColor(...C.text)
            y = 30
          }

          const color = typeColorMap[entry.entry_type] || C.gray
          const lightColor: [number,number,number] = [
            Math.min(255, color[0] + 175),
            Math.min(255, color[1] + 175),
            Math.min(255, color[2] + 175),
          ]

          // En-tete de la fiche
          box(15, y, 180, 14, lightColor)
          box(15, y, 5,   14, color)
          doc.setTextColor(...color)
          doc.setFontSize(6.5)
          doc.setFont('helvetica', 'bold')
          doc.text((typeLabelMap[entry.entry_type] || entry.entry_type).toUpperCase(), 23, y + 5)
          doc.setTextColor(...C.text)
          doc.setFontSize(9.5)
          doc.setFont('helvetica', 'bold')
          const titleFit = doc.splitTextToSize(entry.title, 120)
          doc.text(titleFit[0], 23, y + 11)
          doc.setTextColor(...C.sub)
          doc.setFontSize(7.5)
          doc.setFont('helvetica', 'normal')
          doc.text(new Date(entry.entry_date).toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' }), 190, y + 5, { align: 'right' })
          const statusInfo = STATUS_OPTIONS[entry.status as keyof typeof STATUS_OPTIONS]
          doc.text(statusInfo?.label || entry.status, 190, y + 11, { align: 'right' })
          y += 17

          if (descLines.length > 0) {
            doc.setTextColor(...C.text)
            doc.setFontSize(8)
            doc.setFont('helvetica', 'normal')
            doc.text(descLines, 20, y)
            y += descLines.length * 4 + 3
          }

          if (entry.legal_reference) {
            doc.setTextColor(...C.sub)
            doc.setFontSize(7)
            doc.setFont('helvetica', 'italic')
            doc.text(`Ref. legale: ${entry.legal_reference}`, 20, y)
            y += 5
          }

          if (noteLines2.length > 0) {
            box(20, y, 170, noteLines2.length * 4 + 4, C.grayL)
            doc.setTextColor(...C.sub)
            doc.setFontSize(7)
            doc.setFont('helvetica', 'italic')
            doc.text(noteLines2, 23, y + 3.5)
            y += noteLines2.length * 4 + 7
          }

          const docs = signedUrlMap[entry.id]
          if (docs && docs.length > 0) {
            box(20, y, 170, docs.length * 6 + 8, C.blueL)
            doc.setTextColor(...C.blue)
            doc.setFontSize(7.5)
            doc.setFont('helvetica', 'bold')
            doc.text('Documents:', 23, y + 5)
            y += 7
            for (const d of docs) {
              doc.setFont('helvetica', 'normal')
              doc.setFontSize(7.5)
              doc.setTextColor(...C.blue)
              doc.text(d.name, 26, y + 3)
              doc.link(20, y, 170, 6, { url: d.url })
              const tw = doc.getTextWidth(d.name)
              doc.setDrawColor(...C.blue)
              doc.setLineWidth(0.3)
              doc.line(26, y + 3.5, 26 + tw, y + 3.5)
              y += 6
            }
            y += 2
          }

          y += 5
        }
      }

      // Footer sur toutes les pages
      const totalPages = (doc.internal as any).getNumberOfPages()
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i)
        addFooter(i, totalPages)
      }

      doc.save(`livre_entreprise_${new Date().toISOString().split('T')[0]}.pdf`)
    } catch (err) {
      console.error('Erreur export PDF:', err)
      alert('Erreur lors de la generation du PDF')
    } finally {
      setExportingCorporateBookPDF(false)
    }
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

          {/* Toggle vue */}
          <div className="flex rounded-full border border-gray-300 overflow-hidden">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 text-sm font-medium transition-colors flex items-center gap-1.5 ${viewMode === 'list' ? 'bg-[#3e3e3e] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              title="Vue liste"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><rect x="0" y="2" width="16" height="2" rx="1"/><rect x="0" y="7" width="16" height="2" rx="1"/><rect x="0" y="12" width="16" height="2" rx="1"/></svg>
              Liste
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-2 text-sm font-medium transition-colors flex items-center gap-1.5 ${viewMode === 'cards' ? 'bg-[#3e3e3e] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              title="Vue cartes"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><rect x="0" y="0" width="7" height="7" rx="1"/><rect x="9" y="0" width="7" height="7" rx="1"/><rect x="0" y="9" width="7" height="7" rx="1"/><rect x="9" y="9" width="7" height="7" rx="1"/></svg>
              Cartes
            </button>
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1 text-xs text-gray-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={pdfIncludeLinks}
                onChange={e => setPdfIncludeLinks(e.target.checked)}
                className="rounded"
              />
              Liens docs
            </label>
            <button
              onClick={exportCorporateBookPDF}
              disabled={exportingCorporateBookPDF || filteredEntries.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 rounded-full text-sm font-medium transition-colors disabled:opacity-50"
            >
              <FileDown size={16} />
              {exportingCorporateBookPDF ? 'Generation...' : 'Export PDF'}
            </button>
          </div>

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

      {/* Entries */}
      {filteredEntries.length === 0 ? (
        <div className="bg-white p-12 rounded-lg shadow-md border border-gray-200 text-center">
          <FileText size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Aucune entrée dans le livre d'entreprise</h3>
          <p className="text-sm text-gray-500">Cliquez sur "Nouvelle entrée" ou "+Action" pour commencer</p>
        </div>
      ) : viewMode === 'list' ? (

        /* ── VUE LISTE ─────────────────────────────────────────────────────── */
        <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
          {/* En-tête colonnes */}
          <div className="hidden sm:grid grid-cols-[90px_160px_1fr_130px_100px_80px_80px] gap-3 px-4 py-2 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            <span>Date</span>
            <span>Type</span>
            <span>Titre</span>
            <span>Propriété</span>
            <span>Montant</span>
            <span>Statut</span>
            <span className="text-right">Actions</span>
          </div>

          <div className="divide-y divide-gray-100">
            {filteredEntries.map(entry => {
              const typeInfo = ENTRY_TYPES[entry.entry_type as keyof typeof ENTRY_TYPES]
              const statusInfo = STATUS_OPTIONS[entry.status as keyof typeof STATUS_OPTIONS]
              const Icon = typeInfo?.icon || FileText

              const statusColors: Record<string, string> = {
                approved: 'bg-green-100 text-green-700',
                filed:    'bg-blue-100 text-blue-700',
                draft:    'bg-gray-100 text-gray-600',
              }

              return (
                <div key={entry.id} className="grid grid-cols-1 sm:grid-cols-[90px_160px_1fr_130px_100px_100px_80px] gap-2 sm:gap-3 px-4 py-3 hover:bg-gray-50 transition-colors items-center">

                  {/* Date */}
                  <div className="text-xs text-gray-500 font-mono">
                    {new Date(entry.entry_date).toLocaleDateString('fr-CA')}
                  </div>

                  {/* Type */}
                  <div className="flex items-center gap-2">
                    <div className={`p-1 rounded bg-${typeInfo?.color || 'gray'}-100 flex-shrink-0`}>
                      <Icon size={13} className={`text-${typeInfo?.color || 'gray'}-600`} />
                    </div>
                    <span className="text-xs text-gray-600 leading-tight">
                      {typeInfo?.label.replace(/[🏢💰📈🔄📉👥🏛️📜⚖️📋]/g, '').trim()}
                    </span>
                  </div>

                  {/* Titre + description + docs */}
                  <div className="min-w-0">
                    <div className="font-semibold text-sm text-gray-900 truncate">{entry.title}</div>
                    {entry.description && (
                      <div className="text-xs text-gray-500 truncate mt-0.5">{entry.description}</div>
                    )}
                    {entry.legal_reference && (
                      <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                        <Gavel size={10} />
                        <span className="truncate">{entry.legal_reference}</span>
                      </div>
                    )}
                    {entry.has_documents && (
                      <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded text-xs bg-purple-50 text-purple-600">
                        <FileText size={10} />
                        {entry.document_count} doc.
                      </span>
                    )}
                  </div>

                  {/* Propriété */}
                  <div className="text-xs text-gray-600 truncate">
                    {entry.property_name ? (
                      <span className="flex items-center gap-1">
                        <Building2 size={11} className="text-purple-500 flex-shrink-0" />
                        <span className="truncate">{entry.property_name}</span>
                      </span>
                    ) : <span className="text-gray-300">—</span>}
                  </div>

                  {/* Montant */}
                  <div className="text-sm font-semibold text-gray-800">
                    {entry.amount
                      ? <span>{entry.amount.toLocaleString('fr-CA')} <span className="text-xs font-normal text-gray-500">{entry.currency}</span></span>
                      : <span className="text-gray-300">—</span>
                    }
                  </div>

                  {/* Statut */}
                  <div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[entry.status] || 'bg-gray-100 text-gray-600'}`}>
                      {statusInfo?.label || entry.status}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1 justify-end">
                    <button
                      onClick={() => handleEdit(entry)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="Modifier"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(entry.id, entry.title)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

      ) : (

        /* ── VUE CARTES ────────────────────────────────────────────────────── */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
          {filteredEntries.map(entry => {
            const typeInfo = ENTRY_TYPES[entry.entry_type as keyof typeof ENTRY_TYPES]
            const statusInfo = STATUS_OPTIONS[entry.status as keyof typeof STATUS_OPTIONS]
            const Icon = typeInfo?.icon || FileText

            return (
              <div key={entry.id} className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
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
                <div className="p-4 sm:p-6 space-y-3">
                  {entry.description && <p className="text-sm text-gray-600 line-clamp-3">{entry.description}</p>}
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
                  {entry.notes && (
                    <div className="pt-3 border-t border-gray-100">
                      <div className="text-xs text-gray-500 mb-1">Notes</div>
                      <p className="text-xs text-gray-600 line-clamp-2">{entry.notes}</p>
                    </div>
                  )}
                </div>
                <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                  <div className="text-xs text-gray-500">
                    Créé le {new Date(entry.created_at).toLocaleDateString('fr-CA')}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleEdit(entry)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Modifier">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleDelete(entry.id, entry.title)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Supprimer">
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
