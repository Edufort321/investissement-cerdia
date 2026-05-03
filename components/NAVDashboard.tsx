'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useExchangeRate } from '@/contexts/ExchangeRateContext'
import { useNAVTimeline } from '@/hooks/useNAVTimeline'
import { useFinancialSummary } from '@/hooks/useFinancialSummary'
import { FileDown, ChevronDown, ChevronUp } from 'lucide-react'
import LiabilitiesManager from './LiabilitiesManager'

interface NAVHistoryPoint {
  id: string
  snapshot_date: string
  nav_per_share: number
  net_asset_value: number
  total_investments: number
  property_purchases: number
  properties_current_value: number
  properties_appreciation: number
  total_shares: number
  cash_balance: number | null
  total_properties: number | null
  period_change_pct: number | null
  total_change_pct: number | null
  days_since_previous: number | null
}

interface NAVSummary {
  current_nav: number | null
  current_nav_per_share: number | null
  current_appreciation: number | null
  last_snapshot_date: string | null
  last_snapshot_nav_per_share: number | null
  first_snapshot_date: string | null
  first_snapshot_nav_per_share: number | null
  total_performance_pct: number | null
  since_last_snapshot_pct: number | null
  total_investments: number | null
  properties_current_value: number | null
  total_snapshots: number
  latest_snapshot_date: string | null
}

interface DetailedNAVData {
  // Flux de trésorerie
  total_investments: number | null
  property_purchases: number | null
  capex_expenses: number | null
  maintenance_expenses: number | null
  admin_expenses: number | null
  rental_income: number | null

  // Solde
  cash_balance: number | null

  // Propriétés
  properties_initial_value: number | null
  properties_current_value: number | null
  properties_appreciation: number | null

  // NAV
  total_assets: number | null
  total_liabilities: number | null
  net_asset_value: number | null
  total_shares: number | null
  nav_per_share: number | null
  nav_change_pct: number | null
}

interface PropertyValue {
  property_id: string
  property_name: string
  acquisition_cost: number | null      // p.total_cost — prix contractuel total
  paid_amount: number | null           // p.paid_amount — montant versé à ce jour
  acquisition_date: string | null
  initial_acquisition_cost: number | null
  initial_market_value: number | null
  initial_valuation_date: string | null
  current_value: number | null         // valeur appréciée de la base (peut être paid_amount)
  years_held: number | null
  appreciation_amount: number | null
  appreciation_percentage: number | null
  status: string
  currency: string
  appreciation_rate_pct: number | null // taux annuel utilisé (ex: 6.93)
}

interface InvestorMetric {
  investor_id: string
  investor_name: string
  total_invested: number
  total_shares: number
  first_investment_date: string
  total_distributions: number
  current_portfolio_value: number
  moic: number
  dpi: number
  rvpi: number
  annualized_return_pct: number | null
  unrealized_gain: number
}

export default function NAVDashboard() {
  const { rate: exchangeRate } = useExchangeRate()
  const { current: tlCurrent, pctChange: tlPct, data: tlData } = useNAVTimeline()
  const { summary: financialSummary } = useFinancialSummary(null)
  const [summary, setSummary] = useState<NAVSummary | null>(null)
  const [detailedNavData, setDetailedNavData] = useState<DetailedNAVData | null>(null)
  const [properties, setProperties] = useState<PropertyValue[]>([])
  const [history, setHistory] = useState<NAVHistoryPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [snapshotLoading, setSnapshotLoading] = useState(false)
  const [exportingPDF, setExportingPDF] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState<'all' | '6m' | '3m' | '1m'>('all')
  const [investorMetrics, setInvestorMetrics] = useState<InvestorMetric[]>([])
  const [showLiabilities, setShowLiabilities] = useState(false)
  const [showMetrics, setShowMetrics] = useState(true)

  useEffect(() => {
    loadNAVData()
  }, [])

  async function exportNAVPDF() {
    if (!summary || !tlCurrent) return
    setExportingPDF(true)
    try {
      const jsPDF = (await import('jspdf')).default
      const autoTable = (await import('jspdf-autotable')).default

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

      // Formateur ASCII-safe : pas d'espaces insécables, pas de symboles Unicode
      const safeNum = (n: number) =>
        Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
      const fmtCAD = (n: number | null | undefined) => {
        if (n == null) return '-'
        return safeNum(n) + ' $ CAD'
      }
      const fmtUSD = (n: number | null | undefined) => {
        if (n == null) return '-'
        return safeNum(n) + ' $ USD'
      }
      const fmtPct = (n: number | null | undefined) => {
        if (n == null || isNaN(n)) return '-'
        return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`
      }
      const fmtDate = (d: string | null) => {
        if (!d) return '-'
        return new Date(d).toLocaleDateString('fr-CA', { year: 'numeric', month: 'long', day: 'numeric' })
      }

      // ── Chargement logo ──────────────────────────────────────────────────────
      const loadBase64 = async (url: string) => {
        try {
          const blob = await (await fetch(url)).blob()
          return await new Promise<string>((res, rej) => {
            const r = new FileReader(); r.onloadend = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(blob)
          })
        } catch { return '' }
      }
      const getLogoSize = (b64: string, maxH: number) => new Promise<{ w: number; h: number }>(resolve => {
        const img = new Image()
        img.onload = () => { const ratio = img.naturalHeight / (img.naturalWidth || 1); resolve({ w: maxH / ratio, h: maxH }) }
        img.onerror = () => resolve({ w: maxH * 3, h: maxH })
        img.src = b64
      })
      const logo = await loadBase64('/logo-cerdia3.png')

      // ── En-tête réutilisable ─────────────────────────────────────────────────
      const addHeader = async (pageDoc: typeof doc, subtitle: string) => {
        if (logo) {
          try { const { w, h } = await getLogoSize(logo, 12); pageDoc.addImage(logo, 'PNG', 15, 8, w, h) } catch {}
        }
        pageDoc.setFontSize(18); pageDoc.setTextColor(94, 94, 94)
        pageDoc.text('Rapport NAV — Valeur Liquidative', 200, 15, { align: 'right' })
        pageDoc.setFontSize(9); pageDoc.setTextColor(130, 130, 130)
        pageDoc.text(subtitle, 200, 22, { align: 'right' })
        pageDoc.setDrawColor(94, 94, 94); pageDoc.setLineWidth(0.5)
        pageDoc.line(15, 27, 195, 27)
        return 34
      }

      const today = new Date().toLocaleDateString('fr-CA', { year: 'numeric', month: 'long', day: 'numeric' })
      const rateStr = exchangeRate ? `1 USD = ${exchangeRate.toFixed(4)} CAD` : ''
      let y = await addHeader(doc, `${today} — Taux ${rateStr}`)

      // ═══════════════════════════════════════════════════════════════════════
      // 1. KPIs PRINCIPAUX
      // ═══════════════════════════════════════════════════════════════════════
      doc.setFontSize(11); doc.setTextColor(60, 60, 60)
      doc.text('Indicateurs clés', 15, y); y += 5

      autoTable(doc, {
        startY: y,
        head: [['NAV par action', 'Performance totale', 'NAV total', 'Valeur des proprietes']],
        body: [[
          `${tlCurrent.nav_per_share.toFixed(4)} $`,
          fmtPct(tlPct),
          fmtCAD(tlCurrent.net_asset_value),
          fmtCAD(summary.properties_current_value),
        ]],
        theme: 'grid',
        headStyles: { fillColor: [94, 94, 94], textColor: 255, fontStyle: 'bold', fontSize: 9 },
        bodyStyles: { fontSize: 10, cellPadding: 4, halign: 'center' },
      })
      y = (doc as any).lastAutoTable.finalY + 8

      // ═══════════════════════════════════════════════════════════════════════
      // 2. CALCUL DÉTAILLÉ DU NAV
      // ═══════════════════════════════════════════════════════════════════════
      doc.setFontSize(11); doc.setTextColor(60, 60, 60)
      doc.text('Calcul détaillé du NAV', 15, y); y += 5

      autoTable(doc, {
        startY: y,
        head: [['', 'Valeur (CAD)']],
        body: [
          ['NAV total (tresorerie + proprietes)', fmtCAD(tlCurrent.net_asset_value)],
          ['Dettes et obligations', fmtCAD(0)],
          ['Parts totales en circulation', safeNum(tlCurrent.total_shares)],
          ['NAV par part', `${tlCurrent.nav_per_share.toFixed(4)} $`],
        ],
        theme: 'striped',
        headStyles: { fillColor: [94, 94, 94], textColor: 255, fontStyle: 'bold', fontSize: 9 },
        bodyStyles: { fontSize: 9, cellPadding: 3 },
        columnStyles: { 0: { cellWidth: 130 }, 1: { cellWidth: 50, halign: 'right' } },
      })
      y = (doc as any).lastAutoTable.finalY + 8

      // ═══════════════════════════════════════════════════════════════════════
      // 3. IMMEUBLES ET APPRÉCIATION
      // ═══════════════════════════════════════════════════════════════════════
      if (detailedNavData) {
        doc.setFontSize(11); doc.setTextColor(60, 60, 60)
        doc.text('Immeubles et Appréciation (Total)', 15, y); y += 5

        const initVal = detailedNavData.properties_initial_value ?? 0
        const apprecPct = initVal > 0 && detailedNavData.properties_appreciation != null
          ? fmtPct((detailedNavData.properties_appreciation / initVal) * 100)
          : '—'

        autoTable(doc, {
          startY: y,
          head: [['', 'Valeur (CAD)']],
          body: [
            ["Valeur d'achat (USD -> CAD)", fmtCAD(detailedNavData.properties_initial_value)],
            ['Valeur actuelle (ROI projete)', fmtCAD(detailedNavData.properties_current_value)],
            [`Gain d'appreciation (${apprecPct})`, fmtCAD(detailedNavData.properties_appreciation)],
          ],
          theme: 'striped',
          headStyles: { fillColor: [94, 94, 94], textColor: 255, fontStyle: 'bold', fontSize: 9 },
          bodyStyles: { fontSize: 9, cellPadding: 3 },
          columnStyles: { 0: { cellWidth: 130 }, 1: { cellWidth: 50, halign: 'right' } },
        })
        y = (doc as any).lastAutoTable.finalY + 8
      }

      // ═══════════════════════════════════════════════════════════════════════
      // 4. PORTFOLIO DE PROPRIÉTÉS — prix contractuel / versé / marché / gain
      // ═══════════════════════════════════════════════════════════════════════
      if (properties.length > 0) {
        doc.addPage(); y = await addHeader(doc, `${today} — Portfolio de proprietes`)

        doc.setFontSize(11); doc.setTextColor(60, 60, 60)
        doc.text(`Portfolio de Proprietes (${properties.length})`, 15, y); y += 5

        const fx = exchangeRate ?? 1
        const propRows: string[][] = []

        properties.forEach(p => {
          const purchaseCost = (p.initial_acquisition_cost ?? p.acquisition_cost) ?? 0
          const rate = (p.appreciation_rate_pct ?? 8) / 100
          const years = p.years_held ?? 0
          const estimatedValue = purchaseCost * Math.pow(1 + rate, years)
          const estimatedGain = estimatedValue - purchaseCost
          const gainPct = purchaseCost > 0 ? (estimatedGain / purchaseCost) * 100 : 0
          const paidAmount = p.paid_amount ?? 0

          const statusLabel =
            p.status === 'en_location' ? 'En location' :
            p.status === 'actif' ? 'Actif' :
            p.status === 'complete' ? 'Completee' :
            p.status === 'acquired' ? 'Acquise' :
            p.status === 'en_construction' ? 'En construction' :
            p.status === 'reservation' ? 'Reservation' : p.status

          const fmtNative = (n: number) => p.currency === 'USD' ? fmtUSD(n) : fmtCAD(n)
          const cadLine = (n: number) => p.currency === 'USD' ? fmtCAD(n * fx) : ''

          // Ligne principale: valeurs en devise native
          propRows.push([
            `${p.property_name}\n${fmtDate(p.acquisition_date)} | ${statusLabel} | ${(p.appreciation_rate_pct ?? 8).toFixed(2)}%/an`,
            fmtNative(purchaseCost),
            fmtNative(paidAmount),
            fmtNative(estimatedValue),
            fmtNative(estimatedGain),
            `+${gainPct.toFixed(2)}%`,
          ])
          // Ligne équivalent CAD (si USD)
          if (p.currency === 'USD') {
            propRows.push([
              '(equivalent CAD)',
              cadLine(purchaseCost),
              cadLine(paidAmount),
              cadLine(estimatedValue),
              cadLine(estimatedGain),
              '',
            ])
          }
        })

        autoTable(doc, {
          startY: y,
          head: [['Propriete / Details', 'Prix contractuel', 'Verse a ce jour', 'Val. marchande estimee', 'Gain latent', '% Appréc.']],
          body: propRows,
          theme: 'striped',
          headStyles: { fillColor: [94, 94, 94], textColor: 255, fontStyle: 'bold', fontSize: 8 },
          bodyStyles: { fontSize: 8, cellPadding: 2.5 },
          columnStyles: {
            0: { cellWidth: 55 },
            1: { cellWidth: 27, halign: 'right' },
            2: { cellWidth: 27, halign: 'right' },
            3: { cellWidth: 32, halign: 'right' },
            4: { cellWidth: 27, halign: 'right' },
            5: { cellWidth: 15, halign: 'center' },
          },
          didParseCell: (data) => {
            if (data.section === 'body') {
              const raw = String(data.cell.raw ?? '')
              if (raw === '(equivalent CAD)' || (data.row.cells[0] && String(data.row.cells[0].raw ?? '') === '(equivalent CAD)')) {
                data.cell.styles.textColor = [100, 130, 170]
                data.cell.styles.fontSize = 7
              }
            }
          },
        })
        y = (doc as any).lastAutoTable.finalY + 8
      }

      // ═══════════════════════════════════════════════════════════════════════
      // 5. FLUX DE TRÉSORERIE
      // ═══════════════════════════════════════════════════════════════════════
      if (detailedNavData) {
        if (y > 220) { doc.addPage(); y = await addHeader(doc, `${today} — Taux ${rateStr}`) }

        doc.setFontSize(11); doc.setTextColor(60, 60, 60)
        doc.text('Flux de trésorerie', 15, y); y += 5

        const totalEntrees = (detailedNavData.total_investments ?? 0) + (detailedNavData.rental_income ?? 0)
        const totalSorties = (detailedNavData.property_purchases ?? 0) + (detailedNavData.capex_expenses ?? 0) +
          (detailedNavData.maintenance_expenses ?? 0) + (detailedNavData.admin_expenses ?? 0)

        autoTable(doc, {
          startY: y,
          head: [['Poste', 'Montant (CAD)']],
          body: [
            ['>> ENTREES', ''],
            ['Investissements des commanditaires', fmtCAD(detailedNavData.total_investments)],
            ['Revenus locatifs', fmtCAD(detailedNavData.rental_income)],
            ['Total Entrees', fmtCAD(totalEntrees)],
            ['>> SORTIES', ''],
            ['Achats de proprietes', fmtCAD(detailedNavData.property_purchases)],
            ['CAPEX (ameliorations)', fmtCAD(detailedNavData.capex_expenses)],
            ['Maintenance', fmtCAD(detailedNavData.maintenance_expenses)],
            ['Administration', fmtCAD(detailedNavData.admin_expenses)],
            ['Total Sorties', fmtCAD(totalSorties)],
            ['Solde du compte courant', fmtCAD(financialSummary?.compte_courant_balance ?? null)],
          ],
          theme: 'striped',
          headStyles: { fillColor: [94, 94, 94], textColor: 255, fontStyle: 'bold', fontSize: 9 },
          bodyStyles: { fontSize: 9, cellPadding: 3 },
          columnStyles: { 0: { cellWidth: 130 }, 1: { cellWidth: 50, halign: 'right' } },
          didParseCell: (data) => {
            const label = String(data.cell.raw ?? '')
            if (label.startsWith('>>')) {
              data.cell.styles.fillColor = [230, 230, 230]
              data.cell.styles.fontStyle = 'bold'
            }
            if (label.startsWith('Total') || label === 'Solde du compte courant') {
              data.cell.styles.fontStyle = 'bold'
            }
          },
        })
        y = (doc as any).lastAutoTable.finalY + 8
      }

      // ═══════════════════════════════════════════════════════════════════════
      // 6. HISTORIQUE MENSUEL DU NAV (nouvelle page)
      // ═══════════════════════════════════════════════════════════════════════
      if (tlData.length > 0) {
        doc.addPage()
        y = await addHeader(doc, `${today} — Historique complet`)

        doc.setFontSize(11); doc.setTextColor(60, 60, 60)
        doc.text('Historique mensuel du NAV', 15, y); y += 5

        const histRows = [...tlData].reverse().map((point, idx, arr) => {
          const prevPoint = arr[idx + 1]
          const firstPoint = tlData[0]
          const periodPct = prevPoint
            ? (point.nav_per_share - prevPoint.nav_per_share) / prevPoint.nav_per_share * 100
            : null
          const totalPct = firstPoint && firstPoint.nav_per_share > 0
            ? (point.nav_per_share - firstPoint.nav_per_share) / firstPoint.nav_per_share * 100
            : null
          return [
            new Date(point.point_date + 'T00:00:00').toLocaleDateString('fr-CA', { year: 'numeric', month: 'long' }) + (idx === 0 ? ' (actuel)' : ''),
            `${point.nav_per_share.toFixed(4)} $`,
            periodPct == null ? '-' : `${periodPct >= 0 ? '+' : ''}${periodPct.toFixed(2)}%`,
            totalPct == null ? '-' : `${totalPct >= 0 ? '+' : ''}${totalPct.toFixed(2)}%`,
            fmtCAD(point.net_asset_value),
            safeNum(point.total_shares),
          ]
        })

        autoTable(doc, {
          startY: y,
          head: [['Mois', 'NAV / part', 'Var. mensuelle', 'Var. totale', 'NAV total', 'Parts']],
          body: histRows,
          theme: 'striped',
          headStyles: { fillColor: [94, 94, 94], textColor: 255, fontStyle: 'bold', fontSize: 9 },
          bodyStyles: { fontSize: 8.5, cellPadding: 3 },
          columnStyles: {
            0: { cellWidth: 50 },
            1: { cellWidth: 28, halign: 'right' },
            2: { cellWidth: 28, halign: 'right' },
            3: { cellWidth: 28, halign: 'right' },
            4: { cellWidth: 35, halign: 'right' },
            5: { cellWidth: 22, halign: 'right' },
          },
          didParseCell: (data) => {
            if (data.row.index === 0 && data.section === 'body') {
              data.cell.styles.fillColor = [235, 245, 255]
              data.cell.styles.fontStyle = 'bold'
            }
          },
        })
      }

      // ── Pied de page ─────────────────────────────────────────────────────────
      const pageCount = doc.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.3)
        doc.line(15, 280, 195, 280)
        doc.setFontSize(8); doc.setTextColor(130, 130, 130)
        doc.text('CERDIA — Rapport NAV confidentiel', 105, 285, { align: 'center' })
        doc.text(`Page ${i} sur ${pageCount}`, 105, 290, { align: 'center' })
        doc.text(`Généré le ${today}`, 200, 290, { align: 'right' })
      }

      doc.save(`NAV_CERDIA_${new Date().toISOString().split('T')[0]}.pdf`)
    } catch (err: any) {
      alert('Erreur lors de la génération du PDF: ' + err.message)
    } finally {
      setExportingPDF(false)
    }
  }

  async function loadNAVData() {
    try {
      setLoading(true)
      setError(null)

      // Calculer le NAV actuel EN TEMPS RÉEL basé sur les transactions
      const { data: currentNavRaw, error: navError } = await supabase
        .rpc('calculate_realistic_nav_v2', {
          p_target_date: new Date().toISOString().split('T')[0]
        })

      if (navError) {
        console.error('Erreur calcul NAV actuel:', navError)
        throw navError
      }

      // La fonction RPC retourne un array avec un objet dedans: [{...}]
      // Extraire le premier élément
      const currentNavData = Array.isArray(currentNavRaw) && currentNavRaw.length > 0
        ? currentNavRaw[0]
        : null

      if (!currentNavData) {
        throw new Error('Aucune donnée NAV retournée par calculate_realistic_nav_v2')
      }

      // Charger l'historique des snapshots (pour le graphique)
      const { data: historyData, error: historyError } = await supabase
        .from('nav_history')
        .select('*')
        .order('snapshot_date', { ascending: true })

      if (historyError && historyError.code !== 'PGRST116') throw historyError
      setHistory(historyData || [])

      // Construire le summary à partir du NAV actuel + historique
      if (currentNavData) {
        const firstSnapshot = historyData && historyData.length > 0 ? historyData[0] : null
        const lastSnapshot = historyData && historyData.length > 0 ? historyData[historyData.length - 1] : null

        const summaryData: NAVSummary = {
          current_nav: currentNavData.net_asset_value,
          current_nav_per_share: currentNavData.nav_per_share,
          current_appreciation: currentNavData.properties_appreciation,
          last_snapshot_date: lastSnapshot?.snapshot_date || null,
          last_snapshot_nav_per_share: lastSnapshot?.nav_per_share || null,
          first_snapshot_date: firstSnapshot?.snapshot_date || null,
          first_snapshot_nav_per_share: firstSnapshot?.nav_per_share || null,
          total_performance_pct: firstSnapshot && currentNavData.nav_per_share != null && firstSnapshot.nav_per_share
            ? ((currentNavData.nav_per_share - firstSnapshot.nav_per_share) / firstSnapshot.nav_per_share * 100)
            : null,
          since_last_snapshot_pct: lastSnapshot && currentNavData.nav_per_share != null && lastSnapshot.nav_per_share
            ? ((currentNavData.nav_per_share - lastSnapshot.nav_per_share) / lastSnapshot.nav_per_share * 100)
            : null,
          total_investments: currentNavData.total_investments,
          properties_current_value: currentNavData.properties_current_value,
          total_snapshots: historyData?.length || 0,
          latest_snapshot_date: lastSnapshot?.snapshot_date || null
        }

        setSummary(summaryData)
      }

      // Stocker les données détaillées pour affichage
      setDetailedNavData(currentNavData)

      // Charger les détails de chaque propriété
      const { data: propertiesData, error: propertiesError } = await supabase
        .from('current_property_values')
        .select('*')
        .order('acquisition_date', { ascending: false })

      if (propertiesError) {
        console.error('Erreur chargement propriétés:', propertiesError)
      } else {
        setProperties(propertiesData || [])
      }

      // Métriques LP
      const { data: metricsData } = await supabase
        .from('investor_performance_metrics')
        .select('*')
      setInvestorMetrics(metricsData || [])

    } catch (err: any) {
      console.error('Error loading NAV data:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function createSnapshot() {
    try {
      setSnapshotLoading(true)
      setError(null)

      const { data, error } = await supabase.rpc('snapshot_nav', {
        p_snapshot_date: new Date().toISOString().split('T')[0]
      })

      if (error) throw error

      // Recharger les données
      await loadNAVData()
      alert('Snapshot créé avec succès!')

    } catch (err: any) {
      console.error('Error creating snapshot:', err)
      setError(err.message)
      alert('Erreur lors de la création du snapshot: ' + err.message)
    } finally {
      setSnapshotLoading(false)
    }
  }

  function formatCurrency(amount: number | null | undefined): string {
    if (amount == null) return '-'
    return new Intl.NumberFormat('fr-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  function formatPercent(pct: number | null | undefined): string {
    if (pct == null || isNaN(pct)) return '-'
    const sign = pct >= 0 ? '+' : ''
    return `${sign}${pct.toFixed(2)}%`
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('fr-CA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  function getFilteredHistory(): NAVHistoryPoint[] {
    if (selectedPeriod === 'all') return history

    const now = new Date()
    const cutoffDate = new Date()

    switch (selectedPeriod) {
      case '1m':
        cutoffDate.setMonth(now.getMonth() - 1)
        break
      case '3m':
        cutoffDate.setMonth(now.getMonth() - 3)
        break
      case '6m':
        cutoffDate.setMonth(now.getMonth() - 6)
        break
    }

    return history.filter(point => new Date(point.snapshot_date) >= cutoffDate)
  }

  function getPerformanceColor(pct: number | null | undefined): string {
    if (pct == null) return 'text-gray-600'
    if (pct > 0) return 'text-green-600'
    if (pct < 0) return 'text-red-600'
    return 'text-gray-600'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement du NAV...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-red-800 font-semibold mb-2">Erreur</h3>
        <p className="text-red-700">{error}</p>
        <button
          onClick={loadNAVData}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Réessayer
        </button>
      </div>
    )
  }

  if (!summary) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-red-800 font-semibold mb-2">❌ Erreur de configuration NAV</h3>
        <p className="text-red-700 mb-4">
          Le système NAV ne peut pas calculer la valeur actuelle. Cela signifie que les migrations NAV ne sont pas exécutées sur Supabase.
        </p>
        <div className="bg-white rounded p-4 mb-4">
          <p className="text-sm text-gray-700 mb-2"><strong>📋 Migrations requises:</strong></p>
          <ol className="text-sm text-gray-700 list-decimal list-inside space-y-1">
            <li>Migration 85: <code className="bg-gray-100 px-2 py-1 rounded">85-fix-nav-use-correct-schema.sql</code></li>
            <li>Migration 97: <code className="bg-gray-100 px-2 py-1 rounded">97-add-nav-history-tracking.sql</code></li>
          </ol>
        </div>
        <button
          onClick={loadNAVData}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          🔄 Réessayer
        </button>
      </div>
    )
  }

  const filteredHistory = getFilteredHistory()

  return (
    <div className="space-y-6">
      {/* En-tête avec boutons */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Valeur Liquidative (NAV)</h2>
          <p className="text-sm text-gray-600 mt-1">
            Calculé en temps réel — taux USD/CAD live: <strong>1 USD = {exchangeRate?.toFixed(4) ?? '...'} CAD</strong>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={exportNAVPDF}
            disabled={exportingPDF || !summary}
            className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            <FileDown size={18} />
            {exportingPDF ? 'Génération...' : 'Exporter PDF'}
          </button>
          <button
            onClick={createSnapshot}
            disabled={snapshotLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {snapshotLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Création...
              </>
            ) : (
              <>
                <span>📸</span>
                Créer un snapshot
              </>
            )}
          </button>
        </div>
      </div>

      {/* Avertissement migration manquante */}
      {summary && summary.current_nav_per_share == null && (
        <div className="bg-amber-50 border border-amber-300 rounded-lg p-4">
          <h4 className="text-amber-900 font-semibold mb-1">⚠️ Migration NAV incomplète</h4>
          <p className="text-sm text-amber-800 mb-2">
            La vue <code className="bg-amber-100 px-1 rounded">current_property_values</code> est manquante sur Supabase.
            Appliquez la migration <strong>107-nav-multidevise-construction.sql</strong> dans Supabase SQL Editor pour restaurer le NAV complet.
          </p>
          <p className="text-xs text-amber-700">
            Les données de transactions sont intactes. Seul le calcul de valeur des propriétés est affecté.
          </p>
        </div>
      )}

      {/* KPIs principaux — source: get_nav_timeline() */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* NAV par action actuel */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="text-sm text-gray-600 mb-1">NAV par action</div>
          <div className="text-3xl font-bold text-blue-600">
            {tlCurrent ? `${tlCurrent.nav_per_share.toFixed(4)} $` : '—'}
          </div>
          <div className={`text-sm mt-2 ${getPerformanceColor(tlPct)}`}>
            {tlPct >= 0 ? '+' : ''}{tlPct.toFixed(2)}% depuis lancement
          </div>
        </div>

        {/* Performance totale */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="text-sm text-gray-600 mb-1">Performance totale</div>
          <div className={`text-3xl font-bold ${getPerformanceColor(tlPct)}`}>
            {tlPct >= 0 ? '+' : ''}{tlPct.toFixed(2)}%
          </div>
          <div className="text-sm text-gray-600 mt-2">
            Depuis {tlData.length > 0 ? formatDate(tlData[0].point_date) : '—'}
          </div>
        </div>

        {/* NAV total */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="text-sm text-gray-600 mb-1">NAV total</div>
          <div className="text-3xl font-bold text-gray-900">
            {formatCurrency(tlCurrent?.net_asset_value ?? null)}
          </div>
          <div className="text-sm text-gray-600 mt-2">
            {formatCurrency(summary.current_appreciation)} d'appréciation
          </div>
        </div>

        {/* Valeur des propriétés */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="text-sm text-gray-600 mb-1">Valeur des propriétés</div>
          <div className="text-3xl font-bold text-gray-900">
            {formatCurrency(summary.properties_current_value)}
          </div>
          <div className="text-sm text-gray-600 mt-2">
            {formatCurrency(summary.total_investments)} investis
          </div>
        </div>
      </div>

      {/* Section détaillée: Calcul NAV — utilise get_nav_timeline() */}
      {tlCurrent && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">🧮 Calcul détaillé du NAV</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Actifs — NAV total = actifs nets (get_nav_timeline: cash + prop appreciation) */}
            <div>
              <h4 className="text-md font-semibold text-green-700 mb-3">💰 ACTIFS</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">NAV total (trésorerie + propriétés)</span>
                  <span className="text-sm font-medium text-gray-900">{formatCurrency(tlCurrent.net_asset_value)}</span>
                </div>
                <div className="border-t border-gray-200 pt-2 flex justify-between items-center">
                  <span className="text-sm font-semibold text-gray-900">Total Actifs</span>
                  <span className="text-sm font-bold text-green-600">{formatCurrency(tlCurrent.net_asset_value)}</span>
                </div>
              </div>
            </div>

            {/* Passifs */}
            <div>
              <h4 className="text-md font-semibold text-red-700 mb-3">💳 PASSIFS</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Hypothèques et prêts actifs</span>
                  <span className="text-sm font-medium text-red-700">{formatCurrency(detailedNavData?.total_liabilities ?? 0)}</span>
                </div>
                <div className="border-t border-gray-200 pt-2 flex justify-between items-center">
                  <span className="text-sm font-semibold text-gray-900">Total Passifs</span>
                  <span className="text-sm font-bold text-red-600">{formatCurrency(detailedNavData?.total_liabilities ?? 0)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* NAV final — valeurs de get_nav_timeline() */}
          <div className="mt-6 pt-6 border-t-2 border-gray-300">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-sm text-gray-600 mb-1">NAV Total</div>
                  <div className="text-2xl font-bold text-blue-600">{formatCurrency(tlCurrent.net_asset_value)}</div>
                  <div className="text-xs text-gray-500 mt-1">Source: get_nav_timeline()</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-600 mb-1">Parts totales</div>
                  <div className="text-2xl font-bold text-gray-900">{tlCurrent.total_shares.toFixed(2)}</div>
                  <div className="text-xs text-gray-500 mt-1">Actions en circulation</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-600 mb-1">NAV par part</div>
                  <div className="text-2xl font-bold text-blue-600">{tlCurrent.nav_per_share.toFixed(4)} $</div>
                  <div className="text-xs text-gray-500 mt-1">Valeur de chaque action</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section: Propriétés et Appréciation */}
      {detailedNavData && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">🏢 Immeubles et Appréciation (Total)</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Valeur d'achat (USD → CAD)</div>
              <div className="text-xl font-bold text-gray-900">{formatCurrency(detailedNavData.properties_initial_value)}</div>
              <div className="text-xs text-gray-500 mt-1">Prix payé pour les propriétés</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Valeur actuelle (ROI projeté/an)</div>
              <div className="text-xl font-bold text-green-600">{formatCurrency(detailedNavData.properties_current_value)}</div>
              <div className="text-xs text-gray-500 mt-1">expected_roi → scénario → 8% défaut</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Gain d'appréciation</div>
              <div className="text-xl font-bold text-blue-600">{formatCurrency(detailedNavData.properties_appreciation)}</div>
              <div className="text-xs text-green-600 mt-1">
                {(detailedNavData.properties_initial_value ?? 0) > 0 && detailedNavData.properties_appreciation != null
                  ? `+${((detailedNavData.properties_appreciation / detailedNavData.properties_initial_value!) * 100).toFixed(2)}%`
                  : '-'}
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div className="flex-1">
                <h4 className="font-semibold text-yellow-900 mb-1">Taux d'appréciation par propriété</h4>
                <p className="text-sm text-yellow-800 mb-2">
                  Chaque propriété utilise son propre taux dans cet ordre de priorité:
                </p>
                <ol className="text-sm text-yellow-800 space-y-1 ml-4 list-decimal">
                  <li><strong>ROI attendu</strong> (champ <em>expected_roi</em> de la propriété)</li>
                  <li><strong>Taux du scénario</strong> (champ <em>annual_appreciation</em> de l'Évaluateur lié)</li>
                  <li><strong>8% par défaut</strong> si aucun des deux n'est défini</li>
                </ol>
                <p className="text-xs text-yellow-700 mt-2">
                  💡 Pour un NAV précis: créez une évaluation initiale (Admin → Évaluations) avec le prix d'achat réel. Puis réévaluez aux 2 ans.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section: Portfolio détaillé par propriété */}
      {properties.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">🏘️ Portfolio de Propriétés ({properties.length})</h3>
            <div className="text-sm text-gray-600">
              Détails de chaque propriété avec prise de valeur
            </div>
          </div>

          <div className="space-y-4">
            {properties.map((property) => {
              const fx = exchangeRate ?? 1
              // Prix contractuel total (ce qui a été signé)
              const purchaseCost = property.initial_acquisition_cost ?? property.acquisition_cost ?? 0
              // Valeur marchande estimée = prix contractuel × (1 + taux annuel)^années
              const rate = (property.appreciation_rate_pct ?? 8) / 100
              const years = property.years_held ?? 0
              const estimatedValue = purchaseCost * Math.pow(1 + rate, years)
              const estimatedGain = estimatedValue - purchaseCost
              const estimatedGainPct = purchaseCost > 0 ? (estimatedGain / purchaseCost) * 100 : 0
              // Montant versé à ce jour
              const paidAmount = property.paid_amount ?? 0

              const fmtVal = (n: number) => {
                const formatted = formatCurrency(n)
                return property.currency === 'USD' ? `${formatted} USD` : formatted
              }
              const fmtCad = (n: number) => `≈ ${formatCurrency(n * fx)} CAD`

              return (
                <div key={property.property_id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                  {/* En-tête propriété */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h4 className="text-base font-semibold text-gray-900">{property.property_name}</h4>
                      <div className="flex flex-wrap items-center gap-3 mt-1">
                        <span className="text-xs text-gray-500">
                          Acquise le {formatDate(property.acquisition_date)}
                        </span>
                        <span className="text-xs text-gray-500">
                          {years > 0 ? `${years.toFixed(1)} an${years >= 2 ? 's' : ''} détenus` : ''}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded font-medium ${
                          property.status === 'en_location' || property.status === 'actif' ? 'bg-green-100 text-green-700' :
                          property.status === 'complete' || property.status === 'acquired' ? 'bg-blue-100 text-blue-700' :
                          property.status === 'en_construction' ? 'bg-orange-100 text-orange-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {property.status === 'en_location' ? 'En location' :
                           property.status === 'actif' ? 'Actif' :
                           property.status === 'complete' ? 'Complétée' :
                           property.status === 'acquired' ? 'Acquise' :
                           property.status === 'en_construction' ? 'En construction' :
                           property.status === 'reservation' ? 'Réservation' :
                           property.status}
                        </span>
                        <span className="text-xs text-gray-400">
                          Taux: {(property.appreciation_rate_pct ?? 8).toFixed(2)}%/an · Devise: {property.currency}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 5 cartes de valeurs */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">

                    {/* 1. Prix contractuel */}
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                      <div className="text-xs font-medium text-gray-500 mb-1">Prix contractuel</div>
                      <div className="text-sm font-bold text-gray-900">{fmtVal(purchaseCost)}</div>
                      {property.currency === 'USD' && (
                        <div className="text-xs text-gray-400 mt-1">{fmtCad(purchaseCost)}</div>
                      )}
                      <div className="text-xs text-gray-400 mt-1">Valeur totale signée</div>
                    </div>

                    {/* 2. Montant versé */}
                    <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                      <div className="text-xs font-medium text-yellow-700 mb-1">Versé à ce jour</div>
                      <div className="text-sm font-bold text-yellow-900">{fmtVal(paidAmount)}</div>
                      {property.currency === 'USD' && (
                        <div className="text-xs text-yellow-600 mt-1">{fmtCad(paidAmount)}</div>
                      )}
                      <div className="text-xs text-yellow-600 mt-1">
                        {purchaseCost > 0 ? `${((paidAmount / purchaseCost) * 100).toFixed(0)}% du total` : '—'}
                      </div>
                    </div>

                    {/* 3. Valeur marchande estimée */}
                    <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                      <div className="text-xs font-medium text-green-700 mb-1">Valeur marchande estimée</div>
                      <div className="text-sm font-bold text-green-700">{fmtVal(estimatedValue)}</div>
                      {property.currency === 'USD' && (
                        <div className="text-xs text-green-500 mt-1">{fmtCad(estimatedValue)}</div>
                      )}
                      <div className="text-xs text-green-600 mt-1">Prix × (1 + {(property.appreciation_rate_pct ?? 8).toFixed(2)}%)^{years.toFixed(1)}an</div>
                    </div>

                    {/* 4. Gain latent */}
                    <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                      <div className="text-xs font-medium text-blue-700 mb-1">Gain latent</div>
                      <div className="text-sm font-bold text-blue-700">{fmtVal(estimatedGain)}</div>
                      {property.currency === 'USD' && (
                        <div className="text-xs text-blue-500 mt-1">{fmtCad(estimatedGain)}</div>
                      )}
                      <div className="text-xs text-blue-600 mt-1">Sur prix contractuel</div>
                    </div>

                    {/* 5. % Appréciation */}
                    <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                      <div className="text-xs font-medium text-purple-700 mb-1">% Appréciation</div>
                      <div className="text-xl font-bold text-purple-700">
                        {estimatedGainPct >= 0 ? '+' : ''}{estimatedGainPct.toFixed(2)}%
                      </div>
                      <div className="text-xs text-purple-600 mt-1">Depuis acquisition</div>
                    </div>
                  </div>

                  {/* Date évaluation initiale si disponible */}
                  {property.initial_valuation_date && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <span className="text-xs text-gray-500">
                        Évaluation initiale enregistrée : {formatDate(property.initial_valuation_date)}
                      </span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Note */}
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-800">
              <strong>Valeur marchande estimée</strong> = prix contractuel × (1 + taux annuel)^années détenues.
              Taux par propriété : <em>expected_roi</em> → <em>annual_appreciation</em> du scénario lié → 8% par défaut.
              Valeurs USD converties au taux live (1 USD = {exchangeRate?.toFixed(4) ?? '...'} CAD).
            </p>
          </div>
        </div>
      )}

      {/* Section: Flux de trésorerie */}
      {detailedNavData && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">💸 Flux de trésorerie</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Entrées */}
            <div>
              <h4 className="text-md font-semibold text-green-700 mb-3">📥 ENTRÉES</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Investissements des commanditaires</span>
                  <span className="text-sm font-medium text-green-600">{formatCurrency(detailedNavData.total_investments)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Revenus locatifs</span>
                  <span className="text-sm font-medium text-green-600">{formatCurrency(detailedNavData.rental_income)}</span>
                </div>
                <div className="border-t border-gray-200 pt-2 flex justify-between items-center">
                  <span className="text-sm font-semibold text-gray-900">Total Entrées</span>
                  <span className="text-sm font-bold text-green-600">
                    {formatCurrency((detailedNavData.total_investments ?? 0) + (detailedNavData.rental_income ?? 0))}
                  </span>
                </div>
              </div>
            </div>

            {/* Sorties */}
            <div>
              <h4 className="text-md font-semibold text-red-700 mb-3">📤 SORTIES</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Achats de propriétés</span>
                  <span className="text-sm font-medium text-red-600">{formatCurrency(detailedNavData.property_purchases)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">CAPEX (améliorations)</span>
                  <span className="text-sm font-medium text-red-600">{formatCurrency(detailedNavData.capex_expenses)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Maintenance</span>
                  <span className="text-sm font-medium text-red-600">{formatCurrency(detailedNavData.maintenance_expenses)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Administration</span>
                  <span className="text-sm font-medium text-red-600">{formatCurrency(detailedNavData.admin_expenses)}</span>
                </div>
                <div className="border-t border-gray-200 pt-2 flex justify-between items-center">
                  <span className="text-sm font-semibold text-gray-900">Total Sorties</span>
                  <span className="text-sm font-bold text-red-600">
                    {formatCurrency(
                      (detailedNavData.property_purchases ?? 0) +
                      (detailedNavData.capex_expenses ?? 0) +
                      (detailedNavData.maintenance_expenses ?? 0) +
                      (detailedNavData.admin_expenses ?? 0)
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Solde compte courant — source: get_financial_summary() identique à FinancialKPIs */}
          <div className="mt-6 pt-6 border-t-2 border-gray-300">
            <div className={`rounded-lg p-4 ${(financialSummary?.compte_courant_balance ?? 0) >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-600 mb-1">💰 Solde du compte courant</div>
                  <div className="text-xs text-gray-500">Entrées - Sorties (toutes années)</div>
                </div>
                <div className={`text-3xl font-bold ${(financialSummary?.compte_courant_balance ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(financialSummary?.compte_courant_balance ?? null)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Graphique historique — source: get_nav_timeline() */}
      {(() => {
        const now = new Date()
        const cutoff = new Date()
        switch (selectedPeriod) {
          case '1m': cutoff.setMonth(now.getMonth() - 1); break
          case '3m': cutoff.setMonth(now.getMonth() - 3); break
          case '6m': cutoff.setMonth(now.getMonth() - 6); break
          default: cutoff.setFullYear(2000)
        }
        const filtered = tlData.filter(p => new Date(p.point_date + 'T00:00:00') >= cutoff)
        const maxNav = filtered.length > 0 ? Math.max(...filtered.map(p => p.nav_per_share)) : 1

        return (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Évolution du NAV</h3>
              <div className="flex gap-2">
                {(['1m', '3m', '6m', 'all'] as const).map(period => (
                  <button
                    key={period}
                    onClick={() => setSelectedPeriod(period)}
                    className={`px-3 py-1 text-sm rounded ${
                      selectedPeriod === period
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {period === 'all' ? 'Tout' : period.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p className="mb-2">Aucune donnée pour cette période</p>
                <p className="text-sm">Essayez une période plus large</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <div className="min-w-full">
                    {filtered.map((point, idx) => {
                      const barWidth = maxNav > 0 ? (point.nav_per_share / maxNav) * 100 : 0
                      const prev = idx > 0 ? filtered[idx - 1].nav_per_share : (tlData[0]?.nav_per_share ?? point.nav_per_share)
                      const periodPct = prev > 0 ? ((point.nav_per_share - prev) / prev * 100) : 0
                      const isPositive = periodPct >= 0

                      return (
                        <div key={point.point_date} className="mb-3">
                          <div className="flex items-center gap-4">
                            <div className="w-24 text-sm text-gray-600 flex-shrink-0">
                              {new Date(point.point_date + 'T00:00:00').toLocaleDateString('fr-CA', {
                                month: 'short', year: '2-digit'
                              })}
                            </div>
                            <div className="flex-1 relative">
                              <div
                                className="h-7 bg-gradient-to-r from-blue-500 to-blue-600 rounded transition-all duration-300 min-w-[3rem]"
                                style={{ width: `${barWidth}%` }}
                              >
                                <div className="absolute inset-0 flex items-center px-2">
                                  <span className="text-white text-xs font-semibold whitespace-nowrap">
                                    {point.nav_per_share.toFixed(4)} $
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className={`w-20 text-xs text-right flex-shrink-0 font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                              {idx === 0 ? '—' : `${isPositive ? '+' : ''}${periodPct.toFixed(2)}%`}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
                  <div className="text-center">
                    <div className="text-xs text-gray-500 mb-1">Plus bas</div>
                    <div className="text-base font-semibold text-gray-900">
                      {Math.min(...filtered.map(p => p.nav_per_share)).toFixed(4)} $
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-500 mb-1">Moyenne</div>
                    <div className="text-base font-semibold text-gray-900">
                      {(filtered.reduce((s, p) => s + p.nav_per_share, 0) / filtered.length).toFixed(4)} $
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-500 mb-1">Plus haut</div>
                    <div className="text-base font-semibold text-gray-900">
                      {Math.max(...filtered.map(p => p.nav_per_share)).toFixed(4)} $
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      })()}

      {/* Tableau détaillé — source: get_nav_timeline() */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Historique mensuel du NAV</h3>

        {tlData.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="mb-2">Aucune donnée disponible</p>
            <p className="text-sm">Ajoutez des transactions pour voir l'historique</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mois</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">NAV / part</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Var. mensuelle</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Var. totale</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">NAV total</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Parts</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {[...tlData].reverse().map((point, idx, arr) => {
                  const prevPoint = arr[idx + 1]
                  const firstPoint = tlData[0]
                  const periodPct = prevPoint
                    ? (point.nav_per_share - prevPoint.nav_per_share) / prevPoint.nav_per_share * 100
                    : null
                  const totalPct = firstPoint && firstPoint.nav_per_share > 0
                    ? (point.nav_per_share - firstPoint.nav_per_share) / firstPoint.nav_per_share * 100
                    : null
                  const isLast = idx === 0

                  return (
                    <tr key={point.point_date} className={`hover:bg-gray-50 ${isLast ? 'font-semibold bg-blue-50' : ''}`}>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {new Date(point.point_date + 'T00:00:00').toLocaleDateString('fr-CA', {
                          year: 'numeric', month: 'long'
                        })}
                        {isLast && <span className="ml-2 text-xs text-blue-600 font-normal">actuel</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                        {point.nav_per_share.toFixed(4)} $
                      </td>
                      <td className={`px-4 py-3 text-sm text-right font-medium ${periodPct == null ? 'text-gray-400' : periodPct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {periodPct == null ? '—' : `${periodPct >= 0 ? '+' : ''}${periodPct.toFixed(2)}%`}
                      </td>
                      <td className={`px-4 py-3 text-sm text-right font-medium ${totalPct == null ? 'text-gray-400' : totalPct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {totalPct == null ? '—' : `${totalPct >= 0 ? '+' : ''}${totalPct.toFixed(2)}%`}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900">
                        {formatCurrency(point.net_asset_value)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-600">
                        {point.total_shares.toLocaleString('fr-CA', { maximumFractionDigits: 0 })}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Section: Passifs (Liabilities Manager) */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <button
          onClick={() => setShowLiabilities(v => !v)}
          className="w-full flex items-center justify-between text-left"
        >
          <h3 className="text-lg font-semibold text-gray-900">
            💳 Gestion des passifs
            {detailedNavData?.total_liabilities != null && detailedNavData.total_liabilities > 0 && (
              <span className="ml-2 text-sm font-normal text-red-600">
                ({formatCurrency(detailedNavData.total_liabilities)} actifs)
              </span>
            )}
          </h3>
          {showLiabilities ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
        </button>
        {showLiabilities && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <LiabilitiesManager
              exchangeRate={exchangeRate ?? 1.40}
              onTotalChange={() => loadNAVData()}
            />
          </div>
        )}
      </div>

      {/* Section: Métriques LP (MOIC, DPI, RVPI) */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <button
          onClick={() => setShowMetrics(v => !v)}
          className="w-full flex items-center justify-between text-left"
        >
          <h3 className="text-lg font-semibold text-gray-900">
            📊 Métriques investisseurs (MOIC / DPI / RVPI)
          </h3>
          {showMetrics ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
        </button>

        {showMetrics && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            {investorMetrics.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                Aucun investisseur actif trouvé, ou la vue <code>investor_performance_metrics</code> n'est pas encore installée (migration 121).
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Investisseur</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Capital investi</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Valeur actuelle</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Gain latent</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">MOIC</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">DPI</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">RVPI</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Rend. annualisé</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {investorMetrics.map(m => (
                      <tr key={m.investor_id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-medium text-gray-900">{m.investor_name}</td>
                        <td className="px-3 py-2 text-right text-gray-700">{formatCurrency(m.total_invested)}</td>
                        <td className="px-3 py-2 text-right text-gray-700">{formatCurrency(m.current_portfolio_value)}</td>
                        <td className={`px-3 py-2 text-right font-medium ${m.unrealized_gain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {m.unrealized_gain >= 0 ? '+' : ''}{formatCurrency(m.unrealized_gain)}
                        </td>
                        <td className={`px-3 py-2 text-right font-semibold ${m.moic >= 1 ? 'text-green-700' : 'text-red-600'}`}>
                          {m.moic.toFixed(3)}×
                        </td>
                        <td className="px-3 py-2 text-right text-gray-700">{m.dpi.toFixed(3)}×</td>
                        <td className="px-3 py-2 text-right text-gray-700">{m.rvpi.toFixed(3)}×</td>
                        <td className={`px-3 py-2 text-right font-medium ${m.annualized_return_pct == null ? 'text-gray-400' : m.annualized_return_pct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {m.annualized_return_pct == null
                            ? '< 1 an'
                            : `${m.annualized_return_pct >= 0 ? '+' : ''}${m.annualized_return_pct.toFixed(2)}%`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="text-xs text-gray-400 mt-3">
                  MOIC = (Valeur actuelle + Distributions) / Capital investi · DPI = Distributions / Capital investi · RVPI = Valeur actuelle / Capital investi
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Info box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-blue-900 mb-2">ℹ️ À propos du NAV</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>Source unique: <code>get_nav_timeline()</code></strong> — calcul mensuel depuis les premières transactions</li>
          <li>• Le calcul inclut: investissements + appréciation dynamique (expected_roi → scénario → 8%)</li>
          <li>• Les propriétés USD sont converties en CAD au taux en direct ({exchangeRate?.toFixed(4) ?? '...'})</li>
          <li>• <strong>{tlData.length} points</strong> dans la timeline — de {tlData.length > 0 ? formatDate(tlData[0].point_date) : '—'} à aujourd'hui</li>
          <li>• Le bouton "Snapshot" crée un point archivé dans <code>nav_history</code> (distinct de la timeline)</li>
        </ul>
      </div>
    </div>
  )
}
