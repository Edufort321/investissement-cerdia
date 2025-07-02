// app/ecommerce/page.tsx - Sections 1-4 Assemblées
'use client';

import { useState, useEffect, useCallback, createContext, useContext, useMemo, useRef } from 'react';
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
// HOOK PRINCIPAL useAppState (DOIT ÊTRE AVANT SECTION 5)
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
// ==========================================
// SECTION 5 : DASHBOARD & ANALYTICS VISUELS
// ==========================================

// Composant Dashboard Principal
function AnalyticsDashboard() {
  const { darkMode, t } = useAppState();
  const { analyticsService } = useAIServices();
  const [analytics, setAnalytics] = useState<AIAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const data = await analyticsService.getAnalytics();
      setAnalytics(data);
    } catch (error) {
      console.error('Erreur analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [analyticsService]);

  useEffect(() => {
    loadAnalytics();
    const interval = setInterval(loadAnalytics, 30000); // Refresh toutes les 30s
    return () => clearInterval(interval);
  }, [loadAnalytics, refreshKey]);

  const refresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  if (loading && !analytics) {
    return (
      <div className={`p-6 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-300 rounded w-1/4"></div>
          <div className="grid grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 bg-gray-300 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!analytics) return null;

  const metrics = [
    {
      title: 'Sessions Chat IA',
      value: analytics.engagement.chatSessions,
      change: '+12%',
      positive: true,
      icon: MessageSquare,
      color: 'blue'
    },
    {
      title: 'Utilisateurs Actifs',
      value: analytics.userBehavior.activeUsers,
      change: '+8%',
      positive: true,
      icon: Users,
      color: 'green'
    },
    {
      title: 'Recommandations',
      value: analytics.recommendations.generated,
      change: '+15%',
      positive: true,
      icon: Target,
      color: 'purple'
    },
    {
      title: 'Taux de Conversion',
      value: `${((analytics.recommendations.converted / analytics.recommendations.generated) * 100).toFixed(1)}%`,
      change: '+3%',
      positive: true,
      icon: TrendingUp,
      color: 'orange'
    }
  ];

  const getColorClasses = (color: string) => {
    const colors = {
      blue: 'bg-blue-500 text-blue-500',
      green: 'bg-green-500 text-green-500',
      purple: 'bg-purple-500 text-purple-500',
      orange: 'bg-orange-500 text-orange-500'
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  return (
    <div className="space-y-6">
      {/* Header Dashboard */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center">
            <BarChart3 className="w-6 h-6 mr-3 text-blue-500" />
            Dashboard Analytics IA
          </h2>
          <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Métriques en temps réel - Dernière mise à jour: {new Date().toLocaleTimeString()}
          </p>
        </div>
        
        <button
          onClick={refresh}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center space-x-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Actualiser</span>
        </button>
      </div>

      {/* Métriques Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => {
          const colorClasses = getColorClasses(metric.color);
          const IconComponent = metric.icon;
          
          return (
            <div
              key={index}
              className={`p-6 rounded-xl border transition-all hover:shadow-lg ${
                darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg bg-opacity-10 ${colorClasses.split(' ')[0]}`}>
                  <IconComponent className={`w-6 h-6 ${colorClasses.split(' ')[1]}`} />
                </div>
                <span className={`text-sm font-medium px-2 py-1 rounded-full ${
                  metric.positive 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {metric.change}
                </span>
              </div>
              
              <div>
                <h3 className={`text-sm font-medium mb-1 ${
                  darkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  {metric.title}
                </h3>
                <p className="text-2xl font-bold">
                  {typeof metric.value === 'number' ? metric.value.toLocaleString() : metric.value}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Graphiques & Détails */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Performance IA */}
        <div className={`p-6 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Cpu className="w-5 h-5 mr-2 text-purple-500" />
            Performance IA
          </h3>
          
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Latence IA</span>
                <span>{analytics.performance.aiLatency}ms</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-purple-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min((analytics.performance.aiLatency / 1000) * 100, 100)}%` }}
                ></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Taux de Cache</span>
                <span>{analytics.performance.cacheHitRate.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${analytics.performance.cacheHitRate}%` }}
                ></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Temps de Disponibilité</span>
                <span>{analytics.performance.uptime}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${analytics.performance.uptime}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Engagement Utilisateur */}
        <div className={`p-6 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Heart className="w-5 h-5 mr-2 text-red-500" />
            Engagement Utilisateur
          </h3>
          
          <div className="space-y-4">
            <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Temps de Session Moyen</span>
                <span className="text-lg font-bold text-blue-500">
                  {analytics.engagement.avgSessionTime.toFixed(1)}min
                </span>
              </div>
            </div>
            
            <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Satisfaction</span>
                <div className="flex items-center space-x-2">
                  <span className="text-lg font-bold text-green-500">
                    {analytics.engagement.satisfaction.toFixed(1)}/5
                  </span>
                  <div className="flex space-x-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star 
                        key={i} 
                        className={`w-4 h-4 ${
                          i < Math.floor(analytics.engagement.satisfaction) 
                            ? 'text-yellow-400 fill-current' 
                            : 'text-gray-300'
                        }`} 
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Temps de Réponse IA</span>
                <span className="text-lg font-bold text-purple-500">
                  {analytics.engagement.responseTime}ms
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Activité Temps Réel */}
      <div className={`p-6 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Activity className="w-5 h-5 mr-2 text-green-500" />
          Activité Temps Réel
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-500 mb-2">
              {analytics.userBehavior.searchQueries}
            </div>
            <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Recherches Aujourd'hui
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-3xl font-bold text-green-500 mb-2">
              {analytics.userBehavior.pageViews}
            </div>
            <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Pages Vues
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-500 mb-2">
              {analytics.userBehavior.bounceRate}%
            </div>
            <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Taux de Rebond
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Composant de Monitoring des Services
function ServiceMonitor() {
  const { darkMode } = useAppState();
  const { serviceHealth, apiMetrics, isLoading, checkServiceHealth } = useServices();

  const services = [
    { name: 'API Gateway', key: 'api', icon: Cloud, color: 'blue' },
    { name: 'Base de données', key: 'database', icon: Database, color: 'green' },
    { name: 'Service IA', key: 'ai', icon: Brain, color: 'purple' },
    { name: 'Cache Redis', key: 'cache', icon: Zap, color: 'orange' }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-500 bg-green-100';
      case 'degraded': return 'text-yellow-500 bg-yellow-100';
      case 'down': return 'text-red-500 bg-red-100';
      default: return 'text-gray-500 bg-gray-100';
    }
  };

  return (
    <div className={`p-6 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold flex items-center">
          <Shield className="w-5 h-5 mr-2 text-green-500" />
          Monitoring des Services
        </h3>
        
        <button
          onClick={checkServiceHealth}
          disabled={isLoading}
          className={`px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
            isLoading 
              ? 'bg-gray-300 cursor-not-allowed' 
              : 'bg-blue-500 text-white hover:bg-blue-600'
          }`}
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Vérifier</span>
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {services.map((service) => {
          const status = serviceHealth[service.key] || 'unknown';
          const IconComponent = service.icon;
          
          return (
            <div
              key={service.key}
              className={`p-4 rounded-lg border text-center transition-all hover:shadow-md ${
                darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
              }`}
            >
              <IconComponent className={`w-8 h-8 mx-auto mb-2 text-${service.color}-500`} />
              <h4 className={`font-medium text-sm mb-1 ${
                darkMode ? 'text-white' : 'text-gray-900'
              }`}>
                {service.name}
              </h4>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
                {status === 'healthy' ? 'Opérationnel' :
                 status === 'degraded' ? 'Dégradé' :
                 status === 'down' ? 'Hors service' : 'Inconnu'}
              </span>
            </div>
          );
        })}
      </div>

      {/* Métriques API */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
          <div className="text-lg font-bold text-blue-500">{apiMetrics.responseTime}ms</div>
          <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Temps de réponse
          </div>
        </div>
        
        <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
          <div className="text-lg font-bold text-green-500">{apiMetrics.successRate}%</div>
          <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Taux de succès
          </div>
        </div>
        
        <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
          <div className="text-lg font-bold text-purple-500">{apiMetrics.requestCount}</div>
          <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Requêtes
          </div>
        </div>
        
        <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
          <div className="text-lg font-bold text-orange-500">{apiMetrics.errorRate.toFixed(1)}%</div>
          <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Taux d'erreur
          </div>
        </div>
      </div>
    </div>
  );
}
// ==========================================
// SECTION 6 : CHATBOT IA INTERACTIF & RECOMMANDATIONS
// ==========================================

// Composant Message de Chat
function ChatMessage({ message, onActionClick }: { 
  message: ChatMessage; 
  onActionClick?: (action: ChatAction) => void;
}) {
  const { darkMode } = useAppState();
  const isUser = message.sender === 'user';
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-xs lg:max-w-md xl:max-w-lg ${isUser ? 'order-2' : 'order-1'}`}>
        {/* Avatar */}
        <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-1`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            isUser 
              ? 'bg-blue-500 text-white' 
              : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
          }`}>
            {isUser ? (
              <span className="text-sm font-bold">U</span>
            ) : (
              <Bot className="w-4 h-4" />
            )}
          </div>
        </div>
        
        {/* Bulle de message */}
        <div className={`p-3 rounded-2xl shadow-sm ${
          isUser
            ? 'bg-blue-500 text-white rounded-br-sm'
            : darkMode 
              ? 'bg-gray-700 text-white rounded-bl-sm'
              : 'bg-gray-100 text-gray-900 rounded-bl-sm'
        }`}>
          <p className="text-sm leading-relaxed">{message.content}</p>
          
          {/* Métadonnées IA */}
          {!isUser && message.metadata && (
            <div className={`mt-2 pt-2 border-t ${
              darkMode ? 'border-gray-600' : 'border-gray-200'
            }`}>
              {message.metadata.confidence && (
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-xs opacity-75">Confiance:</span>
                  <div className="flex-1 bg-gray-300 rounded-full h-1">
                    <div 
                      className="bg-green-500 h-1 rounded-full transition-all"
                      style={{ width: `${message.metadata.confidence * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-xs opacity-75">
                    {(message.metadata.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Actions suggérées */}
        {!isUser && message.metadata?.actions && message.metadata.actions.length > 0 && (
          <div className="mt-2 space-y-1">
            {message.metadata.actions.map((action) => (
              <button
                key={action.id}
                onClick={() => onActionClick?.(action)}
                className={`w-full text-left p-2 rounded-lg text-xs border transition-colors ${
                  darkMode
                    ? 'border-gray-600 bg-gray-800 hover:bg-gray-700 text-gray-300'
                    : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <ChevronRight className="w-3 h-3" />
                  <span>{action.label}</span>
                </div>
              </button>
            ))}
          </div>
        )}
        
        {/* Timestamp */}
        <div className={`text-xs mt-1 ${isUser ? 'text-right' : 'text-left'} opacity-50`}>
          {message.timestamp.toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}

// Composant Chatbot Complet
function InteractiveChatbot() {
  const { darkMode, t } = useAppState();
  const [isOpen, setIsOpen] = useState(false);
  const [conversationId] = useState(() => `conv_${Date.now()}`);
  const { messages, loading, sendMessage, clearChat, suggestions } = useChat(conversationId);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll vers le bas
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus sur l'input quand le chat s'ouvre
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSend = async () => {
    if (inputValue.trim() && !loading) {
      await sendMessage(inputValue.trim());
      setInputValue('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
    inputRef.current?.focus();
  };

  const handleActionClick = (action: ChatAction) => {
    setInputValue(action.label);
    // Auto-send l'action
    sendMessage(action.label);
  };

  return (
    <>
      {/* Bouton flottant */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`w-14 h-14 rounded-full shadow-lg transition-all duration-300 flex items-center justify-center ${
            isOpen 
              ? 'bg-red-500 hover:bg-red-600 transform rotate-45' 
              : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:shadow-xl transform hover:scale-110'
          }`}
        >
          {isOpen ? (
            <span className="text-white text-xl font-bold transform -rotate-45">×</span>
          ) : (
            <MessageSquare className="w-6 h-6 text-white" />
          )}
        </button>
        
        {/* Badge de notifications */}
        {!isOpen && messages.length > 0 && (
          <div className="absolute -top-2 -left-2 w-6 h-6 bg-red-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">
            {messages.filter(m => m.sender === 'ai').length}
          </div>
        )}
      </div>

      {/* Fenêtre de chat */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-80 h-96 z-40">
          <div className={`h-full rounded-2xl shadow-2xl border overflow-hidden ${
            darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'
          }`}>
            
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold">CERDIA AI</h3>
                    <p className="text-xs opacity-90">Assistant Intelligent</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={clearChat}
                    className="p-1 hover:bg-white hover:bg-opacity-20 rounded"
                    title="Effacer la conversation"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" title="En ligne" />
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 p-4 overflow-y-auto h-64">
              {messages.length === 0 ? (
                <div className="text-center py-8">
                  <Bot className={`w-12 h-12 mx-auto mb-3 ${
                    darkMode ? 'text-gray-600' : 'text-gray-400'
                  }`} />
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Bonjour ! Je suis votre assistant IA.
                    Comment puis-je vous aider aujourd'hui ?
                  </p>
                  
                  {/* Suggestions initiales */}
                  <div className="mt-4 space-y-2">
                    {suggestions.slice(0, 2).map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className={`w-full p-2 rounded-lg text-xs border transition-colors ${
                          darkMode
                            ? 'border-gray-600 bg-gray-700 hover:bg-gray-600 text-gray-300'
                            : 'border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700'
                        }`}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((message) => (
                    <ChatMessage 
                      key={message.id} 
                      message={message} 
                      onActionClick={handleActionClick}
                    />
                  ))}
                  {loading && (
                    <div className="flex justify-start mb-4">
                      <div className={`p-3 rounded-2xl rounded-bl-sm ${
                        darkMode ? 'bg-gray-700' : 'bg-gray-100'
                      }`}>
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className={`p-4 border-t ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}>
              <div className="flex space-x-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Tapez votre message..."
                  disabled={loading}
                  className={`flex-1 p-2 rounded-lg border text-sm transition-colors ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                />
                <button
                  onClick={handleSend}
                  disabled={!inputValue.trim() || loading}
                  className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              
              {/* Suggestions rapides */}
              {messages.length > 0 && suggestions.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {suggestions.slice(0, 3).map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className={`px-2 py-1 rounded text-xs border transition-colors ${
                        darkMode
                          ? 'border-gray-600 bg-gray-700 hover:bg-gray-600 text-gray-300'
                          : 'border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-600'
                      }`}
                    >
                      {suggestion.length > 20 ? suggestion.slice(0, 20) + '...' : suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Composant Recommandations IA
function AIRecommendationsPanel() {
  const { darkMode, t } = useAppState();
  const { recommendationService } = useAIServices();
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'personal' | 'trending' | 'similar'>('all');
  const [refreshing, setRefreshing] = useState(false);

  const loadRecommendations = useCallback(async () => {
    setLoading(true);
    try {
      const recs = await recommendationService.getPersonalizedRecommendations('user123');
      setRecommendations(recs);
    } catch (error) {
      console.error('Erreur recommandations:', error);
    } finally {
      setLoading(false);
    }
  }, [recommendationService]);

  const refreshRecommendations = async () => {
    setRefreshing(true);
    await recommendationService.refreshRecommendations();
    await loadRecommendations();
    setRefreshing(false);
  };

  useEffect(() => {
    loadRecommendations();
  }, [loadRecommendations]);

  const filteredRecommendations = recommendations.filter(rec => 
    activeFilter === 'all' || rec.type === activeFilter
  );

  const filters = [
    { key: 'all', label: 'Toutes', count: recommendations.length },
    { key: 'personal', label: 'Personnalisées', count: recommendations.filter(r => r.type === 'personal').length },
    { key: 'trending', label: 'Tendances', count: recommendations.filter(r => r.type === 'trending').length },
    { key: 'similar', label: 'Similaires', count: recommendations.filter(r => r.type === 'similar').length }
  ];

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'personal': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'trending': return 'bg-green-100 text-green-800 border-green-200';
      case 'similar': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'personal': return <Users className="w-3 h-3" />;
      case 'trending': return <TrendingUp className="w-3 h-3" />;
      case 'similar': return <Target className="w-3 h-3" />;
      default: return <Sparkles className="w-3 h-3" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center">
            <Sparkles className="w-6 h-6 mr-3 text-purple-500" />
            Recommandations IA
          </h2>
          <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Suggestions personnalisées basées sur votre profil et vos préférences
          </p>
        </div>
        
        <button
          onClick={refreshRecommendations}
          disabled={refreshing}
          className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 transition-colors flex items-center space-x-2"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span>{refreshing ? 'Actualisation...' : 'Actualiser'}</span>
        </button>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-2">
        {filters.map((filter) => (
          <button
            key={filter.key}
            onClick={() => setActiveFilter(filter.key as any)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 ${
              activeFilter === filter.key
                ? 'bg-purple-500 text-white'
                : darkMode
                  ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <span>{filter.label}</span>
            <span className={`text-xs px-2 py-1 rounded-full ${
              activeFilter === filter.key
                ? 'bg-purple-600'
                : 'bg-gray-300 text-gray-600'
            }`}>
              {filter.count}
            </span>
          </button>
        ))}
      </div>

      {/* Recommandations */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={`p-4 rounded-xl animate-pulse ${
              darkMode ? 'bg-gray-800' : 'bg-white'
            }`}>
              <div className="h-48 bg-gray-300 rounded-lg mb-4"></div>
              <div className="h-4 bg-gray-300 rounded mb-2"></div>
              <div className="h-3 bg-gray-300 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRecommendations.map((rec) => (
            <div
              key={rec.id}
              className={`p-4 rounded-xl border transition-all hover:shadow-lg group ${
                darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
              }`}
            >
              {/* Image */}
              <div className="relative mb-4">
                <img
                  src={rec.image}
                  alt={rec.title}
                  className="w-full h-48 object-cover rounded-lg"
                />
                
                {/* Badge de type */}
                <div className={`absolute top-2 left-2 px-2 py-1 rounded-full text-xs font-medium border flex items-center space-x-1 ${getTypeColor(rec.type)}`}>
                  {getTypeIcon(rec.type)}
                  <span className="capitalize">{rec.type}</span>
                </div>
                
                {/* Score de confiance */}
                <div className="absolute top-2 right-2 bg-black bg-opacity-75 text-white px-2 py-1 rounded-full text-xs">
                  {(rec.confidence * 100).toFixed(0)}%
                </div>
              </div>
              
              {/* Contenu */}
              <div className="space-y-3">
                <div>
                  <h3 className={`font-semibold line-clamp-2 group-hover:text-purple-600 transition-colors ${
                    darkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    {rec.title}
                  </h3>
                  <p className={`text-sm mt-1 line-clamp-2 ${
                    darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {rec.description}
                  </p>
                </div>
                
                {/* Prix et rating */}
                <div className="flex items-center justify-between">
                  <div className="text-lg font-bold text-purple-600">
                    {rec.price.toLocaleString('fr-CA', {
                      style: 'currency',
                      currency: 'CAD'
                    })}
                  </div>
                  <div className="flex items-center space-x-1">
                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    <span className="text-sm font-medium">{rec.rating.toFixed(1)}</span>
                  </div>
                </div>
                
                {/* Raison */}
                <div className={`p-2 rounded-lg text-xs ${
                  darkMode ? 'bg-gray-700' : 'bg-gray-50'
                }`}>
                  <span className="font-medium">Pourquoi cette recommandation : </span>
                  {rec.reason}
                </div>
                
                {/* Tags */}
                {rec.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {rec.tags.map((tag, index) => (
                      <span
                        key={index}
                        className={`px-2 py-1 rounded-full text-xs ${
                          darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
                
                {/* Actions */}
                <div className="flex space-x-2 pt-2">
                  <button className="flex-1 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-sm font-medium">
                    Voir Détails
                  </button>
                  <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                    <Heart className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Message si aucune recommandation */}
      {!loading && filteredRecommendations.length === 0 && (
        <div className={`text-center py-12 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Aucune recommandation trouvée pour ce filtre.</p>
          <button
            onClick={() => setActiveFilter('all')}
            className="mt-2 text-purple-600 hover:text-purple-800 font-medium"
          >
            Voir toutes les recommandations
          </button>
        </div>
      )}
    </div>
  );
}
// ==========================================
// COMPOSANT PRINCIPAL V6 - SECTIONS 1-6
// ==========================================

function CerdiaDemo() {
  const { darkMode, t, language, setLanguage, setDarkMode } = useAppState();
  const [activeTab, setActiveTab] = useState('dashboard');

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3, description: 'Analytics et métriques en temps réel' },
    { id: 'chatbot', label: 'Chat IA', icon: MessageSquare, description: 'Assistant intelligent interactif' },
    { id: 'recommendations', label: 'Recommandations', icon: Sparkles, description: 'Suggestions IA personnalisées' },
    { id: 'services', label: 'Services', icon: Shield, description: 'Monitoring de la santé des services' },
    { id: 'test', label: 'Tests', icon: Zap, description: 'Tests complets du système' }
  ];

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'
    }`}>
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              🚀 CERDIA Platform
            </h1>
            <p className={`text-lg mt-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Plateforme E-commerce avec Intelligence Artificielle - Sections 1-6
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setLanguage(language === 'fr' ? 'en' : 'fr')}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center space-x-2"
            >
              <Globe className="w-4 h-4" />
              <span>{language.toUpperCase()}</span>
            </button>
            
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-lg transition-colors ${
                darkMode 
                  ? 'bg-gray-700 hover:bg-gray-600 text-yellow-400' 
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              }`}
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-1 mb-8 p-1 bg-gray-200 dark:bg-gray-800 rounded-xl">
          {tabs.map((tab) => {
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center space-x-2 ${
                  activeTab === tab.id
                    ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-lg transform scale-105'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                }`}
                title={tab.description}
              >
                <IconComponent className="w-4 h-4" />
                <span className="hidden sm:inline text-sm">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="transition-all duration-300">
          {activeTab === 'dashboard' && <AnalyticsDashboard />}
          {activeTab === 'chatbot' && (
            <div className="space-y-6">
              <div className={`p-8 rounded-xl text-center ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <MessageSquare className="w-16 h-16 mx-auto mb-4 text-blue-500" />
                <h2 className="text-2xl font-bold mb-2">Assistant IA Interactif</h2>
                <p className={`mb-6 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Votre assistant personnel est disponible via le bouton flottant en bas à droite.
                  Cliquez dessus pour commencer une conversation !
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <Bot className="w-8 h-8 mx-auto mb-2 text-purple-500" />
                    <h3 className="font-semibold mb-1">IA Conversationnelle</h3>
                    <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                      Réponses contextuelles et suggestions intelligentes
                    </p>
                  </div>
                  <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <Zap className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
                    <h3 className="font-semibold mb-1">Actions Rapides</h3>
                    <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                      Boutons d'action automatiques dans les réponses
                    </p>
                  </div>
                  <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                    <Brain className="w-8 h-8 mx-auto mb-2 text-green-500" />
                    <h3 className="font-semibold mb-1">Mémoire Contextuelle</h3>
                    <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                      L'IA se souvient de votre conversation
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          {activeTab === 'recommendations' && <AIRecommendationsPanel />}
          {activeTab === 'services' && <ServiceMonitor />}
          {activeTab === 'test' && <SystemTester />}
        </div>

        {/* Footer Status */}
        <div className={`mt-12 p-4 rounded-lg border-t-4 border-green-500 ${
          darkMode ? 'bg-gray-800' : 'bg-white'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-green-600">✅ Système Opérationnel</h3>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Sections 1-6 assemblées et fonctionnelles - Chat IA et Recommandations actifs
              </p>
            </div>
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>IA Active</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span>Chat Live</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                <span>Recommandations IA</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Chatbot flottant */}
      <InteractiveChatbot />
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
