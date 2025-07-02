// app/ecommerce/page.tsx - Section 2
'use client';

import { useState, useEffect, useCallback, createContext, useContext, useMemo } from 'react';
import { Settings, Globe, Brain, Zap, Users, Target, Sun, Moon, CheckCircle } from 'lucide-react';

// ==========================================
// INTERFACES (reprises de Section 1)
// ==========================================
interface Product {
  id?: number;
  name: string;
  description: string;
  images: string[];
  categories: string[];
  priceCa?: string;
  rating?: number;
  reviewCount?: number;
  aiScore?: number;
  isNew?: boolean;
  isPopular?: boolean;
}

interface UserGameification {
  level: number;
  experience: number;
  badges: Array<{
    id: string;
    name: string;
    description: string;
    unlockedAt: string;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
  }>;
  streak: {
    current: number;
    longest: number;
    lastActivity: string;
  };
  referrals: number;
  totalSpent: number;
  pointsBalance: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
}

// ==========================================
// CONFIGURATION AVANCÉE
// ==========================================
const AI_MODELS = {
  GPT4: {
    name: 'GPT-4 Turbo',
    maxTokens: 8000,
    costPer1k: 0.03,
    strength: ['creativity', 'reasoning', 'conversation']
  },
  CLAUDE: {
    name: 'Claude-3 Sonnet',
    maxTokens: 4000,
    costPer1k: 0.02,
    strength: ['analysis', 'writing', 'safety']
  },
  GEMINI: {
    name: 'Gemini Pro',
    maxTokens: 6000,
    costPer1k: 0.025,
    strength: ['multimodal', 'code', 'reasoning']
  }
};

const THEME_CONFIG = {
  colors: {
    primary: {
      light: '#8B5CF6',
      dark: '#7C3AED'
    },
    secondary: {
      light: '#3B82F6',
      dark: '#2563EB'
    },
    accent: {
      light: '#EC4899',
      dark: '#DB2777'
    }
  },
  animations: {
    duration: {
      fast: 150,
      normal: 300,
      slow: 500
    }
  }
};

// ==========================================
// TRADUCTIONS
// ==========================================
const translations = {
  fr: {
    title: 'Collection CERDIA',
    subtitle: 'Produits Intelligents Propulsés par IA',
    loading: 'Chargement...',
    error: 'Erreur',
    success: 'Succès',
    products: 'Produits',
    categories: 'Catégories',
    search: 'Rechercher',
    filter: 'Filtrer',
    aiRecommendations: 'Recommandations IA',
    personalizedForYou: 'Personnalisé pour vous',
    addToCart: 'Ajouter au panier',
    price: 'Prix',
    configuration: 'Configuration',
    preferences: 'Préférences',
    aiSettings: 'Paramètres IA',
    performance: 'Performance',
    language: 'Langue',
    theme: 'Thème',
    currency: 'Devise',
    darkMode: 'Mode sombre',
    lightMode: 'Mode clair',
    aiActive: 'IA Active',
    userLevel: 'Niveau utilisateur'
  },
  en: {
    title: 'CERDIA Collection',
    subtitle: 'AI-Powered Smart Products',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    products: 'Products',
    categories: 'Categories',
    search: 'Search',
    filter: 'Filter',
    aiRecommendations: 'AI Recommendations',
    personalizedForYou: 'Personalized for you',
    addToCart: 'Add to cart',
    price: 'Price',
    configuration: 'Configuration',
    preferences: 'Preferences',
    aiSettings: 'AI Settings',
    performance: 'Performance',
    language: 'Language',
    theme: 'Theme',
    currency: 'Currency',
    darkMode: 'Dark mode',
    lightMode: 'Light mode',
    aiActive: 'AI Active',
    userLevel: 'User level'
  }
};

// ==========================================
// CONTEXTE GLOBAL
// ==========================================
interface GlobalContextType {
  // Configuration
  language: 'fr' | 'en';
  darkMode: boolean;
  currency: 'CAD' | 'USD';
  
  // Utilisateur
  user: {
    id: string;
    isAuthenticated: boolean;
    isAdmin: boolean;
    preferences: any;
    gamification: UserGameification;
  };
  
  // IA
  aiConfig: {
    model: keyof typeof AI_MODELS;
    temperature: number;
    maxTokens: number;
    enabled: boolean;
    personalizedRecommendations: boolean;
    autoOptimization: boolean;
  };
  
  // UI States
  ui: {
    headerVisible: boolean;
    sidebarOpen: boolean;
    chatbotOpen: boolean;
    notificationsEnabled: boolean;
  };
  
  // Actions
  setLanguage: (lang: 'fr' | 'en') => void;
  setDarkMode: (dark: boolean) => void;
  updateUser: (updates: Partial<GlobalContextType['user']>) => void;
  updateAIConfig: (config: Partial<GlobalContextType['aiConfig']>) => void;
  updateUI: (ui: Partial<GlobalContextType['ui']>) => void;
}

const GlobalContext = createContext<GlobalContextType | null>(null);

// ==========================================
// HOOKS UTILITAIRES
// ==========================================
function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(initialValue);

  useEffect(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        setStoredValue(JSON.parse(item));
      }
    } catch (error) {
      console.error('Erreur localStorage:', error);
    }
  }, [key]);

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
    }
  }, [key, storedValue]);

  return [storedValue, setValue] as const;
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// ==========================================
// PROVIDER GLOBAL
// ==========================================
function GlobalProvider({ children }: { children: React.ReactNode }) {
  // Configuration de base
  const [language, setLanguage] = useLocalStorage<'fr' | 'en'>('cerdia_language', 'fr');
  const [darkMode, setDarkMode] = useLocalStorage<boolean>('cerdia_dark_mode', false);
  const [currency] = useLocalStorage<'CAD' | 'USD'>('cerdia_currency', 'CAD');
  
  // Utilisateur avec valeur par défaut
  const defaultUser = useMemo(() => ({
    id: generateId(),
    isAuthenticated: false,
    isAdmin: false,
    preferences: {},
    gamification: {
      level: 1,
      experience: 0,
      badges: [],
      streak: { current: 0, longest: 0, lastActivity: '' },
      referrals: 0,
      totalSpent: 0,
      pointsBalance: 0,
      tier: 'bronze' as const
    }
  }), []);

  const [user, setUser] = useLocalStorage('cerdia_user', defaultUser);
  
  // Configuration IA
  const defaultAIConfig = useMemo(() => ({
    model: 'GPT4' as keyof typeof AI_MODELS,
    temperature: 0.7,
    maxTokens: 2000,
    enabled: true,
    personalizedRecommendations: true,
    autoOptimization: true
  }), []);

  const [aiConfig, setAIConfig] = useLocalStorage('cerdia_ai_config', defaultAIConfig);
  
  // États UI
  const defaultUI = useMemo(() => ({
    headerVisible: true,
    sidebarOpen: false,
    chatbotOpen: false,
    notificationsEnabled: true
  }), []);

  const [ui, setUI] = useLocalStorage('cerdia_ui', defaultUI);
  
  // Actions
  const updateUser = useCallback((updates: Partial<typeof user>) => {
    setUser(prev => ({ ...prev, ...updates }));
  }, [setUser]);
  
  const updateAIConfig = useCallback((config: Partial<typeof aiConfig>) => {
    setAIConfig(prev => ({ ...prev, ...config }));
  }, [setAIConfig]);

  const updateUI = useCallback((uiUpdates: Partial<typeof ui>) => {
    setUI(prev => ({ ...prev, ...uiUpdates }));
  }, [setUI]);
  
  const contextValue: GlobalContextType = useMemo(() => ({
    language,
    darkMode,
    currency,
    user,
    aiConfig,
    ui,
    setLanguage,
    setDarkMode,
    updateUser,
    updateAIConfig,
    updateUI
  }), [
    language, darkMode, currency, user, aiConfig, ui,
    setLanguage, setDarkMode, updateUser, updateAIConfig, updateUI
  ]);
  
  return (
    <GlobalContext.Provider value={contextValue}>
      {children}
    </GlobalContext.Provider>
  );
}

// ==========================================
// HOOK PRINCIPAL D'ÉTAT
// ==========================================
function useGlobalContext(): GlobalContextType {
  const context = useContext(GlobalContext);
  if (!context) {
    throw new Error('useGlobalContext must be used within GlobalProvider');
  }
  return context;
}

function useAppState() {
  const context = useGlobalContext();
  
  // États locaux
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // États UI
  const [showForm, setShowForm] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const [showAIRecommendations, setShowAIRecommendations] = useState(true);
  
  // États de recherche
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortFilter, setSortFilter] = useState('relevance');
  
  // États de sélection
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [favorites, setFavorites] = useLocalStorage<number[]>('cerdia_favorites', []);
  const [cart, setCart] = useLocalStorage<any[]>('cerdia_cart', []);
  
  // Fonction de traduction
  const t = useCallback((key: keyof typeof translations.fr): string => {
    return translations[context.language][key] || key;
  }, [context.language]);
  
  // Helper pour les favoris
  const favoritesSet = useMemo(() => new Set(favorites), [favorites]);
  
  const toggleFavorite = useCallback((productId: number) => {
    setFavorites(prev => {
      const newFavorites = [...prev];
      const index = newFavorites.indexOf(productId);
      if (index > -1) {
        newFavorites.splice(index, 1);
      } else {
        newFavorites.push(productId);
      }
      return newFavorites;
    });
  }, [setFavorites]);
  
  return {
    // Contexte global
    ...context,
    
    // États
    products, setProducts,
    loading,
    errors,
    
    // UI States
    showForm, setShowForm,
    showAIChat, setShowAIChat,
    showAIRecommendations, setShowAIRecommendations,
    
    // Search & Filter States
    searchTerm, setSearchTerm,
    categoryFilter, setCategoryFilter,
    sortFilter, setSortFilter,
    
    // Selection States
    selectedProduct, setSelectedProduct,
    favorites: favoritesSet,
    toggleFavorite,
    cart, setCart,
    
    // Utility Functions
    t
  };
}

// ==========================================
// COMPOSANT CONFIGURATION
// ==========================================
function ConfigurationPanel() {
  const { language, darkMode, aiConfig, updateAIConfig, setLanguage, setDarkMode, t } = useAppState();
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
      <h3 className={`text-lg font-bold mb-4 flex items-center ${darkMode ? 'text-white' : 'text-gray-900'}`}>
        <Settings className="w-5 h-5 mr-2" />
        {t('configuration')}
      </h3>

      <div className="space-y-4">
        
        {/* Langue */}
        <div>
          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            {t('language')}
          </label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as 'fr' | 'en')}
            className={`w-full p-2 rounded border ${
              darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
            }`}
          >
            <option value="fr">🇫🇷 Français</option>
            <option value="en">🇬🇧 English</option>
          </select>
        </div>

        {/* Thème */}
        <div>
          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            {t('theme')}
          </label>
          <div className="flex space-x-2">
            <button
              onClick={() => setDarkMode(false)}
              className={`flex-1 p-2 rounded text-sm font-medium transition-all flex items-center justify-center space-x-2 ${
                !darkMode 
                  ? 'bg-blue-500 text-white' 
                  : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <Sun className="w-4 h-4" />
              <span>{t('lightMode')}</span>
            </button>
            <button
              onClick={() => setDarkMode(true)}
              className={`flex-1 p-2 rounded text-sm font-medium transition-all flex items-center justify-center space-x-2 ${
                darkMode 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <Moon className="w-4 h-4" />
              <span>{t('darkMode')}</span>
            </button>
          </div>
        </div>

        {/* Configuration IA */}
        <div>
          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            {t('aiSettings')}
          </label>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>IA Activée</span>
              <button
                onClick={() => updateAIConfig({ enabled: !aiConfig.enabled })}
                className={`w-12 h-6 rounded-full transition-colors relative ${
                  aiConfig.enabled ? 'bg-green-500' : 'bg-gray-300'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-transform absolute top-0.5 ${
                  aiConfig.enabled ? 'translate-x-6' : 'translate-x-0.5'
                }`}></div>
              </button>
            </div>
            
            <div className="flex items-center justify-between">
              <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Recommandations</span>
              <button
                onClick={() => updateAIConfig({ personalizedRecommendations: !aiConfig.personalizedRecommendations })}
                className={`w-12 h-6 rounded-full transition-colors relative ${
                  aiConfig.personalizedRecommendations ? 'bg-green-500' : 'bg-gray-300'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-transform absolute top-0.5 ${
                  aiConfig.personalizedRecommendations ? 'translate-x-6' : 'translate-x-0.5'
                }`}></div>
              </button>
            </div>
          </div>
        </div>

        {/* Configuration avancée */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`w-full text-left text-sm font-medium ${darkMode ? 'text-blue-400' : 'text-blue-600'} hover:underline`}
        >
          {showAdvanced ? '▼' : '▶'} Configuration avancée
        </button>

        {showAdvanced && (
          <div className="space-y-3 pt-2 border-t border-gray-200">
            <div>
              <label className={`block text-xs font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Modèle IA: {AI_MODELS[aiConfig.model].name}
              </label>
              <select
                value={aiConfig.model}
                onChange={(e) => updateAIConfig({ model: e.target.value as keyof typeof AI_MODELS })}
                className={`w-full p-2 rounded border text-sm ${
                  darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                }`}
              >
                {Object.entries(AI_MODELS).map(([key, model]) => (
                  <option key={key} value={key}>{model.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className={`block text-xs font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Température: {aiConfig.temperature}
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={aiConfig.temperature}
                onChange={(e) => updateAIConfig({ temperature: parseFloat(e.target.value) })}
                className="w-full"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ==========================================
// COMPOSANT PRINCIPAL - SECTION 2
// ==========================================
function CerdiaSection2Demo() {
  const appState = useAppState();
  const { darkMode, language, t, user, aiConfig, ui } = appState;

  return (
    <div className={`min-h-screen p-4 transition-colors ${
      darkMode ? 'bg-gray-900' : 'bg-gray-50'
    }`}>
      <div className="max-w-6xl mx-auto">
        
        <h1 className="text-3xl font-bold text-center mb-4 bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent">
          ⚙️ CERDIA Platform - Section 2
        </h1>
        <p className={`text-center text-lg ${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-8`}>
          Configuration Avancée & État Global
        </p>
        
        <div className="grid lg:grid-cols-3 gap-6">
          
          {/* Configuration */}
          <div className="lg:col-span-1">
            <ConfigurationPanel />
          </div>

          {/* États et données */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Contexte Global */}
            <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
              <h3 className={`text-lg font-bold mb-3 flex items-center ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                <Globe className="w-5 h-5 mr-2 text-green-500" />
                🌍 Contexte Global
              </h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-medium mb-2 text-green-600">Configuration</h4>
                  <ul className="space-y-1">
                    <li>📱 Langue: {language === 'fr' ? 'Français' : 'English'}</li>
                    <li>🎨 Thème: {darkMode ? 'Sombre' : 'Clair'}</li>
                    <li>💰 Devise: CAD</li>
                    <li>🤖 IA: {aiConfig.enabled ? 'Activée' : 'Désactivée'}</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2 text-blue-600">États UI</h4>
                  <ul className="space-y-1">
                    <li>📱 Header: {ui.headerVisible ? 'Visible' : 'Caché'}</li>
                    <li>💬 Chat: {ui.chatbotOpen ? 'Ouvert' : 'Fermé'}</li>
                    <li>🔔 Notifs: {ui.notificationsEnabled ? 'On' : 'Off'}</li>
                    <li>📊 Sidebar: {ui.sidebarOpen ? 'Ouvert' : 'Fermé'}</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Gestionnaire d'état */}
            <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
              <h3 className={`text-lg font-bold mb-3 flex items-center ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                <Brain className="w-5 h-5 mr-2 text-purple-500" />
                🧠 useAppState Hook
              </h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <h4 className="font-medium mb-2 text-purple-600">Produits</h4>
                  <div className="text-sm space-y-1">
                    <div>📦 Total: {appState.products.length}</div>
                    <div>❤️ Favoris: {appState.favorites.size}</div>
                    <div>🛒 Panier: {appState.cart.length}</div>
                    <div>🔍 Recherche: {appState.searchTerm || 'Aucune'}</div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2 text-blue-600">Filtres</h4>
                  <div className="text-sm space-y-1">
                    <div>📂 Catégorie: {appState.categoryFilter || 'Toutes'}</div>
                    <div>⚡ Tri: {appState.sortFilter}</div>
                    <div>🎯 Sélection: {appState.selectedProduct?.name || 'Aucune'}</div>
                    <div>🌐 Traduction: {t('success')}</div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2 text-green-600">États</h4>
                  <div className="text-sm space-y-1">
                    <div>📝 Formulaire: {appState.showForm ? 'Visible' : 'Caché'}</div>
                    <div>🤖 Chat IA: {appState.showAIChat ? 'Ouvert' : 'Fermé'}</div>
                    <div>🎯 Recommandations: {appState.showAIRecommendations ? 'On' : 'Off'}</div>
                    <div>👤 Utilisateur: Niveau {user.gamification.level}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Gamification utilisateur */}
            <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
              <h3 className={`text-lg font-bold mb-3 flex items-center ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                <Users className="w-5 h-5 mr-2 text-orange-500" />
                🏆 {t('userLevel')} & Gamification
              </h3>
              <div className="grid md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{user.gamification.level}</div>
                  <div className="text-xs text-gray-600">Niveau</div>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{user.gamification.experience}</div>
                  <div className="text-xs text-gray-600">XP</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{user.gamification.pointsBalance}</div>
                  <div className="text-xs text-gray-600">Points</div>
                </div>
                <div className="text-center p-3 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600 capitalize">{user.gamification.tier}</div>
                  <div className="text-xs text-gray-600">Tier</div>
                </div>
              </div>
            </div>

            {/* Test des traductions */}
            <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
              <h3 className={`text-lg font-bold mb-3 flex items-center ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                <Target className="w-5 h-5 mr-2 text-red-500" />
                🌍 Test des Traductions
              </h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-medium mb-2 text-red-600">Mots-clés Interface</h4>
                  <ul className="space-y-1">
                    <li>• {t('title')}</li>
                    <li>• {t('products')}</li>
                    <li>• {t('search')}</li>
                    <li>• {t('addToCart')}</li>
                    <li>• {t('aiRecommendations')}</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2 text-teal-600">Configuration</h4>
                  <ul className="space-y-1">
                    <li>• {t('configuration')}</li>
                    <li>• {t('preferences')}</li>
                    <li>• {t('language')}</li>
                    <li>• {t('theme')}</li>
                    <li>• {t('aiSettings')}</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="text-center mt-8 bg-green-100 border border-green-300 rounded-lg p-6">
          <div className="text-4xl mb-3">🎉</div>
          <h3 className="text-2xl font-bold text-green-800 mb-2">
            Section 2 Complétée !
          </h3>
          <p className="text-green-600 mb-4">
            Configuration avancée, contexte global et gestionnaire d'état prêts pour la Section 3
          </p>
          <div className="flex justify-center">
            <div className="bg-green-500 text-white px-6 py-2 rounded-lg font-medium">
              ✅ Prêt pour Section 3
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// COMPOSANT PRINCIPAL AVEC PROVIDER
// ==========================================
export default function EcommercePage() {
  return (
    <GlobalProvider>
      <CerdiaSection2Demo />
    </GlobalProvider>
  );
}
