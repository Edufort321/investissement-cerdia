'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import InvoiceGenerator from '@/components/admin/InvoiceGenerator'
import {
  Lock, Eye, EyeOff, LogOut, Package, ArrowLeftRight, BarChart2,
  FileText, Plus, Edit2, Trash2, Save, X, Star, Tag, Search,
  TrendingUp, TrendingDown, DollarSign, ShoppingCart, AlertCircle,
  Check, ChevronDown, Shield, Home
} from 'lucide-react'

// ─── Types ─────────────────────────────────────────────────────────────────────
interface Product {
  id: string
  title: string
  description?: string
  price?: number
  currency: string
  amazon_url: string
  image_url?: string
  image_urls?: string[]
  badge?: string
  category?: string
  rating: number
  review_count: number
  active: boolean
  sort_order: number
  created_at: string
}

interface CommerceTx {
  id: string
  date: string
  description: string
  amount: number
  type: string
  platform: string
  product_ref?: string
  status: string
  notes?: string
  created_at: string
}

// ─── Constants ─────────────────────────────────────────────────────────────────
const ADMIN_PASSWORD = '321Eduf!$'
const SESSION_KEY = 'commerce_admin_auth'

const TX_TYPES = ['vente', 'remboursement', 'frais_amazon', 'publicite', 'autre'] as const
const TX_PLATFORMS = ['Amazon', 'Shopify', 'Etsy', 'Site web', 'Autre']
const TX_STATUSES = ['complété', 'en attente', 'annulé']

const BADGE_OPTIONS = ['', 'Nouveau', 'Bestseller', 'Populaire', 'Promo', 'Exclusif']
const CATEGORIES = ['Maison & Cuisine', 'Électronique', 'Mode', 'Sport', 'Beauté', 'Livres', 'Autre']

const EMPTY_PRODUCT = {
  title: '', description: '', price: '', currency: 'CAD',
  amazon_url: '', image_urls: [] as string[], badge: '', category: '',
  rating: 0, review_count: 0, active: true, sort_order: 0,
}

const EMPTY_TX: Omit<CommerceTx, 'id' | 'created_at'> = {
  date: new Date().toISOString().split('T')[0],
  description: '', amount: 0, type: 'vente',
  platform: 'Amazon', product_ref: '', status: 'complété', notes: '',
}

type Tab = 'produits' | 'transactions' | 'rapports' | 'factures'

// ─── Helpers ───────────────────────────────────────────────────────────────────
function badgeColor(badge?: string) {
  const m: Record<string, string> = {
    Bestseller: 'bg-orange-100 text-orange-700',
    Nouveau: 'bg-emerald-100 text-emerald-700',
    Populaire: 'bg-blue-100 text-blue-700',
    Promo: 'bg-red-100 text-red-700',
    Exclusif: 'bg-purple-100 text-purple-700',
  }
  return badge ? (m[badge] || 'bg-gray-100 text-gray-700') : ''
}

function txTypeLabel(t: string) {
  const m: Record<string, string> = {
    vente: 'Vente', remboursement: 'Remboursement',
    frais_amazon: 'Frais Amazon', publicite: 'Publicité', autre: 'Autre',
  }
  return m[t] || t
}

function txTypeColor(t: string) {
  if (t === 'vente') return 'bg-emerald-100 text-emerald-700'
  if (t === 'remboursement') return 'bg-red-100 text-red-700'
  if (t === 'frais_amazon') return 'bg-amber-100 text-amber-700'
  if (t === 'publicite') return 'bg-blue-100 text-blue-700'
  return 'bg-gray-100 text-gray-600'
}

function isRevenue(type: string) {
  return type === 'vente'
}

function fmtCAD(n: number) {
  return n.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD' })
}

// ─── Mini Stars ────────────────────────────────────────────────────────────────
function Stars({ r }: { r: number }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} size={10} className={i <= Math.round(r) ? 'text-amber-400 fill-amber-400' : 'text-gray-300'} />
      ))}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// PAGE PRINCIPALE
// ══════════════════════════════════════════════════════════════════════════════
export default function CommerceAdminPage() {
  const [authed, setAuthed] = useState(false)
  const [pwd, setPwd] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [pwdError, setPwdError] = useState('')
  const [tab, setTab] = useState<Tab>('produits')
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem(SESSION_KEY) === '1') {
      setAuthed(true)
    }
  }, [])

  useEffect(() => {
    if (toast) { const t = setTimeout(() => setToast(null), 3500); return () => clearTimeout(t) }
  }, [toast])

  const handleLogin = () => {
    if (pwd === ADMIN_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, '1')
      setAuthed(true)
      setPwdError('')
    } else {
      setPwdError('Mot de passe incorrect.')
    }
  }

  const handleLogout = () => {
    sessionStorage.removeItem(SESSION_KEY)
    setAuthed(false)
    setPwd('')
  }

  // ── Login screen ─────────────────────────────────────────────────────────────
  if (!authed) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4 pt-24">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <Image src="/logo-cerdia3.png" alt="CERDIA" width={80} height={40} className="mx-auto mb-4 h-10 w-auto" />
            <h1 className="text-2xl font-bold text-white">Administration Commerce</h1>
            <p className="text-gray-400 text-sm mt-1">Zone réservée — CERDIA Commerce</p>
          </div>

          <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 shadow-2xl">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                <Shield size={18} className="text-white" />
              </div>
              <div>
                <p className="font-semibold text-white text-sm">Accès sécurisé</p>
                <p className="text-xs text-gray-400">Entrez votre mot de passe administrateur</p>
              </div>
            </div>

            {pwdError && (
              <div className="mb-4 p-3 bg-red-900/40 border border-red-700 rounded-xl text-red-300 text-sm flex items-center gap-2">
                <AlertCircle size={14} /> {pwdError}
              </div>
            )}

            <div className="relative mb-4">
              <Lock size={16} className="absolute left-3 top-3 text-gray-400" />
              <input
                type={showPwd ? 'text' : 'password'}
                className="w-full pl-9 pr-10 py-2.5 bg-gray-700 border border-gray-600 rounded-xl text-sm text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 outline-none"
                placeholder="Mot de passe"
                value={pwd}
                onChange={e => { setPwd(e.target.value); setPwdError('') }}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                autoFocus
              />
              <button type="button" className="absolute right-3 top-3 text-gray-400 hover:text-gray-200" onClick={() => setShowPwd(v => !v)}>
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <button onClick={handleLogin} className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-semibold transition-colors">
              Accéder à l'administration
            </button>

            <div className="mt-4 pt-4 border-t border-gray-700 text-center">
              <Link href="/commerce" className="text-xs text-gray-500 hover:text-gray-300 transition-colors flex items-center justify-center gap-1.5">
                <Home size={12} /> Retour à la boutique
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Dashboard ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-20">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-24 right-4 z-50 px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 text-white text-sm font-medium ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
          {toast.type === 'success' ? <Check size={16} /> : <X size={16} />} {toast.msg}
        </div>
      )}

      {/* Header admin */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-[68px] z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <Image src="/logo-cerdia3.png" alt="CERDIA" width={50} height={25} className="h-7 w-auto" />
              <div>
                <span className="font-bold text-gray-900 dark:text-white text-sm">Commerce Admin</span>
                <span className="ml-2 px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-xs rounded-full font-medium">Actif</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/commerce" className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors hidden sm:block">
                ← Boutique
              </Link>
              <button onClick={handleLogout} className="flex items-center gap-1.5 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-1.5 rounded-full transition-colors border border-red-200 dark:border-red-800">
                <LogOut size={13} /> Déconnexion
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 -mb-px overflow-x-auto">
            {([
              { key: 'produits', label: 'Produits', icon: Package },
              { key: 'transactions', label: 'Transactions', icon: ArrowLeftRight },
              { key: 'rapports', label: 'Rapports', icon: BarChart2 },
              { key: 'factures', label: 'Factures', icon: FileText },
            ] as { key: Tab; label: string; icon: React.ElementType }[]).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  tab === key
                    ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                }`}
              >
                <Icon size={15} /> {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Contenu des onglets */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {tab === 'produits' && <ProduitsTab toast={setToast} />}
        {tab === 'transactions' && <TransactionsTab toast={setToast} />}
        {tab === 'rapports' && <RapportsTab />}
        {tab === 'factures' && <FacturesTab />}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// ONGLET PRODUITS
// ══════════════════════════════════════════════════════════════════════════════
function ProduitsTab({ toast }: { toast: (t: { msg: string; type: 'success' | 'error' }) => void }) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ ...EMPTY_PRODUCT })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [uploadingImg, setUploadingImg] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('commerce_products').select('*').order('sort_order').order('created_at', { ascending: false })
    setProducts(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const startNew = () => {
    setEditingId(null)
    setForm({ ...EMPTY_PRODUCT })
    setFormError('')
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const startEdit = (p: Product) => {
    setEditingId(p.id)
    const imgs = p.image_urls?.length
      ? p.image_urls
      : (p.image_url ? [p.image_url] : [])
    setForm({
      title: p.title, description: p.description || '',
      price: p.price?.toString() || '', currency: p.currency,
      amazon_url: p.amazon_url, image_urls: imgs,
      badge: p.badge || '', category: p.category || '',
      rating: p.rating, review_count: p.review_count,
      active: p.active, sort_order: p.sort_order,
    })
    setFormError('')
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const save = async () => {
    if (!form.title.trim()) { setFormError('Le titre est requis.'); return }
    if (!form.amazon_url.trim()) { setFormError('Le lien Amazon est requis.'); return }
    setSaving(true)
    try {
      const cleanUrls = form.image_urls.map(u => u.trim()).filter(Boolean)
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        price: form.price ? parseFloat(form.price as string) : null,
        currency: form.currency,
        amazon_url: form.amazon_url.trim(),
        image_url: cleanUrls[0] || null,
        image_urls: cleanUrls,
        badge: form.badge || null,
        category: form.category || null,
        rating: Number(form.rating) || 0,
        review_count: Number(form.review_count) || 0,
        active: Boolean(form.active),
        sort_order: Number(form.sort_order) || 0,
      }
      if (editingId) {
        await supabase.from('commerce_products').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editingId)
      } else {
        await supabase.from('commerce_products').insert(payload)
      }
      await load()
      setShowForm(false)
      setEditingId(null)
      setForm({ ...EMPTY_PRODUCT })
      toast({ msg: editingId ? 'Produit mis à jour !' : 'Produit ajouté !', type: 'success' })
    } catch {
      setFormError('Erreur lors de la sauvegarde.')
    } finally {
      setSaving(false)
    }
  }

  const del = async (id: string) => {
    if (!confirm('Supprimer ce produit ?')) return
    await supabase.from('commerce_products').delete().eq('id', id)
    await load()
    toast({ msg: 'Produit supprimé.', type: 'success' })
  }

  const toggleActive = async (p: Product) => {
    await supabase.from('commerce_products').update({ active: !p.active }).eq('id', p.id)
    await load()
  }

  const handleUpload = async (file: File) => {
    setUploadingImg(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `commerce/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage.from('attachments').upload(path, file, { upsert: true })
      if (error) throw error
      const { data: urlData } = supabase.storage.from('attachments').getPublicUrl(path)
      setForm(f => ({ ...f, image_urls: [...f.image_urls, urlData.publicUrl] }))
      toast({ msg: 'Image uploadée !', type: 'success' })
    } catch {
      toast({ msg: "Erreur d'upload. Vérifiez que le bucket 'attachments' est public dans Supabase Storage.", type: 'error' })
    } finally {
      setUploadingImg(false)
    }
  }

  const filtered = products.filter(p =>
    !search || p.title.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Gestion des produits</h2>
          <p className="text-sm text-gray-500">{products.length} produit{products.length !== 1 ? 's' : ''} au total</p>
        </div>
        <button onClick={startNew} className="flex items-center gap-2 bg-[#5e5e5e] text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-[#3e3e3e] transition-colors shadow-sm">
          <Plus size={15} /> Nouveau produit
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              {editingId ? 'Modifier le produit' : 'Nouveau produit'}
            </h3>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-700 transition-colors"><X size={18} /></button>
          </div>
          {formError && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{formError}</div>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Titre *</label>
              <input className="input" placeholder="Nom du produit..." value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Description</label>
              <textarea rows={2} className="input resize-none" placeholder="Description courte..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Lien Amazon *</label>
              <input className="input font-mono text-xs" placeholder="https://amazon.ca/dp/..." value={form.amazon_url} onChange={e => setForm(f => ({ ...f, amazon_url: e.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Images du produit ({form.image_urls.length})</label>
              <div className="space-y-2">
                {form.image_urls.map((url, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <span className="text-xs text-gray-400 w-5 flex-shrink-0">{idx + 1}.</span>
                    <input
                      className="input flex-1 text-xs"
                      placeholder="https://..."
                      value={url}
                      onChange={e => setForm(f => {
                        const arr = [...f.image_urls]; arr[idx] = e.target.value; return { ...f, image_urls: arr }
                      })}
                    />
                    {url && (
                      <img
                        src={url}
                        alt=""
                        className="h-9 w-9 rounded-lg object-cover border border-gray-200 flex-shrink-0"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                      />
                    )}
                    <button type="button" onClick={() => setForm(f => ({ ...f, image_urls: f.image_urls.filter((_, i) => i !== idx) }))}
                      className="text-red-400 hover:text-red-600 flex-shrink-0 transition-colors">
                      <X size={16} />
                    </button>
                  </div>
                ))}
                <div className="flex gap-2 pt-1">
                  <button type="button"
                    onClick={() => setForm(f => ({ ...f, image_urls: [...f.image_urls, ''] }))}
                    className="flex items-center gap-1.5 text-sm text-[#5e5e5e] dark:text-gray-300 border border-dashed border-gray-300 dark:border-gray-600 px-3 py-1.5 rounded-xl hover:border-orange-400 hover:text-orange-600 transition-colors">
                    <Plus size={13} /> Ajouter une URL
                  </button>
                  <button type="button" onClick={() => fileRef.current?.click()} disabled={uploadingImg}
                    className="flex items-center gap-1.5 text-sm bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 px-3 py-1.5 rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50">
                    {uploadingImg ? '⏳ Upload...' : '📁 Uploader fichier(s)'}
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
                    onChange={e => e.target.files && Array.from(e.target.files).forEach(handleUpload)} />
                </div>
              </div>
              {/* Aperçu galerie */}
              {form.image_urls.filter(Boolean).length > 0 && (
                <div className="flex gap-2 mt-3 flex-wrap">
                  {form.image_urls.filter(Boolean).map((url, i) => (
                    <div key={i} className="relative">
                      {i === 0 && <span className="absolute -top-1 -left-1 z-10 bg-orange-500 text-white text-[9px] font-bold px-1 rounded">MAIN</span>}
                      <img src={url} alt="" className="h-16 w-16 rounded-xl object-cover border-2 border-gray-200 dark:border-gray-600"
                        onError={e => { (e.target as HTMLImageElement).parentElement!.style.display = 'none' }} />
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="label">Prix</label>
              <div className="flex gap-2">
                <input type="number" step="0.01" min="0" className="input flex-1" placeholder="29.99" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
                <select className="input w-20" value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}>
                  <option>CAD</option><option>USD</option>
                </select>
              </div>
            </div>
            <div>
              <label className="label">Badge</label>
              <select className="input" value={form.badge} onChange={e => setForm(f => ({ ...f, badge: e.target.value }))}>
                {BADGE_OPTIONS.map(b => <option key={b} value={b}>{b || '— Aucun —'}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Catégorie</label>
              <select className="input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                <option value="">— Catégorie —</option>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Note / 5</label>
              <input type="number" step="0.1" min="0" max="5" className="input" value={form.rating} onChange={e => setForm(f => ({ ...f, rating: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div>
              <label className="label">Nb d'avis</label>
              <input type="number" min="0" className="input" value={form.review_count} onChange={e => setForm(f => ({ ...f, review_count: parseInt(e.target.value) || 0 }))} />
            </div>
            <div>
              <label className="label">Ordre d'affichage</label>
              <input type="number" min="0" className="input" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))} />
            </div>
            <div className="flex items-center gap-2 pt-4">
              <input type="checkbox" id="active-check" className="w-4 h-4 rounded" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} />
              <label htmlFor="active-check" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">Produit actif (visible sur la boutique)</label>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-5 pt-4 border-t border-gray-100 dark:border-gray-700">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Annuler</button>
            <button onClick={save} disabled={saving} className="flex items-center gap-2 px-5 py-2 bg-[#5e5e5e] text-white rounded-xl text-sm font-medium hover:bg-[#3e3e3e] transition-colors disabled:opacity-50">
              <Save size={14} /> {saving ? 'Sauvegarde...' : (editingId ? 'Mettre à jour' : 'Ajouter')}
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-2.5 text-gray-400" />
        <input className="w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-400 outline-none"
          placeholder="Rechercher un produit..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Product table */}
      {loading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center text-gray-400">
          <Package size={40} className="mx-auto mb-3 opacity-40" />
          <p>Aucun produit{search ? ' pour cette recherche' : ' — cliquez sur « Nouveau produit »'}</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Produit</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400 hidden sm:table-cell">Catégorie</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400 hidden md:table-cell">Prix</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400 hidden lg:table-cell">Note</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Statut</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filtered.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {(() => {
                          const thumb = (p.image_urls?.[0] || p.image_url) ?? ''
                          return thumb
                            ? <img src={thumb} alt="" className="w-10 h-10 rounded-lg object-cover border border-gray-100 flex-shrink-0"
                                onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                            : <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0"><Package size={16} className="text-gray-400" /></div>
                        })()}
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white truncate max-w-[180px]">{p.title}</p>
                          {p.badge && <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badgeColor(p.badge)}`}>{p.badge}</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{p.category || '—'}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white hidden md:table-cell">
                      {p.price ? `${p.price.toFixed(2)} ${p.currency}` : '—'}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {p.rating > 0 ? <Stars r={p.rating} /> : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => toggleActive(p)} className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${p.active ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                        {p.active ? 'Actif' : 'Inactif'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <a href={p.amazon_url} target="_blank" rel="noopener noreferrer" className="p-1.5 text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors" title="Voir sur Amazon">
                          <ShoppingCart size={14} />
                        </a>
                        <button onClick={() => startEdit(p)} className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => del(p.id)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// ONGLET TRANSACTIONS
// ══════════════════════════════════════════════════════════════════════════════
function TransactionsTab({ toast }: { toast: (t: { msg: string; type: 'success' | 'error' }) => void }) {
  const [txs, setTxs] = useState<CommerceTx[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ ...EMPTY_TX })
  const [saving, setSaving] = useState(false)
  const [filterType, setFilterType] = useState('tous')

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('commerce_transactions').select('*').order('date', { ascending: false }).order('created_at', { ascending: false })
    setTxs(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const startNew = () => {
    setEditingId(null)
    setForm({ ...EMPTY_TX, date: new Date().toISOString().split('T')[0] })
    setShowForm(true)
  }

  const startEdit = (tx: CommerceTx) => {
    setEditingId(tx.id)
    setForm({ date: tx.date, description: tx.description, amount: tx.amount, type: tx.type, platform: tx.platform, product_ref: tx.product_ref || '', status: tx.status, notes: tx.notes || '' })
    setShowForm(true)
  }

  const save = async () => {
    if (!form.description.trim()) { toast({ msg: 'Description requise.', type: 'error' }); return }
    setSaving(true)
    const payload = { ...form, amount: Number(form.amount) || 0 }
    try {
      if (editingId) {
        await supabase.from('commerce_transactions').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editingId)
      } else {
        await supabase.from('commerce_transactions').insert(payload)
      }
      await load()
      setShowForm(false)
      setEditingId(null)
      toast({ msg: editingId ? 'Transaction mise à jour !' : 'Transaction ajoutée !', type: 'success' })
    } catch {
      toast({ msg: 'Erreur de sauvegarde.', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const del = async (id: string) => {
    if (!confirm('Supprimer cette transaction ?')) return
    await supabase.from('commerce_transactions').delete().eq('id', id)
    await load()
    toast({ msg: 'Supprimée.', type: 'success' })
  }

  const filtered = txs.filter(t => filterType === 'tous' || t.type === filterType)

  const totalVentes = txs.filter(t => t.type === 'vente').reduce((s, t) => s + t.amount, 0)
  const totalDepenses = txs.filter(t => t.type !== 'vente').reduce((s, t) => s + t.amount, 0)
  const benefice = totalVentes - totalDepenses

  return (
    <div>
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center gap-2 text-emerald-600 mb-1"><TrendingUp size={16} /><span className="text-xs font-medium uppercase tracking-wide">Ventes totales</span></div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{fmtCAD(totalVentes)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center gap-2 text-red-500 mb-1"><TrendingDown size={16} /><span className="text-xs font-medium uppercase tracking-wide">Dépenses</span></div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{fmtCAD(totalDepenses)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center gap-2 text-blue-600 mb-1"><DollarSign size={16} /><span className="text-xs font-medium uppercase tracking-wide">Bénéfice net</span></div>
          <p className={`text-2xl font-bold ${benefice >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmtCAD(benefice)}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {['tous', ...TX_TYPES].map(t => (
            <button key={t} onClick={() => setFilterType(t)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filterType === t ? 'bg-[#5e5e5e] text-white' : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-400'}`}>
              {t === 'tous' ? 'Tous' : txTypeLabel(t)}
            </button>
          ))}
        </div>
        <button onClick={startNew} className="flex items-center gap-2 bg-[#5e5e5e] text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-[#3e3e3e] transition-colors shadow-sm flex-shrink-0">
          <Plus size={15} /> Nouvelle transaction
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 mb-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900 dark:text-white text-sm">{editingId ? 'Modifier' : 'Nouvelle transaction'}</h3>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Description *</label>
              <input className="input" placeholder="Ex: Vente casque audio..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div>
              <label className="label">Date</label>
              <input type="date" className="input" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div>
              <label className="label">Montant (CAD)</label>
              <input type="number" step="0.01" min="0" className="input" placeholder="0.00" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div>
              <label className="label">Type</label>
              <select className="input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                {TX_TYPES.map(t => <option key={t} value={t}>{txTypeLabel(t)}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Plateforme</label>
              <select className="input" value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}>
                {TX_PLATFORMS.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Référence produit</label>
              <input className="input" placeholder="ASIN ou nom court..." value={form.product_ref} onChange={e => setForm(f => ({ ...f, product_ref: e.target.value }))} />
            </div>
            <div>
              <label className="label">Statut</label>
              <select className="input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                {TX_STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label">Notes</label>
              <textarea rows={2} className="input resize-none" placeholder="Notes optionnelles..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 transition-colors">Annuler</button>
            <button onClick={save} disabled={saving} className="flex items-center gap-2 px-5 py-2 bg-[#5e5e5e] text-white rounded-xl text-sm font-medium hover:bg-[#3e3e3e] transition-colors disabled:opacity-50">
              <Save size={14} /> {saving ? 'Sauvegarde...' : (editingId ? 'Mettre à jour' : 'Ajouter')}
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center text-gray-400">
          <ArrowLeftRight size={40} className="mx-auto mb-3 opacity-40" />
          <p>Aucune transaction{filterType !== 'tous' ? ' pour ce type' : ' — ajoutez la première'}</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Description</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400 hidden sm:table-cell">Type</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400 hidden md:table-cell">Plateforme</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Montant</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filtered.map(tx => (
                  <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{new Date(tx.date + 'T12:00:00').toLocaleDateString('fr-CA')}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 dark:text-white">{tx.description}</p>
                      {tx.product_ref && <p className="text-xs text-gray-400">{tx.product_ref}</p>}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${txTypeColor(tx.type)}`}>{txTypeLabel(tx.type)}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{tx.platform}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-semibold ${isRevenue(tx.type) ? 'text-emerald-600' : 'text-red-500'}`}>
                        {isRevenue(tx.type) ? '+' : '-'}{fmtCAD(tx.amount)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => startEdit(tx)} className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"><Edit2 size={13} /></button>
                        <button onClick={() => del(tx.id)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// ONGLET RAPPORTS
// ══════════════════════════════════════════════════════════════════════════════
function RapportsTab() {
  const [txs, setTxs] = useState<CommerceTx[]>([])
  const [loading, setLoading] = useState(true)
  const [year, setYear] = useState(new Date().getFullYear())

  useEffect(() => {
    supabase.from('commerce_transactions').select('*').then(({ data }) => {
      setTxs(data || [])
      setLoading(false)
    })
  }, [])

  const yearTxs = txs.filter(t => new Date(t.date).getFullYear() === year)
  const ventes = yearTxs.filter(t => t.type === 'vente').reduce((s, t) => s + t.amount, 0)
  const fraisAmazon = yearTxs.filter(t => t.type === 'frais_amazon').reduce((s, t) => s + t.amount, 0)
  const publicite = yearTxs.filter(t => t.type === 'publicite').reduce((s, t) => s + t.amount, 0)
  const remboursements = yearTxs.filter(t => t.type === 'remboursement').reduce((s, t) => s + t.amount, 0)
  const autre = yearTxs.filter(t => t.type === 'autre').reduce((s, t) => s + t.amount, 0)
  const totalDepenses = fraisAmazon + publicite + remboursements + autre
  const benefice = ventes - totalDepenses
  const TPS = ventes * 0.05
  const TVQ = ventes * 0.09975

  const months = Array.from({ length: 12 }, (_, i) => {
    const label = new Date(year, i, 1).toLocaleDateString('fr-CA', { month: 'short' })
    const mv = yearTxs.filter(t => new Date(t.date).getMonth() === i && t.type === 'vente').reduce((s, t) => s + t.amount, 0)
    const md = yearTxs.filter(t => new Date(t.date).getMonth() === i && t.type !== 'vente').reduce((s, t) => s + t.amount, 0)
    return { label, ventes: mv, depenses: md }
  })
  const maxVal = Math.max(...months.map(m => Math.max(m.ventes, m.depenses)), 1)

  if (loading) return <div className="py-20 text-center text-gray-400">Chargement...</div>

  return (
    <div className="space-y-6">
      {/* Year selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Rapport fiscal {year}</h2>
        <div className="flex gap-2">
          {[year - 1, year, year + 1].map(y => (
            <button key={y} onClick={() => setYear(y)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${y === year ? 'bg-[#5e5e5e] text-white' : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-400'}`}>
              {y}
            </button>
          ))}
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Revenus bruts', value: ventes, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
          { label: 'Total dépenses', value: totalDepenses, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20' },
          { label: 'Bénéfice net', value: benefice, color: benefice >= 0 ? 'text-blue-600' : 'text-red-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
          { label: 'Marge nette', value: ventes > 0 ? (benefice / ventes * 100) : 0, isPct: true, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
        ].map(k => (
          <div key={k.label} className={`rounded-2xl p-5 border border-gray-100 dark:border-gray-700 ${k.bg}`}>
            <p className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">{k.label}</p>
            <p className={`text-xl font-bold ${k.color}`}>
              {k.isPct ? `${(k.value as number).toFixed(1)} %` : fmtCAD(k.value as number)}
            </p>
          </div>
        ))}
      </div>

      {/* Détail dépenses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4 text-sm">Détail des dépenses</h3>
          <div className="space-y-3">
            {[
              { label: 'Frais Amazon', val: fraisAmazon },
              { label: 'Publicité', val: publicite },
              { label: 'Remboursements', val: remboursements },
              { label: 'Autres', val: autre },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">{row.label}</span>
                <span className="font-semibold text-gray-900 dark:text-white text-sm">{fmtCAD(row.val)}</span>
              </div>
            ))}
            <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
              <span className="text-sm font-semibold text-gray-900 dark:text-white">Total dépenses</span>
              <span className="font-bold text-red-500">{fmtCAD(totalDepenses)}</span>
            </div>
          </div>
        </div>

        {/* Taxes estimées */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1 text-sm">Taxes estimées (QC)</h3>
          <p className="text-xs text-gray-400 mb-4">Sur les ventes au Québec — à titre indicatif seulement</p>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-700 dark:text-gray-300">TPS fédérale (5 %)</p>
              </div>
              <span className="font-semibold text-gray-900 dark:text-white text-sm">{fmtCAD(TPS)}</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-700 dark:text-gray-300">TVQ provinciale (9,975 %)</p>
              </div>
              <span className="font-semibold text-gray-900 dark:text-white text-sm">{fmtCAD(TVQ)}</span>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
              <span className="text-sm font-semibold text-gray-900 dark:text-white">Total taxes</span>
              <span className="font-bold text-amber-600">{fmtCAD(TPS + TVQ)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bar chart mensuel */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4 text-sm">Ventes vs Dépenses — {year}</h3>
        <div className="flex items-end gap-1.5 h-40">
          {months.map(m => (
            <div key={m.label} className="flex-1 flex flex-col items-center gap-0.5">
              <div className="w-full flex items-end gap-0.5 justify-center h-32">
                <div className="flex-1 bg-emerald-400 dark:bg-emerald-500 rounded-t-sm transition-all" style={{ height: `${(m.ventes / maxVal) * 100}%`, minHeight: m.ventes > 0 ? '4px' : '0' }} />
                <div className="flex-1 bg-red-300 dark:bg-red-400 rounded-t-sm transition-all" style={{ height: `${(m.depenses / maxVal) * 100}%`, minHeight: m.depenses > 0 ? '4px' : '0' }} />
              </div>
              <span className="text-[10px] text-gray-400 capitalize">{m.label}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4 mt-3">
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-emerald-400 rounded-sm" /><span className="text-xs text-gray-500">Ventes</span></div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-red-300 rounded-sm" /><span className="text-xs text-gray-500">Dépenses</span></div>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// ONGLET FACTURES
// ══════════════════════════════════════════════════════════════════════════════
function FacturesTab() {
  return <InvoiceGenerator />
}
