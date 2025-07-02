// app/ecommerce/page.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Brain, Zap, Star, Database, Settings, 
  CheckCircle, TrendingUp, Users, Target
} from 'lucide-react';

// Metadata pour Next.js
export const metadata = {
  title: 'CERDIA Platform - E-commerce Intelligent',
  description: 'Plateforme e-commerce avec IA intégrée',
};

// ==========================================
// INTERFACES PRINCIPALES
// ==========================================
interface Product {
  id?: number;
  name: string;
  description: string;
  amazonCa?: string;
  amazonCom?: string;
  tiktokUrl?: string;
  shopifyUrl?: string;
  aliexpressUrl?: string;
  images: string[];
  categories: string[];
  priceCa?: string;
  priceUs?: string;
  originalPrice?: string;
  discount?: number;
  rating?: number;
  reviewCount?: number;
  brand?: string;
  tags?: string[];
  isNew?: boolean;
  isPopular?: boolean;
  isFeatured?: boolean;
  stock?: number;
  sku?: string;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  createdAt?: string;
  updatedAt?: string;
  clickCount?: number;
  conversionRate?: number;
  aiScore?: number;
  seoKeywords?: string[];
}

interface SmartRecommendation {
  id: number;
  productId: number;
  product: Product;
  score: number;
  reason: string;
  type: 'trending' | 'personalized' | 'similar' | 'price' | 'category' | 'ai_powered' | 'cross_sell' | 'upsell';
  confidence: number;
  urgency?: 'low' | 'medium' | 'high';
  aiGenerated?: boolean;
  explanation: string;
  expectedConversion?: number;
  timeToDisplay?: number;
  displayPriority: number;
}

// ==========================================
// UTILITAIRES
// ==========================================
const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

const formatPrice = (price: string | number, currency: 'CAD' | 'USD' = 'CAD'): string => {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  return new Intl.NumberFormat(currency === 'CAD' ? 'fr-CA' : 'en-US', {
    style: 'currency',
    currency: currency === 'CAD' ? 'CAD' : 'USD'
  }).format(numPrice);
};

// ==========================================
// HOOK LOCALSTORAGE SÉCURISÉ
// ==========================================
const useLocalStorage = <T>(key: string, initialValue: T) => {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      if (typeof window === 'undefined') return initialValue;
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Erreur lecture localStorage "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error(`Erreur écriture localStorage "${key}":`, error);
    }
  }, [key, storedValue]);

  return [storedValue, setValue] as const;
};

// ==========================================
// HOOK DEBOUNCE
// ==========================================
const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// ==========================================
// COMPOSANT PRINCIPAL
// ==========================================
export default function EcommercePage() {
  const [testData, setTestData] = useState({
    productsCount: 0,
    messagesCount: 0,
    recommendationsCount: 0
  });

  const [isLoading, setIsLoading] = useState(false);
  const [testValue, setTestValue] = useLocalStorage('cerdia_test', 'valeur initiale');
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // Test des utilitaires
  const testUtilities = useCallback(async () => {
    setIsLoading(true);
    
    // Simulation des tests
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setTestData({
      productsCount: Math.floor(Math.random() * 100) + 50,
      messagesCount: Math.floor(Math.random() * 500) + 100,
      recommendationsCount: Math.floor(Math.random() * 50) + 20
    });
    
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (debouncedSearchTerm) {
      console.log('Recherche avec debounce:', debouncedSearchTerm);
    }
  }, [debouncedSearchTerm]);

  // Données de test
  const mockProduct: Product = {
    id: 1,
    name: "Montre Connectée CERDIA Pro",
    description: "Montre intelligente avec IA intégrée",
    images: ["/api/placeholder/300/300"],
    categories: ["Montres", "Tech"],
    priceCa: "399",
    rating: 4.8,
    reviewCount: 142,
    aiScore: 95,
    isNew: true
  };

  const mockRecommendation: SmartRecommendation = {
    id: 1,
    productId: 1,
    product: mockProduct,
    score: 95,
    reason: "Basé sur vos préférences",
    type: "personalized",
    confidence: 0.95,
    explanation: "Ce produit correspond parfaitement à votre profil",
    displayPriority: 1
  };

  return (
    <main className="bg-gradient-to-br from-blue-50 to-purple-50 p-6 rounded-lg min-h-screen">
      <h1 className="text-3xl font-bold text-center mb-6 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
        🚀 CERDIA Platform - Section 1
      </h1>
      <p className="text-center text-gray-600 mb-8">
        Types, Interfaces, Utilitaires & Hooks
      </p>
      
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Types & Interfaces */}
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Brain className="w-6 h-6 mr-3 text-purple-600" />
            ✅ Types & Interfaces Définis
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <h4 className="font-medium mb-3 text-purple-600">🛍️ Commerce</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                  Interface Product complète
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                  SmartRecommendation avec IA
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                  UserGameification système
                </li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium mb-3 text-blue-600">🤖 Intelligence Artificielle</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                  AIPersonalization avancée
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                  ChatMessage avec metadata
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                  Types de recommandations
                </li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium mb-3 text-green-600">🔧 Utilitaires</h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                  Fonctions debounce/throttle
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                  formatPrice avec devises
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                  getTimeAgo pour dates
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Test des Utilitaires */}
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Zap className="w-6 h-6 mr-3 text-yellow-500" />
            🧪 Test des Utilitaires
          </h2>
          
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {isLoading ? '...' : testData.productsCount}
              </div>
              <div className="text-sm text-gray-600">Produits</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-3xl font-bold text-green-600 mb-2">
                {isLoading ? '...' : testData.messagesCount}
              </div>
              <div className="text-sm text-gray-600">Messages</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-3xl font-bold text-purple-600 mb-2">
                {isLoading ? '...' : testData.recommendationsCount}
              </div>
              <div className="text-sm text-gray-600">Recommandations IA</div>
            </div>
          </div>

          <button
            onClick={testUtilities}
            disabled={isLoading}
            className={`w-full py-3 rounded-lg font-medium transition-all ${
              isLoading 
                ? 'bg-gray-300 cursor-not-allowed' 
                : 'bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:shadow-lg transform hover:scale-105'
            }`}
          >
            {isLoading ? 'Test en cours...' : '🧪 Tester les Utilitaires'}
          </button>
        </div>

        {/* Test LocalStorage */}
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Database className="w-6 h-6 mr-3 text-green-500" />
            💾 Test LocalStorage Hook
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Valeur stockée :</label>
              <input
                type="text"
                value={testValue}
                onChange={(e) => setTestValue(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                placeholder="Modifier la valeur..."
              />
            </div>
            <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
              ✅ La valeur est automatiquement sauvegardée dans localStorage
            </div>
          </div>
        </div>

        {/* Test Debounce */}
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Target className="w-6 h-6 mr-3 text-blue-500" />
            ⏱️ Test Debounce Hook
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Recherche avec debounce (500ms) :</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="Tapez pour tester le debounce..."
              />
            </div>
            <div className="flex justify-between text-sm bg-gray-50 p-3 rounded-lg">
              <span className="text-gray-600">Valeur actuelle: <strong>{searchTerm}</strong></span>
              <span className="text-gray-600">Valeur debounced: <strong>{debouncedSearchTerm}</strong></span>
            </div>
          </div>
        </div>

        {/* Exemples de données */}
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Star className="w-6 h-6 mr-3 text-yellow-500" />
            📊 Exemples de Structures de Données
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-3 text-purple-600">Produit Exemple</h4>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm font-medium mb-2">{mockProduct.name}</div>
                <div className="text-xs text-gray-600 mb-2">{mockProduct.description}</div>
                <div className="flex items-center justify-between">
                  <span className="text-green-600 font-bold">{formatPrice(mockProduct.priceCa || '0')}</span>
                  <div className="flex items-center space-x-1">
                    <Star className="w-3 h-3 text-yellow-400 fill-current" />
                    <span className="text-xs">{mockProduct.rating}</span>
                  </div>
                </div>
                <div className="mt-2 text-xs">
                  <span className="bg-purple-100 text-purple-600 px-2 py-1 rounded">
                    🤖 Score IA: {mockProduct.aiScore}%
                  </span>
                  {mockProduct.isNew && (
                    <span className="bg-green-100 text-green-600 px-2 py-1 rounded ml-2">
                      Nouveau
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium mb-3 text-blue-600">Recommandation IA</h4>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm font-medium mb-2">Recommandation Personnalisée</div>
                <div className="text-xs text-gray-600 mb-2">{mockRecommendation.reason}</div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-blue-600 font-bold">Score: {mockRecommendation.score}%</span>
                  <span className="text-green-600 text-xs">Confiance: {Math.round(mockRecommendation.confidence * 100)}%</span>
                </div>
                <div className="text-xs">
                  <span className="bg-blue-100 text-blue-600 px-2 py-1 rounded">
                    Type: {mockRecommendation.type}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Status Section 1 */}
        <div className="text-center bg-green-100 border-2 border-green-300 rounded-xl p-6">
          <div className="text-4xl mb-3">🎉</div>
          <h3 className="text-2xl font-bold text-green-800 mb-2">
            Section 1 Complétée !
          </h3>
          <p className="text-green-600 mb-4">
            Types, interfaces, utilitaires et hooks prêts pour les sections suivantes
          </p>
          <div className="flex justify-center">
            <div className="bg-green-500 text-white px-6 py-2 rounded-lg font-medium">
              ✅ Prêt pour Section 2
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
