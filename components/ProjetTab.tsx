'use client'

import { useState, useEffect } from 'react'
import { useInvestment } from '@/contexts/InvestmentContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { Building2, Plus, Edit2, Trash2, MapPin, Calendar, DollarSign, TrendingUp, X, AlertCircle, CheckCircle, Clock, FileImage, RefreshCw, Calculator, Menu, BarChart2, Wallet, CreditCard, History, FileDown, Link2 } from 'lucide-react'
import ProjectAttachments from './ProjectAttachments'
import PropertyLinksManager from './PropertyLinksManager'
import PropertyPerformanceAnalysis from './PropertyPerformanceAnalysis'
import PropertyFinancialSummary from './PropertyFinancialSummary'
import PaymentScheduleManager from './PaymentScheduleManager'
import { getCurrentExchangeRate } from '@/lib/exchangeRate'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

interface PropertyFormData {
  name: string
  location: string
  status: string
  total_cost: number
  paid_amount: number
  reservation_date: string
  completion_date: string
  expected_roi: number
  owner_occupation_days: number
  // Payment schedule fields
  currency: string
  payment_schedule_type: string
  reservation_deposit: number
  reservation_deposit_cad: number
  payment_start_date: string
  // Sale fields
  sale_date: string
  sale_price: number
  sale_currency: string
  buyer_name: string
  sale_notes: string
}

interface PaymentTerm {
  label: string
  amount_type: 'percentage' | 'fixed_amount' // Type: pourcentage ou montant fixe
  percentage: number
  fixed_amount: number
  due_date: string // Date d'échéance au format YYYY-MM-DD
}

export default function ProjetTab() {
  const {
    properties,
    addProperty,
    updateProperty,
    deleteProperty,
    paymentSchedules,
    fetchPaymentSchedules,
    transactions,
    loading
  } = useInvestment()
  const { t, language } = useLanguage()
  const { currentUser } = useAuth()
  const isAdmin = currentUser?.role === 'admin'

  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null)
  const [showTransactionsPropertyId, setShowTransactionsPropertyId] = useState<string | null>(null)
  const [showAttachmentsPropertyId, setShowAttachmentsPropertyId] = useState<string | null>(null)
  const [showScenarioDataPropertyId, setShowScenarioDataPropertyId] = useState<string | null>(null)
  const [showPerformancePropertyId, setShowPerformancePropertyId] = useState<string | null>(null)
  const [showPaymentManagerPropertyId, setShowPaymentManagerPropertyId] = useState<string | null>(null)
  const [showFinancialSummaryPropertyId, setShowFinancialSummaryPropertyId] = useState<string | null>(null)
  const [showLinksPropertyId, setShowLinksPropertyId] = useState<string | null>(null)
  const [openMenuPropertyId, setOpenMenuPropertyId] = useState<string | null>(null)
  const [exchangeRate, setExchangeRate] = useState<number>(1.35)
  const [loadingRate, setLoadingRate] = useState(false)
  const [scenarios, setScenarios] = useState<any[]>([])
  const [scenarioResults, setScenarioResults] = useState<any[]>([])
  const [exportingProjectId, setExportingProjectId] = useState<string | null>(null)


  const [formData, setFormData] = useState<PropertyFormData>({
    name: '',
    location: '',
    status: 'reservation',
    total_cost: 0,
    paid_amount: 0,
    reservation_date: new Date().toISOString().split('T')[0],
    completion_date: '',
    expected_roi: 0,
    owner_occupation_days: 60,
    currency: 'USD',
    payment_schedule_type: 'one_time',
    reservation_deposit: 0,
    reservation_deposit_cad: 0,
    payment_start_date: new Date().toISOString().split('T')[0],
    sale_date: '',
    sale_price: 0,
    sale_currency: 'USD',
    buyer_name: '',
    sale_notes: ''
  })

  const [paymentTerms, setPaymentTerms] = useState<PaymentTerm[]>([
    { label: 'Acompte', amount_type: 'percentage', percentage: 50, fixed_amount: 0, due_date: new Date().toISOString().split('T')[0] },
    { label: '2e versement', amount_type: 'percentage', percentage: 20, fixed_amount: 0, due_date: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0] },
    { label: '3e versement', amount_type: 'percentage', percentage: 20, fixed_amount: 0, due_date: new Date(Date.now() + 60*24*60*60*1000).toISOString().split('T')[0] },
    { label: 'Versement final', amount_type: 'percentage', percentage: 10, fixed_amount: 0, due_date: new Date(Date.now() + 90*24*60*60*1000).toISOString().split('T')[0] }
  ])

  // Fetch payment schedules when component mounts
  useEffect(() => {
    fetchPaymentSchedules()
  }, [fetchPaymentSchedules])

  // Load exchange rate on mount
  useEffect(() => {
    loadExchangeRate()
  }, [])

  // Load scenarios and their results for converted projects
  useEffect(() => {
    const loadScenarios = async () => {
      try {
        const { data: scenariosData, error: scenariosError } = await supabase
          .from('scenarios')
          .select('*')
          .eq('status', 'purchased')

        if (scenariosError) throw scenariosError
        setScenarios(scenariosData || [])

        // Load scenario results for all scenarios
        if (scenariosData && scenariosData.length > 0) {
          const { data: resultsData, error: resultsError } = await supabase
            .from('scenario_results')
            .select('*')
            .in('scenario_id', scenariosData.map(s => s.id))

          if (resultsError) throw resultsError
          setScenarioResults(resultsData || [])
        }
      } catch (error) {
        console.error('Error loading scenarios:', error)
      }
    }

    loadScenarios()
  }, [properties])

  const loadExchangeRate = async () => {
    setLoadingRate(true)
    try {
      const rate = await getCurrentExchangeRate('USD', 'CAD')
      setExchangeRate(rate)
    } catch (error) {
      console.error('Error loading exchange rate:', error)
    } finally {
      setLoadingRate(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!editingId) {
      alert(t('projects.cannotAddManually'))
      return
    }

    // Update existing property — convert empty date strings to null for PostgreSQL
    const sanitizedData = {
      ...formData,
      completion_date: formData.completion_date || undefined,
      sale_date: formData.sale_date || undefined,
    }
    const result = await updateProperty(editingId, sanitizedData)
    if (result.success) {
      setEditingId(null)
      setShowAddForm(false)
      resetForm()
    } else {
      alert(t('projects.updateError') + result.error)
    }
  }

  const handleEdit = (property: any) => {
    setEditingId(property.id)
    // Calculer automatiquement le montant payé depuis les transactions
    const calculatedPaidAmount = calculateTotalPaidInPropertyCurrency(property.id, property.currency || 'USD')

    setFormData({
      name: property.name,
      location: property.location,
      status: property.status,
      total_cost: property.total_cost,
      paid_amount: calculatedPaidAmount, // Calculé automatiquement
      reservation_date: property.reservation_date.split('T')[0],
      completion_date: property.completion_date ? property.completion_date.split('T')[0] : '',
      expected_roi: property.expected_roi,
      owner_occupation_days: property.owner_occupation_days ?? 60,
      currency: property.currency || 'USD',
      payment_schedule_type: property.payment_schedule_type || 'one_time',
      reservation_deposit: property.reservation_deposit || 0,
      reservation_deposit_cad: property.reservation_deposit_cad || 0,
      payment_start_date: property.payment_start_date?.split('T')[0] || new Date().toISOString().split('T')[0],
      sale_date: property.sale_date ? property.sale_date.split('T')[0] : '',
      sale_price: property.sale_price || 0,
      sale_currency: property.sale_currency || 'USD',
      buyer_name: property.buyer_name || '',
      sale_notes: property.sale_notes || ''
    })
    setShowAddForm(true)
  }

  const handleDelete = async (id: string, name: string) => {
    if (confirm(t('projects.confirmDelete') + ` "${name}" ?`)) {
      const result = await deleteProperty(id)
      if (!result.success) {
        alert(t('error.deleteFailed') + ': ' + result.error)
      }
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      location: '',
      status: 'reservation',
      total_cost: 0,
      paid_amount: 0,
      reservation_date: new Date().toISOString().split('T')[0],
      completion_date: '',
      expected_roi: 0,
      owner_occupation_days: 60,
      currency: 'USD',
      payment_schedule_type: 'one_time',
      reservation_deposit: 0,
      reservation_deposit_cad: 0,
      payment_start_date: new Date().toISOString().split('T')[0],
      sale_date: '',
      sale_price: 0,
      sale_currency: 'USD',
      buyer_name: '',
      sale_notes: ''
    })
    setShowAddForm(false)
    setEditingId(null)
  }

  const addPaymentTerm = () => {
    setPaymentTerms([...paymentTerms, { label: '', amount_type: 'percentage', percentage: 0, fixed_amount: 0, due_date: new Date().toISOString().split('T')[0] }])
  }

  const removePaymentTerm = (index: number) => {
    setPaymentTerms(paymentTerms.filter((_, i) => i !== index))
  }

  const updatePaymentTerm = (index: number, field: keyof PaymentTerm, value: string | number) => {
    const updated = [...paymentTerms]
    updated[index] = { ...updated[index], [field]: value }
    setPaymentTerms(updated)
  }

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      reservation: { bg: 'bg-blue-100', text: 'text-blue-800', label: t('status.reservation') },
      en_construction: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: t('status.construction') },
      complete: { bg: 'bg-green-100', text: 'text-green-800', label: t('status.completed') },
      livré: { bg: 'bg-teal-100', text: 'text-teal-800', label: 'Livré' },
      actif: { bg: 'bg-purple-100', text: 'text-purple-800', label: t('status.active') }
    }
    const badge = badges[status] || badges.reservation
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    )
  }

  const getPaymentStatusFlag = (dueDate: string, status: string): { emoji: string; label: string; bgClass: string; textClass: string } => {
    // Si payé, toujours vert
    if (status === 'paid') {
      return {
        emoji: '🟢',
        label: 'Payé',
        bgClass: 'bg-green-50 border-green-200',
        textClass: 'text-green-700'
      }
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const due = new Date(dueDate)
    due.setHours(0, 0, 0, 0)
    const daysUntil = Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    // Pour les paiements en attente (pending)
    if (daysUntil < 0) {
      // En retard
      return {
        emoji: '🔴',
        label: `En retard (${Math.abs(daysUntil)} jour${Math.abs(daysUntil) > 1 ? 's' : ''})`,
        bgClass: 'bg-red-50 border-red-200',
        textClass: 'text-red-700'
      }
    } else if (daysUntil <= 7) {
      // À venir bientôt (7 jours ou moins)
      return {
        emoji: '🟡',
        label: daysUntil === 0 ? "Aujourd'hui" : `Dans ${daysUntil} jour${daysUntil > 1 ? 's' : ''}`,
        bgClass: 'bg-orange-50 border-orange-200',
        textClass: 'text-orange-700'
      }
    } else {
      // Futur (plus de 7 jours)
      return {
        emoji: '⚪',
        label: `Dans ${daysUntil} jours`,
        bgClass: 'bg-gray-50 border-gray-200',
        textClass: 'text-gray-700'
      }
    }
  }

  const getPropertyPayments = (propertyId: string) => {
    return paymentSchedules.filter(ps => ps.property_id === propertyId)
  }

  // Calculer le total payé en CAD depuis les transactions (source de vérité unique)
  const calculateTotalPaidCAD = (propertyId: string) => {
    return transactions
      .filter(t => t.property_id === propertyId)
      .reduce((sum, t) => sum + t.amount, 0)
  }

  // Calculer le total payé en USD (montant source) depuis les transactions
  const calculateTotalPaidUSD = (propertyId: string) => {
    return transactions
      .filter(t => t.property_id === propertyId && t.source_currency === 'USD' && t.source_amount)
      .reduce((sum, t) => sum + (t.source_amount || 0), 0)
  }

  // Calculer le total payé en devise du contrat (pour progression)
  const calculateTotalPaidInPropertyCurrency = (propertyId: string, currency: string) => {
    if (currency === 'CAD') {
      // Si le contrat est en CAD, on prend directement le montant CAD
      return calculateTotalPaidCAD(propertyId)
    } else {
      // Si le contrat est en USD (ou autre), on prend le montant source USD
      return calculateTotalPaidUSD(propertyId)
    }
  }

  const exportProjectPDF = async (property: any) => {
    setExportingProjectId(property.id)
    try {
      const jsPDF = (await import('jspdf')).default
      const autoTable = (await import('jspdf-autotable')).default
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

      // ── Palette ───────────────────────────────────────────────────────────
      const C = {
        dark:   [62,  62,  62]  as [number,number,number],
        mid:    [94,  94,  94]  as [number,number,number],
        light:  [245, 245, 245] as [number,number,number],
        white:  [255, 255, 255] as [number,number,number],
        blue:   [37,  99,  235] as [number,number,number],
        blueL:  [239, 246, 255] as [number,number,number],
        blueB:  [191, 219, 254] as [number,number,number],
        green:  [22,  163, 74]  as [number,number,number],
        greenL: [240, 253, 244] as [number,number,number],
        greenB: [187, 247, 208] as [number,number,number],
        purple: [124, 58,  237] as [number,number,number],
        purpleL:[245, 243, 255] as [number,number,number],
        purpleB:[221, 214, 254] as [number,number,number],
        orange: [234, 88,  12]  as [number,number,number],
        orangeL:[255, 247, 237] as [number,number,number],
        red:    [220, 38,  38]  as [number,number,number],
        redL:   [254, 242, 242] as [number,number,number],
        gray:   [156, 163, 175] as [number,number,number],
        grayL:  [243, 244, 246] as [number,number,number],
        text:   [31,  41,  55]  as [number,number,number],
        sub:    [107, 114, 128] as [number,number,number],
      }

      // ── Helpers ───────────────────────────────────────────────────────────
      const W = 210
      const safeNum = (n: number) =>
        Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
      const fmtCAD  = (n: number | null | undefined) => n == null ? '-' : safeNum(n) + ' $ CAD'
      const fmtUSD  = (n: number | null | undefined) => n == null ? '-' : safeNum(n) + ' $ USD'
      const fmtCurr = (n: number | null | undefined, cur: string) => cur === 'USD' ? fmtUSD(n) : fmtCAD(n)
      const fmtPct  = (n: number | null | undefined, dec = 1) => n == null ? '-' : `${Number(n).toFixed(dec)} %`
      const fmtDate = (d: string | null | undefined) =>
        d ? new Date(d).toLocaleDateString('fr-CA', { year: 'numeric', month: 'long', day: 'numeric' }) : '-'

      const loadBase64 = async (url: string) => {
        try {
          const b = await (await fetch(url)).blob()
          return await new Promise<string>((res, rej) => {
            const r = new FileReader(); r.onloadend = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(b)
          })
        } catch { return '' }
      }
      const getImgSize = (b64: string, maxH: number) => new Promise<{w:number;h:number}>(resolve => {
        const img = new Image()
        img.onload = () => { const ratio = img.naturalHeight / (img.naturalWidth || 1); resolve({ w: maxH / ratio, h: maxH }) }
        img.onerror = () => resolve({ w: maxH * 3, h: maxH })
        img.src = b64
      })

      // Dessiner un rectangle arrondi simulé (jsPDF < 2 n'a pas roundedRect stable)
      const box = (x: number, y: number, w: number, h: number, fill: [number,number,number], border?: [number,number,number]) => {
        doc.setFillColor(...fill)
        if (border) { doc.setDrawColor(...border); doc.rect(x, y, w, h, 'FD') }
        else { doc.rect(x, y, w, h, 'F') }
      }

      // Barre de progression dessinée
      const progressBar = (x: number, y: number, w: number, h: number, pct: number, color: [number,number,number]) => {
        box(x, y, w, h, [229, 231, 235])
        const fill = Math.min(Math.max(pct / 100, 0), 1) * w
        if (fill > 0) box(x, y, fill, h, color)
      }

      // En-tête de section
      const sectionTitle = (title: string, yPos: number, color: [number,number,number] = C.mid) => {
        box(15, yPos, 180, 7, color)
        doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(...C.white)
        doc.text(title.toUpperCase(), 18, yPos + 5)
        doc.setFont('helvetica', 'normal')
        return yPos + 10
      }

      // Pied de page
      const addFooter = (pageNum: number, total: number, titleStr: string) => {
        doc.setDrawColor(...C.gray); doc.setLineWidth(0.3); doc.line(15, 280, 195, 280)
        doc.setFontSize(7.5); doc.setTextColor(...C.sub)
        doc.text('CERDIA Investissement — Document confidentiel', 105, 285, { align: 'center' })
        doc.text(`Page ${pageNum} / ${total}`, 195, 285, { align: 'right' })
        doc.text(titleStr, 15, 285)
      }

      const logo = await loadBase64('/logo-cerdia3.png')
      const today = new Date().toLocaleDateString('fr-CA', { year: 'numeric', month: 'long', day: 'numeric' })

      // ── Données ───────────────────────────────────────────────────────────
      const currency       = property.currency || 'CAD'
      const totalPaidCurr  = calculateTotalPaidInPropertyCurrency(property.id, currency)
      const totalPaidCAD_  = calculateTotalPaidCAD(property.id)
      const totalPaidUSD_  = calculateTotalPaidUSD(property.id)
      const remaining      = Math.max((property.total_cost || 0) - totalPaidCurr, 0)
      const pctPaid        = property.total_cost > 0 ? (totalPaidCurr / property.total_cost) * 100 : 0
      const propPayments   = paymentSchedules.filter(ps => ps.property_id === property.id)
        .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
      const pendingCount   = propPayments.filter(p => p.status === 'pending').length
      const overdueCount   = propPayments.filter(p => p.status === 'overdue').length
      const originScenario = scenarios.find((s: any) => s.converted_property_id === property.id)
      const scenarioData   = originScenario ? scenarioResults.filter((r: any) => r.scenario_id === originScenario.id) : []
      const moderate       = scenarioData.find((r: any) => r.scenario_type === 'moderate')
      const propTx         = transactions.filter(t => t.property_id === property.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

      const statusLabels: Record<string,string> = {
        reservation: 'Reservation', en_construction: 'En construction',
        acquired: 'Acquis', complete: 'Complete', actif: 'Actif',
        en_location: 'En location', vendu: 'Vendu', livré: 'Livre',
      }
      const statusColors: Record<string,[number,number,number]> = {
        reservation: [37,99,235], en_construction: [217,119,6],
        acquired: [22,163,74], complete: [22,163,74], actif: [22,163,74],
        en_location: [14,165,233], vendu: [107,114,128],
      }
      const statusColor = statusColors[property.status] || C.mid

      // ════════════════════════════════════════════════════════════════════
      // PAGE 1
      // ════════════════════════════════════════════════════════════════════

      // Bannière en-tête foncée
      box(0, 0, W, 38, C.dark)
      if (logo) {
        try { const { w, h } = await getImgSize(logo, 14); doc.addImage(logo, 'PNG', 15, 12, w, h) } catch {}
      }
      doc.setFontSize(8); doc.setTextColor(...C.gray); doc.setFont('helvetica', 'normal')
      doc.text('CERDIA Investissement', W - 15, 10, { align: 'right' })
      doc.setFontSize(16); doc.setTextColor(...C.white); doc.setFont('helvetica', 'bold')
      doc.text(property.name, W - 15, 20, { align: 'right' })
      doc.setFontSize(9); doc.setTextColor(196,196,196); doc.setFont('helvetica', 'normal')
      doc.text(`${property.location || 'Localisation inconnue'}   |   Genere le ${today}`, W - 15, 28, { align: 'right' })

      // Badge statut
      box(15, 8, 40, 8, statusColor)
      doc.setFontSize(8); doc.setTextColor(...C.white); doc.setFont('helvetica', 'bold')
      doc.text(statusLabels[property.status] || property.status, 35, 13.5, { align: 'center' })
      doc.setFont('helvetica', 'normal')

      let y = 45

      // ── Section 1: Informations générales ───────────────────────────────
      y = sectionTitle('Informations generales', y)
      autoTable(doc, {
        startY: y,
        body: [
          ['Nom du projet', property.name, 'Statut', statusLabels[property.status] || property.status],
          ['Localisation', property.location || '-', 'Devise', currency],
          ['Date reservation', fmtDate(property.reservation_date), 'Date livraison prevue', fmtDate(property.completion_date)],
          ['ROI attendu', fmtPct(property.expected_roi), 'Jours proprietaire/an', `${property.owner_occupation_days || 60} jours`],
        ],
        theme: 'plain',
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: {
          0: { cellWidth: 50, fontStyle: 'bold', textColor: C.sub as any },
          1: { cellWidth: 50, textColor: C.text as any },
          2: { cellWidth: 50, fontStyle: 'bold', textColor: C.sub as any },
          3: { cellWidth: 35, textColor: C.text as any },
        },
        didDrawCell: (data: any) => {
          if (data.section === 'body') {
            doc.setDrawColor(229,231,235); doc.setLineWidth(0.2)
            doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height)
          }
        },
      })
      y = (doc as any).lastAutoTable.finalY + 8

      // ── Section 2: Progression financière ──────────────────────────────
      y = sectionTitle('Progression financiere', y, C.blue)

      // Barre de progression
      doc.setFontSize(9); doc.setTextColor(...C.text); doc.setFont('helvetica', 'bold')
      doc.text(`${pctPaid.toFixed(1)} %`, W - 15, y + 5, { align: 'right' })
      doc.setFont('helvetica', 'normal'); doc.setTextColor(...C.sub)
      doc.text('Progression du financement', 15, y + 5)
      y += 8
      progressBar(15, y, 180, 5, pctPaid, C.blue)
      y += 10

      // 3 cartes KPI
      const kpis = [
        { label: 'Prix contractuel', value: fmtCurr(property.total_cost, currency), bg: C.blueL, border: C.blueB, textC: C.blue },
        { label: 'Verse a ce jour',  value: fmtCurr(totalPaidCurr, currency),        bg: C.greenL, border: C.greenB, textC: C.green },
        { label: 'Solde restant',    value: fmtCurr(remaining, currency),             bg: remaining > 0 ? C.orangeL : C.greenL, border: remaining > 0 ? [253,186,116] as [number,number,number] : C.greenB, textC: remaining > 0 ? C.orange : C.green },
      ]
      const cardW = 57; const cardH = 18; const gap = 4; let cx = 15
      for (const k of kpis) {
        box(cx, y, cardW, cardH, k.bg, k.border)
        doc.setFontSize(7.5); doc.setTextColor(...C.sub); doc.setFont('helvetica', 'normal')
        doc.text(k.label, cx + 4, y + 5)
        doc.setFontSize(10); doc.setTextColor(...k.textC); doc.setFont('helvetica', 'bold')
        doc.text(k.value, cx + 4, y + 13)
        cx += cardW + gap
      }
      y += cardH + 6

      // Conversion USD/CAD si contrat USD
      if (currency === 'USD' && totalPaidCAD_ > 0 && totalPaidUSD_ > 0) {
        const rate = totalPaidCAD_ / totalPaidUSD_
        box(15, y, 87, 14, C.blueL, C.blueB)
        box(108, y, 87, 14, C.greenL, C.greenB)
        doc.setFontSize(7.5); doc.setTextColor(...C.sub); doc.setFont('helvetica', 'normal')
        doc.text('Montant contrat (USD)', 19, y + 4.5)
        doc.text('Reellement paye (CAD)', 112, y + 4.5)
        doc.setFontSize(9.5); doc.setFont('helvetica', 'bold')
        doc.setTextColor(...C.blue);  doc.text(fmtUSD(totalPaidUSD_), 19, y + 11)
        doc.setTextColor(...C.green); doc.text(fmtCAD(totalPaidCAD_), 112, y + 11)
        doc.setFontSize(7); doc.setTextColor(...C.sub); doc.setFont('helvetica', 'normal')
        doc.text(`Taux moyen: ${rate.toFixed(4)}`, W - 15, y + 11, { align: 'right' })
        y += 20
      }

      // ── Section 3: Scénario d'évaluation (si dispo) ──────────────────────
      if (originScenario && moderate) {
        y = sectionTitle('Analyse scenarielle (scenario modere)', y, C.purple)
        box(15, y, 180, 32, C.purpleL, C.purpleB)
        const cols = [
          { label: 'Rendement annuel moyen', value: fmtPct(moderate.summary?.avg_annual_return, 2) },
          { label: 'Retour total',           value: fmtPct(moderate.summary?.total_return, 1) },
          { label: 'Point mort',             value: moderate.summary?.break_even_year ? `Annee ${moderate.summary.break_even_year}` : '-' },
          { label: 'Recommandation',         value: moderate.summary?.recommendation === 'recommended' ? 'Recommande' : moderate.summary?.recommendation === 'not_recommended' ? 'Deconseille' : 'A considerer' },
        ]
        const colW = 42; let colX = 18
        for (const col of cols) {
          doc.setFontSize(7.5); doc.setTextColor(...C.purpleB); doc.setFont('helvetica', 'normal')
          doc.text(col.label, colX, y + 8)
          const isRec = col.value === 'Recommande'; const isDec = col.value === 'Deconseille'
          doc.setFontSize(11); doc.setFont('helvetica', 'bold')
          doc.setTextColor(...(isRec ? C.green : isDec ? C.red : C.purple))
          doc.text(col.value, colX, y + 20)
          colX += colW + 2
        }
        doc.setFontSize(7); doc.setTextColor(...C.sub); doc.setFont('helvetica', 'normal')
        doc.text(`Scenario cree le ${new Date(originScenario.created_at).toLocaleDateString('fr-CA')}`, 18, y + 29)
        y += 38
      }

      // ── Section 4: Bilan budgétaire ────────────────────────────────────
      if (originScenario && (totalPaidUSD_ > 0 || totalPaidCAD_ > 0)) {
        y = sectionTitle('Bilan budgetaire: Prevu vs Reel', y, [14, 116, 144])
        const budgetPct = property.total_cost > 0 ? (totalPaidUSD_ / property.total_cost) * 100 : 0
        const ecart = property.total_cost - totalPaidUSD_
        const isSaving = ecart >= 0

        // Deux colonnes prévu/réel
        box(15, y, 87, 22, C.blueL, C.blueB)
        box(108, y, 87, 22, isSaving ? C.greenL : C.redL, isSaving ? C.greenB : [252,165,165])
        doc.setFontSize(7.5); doc.setTextColor(...C.sub)
        doc.text('Prix prevu (scenario)', 19, y + 5)
        doc.text('Prix reel paye', 112, y + 5)
        doc.setFontSize(10); doc.setFont('helvetica', 'bold')
        doc.setTextColor(...C.blue);  doc.text(fmtUSD(property.total_cost), 19, y + 14)
        doc.setTextColor(isSaving ? C.green[0] : C.red[0], isSaving ? C.green[1] : C.red[1], isSaving ? C.green[2] : C.red[2])
        doc.text(fmtUSD(totalPaidUSD_), 112, y + 14)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7); doc.setTextColor(...C.sub)
        doc.text(`${budgetPct.toFixed(1)} % du budget`, 112, y + 19.5)
        y += 28

        // Écart
        const ecartBox = isSaving ? C.greenL : C.redL
        const ecartBorder = isSaving ? C.greenB : [252,165,165] as [number,number,number]
        box(15, y, 180, 10, ecartBox, ecartBorder)
        doc.setFontSize(8.5); doc.setFont('helvetica', 'bold')
        doc.setTextColor(isSaving ? C.green[0] : C.red[0], isSaving ? C.green[1] : C.red[1], isSaving ? C.green[2] : C.red[2])
        const ecartLabel = isSaving ? `Economie de ${fmtUSD(Math.abs(ecart))} (${((Math.abs(ecart)/property.total_cost)*100).toFixed(1)} %)` : `Depassement de ${fmtUSD(Math.abs(ecart))} (${((Math.abs(ecart)/property.total_cost)*100).toFixed(1)} %)`
        doc.text(ecartLabel, 105, y + 6.5, { align: 'center' })
        y += 15

        // Graphique barres prévu/réel par versement
        if (propPayments.length > 0) {
          doc.setFontSize(8); doc.setTextColor(...C.text); doc.setFont('helvetica', 'bold')
          doc.text('Echeancier: Prevu vs Reel', 15, y + 5); y += 8

          for (const payment of propPayments) {
            if (y > 265) { doc.addPage(); y = 20 }
            const payTx = transactions.filter(tx => tx.payment_schedule_id === payment.id)
            const actualUSD = payTx.filter(tx => tx.source_currency === 'USD' && tx.source_amount).reduce((s, tx) => s + (tx.source_amount || 0), 0)
            const planned = payment.amount; const actual = actualUSD
            const maxAmt = Math.max(planned, actual, 1)
            const barW = 120

            doc.setFontSize(7.5); doc.setTextColor(...C.sub); doc.setFont('helvetica', 'normal')
            doc.text(payment.term_label || `Versement ${payment.term_number}`, 15, y + 3.5)
            // Prévu
            box(45, y, barW, 4, [229,231,235])
            box(45, y, (planned / maxAmt) * barW, 4, C.blue)
            doc.setFontSize(6.5); doc.setTextColor(...C.blue)
            doc.text(`Prevu ${fmtUSD(planned)}`, 168, y + 3.5)
            y += 6
            // Réel
            box(45, y, barW, 4, [229,231,235])
            if (actual > 0) {
              box(45, y, (actual / maxAmt) * barW, 4, actual <= planned ? C.green : C.red)
              doc.setFontSize(6.5); doc.setTextColor(actual <= planned ? C.green[0] : C.red[0], actual <= planned ? C.green[1] : C.red[1], actual <= planned ? C.green[2] : C.red[2])
              doc.text(`Reel ${fmtUSD(actual)}`, 168, y + 3.5)
            } else {
              doc.setFontSize(6.5); doc.setTextColor(...C.gray)
              doc.text('Non paye', 168, y + 3.5)
            }
            y += 8
          }
          y += 2
        }
      }

      // ── Alertes paiements ─────────────────────────────────────────────
      if (overdueCount > 0 || pendingCount > 0) {
        if (y > 260) { doc.addPage(); y = 20 }
        if (overdueCount > 0) {
          box(15, y, 180, 9, C.redL, [252,165,165])
          doc.setFontSize(8.5); doc.setTextColor(...C.red); doc.setFont('helvetica', 'bold')
          doc.text(`${overdueCount} paiement(s) en retard — action requise`, 105, y + 6, { align: 'center' })
          y += 12
        }
        if (pendingCount > 0) {
          box(15, y, 180, 9, C.orangeL, [253,186,116])
          doc.setFontSize(8.5); doc.setTextColor(...C.orange); doc.setFont('helvetica', 'bold')
          doc.text(`${pendingCount} paiement(s) en attente`, 105, y + 6, { align: 'center' })
          y += 12
        }
        doc.setFont('helvetica', 'normal'); y += 2
      }

      // ════════════════════════════════════════════════════════════════════
      // PAGE 2 — Calendrier de paiements
      // ════════════════════════════════════════════════════════════════════
      if (propPayments.length > 0) {
        doc.addPage(); y = 20
        y = sectionTitle(`Calendrier de paiements (${propPayments.length} versements)`, y)
        const payStatusColors: Record<string, [number,number,number]> = {
          paid: C.green, overdue: C.red, partial: C.orange, pending: C.gray, cancelled: C.gray,
        }
        const payStatusLabels: Record<string,string> = {
          paid: 'Paye', overdue: 'En retard', partial: 'Partiel', pending: 'En attente', cancelled: 'Annule',
        }
        autoTable(doc, {
          startY: y,
          head: [['#', 'Versement', 'Montant', 'Echeance', 'Date paiement', 'Statut']],
          body: propPayments.map((ps, i) => [
            String(i + 1),
            ps.term_label || `Versement ${ps.term_number}`,
            fmtCurr(ps.amount, ps.currency || currency),
            fmtDate(ps.due_date),
            ps.paid_date ? fmtDate(ps.paid_date) : '-',
            payStatusLabels[ps.status] || ps.status,
          ]),
          theme: 'grid',
          headStyles: { fillColor: C.dark, textColor: C.white, fontStyle: 'bold', fontSize: 8 },
          bodyStyles: { fontSize: 8.5, cellPadding: 3 },
          alternateRowStyles: { fillColor: C.grayL },
          columnStyles: {
            0: { cellWidth: 10, halign: 'center', textColor: C.sub as any },
            1: { cellWidth: 55 },
            2: { cellWidth: 38, halign: 'right' },
            3: { cellWidth: 35 },
            4: { cellWidth: 35 },
            5: { cellWidth: 22, halign: 'center', fontStyle: 'bold' },
          },
          didParseCell: (data: any) => {
            if (data.section === 'body' && data.column.index === 5) {
              const status = propPayments[data.row.index]?.status
              data.cell.styles.textColor = payStatusColors[status] || C.gray
            }
          },
        })
        y = (doc as any).lastAutoTable.finalY + 8
      }

      // ════════════════════════════════════════════════════════════════════
      // PAGE 3 — Historique des transactions
      // ════════════════════════════════════════════════════════════════════
      if (propTx.length > 0) {
        doc.addPage(); y = 20
        y = sectionTitle(`Historique des transactions (${propTx.length})`, y)

        const txTypeLabels: Record<string,string> = {
          paiement:'Paiement', investissement:'Investissement', depense:'Depense',
          capex:'CAPEX', maintenance:'Maintenance', admin:'Administration',
          loyer:'Loyer', revenu:'Revenu', loyer_locatif:'Rev. locatif',
        }
        const txSignedUrls: Record<string,string> = {}
        await Promise.all(propTx.filter(t => t.attachment_storage_path).map(async t => {
          const { data } = await supabase.storage.from('transaction-attachments')
            .createSignedUrl(t.attachment_storage_path!, 60 * 60 * 24 * 365)
          if (data?.signedUrl) txSignedUrls[t.id] = data.signedUrl
        }))

        autoTable(doc, {
          startY: y,
          head: [['Date', 'Type', 'Description', 'Montant (CAD)', 'Piece jointe']],
          body: propTx.map(t => [
            new Date(t.date).toLocaleDateString('fr-CA'),
            txTypeLabels[t.type] || t.type,
            t.description || '-',
            fmtCAD(t.amount),
            t.attachment_name || '-',
          ]),
          theme: 'grid',
          headStyles: { fillColor: C.dark, textColor: C.white, fontStyle: 'bold', fontSize: 8 },
          bodyStyles: { fontSize: 8, cellPadding: 2.5 },
          alternateRowStyles: { fillColor: C.grayL },
          columnStyles: {
            0: { cellWidth: 24 }, 1: { cellWidth: 26 }, 2: { cellWidth: 68 },
            3: { cellWidth: 30, halign: 'right' }, 4: { cellWidth: 37 },
          },
          didParseCell: (data: any) => {
            if (data.section === 'body' && data.column.index === 4) {
              const tx = propTx[data.row.index]
              if (tx && txSignedUrls[tx.id]) data.cell.styles.textColor = [0,102,204]
            }
          },
          didDrawCell: (data: any) => {
            if (data.section === 'body' && data.column.index === 4) {
              const tx = propTx[data.row.index]
              const url = tx && txSignedUrls[tx.id]
              if (url) {
                doc.link(data.cell.x, data.cell.y, data.cell.width, data.cell.height, { url })
                doc.setDrawColor(0,102,204); doc.setLineWidth(0.15)
                doc.line(data.cell.x+1, data.cell.y+data.cell.height-1.5, data.cell.x+data.cell.width-1, data.cell.y+data.cell.height-1.5)
              }
            }
          },
        })
        y = (doc as any).lastAutoTable.finalY + 8
      }

      // ════════════════════════════════════════════════════════════════════
      // PAGE 4+ — Pièces jointes du projet
      // ════════════════════════════════════════════════════════════════════
      const { data: attachments } = await supabase.from('property_attachments').select('*')
        .eq('property_id', property.id).order('uploaded_at', { ascending: false })

      if (attachments && attachments.length > 0) {
        const catLabels: Record<string,string> = {
          photo:'Photo', document:'Document', plan:'Plan',
          contract:'Contrat', invoice:'Facture', general:'General',
        }
        const attSignedUrls: Record<string,string> = {}
        await Promise.all(attachments.map(async (att: any) => {
          const { data } = await supabase.storage.from('property-attachments')
            .createSignedUrl(att.storage_path, 60 * 60 * 24 * 365)
          if (data?.signedUrl) attSignedUrls[att.id] = data.signedUrl
        }))

        doc.addPage(); y = 20
        y = sectionTitle(`Pieces jointes du projet (${attachments.length})`, y, C.purple)

        autoTable(doc, {
          startY: y,
          head: [['Fichier', 'Categorie', 'Description', 'Lien']],
          body: attachments.map((att: any) => [
            att.file_name,
            catLabels[att.attachment_category] || att.attachment_category,
            att.description || '-',
            attSignedUrls[att.id] ? 'Ouvrir' : '-',
          ]),
          theme: 'grid',
          headStyles: { fillColor: C.dark, textColor: C.white, fontStyle: 'bold', fontSize: 8 },
          bodyStyles: { fontSize: 8, cellPadding: 2.5 },
          alternateRowStyles: { fillColor: C.grayL },
          columnStyles: {
            0: { cellWidth: 60 }, 1: { cellWidth: 24 }, 2: { cellWidth: 72 }, 3: { cellWidth: 19 },
          },
          didParseCell: (data: any) => {
            if (data.section === 'body' && data.column.index === 3) {
              const att = attachments[data.row.index]
              if (att && attSignedUrls[att.id]) data.cell.styles.textColor = [0,102,204]
            }
          },
          didDrawCell: (data: any) => {
            if (data.section === 'body' && data.column.index === 3) {
              const att = attachments[data.row.index]
              const url = att && attSignedUrls[att.id]
              if (url) {
                doc.link(data.cell.x, data.cell.y, data.cell.width, data.cell.height, { url })
                doc.setDrawColor(0,102,204); doc.setLineWidth(0.15)
                doc.line(data.cell.x+1, data.cell.y+data.cell.height-1.5, data.cell.x+data.cell.width-1, data.cell.y+data.cell.height-1.5)
              }
            }
          },
        })
        y = (doc as any).lastAutoTable.finalY + 10

        for (const att of attachments) {
          const ext = att.file_name.split('.').pop()?.toLowerCase() || ''
          if (!['jpg','jpeg','png','webp'].includes(ext) || !attSignedUrls[att.id]) continue
          try {
            const imgB64 = await loadBase64(attSignedUrls[att.id])
            if (!imgB64) continue
            doc.addPage()
            box(0, 0, W, 18, C.dark)
            doc.setFontSize(10); doc.setTextColor(...C.white); doc.setFont('helvetica', 'bold')
            doc.text(att.file_name, 15, 10)
            doc.setFontSize(7.5); doc.setTextColor(...C.gray); doc.setFont('helvetica', 'normal')
            doc.text(`${catLabels[att.attachment_category] || att.attachment_category}${att.description ? ' — ' + att.description : ''}`, 15, 16)
            const img = new Image(); img.src = imgB64
            await new Promise<void>(r => { img.onload = () => r() })
            const maxW = 180; const maxH = 238
            const ratio = img.width > 0 ? img.height / img.width : 1
            const pdfH = Math.min(maxW * ratio, maxH)
            const fmt = ext === 'jpg' || ext === 'jpeg' ? 'JPEG' : 'PNG'
            doc.addImage(imgB64, fmt, 15, 22, maxW, pdfH)
          } catch {}
        }
      }

      // ── Pied de page sur toutes les pages ────────────────────────────────
      const pageCount = doc.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        addFooter(i, pageCount, `Fiche de Projet — ${property.name}`)
      }

      const safeName = property.name.replace(/[^a-zA-Z0-9]/g, '_')
      doc.save(`fiche_projet_${safeName}_${new Date().toISOString().split('T')[0]}.pdf`)
    } catch (err: any) {
      alert('Erreur lors de la generation du PDF: ' + err.message)
    } finally {
      setExportingProjectId(null)
    }
  }

  return (
    <div className="space-y-6 mt-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{t('projects.title')}</h2>
          <p className="text-sm sm:text-base text-gray-600 mt-1">{t('projects.convertedFromScenarios')}</p>
        </div>
      </div>

      {/* Edit Form (modification uniquement) */}
      {showAddForm && editingId && (
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md border border-gray-200">
          <h3 className="text-base sm:text-lg font-semibold mb-4">
            Modifier la propriété
          </h3>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom de la propriété *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                  placeholder="Ex: Oasis Bay A301"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Localisation *
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                  placeholder="Ex: Punta Cana, République Dominicaine"
                  required
                />
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
                  <option value="reservation">Réservation</option>
                  <option value="en_construction">En construction</option>
                  <option value="complete">Complété</option>
                  <option value="livré">Livré</option>
                  <option value="actif">Actif</option>
                  <option value="vendu">Vendu</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date de réservation *
                </label>
                <input
                  type="date"
                  value={formData.reservation_date}
                  onChange={(e) => setFormData({ ...formData, reservation_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date de livraison
                </label>
                <input
                  type="date"
                  value={formData.completion_date}
                  onChange={(e) => setFormData({ ...formData, completion_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">Date prévue ou réelle de livraison du projet</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Devise *
                </label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent bg-white"
                  required
                >
                  <option value="USD">USD ($)</option>
                  <option value="CAD">CAD ($)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Coût total *
                </label>
                <input
                  type="number"
                  value={formData.total_cost}
                  onChange={(e) => setFormData({ ...formData, total_cost: parseFloat(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                  placeholder="Ex: 150000"
                  min="0"
                  step="0.01"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Montant payé (calculé automatiquement)
                </label>
                <input
                  type="number"
                  value={formData.paid_amount}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 cursor-not-allowed"
                  placeholder="Calculé depuis les transactions"
                  disabled
                  readOnly
                />
                <p className="text-xs text-gray-500 mt-1">
                  💡 Montant calculé automatiquement depuis les transactions liées à ce projet
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ROI attendu (%) *
                </label>
                <input
                  type="number"
                  value={formData.expected_roi}
                  onChange={(e) => setFormData({ ...formData, expected_roi: parseFloat(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                  placeholder="Ex: 10.2"
                  min="0"
                  step="0.1"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Jours propriétaire / an
                </label>
                <input
                  type="number"
                  value={formData.owner_occupation_days}
                  onChange={(e) => setFormData({ ...formData, owner_occupation_days: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                  placeholder="Ex: 60"
                  min="0"
                  max="365"
                  step="1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Jours d'utilisation personnelle autorisés par contrat — divisés selon les parts des investisseurs
                </p>
              </div>
            </div>

            {/* Section Vente (si statut = vendu) */}
            {formData.status === 'vendu' && (
              <div className="border-t border-gray-200 pt-6">
                <h4 className="text-sm font-semibold text-gray-900 mb-4">💸 Informations de Vente</h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date de vente
                    </label>
                    <input
                      type="date"
                      value={formData.sale_date}
                      onChange={(e) => setFormData({ ...formData, sale_date: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Prix de vente
                    </label>
                    <input
                      type="number"
                      value={formData.sale_price}
                      onChange={(e) => setFormData({ ...formData, sale_price: parseFloat(e.target.value) })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                      placeholder="Ex: 300000"
                      min="0"
                      step="0.01"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Devise de vente
                    </label>
                    <select
                      value={formData.sale_currency}
                      onChange={(e) => setFormData({ ...formData, sale_currency: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent bg-white"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="CAD">CAD ($)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nom de l'acheteur (optionnel)
                    </label>
                    <input
                      type="text"
                      value={formData.buyer_name}
                      onChange={(e) => setFormData({ ...formData, buyer_name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                      placeholder="Ex: Jean Dupont"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notes sur la vente (optionnel)
                    </label>
                    <textarea
                      value={formData.sale_notes}
                      onChange={(e) => setFormData({ ...formData, sale_notes: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                      placeholder="Ex: Vendu via agent immobilier ABC, commission 5%"
                      rows={2}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Payment Schedule Section */}
            <div className="border-t border-gray-200 pt-6">
              <h4 className="text-sm sm:text-base font-semibold text-gray-900 mb-4">Configuration des Paiements</h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Acompte de réservation ({formData.currency})
                  </label>
                  <input
                    type="number"
                    value={formData.reservation_deposit}
                    onChange={(e) => setFormData({ ...formData, reservation_deposit: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                    placeholder="Ex: 10000"
                    min="0"
                    step="0.01"
                  />
                  <p className="text-xs text-gray-500 mt-1">Ce montant se déduit du total</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Acompte payé en CAD
                  </label>
                  <input
                    type="number"
                    value={formData.reservation_deposit_cad}
                    onChange={(e) => setFormData({ ...formData, reservation_deposit_cad: parseFloat(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                    placeholder="Ex: 13500"
                    min="0"
                    step="0.01"
                  />
                  <p className="text-xs text-gray-500 mt-1">Montant réel en économie canadienne</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type de calendrier de paiement
                  </label>
                  <select
                    value={formData.payment_schedule_type}
                    onChange={(e) => setFormData({ ...formData, payment_schedule_type: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent bg-white"
                  >
                    <option value="one_time">Paiement unique</option>
                    <option value="fixed_terms">Termes fixes (personnalisés)</option>
                    <option value="monthly_degressive">Mensuel dégressif</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date de début des paiements
                  </label>
                  <input
                    type="date"
                    value={formData.payment_start_date}
                    onChange={(e) => setFormData({ ...formData, payment_start_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#5e5e5e] focus:border-transparent"
                  />
                </div>
              </div>

              {/* Fixed Terms Configuration */}
              {formData.payment_schedule_type === 'fixed_terms' && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="text-sm font-semibold text-gray-900">Termes de paiement</h5>
                    <button
                      type="button"
                      onClick={addPaymentTerm}
                      className="text-sm text-[#5e5e5e] hover:text-[#3e3e3e] font-medium"
                    >
                      + Ajouter un terme
                    </button>
                  </div>

                  {/* En-têtes des colonnes */}
                  <div className="grid grid-cols-[1fr_90px_100px_120px_140px_40px] gap-2 mb-2 px-1">
                    <div className="text-xs font-semibold text-gray-600">Label</div>
                    <div className="text-xs font-semibold text-gray-600">Type</div>
                    <div className="text-xs font-semibold text-gray-600">Valeur</div>
                    <div className="text-xs font-semibold text-gray-600">Montant ({formData.currency})</div>
                    <div className="text-xs font-semibold text-gray-600">Date échéance</div>
                    <div></div>
                  </div>

                  <div className="space-y-2">
                    {paymentTerms.map((term, index) => {
                      // Calculer le montant selon le type
                      const amountAfterDeposit = (formData.total_cost || 0) - (formData.reservation_deposit || 0)
                      const calculatedAmount = term.amount_type === 'percentage'
                        ? amountAfterDeposit * (term.percentage / 100)
                        : term.fixed_amount

                      return (
                        <div key={index} className="grid grid-cols-[1fr_90px_100px_120px_140px_40px] gap-2 items-center">
                          <input
                            type="text"
                            value={term.label}
                            onChange={(e) => updatePaymentTerm(index, 'label', e.target.value)}
                            placeholder="Ex: Réservation"
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          />
                          <select
                            value={term.amount_type}
                            onChange={(e) => updatePaymentTerm(index, 'amount_type', e.target.value as 'percentage' | 'fixed_amount')}
                            className="px-2 py-2 border border-gray-300 rounded-lg text-sm"
                          >
                            <option value="percentage">%</option>
                            <option value="fixed_amount">$</option>
                          </select>
                          {term.amount_type === 'percentage' ? (
                            <input
                              type="number"
                              value={term.percentage}
                              onChange={(e) => updatePaymentTerm(index, 'percentage', parseFloat(e.target.value) || 0)}
                              placeholder="%"
                              className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm text-center"
                              min="0"
                              max="100"
                              step="0.1"
                            />
                          ) : (
                            <input
                              type="number"
                              value={term.fixed_amount}
                              onChange={(e) => updatePaymentTerm(index, 'fixed_amount', parseFloat(e.target.value) || 0)}
                              placeholder="Montant"
                              className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm text-right"
                              min="0"
                              step="100"
                            />
                          )}
                          <div className="px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-sm text-right font-medium text-gray-700">
                            {calculatedAmount.toLocaleString('fr-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </div>
                          <input
                            type="date"
                            value={term.due_date}
                            onChange={(e) => updatePaymentTerm(index, 'due_date', e.target.value)}
                            className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => removePaymentTerm(index)}
                            className="text-red-600 hover:text-red-800 p-1"
                            title="Supprimer"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )
                    })}
                  </div>

                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-600">Total pourcentages:</span>
                        <span className={`ml-2 font-bold ${paymentTerms.filter(t => t.amount_type === 'percentage').reduce((sum, term) => sum + term.percentage, 0) === 100 || paymentTerms.every(t => t.amount_type === 'fixed_amount') ? 'text-green-600' : 'text-orange-600'}`}>
                          {paymentTerms.filter(t => t.amount_type === 'percentage').reduce((sum, term) => sum + term.percentage, 0).toFixed(1)}%
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Total montant:</span>
                        <span className="ml-2 font-bold text-blue-600">
                          {paymentTerms.reduce((sum, term) => {
                            const amountAfterDeposit = (formData.total_cost || 0) - (formData.reservation_deposit || 0)
                            return sum + (term.amount_type === 'percentage'
                              ? amountAfterDeposit * (term.percentage / 100)
                              : term.fixed_amount)
                          }, 0).toLocaleString('fr-CA', { style: 'currency', currency: formData.currency })}
                        </span>
                      </div>
                    </div>
                    {paymentTerms.some(t => t.amount_type === 'percentage') &&
                     paymentTerms.filter(t => t.amount_type === 'percentage').reduce((sum, term) => sum + term.percentage, 0) !== 100 && (
                      <p className="text-xs text-orange-600 mt-2">⚠️ Les termes en % totalisent {paymentTerms.filter(t => t.amount_type === 'percentage').reduce((sum, term) => sum + term.percentage, 0).toFixed(1)}% (devrait être 100%)</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto bg-[#5e5e5e] hover:bg-[#3e3e3e] text-white px-6 py-2 rounded-full transition-colors disabled:opacity-50"
              >
                {loading ? 'Enregistrement...' : editingId ? 'Modifier' : 'Ajouter'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="w-full sm:w-auto bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-2 rounded-full transition-colors"
              >
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Properties List */}
      {properties.length === 0 ? (
        <div className="bg-white p-12 rounded-lg shadow-md text-center">
          <Building2 size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucun projet actif</h3>
          <p className="text-gray-600 mb-2">Les projets sont créés automatiquement depuis l'onglet <strong>Évaluateur</strong></p>
          <p className="text-sm text-gray-500">Créez un scénario → Analysez → Vote des investisseurs → Marquez comme acheté</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
          {properties.map((property) => {
            // Calculer les montants depuis les transactions (source unique de vérité)
            const totalPaidCAD = calculateTotalPaidCAD(property.id)
            const totalPaidUSD = calculateTotalPaidUSD(property.id)
            const totalPaidInPropertyCurrency = calculateTotalPaidInPropertyCurrency(property.id, property.currency || 'USD')

            // Calculer la progression basée sur les transactions
            const progress = property.total_cost > 0 ? (totalPaidInPropertyCurrency / property.total_cost) * 100 : 0
            const remaining = property.total_cost - totalPaidInPropertyCurrency

            const propertyPayments = getPropertyPayments(property.id)
            const pendingPayments = propertyPayments.filter(p => p.status === 'pending').length
            const overduePayments = propertyPayments.filter(p => p.status === 'overdue').length

            // Trouver le scénario d'origine pour ce projet
            const originScenario = scenarios.find(s => s.converted_property_id === property.id)
            const scenarioData = originScenario ? scenarioResults.filter(r => r.scenario_id === originScenario.id) : []
            const moderateScenario = scenarioData.find(r => r.scenario_type === 'moderate')

            return (
              <div key={property.id} className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
                {/* Header */}
                <div className="p-4 sm:p-6 border-b border-gray-100">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900 mb-1">{property.name}</h3>
                      <div className="flex items-center text-sm text-gray-600 gap-1">
                        <MapPin size={14} />
                        {property.location}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(property.status)}

                      {/* Menu hamburger */}
                      <div className="relative">
                        <button
                          onClick={() => setOpenMenuPropertyId(openMenuPropertyId === property.id ? null : property.id)}
                          className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                          title="Actions"
                        >
                          <Menu size={18} />
                        </button>

                        {openMenuPropertyId === property.id && (
                          <>
                            {/* Overlay pour fermer en cliquant ailleurs */}
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setOpenMenuPropertyId(null)}
                            />
                            <div className="absolute right-0 top-10 z-20 bg-white border border-gray-200 rounded-xl shadow-lg w-56 py-1 overflow-hidden">
                              <button
                                onClick={() => { handleEdit(property); setOpenMenuPropertyId(null) }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                              >
                                <Edit2 size={15} className="text-blue-500" />
                                Modifier le projet
                              </button>

                              <button
                                onClick={() => { exportProjectPDF(property); setOpenMenuPropertyId(null) }}
                                disabled={exportingProjectId === property.id}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <FileDown size={15} className="text-gray-500" />
                                {exportingProjectId === property.id ? 'Generation PDF...' : 'Exporter fiche PDF'}
                              </button>

                              <div className="border-t border-gray-100 my-1" />

                              <button
                                onClick={() => { setSelectedPropertyId(selectedPropertyId === property.id ? null : property.id); setOpenMenuPropertyId(null) }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                              >
                                <Calendar size={15} className="text-gray-500" />
                                Calendrier de paiements
                              </button>

                              <button
                                onClick={() => { setShowPaymentManagerPropertyId(showPaymentManagerPropertyId === property.id ? null : property.id); setOpenMenuPropertyId(null) }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                              >
                                <CreditCard size={15} className="text-gray-500" />
                                Gérer les paiements
                              </button>

                              <button
                                onClick={() => { setShowTransactionsPropertyId(showTransactionsPropertyId === property.id ? null : property.id); setOpenMenuPropertyId(null) }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                              >
                                <History size={15} className="text-gray-500" />
                                Historique transactions
                              </button>

                              <div className="border-t border-gray-100 my-1" />

                              <button
                                onClick={() => { setShowAttachmentsPropertyId(property.id); setOpenMenuPropertyId(null) }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition-colors"
                              >
                                <FileImage size={15} className="text-purple-500" />
                                Pièces jointes
                              </button>

                              <button
                                onClick={() => { setShowLinksPropertyId(property.id); setOpenMenuPropertyId(null) }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-sky-50 hover:text-sky-700 transition-colors"
                              >
                                <Link2 size={15} className="text-sky-500" />
                                Hyperliens
                              </button>

                              <button
                                onClick={() => { setShowPerformancePropertyId(showPerformancePropertyId === property.id ? null : property.id); setOpenMenuPropertyId(null) }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 transition-colors"
                              >
                                <BarChart2 size={15} className="text-green-500" />
                                Performance & ROI
                              </button>

                              <button
                                onClick={() => { setShowFinancialSummaryPropertyId(showFinancialSummaryPropertyId === property.id ? null : property.id); setOpenMenuPropertyId(null) }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                              >
                                <Wallet size={15} className="text-indigo-500" />
                                Bilan Financier
                              </button>

                              <div className="border-t border-gray-100 my-1" />

                              <button
                                onClick={() => { handleDelete(property.id, property.name); setOpenMenuPropertyId(null) }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                              >
                                <Trash2 size={15} className="text-red-500" />
                                Supprimer
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Calendar size={14} />
                      Réservé le {new Date(property.reservation_date).toLocaleDateString('fr-CA')}
                    </div>
                    <div className="font-semibold text-xs bg-gray-100 px-2 py-1 rounded">
                      {property.currency || 'USD'}
                    </div>
                  </div>
                </div>

                {/* Main Photo */}
                {property.main_photo_url && (
                  <div className="relative w-full h-48 sm:h-64 overflow-hidden bg-gray-100">
                    <img
                      src={property.main_photo_url}
                      alt={property.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Body */}
                <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                  {/* Progression */}
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600 font-medium">Progression</span>
                      <span className="font-bold text-gray-900">{progress.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-blue-600 h-3 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs mt-2 text-gray-600">
                      <span>
                        {totalPaidInPropertyCurrency.toLocaleString('fr-CA', { style: 'currency', currency: property.currency || 'USD', minimumFractionDigits: 0 })} payé
                      </span>
                      <span>
                        {remaining.toLocaleString('fr-CA', { style: 'currency', currency: property.currency || 'USD', minimumFractionDigits: 0 })} restant
                      </span>
                    </div>
                  </div>

                  {/* USD vs CAD Comparison */}
                  {property.currency === 'USD' && (totalPaidUSD > 0 || totalPaidCAD > 0) && (
                    <div className="grid grid-cols-2 gap-2">
                      {/* Montant USD contractuel */}
                      <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                        <div className="text-xs text-blue-700 font-medium mb-1">Contrat (USD)</div>
                        <div className="text-base font-bold text-blue-900">
                          {totalPaidUSD.toLocaleString('fr-CA', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })}
                        </div>
                        <div className="text-xs text-blue-600 mt-1">Montant attendu</div>
                      </div>

                      {/* Montant CAD réellement payé */}
                      <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                        <div className="text-xs text-green-700 font-medium mb-1">Payé (CAD)</div>
                        <div className="text-base font-bold text-green-900">
                          {totalPaidCAD.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
                        </div>
                        <div className="text-xs text-green-600 mt-1">
                          {totalPaidUSD > 0 && totalPaidCAD > 0
                            ? `Taux: ${(totalPaidCAD / totalPaidUSD).toFixed(4)}`
                            : 'Coût réel'
                          }
                        </div>
                      </div>
                    </div>
                  )}

                  {/* CAD Only Tracking (pour contrats en CAD) */}
                  {property.currency === 'CAD' && totalPaidCAD > 0 && (
                    <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                      <div className="text-xs text-green-700 font-medium mb-1">Total payé en CAD</div>
                      <div className="text-lg font-bold text-green-800">
                        {totalPaidCAD.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
                      </div>
                      <div className="text-xs text-green-600 mt-1">Coût total</div>
                    </div>
                  )}

                  {/* Scenario Information */}
                  {originScenario && moderateScenario && (
                    <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Calculator size={14} className="text-purple-700" />
                        <div className="text-xs font-bold text-purple-900">{t('projectScenario.title')}</div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <div className="text-xs text-purple-700">{t('scenarioResults.avgAnnualReturn')}</div>
                          <div className="text-sm font-bold text-purple-900">
                            {moderateScenario.summary.avg_annual_return?.toFixed(2)}%
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-purple-700">{t('scenarioResults.totalReturn')}</div>
                          <div className="text-sm font-bold text-purple-900">
                            {moderateScenario.summary.total_return?.toFixed(1)}%
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-purple-700">{t('scenarioResults.breakEven')}</div>
                          <div className="text-sm font-bold text-purple-900">
                            {t('scenarioResults.year')} {moderateScenario.summary.break_even_year}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-purple-700">{t('scenarioResults.recommendation')}</div>
                          <div className={`text-xs font-bold ${
                            moderateScenario.summary.recommendation === 'recommended' ? 'text-green-700' :
                            moderateScenario.summary.recommendation === 'not_recommended' ? 'text-red-700' : 'text-yellow-700'
                          }`}>
                            {moderateScenario.summary.recommendation === 'recommended' ? '✅ ' + t('scenarioResults.recommended') :
                             moderateScenario.summary.recommendation === 'not_recommended' ? '⚠️ ' + t('scenarioResults.notRecommended') : '📊 ' + t('scenarioResults.toConsider')}
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-purple-600 mt-2">
                        {t('projectScenario.createdOn')} {new Date(originScenario.created_at).toLocaleDateString(language === 'fr' ? 'fr-CA' : 'en-CA')}
                      </div>
                    </div>
                  )}

                  {/* Budget Comparison: Planned vs Actual */}
                  {originScenario && (
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                      <div className="flex items-center gap-2 mb-3">
                        <Calculator size={14} className="text-blue-700" />
                        <div className="text-xs font-bold text-blue-900">Bilan budgétaire: Prévu vs Réel</div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        {/* Planned cost from scenario */}
                        <div className="bg-white p-2 rounded border border-blue-200">
                          <div className="text-xs text-gray-600 mb-1">Prix prévu (scénario)</div>
                          <div className="text-base font-bold text-gray-900">
                            {property.total_cost.toLocaleString('fr-CA', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">Selon scénario d'origine</div>
                        </div>

                        {/* Actual cost from transactions */}
                        <div className="bg-white p-2 rounded border border-blue-200">
                          <div className="text-xs text-gray-600 mb-1">Prix réel payé</div>
                          <div className="text-base font-bold text-gray-900">
                            {totalPaidUSD.toLocaleString('fr-CA', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {((totalPaidUSD / property.total_cost) * 100).toFixed(1)}% du budget prévu
                          </div>
                        </div>
                      </div>

                      {/* Variance */}
                      {totalPaidUSD > 0 && (
                        <div className={`mt-2 p-2 rounded text-xs ${
                          totalPaidUSD <= property.total_cost
                            ? 'bg-green-100 text-green-800 border border-green-300'
                            : 'bg-red-100 text-red-800 border border-red-300'
                        }`}>
                          <span className="font-medium">Écart: </span>
                          {totalPaidUSD <= property.total_cost ? (
                            <>
                              Économie de {(property.total_cost - totalPaidUSD).toLocaleString('fr-CA', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })}
                              ({(((property.total_cost - totalPaidUSD) / property.total_cost) * 100).toFixed(1)}%)
                            </>
                          ) : (
                            <>
                              Dépassement de {(totalPaidUSD - property.total_cost).toLocaleString('fr-CA', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })}
                              ({(((totalPaidUSD - property.total_cost) / property.total_cost) * 100).toFixed(1)}%)
                            </>
                          )}
                        </div>
                      )}

                      {/* Payment Timeline Graph: Planned vs Actual */}
                      {propertyPayments.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-blue-200">
                          <div className="text-xs font-medium text-blue-900 mb-2">Échéancier: Prévu vs Réel</div>
                          <div className="space-y-2">
                            {propertyPayments.map((payment) => {
                              // Get actual paid amount for this payment
                              const paymentTransactions = transactions.filter(tx => tx.payment_schedule_id === payment.id)
                              const actualPaidUSD = paymentTransactions
                                .filter(tx => tx.source_currency === 'USD' && tx.source_amount)
                                .reduce((sum, tx) => sum + (tx.source_amount || 0), 0)

                              const plannedAmount = payment.amount
                              const actualAmount = actualPaidUSD
                              const maxAmount = Math.max(plannedAmount, actualAmount)

                              return (
                                <div key={payment.id} className="space-y-1">
                                  <div className="text-xs text-gray-700 font-medium">{payment.term_label}</div>

                                  {/* Planned bar */}
                                  <div className="flex items-center gap-2">
                                    <div className="w-16 text-xs text-gray-600">Prévu</div>
                                    <div className="flex-1 bg-gray-200 rounded-full h-4 relative overflow-hidden">
                                      <div
                                        className="bg-blue-500 h-full rounded-full flex items-center justify-end pr-1"
                                        style={{ width: `${maxAmount > 0 ? (plannedAmount / maxAmount) * 100 : 0}%` }}
                                      >
                                        <span className="text-xs text-white font-medium">
                                          {plannedAmount.toLocaleString('fr-CA', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Actual bar */}
                                  <div className="flex items-center gap-2">
                                    <div className="w-16 text-xs text-gray-600">Réel</div>
                                    <div className="flex-1 bg-gray-200 rounded-full h-4 relative overflow-hidden">
                                      {actualAmount > 0 ? (
                                        <div
                                          className={`h-full rounded-full flex items-center justify-end pr-1 ${
                                            actualAmount <= plannedAmount ? 'bg-green-500' : 'bg-red-500'
                                          }`}
                                          style={{ width: `${maxAmount > 0 ? (actualAmount / maxAmount) * 100 : 0}%` }}
                                        >
                                          <span className="text-xs text-white font-medium">
                                            {actualAmount.toLocaleString('fr-CA', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })}
                                          </span>
                                        </div>
                                      ) : (
                                        <div className="text-xs text-gray-400 pl-2 flex items-center h-full">Non payé</div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>

                          {/* Legend */}
                          <div className="mt-3 flex gap-4 text-xs">
                            <div className="flex items-center gap-1">
                              <div className="w-3 h-3 bg-blue-500 rounded"></div>
                              <span className="text-gray-600">Prévu</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <div className="w-3 h-3 bg-green-500 rounded"></div>
                              <span className="text-gray-600">Réel (conforme)</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <div className="w-3 h-3 bg-red-500 rounded"></div>
                              <span className="text-gray-600">Réel (dépassement)</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Payment Alerts */}
                  {(pendingPayments > 0 || overduePayments > 0) && (
                    <div className="flex gap-2">
                      {pendingPayments > 0 && (
                        <div className="flex-1 bg-blue-50 p-2 rounded-lg border border-blue-200">
                          <div className="flex items-center gap-1 text-xs text-blue-700">
                            <Clock size={12} />
                            {pendingPayments} en attente
                          </div>
                        </div>
                      )}
                      {overduePayments > 0 && (
                        <div className="flex-1 bg-red-50 p-2 rounded-lg border border-red-200">
                          <div className="flex items-center gap-1 text-xs text-red-700">
                            <AlertCircle size={12} />
                            {overduePayments} en retard
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Payment Schedule */}
                  {propertyPayments.length > 0 && (
                    <div>
                      {selectedPropertyId === property.id && (
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                            <Calendar size={14} /> Calendrier de paiements ({propertyPayments.length})
                          </span>
                          <button onClick={() => setSelectedPropertyId(null)} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
                        </div>
                      )}

                      {selectedPropertyId === property.id && (
                        <div className="space-y-2 mt-2">
                          {/* Exchange Rate Display */}
                          <div className="bg-blue-50 p-2 rounded-lg border border-blue-200 flex items-center justify-between">
                            <div className="text-xs font-medium text-blue-900">
                              Taux USD→CAD: <span className="font-bold">{exchangeRate.toFixed(4)}</span>
                            </div>
                            <button
                              onClick={loadExchangeRate}
                              disabled={loadingRate}
                              className="text-blue-600 hover:text-blue-800 p-1 rounded"
                              title="Rafraîchir"
                            >
                              <RefreshCw size={12} className={loadingRate ? 'animate-spin' : ''} />
                            </button>
                          </div>

                          {propertyPayments.map(payment => {
                            // Chercher les transactions réelles liées à ce paiement
                            const paymentTransactions = transactions.filter(tx => tx.payment_schedule_id === payment.id)

                            // Calculer montant USD réel payé (depuis transactions)
                            const actualPaidUSD = paymentTransactions
                              .filter(tx => tx.source_currency === 'USD' && tx.source_amount)
                              .reduce((sum, tx) => sum + (tx.source_amount || 0), 0)

                            // Calculer montant CAD réel payé (depuis transactions)
                            const actualPaidCAD = paymentTransactions
                              .reduce((sum, tx) => sum + tx.amount, 0)

                            // Calculer taux de change effectif
                            const effectiveRate = actualPaidUSD > 0 ? actualPaidCAD / actualPaidUSD : null

                            // Montant CAD à afficher
                            const amountCAD = payment.status === 'paid' && actualPaidCAD > 0
                              ? actualPaidCAD
                              : payment.currency === 'USD' ? payment.amount * exchangeRate : payment.amount

                            // Obtenir le flag de statut
                            const statusFlag = getPaymentStatusFlag(payment.due_date, payment.status)

                            return (
                              <div key={payment.id} className={`p-3 rounded-lg border ${statusFlag.bgClass}`}>
                                {/* Header with status flag and label */}
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-2xl">{statusFlag.emoji}</span>
                                    <div>
                                      <span className="text-sm font-medium text-gray-900">
                                        {payment.term_label}
                                      </span>
                                      <div className={`text-xs font-medium ${statusFlag.textClass}`}>
                                        {statusFlag.label}
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Affichage USD vs CAD en deux lignes claires */}
                                {payment.currency === 'USD' ? (
                                  <div className="space-y-2 mb-2">
                                    {/* Ligne 1: Montant USD attendu (contrat) */}
                                    <div className="bg-blue-50 p-2 rounded border border-blue-200">
                                      <div className="flex items-center justify-between">
                                        <div className="text-xs text-blue-700 font-medium">Terme attendu (USD)</div>
                                        <div className="text-base font-bold text-blue-900">
                                          {payment.amount.toLocaleString('fr-CA', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })}
                                        </div>
                                      </div>
                                      <div className="text-xs text-blue-600 mt-1">Montant selon le contrat</div>
                                    </div>

                                    {/* Ligne 2: Montant CAD réellement payé */}
                                    <div className={`p-2 rounded border ${actualPaidCAD > 0 ? 'bg-green-50 border-green-300' : 'bg-gray-50 border-gray-300'}`}>
                                      <div className="flex items-center justify-between">
                                        <div className={`text-xs font-medium ${actualPaidCAD > 0 ? 'text-green-700' : 'text-gray-700'}`}>
                                          {actualPaidCAD > 0 ? 'Payé à la banque (CAD)' : 'À payer (CAD estimé)'}
                                        </div>
                                        <div className={`text-base font-bold ${actualPaidCAD > 0 ? 'text-green-900' : 'text-gray-900'}`}>
                                          {amountCAD.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
                                        </div>
                                      </div>
                                      <div className={`text-xs mt-1 flex items-center justify-between ${actualPaidCAD > 0 ? 'text-green-600' : 'text-gray-600'}`}>
                                        {effectiveRate ? (
                                          <>
                                            <span>Taux effectif: {effectiveRate.toFixed(4)}</span>
                                            {actualPaidUSD > 0 && (
                                              <span className="font-medium">{actualPaidUSD.toLocaleString('fr-CA', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })} USD payé</span>
                                            )}
                                          </>
                                        ) : (
                                          <span>Taux actuel: {exchangeRate.toFixed(4)}</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  // Pour les contrats en CAD, affichage simple
                                  <div className="bg-gray-50 p-2 rounded border border-gray-200 mb-2">
                                    <div className="flex items-center justify-between">
                                      <div className="text-xs text-gray-700 font-medium">Montant (CAD)</div>
                                      <div className="text-base font-bold text-gray-900">
                                        {payment.amount.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Date info */}
                                <div className="flex items-center justify-between text-xs text-gray-600">
                                  <span>Échéance: {new Date(payment.due_date).toLocaleDateString('fr-CA')}</span>
                                  {payment.status === 'paid' && payment.paid_date && (
                                    <span className="text-green-600 font-medium">
                                      Payé le {new Date(payment.paid_date).toLocaleDateString('fr-CA')}
                                    </span>
                                  )}
                                </div>

                                {payment.status === 'pending' && (
                                  <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-900">
                                    <p className="mb-1">💡 Pour effectuer ce paiement :</p>
                                    <p className="text-blue-700">Allez dans <strong>Administration → Transactions</strong></p>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Gestionnaire de paiements programmés */}
                  {showPaymentManagerPropertyId === property.id && (
                    <div className="mt-2 border border-blue-200 rounded-lg p-3 bg-blue-50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-blue-800 flex items-center gap-1">
                          <CreditCard size={14} /> Gérer les paiements programmés
                        </span>
                        <button onClick={() => setShowPaymentManagerPropertyId(null)} className="text-blue-400 hover:text-blue-700"><X size={14} /></button>
                      </div>
                      <PaymentScheduleManager
                        propertyId={property.id}
                        propertyName={property.name}
                        propertyCurrency={property.currency || 'USD'}
                      />
                    </div>
                  )}

                  {/* Historique des transactions */}
                  {showTransactionsPropertyId === property.id && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                          <History size={14} /> Historique des transactions ({transactions.filter(tx => tx.property_id === property.id).length})
                        </span>
                        <button onClick={() => setShowTransactionsPropertyId(null)} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
                      </div>
                      <div className="space-y-2 mt-2">
                        {transactions.filter(tx => tx.property_id === property.id).length === 0 ? (
                          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-center">
                            <p className="text-sm text-gray-600">Aucune transaction pour ce projet</p>
                            <p className="text-xs text-gray-500 mt-1">Les transactions apparaîtront ici automatiquement</p>
                          </div>
                        ) : (
                          transactions
                            .filter(tx => tx.property_id === property.id)
                            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                            .map(tx => (
                              <div key={tx.id} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex-1">
                                    <div className="text-sm font-medium text-gray-900">{tx.description}</div>
                                    <div className="text-xs text-gray-600 mt-1">
                                      {new Date(tx.date).toLocaleDateString('fr-CA')}
                                      {tx.reference_number && ` • Réf: ${tx.reference_number}`}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className={`text-sm font-bold ${tx.type === 'investissement' ? 'text-green-600' : 'text-red-600'}`}>
                                      {tx.type === 'investissement' ? '+' : '-'}{tx.amount.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 0 })}
                                    </div>
                                    {tx.source_currency === 'USD' && tx.source_amount && (
                                      <div className="text-xs text-gray-600 mt-1">
                                        {tx.source_amount.toLocaleString('fr-CA', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                  <span className={`px-2 py-1 rounded text-white ${
                                    tx.type === 'investissement' ? 'bg-green-600' :
                                    tx.type === 'retrait' ? 'bg-red-600' :
                                    'bg-blue-600'
                                  }`}>
                                    {tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}
                                  </span>
                                  <span className="px-2 py-1 bg-gray-200 text-gray-700 rounded">
                                    {tx.payment_method}
                                  </span>
                                  {tx.source_currency === 'USD' && tx.exchange_rate && (
                                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
                                      Taux: {tx.exchange_rate.toFixed(4)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))
                        )}
                      </div>
                    </div>
                  )}

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                    <div>
                      <div className="flex items-center gap-1 text-gray-600 text-xs mb-1">
                        <DollarSign size={12} />
                        Coût total
                      </div>
                      <div className="font-bold text-gray-900">
                        {property.total_cost.toLocaleString('fr-CA', { style: 'currency', currency: property.currency || 'USD', minimumFractionDigits: 0 })}
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-1 text-gray-600 text-xs mb-1">
                        <TrendingUp size={12} />
                        ROI attendu
                      </div>
                      <div className="font-bold text-green-600">
                        {property.expected_roi}%
                      </div>
                    </div>
                  </div>
                </div>

                {/* Complete Scenario Data Section (Collapsible) */}
                {originScenario && (
                  <div className="px-4 sm:px-6 py-3 border-t border-gray-100">
                    <button
                      onClick={() => setShowScenarioDataPropertyId(showScenarioDataPropertyId === property.id ? null : property.id)}
                      className="w-full text-left flex items-center justify-between text-sm font-medium text-gray-700 hover:text-gray-900"
                    >
                      <span className="flex items-center gap-2">
                        <Calculator size={16} />
                        Données complètes du scénario d'origine
                      </span>
                      <span className="text-gray-400">{showScenarioDataPropertyId === property.id ? '▼' : '▶'}</span>
                    </button>

                    {showScenarioDataPropertyId === property.id && (
                      <div className="mt-3 space-y-3 min-w-0">
                        {/* Promoter Data */}
                        {originScenario.promoter_data && Object.keys(originScenario.promoter_data).length > 0 && (
                          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                            <h4 className="text-xs font-bold text-gray-900 mb-2">📊 Données du promoteur</h4>
                            <div className="grid grid-cols-2 gap-2 min-w-0">
                              {originScenario.promoter_data.monthly_rent && (
                                <div className="bg-white p-2 rounded border border-gray-200 min-w-0">
                                  <div className="text-xs text-gray-500">Loyer mensuel</div>
                                  <div className="text-xs font-bold text-gray-900 truncate">
                                    {originScenario.promoter_data.monthly_rent.toLocaleString('fr-CA', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })}
                                  </div>
                                </div>
                              )}
                              {originScenario.promoter_data.annual_appreciation && (
                                <div className="bg-white p-2 rounded border border-gray-200 min-w-0">
                                  <div className="text-xs text-gray-500">Appréciation /an</div>
                                  <div className="text-xs font-bold text-gray-900">
                                    {originScenario.promoter_data.annual_appreciation}%
                                  </div>
                                </div>
                              )}
                              {originScenario.promoter_data.occupancy_rate && (
                                <div className="bg-white p-2 rounded border border-gray-200 min-w-0">
                                  <div className="text-xs text-gray-500">Taux occupation</div>
                                  <div className="text-xs font-bold text-gray-900">
                                    {originScenario.promoter_data.occupancy_rate}%
                                  </div>
                                </div>
                              )}
                              {originScenario.promoter_data.management_fees && (
                                <div className="bg-white p-2 rounded border border-gray-200 min-w-0">
                                  <div className="text-xs text-gray-500">Frais gestion</div>
                                  <div className="text-xs font-bold text-gray-900">
                                    {originScenario.promoter_data.management_fees}%
                                  </div>
                                </div>
                              )}
                              {originScenario.promoter_data.project_duration && (
                                <div className="bg-white p-2 rounded border border-gray-200 min-w-0">
                                  <div className="text-xs text-gray-500">Durée projet</div>
                                  <div className="text-xs font-bold text-gray-900">
                                    {originScenario.promoter_data.project_duration} ans
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Three Scenarios */}
                        {scenarioData && scenarioData.length > 0 && (
                          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                            <h4 className="text-xs font-bold text-gray-900 mb-2">📈 Scénarios de projection</h4>
                            <div className="space-y-2">
                              {['conservative', 'moderate', 'optimistic'].map(type => {
                                const scenario = scenarioData.find(s => s.scenario_type === type)
                                if (!scenario) return null

                                const typeLabels: {[key: string]: {label: string, color: string, bg: string}} = {
                                  conservative: { label: '🔵 Conservateur', color: 'text-blue-700', bg: 'bg-blue-50 border-blue-300' },
                                  moderate: { label: '🟢 Modéré', color: 'text-green-700', bg: 'bg-green-50 border-green-300' },
                                  optimistic: { label: '🟡 Optimiste', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-300' }
                                }

                                return (
                                  <div key={type} className={`p-2 rounded-lg border ${typeLabels[type].bg}`}>
                                    <div className={`text-xs font-bold ${typeLabels[type].color} mb-1.5`}>
                                      {typeLabels[type].label}
                                    </div>
                                    <div className="grid grid-cols-2 gap-1.5 min-w-0">
                                      <div className="bg-white p-1.5 rounded min-w-0">
                                        <div className="text-xs text-gray-500">ROI moyen</div>
                                        <div className="text-xs font-bold text-gray-900">
                                          {scenario.summary.avg_annual_return?.toFixed(1)}%
                                        </div>
                                      </div>
                                      <div className="bg-white p-1.5 rounded min-w-0">
                                        <div className="text-xs text-gray-500">Break-even</div>
                                        <div className="text-xs font-bold text-gray-900">
                                          An {scenario.summary.break_even_year || 'N/A'}
                                        </div>
                                      </div>
                                      <div className="bg-white p-1.5 rounded min-w-0">
                                        <div className="text-xs text-gray-500">Valeur finale</div>
                                        <div className="text-xs font-bold text-gray-900 truncate">
                                          {scenario.summary.final_property_value?.toLocaleString('fr-CA', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })}
                                        </div>
                                      </div>
                                      <div className="bg-white p-1.5 rounded min-w-0">
                                        <div className="text-xs text-gray-500">Revenu net</div>
                                        <div className="text-xs font-bold text-gray-900 truncate">
                                          {scenario.summary.total_net_income?.toLocaleString('fr-CA', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}

                        {/* Payment Terms */}
                        {originScenario.payment_terms && originScenario.payment_terms.length > 0 && (
                          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                            <h4 className="text-xs font-bold text-gray-900 mb-2">💰 Termes de paiement</h4>
                            <div className="space-y-1.5">
                              {originScenario.payment_terms.map((term: any, index: number) => (
                                <div key={index} className="bg-white p-2 rounded border border-gray-200 flex items-center justify-between gap-2 min-w-0">
                                  <div className="min-w-0 flex-1">
                                    <div className="text-xs font-medium text-gray-900 truncate">{term.label}</div>
                                    <div className="text-xs text-gray-500">
                                      {term.amount_type === 'percentage'
                                        ? `${term.percentage}% du prix`
                                        : term.fixed_amount?.toLocaleString('fr-CA', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })}
                                    </div>
                                  </div>
                                  <div className="text-right flex-shrink-0">
                                    <div className="text-xs font-bold text-gray-900">
                                      {term.amount_type === 'percentage'
                                        ? ((originScenario.purchase_price * term.percentage) / 100).toLocaleString('fr-CA', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })
                                        : term.fixed_amount?.toLocaleString('fr-CA', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {new Date(term.due_date).toLocaleDateString('fr-CA')}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Financing Data */}
                        {originScenario.payment_type === 'financed' && (
                          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                            <h4 className="text-xs font-bold text-gray-900 mb-2">🏦 Financement</h4>
                            <div className="grid grid-cols-2 gap-2 min-w-0">
                              <div className="bg-white p-2 rounded border border-gray-200 min-w-0">
                                <div className="text-xs text-gray-500">Type</div>
                                <div className="text-xs font-bold text-gray-900">Financé</div>
                              </div>
                              {originScenario.down_payment && (
                                <div className="bg-white p-2 rounded border border-gray-200 min-w-0">
                                  <div className="text-xs text-gray-500">Mise de fonds</div>
                                  <div className="text-xs font-bold text-gray-900">
                                    {originScenario.down_payment}%
                                  </div>
                                </div>
                              )}
                              {originScenario.interest_rate && (
                                <div className="bg-white p-2 rounded border border-gray-200 min-w-0">
                                  <div className="text-xs text-gray-500">Taux d'intérêt</div>
                                  <div className="text-xs font-bold text-gray-900">
                                    {originScenario.interest_rate}%
                                  </div>
                                </div>
                              )}
                              {originScenario.loan_duration && (
                                <div className="bg-white p-2 rounded border border-gray-200 min-w-0">
                                  <div className="text-xs text-gray-500">Durée du prêt</div>
                                  <div className="text-xs font-bold text-gray-900">
                                    {originScenario.loan_duration} ans
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

              </div>
            )
          })}
        </div>
      )}

      {/* Liens Modal */}
      {showLinksPropertyId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden">
            <div className="p-5 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Hyperliens</h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  {properties.find(p => p.id === showLinksPropertyId)?.name}
                </p>
              </div>
              <button onClick={() => setShowLinksPropertyId(null)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
              <PropertyLinksManager propertyId={showLinksPropertyId} isAdmin={isAdmin} />
            </div>
          </div>
        </div>
      )}

      {/* Project Attachments Modal */}
      {showAttachmentsPropertyId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-[95vw] sm:max-w-5xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Pièces jointes du projet</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {properties.find(p => p.id === showAttachmentsPropertyId)?.name}
                </p>
              </div>
              <button
                onClick={() => setShowAttachmentsPropertyId(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
              <ProjectAttachments
                propertyId={showAttachmentsPropertyId}
                onClose={() => setShowAttachmentsPropertyId(null)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Performance Analysis Modal */}
      {showPerformancePropertyId && (() => {
        const property = properties.find(p => p.id === showPerformancePropertyId)
        const originScenario = property?.origin_scenario_id
          ? scenarios.find(s => s.id === property.origin_scenario_id)
          : null
        const scenarioData = scenarioResults.filter(r => r.scenario_id === property?.origin_scenario_id)

        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-[95vw] sm:max-w-7xl w-full max-h-[90vh] overflow-hidden">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Performance & ROI</h3>
                  <p className="text-sm text-gray-600 mt-1">{property?.name}</p>
                </div>
                <button
                  onClick={() => setShowPerformancePropertyId(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
                {property && (
                  <PropertyPerformanceAnalysis
                    propertyId={property.id}
                    propertyName={property.name}
                    totalCost={property.total_cost}
                    currency={property.currency || 'USD'}
                    originScenario={originScenario}
                    scenarioResults={scenarioData}
                    transactions={transactions}
                  />
                )}
              </div>
            </div>
          </div>
        )
      })()}

      {/* Financial Summary Modal */}
      {showFinancialSummaryPropertyId && (() => {
        const property = properties.find(p => p.id === showFinancialSummaryPropertyId)
        if (!property) return null

        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-[95vw] sm:max-w-4xl w-full max-h-[90vh] overflow-hidden">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Bilan Financier</h3>
                  <p className="text-sm text-gray-600 mt-1">{property?.name}</p>
                </div>
                <button
                  onClick={() => setShowFinancialSummaryPropertyId(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
                {property && (
                  <PropertyFinancialSummary
                    propertyId={property.id}
                    propertyName={property.name}
                    totalCost={property.total_cost}
                    currency={property.currency || 'USD'}
                    status={property.status}
                    reservationDate={property.reservation_date}
                    completionDate={property.completion_date}
                    saleDate={property.sale_date}
                    salePrice={property.sale_price}
                    saleCurrency={property.sale_currency}
                    transactions={transactions}
                    onOpenPerformanceROI={() => {
                      setShowFinancialSummaryPropertyId(null)
                      setShowPerformancePropertyId(property.id)
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        )
      })()}

    </div>
  )
}
