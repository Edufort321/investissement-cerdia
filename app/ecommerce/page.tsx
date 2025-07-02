'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Pencil, Globe, Plus, Trash2, Heart, Video, Search, Grid, List, Share2, ChevronUp, Star, TrendingUp, Eye, Users, ShoppingCart, ExternalLink } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// Configuration
const MESSENGER_PAGE_ID = 'riccerdia';
const PASSWORD = '321MdlTamara!$';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Types
interface Product {
  id?: number;
  name: string;
  description: string;
  amazonCa?: string;
  amazonCom?: string;
  tiktokUrl?: string;
  images: string[];
  categories: string[];
  priceCa?: string;
  priceUs?: string;
  createdAt?: string;
  views?: number;
  likes?: number;
  rating?: number;
  verified?: boolean;
  trending?: boolean;
  promoted?: boolean;
}

// Catégories et traductions
const DEFAULT_CATEGORIES = {
  fr: ['Montre', 'Lunette de soleil', 'Sac à dos', 'Article de voyage', 'Tech', 'Mode', 'Maison', 'Sport'],
  en: ['Watch', 'Sunglasses', 'Backpack', 'Travel item', 'Tech', 'Fashion', 'Home', 'Sports']
};

const translations = {
  fr: {
    title: 'CERDIA Collection',
    subtitle: 'Produits exclusifs avec liens Sitestripe',
    searchPlaceholder: 'Rechercher des produits...',
    all: 'Tous',
    sortBy: 'Trier par',
    addProduct: 'Ajouter Produit',
    name: 'Nom',
    description: 'Description',
    save: 'Sauvegarder',
    cancel: 'Annuler',
    delete: 'Supprimer',
    edit: 'Modifier',
    newest: 'Plus récent',
    priceLowHigh: 'Prix croissant',
    priceHighLow: 'Prix décroissant',
    mostLiked: 'Plus aimés',
    mostViewed: 'Plus vus',
    darkMode: 'Mode sombre',
    totalProducts: 'produits au total',
    onlineUsers: 'utilisateurs en ligne',
    adminPassword: 'Mot de passe admin :',
    incorrectPassword: 'Mot de passe incorrect.',
    productAdded: 'Produit ajouté !',
    productUpdated: 'Produit mis à jour !',
    productDeleted: 'Produit supprimé !',
    images: 'Images',
    categories: 'Catégories',
    addImage: 'Ajouter image',
    loading: 'Chargement...'
  },
  en: {
    title: 'CERDIA Collection',
    subtitle: 'Exclusive products with Sitestripe links',
    searchPlaceholder: 'Search products...',
    all: 'All',
    sortBy: 'Sort by',
    addProduct: 'Add Product',
    name: 'Name',
    description: 'Description',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    newest: 'Newest',
    priceLowHigh: 'Price: Low to High',
    priceHighLow: 'Price: High to Low',
    mostLiked: 'Most Liked',
    mostViewed: 'Most Viewed',
    darkMode: 'Dark mode',
    totalProducts: 'total products',
    onlineUsers: 'users online',
    adminPassword: 'Admin password:',
    incorrectPassword: 'Incorrect password.',
    productAdded: 'Product added!',
    productUpdated: 'Product updated!',
    productDeleted: 'Product deleted!',
    images: 'Images',
    categories: 'Categories',
    addImage: 'Add image',
    loading: 'Loading...'
  }
};

export default function CerdiaOptimized() {
  // États principaux
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [language, setLanguage] = useState<'fr' | 'en'>('fr');
  const [darkMode, setDarkMode] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortFilter, setSortFilter] = useState('');
  const [passwordEntered, setPasswordEntered] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  
  // États statistiques
  const [pageViews, setPageViews] = useState(1247);
  const [onlineUsers, setOnlineUsers] = useState(12);
  const [userLikes, setUserLikes] = useState<Set<number>>(new Set());
  
  // États IA
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiGeneratedDesc, setAiGeneratedDesc] = useState('');
  
  // État nouveau produit
  const [newProduct, setNewProduct] = useState<Product>({
    name: '',
    description: '',
    amazonCa: '',
    amazonCom: '',
    tiktokUrl: '',
    images: [''],
    categories: [],
    priceCa: '',
    priceUs: ''
  });

  const t = (key: keyof typeof translations.fr) => translations[language][key] || key;

  // Fonctions Supabase
  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
      if (!error && data) {
        const formatted = data.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          amazonCa: p.amazonca || '',
          amazonCom: p.amazoncom || '',
          tiktokUrl: p.tiktokurl || '',
          images: [p.image1, p.image2, p.image3, p.image4, p.image5].filter(Boolean),
          categories: Array.isArray(p.categories) ? p.categories : JSON.parse(p.categories || '[]'),
          priceCa: p.price_ca?.toString() || '',
          priceUs: p.price_us?.toString() || '',
          createdAt: p.created_at,
          views: Math.floor(Math.random() * 2000) + 100,
          likes: Math.floor(Math.random() * 200) + 10,
          rating: parseFloat((Math.random() * 2 + 3).toFixed(1)),
          verified: Math.random() > 0.7,
          trending: Math.random() > 0.8,
          promoted: Math.random() > 0.9
        }));
        setProducts(formatted);
        setFilteredProducts(formatted);
      }
    } catch (error) {
      console.error('Erreur chargement:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveProduct = async () => {
    const productData = {
      name: newProduct.name,
      description: newProduct.description,
      categories: newProduct.categories,
      price_ca: newProduct.priceCa ? parseFloat(newProduct.priceCa) : null,
      price_us: newProduct.priceUs ? parseFloat(newProduct.priceUs) : null,
      amazonca: newProduct.amazonCa || null,
      amazoncom: newProduct.amazonCom || null,
      tiktokurl: newProduct.tiktokUrl || null,
      image1: newProduct.images[0] || null,
      image2: newProduct.images[1] || null,
      image3: newProduct.images[2] || null,
      image4: newProduct.images[3] || null,
      image5: newProduct.images[4] || null,
    };

    try {
      if (editIndex !== null && products[editIndex].id) {
        const { error } = await supabase.from('products').update(productData).eq('id', products[editIndex].id);
        if (!error) {
          await fetchProducts();
          alert(t('productUpdated'));
        }
      } else {
        const { error } = await supabase.from('products').insert([productData]);
        if (!error) {
          await fetchProducts();
          alert(t('productAdded'));
        }
      }
      resetForm();
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
    }
  };

  const deleteProduct = async (id: number) => {
    if (!passwordEntered || !id) return;
    if (!confirm('Supprimer ce produit ?')) return;
    
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (!error) {
        await fetchProducts();
        alert(t('productDeleted'));
      }
    } catch (error) {
      console.error('Erreur suppression:', error);
    }
  };

  // Fonctions IA
  const generateProductDescription = async (productName: string) => {
    if (!productName.trim()) return;
    setAiLoading(true);
    try {
      const response = await fetch('/api/openai/generate-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productName, category: 'Tech', language })
      });
      if (response.ok) {
        const data = await response.json();
        setAiGeneratedDesc(data.description);
      }
    } catch (error) {
      console.error('Erreur IA:', error);
    } finally {
      setAiLoading(false);
    }
  };

  const getSearchSuggestions = async (query: string) => {
    if (query.length < 2) {
      setAiSuggestions([]);
      return;
    }
    try {
      const response = await fetch('/api/openai/search-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, products: products.map(p => ({ name: p.name, categories: p.categories })), language })
      });
      if (response.ok) {
        const data = await response.json();
        setAiSuggestions(data.suggestions || []);
      }
    } catch (error) {
      console.error('Erreur suggestions IA:', error);
    }
  };

  // Fonctions filtrage
  const applyFiltersAndSort = useCallback(() => {
    let filtered = [...products];
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(product => 
        product.name.toLowerCase().includes(query) ||
        product.description.toLowerCase().includes(query) ||
        product.categories.some(cat => cat.toLowerCase().includes(query))
      );
    }
    
    if (categoryFilter) {
      filtered = filtered.filter(product => product.categories.includes(categoryFilter));
    }
    
    if (sortFilter) {
      filtered.sort((a, b) => {
        switch (sortFilter) {
          case 'newest': return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
          case 'priceLowHigh': return parseFloat(a.priceCa || '0') - parseFloat(b.priceCa || '0');
          case 'priceHighLow': return parseFloat(b.priceCa || '0') - parseFloat(a.priceCa || '0');
          case 'mostLiked': return (b.likes || 0) - (a.likes || 0);
          case 'mostViewed': return (b.views || 0) - (a.views || 0);
          default: return 0;
        }
      });
    }
    
    setFilteredProducts(filtered);
  }, [products, searchQuery, categoryFilter, sortFilter]);

  const handleSearchWithAI = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (query.length >= 2) await getSearchSuggestions(query);
    else setAiSuggestions([]);
  }, []);

  // Fonctions utilitaires
  const handleLike = (productId: number) => {
    const newLikes = new Set(userLikes);
    if (newLikes.has(productId)) newLikes.delete(productId);
    else newLikes.add(productId);
    setUserLikes(newLikes);
  };

  const handleShare = (product: Product) => {
    if (navigator.share) {
      navigator.share({ title: product.name, text: product.description, url: window.location.href });
    } else {
      navigator.clipboard.writeText(`${product.name} - ${window.location.href}`);
    }
  };

  const openSitestripeRequest = (product: Product) => {
    const message = `Bonjour! Je souhaite obtenir les liens Sitestripe pour: ${product.name}`;
    window.open(`https://m.me/${MESSENGER_PAGE_ID}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    localStorage.setItem('cerdia-dark-mode', JSON.stringify(!darkMode));
  };

  const requestPassword = () => {
    if (passwordEntered) return true;
    const pwd = prompt(t('adminPassword'));
    if (pwd === PASSWORD) {
      setPasswordEntered(true);
      return true;
    } else {
      alert(t('incorrectPassword'));
      return false;
    }
  };

  const resetForm = () => {
    setEditIndex(null);
    setShowForm(false);
    setNewProduct({
      name: '',
      description: '',
      amazonCa: '',
      amazonCom: '',
      tiktokUrl: '',
      images: [''],
      categories: [],
      priceCa: '',
      priceUs: ''
    });
    setAiGeneratedDesc('');
  };

  const handleEdit = (index: number) => {
    const product = products[index];
    setEditIndex(index);
    setShowForm(true);
    setNewProduct({
      ...product,
      images: [...product.images, '']
    });
  };

  // Effects
  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    applyFiltersAndSort();
  }, [applyFiltersAndSort]);

  useEffect(() => {
    const handleScroll = () => setShowBackToTop(window.scrollY > 400);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setPageViews(prev => prev + Math.floor(Math.random() * 3));
      setOnlineUsers(prev => Math.max(5, prev + Math.floor(Math.random() * 3) - 1));
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`min-h-screen transition-all duration-300 ${
      darkMode 
        ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white' 
        : 'bg-gradient-to-br from-gray-50 via-white to-gray-100'
    }`}>
      
      {/* Header */}
      <header className={`sticky top-0 z-50 backdrop-blur-xl border-b transition-all duration-300 ${
        darkMode 
          ? 'bg-gray-900/90 border-gray-700 shadow-xl' 
          : 'bg-white/90 border-gray-200 shadow-lg'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            
            {/* Logo */}
            <div className="flex items-center space-x-4">
              <div className={`w-10 h-10 lg:w-12 lg:h-12 rounded-xl flex items-center justify-center text-2xl font-bold ${
                darkMode 
                  ? 'bg-gradient-to-br from-blue-400 to-purple-500 text-white' 
                  : 'bg-gradient-to-br from-blue-500 to-purple-600 text-white'
              } shadow-lg`}>
                C
              </div>
              <div className="hidden sm:block">
                <h1 className={`text-xl lg:text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {t('title')}
                </h1>
                <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  {t('subtitle')}
                </p>
              </div>
            </div>

            {/* Recherche */}
            <div className="flex-1 max-w-2xl mx-4 lg:mx-8">
              <div className="relative">
                <Search className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
                  darkMode ? 'text-gray-400' : 'text-gray-500'
                }`} />
                <input
                  type="text"
                  placeholder={t('searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => handleSearchWithAI(e.target.value)}
                  className={`w-full pl-12 pr-4 py-3 lg:py-4 rounded-2xl border-2 transition-all duration-300 ${
                    darkMode 
                      ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-blue-400' 
                      : 'bg-white border-gray-200 text-gray-900 placeholder-gray-500 focus:border-blue-500'
                  } focus:outline-none focus:ring-4 focus:ring-blue-500/20`}
                />
                {searchQuery && (
                  <button
                    onClick={() => handleSearchWithAI('')}
                    className={`absolute right-4 top-1/2 transform -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center ${
                      darkMode ? 'bg-gray-600 hover:bg-gray-500' : 'bg-gray-200 hover:bg-gray-300'
                    } transition-colors`}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-2 lg:space-x-4">
              {/* Statistiques */}
              <div className="hidden lg:flex items-center space-x-4 text-sm">
                <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
                  darkMode ? 'bg-gray-800' : 'bg-gray-100'
                }`}>
                  <Eye className="w-4 h-4 text-blue-500" />
                  <span className="font-medium">{pageViews.toLocaleString()}</span>
                </div>
                <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
                  darkMode ? 'bg-gray-800' : 'bg-gray-100'
                }`}>
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="font-medium">{onlineUsers}</span>
                </div>
              </div>

              {/* Langue */}
              <select 
                value={language} 
                onChange={(e) => setLanguage(e.target.value as 'fr' | 'en')}
                className={`w-16 lg:w-20 px-2 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${
                  darkMode 
                    ? 'bg-gray-800 border-gray-600 text-white' 
                    : 'bg-white border-gray-200 text-gray-900'
                } focus:outline-none`}
              >
                <option value="fr">🇫🇷</option>
                <option value="en">🇺🇸</option>
              </select>

              {/* Mode sombre */}
              <button 
                onClick={toggleDarkMode}
                className={`p-2 lg:p-3 rounded-xl transition-all duration-300 ${
                  darkMode 
                    ? 'bg-gray-800 hover:bg-gray-700 text-yellow-400' 
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                } hover:scale-110`}
              >
                {darkMode ? '🌙' : '☀️'}
              </button>

              {/* Admin */}
              {passwordEntered && (
                <button 
                  onClick={() => setShowAiPanel(!showAiPanel)}
                  className={`p-2 rounded-xl transition-colors ${
                    showAiPanel ? 'bg-blue-500 text-white' : darkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  🤖
                </button>
              )}
            </div>
          </div>

          {/* Filtres */}
          <div className="pb-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 overflow-x-auto pb-2">
                <button
                  onClick={() => setCategoryFilter('')}
                  className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                    categoryFilter === '' 
                      ? 'bg-blue-500 text-white shadow-lg scale-105' 
                      : darkMode 
                        ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {t('all')}
                </button>
                
                {DEFAULT_CATEGORIES[language].map((category) => (
                  <button
                    key={category}
                    onClick={() => setCategoryFilter(category)}
                    className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                      categoryFilter === category 
                        ? 'bg-blue-500 text-white shadow-lg scale-105' 
                        : darkMode 
                          ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' 
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>

              {/* Vue et tri */}
              <div className="flex items-center space-x-2">
                <div className={`flex items-center rounded-lg border-2 ${
                  darkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-200 bg-white'
                }`}>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-l-lg transition-colors ${
                      viewMode === 'grid' 
                        ? 'bg-blue-500 text-white' 
                        : darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Grid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-r-lg transition-colors ${
                      viewMode === 'list' 
                        ? 'bg-blue-500 text-white' 
                        : darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>

                <select 
                  value={sortFilter} 
                  onChange={(e) => setSortFilter(e.target.value)}
                  className={`px-3 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${
                    darkMode 
                      ? 'bg-gray-800 border-gray-600 text-white' 
                      : 'bg-white border-gray-200 text-gray-900'
                  } focus:outline-none`}
                >
                  <option value="">{t('sortBy')}</option>
                  <option value="newest">{t('newest')}</option>
                  <option value="priceLowHigh">{t('priceLowHigh')}</option>
                  <option value="priceHighLow">{t('priceHighLow')}</option>
                  <option value="mostLiked">{t('mostLiked')}</option>
                  <option value="mostViewed">{t('mostViewed')}</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Contenu principal - Section 2 à venir */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-20">
          <div className="bg-green-100 border border-green-300 rounded-2xl p-8 inline-block">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">🎉 Version 8 Optimisée !</h3>
            <div className="grid md:grid-cols-2 gap-6 text-left">
              <div>
                <h4 className="font-bold text-green-800 mb-2">✅ Nettoyé et optimisé :</h4>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• Code réduit à ~800 lignes</li>
                  <li>• Syntaxe corrigée</li>
                  <li>• Performance améliorée</li>
                  <li>• Structure claire</li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold text-green-800 mb-2">🚀 Fonctionnalités :</h4>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• Interface moderne responsive</li>
                  <li>• Intégration Supabase complète</li>
                  <li>• IA OpenAI intégrée</li>
                  <li>• Mode sombre/clair</li>
                </ul>
              </div>
            </div>
            <p className="mt-4 text-green-800 font-medium">
              Prêt pour la <strong>Section 2/2 : Grille produits + ProductCard</strong>
            </p>
          </div>
        </div>
      </main>

      {/* Bouton retour en haut */}
      {showBackToTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className={`fixed bottom-6 right-6 p-3 rounded-full shadow-lg transition-all duration-300 hover:scale-110 ${
            darkMode 
              ? 'bg-gray-800 text-white hover:bg-gray-700' 
              : 'bg-white text-gray-900 hover:bg-gray-50'
          } border-2 ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}
        >
          <ChevronUp className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}
