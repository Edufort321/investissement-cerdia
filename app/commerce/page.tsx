'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import {
  ShoppingCart, ExternalLink, Menu, X, Star, Plus, Edit2, Trash2,
  Save, Lock, Eye, EyeOff, Shield, Home, TrendingUp, LogIn,
  ChevronDown, Tag, Package, Search, SlidersHorizontal, Check
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Product {
  id: string
  title: string
  description?: string
  price?: number
  currency: string
  amazon_url: string
  image_url?: string
  badge?: string
  category?: string
  rating: number
  review_count: number
  active: boolean
  sort_order: number
  created_at: string
}

const ADMIN_PASSWORD = '321Eduf!$'
const BADGE_OPTIONS = ['Nouveau', 'Bestseller', 'Populaire', 'Promo', 'Exclusif', '']
const CATEGORY_OPTIONS = ['Tous', 'Maison & Cuisine', 'Électronique', 'Mode', 'Sport', 'Beauté', 'Livres', 'Autre']

const EMPTY_FORM = {
  title: '',
  description: '',
  price: '',
  currency: 'CAD',
  amazon_url: '',
  image_url: '',
  badge: '',
  category: '',
  rating: 0,
  review_count: 0,
  active: true,
  sort_order: 0,
}

// ─── Badge couleur ─────────────────────────────────────────────────────────────
function badgeColor(badge?: string) {
  const map: Record<string, string> = {
    Bestseller: 'bg-orange-500 text-white',
    Nouveau: 'bg-emerald-500 text-white',
    Populaire: 'bg-blue-500 text-white',
    Promo: 'bg-red-500 text-white',
    Exclusif: 'bg-purple-500 text-white',
  }
  return badge ? (map[badge] || 'bg-gray-500 text-white') : ''
}

// ─── Stars ────────────────────────────────────────────────────────────────────
function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          size={12}
          className={i <= Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-300 fill-gray-200'}
        />
      ))}
      {rating > 0 && <span className="text-xs text-gray-500 ml-1">{rating.toFixed(1)}</span>}
    </div>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function CommercePage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('Tous')
  const [menuOpen, setMenuOpen] = useState(false)

  // Auth admin
  const [adminMode, setAdminMode] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [pwdError, setPwdError] = useState('')

  // Form produit
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [uploadingImg, setUploadingImg] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Notifications
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  // ─── Load ──────────────────────────────────────────────────────────────────
  const loadProducts = async () => {
    setLoading(true)
    try {
      const query = supabase.from('commerce_products').select('*').order('sort_order').order('created_at', { ascending: false })
      if (!adminMode) query.eq('active', true)
      const { data } = await query
      setProducts(data || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadProducts() }, [adminMode])

  useEffect(() => {
    if (toast) { const t = setTimeout(() => setToast(null), 3500); return () => clearTimeout(t) }
  }, [toast])

  // Close menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const el = document.getElementById('commerce-menu')
      if (el && !el.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ─── Auth admin ─────────────────────────────────────────────────────────────
  const handlePasswordSubmit = () => {
    if (passwordInput === ADMIN_PASSWORD) {
      setAdminMode(true)
      setShowPasswordModal(false)
      setPasswordInput('')
      setPwdError('')
      setToast({ msg: 'Mode admin activé', type: 'success' })
    } else {
      setPwdError('Mot de passe incorrect.')
    }
  }

  // ─── CRUD produits ──────────────────────────────────────────────────────────
  const startNew = () => {
    setEditingId(null)
    setForm({ ...EMPTY_FORM })
    setFormError('')
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const startEdit = (p: Product) => {
    setEditingId(p.id)
    setForm({
      title: p.title,
      description: p.description || '',
      price: p.price?.toString() || '',
      currency: p.currency,
      amazon_url: p.amazon_url,
      image_url: p.image_url || '',
      badge: p.badge || '',
      category: p.category || '',
      rating: p.rating,
      review_count: p.review_count,
      active: p.active,
      sort_order: p.sort_order,
    })
    setFormError('')
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const saveProduct = async () => {
    if (!form.title.trim()) { setFormError('Le titre est requis.'); return }
    if (!form.amazon_url.trim()) { setFormError('Le lien Amazon est requis.'); return }

    setSaving(true)
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        price: form.price ? parseFloat(form.price as string) : null,
        currency: form.currency,
        amazon_url: form.amazon_url.trim(),
        image_url: form.image_url.trim() || null,
        badge: form.badge || null,
        category: form.category || null,
        rating: Number(form.rating) || 0,
        review_count: Number(form.review_count) || 0,
        active: form.active,
        sort_order: Number(form.sort_order) || 0,
      }

      if (editingId) {
        await supabase.from('commerce_products').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editingId)
      } else {
        await supabase.from('commerce_products').insert(payload)
      }

      await loadProducts()
      setShowForm(false)
      setEditingId(null)
      setForm({ ...EMPTY_FORM })
      setToast({ msg: editingId ? 'Produit mis à jour !' : 'Produit ajouté !', type: 'success' })
    } catch {
      setFormError('Erreur lors de la sauvegarde.')
    } finally {
      setSaving(false)
    }
  }

  const deleteProduct = async (id: string) => {
    if (!confirm('Supprimer ce produit ?')) return
    await supabase.from('commerce_products').delete().eq('id', id)
    await loadProducts()
    setToast({ msg: 'Produit supprimé.', type: 'success' })
  }

  const toggleActive = async (p: Product) => {
    await supabase.from('commerce_products').update({ active: !p.active }).eq('id', p.id)
    await loadProducts()
  }

  // ─── Upload image ────────────────────────────────────────────────────────────
  const handleImageUpload = async (file: File) => {
    setUploadingImg(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `commerce/${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('attachments').upload(path, file, { upsert: true })
      if (error) throw error
      const { data: urlData } = supabase.storage.from('attachments').getPublicUrl(path)
      setForm(f => ({ ...f, image_url: urlData.publicUrl }))
      setToast({ msg: 'Image uploadée !', type: 'success' })
    } catch {
      setToast({ msg: "Erreur d'upload. Utilisez un URL.", type: 'error' })
    } finally {
      setUploadingImg(false)
    }
  }

  // ─── Filtres ─────────────────────────────────────────────────────────────────
  const filtered = products.filter(p => {
    const matchSearch = !search || p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.description?.toLowerCase().includes(search.toLowerCase())
    const matchCat = selectedCategory === 'Tous' || p.category === selectedCategory
    return matchSearch && matchCat
  })

  const categories = ['Tous', ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))] as string[]

  // ═══════════════════════════════════════════════════════════════════════════
  // ── RENDU ──────────────────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-20">

      {/* ── Toast ─────────────────────────────────────────────────────────── */}
      {toast && (
        <div className={`fixed top-24 right-4 z-50 px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 text-white text-sm font-medium transition-all ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
          {toast.type === 'success' ? <Check size={16} /> : <X size={16} />}
          {toast.msg}
        </div>
      )}

      {/* ── Hero Banner ────────────────────────────────────────────────────── */}
      <div className="relative bg-[#1a1a1a] text-white overflow-hidden">
        {/* Background image avec overlay */}
        <div className="absolute inset-0">
          <Image
            src="/cerdia-slide-ecommerce.png"
            alt="Commerce CERDIA"
            fill
            className="object-cover object-center opacity-25"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
        </div>

        {/* Hero content */}
        <div className="relative z-10 max-w-7xl mx-auto px-6 py-16 sm:py-24">
          <div className="flex items-start justify-between gap-4">

            {/* Texte hero */}
            <div className="max-w-xl">
              <div className="flex items-center gap-2 mb-4">
                <span className="px-3 py-1 bg-orange-500/20 border border-orange-400/30 text-orange-300 text-xs font-semibold rounded-full uppercase tracking-wider">
                  Amazon FBA · E-Commerce
                </span>
              </div>
              <h1 className="text-4xl sm:text-5xl font-bold mb-4 leading-tight">
                Commerce<br />
                <span className="text-orange-400">CERDIA</span>
              </h1>
              <p className="text-lg text-gray-300 leading-relaxed mb-6">
                Découvrez notre sélection de produits soigneusement choisis — disponibles sur Amazon.
                Chaque achat contribue à financer notre portefeuille immobilier international.
              </p>
              <div className="flex items-center gap-3 text-sm text-gray-400 flex-wrap">
                <span className="flex items-center gap-1.5"><Check size={14} className="text-emerald-400" /> Livraison Amazon Prime</span>
                <span className="flex items-center gap-1.5"><Check size={14} className="text-emerald-400" /> Retours faciles</span>
                <span className="flex items-center gap-1.5"><Check size={14} className="text-emerald-400" /> Produits vérifiés</span>
              </div>
            </div>

            {/* Hamburger menu admin — aligné avec le badge */}
            <div id="commerce-menu" className="relative flex-shrink-0">
              <button
                onClick={() => setMenuOpen(v => !v)}
                className="p-2.5 bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-full hover:bg-white/20 transition-all"
                title="Menu"
              >
                {menuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="p-2 border-b border-gray-100 dark:border-gray-700">
                    <p className="text-xs text-gray-400 px-2 pb-1 font-medium uppercase tracking-wider">Navigation</p>
                  </div>
                  <div className="p-1.5 space-y-0.5">
                    <Link href="/" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors" onClick={() => setMenuOpen(false)}>
                      <Home size={15} className="text-gray-500" /> Accueil
                    </Link>
                    <Link href="/investir" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors" onClick={() => setMenuOpen(false)}>
                      <TrendingUp size={15} className="text-gray-500" /> Investir
                    </Link>
                  </div>
                  <div className="p-2 border-t border-gray-100 dark:border-gray-700">
                    <p className="text-xs text-gray-400 px-2 pb-1 font-medium uppercase tracking-wider">Accès</p>
                    <Link
                      href="/connexion?redirect=/dashboard"
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-[#5e5e5e] dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      onClick={() => setMenuOpen(false)}
                    >
                      <Shield size={15} className="text-[#5e5e5e]" /> Administrateur
                    </Link>
                    {!adminMode && (
                      <button
                        onClick={() => { setMenuOpen(false); setShowPasswordModal(true) }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
                      >
                        <Package size={15} /> Gérer les produits
                      </button>
                    )}
                    {adminMode && (
                      <button
                        onClick={() => { setAdminMode(false); setMenuOpen(false) }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <Lock size={15} /> Quitter le mode admin
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* ── Admin bar (si mode admin actif) ────────────────────────────────── */}
      {adminMode && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border-b-2 border-amber-400 sticky top-20 z-30">
          <div className="max-w-7xl mx-auto px-6 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 text-sm font-medium">
              <Shield size={16} /> Mode administrateur activé
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={startNew}
                className="flex items-center gap-2 bg-[#5e5e5e] text-white px-4 py-1.5 rounded-full text-sm font-medium hover:bg-[#3e3e3e] transition-colors"
              >
                <Plus size={14} /> Nouveau produit
              </button>
              <button
                onClick={() => setAdminMode(false)}
                className="flex items-center gap-2 text-red-600 px-3 py-1.5 rounded-full text-sm hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <Lock size={14} /> Quitter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Form ajout/édition (admin) ──────────────────────────────────────── */}
      {adminMode && showForm && (
        <div className="max-w-3xl mx-auto px-6 py-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {editingId ? '✏️ Modifier le produit' : '➕ Nouveau produit'}
              </h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-700 transition-colors">
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{formError}</div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Titre */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Titre du produit *</label>
                <input
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-400 outline-none"
                  placeholder="Nom du produit Amazon..."
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                />
              </div>

              {/* Description */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Description</label>
                <textarea
                  rows={3}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-400 outline-none resize-none"
                  placeholder="Description courte du produit..."
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>

              {/* Lien Amazon */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Lien Amazon *</label>
                <input
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-400 outline-none font-mono"
                  placeholder="https://amazon.ca/dp/..."
                  value={form.amazon_url}
                  onChange={e => setForm(f => ({ ...f, amazon_url: e.target.value }))}
                />
              </div>

              {/* Image URL */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Image</label>
                <div className="flex gap-2">
                  <input
                    className="flex-1 border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-400 outline-none"
                    placeholder="https://... ou uploader ci-dessous"
                    value={form.image_url}
                    onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))}
                  />
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploadingImg}
                    className="px-4 py-2.5 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 whitespace-nowrap"
                  >
                    {uploadingImg ? 'Upload...' : '📁 Fichier'}
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
                  />
                </div>
                {form.image_url && (
                  <div className="mt-2 relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200">
                    <img src={form.image_url} alt="preview" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              {/* Prix + devise */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Prix</label>
                <div className="flex gap-2">
                  <input
                    type="number" step="0.01" min="0"
                    className="flex-1 border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-400 outline-none"
                    placeholder="29.99"
                    value={form.price}
                    onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                  />
                  <select
                    className="border border-gray-300 dark:border-gray-600 rounded-xl px-2 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-400 outline-none"
                    value={form.currency}
                    onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
                  >
                    <option>CAD</option><option>USD</option>
                  </select>
                </div>
              </div>

              {/* Badge */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Badge</label>
                <select
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-400 outline-none"
                  value={form.badge}
                  onChange={e => setForm(f => ({ ...f, badge: e.target.value }))}
                >
                  {BADGE_OPTIONS.map(b => <option key={b} value={b}>{b || '— Aucun badge —'}</option>)}
                </select>
              </div>

              {/* Catégorie */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Catégorie</label>
                <select
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-400 outline-none"
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                >
                  <option value="">— Catégorie —</option>
                  {CATEGORY_OPTIONS.slice(1).map(c => <option key={c}>{c}</option>)}
                </select>
              </div>

              {/* Note + Avis */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Note / 5</label>
                <input
                  type="number" step="0.1" min="0" max="5"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-400 outline-none"
                  value={form.rating}
                  onChange={e => setForm(f => ({ ...f, rating: parseFloat(e.target.value) || 0 }))}
                />
              </div>

              {/* Nb avis */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Nombre d'avis</label>
                <input
                  type="number" min="0"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-400 outline-none"
                  value={form.review_count}
                  onChange={e => setForm(f => ({ ...f, review_count: parseInt(e.target.value) || 0 }))}
                />
              </div>

              {/* Ordre + Actif */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Ordre d'affichage</label>
                <input
                  type="number" min="0"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-400 outline-none"
                  value={form.sort_order}
                  onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))}
                />
              </div>

              <div className="flex items-center gap-3 pt-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-gray-300 text-orange-500"
                    checked={form.active}
                    onChange={e => setForm(f => ({ ...f, active: e.target.checked }))}
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Produit actif (visible)</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors">
                Annuler
              </button>
              <button
                onClick={saveProduct}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2 bg-[#5e5e5e] text-white rounded-xl text-sm font-medium hover:bg-[#3e3e3e] transition-colors disabled:opacity-50"
              >
                <Save size={14} /> {saving ? 'Sauvegarde...' : (editingId ? 'Mettre à jour' : 'Ajouter le produit')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Filtres & Recherche ─────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          {/* Search */}
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-3 text-gray-400" />
            <input
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-400 outline-none shadow-sm"
              placeholder="Rechercher un produit..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Catégories */}
          <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  selectedCategory === cat
                    ? 'bg-[#5e5e5e] text-white shadow-sm'
                    : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-400 hover:text-gray-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Compteur */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-gray-500">
            {loading ? 'Chargement...' : `${filtered.length} produit${filtered.length !== 1 ? 's' : ''} trouvé${filtered.length !== 1 ? 's' : ''}`}
          </p>
          {adminMode && !showForm && (
            <button
              onClick={startNew}
              className="flex items-center gap-2 bg-[#5e5e5e] text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-[#3e3e3e] transition-colors shadow-sm"
            >
              <Plus size={14} /> Ajouter un produit
            </button>
          )}
        </div>

        {/* ── Grille de produits ──────────────────────────────────────────── */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden animate-pulse">
                <div className="h-56 bg-gray-200 dark:bg-gray-700" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
                  <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-full mt-4" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-24 text-center">
            <Package size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium text-gray-500">
              {products.length === 0 ? 'Aucun produit pour le moment' : 'Aucun produit ne correspond à votre recherche'}
            </p>
            {adminMode && products.length === 0 && (
              <button onClick={startNew} className="mt-4 inline-flex items-center gap-2 bg-[#5e5e5e] text-white px-6 py-2.5 rounded-full text-sm font-medium hover:bg-[#3e3e3e] transition-colors">
                <Plus size={14} /> Ajouter votre premier produit
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                adminMode={adminMode}
                onEdit={() => startEdit(product)}
                onDelete={() => deleteProduct(product.id)}
                onToggle={() => toggleActive(product)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Footer minimal ──────────────────────────────────────────────────── */}
      <footer className="mt-16 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-3">
            <Image src="/logo-cerdia3.png" alt="CERDIA" width={60} height={20} className="h-6 w-auto opacity-70" />
            <span>Commerce CERDIA — Amazon Affiliate</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-gray-800 dark:hover:text-gray-200 transition-colors">Accueil</Link>
            <Link href="/connexion" className="hover:text-gray-800 dark:hover:text-gray-200 transition-colors">Connexion</Link>
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <span>© 2025 CERDIA</span>
          </div>
        </div>
      </footer>

      {/* ── Modal mot de passe admin ─────────────────────────────────────────── */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-[#5e5e5e] rounded-full flex items-center justify-center">
                <Shield size={18} className="text-white" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-gray-100">Accès administrateur</h3>
                <p className="text-xs text-gray-500">Entrez le mot de passe pour gérer les produits</p>
              </div>
            </div>

            {pwdError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{pwdError}</div>
            )}

            <div className="relative mb-4">
              <Lock size={16} className="absolute left-3 top-3 text-gray-400" />
              <input
                type={showPwd ? 'text' : 'password'}
                className="w-full pl-9 pr-10 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#5e5e5e] outline-none"
                placeholder="Mot de passe"
                value={passwordInput}
                onChange={e => { setPasswordInput(e.target.value); setPwdError('') }}
                onKeyDown={e => e.key === 'Enter' && handlePasswordSubmit()}
                autoFocus
              />
              <button
                type="button"
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                onClick={() => setShowPwd(v => !v)}
              >
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setShowPasswordModal(false); setPasswordInput(''); setPwdError('') }}
                className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handlePasswordSubmit}
                className="flex-1 py-2.5 bg-[#5e5e5e] text-white rounded-xl text-sm font-medium hover:bg-[#3e3e3e] transition-colors"
              >
                Accéder
              </button>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 text-center">
              <Link
                href="/connexion?redirect=/dashboard"
                className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 flex items-center justify-center gap-1.5 transition-colors"
              >
                <LogIn size={12} /> Ou accéder au tableau de bord complet
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Composant ProductCard ─────────────────────────────────────────────────────
function ProductCard({
  product, adminMode, onEdit, onDelete, onToggle
}: {
  product: Product
  adminMode: boolean
  onEdit: () => void
  onDelete: () => void
  onToggle: () => void
}) {
  const [hovered, setHovered] = useState(false)

  const handleCardClick = () => {
    if (!adminMode) {
      window.open(product.amazon_url, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <div
      className={`group relative bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border transition-all duration-300 cursor-pointer
        ${!product.active && adminMode ? 'opacity-50' : ''}
        ${hovered
          ? 'shadow-xl border-orange-200 dark:border-orange-800 -translate-y-1'
          : 'shadow-md border-gray-100 dark:border-gray-700 hover:shadow-xl hover:border-orange-200 dark:hover:border-orange-800 hover:-translate-y-1'
        }`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={!adminMode ? handleCardClick : undefined}
    >
      {/* Badge */}
      {product.badge && (
        <div className={`absolute top-3 left-3 z-10 px-2.5 py-0.5 rounded-full text-xs font-semibold ${badgeColor(product.badge)}`}>
          {product.badge}
        </div>
      )}

      {/* Admin controls */}
      {adminMode && (
        <div className="absolute top-3 right-3 z-10 flex gap-1.5">
          <button
            onClick={e => { e.stopPropagation(); onToggle() }}
            className={`p-1.5 rounded-full shadow-sm text-xs font-bold transition-colors ${
              product.active ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-gray-400 text-white hover:bg-gray-500'
            }`}
            title={product.active ? 'Désactiver' : 'Activer'}
          >
            {product.active ? <Eye size={12} /> : <EyeOff size={12} />}
          </button>
          <button
            onClick={e => { e.stopPropagation(); onEdit() }}
            className="p-1.5 bg-blue-500 text-white rounded-full shadow-sm hover:bg-blue-600 transition-colors"
          >
            <Edit2 size={12} />
          </button>
          <button
            onClick={e => { e.stopPropagation(); onDelete() }}
            className="p-1.5 bg-red-500 text-white rounded-full shadow-sm hover:bg-red-600 transition-colors"
          >
            <Trash2 size={12} />
          </button>
        </div>
      )}

      {/* Image */}
      <div className="relative h-56 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 overflow-hidden">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.title}
            className="w-full h-full object-contain p-4 transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <Package size={48} className="text-gray-300 dark:text-gray-500" />
          </div>
        )}
        {/* Gradient overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Catégorie */}
        {product.category && (
          <div className="flex items-center gap-1 mb-2">
            <Tag size={10} className="text-gray-400" />
            <span className="text-xs text-gray-400 uppercase tracking-wider">{product.category}</span>
          </div>
        )}

        {/* Titre */}
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm leading-snug mb-2 line-clamp-2 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
          {product.title}
        </h3>

        {/* Description */}
        {product.description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-3 leading-relaxed">
            {product.description}
          </p>
        )}

        {/* Stars + avis */}
        {product.rating > 0 && (
          <div className="flex items-center gap-1.5 mb-3">
            <Stars rating={product.rating} />
            {product.review_count > 0 && (
              <span className="text-xs text-gray-400">({product.review_count.toLocaleString('fr-CA')})</span>
            )}
          </div>
        )}

        {/* Prix */}
        {product.price && (
          <div className="mb-3">
            <span className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {product.price.toLocaleString('fr-CA', { style: 'currency', currency: product.currency, minimumFractionDigits: 2 })}
            </span>
          </div>
        )}

        {/* CTA Amazon */}
        <a
          href={product.amazon_url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => adminMode && e.preventDefault()}
          className="flex items-center justify-center gap-2 w-full py-2.5 bg-[#FF9900] hover:bg-[#e68a00] text-white text-sm font-semibold rounded-xl transition-all duration-200 group-hover:shadow-md"
        >
          <ShoppingCart size={15} />
          Voir sur Amazon
          <ExternalLink size={12} className="opacity-70" />
        </a>
      </div>
    </div>
  )
}
