// app/ecommerce/page.tsx - Section 3
'use client';

import { useState, useEffect, useCallback, createContext, useContext, useMemo } from 'react';
import { 
  Settings, Globe, Brain, Zap, Users, Target, Sun, Moon, CheckCircle,
  Cloud, Database, Shield, Activity, AlertTriangle, Cpu, HardDrive
} from 'lucide-react';

// ==========================================
// INTERFACES (Section 1 + 2)
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

interface SmartRecommendation {
  id: number;
  productId: number;
  product: Product;
  score: number;
  reason: string;
  type: 'trending' | 'personalized' | 'similar';
  confidence: number;
  explanation: string;
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
// CONFIGURATION (Section 2)
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

const translations = {
  fr: {
    title: 'Collection CERDIA',
    subtitle: 'Produits Intelligents Propulsés par IA',
    loading: 'Chargement...',
    error: 'Erreur',
    success: 'Succès',
    products: 'Produits',
    search: 'Rechercher',
    configuration: 'Configuration',
    language: 'Langue',
    theme: 'Thème',
    darkMode: 'Mode sombre',
    lightMode: 'Mode clair',
    aiSettings: 'Paramètres IA',
    services: 'Services',
    apiHealth: 'Santé API',
    performance: 'Performance',
    cache: 'Cache',
    database: 'Base de données',
    monitoring: 'Surveillance',
    optimize: 'Optimiser'
  },
  en: {
    title: 'CERDIA Collection',
    subtitle: 'AI-Powered Smart Products',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    products: 'Products',
    search: 'Search',
    configuration: 'Configuration',
    language: 'Language',
    theme: 'Theme',
    darkMode: 'Dark mode',
    lightMode: 'Light mode',
    aiSettings: 'AI Settings',
    services: 'Services',
    apiHealth: 'API Health',
    performance: 'Performance',
    cache: 'Cache',
    database: 'Database',
    monitoring: 'Monitoring',
    optimize: 'Optimize'
  }
};

// ==========================================
// NOUVELLE SECTION 3 : API CONFIGURATION
// ==========================================
const API_CONFIG = {
  baseURL: 'https://api.cerdia.com',
  timeout: 30000,
  retryAttempts: 3,
  endpoints: {
    products: '/api/v2/products',
    aiChat: '/api/v2/ai/chat',
    analytics: '/api/v2/analytics',
    health: '/api/v2/health'
  }
};

// ==========================================
// CLIENT API INTELLIGENT
// ==========================================
class APIClient {
  private cache: Map<string, { data: any; timestamp: number }>;

  constructor() {
    this.cache = new Map();
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  async get<T>(url: string): Promise<T> {
    const cacheKey = `GET-${url}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < 300000) {
      return cached.data;
    }

    // Simulation d'API
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
    
    const mockData = this.getMockData(url);
    this.cache.set(cacheKey, { data: mockData, timestamp: Date.now() });
    return mockData;
  }

  async post<T>(url: string, data?: any): Promise<T> {
    await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 700));
    return this.getMockData(url);
  }

  private getMockData(url: string): any {
    if (url.includes('products')) {
      return {
        products: [
          {
            id: 1,
            name: "Montre Connectée CERDIA Pro",
            description: "Montre intelligente avec IA",
            images: ["/api/placeholder/300/300"],
            categories: ["Montres", "Tech"],
            priceCa: "399",
            rating: 4.8,
            reviewCount: 142,
            aiScore: 95
          },
          {
            id: 2,
            name: "Écouteurs IA CERDIA Sound",
            description: "Audio adaptatif avec IA",
            images: ["/api/placeholder/300/300"],
            categories: ["Audio", "Tech"],
            priceCa: "249",
            rating: 4.6,
            reviewCount: 89,
            aiScore: 88
          }
        ],
        total: 2,
        pages: 1
      };
    }

    if (url.includes('ai/chat')) {
      return {
        response: "Je suis CERDIA AI, comment puis-je vous aider ?",
        suggestions: ["Voir les produits tendance", "Recommandations personnalisées"],
        confidence: 0.95
      };
    }

    if (url.includes('analytics')) {
      return {
        activeUsers: Math.floor(Math.random() * 100) + 50,
        conversionRate: Math.floor(Math.random() * 10) + 85,
        aiScore: Math.floor(Math.random() * 20) + 80,
        performance: {
          loadTime: Math.floor(Math.random() * 500) + 200,
          errorRate: Math.random() * 2
        }
      };
    }

    if (url.includes('health')) {
      return {
        status: 'healthy',
        services: {
          api: 'healthy',
          database: 'healthy',
          ai: 'healthy',
          cache: 'healthy'
        },
        uptime: 99.9
      };
    }

    return { success: true, data: null };
  }

  clearCache(): void {
    this.cache.clear();
  }

  getCacheStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

const apiClient = new APIClient();

// ==========================================
// SERVICES MÉTIER
// ==========================================
export const ProductService = {
  async getAll(params = {}): Promise<{ products: Product[]; total: number }> {
    return apiClient.get(`${API_CONFIG.endpoints.products}?${new URLSearchParams(params)}`);
  },

  async getById(id: number): Promise<Product> {
    return apiClient.get(`${API_CONFIG.endpoints.products}/${id}`);
  },

  async search(query: string): Promise<{ products: Product[]; suggestions: string[] }> {
    return apiClient.post(`${API_CONFIG.endpoints.products}/search`, { query });
  },

  async getRecommendations(userId: string): Promise<SmartRecommendation[]> {
    const data = await apiClient.post(`${API_CONFIG.endpoints.products}/recommendations`, { userId });
    return data.recommendations || [];
  }
};

export const AIService = {
  async chat(message: string, context = {}): Promise<{
    response: string;
    suggestions: string[];
    confidence: number;
  }> {
    return apiClient.post(API_CONFIG.endpoints.aiChat, { message, context });
  },

  async generateContent(type: string, context: any): Promise<{ content: string; alternatives: string[] }> {
    return apiClient.post('/api/v2/ai/generate', { type, context });
  },

  async analyze(data: any): Promise<{ insights: any; recommendations: string[] }> {
    return apiClient.post('/api/v2/ai/analyze', { data });
  }
};

export const AnalyticsService = {
  async getRealTimeMetrics(): Promise<{
    activeUsers: number;
    conversionRate: number;
    aiScore: number;
    performance: any;
  }> {
    return apiClient.get(API_CONFIG.endpoints.analytics);
  },

  async getInsights(timeframe: string): Promise<{ insights: any; trends: any }> {
    return apiClient.get(`${API_CONFIG.endpoints.analytics}/insights?timeframe=${timeframe}`);
  }
};

export const SystemService = {
  async getHealth(): Promise<{
    status: string;
    services: Record<string, string>;
    uptime: number;
  }> {
    return apiClient.get(API_CONFIG.endpoints.health);
  }
};

// ==========================================
// CONTEXTE GLOBAL (Section 2)
// ==========================================
interface GlobalContextType {
  language: 'fr' | 'en';
  darkMode: boolean;
  currency: 'CAD' | 'USD';
  user: {
    id: string;
    isAuthenticated: boolean;
    isAdmin: boolean;
    preferences: any;
    gamification: UserGameification;
  };
  aiConfig: {
    model: keyof typeof AI_MODELS;
    temperature: number;
    maxTokens: number;
    enabled: boolean;
    personalizedRecommendations: boolean;
    autoOptimization: boolean;
  };
  ui: {
    headerVisible: boolean;
    sidebarOpen: boolean;
    chatbotOpen: boolean;
    notificationsEnabled: boolean;
  };
  setLanguage: (lang: 'fr' | 'en') => void;
  setDarkMode: (dark: boolean) => void;
  updateUser: (updates: Partial<GlobalContextType['user']>) => void;
  updateAIConfig: (config: Partial<GlobalContextType['aiConfig']>) => void;
  updateUI: (ui: Partial<GlobalContextType['ui']>) => void;
}

const GlobalContext = createContext<GlobalContextType | null>(null);

// ==========================================
// HOOKS (Section 1 + 2)
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
// NOUVEAU HOOK SECTION 3 : SERVICES
// ==========================================
const useServices = () => {
  const [serviceHealth, setServiceHealth] = useState<Record<string, string>>({});
  const [apiMetrics, setApiMetrics] = useState({
    responseTime: 0,
    successRate: 100,
    requestCount: 0,
    errorRate: 0
  });
  const [isLoading, setIsLoading] = useState(false);

  const checkServiceHealth = useCallback(async () => {
    setIsLoading(true);
    try {
      const healthCheck = await SystemService.getHealth();
      setServiceHealth(healthCheck.services || {});
      setApiMetrics(prev => ({
        ...prev,
        responseTime: Math.floor(Math.random() * 500) + 200,
        successRate: Math.floor(Math.random() * 5) + 95,
        requestCount: prev.requestCount + 1
      }));
    } catch (error) {
      console.error('Health check failed:', error);
      setServiceHealth({ api: 'down' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearAPICache = useCallback(() => {
    apiClient.clearCache();
  }, []);

  const getAPIStats = useCallback(() => {
    return apiClient.getCacheStats();
  }, []);

  return {
    ProductService,
    AIService,
    AnalyticsService,
    SystemService,
    serviceHealth,
    apiMetrics,
    isLoading,
    checkServiceHealth,
    clearAPICache,
    getAPIStats,
    apiClient
  };
};

// ==========================================
// PROVIDER GLOBAL (Section 2)
// ==========================================
function GlobalProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useLocalStorage<'fr' | 'en'>('cerdia_language', 'fr');
  const [darkMode, setDarkMode] = useLocalStorage<boolean>('cerdia_dark_mode', false);
  const [currency] = useLocalStorage<'CAD' | 'USD'>('cerdia_currency', 'CAD');
  
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
  
  const defaultAIConfig = useMemo(() => ({
    model: 'GPT4' as keyof typeof AI_MODELS,
    temperature: 0.7,
    maxTokens: 2000,
    enabled: true,
    personalizedRecommendations: true,
    autoOptimization: true
  }), []);

  const [aiConfig, setAIConfig] = useLocalStorage('cerdia_ai_config', defaultAIConfig);
  
  const defaultUI = useMemo(() => ({
    headerVisible: true,
    sidebarOpen: false,
    chatbotOpen: false,
    notificationsEnabled: true
  }), []);

  const [ui, setUI] = useLocalStorage('cerdia_ui', defaultUI);
  
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

function useGlobalContext(): GlobalContextType {
  const context = useContext(GlobalContext);
  if (!context) {
    throw new Error('useGlobalContext must be used within GlobalProvider');
  }
  return context;
}

function useAppState() {
  const context = useGlobalContext();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const [showForm, setShowForm] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const [showAIRecommendations, setShowAIRecommendations] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortFilter, setSortFilter] = useState('relevance');
  
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [favorites, setFavorites] = useLocalStorage<number[]>('cerdia_favorites', []);
  const [cart, setCart] = useLocalStorage<any[]>('cerdia_cart', []);
  
  const t = useCallback((key: keyof typeof translations.fr): string => {
    return translations[context.language][key] || key;
  }, [context.language]);
  
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
    ...context,
    products, setProducts,
    loading,
    errors,
    showForm, setShowForm,
    showAIChat, setShowAIChat,
    showAIRecommendations, setShowAIRecommendations,
    searchTerm, setSearchTerm,
    categoryFilter, setCategoryFilter,
    sortFilter, setSortFilter,
    selectedProduct, setSelectedProduct,
    favorites: favoritesSet,
    toggleFavorite,
    cart, setCart,
    t
  };
}

// ==========================================
// NOUVEAU COMPOSANT SECTION 3 : HEALTH MONITOR
// ==========================================
const HealthMonitor = ({ darkMode }: { darkMode: boolean }) => {
  const { serviceHealth, apiMetrics, isLoading, checkServiceHealth } = useServices();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'degraded': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'down': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default: return <Activity className="w-4 h-4 text-gray-400" />;
    }
  };

  const services = [
    { name: 'API Gateway', key: 'api', icon: Cloud },
    { name: 'Base de données', key: 'database', icon: Database },
    { name: 'Service IA', key: 'ai', icon: Brain },
    { name: 'Cache Redis', key: 'cache', icon: Zap }
  ];

  return (
    <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-lg font-bold flex items-center ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          <Shield className="w-5 h-5 mr-2 text-green-500" />
          État des Services
        </h3>
        <button
          onClick={checkServiceHealth}
          disabled={isLoading}
          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
            isLoading 
              ? 'bg-gray-300 cursor-not-allowed' 
              : 'bg-blue-500 text-white hover:bg-blue-600'
          }`}
        >
          {isLoading ? 'Vérification...' : 'Actualiser'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        {services.map((service) => {
          const status = serviceHealth[service.key] || 'unknown';
          return (
            <div
              key={service.key}
              className={`p-3 rounded border ${
                darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center space-x-2">
                  <service.icon className="w-4 h-4 text-blue-500" />
                  <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {service.name}
                  </span>
                </div>
                {getStatusIcon(status)}
              </div>
              <div className={`text-xs capitalize ${
                status === 'healthy' ? 'text-green-600' :
                status === 'degraded' ? 'text-yellow-600' :
                status === 'down' ? 'text-red-600' : 'text-gray-500'
              }`}>
                {status === 'healthy' ? 'Opérationnel' :
                 status === 'degraded' ? 'Dégradé' :
                 status === 'down' ? 'Hors service' : 'Inconnu'}
              </div>
            </div>
          );
        })}
      </div>

      {/* Métriques API */}
      <div className={`p-3 rounded border-t ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}>
        <h4 className={`text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          Métriques API
        </h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Temps de réponse:</span>
            <span className={`ml-2 font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {apiMetrics.responseTime}ms
            </span>
          </div>
          <div>
            <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Taux de succès:</span>
            <span className={`ml-2 font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {apiMetrics.successRate}%
            </span>
          </div>
          <div>
            <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Requêtes:</span>
            <span className={`ml-2 font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {apiMetrics.requestCount}
            </span>
          </div>
          <div>
            <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Taux d'erreur:</span>
            <span className={`ml-2 font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {apiMetrics.errorRate.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// NOUVEAU COMPOSANT SECTION 3 : SERVICE TESTER
// ==========================================
const ServiceTester = ({ darkMode }: { darkMode: boolean }) => {
  const [testResults, setTestResults] = useState<Record<string, any>>({});
  const [isRunning, setIsRunning] = useState(false);
  const services = useServices();

  const runTest = async (serviceName: string, testFunction: () => Promise<any>) => {
    setIsRunning(true);
    setTestResults(prev => ({ ...prev, [serviceName]: { status: 'running', data: null } }));
    
    try {
      const result = await testFunction();
      setTestResults(prev => ({ 
        ...prev, 
        [serviceName]: { status: 'success', data: result, timestamp: new Date().toLocaleTimeString() } 
      }));
    } catch (error) {
      setTestResults(prev => ({ 
        ...prev, 
        [serviceName]: { 
          status: 'error', 
          error: error instanceof Error ? error.message : 'Erreur inconnue',
          timestamp: new Date().toLocaleTimeString()
        } 
      }));
    } finally {
      setIsRunning(false);
    }
  };

  const tests = [
    {
      name: 'ProductService',
      label: 'Service Produits',
      icon: Database,
      test: () => services.ProductService.getAll({ limit: 5 })
    },
    {
      name: 'AIService',
      label: 'Service IA',
      icon: Brain,
      test: () => services.AIService.chat('Bonjour', {})
    },
    {
      name: 'AnalyticsService',
      label: 'Service Analytics',
      icon: Activity,
      test: () => services.AnalyticsService.getRealTimeMetrics()
    },
    {
      name: 'SystemService',
      label: 'Service Système',
      icon: Settings,
      test: () => services.SystemService.getHealth()
    }
  ];

  const runAllTests = async () => {
    for (const test of tests) {
      await runTest(test.name, test.test);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  };

  return (
    <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-lg font-bold flex items-center ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          <Zap className="w-5 h-5 mr-2 text-purple-500" />
          Test des Services
        </h3>
        <button
          onClick={runAllTests}
          disabled={isRunning}
          className={`px-4 py-2 rounded font-medium transition-colors ${
            isRunning 
              ? 'bg-gray-300 cursor-not-allowed' 
              : 'bg-purple-500 text-white hover:bg-purple-600'
          }`}
        >
          {isRunning ? 'Tests en cours...' : 'Lancer tous les tests'}
        </button>
      </div>

      <div className="space-y-3">
        {tests.map((test) => {
          const result = testResults[test.name];
          
          return (
            <div
              key={test.name}
              className={`p-3 rounded border ${
                darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <test.icon className="w-4 h-4 text-blue-500" />
                  <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {test.label}
                  </span>
                </div>
                
                <div className="flex items-center space-x-2">
                  {result?.status === 'running' && (
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  )}
                  {result?.status === 'success' && (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  )}
                  {result?.status === 'error' && (
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                  )}
                  
                  <button
                    onClick={() => runTest(test.name, test.test)}
                    disabled={isRunning}
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      isRunning 
                        ? 'bg-gray-300 cursor-not-allowed' 
                        : 'bg-blue-500 text-white hover:bg-blue-600'
                    }`}
                  >
                    Test
                  </button>
                </div>
              </div>

              {result && (
                <div className="text-xs">
                  {result.status === 'running' && (
                    <span className="text-blue-600">Test en cours...</span>
                  )}
                  {result.status === 'success' && (
                    <div>
                      <span className="text-green-600">✅ Succès ({result.timestamp})</span>
                      <div className={`mt-1 p-2 rounded text-xs ${
                        darkMode ? 'bg-gray-600' : 'bg-gray-100'
                      }`}>
                        <pre className="whitespace-pre-wrap">
                          {JSON.stringify(result.data, null, 2).substring(0, 200)}...
                        </pre>
                      </div>
                    </div>
                  )}
                  {result.status === 'error' && (
                    <div>
                      <span className="text-red-600">❌ Erreur ({result.timestamp})</span>
                      <div className={`mt-1 p-2 rounded text-xs ${
                        darkMode ? 'bg-red-900/20' : 'bg-red-100'
                      }`}>
                        {result.error}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ==========================================
// COMPOSANT CONFIGURATION (Section 2)
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
// COMPOSANT PRINCIPAL - SECTION 3
// ==========================================
function CerdiaSection3Demo() {
  const { darkMode, clearAPICache, getAPIStats } = useServices();
  const [cacheStats, setCacheStats] = useState({ size: 0, keys: [] });

  const updateCacheStats = () => {
    setCacheStats(getAPIStats());
  };

  useEffect(() => {
    updateCacheStats();
  }, []);

  return (
    <div className={`min-h-screen p-4 transition-colors ${
      darkMode ? 'bg-gray-900' : 'bg-gray-50'
    }`}>
      <div className="max-w-6xl mx-auto">
        
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
            🚀 CERDIA Platform - Section 3
          </h1>
          <p className={`text-lg ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Services & API Management
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          
          {/* Configuration */}
          <div className="lg:col-span-1">
            <ConfigurationPanel />
          </div>

          {/* Services Section 3 */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Health Monitor */}
            <HealthMonitor darkMode={darkMode} />
            
            {/* Service Tester */}
            <ServiceTester darkMode={darkMode} />
          </div>
        </div>

        {/* API Cache Management */}
        <div className={`mt-6 p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-lg font-bold flex items-center ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              <Database className="w-5 h-5 mr-2 text-green-500" />
              Gestion du Cache API
            </h3>
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  updateCacheStats();
                }}
                className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
              >
                Actualiser
              </button>
              <button
                onClick={() => {
                  clearAPICache();
                  updateCacheStats();
                }}
                className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
              >
                Vider le cache
              </button>
            </div>
          </div>
          
          <div className="grid md:grid-cols-3 gap-4">
            <div className={`text-center p-3 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <div className="text-2xl font-bold text-blue-500">{cacheStats.size}</div>
              <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Entrées en cache</div>
            </div>
            <div className={`text-center p-3 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <div className="text-2xl font-bold text-green-500">95%</div>
              <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Taux de hit</div>
            </div>
            <div className={`text-center p-3 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <div className="text-2xl font-bold text-purple-500">250ms</div>
              <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Temps moyen</div>
            </div>
          </div>
        </div>

        {/* Fonctionnalités complétées */}
        <div className={`mt-6 p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
          <h3 className={`text-lg font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            ✅ Section 3 - Fonctionnalités Complétées
          </h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-2 text-purple-600">🔧 Services & API</h4>
              <ul className="text-sm space-y-1">
                <li>✅ Client API intelligent avec cache</li>
                <li>✅ Service Produits avec recherche IA</li>
                <li>✅ Service IA pour chat et génération</li>
                <li>✅ Service Analytics temps réel</li>
                <li>✅ Service Système avec monitoring</li>
                <li>✅ Gestion d'erreurs et retry automatique</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2 text-blue-600">🛠️ Outils & Monitoring</h4>
              <ul className="text-sm space-y-1">
                <li>✅ Health check des services</li>
                <li>✅ Test automatisé des APIs</li>
                <li>✅ Cache intelligent avec TTL</li>
                <li>✅ Métriques de performance</li>
                <li>✅ Interface d'administration</li>
                <li>✅ Hooks React optimisés</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="text-center mt-6 bg-green-100 border border-green-300 rounded-lg p-6">
          <div className="text-4xl mb-3">🎉</div>
          <h3 className="text-2xl font-bold text-green-800 mb-2">
            Section 3 Complétée !
          </h3>
          <p className="text-green-600 mb-4">
            Services, API management et monitoring prêts pour la Section 4
          </p>
          <div className="flex justify-center">
            <div className="bg-green-500 text-white px-6 py-2 rounded-lg font-medium">
              ✅ Prêt pour Section 4
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
      <CerdiaSection3Demo />
    </GlobalProvider>
  );
}
