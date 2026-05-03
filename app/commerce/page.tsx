'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import {
  ShoppingCart, ExternalLink, Menu, X, Star,
  Tag, Package, Search, Check, Home, TrendingUp, Settings
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
  badge?: string
  category?: string
  rating: number
  review_count: number
  active: boolean
  sort_order: number
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
        <Star key={i} size={12} className={i <= Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-300 fill-gray-200'} />
      ))}
      {rating > 0 && <span className="text-xs text-gray-500 ml-1">{rating.toFixed(1)}</span>}
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function CommercePage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('Tous')
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    supabase.from('commerce_products').select('*').eq('active', true)
      .order('sort_order').order('created_at', { ascending: false })
      .then(({ data }) => { setProducts(data || []); setLoading(false) })
  }, [])

  // Fermer le menu au clic extérieur
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const el = document.getElementById('commerce-menu')
      if (el && !el.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = products.filter(p => {
    const matchSearch = !search || p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.description?.toLowerCase().includes(search.toLowerCase())
    const matchCat = selectedCategory === 'Tous' || p.category === selectedCategory
    return matchSearch && matchCat
  })

  const categories = ['Tous', ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))] as string[]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-20">

      {/* ── Hero Banner ──────────────────────────────────────────────────────── */}
      <div className="relative bg-[#1a1a1a] text-white overflow-hidden">
        <div className="absolute inset-0">
          <Image src="/cerdia-slide-ecommerce.png" alt="Commerce CERDIA" fill className="object-cover object-center opacity-25" priority />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
        </div>

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
                Commerce<br /><span className="text-orange-400">CERDIA</span>
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

            {/* Menu hamburger — aligné avec le badge */}
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
                    <p className="text-xs text-gray-400 px-2 pb-1 font-medium uppercase tracking-wider">Gestion</p>
                    <Link
                      href="/commerce/admin"
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-orange-700 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
                      onClick={() => setMenuOpen(false)}
                    >
                      <Settings size={15} /> Administration Commerce
                    </Link>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* ── Filtres & Recherche ───────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-3 text-gray-400" />
            <input
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-400 outline-none shadow-sm"
              placeholder="Rechercher un produit..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
            {categories.map(cat => (
              <button key={cat} onClick={() => setSelectedCategory(cat)}
                className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  selectedCategory === cat
                    ? 'bg-[#5e5e5e] text-white shadow-sm'
                    : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-400 hover:text-gray-800'
                }`}>
                {cat}
              </button>
            ))}
          </div>
        </div>

        <p className="text-sm text-gray-500 mb-6">
          {loading ? 'Chargement...' : `${filtered.length} produit${filtered.length !== 1 ? 's' : ''}`}
        </p>

        {/* ── Grille de produits ────────────────────────────────────────────── */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden animate-pulse">
                <div className="h-56 bg-gray-200 dark:bg-gray-700" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full" />
                  <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-full mt-4" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-24 text-center">
            <Package size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium text-gray-500">
              {products.length === 0 ? 'Aucun produit pour le moment' : 'Aucun résultat'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map(product => <ProductCard key={product.id} product={product} />)}
          </div>
        )}
      </div>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
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
    </div>
  )
}

// ─── Composant ProductCard ─────────────────────────────────────────────────────
function ProductCard({ product }: { product: Product }) {
  return (
    <a
      href={product.amazon_url}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700 shadow-md hover:shadow-xl hover:border-orange-200 dark:hover:border-orange-800 hover:-translate-y-1 transition-all duration-300 cursor-pointer block"
    >
      {product.badge && (
        <div className={`absolute top-3 left-3 z-10 px-2.5 py-0.5 rounded-full text-xs font-semibold ${badgeColor(product.badge)}`}>
          {product.badge}
        </div>
      )}

      {/* Image */}
      <div className="relative h-56 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 overflow-hidden">
        {product.image_url ? (
          <img src={product.image_url} alt={product.title} className="w-full h-full object-contain p-4 transition-transform duration-500 group-hover:scale-110" />
        ) : (
          <div className="flex items-center justify-center h-full">
            <Package size={48} className="text-gray-300 dark:text-gray-500" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>

      {/* Contenu */}
      <div className="p-4">
        {product.category && (
          <div className="flex items-center gap-1 mb-2">
            <Tag size={10} className="text-gray-400" />
            <span className="text-xs text-gray-400 uppercase tracking-wider">{product.category}</span>
          </div>
        )}
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm leading-snug mb-2 line-clamp-2 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
          {product.title}
        </h3>
        {product.description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-3 leading-relaxed">{product.description}</p>
        )}
        {product.rating > 0 && (
          <div className="flex items-center gap-1.5 mb-3">
            <Stars rating={product.rating} />
            {product.review_count > 0 && (
              <span className="text-xs text-gray-400">({product.review_count.toLocaleString('fr-CA')})</span>
            )}
          </div>
        )}
        {product.price && (
          <div className="mb-3">
            <span className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {product.price.toLocaleString('fr-CA', { style: 'currency', currency: product.currency, minimumFractionDigits: 2 })}
            </span>
          </div>
        )}
        <div className="flex items-center justify-center gap-2 w-full py-2.5 bg-[#FF9900] hover:bg-[#e68a00] text-white text-sm font-semibold rounded-xl transition-all duration-200 group-hover:shadow-md">
          <ShoppingCart size={15} />
          Voir sur Amazon
          <ExternalLink size={12} className="opacity-70" />
        </div>
      </div>
    </a>
  )
}
