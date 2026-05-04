'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import InvoiceGenerator from '@/components/admin/InvoiceGenerator'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  Lock, Eye, EyeOff, LogOut, Package, ArrowLeftRight, BarChart2,
  FileText, Plus, Edit2, Trash2, Save, X, Star, Tag, Search,
  TrendingUp, TrendingDown, DollarSign, ShoppingCart, AlertCircle,
  Check, ChevronDown, Shield, Home, Paperclip, Download, FileDown, Menu
} from 'lucide-react'

// ─── Types ─────────────────────────────────────────────────────────────────────
interface ProductAttachment {
  name: string
  url: string
  path: string
}

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
  inventory: number
  gs1_code?: string
  asin?: string
  product_attachments?: ProductAttachment[]
  created_at: string
}

interface CommerceTx {
  id: string
  date: string
  description: string
  amount: number
  type: string
  account: string
  fiscal_category: string
  platform: string
  product_ref?: string
  status: string
  notes?: string
  attachment_name?: string
  attachment_url?: string
  attachment_storage_path?: string
  transfer_to_account?: string
  created_at: string
}

// ─── Groupes fiscaux eCommerce ─────────────────────────────────────────────────
const FISCAL_GROUPS = {
  REVENUS: {
    label: 'Revenus', color: [34, 197, 94] as [number,number,number],
    bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200',
    text: 'text-emerald-700',
    cats: ['revenu_ventes', 'revenu_affilie', 'revenu_autre'],
  },
  OPEX: {
    label: 'Dépenses opérationnelles (OPEX)', color: [59, 130, 246] as [number,number,number],
    bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200',
    text: 'text-blue-700',
    cats: [
      'opex_amazon', 'opex_pub', 'opex_expedition', 'opex_stockage', 'opex_emballage',
      'opex_retours', 'opex_logiciels', 'opex_telecom', 'opex_bancaire',
      'opex_salaire', 'opex_sous_traitance', 'opex_professionnel',
      'opex_assurance', 'opex_fournitures', 'opex_autre',
    ],
  },
  CAPEX: {
    label: 'Investissements (CAPEX)', color: [249, 115, 22] as [number,number,number],
    bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-200',
    text: 'text-orange-700',
    cats: ['capex_stock', 'capex_importation', 'capex_equipement', 'capex_autre'],
  },
  FINANCEMENT: {
    label: 'Financement', color: [168, 85, 247] as [number,number,number],
    bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-200',
    text: 'text-purple-700',
    cats: ['financement_apport', 'financement_avance', 'financement_pret', 'transfert_interne'],
  },
}

const FISCAL_CATS: Record<string, { label: string; group: keyof typeof FISCAL_GROUPS }> = {
  // Revenus
  revenu_ventes:        { label: 'Ventes produits',              group: 'REVENUS' },
  revenu_affilie:       { label: 'Commissions affilié',          group: 'REVENUS' },
  revenu_autre:         { label: 'Autres revenus',               group: 'REVENUS' },
  // OPEX — Plateformes & Marketing
  opex_amazon:          { label: 'Frais Amazon / plateforme',    group: 'OPEX' },
  opex_pub:             { label: 'Publicité & Marketing',        group: 'OPEX' },
  // OPEX — Logistique
  opex_expedition:      { label: 'Expédition & livraison',       group: 'OPEX' },
  opex_stockage:        { label: 'Stockage / entreposage (FBA)', group: 'OPEX' },
  opex_emballage:       { label: 'Emballage & matériaux',        group: 'OPEX' },
  opex_retours:         { label: 'Retours & remboursements',     group: 'OPEX' },
  // OPEX — Services & Abonnements
  opex_logiciels:       { label: 'Abonnements & logiciels',      group: 'OPEX' },
  opex_telecom:         { label: 'Téléphone & internet',         group: 'OPEX' },
  opex_bancaire:        { label: 'Frais bancaires',              group: 'OPEX' },
  // OPEX — Ressources humaines
  opex_salaire:         { label: 'Salaires & RH',                group: 'OPEX' },
  opex_sous_traitance:  { label: 'Sous-traitance / freelance',   group: 'OPEX' },
  // OPEX — Frais professionnels
  opex_professionnel:   { label: 'Comptabilité / légal',         group: 'OPEX' },
  opex_assurance:       { label: 'Assurance',                    group: 'OPEX' },
  opex_fournitures:     { label: 'Fournitures & bureau',         group: 'OPEX' },
  opex_autre:           { label: 'Autres dépenses OPEX',         group: 'OPEX' },
  // CAPEX
  capex_stock:          { label: 'Achat de stock / inventaire',  group: 'CAPEX' },
  capex_importation:    { label: 'Douane & importation',         group: 'CAPEX' },
  capex_equipement:     { label: 'Équipement & matériel',        group: 'CAPEX' },
  capex_autre:          { label: 'Autres investissements',       group: 'CAPEX' },
  // Financement
  financement_apport:   { label: 'Apport personnel',             group: 'FINANCEMENT' },
  financement_avance:   { label: 'Avance de fonds (fondateur)',  group: 'FINANCEMENT' },
  financement_pret:     { label: 'Prêt / Ligne de crédit',       group: 'FINANCEMENT' },
  transfert_interne:    { label: 'Transfert entre comptes',      group: 'FINANCEMENT' },
}

// ─── Convertit un lien Google Drive en URL d'image directe ───────────────────
function toDirectImg(url: string): string {
  if (!url) return url
  const m = url.match(/\/d\/([a-zA-Z0-9_-]+)/)
  if (m) return `https://drive.google.com/uc?export=view&id=${m[1]}`
  const m2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/)
  if (m2) return `https://drive.google.com/uc?export=view&id=${m2[1]}`
  return url
}

// ─── Constants ─────────────────────────────────────────────────────────────────
const ADMIN_PASSWORD = '321Eduf!$'
const SESSION_KEY = 'commerce_admin_auth'

const TX_TYPES = [
  'vente',
  'remboursement', 'frais_amazon', 'publicite', 'frais_expedition',
  'frais_stockage', 'emballage', 'abonnement', 'telecom', 'frais_bancaires',
  'salaire', 'sous_traitance', 'frais_professionnel', 'assurance', 'fournitures',
  'achat_inventaire', 'frais_importation', 'achat_equipement',
  'avance_fonds', 'transfert', 'autre',
] as const

const TX_TYPE_GROUPS = [
  {
    label: '⬆️ Entrées',
    types: ['vente', 'avance_fonds'],
  },
  {
    label: '⬇️ Sorties — OPEX',
    types: ['remboursement', 'frais_amazon', 'publicite', 'frais_expedition', 'frais_stockage', 'emballage', 'abonnement', 'telecom', 'frais_bancaires', 'salaire', 'sous_traitance', 'frais_professionnel', 'assurance', 'fournitures'],
  },
  {
    label: '⬇️ Sorties — CAPEX',
    types: ['achat_inventaire', 'frais_importation', 'achat_equipement'],
  },
  {
    label: '↔️ Neutre',
    types: ['transfert', 'autre'],
  },
]
const TX_PLATFORMS = ['Amazon', 'Shopify', 'Etsy', 'Site web', 'Autre']
const TX_STATUSES = ['complété', 'en attente', 'annulé']
const TX_ACCOUNTS = [
  { value: 'compte_courant', label: 'Compte courant' },
  { value: 'carte_credit', label: 'Carte de crédit' },
  { value: 'capex', label: 'Compte CAPEX' },
]

const BADGE_OPTIONS = ['', 'Nouveau', 'Bestseller', 'Populaire', 'Promo', 'Exclusif']
const CATEGORIES = ['Maison & Cuisine', 'Électronique', 'Mode', 'Sport', 'Beauté', 'Livres', 'Autre']

const EMPTY_PRODUCT = {
  title: '', description: '', price: '', currency: 'CAD',
  amazon_url: '', image_urls: [] as string[], badge: '', category: '',
  rating: 0, review_count: 0, active: true, sort_order: 0, inventory: 0,
  gs1_code: '', asin: '',
  product_attachments: [] as ProductAttachment[],
}

const EMPTY_TX: Omit<CommerceTx, 'id' | 'created_at'> = {
  date: new Date().toISOString().split('T')[0],
  description: '', amount: 0, type: 'vente', account: 'compte_courant',
  fiscal_category: 'revenu_ventes',
  platform: 'Amazon', product_ref: '', status: 'complété', notes: '',
  attachment_name: '', attachment_url: '', attachment_storage_path: '',
  transfer_to_account: '',
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
    vente: 'Vente',
    remboursement: 'Remboursement client',
    frais_amazon: 'Frais Amazon / plateforme',
    publicite: 'Publicité & Marketing',
    frais_expedition: 'Expédition & livraison',
    frais_stockage: 'Stockage / FBA',
    emballage: 'Emballage',
    abonnement: 'Abonnement / logiciel',
    telecom: 'Téléphone & internet',
    frais_bancaires: 'Frais bancaires',
    salaire: 'Salaire',
    sous_traitance: 'Sous-traitance / freelance',
    frais_professionnel: 'Comptabilité / légal',
    assurance: 'Assurance',
    fournitures: 'Fournitures & bureau',
    achat_inventaire: 'Achat inventaire',
    frais_importation: 'Douane & importation',
    achat_equipement: 'Achat équipement',
    avance_fonds: 'Avance de fonds',
    transfert: 'Transfert entre comptes',
    autre: 'Autre dépense',
  }
  return m[t] || t
}

function txTypeColor(t: string) {
  if (t === 'vente') return 'bg-emerald-100 text-emerald-700'
  if (t === 'avance_fonds') return 'bg-purple-100 text-purple-700'
  if (t === 'transfert') return 'bg-indigo-100 text-indigo-700'
  if (t === 'remboursement') return 'bg-red-100 text-red-700'
  if (t === 'frais_amazon') return 'bg-amber-100 text-amber-700'
  if (t === 'publicite') return 'bg-blue-100 text-blue-700'
  if (t === 'achat_inventaire' || t === 'frais_importation' || t === 'achat_equipement') return 'bg-orange-100 text-orange-700'
  if (t === 'frais_expedition' || t === 'frais_stockage' || t === 'emballage') return 'bg-cyan-100 text-cyan-700'
  if (t === 'salaire' || t === 'sous_traitance') return 'bg-rose-100 text-rose-700'
  if (t === 'abonnement' || t === 'telecom') return 'bg-violet-100 text-violet-700'
  if (t === 'frais_professionnel' || t === 'assurance') return 'bg-teal-100 text-teal-700'
  if (t === 'frais_bancaires') return 'bg-slate-100 text-slate-600'
  return 'bg-gray-100 text-gray-600'
}

// Retourne true si la transaction est une entrée d'argent (hors transferts)
function isInflow(type: string) {
  return type === 'vente' || type === 'avance_fonds'
}

// Retourne true si le type compte dans le bénéfice net (revenus d'exploitation seulement)
function isRevenue(type: string) {
  return type === 'vente'
}

// Retourne l'effet net d'une transaction sur un compte spécifique
function txAccountEffect(tx: CommerceTx, account: string): number {
  const src = tx.account || 'compte_courant'
  if (tx.type === 'transfert') {
    if (src === account) return -tx.amount
    if (tx.transfer_to_account === account) return tx.amount
    return 0
  }
  if (src !== account) return 0
  return isInflow(tx.type) ? tx.amount : -tx.amount
}

function fmtCAD(n: number) {
  return n.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD' })
}

async function uploadViaApi(file: File, path: string): Promise<string> {
  const fd = new FormData()
  fd.append('file', file)
  fd.append('path', path)
  const res = await fetch('/api/commerce/upload', { method: 'POST', body: fd })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`)
  return json.url as string
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
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 fixed top-[68px] left-0 right-0 z-30 shadow-sm">
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 pt-[7rem]">
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
  const [uploadingDoc, setUploadingDoc] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const docRef = useRef<HTMLInputElement>(null)

  const load = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('commerce_products')
      .select('*')
      .order('sort_order')
      .order('created_at', { ascending: false })
    if (error) {
      setFormError(`Erreur de chargement : ${error.message} — Avez-vous exécuté la migration SQL 126 dans Supabase ?`)
    }
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
      active: p.active, sort_order: p.sort_order, inventory: p.inventory ?? 0,
      gs1_code: p.gs1_code || '', asin: p.asin || '',
      product_attachments: p.product_attachments || [],
    })
    setFormError('')
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const save = async () => {
    if (!form.title.trim()) { setFormError('Le titre est requis.'); return }
    if (!form.amazon_url.trim()) { setFormError('Le lien Amazon est requis.'); return }
    setSaving(true)
    setFormError('')
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
        inventory: Number(form.inventory) || 0,
        gs1_code: (form.gs1_code as string).trim() || null,
        asin: (form.asin as string).trim() || null,
        product_attachments: form.product_attachments || [],
      }

      const { error } = editingId
        ? await supabase.from('commerce_products').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editingId)
        : await supabase.from('commerce_products').insert(payload)

      if (error) {
        setFormError(`Erreur Supabase : ${error.message}${error.code === '42P01' ? ' — La table n\'existe pas, exécutez la migration SQL 126.' : ''}${error.code === '42501' ? ' — Permission refusée. Vérifiez les politiques RLS dans Supabase.' : ''}`)
        return
      }

      await load()
      setShowForm(false)
      setEditingId(null)
      setForm({ ...EMPTY_PRODUCT })
      toast({ msg: editingId ? 'Produit mis à jour !' : 'Produit ajouté !', type: 'success' })
    } catch (e: unknown) {
      setFormError(`Erreur inattendue : ${e instanceof Error ? e.message : String(e)}`)
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
      const url = await uploadViaApi(file, path)
      setForm(f => ({ ...f, image_urls: [...f.image_urls, url] }))
      toast({ msg: 'Image uploadée !', type: 'success' })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      toast({ msg: `Erreur upload: ${msg}`, type: 'error' })
    } finally {
      setUploadingImg(false)
    }
  }

  const handleDocUpload = async (file: File) => {
    setUploadingDoc(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `commerce/products/docs/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const url = await uploadViaApi(file, path)
      const att: ProductAttachment = { name: file.name, url, path }
      setForm(f => ({ ...f, product_attachments: [...(f.product_attachments || []), att] }))
      toast({ msg: 'Document joint !', type: 'success' })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      toast({ msg: `Erreur upload: ${msg}`, type: 'error' })
    } finally {
      setUploadingDoc(false)
    }
  }

  const removeDoc = async (idx: number) => {
    const att = form.product_attachments?.[idx]
    if (att?.path) await supabase.storage.from('attachments').remove([att.path])
    setForm(f => ({ ...f, product_attachments: (f.product_attachments || []).filter((_, i) => i !== idx) }))
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
                      <img src={toDirectImg(url)} alt="" className="h-16 w-16 rounded-xl object-cover border-2 border-gray-200 dark:border-gray-600"
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
            <div>
              <label className="label">Inventaire (unités en stock)</label>
              <input type="number" min="0" className="input" placeholder="0" value={form.inventory} onChange={e => setForm(f => ({ ...f, inventory: parseInt(e.target.value) || 0 }))} />
            </div>
            <div>
              <label className="label">Code GS1 / GTIN / EAN</label>
              <input className="input font-mono" placeholder="Ex: 00614141000036" value={form.gs1_code as string} onChange={e => setForm(f => ({ ...f, gs1_code: e.target.value }))} />
            </div>
            <div>
              <label className="label">ASIN Amazon</label>
              <input className="input font-mono" placeholder="Ex: B08N5WRWNW" value={form.asin as string} onChange={e => setForm(f => ({ ...f, asin: e.target.value }))} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Pièces jointes (certificat GS1, fiche produit, photos...)</label>
              <div className="space-y-2">
                {(form.product_attachments as ProductAttachment[]).map((att, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-2.5 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600">
                    <Paperclip size={14} className="text-blue-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{att.name}</p>
                      <a href={att.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline">Voir le fichier</a>
                    </div>
                    <button type="button" onClick={() => removeDoc(idx)} className="text-red-400 hover:text-red-600 p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex-shrink-0">
                      <X size={14} />
                    </button>
                  </div>
                ))}
                <button type="button" onClick={() => docRef.current?.click()} disabled={uploadingDoc}
                  className="flex items-center gap-2 w-full p-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors disabled:opacity-50">
                  <Paperclip size={15} />
                  {uploadingDoc ? 'Upload en cours...' : 'Joindre un document (PDF, image, Excel...)'}
                </button>
                <input ref={docRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.csv,.xlsx,.xls,.doc,.docx" multiple className="hidden"
                  onChange={e => e.target.files && Array.from(e.target.files).forEach(handleDocUpload)} />
              </div>
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
                  <th className="text-center px-4 py-3 font-medium text-gray-600 dark:text-gray-400 hidden md:table-cell">Stock</th>
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
                          const thumb = toDirectImg((p.image_urls?.[0] || p.image_url) ?? '')
                          return thumb
                            ? <img src={thumb} alt="" className="w-10 h-10 rounded-lg object-cover border border-gray-100 flex-shrink-0"
                                onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                            : <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0"><Package size={16} className="text-gray-400" /></div>
                        })()}
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white truncate max-w-[180px]">{p.title}</p>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            {p.badge && <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badgeColor(p.badge)}`}>{p.badge}</span>}
                            {p.asin && <span className="text-[10px] font-mono text-gray-400">{p.asin}</span>}
                            {(p.product_attachments?.length ?? 0) > 0 && (
                              <span className="flex items-center gap-0.5 text-[10px] text-blue-500">
                                <Paperclip size={9} />{p.product_attachments!.length}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{p.category || '—'}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white hidden md:table-cell">
                      {p.price ? `${p.price.toFixed(2)} ${p.currency}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-center hidden md:table-cell">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        (p.inventory ?? 0) === 0 ? 'bg-red-100 text-red-700' :
                        (p.inventory ?? 0) <= 5 ? 'bg-amber-100 text-amber-700' :
                        'bg-emerald-100 text-emerald-700'
                      }`}>
                        {p.inventory ?? 0}
                      </span>
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
  const [filterAccount, setFilterAccount] = useState('tous')
  const [filterFiscalGroup, setFilterFiscalGroup] = useState('tous')
  const [filterYear, setFilterYear] = useState('tous')
  const [showTxMenu, setShowTxMenu] = useState(false)
  const [showGuide, setShowGuide] = useState(false)
  const [uploadingAttachment, setUploadingAttachment] = useState(false)
  const [exportingPDF, setExportingPDF] = useState(false)
  const [pdfIncludeLinks, setPdfIncludeLinks] = useState(true)
  const attachRef = useRef<HTMLInputElement>(null)

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
    setForm({
      date: tx.date, description: tx.description, amount: tx.amount,
      type: tx.type, account: tx.account || 'compte_courant',
      fiscal_category: tx.fiscal_category || 'opex_autre',
      platform: tx.platform, product_ref: tx.product_ref || '',
      status: tx.status, notes: tx.notes || '',
      attachment_name: tx.attachment_name || '',
      attachment_url: tx.attachment_url || '',
      attachment_storage_path: tx.attachment_storage_path || '',
      transfer_to_account: tx.transfer_to_account || '',
    })
    setShowForm(true)
  }

  const save = async () => {
    if (!form.description.trim()) { toast({ msg: 'Description requise.', type: 'error' }); return }
    if (form.type === 'transfert' && !form.transfer_to_account) {
      toast({ msg: 'Sélectionnez le compte de destination.', type: 'error' }); return
    }
    if (form.type === 'transfert' && form.transfer_to_account === form.account) {
      toast({ msg: 'Les comptes source et destination doivent être différents.', type: 'error' }); return
    }
    setSaving(true)
    const payload = {
      ...form, amount: Number(form.amount) || 0,
      attachment_name: form.attachment_name || null,
      attachment_url: form.attachment_url || null,
      attachment_storage_path: form.attachment_storage_path || null,
      transfer_to_account: form.type === 'transfert' ? (form.transfer_to_account || null) : null,
    }
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
    // Supprimer la pièce jointe du storage si elle existe
    const tx = txs.find(t => t.id === id)
    if (tx?.attachment_storage_path) {
      await supabase.storage.from('attachments').remove([tx.attachment_storage_path])
    }
    await supabase.from('commerce_transactions').delete().eq('id', id)
    await load()
    toast({ msg: 'Supprimée.', type: 'success' })
  }

  const handleAttachmentUpload = async (file: File) => {
    setUploadingAttachment(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `commerce/tx/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const url = await uploadViaApi(file, path)
      setForm(f => ({ ...f, attachment_name: file.name, attachment_url: url, attachment_storage_path: path }))
      toast({ msg: 'Pièce jointe uploadée !', type: 'success' })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      toast({ msg: `Erreur upload: ${msg}`, type: 'error' })
    } finally {
      setUploadingAttachment(false)
    }
  }

  const removeAttachment = async () => {
    if (form.attachment_storage_path) {
      await supabase.storage.from('attachments').remove([form.attachment_storage_path])
    }
    setForm(f => ({ ...f, attachment_name: '', attachment_url: '', attachment_storage_path: '' }))
  }

  const exportPDF = async () => {
    setExportingPDF(true)
    try {
      const doc = new jsPDF()
      const pageW = doc.internal.pageSize.getWidth()
      const year = new Date().getFullYear()

      // Logo
      try {
        const r = await fetch('/logo-cerdia3.png')
        const blob = await r.blob()
        const b64: string = await new Promise(res => { const fr = new FileReader(); fr.onloadend = () => res(fr.result as string); fr.readAsDataURL(blob) })
        doc.addImage(b64, 'PNG', 15, 10, 24, 8)
      } catch {}

      // En-tête
      doc.setFontSize(18); doc.setTextColor(94, 94, 94)
      doc.text('Registre des transactions', pageW - 15, 16, { align: 'right' })
      doc.setFontSize(10); doc.setTextColor(150, 150, 150)
      doc.text(`Commerce CERDIA inc. — Généré le ${new Date().toLocaleDateString('fr-CA')}`, pageW - 15, 22, { align: 'right' })
      doc.setDrawColor(220, 220, 220); doc.setLineWidth(0.4)
      doc.line(15, 27, pageW - 15, 27)

      // Sommaire
      const totalRev = filtered.filter(t => isRevenue(t.type)).reduce((s, t) => s + t.amount, 0)
      const totalDep = filtered.filter(t => !isInflow(t.type) && t.type !== 'transfert').reduce((s, t) => s + t.amount, 0)
      autoTable(doc, {
        startY: 32,
        head: [['Entrées (revenus)', 'Sorties (dépenses)', 'Balance nette']],
        body: [[fmtCAD(totalRev), fmtCAD(totalDep), fmtCAD(totalRev - totalDep)]],
        theme: 'grid',
        headStyles: { fillColor: [94, 94, 94], fontSize: 9, halign: 'center' },
        bodyStyles: { fontSize: 10, halign: 'center', fontStyle: 'bold' },
        columnStyles: { 0: { textColor: [34, 197, 94] }, 1: { textColor: [239, 68, 68] }, 2: { textColor: totalRev - totalDep >= 0 ? [34, 197, 94] : [239, 68, 68] } },
        margin: { left: 15, right: 15 },
      })

      // Table transactions
      const rows = filtered.map(tx => [
        new Date(tx.date + 'T12:00:00').toLocaleDateString('fr-CA'),
        txTypeLabel(tx.type),
        FISCAL_CATS[tx.fiscal_category || 'opex_autre']?.label ?? '—',
        tx.description + (tx.product_ref ? `\n${tx.product_ref}` : ''),
        TX_ACCOUNTS.find(a => a.value === (tx.account || 'compte_courant'))?.label ?? '—',
        (isInflow(tx.type) ? '+' : '-') + fmtCAD(tx.amount),
        tx.status,
        pdfIncludeLinks && tx.attachment_url ? tx.attachment_name || 'PJ' : (tx.attachment_name ? '📎' : ''),
      ])

      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 6,
        head: [['Date', 'Type', 'Cat. fiscale', 'Description', 'Compte', 'Montant', 'Statut', 'PJ']],
        body: rows,
        theme: 'striped',
        headStyles: { fillColor: [94, 94, 94], fontSize: 8, fontStyle: 'bold' },
        bodyStyles: { fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 20 }, 1: { cellWidth: 18 }, 2: { cellWidth: 28 },
          3: { cellWidth: 50 }, 4: { cellWidth: 22 }, 5: { halign: 'right', cellWidth: 22 },
          6: { cellWidth: 16 }, 7: { cellWidth: 20 },
        },
        didParseCell: (data) => {
          if (data.column.index === 5) {
            const val = String(data.cell.raw || '')
            data.cell.styles.textColor = val.startsWith('+') ? [34, 197, 94] : [239, 68, 68]
          }
          if (pdfIncludeLinks && data.column.index === 7 && data.section === 'body') {
            const tx = filtered[data.row.index]
            if (tx?.attachment_url) {
              data.cell.styles.textColor = [59, 130, 246]
            }
          }
        },
        didDrawCell: (data) => {
          if (pdfIncludeLinks && data.column.index === 7 && data.section === 'body') {
            const tx = filtered[data.row.index]
            if (tx?.attachment_url) {
              doc.link(data.cell.x, data.cell.y, data.cell.width, data.cell.height, { url: tx.attachment_url })
            }
          }
        },
        margin: { left: 15, right: 15 },
      })

      // Footer sur chaque page
      const totalPages = (doc as any).internal.getNumberOfPages()
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i)
        const pH = doc.internal.pageSize.getHeight()
        doc.setDrawColor(220, 220, 220); doc.line(15, pH - 15, pageW - 15, pH - 15)
        doc.setFontSize(7); doc.setTextColor(150, 150, 150)
        doc.text('Commerce CERDIA inc. — Rapport généré automatiquement', pageW / 2, pH - 9, { align: 'center' })
        doc.text(`Page ${i} sur ${totalPages}`, pageW - 15, pH - 9, { align: 'right' })
      }

      doc.save(`Transactions_Commerce_CERDIA_${year}.pdf`)
      toast({ msg: 'PDF exporté !', type: 'success' })
    } catch (e) {
      toast({ msg: 'Erreur export PDF.', type: 'error' })
    } finally {
      setExportingPDF(false)
    }
  }

  const exportCSV = () => {
    const headers = ['Date', 'Type', 'Catégorie fiscale', 'Description', 'Référence', 'Compte', 'Plateforme', 'Montant CAD', 'Statut', 'Notes', 'Pièce jointe', 'URL PJ']
    const rows = filtered.map(tx => [
      tx.date,
      txTypeLabel(tx.type),
      FISCAL_CATS[tx.fiscal_category || 'opex_autre']?.label ?? '',
      tx.description,
      tx.product_ref || '',
      TX_ACCOUNTS.find(a => a.value === (tx.account || 'compte_courant'))?.label ?? '',
      tx.platform,
      (isInflow(tx.type) ? '' : '-') + tx.amount.toFixed(2),
      tx.status,
      tx.notes || '',
      tx.attachment_name || '',
      tx.attachment_url || '',
    ])
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `Transactions_Commerce_CERDIA_${new Date().getFullYear()}.csv`; a.click()
    URL.revokeObjectURL(url)
    toast({ msg: 'CSV exporté !', type: 'success' })
  }

  const availableYears = Array.from(new Set(txs.map(t => new Date(t.date).getFullYear()))).sort((a, b) => b - a)

  const filtered = txs.filter(t => {
    if (filterType !== 'tous' && t.type !== filterType) return false
    if (filterAccount !== 'tous') {
      const src = t.account || 'compte_courant'
      const dst = t.transfer_to_account
      if (src !== filterAccount && dst !== filterAccount) return false
    }
    if (filterFiscalGroup !== 'tous') {
      const grp = FISCAL_GROUPS[filterFiscalGroup as keyof typeof FISCAL_GROUPS]
      if (!grp || !grp.cats.includes(t.fiscal_category || 'opex_autre')) return false
    }
    if (filterYear !== 'tous' && new Date(t.date).getFullYear().toString() !== filterYear) return false
    return true
  })

  const totalVentes = txs.filter(t => isRevenue(t.type)).reduce((s, t) => s + t.amount, 0)
  const totalDepenses = txs.filter(t => !isInflow(t.type) && t.type !== 'transfert').reduce((s, t) => s + t.amount, 0)
  const benefice = totalVentes - totalDepenses

  // Soldes par compte
  const soldeCourant = txs.reduce((s, t) => s + txAccountEffect(t, 'compte_courant'), 0)
  const soldeCarte   = txs.reduce((s, t) => s + txAccountEffect(t, 'carte_credit'), 0)
  const soldeCapex   = txs.reduce((s, t) => s + txAccountEffect(t, 'capex'), 0)

  return (
    <div>
      {/* Soldes par compte */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        {[
          { label: 'Compte courant', solde: soldeCourant, icon: DollarSign, color: 'text-blue-600', border: 'border-blue-200 dark:border-blue-800', bg: 'bg-blue-50 dark:bg-blue-900/20' },
          { label: 'Carte de crédit', solde: soldeCarte, icon: TrendingDown, color: soldeCarte >= 0 ? 'text-emerald-600' : 'text-red-600', border: 'border-purple-200 dark:border-purple-800', bg: 'bg-purple-50 dark:bg-purple-900/20' },
          { label: 'Compte CAPEX', solde: soldeCapex, icon: TrendingUp, color: 'text-orange-600', border: 'border-orange-200 dark:border-orange-800', bg: 'bg-orange-50 dark:bg-orange-900/20' },
        ].map(card => (
          <div key={card.label} className={`rounded-2xl p-5 border ${card.border} ${card.bg} shadow-sm`}>
            <div className="flex items-center gap-2 mb-1">
              <card.icon size={15} className={card.color} />
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{card.label}</span>
            </div>
            <p className={`text-2xl font-bold ${card.color}`}>{fmtCAD(card.solde)}</p>
          </div>
        ))}
      </div>

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
      <div className="flex items-center justify-end gap-2 mb-4">
        <div className="relative">
          <button
            onClick={() => setShowTxMenu(v => !v)}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Menu size={18} className="text-gray-700 dark:text-gray-300" />
            <span className="hidden sm:inline text-gray-700 dark:text-gray-300">Menu</span>
          </button>

          {showTxMenu && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setShowTxMenu(false)} />
              <div className="absolute right-0 top-full mt-1 z-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg w-72 py-1 overflow-hidden">

                {/* Filtres */}
                <div className="px-4 pt-3 pb-3 space-y-2 border-b border-gray-100 dark:border-gray-700">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Filtres</p>
                  <select
                    value={filterType} onChange={e => setFilterType(e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:ring-1 focus:ring-gray-400"
                  >
                    <option value="tous">Tous les types</option>
                    {TX_TYPE_GROUPS.map(g => (
                      <optgroup key={g.label} label={g.label}>
                        {g.types.map(t => <option key={t} value={t}>{txTypeLabel(t)}</option>)}
                      </optgroup>
                    ))}
                  </select>
                  <select
                    value={filterFiscalGroup} onChange={e => setFilterFiscalGroup(e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:ring-1 focus:ring-gray-400"
                  >
                    <option value="tous">Toutes les catégories</option>
                    {(Object.entries(FISCAL_GROUPS) as [keyof typeof FISCAL_GROUPS, typeof FISCAL_GROUPS[keyof typeof FISCAL_GROUPS]][]).map(([k, g]) => (
                      <option key={k} value={k}>{g.label}</option>
                    ))}
                  </select>
                  <select
                    value={filterAccount} onChange={e => setFilterAccount(e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:ring-1 focus:ring-gray-400"
                  >
                    <option value="tous">Tous les comptes</option>
                    {TX_ACCOUNTS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                  </select>
                  <select
                    value={filterYear} onChange={e => setFilterYear(e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:ring-1 focus:ring-gray-400"
                  >
                    <option value="tous">Toutes les années</option>
                    {availableYears.map(y => <option key={y} value={String(y)}>{y}</option>)}
                  </select>
                </div>

                {/* Actions */}
                <button
                  onClick={() => { setShowGuide(v => !v); setShowTxMenu(false) }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${showGuide ? 'text-gray-900 dark:text-white font-semibold bg-gray-50 dark:bg-gray-700' : 'text-gray-700 dark:text-gray-300'}`}
                >
                  📖 Guide de saisie
                </button>

                <div className="border-t border-gray-100 dark:border-gray-700 my-1" />

                {/* Export */}
                <button
                  onClick={() => { exportPDF(); setShowTxMenu(false) }}
                  disabled={exportingPDF}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  <FileDown size={15} />
                  {exportingPDF ? 'Génération...' : 'Exporter PDF'}
                </button>
                <button
                  onClick={() => { exportCSV(); setShowTxMenu(false) }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <Download size={15} />
                  Exporter CSV
                </button>
                <div className="px-4 py-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-500 dark:text-gray-400">
                    <input type="checkbox" checked={pdfIncludeLinks} onChange={e => setPdfIncludeLinks(e.target.checked)} className="accent-gray-700 w-3.5 h-3.5" />
                    Inclure liens PJ dans PDF
                  </label>
                </div>
              </div>
            </>
          )}
        </div>

        <button onClick={startNew} className="flex items-center gap-1.5 bg-[#5e5e5e] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#3e3e3e] transition-colors shadow-sm">
          <Plus size={14} /> Nouvelle transaction
        </button>
      </div>

      {/* Guide de saisie */}
      {showGuide && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-5 mb-5">
          <div className="flex items-start justify-between mb-3">
            <h3 className="text-base font-bold text-blue-900 dark:text-blue-200">📖 Guide de saisie — Transactions eCommerce</h3>
            <button onClick={() => setShowGuide(false)} className="text-blue-400 hover:text-blue-700"><X size={16} /></button>
          </div>
          <div className="space-y-4 text-sm text-blue-800 dark:text-blue-300">
            <div>
              <p className="font-semibold mb-1">① Champs obligatoires</p>
              <ul className="list-disc list-inside space-y-0.5 text-blue-700 dark:text-blue-400">
                <li><strong>Date</strong> — date réelle de la transaction (pas d&apos;aujourd&apos;hui par défaut)</li>
                <li><strong>Description</strong> — nom du produit, service ou référence</li>
                <li><strong>Montant</strong> — toujours positif, le type détermine le sens</li>
                <li><strong>Compte</strong> — compte depuis lequel la transaction a eu lieu</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold mb-1">② Catégorie fiscale</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-white dark:bg-blue-900/30 rounded-lg p-2.5">
                  <p className="font-bold text-emerald-700 dark:text-emerald-400 mb-1">REVENUS</p>
                  <p>Ventes Amazon, commissions affilié, autres revenus</p>
                </div>
                <div className="bg-white dark:bg-blue-900/30 rounded-lg p-2.5">
                  <p className="font-bold text-blue-700 dark:text-blue-400 mb-1">OPEX</p>
                  <p>Frais Amazon, pub, expédition, logiciels, bancaires</p>
                </div>
                <div className="bg-white dark:bg-blue-900/30 rounded-lg p-2.5">
                  <p className="font-bold text-orange-700 dark:text-orange-400 mb-1">CAPEX</p>
                  <p>Achat de stock, équipement — actifs durables</p>
                </div>
                <div className="bg-white dark:bg-blue-900/30 rounded-lg p-2.5">
                  <p className="font-bold text-purple-700 dark:text-purple-400 mb-1">FINANCEMENT</p>
                  <p>Apport fondateur, avance de fonds, prêt, transfert</p>
                </div>
              </div>
            </div>
            <div>
              <p className="font-semibold mb-1">③ Pièces jointes</p>
              <p className="text-blue-700 dark:text-blue-400">Joindre le reçu ou la facture à chaque transaction de dépense. Formats acceptés : PDF, JPG, PNG, CSV, XLSX.</p>
            </div>
            <div>
              <p className="font-semibold mb-1">④ Transferts entre comptes</p>
              <p className="text-blue-700 dark:text-blue-400">Un transfert est neutre pour le P&amp;L. Sélectionner type <em>Transfert</em>, puis compte source et destination. Les deux soldes sont ajustés automatiquement.</p>
            </div>
          </div>
        </div>
      )}

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
            <div className="sm:col-span-2">
              <label className="label">Type de transaction</label>
              {(() => {
                const defaultCat: Record<string, string> = {
                  vente: 'revenu_ventes', remboursement: 'opex_retours',
                  frais_amazon: 'opex_amazon', publicite: 'opex_pub',
                  frais_expedition: 'opex_expedition', frais_stockage: 'opex_stockage',
                  emballage: 'opex_emballage', abonnement: 'opex_logiciels',
                  telecom: 'opex_telecom', frais_bancaires: 'opex_bancaire',
                  salaire: 'opex_salaire', sous_traitance: 'opex_sous_traitance',
                  frais_professionnel: 'opex_professionnel', assurance: 'opex_assurance',
                  fournitures: 'opex_fournitures', achat_inventaire: 'capex_stock',
                  frais_importation: 'capex_importation', achat_equipement: 'capex_equipement',
                  avance_fonds: 'financement_avance', transfert: 'transfert_interne',
                  autre: 'opex_autre',
                }
                const entreeTypes = TX_TYPE_GROUPS.filter(g => g.label.includes('Entrée'))
                const sortieTypes = TX_TYPE_GROUPS.filter(g => g.label.includes('Sortie'))
                const neutralTypes = TX_TYPE_GROUPS.filter(g => g.label.includes('Neutre'))
                const currentDir = isInflow(form.type) ? 'entree' : form.type === 'transfert' || form.type === 'autre' ? 'neutre' : 'sortie'
                return (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      {[
                        { key: 'entree', label: '⬆️ Entrée', color: 'bg-emerald-500 text-white border-emerald-500', inactive: 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-emerald-400 hover:text-emerald-600' },
                        { key: 'sortie', label: '⬇️ Sortie', color: 'bg-red-500 text-white border-red-500', inactive: 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-red-400 hover:text-red-600' },
                        { key: 'neutre', label: '↔️ Neutre', color: 'bg-indigo-500 text-white border-indigo-500', inactive: 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-indigo-400 hover:text-indigo-600' },
                      ].map(({ key, label, color, inactive }) => (
                        <button key={key} type="button"
                          className={`flex-1 py-2 text-sm font-medium rounded-xl border transition-colors ${currentDir === key ? color : `bg-white dark:bg-gray-800 ${inactive}`}`}
                          onClick={() => {
                            const firstType = key === 'entree' ? entreeTypes[0].types[0] : key === 'sortie' ? sortieTypes[0].types[0] : neutralTypes[0].types[0]
                            setForm(f => ({ ...f, type: firstType, fiscal_category: defaultCat[firstType] ?? f.fiscal_category }))
                          }}>
                          {label}
                        </button>
                      ))}
                    </div>
                    <select className="input" value={form.type} onChange={e => {
                      const t = e.target.value
                      setForm(f => ({ ...f, type: t, fiscal_category: defaultCat[t] ?? f.fiscal_category }))
                    }}>
                      {(currentDir === 'entree' ? entreeTypes : currentDir === 'sortie' ? sortieTypes : neutralTypes).map(g => (
                        <optgroup key={g.label} label={g.label.replace(/^[⬆️⬇️↔️]\s*/, '').replace('Sorties — ', '')}>
                          {g.types.map(t => <option key={t} value={t}>{txTypeLabel(t)}</option>)}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                )
              })()}
            </div>
            <div>
              <label className="label">Catégorie fiscale</label>
              {form.type === 'transfert' ? (
                <div className="input bg-gray-50 dark:bg-gray-700 text-gray-500 cursor-default">Transfert entre comptes</div>
              ) : (() => {
                const dir = isInflow(form.type) ? 'entree' : form.type === 'autre' ? 'neutre' : 'sortie'
                const visibleGroups = dir === 'entree'
                  ? (['REVENUS'] as const)
                  : dir === 'sortie'
                  ? (['OPEX', 'CAPEX'] as const)
                  : (['FINANCEMENT'] as const)
                return (
                  <select className="input" value={form.fiscal_category} onChange={e => setForm(f => ({ ...f, fiscal_category: e.target.value }))}>
                    {visibleGroups.map(gKey => (
                      <optgroup key={gKey} label={FISCAL_GROUPS[gKey].label}>
                        {FISCAL_GROUPS[gKey].cats.filter(c => c !== 'transfert_interne').map(cat => (
                          <option key={cat} value={cat}>{FISCAL_CATS[cat]?.label ?? cat}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                )
              })()}
            </div>
            <div>
              <label className="label">{form.type === 'transfert' ? 'Compte source' : 'Compte'}</label>
              <select className="input" value={form.account} onChange={e => setForm(f => ({ ...f, account: e.target.value }))}>
                {TX_ACCOUNTS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
            </div>
            {form.type === 'transfert' && (
              <div>
                <label className="label">Compte destination</label>
                <select className="input" value={form.transfer_to_account}
                  onChange={e => setForm(f => ({ ...f, transfer_to_account: e.target.value }))}>
                  <option value="">— Sélectionner —</option>
                  {TX_ACCOUNTS.filter(a => a.value !== form.account).map(a => (
                    <option key={a.value} value={a.value}>{a.label}</option>
                  ))}
                </select>
              </div>
            )}
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
              <label className="label">Pièce jointe (facture, reçu, relevé...)</label>
              {form.attachment_name ? (
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600">
                  <Paperclip size={15} className="text-blue-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{form.attachment_name}</p>
                    {form.attachment_url && (
                      <a href={form.attachment_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline">Voir le fichier</a>
                    )}
                  </div>
                  <button type="button" onClick={removeAttachment} className="text-red-400 hover:text-red-600 flex-shrink-0 p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => attachRef.current?.click()} disabled={uploadingAttachment}
                  className="flex items-center gap-2 w-full p-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors disabled:opacity-50">
                  <Paperclip size={15} />
                  {uploadingAttachment ? 'Upload en cours...' : 'Joindre un fichier (PDF, image, CSV...)'}
                </button>
              )}
              <input ref={attachRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.csv,.xlsx,.xls" className="hidden"
                onChange={e => e.target.files?.[0] && handleAttachmentUpload(e.target.files[0])} />
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
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400 hidden sm:table-cell">Type / Cat.</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400 hidden md:table-cell">Compte</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400 hidden lg:table-cell">Plateforme</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600 dark:text-gray-400 hidden sm:table-cell">PJ</th>
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
                      <div className="space-y-1">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${txTypeColor(tx.type)}`}>{txTypeLabel(tx.type)}</span>
                        {tx.type === 'transfert' && tx.transfer_to_account ? (
                          <p className="text-xs text-indigo-500">
                            {TX_ACCOUNTS.find(a => a.value === (tx.account || 'compte_courant'))?.label} → {TX_ACCOUNTS.find(a => a.value === tx.transfer_to_account)?.label}
                          </p>
                        ) : tx.fiscal_category ? (
                          <p className="text-xs text-gray-400">{FISCAL_CATS[tx.fiscal_category]?.label ?? tx.fiscal_category}</p>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        tx.account === 'carte_credit' ? 'bg-purple-100 text-purple-700' :
                        tx.account === 'capex' ? 'bg-orange-100 text-orange-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {TX_ACCOUNTS.find(a => a.value === (tx.account || 'compte_courant'))?.label ?? 'Compte courant'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">{tx.platform}</td>
                    <td className="px-4 py-3 text-center hidden sm:table-cell">
                      {tx.attachment_url ? (
                        <a href={tx.attachment_url} target="_blank" rel="noopener noreferrer" title={tx.attachment_name}
                          className="inline-flex items-center justify-center p-1 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
                          <Paperclip size={13} />
                        </a>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {tx.type === 'transfert' ? (
                        <span className="font-semibold text-indigo-600">{fmtCAD(tx.amount)}</span>
                      ) : (
                        <span className={`font-semibold ${isInflow(tx.type) ? 'text-emerald-600' : 'text-red-500'}`}>
                          {isInflow(tx.type) ? '+' : '-'}{fmtCAD(tx.amount)}
                        </span>
                      )}
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
  const [exportingPDF, setExportingPDF] = useState(false)

  useEffect(() => {
    supabase.from('commerce_transactions').select('*').then(({ data }) => {
      setTxs(data || [])
      setLoading(false)
    })
  }, [])

  const yearTxs = txs.filter(t => new Date(t.date).getFullYear() === year)

  const groupTotals = (Object.entries(FISCAL_GROUPS) as [keyof typeof FISCAL_GROUPS, typeof FISCAL_GROUPS[keyof typeof FISCAL_GROUPS]][]).map(([gKey, g]) => {
    const gTxs = yearTxs.filter(t => g.cats.includes(t.fiscal_category || 'opex_autre'))
    const total = gTxs.reduce((s, t) => s + t.amount, 0)
    return { key: gKey, ...g, txs: gTxs, total }
  })

  const totalRevenus = groupTotals.find(g => g.key === 'REVENUS')?.total ?? 0
  const totalOPEX = groupTotals.find(g => g.key === 'OPEX')?.total ?? 0
  const totalCAPEX = groupTotals.find(g => g.key === 'CAPEX')?.total ?? 0
  const totalFinancement = groupTotals.find(g => g.key === 'FINANCEMENT')?.total ?? 0
  const beneficeNet = totalRevenus - totalOPEX - totalCAPEX
  const marge = totalRevenus > 0 ? (beneficeNet / totalRevenus * 100) : 0
  const TPS = totalRevenus * 0.05
  const TVQ = totalRevenus * 0.09975

  const months = Array.from({ length: 12 }, (_, i) => {
    const label = new Date(year, i, 1).toLocaleDateString('fr-CA', { month: 'short' })
    const rev = yearTxs.filter(t => new Date(t.date).getMonth() === i && FISCAL_GROUPS.REVENUS.cats.includes(t.fiscal_category || '')).reduce((s, t) => s + t.amount, 0)
    const dep = yearTxs.filter(t => new Date(t.date).getMonth() === i && !FISCAL_GROUPS.REVENUS.cats.includes(t.fiscal_category || '') && !FISCAL_GROUPS.FINANCEMENT.cats.includes(t.fiscal_category || '')).reduce((s, t) => s + t.amount, 0)
    return { label, rev, dep }
  })
  const maxVal = Math.max(...months.map(m => Math.max(m.rev, m.dep)), 1)

  const exportPDF = async () => {
    setExportingPDF(true)
    try {
      const doc = new jsPDF()
      const pageW = doc.internal.pageSize.getWidth()

      try {
        const r = await fetch('/logo-cerdia3.png')
        const blob = await r.blob()
        const b64: string = await new Promise(res => { const fr = new FileReader(); fr.onloadend = () => res(fr.result as string); fr.readAsDataURL(blob) })
        doc.addImage(b64, 'PNG', 15, 10, 24, 8)
      } catch {}

      doc.setFontSize(16); doc.setTextColor(94, 94, 94)
      doc.text(`Rapport fiscal eCommerce — ${year}`, pageW - 15, 14, { align: 'right' })
      doc.setFontSize(9); doc.setTextColor(150, 150, 150)
      doc.text(`Commerce CERDIA inc. — Généré le ${new Date().toLocaleDateString('fr-CA')}`, pageW - 15, 20, { align: 'right' })
      doc.setDrawColor(220, 220, 220); doc.setLineWidth(0.4)
      doc.line(15, 25, pageW - 15, 25)

      autoTable(doc, {
        startY: 30,
        head: [['Revenus bruts', 'OPEX', 'CAPEX', 'Bénéfice net', 'Marge nette']],
        body: [[fmtCAD(totalRevenus), fmtCAD(totalOPEX), fmtCAD(totalCAPEX), fmtCAD(beneficeNet), `${marge.toFixed(1)} %`]],
        theme: 'grid',
        headStyles: { fillColor: [94, 94, 94], fontSize: 8, halign: 'center' },
        bodyStyles: { fontSize: 10, halign: 'center', fontStyle: 'bold' },
        columnStyles: {
          0: { textColor: [34, 197, 94] as [number,number,number] },
          1: { textColor: [59, 130, 246] as [number,number,number] },
          2: { textColor: [249, 115, 22] as [number,number,number] },
          3: { textColor: (beneficeNet >= 0 ? [34, 197, 94] : [239, 68, 68]) as [number,number,number] },
          4: { textColor: [168, 85, 247] as [number,number,number] },
        },
        margin: { left: 15, right: 15 },
      })

      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 4,
        head: [['TPS fédérale (5 %)', 'TVQ provinciale (9,975 %)', 'Total taxes estimées']],
        body: [[fmtCAD(TPS), fmtCAD(TVQ), fmtCAD(TPS + TVQ)]],
        theme: 'grid',
        headStyles: { fillColor: [180, 120, 40], fontSize: 8, halign: 'center' },
        bodyStyles: { fontSize: 9, halign: 'center' },
        margin: { left: 15, right: 15 },
      })

      for (const grp of groupTotals) {
        if (grp.txs.length === 0) continue
        const [r, g, b] = grp.color
        const y = (doc as any).lastAutoTable.finalY + 8
        doc.setFontSize(11); doc.setTextColor(r, g, b)
        doc.text(`${grp.label} — ${fmtCAD(grp.total)}`, 15, y)
        autoTable(doc, {
          startY: y + 3,
          head: [['Date', 'Catégorie', 'Description', 'Compte', 'Plateforme', 'Montant']],
          body: grp.txs.map(tx => [
            new Date(tx.date + 'T12:00:00').toLocaleDateString('fr-CA'),
            FISCAL_CATS[tx.fiscal_category || 'opex_autre']?.label ?? '—',
            tx.description + (tx.notes ? `\n${tx.notes}` : ''),
            TX_ACCOUNTS.find(a => a.value === (tx.account || 'compte_courant'))?.label ?? '—',
            tx.platform,
            fmtCAD(tx.amount),
          ]),
          theme: 'striped',
          headStyles: { fillColor: [r, g, b] as [number,number,number], fontSize: 7, fontStyle: 'bold' },
          bodyStyles: { fontSize: 7.5 },
          columnStyles: {
            0: { cellWidth: 20 }, 1: { cellWidth: 32 }, 2: { cellWidth: 55 },
            3: { cellWidth: 28 }, 4: { cellWidth: 20 }, 5: { halign: 'right', cellWidth: 22 },
          },
          foot: [[{ content: 'TOTAL', colSpan: 5, styles: { halign: 'right', fontStyle: 'bold', fontSize: 8 } }, { content: fmtCAD(grp.total), styles: { halign: 'right', fontStyle: 'bold', fontSize: 8, textColor: [r, g, b] as [number,number,number] } }]],
          footStyles: { fillColor: [245, 245, 245] },
          showFoot: 'lastPage',
          margin: { left: 15, right: 15 },
        })
      }

      const totalPages = (doc as any).internal.getNumberOfPages()
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i)
        const pH = doc.internal.pageSize.getHeight()
        doc.setDrawColor(220, 220, 220); doc.line(15, pH - 15, pageW - 15, pH - 15)
        doc.setFontSize(7); doc.setTextColor(150, 150, 150)
        doc.text('Commerce CERDIA inc. — Rapport fiscal confidentiel — À usage comptable uniquement', pageW / 2, pH - 9, { align: 'center' })
        doc.text(`Page ${i} sur ${totalPages}`, pageW - 15, pH - 9, { align: 'right' })
      }

      doc.save(`Rapport_Fiscal_Commerce_CERDIA_${year}.pdf`)
    } catch (e) {
      console.error(e)
    } finally {
      setExportingPDF(false)
    }
  }

  const exportCSV = () => {
    const headers = ['Date', 'Groupe fiscal', 'Catégorie fiscale', 'Description', 'Référence', 'Compte', 'Plateforme', 'Montant CAD', 'Statut', 'Notes', 'Pièce jointe', 'URL PJ']
    const rows = yearTxs.map(tx => {
      const cat = FISCAL_CATS[tx.fiscal_category || 'opex_autre']
      return [
        tx.date,
        cat ? FISCAL_GROUPS[cat.group].label : '—',
        cat?.label ?? tx.fiscal_category ?? '',
        tx.description,
        tx.product_ref || '',
        TX_ACCOUNTS.find(a => a.value === (tx.account || 'compte_courant'))?.label ?? '',
        tx.platform,
        tx.amount.toFixed(2),
        tx.status,
        tx.notes || '',
        tx.attachment_name || '',
        tx.attachment_url || '',
      ]
    })
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `Rapport_Fiscal_Commerce_CERDIA_${year}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return <div className="py-20 text-center text-gray-400">Chargement...</div>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Rapport fiscal eCommerce — {year}</h2>
          <p className="text-sm text-gray-500">{yearTxs.length} transaction{yearTxs.length !== 1 ? 's' : ''} · Commerce CERDIA inc.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1">
            {[year - 1, year, year + 1].map(y => (
              <button key={y} onClick={() => setYear(y)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${y === year ? 'bg-[#5e5e5e] text-white' : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-400'}`}>
                {y}
              </button>
            ))}
          </div>
          <button onClick={exportCSV} className="flex items-center gap-1.5 text-xs border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 px-3 py-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <Download size={12} /> CSV comptable
          </button>
          <button onClick={exportPDF} disabled={exportingPDF} className="flex items-center gap-1.5 text-xs bg-[#5e5e5e] text-white px-3 py-1.5 rounded-full hover:bg-[#3e3e3e] transition-colors disabled:opacity-50">
            <FileDown size={12} /> {exportingPDF ? 'PDF...' : 'Rapport PDF'}
          </button>
        </div>
      </div>

      {/* Fiscal group summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {groupTotals.map(grp => (
          <div key={grp.key} className={`rounded-2xl p-5 border ${grp.border} ${grp.bg} shadow-sm`}>
            <p className={`text-xs font-bold uppercase tracking-wide mb-2 ${grp.text}`}>{grp.label.split(' ')[0]}</p>
            <p className={`text-xl font-bold ${grp.text}`}>{fmtCAD(grp.total)}</p>
            <p className="text-xs text-gray-500 mt-1">{grp.txs.length} transaction{grp.txs.length !== 1 ? 's' : ''}</p>
          </div>
        ))}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Revenus bruts', value: totalRevenus, color: 'text-emerald-600' },
          { label: 'Total OPEX', value: totalOPEX, color: 'text-blue-600' },
          { label: 'Bénéfice net', value: beneficeNet, color: beneficeNet >= 0 ? 'text-emerald-600' : 'text-red-600' },
          { label: 'Marge nette', value: marge, isPct: true, color: marge >= 0 ? 'text-purple-600' : 'text-red-600' },
        ].map(k => (
          <div key={k.label} className="rounded-2xl p-5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
            <p className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">{k.label}</p>
            <p className={`text-xl font-bold ${k.color}`}>
              {k.isPct ? `${(k.value as number).toFixed(1)} %` : fmtCAD(k.value as number)}
            </p>
          </div>
        ))}
      </div>

      {/* Détail catégories + Taxes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4 text-sm">Détail par catégorie fiscale</h3>
          <div className="space-y-2">
            {Object.entries(FISCAL_CATS).map(([cat, info]) => {
              const total = yearTxs.filter(t => (t.fiscal_category || 'opex_autre') === cat).reduce((s, t) => s + t.amount, 0)
              if (total === 0) return null
              const grp = FISCAL_GROUPS[info.group]
              return (
                <div key={cat} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: `rgb(${grp.color.join(',')})` }} />
                    <span className="text-xs text-gray-600 dark:text-gray-400">{info.label}</span>
                  </div>
                  <span className="text-xs font-semibold text-gray-900 dark:text-white ml-4">{fmtCAD(total)}</span>
                </div>
              )
            })}
            {yearTxs.length === 0 && <p className="text-xs text-gray-400">Aucune transaction pour {year}</p>}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1 text-sm">Taxes estimées (QC)</h3>
          <p className="text-xs text-gray-400 mb-4">Sur les revenus — à titre indicatif seulement</p>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-700 dark:text-gray-300">TPS fédérale (5 %)</p>
              <span className="font-semibold text-gray-900 dark:text-white text-sm">{fmtCAD(TPS)}</span>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-700 dark:text-gray-300">TVQ provinciale (9,975 %)</p>
              <span className="font-semibold text-gray-900 dark:text-white text-sm">{fmtCAD(TVQ)}</span>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
              <span className="text-sm font-semibold text-gray-900 dark:text-white">Total taxes</span>
              <span className="font-bold text-amber-600">{fmtCAD(TPS + TVQ)}</span>
            </div>
            <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
              <p className="text-xs text-gray-500 mb-1">Financement reçu</p>
              <p className={`font-bold text-lg ${FISCAL_GROUPS.FINANCEMENT.text}`}>{fmtCAD(totalFinancement)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bar chart mensuel */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4 text-sm">Revenus vs Dépenses — {year}</h3>
        <div className="flex items-end gap-1.5 h-40">
          {months.map(m => (
            <div key={m.label} className="flex-1 flex flex-col items-center gap-0.5">
              <div className="w-full flex items-end gap-0.5 justify-center h-32">
                <div className="flex-1 bg-emerald-400 dark:bg-emerald-500 rounded-t-sm transition-all" style={{ height: `${(m.rev / maxVal) * 100}%`, minHeight: m.rev > 0 ? '4px' : '0' }} />
                <div className="flex-1 bg-blue-300 dark:bg-blue-400 rounded-t-sm transition-all" style={{ height: `${(m.dep / maxVal) * 100}%`, minHeight: m.dep > 0 ? '4px' : '0' }} />
              </div>
              <span className="text-[10px] text-gray-400 capitalize">{m.label}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4 mt-3">
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-emerald-400 rounded-sm" /><span className="text-xs text-gray-500">Revenus</span></div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-blue-300 rounded-sm" /><span className="text-xs text-gray-500">Dépenses (OPEX + CAPEX)</span></div>
        </div>
      </div>

      {/* Tables détaillées par groupe fiscal */}
      {groupTotals.filter(g => g.txs.length > 0).map(grp => (
        <div key={grp.key} className={`rounded-2xl border ${grp.border} overflow-hidden shadow-sm`}>
          <div className={`px-5 py-3 ${grp.bg} flex items-center justify-between`}>
            <h3 className={`font-semibold text-sm ${grp.text}`}>{grp.label}</h3>
            <span className={`font-bold text-sm ${grp.text}`}>{fmtCAD(grp.total)}</span>
          </div>
          <div className="overflow-x-auto bg-white dark:bg-gray-800">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-500">Date</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-500">Catégorie</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-500">Description</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-500 hidden sm:table-cell">Compte</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-500 hidden md:table-cell">Plateforme</th>
                  <th className="text-center px-4 py-2.5 font-medium text-gray-500 hidden sm:table-cell">PJ</th>
                  <th className="text-right px-4 py-2.5 font-medium text-gray-500">Montant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {grp.txs.map(tx => (
                  <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/20">
                    <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">{new Date(tx.date + 'T12:00:00').toLocaleDateString('fr-CA')}</td>
                    <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400">{FISCAL_CATS[tx.fiscal_category || 'opex_autre']?.label ?? '—'}</td>
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-gray-900 dark:text-white">{tx.description}</p>
                      {tx.notes && <p className="text-gray-400">{tx.notes}</p>}
                    </td>
                    <td className="px-4 py-2.5 text-gray-500 hidden sm:table-cell">
                      {TX_ACCOUNTS.find(a => a.value === (tx.account || 'compte_courant'))?.label ?? '—'}
                    </td>
                    <td className="px-4 py-2.5 text-gray-500 hidden md:table-cell">{tx.platform}</td>
                    <td className="px-4 py-2.5 text-center hidden sm:table-cell">
                      {tx.attachment_url ? (
                        <a href={tx.attachment_url} target="_blank" rel="noopener noreferrer" title={tx.attachment_name}
                          className="inline-flex items-center justify-center p-1 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors">
                          <Paperclip size={11} />
                        </a>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold text-gray-900 dark:text-white">{fmtCAD(tx.amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className={`${grp.bg} border-t ${grp.border}`}>
                <tr>
                  <td colSpan={6} className={`px-4 py-2.5 text-xs font-bold ${grp.text} text-right`}>TOTAL {grp.label.split(' ')[0].toUpperCase()}</td>
                  <td className={`px-4 py-2.5 text-right text-sm font-bold ${grp.text}`}>{fmtCAD(grp.total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      ))}

      {yearTxs.length === 0 && (
        <div className="py-16 text-center text-gray-400">
          <BarChart2 size={40} className="mx-auto mb-3 opacity-40" />
          <p>Aucune transaction pour {year}</p>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// ONGLET FACTURES
// ══════════════════════════════════════════════════════════════════════════════
function FacturesTab() {
  return <InvoiceGenerator />
}
