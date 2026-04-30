'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { CheckCircle, AlertTriangle, Calendar, RefreshCw, FileDown, ChevronDown, ChevronUp } from 'lucide-react'

interface Verification {
  id: string
  period_start: string
  period_end: string
  cc_opening_balance: number
  cc_period_in: number
  cc_period_out: number
  cc_calculated_balance: number
  cc_actual_balance: number | null
  cc_variance: number | null
  capex_opening_balance: number
  capex_period_in: number
  capex_period_out: number
  capex_calculated_balance: number
  capex_actual_balance: number | null
  capex_variance: number | null
  transaction_count: number
  notes: string | null
  status: 'verified' | 'discrepancy'
  verified_at: string
}

interface CalcResult {
  cc: { opening: number; in: number; out: number; closing: number }
  capex: { opening: number; in: number; out: number; closing: number }
  txCount: number
  transactions: any[]
}

// Logique identique à get_financial_summary (migration 120) — montants toujours positifs
const CC_INCOME = ['investissement', 'loyer', 'loyer_locatif', 'revenu', 'dividende']
const CC_EXPENSE = ['paiement', 'achat_propriete', 'capex', 'maintenance', 'admin',
                    'depense', 'remboursement_investisseur', 'courant', 'rnd']

// Contribution nette d'une transaction au compte courant
function ccContrib(t: any): number {
  const amt = Math.abs(t.amount || 0)
  // loyer_locatif ciblant CAPEX → pas dans CC
  if (t.type === 'loyer_locatif' && t.target_account === 'capex') return 0
  // transfert CC→CAPEX : sort du CC
  if (t.type === 'transfert' && t.transfer_source === 'compte_courant' && t.target_account === 'capex') return -amt
  // transfert CAPEX→CC : entre dans CC
  if (t.type === 'transfert' && t.transfer_source === 'capex' && t.target_account === 'compte_courant') return amt
  if (CC_INCOME.includes(t.type)) return amt
  if (CC_EXPENSE.includes(t.type) && t.affects_compte_courant !== false) return -amt
  return 0
}

// Contribution nette au compte CAPEX
function capexContrib(t: any): number {
  const amt = Math.abs(t.amount || 0)
  if (t.type === 'loyer_locatif' && t.target_account === 'capex') return amt
  if (t.type === 'transfert' && t.target_account === 'capex') return amt
  if (t.type === 'transfert' && t.transfer_source === 'capex') return -amt
  if (t.type === 'capex' && t.affects_compte_courant !== false) return amt
  if (t.type === 'achat_propriete' && t.target_account === 'capex') return -amt
  return 0
}

const prevMonthStart = () => {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth() - 1, 1).toISOString().split('T')[0]
}
const prevMonthEnd = () => {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 0).toISOString().split('T')[0]
}

const fmt = (n: number) =>
  n.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 2, maximumFractionDigits: 2 })

interface Props {
  onClose?: () => void
  onStatusChange?: (status: 'ok' | 'late') => void
}

export default function MonthlyControl({ onClose, onStatusChange }: Props) {
  const [startDate, setStartDate] = useState(prevMonthStart())
  const [endDate, setEndDate] = useState(prevMonthEnd())
  const [ccActual, setCcActual] = useState('')
  const [capexActual, setCapexActual] = useState('')
  const [notes, setNotes] = useState('')
  const [calcResult, setCalcResult] = useState<CalcResult | null>(null)
  const [calculating, setCalculating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [verifications, setVerifications] = useState<Verification[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [generatingPDF, setGeneratingPDF] = useState(false)

  useEffect(() => { loadVerifications() }, [])

  const loadVerifications = async () => {
    const { data } = await supabase
      .from('monthly_verifications')
      .select('*')
      .order('period_start', { ascending: false })
      .limit(24)
    const rows = data || []
    setVerifications(rows)
    if (onStatusChange) {
      const ps = prevMonthStart()
      const isOk = rows.some(v => v.period_start <= ps && v.period_end >= ps)
      onStatusChange(isOk ? 'ok' : 'late')
    }
  }

  const calculate = useCallback(async () => {
    if (!startDate || !endDate) return
    setCalculating(true)
    setCalcResult(null)
    setError(null)
    setSaved(false)
    try {
      const { data: allTx, error: txErr } = await supabase
        .from('transactions')
        .select('*')
        .lte('date', endDate + 'T23:59:59')
        .neq('status', 'cancelled')
        .order('date', { ascending: true })

      if (txErr) throw txErr
      const txs = allTx || []

      const before = txs.filter(t => (t.date || '').slice(0, 10) < startDate)
      const inPeriod = txs.filter(t => {
        const d = (t.date || '').slice(0, 10)
        return d >= startDate && d <= endDate
      })

      // Solde d'ouverture = cumul de toutes les transactions avant la période
      const ccBefore = before.reduce((s, t) => s + ccContrib(t), 0)
      const capexBefore = before.reduce((s, t) => s + capexContrib(t), 0)

      // Ventilation de la période : entrées positives, sorties = valeur absolue séparée
      const ccIn  = inPeriod.filter(t => ccContrib(t) > 0).reduce((s, t) => s + ccContrib(t), 0)
      const ccOut = inPeriod.filter(t => ccContrib(t) < 0).reduce((s, t) => s + Math.abs(ccContrib(t)), 0)
      const ccClosing = ccBefore + ccIn - ccOut

      const capexIn  = inPeriod.filter(t => capexContrib(t) > 0).reduce((s, t) => s + capexContrib(t), 0)
      const capexOut = inPeriod.filter(t => capexContrib(t) < 0).reduce((s, t) => s + Math.abs(capexContrib(t)), 0)
      const capexClosing = capexBefore + capexIn - capexOut

      setCalcResult({
        cc: { opening: ccBefore, in: ccIn, out: ccOut, closing: ccClosing },
        capex: { opening: capexBefore, in: capexIn, out: capexOut, closing: capexClosing },
        txCount: inPeriod.length,
        transactions: inPeriod,
      })
    } catch (e: any) {
      setError(e.message)
    } finally {
      setCalculating(false)
    }
  }, [startDate, endDate])

  const handleSave = async () => {
    if (!calcResult) return
    setSaving(true)
    setError(null)
    try {
      const ccActualVal = ccActual ? parseFloat(ccActual.replace(',', '.')) : null
      const capexActualVal = capexActual ? parseFloat(capexActual.replace(',', '.')) : null
      const ccVariance = ccActualVal !== null ? calcResult.cc.closing - ccActualVal : null
      const capexVariance = capexActualVal !== null ? calcResult.capex.closing - capexActualVal : null
      const hasDiscrepancy =
        (ccVariance !== null && Math.abs(ccVariance) > 0.01) ||
        (capexVariance !== null && Math.abs(capexVariance) > 0.01)

      const { error: saveErr } = await supabase.from('monthly_verifications').upsert({
        period_start: startDate,
        period_end: endDate,
        cc_opening_balance: calcResult.cc.opening,
        cc_period_in: calcResult.cc.in,
        cc_period_out: Math.abs(calcResult.cc.out),
        cc_calculated_balance: calcResult.cc.closing,
        cc_actual_balance: ccActualVal,
        cc_variance: ccVariance,
        capex_opening_balance: calcResult.capex.opening,
        capex_period_in: calcResult.capex.in,
        capex_period_out: Math.abs(calcResult.capex.out),
        capex_calculated_balance: calcResult.capex.closing,
        capex_actual_balance: capexActualVal,
        capex_variance: capexVariance,
        transaction_count: calcResult.txCount,
        notes: notes || null,
        status: hasDiscrepancy ? 'discrepancy' : 'verified',
        verified_at: new Date().toISOString(),
      }, { onConflict: 'period_start,period_end' })

      if (saveErr) {
        if (saveErr.message?.includes('relation') || saveErr.code === '42P01') {
          throw new Error('Table manquante — roulez la migration 123 dans Supabase SQL Editor (fichier: supabase/migrations-investisseur/123-monthly-verifications.sql)')
        }
        throw saveErr
      }
      setSaved(true)
      await loadVerifications()
      setTimeout(() => onClose?.(), 1200)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleExportPDF = async () => {
    if (!calcResult) return
    setGeneratingPDF(true)
    try {
      const jsPDF = (await import('jspdf')).default
      const autoTable = (await import('jspdf-autotable')).default
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

      // Logo
      try {
        const res = await fetch('/logo-cerdia3.png')
        const blob = await res.blob()
        const b64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(blob)
        })
        const img = new Image(); img.src = b64
        await new Promise<void>(r => { img.onload = () => r() })
        const ratio = img.naturalHeight / img.naturalWidth
        doc.addImage(b64, 'PNG', 15, 8, 12 / ratio, 12)
      } catch {}

      doc.setFontSize(16); doc.setTextColor(94, 94, 94)
      doc.text('Controle Mensuel', 200, 17, { align: 'right' })
      doc.setFontSize(9); doc.setTextColor(130, 130, 130)
      doc.text(`Periode: ${startDate} au ${endDate}  |  Verifie le ${new Date().toLocaleDateString('fr-CA')}`, 200, 24, { align: 'right' })
      doc.setDrawColor(94, 94, 94); doc.setLineWidth(0.5); doc.line(15, 29, 195, 29)

      const ccActualVal = ccActual ? parseFloat(ccActual.replace(',', '.')) : null
      const capexActualVal = capexActual ? parseFloat(capexActual.replace(',', '.')) : null
      const ccVar = ccActualVal !== null ? calcResult.cc.closing - ccActualVal : null
      const capexVar = capexActualVal !== null ? calcResult.capex.closing - capexActualVal : null

      // Formatage PDF : eviter les caracteres non-Latin1 (emojis, tirets longs, accents complexes)
      const fmtPDF = (n: number) => n.toLocaleString('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' $'
      const dash = '-'

      let y = 36
      doc.setFontSize(11); doc.setTextColor(60, 60, 60)
      doc.text('Recapitulatif des soldes', 15, y); y += 5

      autoTable(doc, {
        startY: y,
        head: [['', 'Compte Courant', 'CAPEX']],
        body: [
          ['Solde ouverture', fmtPDF(calcResult.cc.opening), fmtPDF(calcResult.capex.opening)],
          ['Entrees periode', fmtPDF(calcResult.cc.in), fmtPDF(calcResult.capex.in)],
          ['Sorties periode', fmtPDF(calcResult.cc.out), fmtPDF(calcResult.capex.out)],
          ['Solde calcule (systeme)', fmtPDF(calcResult.cc.closing), fmtPDF(calcResult.capex.closing)],
          ['Solde reel (releve)', ccActualVal !== null ? fmtPDF(ccActualVal) : dash, capexActualVal !== null ? fmtPDF(capexActualVal) : dash],
          ['Ecart', ccVar !== null ? fmtPDF(ccVar) : dash, capexVar !== null ? fmtPDF(capexVar) : dash],
        ],
        theme: 'grid',
        headStyles: { fillColor: [94, 94, 94], textColor: 255, fontStyle: 'bold', fontSize: 9 },
        bodyStyles: { fontSize: 9, cellPadding: 3 },
        columnStyles: { 0: { cellWidth: 70 }, 1: { cellWidth: 55, halign: 'right' }, 2: { cellWidth: 55, halign: 'right' } },
        didParseCell: (data: any) => {
          if (data.section === 'body' && data.row.index === 5) {
            const isCC = data.column.index === 1
            const val = isCC ? ccVar : capexVar
            if (val !== null) data.cell.styles.textColor = Math.abs(val) < 0.01 ? [21, 128, 61] : [185, 28, 28]
            data.cell.styles.fontStyle = 'bold'
          }
          if (data.section === 'body' && data.row.index === 3) data.cell.styles.fontStyle = 'bold'
        },
      })

      y = (doc as any).lastAutoTable.finalY + 10

      // Statut
      const isConform = (ccVar === null || Math.abs(ccVar) < 0.01) && (capexVar === null || Math.abs(capexVar) < 0.01)
      doc.setFontSize(12)
      doc.setTextColor(isConform ? 21 : 185, isConform ? 128 : 28, isConform ? 61 : 28)
      doc.text(isConform ? 'CONFORME - Soldes verifies' : 'ECART DETECTE - Verification requise', 15, y)
      y += 8

      if (notes) {
        doc.setFontSize(9); doc.setTextColor(80, 80, 80)
        doc.text(`Notes: ${notes}`, 15, y); y += 8
      }

      // Transactions de la periode
      doc.setFontSize(11); doc.setTextColor(60, 60, 60)
      doc.text(`Transactions de la periode (${calcResult.txCount})`, 15, y); y += 4

      const typeLabels: Record<string, string> = {
        investissement: 'Investissement', loyer: 'Loyer', loyer_locatif: 'Rev. locatif',
        revenu: 'Revenu', dividende: 'Dividende', paiement: 'Paiement', depense: 'Depense',
        capex: 'CAPEX', maintenance: 'Maintenance', admin: 'Admin',
        remboursement_investisseur: 'Rembours.', transfert: 'Transfert', achat_propriete: 'Achat prop.',
      }

      autoTable(doc, {
        startY: y,
        head: [['Date', 'Type', 'Description', 'Montant']],
        body: calcResult.transactions.map(t => [
          (t.date || '').slice(0, 10),
          typeLabels[t.type] || t.type,
          (t.description || '').slice(0, 60),
          fmtPDF(t.amount),
        ]),
        theme: 'striped',
        headStyles: { fillColor: [94, 94, 94], textColor: 255, fontStyle: 'bold', fontSize: 8 },
        bodyStyles: { fontSize: 7.5, cellPadding: 2 },
        columnStyles: {
          0: { cellWidth: 22 }, 1: { cellWidth: 24 }, 2: { cellWidth: 110 }, 3: { cellWidth: 24, halign: 'right' },
        },
      })

      doc.save(`controle_mensuel_${startDate}_${endDate}_CERDIA.pdf`)
    } catch (e) {
      console.error(e)
    } finally {
      setGeneratingPDF(false)
    }
  }

  const ccActualVal = ccActual ? parseFloat(ccActual.replace(',', '.')) : null
  const capexActualVal = capexActual ? parseFloat(capexActual.replace(',', '.')) : null
  const ccVar = calcResult && ccActualVal !== null ? calcResult.cc.closing - ccActualVal : null
  const capexVar = calcResult && capexActualVal !== null ? calcResult.capex.closing - capexActualVal : null
  const isConform = ccVar !== null && capexVar !== null && Math.abs(ccVar) < 0.01 && Math.abs(capexVar) < 0.01
  const hasDiscrepancy = (ccVar !== null && Math.abs(ccVar) > 0.01) || (capexVar !== null && Math.abs(capexVar) > 0.01)

  return (
    <div className="space-y-6">
      {/* Sélection de la période */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <Calendar size={16} className="text-gray-500" />
          Période de vérification
        </h4>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Date de début</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Date de fin</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400" />
          </div>
          <button
            onClick={calculate}
            disabled={calculating}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-800 text-white rounded-lg hover:bg-gray-900 disabled:opacity-50"
          >
            <RefreshCw size={14} className={calculating ? 'animate-spin' : ''} />
            {calculating ? 'Calcul...' : 'Calculer les soldes'}
          </button>
        </div>
      </div>

      {/* Résultats */}
      {calcResult && (
        <>
          {/* Grille CC + CAPEX */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Compte courant */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
              <h5 className="text-sm font-semibold text-gray-800 border-b pb-2">🏢 Compte courant</h5>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Solde d'ouverture</span>
                  <span className="font-medium">{fmt(calcResult.cc.opening)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">+ Entrées période</span>
                  <span className="text-green-600 font-medium">{fmt(calcResult.cc.in)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">− Sorties période</span>
                  <span className="text-red-600 font-medium">{fmt(calcResult.cc.out)}</span>
                </div>
                <div className="flex justify-between border-t pt-1.5 font-semibold">
                  <span>Solde calculé (système)</span>
                  <span>{fmt(calcResult.cc.closing)}</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Solde réel (relevé bancaire)</label>
                <input
                  type="number" step="0.01" value={ccActual}
                  onChange={e => setCcActual(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400"
                />
              </div>
              {ccVar !== null && (
                <div className={`flex items-center justify-between p-3 rounded-lg font-semibold text-sm ${Math.abs(ccVar) < 0.01 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  <span>{Math.abs(ccVar) < 0.01 ? '✅ Conforme' : '⚠️ Écart détecté'}</span>
                  <span>{fmt(ccVar)}</span>
                </div>
              )}
            </div>

            {/* CAPEX */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
              <h5 className="text-sm font-semibold text-gray-800 border-b pb-2">🏗️ Compte CAPEX</h5>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Solde d'ouverture</span>
                  <span className="font-medium">{fmt(calcResult.capex.opening)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">+ Entrées période</span>
                  <span className="text-green-600 font-medium">{fmt(calcResult.capex.in)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">− Sorties période</span>
                  <span className="text-red-600 font-medium">{fmt(calcResult.capex.out)}</span>
                </div>
                <div className="flex justify-between border-t pt-1.5 font-semibold">
                  <span>Solde calculé (système)</span>
                  <span>{fmt(calcResult.capex.closing)}</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Solde réel (relevé CAPEX)</label>
                <input
                  type="number" step="0.01" value={capexActual}
                  onChange={e => setCapexActual(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400"
                />
              </div>
              {capexVar !== null && (
                <div className={`flex items-center justify-between p-3 rounded-lg font-semibold text-sm ${Math.abs(capexVar) < 0.01 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  <span>{Math.abs(capexVar) < 0.01 ? '✅ Conforme' : '⚠️ Écart détecté'}</span>
                  <span>{fmt(capexVar)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Statut global */}
          {(ccVar !== null || capexVar !== null) && (
            <div className={`flex items-center gap-3 p-4 rounded-lg border ${isConform ? 'bg-green-50 border-green-300' : hasDiscrepancy ? 'bg-red-50 border-red-300' : 'bg-gray-50 border-gray-200'}`}>
              {isConform
                ? <CheckCircle size={22} className="text-green-600 flex-shrink-0" />
                : <AlertTriangle size={22} className="text-red-600 flex-shrink-0" />}
              <div className="flex-1">
                <p className={`font-semibold text-sm ${isConform ? 'text-green-800' : 'text-red-800'}`}>
                  {isConform ? '✅ CONFORME — Tous les soldes balancent' : '⚠️ ÉCART DÉTECTÉ — Vérifiez les transactions'}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{calcResult.txCount} transaction(s) dans la période</p>
              </div>
            </div>
          )}

          {/* Notes + actions */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Notes (optionnel)</label>
              <textarea
                value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                placeholder="Ex: Écart de 5$ dû à frais bancaires non enregistrés..."
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400"
              />
            </div>
            {error && <p className="text-sm text-red-600 bg-red-50 rounded p-2">{error}</p>}
            {saved && <p className="text-sm text-green-600 bg-green-50 rounded p-2">✅ Vérification enregistrée</p>}
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-800 text-white rounded-lg hover:bg-gray-900 disabled:opacity-50"
              >
                {saving ? 'Enregistrement...' : '✅ Valider et enregistrer'}
              </button>
              <button
                onClick={handleExportPDF} disabled={generatingPDF}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                <FileDown size={14} />
                {generatingPDF ? 'Génération...' : 'Exporter PDF'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Historique */}
      {verifications.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <button
            onClick={() => setShowHistory(h => !h)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            <span>Historique des contrôles ({verifications.length})</span>
            {showHistory ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {showHistory && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-gray-500">Période</th>
                    <th className="px-4 py-2 text-right font-medium text-gray-500">Solde CC calculé</th>
                    <th className="px-4 py-2 text-right font-medium text-gray-500">Solde CC réel</th>
                    <th className="px-4 py-2 text-right font-medium text-gray-500">Écart CC</th>
                    <th className="px-4 py-2 text-right font-medium text-gray-500">Solde CAPEX</th>
                    <th className="px-4 py-2 text-right font-medium text-gray-500">Écart CAPEX</th>
                    <th className="px-4 py-2 text-center font-medium text-gray-500">Statut</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500">Vérifié le</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {verifications.map(v => (
                    <tr key={v.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-gray-700 whitespace-nowrap">
                        {v.period_start} → {v.period_end}
                      </td>
                      <td className="px-4 py-2 text-right">{fmt(v.cc_calculated_balance)}</td>
                      <td className="px-4 py-2 text-right">{v.cc_actual_balance !== null ? fmt(v.cc_actual_balance) : '—'}</td>
                      <td className={`px-4 py-2 text-right font-semibold ${v.cc_variance !== null && Math.abs(v.cc_variance) < 0.01 ? 'text-green-600' : 'text-red-600'}`}>
                        {v.cc_variance !== null ? fmt(v.cc_variance) : '—'}
                      </td>
                      <td className="px-4 py-2 text-right">{fmt(v.capex_calculated_balance)}</td>
                      <td className={`px-4 py-2 text-right font-semibold ${v.capex_variance !== null && Math.abs(v.capex_variance) < 0.01 ? 'text-green-600' : 'text-red-600'}`}>
                        {v.capex_variance !== null ? fmt(v.capex_variance) : '—'}
                      </td>
                      <td className="px-4 py-2 text-center">
                        {v.status === 'verified'
                          ? <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">✅ Conforme</span>
                          : <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium">⚠️ Écart</span>}
                      </td>
                      <td className="px-4 py-2 text-gray-500 whitespace-nowrap">
                        {new Date(v.verified_at).toLocaleDateString('fr-CA')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
