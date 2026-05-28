'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { FileText, Download, AlertCircle, Lock, Building2, Calendar } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface TokenConfig {
  organization_id: string
  tabs: string[]
  selected_year: number | null
  filter_period: string
  label: string | null
  expires_at: string
}

interface TxRow {
  id: string; date: string; type: string; description: string; amount: number
  source_currency?: string; source_amount?: number; exchange_rate?: number
  foreign_tax_paid?: number; tax_credit_claimable?: number
  fiscal_category?: string; vendor_name?: string; accountant_notes?: string
  attachment_name?: string; attachment_url?: string; attachment_storage_path?: string
  tax_country?: string; sales_tax_amount?: number; state_income_tax_amt?: number
  federal_withholding?: number; rental_type?: string; owner_fiscal_status?: string
}

const FISCAL_LABELS: Record<string, string> = {
  rental_income: 'Revenu locatif', dividend_income: 'Dividende', interest_income: 'Intérêts',
  other_income: 'Autre revenu', management_fee: 'Frais gestion', insurance: 'Assurance',
  property_tax: 'Taxes foncières', condo_fees: 'Charges condo', utilities: 'Services publics',
  maintenance_repair: 'Entretien', professional_fees: 'Honoraires', advertising: 'Publicité',
  travel: 'Déplacement', interest_expense: 'Intérêts hyp.', bank_fees: 'Frais banc.',
  other_opex: 'Autre OPEX', property_purchase: 'Achat propriété', renovation: 'Rénovation',
  equipment: 'Équipements', furnishing: 'Ameublement', acquisition_costs: 'Frais acquis.',
  land_improvement: 'Amél. terrain', other_capex: 'Autre CAPEX',
  loan_principal: 'Capital prêt', investor_capital: 'Capital invest.', investor_repayment: 'Remboursement invest.',
  sales_tax_remittance: 'Remise taxe vente', income_tax_remittance: 'Remise impôt NR', withholding_remittance: 'Remise retenue',
}

const COUNTRY_NAMES: Record<string, string> = { CA: 'Canada', US: 'États-Unis', DO: 'Rép. Dominicaine', MX: 'Mexique' }

// ── Main component (wrapped in Suspense) ──────────────────────────────────────

function AccountantShareContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('t')

  const [config, setConfig] = useState<TokenConfig | null>(null)
  const [transactions, setTransactions] = useState<TxRow[]>([])
  const [orgName, setOrgName] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('transactions')
  const [filterPeriod, setFilterPeriod] = useState('annual')

  useEffect(() => {
    if (!token) { setError('Token manquant'); setLoading(false); return }
    loadData()
  }, [token])

  const loadData = async () => {
    try {
      // Verify token via API route
      const res = await fetch(`/api/accountant-token?token=${token}`)
      if (!res.ok) { setError('Lien invalide ou expiré'); setLoading(false); return }
      const cfg: TokenConfig = await res.json()
      setConfig(cfg)
      setFilterPeriod(cfg.filter_period || 'annual')
      if (cfg.tabs.length > 0) setActiveTab(cfg.tabs[0])

      // Load org name
      const { data: org } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', cfg.organization_id)
        .single()
      setOrgName(org?.name || 'CERDIA')

      // Load transactions
      let query = supabase
        .from('transactions')
        .select('*')
        .eq('organization_id', cfg.organization_id)
        .order('date', { ascending: false })

      if (cfg.selected_year) {
        query = query
          .gte('date', `${cfg.selected_year}-01-01`)
          .lte('date', `${cfg.selected_year}-12-31`)
      }

      const { data: txData } = await query
      setTransactions(txData || [])
    } catch {
      setError('Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }

  const fmt = (n: number) => (n || 0).toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', minimumFractionDigits: 2 })

  const filteredTx = transactions.filter(t => {
    if (filterPeriod === 'annual') return true
    const m = new Date(t.date).getMonth() + 1
    if (filterPeriod.startsWith('Q')) {
      const q = parseInt(filterPeriod[1])
      return m >= (q - 1) * 3 + 1 && m <= q * 3
    }
    if (filterPeriod.startsWith('M')) return m === parseInt(filterPeriod.slice(1))
    return true
  })

  const exportCSV = () => {
    const headers = ['Date','Type','Description','Montant CAD','Devise','Montant source','Pays fiscal','Catégorie fiscale','Impôt payé','Taxe vente calc.','Retenue NR calc.','Fournisseur','Notes comptable','Pièce jointe']
    const rows = filteredTx.map(t => [
      t.date, t.type, `"${(t.description||'').replace(/"/g,'""')}"`, t.amount,
      t.source_currency||'CAD', t.source_amount||'',
      COUNTRY_NAMES[t.tax_country||''] || t.tax_country||'',
      t.fiscal_category||'', t.foreign_tax_paid||0,
      t.sales_tax_amount||0, t.federal_withholding||0,
      `"${(t.vendor_name||'').replace(/"/g,'""')}"`,
      `"${(t.accountant_notes||'').replace(/"/g,'""')}"`,
      t.attachment_name||''
    ])
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob(['﻿'+csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `CERDIA_transactions_comptable_${config?.selected_year||'all'}.csv`
    a.click()
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-700 mx-auto mb-3" /><p className="text-gray-500 text-sm">Chargement…</p></div>
    </div>
  )

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white border border-red-200 rounded-xl p-8 max-w-md w-full text-center shadow">
        <Lock className="mx-auto mb-3 text-red-400" size={40} />
        <h2 className="text-lg font-bold text-gray-900 mb-2">Accès refusé</h2>
        <p className="text-sm text-gray-500">{error}</p>
      </div>
    </div>
  )

  const year = config?.selected_year
  const totalRevenu = filteredTx.filter(t => ['rental_income','dividend_income','interest_income','other_income'].includes(t.fiscal_category||'')).reduce((s,t) => s+t.amount, 0)
  const totalDepense = filteredTx.filter(t => !['rental_income','dividend_income','interest_income','other_income'].includes(t.fiscal_category||'')).reduce((s,t) => s+t.amount, 0)
  const totalTaxes = filteredTx.reduce((s,t) => s+(t.sales_tax_amount||0)+(t.state_income_tax_amt||0)+(t.federal_withholding||0), 0)
  const totalPaidForeign = filteredTx.reduce((s,t) => s+(t.foreign_tax_paid||0), 0)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gray-900 text-white px-4 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 size={22} className="text-gray-300" />
            <div>
              <p className="text-xs text-gray-400">Portail comptable — Lecture seule</p>
              <h1 className="text-base font-bold">{orgName}</h1>
              {config?.label && <p className="text-xs text-gray-400 mt-0.5">{config.label}</p>}
            </div>
          </div>
          <div className="text-right text-xs text-gray-400">
            {year ? <p>Année {year}</p> : <p>Toutes les années</p>}
            <p>Expire : {new Date(config!.expires_at).toLocaleDateString('fr-CA')}</p>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="max-w-7xl mx-auto px-4 py-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-green-50 border border-green-200 rounded-xl p-3">
          <p className="text-xs text-green-700">Revenus</p>
          <p className="text-base font-bold text-green-900">{fmt(totalRevenu)}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-3">
          <p className="text-xs text-red-700">Dépenses</p>
          <p className="text-base font-bold text-red-900">{fmt(totalDepense)}</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
          <p className="text-xs text-amber-700">Taxes estimées</p>
          <p className="text-base font-bold text-amber-900">{fmt(totalTaxes)}</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
          <p className="text-xs text-blue-700">Impôt étranger payé</p>
          <p className="text-base font-bold text-blue-900">{fmt(totalPaidForeign)}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4">
        <div className="border-b border-gray-200 flex gap-4 overflow-x-auto">
          {(config?.tabs || []).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                activeTab === tab ? 'border-gray-800 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'transactions' ? '📋 Transactions' : tab === 'rapports_fiscaux' ? '📊 Rapports Fiscaux' : '📖 Livre Entreprise'}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-4 space-y-4">

        {/* Filter bar */}
        <div className="flex items-center gap-3">
          <select
            value={filterPeriod}
            onChange={e => setFilterPeriod(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white"
          >
            <option value="annual">Annuel</option>
            <optgroup label="Trimestre"><option value="Q1">Q1</option><option value="Q2">Q2</option><option value="Q3">Q3</option><option value="Q4">Q4</option></optgroup>
            <optgroup label="Mensuel">{['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'].map((m,i)=><option key={i} value={`M${i+1}`}>{m}</option>)}</optgroup>
          </select>
          <span className="text-sm text-gray-500">{filteredTx.length} transactions</span>
          <button onClick={exportCSV} className="ml-auto flex items-center gap-1 px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
            <Download size={12} /> CSV
          </button>
        </div>

        {/* Transactions tab */}
        {activeTab === 'transactions' && (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b text-xs">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">Description</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase">Catégorie</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">Montant</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">Devise</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-500 uppercase">Imp. étr.</th>
                    <th className="px-3 py-2 text-center font-medium text-gray-500 uppercase">PJ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredTx.map(t => (
                    <tr key={t.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 whitespace-nowrap text-gray-600 text-xs">{t.date}</td>
                      <td className="px-3 py-2 text-gray-900 max-w-xs">
                        <div className="truncate">{t.description}</div>
                        {t.vendor_name && <div className="text-xs text-gray-400 truncate">{t.vendor_name}</div>}
                        {t.accountant_notes && <div className="text-xs text-blue-600 truncate italic">{t.accountant_notes}</div>}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-500">{FISCAL_LABELS[t.fiscal_category||''] || t.fiscal_category || '—'}</td>
                      <td className="px-3 py-2 text-right font-medium text-gray-900 whitespace-nowrap">{fmt(t.amount)}</td>
                      <td className="px-3 py-2 text-right text-xs text-gray-500">
                        {t.source_currency && t.source_currency !== 'CAD' ? `${t.source_amount||''} ${t.source_currency}` : 'CAD'}
                      </td>
                      <td className="px-3 py-2 text-right text-xs text-blue-700">
                        {(t.foreign_tax_paid||0) > 0 ? fmt(t.foreign_tax_paid!) : <span className="text-gray-200">—</span>}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {t.attachment_url ? (
                          <a href={t.attachment_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center justify-center gap-1">
                            <FileText size={13} />
                          </a>
                        ) : <span className="text-gray-200">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t border-gray-200 font-bold text-sm">
                  <tr>
                    <td colSpan={3} className="px-3 py-2 text-gray-700">TOTAL ({filteredTx.length} transactions)</td>
                    <td className="px-3 py-2 text-right text-gray-900">{fmt(filteredTx.reduce((s,t) => s+t.amount, 0))}</td>
                    <td></td>
                    <td className="px-3 py-2 text-right text-blue-700">{fmt(totalPaidForeign)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Tax reports tab */}
        {activeTab === 'rapports_fiscaux' && (
          <div className="space-y-4">
            {/* By fiscal category */}
            {(['REVENUS','DÉPENSES'].map(group => {
              const cats = group === 'REVENUS'
                ? ['rental_income','dividend_income','interest_income','other_income']
                : Object.keys(FISCAL_LABELS).filter(k => !['rental_income','dividend_income','interest_income','other_income'].includes(k))
              const txs = filteredTx.filter(t => cats.includes(t.fiscal_category||''))
              if (txs.length === 0) return null
              return (
                <div key={group} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <div className={`px-4 py-2 text-sm font-semibold text-white ${group === 'REVENUS' ? 'bg-green-700' : 'bg-blue-700'}`}>
                    {group} — {fmt(txs.reduce((s,t) => s+t.amount,0))}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-3 py-1.5 text-left text-gray-500 uppercase">Date</th>
                          <th className="px-3 py-1.5 text-left text-gray-500 uppercase">Description</th>
                          <th className="px-3 py-1.5 text-left text-gray-500 uppercase">Catégorie</th>
                          <th className="px-3 py-1.5 text-left text-gray-500 uppercase">Pays</th>
                          <th className="px-3 py-1.5 text-right text-gray-500 uppercase">Montant</th>
                          <th className="px-3 py-1.5 text-right text-gray-500 uppercase">Taxe/Ret.</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {txs.map(t => (
                          <tr key={t.id} className="hover:bg-gray-50">
                            <td className="px-3 py-1.5 text-gray-500">{t.date}</td>
                            <td className="px-3 py-1.5 text-gray-900 max-w-xs truncate">{t.description}</td>
                            <td className="px-3 py-1.5 text-gray-500">{FISCAL_LABELS[t.fiscal_category||''] || '—'}</td>
                            <td className="px-3 py-1.5 text-gray-500">{COUNTRY_NAMES[t.tax_country||''] || '—'}</td>
                            <td className="px-3 py-1.5 text-right font-medium text-gray-900">{fmt(t.amount)}</td>
                            <td className="px-3 py-1.5 text-right text-amber-700">
                              {((t.sales_tax_amount||0)+(t.state_income_tax_amt||0)+(t.federal_withholding||0)) > 0
                                ? fmt((t.sales_tax_amount||0)+(t.state_income_tax_amt||0)+(t.federal_withholding||0))
                                : <span className="text-gray-200">—</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            }))}

            {/* T2209 summary */}
            {(() => {
              const foreign = filteredTx.filter(t => (t.foreign_tax_paid||0) > 0)
              if (foreign.length === 0) return null
              return (
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <div className="px-4 py-2 text-sm font-semibold text-white bg-purple-700">T2209 — Crédits d'impôt étranger</div>
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 border-b"><tr>
                      <th className="px-3 py-1.5 text-left text-gray-500 uppercase">Date</th>
                      <th className="px-3 py-1.5 text-left text-gray-500 uppercase">Description</th>
                      <th className="px-3 py-1.5 text-left text-gray-500 uppercase">Pays</th>
                      <th className="px-3 py-1.5 text-right text-gray-500 uppercase">Revenu</th>
                      <th className="px-3 py-1.5 text-right text-gray-500 uppercase">Impôt payé</th>
                      <th className="px-3 py-1.5 text-right text-gray-500 uppercase">Crédit réclamable</th>
                    </tr></thead>
                    <tbody className="divide-y divide-gray-50">
                      {foreign.map(t => (
                        <tr key={t.id} className="hover:bg-gray-50">
                          <td className="px-3 py-1.5 text-gray-500">{t.date}</td>
                          <td className="px-3 py-1.5 text-gray-900">{t.description}</td>
                          <td className="px-3 py-1.5 text-gray-500">{COUNTRY_NAMES[t.tax_country||''] || '—'}</td>
                          <td className="px-3 py-1.5 text-right text-gray-900">{fmt(t.source_amount||t.amount)}</td>
                          <td className="px-3 py-1.5 text-right text-blue-700">{fmt(t.foreign_tax_paid||0)}</td>
                          <td className="px-3 py-1.5 text-right text-green-700">{fmt((t as any).tax_credit_claimable||t.foreign_tax_paid||0)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 border-t font-bold text-xs">
                      <tr>
                        <td colSpan={3} className="px-3 py-1.5">Total</td>
                        <td className="px-3 py-1.5 text-right">{fmt(foreign.reduce((s,t)=>s+(t.source_amount||t.amount),0))}</td>
                        <td className="px-3 py-1.5 text-right text-blue-700">{fmt(foreign.reduce((s,t)=>s+(t.foreign_tax_paid||0),0))}</td>
                        <td className="px-3 py-1.5 text-right text-green-700">{fmt(foreign.reduce((s,t)=>s+((t as any).tax_credit_claimable||t.foreign_tax_paid||0),0))}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )
            })()}
          </div>
        )}

        {/* Livre entreprise tab */}
        {activeTab === 'livre_entreprise' && (
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-sm text-gray-500 text-center">
              Livre d'entreprise — {filteredTx.length} transactions · {fmt(filteredTx.reduce((s,t)=>s+t.amount,0))} total
            </p>
            <div className="mt-4 space-y-1 text-xs">
              {filteredTx.map(t => (
                <div key={t.id} className="flex items-center justify-between py-1 border-b border-gray-50">
                  <span className="text-gray-400 w-24 flex-shrink-0">{t.date}</span>
                  <span className="text-gray-700 flex-1 mx-2 truncate">{t.description}</span>
                  <span className="text-xs text-gray-400 w-28 text-right flex-shrink-0">{FISCAL_LABELS[t.fiscal_category||'']||'—'}</span>
                  <span className="font-medium text-gray-900 w-24 text-right flex-shrink-0">{fmt(t.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-xs text-center text-gray-400">
          🔒 Accès en lecture seule · Généré par CERDIA Investment Platform · Expire le {new Date(config!.expires_at).toLocaleDateString('fr-CA')}
        </p>
      </div>
    </div>
  )
}

export default function AccountantSharePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-700" />
      </div>
    }>
      <AccountantShareContent />
    </Suspense>
  )
}
