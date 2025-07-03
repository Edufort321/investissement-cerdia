// ==========================================
// SECTION 7 : PARTIE 1 - IMPORTS, TYPES & CONFIGURATION
// ==========================================

'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { 
  Pencil, Globe, Plus, Trash2, Heart, Video, Mountain, RefreshCw,
  Filter, Search, Grid, List, Star, Eye, Users, TrendingUp,
  MessageSquare, Settings, Sun, Moon, Bell, Target, CheckCircle,
  Clock, ThumbsUp, ThumbsDown, Send, Bot, Sparkles
} from 'lucide-react';

// Configuration Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Configuration des constantes
const MESSENGER_PAGE_ID = 'riccerdia';
const PASSWORD = '321MdlTamara!$';

// Types et interfaces complets
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
  rating?: number;
  reviewCount?: number;
  aiScore?: number;
  isNew?: boolean;
  isPopular?: boolean;
  features?: string[];
  affiliateLink?: string;
  discount?: number;
  originalPrice?: string;
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

// Données par défaut et mappings
const DEFAULT_CATEGORIES = {
  fr: ['Formation', 'Livre', 'Outil', 'Service', 'Montre', 'Audio', 'Pack'],
  en: ['Training', 'Book', 'Tool', 'Service', 'Watch', 'Audio', 'Pack']
};

const CATEGORY_MAPPING = {
  'Formation': 'Training',
  'Livre': 'Book',
  'Outil': 'Tool',
  'Service': 'Service',
  'Montre': 'Watch',
  'Audio': 'Audio',
  'Pack': 'Pack',
  'Training': 'Formation',
  'Book': 'Livre',
  'Tool': 'Outil',
  'Watch': 'Montre'
};

// Traductions complètes modernes
const translations = {
  fr: {
    title: 'Collection CERDIA 2025',
    subtitle: 'Produits Intelligents Propulsés par IA',
    all: 'Tous',
    addProduct: '➕ Ajouter Produit',
    addAd: '📺 Ajouter Publicité',
    addAdSense: '💰 Configurer AdSense',
    manageAdSense: 'Gérer AdSense',
    adsenseClientId: 'ID Client AdSense (ca-pub-...)',
    adsenseSlotId: 'ID Slot AdSense',
    adsenseFormat: 'Format de publicité',
    adsensePosition: 'Position',
    adsenseFrequency: 'Fréquence (tous les X produits)',
    formatAuto: 'Automatique',
    formatHorizontal: 'Horizontal (bannière)',
    formatRectangle: 'Rectangle',
    formatVertical: 'Vertical',
    positionTop: 'Haut de page',
    positionMiddle: 'Milieu (entre produits)',
    positionBottom: 'Bas de page',
    positionSidebar: 'Barre latérale',
    adsenseConfigured: 'Configuration AdSense sauvegardée',
    adsenseDeleted: 'Configuration AdSense supprimée',
    name: 'Nom',
    description: 'Description',
    modify: 'Modifier',
    add: 'Ajouter',
    cancel: 'Annuler',
    delete: 'Supprimer',
    noImage: 'Aucune image',
    imageNotAvailable: 'Image non disponible',
    viewOnTiktok: 'TikTok',
    adminPassword: 'Mot de passe admin :',
    incorrectPassword: 'Mot de passe incorrect.',
    productUpdated: 'Produit mis à jour avec succès',
    productAdded: 'Produit ajouté avec succès',
    productDeleted: 'Produit supprimé avec succès',
    adUpdated: 'Publicité mise à jour avec succès',
    adAdded: 'Publicité ajoutée avec succès',
    adDeleted: 'Publicité supprimée avec succès',
    updateError: 'Erreur lors de la mise à jour',
    addError: 'Erreur lors de l\'ajout',
    deleteError: 'Erreur lors de la suppression',
    addImage: 'Ajouter une image',
    images: 'Images',
    categories: 'Catégories',
    addCategory: 'Ajouter une catégorie',
    selectedCategories: 'Catégories sélectionnées',
    priceNote: 'Prix peuvent varier',
    indicativePrice: 'À partir de',
    save: 'Sauvegarder',
    sortBy: 'Trier par',
    priceLowHigh: 'Prix croissant',
    priceHighLow: 'Prix décroissant',
    newest: 'Plus récent',
    oldest: 'Plus ancien',
    nameAZ: 'Nom A-Z',
    nameZA: 'Nom Z-A',
    adminRequired: 'Mot de passe admin requis pour créer des catégories',
    blog: 'Blog',
    products: 'Produits',
    ads: 'Publicités',
    blogTitle: 'Demandez votre Sitestripe pour tous vos achats !',
    blogSubtitle: 'Obtenez instantanément vos liens d\'affiliation personnalisés',
    blogContent: 'Vous cherchez des produits de qualité avec les meilleurs prix ? Notre service Sitestripe vous permet d\'obtenir rapidement tous les liens d\'affiliation dont vous avez besoin !',
    blogFeatures: 'Nos avantages',
    feature1: '🚀 Réponse rapide via Messenger',
    feature2: '💰 Accès aux meilleurs deals',
    feature3: '🔗 Liens d\'affiliation personnalisés',
    feature4: '📱 Service 7j/7',
    contactForm: 'Demander votre Sitestripe',
    yourName: 'Votre nom',
    productInterest: 'Produit qui vous intéresse',
    message: 'Votre message (optionnel)',
    sendToMessenger: 'Ouvrir Messenger',
    messengerDirect: 'Ou contactez-nous directement sur',
    requestSent: 'Redirection vers Messenger...',
    comments: 'Commentaires',
    addComment: 'Ajouter un commentaire',
    yourComment: 'Votre commentaire...',
    postComment: 'Publier',
    commentPosted: 'Commentaire publié avec succès !',
    noComments: 'Aucun commentaire pour le moment. Soyez le premier à commenter !',
    pageViews: 'Vues de la page',
    onlineNow: 'En ligne maintenant',
    totalVisitors: 'Visiteurs total',
    points: 'Points',
    badges: 'Badges',
    earnPoints: 'Gagnez des points !',
    discoverStyle: 'Découvrir mon style',
    styleQuiz: 'Quiz de Style',
    darkMode: 'Mode sombre',
    recentActivity: 'Activité récente',
    welcomePoints: '+10 points de bienvenue !',
    favoritePoints: '+5 points pour ce favori !',
    sharePoints: '+15 points pour le partage !',
    firstVisitBadge: '🎉 Première visite',
    explorerBadge: '🔍 Explorateur',
    trendsetterBadge: '✨ Trendsetter',
    loyalBadge: '💎 Fidèle',
    notification: 'Notification',
    dealAlert: '🔥 Deal Alert: 50% sur les formations IA !',
    stockAlert: '⚡ Stock limité: Plus que 3 unités !',
    trendingAlert: '📈 Tendance: Ce produit explose !',
    dragProduct: 'Glissez un produit ici ou tapez le nom',
    dragDropHint: '🎯 Glissez un produit de la collection ici',
    productDropped: 'Produit ajouté !',
    requestSitestripe: '+20 points pour votre demande Sitestripe !',
    adTitle: 'Titre de la publicité',
    adUrl: 'URL de destination',
    adImage: 'Image de la publicité',
    adType: 'Type de publicité',
    videoAd: 'Publicité Vidéo',
    imageAd: 'Publicité Image',
    isActive: 'Actif',
    manageAds: 'Gérer les publicités',
    searchProducts: 'Rechercher des produits...',
    viewMode: 'Mode d\'affichage',
    gridView: 'Vue grille',
    masonryView: 'Vue mosaïque',
    featured: 'En vedette',
    loading: 'Chargement...',
    error: 'Erreur',
    noResults: 'Aucun résultat trouvé',
    tryDifferentSearch: 'Essayez une recherche différente',
    resetFilters: 'Réinitialiser les filtres',
    showingResults: 'produits affichés',
    buyNow: 'Acheter maintenant',
    addToCart: 'Ajouter au panier',
    share: 'Partager',
    favorite: 'Favori',
    features: 'Fonctionnalités',
    reviews: 'avis',
    savings: 'Économisez'
  },
  en: {
    title: 'CERDIA Collection 2025',
    subtitle: 'AI-Powered Smart Products',
    all: 'All',
    addProduct: '➕ Add Product',
    addAd: '📺 Add Advertisement',
    addAdSense: '💰 Configure AdSense',
    manageAdSense: 'Manage AdSense',
    adsenseClientId: 'AdSense Client ID (ca-pub-...)',
    adsenseSlotId: 'AdSense Slot ID',
    adsenseFormat: 'Ad format',
    adsensePosition: 'Position',
    adsenseFrequency: 'Frequency (every X products)',
    formatAuto: 'Automatic',
    formatHorizontal: 'Horizontal (banner)',
    formatRectangle: 'Rectangle',
    formatVertical: 'Vertical',
    positionTop: 'Top of page',
    positionMiddle: 'Middle (between products)',
    positionBottom: 'Bottom of page',
    positionSidebar: 'Sidebar',
    adsenseConfigured: 'AdSense configuration saved',
    adsenseDeleted: 'AdSense configuration deleted',
    name: 'Name',
    description: 'Description',
    modify: 'Modify',
    add: 'Add',
    cancel: 'Cancel',
    delete: 'Delete',
    noImage: 'No image',
    imageNotAvailable: 'Image not available',
    viewOnTiktok: 'TikTok',
    adminPassword: 'Admin password:',
    incorrectPassword: 'Incorrect password.',
    productUpdated: 'Product updated successfully',
    productAdded: 'Product added successfully',
    productDeleted: 'Product deleted successfully',
    adUpdated: 'Advertisement updated successfully',
    adAdded: 'Advertisement added successfully',
    adDeleted: 'Advertisement deleted successfully',
    updateError: 'Error during update',
    addError: 'Error during addition',
    deleteError: 'Error during deletion',
    addImage: 'Add image',
    images: 'Images',
    categories: 'Categories',
    addCategory: 'Add category',
    selectedCategories: 'Selected categories',
    priceNote: 'Prices may vary',
    indicativePrice: 'From',
    save: 'Save',
    sortBy: 'Sort by',
    priceLowHigh: 'Price low to high',
    priceHighLow: 'Price high to low',
    newest: 'Newest',
    oldest: 'Oldest',
    nameAZ: 'Name A-Z',
    nameZA: 'Name Z-A',
    adminRequired: 'Admin password required to create categories',
    blog: 'Blog',
    products: 'Products',
    ads: 'Advertisements',
    blogTitle: 'Request your Sitestripe for all your purchases!',
    blogSubtitle: 'Get your personalized affiliate links instantly',
    blogContent: 'Looking for quality products at the best prices? Our Sitestripe service allows you to quickly get all the affiliate links you need!',
    blogFeatures: 'Our advantages',
    feature1: '🚀 Fast response via Messenger',
    feature2: '💰 Access to the best deals',
    feature3: '🔗 Personalized affiliate links',
    feature4: '📱 7/7 service',
    contactForm: 'Request your Sitestripe',
    yourName: 'Your name',
    productInterest: 'Product you\'re interested in',
    message: 'Your message (optional)',
    sendToMessenger: 'Open Messenger',
    messengerDirect: 'Or contact us directly on',
    requestSent: 'Redirecting to Messenger...',
    comments: 'Comments',
    addComment: 'Add a comment',
    yourComment: 'Your comment...',
    postComment: 'Post',
    commentPosted: 'Comment posted successfully!',
    noComments: 'No comments yet. Be the first to comment!',
    pageViews: 'Page views',
    onlineNow: 'Online now',
    totalVisitors: 'Total visitors',
    points: 'Points',
    badges: 'Badges',
    earnPoints: 'Earn points!',
    discoverStyle: 'Discover my style',
    styleQuiz: 'Style Quiz',
    darkMode: 'Dark mode',
    recentActivity: 'Recent activity',
    welcomePoints: '+10 welcome points!',
    favoritePoints: '+5 points for this favorite!',
    sharePoints: '+15 points for sharing!',
    firstVisitBadge: '🎉 First visit',
    explorerBadge: '🔍 Explorer',
    trendsetterBadge: '✨ Trendsetter',
    loyalBadge: '💎 Loyal',
    notification: 'Notification',
    dealAlert: '🔥 Deal Alert: 50% off AI training!',
    stockAlert: '⚡ Limited stock: Only 3 left!',
    trendingAlert: '📈 Trending: This product is hot!',
    dragProduct: 'Drag a product here or type the name',
    dragDropHint: '🎯 Drag a product from the collection here',
    productDropped: 'Product added!',
    requestSitestripe: '+20 points for your Sitestripe request!',
    adTitle: 'Advertisement title',
    adUrl: 'Destination URL',
    adImage: 'Advertisement image',
    adType: 'Advertisement type',
    videoAd: 'Video Advertisement',
    imageAd: 'Image Advertisement',
    isActive: 'Active',
    manageAds: 'Manage advertisements',
    searchProducts: 'Search products...',
    viewMode: 'View mode',
    gridView: 'Grid view',
    masonryView: 'Masonry view',
    featured: 'Featured',
    loading: 'Loading...',
    error: 'Error',
    noResults: 'No results found',
    tryDifferentSearch: 'Try a different search',
    resetFilters: 'Reset filters',
    showingResults: 'products shown',
    buyNow: 'Buy now',
    addToCart: 'Add to cart',
    share: 'Share',
    favorite: 'Favorite',
    features: 'Features',
    reviews: 'reviews',
    savings: 'Save'
  }
};
// ==========================================
// SECTION 7 : PARTIE 2 - COMPOSANTS UTILITAIRES & ADSENSE
// ==========================================

// Fonction utilitaire debounce optimisée
function debounce<T extends (...args: any[]) => void>(func: T, delay: number): T {
  let timeoutId: NodeJS.Timeout;
  return ((...args: any[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(null, args), delay);
  }) as T;
}

// Hook localStorage sécurisé
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

// Composant Google AdSense moderne
function GoogleAdSense({ 
  clientId, 
  slotId, 
  format = "auto", 
  responsive = true, 
  style,
  className = ""
}: {
  clientId: string;
  slotId: string;
  format?: string;
  responsive?: boolean;
  style?: React.CSSProperties;
  className?: string;
}) {
  const [adLoaded, setAdLoaded] = useState(false);
  const adRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      // @ts-ignore
      if (window.adsbygoogle && window.adsbygoogle.push) {
        // @ts-ignore
        window.adsbygoogle.push({});
        setAdLoaded(true);
      }
    } catch (err) {
      console.error('AdSense error:', err);
    }
  }, []);

  if (!clientId || !slotId) {
    return (
      <div className={`border-2 border-dashed border-gray-300 rounded-xl p-6 text-center text-gray-500 bg-gray-50 ${className}`} style={style}>
        <div className="space-y-2">
          <div className="w-8 h-8 mx-auto bg-gray-300 rounded"></div>
          <p className="text-sm font-medium">Configuration AdSense manquante</p>
          <div className="text-xs space-y-1">
            <p>Client ID: {clientId || 'Non défini'}</p>
            <p>Slot ID: {slotId || 'Non défini'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} style={style} ref={adRef}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={clientId}
        data-ad-slot={slotId}
        data-ad-format={format}
        data-full-width-responsive={responsive ? "true" : "false"}
      />
      
      {!adLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
          <div className="text-center space-y-2">
            <div className="w-6 h-6 mx-auto border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-gray-500">Chargement publicité...</p>
          </div>
        </div>
      )}
    </div>
  );
}

// Composant de notification toast moderne
function NotificationToast({ 
  show, 
  message, 
  type = 'success',
  onClose 
}: {
  show: boolean;
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  onClose: () => void;
}) {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(onClose, 4000);
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  if (!show) return null;

  const bgColors = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
    warning: 'bg-yellow-500'
  };

  const icons = {
    success: '✅',
    error: '❌',
    info: 'ℹ️',
    warning: '⚠️'
  };

  return (
    <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 duration-300">
      <div className={`${bgColors[type]} text-white px-6 py-4 rounded-xl shadow-2xl max-w-sm`}>
        <div className="flex items-center space-x-3">
          <span className="text-lg">{icons[type]}</span>
          <p className="font-medium text-sm leading-relaxed">{message}</p>
          <button
            onClick={onClose}
            className="ml-auto w-6 h-6 rounded-full hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

// Composant de chargement moderne
function LoadingSpinner({ size = 'md', text }: { size?: 'sm' | 'md' | 'lg'; text?: string }) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-3">
      <div className={`${sizes[size]} border-3 border-blue-500 border-t-transparent rounded-full animate-spin`}></div>
      {text && (
        <p className="text-sm text-gray-600 animate-pulse">{text}</p>
      )}
    </div>
  );
}

// Composant d'état vide moderne
function EmptyState({ 
  icon, 
  title, 
  description, 
  actionLabel, 
  onAction 
}: {
  icon: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="text-center py-16 px-4">
      <div className="text-6xl mb-4">{icon}</div>
      <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">
        {title}
      </h3>
      <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
        {description}
      </p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors font-medium"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

// Composant de badge moderne
function ModernBadge({ 
  children, 
  variant = 'default',
  size = 'md'
}: {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md' | 'lg';
}) {
  const variants = {
    default: 'bg-gray-100 text-gray-800 border-gray-200',
    success: 'bg-green-100 text-green-800 border-green-200',
    warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    error: 'bg-red-100 text-red-800 border-red-200',
    info: 'bg-blue-100 text-blue-800 border-blue-200'
  };

  const sizes = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  return (
    <span className={`
      inline-flex items-center font-medium rounded-full border
      ${variants[variant]} ${sizes[size]}
    `}>
      {children}
    </span>
  );
}

// Composant de modal moderne réutilisable
function ModernModal({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  maxWidth = 'md',
  showCloseButton = true 
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  showCloseButton?: boolean;
}) {
  const maxWidths = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    '2xl': 'max-w-6xl'
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />
        
        {/* Modal */}
        <div className={`
          relative w-full ${maxWidths[maxWidth]} bg-white dark:bg-gray-800 
          rounded-2xl shadow-2xl transform transition-all
        `}>
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              {title}
            </h3>
            {showCloseButton && (
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            )}
          </div>
          
          {/* Content */}
          <div className="p-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

// Hook pour détecter la taille d'écran
function useScreenSize() {
  const [screenSize, setScreenSize] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');

  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setScreenSize('mobile');
      } else if (width < 1024) {
        setScreenSize('tablet');
      } else {
        setScreenSize('desktop');
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  return screenSize;
}

// Hook pour les interactions tactiles
function useTouchGestures(element: React.RefObject<HTMLElement>) {
  const [gesture, setGesture] = useState<{
    isSwipping: boolean;
    direction: 'left' | 'right' | 'up' | 'down' | null;
  }>({
    isSwipping: false,
    direction: null
  });

  useEffect(() => {
    const el = element.current;
    if (!el) return;

    let startX = 0;
    let startY = 0;
    let endX = 0;
    let endY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      setGesture({ isSwipping: true, direction: null });
    };

    const handleTouchMove = (e: TouchEvent) => {
      endX = e.touches[0].clientX;
      endY = e.touches[0].clientY;
    };

    const handleTouchEnd = () => {
      if (!gesture.isSwipping) return;

      const deltaX = endX - startX;
      const deltaY = endY - startY;
      const absDeltaX = Math.abs(deltaX);
      const absDeltaY = Math.abs(deltaY);

      let direction: 'left' | 'right' | 'up' | 'down' | null = null;

      if (absDeltaX > absDeltaY && absDeltaX > 50) {
        direction = deltaX > 0 ? 'right' : 'left';
      } else if (absDeltaY > 50) {
        direction = deltaY > 0 ? 'down' : 'up';
      }

      setGesture({ isSwipping: false, direction });
      
      // Reset direction après un délai
      setTimeout(() => {
        setGesture(prev => ({ ...prev, direction: null }));
      }, 300);
    };

    el.addEventListener('touchstart', handleTouchStart);
    el.addEventListener('touchmove', handleTouchMove);
    el.addEventListener('touchend', handleTouchEnd);

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [element, gesture.isSwipping]);

  return gesture;
}
// ==========================================
// SECTION 7 : PARTIE 3 - FONCTIONS UTILITAIRES & GAMIFICATION
// ==========================================

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

// Fonctions utilitaires pour les valeurs
const hasValue = (value: string | undefined): boolean => {
  return value !== undefined && value.trim() !== '';
};

const hasPriceValue = (price: string | undefined): boolean => {
  if (!price || price.trim() === '') return false;
  const numericPrice = parseFloat(price.replace(',', '.'));
  return numericPrice > 0;
};

// Fonctions de formatage
const formatPrice = (price: string | number, currency = 'CAD'): string => {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  return new Intl.NumberFormat('fr-CA', {
    style: 'currency',
    currency: currency === 'CAD' ? 'CAD' : 'USD'
  }).format(numPrice);
};

const formatDate = (timestamp: string, language: 'fr' | 'en' = 'fr'): string => {
  const date = new Date(timestamp);
  return language === 'fr' 
    ? date.toLocaleDateString('fr-FR', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : date.toLocaleDateString('en-US', { 
        month: 'short',
        day: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
};

// Système de gamification moderne
class GamificationSystem {
  private static instance: GamificationSystem;
  private listeners: Set<(data: UserGameification) => void> = new Set();

  static getInstance(): GamificationSystem {
    if (!GamificationSystem.instance) {
      GamificationSystem.instance = new GamificationSystem();
    }
    return GamificationSystem.instance;
  }

  private notifyListeners(data: UserGameification) {
    this.listeners.forEach(listener => listener(data));
  }

  subscribe(listener: (data: UserGameification) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  addPoints(points: number, reason: string, language: 'fr' | 'en' = 'fr'): UserGameification {
    const current = this.getCurrentData();
    const newExp = current.experience + points;
    const newLevel = Math.floor(newExp / 100) + 1;
    const leveledUp = newLevel > current.level;

    const updated: UserGameification = {
      ...current,
      experience: newExp,
      level: newLevel,
      pointsBalance: current.pointsBalance + points
    };

    // Badges automatiques basés sur les points
    if (newExp >= 50 && !current.badges.some(b => b.id === 'explorer')) {
      updated.badges.push({
        id: 'explorer',
        name: language === 'fr' ? 'Explorateur' : 'Explorer',
        description: language === 'fr' ? 'Premier pas dans l\'univers CERDIA' : 'First steps in CERDIA universe',
        unlockedAt: new Date().toISOString(),
        rarity: 'common'
      });
    }

    if (newExp >= 150 && !current.badges.some(b => b.id === 'trendsetter')) {
      updated.badges.push({
        id: 'trendsetter',
        name: language === 'fr' ? 'Trendsetter' : 'Trendsetter',
        description: language === 'fr' ? 'Toujours à la pointe des tendances' : 'Always on top of trends',
        unlockedAt: new Date().toISOString(),
        rarity: 'rare'
      });
    }

    if (newExp >= 300 && !current.badges.some(b => b.id === 'loyal')) {
      updated.badges.push({
        id: 'loyal',
        name: language === 'fr' ? 'Fidèle' : 'Loyal',
        description: language === 'fr' ? 'Membre dévoué de la communauté' : 'Devoted community member',
        unlockedAt: new Date().toISOString(),
        rarity: 'epic'
      });
    }

    // Mise à jour du tier
    if (newExp >= 500) updated.tier = 'diamond';
    else if (newExp >= 300) updated.tier = 'platinum';
    else if (newExp >= 150) updated.tier = 'gold';
    else if (newExp >= 50) updated.tier = 'silver';

    this.saveData(updated);
    this.notifyListeners(updated);

    // Notification de level up seulement si points > 0
    if (points > 0) {
      if (leveledUp) {
        this.showNotification(
          language === 'fr' 
            ? `🎉 Niveau ${newLevel} atteint ! +${points} points`
            : `🎉 Level ${newLevel} reached! +${points} points`,
          'success'
        );
      } else if (reason) {
        this.showNotification(reason, 'success');
      }
    }

    return updated;
  }

  addBadge(badgeId: string, language: 'fr' | 'en' = 'fr'): UserGameification {
    const current = this.getCurrentData();
    
    if (current.badges.some(b => b.id === badgeId)) {
      return current; // Badge déjà possédé
    }

    const badgeDefinitions = {
      firstVisit: {
        name: language === 'fr' ? 'Première visite' : 'First visit',
        description: language === 'fr' ? 'Bienvenue dans l\'univers CERDIA !' : 'Welcome to CERDIA universe!',
        rarity: 'common' as const
      },
      explorer: {
        name: language === 'fr' ? 'Explorateur' : 'Explorer',
        description: language === 'fr' ? 'A découvert plusieurs produits' : 'Discovered multiple products',
        rarity: 'common' as const
      },
      trendsetter: {
        name: language === 'fr' ? 'Trendsetter' : 'Trendsetter',
        description: language === 'fr' ? 'Toujours à la pointe' : 'Always on trend',
        rarity: 'rare' as const
      },
      loyal: {
        name: language === 'fr' ? 'Fidèle' : 'Loyal',
        description: language === 'fr' ? 'Membre dévoué' : 'Devoted member',
        rarity: 'epic' as const
      }
    };

    const badgeInfo = badgeDefinitions[badgeId as keyof typeof badgeDefinitions];
    if (!badgeInfo) return current;

    const newBadge = {
      id: badgeId,
      name: badgeInfo.name,
      description: badgeInfo.description,
      unlockedAt: new Date().toISOString(),
      rarity: badgeInfo.rarity
    };

    const updated: UserGameification = {
      ...current,
      badges: [...current.badges, newBadge]
    };

    this.saveData(updated);
    this.notifyListeners(updated);

    this.showNotification(
      language === 'fr' 
        ? `🏆 Nouveau badge: ${badgeInfo.name}`
        : `🏆 New badge: ${badgeInfo.name}`,
      'success'
    );

    return updated;
  }

  updateStreak(): UserGameification {
    const current = this.getCurrentData();
    const today = new Date().toDateString();
    const lastActivity = current.streak.lastActivity ? new Date(current.streak.lastActivity).toDateString() : '';
    
    let newStreak = current.streak.current;
    
    if (lastActivity === today) {
      // Déjà compté aujourd'hui
      return current;
    }
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (lastActivity === yesterday.toDateString()) {
      // Streak continue
      newStreak += 1;
    } else {
      // Streak cassée
      newStreak = 1;
    }

    const updated: UserGameification = {
      ...current,
      streak: {
        current: newStreak,
        longest: Math.max(newStreak, current.streak.longest),
        lastActivity: new Date().toISOString()
      }
    };

    this.saveData(updated);
    this.notifyListeners(updated);

    return updated;
  }

  private getCurrentData(): UserGameification {
    try {
      const saved = localStorage.getItem('cerdiaGamification');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error('Erreur chargement gamification:', error);
    }

    return {
      level: 1,
      experience: 0,
      badges: [],
      streak: { current: 0, longest: 0, lastActivity: '' },
      referrals: 0,
      totalSpent: 0,
      pointsBalance: 0,
      tier: 'bronze'
    };
  }

  private saveData(data: UserGameification) {
    try {
      localStorage.setItem('cerdiaGamification', JSON.stringify(data));
    } catch (error) {
      console.error('Erreur sauvegarde gamification:', error);
    }
  }

  private showNotification(message: string, type: 'success' | 'error' | 'info' = 'success') {
    // Cette fonction sera connectée au système de notifications global
    try {
      const event = new CustomEvent('showNotification', {
        detail: { message, type }
      });
      window.dispatchEvent(event);
    } catch (error) {
      console.error('Erreur notification:', error);
    }
  }

  getTierColor(tier: string): string {
    const colors = {
      bronze: 'text-amber-600',
      silver: 'text-gray-500',
      gold: 'text-yellow-500',
      platinum: 'text-purple-500',
      diamond: 'text-blue-500'
    };
    return colors[tier as keyof typeof colors] || colors.bronze;
  }

  getTierIcon(tier: string): string {
    const icons = {
      bronze: '🥉',
      silver: '🥈',
      gold: '🥇',
      platinum: '💎',
      diamond: '💠'
    };
    return icons[tier as keyof typeof icons] || icons.bronze;
  }

  getRarityColor(rarity: string): string {
    const colors = {
      common: 'bg-gray-100 text-gray-800 border-gray-200',
      rare: 'bg-blue-100 text-blue-800 border-blue-200',
      epic: 'bg-purple-100 text-purple-800 border-purple-200',
      legendary: 'bg-orange-100 text-orange-800 border-orange-200'
    };
    return colors[rarity as keyof typeof colors] || colors.common;
  }
}

// Hook pour utiliser le système de gamification
function useGamification(language: 'fr' | 'en' = 'fr') {
  const [data, setData] = useState<UserGameification>(() => {
    // Utilisation de données par défaut au lieu d'appeler getCurrentData
    return {
      level: 1,
      experience: 0,
      badges: [],
      streak: { current: 0, longest: 0, lastActivity: '' },
      referrals: 0,
      totalSpent: 0,
      pointsBalance: 0,
      tier: 'bronze'
    };
  });

  const gamification = useMemo(() => GamificationSystem.getInstance(), []);

  useEffect(() => {
    const unsubscribe = gamification.subscribe(setData);
    
    // Charger les données initiales en appelant addPoints avec 0 pour déclencher la lecture
    gamification.addPoints(0, '', language);
    
    // Retourner une fonction de nettoyage qui ne retourne rien
    return () => {
      unsubscribe();
    };
  }, [gamification, language]);

  const addPoints = useCallback((points: number, reason: string) => {
    return gamification.addPoints(points, reason, language);
  }, [gamification, language]);

  const addBadge = useCallback((badgeId: string) => {
    return gamification.addBadge(badgeId, language);
  }, [gamification, language]);

  const updateStreak = useCallback(() => {
    return gamification.updateStreak();
  }, [gamification]);

  return {
    data,
    addPoints,
    addBadge,
    updateStreak,
    getTierColor: gamification.getTierColor,
    getTierIcon: gamification.getTierIcon,
    getRarityColor: gamification.getRarityColor
  };
}

// Système de simulation de trafic moderne
class TrafficSimulator {
  private static instance: TrafficSimulator;
  private listeners: Set<(data: { pageViews: number; onlineUsers: number; recentActivity: string[] }) => void> = new Set();
  private intervalId: NodeJS.Timeout | null = null;

  static getInstance(): TrafficSimulator {
    if (!TrafficSimulator.instance) {
      TrafficSimulator.instance = new TrafficSimulator();
    }
    return TrafficSimulator.instance;
  }

  subscribe(listener: (data: { pageViews: number; onlineUsers: number; recentActivity: string[] }) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  start(language: 'fr' | 'en' = 'fr') {
    if (this.intervalId) return;

    const activities = language === 'fr' ? [
      "Marie a obtenu un lien Sitestripe",
      "Jean a ajouté un produit aux favoris", 
      "Sophie a partagé une formation",
      "Alex a découvert son style",
      "Emma a gagné un badge",
      "Pierre a complété le quiz",
      "Lisa a demandé un mentoring",
      "Thomas a acheté le pack débutant",
      "Sarah a rejoint la communauté",
      "Marc a téléchargé le guide"
    ] : [
      "Marie got a Sitestripe link",
      "Jean added a product to favorites",
      "Sophie shared a training",
      "Alex discovered their style",
      "Emma earned a badge",
      "Pierre completed the quiz",
      "Lisa requested mentoring",
      "Thomas bought the beginner pack",
      "Sarah joined the community",
      "Marc downloaded the guide"
    ];

    let currentActivity: string[] = [];
    let pageViews = 1247 + Math.floor(Math.random() * 100);
    let onlineUsers = 5 + Math.floor(Math.random() * 15);

    this.intervalId = setInterval(() => {
      // Mise à jour des vues
      pageViews += Math.floor(Math.random() * 3);
      
      // Mise à jour des utilisateurs en ligne
      onlineUsers = Math.max(3, onlineUsers + Math.floor(Math.random() * 5) - 2);
      
      // Nouvelle activité aléatoire
      if (Math.random() > 0.6) {
        const randomActivity = activities[Math.floor(Math.random() * activities.length)];
        const timestamp = new Date().toLocaleTimeString();
        currentActivity = [`${timestamp} - ${randomActivity}`, ...currentActivity.slice(0, 9)];
      }

      this.listeners.forEach(listener => 
        listener({ pageViews, onlineUsers, recentActivity: currentActivity })
      );
    }, 30000); // Mise à jour toutes les 30 secondes
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

// Hook pour utiliser le simulateur de trafic
function useTrafficSimulator(language: 'fr' | 'en' = 'fr') {
  const [data, setData] = useState({
    pageViews: 1247,
    onlineUsers: 8,
    recentActivity: [] as string[]
  });

  const simulator = useMemo(() => TrafficSimulator.getInstance(), []);

  useEffect(() => {
    const unsubscribe = simulator.subscribe(setData);
    simulator.start(language);
    
    return () => {
      unsubscribe();
      simulator.stop();
    };
  }, [simulator, language]);

  return data;
}
// ==========================================
// SECTION 7 : PARTIE 4 - GESTION DES DONNÉES & HOOKS PRINCIPAUX
// ==========================================

// Hook principal pour la gestion de l'état de l'application
function useAppState() {
  const [language, setLanguage] = useLocalStorage<'fr' | 'en'>('cerdia_language', 'fr');
  const [darkMode, setDarkMode] = useLocalStorage<boolean>('cerdia_dark_mode', false);
  const [viewMode, setViewMode] = useLocalStorage<'grid' | 'masonry'>('cerdia_view_mode', 'masonry');

  const t = useCallback((key: keyof typeof translations.fr): string => {
    return translations[language][key] || key;
  }, [language]);

  const toggleDarkMode = useCallback(() => {
    setDarkMode(prev => !prev);
  }, [setDarkMode]);

  return {
    language,
    setLanguage,
    darkMode,
    setDarkMode,
    toggleDarkMode,
    viewMode,
    setViewMode,
    t
  };
}

// Service de gestion des produits Supabase optimisé
class ProductService {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_DURATION = 300000; // 5 minutes

  async fetchProducts(): Promise<Product[]> {
    const cacheKey = 'all_products';
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    try {
      const { data, error } = await supabase.from('products').select('*');
      
      if (error) throw error;
      
      const cleaned = data?.map((p) => {
        let productCategories: string[] = [];
        
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
          // Ajout de données simulées pour l'expérience
          rating: 4.2 + Math.random() * 0.8,
          reviewCount: Math.floor(Math.random() * 500) + 50,
          aiScore: Math.floor(Math.random() * 20) + 80,
          isNew: Math.random() > 0.7,
          isPopular: Math.random() > 0.6,
          features: this.generateFeatures(),
          affiliateLink: p.amazonca || p.amazoncom || '#',
          discount: Math.random() > 0.5 ? Math.floor(Math.random() * 30) + 10 : undefined,
          originalPrice: Math.random() > 0.5 ? (parseFloat(p.price_ca || '0') * 1.3).toString() : undefined
        } as Product;
      }) || [];

      this.cache.set(cacheKey, { data: cleaned, timestamp: Date.now() });
      return cleaned;
    } catch (error) {
      console.error('Erreur lors du chargement des produits:', error);
      return this.getMockProducts(); // Fallback vers des données de démonstration
    }
  }

  private generateFeatures(): string[] {
    const allFeatures = [
      'Accès à vie', 'Support 24/7', 'Garantie 30 jours', 'Mises à jour gratuites',
      'Communauté privée', 'Certificat inclus', 'Contenu HD', 'Mobile friendly',
      'Export PDF', 'API incluse', 'Analyses détaillées', 'Interface moderne'
    ];
    
    const count = Math.floor(Math.random() * 4) + 2;
    return allFeatures.sort(() => 0.5 - Math.random()).slice(0, count);
  }

  private getMockProducts(): Product[] {
    return [
      {
        id: 1,
        name: "Formation CERDIA Pro 2025 - Master Class IA",
        description: "Formation complète 60+ heures pour maîtriser l'investissement avec l'IA. Communauté VIP 3000+ membres actifs, mentoring personnalisé et outils exclusifs.",
        images: [
          "/api/placeholder/400/600?text=Formation+Master+Class",
          "/api/placeholder/400/600?text=Certificat+Pro",
          "/api/placeholder/400/600?text=Communauté+VIP"
        ],
        categories: ["Formation", "IA", "Investissement"],
        priceCa: "497",
        priceUs: "397",
        amazonCa: "https://amazon.ca/dp/CERDIA-FORMATION-PRO",
        amazonCom: "https://amazon.com/dp/CERDIA-FORMATION-PRO",
        tiktokUrl: "https://tiktok.com/@cerdia/formation-pro",
        rating: 4.9,
        reviewCount: 1847,
        aiScore: 98,
        isNew: true,
        isPopular: true,
        features: ["60+ heures HD", "Communauté VIP", "Mentoring 1-on-1", "Certificat officiel"],
        affiliateLink: "https://cerdia.com/formation-pro-2025",
        discount: 30,
        originalPrice: "697",
        createdAt: new Date().toISOString()
      },
      {
        id: 2,
        name: "Guide 'IA & Investissement 2025' - Édition Premium",
        description: "Le guide de référence 400+ pages sur l'investissement intelligent. Stratégies exclusives, cas d'études réels et bonus digitaux premium.",
        images: [
          "/api/placeholder/400/600?text=Guide+IA+Premium",
          "/api/placeholder/400/600?text=400+Pages"
        ],
        categories: ["Livre", "Guide"],
        priceCa: "67",
        priceUs: "47",
        amazonCa: "https://amazon.ca/dp/CERDIA-GUIDE-IA-2025",
        rating: 4.8,
        reviewCount: 1234,
        aiScore: 96,
        isPopular: true,
        features: ["400+ pages", "Stratégies exclusives", "Bonus digital"],
        affiliateLink: "https://cerdia.com/guide-ia-premium",
        createdAt: new Date(Date.now() - 86400000).toISOString()
      }
    ];
  }

  async saveProduct(product: Partial<Product>, editId?: number): Promise<boolean> {
    try {
      const filteredImages = (product.images || []).filter(img => img.trim() !== '');
      
      const normalizedCategories = (product.categories || [])
        .map(cat => normalizeCategory(cleanCategory(cat)))
        .filter(cat => cat && cat.trim() !== '')
        .filter((cat, index, arr) => arr.indexOf(cat) === index);
      
      const productToInsert: any = {
        name: product.name,
        description: product.description,
        categories: normalizedCategories.length > 0 ? normalizedCategories : null,
      };

      if (product.amazonCa?.trim()) productToInsert.amazonca = product.amazonCa;
      if (product.amazonCom?.trim()) productToInsert.amazoncom = product.amazonCom;
      if (product.tiktokUrl?.trim()) productToInsert.tiktokurl = product.tiktokUrl;
      if (hasPriceValue(product.priceCa)) productToInsert.price_ca = parseFloat(product.priceCa!.replace(',', '.'));
      if (hasPriceValue(product.priceUs)) productToInsert.price_us = parseFloat(product.priceUs!.replace(',', '.'));

      for (let i = 0; i < Math.min(filteredImages.length, 5); i++) {
        productToInsert[`image${i + 1}`] = filteredImages[i];
      }

      if (editId) {
        const { error } = await supabase.from('products').update(productToInsert).eq('id', editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('products').insert([productToInsert]);
        if (error) throw error;
      }

      this.clearCache();
      return true;
    } catch (error) {
      console.error('Erreur sauvegarde produit:', error);
      return false;
    }
  }

  async deleteProduct(id: number): Promise<boolean> {
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      
      this.clearCache();
      return true;
    } catch (error) {
      console.error('Erreur suppression produit:', error);
      return false;
    }
  }

  clearCache() {
    this.cache.clear();
  }
}

// Hook pour la gestion des produits
function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortFilter, setSortFilter] = useState('newest');

  const productService = useMemo(() => new ProductService(), []);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await productService.fetchProducts();
      setProducts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [productService]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Filtrage et tri des produits
  const filteredAndSortedProducts = useMemo(() => {
    let filtered = products;

    // Filtre par recherche
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(search) ||
        product.description.toLowerCase().includes(search) ||
        product.categories.some(cat => cat.toLowerCase().includes(search))
      );
    }

    // Filtre par catégorie
    if (categoryFilter && categoryFilter !== '') {
      const filterInFrench = translateCategory(categoryFilter, 'fr');
      filtered = filtered.filter(product => {
        return product.categories.some(productCat => {
          const cleanProductCat = cleanCategory(productCat);
          return cleanProductCat === filterInFrench;
        });
      });
    }

    // Tri
    switch (sortFilter) {
      case 'priceLowHigh':
        filtered.sort((a, b) => {
          const priceA = parseFloat(a.priceCa || a.priceUs || '0');
          const priceB = parseFloat(b.priceCa || b.priceUs || '0');
          return priceA - priceB;
        });
        break;
      case 'priceHighLow':
        filtered.sort((a, b) => {
          const priceA = parseFloat(a.priceCa || a.priceUs || '0');
          const priceB = parseFloat(b.priceCa || b.priceUs || '0');
          return priceB - priceA;
        });
        break;
      case 'rating':
        filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'popular':
        filtered.sort((a, b) => {
          if (b.isPopular && !a.isPopular) return 1;
          if (a.isPopular && !b.isPopular) return -1;
          return (b.reviewCount || 0) - (a.reviewCount || 0);
        });
        break;
      case 'newest':
      default:
        filtered.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        break;
    }

    return filtered;
  }, [products, searchTerm, categoryFilter, sortFilter]);

  // Catégories disponibles
  const availableCategories = useMemo(() => {
    const { language } = useAppState();
    const defaultCats = DEFAULT_CATEGORIES[language];
    
    const productCategories = new Set<string>();
    products.forEach(product => {
      if (Array.isArray(product.categories)) {
        product.categories.forEach(cat => {
          const cleanCat = cleanCategory(cat);
          if (cleanCat && cleanCat.trim() !== '') {
            const translatedCat = translateCategory(cleanCat, language);
            if (translatedCat) {
              productCategories.add(translatedCat);
            }
          }
        });
      }
    });
    
    const allCategories = new Set([
      ...defaultCats,
      ...Array.from(productCategories)
    ]);
    
    return Array.from(allCategories).sort();
  }, [products]);

  const refreshProducts = useCallback(() => {
    productService.clearCache();
    loadProducts();
  }, [productService, loadProducts]);

  return {
    products: filteredAndSortedProducts,
    allProducts: products,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    categoryFilter,
    setCategoryFilter,
    sortFilter,
    setSortFilter,
    availableCategories,
    refreshProducts,
    productService
  };
}

// Hook pour la gestion des favoris
function useFavorites() {
  const [favorites, setFavorites] = useLocalStorage<Set<number>>('cerdia_favorites', new Set());
  const { addPoints } = useGamification();

  const toggleFavorite = useCallback((productId: number) => {
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(productId)) {
        newFavorites.delete(productId);
      } else {
        newFavorites.add(productId);
        addPoints(5, '+5 points pour ce favori !');
      }
      return newFavorites;
    });
  }, [setFavorites, addPoints]);

  const isFavorite = useCallback((productId: number) => {
    return favorites.has(productId);
  }, [favorites]);

  return {
    favorites,
    toggleFavorite,
    isFavorite,
    favoriteCount: favorites.size
  };
}

// Hook pour la gestion des notifications
function useNotifications() {
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
    timestamp: number;
  }>>([]);

  const addNotification = useCallback((message: string, type: 'success' | 'error' | 'info' | 'warning' = 'success') => {
    const id = Math.random().toString(36).substr(2, 9);
    const notification = {
      id,
      message,
      type,
      timestamp: Date.now()
    };
    
    setNotifications(prev => [notification, ...prev.slice(0, 4)]); // Garde seulement les 5 dernières

    // Auto-suppression après 4 secondes
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 4000);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  // Écoute les événements de notification globaux
  useEffect(() => {
    const handleGlobalNotification = (event: CustomEvent) => {
      const { message, type } = event.detail;
      addNotification(message, type);
    };

    window.addEventListener('showNotification', handleGlobalNotification as EventListener);
    return () => window.removeEventListener('showNotification', handleGlobalNotification as EventListener);
  }, [addNotification]);

  return {
    notifications,
    addNotification,
    removeNotification
  };
}

// Hook pour la gestion des publicités
function useAdvertisements() {
  const [advertisements, setAdvertisements] = useLocalStorage<Advertisement[]>('cerdia_advertisements', []);

  const addAdvertisement = useCallback((ad: Omit<Advertisement, 'id' | 'createdAt'>) => {
    const newAd: Advertisement = {
      ...ad,
      id: Date.now(),
      createdAt: new Date().toISOString()
    };
    setAdvertisements(prev => [...prev, newAd]);
  }, [setAdvertisements]);

  const updateAdvertisement = useCallback((id: number, updates: Partial<Advertisement>) => {
    setAdvertisements(prev => prev.map(ad => ad.id === id ? { ...ad, ...updates } : ad));
  }, [setAdvertisements]);

  const deleteAdvertisement = useCallback((id: number) => {
    setAdvertisements(prev => prev.filter(ad => ad.id !== id));
  }, [setAdvertisements]);

  const getActiveAdvertisements = useCallback(() => {
    return advertisements.filter(ad => ad.isActive);
  }, [advertisements]);

  const getRandomAd = useCallback(() => {
    const activeAds = getActiveAdvertisements();
    if (activeAds.length === 0) return null;
    return activeAds[Math.floor(Math.random() * activeAds.length)];
  }, [getActiveAdvertisements]);

  return {
    advertisements,
    addAdvertisement,
    updateAdvertisement,
    deleteAdvertisement,
    getActiveAdvertisements,
    getRandomAd
  };
}

// Hook pour la gestion AdSense
function useAdSense() {
  const [adsenseConfigs, setAdsenseConfigs] = useLocalStorage<AdSenseConfig[]>('cerdia_adsense', []);

  const addAdSenseConfig = useCallback((config: Omit<AdSenseConfig, 'id' | 'createdAt'>) => {
    const newConfig: AdSenseConfig = {
      ...config,
      id: Date.now(),
      createdAt: new Date().toISOString()
    };
    setAdsenseConfigs(prev => [...prev, newConfig]);
  }, [setAdsenseConfigs]);

  const updateAdSenseConfig = useCallback((id: number, updates: Partial<AdSenseConfig>) => {
    setAdsenseConfigs(prev => prev.map(config => config.id === id ? { ...config, ...updates } : config));
  }, [setAdsenseConfigs]);

  const deleteAdSenseConfig = useCallback((id: number) => {
    setAdsenseConfigs(prev => prev.filter(config => config.id !== id));
  }, [setAdsenseConfigs]);

  const getAdSenseConfigByPosition = useCallback((position: 'top' | 'middle' | 'bottom' | 'sidebar') => {
    const activeConfigs = adsenseConfigs.filter(config => config.isActive && config.position === position);
    if (activeConfigs.length === 0) return null;
    return activeConfigs[Math.floor(Math.random() * activeConfigs.length)];
  }, [adsenseConfigs]);

  const shouldShowAdSenseAd = useCallback((index: number) => {
    const middleConfigs = adsenseConfigs.filter(config => config.isActive && config.position === 'middle');
    if (middleConfigs.length === 0) return false;
    
    const frequency = middleConfigs[0]?.frequency || 7;
    return (index + 1) % frequency === 0;
  }, [adsenseConfigs]);

  return {
    adsenseConfigs,
    addAdSenseConfig,
    updateAdSenseConfig,
    deleteAdSenseConfig,
    getAdSenseConfigByPosition,
    shouldShowAdSenseAd
  };
}
// ==========================================
// SECTION 7 : PARTIE 5 - COMPOSANTS UI MODERNES
// ==========================================

// Composant Header moderne et responsive
function ModernHeader() {
  const { language, setLanguage, darkMode, toggleDarkMode, t } = useAppState();
  const { data: gamificationData } = useGamification(language);
  const trafficData = useTrafficSimulator(language);
  const screenSize = useScreenSize();

  return (
    <header className={`sticky top-0 z-40 backdrop-blur-lg border-b transition-all duration-300 ${
      darkMode 
        ? 'bg-gray-900/80 border-gray-700' 
        : 'bg-white/80 border-gray-200'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo et titre */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">C</span>
              </div>
              <div>
                <h1 className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {screenSize === 'mobile' ? 'CERDIA' : t('title')}
                </h1>
                {screenSize !== 'mobile' && (
                  <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {t('subtitle')}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Stats utilisateur - Desktop/Tablet */}
          {screenSize !== 'mobile' && (
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center space-x-2 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full">
                  <span className={gamificationData.getTierIcon(gamificationData.tier)}>
                    {gamificationData.getTierIcon(gamificationData.tier)}
                  </span>
                  <span className="font-medium">{gamificationData.experience} XP</span>
                </div>
                
                <div className="flex items-center space-x-1 text-green-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>{trafficData.onlineUsers}</span>
                </div>
                
                <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  <Eye className="w-3 h-3 inline mr-1" />
                  {trafficData.pageViews.toLocaleString()}
                </div>
              </div>
            </div>
          )}

          {/* Contrôles - Toujours visibles */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setLanguage(language === 'fr' ? 'en' : 'fr')}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                darkMode 
                  ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              {language === 'fr' ? '🇫🇷' : '🇺🇸'}
            </button>
            
            <button
              onClick={toggleDarkMode}
              className={`p-2 rounded-lg transition-colors ${
                darkMode 
                  ? 'bg-gray-800 hover:bg-gray-700 text-yellow-400' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Stats mobiles */}
        {screenSize === 'mobile' && (
          <div className="pb-3 flex justify-center space-x-4 text-sm">
            <div className="flex items-center space-x-2 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full">
              <span>{gamificationData.getTierIcon(gamificationData.tier)}</span>
              <span className="font-medium">{gamificationData.experience} XP</span>
            </div>
            <div className="flex items-center space-x-1 text-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>{trafficData.onlineUsers} en ligne</span>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

// Composant de navigation/filtres moderne
function ModernNavigation({ 
  showBlog, 
  setShowBlog, 
  showAds, 
  setShowAds, 
  showAdSenseManagement, 
  setShowAdSenseManagement,
  passwordEntered,
  onQuizClick 
}: {
  showBlog: boolean;
  setShowBlog: (show: boolean) => void;
  showAds: boolean;
  setShowAds: (show: boolean) => void;
  showAdSenseManagement: boolean;
  setShowAdSenseManagement: (show: boolean) => void;
  passwordEntered: boolean;
  onQuizClick: () => void;
}) {
  const { darkMode, t } = useAppState();
  const screenSize = useScreenSize();

  const tabs = [
    {
      id: 'products',
      label: t('products'),
      icon: '🛍️',
      active: !showBlog && !showAds && !showAdSenseManagement,
      onClick: () => {
        setShowBlog(false);
        setShowAds(false);
        setShowAdSenseManagement(false);
      }
    },
    {
      id: 'blog',
      label: t('blog'),
      icon: '📝',
      active: showBlog,
      onClick: () => {
        setShowBlog(true);
        setShowAds(false);
        setShowAdSenseManagement(false);
      }
    },
    ...(passwordEntered ? [
      {
        id: 'ads',
        label: t('ads'),
        icon: '📺',
        active: showAds,
        onClick: () => {
          setShowBlog(false);
          setShowAds(true);
          setShowAdSenseManagement(false);
        }
      },
      {
        id: 'adsense',
        label: 'AdSense',
        icon: '💰',
        active: showAdSenseManagement,
        onClick: () => {
          setShowBlog(false);
          setShowAds(false);
          setShowAdSenseManagement(true);
        }
      }
    ] : []),
    {
      id: 'quiz',
      label: screenSize === 'mobile' ? 'Quiz' : t('discoverStyle'),
      icon: '✨',
      active: false,
      onClick: onQuizClick
    }
  ];

  return (
    <nav className={`sticky top-16 z-30 backdrop-blur-lg border-b transition-all duration-300 ${
      darkMode 
        ? 'bg-gray-900/80 border-gray-700' 
        : 'bg-white/80 border-gray-200'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-1 py-3 overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={tab.onClick}
              className={`
                flex items-center space-x-2 px-4 py-2 rounded-xl font-medium transition-all duration-200 whitespace-nowrap
                ${tab.active
                  ? 'bg-blue-500 text-white shadow-lg transform scale-105'
                  : darkMode
                    ? 'text-gray-300 hover:text-white hover:bg-gray-800'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }
              `}
            >
              <span className="text-base">{tab.icon}</span>
              <span className="text-sm">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}

// Composant de barre de recherche et filtres avancés
function SearchAndFilters({ 
  searchTerm, 
  setSearchTerm, 
  categoryFilter, 
  setCategoryFilter, 
  sortFilter, 
  setSortFilter, 
  availableCategories,
  viewMode,
  setViewMode,
  loading,
  onRefresh 
}: {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  categoryFilter: string;
  setCategoryFilter: (category: string) => void;
  sortFilter: string;
  setSortFilter: (sort: string) => void;
  availableCategories: string[];
  viewMode: 'grid' | 'masonry';
  setViewMode: (mode: 'grid' | 'masonry') => void;
  loading: boolean;
  onRefresh: () => void;
}) {
  const { darkMode, t } = useAppState();
  const screenSize = useScreenSize();
  const [showFilters, setShowFilters] = useState(false);

  const debouncedSearch = useMemo(
    () => debounce((term: string) => setSearchTerm(term), 300),
    [setSearchTerm]
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Barre de recherche principale */}
      <div className="flex flex-col lg:flex-row gap-4 items-center mb-6">
        <div className="relative flex-1 max-w-2xl">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder={t('searchProducts')}
            onChange={(e) => debouncedSearch(e.target.value)}
            className={`
              w-full pl-10 pr-4 py-3 rounded-2xl border-2 transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent
              ${darkMode 
                ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400' 
                : 'bg-white border-gray-200 text-gray-900 placeholder-gray-500'
              }
            `}
          />
          {loading && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
        </div>

        {/* Contrôles desktop */}
        {screenSize !== 'mobile' && (
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`
                flex items-center space-x-2 px-4 py-3 rounded-xl border transition-colors
                ${darkMode 
                  ? 'border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700' 
                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                }
              `}
            >
              <Filter className="w-4 h-4" />
              <span className="text-sm">Filtres</span>
            </button>

            <div className={`flex rounded-xl p-1 ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
              <button
                onClick={() => setViewMode('masonry')}
                className={`
                  p-2 rounded-lg transition-colors
                  ${viewMode === 'masonry'
                    ? 'bg-blue-500 text-white'
                    : darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                  }
                `}
                title={t('masonryView')}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`
                  p-2 rounded-lg transition-colors
                  ${viewMode === 'grid'
                    ? 'bg-blue-500 text-white'
                    : darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                  }
                `}
                title={t('gridView')}
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={onRefresh}
              className="p-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors"
              title="Actualiser"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        )}

        {/* Contrôles mobiles */}
        {screenSize === 'mobile' && (
          <div className="flex w-full space-x-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`
                flex-1 flex items-center justify-center space-x-2 py-3 rounded-xl border transition-colors
                ${darkMode 
                  ? 'border-gray-700 bg-gray-800 text-gray-300' 
                  : 'border-gray-200 bg-white text-gray-700'
                }
              `}
            >
              <Filter className="w-4 h-4" />
              <span className="text-sm">Filtres</span>
            </button>
            
            <button
              onClick={() => setViewMode(viewMode === 'grid' ? 'masonry' : 'grid')}
              className="px-4 py-3 bg-blue-500 text-white rounded-xl"
            >
              {viewMode === 'grid' ? <Grid className="w-4 h-4" /> : <List className="w-4 h-4" />}
            </button>
            
            <button
              onClick={onRefresh}
              className="px-4 py-3 bg-gray-500 text-white rounded-xl"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        )}
      </div>

      {/* Filtres avancés */}
      {showFilters && (
        <div className={`
          p-6 rounded-2xl border mb-6 transition-all duration-300
          ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
        `}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Catégorie
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className={`
                  w-full p-3 rounded-xl border transition-colors
                  ${darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                  }
                `}
              >
                <option value="">{t('all')}</option>
                {availableCategories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                {t('sortBy')}
              </label>
              <select
                value={sortFilter}
                onChange={(e) => setSortFilter(e.target.value)}
                className={`
                  w-full p-3 rounded-xl border transition-colors
                  ${darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                  }
                `}
              >
                <option value="newest">{t('newest')}</option>
                <option value="popular">Populaire</option>
                <option value="rating">Mieux noté</option>
                <option value="priceLowHigh">{t('priceLowHigh')}</option>
                <option value="priceHighLow">{t('priceHighLow')}</option>
              </select>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Prix
              </label>
              <select
                className={`
                  w-full p-3 rounded-xl border transition-colors
                  ${darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                  }
                `}
              >
                <option value="">Tous les prix</option>
                <option value="under50">Moins de 50$</option>
                <option value="50to100">50$ - 100$</option>
                <option value="100to200">100$ - 200$</option>
                <option value="over200">Plus de 200$</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end mt-4 space-x-3">
            <button
              onClick={() => {
                setCategoryFilter('');
                setSortFilter('newest');
                setSearchTerm('');
              }}
              className={`
                px-4 py-2 rounded-lg transition-colors
                ${darkMode 
                  ? 'text-gray-400 hover:text-white' 
                  : 'text-gray-600 hover:text-gray-900'
                }
              `}
            >
              Réinitialiser
            </button>
            <button
              onClick={() => setShowFilters(false)}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Appliquer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Composant de carte produit ultra-moderne
function ModernProductCard({ 
  product, 
  isFavorite, 
  onToggleFavorite, 
  onShare, 
  onEdit,
  showAdmin = false,
  viewMode = 'masonry' 
}: {
  product: Product;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onShare: () => void;
  onEdit?: () => void;
  showAdmin?: boolean;
  viewMode?: 'grid' | 'masonry';
}) {
  const { darkMode, t } = useAppState();
  const { addPoints } = useGamification();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  
  const gesture = useTouchGestures(cardRef);
  const images = Array.isArray(product.images) ? product.images : [];
  const hasMultipleImages = images.length > 1;

  // Navigation d'images avec gestes tactiles
  useEffect(() => {
    if (gesture.direction === 'left' && hasMultipleImages) {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    } else if (gesture.direction === 'right' && hasMultipleImages) {
      setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
    }
  }, [gesture.direction, hasMultipleImages, images.length]);

  const handleImageNavigation = (direction: 'prev' | 'next', e: React.MouseEvent) => {
    e.stopPropagation();
    if (direction === 'prev') {
      setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
    } else {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }
  };

  const handleCardClick = () => {
    addPoints(2, '+2 points pour l\'exploration !');
    // Analytics
    window.gtag?.('event', 'product_view', {
      product_id: product.id,
      product_name: product.name,
      value: parseFloat(product.priceCa || '0'),
      currency: 'CAD'
    });
  };

  const handleAffiliateClick = (e: React.MouseEvent, link: string) => {
    e.stopPropagation();
    addPoints(10, '+10 points pour cet achat !');
    window.gtag?.('event', 'affiliate_click', {
      product_id: product.id,
      product_name: product.name,
      affiliate_source: link.includes('amazon') ? 'amazon' : 'direct'
    });
    window.open(link, '_blank', 'noopener,noreferrer');
  };

  const calculateSavings = () => {
    if (!product.originalPrice || !product.discount) return null;
    const original = parseFloat(product.originalPrice);
    const current = parseFloat(product.priceCa!);
    return original - current;
  };

  const cardClassName = `
    group relative overflow-hidden rounded-3xl border-2 transition-all duration-500 cursor-pointer transform-gpu
    ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
    ${isHovered ? 'shadow-2xl scale-105 z-10 border-blue-300' : 'shadow-lg hover:shadow-xl'}
    ${viewMode === 'grid' ? 'h-full' : 'break-inside-avoid mb-4'}
  `;

  return (
    <>
      <div 
        ref={cardRef}
        className={cardClassName}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleCardClick}
      >
        {/* Image Container */}
        <div className={`relative ${viewMode === 'grid' ? 'aspect-[4/5]' : 'aspect-[3/4]'} overflow-hidden`}>
          {images.length > 0 ? (
            <>
              <img
                src={images[currentImageIndex]}
                alt={product.name}
                className={`w-full h-full object-cover transition-all duration-700 ${
                  imageLoaded ? 'opacity-100' : 'opacity-0'
                } ${isHovered ? 'scale-110' : 'scale-100'}`}
                onLoad={() => setImageLoaded(true)}
                onDoubleClick={() => setShowImageModal(true)}
              />
              
              {!imageLoaded && (
                <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 animate-pulse flex items-center justify-center">
                  <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}

              {/* Navigation d'images */}
              {hasMultipleImages && (
                <>
                  <button
                    onClick={(e) => handleImageNavigation('prev', e)}
                    className={`absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center z-20 transition-all ${
                      isHovered ? 'opacity-100' : 'opacity-0'
                    }`}
                  >
                    ‹
                  </button>
                  <button
                    onClick={(e) => handleImageNavigation('next', e)}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center z-20 transition-all ${
                      isHovered ? 'opacity-100' : 'opacity-0'
                    }`}
                  >
                    ›
                  </button>
                  
                  {/* Indicateurs d'images */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
                    {images.map((_, index) => (
                      <button
                        key={index}
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentImageIndex(index);
                        }}
                        className={`w-2 h-2 rounded-full transition-all ${
                          index === currentImageIndex ? 'bg-white scale-125' : 'bg-white/50'
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
              <span className="text-gray-500 text-sm font-medium">{t('noImage')}</span>
            </div>
          )}

          {/* Badges */}
          <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
            {product.isNew && (
              <ModernBadge variant="success" size="sm">
                🆕 NOUVEAU
              </ModernBadge>
            )}
            {product.isPopular && (
              <ModernBadge variant="warning" size="sm">
                🔥 POPULAIRE
              </ModernBadge>
            )}
            {product.discount && (
              <ModernBadge variant="error" size="sm">
                -{product.discount}% OFF
              </ModernBadge>
            )}
            {product.aiScore && product.aiScore >= 95 && (
              <ModernBadge variant="info" size="sm">
                ⭐ IA SCORE
              </ModernBadge>
            )}
          </div>

          {/* Actions */}
          <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite();
              }}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all backdrop-blur-sm ${
                isFavorite 
                  ? 'bg-red-500 text-white scale-110' 
                  : 'bg-white/90 text-gray-600 hover:bg-white'
              }`}
            >
              <Heart size={18} fill={isFavorite ? 'white' : 'none'} />
            </button>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                onShare();
              }}
              className={`w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center transition-all backdrop-blur-sm ${
                isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
              }`}
            >
              <Send size={16} />
            </button>

            {showAdmin && onEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                className={`w-10 h-10 bg-purple-500 text-white rounded-full flex items-center justify-center transition-all backdrop-blur-sm ${
                  isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
                }`}
              >
                <Pencil size={16} />
              </button>
            )}
          </div>

          {/* Overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>

        {/* Contenu */}
        <div className="p-6 space-y-4">
          {/* Titre et description */}
          <div>
            <h3 className={`font-bold text-lg mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors ${
              darkMode ? 'text-white' : 'text-gray-900'
            }`}>
              {product.name}
            </h3>
            <p className={`text-sm line-clamp-3 leading-relaxed ${
              darkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              {product.description}
            </p>
          </div>

          {/* Rating et reviews */}
          {product.rating && (
            <div className="flex items-center gap-3">
              <div className="flex items-center">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${
                      i < Math.floor(product.rating!)
                        ? 'text-yellow-400 fill-current'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm font-medium">{product.rating.toFixed(1)}</span>
              <span className={`text-sm ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                ({product.reviewCount} {t('reviews')})
              </span>
            </div>
          )}

          {/* Prix */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold text-green-600">
                  {formatPrice(product.priceCa!)}
                </span>
                {product.originalPrice && (
                  <span className={`text-lg line-through ${
                    darkMode ? 'text-gray-500' : 'text-gray-400'
                  }`}>
                    {formatPrice(product.originalPrice)}
                  </span>
                )}
              </div>
            </div>
            
            {calculateSavings() && (
              <p className="text-sm text-green-600 font-medium">
                💰 {t('savings')} {formatPrice(calculateSavings()!.toString())}
              </p>
            )}
          </div>

          {/* Fonctionnalités */}
          {product.features && product.features.length > 0 && (
            <div className="space-y-2">
              <h4 className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                {t('features')}:
              </h4>
              <div className="space-y-1">
                {product.features.slice(0, 3).map((feature, index) => (
                  <div key={index} className={`flex items-center text-xs ${
                    darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    <CheckCircle className="w-3 h-3 text-green-500 mr-2 flex-shrink-0" />
                    {feature}
                  </div>
                ))}
                {product.features.length > 3 && (
                  <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    +{product.features.length - 3} autres...
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Catégories */}
          <div className="flex flex-wrap gap-2">
            {product.categories.slice(0, 3).map((category, index) => (
              <ModernBadge key={index} variant="default" size="sm">
                {category}
              </ModernBadge>
            ))}
          </div>

          {/* Actions d'achat */}
          <div className="space-y-3 pt-2">
            <button
              onClick={(e) => handleAffiliateClick(e, product.affiliateLink || '#')}
              className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-2xl hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-105 flex items-center justify-center gap-2 shadow-lg"
            >
              <span>🚀 {t('buyNow')}</span>
            </button>
            
            <div className="flex gap-2">
              {product.amazonCa && (
                <button
                  onClick={(e) => handleAffiliateClick(e, product.amazonCa!)}
                  className="flex-1 px-4 py-2 bg-orange-500 text-white text-sm font-medium rounded-xl hover:bg-orange-600 transition-colors"
                >
                  Amazon.ca
                </button>
              )}
              {product.amazonCom && (
                <button
                  onClick={(e) => handleAffiliateClick(e, product.amazonCom!)}
                  className="flex-1 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition-colors"
                >
                  Amazon.com
                </button>
              )}
              {product.tiktokUrl && (
                <button
                  onClick={(e) => handleAffiliateClick(e, product.tiktokUrl!)}
                  className="flex-1 px-4 py-2 bg-black text-white text-sm font-medium rounded-xl hover:bg-gray-900 transition-colors"
                >
                  TikTok
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal d'image */}
      {showImageModal && (
        <ModernModal
          isOpen={showImageModal}
          onClose={() => setShowImageModal(false)}
          title={product.name}
          maxWidth="2xl"
        >
          <div className="relative">
            <img
              src={images[currentImageIndex]}
              alt={product.name}
              className="w-full max-h-96 object-contain rounded-xl"
            />
            
            {hasMultipleImages && (
              <div className="flex justify-center mt-4 space-x-2">
                {images.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`w-3 h-3 rounded-full transition-all ${
                      index === currentImageIndex 
                        ? 'bg-blue-500 scale-125' 
                        : 'bg-gray-300 hover:bg-gray-400'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </ModernModal>
      )}
    </>
  );
}
// ==========================================
// SECTION 7 : PARTIE 6 - SYSTÈME DE QUIZ & BLOG
// ==========================================

// Composant Quiz de Style Moderne
function StyleQuizModal({ 
  isOpen, 
  onClose 
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { language, darkMode, t } = useAppState();
  const { addPoints, addBadge } = useGamification(language);
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<{ [key: number]: string }>({});
  const [isCompleting, setIsCompleting] = useState(false);

  const quizQuestions = language === 'fr' ? [
    {
      question: "Quel type de contenu vous intéresse le plus ?",
      options: [
        { value: "formations", label: "🎓 Formations en ligne", icon: "🎓" },
        { value: "livres", label: "📚 Livres et guides", icon: "📚" },
        { value: "outils", label: "🛠️ Outils et logiciels", icon: "🛠️" },
        { value: "services", label: "💼 Services personnalisés", icon: "💼" }
      ]
    },
    {
      question: "Quel est votre budget préféré ?",
      options: [
        { value: "budget", label: "💰 Moins de 50$", icon: "💰" },
        { value: "moyen", label: "💎 50$ - 200$", icon: "💎" },
        { value: "premium", label: "👑 200$ - 500$", icon: "👑" },
        { value: "elite", label: "💠 Plus de 500$", icon: "💠" }
      ]
    },
    {
      question: "À quelle fréquence explorez-vous de nouveaux produits ?",
      options: [
        { value: "quotidien", label: "📅 Tous les jours", icon: "📅" },
        { value: "hebdomadaire", label: "📊 Chaque semaine", icon: "📊" },
        { value: "mensuel", label: "📈 Chaque mois", icon: "📈" },
        { value: "occasionnel", label: "🎯 Occasionnellement", icon: "🎯" }
      ]
    },
    {
      question: "Qu'est-ce qui vous motive le plus ?",
      options: [
        { value: "apprentissage", label: "🧠 Apprendre de nouvelles compétences", icon: "🧠" },
        { value: "efficacite", label: "⚡ Améliorer mon efficacité", icon: "⚡" },
        { value: "revenus", label: "💵 Augmenter mes revenus", icon: "💵" },
        { value: "reseau", label: "🤝 Développer mon réseau", icon: "🤝" }
      ]
    }
  ] : [
    {
      question: "What type of content interests you most?",
      options: [
        { value: "formations", label: "🎓 Online training", icon: "🎓" },
        { value: "livres", label: "📚 Books and guides", icon: "📚" },
        { value: "outils", label: "🛠️ Tools and software", icon: "🛠️" },
        { value: "services", label: "💼 Personalized services", icon: "💼" }
      ]
    },
    {
      question: "What's your preferred budget?",
      options: [
        { value: "budget", label: "💰 Under $50", icon: "💰" },
        { value: "moyen", label: "💎 $50 - $200", icon: "💎" },
        { value: "premium", label: "👑 $200 - $500", icon: "👑" },
        { value: "elite", label: "💠 Over $500", icon: "💠" }
      ]
    },
    {
      question: "How often do you explore new products?",
      options: [
        { value: "quotidien", label: "📅 Daily", icon: "📅" },
        { value: "hebdomadaire", label: "📊 Weekly", icon: "📊" },
        { value: "mensuel", label: "📈 Monthly", icon: "📈" },
        { value: "occasionnel", label: "🎯 Occasionally", icon: "🎯" }
      ]
    },
    {
      question: "What motivates you most?",
      options: [
        { value: "apprentissage", label: "🧠 Learning new skills", icon: "🧠" },
        { value: "efficacite", label: "⚡ Improving efficiency", icon: "⚡" },
        { value: "revenus", label: "💵 Increasing income", icon: "💵" },
        { value: "reseau", label: "🤝 Growing network", icon: "🤝" }
      ]
    }
  ];

  const handleAnswer = async (answer: string) => {
    const newAnswers = { ...answers, [currentStep]: answer };
    setAnswers(newAnswers);

    if (currentStep < quizQuestions.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setIsCompleting(true);
      
      // Simulation de traitement
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Attribution des points et badges
      addPoints(25, language === 'fr' ? '+25 points pour le quiz de style !' : '+25 points for style quiz!');
      addBadge('trendsetter');
      
      // Génération des recommandations
      generateRecommendations(newAnswers);
      
      setIsCompleting(false);
      onClose();
      
      // Reset pour le prochain quiz
      setCurrentStep(0);
      setAnswers({});
    }
  };

  const generateRecommendations = (userAnswers: { [key: number]: string }) => {
    // Logique de recommandation basée sur les réponses
    const profile = {
      contentType: userAnswers[0],
      budget: userAnswers[1],
      frequency: userAnswers[2],
      motivation: userAnswers[3]
    };

    console.log('Profil utilisateur généré:', profile);
    
    // Ici on pourrait filtrer les produits et créer des recommandations personnalisées
  };

  const progress = ((currentStep + 1) / quizQuestions.length) * 100;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className={`
          relative w-full max-w-2xl rounded-3xl shadow-2xl transform transition-all
          ${darkMode ? 'bg-gray-800' : 'bg-white'}
        `}>
          {/* Header avec progression */}
          <div className="p-8 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                ✨ {t('styleQuiz')}
              </h2>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </div>
            
            {/* Barre de progression */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                  Question {currentStep + 1} sur {quizQuestions.length}
                </span>
                <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                  {Math.round(progress)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>

          {/* Contenu du quiz */}
          <div className="p-8">
            {isCompleting ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
                <h3 className={`text-xl font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {language === 'fr' ? 'Analyse de votre profil...' : 'Analyzing your profile...'}
                </h3>
                <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                  {language === 'fr' ? 'Génération de recommandations personnalisées' : 'Generating personalized recommendations'}
                </p>
              </div>
            ) : (
              <>
                <h3 className={`text-xl font-semibold mb-8 text-center ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {quizQuestions[currentStep].question}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {quizQuestions[currentStep].options.map((option, index) => (
                    <button
                      key={index}
                      onClick={() => handleAnswer(option.value)}
                      className={`
                        group p-6 rounded-2xl border-2 transition-all duration-300 hover:scale-105
                        ${darkMode 
                          ? 'border-gray-700 bg-gray-700 hover:border-blue-500 hover:bg-gray-600' 
                          : 'border-gray-200 bg-gray-50 hover:border-blue-500 hover:bg-blue-50'
                        }
                      `}
                    >
                      <div className="text-center space-y-3">
                        <div className="text-3xl group-hover:scale-110 transition-transform">
                          {option.icon}
                        </div>
                        <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {option.label}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          {!isCompleting && (
            <div className="px-8 pb-8">
              <div className="flex justify-between items-center">
                <button
                  onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                  disabled={currentStep === 0}
                  className={`
                    px-6 py-3 rounded-xl font-medium transition-colors
                    ${currentStep === 0 
                      ? 'opacity-50 cursor-not-allowed' 
                      : darkMode 
                        ? 'bg-gray-700 text-white hover:bg-gray-600' 
                        : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                    }
                  `}
                >
                  {language === 'fr' ? 'Précédent' : 'Previous'}
                </button>
                
                <div className="flex space-x-2">
                  {quizQuestions.map((_, index) => (
                    <div
                      key={index}
                      className={`w-3 h-3 rounded-full transition-all ${
                        index <= currentStep 
                          ? 'bg-blue-500 scale-125' 
                          : 'bg-gray-300'
                      }`}
                    />
                  ))}
                </div>
                
                <div className="w-20"></div> {/* Spacer pour centrer les dots */}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Composant Blog Moderne
function ModernBlogSection() {
  const { language, darkMode, t } = useAppState();
  const { addPoints } = useGamification(language);
  const trafficData = useTrafficSimulator(language);
  const [comments, setComments] = useLocalStorage<any[]>('cerdia_blog_comments', []);
  const [isDragOver, setIsDragOver] = useState(false);
  const [draggedProduct, setDraggedProduct] = useState('');

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    
    const contactData = {
      name: formData.get('name') as string,
      product: formData.get('product') as string,
      message: formData.get('message') as string,
    };
    
    const messengerMessage = language === 'fr' 
      ? `Bonjour! Je suis ${contactData.name}

🛍️ Produit qui m'intéresse: ${contactData.product}
${contactData.message ? `💬 Message: ${contactData.message}` : ''}

Je souhaiterais obtenir mes liens Sitestripe pour ce produit. Merci!`
      : `Hello! I'm ${contactData.name}

🛍️ Product I'm interested in: ${contactData.product}
${contactData.message ? `💬 Message: ${contactData.message}` : ''}

I would like to get my Sitestripe links for this product. Thank you!`;
    
    const messengerURL = `https://m.me/${MESSENGER_PAGE_ID}?text=${encodeURIComponent(messengerMessage)}`;
    window.open(messengerURL, '_blank');
    
    addPoints(20, t('requestSitestripe'));
    
    // Notification de succès
    window.dispatchEvent(new CustomEvent('showNotification', {
      detail: { message: t('requestSent'), type: 'success' }
    }));
    
    form.reset();
  };

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    
    const newComment = {
      id: Date.now(),
      name: formData.get('commentName') as string,
      comment: formData.get('commentText') as string,
      timestamp: new Date().toISOString(),
      language: language,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${formData.get('commentName')}`
    };
    
    const updatedComments = [newComment, ...comments];
    setComments(updatedComments);
    
    addPoints(5, language === 'fr' ? '+5 points pour votre commentaire !' : '+5 points for your comment!');
    
    window.dispatchEvent(new CustomEvent('showNotification', {
      detail: { message: t('commentPosted'), type: 'success' }
    }));
    
    form.reset();
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Stats en haut sur mobile */}
      <div className="lg:hidden mb-8 grid grid-cols-2 gap-4 text-center">
        <div className={`p-4 rounded-2xl ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
          <div className="flex items-center justify-center space-x-2 text-green-600 mb-1">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span className="font-bold text-lg">{trafficData.onlineUsers}</span>
          </div>
          <p className="text-xs text-gray-500">{t('onlineNow')}</p>
        </div>
        <div className={`p-4 rounded-2xl ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
          <div className="flex items-center justify-center space-x-1 mb-1">
            <Eye className="w-4 h-4 text-blue-500" />
            <span className="font-bold text-lg">{trafficData.pageViews.toLocaleString()}</span>
          </div>
          <p className="text-xs text-gray-500">{t('pageViews')}</p>
        </div>
      </div>

      <div className={`rounded-3xl shadow-lg overflow-hidden ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
        {/* Hero Section */}
        <div className="relative bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 p-8 md:p-12 text-white overflow-hidden">
          <div className="absolute inset-0 bg-black/20"></div>
          <div className="relative z-10 text-center max-w-4xl mx-auto">
            <h1 className="text-3xl md:text-5xl font-bold mb-4 leading-tight">
              {t('blogTitle')}
            </h1>
            <p className="text-xl md:text-2xl mb-6 opacity-90">
              {t('blogSubtitle')}
            </p>
            <p className="text-lg opacity-80 leading-relaxed">
              {t('blogContent')}
            </p>
          </div>
          
          {/* Éléments décoratifs */}
          <div className="absolute top-10 left-10 w-20 h-20 bg-white/10 rounded-full animate-pulse"></div>
          <div className="absolute bottom-10 right-10 w-16 h-16 bg-white/10 rounded-full animate-pulse delay-300"></div>
          <div className="absolute top-1/2 right-20 w-12 h-12 bg-white/10 rounded-full animate-pulse delay-700"></div>
        </div>

        <div className="p-8 md:p-12 space-y-12">
          {/* Section Avantages */}
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className={`text-3xl font-bold mb-8 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {t('blogFeatures')}
              </h2>
              <div className="space-y-6">
                {[
                  { icon: '🚀', text: t('feature1') },
                  { icon: '💰', text: t('feature2') },
                  { icon: '🔗', text: t('feature3') },
                  { icon: '📱', text: t('feature4') }
                ].map((feature, index) => (
                  <div key={index} className="flex items-center space-x-4 group">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                      {feature.icon}
                    </div>
                    <p className={`text-lg ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {feature.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Formulaire de contact */}
            <div className={`rounded-2xl p-8 ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <h3 className={`text-2xl font-bold mb-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {t('contactForm')}
              </h3>
              <form onSubmit={handleContactSubmit} className="space-y-6">
                <input 
                  name="name"
                  type="text" 
                  placeholder={t('yourName')} 
                  required
                  className={`
                    w-full border-2 rounded-xl px-4 py-4 font-medium transition-all focus:ring-2 focus:ring-blue-500 focus:border-transparent
                    ${darkMode 
                      ? 'bg-gray-600 border-gray-500 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }
                  `}
                />
                
                {/* Zone de drag & drop pour produits */}
                <div 
                  className={`
                    relative border-2 border-dashed rounded-xl px-4 py-8 transition-all duration-300 text-center
                    ${isDragOver 
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                      : darkMode ? 'border-gray-500 bg-gray-600' : 'border-gray-300 bg-white'
                    }
                  `}
                  onDrop={(e) => {
                    e.preventDefault();
                    const productName = e.dataTransfer.getData('text/plain');
                    setDraggedProduct(productName);
                    const productInput = document.querySelector('input[name="product"]') as HTMLInputElement;
                    if (productInput) {
                      productInput.value = productName;
                    }
                    setIsDragOver(false);
                    addPoints(5, language === 'fr' ? '+5 points pour le drag & drop !' : '+5 points for drag & drop!');
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                >
                  <input 
                    name="product"
                    type="text" 
                    placeholder={t('dragProduct')} 
                    required
                    className={`
                      w-full bg-transparent border-none outline-none text-center font-medium text-lg
                      ${darkMode ? 'text-white placeholder-gray-400' : 'text-gray-900 placeholder-gray-500'}
                    `}
                  />
                  {isDragOver && (
                    <div className="absolute inset-0 flex items-center justify-center bg-blue-50 dark:bg-blue-900/50 rounded-xl">
                      <span className="text-blue-600 font-bold text-lg">{t('dragDropHint')}</span>
                    </div>
                  )}
                  <div className={`text-sm mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    🎯 {language === 'fr' ? 'Glissez un produit ici ou tapez le nom' : 'Drag a product here or type the name'}
                  </div>
                </div>
                
                <textarea 
                  name="message"
                  placeholder={t('message')} 
                  rows={4}
                  className={`
                    w-full border-2 rounded-xl px-4 py-4 font-medium transition-all focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical
                    ${darkMode 
                      ? 'bg-gray-600 border-gray-500 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }
                  `}
                />
                
                <div className="grid grid-cols-4 gap-3">
                  <button 
                    type="submit"
                    className="col-span-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-4 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-105 flex items-center justify-center gap-2 shadow-lg"
                  >
                    💬 {t('sendToMessenger')}
                  </button>
                  <button 
                    type="button"
                    onClick={() => window.open(`https://m.me/${MESSENGER_PAGE_ID}`, '_blank')}
                    className="bg-gray-600 text-white font-bold py-4 rounded-xl hover:bg-gray-700 transition-all"
                    title={t('messengerDirect')}
                  >
                    📱
                  </button>
                </div>
              </form>
              
              <div className="mt-6 text-center">
                <p className={`text-sm mb-3 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {t('messengerDirect')}
                </p>
                <button 
                  onClick={() => window.open(`https://m.me/${MESSENGER_PAGE_ID}`, '_blank')}
                  className="text-blue-600 hover:text-blue-700 font-bold text-sm underline transition-colors"
                >
                  Messenger : Ric CERDIA
                </button>
              </div>
            </div>
          </div>

          {/* Section Commentaires */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-12">
            <h2 className={`text-3xl font-bold mb-8 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              💬 {t('comments')}
            </h2>
            
            {/* Formulaire d'ajout de commentaire */}
            <div className={`rounded-2xl p-8 mb-8 ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <h3 className={`text-xl font-bold mb-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {t('addComment')}
              </h3>
              <form onSubmit={handleCommentSubmit} className="space-y-6">
                <input 
                  name="commentName"
                  type="text" 
                  placeholder={t('yourName')} 
                  required
                  className={`
                    w-full border-2 rounded-xl px-4 py-4 font-medium transition-all focus:ring-2 focus:ring-blue-500 focus:border-transparent
                    ${darkMode 
                      ? 'bg-gray-600 border-gray-500 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }
                  `}
                />
                <textarea 
                  name="commentText"
                  placeholder={t('yourComment')} 
                  rows={4}
                  required
                  className={`
                    w-full border-2 rounded-xl px-4 py-4 font-medium transition-all focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical
                    ${darkMode 
                      ? 'bg-gray-600 border-gray-500 text-white placeholder-gray-400' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }
                  `}
                />
                <button 
                  type="submit"
                  className="bg-blue-600 text-white font-bold py-3 px-8 rounded-xl hover:bg-blue-700 transition-all transform hover:scale-105"
                >
                  {t('postComment')}
                </button>
              </form>
            </div>

            {/* Liste des commentaires */}
            <div className="space-y-6">
              {comments.length === 0 ? (
                <EmptyState
                  icon="💬"
                  title={t('noComments')}
                  description="Partagez votre expérience avec la communauté CERDIA !"
                />
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className={`
                    border rounded-2xl p-6 shadow-sm transition-all hover:shadow-md
                    ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}
                  `}>
                    <div className="flex items-start space-x-4">
                      <img
                        src={comment.avatar}
                        alt={comment.name}
                        className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 p-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h4 className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                              {comment.name}
                            </h4>
                            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              {formatDate(comment.timestamp, language)}
                            </p>
                          </div>
                          <ModernBadge variant="info" size="sm">
                            Vérifié
                          </ModernBadge>
                        </div>
                        <p className={`leading-relaxed ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          {comment.comment}
                        </p>
                        
                        {/* Actions du commentaire */}
                        <div className="flex items-center space-x-4 mt-4">
                          <button className="flex items-center space-x-1 text-sm text-gray-500 hover:text-blue-600 transition-colors">
                            <ThumbsUp className="w-4 h-4" />
                            <span>{Math.floor(Math.random() * 10) + 1}</span>
                          </button>
                          <button className="text-sm text-gray-500 hover:text-blue-600 transition-colors">
                            Répondre
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
// ==========================================
// SECTION 7 : PARTIE 7 - GESTION ADMIN & FORMULAIRES
// ==========================================

// Hook pour la gestion de l'authentification admin
function useAdminAuth() {
  const [passwordEntered, setPasswordEntered] = useState(false);
  const { addNotification } = useNotifications();
  const { t } = useAppState();

  const requestPasswordOnce = useCallback(() => {
    if (passwordEntered) return true;
    
    const password = prompt(t('adminPassword'));
    if (password === PASSWORD) {
      setPasswordEntered(true);
      addNotification('Accès administrateur activé', 'success');
      return true;
    } else {
      addNotification(t('incorrectPassword'), 'error');
      return false;
    }
  }, [passwordEntered, addNotification, t]);

  const handleAdminAction = useCallback((action: () => void) => {
    if (requestPasswordOnce()) {
      action();
    }
  }, [requestPasswordOnce]);

  return {
    passwordEntered,
    requestPasswordOnce,
    handleAdminAction
  };
}

// Composant formulaire de produit moderne
function ProductFormModal({ 
  isOpen, 
  onClose, 
  product, 
  onSave 
}: {
  isOpen: boolean;
  onClose: () => void;
  product?: Product | null;
  onSave: (product: Partial<Product>, editId?: number) => Promise<boolean>;
}) {
  const { darkMode, t } = useAppState();
  const { addNotification } = useNotifications();
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState<Partial<Product>>({
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

  const [availableCategories] = useState([
    'Formation', 'Livre', 'Outil', 'Service', 'Montre', 'Audio', 'Pack'
  ]);

  useEffect(() => {
    if (product) {
      setFormData({
        ...product,
        images: product.images.length > 0 ? [...product.images, ''] : ['']
      });
    } else {
      setFormData({
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
    }
  }, [product, isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, imageIndex?: number) => {
    const { name, value } = e.target;
    
    if (name === 'images' && imageIndex !== undefined) {
      const updatedImages = [...formData.images!];
      while (updatedImages.length <= imageIndex) {
        updatedImages.push('');
      }
      updatedImages[imageIndex] = value;
      setFormData({ ...formData, images: updatedImages });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const addImageField = () => {
    setFormData({ 
      ...formData, 
      images: [...(formData.images || []), ''] 
    });
  };

  const removeImageField = (index: number) => {
    const updatedImages = formData.images!.filter((_, i) => i !== index);
    if (updatedImages.length === 0) {
      updatedImages.push('');
    }
    setFormData({ ...formData, images: updatedImages });
  };

  const handleCategoryToggle = (category: string, checked: boolean) => {
    if (checked) {
      if (!formData.categories!.includes(category)) {
        setFormData({ 
          ...formData, 
          categories: [...(formData.categories || []), category] 
        });
      }
    } else {
      const updatedCategories = formData.categories!.filter(c => c !== category);
      setFormData({ 
        ...formData, 
        categories: updatedCategories 
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const success = await onSave(formData, product?.id);
      if (success) {
        addNotification(
          product ? t('productUpdated') : t('productAdded'), 
          'success'
        );
        onClose();
      } else {
        addNotification(
          product ? t('updateError') : t('addError'), 
          'error'
        );
      }
    } catch (error) {
      addNotification('Une erreur est survenue', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModernModal
      isOpen={isOpen}
      onClose={onClose}
      title={`${product ? t('modify') : t('add')} - Produit`}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Informations de base */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              {t('name')} *
            </label>
            <input 
              name="name" 
              value={formData.name} 
              onChange={handleInputChange} 
              placeholder="Nom du produit" 
              className={`
                w-full border-2 rounded-xl px-4 py-3 font-medium transition-all focus:ring-2 focus:ring-blue-500 focus:border-transparent
                ${darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                }
              `} 
              required 
            />
          </div>

          <div className="md:col-span-2">
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              {t('description')} *
            </label>
            <textarea 
              name="description" 
              value={formData.description} 
              onChange={handleInputChange} 
              placeholder="Description détaillée du produit" 
              rows={4}
              className={`
                w-full border-2 rounded-xl px-4 py-3 font-medium transition-all focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical
                ${darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                }
              `} 
              required 
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Prix CAD
            </label>
            <input 
              name="priceCa" 
              value={formData.priceCa} 
              onChange={handleInputChange} 
              placeholder="0.00" 
              type="number" 
              step="0.01" 
              min="0"
              className={`
                w-full border-2 rounded-xl px-4 py-3 font-medium transition-all focus:ring-2 focus:ring-blue-500 focus:border-transparent
                ${darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                }
              `} 
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Prix USD
            </label>
            <input 
              name="priceUs" 
              value={formData.priceUs} 
              onChange={handleInputChange} 
              placeholder="0.00" 
              type="number" 
              step="0.01" 
              min="0"
              className={`
                w-full border-2 rounded-xl px-4 py-3 font-medium transition-all focus:ring-2 focus:ring-blue-500 focus:border-transparent
                ${darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                }
              `} 
            />
          </div>
        </div>

        {/* Liens */}
        <div className="space-y-4">
          <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Liens d'affiliation
          </h3>
          
          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Amazon.ca
            </label>
            <input 
              name="amazonCa" 
              value={formData.amazonCa} 
              onChange={handleInputChange} 
              placeholder="https://amazon.ca/dp/..." 
              type="url"
              className={`
                w-full border-2 rounded-xl px-4 py-3 font-medium transition-all focus:ring-2 focus:ring-blue-500 focus:border-transparent
                ${darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                }
              `} 
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Amazon.com
            </label>
            <input 
              name="amazonCom" 
              value={formData.amazonCom} 
              onChange={handleInputChange} 
              placeholder="https://amazon.com/dp/..." 
              type="url"
              className={`
                w-full border-2 rounded-xl px-4 py-3 font-medium transition-all focus:ring-2 focus:ring-blue-500 focus:border-transparent
                ${darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                }
              `} 
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              TikTok
            </label>
            <input 
              name="tiktokUrl" 
              value={formData.tiktokUrl} 
              onChange={handleInputChange} 
              placeholder="https://tiktok.com/@..." 
              type="url"
              className={`
                w-full border-2 rounded-xl px-4 py-3 font-medium transition-all focus:ring-2 focus:ring-blue-500 focus:border-transparent
                ${darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                }
              `} 
            />
          </div>
        </div>

        {/* Images */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {t('images')}
            </h3>
            <button 
              type="button" 
              onClick={addImageField} 
              className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors"
            >
              <Plus size={16} />
              <span>{t('addImage')}</span>
            </button>
          </div>
          
          {formData.images!.map((image, i) => (
            <div key={i} className="flex gap-3">
              <input 
                name="images" 
                value={image} 
                onChange={(e) => handleInputChange(e, i)} 
                placeholder={`URL de l'image ${i + 1}`} 
                type="url"
                className={`
                  flex-1 border-2 rounded-xl px-4 py-3 font-medium transition-all focus:ring-2 focus:ring-blue-500 focus:border-transparent
                  ${darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  }
                `} 
              />
              {formData.images!.length > 1 && (
                <button 
                  type="button" 
                  onClick={() => removeImageField(i)} 
                  className="px-4 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Catégories */}
        <div className="space-y-4">
          <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {t('categories')}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {availableCategories.map((cat) => {
              const isChecked = formData.categories!.includes(cat);
              
              return (
                <label key={cat} className={`
                  flex items-center p-4 rounded-xl cursor-pointer transition-all border-2
                  ${isChecked 
                    ? 'bg-blue-100 border-blue-500 text-blue-800 dark:bg-blue-900 dark:border-blue-400 dark:text-blue-300' 
                    : darkMode
                      ? 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                      : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                  }
                `}>
                  <input 
                    type="checkbox" 
                    checked={isChecked}
                    onChange={(e) => handleCategoryToggle(cat, e.target.checked)} 
                    className="mr-3 w-4 h-4" 
                  /> 
                  <span className="font-medium">{cat}</span>
                </label>
              );
            })}
          </div>
          
          {formData.categories!.length > 0 && (
            <div className={`p-4 rounded-xl ${darkMode ? 'bg-blue-900 text-blue-300' : 'bg-blue-50 text-blue-700'}`}>
              <p className="text-sm font-medium">
                {t('selectedCategories')}: {formData.categories!.join(', ')}
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200 dark:border-gray-700">
          <button 
            type="button" 
            onClick={onClose} 
            className={`
              px-6 py-3 rounded-xl font-medium transition-colors
              ${darkMode 
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }
            `}
          >
            {t('cancel')}
          </button>
          <button 
            type="submit" 
            disabled={saving}
            className="px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
            <span>{product ? t('modify') : t('save')}</span>
          </button>
        </div>
      </form>
    </ModernModal>
  );
}

// Composant formulaire de publicité
function AdFormModal({ 
  isOpen, 
  onClose, 
  ad, 
  onSave 
}: {
  isOpen: boolean;
  onClose: () => void;
  ad?: Advertisement | null;
  onSave: (ad: Partial<Advertisement>, editId?: number) => void;
}) {
  const { darkMode, t } = useAppState();
  const { addNotification } = useNotifications();
  
  const [formData, setFormData] = useState<Partial<Advertisement>>({
    title: '',
    description: '',
    url: '',
    imageUrl: '',
    type: 'image',
    isActive: true
  });

  useEffect(() => {
    if (ad) {
      setFormData(ad);
    } else {
      setFormData({
        title: '',
        description: '',
        url: '',
        imageUrl: '',
        type: 'image',
        isActive: true
      });
    }
  }, [ad, isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData({ ...formData, [name]: checked });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData, ad?.id);
    addNotification(
      ad ? t('adUpdated') : t('adAdded'), 
      'success'
    );
    onClose();
  };

  return (
    <ModernModal
      isOpen={isOpen}
      onClose={onClose}
      title={`${ad ? t('modify') : t('add')} - Publicité`}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            {t('adTitle')} *
          </label>
          <input 
            name="title" 
            value={formData.title} 
            onChange={handleInputChange} 
            placeholder="Titre de la publicité" 
            className={`
              w-full border-2 rounded-xl px-4 py-3 font-medium transition-all focus:ring-2 focus:ring-blue-500 focus:border-transparent
              ${darkMode 
                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              }
            `} 
            required 
          />
        </div>

        <div>
          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            {t('description')} *
          </label>
          <textarea 
            name="description" 
            value={formData.description} 
            onChange={handleInputChange} 
            placeholder="Description de la publicité" 
            rows={3}
            className={`
              w-full border-2 rounded-xl px-4 py-3 font-medium transition-all focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical
              ${darkMode 
                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              }
            `} 
            required 
          />
        </div>

        <div>
          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            {t('adUrl')} *
          </label>
          <input 
            name="url" 
            value={formData.url} 
            onChange={handleInputChange} 
            placeholder="https://..." 
            type="url"
            className={`
              w-full border-2 rounded-xl px-4 py-3 font-medium transition-all focus:ring-2 focus:ring-blue-500 focus:border-transparent
              ${darkMode 
                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              }
            `} 
            required 
          />
        </div>

        <div>
          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            {t('adImage')}
          </label>
          <input 
            name="imageUrl" 
            value={formData.imageUrl} 
            onChange={handleInputChange} 
            placeholder="https://..." 
            type="url"
            className={`
              w-full border-2 rounded-xl px-4 py-3 font-medium transition-all focus:ring-2 focus:ring-blue-500 focus:border-transparent
              ${darkMode 
                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              }
            `} 
          />
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              {t('adType')}
            </label>
            <select 
              name="type" 
              value={formData.type} 
              onChange={handleInputChange}
              className={`
                w-full border-2 rounded-xl px-4 py-3 font-medium transition-all focus:ring-2 focus:ring-blue-500 focus:border-transparent
                ${darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
                }
              `}
            >
              <option value="image">🖼️ {t('imageAd')}</option>
              <option value="video">📹 {t('videoAd')}</option>
            </select>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Statut
            </label>
            <label className="flex items-center space-x-3 p-4 border-2 border-dashed rounded-xl cursor-pointer">
              <input 
                type="checkbox" 
                name="isActive" 
                checked={formData.isActive} 
                onChange={handleInputChange}
                className="w-4 h-4" 
              />
              <span className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                {t('isActive')}
              </span>
            </label>
          </div>
        </div>
        
        {/* Aperçu de la publicité */}
        {formData.title && formData.description && (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h4 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              👀 Aperçu:
            </h4>
            <div className={`
              border-2 rounded-2xl overflow-hidden shadow-lg
              ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}
            `}>
              <div className={`
                p-6 text-white text-center
                ${formData.type === 'video' 
                  ? darkMode ? 'bg-gradient-to-br from-red-800 to-pink-800' : 'bg-gradient-to-br from-red-500 to-pink-500'
                  : darkMode ? 'bg-gradient-to-br from-blue-800 to-purple-800' : 'bg-gradient-to-br from-blue-500 to-purple-500'
                }
              `}>
                {formData.imageUrl && (
                  <img 
                    src={formData.imageUrl} 
                    alt={formData.title}
                    className="w-full h-24 object-cover rounded-lg mb-4"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                )}
                <h4 className="font-bold text-lg mb-2">
                  {formData.type === 'video' ? '📹' : '🖼️'} {formData.title}
                </h4>
                <p className="text-sm opacity-90 mb-4">{formData.description}</p>
                <div className="bg-white text-gray-900 px-4 py-2 rounded-xl text-sm font-semibold inline-block">
                  {formData.type === 'video' ? '▶️ Voir la vidéo' : '💬 Découvrir'}
                </div>
              </div>
              <div className={`p-3 text-center ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <span className="text-xs opacity-60">Publicité • CERDIA</span>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200 dark:border-gray-700">
          <button 
            type="button" 
            onClick={onClose} 
            className={`
              px-6 py-3 rounded-xl font-medium transition-colors
              ${darkMode 
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }
            `}
          >
            {t('cancel')}
          </button>
          <button 
            type="submit" 
            className="px-8 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors"
          >
            {ad ? t('modify') : t('save')}
          </button>
        </div>
      </form>
    </ModernModal>
  );
}

// Composant formulaire AdSense
function AdSenseFormModal({ 
  isOpen, 
  onClose, 
  config, 
  onSave 
}: {
  isOpen: boolean;
  onClose: () => void;
  config?: AdSenseConfig | null;
  onSave: (config: Partial<AdSenseConfig>, editId?: number) => void;
}) {
  const { darkMode, t } = useAppState();
  const { addNotification } = useNotifications();
  
  const [formData, setFormData] = useState<Partial<AdSenseConfig>>({
    clientId: '',
    slotId: '',
    format: 'auto',
    position: 'middle',
    frequency: 7,
    isActive: true
  });

  useEffect(() => {
    if (config) {
      setFormData(config);
    } else {
      setFormData({
        clientId: '',
        slotId: '',
        format: 'auto',
        position: 'middle',
        frequency: 7,
        isActive: true
      });
    }
  }, [config, isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData({ ...formData, [name]: checked });
    } else if (name === 'frequency') {
      setFormData({ ...formData, [name]: parseInt(value) || 5 });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData, config?.id);
    addNotification(t('adsenseConfigured'), 'success');
    onClose();
  };

  return (
    <ModernModal
      isOpen={isOpen}
      onClose={onClose}
      title={`${config ? t('modify') : t('add')} - AdSense`}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            {t('adsenseClientId')} *
          </label>
          <input 
            name="clientId" 
            value={formData.clientId} 
            onChange={handleInputChange} 
            placeholder="ca-pub-1234567890123456" 
            className={`
              w-full border-2 rounded-xl px-4 py-3 font-medium transition-all focus:ring-2 focus:ring-blue-500 focus:border-transparent
              ${darkMode 
                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              }
            `} 
            required 
          />
        </div>

        <div>
          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            {t('adsenseSlotId')} *
          </label>
          <input 
            name="slotId" 
            value={formData.slotId} 
            onChange={handleInputChange} 
            placeholder="1234567890" 
            className={`
              w-full border-2 rounded-xl px-4 py-3 font-medium transition-all focus:ring-2 focus:ring-blue-500 focus:border-transparent
              ${darkMode 
                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              }
            `} 
            required 
          />
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              {t('adsenseFormat')}
            </label>
            <select 
              name="format" 
              value={formData.format} 
              onChange={handleInputChange}
              className={`
                w-full border-2 rounded-xl px-4 py-3 font-medium transition-all focus:ring-2 focus:ring-blue-500 focus:border-transparent
                ${darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
                }
              `}
            >
              <option value="auto">{t('formatAuto')}</option>
              <option value="horizontal">{t('formatHorizontal')}</option>
              <option value="rectangle">{t('formatRectangle')}</option>
              <option value="vertical">{t('formatVertical')}</option>
            </select>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              {t('adsensePosition')}
            </label>
            <select 
              name="position" 
              value={formData.position} 
              onChange={handleInputChange}
              className={`
                w-full border-2 rounded-xl px-4 py-3 font-medium transition-all focus:ring-2 focus:ring-blue-500 focus:border-transparent
                ${darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
                }
              `}
            >
              <option value="top">{t('positionTop')}</option>
              <option value="middle">{t('positionMiddle')}</option>
              <option value="bottom">{t('positionBottom')}</option>
              <option value="sidebar">{t('positionSidebar')}</option>
            </select>
          </div>
        </div>

        <div>
          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            {t('adsenseFrequency')}
          </label>
          <input 
            name="frequency" 
            value={formData.frequency} 
            onChange={handleInputChange} 
            type="number"
            min="3"
            max="20"
            className={`
              w-full border-2 rounded-xl px-4 py-3 font-medium transition-all focus:ring-2 focus:ring-blue-500 focus:border-transparent
              ${darkMode 
                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              }
            `} 
          />
          <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Une publicité apparaîtra tous les {formData.frequency} produits (recommandé: 5-10)
          </p>
        </div>

        <div>
          <label className="flex items-center space-x-3 p-4 border-2 border-dashed rounded-xl cursor-pointer">
            <input 
              type="checkbox" 
              name="isActive" 
              checked={formData.isActive} 
              onChange={handleInputChange}
              className="w-4 h-4" 
            />
            <span className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              {t('isActive')}
            </span>
          </label>
        </div>
        
        {/* Aperçu de la configuration AdSense */}
        {formData.clientId && formData.slotId && (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h4 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              👀 Aperçu:
            </h4>
            <div className={`border-2 rounded-xl p-6 ${darkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-300 bg-gray-50'}`}>
              <GoogleAdSense 
                clientId={formData.clientId}
                slotId={formData.slotId}
                format={formData.format}
                style={{ minHeight: '100px' }}
              />
            </div>
            <div className="mt-3 text-center">
              <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Position: {t(`position${formData.position!.charAt(0).toUpperCase() + formData.position!.slice(1)}` as keyof typeof translations.fr)} • 
                Format: {t(`format${formData.format!.charAt(0).toUpperCase() + formData.format!.slice(1)}` as keyof typeof translations.fr)}
              </span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200 dark:border-gray-700">
          <button 
            type="button" 
            onClick={onClose} 
            className={`
              px-6 py-3 rounded-xl font-medium transition-colors
              ${darkMode 
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }
            `}
          >
            {t('cancel')}
          </button>
          <button 
            type="submit" 
            className="px-8 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors"
          >
            {config ? t('modify') : t('save')}
          </button>
        </div>
      </form>
    </ModernModal>
  );
}
// ==========================================
// SECTION 7 : PARTIE 8 - COMPOSANT PRINCIPAL & ASSEMBLAGE FINAL
// ==========================================

// Composant principal - E-commerce complet moderne
export default function ModernEcommercePage() {
  // Hooks principaux
  const { 
    language, 
    darkMode, 
    viewMode, 
    setViewMode, 
    t 
  } = useAppState();
  
  const { 
    passwordEntered, 
    handleAdminAction 
  } = useAdminAuth();
  
  const {
    products,
    allProducts,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    categoryFilter,
    setCategoryFilter,
    sortFilter,
    setSortFilter,
    availableCategories,
    refreshProducts,
    productService
  } = useProducts();

  const { 
    favorites, 
    toggleFavorite, 
    isFavorite 
  } = useFavorites();

  const { 
    notifications, 
    removeNotification 
  } = useNotifications();

  const { 
    addPoints 
  } = useGamification(language);

  const {
    advertisements,
    addAdvertisement,
    updateAdvertisement,
    deleteAdvertisement,
    getRandomAd
  } = useAdvertisements();

  const {
    adsenseConfigs,
    addAdSenseConfig,
    updateAdSenseConfig,
    deleteAdSenseConfig,
    getAdSenseConfigByPosition,
    shouldShowAdSenseAd
  } = useAdSense();

  // États pour les modales et vues
  const [showBlog, setShowBlog] = useState(false);
  const [showAds, setShowAds] = useState(false);
  const [showAdSenseManagement, setShowAdSenseManagement] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);

  // États pour les formulaires
  const [showProductForm, setShowProductForm] = useState(false);
  const [showAdForm, setShowAdForm] = useState(false);
  const [showAdSenseForm, setShowAdSenseForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingAd, setEditingAd] = useState<Advertisement | null>(null);
  const [editingAdSense, setEditingAdSense] = useState<AdSenseConfig | null>(null);

  // Gestion des produits
  const handleAddProduct = () => {
    handleAdminAction(() => {
      setEditingProduct(null);
      setShowProductForm(true);
    });
  };

  const handleEditProduct = (product: Product) => {
    handleAdminAction(() => {
      setEditingProduct(product);
      setShowProductForm(true);
    });
  };

  const handleSaveProduct = async (productData: Partial<Product>, editId?: number): Promise<boolean> => {
    const success = await productService.saveProduct(productData, editId);
    if (success) {
      refreshProducts();
    }
    return success;
  };

  const handleDeleteProduct = async (id: number) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce produit ?')) {
      const success = await productService.deleteProduct(id);
      if (success) {
        refreshProducts();
      }
    }
  };

  // Gestion des publicités
  const handleAddAd = () => {
    handleAdminAction(() => {
      setEditingAd(null);
      setShowAdForm(true);
    });
  };

  const handleEditAd = (ad: Advertisement) => {
    setEditingAd(ad);
    setShowAdForm(true);
  };

  const handleSaveAd = (adData: Partial<Advertisement>, editId?: number) => {
    if (editId) {
      updateAdvertisement(editId, adData);
    } else {
      addAdvertisement(adData as Omit<Advertisement, 'id' | 'createdAt'>);
    }
  };

  const handleDeleteAd = (id: number) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette publicité ?')) {
      deleteAdvertisement(id);
    }
  };

  // Gestion AdSense
  const handleAddAdSense = () => {
    handleAdminAction(() => {
      setEditingAdSense(null);
      setShowAdSenseForm(true);
    });
  };

  const handleEditAdSense = (config: AdSenseConfig) => {
    setEditingAdSense(config);
    setShowAdSenseForm(true);
  };

  const handleSaveAdSense = (configData: Partial<AdSenseConfig>, editId?: number) => {
    if (editId) {
      updateAdSenseConfig(editId, configData);
    } else {
      addAdSenseConfig(configData as Omit<AdSenseConfig, 'id' | 'createdAt'>);
    }
  };

  const handleDeleteAdSense = (id: number) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette configuration AdSense ?')) {
      deleteAdSenseConfig(id);
    }
  };

  // Gestion du partage
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
    addPoints(15, t('sharePoints'));
  };

  // Composant de barre latérale avec activité
  const SidebarActivity = () => {
    const trafficData = useTrafficSimulator(language);
    const screenSize = useScreenSize();
    
    if (screenSize === 'mobile') return null;

    return (
      <div className="hidden lg:block fixed left-4 top-1/2 transform -translate-y-1/2 w-64 z-30 space-y-4">
        {/* Activité récente */}
        <div className={`rounded-2xl border p-6 shadow-lg backdrop-blur-lg ${
          darkMode ? 'bg-gray-800/90 border-gray-700' : 'bg-white/90 border-gray-200'
        }`}>
          <h3 className={`font-bold mb-4 text-sm flex items-center ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            🔥 {t('recentActivity')}
          </h3>
          <div className="space-y-2">
            {trafficData.recentActivity.slice(0, 3).map((activity, index) => (
              <div key={index} className={`text-xs p-3 rounded-xl ${
                darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-50 text-gray-600'
              }`}>
                {activity}
              </div>
            ))}
          </div>
        </div>

        {/* Publicité AdSense ou par défaut */}
        {(() => {
          const sidebarAdConfig = getAdSenseConfigByPosition('sidebar');
          return sidebarAdConfig ? (
            <div className={`rounded-2xl border p-6 shadow-lg backdrop-blur-lg ${
              darkMode ? 'bg-gray-800/90 border-gray-700' : 'bg-white/90 border-gray-200'
            }`}>
              <h4 className={`font-bold mb-3 text-xs ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                📢 Publicité
              </h4>
              <GoogleAdSense 
                clientId={sidebarAdConfig.clientId}
                slotId={sidebarAdConfig.slotId}
                format={sidebarAdConfig.format}
                style={{ minHeight: '250px' }}
              />
            </div>
          ) : (
            <div className={`rounded-2xl border p-6 shadow-lg backdrop-blur-lg ${
              darkMode ? 'bg-gray-800/90 border-gray-700' : 'bg-white/90 border-gray-200'
            }`}>
              <h4 className={`font-bold mb-3 text-xs ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                📢 Publicité
              </h4>
              <div className={`rounded-xl p-4 text-white text-center ${
                darkMode ? 'bg-gradient-to-b from-green-800 to-emerald-800' : 'bg-gradient-to-b from-green-500 to-emerald-500'
              }`}>
                <p className="text-xs font-bold mb-1">💎 VIP Deals</p>
                <p className="text-xs opacity-90 mb-3">Accès exclusif aux meilleures offres</p>
                <button 
                  onClick={() => window.open(`https://m.me/${MESSENGER_PAGE_ID}`, '_blank')}
                  className="bg-white text-green-600 px-3 py-1 rounded-lg text-xs font-bold hover:bg-gray-100 transition-colors"
                >
                  En savoir +
                </button>
              </div>
            </div>
          );
        })()}
      </div>
    );
  };

  // Rendu des produits avec publicités intégrées
  const renderProductsWithAds = () => {
    const productsToRender = [];
    
    // Publicité AdSense en haut
    const topAdConfig = getAdSenseConfigByPosition('top');
    if (topAdConfig) {
      productsToRender.push(
        <div key="top-ad" className={viewMode === 'masonry' ? 'break-inside-avoid mb-4' : ''}>
          <div className={`rounded-2xl overflow-hidden shadow-lg border ${
            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <div className={`p-3 text-center text-xs ${darkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
              Publicité • Google AdSense
            </div>
            <div className="p-4">
              <GoogleAdSense 
                clientId={topAdConfig.clientId}
                slotId={topAdConfig.slotId}
                format={topAdConfig.format}
                style={{ minHeight: '120px' }}
              />
            </div>
          </div>
        </div>
      );
    }

    // Produits avec publicités intégrées
    products.forEach((product, index) => {
      // Ajouter le produit
      productsToRender.push(
        <ModernProductCard
          key={`product-${product.id}`}
          product={product}
          isFavorite={isFavorite(product.id!)}
          onToggleFavorite={() => toggleFavorite(product.id!)}
          onShare={() => handleShare(product)}
          onEdit={() => handleEditProduct(product)}
          showAdmin={passwordEntered}
          viewMode={viewMode}
        />
      );

      // Publicité AdSense intégrée
      if (shouldShowAdSenseAd(index)) {
        const adSenseConfig = getAdSenseConfigByPosition('middle');
        if (adSenseConfig) {
          productsToRender.push(
            <div key={`adsense-${index}`} className={viewMode === 'masonry' ? 'break-inside-avoid mb-4' : ''}>
              <div className={`rounded-2xl overflow-hidden shadow-lg border ${
                darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
              }`}>
                <div className={`p-3 text-center text-xs ${darkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                  Publicité • Google AdSense
                </div>
                <div className="p-4">
                  <GoogleAdSense 
                    clientId={adSenseConfig.clientId}
                    slotId={adSenseConfig.slotId}
                    format={adSenseConfig.format}
                    style={{ minHeight: '200px' }}
                  />
                </div>
              </div>
            </div>
          );
        }
      }

      // Publicité personnalisée
      if ((index + 1) % 6 === 0) {
        const randomAd = getRandomAd();
        if (randomAd) {
          productsToRender.push(
            <div key={`custom-ad-${index}`} className={viewMode === 'masonry' ? 'break-inside-avoid mb-4' : ''}>
              <div className={`rounded-2xl overflow-hidden shadow-lg border ${
                darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
              }`}>
                <div className={`p-6 text-white text-center ${
                  randomAd.type === 'video' 
                    ? darkMode ? 'bg-gradient-to-br from-red-800 to-pink-800' : 'bg-gradient-to-br from-red-500 to-pink-500'
                    : darkMode ? 'bg-gradient-to-br from-blue-800 to-purple-800' : 'bg-gradient-to-br from-blue-500 to-purple-500'
                }`}>
                  <h4 className="font-bold text-lg mb-2">{randomAd.title}</h4>
                  <p className="text-sm opacity-90 mb-4">{randomAd.description}</p>
                  <button 
                    onClick={() => window.open(randomAd.url, '_blank')}
                    className="bg-white text-gray-900 px-4 py-2 rounded-xl text-sm font-bold hover:bg-gray-100 transition-colors"
                  >
                    {randomAd.type === 'video' ? '▶️ Voir' : '🖼️ Découvrir'}
                  </button>
                </div>
                <div className={`p-3 text-center text-xs ${darkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                  Publicité • CERDIA
                </div>
              </div>
            </div>
          );
        }
      }
    });

    // Publicité AdSense en bas
    const bottomAdConfig = getAdSenseConfigByPosition('bottom');
    if (bottomAdConfig) {
      productsToRender.push(
        <div key="bottom-ad" className={viewMode === 'masonry' ? 'break-inside-avoid mb-4' : ''}>
          <div className={`rounded-2xl overflow-hidden shadow-lg border ${
            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <div className={`p-3 text-center text-xs ${darkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
              Publicité • Google AdSense
            </div>
            <div className="p-4">
              <GoogleAdSense 
                clientId={bottomAdConfig.clientId}
                slotId={bottomAdConfig.slotId}
                format={bottomAdConfig.format}
                style={{ minHeight: '120px' }}
              />
            </div>
          </div>
        </div>
      );
    }

    return productsToRender;
  };

  // Affichage conditionnel des erreurs
  if (error) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        darkMode ? 'bg-gray-900' : 'bg-gray-50'
      }`}>
        <EmptyState
          icon="❌"
          title="Erreur de chargement"
          description={error}
          actionLabel="Réessayer"
          onAction={refreshProducts}
        />
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-all duration-500 ${
      darkMode ? 'bg-gray-900' : 'bg-gray-50'
    }`}>
      {/* Notifications */}
      {notifications.map((notification) => (
        <NotificationToast
          key={notification.id}
          show={true}
          message={notification.message}
          type={notification.type}
          onClose={() => removeNotification(notification.id)}
        />
      ))}

      {/* Header moderne */}
      <ModernHeader />

      {/* Navigation */}
      <ModernNavigation
        showBlog={showBlog}
        setShowBlog={setShowBlog}
        showAds={showAds}
        setShowAds={setShowAds}
        showAdSenseManagement={showAdSenseManagement}
        setShowAdSenseManagement={setShowAdSenseManagement}
        passwordEntered={passwordEntered}
        onQuizClick={() => setShowQuiz(true)}
      />

      {/* Contenu principal */}
      <main className="relative">
        {/* Barre latérale d'activité */}
        <SidebarActivity />

        {/* Page Blog */}
        {showBlog && <ModernBlogSection />}

        {/* Page Gestion des Publicités */}
        {showAds && passwordEntered && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className={`rounded-3xl shadow-lg p-8 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <div className="flex items-center justify-between mb-8">
                <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  📺 {t('manageAds')}
                </h1>
                <button 
                  onClick={handleAddAd}
                  className="bg-red-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-red-700 transition-all transform hover:scale-105 flex items-center gap-2 shadow-lg"
                >
                  <Plus size={20} />
                  {t('addAd')}
                </button>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {advertisements.map((ad) => (
                  <div key={ad.id} className={`border-2 rounded-2xl p-6 transition-all hover:scale-105 ${
                    darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
                  } ${ad.isActive ? 'ring-2 ring-green-500' : 'opacity-60'}`}>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-2">
                        {ad.type === 'video' ? (
                          <Video size={20} className="text-red-500" />
                        ) : (
                          <Mountain size={20} className="text-blue-500" />
                        )}
                        <ModernBadge 
                          variant={ad.isActive ? "success" : "default"} 
                          size="sm"
                        >
                          {ad.isActive ? t('isActive') : 'Inactif'}
                        </ModernBadge>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleEditAd(ad)}
                          className="p-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors"
                        >
                          <Pencil size={14} />
                        </button>
                        <button 
                          onClick={() => handleDeleteAd(ad.id!)}
                          className="p-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {ad.imageUrl && (
                      <div className="mb-4">
                        <img 
                          src={ad.imageUrl} 
                          alt={ad.title}
                          className="w-full h-32 object-cover rounded-xl"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                    )}

                    <h3 className={`font-bold text-lg mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {ad.title}
                    </h3>
                    <p className={`text-sm mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      {ad.description}
                    </p>
                    <p className={`text-xs break-all ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      🔗 {ad.url}
                    </p>
                    {ad.createdAt && (
                      <p className={`text-xs mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        📅 {formatDate(ad.createdAt, language)}
                      </p>
                    )}
                  </div>
                ))}

                {advertisements.length === 0 && (
                  <div className="col-span-full">
                    <EmptyState
                      icon="📺"
                      title="Aucune publicité"
                      description="Ajoutez votre première publicité pour commencer"
                      actionLabel={t('addAd')}
                      onAction={handleAddAd}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Page Gestion AdSense */}
        {showAdSenseManagement && passwordEntered && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className={`rounded-3xl shadow-lg p-8 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              <div className="flex items-center justify-between mb-8">
                <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  💰 {t('manageAdSense')}
                </h1>
                <button 
                  onClick={handleAddAdSense}
                  className="bg-green-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-green-700 transition-all transform hover:scale-105 flex items-center gap-2 shadow-lg"
                >
                  <Plus size={20} />
                  {t('addAdSense')}
                </button>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {adsenseConfigs.map((config) => (
                  <div key={config.id} className={`border-2 rounded-2xl p-6 transition-all hover:scale-105 ${
                    darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
                  } ${config.isActive ? 'ring-2 ring-green-500' : 'opacity-60'}`}>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">💰</span>
                        <ModernBadge 
                          variant={config.isActive ? "success" : "default"} 
                          size="sm"
                        >
                          {config.isActive ? t('isActive') : 'Inactif'}
                        </ModernBadge>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleEditAdSense(config)}
                          className="p-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors"
                        >
                          <Pencil size={14} />
                        </button>
                        <button 
                          onClick={() => handleDeleteAdSense(config.id!)}
                          className="p-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        <strong>Client ID:</strong> {config.clientId}
                      </p>
                      <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        <strong>Slot ID:</strong> {config.slotId}
                      </p>
                      <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        <strong>Position:</strong> {t(`position${config.position.charAt(0).toUpperCase() + config.position.slice(1)}` as keyof typeof translations.fr)}
                      </p>
                      <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        <strong>Fréquence:</strong> Tous les {config.frequency} produits
                      </p>
                    </div>

                    <div className="mt-4 border-t pt-4">
                      <p className={`text-xs mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Aperçu:</p>
                      <GoogleAdSense 
                        clientId={config.clientId}
                        slotId={config.slotId}
                        format={config.format}
                        className={`border rounded-xl ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}
                        style={{ minHeight: '60px', fontSize: '12px' }}
                      />
                    </div>

                    {config.createdAt && (
                      <p className={`text-xs mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        📅 {formatDate(config.createdAt, language)}
                      </p>
                    )}
                  </div>
                ))}

                {adsenseConfigs.length === 0 && (
                  <div className="col-span-full">
                    <EmptyState
                      icon="💰"
                      title="Aucune configuration AdSense"
                      description="Configurez votre première publicité AdSense"
                      actionLabel={t('addAdSense')}
                      onAction={handleAddAdSense}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Page Produits Principale */}
        {!showBlog && !showAds && !showAdSenseManagement && (
          <>
            {/* Filtres et recherche */}
            <SearchAndFilters
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              categoryFilter={categoryFilter}
              setCategoryFilter={setCategoryFilter}
              sortFilter={sortFilter}
              setSortFilter={setSortFilter}
              availableCategories={availableCategories}
              viewMode={viewMode}
              setViewMode={setViewMode}
              loading={loading}
              onRefresh={refreshProducts}
            />

            {/* Grille des produits */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
              {loading ? (
                <div className={`grid ${
                  viewMode === 'grid' 
                    ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6' 
                    : 'columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4'
                } mb-8`}>
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div
                      key={i}
                      className={`rounded-2xl p-6 ${darkMode ? 'bg-gray-800' : 'bg-white'} ${
                        viewMode === 'masonry' ? 'break-inside-avoid mb-4' : 'h-96'
                      }`}
                    >
                      <LoadingSpinner size="lg" text="Chargement des produits..." />
                    </div>
                  ))}
                </div>
              ) : products.length > 0 ? (
                <div className={
                  viewMode === 'grid'
                    ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
                    : 'columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4'
                }>
                  {renderProductsWithAds()}
                </div>
              ) : (
                <EmptyState
                  icon="🔍"
                  title={t('noResults')}
                  description={t('tryDifferentSearch')}
                  actionLabel={t('resetFilters')}
                  onAction={() => {
                    setSearchTerm('');
                    setCategoryFilter('');
                    setSortFilter('newest');
                  }}
                />
              )}

              {/* Statistiques en bas */}
              {products.length > 0 && (
                <div className="mt-12 text-center">
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {products.length} {t('showingResults')}
                    {searchTerm && ` pour "${searchTerm}"`}
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Boutons flottants */}
      {!showBlog && !showAds && !showAdSenseManagement && (
        <button 
          className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-full shadow-2xl flex items-center justify-center z-30 transform hover:scale-110 transition-all" 
          onClick={handleAddProduct}
        >
          <Plus size={28} />
        </button>
      )}

      {showAds && passwordEntered && (
        <button 
          className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white rounded-full shadow-2xl flex items-center justify-center z-30 transform hover:scale-110 transition-all" 
          onClick={handleAddAd}
        >
          <Video size={28} />
        </button>
      )}

      {showAdSenseManagement && passwordEntered && (
        <button 
          className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-full shadow-2xl flex items-center justify-center z-30 transform hover:scale-110 transition-all" 
          onClick={handleAddAdSense}
        >
          <span className="text-2xl">💰</span>
        </button>
      )}

      {/* Modales */}
      <StyleQuizModal 
        isOpen={showQuiz} 
        onClose={() => setShowQuiz(false)} 
      />

      <ProductFormModal
        isOpen={showProductForm}
        onClose={() => {
          setShowProductForm(false);
          setEditingProduct(null);
        }}
        product={editingProduct}
        onSave={handleSaveProduct}
      />

      <AdFormModal
        isOpen={showAdForm}
        onClose={() => {
          setShowAdForm(false);
          setEditingAd(null);
        }}
        ad={editingAd}
        onSave={handleSaveAd}
      />

      <AdSenseFormModal
        isOpen={showAdSenseForm}
        onClose={() => {
          setShowAdSenseForm(false);
          setEditingAdSense(null);
        }}
        config={editingAdSense}
        onSave={handleSaveAdSense}
      />
    </div>
  );
}
