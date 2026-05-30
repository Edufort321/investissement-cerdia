'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Save, ChevronDown, ChevronUp, AlertTriangle, CheckCircle } from 'lucide-react'

interface PropertyFiscal {
  id: string
  name: string
  location: string
  currency: string
  total_cost: number
  current_market_value_cad?: number | null
  valuation_date?: string | null
  valuation_source?: string | null
  valuation_notes?: string | null
  t1135_category?: string | null
  us_871d_election?: boolean | null
  us_871d_election_date?: string | null
  us_tax_id?: string | null
  foreign_account_number?: string | null
  confotur_certification_date?: string | null
  confotur_expiry_date?: string | null
}

interface Props {
  properties: PropertyFiscal[]
  onSaved: () => void
}

const T1135_CATEGORIES = [
  { value: '1', label: 'Cat. 1 — Fonds étrangers (comptes bancaires)' },
  { value: '2', label: 'Cat. 2 — Actions de sociétés non-résidentes' },
  { value: '3', label: 'Cat. 3 — Dettes de non-résidents' },
  { value: '4', label: 'Cat. 4 — Intérêts dans fiducies non-résidentes' },
  { value: '5', label: 'Cat. 5 — Biens immobiliers étrangers ✓' },
  { value: '6', label: 'Cat. 6 — Autres biens étrangers' },
  { value: '7', label: 'Cat. 7 — Biens détenus par courtier canadien' },
]

const VALUATION_SOURCES = [
  { value: 'manual', label: 'Estimation manuelle' },
  { value: 'appraiser', label: 'Évaluation professionnelle (CPA/évaluateur)' },
  { value: 'tax_assessment', label: 'Évaluation municipale' },
  { value: 'zillow', label: 'Zillow / Redfin (USA)' },
  { value: 'broker', label: 'Estimation courtier immobilier' },
  { value: 'other', label: 'Autre' },
]

function getPropertyCountry(p: PropertyFiscal): string {
  if (p.currency === 'USD') return 'US'
  if (p.currency === 'DOP') return 'DO'
  if (p.currency === 'MXN') return 'MX'
  return 'OTHER'
}

function getComplianceScore(p: PropertyFiscal): { score: number; issues: string[] } {
  const issues: string[] = []
  let score = 0
  const country = getPropertyCountry(p)

  if (p.current_market_value_cad) { score++ } else { issues.push('Valeur marchande manquante (T1135)') }
  if (p.valuation_date) { score++ } else { issues.push("Date d'évaluation manquante") }
  if (p.t1135_category) { score++ } else { issues.push('Catégorie T1135 non définie') }
  if (p.foreign_account_number) { score++ } else { issues.push('Numéro de compte étranger absent') }

  if (country === 'US') {
    if (p.us_871d_election) { score++ } else { issues.push('⚠️ Élection 871(d) IRS non faite — 30% sur brut!') }
    if (p.us_tax_id) { score++ } else { issues.push('ITIN/EIN absent') }
  } else {
    score += 2
  }

  if (country === 'DO') {
    if (p.confotur_certification_date) { score++ } else { issues.push('Date certification Confotur manquante') }
  } else {
    score++
  }

  return { score, issues }
}

export default function PropertyFiscalPanel({ properties, onSaved }: Props) {
  const [open, setOpen] = useState(false)
  const [edits, setEdits] = useState<Record<string, Partial<PropertyFiscal>>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)

  const foreignProperties = properties.filter(p => p.currency && p.currency !== 'CAD')
  if (foreignProperties.length === 0) return null

  const setField = (id: string, field: keyof PropertyFiscal, value: any) => {
    setEdits(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }))
  }

  const getVal = (p: PropertyFiscal, field: keyof PropertyFiscal) => {
    return edits[p.id]?.[field] !== undefined ? edits[p.id][field] : p[field]
  }

  const saveProperty = async (p: PropertyFiscal) => {
    const changes = edits[p.id]
    if (!changes || Object.keys(changes).length === 0) return
    setSaving(p.id)
    try {
      const { error } = await supabase.from('properties').update(changes).eq('id', p.id)
      if (error) throw error
      setSaved(p.id)
      setTimeout(() => setSaved(null), 2000)
      onSaved()
    } catch (e: any) {
      alert('Erreur : ' + e.message)
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="bg-white border border-amber-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full bg-amber-50 px-4 py-3 flex items-center justify-between hover:bg-amber-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-amber-900">
            🏛️ Données fiscales propriétés — T1135 / 871(d) / Confotur
          </span>
          <span className="text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full">
            {foreignProperties.length} propriété{foreignProperties.length > 1 ? 's' : ''} étrangère{foreignProperties.length > 1 ? 's' : ''}
          </span>
        </div>
        {open ? <ChevronUp size={16} className="text-amber-700" /> : <ChevronDown size={16} className="text-amber-700" />}
      </button>

      {open && (
        <div className="divide-y divide-gray-100">
          {foreignProperties.map(p => {
            const country = getPropertyCountry(p)
            const { score, issues } = getComplianceScore({ ...p, ...edits[p.id] } as PropertyFiscal)
            const maxScore = country === 'US' ? 6 : country === 'DO' ? 5 : 4
            const pct = Math.round((score / maxScore) * 100)
            const hasChanges = Object.keys(edits[p.id] || {}).length > 0

            return (
              <div key={p.id} className="p-4 space-y-4">
                {/* Header propriété */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{p.name}</p>
                    <p className="text-xs text-gray-500">{p.location} · {p.currency}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Score conformité */}
                    <div className="text-right">
                      <div className="flex items-center gap-1">
                        <div className="w-24 bg-gray-200 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full ${pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className={`text-xs font-medium ${pct >= 80 ? 'text-green-700' : pct >= 50 ? 'text-amber-700' : 'text-red-700'}`}>
                          {pct}%
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => saveProperty(p)}
                      disabled={!hasChanges || saving === p.id}
                      className={`flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg transition-colors ${
                        saved === p.id
                          ? 'bg-green-100 text-green-700'
                          : hasChanges
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-gray-100 text-gray-400'
                      } disabled:opacity-60`}
                    >
                      {saved === p.id ? <CheckCircle size={12} /> : <Save size={12} />}
                      {saved === p.id ? 'Sauvé' : saving === p.id ? '...' : 'Sauver'}
                    </button>
                  </div>
                </div>

                {/* Issues */}
                {issues.length > 0 && (
                  <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 flex flex-wrap gap-1">
                    {issues.map(issue => (
                      <span key={issue} className="text-xs text-amber-800 flex items-center gap-0.5">
                        <AlertTriangle size={10} className="flex-shrink-0" /> {issue}
                      </span>
                    ))}
                  </div>
                )}

                {/* Champs communs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      💰 Valeur marchande actuelle (CAD) *
                    </label>
                    <input
                      type="number"
                      value={(getVal(p, 'current_market_value_cad') as number) ?? ''}
                      onChange={e => setField(p.id, 'current_market_value_cad', e.target.value ? parseFloat(e.target.value) : null)}
                      placeholder={`Coût achat: ${p.total_cost?.toLocaleString('fr-CA')} $`}
                      className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-400 mt-0.5">CRA exige la juste valeur marchande au 31-déc.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">📅 Date d'évaluation</label>
                    <input
                      type="date"
                      value={(getVal(p, 'valuation_date') as string) ?? ''}
                      onChange={e => setField(p.id, 'valuation_date', e.target.value || null)}
                      className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">🔍 Source de l'évaluation</label>
                    <select
                      value={(getVal(p, 'valuation_source') as string) ?? ''}
                      onChange={e => setField(p.id, 'valuation_source', e.target.value || null)}
                      className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">— Choisir —</option>
                      {VALUATION_SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">📋 Catégorie T1135</label>
                    <select
                      value={(getVal(p, 't1135_category') as string) ?? '5'}
                      onChange={e => setField(p.id, 't1135_category', e.target.value)}
                      className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      {T1135_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">🔢 Numéro de compte étranger</label>
                    <input
                      type="text"
                      value={(getVal(p, 'foreign_account_number') as string) ?? ''}
                      onChange={e => setField(p.id, 'foreign_account_number', e.target.value || null)}
                      placeholder="Ex: Compte hypothèque #123456"
                      className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">📝 Notes évaluation</label>
                    <input
                      type="text"
                      value={(getVal(p, 'valuation_notes') as string) ?? ''}
                      onChange={e => setField(p.id, 'valuation_notes', e.target.value || null)}
                      placeholder="Ex: Estimation CPA Martin, déc. 2024"
                      className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Champs USA */}
                {country === 'US' && (
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 space-y-3">
                    <p className="text-xs font-semibold text-blue-800">🇺🇸 Conformité IRS — États-Unis</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-3 flex items-start gap-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={(getVal(p, 'us_871d_election') as boolean) ?? false}
                            onChange={e => setField(p.id, 'us_871d_election', e.target.checked)}
                            className="rounded w-4 h-4 accent-blue-600"
                          />
                          <span className="text-sm font-medium text-blue-900">Élection Section 871(d) faite</span>
                        </label>
                        <div className="text-xs text-blue-700 bg-blue-100 rounded px-2 py-1">
                          Sans cette élection : retenue <strong>30%</strong> sur loyer brut. Avec élection : impôt sur revenu net (~15-20%). Économie majeure — vérifier avec CPA.
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-blue-700 mb-1">Date de l'élection 871(d)</label>
                        <input
                          type="date"
                          value={(getVal(p, 'us_871d_election_date') as string) ?? ''}
                          onChange={e => setField(p.id, 'us_871d_election_date', e.target.value || null)}
                          className="w-full px-2.5 py-1.5 text-sm border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-blue-700 mb-1">ITIN / EIN</label>
                        <input
                          type="text"
                          value={(getVal(p, 'us_tax_id') as string) ?? ''}
                          onChange={e => setField(p.id, 'us_tax_id', e.target.value || null)}
                          placeholder="XXX-XX-XXXX ou XX-XXXXXXX"
                          className="w-full px-2.5 py-1.5 text-sm border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Champs Rép. Dominicaine */}
                {country === 'DO' && (
                  <div className="bg-green-50 border border-green-100 rounded-lg p-3 space-y-3">
                    <p className="text-xs font-semibold text-green-800">🇩🇴 Conformité fiscale — Rép. Dominicaine</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-green-700 mb-1">
                          🏛️ Date certification Confotur (Loi 158-01)
                        </label>
                        <input
                          type="date"
                          value={(getVal(p, 'confotur_certification_date') as string) ?? ''}
                          onChange={e => setField(p.id, 'confotur_certification_date', e.target.value || null)}
                          className="w-full px-2.5 py-1.5 text-sm border border-green-200 rounded-lg focus:ring-2 focus:ring-green-500 bg-white"
                        />
                        <p className="text-xs text-green-600 mt-0.5">Point de départ du délai d'exemption (10–15 ans)</p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-green-700 mb-1">📅 Date d'expiration Confotur</label>
                        <input
                          type="date"
                          value={(getVal(p, 'confotur_expiry_date') as string) ?? ''}
                          onChange={e => setField(p.id, 'confotur_expiry_date', e.target.value || null)}
                          className="w-full px-2.5 py-1.5 text-sm border border-green-200 rounded-lg focus:ring-2 focus:ring-green-500 bg-white"
                        />
                        <p className="text-xs text-green-600 mt-0.5">Après cette date : taxes normales IPI + transfert reprennent</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
