'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useInvestment } from '@/contexts/InvestmentContext'
import { useOrganization } from '@/contexts/OrganizationContext'
import { useLanguage } from '@/contexts/LanguageContext'
import {
  Plus, Trash2, Download, Send, CheckCircle, Eye, ArrowLeft,
  Edit2, X, FileText, Users, Copy, ExternalLink, CreditCard,
  Phone, Mail, Settings, Search, ChevronDown, ChevronUp,
  Building2, Calendar, Hash, DollarSign, Save, AlertCircle,
  Clock, Ban, RotateCcw
} from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { computeCanadaTax, PROVINCE_OPTIONS, CANADA_TAX, type ProvinceCode } from '@/lib/canada-tax'

// Taux par défaut conservés pour rétrocompatibilité d'affichage (factures déjà
// enregistrées avant le multi-province). Le calcul vif utilise lib/canada-tax.
const TPS_RATE = 0.05
const TVQ_RATE = 0.09975

/** Déduit le libellé de la taxe provinciale d'une facture à partir du taux sauvegardé. */
function provincialLabelForRate(rate: number): string {
  const m = PROVINCE_OPTIONS.find(p => Math.abs(p.provincial - (rate || 0)) < 0.0001 && p.provincialLabel)
  return m?.provincialLabel ?? 'TVQ'
}

// ─── Types ───────────────────────────────────────────────────────────────────
interface InvoiceClient {
  id: string
  name: string
  company?: string
  email?: string
  phone?: string
  address?: string
  city?: string
  province?: string
  postal_code?: string
  country?: string
  notes?: string
  created_at: string
}

interface InvoiceItem {
  id?: string
  description: string
  quantity: number
  unit_price: number
  subtotal: number
  taxable: boolean
  sort_order: number
}

interface Invoice {
  id: string
  invoice_number: string
  client_id?: string
  client_snapshot?: InvoiceClient
  status: 'draft' | 'sent' | 'paid' | 'cancelled'
  issue_date: string
  due_date?: string
  subtotal: number
  tps_rate: number
  tvq_rate: number
  tps_amount: number
  tvq_amount: number
  total: number
  notes?: string
  payment_terms?: string
  transaction_id?: string
  paid_date?: string
  created_at: string
  items?: InvoiceItem[]
}

interface CompanySettings {
  name: string
  address: string
  city: string
  province: string
  postal_code: string
  phone: string
  email: string
  website: string
  tps_number: string
  tvq_number: string
  bank_name: string
  bank_institution: string
  bank_transit: string
  bank_account: string
  interac_email: string
}

const DEFAULT_COMPANY: CompanySettings = {
  name: 'Commerce CERDIA inc.',
  address: '',
  city: 'Québec',
  province: 'QC',
  postal_code: '',
  phone: '',
  email: '',
  website: '',
  tps_number: '',
  tvq_number: '',
  bank_name: '',
  bank_institution: '',
  bank_transit: '',
  bank_account: '',
  interac_email: '',
}

const EMPTY_ITEM: InvoiceItem = {
  description: '',
  quantity: 1,
  unit_price: 0,
  subtotal: 0,
  taxable: true,
  sort_order: 0,
}

const fmt = (n: number) =>
  n.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 2 })

// ─── Composant principal ──────────────────────────────────────────────────────
export default function InvoiceGenerator({ module = 'investor' }: { module?: 'investor' | 'commerce' } = {}) {
  const { addTransaction } = useInvestment()
  const { organization } = useOrganization()
  const { language } = useLanguage()
  const fr = language === 'fr'
  const orgId = organization?.id ?? null

  // Views
  const [view, setView] = useState<'list' | 'form' | 'preview' | 'settings' | 'clients'>('list')

  // Data
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [clients, setClients] = useState<InvoiceClient[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [generatingPDF, setGeneratingPDF] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Form state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selectedClientId, setSelectedClientId] = useState<string>('')
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0])
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().split('T')[0]
  })
  const [paymentTerms, setPaymentTerms] = useState('30 jours')
  const [notes, setNotes] = useState('')
  const [applyTPS, setApplyTPS] = useState(true)
  const [applyTVQ, setApplyTVQ] = useState(true)
  // Province de la facture (lieu de fourniture = province du client). Détermine
  // quelle taxe provinciale s'applique (TVQ/PST/RST/TVH).
  const [invoiceProvince, setInvoiceProvince] = useState<ProvinceCode>('QC')
  // Marque (logo) affichée sur la facture : CERDIA, C-Secur360, ou les deux.
  // En mode C-Secur360, une note référant à Commerce CERDIA est ajoutée au bas.
  const [invoiceBrand, setInvoiceBrand] = useState<'cerdia' | 'csecur360' | 'both'>('cerdia')
  const [items, setItems] = useState<InvoiceItem[]>([{ ...EMPTY_ITEM }])
  const [invoiceNumberPreview, setInvoiceNumberPreview] = useState('')

  // Client form
  const [showClientForm, setShowClientForm] = useState(false)
  const [editingClientId, setEditingClientId] = useState<string | null>(null)
  const [clientForm, setClientForm] = useState<Partial<InvoiceClient>>({
    province: 'QC', country: 'Canada'
  })
  const [clientSearch, setClientSearch] = useState('')

  // Company settings
  const [company, setCompany] = useState<CompanySettings>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('cerdia_invoice_company')
        if (saved) return { ...DEFAULT_COMPANY, ...JSON.parse(saved) }
      } catch {}
    }
    return DEFAULT_COMPANY
  })
  const [companyDraft, setCompanyDraft] = useState<CompanySettings>(company)

  // Filters
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null)

  // ─── Computed taxes (multi-province via lib/canada-tax) ──────────────────────
  // Mapping vers le schéma DB existant :
  //   tps_* = composante FÉDÉRALE (GST/TPS)
  //   tvq_* = composante PROVINCIALE (TVQ / PST / RST / TVH selon la province)
  const taxableSubtotal = items.reduce((s, i) => i.taxable ? s + i.subtotal : s, 0)
  const totalSubtotal = items.reduce((s, i) => s + i.subtotal, 0)
  const taxCalc = computeCanadaTax(taxableSubtotal, invoiceProvince, {
    applyGst: applyTPS,
    applyProvincial: applyTVQ,
  })
  const provinceInfo = CANADA_TAX[invoiceProvince]
  const tpsAmount = taxCalc.gstAmount
  const tvqAmount = taxCalc.provincialAmount
  const grandTotal = +(totalSubtotal + tpsAmount + tvqAmount).toFixed(2)

  // ─── Data loading ────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      let invQ = supabase.from('invoices').select('*').eq('module', module)
      if (orgId) invQ = invQ.eq('organization_id', orgId)

      let cliQ = supabase.from('invoice_clients').select('*').order('name')
      if (orgId) cliQ = cliQ.eq('organization_id', orgId)

      const [{ data: inv }, { data: cli }] = await Promise.all([
        invQ.order('created_at', { ascending: false }),
        cliQ,
      ])
      setInvoices(inv || [])
      setClients(cli || [])
    } catch (e) {
      setError(fr ? 'Impossible de charger les donnees de facturation.' : 'Failed to load billing data.')
    } finally {
      setLoading(false)
    }
  }, [orgId, module])

  useEffect(() => { loadData() }, [loadData])

  // Auto-dismiss messages
  useEffect(() => {
    if (success) { const t = setTimeout(() => setSuccess(null), 4000); return () => clearTimeout(t) }
  }, [success])
  useEffect(() => {
    if (error) { const t = setTimeout(() => setError(null), 6000); return () => clearTimeout(t) }
  }, [error])

  // ─── Numéro de facture auto ─────────────────────────────────────────────────
  const generateInvoiceNumber = useCallback(async () => {
    const year = new Date().getFullYear()
    const prefix = `C-CERDIA-${year}-`
    const yearInvoices = invoices.filter(i => i.invoice_number.startsWith(prefix))
    const maxNum = yearInvoices.reduce((max, i) => {
      const num = parseInt(i.invoice_number.replace(prefix, '')) || 0
      return Math.max(max, num)
    }, 0)
    return `${prefix}${String(maxNum + 1).padStart(3, '0')}`
  }, [invoices])

  // ─── Item helpers ────────────────────────────────────────────────────────────
  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    setItems(prev => {
      const next = [...prev]
      const item = { ...next[index], [field]: value }
      if (field === 'quantity' || field === 'unit_price') {
        item.subtotal = +((Number(item.quantity) || 0) * (Number(item.unit_price) || 0)).toFixed(2)
      }
      next[index] = item
      return next
    })
  }

  const addItem = () => setItems(prev => [...prev, { ...EMPTY_ITEM, sort_order: prev.length }])
  const removeItem = (i: number) => setItems(prev => prev.filter((_, idx) => idx !== i))

  // ─── Nouveau formulaire ──────────────────────────────────────────────────────
  const startNew = async () => {
    setEditingId(null)
    setSelectedClientId('')
    setInvoiceDate(new Date().toISOString().split('T')[0])
    const d = new Date(); d.setDate(d.getDate() + 30)
    setDueDate(d.toISOString().split('T')[0])
    setPaymentTerms('30 jours')
    setNotes('')
    setApplyTPS(true)
    setApplyTVQ(true)
    setInvoiceProvince('QC')
    setItems([{ ...EMPTY_ITEM }])
    const num = await generateInvoiceNumber()
    setInvoiceNumberPreview(num)
    setView('form')
  }

  // ─── Éditer une facture existante ─────────────────────────────────────────────
  const startEdit = async (inv: Invoice) => {
    if (inv.status !== 'draft') return
    setEditingId(inv.id)
    setSelectedClientId(inv.client_id || '')
    setInvoiceDate(inv.issue_date)
    setDueDate(inv.due_date || '')
    setPaymentTerms(inv.payment_terms || '30 jours')
    setNotes(inv.notes || '')
    setApplyTPS(inv.tps_amount > 0)
    setApplyTVQ(inv.tvq_amount > 0)
    // Restaure la province : d'abord depuis le snapshot client, sinon par
    // rapprochement du taux provincial sauvegardé avec la table de référence.
    const snapProv = (inv.client_snapshot as any)?.province as ProvinceCode | undefined
    if (snapProv && CANADA_TAX[snapProv]) {
      setInvoiceProvince(snapProv)
    } else {
      const match = PROVINCE_OPTIONS.find(p => Math.abs(p.provincial - (inv.tvq_rate || 0)) < 0.0001)
      setInvoiceProvince(match?.code ?? 'QC')
    }
    setInvoiceNumberPreview(inv.invoice_number)

    const { data: itemsData } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', inv.id)
      .order('sort_order')

    setItems(itemsData?.length ? itemsData : [{ ...EMPTY_ITEM }])
    setView('form')
  }

  // ─── Ouvrir Gmail Compose avec message pré-rempli ────────────────────────────
  const openGmailCompose = (inv: Invoice) => {
    const client = (inv.client_snapshot || {}) as any
    const clientEmail = client.email || ''
    const dateEmission = new Date(inv.issue_date).toLocaleDateString('fr-CA', { year: 'numeric', month: 'long', day: 'numeric' })
    const dateEcheance = inv.due_date
      ? new Date(inv.due_date).toLocaleDateString('fr-CA', { year: 'numeric', month: 'long', day: 'numeric' })
      : 'Sur réception'

    const subject = `Facture ${inv.invoice_number} — ${company.name}`
    const body = [
      `Bonjour ${client.name || ''},`,
      ``,
      `Veuillez trouver ci-joint la facture ${inv.invoice_number} pour un montant total de ${fmt(inv.total)}.`,
      ``,
      `Détails de la facture :`,
      `  • Numéro       : ${inv.invoice_number}`,
      `  • Date         : ${dateEmission}`,
      `  • Échéance     : ${dateEcheance}`,
      `  • Termes       : ${inv.payment_terms || '30 jours'}`,
      `  • Sous-total   : ${fmt(inv.subtotal)}`,
      ...(inv.tps_amount > 0 ? [`  • TPS (5%)     : ${fmt(inv.tps_amount)}`] : []),
      ...(inv.tvq_amount > 0 ? [`  • TVQ (9,975%) : ${fmt(inv.tvq_amount)}`] : []),
      `  • TOTAL        : ${fmt(inv.total)}`,
      ``,
      `Pour effectuer votre paiement, veuillez utiliser les coordonnées bancaires indiquées sur la facture.`,
      ``,
      `Pour toute question, n'hésitez pas à nous contacter.`,
      ``,
      `Cordialement,`,
      `${company.name}`,
      ...(company.email ? [company.email] : ['info@cerdia.ai']),
      ...(company.phone ? [company.phone] : []),
    ].join('\n')

    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&from=eric.dufort%40cerdia.ai&to=${encodeURIComponent(clientEmail)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    window.open(gmailUrl, '_blank')
  }

  // ─── Sauvegarder (draft ou send) ─────────────────────────────────────────────
  const saveInvoice = async (targetStatus: 'draft' | 'sent') => {
    if (!selectedClientId) { setError(fr ? 'Veuillez selectionner un client.' : 'Please select a client.'); return }
    if (items.every(i => !i.description)) { setError(fr ? 'Ajoutez au moins un item.' : 'Add at least one item.'); return }
    if (grandTotal <= 0) { setError(fr ? 'Le total doit etre superieur a 0.' : 'Total must be greater than 0.'); return }

    setSaving(true)
    try {
      const client = clients.find(c => c.id === selectedClientId)
      const invoiceNum = editingId ? invoiceNumberPreview : await generateInvoiceNumber()

      const invoiceData: Record<string, any> = {
        invoice_number: invoiceNum,
        client_id: selectedClientId,
        client_snapshot: client,
        status: targetStatus,
        issue_date: invoiceDate,
        due_date: dueDate || null,
        subtotal: totalSubtotal,
        // tps_* = taxe fédérale (GST), tvq_* = taxe provinciale (TVQ/PST/RST/TVH)
        tps_rate: taxCalc.gstRate,
        tvq_rate: taxCalc.provincialRate,
        tps_amount: tpsAmount,
        tvq_amount: tvqAmount,
        total: grandTotal,
        notes: notes || null,
        payment_terms: paymentTerms,
        ...(orgId ? { organization_id: orgId } : {}),
      }

      let invoiceId = editingId
      if (editingId) {
        await supabase.from('invoices').update(invoiceData).eq('id', editingId)
        await supabase.from('invoice_items').delete().eq('invoice_id', editingId)
      } else {
        // Tag la facture avec son module (investor ou commerce) pour eviter
        // qu'elles n'apparaissent dans les 2 onglets
        const { data, error: err } = await supabase
          .from('invoices')
          .insert({ ...invoiceData, module })
          .select()
          .single()
        if (err) throw err
        invoiceId = data.id
      }

      const itemsToInsert = items
        .filter(i => i.description)
        .map((item, idx) => ({
          invoice_id: invoiceId,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          subtotal: item.subtotal,
          taxable: item.taxable,
          sort_order: idx,
          ...(orgId ? { organization_id: orgId } : {}),
        }))

      if (itemsToInsert.length) {
        await supabase.from('invoice_items').insert(itemsToInsert)
      }

      await loadData()

      if (targetStatus === 'sent') {
        // Construire l'objet complet pour PDF + Gmail
        const fullInvoice: Invoice = {
          ...(invoiceData as any),
          id: invoiceId!,
          created_at: new Date().toISOString(),
          items: itemsToInsert as any,
        }
        // Générer + télécharger le PDF automatiquement
        await generatePDF(fullInvoice, true)
        // Ouvrir Gmail Compose avec le message pré-rempli
        openGmailCompose(fullInvoice)
        setSuccess(fr ? 'PDF telecharge — attachez-le dans Gmail qui vient de s\'ouvrir !' : 'PDF downloaded — attach it in the Gmail window that just opened!')
      } else {
        setSuccess(fr ? 'Brouillon sauvegarde !' : 'Draft saved!')
      }

      setView('list')
    } catch (e: any) {
      setError(e.message || (fr ? 'Erreur lors de la sauvegarde.' : 'Save error.'))
    } finally {
      setSaving(false)
    }
  }

  // ─── Marquer comme payé → crée une transaction ────────────────────────────────
  const markAsPaid = async (inv: Invoice) => {
    setSaving(true)
    try {
      const clientName = (inv.client_snapshot as any)?.name || (inv.client_snapshot as any)?.company || 'Client'

      const result = await addTransaction({
        date: new Date().toISOString().split('T')[0],
        type: 'courant',
        amount: inv.total,
        description: `Facture ${inv.invoice_number} — ${clientName}`,
        category: 'facturation',
        payment_method: 'virement',
        reference_number: inv.invoice_number,
        status: 'complete',
        vendor_name: clientName,
        accountant_notes: `TPS: ${fmt(inv.tps_amount)} | TVQ: ${fmt(inv.tvq_amount)} | Sous-total: ${fmt(inv.subtotal)}`,
        source_currency: 'CAD',
        exchange_rate: 1,
      } as any)

      const transactionId = result?.data?.id || null
      const paidDate = new Date().toISOString().split('T')[0]

      await supabase.from('invoices').update({
        status: 'paid',
        paid_date: paidDate,
        transaction_id: transactionId,
      }).eq('id', inv.id)

      await loadData()
      setSuccess(fr ? `Facture ${inv.invoice_number} marquee payee ! Transaction creee automatiquement.` : `Invoice ${inv.invoice_number} marked as paid! Transaction created automatically.`)
    } catch (e: any) {
      setError(e.message || (fr ? 'Erreur lors du marquage comme paye.' : 'Error marking as paid.'))
    } finally {
      setSaving(false)
    }
  }

  // ─── Annuler une facture (avec confirmation) ─────────────────────────────────
  const cancelInvoice = async (inv: Invoice) => {
    if (!confirm(fr ? `Annuler la facture ${inv.invoice_number} ?\n\nCette action peut etre rectifiee plus tard.` : `Cancel invoice ${inv.invoice_number}?\n\nThis can be reversed later.`)) return
    await supabase.from('invoices').update({ status: 'cancelled' }).eq('id', inv.id)
    await loadData()
    setSuccess(fr ? `Facture ${inv.invoice_number} annulee.` : `Invoice ${inv.invoice_number} cancelled.`)
  }

  // ─── Rectifier une facture annulée → retour en brouillon ─────────────────────
  const rectifyInvoice = async (inv: Invoice) => {
    await supabase.from('invoices').update({ status: 'draft' }).eq('id', inv.id)
    await loadData()
    setSuccess(fr ? `Facture ${inv.invoice_number} remise en brouillon — vous pouvez la modifier.` : `Invoice ${inv.invoice_number} reset to draft — you can now edit it.`)
  }

  // ─── Prévisualiser ────────────────────────────────────────────────────────────
  const openPreview = async (inv: Invoice) => {
    const { data: itemsData } = await supabase
      .from('invoice_items').select('*').eq('invoice_id', inv.id).order('sort_order')
    setPreviewInvoice({ ...inv, items: itemsData || [] })
    setView('preview')
  }

  // ─── Génération PDF (style QuickBooks) ───────────────────────────────────────
  const generatePDF = async (inv: Invoice, download = true) => {
    setGeneratingPDF(true)
    try {
      const doc = new jsPDF()
      const client = (inv.client_snapshot || {}) as any
      const pageW = doc.internal.pageSize.getWidth()

      // ── En-tête entreprise : logo(s) selon la marque choisie ──
      const loadLogo = async (path: string): Promise<string | null> => {
        try {
          const resp = await fetch(path)
          const blob = await resp.blob()
          return await new Promise(r => {
            const fr = new FileReader(); fr.onloadend = () => r(fr.result as string); fr.readAsDataURL(blob)
          })
        } catch { return null }
      }
      try {
        if (invoiceBrand === 'cerdia') {
          const l = await loadLogo('/logo-cerdia3.png')
          if (l) doc.addImage(l, 'PNG', 15, 8, 16, 16)
        } else if (invoiceBrand === 'csecur360') {
          const l = await loadLogo('/logo-csecur360.png')
          if (l) doc.addImage(l, 'PNG', 15, 8, 40, 16) // logo C-Secur360 (format paysage)
        } else {
          // Les deux : CERDIA carré + C-Secur360 paysage à sa droite
          const a = await loadLogo('/logo-cerdia3.png')
          if (a) doc.addImage(a, 'PNG', 15, 8, 16, 16)
          const b = await loadLogo('/logo-csecur360.png')
          if (b) doc.addImage(b, 'PNG', 34, 9, 35, 14)
        }
      } catch {}

      doc.setFontSize(22)
      doc.setTextColor(94, 94, 94)
      doc.text('FACTURE', pageW - 15, 18, { align: 'right' })

      doc.setFontSize(10)
      doc.setTextColor(120, 120, 120)
      doc.text(inv.invoice_number, pageW - 15, 25, { align: 'right' })

      // Infos entreprise
      doc.setFontSize(9)
      doc.setTextColor(60, 60, 60)
      let ey = 28
      doc.setFont('helvetica', 'bold')
      doc.text(company.name, 15, ey); ey += 5
      doc.setFont('helvetica', 'normal')
      if (company.address) { doc.text(company.address, 15, ey); ey += 4 }
      if (company.city) {
        doc.text(`${company.city}, ${company.province} ${company.postal_code}`.trim(), 15, ey); ey += 4
      }
      if (company.phone) { doc.text(`Tél: ${company.phone}`, 15, ey); ey += 4 }
      if (company.email) { doc.text(`Courriel: ${company.email}`, 15, ey); ey += 4 }
      if (company.tps_number) { doc.text(`No TPS: ${company.tps_number}`, 15, ey); ey += 4 }
      if (company.tvq_number) { doc.text(`No TVQ: ${company.tvq_number}`, 15, ey); ey += 4 }

      // ── Ligne séparatrice ──
      const sepY = Math.max(ey + 4, 48)
      doc.setDrawColor(220, 220, 220)
      doc.setLineWidth(0.4)
      doc.line(15, sepY, pageW - 15, sepY)

      // ── Bloc FACTURER À + infos facture ──
      let infoY = sepY + 8
      doc.setFontSize(8)
      doc.setTextColor(120, 120, 120)
      doc.text('FACTURER À', 15, infoY)
      doc.text('DÉTAILS DE LA FACTURE', pageW - 80, infoY)

      infoY += 5
      doc.setFontSize(10)
      doc.setTextColor(30, 30, 30)
      doc.setFont('helvetica', 'bold')
      doc.text(client.name || '', 15, infoY)
      doc.setFont('helvetica', 'normal')

      // Infos facture (droite)
      const rightCol: [string, string][] = [
        ['Date d\'émission:', new Date(inv.issue_date).toLocaleDateString('fr-CA', { year: 'numeric', month: 'long', day: 'numeric' })],
        ['Échéance:', inv.due_date ? new Date(inv.due_date).toLocaleDateString('fr-CA', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Sur réception'],
        ['Termes:', inv.payment_terms || '30 jours'],
        ['Statut:', inv.status === 'paid' ? 'PAYÉE' : inv.status === 'sent' ? 'EN ATTENTE' : inv.status.toUpperCase()],
      ]
      rightCol.forEach(([label, val], i) => {
        doc.setFontSize(9)
        doc.setTextColor(120, 120, 120)
        doc.text(label, pageW - 80, infoY + (i * 6))
        doc.setTextColor(30, 30, 30)
        doc.text(val, pageW - 15, infoY + (i * 6), { align: 'right' })
      })

      infoY += 6
      doc.setFontSize(9)
      doc.setTextColor(60, 60, 60)
      if (client.company) { doc.text(client.company, 15, infoY); infoY += 5 }
      if (client.address) { doc.text(client.address, 15, infoY); infoY += 5 }
      if (client.city) {
        doc.text(`${client.city}, ${client.province || ''} ${client.postal_code || ''}`.trim(), 15, infoY); infoY += 5
      }
      if (client.email) { doc.text(client.email, 15, infoY); infoY += 5 }
      if (client.phone) { doc.text(client.phone, 15, infoY); infoY += 5 }

      const tableStartY = Math.max(infoY + 8, sepY + 52)

      // ── Tableau des items ──
      const itemRows = (inv.items || []).map(item => [
        item.description,
        item.quantity % 1 === 0 ? String(item.quantity) : item.quantity.toFixed(2),
        fmt(item.unit_price),
        item.taxable ? 'Oui' : 'Non',
        fmt(item.subtotal),
      ])

      autoTable(doc, {
        startY: tableStartY,
        head: [['Description', 'Qté', 'Prix unitaire', 'Taxable', 'Sous-total']],
        body: itemRows,
        theme: 'striped',
        headStyles: { fillColor: [94, 94, 94], textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold' },
        bodyStyles: { fontSize: 9, textColor: [50, 50, 50] },
        columnStyles: {
          0: { cellWidth: 80 },
          1: { halign: 'center', cellWidth: 15 },
          2: { halign: 'right', cellWidth: 30 },
          3: { halign: 'center', cellWidth: 20 },
          4: { halign: 'right', cellWidth: 30 },
        },
        alternateRowStyles: { fillColor: [248, 248, 248] },
        margin: { left: 15, right: 15 },
      })

      // ── Totaux ──
      let tY = (doc as any).lastAutoTable.finalY + 6
      const totalsX = pageW - 80
      const valX = pageW - 15

      const totalsRows: [string, string, boolean][] = [
        ['Sous-total', fmt(inv.subtotal), false],
        ...(inv.tps_amount > 0 ? [[`TPS (${(inv.tps_rate * 100).toFixed(2).replace('.', ',')}%)`, fmt(inv.tps_amount), false] as [string, string, boolean]] : []),
        ...(inv.tvq_amount > 0 ? [[`${provincialLabelForRate(inv.tvq_rate)} (${(inv.tvq_rate * 100).toFixed(3).replace('.', ',')}%)`, fmt(inv.tvq_amount), false] as [string, string, boolean]] : []),
        ['TOTAL', fmt(inv.total), true],
      ]

      totalsRows.forEach(([label, val, bold]) => {
        if (bold) {
          doc.setFillColor(94, 94, 94)
          doc.rect(totalsX - 5, tY - 4, pageW - 10 - totalsX, 8, 'F')
          doc.setTextColor(255, 255, 255)
          doc.setFontSize(11)
          doc.setFont('helvetica', 'bold')
        } else {
          doc.setTextColor(80, 80, 80)
          doc.setFontSize(9)
          doc.setFont('helvetica', 'normal')
        }
        doc.text(label, totalsX, tY)
        doc.text(val, valX, tY, { align: 'right' })
        tY += 7
      })
      doc.setFont('helvetica', 'normal')

      // ── Coordonnées bancaires ──
      tY += 6
      if (company.bank_name || company.bank_account || company.interac_email) {
        doc.setFillColor(245, 247, 250)
        doc.rect(15, tY - 2, pageW - 30, 38, 'F')
        doc.setDrawColor(200, 210, 230)
        doc.rect(15, tY - 2, pageW - 30, 38, 'S')

        doc.setFontSize(9)
        doc.setTextColor(50, 80, 150)
        doc.setFont('helvetica', 'bold')
        doc.text('PAIEMENT PAR VIREMENT BANCAIRE', 20, tY + 4)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(50, 50, 50)

        let bY = tY + 10
        const bankRows: [string, string][] = [
          ['Institution:', company.bank_name],
          ['No institution:', company.bank_institution],
          ['No transit:', company.bank_transit],
          ['No de compte:', company.bank_account],
          ['Interac / Virement:', company.interac_email],
        ].filter(([, v]) => v) as [string, string][]

        bankRows.forEach(([label, val]) => {
          doc.setTextColor(120, 120, 120)
          doc.text(label, 20, bY)
          doc.setTextColor(30, 30, 30)
          doc.text(val, 75, bY)
          bY += 5
        })

        tY += 42
      }

      // ── Notes ──
      if (inv.notes) {
        tY += 4
        doc.setFontSize(8)
        doc.setTextColor(120, 120, 120)
        doc.text('Notes:', 15, tY)
        doc.setTextColor(60, 60, 60)
        const noteLines = doc.splitTextToSize(inv.notes, 180)
        doc.text(noteLines, 15, tY + 5)
      }

      // ── Pied de page ──
      const pageH = doc.internal.pageSize.getHeight()
      doc.setDrawColor(200, 200, 200)
      doc.setLineWidth(0.3)
      doc.line(15, pageH - 18, pageW - 15, pageH - 18)
      doc.setFontSize(7)
      doc.setTextColor(150, 150, 150)
      doc.text(`${company.name} — Facture générée le ${new Date().toLocaleDateString('fr-CA')}`, pageW / 2, pageH - 12, { align: 'center' })
      // En mode C-Secur360 : note de référence à Commerce CERDIA.
      if (invoiceBrand === 'csecur360' || invoiceBrand === 'both') {
        doc.text('C-Secur360 est un produit de Commerce CERDIA inc.', pageW / 2, pageH - 7, { align: 'center' })
      } else {
        doc.text(`Merci de votre confiance !`, pageW / 2, pageH - 7, { align: 'center' })
      }

      if (download) {
        doc.save(`Facture_${inv.invoice_number}.pdf`)
      }
      return doc
    } finally {
      setGeneratingPDF(false)
    }
  }

  // ─── Sauvegarder paramètres entreprise ───────────────────────────────────────
  const saveCompanySettings = () => {
    setCompany(companyDraft)
    localStorage.setItem('cerdia_invoice_company', JSON.stringify(companyDraft))
    setSuccess(fr ? 'Parametres sauvegardes !' : 'Settings saved!')
    setView('list')
  }

  // ─── Client CRUD ─────────────────────────────────────────────────────────────
  const saveClient = async () => {
    if (!clientForm.name?.trim()) { setError(fr ? 'Le nom du client est requis.' : 'Client name is required.'); return }
    setSaving(true)
    try {
      if (editingClientId) {
        await supabase.from('invoice_clients').update({ ...clientForm, updated_at: new Date().toISOString() }).eq('id', editingClientId)
      } else {
        await supabase.from('invoice_clients').insert({ ...clientForm, ...(orgId ? { organization_id: orgId } : {}) })
      }
      await loadData()
      setClientForm({ province: 'QC', country: 'Canada' })
      setEditingClientId(null)
      setShowClientForm(false)
      setSuccess(fr ? 'Client sauvegarde !' : 'Client saved!')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const deleteClient = async (id: string) => {
    await supabase.from('invoice_clients').delete().eq('id', id)
    await loadData()
  }

  // ─── Helpers UI ──────────────────────────────────────────────────────────────
  const statusBadge = (status: Invoice['status']) => {
    const map: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-600',
      sent: 'bg-blue-100 text-blue-700',
      paid: 'bg-green-100 text-green-700',
      cancelled: 'bg-red-100 text-red-600',
    }
    const labels: Record<string, string> = {
      draft: fr ? 'Brouillon' : 'Draft',
      sent: fr ? 'Envoyee' : 'Sent',
      paid: fr ? 'Payee' : 'Paid',
      cancelled: fr ? 'Annulee' : 'Cancelled'
    }
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[status]}`}>
        {labels[status]}
      </span>
    )
  }

  const filteredInvoices = invoices.filter(i =>
    filterStatus === 'all' ? true : i.status === filterStatus
  )

  const filteredClients = clients.filter(c =>
    !clientSearch ||
    c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.company?.toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.email?.toLowerCase().includes(clientSearch.toLowerCase())
  )

  // ═══════════════════════════════════════════════════════════════════════════════
  // ── RENDU ─────────────────────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════════

  // ── Toast notifications ──
  const Toast = () => (
    <>
      {success && (
        <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 max-w-sm">
          <CheckCircle size={16} /> <span className="text-sm">{success}</span>
          <button onClick={() => setSuccess(null)}><X size={14} /></button>
        </div>
      )}
      {error && (
        <div className="fixed top-4 right-4 z-50 bg-red-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 max-w-sm">
          <AlertCircle size={16} /> <span className="text-sm">{error}</span>
          <button onClick={() => setError(null)}><X size={14} /></button>
        </div>
      )}
    </>
  )

  // ── Vue: Paramètres entreprise ────────────────────────────────────────────────
  if (view === 'settings') {
    const sc = (field: keyof CompanySettings, val: string) =>
      setCompanyDraft(prev => ({ ...prev, [field]: val }))
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <Toast />
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setView('list')} className="text-gray-500 hover:text-gray-800 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{fr ? 'Parametres de facturation' : 'Billing Settings'}</h2>
        </div>

        <div className="space-y-6">
          {/* Infos entreprise */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <Building2 size={16} /> {fr ? "Informations de l'entreprise" : 'Company Information'}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: fr ? "Nom de l'entreprise" : 'Company name', field: 'name' as const },
                { label: fr ? 'Adresse' : 'Address', field: 'address' as const },
                { label: fr ? 'Ville' : 'City', field: 'city' as const },
                { label: fr ? 'Province' : 'Province', field: 'province' as const },
                { label: fr ? 'Code postal' : 'Postal code', field: 'postal_code' as const },
                { label: fr ? 'Telephone' : 'Phone', field: 'phone' as const },
                { label: fr ? 'Courriel' : 'Email', field: 'email' as const },
                { label: fr ? 'Site web' : 'Website', field: 'website' as const },
                { label: fr ? 'No TPS (federal)' : 'TPS No. (federal)', field: 'tps_number' as const },
                { label: fr ? 'No TVQ (provincial)' : 'TVQ No. (provincial)', field: 'tvq_number' as const },
              ].map(({ label, field }) => (
                <div key={field}>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{label}</label>
                  <input
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={companyDraft[field]}
                    onChange={e => sc(field, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Coordonnées bancaires */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <CreditCard size={16} /> {fr ? 'Coordonnees bancaires (affichees sur les factures)' : 'Banking Details (shown on invoices)'}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: 'Nom de la banque', field: 'bank_name' as const },
                { label: 'No institution', field: 'bank_institution' as const },
                { label: 'No transit', field: 'bank_transit' as const },
                { label: 'No de compte', field: 'bank_account' as const },
                { label: 'Courriel Interac / Virement', field: 'interac_email' as const },
              ].map(({ label, field }) => (
                <div key={field}>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{label}</label>
                  <input
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={companyDraft[field]}
                    onChange={e => sc(field, e.target.value)}
                  />
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-xs text-blue-700 dark:text-blue-300">
              {fr ? 'Ces informations apparaissent sur chaque PDF de facture envoye aux clients.' : 'This information appears on every invoice PDF sent to clients.'}
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button onClick={() => setView('list')} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors">
              {fr ? 'Annuler' : 'Cancel'}
            </button>
            <button onClick={saveCompanySettings} className="px-6 py-2 bg-[#5e5e5e] text-white rounded-lg text-sm font-medium hover:bg-[#3e3e3e] transition-colors flex items-center gap-2">
              <Save size={14} /> {fr ? 'Sauvegarder' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Vue: Gestion des clients ──────────────────────────────────────────────────
  if (view === 'clients') {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Toast />
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => setView('list')} className="text-gray-500 hover:text-gray-800 transition-colors">
              <ArrowLeft size={20} />
            </button>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{fr ? 'Gestion des clients' : 'Client Management'}</h2>
          </div>
          <button
            onClick={() => { setShowClientForm(true); setEditingClientId(null); setClientForm({ province: 'QC', country: 'Canada' }) }}
            className="flex items-center gap-2 bg-[#5e5e5e] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#3e3e3e] transition-colors"
          >
            <Plus size={14} /> {fr ? 'Nouveau client' : 'New client'}
          </button>
        </div>

        {showClientForm && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {editingClientId ? (fr ? 'Modifier le client' : 'Edit client') : (fr ? 'Nouveau client' : 'New client')}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: fr ? 'Nom *' : 'Name *', field: 'name', required: true },
                { label: fr ? 'Entreprise' : 'Company', field: 'company' },
                { label: fr ? 'Courriel' : 'Email', field: 'email' },
                { label: fr ? 'Telephone' : 'Phone', field: 'phone' },
                { label: fr ? 'Adresse' : 'Address', field: 'address' },
                { label: fr ? 'Ville' : 'City', field: 'city' },
                { label: fr ? 'Province' : 'Province', field: 'province' },
                { label: fr ? 'Code postal' : 'Postal code', field: 'postal_code' },
              ].map(({ label, field }) => (
                <div key={field}>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{label}</label>
                  <input
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={(clientForm as any)[field] || ''}
                    onChange={e => setClientForm(prev => ({ ...prev, [field]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setShowClientForm(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors">{fr ? 'Annuler' : 'Cancel'}</button>
              <button onClick={saveClient} disabled={saving} className="px-6 py-2 bg-[#5e5e5e] text-white rounded-lg text-sm font-medium hover:bg-[#3e3e3e] transition-colors flex items-center gap-2 disabled:opacity-50">
                <Save size={14} /> {saving ? (fr ? 'Sauvegarde...' : 'Saving...') : (fr ? 'Sauvegarder' : 'Save')}
              </button>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
              <input
                className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder={fr ? 'Rechercher un client...' : 'Search client...'}
                value={clientSearch}
                onChange={e => setClientSearch(e.target.value)}
              />
            </div>
          </div>
          {filteredClients.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              <Users size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">{fr ? 'Aucun client. Cliquez sur "Nouveau client" pour commencer.' : 'No clients. Click "New client" to get started.'}</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredClients.map(client => (
                <div key={client.id} className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{client.name}</p>
                    {client.company && <p className="text-sm text-gray-600 dark:text-gray-400">{client.company}</p>}
                    <div className="flex items-center gap-4 mt-1">
                      {client.email && (
                        <a href={`mailto:${client.email}`} className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1">
                          <Mail size={10} /> {client.email}
                        </a>
                      )}
                      {client.phone && (
                        <a href={`tel:${client.phone}`} className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1">
                          <Phone size={10} /> {client.phone}
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setEditingClientId(client.id); setClientForm(client); setShowClientForm(true) }}
                      className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => deleteClient(client.id)}
                      className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Vue: Prévisualisation de facture ──────────────────────────────────────────
  if (view === 'preview' && previewInvoice) {
    const inv = previewInvoice
    const client = (inv.client_snapshot || {}) as any

    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Toast />
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => setView('list')} className="text-gray-500 hover:text-gray-800 transition-colors">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{inv.invoice_number}</h2>
              <div className="mt-0.5">{statusBadge(inv.status)}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {inv.status === 'draft' && (
              <button onClick={() => startEdit(inv)} className="flex items-center gap-2 border border-gray-300 text-gray-700 px-3 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors">
                <Edit2 size={14} /> {fr ? 'Modifier' : 'Edit'}
              </button>
            )}
            {inv.status === 'sent' && (
              <button onClick={() => markAsPaid(inv)} disabled={saving} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50">
                <CheckCircle size={14} /> {fr ? 'Marquer payee' : 'Mark as paid'}
              </button>
            )}
            {inv.status === 'cancelled' && (
              <button onClick={() => rectifyInvoice(inv)} className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors">
                <RotateCcw size={14} /> {fr ? 'Rectifier' : 'Undo cancellation'}
              </button>
            )}
            {(inv.status === 'sent' || inv.status === 'draft') && (
              <button
                onClick={async () => { await generatePDF(inv, true); openGmailCompose(inv) }}
                disabled={generatingPDF}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <Send size={14} /> {generatingPDF ? '...' : (fr ? 'Envoyer par Gmail' : 'Send via Gmail')}
              </button>
            )}
            <button onClick={() => generatePDF(inv)} disabled={generatingPDF} className="flex items-center gap-2 bg-[#5e5e5e] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#3e3e3e] transition-colors disabled:opacity-50">
              <Download size={14} /> {generatingPDF ? (fr ? 'Generation...' : 'Generating...') : (fr ? 'Telecharger PDF' : 'Download PDF')}
            </button>
          </div>
        </div>

        {/* Preview card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
          {/* Header */}
          <div className="flex justify-between items-start mb-8">
            <div>
              {/* Logo(s) selon la marque choisie */}
              <div className="flex items-center gap-3 mb-2">
                {(invoiceBrand === 'cerdia' || invoiceBrand === 'both') && (
                  <img src="/logo-cerdia3.png" alt="CERDIA" className="h-10 w-auto object-contain"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                )}
                {(invoiceBrand === 'csecur360' || invoiceBrand === 'both') && (
                  <img src="/logo-csecur360.png" alt="C-Secur360" className="h-10 w-auto object-contain"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                )}
              </div>
              <h3 className="text-2xl font-bold text-[#5e5e5e] dark:text-gray-200">{company.name}</h3>
              {company.address && <p className="text-sm text-gray-600 mt-1">{company.address}</p>}
              {company.city && <p className="text-sm text-gray-600">{company.city}, {company.province} {company.postal_code}</p>}
              {company.phone && (
                <a href={`tel:${company.phone}`} className="text-sm text-blue-600 hover:underline flex items-center gap-1 mt-1">
                  <Phone size={12} /> {company.phone}
                </a>
              )}
              {company.email && (
                <a href={`mailto:${company.email}`} className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                  <Mail size={12} /> {company.email}
                </a>
              )}
              {company.tps_number && <p className="text-xs text-gray-500 mt-1">TPS: {company.tps_number}</p>}
              {company.tvq_number && <p className="text-xs text-gray-500">TVQ: {company.tvq_number}</p>}
            </div>
            <div className="text-right">
              <p className="text-3xl font-light text-gray-400 tracking-widest">FACTURE</p>
              <p className="text-lg font-bold text-gray-800 dark:text-gray-100 mt-1">{inv.invoice_number}</p>
            </div>
          </div>

          <hr className="border-gray-200 dark:border-gray-600 mb-6" />

          {/* Billed to + details */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Facturer à</p>
              <p className="font-semibold text-gray-900 dark:text-gray-100">{client.name}</p>
              {client.company && <p className="text-sm text-gray-600">{client.company}</p>}
              {client.address && <p className="text-sm text-gray-600">{client.address}</p>}
              {client.city && <p className="text-sm text-gray-600">{client.city}, {client.province} {client.postal_code}</p>}
              {client.email && (
                <a href={`mailto:${client.email}`} className="text-sm text-blue-600 hover:underline flex items-center gap-1 mt-1">
                  <Mail size={11} /> {client.email}
                </a>
              )}
              {client.phone && (
                <a href={`tel:${client.phone}`} className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                  <Phone size={11} /> {client.phone}
                </a>
              )}
            </div>
            <div className="text-right space-y-2">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider">Date d'émission</p>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  {new Date(inv.issue_date).toLocaleDateString('fr-CA', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
              {inv.due_date && (
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider">Échéance</p>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    {new Date(inv.due_date).toLocaleDateString('fr-CA', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider">Termes</p>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{inv.payment_terms}</p>
              </div>
            </div>
          </div>

          {/* Items */}
          <table className="w-full mb-6">
            <thead>
              <tr className="bg-[#5e5e5e] text-white text-xs font-medium">
                <th className="text-left px-4 py-2 rounded-tl-lg">Description</th>
                <th className="text-center px-3 py-2 w-16">Qté</th>
                <th className="text-right px-3 py-2 w-28">Prix unitaire</th>
                <th className="text-center px-3 py-2 w-16">Taxable</th>
                <th className="text-right px-4 py-2 w-28 rounded-tr-lg">Sous-total</th>
              </tr>
            </thead>
            <tbody>
              {(inv.items || []).map((item, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-gray-50 dark:bg-gray-700/30' : ''}>
                  <td className="px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200">{item.description}</td>
                  <td className="px-3 py-2.5 text-sm text-center text-gray-600">{item.quantity}</td>
                  <td className="px-3 py-2.5 text-sm text-right text-gray-600">{fmt(item.unit_price)}</td>
                  <td className="px-3 py-2.5 text-sm text-center">{item.taxable ? '✓' : '—'}</td>
                  <td className="px-4 py-2.5 text-sm text-right font-medium text-gray-800 dark:text-gray-200">{fmt(item.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end mb-6">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Sous-total</span>
                <span>{fmt(inv.subtotal)}</span>
              </div>
              {inv.tps_amount > 0 && (
                <div className="flex justify-between text-sm text-gray-600">
                  <span>{fr ? 'TPS' : 'GST'} ({(inv.tps_rate * 100).toFixed(2).replace('.', ',')}%)</span>
                  <span>{fmt(inv.tps_amount)}</span>
                </div>
              )}
              {inv.tvq_amount > 0 && (
                <div className="flex justify-between text-sm text-gray-600">
                  <span>{provincialLabelForRate(inv.tvq_rate)} ({(inv.tvq_rate * 100).toFixed(3).replace('.', ',')}%)</span>
                  <span>{fmt(inv.tvq_amount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base border-t border-gray-200 pt-2 mt-2 text-gray-900 dark:text-gray-100">
                <span>TOTAL</span>
                <span className="text-[#5e5e5e] dark:text-gray-200">{fmt(inv.total)}</span>
              </div>
            </div>
          </div>

          {/* Coordonnées bancaires */}
          {(company.bank_name || company.bank_account || company.interac_email) && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-5 mb-4">
              <p className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-3 flex items-center gap-2">
                <CreditCard size={14} /> Paiement par virement bancaire
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                {company.bank_name && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 w-32">Institution:</span>
                    <span className="font-medium text-gray-800 dark:text-gray-200">{company.bank_name}</span>
                  </div>
                )}
                {company.bank_institution && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 w-32">No institution:</span>
                    <span className="font-medium text-gray-800 dark:text-gray-200 font-mono">{company.bank_institution}</span>
                    <button onClick={() => navigator.clipboard.writeText(company.bank_institution)} className="text-blue-500 hover:text-blue-700">
                      <Copy size={12} />
                    </button>
                  </div>
                )}
                {company.bank_transit && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 w-32">No transit:</span>
                    <span className="font-medium text-gray-800 dark:text-gray-200 font-mono">{company.bank_transit}</span>
                    <button onClick={() => navigator.clipboard.writeText(company.bank_transit)} className="text-blue-500 hover:text-blue-700">
                      <Copy size={12} />
                    </button>
                  </div>
                )}
                {company.bank_account && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 w-32">No de compte:</span>
                    <span className="font-medium text-gray-800 dark:text-gray-200 font-mono">{company.bank_account}</span>
                    <button onClick={() => navigator.clipboard.writeText(company.bank_account)} className="text-blue-500 hover:text-blue-700">
                      <Copy size={12} />
                    </button>
                  </div>
                )}
                {company.interac_email && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 w-32">Interac / Virement:</span>
                    <a href={`mailto:${company.interac_email}`} className="font-medium text-blue-600 hover:underline flex items-center gap-1">
                      <Mail size={12} /> {company.interac_email}
                    </a>
                    <button onClick={() => navigator.clipboard.writeText(company.interac_email)} className="text-blue-500 hover:text-blue-700">
                      <Copy size={12} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {inv.notes && (
            <div className="text-sm text-gray-600 border-t border-gray-100 pt-4">
              <p className="font-medium text-gray-700 mb-1">Notes:</p>
              <p>{inv.notes}</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Vue: Formulaire de création/édition ───────────────────────────────────────
  if (view === 'form') {
    const selectedClient = clients.find(c => c.id === selectedClientId)

    return (
      <div className="p-6 max-w-5xl mx-auto">
        <Toast />
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setView('list')} className="text-gray-500 hover:text-gray-800 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {editingId ? (fr ? 'Modifier la facture' : 'Edit Invoice') : (fr ? 'Nouvelle facture' : 'New Invoice')}
            </h2>
            <p className="text-sm text-gray-500">{invoiceNumberPreview}</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Client */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <Users size={16} /> Client
            </h3>
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <select
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={selectedClientId}
                  onChange={e => {
                    const id = e.target.value
                    setSelectedClientId(id)
                    // Auto-sélectionne la province selon le client choisi (place of supply)
                    const c = clients.find(cl => cl.id === id)
                    const prov = c?.province as ProvinceCode | undefined
                    if (prov && CANADA_TAX[prov]) setInvoiceProvince(prov)
                  }}
                >
                  <option value="">{fr ? '— Selectionner un client —' : '— Select a client —'}</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}{c.company ? ` (${c.company})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => {
                  setEditingClientId(null)
                  setClientForm({ province: 'QC', country: 'Canada' })
                  setShowClientForm(v => !v)
                }}
                className="flex items-center gap-1 px-3 py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-gray-400 hover:text-gray-800 transition-colors whitespace-nowrap"
              >
                <Plus size={14} /> {fr ? 'Nouveau client' : 'New client'}
              </button>
            </div>

            {showClientForm && (
              <div className="mt-4 p-4 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-750">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{fr ? 'Nouveau client' : 'New client'}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { label: fr ? 'Nom *' : 'Name *', field: 'name' },
                    { label: fr ? 'Entreprise' : 'Company', field: 'company' },
                    { label: fr ? 'Courriel' : 'Email', field: 'email' },
                    { label: fr ? 'Telephone' : 'Phone', field: 'phone' },
                    { label: fr ? 'Adresse' : 'Address', field: 'address' },
                    { label: fr ? 'Ville' : 'City', field: 'city' },
                    { label: fr ? 'Province' : 'Province', field: 'province' },
                    { label: fr ? 'Code postal' : 'Postal code', field: 'postal_code' },
                  ].map(({ label, field }) => (
                    <div key={field}>
                      <label className="block text-xs text-gray-500 mb-1">{label}</label>
                      <input
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
                        value={(clientForm as any)[field] || ''}
                        onChange={e => setClientForm(prev => ({ ...prev, [field]: e.target.value }))}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex justify-end gap-2 mt-3">
                  <button onClick={() => setShowClientForm(false)} className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800">{fr ? 'Annuler' : 'Cancel'}</button>
                  <button
                    onClick={async () => {
                      if (!clientForm.name?.trim()) { setError(fr ? 'Nom requis' : 'Name required'); return }
                      setSaving(true)
                      const { data, error: err } = await supabase.from('invoice_clients').insert({ ...clientForm, ...(orgId ? { organization_id: orgId } : {}) }).select().single()
                      setSaving(false)
                      if (err) { setError(`${fr ? 'Erreur Supabase :' : 'Supabase error:'} ${err.message}${err.code === '42501' ? (fr ? ' — Executez la migration 132 dans Supabase.' : ' — Run migration 132 in Supabase.') : ''}`); return }
                      await loadData()
                      if (data) setSelectedClientId(data.id)
                      setShowClientForm(false)
                      setClientForm({ province: 'QC', country: 'Canada' })
                      setSuccess(fr ? 'Client cree !' : 'Client created!')
                    }}
                    disabled={saving}
                    className="px-4 py-1.5 bg-[#5e5e5e] text-white rounded-lg text-sm hover:bg-[#3e3e3e] transition-colors disabled:opacity-50"
                  >
                    {saving ? (fr ? 'Sauvegarde...' : 'Saving...') : (fr ? 'Creer' : 'Create')}
                  </button>
                </div>
              </div>
            )}

            {selectedClient && !showClientForm && (
              <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-sm text-gray-700 dark:text-gray-300">
                <span className="font-medium">{selectedClient.name}</span>
                {selectedClient.company && <span className="text-gray-500"> · {selectedClient.company}</span>}
                {selectedClient.email && <span className="text-gray-500"> · {selectedClient.email}</span>}
              </div>
            )}
          </div>

          {/* Détails facture */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <Calendar size={16} /> {fr ? 'Details' : 'Details'}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{fr ? "Date d'emission" : 'Issue date'}</label>
                <input type="date" className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{fr ? "Date d'echeance" : 'Due date'}</label>
                <input type="date" className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none" value={dueDate} onChange={e => setDueDate(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{fr ? 'Termes de paiement' : 'Payment terms'}</label>
                <select className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none" value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)}>
                  <option>Sur réception</option>
                  <option>15 jours</option>
                  <option>30 jours</option>
                  <option>45 jours</option>
                  <option>60 jours</option>
                </select>
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <Hash size={16} /> {fr ? 'Items / Services' : 'Line Items / Services'}
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-xs font-medium text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-600">
                    <th className="text-left pb-2">Description</th>
                    <th className="text-center pb-2 w-20">{fr ? 'Qte' : 'Qty'}</th>
                    <th className="text-right pb-2 w-32">{fr ? 'Prix unitaire' : 'Unit price'}</th>
                    <th className="text-center pb-2 w-20">Taxable</th>
                    <th className="text-right pb-2 w-32">{fr ? 'Sous-total' : 'Subtotal'}</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody className="space-y-1">
                  {items.map((item, i) => (
                    <tr key={i} className="border-b border-gray-100 dark:border-gray-700">
                      <td className="py-2 pr-2">
                        <input
                          className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
                          placeholder={fr ? 'Description du service ou produit...' : 'Service or product description...'}
                          value={item.description}
                          onChange={e => updateItem(i, 'description', e.target.value)}
                        />
                      </td>
                      <td className="py-2 px-1">
                        <input
                          type="number" min="0" step="0.01"
                          className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1.5 text-sm text-center bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
                          value={item.quantity}
                          onChange={e => updateItem(i, 'quantity', parseFloat(e.target.value) || 0)}
                        />
                      </td>
                      <td className="py-2 px-1">
                        <input
                          type="number" min="0" step="0.01"
                          className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1.5 text-sm text-right bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
                          value={item.unit_price}
                          onChange={e => updateItem(i, 'unit_price', parseFloat(e.target.value) || 0)}
                        />
                      </td>
                      <td className="py-2 px-1 text-center">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          checked={item.taxable}
                          onChange={e => updateItem(i, 'taxable', e.target.checked)}
                        />
                      </td>
                      <td className="py-2 px-1 text-right">
                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{fmt(item.subtotal)}</span>
                      </td>
                      <td className="py-2 pl-1">
                        {items.length > 1 && (
                          <button onClick={() => removeItem(i)} className="text-gray-400 hover:text-red-500 transition-colors">
                            <X size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button onClick={addItem} className="mt-3 flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 transition-colors">
              <Plus size={14} /> {fr ? 'Ajouter un item' : 'Add item'}
            </button>
          </div>

          {/* Taxes + Total */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <DollarSign size={16} /> Taxes & Total
            </h3>
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="space-y-3">
                {/* Marque (logo) de la facture */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    {fr ? 'Logo / marque de la facture' : 'Invoice logo / brand'}
                  </label>
                  <select
                    value={invoiceBrand}
                    onChange={e => setInvoiceBrand(e.target.value as 'cerdia' | 'csecur360' | 'both')}
                    className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="cerdia">CERDIA</option>
                    <option value="csecur360">C-Secur360</option>
                    <option value="both">{fr ? 'Les deux logos' : 'Both logos'}</option>
                  </select>
                  {(invoiceBrand === 'csecur360' || invoiceBrand === 'both') && (
                    <p className="text-[11px] text-gray-500 mt-1">
                      {fr ? 'Note ajoutée : « C-Secur360 est un produit de Commerce CERDIA inc. »' : 'Note added: "C-Secur360 is a product of Commerce CERDIA inc."'}
                    </p>
                  )}
                </div>
                {/* Province du client = lieu de fourniture → détermine la taxe provinciale */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    {fr ? 'Province du client (lieu de fourniture)' : 'Client province (place of supply)'}
                  </label>
                  <select
                    value={invoiceProvince}
                    onChange={e => setInvoiceProvince(e.target.value as ProvinceCode)}
                    className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500"
                  >
                    {PROVINCE_OPTIONS.map(p => (
                      <option key={p.code} value={p.code}>{p.code} — {p.name}</option>
                    ))}
                  </select>
                </div>
                {provinceInfo.gst > 0 && (
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-blue-600" checked={applyTPS} onChange={e => setApplyTPS(e.target.checked)} />
                    <div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{fr ? 'TPS (GST fédérale)' : 'GST (federal)'}</span>
                      <span className="ml-2 text-xs text-gray-500">{(provinceInfo.gst * 100).toFixed(2).replace('.', ',')}%</span>
                    </div>
                  </label>
                )}
                {provinceInfo.provincialLabel && (
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-blue-600" checked={applyTVQ} onChange={e => setApplyTVQ(e.target.checked)} />
                    <div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {provinceInfo.provincialLabel} {provinceInfo.harmonized ? (fr ? '(harmonisée)' : '(harmonized)') : (fr ? '(provinciale)' : '(provincial)')}
                      </span>
                      <span className="ml-2 text-xs text-gray-500">{(provinceInfo.provincial * 100).toFixed(3).replace('.', ',')}%</span>
                    </div>
                  </label>
                )}
                {!provinceInfo.provincialLabel && (
                  <p className="text-xs text-gray-400">{fr ? 'Aucune taxe provinciale dans cette juridiction.' : 'No provincial tax in this jurisdiction.'}</p>
                )}
              </div>
              <div className="flex-1 flex justify-end">
                <div className="w-60 space-y-2">
                  <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                    <span>{fr ? 'Sous-total' : 'Subtotal'}</span>
                    <span className="font-medium">{fmt(totalSubtotal)}</span>
                  </div>
                  {taxableSubtotal !== totalSubtotal && (
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>{fr ? 'dont taxable' : 'of which taxable'}</span>
                      <span>{fmt(taxableSubtotal)}</span>
                    </div>
                  )}
                  {applyTPS && tpsAmount > 0 && (
                    <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                      <span>{fr ? 'TPS' : 'GST'} ({(taxCalc.gstRate * 100).toFixed(2).replace('.', ',')}%)</span>
                      <span>{fmt(tpsAmount)}</span>
                    </div>
                  )}
                  {applyTVQ && tvqAmount > 0 && (
                    <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                      <span>{provinceInfo.provincialLabel} ({(taxCalc.provincialRate * 100).toFixed(3).replace('.', ',')}%)</span>
                      <span>{fmt(tvqAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-bold border-t border-gray-200 dark:border-gray-600 pt-2 mt-2 text-gray-900 dark:text-gray-100">
                    <span>TOTAL CAD</span>
                    <span className="text-[#5e5e5e] dark:text-gray-200">{fmt(grandTotal)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{fr ? 'Notes (optionnel)' : 'Notes (optional)'}</label>
            <textarea
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              rows={3}
              placeholder={fr ? 'Notes additionnelles, conditions particulieres...' : 'Additional notes, special terms...'}
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row justify-between gap-3 pb-6">
            <button onClick={() => setView('list')} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors">
              {fr ? 'Annuler' : 'Cancel'}
            </button>
            <div className="flex gap-3">
              <button
                onClick={() => saveInvoice('draft')}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 border border-gray-400 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                <Save size={14} /> {saving ? '...' : (fr ? 'Brouillon' : 'Save draft')}
              </button>
              <button
                onClick={() => saveInvoice('sent')}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2 bg-[#5e5e5e] text-white rounded-lg text-sm font-medium hover:bg-[#3e3e3e] transition-colors disabled:opacity-50"
              >
                <Send size={14} /> {saving ? (fr ? 'Envoi...' : 'Sending...') : (fr ? 'Envoyer & Archiver' : 'Send & Archive')}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Vue: Liste des factures (défaut) ──────────────────────────────────────────
  const stats = {
    total: invoices.length,
    draft: invoices.filter(i => i.status === 'draft').length,
    sent: invoices.filter(i => i.status === 'sent').length,
    paid: invoices.filter(i => i.status === 'paid').length,
    totalRevenue: invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total, 0),
    pendingRevenue: invoices.filter(i => i.status === 'sent').reduce((s, i) => s + i.total, 0),
  }

  return (
    <div className="p-6">
      <Toast />
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <FileText size={20} className="text-[#5e5e5e]" />
            {fr ? 'Generateur de factures' : 'Invoice Generator'}
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">{fr ? 'TPS 5% + TVQ 9,975% calculees automatiquement' : 'GST 5% + QST 9.975% calculated automatically'}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setView('clients')} className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <Users size={14} /> {fr ? 'Clients' : 'Clients'}
          </button>
          <button onClick={() => { setCompanyDraft(company); setView('settings') }} className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <Settings size={14} /> {fr ? 'Parametres' : 'Settings'}
          </button>
          <button onClick={startNew} className="flex items-center gap-2 bg-[#5e5e5e] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#3e3e3e] transition-colors">
            <Plus size={14} /> {fr ? 'Nouvelle facture' : 'New Invoice'}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: fr ? 'En attente' : 'Pending', value: stats.sent, sub: fmt(stats.pendingRevenue), color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800' },
          { label: fr ? 'Payees' : 'Paid', value: stats.paid, sub: fmt(stats.totalRevenue), color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-200 dark:border-green-800' },
          { label: fr ? 'Brouillons' : 'Drafts', value: stats.draft, sub: '', color: 'text-gray-600', bg: 'bg-gray-50 dark:bg-gray-700/30', border: 'border-gray-200 dark:border-gray-600' },
          { label: fr ? 'Total factures' : 'Total invoices', value: stats.total, sub: '', color: 'text-[#5e5e5e]', bg: 'bg-white dark:bg-gray-800', border: 'border-gray-200 dark:border-gray-700' },
        ].map(card => (
          <div key={card.label} className={`${card.bg} border ${card.border} rounded-xl p-4`}>
            <p className="text-xs text-gray-500 dark:text-gray-400">{card.label}</p>
            <p className={`text-2xl font-bold ${card.color} mt-1`}>{card.value}</p>
            {card.sub && <p className="text-xs text-gray-500 mt-0.5">{card.sub}</p>}
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div className="flex gap-2 mb-4">
        {['all', 'draft', 'sent', 'paid', 'cancelled'].map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filterStatus === s
                ? 'bg-[#5e5e5e] text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {s === 'all' ? (fr ? 'Toutes' : 'All') : s === 'draft' ? (fr ? 'Brouillons' : 'Drafts') : s === 'sent' ? (fr ? 'Envoyees' : 'Sent') : s === 'paid' ? (fr ? 'Payees' : 'Paid') : (fr ? 'Annulees' : 'Cancelled')}
          </button>
        ))}
      </div>

      {/* Table des factures */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center">
            <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-sm text-gray-500">{fr ? 'Chargement...' : 'Loading...'}</p>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="py-16 text-center">
            <FileText size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500 font-medium">{fr ? 'Aucune facture' : 'No invoices'}</p>
            <p className="text-sm text-gray-400 mt-1">{fr ? 'Cliquez sur "Nouvelle facture" pour commencer' : 'Click "New Invoice" to get started'}</p>
            <button onClick={startNew} className="mt-4 flex items-center gap-2 bg-[#5e5e5e] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#3e3e3e] transition-colors mx-auto">
              <Plus size={14} /> {fr ? 'Nouvelle facture' : 'New Invoice'}
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-750 border-b border-gray-200 dark:border-gray-700">
                <tr className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <th className="text-left px-4 py-3">{fr ? 'Facture' : 'Invoice'}</th>
                  <th className="text-left px-4 py-3">{fr ? 'Client' : 'Client'}</th>
                  <th className="text-left px-4 py-3">{fr ? 'Date' : 'Date'}</th>
                  <th className="text-left px-4 py-3">{fr ? 'Echeance' : 'Due Date'}</th>
                  <th className="text-right px-4 py-3">Total</th>
                  <th className="text-center px-4 py-3">{fr ? 'Statut' : 'Status'}</th>
                  <th className="text-right px-4 py-3">{fr ? 'Actions' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filteredInvoices.map(inv => {
                  const client = inv.client_snapshot as any || {}
                  const isOverdue = inv.status === 'sent' && inv.due_date && new Date(inv.due_date) < new Date()
                  return (
                    <tr key={inv.id} className={`hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors ${isOverdue ? 'bg-red-50/50 dark:bg-red-900/10' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {isOverdue && <AlertCircle size={14} className="text-red-500" />}
                          <span className="text-sm font-mono font-medium text-gray-800 dark:text-gray-200">{inv.invoice_number}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{client.name || '—'}</p>
                        {client.company && <p className="text-xs text-gray-500">{client.company}</p>}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {new Date(inv.issue_date).toLocaleDateString('fr-CA', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3">
                        {inv.due_date ? (
                          <span className={`text-sm ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-600 dark:text-gray-400'}`}>
                            {isOverdue && '⚠ '}
                            {new Date(inv.due_date).toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' })}
                          </span>
                        ) : <span className="text-gray-400 text-sm">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{fmt(inv.total)}</span>
                        {(inv.tps_amount > 0 || inv.tvq_amount > 0) && (
                          <p className="text-xs text-gray-400">
                            {fmt(inv.subtotal)} + taxes
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">{statusBadge(inv.status)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openPreview(inv)} title={fr ? 'Voir' : 'View'} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                            <Eye size={14} />
                          </button>
                          {inv.status === 'draft' && (
                            <button onClick={() => startEdit(inv)} title={fr ? 'Modifier' : 'Edit'} className="p-1.5 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors">
                              <Edit2 size={14} />
                            </button>
                          )}
                          {inv.status === 'sent' && (
                            <button onClick={() => markAsPaid(inv)} disabled={saving} title={fr ? 'Marquer payee' : 'Mark as paid'} className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50">
                              <CheckCircle size={14} />
                            </button>
                          )}
                          <button
                            onClick={async () => {
                              const { data: itemsData } = await supabase.from('invoice_items').select('*').eq('invoice_id', inv.id).order('sort_order')
                              await generatePDF({ ...inv, items: itemsData || [] })
                            }}
                            disabled={generatingPDF}
                            title={fr ? 'Telecharger PDF' : 'Download PDF'}
                            className="p-1.5 text-gray-500 hover:text-[#5e5e5e] hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                          >
                            <Download size={14} />
                          </button>
                          {(inv.status === 'draft' || inv.status === 'sent') && (
                            <button onClick={() => cancelInvoice(inv)} title={fr ? 'Annuler la facture' : 'Cancel invoice'} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                              <Ban size={14} />
                            </button>
                          )}
                          {inv.status === 'cancelled' && (
                            <button onClick={() => rectifyInvoice(inv)} title={fr ? 'Rectifier — remettre en brouillon' : 'Undo cancellation — reset to draft'} className="p-1.5 text-orange-500 hover:text-orange-700 hover:bg-orange-50 rounded-lg transition-colors">
                              <RotateCcw size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
