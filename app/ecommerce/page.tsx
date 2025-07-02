'use client';

import { useEffect, useState, useRef, useCallback }

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
            ? 'bg-gray-800 border border-gray-700 hover:border-gray-600' 
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
                <span className="text-gray-400">📷</span>
              </div>
            )}

            {/* Badges */}
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

            {/* Actions rapides */}
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
              {showAdmin && (
                <button
                  onClick={onEdit}
                  className="w-10 h-10 bg-white/90 text-gray-700 rounded-full flex items-center justify-center hover:bg-purple-100 transition-colors backdrop-blur-sm"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Contenu - Mode liste */}
          <div className="p-6 flex-1 flex flex-col justify-between">
            <div>
              <h3 className={`text-xl font-bold mb-2 line-clamp-2 ${
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
            <div className="flex items-center justify-between">
              {hasPrice && (
                <div>
                  <p className={`text-2xl font-bold ${
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
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105"
              >
                🔗 Sitestripe
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Mode grille (par défaut)
  return (
    <div 
      className={`group relative rounded-2xl overflow-hidden transition-all duration-300 hover:scale-105 ${
        darkMode 
          ? 'bg-gray-800 border border-gray-700 hover:border-gray-600' 
          : 'bg-white border border-gray-200 hover:border-gray-300 hover:shadow-2xl'
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

        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>

      {/* Contenu de la carte */}
      <div className="p-4">
        {/* Titre et description */}
        <h3 className={`font-bold text-lg mb-2 line-clamp-2 ${
          darkMode ? 'text-white' : 'text-gray-900'
        }`}>
          {product.name}
        </h3>
        
        <p className={`text-sm mb-3 line-clamp-2 ${
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
            <p className={`text-lg font-bold ${
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
            className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-[1.02] flex items-center justify-center gap-2"
          >
            <ShoppingCart className="w-4 h-4" />
            🔗 Demander Sitestripe
          </button>
          
          {/* Liens externes */}
          {(product.amazonCa || product.amazonCom || product.tiktokUrl) && (
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
              {product.tiktokUrl && (
                <a 
                  href={product.tiktokUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex-1 py-2 bg-black hover:bg-gray-900 text-white rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1"
                >
                  <Video className="w-3 h-3" />
                  TikTok
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
} from 'react';
import { Pencil, Globe, Plus, Trash2, Heart, Video, Mountain, Search, Filter, Grid, List, Share2, ChevronUp, Star, TrendingUp, Zap, Clock, Eye, Users, MessageCircle, ShoppingCart, ExternalLink } from 'lucide-react';

// Configuration
const MESSENGER_PAGE_ID = 'riccerdia';
const PASSWORD = '321MdlTamara!$';

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
    blogTitle: 'Service Sitestripe Professionnel',
    blogSubtitle: 'Obtenez vos liens d\'affiliation instantanément',
    contactUs: 'Nous contacter',
    yourName: 'Votre nom',
    productInterest: 'Produit d\'intérêt',
    message: 'Votre message',
    sendRequest: 'Envoyer la demande',
    adminPanel: 'Administration',
    statistics: 'Statistiques',
    performance: 'Performance',
    categories: 'Catégories',
    images: 'Images',
    addImage: 'Ajouter image',
    selectedCategories: 'Catégories sélectionnées',
    addCategory: 'Ajouter catégorie',
    modify: 'Modifier',
    add: 'Ajouter',
    productUpdated: 'Produit mis à jour',
    productAdded: 'Produit ajouté',
    productDeleted: 'Produit supprimé',
    updateError: 'Erreur lors de la mise à jour',
    addError: 'Erreur lors de l\'ajout',
    deleteError: 'Erreur lors de la suppression',
    adminPassword: 'Mot de passe admin :',
    incorrectPassword: 'Mot de passe incorrect.',
    viewOnTiktok: 'Voir sur TikTok',
    noImage: 'Aucune image',
    imageNotAvailable: 'Image non disponible'
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
    blogTitle: 'Professional Sitestripe Service',
    blogSubtitle: 'Get your affiliate links instantly',
    contactUs: 'Contact us',
    yourName: 'Your name',
    productInterest: 'Product of interest',
    message: 'Your message',
    sendRequest: 'Send request',
    adminPanel: 'Administration',
    statistics: 'Statistics',
    performance: 'Performance',
    categories: 'Categories',
    images: 'Images',
    addImage: 'Add image',
    selectedCategories: 'Selected categories',
    addCategory: 'Add category',
    modify: 'Modify',
    add: 'Add',
    productUpdated: 'Product updated',
    productAdded: 'Product added',
    productDeleted: 'Product deleted',
    updateError: 'Update error',
    addError: 'Add error',
    deleteError: 'Delete error',
    adminPassword: 'Admin password:',
    incorrectPassword: 'Incorrect password.',
    viewOnTiktok: 'View on TikTok',
    noImage: 'No image',
    imageNotAvailable: 'Image not available'
  }
};

export default function CerdiaEnhancedPlatform() {
  // États principaux
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [advertisements, setAdvertisements] = useState<Advertisement[]>([]);
  const [adsenseConfigs, setAdsenseConfigs] = useState<AdSenseConfig[]>([]);
  
  // États d'interface
  const [language, setLanguage] = useState<'fr' | 'en'>('fr');
  const [darkMode, setDarkMode] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortFilter, setSortFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  
  // États d'administration
  const [passwordEntered, setPasswordEntered] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  
  // États de statistiques
  const [pageViews, setPageViews] = useState(1247);
  const [onlineUsers, setOnlineUsers] = useState(12);
  const [totalLikes, setTotalLikes] = useState(0);
  
  // États pour les nouvelles données
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

  // Références
  const searchRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fonction de traduction
  const t = (key: keyof typeof translations.fr) => translations[language][key] || key;

  // Fonctions utilitaires (à implémenter dans les sections suivantes)
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    // Logic à implémenter
  }, []);

  const handleCategoryFilter = useCallback((category: string) => {
    setCategoryFilter(category);
    // Logic à implémenter
  }, []);

  const handleSort = useCallback((sortType: string) => {
    setSortFilter(sortType);
    // Logic à implémenter
  }, []);

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

  // Gestion du scroll
  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Simulation des statistiques
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
                  ref={searchRef}
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
              <div className="relative">
                <select 
                  value={language} 
                  onChange={(e) => setLanguage(e.target.value as 'fr' | 'en')}
                  className={`w-16 lg:w-20 px-2 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${
                    darkMode 
                      ? 'bg-gray-800 border-gray-600 text-white' 
                      : 'bg-white border-gray-200 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                >
                  <option value="fr">🇫🇷</option>
                  <option value="en">🇺🇸</option>
                </select>
              </div>

              {/* Toggle mode sombre */}
              <button 
                onClick={toggleDarkMode}
                className={`p-2 lg:p-3 rounded-xl transition-all duration-300 ${
                  darkMode 
                    ? 'bg-gray-800 hover:bg-gray-700 text-yellow-400' 
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                } hover:scale-110`}
                title={t('darkMode')}
              >
                {darkMode ? '🌙' : '☀️'}
              </button>

              {/* Menu admin */}
              {passwordEntered && (
                <button 
                  onClick={() => setShowForm(true)}
                  className="p-2 lg:p-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-all duration-300 hover:scale-110"
                  title={t('addProduct')}
                >
                  <Plus className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* Navigation secondaire avec filtres */}
          <div className="pb-4 space-y-4">
            
            {/* Filtres rapides */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 overflow-x-auto pb-2">
                <button
                  onClick={() => handleCategoryFilter('')}
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
                    onClick={() => handleCategoryFilter(category)}
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

                {/* Filtres spéciaux */}
                <button
                  onClick={() => setShowFilters(true)}
                  className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 flex items-center space-x-2 ${
                    darkMode 
                      ? 'bg-purple-800 text-purple-300 hover:bg-purple-700' 
                      : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                  }`}
                >
                  <TrendingUp className="w-4 h-4" />
                  <span>{t('trending')}</span>
                </button>
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
                  onChange={(e) => handleSort(e.target.value)}
                  className={`px-3 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${
                    darkMode 
                      ? 'bg-gray-800 border-gray-600 text-white' 
                      : 'bg-white border-gray-200 text-gray-900'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                >
                  <option value="">{t('sortBy')}</option>
                  <option value="newest">{t('newest')}</option>
                  <option value="oldest">{t('oldest')}</option>
                  <option value="priceLowHigh">{t('priceLowHigh')}</option>
                  <option value="priceHighLow">{t('priceHighLow')}</option>
                  <option value="mostLiked">{t('mostLiked')}</option>
                  <option value="mostViewed">{t('mostViewed')}</option>
                  <option value="topRated">{t('topRated')}</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </header>

  // Données de démonstration (simulant votre base de données)
  const demoProducts: Product[] = [
    {
      id: 1,
      name: "Montre Apple Watch Series 9",
      description: "La montre connectée la plus avancée avec écran Always-On et capteurs de santé révolutionnaires.",
      images: ["https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400", "https://images.unsplash.com/photo-1510017098667-27dfc7150c19?w=400"],
      categories: ["Tech", "Montre"],
      priceCa: "529",
      priceUs: "399",
      amazonCa: "https://amazon.ca",
      amazonCom: "https://amazon.com",
      tiktokUrl: "https://tiktok.com",
      views: 1247,
      likes: 89,
      rating: 4.8,
      verified: true,
      trending: true,
      promoted: true,
      createdAt: new Date().toISOString()
    },
    {
      id: 2,
      name: "Lunettes Ray-Ban Aviator",
      description: "Lunettes de soleil iconiques avec verres polarisés et monture titane ultra-légère.",
      images: ["https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400", "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=400"],
      categories: ["Mode", "Lunette de soleil"],
      priceCa: "249",
      priceUs: "189",
      amazonCa: "https://amazon.ca",
      views: 856,
      likes: 124,
      rating: 4.6,
      verified: true,
      trending: false,
      promoted: false,
      createdAt: new Date(Date.now() - 86400000).toISOString()
    },
    {
      id: 3,
      name: "Sac à dos Fjällräven Kånken",
      description: "Sac à dos iconique suédois, résistant à l'eau et parfait pour l'aventure urbaine.",
      images: ["https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400"],
      categories: ["Mode", "Sac à dos"],
      priceCa: "129",
      priceUs: "95",
      views: 432,
      likes: 67,
      rating: 4.9,
      verified: false,
      trending: true,
      promoted: false,
      createdAt: new Date(Date.now() - 172800000).toISOString()
    },
    {
      id: 4,
      name: "Écouteurs Sony WH-1000XM5",
      description: "Casque sans fil à réduction de bruit active de nouvelle génération.",
      images: ["https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400"],
      categories: ["Tech"],
      priceCa: "399",
      priceUs: "299",
      views: 1124,
      likes: 156,
      rating: 4.7,
      verified: true,
      trending: false,
      promoted: true,
      createdAt: new Date(Date.now() - 259200000).toISOString()
    },
    {
      id: 5,
      name: "Parfum Chanel N°5",
      description: "Le parfum le plus iconique au monde, essence de féminité et d'élégance.",
      images: ["https://images.unsplash.com/photo-1541643600914-78b084683601?w=400"],
      categories: ["Mode"],
      priceCa: "179",
      priceUs: "135",
      views: 689,
      likes: 203,
      rating: 4.5,
      verified: true,
      trending: false,
      promoted: false,
      createdAt: new Date(Date.now() - 345600000).toISOString()
    }
  ];

  // États avec données de démonstration
  const [products] = useState<Product[]>(demoProducts);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>(demoProducts);
  const [userLikes, setUserLikes] = useState<Set<number>>(new Set());

  // Fonctions de filtrage et tri
  const applyFiltersAndSort = useCallback(() => {
    let filtered = [...products];

    // Recherche textuelle
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(product => 
        product.name.toLowerCase().includes(query) ||
        product.description.toLowerCase().includes(query) ||
        product.categories.some(cat => cat.toLowerCase().includes(query))
      );
    }

    // Filtre par catégorie
    if (categoryFilter && categoryFilter !== '') {
      filtered = filtered.filter(product => 
        product.categories.includes(categoryFilter)
      );
    }

    // Tri
    if (sortFilter) {
      filtered.sort((a, b) => {
        switch (sortFilter) {
          case 'newest':
            return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
          case 'oldest':
            return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
          case 'priceLowHigh':
            return parseFloat(a.priceCa || '0') - parseFloat(b.priceCa || '0');
          case 'priceHighLow':
            return parseFloat(b.priceCa || '0') - parseFloat(a.priceCa || '0');
          case 'mostLiked':
            return (b.likes || 0) - (a.likes || 0);
          case 'mostViewed':
            return (b.views || 0) - (a.views || 0);
          case 'topRated':
            return (b.rating || 0) - (a.rating || 0);
          default:
            return 0;
        }
      });
    }

    setFilteredProducts(filtered);
  }, [products, searchQuery, categoryFilter, sortFilter]);

  // Mise à jour des filtres
  useEffect(() => {
    applyFiltersAndSort();
  }, [applyFiltersAndSort]);

  // Fonctions d'interaction
  const handleLike = (productId: number) => {
    const newLikes = new Set(userLikes);
    if (newLikes.has(productId)) {
      newLikes.delete(productId);
    } else {
      newLikes.add(productId);
    }
    setUserLikes(newLikes);
  };

  const handleShare = (product: Product) => {
    if (navigator.share) {
      navigator.share({
        title: product.name,
        text: product.description,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(`${product.name} - ${window.location.href}`);
    }
  };

  const openSitestripeRequest = (product: Product) => {
    const message = `Bonjour! Je souhaite obtenir les liens Sitestripe pour: ${product.name}`;
    const messengerURL = `https://m.me/${MESSENGER_PAGE_ID}?text=${encodeURIComponent(message)}`;
    window.open(messengerURL, '_blank');
  };

  // États pour OpenAI et IA
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiGeneratedDesc, setAiGeneratedDesc] = useState('');
  const [showAnalytics, setShowAnalytics] = useState(false);

  // Fonctions OpenAI
  const generateProductDescription = async (productName: string, category: string) => {
    if (!productName.trim()) return;
    
    setAiLoading(true);
    try {
      const response = await fetch('/api/openai/generate-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          productName, 
          category,
          language 
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setAiGeneratedDesc(data.description);
        setNewProduct(prev => ({ ...prev, description: data.description }));
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
        body: JSON.stringify({ 
          query, 
          products: products.map(p => ({ name: p.name, categories: p.categories })),
          language 
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setAiSuggestions(data.suggestions || []);
      }
    } catch (error) {
      console.error('Erreur suggestions IA:', error);
    }
  };

  const analyzeProductPerformance = async () => {
    setAiLoading(true);
    try {
      const response = await fetch('/api/openai/analyze-performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          products: products.map(p => ({
            name: p.name,
            views: p.views,
            likes: p.likes,
            rating: p.rating,
            categories: p.categories
          })),
          language 
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setShowAnalytics(true);
        // Afficher les insights IA
      }
    } catch (error) {
      console.error('Erreur analyse IA:', error);
    } finally {
      setAiLoading(false);
    }
  };

  // Mise à jour de la recherche avec suggestions IA
  const handleSearchWithAI = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (query.length >= 2) {
      await getSearchSuggestions(query);
    } else {
      setAiSuggestions([]);
    }
  }, []);

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

        {/* Statistiques et résultats avec analytics IA */}
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
                <>
                  <button
                    onClick={analyzeProductPerformance}
                    disabled={aiLoading}
                    className={`px-4 py-2 rounded-xl font-medium transition-all duration-300 flex items-center gap-2 ${
                      aiLoading
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white'
                    }`}
                  >
                    {aiLoading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <div className="w-4 h-4 bg-white rounded-full flex items-center justify-center text-purple-500 text-xs font-bold">
                          AI
                        </div>
                        Analytics
                      </>
                    )}
                  </button>
                  
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
                </>
              )}
              
              {/* Badges existants */}
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
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  darkMode ? 'bg-purple-900 text-purple-300' : 'bg-purple-100 text-purple-800'
                }`}>
                  💎 Premium
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
              {/* Génération de description */}
              <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <h4 className={`font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  📝 Génération de description
                </h4>
                <input
                  placeholder="Nom du produit..."
                  className={`w-full p-2 rounded-lg border text-sm mb-2 ${
                    darkMode ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300'
                  }`}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      const target = e.target as HTMLInputElement;
                      generateProductDescription(target.value, 'Tech');
                    }
                  }}
                />
                <button
                  onClick={() => {
                    const input = document.querySelector('input[placeholder="Nom du produit..."]') as HTMLInputElement;
                    if (input?.value) generateProductDescription(input.value, 'Tech');
                  }}
                  disabled={aiLoading}
                  className="w-full py-2 bg-purple-500 text-white rounded-lg text-sm hover:bg-purple-600 disabled:opacity-50"
                >
                  {aiLoading ? 'Génération...' : 'Générer avec IA'}
                </button>
                {aiGeneratedDesc && (
                  <div className={`mt-2 p-2 rounded text-xs ${darkMode ? 'bg-gray-600' : 'bg-white'}`}>
                    {aiGeneratedDesc}
                  </div>
                )}
              </div>

              {/* Optimisation SEO */}
              <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <h4 className={`font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  🎯 Optimisation SEO
                </h4>
                <button className="w-full py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600">
                  Analyser mots-clés
                </button>
              </div>

              {/* Tendances marché */}
              <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <h4 className={`font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  📈 Tendances marché
                </h4>
                <button className="w-full py-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600">
                  Rapport tendances
                </button>
              </div>

              {/* Prix intelligents */}
              <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <h4 className={`font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  💰 Prix intelligents
                </h4>
                <button className="w-full py-2 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600">
                  Analyser concurrence
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Grille de produits (existante) */}
        {filteredProducts.length > 0 ? (
          <div className={`grid gap-4 ${
            viewMode === 'grid' 
              ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' 
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
                onEdit={() => requestPassword() && console.log('Edit', product.id)}
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
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
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
              <button
                onClick={() => getSearchSuggestions(searchQuery || 'tendance')}
                className="px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
              >
                <div className="w-4 h-4 bg-white rounded-full flex items-center justify-center text-purple-500 text-xs font-bold">
                  AI
                </div>
                Suggestions IA
              </button>
            </div>
          </div>
        )}

        {/* Section de performance */}
        <div className="mt-20 text-center">
          <div className="bg-gradient-to-r from-blue-100 to-purple-100 border border-blue-300 rounded-2xl p-8 mb-8 inline-block">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                🚀
              </div>
              <h3 className="text-2xl font-bold text-gray-900">
                Plateforme CERDIA Complète !
              </h3>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
              <div className="text-center">
                <div className="text-3xl mb-2">🎨</div>
                <h4 className="font-bold">Design Premium</h4>
                <p className="text-sm text-gray-600">Interface moderne et responsive</p>
              </div>
              <div className="text-center">
                <div className="text-3xl mb-2">🤖</div>
                <h4 className="font-bold">IA Intégrée</h4>
                <p className="text-sm text-gray-600">OpenAI pour optimisation</p>
              </div>
              <div className="text-center">
                <div className="text-3xl mb-2">🔗</div>
                <h4 className="font-bold">Sitestripe</h4>
                <p className="text-sm text-gray-600">Liens d'affiliation automatiques</p>
              </div>
              <div className="text-center">
                <div className="text-3xl mb-2">📊</div>
                <h4 className="font-bold">Analytics</h4>
                <p className="text-sm text-gray-600">Statistiques en temps réel</p>
              </div>
            </div>

            <div className="mt-6 p-4 bg-white rounded-xl">
              <h5 className="font-bold text-green-800 mb-2">✅ Fonctionnalités implémentées :</h5>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm text-green-700">
                <div>✓ Interface responsive</div>
                <div>✓ Mode sombre/clair</div>
                <div>✓ Recherche intelligente</div>
                <div>✓ Filtres avancés</div>
                <div>✓ Système de likes</div>
                <div>✓ Partage natif</div>
                <div>✓ Zoom d'images</div>
                <div>✓ Vue grille/liste</div>
                <div>✓ Assistant IA</div>
                <div>✓ Analytics temps réel</div>
                <div>✓ Panel admin</div>
                <div>✓ Liens Sitestripe</div>
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
