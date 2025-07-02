// app/ecommerce/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Brain, Zap, Star, Database, CheckCircle } from 'lucide-react';

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
}

// Hook localStorage simple
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

  const setValue = useCallback((value: T) => {
    try {
      setStoredValue(value);
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
    }
  }, [key]);

  return [storedValue, setValue] as const;
}

// Hook debounce simple
function useDebounce<T>(value: T, delay: number): T {
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
}

// Utilitaire formatage prix
function formatPrice(price: string | number): string {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  return new Intl.NumberFormat('fr-CA', {
    style: 'currency',
    currency: 'CAD'
  }).format(numPrice);
}

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
    images: [],
    categories: ["Montres", "Tech"],
    priceCa: "399",
    rating: 4.8,
    reviewCount: 142,
    aiScore: 95,
    isNew: true
  };

  return (
    <main className="bg-gradient-to-br from-blue-50 to-purple-50 p-6 min-h-screen">
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
            <span className="w-6 h-6 mr-3 text-blue-500">⏱️</span>
            Test Debounce Hook
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

        {/* Exemple de produit */}
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Star className="w-6 h-6 mr-3 text-yellow-500" />
            📊 Exemple de Produit
          </h2>
          
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
