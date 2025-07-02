// app/ecommerce/page.tsx - Sections 1-4 Assemblées
'use client';

import { useState, useEffect, useCallback, createContext, useContext, useMemo } from 'react';
import { 
  Settings, Globe, Brain, Zap, Users, Target, Sun, Moon, 
  CheckCircle, Cloud, Database, Shield, Activity, AlertTriangle, 
  Cpu, HardDrive, Network, BarChart3, TrendingUp, Eye, Heart,
  Send, Bot, MessageSquare, RefreshCw, Filter, Sparkles,
  ChevronRight, Star, Clock, ThumbsUp, ThumbsDown
} from 'lucide-react';
// ==========================================
// SECTION 1 : TYPES, INTERFACES & UTILITAIRES
// ==========================================

// Types de base
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

// Utilitaires de base
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function debounce<T extends (...args: any[]) => void>(func: T, delay: number): T {
  let timeoutId: NodeJS.Timeout;
  return ((...args: any[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(null, args), delay);
  }) as T;
}

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

// Fonctions utilitaires
const utils = {
  formatPrice: (price: number, currency = 'CAD') => {
    return new Intl.NumberFormat('fr-CA', {
      style: 'currency',
      currency
    }).format(price);
  },
  
  formatDate: (date: Date) => {
    return new Intl.DateTimeFormat('fr-CA').format(date);
  },
  
  truncateText: (text: string, maxLength: number) => {
    return text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
  },
  
  calculateDiscount: (originalPrice: number, discountPrice: number) => {
    return Math.round(((originalPrice - discountPrice) / originalPrice) * 100);
  },
  
  randomDelay: (min = 500, max = 2000) => {
    return new Promise(resolve => 
      setTimeout(resolve, Math.floor(Math.random() * (max - min + 1)) + min)
    );
  }
};
// ==========================================
// SECTION 2 : CONFIGURATION & ÉTAT GLOBAL
// ==========================================

// Configuration IA
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

// Traductions
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
    optimize: 'Optimiser',
    'ai.title': 'Intelligence Artificielle',
    'ai.chat': 'Chat IA',
    'ai.recommendations': 'Recommandations',
    'ai.analytics': 'Analytics IA',
    'ai.config': 'Configuration IA',
    'test.ai.services': 'Tester les Services IA'
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
    optimize: 'Optimize',
    'ai.title': 'Artificial Intelligence',
    'ai.chat': 'AI Chat',
    'ai.recommendations': 'Recommendations',
    'ai.analytics': 'AI Analytics',
    'ai.config': 'AI Configuration',
    'test.ai.services': 'Test AI Services'
  }
};

// Interface d'état global
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
    chatEnabled: boolean;
    recommendationsEnabled: boolean;
    analyticsEnabled: boolean;
    autoRefresh: boolean;
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

// Contexte global
const GlobalContext = createContext<GlobalContextType | null>(null);

// Provider global
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
    autoOptimization: true,
    chatEnabled: true,
    recommendationsEnabled: true,
    analyticsEnabled: true,
    autoRefresh: true
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

// Hook pour utiliser le contexte global
function useGlobalContext(): GlobalContextType {
  const context = useContext(GlobalContext);
  if (!context) {
    throw new Error('useGlobalContext must be used within GlobalProvider');
  }
  return context;
}
// ==========================================
// SECTION 3 : SERVICES & API
// ==========================================

// Configuration API
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

// Client API intelligent
class APIClient {
  private cache: Map<string, { data: any; timestamp: number }>;

  constructor() {
    this.cache = new Map();
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

// Services métier
const ProductService = {
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
    const data: any = await apiClient.post(`${API_CONFIG.endpoints.products}/recommendations`, { userId });
    return data.recommendations || [];
  }
};

const AIService = {
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

const AnalyticsService = {
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

const SystemService = {
  async getHealth(): Promise<{
    status: string;
    services: Record<string, string>;
    uptime: number;
  }> {
    return apiClient.get(API_CONFIG.endpoints.health);
  }
};

// Hook pour les services
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
// SECTION 4 : TYPES & SERVICES IA
// ==========================================

// Types IA spécialisés
interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  type: 'text' | 'suggestion' | 'action';
  metadata?: {
    confidence?: number;
    source?: string;
    actions?: ChatAction[];
  };
}

interface ChatAction {
  id: string;
  label: string;
  type: 'search' | 'recommend' | 'filter' | 'navigate';
  data?: any;
}

interface AIRecommendation {
  id: string;
  productId: number;
  title: string;
  description: string;
  confidence: number;
  type: 'personal' | 'trending' | 'similar';
  reason: string;
  price: number;
  image: string;
  rating: number;
  tags: string[];
}

interface AIAnalytics {
  engagement: {
    chatSessions: number;
    avgSessionTime: number;
    satisfaction: number;
    responseTime: number;
  };
  recommendations: {
    generated: number;
    clicked: number;
    converted: number;
    accuracy: number;
  };
  userBehavior: {
    activeUsers: number;
    searchQueries: number;
    pageViews: number;
    bounceRate: number;
  };
  performance: {
    aiLatency: number;
    cacheHitRate: number;
    errorRate: number;
    uptime: number;
  };
}

// Services IA spécialisés
class AIChatService {
  private conversations = new Map<string, ChatMessage[]>();
  
  async sendMessage(conversationId: string, message: string): Promise<ChatMessage> {
    // Simulation de traitement IA
    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1200));
    
    const suggestions = [
      "Rechercher des produits similaires",
      "Voir les recommandations personnalisées", 
      "Filtrer par prix",
      "Comparer avec d'autres marques"
    ];
    
    const responses = [
      `Je comprends que vous cherchez "${message}". Voici mes suggestions basées sur votre profil.`,
      `Excellent choix ! Basé sur vos préférences, je recommande ces options.`,
      `Laissez-moi analyser vos besoins et vous proposer les meilleures options.`,
      `D'après votre historique, ces produits pourraient vous intéresser.`
    ];
    
    const aiMessage: ChatMessage = {
      id: Date.now().toString(),
      content: responses[Math.floor(Math.random() * responses.length)],
      sender: 'ai',
      timestamp: new Date(),
      type: 'text',
      metadata: {
        confidence: 0.8 + Math.random() * 0.2,
        source: 'ai-engine-v2',
        actions: suggestions.slice(0, 2).map((label, i) => ({
          id: `action_${i}`,
          label,
          type: ['search', 'recommend'][i] as 'search' | 'recommend',
          data: { query: message }
        }))
      }
    };
    
    if (!this.conversations.has(conversationId)) {
      this.conversations.set(conversationId, []);
    }
    
    this.conversations.get(conversationId)!.push(aiMessage);
    return aiMessage;
  }
  
  getSuggestions(): string[] {
    return [
      "Trouvez-moi des produits éco-responsables",
      "Quelles sont les tendances actuelles ?",
      "Recommandez-moi selon mon budget",
      "Comparez ces deux produits"
    ];
  }
}

class AIRecommendationService {
  async getPersonalizedRecommendations(userId: string): Promise<AIRecommendation[]> {
    await new Promise(resolve => setTimeout(resolve, 600));
    
    const types: Array<'personal' | 'trending' | 'similar'> = ['personal', 'trending', 'similar'];
    const reasons = [
      "Basé sur vos achats précédents",
      "Produit tendance dans votre catégorie",
      "Similaire à vos favoris",
      "Recommandé par des utilisateurs similaires"
    ];
    
    return Array.from({ length: 8 }, (_, i) => ({
      id: `rec_${i}`,
      productId: 100 + i,
      title: `Produit Recommandé ${i + 1}`,
      description: `Description personnalisée du produit ${i + 1}`,
      confidence: 0.7 + Math.random() * 0.3,
      type: types[i % 3],
      reason: reasons[i % 4],
      price: 29.99 + Math.random() * 200,
      image: `/api/placeholder/300/200?text=Produit${i + 1}`,
      rating: 3.5 + Math.random() * 1.5,
      tags: ['premium', 'bestseller', 'eco-friendly'][Math.floor(Math.random() * 3)] ? ['premium'] : ['bestseller']
    }));
  }
  
  async refreshRecommendations(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

class AIAnalyticsService {
  private analytics: AIAnalytics = {
    engagement: {
      chatSessions: 247,
      avgSessionTime: 4.2,
      satisfaction: 4.6,
      responseTime: 850
    },
    recommendations: {
      generated: 1543,
      clicked: 421,
      converted: 89,
      accuracy: 84.2
    },
    userBehavior: {
      activeUsers: 156,
      searchQueries: 892,
      pageViews: 2341,
      bounceRate: 23.5
    },
    performance: {
      aiLatency: 420,
      cacheHitRate: 94.7,
      errorRate: 0.3,
      uptime: 99.9
    }
  };
  
  async getAnalytics(): Promise<AIAnalytics> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Simulation de données en temps réel
    this.analytics.engagement.chatSessions += Math.floor(Math.random() * 3);
    this.analytics.userBehavior.activeUsers += Math.floor(Math.random() * 5) - 2;
    this.analytics.recommendations.generated += Math.floor(Math.random() * 10);
    
    return { ...this.analytics };
  }
}

// Hooks IA
function useAIServices() {
  const chatService = useMemo(() => new AIChatService(), []);
  const recommendationService = useMemo(() => new AIRecommendationService(), []);
  const analyticsService = useMemo(() => new AIAnalyticsService(), []);
  
  return {
    chatService,
    recommendationService,
    analyticsService
  };
}

function useChat(conversationId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const { chatService } = useAIServices();
  
  const sendMessage = useCallback(async (content: string) => {
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content,
      sender: 'user',
      timestamp: new Date(),
      type: 'text'
    };
    
    setMessages(prev => [...prev, userMessage]);
    setLoading(true);
    
    try {
      const aiResponse = await chatService.sendMessage(conversationId, content);
      setMessages(prev => [...prev, aiResponse]);
    } catch (error) {
      console.error('Erreur chat:', error);
    } finally {
      setLoading(false);
    }
  }, [chatService, conversationId]);
  
  const clearChat = useCallback(() => {
    setMessages([]);
  }, []);
  
  return {
    messages,
    loading,
    sendMessage,
    clearChat,
    suggestions: chatService.getSuggestions()
  };
}
// ==========================================
// COMPOSANT PRINCIPAL ASSEMBLÉ
// ==========================================

function useAppState() {
  const context = useGlobalContext();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [favorites, setFavorites] = useLocalStorage<number[]>('cerdia_favorites', []);
  const [cart, setCart] = useLocalStorage<any[]>('cerdia_cart', []);
  
  const t = useCallback((key: string): string => {
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
    loading, errors,
    selectedProduct, setSelectedProduct,
    favorites: favoritesSet,
    toggleFavorite,
    cart, setCart,
    t
  };
}

function CerdiaDemo() {
  const { darkMode, t } = useAppState();
  const { chatService, recommendationService, analyticsService } = useAIServices();
  const [testResults, setTestResults] = useState<any>({});
  const [testing, setTesting] = useState(false);

  const testAIServices = async () => {
    setTesting(true);
    const results: any = {};
    
    try {
      const chatResponse = await chatService.sendMessage('test', 'Hello AI');
      results.chat = { success: true, response: chatResponse.content.substring(0, 50) + '...' };
    } catch (error) {
      results.chat = { success: false, error: 'Erreur chat' };
    }
    
    setTestResults(results);
    setTesting(false);
  };

  return (
    <div className={`min-h-screen p-6 ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">
          🚀 CERDIA Platform - Sections 1-4 Assemblées
        </h1>
        
        <button
          onClick={testAIServices}
          disabled={testing}
          className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
        >
          {testing ? 'Test en cours...' : 'Tester tout le système'}
        </button>
        
        {Object.keys(testResults).length > 0 && (
          <div className="mt-4 p-4 bg-green-100 rounded-lg">
            <pre>{JSON.stringify(testResults, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <GlobalProvider>
      <CerdiaDemo />
    </GlobalProvider>
  );
}
