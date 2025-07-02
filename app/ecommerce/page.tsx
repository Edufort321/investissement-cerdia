'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Pencil, Globe, Plus, Trash2, Heart, Video, Mountain, Search, Filter, Grid, List, Share2, ChevronUp, Star, TrendingUp, Zap, Clock, Eye, Users, MessageCircle, ShoppingCart, ExternalLink } from 'lucide-react';

// Intégration Supabase
import { createClient } from '@supabase/supabase-js';

// Configuration
const MESSENGER_PAGE_ID = 'riccerdia';
const PASSWORD = '321MdlTamara!

  // Fonctions OpenAI
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
        alert(`Description générée: ${data.description}`);
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

  // Fonctions de filtrage et tri
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
    if (categoryFilter && categoryFilter !== '') {
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

  // Effects
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
      
      {/* HEADER PRINCIPAL */}
      <header className={`sticky top-0 z-50 backdrop-blur-xl border-b transition-all duration-300 ${
        darkMode 
          ? 'bg-gray-900/90 border-gray-700 shadow-xl' 
          : 'bg-white/90 border-gray-200 shadow-lg'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Navigation principale */}
          <div className="flex items-center justify-between h-16 lg:h-20">
            
            {/* Logo et titre */}
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <div className={`w-10 h-10 lg:w-12 lg:h-12 rounded-xl flex items-center justify-center text-2xl font-bold ${
                  darkMode 
                    ? 'bg-gradient-to-br from-blue-400 to-purple-500 text-white' 
                    : 'bg-gradient-to-br from-blue-500 to-purple-600 text-white'
                } shadow-lg`}>
                  C
                </div>
              </div>
              <div className="hidden sm:block">
                <h1 className={`text-xl lg:text-2xl font-bold ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  {t('title')}
                </h1>
                <p className={`text-sm ${
                  darkMode ? 'text-gray-300' : 'text-gray-600'
                }`}>
                  {t('subtitle')}
                </p>
              </div>
            </div>

            {/* Barre de recherche centrale */}
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
                      ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-blue-400 focus:bg-gray-700' 
                      : 'bg-white border-gray-200 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:bg-gray-50'
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

            {/* Actions à droite */}
            <div className="flex items-center space-x-2 lg:space-x-4">
              
              {/* Statistiques en temps réel */}
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

              {/* Sélecteur de langue */}
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

              {/* Toggle mode sombre */}
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

              {/* Menu admin */}
              {passwordEntered && (
                <button 
                  onClick={() => requestPassword()}
                  className="p-2 lg:p-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-all duration-300 hover:scale-110"
                >
                  <Plus className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* Navigation secondaire avec filtres */}
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

              {/* Actions de vue et tri */}
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

      {/* Contenu principal avec grille de produits */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Barre de suggestions IA */}
        {aiSuggestions.length > 0 && (
          <div className={`mb-6 p-4 rounded-2xl border-2 border-dashed ${
            darkMode ? 'border-purple-600 bg-purple-900/20' : 'border-purple-300 bg-purple-50'
          }`}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                AI
              </div>
              <span className={`font-medium ${darkMode ? 'text-purple-300' : 'text-purple-700'}`}>
                Suggestions intelligentes
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {aiSuggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSearchWithAI(suggestion)}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    darkMode 
                      ? 'bg-purple-800 text-purple-200 hover:bg-purple-700' 
                      : 'bg-purple-100 text-purple-800 hover:bg-purple-200'
                  }`}
                >
                  ✨ {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Statistiques et résultats */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className={`text-2xl lg:text-3xl font-bold ${
                darkMode ? 'text-white' : 'text-gray-900'
              }`}>
                {searchQuery ? `Résultats pour "${searchQuery}"` : 'Notre Collection'}
              </h2>
              <p className={`text-sm mt-1 ${
                darkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                {filteredProducts.length} {t('totalProducts')} • {onlineUsers} {t('onlineUsers')}
              </p>
            </div>
            
            {/* Panel IA et Analytics */}
            <div className="flex items-center gap-3">
              {passwordEntered && (
                <button
                  onClick={() => setShowAiPanel(!showAiPanel)}
                  className={`p-2 rounded-xl transition-colors ${
                    showAiPanel
                      ? 'bg-blue-500 text-white'
                      : darkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  🤖
                </button>
              )}
              
              {/* Badges */}
              <div className="flex flex-wrap gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  darkMode ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-800'
                }`}>
                  ✓ Liens Sitestripe
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  darkMode ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-800'
                }`}>
                  🚀 IA Intégrée
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Panel IA latéral */}
        {showAiPanel && passwordEntered && (
          <div className={`fixed right-4 top-24 bottom-4 w-80 rounded-2xl shadow-2xl border-2 z-40 overflow-hidden ${
            darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'
          }`}>
            <div className={`p-4 border-b ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center text-white font-bold">
                    AI
                  </div>
                  <h3 className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Assistant IA
                  </h3>
                </div>
                <button
                  onClick={() => setShowAiPanel(false)}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                  }`}
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="p-4 space-y-4 overflow-y-auto h-full">
              <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <h4 className={`font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  📝 Génération IA
                </h4>
                <input
                  placeholder="Nom du produit..."
                  className={`w-full p-2 rounded-lg border text-sm mb-2 ${
                    darkMode ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300'
                  }`}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      const target = e.target as HTMLInputElement;
                      generateProductDescription(target.value);
                    }
                  }}
                />
                <button
                  onClick={() => {
                    const input = document.querySelector('input[placeholder="Nom du produit..."]') as HTMLInputElement;
                    if (input?.value) generateProductDescription(input.value);
                  }}
                  disabled={aiLoading}
                  className="w-full py-2 bg-purple-500 text-white rounded-lg text-sm hover:bg-purple-600 disabled:opacity-50"
                >
                  {aiLoading ? 'Génération...' : 'Générer avec IA'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Grille de produits */}
        {filteredProducts.length > 0 ? (
          <div className={`grid gap-4 transition-all duration-300 ${
            viewMode === 'grid' 
              ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6' 
              : 'grid-cols-1 lg:grid-cols-2'
          }`}>
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                viewMode={viewMode}
                darkMode={darkMode}
                language={language}
                isLiked={userLikes.has(product.id || 0)}
                onLike={() => handleLike(product.id || 0)}
                onShare={() => handleShare(product)}
                onSitestripeRequest={() => openSitestripeRequest(product)}
                onEdit={() => passwordEntered && handleEdit(filteredProducts.findIndex(p => p.id === product.id))}
                showAdmin={passwordEntered}
                t={t}
              />
            ))}
          </div>
        ) : (
          // État vide avec suggestions IA
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🤖</div>
            <h3 className={`text-2xl font-bold mb-2 ${
              darkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Aucun résultat trouvé
            </h3>
            <p className={`text-lg mb-6 ${
              darkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Notre IA peut vous aider à trouver des produits similaires
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setCategoryFilter('');
                setSortFilter('');
              }}
              className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-colors"
            >
              Voir tous les produits
            </button>
          </div>
        )}

        {/* Section finale */}
        <div className="mt-20 text-center">
          <div className="bg-gradient-to-r from-blue-100 to-purple-100 border border-blue-300 rounded-2xl p-8 inline-block">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                🚀
              </div>
              <h3 className="text-2xl font-bold text-gray-900">Plateforme CERDIA Complète !</h3>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
              <div className="text-center">
                <div className="text-3xl mb-2">🎨</div>
                <h4 className="font-bold">Design Premium</h4>
                <p className="text-sm text-gray-600">Interface moderne responsive</p>
              </div>
              <div className="text-center">
                <div className="text-3xl mb-2">🤖</div>
                <h4 className="font-bold">IA Intégrée</h4>
                <p className="text-sm text-gray-600">OpenAI pour optimisation</p>
              </div>
              <div className="text-center">
                <div className="text-3xl mb-2">🔗</div>
                <h4 className="font-bold">Sitestripe</h4>
                <p className="text-sm text-gray-600">Liens automatiques</p>
              </div>
              <div className="text-center">
                <div className="text-3xl mb-2">📊</div>
                <h4 className="font-bold">Analytics</h4>
                <p className="text-sm text-gray-600">Temps réel</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modal Formulaire Produit */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto`}>
            <div className={`sticky top-0 border-b px-4 py-3 flex items-center justify-between ${
              darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
            }`}>
              <h2 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {editIndex !== null ? t('edit') : t('addProduct')}
              </h2>
              <button 
                onClick={resetForm} 
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  darkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                ✕
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); saveProduct(); }} className="p-4 space-y-4">
              <input 
                name="name" 
                value={newProduct.name} 
                onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} 
                placeholder={t('name')} 
                className={`w-full border p-3 rounded-lg ${
                  darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300'
                }`} 
                required 
              />

              <div className="relative">
                <textarea 
                  name="description" 
                  value={newProduct.description} 
                  onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })} 
                  placeholder={t('description')} 
                  className={`w-full border p-3 rounded-lg h-20 resize-vertical ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300'
                  }`} 
                  required 
                />
                {passwordEntered && (
                  <button
                    type="button"
                    onClick={() => {
                      if (newProduct.name.trim()) {
                        setAiGeneratedDesc('Génération en cours...');
                        generateProductDescription(newProduct.name);
                      } else {
                        alert('Veuillez d\'abord saisir le nom du produit');
                      }
                    }}
                    disabled={aiLoading}
                    className="absolute top-2 right-2 px-3 py-1 bg-purple-500 text-white rounded text-xs hover:bg-purple-600 disabled:opacity-50"
                  >
                    {aiLoading ? '⏳' : '🤖 IA'}
                  </button>
                )}
                {aiGeneratedDesc && (
                  <div className={`mt-2 p-2 rounded text-xs ${darkMode ? 'bg-gray-600' : 'bg-blue-50'}`}>
                    <strong>Suggestion IA:</strong> {aiGeneratedDesc}
                    <button
                      type="button"
                      onClick={() => {
                        setNewProduct({ ...newProduct, description: aiGeneratedDesc });
                        setAiGeneratedDesc('');
                      }}
                      className="ml-2 text-blue-600 hover:text-blue-800"
                    >
                      Utiliser
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <input 
                  name="priceCa" 
                  value={newProduct.priceCa} 
                  onChange={(e) => setNewProduct({ ...newProduct, priceCa: e.target.value })} 
                  placeholder="Prix CAD" 
                  className={`w-full border p-3 rounded-lg ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300'
                  }`} 
                  type="number" 
                  step="0.01" 
                  min="0" 
                />
                <input 
                  name="priceUs" 
                  value={newProduct.priceUs} 
                  onChange={(e) => setNewProduct({ ...newProduct, priceUs: e.target.value })} 
                  placeholder="Prix USD" 
                  className={`w-full border p-3 rounded-lg ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300'
                  }`} 
                  type="number" 
                  step="0.01" 
                  min="0" 
                />
              </div>

              <input 
                name="amazonCa" 
                value={newProduct.amazonCa} 
                onChange={(e) => setNewProduct({ ...newProduct, amazonCa: e.target.value })} 
                placeholder="Amazon.ca URL" 
                className={`w-full border p-3 rounded-lg ${
                  darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300'
                }`} 
                type="url" 
              />

              <input 
                name="amazonCom" 
                value={newProduct.amazonCom} 
                onChange={(e) => setNewProduct({ ...newProduct, amazonCom: e.target.value })} 
                placeholder="Amazon.com URL" 
                className={`w-full border p-3 rounded-lg ${
                  darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300'
                }`} 
                type="url" 
              />

              <input 
                name="tiktokUrl" 
                value={newProduct.tiktokUrl} 
                onChange={(e) => setNewProduct({ ...newProduct, tiktokUrl: e.target.value })} 
                placeholder="TikTok URL" 
                className={`w-full border p-3 rounded-lg ${
                  darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300'
                }`} 
                type="url" 
              />

              {/* Images */}
              <div className="space-y-3">
                <label className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{t('images')}:</label>
                {newProduct.images.map((image, i) => (
                  <div key={i} className="flex gap-2">
                    <input 
                      value={image} 
                      onChange={(e) => {
                        const updatedImages = [...newProduct.images];
                        updatedImages[i] = e.target.value;
                        setNewProduct({ ...newProduct, images: updatedImages });
                      }} 
                      placeholder={`Image URL ${i + 1}`} 
                      className={`flex-1 border p-3 rounded-lg text-sm ${
                        darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300'
                      }`} 
                      type="url" 
                    />
                    {newProduct.images.length > 1 && (
                      <button 
                        type="button" 
                        onClick={() => {
                          const updatedImages = newProduct.images.filter((_, index) => index !== i);
                          if (updatedImages.length === 0) updatedImages.push('');
                          setNewProduct({ ...newProduct, images: updatedImages });
                        }} 
                        className="px-3 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
                <button 
                  type="button" 
                  onClick={() => setNewProduct({ ...newProduct, images: [...newProduct.images, ''] })} 
                  className="w-full py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center justify-center gap-2"
                >
                  <Plus size={16} />{t('addImage')}
                </button>
              </div>

              {/* Catégories */}
              <div className="space-y-3">
                <label className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{t('categories')}:</label>
                <div className="flex flex-wrap gap-2">
                  {availableCategories.map((cat) => {
                    const isChecked = newProduct.categories.includes(cat);
                    return (
                      <label key={cat} className={`flex items-center p-2 rounded-lg text-sm cursor-pointer transition-colors ${
                        isChecked 
                          ? 'bg-blue-100 border-2 border-blue-500 text-blue-800' 
                          : darkMode
                            ? 'bg-gray-700 border-2 border-transparent hover:bg-gray-600 text-gray-300'
                            : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                      }`}>
                        <input 
                          type="checkbox" 
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              if (!newProduct.categories.includes(cat)) {
                                setNewProduct({ ...newProduct, categories: [...newProduct.categories, cat] });
                              }
                            } else {
                              const updatedCategories = newProduct.categories.filter(c => c !== cat);
                              setNewProduct({ ...newProduct, categories: updatedCategories });
                            }
                          }} 
                          className="mr-2" 
                        /> 
                        <span className="font-medium">{cat}</span>
                      </label>
                    );
                  })}
                </div>

                <input 
                  placeholder={passwordEntered ? t('addCategory') : `🔒 ${t('addCategory')} (Admin)`} 
                  disabled={!passwordEntered}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const val = (e.target as HTMLInputElement).value.trim();
                      if (val && passwordEntered) {
                        const normalizedCategory = normalizeCategory(cleanCategory(val));
                        if (normalizedCategory && !customCategories.includes(normalizedCategory)) {
                          const updatedCustomCategories = [...customCategories, normalizedCategory];
                          setCustomCategories(updatedCustomCategories);
                          localStorage.setItem('customCategories', JSON.stringify(updatedCustomCategories));
                        }
                        (e.target as HTMLInputElement).value = '';
                      }
                    }
                  }} 
                  className={`w-full border p-3 rounded-lg ${
                    !passwordEntered 
                      ? darkMode ? 'bg-gray-600 cursor-not-allowed border-gray-500' : 'bg-gray-100 cursor-not-allowed border-gray-300'
                      : darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300'
                  }`} 
                />

                {newProduct.categories.length > 0 && (
                  <div className={`p-3 rounded-lg ${darkMode ? 'bg-blue-900 text-blue-300' : 'bg-blue-50 text-blue-700'}`}>
                    <p className="text-sm">{t('selectedCategories')}: {newProduct.categories.join(', ')}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <button 
                  type="button" 
                  onClick={resetForm} 
                  className="flex-1 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                >
                  {t('cancel')}
                </button>
                <button 
                  type="submit" 
                  disabled={isLoading}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isLoading ? t('loading') : (editIndex !== null ? t('edit') : t('save'))}
                </button>
                {editIndex !== null && (
                  <button 
                    type="button" 
                    onClick={() => deleteProduct(products[editIndex].id)} 
                    className="px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    🗑️
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bouton flottant d'ajout */}
      <button 
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center z-30 transition-all duration-300 hover:scale-110" 
        onClick={() => {
          if (requestPassword()) {
            setShowForm(true);
          }
        }}
      >
        <Plus size={24} />
      </button>

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

// Composant ProductCard Premium
function ProductCard({ 
  product, 
  viewMode, 
  darkMode, 
  language, 
  isLiked, 
  onLike, 
  onShare, 
  onSitestripeRequest, 
  onEdit, 
  showAdmin, 
  t 
}: {
  product: Product;
  viewMode: 'grid' | 'list';
  darkMode: boolean;
  language: 'fr' | 'en';
  isLiked: boolean;
  onLike: () => void;
  onShare: () => void;
  onSitestripeRequest: () => void;
  onEdit: () => void;
  showAdmin: boolean;
  t: (key: string) => string;
}) {
  const [currentImage, setCurrentImage] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [showZoom, setShowZoom] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const images = Array.isArray(product.images) ? product.images.filter(Boolean) : [];
  const hasPrice = product.priceCa || product.priceUs;

  if (viewMode === 'list') {
    return (
      <div 
        className={`group relative rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.02] ${
          darkMode 
            ? 'bg-gray-800 border border-gray-700 hover:border-gray-600 hover:shadow-2xl' 
            : 'bg-white border border-gray-200 hover:border-gray-300 hover:shadow-xl'
        }`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="flex flex-col sm:flex-row">
          {/* Image section - Mode liste */}
          <div className="relative sm:w-64 h-48 sm:h-auto flex-shrink-0">
            {images.length > 0 ? (
              <>
                <img
                  src={images[currentImage]}
                  alt={product.name}
                  className={`w-full h-full object-cover transition-opacity duration-300 ${
                    imageLoaded ? 'opacity-100' : 'opacity-0'
                  }`}
                  onLoad={() => setImageLoaded(true)}
                  onError={() => setImageLoaded(true)}
                />
                {!imageLoaded && (
                  <div className={`absolute inset-0 flex items-center justify-center ${
                    darkMode ? 'bg-gray-700' : 'bg-gray-100'
                  }`}>
                    <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                  </div>
                )}
              </>
            ) : (
              <div className={`w-full h-full flex items-center justify-center ${
                darkMode ? 'bg-gray-700' : 'bg-gray-100'
              }`}>
                <span className="text-gray-400 text-2xl">📷</span>
              </div>
            )}

            {/* Badges et actions pour liste */}
            <div className="absolute top-3 left-3 flex flex-col gap-1">
              {product.promoted && (
                <span className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs px-2 py-1 rounded-full font-bold animate-pulse">
                  ⭐ PROMU
                </span>
              )}
              {product.trending && (
                <span className="bg-gradient-to-r from-pink-500 to-red-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                  🔥 TENDANCE
                </span>
              )}
              {product.verified && (
                <span className="bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                  ✓ VÉRIFIÉ
                </span>
              )}
            </div>

            <div className={`absolute top-3 right-3 flex flex-col gap-2 transition-opacity duration-300 ${
              isHovered ? 'opacity-100' : 'opacity-0'
            }`}>
              <button
                onClick={onLike}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isLiked 
                    ? 'bg-red-500 text-white scale-110' 
                    : 'bg-white/90 text-gray-700 hover:bg-red-100'
                } backdrop-blur-sm`}
              >
                <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
              </button>
              <button
                onClick={onShare}
                className="w-10 h-10 bg-white/90 text-gray-700 rounded-full flex items-center justify-center hover:bg-blue-100 transition-colors backdrop-blur-sm"
              >
                <Share2 className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Contenu - Mode liste */}
          <div className="p-4 sm:p-6 flex-1 flex flex-col justify-between">
            <div>
              <h3 className={`text-lg sm:text-xl font-bold mb-2 line-clamp-2 ${
                darkMode ? 'text-white' : 'text-gray-900'
              }`}>
                {product.name}
              </h3>
              <p className={`text-sm mb-4 line-clamp-3 ${
                darkMode ? 'text-gray-300' : 'text-gray-600'
              }`}>
                {product.description}
              </p>

              {/* Statistiques */}
              <div className="flex items-center gap-4 mb-4 text-sm">
                <div className="flex items-center gap-1">
                  <Eye className="w-4 h-4 text-blue-500" />
                  <span>{product.views?.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Heart className="w-4 h-4 text-red-500" />
                  <span>{product.likes}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-500 fill-current" />
                  <span>{product.rating}</span>
                </div>
              </div>
            </div>

            {/* Prix et actions */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              {hasPrice && (
                <div>
                  <p className={`text-xl sm:text-2xl font-bold ${
                    darkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    {product.priceCa && `${product.priceCa}$ CAD`}
                    {product.priceCa && product.priceUs && ' | '}
                    {product.priceUs && `${product.priceUs}$ USD`}
                  </p>
                  <p className={`text-sm ${
                    darkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    Prix indicatif
                  </p>
                </div>
              )}
              
              <button
                onClick={onSitestripeRequest}
                className="px-4 sm:px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2"
              >
                <ShoppingCart className="w-4 h-4" />
                🔗 Sitestripe
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Mode grille (par défaut) - Ultra optimisé responsive
  return (
    <div 
      className={`group relative rounded-2xl overflow-hidden transition-all duration-300 hover:scale-105 ${
        darkMode 
          ? 'bg-gray-800 border border-gray-700 hover:border-gray-600 hover:shadow-2xl' 
          : 'bg-white border border-gray-200 hover:border-gray-300 hover:shadow-xl'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image principale */}
      <div className="relative aspect-[4/5] overflow-hidden">
        {images.length > 0 ? (
          <>
            <img
              src={images[currentImage]}
              alt={product.name}
              className={`w-full h-full object-cover transition-all duration-500 ${
                imageLoaded ? 'opacity-100' : 'opacity-0'
              } ${isHovered ? 'scale-110' : 'scale-100'}`}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageLoaded(true)}
              onDoubleClick={() => setShowZoom(true)}
            />
            {!imageLoaded && (
              <div className={`absolute inset-0 flex items-center justify-center ${
                darkMode ? 'bg-gray-700' : 'bg-gray-100'
              }`}>
                <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
              </div>
            )}

            {/* Navigation images */}
            {images.length > 1 && isHovered && (
              <>
                <button
                  onClick={() => setCurrentImage((prev) => (prev - 1 + images.length) % images.length)}
                  className="absolute left-2 top-1/2 transform -translate-y-1/2 w-8 h-8 bg-black/60 text-white rounded-full flex items-center justify-center hover:bg-black/80 transition-colors"
                >
                  ‹
                </button>
                <button
                  onClick={() => setCurrentImage((prev) => (prev + 1) % images.length)}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 w-8 h-8 bg-black/60 text-white rounded-full flex items-center justify-center hover:bg-black/80 transition-colors"
                >
                  ›
                </button>

                {/* Indicateurs */}
                <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1">
                  {images.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImage(index)}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        index === currentImage ? 'bg-white' : 'bg-white/50'
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div className={`w-full h-full flex items-center justify-center ${
            darkMode ? 'bg-gray-700' : 'bg-gray-100'
          }`}>
            <span className="text-4xl">📷</span>
          </div>
        )}

        {/* Badges overlay */}
        <div className="absolute top-3 left-3 flex flex-col gap-1">
          {product.promoted && (
            <span className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs px-2 py-1 rounded-full font-bold animate-pulse">
              ⭐
            </span>
          )}
          {product.trending && (
            <span className="bg-gradient-to-r from-pink-500 to-red-500 text-white text-xs px-2 py-1 rounded-full font-bold">
              🔥
            </span>
          )}
          {product.verified && (
            <span className="bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs px-2 py-1 rounded-full font-bold">
              ✓
            </span>
          )}
        </div>

        {/* Actions flottantes */}
        <div className={`absolute top-3 right-3 flex flex-col gap-2 transition-opacity duration-300 ${
          isHovered ? 'opacity-100' : 'opacity-0'
        }`}>
          <button
            onClick={onLike}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
              isLiked 
                ? 'bg-red-500 text-white scale-110 animate-pulse' 
                : 'bg-white/90 text-gray-700 hover:bg-red-100'
            } backdrop-blur-sm shadow-lg`}
          >
            <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
          </button>
          <button
            onClick={onShare}
            className="w-10 h-10 bg-white/90 text-gray-700 rounded-full flex items-center justify-center hover:bg-blue-100 transition-colors backdrop-blur-sm shadow-lg"
          >
            <Share2 className="w-5 h-5" />
          </button>
          {showAdmin && (
            <button
              onClick={onEdit}
              className="w-10 h-10 bg-white/90 text-gray-700 rounded-full flex items-center justify-center hover:bg-purple-100 transition-colors backdrop-blur-sm shadow-lg"
            >
              <Pencil className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Contenu de la carte */}
      <div className="p-3 sm:p-4">
        {/* Titre et description */}
        <h3 className={`font-bold text-sm sm:text-lg mb-2 line-clamp-2 ${
          darkMode ? 'text-white' : 'text-gray-900'
        }`}>
          {product.name}
        </h3>
        
        <p className={`text-xs sm:text-sm mb-3 line-clamp-2 ${
          darkMode ? 'text-gray-300' : 'text-gray-600'
        }`}>
          {product.description}
        </p>

        {/* Statistiques miniatures */}
        <div className="flex items-center justify-between mb-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Eye className="w-3 h-3 text-blue-500" />
              <span>{product.views?.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1">
              <Heart className="w-3 h-3 text-red-500" />
              <span>{product.likes}</span>
            </div>
            <div className="flex items-center gap-1">
              <Star className="w-3 h-3 text-yellow-500 fill-current" />
              <span>{product.rating}</span>
            </div>
          </div>
        </div>

        {/* Prix */}
        {hasPrice && (
          <div className="mb-4">
            <p className={`text-sm sm:text-lg font-bold ${
              darkMode ? 'text-white' : 'text-gray-900'
            }`}>
              {product.priceCa && `${product.priceCa}$ CAD`}
              {product.priceCa && product.priceUs && ' | '}
              {product.priceUs && `${product.priceUs}$ USD`}
            </p>
            <p className={`text-xs ${
              darkMode ? 'text-gray-400' : 'text-gray-500'
            }`}>
              Prix indicatif
            </p>
          </div>
        )}

        {/* Actions principales */}
        <div className="space-y-2">
          <button
            onClick={onSitestripeRequest}
            className="w-full py-2 sm:py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-[1.02] flex items-center justify-center gap-2 text-sm"
          >
            <ShoppingCart className="w-4 h-4" />
            🔗 Sitestripe
          </button>
          
          {/* Liens externes */}
          {(product.amazonCa || product.amazonCom) && (
            <div className="flex gap-1">
              {product.amazonCa && (
                <a 
                  href={product.amazonCa} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex-1 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  Amazon.ca
                </a>
              )}
              {product.amazonCom && (
                <a 
                  href={product.amazonCom} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex-1 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  Amazon.com
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal Zoom d'image */}
      {showZoom && (
        <div 
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setShowZoom(false)}
        >
          <div className="relative max-w-4xl max-h-full" onClick={(e) => e.stopPropagation()}>
            <button 
              onClick={() => setShowZoom(false)}
              className="absolute top-4 right-4 w-10 h-10 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center z-10 backdrop-blur-sm"
            >
              ✕
            </button>
            
            <img
              src={images[currentImage]}
              alt={product.name}
              className="max-w-full max-h-full object-contain rounded-lg"
            />
            
            {images.length > 1 && (
              <>
                <button
                  onClick={() => setCurrentImage((prev) => (prev - 1 + images.length) % images.length)}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 w-12 h-12 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center text-2xl"
                >
                  ‹
                </button>
                <button
                  onClick={() => setCurrentImage((prev) => (prev + 1) % images.length)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 w-12 h-12 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center text-2xl"
                >
                  ›
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Configuration Supabase
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

interface Advertisement {
  id?: number;
  title: string;
  description: string;
  url: string;
  imageUrl?: string;
  type: 'video' | 'image';
  isActive: boolean;
  createdAt?: string;
}

interface AdSenseConfig {
  id?: number;
  clientId: string;
  slotId: string;
  format: 'auto' | 'horizontal' | 'rectangle' | 'vertical';
  isActive: boolean;
  position: 'top' | 'middle' | 'bottom' | 'sidebar';
  frequency: number;
  createdAt?: string;
}

// Données par défaut
const DEFAULT_CATEGORIES = {
  fr: ['Montre', 'Lunette de soleil', 'Sac à dos', 'Article de voyage', 'Tech', 'Mode', 'Maison', 'Sport'],
  en: ['Watch', 'Sunglasses', 'Backpack', 'Travel item', 'Tech', 'Fashion', 'Home', 'Sports']
};

const CATEGORY_MAPPING = {
  'Montre': 'Watch',
  'Lunette de soleil': 'Sunglasses', 
  'Sac à dos': 'Backpack',
  'Article de voyage': 'Travel item',
  'Tech': 'Tech',
  'Mode': 'Fashion',
  'Maison': 'Home',
  'Sport': 'Sports',
  'Watch': 'Montre',
  'Sunglasses': 'Lunette de soleil',
  'Backpack': 'Sac à dos',
  'Travel item': 'Article de voyage',
  'Fashion': 'Mode',
  'Home': 'Maison',
  'Sports': 'Sport'
};

// Traductions complètes
const translations = {
  fr: {
    title: 'CERDIA Collection',
    subtitle: 'Découvrez nos produits exclusifs avec liens Sitestripe',
    searchPlaceholder: 'Rechercher des produits...',
    all: 'Tous',
    trending: 'Tendances',
    verified: 'Vérifiés',
    promoted: 'Promus',
    filters: 'Filtres',
    sortBy: 'Trier par',
    gridView: 'Grille',
    listView: 'Liste',
    addProduct: 'Ajouter Produit',
    name: 'Nom',
    description: 'Description',
    price: 'Prix',
    save: 'Sauvegarder',
    cancel: 'Annuler',
    delete: 'Supprimer',
    edit: 'Modifier',
    share: 'Partager',
    viewProduct: 'Voir le produit',
    requestSitestripe: 'Demander Sitestripe',
    viewsCount: 'vues',
    likesCount: 'j\'aime',
    rating: 'Note',
    newest: 'Plus récent',
    oldest: 'Plus ancien',
    priceLowHigh: 'Prix croissant',
    priceHighLow: 'Prix décroissant',
    mostLiked: 'Plus aimés',
    mostViewed: 'Plus vus',
    topRated: 'Mieux notés',
    priceFrom: 'À partir de',
    darkMode: 'Mode sombre',
    backToTop: 'Retour en haut',
    loadMore: 'Charger plus',
    loading: 'Chargement...',
    noResults: 'Aucun résultat trouvé',
    totalProducts: 'produits au total',
    onlineUsers: 'utilisateurs en ligne',
    adminPassword: 'Mot de passe admin :',
    incorrectPassword: 'Mot de passe incorrect.',
    viewOnTiktok: 'Voir sur TikTok',
    noImage: 'Aucune image',
    imageNotAvailable: 'Image non disponible',
    productAdded: 'Produit ajouté avec succès !',
    productUpdated: 'Produit mis à jour avec succès !',
    productDeleted: 'Produit supprimé avec succès !',
    addError: 'Erreur lors de l\'ajout',
    updateError: 'Erreur lors de la mise à jour',
    deleteError: 'Erreur lors de la suppression',
    images: 'Images',
    categories: 'Catégories',
    addImage: 'Ajouter image',
    addCategory: 'Ajouter catégorie',
    selectedCategories: 'Catégories sélectionnées'
  },
  en: {
    title: 'CERDIA Collection',
    subtitle: 'Discover our exclusive products with Sitestripe links',
    searchPlaceholder: 'Search products...',
    all: 'All',
    trending: 'Trending',
    verified: 'Verified',
    promoted: 'Promoted',
    filters: 'Filters',
    sortBy: 'Sort by',
    gridView: 'Grid',
    listView: 'List',
    addProduct: 'Add Product',
    name: 'Name',
    description: 'Description',
    price: 'Price',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    share: 'Share',
    viewProduct: 'View product',
    requestSitestripe: 'Request Sitestripe',
    viewsCount: 'views',
    likesCount: 'likes',
    rating: 'Rating',
    newest: 'Newest',
    oldest: 'Oldest',
    priceLowHigh: 'Price: Low to High',
    priceHighLow: 'Price: High to Low',
    mostLiked: 'Most Liked',
    mostViewed: 'Most Viewed',
    topRated: 'Top Rated',
    priceFrom: 'From',
    darkMode: 'Dark mode',
    backToTop: 'Back to top',
    loadMore: 'Load more',
    loading: 'Loading...',
    noResults: 'No results found',
    totalProducts: 'total products',
    onlineUsers: 'users online',
    adminPassword: 'Admin password:',
    incorrectPassword: 'Incorrect password.',
    viewOnTiktok: 'View on TikTok',
    noImage: 'No image',
    imageNotAvailable: 'Image not available',
    productAdded: 'Product added successfully!',
    productUpdated: 'Product updated successfully!',
    productDeleted: 'Product deleted successfully!',
    addError: 'Error adding product',
    updateError: 'Error updating product',
    deleteError: 'Error deleting product',
    images: 'Images',
    categories: 'Categories',
    addImage: 'Add image',
    addCategory: 'Add category',
    selectedCategories: 'Selected categories'
  }
};

export default function CerdiaEnhancedPlatform() {
  // États principaux avec Supabase
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  
  // États d'interface
  const [language, setLanguage] = useState<'fr' | 'en'>('fr');
  const [darkMode, setDarkMode] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortFilter, setSortFilter] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  
  // États d'administration
  const [passwordEntered, setPasswordEntered] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  
  // États de statistiques
  const [pageViews, setPageViews] = useState(1247);
  const [onlineUsers, setOnlineUsers] = useState(12);
  
  // États pour OpenAI et IA
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiGeneratedDesc, setAiGeneratedDesc] = useState('');
  
  // États pour les interactions utilisateur
  const [userLikes, setUserLikes] = useState<Set<number>>(new Set());
  
  // États pour les nouveaux produits
  const [newProduct, setNewProduct] = useState<Product>({
    name: '',
    description: '',
    amazonCa: '',
    amazonCom: '',
    tiktokUrl: '',
    images: [''],
    categories: [],
    priceCa: '',
    priceUs: '',
    views: 0,
    likes: 0,
    rating: 5,
    verified: false,
    trending: false,
    promoted: false
  });

  // Fonction de traduction
  const t = (key: keyof typeof translations.fr) => translations[language][key] || key;

  // Fonctions utilitaires pour les catégories
  const cleanCategory = (category: string): string => {
    return category.replace(/['"\\]/g, '').trim();
  };

  const translateCategory = (category: string, targetLang: 'fr' | 'en'): string => {
    const cleanCat = cleanCategory(category);
    const mapping = CATEGORY_MAPPING[cleanCat as keyof typeof CATEGORY_MAPPING];
    if (mapping) {
      return targetLang === 'en' ? mapping : cleanCat;
    }
    return cleanCat;
  };

  const normalizeCategory = (category: string): string => {
    const cleanCat = cleanCategory(category);
    const frenchVersion = Object.entries(CATEGORY_MAPPING).find(([fr, en]) => en === cleanCat)?.[0];
    return frenchVersion || cleanCat;
  };

  // Fonctions Supabase CRUD
  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
      
      if (!error && data) {
        const formatted = data.map((p) => {
          let productCategories = [];
          if (p.categories) {
            if (Array.isArray(p.categories)) {
              productCategories = p.categories
                .map(cat => cleanCategory(cat))
                .filter(cat => cat && cat.trim() !== '');
            } else if (typeof p.categories === 'string') {
              try {
                const parsed = JSON.parse(p.categories);
                if (Array.isArray(parsed)) {
                  productCategories = parsed
                    .map(cat => cleanCategory(cat))
                    .filter(cat => cat && cat.trim() !== '');
                }
              } catch (e) {
                productCategories = [cleanCategory(p.categories)]
                  .filter(cat => cat && cat.trim() !== '');
              }
            }
          }
          
          return {
            id: p.id,
            name: p.name,
            description: p.description,
            amazonCa: p.amazonca || '',
            amazonCom: p.amazoncom || '',
            tiktokUrl: p.tiktokurl || '',
            images: [p.image1, p.image2, p.image3, p.image4, p.image5].filter(Boolean),
            categories: productCategories,
            priceCa: p.price_ca?.toString() || '',
            priceUs: p.price_us?.toString() || '',
            createdAt: p.created_at || new Date().toISOString(),
            // Génération aléatoire pour stats (remplacez par vraies données si disponibles)
            views: Math.floor(Math.random() * 2000) + 100,
            likes: Math.floor(Math.random() * 200) + 10,
            rating: parseFloat((Math.random() * 2 + 3).toFixed(1)),
            verified: Math.random() > 0.7,
            trending: Math.random() > 0.8,
            promoted: Math.random() > 0.9
          };
        });
        
        setProducts(formatted);
        setFilteredProducts(formatted);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des produits:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveProduct = async () => {
    const filteredImages = newProduct.images.filter(img => img.trim() !== '');
    
    const normalizedCategories = newProduct.categories
      .map(cat => normalizeCategory(cleanCategory(cat)))
      .filter(cat => cat && cat.trim() !== '')
      .filter((cat, index, arr) => arr.indexOf(cat) === index);
    
    const productToInsert: any = {
      name: newProduct.name,
      description: newProduct.description,
      categories: normalizedCategories.length > 0 ? normalizedCategories : null,
    };

    if (newProduct.amazonCa?.trim()) productToInsert.amazonca = newProduct.amazonCa;
    if (newProduct.amazonCom?.trim()) productToInsert.amazoncom = newProduct.amazonCom;
    if (newProduct.tiktokUrl?.trim()) productToInsert.tiktokurl = newProduct.tiktokUrl;
    if (newProduct.priceCa && parseFloat(newProduct.priceCa) > 0) {
      productToInsert.price_ca = parseFloat(newProduct.priceCa.replace(',', '.'));
    }
    if (newProduct.priceUs && parseFloat(newProduct.priceUs) > 0) {
      productToInsert.price_us = parseFloat(newProduct.priceUs.replace(',', '.'));
    }

    for (let i = 0; i < Math.min(filteredImages.length, 5); i++) {
      productToInsert[`image${i + 1}`] = filteredImages[i];
    }

    try {
      if (editIndex !== null && products[editIndex].id) {
        const { error } = await supabase.from('products').update(productToInsert).eq('id', products[editIndex].id);
        if (!error) {
          await fetchProducts();
          alert(t('productUpdated'));
        } else {
          alert(t('updateError'));
        }
      } else {
        const { error } = await supabase.from('products').insert([productToInsert]);
        if (!error) {
          await fetchProducts();
          alert(t('productAdded'));
        } else {
          alert(t('addError'));
        }
      }
      resetForm();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      alert(t('addError'));
    }
  };

  const deleteProduct = async (id: number | undefined) => {
    if (!passwordEntered || !id) return;
    
    const confirmDelete = confirm('Êtes-vous sûr de vouloir supprimer ce produit ?');
    if (!confirmDelete) return;
    
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (!error) {
        await fetchProducts();
        alert(t('productDeleted'));
      } else {
        alert(t('deleteError'));
      }
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      alert(t('deleteError'));
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
      priceUs: '',
      views: 0,
      likes: 0,
      rating: 5,
      verified: false,
      trending: false,
      promoted: false
    });
    setAiGeneratedDesc('');
  };

  const handleEdit = (index: number) => {
    const product = products[index];
    setEditIndex(index);
    setShowForm(true);
    
    const translatedCategories = Array.isArray(product.categories) 
      ? product.categories
          .map(cat => cleanCategory(cat))
          .filter(cat => cat && cat.trim() !== '')
          .map(cat => translateCategory(cat, language))
      : [];
    
    const productImages = [...product.images];
    if (productImages.length === 0 || productImages[productImages.length - 1] !== '') {
      productImages.push('');
    }
    
    setNewProduct({
      ...product,
      categories: translatedCategories,
      images: productImages
    });
  };

  // Chargement initial
  useEffect(() => {
    fetchProducts();
    
    // Charger les catégories personnalisées depuis localStorage
    try {
      const saved = localStorage.getItem('customCategories');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setCustomCategories(parsed);
        }
      }
    } catch (e) {
      console.error('Erreur lors du chargement des catégories personnalisées:', e);
    }
  }, []);

  // Mise à jour des catégories disponibles
  useEffect(() => {
    const defaultCats = DEFAULT_CATEGORIES[language];
    
    const productCategories = new Set<string>();
    products.forEach(product => {
      if (Array.isArray(product.categories)) {
        product.categories.forEach(cat => {
          const cleanCat = cleanCategory(cat);
          if (cleanCat && cleanCat.trim() !== '' && !cleanCat.includes('"') && !cleanCat.includes('[') && !cleanCat.includes(']')) {
            const translatedCat = translateCategory(cleanCat, language);
            if (translatedCat) {
              productCategories.add(translatedCat);
            }
          }
        });
      }
    });
    
    const translatedCustomCategories = customCategories
      .map(cat => translateCategory(cleanCategory(cat), language))
      .filter(cat => cat && cat.trim() !== '');
    
    const allCategories = new Set([
      ...defaultCats,
      ...Array.from(productCategories),
      ...translatedCustomCategories
    ]);
    
    const cleanedCategories = Array.from(allCategories)
      .filter(cat => cat && cat.trim() !== '' && cat !== 'undefined' && cat !== 'null')
      .sort();
    
    setAvailableCategories(cleanedCategories);
  }, [products, language, customCategories]);

  // Fonctions OpenAI
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
        alert(`Description générée: ${data.description}`);
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

  // Fonctions de filtrage et tri
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
    if (categoryFilter && categoryFilter !== '') {
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

  // Effects
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
      
      {/* HEADER PRINCIPAL */}
      <header className={`sticky top-0 z-50 backdrop-blur-xl border-b transition-all duration-300 ${
        darkMode 
          ? 'bg-gray-900/90 border-gray-700 shadow-xl' 
          : 'bg-white/90 border-gray-200 shadow-lg'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Navigation principale */}
          <div className="flex items-center justify-between h-16 lg:h-20">
            
            {/* Logo et titre */}
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <div className={`w-10 h-10 lg:w-12 lg:h-12 rounded-xl flex items-center justify-center text-2xl font-bold ${
                  darkMode 
                    ? 'bg-gradient-to-br from-blue-400 to-purple-500 text-white' 
                    : 'bg-gradient-to-br from-blue-500 to-purple-600 text-white'
                } shadow-lg`}>
                  C
                </div>
              </div>
              <div className="hidden sm:block">
                <h1 className={`text-xl lg:text-2xl font-bold ${
                  darkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  {t('title')}
                </h1>
                <p className={`text-sm ${
                  darkMode ? 'text-gray-300' : 'text-gray-600'
                }`}>
                  {t('subtitle')}
                </p>
              </div>
            </div>

            {/* Barre de recherche centrale */}
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
                      ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-blue-400 focus:bg-gray-700' 
                      : 'bg-white border-gray-200 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:bg-gray-50'
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

            {/* Actions à droite */}
            <div className="flex items-center space-x-2 lg:space-x-4">
              
              {/* Statistiques en temps réel */}
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

              {/* Sélecteur de langue */}
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

              {/* Toggle mode sombre */}
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

              {/* Menu admin */}
              {passwordEntered && (
                <button 
                  onClick={() => requestPassword()}
                  className="p-2 lg:p-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-all duration-300 hover:scale-110"
                >
                  <Plus className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* Navigation secondaire avec filtres */}
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

              {/* Actions de vue et tri */}
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

      {/* Contenu principal avec grille de produits */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Barre de suggestions IA */}
        {aiSuggestions.length > 0 && (
          <div className={`mb-6 p-4 rounded-2xl border-2 border-dashed ${
            darkMode ? 'border-purple-600 bg-purple-900/20' : 'border-purple-300 bg-purple-50'
          }`}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                AI
              </div>
              <span className={`font-medium ${darkMode ? 'text-purple-300' : 'text-purple-700'}`}>
                Suggestions intelligentes
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {aiSuggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSearchWithAI(suggestion)}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    darkMode 
                      ? 'bg-purple-800 text-purple-200 hover:bg-purple-700' 
                      : 'bg-purple-100 text-purple-800 hover:bg-purple-200'
                  }`}
                >
                  ✨ {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Statistiques et résultats */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className={`text-2xl lg:text-3xl font-bold ${
                darkMode ? 'text-white' : 'text-gray-900'
              }`}>
                {searchQuery ? `Résultats pour "${searchQuery}"` : 'Notre Collection'}
              </h2>
              <p className={`text-sm mt-1 ${
                darkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                {filteredProducts.length} {t('totalProducts')} • {onlineUsers} {t('onlineUsers')}
              </p>
            </div>
            
            {/* Panel IA et Analytics */}
            <div className="flex items-center gap-3">
              {passwordEntered && (
                <button
                  onClick={() => setShowAiPanel(!showAiPanel)}
                  className={`p-2 rounded-xl transition-colors ${
                    showAiPanel
                      ? 'bg-blue-500 text-white'
                      : darkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  🤖
                </button>
              )}
              
              {/* Badges */}
              <div className="flex flex-wrap gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  darkMode ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-800'
                }`}>
                  ✓ Liens Sitestripe
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  darkMode ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-800'
                }`}>
                  🚀 IA Intégrée
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Panel IA latéral */}
        {showAiPanel && passwordEntered && (
          <div className={`fixed right-4 top-24 bottom-4 w-80 rounded-2xl shadow-2xl border-2 z-40 overflow-hidden ${
            darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'
          }`}>
            <div className={`p-4 border-b ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center text-white font-bold">
                    AI
                  </div>
                  <h3 className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Assistant IA
                  </h3>
                </div>
                <button
                  onClick={() => setShowAiPanel(false)}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                  }`}
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="p-4 space-y-4 overflow-y-auto h-full">
              <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <h4 className={`font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  📝 Génération IA
                </h4>
                <input
                  placeholder="Nom du produit..."
                  className={`w-full p-2 rounded-lg border text-sm mb-2 ${
                    darkMode ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300'
                  }`}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      const target = e.target as HTMLInputElement;
                      generateProductDescription(target.value);
                    }
                  }}
                />
                <button
                  onClick={() => {
                    const input = document.querySelector('input[placeholder="Nom du produit..."]') as HTMLInputElement;
                    if (input?.value) generateProductDescription(input.value);
                  }}
                  disabled={aiLoading}
                  className="w-full py-2 bg-purple-500 text-white rounded-lg text-sm hover:bg-purple-600 disabled:opacity-50"
                >
                  {aiLoading ? 'Génération...' : 'Générer avec IA'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Grille de produits */}
        {filteredProducts.length > 0 ? (
          <div className={`grid gap-4 transition-all duration-300 ${
            viewMode === 'grid' 
              ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6' 
              : 'grid-cols-1 lg:grid-cols-2'
          }`}>
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                viewMode={viewMode}
                darkMode={darkMode}
                language={language}
                isLiked={userLikes.has(product.id || 0)}
                onLike={() => handleLike(product.id || 0)}
                onShare={() => handleShare(product)}
                onSitestripeRequest={() => openSitestripeRequest(product)}
                onEdit={() => requestPassword()}
                showAdmin={passwordEntered}
                t={t}
              />
            ))}
          </div>
        ) : (
          // État vide avec suggestions IA
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🤖</div>
            <h3 className={`text-2xl font-bold mb-2 ${
              darkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Aucun résultat trouvé
            </h3>
            <p className={`text-lg mb-6 ${
              darkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Notre IA peut vous aider à trouver des produits similaires
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setCategoryFilter('');
                setSortFilter('');
              }}
              className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-colors"
            >
              Voir tous les produits
            </button>
          </div>
        )}

        {/* Section finale */}
        <div className="mt-20 text-center">
          <div className="bg-gradient-to-r from-blue-100 to-purple-100 border border-blue-300 rounded-2xl p-8 inline-block">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                🚀
              </div>
              <h3 className="text-2xl font-bold text-gray-900">Plateforme CERDIA Complète !</h3>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
              <div className="text-center">
                <div className="text-3xl mb-2">🎨</div>
                <h4 className="font-bold">Design Premium</h4>
                <p className="text-sm text-gray-600">Interface moderne responsive</p>
              </div>
              <div className="text-center">
                <div className="text-3xl mb-2">🤖</div>
                <h4 className="font-bold">IA Intégrée</h4>
                <p className="text-sm text-gray-600">OpenAI pour optimisation</p>
              </div>
              <div className="text-center">
                <div className="text-3xl mb-2">🔗</div>
                <h4 className="font-bold">Sitestripe</h4>
                <p className="text-sm text-gray-600">Liens automatiques</p>
              </div>
              <div className="text-center">
                <div className="text-3xl mb-2">📊</div>
                <h4 className="font-bold">Analytics</h4>
                <p className="text-sm text-gray-600">Temps réel</p>
              </div>
            </div>
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

// Composant ProductCard Premium
function ProductCard({ 
  product, 
  viewMode, 
  darkMode, 
  language, 
  isLiked, 
  onLike, 
  onShare, 
  onSitestripeRequest, 
  onEdit, 
  showAdmin, 
  t 
}: {
  product: Product;
  viewMode: 'grid' | 'list';
  darkMode: boolean;
  language: 'fr' | 'en';
  isLiked: boolean;
  onLike: () => void;
  onShare: () => void;
  onSitestripeRequest: () => void;
  onEdit: () => void;
  showAdmin: boolean;
  t: (key: string) => string;
}) {
  const [currentImage, setCurrentImage] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [showZoom, setShowZoom] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const images = Array.isArray(product.images) ? product.images.filter(Boolean) : [];
  const hasPrice = product.priceCa || product.priceUs;

  if (viewMode === 'list') {
    return (
      <div 
        className={`group relative rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.02] ${
          darkMode 
            ? 'bg-gray-800 border border-gray-700 hover:border-gray-600 hover:shadow-2xl' 
            : 'bg-white border border-gray-200 hover:border-gray-300 hover:shadow-xl'
        }`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="flex flex-col sm:flex-row">
          {/* Image section - Mode liste */}
          <div className="relative sm:w-64 h-48 sm:h-auto flex-shrink-0">
            {images.length > 0 ? (
              <>
                <img
                  src={images[currentImage]}
                  alt={product.name}
                  className={`w-full h-full object-cover transition-opacity duration-300 ${
                    imageLoaded ? 'opacity-100' : 'opacity-0'
                  }`}
                  onLoad={() => setImageLoaded(true)}
                  onError={() => setImageLoaded(true)}
                />
                {!imageLoaded && (
                  <div className={`absolute inset-0 flex items-center justify-center ${
                    darkMode ? 'bg-gray-700' : 'bg-gray-100'
                  }`}>
                    <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                  </div>
                )}
              </>
            ) : (
              <div className={`w-full h-full flex items-center justify-center ${
                darkMode ? 'bg-gray-700' : 'bg-gray-100'
              }`}>
                <span className="text-gray-400 text-2xl">📷</span>
              </div>
            )}

            {/* Badges et actions pour liste */}
            <div className="absolute top-3 left-3 flex flex-col gap-1">
              {product.promoted && (
                <span className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs px-2 py-1 rounded-full font-bold animate-pulse">
                  ⭐ PROMU
                </span>
              )}
              {product.trending && (
                <span className="bg-gradient-to-r from-pink-500 to-red-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                  🔥 TENDANCE
                </span>
              )}
              {product.verified && (
                <span className="bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                  ✓ VÉRIFIÉ
                </span>
              )}
            </div>

            <div className={`absolute top-3 right-3 flex flex-col gap-2 transition-opacity duration-300 ${
              isHovered ? 'opacity-100' : 'opacity-0'
            }`}>
              <button
                onClick={onLike}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isLiked 
                    ? 'bg-red-500 text-white scale-110' 
                    : 'bg-white/90 text-gray-700 hover:bg-red-100'
                } backdrop-blur-sm`}
              >
                <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
              </button>
              <button
                onClick={onShare}
                className="w-10 h-10 bg-white/90 text-gray-700 rounded-full flex items-center justify-center hover:bg-blue-100 transition-colors backdrop-blur-sm"
              >
                <Share2 className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Contenu - Mode liste */}
          <div className="p-4 sm:p-6 flex-1 flex flex-col justify-between">
            <div>
              <h3 className={`text-lg sm:text-xl font-bold mb-2 line-clamp-2 ${
                darkMode ? 'text-white' : 'text-gray-900'
              }`}>
                {product.name}
              </h3>
              <p className={`text-sm mb-4 line-clamp-3 ${
                darkMode ? 'text-gray-300' : 'text-gray-600'
              }`}>
                {product.description}
              </p>

              {/* Statistiques */}
              <div className="flex items-center gap-4 mb-4 text-sm">
                <div className="flex items-center gap-1">
                  <Eye className="w-4 h-4 text-blue-500" />
                  <span>{product.views?.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Heart className="w-4 h-4 text-red-500" />
                  <span>{product.likes}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-500 fill-current" />
                  <span>{product.rating}</span>
                </div>
              </div>
            </div>

            {/* Prix et actions */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              {hasPrice && (
                <div>
                  <p className={`text-xl sm:text-2xl font-bold ${
                    darkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    {product.priceCa && `${product.priceCa}$ CAD`}
                    {product.priceCa && product.priceUs && ' | '}
                    {product.priceUs && `${product.priceUs}$ USD`}
                  </p>
                  <p className={`text-sm ${
                    darkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    Prix indicatif
                  </p>
                </div>
              )}
              
              <button
                onClick={onSitestripeRequest}
                className="px-4 sm:px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2"
              >
                <ShoppingCart className="w-4 h-4" />
                🔗 Sitestripe
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Mode grille (par défaut) - Ultra optimisé responsive
  return (
    <div 
      className={`group relative rounded-2xl overflow-hidden transition-all duration-300 hover:scale-105 ${
        darkMode 
          ? 'bg-gray-800 border border-gray-700 hover:border-gray-600 hover:shadow-2xl' 
          : 'bg-white border border-gray-200 hover:border-gray-300 hover:shadow-xl'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image principale */}
      <div className="relative aspect-[4/5] overflow-hidden">
        {images.length > 0 ? (
          <>
            <img
              src={images[currentImage]}
              alt={product.name}
              className={`w-full h-full object-cover transition-all duration-500 ${
                imageLoaded ? 'opacity-100' : 'opacity-0'
              } ${isHovered ? 'scale-110' : 'scale-100'}`}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageLoaded(true)}
              onDoubleClick={() => setShowZoom(true)}
            />
            {!imageLoaded && (
              <div className={`absolute inset-0 flex items-center justify-center ${
                darkMode ? 'bg-gray-700' : 'bg-gray-100'
              }`}>
                <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
              </div>
            )}

            {/* Navigation images */}
            {images.length > 1 && isHovered && (
              <>
                <button
                  onClick={() => setCurrentImage((prev) => (prev - 1 + images.length) % images.length)}
                  className="absolute left-2 top-1/2 transform -translate-y-1/2 w-8 h-8 bg-black/60 text-white rounded-full flex items-center justify-center hover:bg-black/80 transition-colors"
                >
                  ‹
                </button>
                <button
                  onClick={() => setCurrentImage((prev) => (prev + 1) % images.length)}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 w-8 h-8 bg-black/60 text-white rounded-full flex items-center justify-center hover:bg-black/80 transition-colors"
                >
                  ›
                </button>

                {/* Indicateurs */}
                <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1">
                  {images.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImage(index)}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        index === currentImage ? 'bg-white' : 'bg-white/50'
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div className={`w-full h-full flex items-center justify-center ${
            darkMode ? 'bg-gray-700' : 'bg-gray-100'
          }`}>
            <span className="text-4xl">📷</span>
          </div>
        )}

        {/* Badges overlay */}
        <div className="absolute top-3 left-3 flex flex-col gap-1">
          {product.promoted && (
            <span className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs px-2 py-1 rounded-full font-bold animate-pulse">
              ⭐
            </span>
          )}
          {product.trending && (
            <span className="bg-gradient-to-r from-pink-500 to-red-500 text-white text-xs px-2 py-1 rounded-full font-bold">
              🔥
            </span>
          )}
          {product.verified && (
            <span className="bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs px-2 py-1 rounded-full font-bold">
              ✓
            </span>
          )}
        </div>

        {/* Actions flottantes */}
        <div className={`absolute top-3 right-3 flex flex-col gap-2 transition-opacity duration-300 ${
          isHovered ? 'opacity-100' : 'opacity-0'
        }`}>
          <button
            onClick={onLike}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
              isLiked 
                ? 'bg-red-500 text-white scale-110 animate-pulse' 
                : 'bg-white/90 text-gray-700 hover:bg-red-100'
            } backdrop-blur-sm shadow-lg`}
          >
            <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
          </button>
          <button
            onClick={onShare}
            className="w-10 h-10 bg-white/90 text-gray-700 rounded-full flex items-center justify-center hover:bg-blue-100 transition-colors backdrop-blur-sm shadow-lg"
          >
            <Share2 className="w-5 h-5" />
          </button>
          {showAdmin && (
            <button
              onClick={onEdit}
              className="w-10 h-10 bg-white/90 text-gray-700 rounded-full flex items-center justify-center hover:bg-purple-100 transition-colors backdrop-blur-sm shadow-lg"
            >
              <Pencil className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Contenu de la carte */}
      <div className="p-3 sm:p-4">
        {/* Titre et description */}
        <h3 className={`font-bold text-sm sm:text-lg mb-2 line-clamp-2 ${
          darkMode ? 'text-white' : 'text-gray-900'
        }`}>
          {product.name}
        </h3>
        
        <p className={`text-xs sm:text-sm mb-3 line-clamp-2 ${
          darkMode ? 'text-gray-300' : 'text-gray-600'
        }`}>
          {product.description}
        </p>

        {/* Statistiques miniatures */}
        <div className="flex items-center justify-between mb-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Eye className="w-3 h-3 text-blue-500" />
              <span>{product.views?.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1">
              <Heart className="w-3 h-3 text-red-500" />
              <span>{product.likes}</span>
            </div>
            <div className="flex items-center gap-1">
              <Star className="w-3 h-3 text-yellow-500 fill-current" />
              <span>{product.rating}</span>
            </div>
          </div>
        </div>

        {/* Prix */}
        {hasPrice && (
          <div className="mb-4">
            <p className={`text-sm sm:text-lg font-bold ${
              darkMode ? 'text-white' : 'text-gray-900'
            }`}>
              {product.priceCa && `${product.priceCa}$ CAD`}
              {product.priceCa && product.priceUs && ' | '}
              {product.priceUs && `${product.priceUs}$ USD`}
            </p>
            <p className={`text-xs ${
              darkMode ? 'text-gray-400' : 'text-gray-500'
            }`}>
              Prix indicatif
            </p>
          </div>
        )}

        {/* Actions principales */}
        <div className="space-y-2">
          <button
            onClick={onSitestripeRequest}
            className="w-full py-2 sm:py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-[1.02] flex items-center justify-center gap-2 text-sm"
          >
            <ShoppingCart className="w-4 h-4" />
            🔗 Sitestripe
          </button>
          
          {/* Liens externes */}
          {(product.amazonCa || product.amazonCom) && (
            <div className="flex gap-1">
              {product.amazonCa && (
                <a 
                  href={product.amazonCa} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex-1 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  Amazon.ca
                </a>
              )}
              {product.amazonCom && (
                <a 
                  href={product.amazonCom} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex-1 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  Amazon.com
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal Zoom d'image */}
      {showZoom && (
        <div 
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setShowZoom(false)}
        >
          <div className="relative max-w-4xl max-h-full" onClick={(e) => e.stopPropagation()}>
            <button 
              onClick={() => setShowZoom(false)}
              className="absolute top-4 right-4 w-10 h-10 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center z-10 backdrop-blur-sm"
            >
              ✕
            </button>
            
            <img
              src={images[currentImage]}
              alt={product.name}
              className="max-w-full max-h-full object-contain rounded-lg"
            />
            
            {images.length > 1 && (
              <>
                <button
                  onClick={() => setCurrentImage((prev) => (prev - 1 + images.length) % images.length)}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 w-12 h-12 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center text-2xl"
                >
                  ‹
                </button>
                <button
                  onClick={() => setCurrentImage((prev) => (prev + 1) % images.length)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 w-12 h-12 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center text-2xl"
                >
                  ›
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
