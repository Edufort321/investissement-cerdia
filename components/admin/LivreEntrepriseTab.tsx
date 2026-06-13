'use client'

// Livre d'entreprise — registre des actionnaires + souscription signée électroniquement.
// Signature DESSINÉE (canvas) + horodatage (date/heure/seconde) + empreinte SHA-256 du document
// (valeur probante, Loi concernant le cadre juridique des TI du Québec). Président pré-rempli (Eric
// Dufort) avec sa propre signature. Écriture via Supabase (RLS admins). Export PDF du certificat.

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import jsPDF from 'jspdf'
import { BookOpen, Plus, Trash2, Save, X, Download, Eraser, FileSignature } from 'lucide-react'

type Shareholder = {
  id: string
  full_name: string; title?: string; email?: string; address?: string
  share_class?: string; shares_count?: number; shares_pct?: number
  purchase_cost?: number; price_per_share?: number; currency?: string
  legal_clauses?: string
  shareholder_signature?: string; shareholder_signed_at?: string
  president_name?: string; president_title?: string; president_signature?: string; president_signed_at?: string
  document_hash?: string; effective_date?: string; status?: string; created_at?: string
}

const PRESIDENT_NAME = 'Eric Dufort'
const COMPANY = 'CERDIA'

const DEFAULT_CLAUSES = `CONVENTION DE SOUSCRIPTION D'ACTIONS — ${COMPANY}

1. L'actionnaire souscrit aux actions décrites ci-dessus et s'engage à en acquitter le coût d'achat indiqué.
2. Les actions sont émises sous réserve des statuts et de la convention entre actionnaires de la société, que l'actionnaire déclare connaître et accepter.
3. L'actionnaire reconnaît que les actions ne sont pas librement cessibles et sont assujetties aux droits de premier refus et autres restrictions prévus à la convention entre actionnaires.
4. Les présentes sont régies par les lois applicables au Québec (Canada).
5. Les parties consentent à la signature électronique des présentes ; cette signature, accompagnée de l'horodatage et de l'empreinte d'intégrité (SHA-256), a la même valeur qu'une signature manuscrite (Loi concernant le cadre juridique des technologies de l'information, RLRQ c. C-1.1).`

function fmtTs(iso?: string) {
  if (!iso) return ''
  const d = new Date(iso)
  // date + heure + minute + seconde
  return d.toLocaleString('fr-CA', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

// ── Pad de signature (dessin souris/tactile) ──
function SignaturePad({ value, onChange, label }: { value: string; onChange: (dataUrl: string) => void; label: string }) {
  const ref = useRef<HTMLCanvasElement | null>(null)
  const drawing = useRef(false)
  const last = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const c = ref.current; if (!c) return
    const ctx = c.getContext('2d'); if (!ctx) return
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height)
    if (value) { const img = new Image(); img.onload = () => ctx.drawImage(img, 0, 0, c.width, c.height); img.src = value }
  }, []) // eslint-disable-line

  const pos = (e: React.PointerEvent) => {
    const c = ref.current!; const r = c.getBoundingClientRect()
    return { x: (e.clientX - r.left) * (c.width / r.width), y: (e.clientY - r.top) * (c.height / r.height) }
  }
  const start = (e: React.PointerEvent) => { drawing.current = true; last.current = pos(e); (e.target as Element).setPointerCapture?.(e.pointerId) }
  const move = (e: React.PointerEvent) => {
    if (!drawing.current) return
    const c = ref.current!; const ctx = c.getContext('2d')!; const p = pos(e)
    ctx.strokeStyle = '#111827'; ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    ctx.beginPath(); ctx.moveTo(last.current!.x, last.current!.y); ctx.lineTo(p.x, p.y); ctx.stroke()
    last.current = p
  }
  const end = () => { if (!drawing.current) return; drawing.current = false; const c = ref.current!; onChange(c.toDataURL('image/png')) }
  const clear = () => { const c = ref.current!; const ctx = c.getContext('2d')!; ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); onChange('') }

  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <canvas
        ref={ref} width={420} height={130}
        onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerLeave={end}
        className="w-full rounded-lg border border-gray-300 bg-white touch-none cursor-crosshair"
        style={{ height: 130 }}
      />
      <button type="button" onClick={clear} className="mt-1 inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800">
        <Eraser size={12} /> Effacer
      </button>
    </div>
  )
}

export default function LivreEntrepriseTab({ toast }: { toast: (t: { msg: string; type: 'success' | 'error' }) => void }) {
  const [rows, setRows] = useState<Shareholder[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const [f, setF] = useState({
    full_name: '', title: '', email: '', address: '',
    share_class: 'Ordinaire', shares_count: '', shares_pct: '', purchase_cost: '', currency: 'CAD',
    effective_date: '', legal_clauses: DEFAULT_CLAUSES,
  })
  const [shSig, setShSig] = useState('')
  const [prSig, setPrSig] = useState('')

  const pricePerShare = useMemo(() => {
    const c = Number(f.purchase_cost), n = Number(f.shares_count)
    return c > 0 && n > 0 ? c / n : 0
  }, [f.purchase_cost, f.shares_count])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('company_shareholders').select('*').order('created_at', { ascending: false })
    setRows((data as Shareholder[]) || [])
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  function reset() {
    setF({ full_name: '', title: '', email: '', address: '', share_class: 'Ordinaire', shares_count: '', shares_pct: '', purchase_cost: '', currency: 'CAD', effective_date: '', legal_clauses: DEFAULT_CLAUSES })
    setShSig(''); setPrSig('')
  }

  async function save() {
    if (!f.full_name.trim()) { toast({ msg: 'Le nom de l\'actionnaire est requis.', type: 'error' }); return }
    if (!shSig) { toast({ msg: 'La signature de l\'actionnaire est requise.', type: 'error' }); return }
    if (!prSig) { toast({ msg: 'La signature du président est requise.', type: 'error' }); return }
    setSaving(true)
    try {
      const now = new Date().toISOString()
      // Empreinte d'intégrité : contenu canonique signé.
      const canonical = JSON.stringify({
        company: COMPANY, full_name: f.full_name, title: f.title, share_class: f.share_class,
        shares_count: Number(f.shares_count) || null, shares_pct: Number(f.shares_pct) || null,
        purchase_cost: Number(f.purchase_cost) || null, price_per_share: pricePerShare || null,
        currency: f.currency, effective_date: f.effective_date || null, clauses: f.legal_clauses,
        president: PRESIDENT_NAME, signed_at: now,
      })
      const document_hash = await sha256(canonical)
      const payload = {
        full_name: f.full_name.trim(), title: f.title || null, email: f.email || null, address: f.address || null,
        share_class: f.share_class || null, shares_count: f.shares_count ? Number(f.shares_count) : null,
        shares_pct: f.shares_pct ? Number(f.shares_pct) : null, purchase_cost: f.purchase_cost ? Number(f.purchase_cost) : null,
        price_per_share: pricePerShare || null, currency: f.currency || 'CAD',
        legal_clauses: f.legal_clauses, effective_date: f.effective_date || null,
        shareholder_signature: shSig, shareholder_signed_at: now,
        president_name: PRESIDENT_NAME, president_title: 'Président', president_signature: prSig, president_signed_at: now,
        document_hash, status: 'signed',
      }
      const { error } = await supabase.from('company_shareholders').insert(payload)
      if (error) throw error
      toast({ msg: '✓ Actionnaire enregistré et signé.', type: 'success' })
      reset(); setOpen(false); load()
    } catch (e: any) {
      toast({ msg: 'Erreur : ' + (e?.message || 'enregistrement'), type: 'error' })
    } finally { setSaving(false) }
  }

  async function remove(id: string) {
    if (!confirm('Supprimer définitivement cet enregistrement du livre ?')) return
    await supabase.from('company_shareholders').delete().eq('id', id)
    load()
  }

  function exportPdf(s: Shareholder) {
    const doc = new jsPDF({ unit: 'pt', format: 'letter' })
    const W = doc.internal.pageSize.getWidth(); const M = 56; let y = 60
    doc.setFont('helvetica', 'bold'); doc.setFontSize(16)
    doc.text(`${COMPANY} — Certificat de souscription d'actions`, M, y); y += 8
    doc.setDrawColor(230); doc.line(M, y, W - M, y); y += 24
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5)
    const line = (k: string, v: string) => { doc.setFont('helvetica', 'bold'); doc.text(k, M, y); doc.setFont('helvetica', 'normal'); doc.text(v || '—', M + 150, y); y += 18 }
    line('Actionnaire', s.full_name)
    if (s.title) line('Titre', s.title)
    if (s.email) line('Courriel', s.email)
    line('Catégorie d\'actions', s.share_class || '—')
    line('Nombre d\'actions', s.shares_count != null ? String(s.shares_count) : '—')
    line('% d\'actions', s.shares_pct != null ? `${s.shares_pct} %` : '—')
    line('Coût d\'achat', s.purchase_cost != null ? `${s.purchase_cost.toLocaleString('fr-CA')} ${s.currency || 'CAD'}` : '—')
    line('Prix par action', s.price_per_share != null ? `${Number(s.price_per_share).toLocaleString('fr-CA', { maximumFractionDigits: 4 })} ${s.currency || 'CAD'}` : '—')
    if (s.effective_date) line('Date d\'effet', s.effective_date)
    y += 8; doc.setDrawColor(230); doc.line(M, y, W - M, y); y += 18
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.text('Clauses', M, y); y += 16
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.6)
    const clauses = doc.splitTextToSize(s.legal_clauses || '', W - 2 * M)
    doc.text(clauses, M, y); y += clauses.length * 11 + 16

    // Signatures
    const colW = (W - 2 * M - 24) / 2
    const sigY = y
    doc.setFontSize(9); doc.setFont('helvetica', 'bold')
    doc.text('Actionnaire', M, sigY); doc.text('Président', M + colW + 24, sigY)
    try { if (s.shareholder_signature) doc.addImage(s.shareholder_signature, 'PNG', M, sigY + 6, 150, 50) } catch {}
    try { if (s.president_signature) doc.addImage(s.president_signature, 'PNG', M + colW + 24, sigY + 6, 150, 50) } catch {}
    let ly = sigY + 64
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.4); doc.setTextColor(80)
    doc.text(`${s.full_name}`, M, ly); doc.text(`${s.president_name || PRESIDENT_NAME} — ${s.president_title || 'Président'}`, M + colW + 24, ly); ly += 12
    doc.text(`Signé : ${fmtTs(s.shareholder_signed_at)}`, M, ly); doc.text(`Signé : ${fmtTs(s.president_signed_at)}`, M + colW + 24, ly); ly += 18
    doc.setFontSize(7.4); doc.setTextColor(120)
    doc.text(`Empreinte d'intégrité (SHA-256) : ${s.document_hash || ''}`, M, ly, { maxWidth: W - 2 * M })
    doc.save(`certificat-${s.full_name.replace(/[^a-z0-9]/gi, '_')}.pdf`)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900"><BookOpen size={18} /> Livre d'entreprise — Actionnaires</h2>
        <button onClick={() => { reset(); setOpen(o => !o) }} className="inline-flex items-center gap-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded-lg">
          {open ? <X size={15} /> : <Plus size={15} />} {open ? 'Fermer' : 'Nouvel actionnaire'}
        </button>
      </div>

      {open && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-4"><FileSignature size={15} /> Souscription d'actions (signature électronique)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Nom de l'actionnaire *</label>
              <input value={f.full_name} onChange={e => setF({ ...f, full_name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Titre</label>
              <input value={f.title} onChange={e => setF({ ...f, title: e.target.value })} placeholder="ex. Administrateur, Investisseur" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Courriel</label>
              <input value={f.email} onChange={e => setF({ ...f, email: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Catégorie d'actions</label>
              <input value={f.share_class} onChange={e => setF({ ...f, share_class: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Nombre d'actions</label>
              <input type="number" value={f.shares_count} onChange={e => setF({ ...f, shares_count: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">% d'actions</label>
              <input type="number" step="0.0001" value={f.shares_pct} onChange={e => setF({ ...f, shares_pct: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Coût d'achat total</label>
              <input type="number" step="0.01" value={f.purchase_cost} onChange={e => setF({ ...f, purchase_cost: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Devise</label>
              <select value={f.currency} onChange={e => setF({ ...f, currency: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"><option>CAD</option><option>USD</option><option>EUR</option></select></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Prix par action (calculé)</label>
              <input disabled value={pricePerShare ? `${pricePerShare.toLocaleString('fr-CA', { maximumFractionDigits: 4 })} ${f.currency}` : '—'} className="w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-lg text-sm text-gray-500" /></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Date d'effet</label>
              <input type="date" value={f.effective_date} onChange={e => setF({ ...f, effective_date: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
          </div>

          <div className="mt-4">
            <label className="block text-xs font-medium text-gray-600 mb-1">Clauses légales</label>
            <textarea value={f.legal_clauses} onChange={e => setF({ ...f, legal_clauses: e.target.value })} rows={8} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-mono leading-relaxed" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-5">
            <SignaturePad label={`Signature de l'actionnaire — ${f.full_name || '…'}`} value={shSig} onChange={setShSig} />
            <SignaturePad label={`Signature du président — ${PRESIDENT_NAME}`} value={prSig} onChange={setPrSig} />
          </div>
          <p className="text-[11px] text-gray-400 mt-2">La signature électronique sera horodatée (date, heure, seconde) et scellée par une empreinte SHA-256 du document, conformément à la Loi concernant le cadre juridique des TI (Québec).</p>

          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => { reset(); setOpen(false) }} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg">Annuler</button>
            <button onClick={save} disabled={saving} className="inline-flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg disabled:opacity-60">
              <Save size={15} /> {saving ? 'Enregistrement…' : 'Signer & enregistrer'}
            </button>
          </div>
        </div>
      )}

      {/* Liste */}
      {loading ? <p className="text-sm text-gray-400">Chargement…</p> : rows.length === 0 ? (
        <p className="text-sm text-gray-400">Aucun actionnaire au registre. Clique « Nouvel actionnaire ».</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-gray-500 border-b border-gray-200">
              <th className="px-4 py-3">Actionnaire</th><th className="px-4 py-3">Titre</th><th className="px-4 py-3">Catégorie</th>
              <th className="px-4 py-3 text-right">Actions</th><th className="px-4 py-3 text-right">%</th><th className="px-4 py-3 text-right">Coût</th>
              <th className="px-4 py-3">Signé le</th><th className="px-4 py-3"></th>
            </tr></thead>
            <tbody>
              {rows.map(s => (
                <tr key={s.id} className="border-b border-gray-100">
                  <td className="px-4 py-3 font-medium text-gray-900">{s.full_name}</td>
                  <td className="px-4 py-3 text-gray-600">{s.title || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{s.share_class || '—'}</td>
                  <td className="px-4 py-3 text-right">{s.shares_count ?? '—'}</td>
                  <td className="px-4 py-3 text-right">{s.shares_pct != null ? `${s.shares_pct} %` : '—'}</td>
                  <td className="px-4 py-3 text-right">{s.purchase_cost != null ? `${s.purchase_cost.toLocaleString('fr-CA')} ${s.currency || 'CAD'}` : '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{fmtTs(s.shareholder_signed_at)}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button onClick={() => exportPdf(s)} className="inline-flex items-center gap-1 text-xs text-cyan-700 hover:underline mr-3"><Download size={13} /> PDF</button>
                    <button onClick={() => remove(s.id)} className="inline-flex items-center gap-1 text-xs text-red-600 hover:underline"><Trash2 size={13} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
