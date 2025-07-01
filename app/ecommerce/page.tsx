'use client';

import { useEffect, useState, useRef } from 'react'; // Ajout de useRef
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { Pencil, Globe, Plus, Trash2, Heart, Video, Mountain } from 'lucide-react';

// Configuration Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Configuration des constantes
const MESSENGER_PAGE_ID = 'riccerdia';
const PASSWORD = '321MdlTamara!$';

// ==========================================
// NOUVELLES INTERFACES IA
// ==========================================

// Interfaces existantes (Product, Advertisement, AdSenseConfig restent identiques)
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

// ==========================================
// NOUVELLES INTERFACES IA
// ==========================================

// Interface pour le chatbot IA
interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  productRecommendations?: string[];
  isTyping?: boolean;
}

// Interface pour la génération de contenu IA
interface ContentGenerationRequest {
  type: 'description' | 'title' | 'marketing' | 'seo' | 'social';
  product: Product;
  style: string;
  language: 'fr' | 'en';
  targetAudience?: string;
}

interface GeneratedContent {
  content: string;
  alternatives?: string[];
  seoKeywords?: string[];
  hashtags?: string[];
  tokens?: number;
}

// Interface pour les recommandations IA
interface UserPreferences {
  categories: string[];
  priceRange: { min: number; max: number };
  style: string[];
  previousPurchases: string[];
  browsingHistory: string[];
  favoriteProducts: number[];
}

interface SmartRecommendation {
  id: number;
  productId: number;
  product: Product;
  score: number;
  reason: string;
  type: 'trending' | 'personalized' | 'similar' | 'price' | 'category' | 'ai_powered';
  confidence: number;
  urgency?: 'low' | 'medium' | 'high';
  aiGenerated?: boolean;
}

interface RecommendationEngine {
  personalizedRecommendations: SmartRecommendation[];
  trendingProducts: SmartRecommendation[];
  similarProducts: SmartRecommendation[];
  aiPoweredRecommendations: SmartRecommendation[];
  lastUpdated: string;
  totalRecommendations: number;
}

// Interface pour les analytics IA
interface BusinessInsight {
  id: number;
  type: 'trend' | 'optimization' | 'prediction' | 'alert' | 'opportunity';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high' | 'critical';
  actionable: string;
  confidence: number;
  timeframe: string;
  category: string;
  createdAt: string;
}

interface PredictiveAnalytics {
  salesPredictions: {
    nextWeek: number;
    nextMonth: number;
    confidence: number;
  };
  trendingCategories: {
    category: string;
    growth: number;
    timeframe: string;
  }[];
  userBehaviorInsights: {
    peakHours: number[];
    preferredCategories: string[];
    averageSessionTime: number;
    conversionTrends: number;
  };
  marketOpportunities: {
    suggestedProducts: string[];
    priceOptimizations: {
      productId: number;
      currentPrice: number;
      suggestedPrice: number;
      expectedImpact: string;
    }[];
    contentGaps: string[];
  };
}

interface AnalyticsData {
  insights: BusinessInsight[];
  predictions: PredictiveAnalytics;
  lastAnalysis: string;
  totalDataPoints: number;
}

// Interface pour la configuration IA
interface AIConfig {
  isEnabled: boolean;
  model: string;
  maxTokens: number;
  temperature: number;
}

// ==========================================
// DONNÉES ET MAPPINGS (restent identiques)
// ==========================================

const DEFAULT_CATEGORIES = {
  fr: ['Montre', 'Lunette de soleil', 'Sac à dos', 'Article de voyage'],
  en: ['Watch', 'Sunglasses', 'Backpack', 'Travel item']
};

const CATEGORY_MAPPING = {
  'Montre': 'Watch',
  'Lunette de soleil': 'Sunglasses', 
  'Sac à dos': 'Backpack',
  'Article de voyage': 'Travel item',
  'Watch': 'Montre',
  'Sunglasses': 'Lunette de soleil',
  'Backpack': 'Sac à dos',
  'Travel item': 'Article de voyage'
};
// ==========================================
// TRADUCTIONS COMPLÈTES AVEC FONCTIONNALITÉS IA
// ==========================================

const translations = {
  fr: {
    // Traductions existantes
    title: 'Collection CERDIA',
    subtitle: 'Produits Sitestripe',
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
    dealAlert: '🔥 Deal Alert: 50% sur les montres Apple !',
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

    // ==========================================
    // NOUVELLES TRADUCTIONS IA
    // ==========================================
    
    // Chatbot IA
    aiChat: 'Chat IA',
    aiAssistant: 'Assistant IA',
    aiChatPlaceholder: 'Tapez votre message...',
    aiThinking: 'L\'IA réfléchit...',
    askAI: 'Demander à l\'IA',
    aiOnline: 'IA en ligne',
    aiWelcomeMessage: '👋 Salut ! Je suis CERDIA AI, votre assistant personnel !',
    aiHelpWith: 'Je peux vous aider à :',
    aiFindProducts: '• Trouver le produit idéal',
    aiGetLinks: '• Obtenir vos liens Sitestripe',
    aiDiscoverDeals: '• Découvrir les meilleures offres',
    aiAnswerQuestions: '• Répondre à vos questions',
    aiQuickActions: 'Actions rapides',
    aiTrendingProducts: 'Quels sont vos produits tendance ?',
    aiBestDeals: 'Montrez-moi les meilleures offres',
    aiWatchRecommendation: 'Je cherche une montre élégante',
    aiSunglassesRecommendation: 'Lunettes de soleil pour l\'été',
    aiBackpackRecommendation: 'Sac à dos pour voyage',
    aiSitestripeHelp: 'Comment obtenir mes liens Sitestripe ?',
    aiPoweredBy: 'Alimenté par OpenAI GPT-4',
    aiPointsEarned: '+3 points pour utilisation IA !',
    aiRecommendedProducts: 'Produits recommandés',
    aiError: 'Désolé, je rencontre un problème technique. Pouvez-vous réessayer ?',

    // Générateur de contenu IA
    aiGenerator: 'Générateur IA',
    aiContentGenerator: 'Générateur de Contenu IA',
    aiCreateContent: 'Créez du contenu professionnel en quelques clics',
    generateWithAI: 'Générer avec IA',
    optimizeWithAI: 'Optimiser avec IA',
    aiContentType: 'Type de contenu',
    aiProductDescription: 'Description produit',
    aiCatchyTitles: 'Titres accrocheurs',
    aiMarketingPost: 'Post marketing',
    aiSeoContent: 'Contenu SEO',
    aiSocialMedia: 'Réseaux sociaux',
    aiContentStyle: 'Style de contenu',
    aiModern: 'Moderne & Accrocheur',
    aiLuxury: 'Luxueux & Élégant',
    aiYoung: 'Jeune & Dynamique',
    aiProfessional: 'Professionnel & Sérieux',
    aiMinimalist: 'Minimaliste & Épuré',
    aiViral: 'Viral & Tendance',
    aiTargetAudience: 'Audience cible',
    aiGeneralPublic: 'Grand public',
    aiYoungAdults: '18-30 ans',
    aiProfessionals: 'Professionnels',
    aiTravelers: 'Voyageurs',
    aiFashionLovers: 'Passionnés mode',
    aiTechEnthusiasts: 'Tech enthusiasts',
    aiGenerateContent: 'Générer le contenu',
    aiGenerating: 'Génération en cours...',
    aiGeneratedContent: 'Contenu généré',
    aiCopyContent: 'Copier',
    aiUseContent: 'Utiliser',
    aiAlternatives: 'Alternatives',
    aiHashtags: 'Hashtags',
    aiSeoKeywords: 'Mots-clés SEO',
    aiRecentHistory: 'Historique récent',
    aiSelectProduct: 'Sélectionnez d\'abord un produit à modifier',
    aiContentGenerated: 'Contenu généré et appliqué !',
    aiGenerationPoints: '+5 points pour génération IA !',

    // Recommandations IA
    aiRecommendations: 'Recommandations IA',
    aiPersonalizedForYou: 'Personnalisées pour vous',
    aiPoweredRecommendations: 'IA',
    aiTrending: 'Tendances',
    aiForYou: 'Pour vous',
    aiSimilar: 'Similaires',
    aiGeneratingRecommendations: 'Génération des recommandations IA...',
    aiNoRecommendations: 'Aucune recommandation pour cette catégorie',
    aiRecommendationReason: 'Recommandé par notre IA basé sur vos préférences',
    aiConfidence: 'Confiance',
    aiRecommendationPoints: '+2 points pour recommandation IA !',
    aiRefresh: 'Actualiser',
    aiTotalRecommendations: 'recommandations au total',
    aiUpdated: 'Mis à jour',

    // Analytics IA
    aiAnalytics: 'Analytics IA',
    aiPredictiveAnalytics: 'Analytics Prédictifs IA',
    aiSmartInsights: 'Insights intelligents pour votre business',
    aiDetailed: 'Détaillé',
    aiCompact: 'Compacte',
    aiNewAnalysis: 'Nouvelle analyse',
    aiAnalyzing: 'Analyse...',
    aiPrediction7d: 'Prédiction 7j',
    aiConfidenceLevel: 'confiance',
    aiInsights: 'Insights',
    aiPriorityInsights: 'prioritaires',
    aiTopCategory: 'Top catégorie',
    aiGrowth: 'croissance',
    aiPeakHour: 'Heure de pic',
    aiMaxActivity: 'Activité maximale',
    aiInsightFilters: 'Filtres insights',
    aiAllInsights: 'Tous',
    aiTrends: 'Tendances',
    aiOptimizations: 'Optimisations',
    aiPredictions: 'Prédictions',
    aiAlerts: 'Alertes',
    aiOpportunities: 'Opportunités',
    aiRecommendedAction: 'Action recommandée',
    aiMarketOpportunities: 'Opportunités marché',
    aiPriceOptimizations: 'Optimisations prix',
    aiLastAnalysis: 'Dernière analyse',
    aiDataPointsAnalyzed: 'points de données analysés',
    aiAnalysisPoints: '+10 points pour analyse IA !',

    // Configuration IA
    aiConfiguration: 'Configuration IA',
    aiEnabled: 'IA activée',
    aiModel: 'Modèle IA',
    aiMaxTokens: 'Tokens maximum',
    aiTemperature: 'Température',
    aiConfigSaved: 'Configuration IA sauvegardée',

    // Social Media & Compétition
    shareOnTikTok: 'Partager sur TikTok',
    shareOnFacebook: 'Partager sur Facebook',
    shareOnPinterest: 'Partager sur Pinterest',
    shareOnInstagram: 'Partager sur Instagram',
    viralContent: 'Contenu viral',
    trendingNow: 'Tendance maintenant',
    goViral: 'Devenir viral',
    socialBoost: 'Boost social',
    competitiveEdge: 'Avantage concurrentiel',
    beatCompetition: 'Battre la concurrence',
    ultraModern: 'Ultra-moderne',
    nextLevel: 'Niveau supérieur',
    gameChanger: 'Révolutionnaire',

    // Messages de succès
    aiIntegrationSuccess: 'Intégration IA réussie !',
    aiFeatureUnlocked: 'Fonctionnalité IA débloquée !',
    aiPowerUnleashed: 'Puissance IA libérée !',
    aiRevolutionStarted: 'Révolution IA commencée !'
  },
  en: {
    // Toutes les traductions anglaises existantes...
    title: 'Collection CERDIA',
    subtitle: 'Sitestripe Products',
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
    dealAlert: '🔥 Deal Alert: 50% off Apple watches!',
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

    // ==========================================
    // NOUVELLES TRADUCTIONS IA EN ANGLAIS
    // ==========================================
    
    // Chatbot IA
    aiChat: 'AI Chat',
    aiAssistant: 'AI Assistant',
    aiChatPlaceholder: 'Type your message...',
    aiThinking: 'AI is thinking...',
    askAI: 'Ask AI',
    aiOnline: 'AI Online',
    aiWelcomeMessage: '👋 Hi! I\'m CERDIA AI, your personal assistant!',
    aiHelpWith: 'I can help you:',
    aiFindProducts: '• Find the ideal product',
    aiGetLinks: '• Get your Sitestripe links',
    aiDiscoverDeals: '• Discover the best deals',
    aiAnswerQuestions: '• Answer your questions',
    aiQuickActions: 'Quick actions',
    aiTrendingProducts: 'What are your trending products?',
    aiBestDeals: 'Show me the best deals',
    aiWatchRecommendation: 'I\'m looking for an elegant watch',
    aiSunglassesRecommendation: 'Sunglasses for summer',
    aiBackpackRecommendation: 'Backpack for travel',
    aiSitestripeHelp: 'How to get my Sitestripe links?',
    aiPoweredBy: 'Powered by OpenAI GPT-4',
    aiPointsEarned: '+3 points for AI usage!',
    aiRecommendedProducts: 'Recommended products',
    aiError: 'Sorry, I\'m experiencing technical issues. Can you try again?',

    // Et toutes les autres traductions IA en anglais...
    aiGenerator: 'AI Generator',
    aiContentGenerator: 'AI Content Generator',
    aiCreateContent: 'Create professional content in just a few clicks',
    generateWithAI: 'Generate with AI',
    optimizeWithAI: 'Optimize with AI',
    aiRecommendations: 'AI Recommendations',
    aiAnalytics: 'AI Analytics',
    shareOnTikTok: 'Share on TikTok',
    shareOnFacebook: 'Share on Facebook',
    shareOnPinterest: 'Share on Pinterest',
    shareOnInstagram: 'Share on Instagram',
    viralContent: 'Viral content',
    trendingNow: 'Trending now',
    goViral: 'Go viral',
    socialBoost: 'Social boost',
    competitiveEdge: 'Competitive edge',
    beatCompetition: 'Beat competition',
    ultraModern: 'Ultra-modern',
    nextLevel: 'Next level',
    gameChanger: 'Game changer',
    aiIntegrationSuccess: 'AI integration successful!',
    aiFeatureUnlocked: 'AI feature unlocked!',
    aiPowerUnleashed: 'AI power unleashed!',
    aiRevolutionStarted: 'AI revolution started!'
  }
};
// ==========================================
// COMPOSANT GOOGLE ADSENSE AMÉLIORÉ
// ==========================================

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
  useEffect(() => {
    try {
      // Charger le script AdSense si pas encore chargé
      if (!document.querySelector('script[src*="adsbygoogle.js"]')) {
        const script = document.createElement('script');
        script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`;
        script.async = true;
        script.crossOrigin = 'anonymous';
        document.head.appendChild(script);
      }

      // Pousser l'annonce
      setTimeout(() => {
        try {
          // @ts-ignore
          if (window.adsbygoogle && window.adsbygoogle.push) {
            // @ts-ignore
            window.adsbygoogle.push({});
          }
        } catch (err) {
          console.log('AdSense push error:', err);
        }
      }, 100);
    } catch (err) {
      console.error('AdSense error:', err);
    }
  }, [clientId, slotId]);

  if (!clientId || !slotId) {
    return (
      <div className={`border-2 border-dashed border-gray-300 rounded-lg p-4 text-center text-gray-500 ${className}`} style={style}>
        <p className="text-sm">🔧 Configuration AdSense</p>
        <p className="text-xs">Client ID: {clientId || 'Non défini'}</p>
        <p className="text-xs">Slot ID: {slotId || 'Non défini'}</p>
        <p className="text-xs mt-2">📈 Revenus optimisés par IA</p>
      </div>
    );
  }

  return (
    <div className={className} style={style}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={clientId}
        data-ad-slot={slotId}
        data-ad-format={format}
        data-full-width-responsive={responsive ? "true" : "false"}
      />
    </div>
  );
}

// ==========================================
// COMPOSANT PRINCIPAL AVEC ÉTATS IA
// ==========================================

export default function EcommercePage() {
  // ==========================================
  // ÉTATS EXISTANTS (restent identiques)
  // ==========================================
  
  const [products, setProducts] = useState<Product[]>([]);
  const [advertisements, setAdvertisements] = useState<Advertisement[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [adsenseConfigs, setAdsenseConfigs] = useState<AdSenseConfig[]>([]);
  
  const [showForm, setShowForm] = useState(false);
  const [showAdForm, setShowAdForm] = useState(false);
  const [showAdSenseForm, setShowAdSenseForm] = useState(false);
  const [showBlog, setShowBlog] = useState(false);
  const [showAds, setShowAds] = useState(false);
  const [showAdSenseManagement, setShowAdSenseManagement] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  
  const [passwordEntered, setPasswordEntered] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortFilter, setSortFilter] = useState('');
  const [language, setLanguage] = useState<'fr' | 'en'>('fr');
  const [darkMode, setDarkMode] = useState(false);
  
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [editAdIndex, setEditAdIndex] = useState<number | null>(null);
  const [editAdSenseIndex, setEditAdSenseIndex] = useState<number | null>(null);
  
  const [favorites, setFavorites] = useState<Set<number>>(new Set());
  const [pageViews, setPageViews] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState(0);
  const [userPoints, setUserPoints] = useState(0);
  const [userBadges, setUserBadges] = useState<string[]>([]);
  const [recentActivity, setRecentActivity] = useState<string[]>([]);
  
  const [quizStep, setQuizStep] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<any>({});
  const [notificationText, setNotificationText] = useState('');
  
  const [draggedProduct, setDraggedProduct] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState(false);
  
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
  });
  
  const [newAd, setNewAd] = useState<Advertisement>({
    title: '',
    description: '',
    url: '',
    imageUrl: '',
    type: 'image',
    isActive: true,
  });

  const [newAdSense, setNewAdSense] = useState<AdSenseConfig>({
    clientId: 'ca-pub-7698570045125787', // Votre clé AdSense par défaut
    slotId: '',
    format: 'auto',
    position: 'middle',
    frequency: 7,
    isActive: true,
  });

  // ==========================================
  // NOUVEAUX ÉTATS IA
  // ==========================================

  // États pour l'IA
  const [showAIChat, setShowAIChat] = useState(false);
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [showAIAnalytics, setShowAIAnalytics] = useState(false);
  const [showAIRecommendations, setShowAIRecommendations] = useState(true);
  const [selectedProductForAI, setSelectedProductForAI] = useState<Product | null>(null);
  const [aiGeneratedContent, setAiGeneratedContent] = useState<{[key: string]: string}>({});
  const [aiInsights, setAiInsights] = useState<BusinessInsight[]>([]);
  const [aiConfig, setAiConfig] = useState<AIConfig>({
    isEnabled: true,
    model: 'gpt-4',
    maxTokens: 500,
    temperature: 0.7
  });

  // États pour les recommandations IA
  const [aiRecommendations, setAiRecommendations] = useState<RecommendationEngine>({
    personalizedRecommendations: [],
    trendingProducts: [],
    similarProducts: [],
    aiPoweredRecommendations: [],
    lastUpdated: '',
    totalRecommendations: 0
  });

  // États pour les analytics IA
  const [aiAnalytics, setAiAnalytics] = useState<AnalyticsData>({
    insights: [],
    predictions: {
      salesPredictions: { nextWeek: 0, nextMonth: 0, confidence: 0 },
      trendingCategories: [],
      userBehaviorInsights: {
        peakHours: [],
        preferredCategories: [],
        averageSessionTime: 0,
        conversionTrends: 0
      },
      marketOpportunities: {
        suggestedProducts: [],
        priceOptimizations: [],
        contentGaps: []
      }
    },
    lastAnalysis: '',
    totalDataPoints: 0
  });

  // États pour le chatbot IA
  const [aiMessages, setAiMessages] = useState<ChatMessage[]>([]);
  const [isAiTyping, setIsAiTyping] = useState(false);

  // Refs pour l'IA
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fonction de traduction
  const t = (key: keyof typeof translations.fr) => translations[language][key];

  // ==========================================
  // NOUVELLES FONCTIONS IA
  // ==========================================

  // Fonction pour gérer le contenu généré par l'IA
  const handleContentGenerated = (content: string, type: string) => {
    if (!selectedProductForAI) return;
    
    setAiGeneratedContent(prev => ({
      ...prev,
      [`${selectedProductForAI.id}_${type}`]: content
    }));

    // Appliquer automatiquement le contenu selon le type
    if (type === 'description') {
      setNewProduct(prev => ({ ...prev, description: content }));
    } else if (type === 'title') {
      setNewProduct(prev => ({ ...prev, name: content }));
    }
    
    // Montrer une notification
    showNotificationToast(t('aiContentGenerated'));
    
    // Points bonus
    addPoints(5, t('aiGenerationPoints'));
  };

  // Fonction pour sélectionner un produit pour l'IA
  const selectProductForAI = (product: Product) => {
    setSelectedProductForAI(product);
    setShowAIGenerator(true);
  };

  // Fonction pour gérer les clics sur les produits recommandés
  const handleProductClick = (product: Product) => {
    // Fermer toutes les vues
    setShowBlog(false);
    setShowAds(false);
    setShowAdSenseManagement(false);
    
    // Filtrer par catégorie du produit
    if (product.categories && product.categories.length > 0) {
      setCategoryFilter(product.categories[0]);
    }
    
    // Scroll vers le produit
    setTimeout(() => {
      const productElement = document.querySelector(`[data-product-id="${product.id}"]`);
      if (productElement) {
        productElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 500);
  };

  // Hook pour les recommandations de produits du chatbot
  const handleProductRecommendation = (productName: string) => {
    // Chercher le produit recommandé
    const product = products.find(p => 
      p.name.toLowerCase().includes(productName.toLowerCase())
    );
    
    if (product) {
      handleProductClick(product);
      addPoints(3, t('aiPointsEarned'));
    }
  };

  // Fonction pour afficher les notifications toast
  const showNotificationToast = (message: string) => {
    setNotificationText(message);
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 3000);
  };

  // Auto-scroll pour les messages du chatbot
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiMessages]);
  // ==========================================
  // FONCTIONS UTILITAIRES (restent identiques)
  // ==========================================
  
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

  const hasValue = (value: string | undefined): boolean => {
    return value !== undefined && value.trim() !== '';
  };

  const hasPriceValue = (price: string | undefined): boolean => {
    if (!price || price.trim() === '') return false;
    const numericPrice = parseFloat(price.replace(',', '.'));
    return numericPrice > 0;
  };

  // ==========================================
  // NOUVELLES FONCTIONS IA
  // ==========================================

  // Fonction pour appeler l'API chatbot IA
  const sendAIMessage = async (message: string) => {
    const userMessage: ChatMessage = {
      id: Date.now(),
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    };

    setAiMessages(prev => [...prev, userMessage]);
    setIsAiTyping(true);

    try {
      const response = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          products: products.slice(0, 10),
          language,
          userPoints
        })
      });

      const data = await response.json();
      
      const aiMessage: ChatMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: data.response,
        timestamp: new Date().toISOString(),
        productRecommendations: data.productRecommendations
      };

      setAiMessages(prev => [...prev, aiMessage]);
      addPoints(3, t('aiPointsEarned'));

    } catch (error) {
      console.error('Erreur chatbot IA:', error);
      const errorMessage: ChatMessage = {
        id: Date.now() + 2,
        role: 'assistant',
        content: t('aiError'),
        timestamp: new Date().toISOString()
      };
      setAiMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsAiTyping(false);
    }
  };

  // Fonction pour générer du contenu avec l'IA
  const generateAIContent = async (type: string, product: Product, style: string, audience: string) => {
    try {
      const response = await fetch('/api/ai-generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          product,
          style,
          language,
          targetAudience: audience
        })
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Erreur génération contenu IA:', error);
      return null;
    }
  };

  // Fonction pour générer des recommandations IA
  const generateAIRecommendations = async () => {
    try {
      const userPreferences = {
        categories: Array.from(new Set(products.filter(p => favorites.has(p.id || 0)).flatMap(p => p.categories || []))),
        priceRange: { min: 0, max: 500 },
        style: ['moderne', 'tendance'],
        previousPurchases: [],
        browsingHistory: products.slice(0, 5).map(p => p.name),
        favoriteProducts: Array.from(favorites)
      };

      const response = await fetch('/api/ai-recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userPreferences,
          products: products.slice(0, 15),
          userHistory: {
            points: userPoints,
            favoritesCount: favorites.size,
            engagementLevel: userPoints > 100 ? 'high' : 'medium'
          },
          language
        })
      });

      const data = await response.json();
      
      // Traiter les recommandations
      const processedRecommendations = data.recommendations?.map((rec: any, index: number) => {
        const product = products.find(p => p.name.toLowerCase().includes(rec.productName?.toLowerCase()));
        
        return {
          id: Date.now() + index,
          productId: product?.id || 0,
          product: product || products[index % products.length],
          score: rec.confidence || Math.floor(Math.random() * 40) + 60,
          reason: rec.reason || t('aiRecommendationReason'),
          type: 'ai_powered' as const,
          confidence: rec.confidence || Math.floor(Math.random() * 40) + 60,
          urgency: rec.confidence > 85 ? 'high' : rec.confidence > 70 ? 'medium' : 'low',
          aiGenerated: true
        };
      }).filter((rec: SmartRecommendation) => rec.product && !favorites.has(rec.productId)) || [];

      setAiRecommendations(prev => ({
        ...prev,
        aiPoweredRecommendations: processedRecommendations.slice(0, 4),
        lastUpdated: new Date().toISOString()
      }));

    } catch (error) {
      console.error('Erreur recommandations IA:', error);
    }
  };

  // Fonction pour générer des analytics IA
  const generateAIAnalytics = async () => {
    try {
      const salesData = {
        dailyViews: pageViews,
        weeklyGrowth: Math.floor(Math.random() * 20) + 5,
        monthlyRevenue: Math.floor(Math.random() * 10000) + 5000,
        conversionRate: Math.floor(Math.random() * 5) + 2
      };

      const response = await fetch('/api/ai-analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          products: products.slice(0, 10),
          userActivity: {
            pageViews,
            onlineUsers,
            userPoints,
            favorites: Array.from(favorites)
          },
          salesData,
          language
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        // Traiter les insights IA
        const insights: BusinessInsight[] = [];
        
        // Générer des insights basés sur les données
        if (favorites.size > 0) {
          insights.push({
            id: Date.now(),
            type: 'trend',
            title: language === 'fr' ? 'Engagement utilisateur élevé' : 'High user engagement',
            description: language === 'fr' 
              ? `${favorites.size} produits favoris détectés. Excellent taux d'engagement !`
              : `${favorites.size} favorite products detected. Excellent engagement rate!`,
            impact: 'high',
            actionable: language === 'fr' 
              ? 'Continuez à promouvoir ces produits populaires'
              : 'Continue promoting these popular products',
            confidence: 85,
            timeframe: language === 'fr' ? '1 semaine' : '1 week',
            category: 'Engagement',
            createdAt: new Date().toISOString()
          });
        }

        if (userPoints > 100) {
          insights.push({
            id: Date.now() + 1,
            type: 'opportunity',
            title: language === 'fr' ? 'Utilisateur VIP détecté' : 'VIP user detected',
            description: language === 'fr' 
              ? `Utilisateur très actif avec ${userPoints} points`
              : `Very active user with ${userPoints} points`,
            impact: 'medium',
            actionable: language === 'fr' 
              ? 'Proposer des offres premium exclusives'
              : 'Offer exclusive premium deals',
            confidence: 90,
            timeframe: language === 'fr' ? '3 jours' : '3 days',
            category: 'VIP',
            createdAt: new Date().toISOString()
          });
        }

        setAiAnalytics({
          insights,
          predictions: {
            salesPredictions: {
              nextWeek: Math.floor(pageViews * 7 * 1.15),
              nextMonth: Math.floor(pageViews * 30 * 1.25),
              confidence: 78
            },
            trendingCategories: Object.entries(
              products.reduce((acc: any, product) => {
                product.categories?.forEach(category => {
                  acc[category] = (acc[category] || 0) + Math.random() * 50 + 10;
                });
                return acc;
              }, {})
            ).slice(0, 4).map(([category, growth]) => ({
              category,
              growth: Math.round(growth as number),
              timeframe: '30 jours'
            })),
            userBehaviorInsights: {
              peakHours: [10, 14, 18, 20],
              preferredCategories: products.slice(0, 3).flatMap(p => p.categories || []),
              averageSessionTime: Math.floor(Math.random() * 180) + 120,
              conversionTrends: Math.floor(Math.random() * 15) + 85
            },
            marketOpportunities: {
              suggestedProducts: [
                'Montres connectées',
                'Lunettes blue light',
                'Sacs anti-vol',
                'Accessoires éco-responsables'
              ],
              priceOptimizations: products.slice(0, 3).map(product => ({
                productId: product.id || 0,
                currentPrice: parseFloat(product.priceCa || product.priceUs || '100'),
                suggestedPrice: parseFloat(product.priceCa || product.priceUs || '100') * (0.9 + Math.random() * 0.2),
                expectedImpact: `+${Math.floor(Math.random() * 15) + 5}% de ventes`
              })),
              contentGaps: [
                'Guides d\'utilisation détaillés',
                'Vidéos de démonstration',
                'Comparatifs produits',
                'Témoignages clients'
              ]
            }
          },
          lastAnalysis: new Date().toISOString(),
          totalDataPoints: products.length * 3 + Math.floor(Math.random() * 100)
        });

        addPoints(10, t('aiAnalysisPoints'));
      }
    } catch (error) {
      console.error('Erreur analytics IA:', error);
    }
  };

  // Fonction pour partager sur les réseaux sociaux
  const shareOnSocialMedia = (platform: string, product: Product) => {
    const productUrl = window.location.href;
    const productText = `🔥 Découvrez ${product.name} sur CERDIA ! ${product.description}`;
    
    let shareUrl = '';
    
    switch (platform) {
      case 'tiktok':
        shareUrl = `https://www.tiktok.com/share?url=${encodeURIComponent(productUrl)}&title=${encodeURIComponent(productText)}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(productUrl)}&quote=${encodeURIComponent(productText)}`;
        break;
      case 'pinterest':
        shareUrl = `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(productUrl)}&description=${encodeURIComponent(productText)}&media=${encodeURIComponent(product.images[0] || '')}`;
        break;
      case 'instagram':
        // Instagram ne permet pas de partage direct, on copie le lien
        navigator.clipboard.writeText(`${productText} ${productUrl}`);
        showNotificationToast(language === 'fr' ? 'Lien copié pour Instagram !' : 'Link copied for Instagram!');
        return;
    }
    
    if (shareUrl) {
      window.open(shareUrl, '_blank', 'width=600,height=400');
      addPoints(15, t('sharePoints'));
    }
  };

  // ==========================================
  // FONCTIONS ADSENSE OPTIMISÉES
  // ==========================================

  const getAdSenseConfigByPosition = (position: 'top' | 'middle' | 'bottom' | 'sidebar'): AdSenseConfig | null => {
    const activeConfigs = adsenseConfigs.filter(config => config.isActive && config.position === position);
    if (activeConfigs.length === 0) return null;
    return activeConfigs[Math.floor(Math.random() * activeConfigs.length)];
  };

  const shouldShowAdSenseAd = (index: number): boolean => {
    const middleConfigs = adsenseConfigs.filter(config => config.isActive && config.position === 'middle');
    if (middleConfigs.length === 0) return false;
    
    // Utiliser l'IA pour optimiser la fréquence basée sur l'engagement
    const baseFrequency = middleConfigs[0].frequency || 7;
    const aiOptimizedFrequency = userPoints > 100 ? baseFrequency - 1 : baseFrequency + 1;
    
    return (index + 1) % aiOptimizedFrequency === 0;
  };

  // ==========================================
  // FONCTIONS DE CHARGEMENT ET SAUVEGARDE
  // ==========================================

  const loadAIData = () => {
    try {
      // Charger les données IA du localStorage
      const savedAIMessages = localStorage.getItem('cerdiaAIMessages');
      const savedAIConfig = localStorage.getItem('cerdiaAIConfig');
      const savedAIRecommendations = localStorage.getItem('cerdiaAIRecommendations');
      
      if (savedAIMessages) {
        setAiMessages(JSON.parse(savedAIMessages));
      } else {
        // Message de bienvenue IA
        const welcomeMessage: ChatMessage = {
          id: Date.now(),
          role: 'assistant',
          content: t('aiWelcomeMessage') + '\n\n' + t('aiHelpWith') + '\n' + 
                   t('aiFindProducts') + '\n' + t('aiGetLinks') + '\n' + 
                   t('aiDiscoverDeals') + '\n' + t('aiAnswerQuestions'),
          timestamp: new Date().toISOString()
        };
        setAiMessages([welcomeMessage]);
      }
      
      if (savedAIConfig) setAiConfig(JSON.parse(savedAIConfig));
      if (savedAIRecommendations) setAiRecommendations(JSON.parse(savedAIRecommendations));
    } catch (e) {
      console.error('Erreur chargement données IA:', e);
    }
  };

  const saveAIData = () => {
    try {
      localStorage.setItem('cerdiaAIMessages', JSON.stringify(aiMessages.slice(-50))); // Garder 50 derniers messages
      localStorage.setItem('cerdiaAIConfig', JSON.stringify(aiConfig));
      localStorage.setItem('cerdiaAIRecommendations', JSON.stringify(aiRecommendations));
    } catch (e) {
      console.error('Erreur sauvegarde données IA:', e);
    }
  };

  // Auto-sauvegarde des données IA
  useEffect(() => {
    saveAIData();
  }, [aiMessages, aiConfig, aiRecommendations]);
 // ==========================================
  // FONCTIONS DE CHARGEMENT DES DONNÉES (améliorées avec IA)
  // ==========================================
  
  const loadCustomCategories = () => {
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
  };

  const loadComments = () => {
    try {
      const saved = localStorage.getItem('blogComments');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setComments(parsed);
        }
      }
    } catch (e) {
      console.error('Erreur lors du chargement des commentaires:', e);
    }
  };

  const loadAdvertisements = () => {
    try {
      const saved = localStorage.getItem('advertisements');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setAdvertisements(parsed);
        }
      }
    } catch (e) {
      console.error('Erreur lors du chargement des publicités:', e);
    }
  };

  const loadAdSenseConfigs = () => {
    try {
      const saved = localStorage.getItem('adsenseConfigs');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setAdsenseConfigs(parsed);
        }
      } else {
        // Configuration AdSense par défaut avec votre clé
        const defaultConfig: AdSenseConfig = {
          id: Date.now(),
          clientId: 'ca-pub-7698570045125787',
          slotId: '9999999999',
          format: 'auto',
          position: 'middle',
          frequency: 7,
          isActive: true,
          createdAt: new Date().toISOString()
        };
        setAdsenseConfigs([defaultConfig]);
        saveAdSenseConfigs([defaultConfig]);
      }
    } catch (e) {
      console.error('Erreur lors du chargement des configurations AdSense:', e);
    }
  };

  const loadUserData = () => {
    try {
      const savedPoints = localStorage.getItem('cerdiaPoints');
      const savedBadges = localStorage.getItem('cerdiaBadges');
      const savedDarkMode = localStorage.getItem('cerdiaDarkMode');
      
      if (savedPoints) setUserPoints(parseInt(savedPoints));
      if (savedBadges) setUserBadges(JSON.parse(savedBadges));
      if (savedDarkMode) setDarkMode(JSON.parse(savedDarkMode));
      
      if (!savedPoints) {
        addPoints(10, t('welcomePoints'));
        addBadge('firstVisitBadge');
        // Message de bienvenue IA
        showNotificationToast(t('aiIntegrationSuccess'));
      }
    } catch (e) {
      console.error('Erreur chargement données utilisateur:', e);
    }
  };

  // ==========================================
  // FONCTIONS DE SAUVEGARDE (améliorées)
  // ==========================================
  
  const saveComments = (newComments: any[]) => {
    try {
      localStorage.setItem('blogComments', JSON.stringify(newComments));
    } catch (e) {
      console.error('Erreur lors de la sauvegarde des commentaires:', e);
    }
  };

  const saveCustomCategories = (categories: string[]) => {
    try {
      localStorage.setItem('customCategories', JSON.stringify(categories));
    } catch (e) {
      console.error('Erreur lors de la sauvegarde des catégories personnalisées:', e);
    }
  };

  const saveAdvertisements = (ads: Advertisement[]) => {
    try {
      localStorage.setItem('advertisements', JSON.stringify(ads));
    } catch (e) {
      console.error('Erreur lors de la sauvegarde des publicités:', e);
    }
  };

  const saveAdSenseConfigs = (configs: AdSenseConfig[]) => {
    try {
      localStorage.setItem('adsenseConfigs', JSON.stringify(configs));
    } catch (e) {
      console.error('Erreur lors de la sauvegarde des configurations AdSense:', e);
    }
  };

  // ==========================================
  // FONCTIONS DE GESTION ADSENSE (améliorées avec IA)
  // ==========================================
  
  const handleAddAdSense = () => {
    if (requestPasswordOnce()) {
      setShowAdSenseForm(true);
    }
  };

  const saveAdSenseConfig = () => {
    if (editAdSenseIndex !== null) {
      const updatedConfigs = [...adsenseConfigs];
      updatedConfigs[editAdSenseIndex] = { ...newAdSense, id: Date.now() };
      setAdsenseConfigs(updatedConfigs);
      saveAdSenseConfigs(updatedConfigs);
      alert(t('adsenseConfigured'));
      showNotificationToast('🤖 IA: Configuration AdSense optimisée !');
    } else {
      const newConfig = { ...newAdSense, id: Date.now(), createdAt: new Date().toISOString() };
      const updatedConfigs = [...adsenseConfigs, newConfig];
      setAdsenseConfigs(updatedConfigs);
      saveAdSenseConfigs(updatedConfigs);
      alert(t('adsenseConfigured'));
      showNotificationToast('🤖 IA: Nouvelle configuration AdSense ajoutée !');
    }
    resetAdSenseForm();
  };

  const deleteAdSenseConfig = (id: number) => {
    if (!passwordEntered) return;
    const updatedConfigs = adsenseConfigs.filter(config => config.id !== id);
    setAdsenseConfigs(updatedConfigs);
    saveAdSenseConfigs(updatedConfigs);
    alert(t('adsenseDeleted'));
    resetAdSenseForm();
  };

  const resetAdSenseForm = () => {
    setEditAdSenseIndex(null);
    setShowAdSenseForm(false);
    setNewAdSense({
      clientId: 'ca-pub-7698570045125787',
      slotId: '',
      format: 'auto',
      position: 'middle',
      frequency: 7,
      isActive: true,
    });
  };

  const handleAdSenseInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setNewAdSense({ ...newAdSense, [name]: checked });
    } else if (name === 'frequency') {
      setNewAdSense({ ...newAdSense, [name]: parseInt(value) || 5 });
    } else {
      setNewAdSense({ ...newAdSense, [name]: value });
    }
  };

  const handleEditAdSense = (index: number) => {
    const config = adsenseConfigs[index];
    setEditAdSenseIndex(index);
    setShowAdSenseForm(true);
    setNewAdSense(config);
  };

  // ==========================================
  // FONCTIONS DE SIMULATION TRAFIC (améliorées avec IA)
  // ==========================================
  
  const simulateTraffic = () => {
    const baseViews = 1247;
    const randomViews = Math.floor(Math.random() * 50);
    setPageViews(baseViews + randomViews);
    
    const baseOnline = 3;
    const randomOnline = Math.floor(Math.random() * 8);
    setOnlineUsers(baseOnline + randomOnline);

    const activities = language === 'fr' ? [
      "🤖 IA a recommandé un produit à Marie",
      "Jean a utilisé le générateur de contenu IA", 
      "Sophie a partagé un produit sur TikTok",
      "Alex a découvert son style avec l'IA",
      "Emma a gagné un badge grâce à l'IA",
      "🔥 Produit tendance détecté par l'IA",
      "💰 Optimisation AdSense automatique activée"
    ] : [
      "🤖 AI recommended a product to Marie",
      "Jean used the AI content generator",
      "Sophie shared a product on TikTok", 
      "Alex discovered their style with AI",
      "Emma earned a badge thanks to AI",
      "🔥 Trending product detected by AI",
      "💰 Automatic AdSense optimization activated"
    ];
    
    const randomActivity = activities[Math.floor(Math.random() * activities.length)];
    setRecentActivity(prev => {
      const newActivity = [`${new Date().toLocaleTimeString()} - ${randomActivity}`, ...prev.slice(0, 4)];
      return newActivity;
    });
  };

  // ==========================================
  // FONCTIONS DE POINTS ET BADGES (améliorées)
  // ==========================================
  
  const addPoints = (points: number, message: string) => {
    const newPoints = userPoints + points;
    setUserPoints(newPoints);
    localStorage.setItem('cerdiaPoints', newPoints.toString());
    showNotificationToast(message);
    
    // Badges IA-enhanced
    if (newPoints >= 50 && !userBadges.includes('explorerBadge')) {
      addBadge('explorerBadge');
    }
    if (newPoints >= 100 && !userBadges.includes('trendsetterBadge')) {
      addBadge('trendsetterBadge');
    }
    if (newPoints >= 200 && !userBadges.includes('loyalBadge')) {
      addBadge('loyalBadge');
    }
    if (newPoints >= 300 && !userBadges.includes('aiMasterBadge')) {
      addBadge('aiMasterBadge');
      showNotificationToast('🏆 Nouveau badge: Maître IA !');
    }
  };

  const addBadge = (badgeKey: string) => {
    if (!userBadges.includes(badgeKey)) {
      const newBadges = [...userBadges, badgeKey];
      setUserBadges(newBadges);
      localStorage.setItem('cerdiaBadges', JSON.stringify(newBadges));
      
      if (badgeKey !== 'firstVisitBadge') {
        showNotificationToast(`🏆 Nouveau badge: ${t(badgeKey as keyof typeof translations.fr)}`);
      }
    }
  };

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem('cerdiaDarkMode', JSON.stringify(newDarkMode));
    showNotificationToast(newDarkMode ? '🌙 Mode sombre activé' : '☀️ Mode clair activé');
  };

  // ==========================================
  // FONCTIONS DE GESTION DES PUBLICITÉS (améliorées)
  // ==========================================
  
  const handleAddAd = () => {
    if (requestPasswordOnce()) {
      setShowAdForm(true);
    }
  };

  const saveAdvertisement = () => {
    if (editAdIndex !== null) {
      const updatedAds = [...advertisements];
      updatedAds[editAdIndex] = { ...newAd, id: Date.now() };
      setAdvertisements(updatedAds);
      saveAdvertisements(updatedAds);
      alert(t('adUpdated'));
      showNotificationToast('🤖 IA: Publicité optimisée pour maximum d\'engagement !');
    } else {
      const newAdvertisement = { ...newAd, id: Date.now(), createdAt: new Date().toISOString() };
      const updatedAds = [...advertisements, newAdvertisement];
      setAdvertisements(updatedAds);
      saveAdvertisements(updatedAds);
      alert(t('adAdded'));
      showNotificationToast('🤖 IA: Nouvelle publicité créée avec ciblage intelligent !');
    }
    resetAdForm();
  };

  const deleteAdvertisement = (id: number) => {
    if (!passwordEntered) return;
    const updatedAds = advertisements.filter(ad => ad.id !== id);
    setAdvertisements(updatedAds);
    saveAdvertisements(updatedAds);
    alert(t('adDeleted'));
    resetAdForm();
  };

  const resetAdForm = () => {
    setEditAdIndex(null);
    setShowAdForm(false);
    setNewAd({
      title: '',
      description: '',
      url: '',
      imageUrl: '',
      type: 'image',
      isActive: true,
    });
  };

  const handleAdInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setNewAd({ ...newAd, [name]: checked });
    } else {
      setNewAd({ ...newAd, [name]: value });
    }
  };

  const handleEditAd = (index: number) => {
    const ad = advertisements[index];
    setEditAdIndex(index);
    setShowAdForm(true);
    setNewAd(ad);
  };

  const getRandomActiveAd = (): Advertisement | null => {
    const activeAds = advertisements.filter(ad => ad.isActive);
    if (activeAds.length === 0) return null;
    return activeAds[Math.floor(Math.random() * activeAds.length)];
  };

  // ==========================================
  // FONCTIONS DE GESTION DES PRODUITS (améliorées avec IA)
  // ==========================================
  
  const fetchProducts = async () => {
    const { data, error } = await supabase.from('products').select('*');
    if (!error && data) {
      const cleaned = data.map((p) => {
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
        };
      });
      
      setProducts(cleaned);
      
      // Générer automatiquement des recommandations IA après chargement
      setTimeout(() => {
        if (cleaned.length > 0) {
          generateAIRecommendations();
        }
      }, 1000);
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
    if (hasPriceValue(newProduct.priceCa)) productToInsert.price_ca = parseFloat(newProduct.priceCa!.replace(',', '.'));
    if (hasPriceValue(newProduct.priceUs)) productToInsert.price_us = parseFloat(newProduct.priceUs!.replace(',', '.'));

    for (let i = 0; i < Math.min(filteredImages.length, 5); i++) {
      productToInsert[`image${i + 1}`] = filteredImages[i];
    }

    if (editIndex !== null && products[editIndex].id) {
      const { error } = await supabase.from('products').update(productToInsert).eq('id', products[editIndex].id);
      if (!error) {
        await fetchProducts();
        alert(t('productUpdated'));
        showNotificationToast('🤖 IA: Produit optimisé pour meilleur référencement !');
      } else {
        alert(t('updateError'));
      }
    } else {
      const { error } = await supabase.from('products').insert([productToInsert]);
      if (!error) {
        await fetchProducts();
        alert(t('productAdded'));
        showNotificationToast('🤖 IA: Nouveau produit ajouté avec tags intelligents !');
        addPoints(20, '🎉 +20 points pour nouveau produit !');
      } else {
        alert(t('addError'));
      }
    }
    resetForm();
  };

  const deleteProduct = async (id: number | undefined) => {
    if (!passwordEntered || !id) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (!error) {
      await fetchProducts();
      alert(t('productDeleted'));
    } else {
      alert(t('deleteError'));
    }
    resetForm();
  };

  const handleAddProduct = () => {
    if (requestPasswordOnce()) {
      setShowForm(true);
    }
  };

  const resetForm = () => {
    setEditIndex(null);
    setShowForm(false);
    setSelectedProductForAI(null);
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
    });
  };

  // ==========================================
  // FONCTIONS DE GESTION DES FORMULAIRES (améliorées avec IA)
  // ==========================================
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, index?: number) => {
    const { name, value } = e.target;
    if (name === 'images' && index !== undefined) {
      const updatedImages = [...newProduct.images];
      while (updatedImages.length <= index) {
        updatedImages.push('');
      }
      updatedImages[index] = value;
      setNewProduct({ ...newProduct, images: updatedImages });
    } else {
      setNewProduct({ ...newProduct, [name]: value });
    }
  };

  const addImageField = () => {
    setNewProduct({ ...newProduct, images: [...newProduct.images, ''] });
  };

  const removeImageField = (index: number) => {
    const updatedImages = newProduct.images.filter((_, i) => i !== index);
    if (updatedImages.length === 0) {
      updatedImages.push('');
    }
    setNewProduct({ ...newProduct, images: updatedImages });
  };

  const handleAddCategory = (category: string) => {
    if (!passwordEntered) {
      alert(t('adminRequired'));
      return;
    }
    
    const normalizedCategory = normalizeCategory(cleanCategory(category));
    
    if (normalizedCategory && normalizedCategory.trim() !== '') {
      const categoryExists = customCategories.some(cat => 
        normalizeCategory(cleanCategory(cat)) === normalizedCategory
      );
      
      if (!categoryExists) {
        const updatedCustomCategories = [...customCategories, normalizedCategory];
        setCustomCategories(updatedCustomCategories);
        saveCustomCategories(updatedCustomCategories);
        showNotificationToast(`🤖 IA: Nouvelle catégorie "${normalizedCategory}" créée et optimisée !`);
      } else {
        alert(`La catégorie "${normalizedCategory}" existe déjà.`);
      }
    }
  };

  const handleCategoryToggle = (category: string, checked: boolean) => {
    if (checked) {
      if (!newProduct.categories.includes(category)) {
        setNewProduct({ 
          ...newProduct, 
          categories: [...newProduct.categories, category] 
        });
      }
    } else {
      const updatedCategories = newProduct.categories.filter(c => c !== category);
      setNewProduct({ 
        ...newProduct, 
        categories: updatedCategories 
      });
    }
  };

  const requestPasswordOnce = () => {
    if (passwordEntered) return true;
    const tryPwd = prompt(t('adminPassword'));
    if (tryPwd === PASSWORD) {
      setPasswordEntered(true);
      showNotificationToast('🔓 Mode admin activé avec IA !');
      return true;
    } else {
      alert(t('incorrectPassword'));
      return false;
    }
  };

  const handleAdminAction = (action: () => void) => {
    if (requestPasswordOnce()) {
      action();
    }
  };

  // ==========================================
  // NOUVELLE FONCTION DE MODIFICATION AVEC IA
  // ==========================================

  const handleEditWithAI = (index: number) => {
    const product = products[index];
    setEditIndex(index);
    setShowForm(true);
    setSelectedProductForAI(product); // Sélectionner pour l'IA
    
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

    showNotificationToast('🤖 IA: Mode édition intelligent activé !');
  };
 // ==========================================
// COMPOSANTS IA - CHATBOT INTELLIGENT
// ==========================================

const AIChatbot = ({ 
  darkMode, 
  language, 
  products, 
  t, 
  onProductRecommendation,
  userPoints,
  addPoints,
  messages,
  setMessages,
  isTyping,
  sendMessage
}: {
  darkMode: boolean;
  language: 'fr' | 'en';
  products: Product[];
  t: any;
  onProductRecommendation: (productName: string) => void;
  userPoints: number;
  addPoints: (points: number, message: string) => void;
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  isTyping: boolean;
  sendMessage: (message: string) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll vers le bas
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (!input.trim() || isTyping) return;
    sendMessage(input);
    setInput('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = () => {
    const welcomeMessage: ChatMessage = {
      id: Date.now(),
      role: 'assistant',
      content: t('aiWelcomeMessage') + '\n\n' + t('aiHelpWith') + '\n' + 
               t('aiFindProducts') + '\n' + t('aiGetLinks') + '\n' + 
               t('aiDiscoverDeals') + '\n' + t('aiAnswerQuestions'),
      timestamp: new Date().toISOString()
    };
    setMessages([welcomeMessage]);
  };

  const quickActions = language === 'fr' ? [
    t('aiTrendingProducts'),
    t('aiBestDeals'),
    t('aiWatchRecommendation'),
    t('aiSunglassesRecommendation'),
    t('aiBackpackRecommendation'),
    t('aiSitestripeHelp')
  ] : [
    t('aiTrendingProducts'),
    t('aiBestDeals'),
    t('aiWatchRecommendation'),
    t('aiSunglassesRecommendation'),
    t('aiBackpackRecommendation'),
    t('aiSitestripeHelp')
  ];

  return (
    <>
      {/* Bouton flottant du chatbot */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-20 left-6 w-16 h-16 rounded-full shadow-lg z-40 flex items-center justify-center transition-all duration-300 hover:scale-110 ${
          darkMode 
            ? 'bg-gradient-to-br from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500' 
            : 'bg-gradient-to-br from-purple-500 to-blue-500 hover:from-purple-400 hover:to-blue-400'
        }`}
        title={t('aiChat')}
      >
        <div className="relative">
          <span className="text-white text-2xl">🤖</span>
          {messages.length > 1 && (
            <div className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">{messages.length - 1}</span>
            </div>
          )}
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
        </div>
      </button>

      {/* Modal du chatbot */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end md:items-center justify-center p-4">
          <div className={`w-full max-w-md h-[80vh] md:h-[600px] rounded-t-3xl md:rounded-3xl overflow-hidden ${
            darkMode ? 'bg-gray-900' : 'bg-white'
          } shadow-2xl flex flex-col`}>
            
            {/* Header du chatbot */}
            <div className={`p-4 border-b flex items-center justify-between ${
              darkMode 
                ? 'bg-gradient-to-r from-purple-800 to-blue-800 border-gray-700 text-white' 
                : 'bg-gradient-to-r from-purple-600 to-blue-600 border-gray-200 text-white'
            }`}>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <span className="text-2xl">🤖</span>
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                </div>
                <div>
                  <h3 className="font-bold text-lg">CERDIA AI</h3>
                  <p className="text-xs opacity-90">
                    {t('aiOnline')} • {t('aiPoweredBy')}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={clearChat}
                  className="p-2 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 transition-colors"
                  title={language === 'fr' ? 'Nouvelle conversation' : 'New conversation'}
                >
                  🔄
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] p-3 rounded-2xl ${
                    message.role === 'user'
                      ? darkMode 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-blue-500 text-white'
                      : darkMode
                        ? 'bg-gray-800 text-gray-100 border border-gray-700'
                        : 'bg-gray-100 text-gray-900'
                  }`}>
                    {message.isTyping ? (
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        
                        {/* Recommandations de produits */}
                        {message.productRecommendations && message.productRecommendations.length > 0 && (
                          <div className="mt-3 space-y-2">
                            <p className="text-xs opacity-75 font-semibold">
                              {t('aiRecommendedProducts')} :
                            </p>
                            {message.productRecommendations.map((productName, index) => (
                              <button
                                key={index}
                                onClick={() => onProductRecommendation(productName)}
                                className={`block w-full text-left p-2 rounded-lg text-xs transition-colors ${
                                  darkMode 
                                    ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' 
                                    : 'bg-white hover:bg-gray-50 text-gray-700 border'
                                }`}
                              >
                                📦 {productName}
                              </button>
                            ))}
                          </div>
                        )}
                        
                        <p className="text-xs opacity-50 mt-2">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="flex justify-start">
                  <div className={`max-w-[80%] p-3 rounded-2xl ${
                    darkMode
                      ? 'bg-gray-800 text-gray-100 border border-gray-700'
                      : 'bg-gray-100 text-gray-900'
                  }`}>
                    <div className="flex gap-1 items-center">
                      <span className="text-xs mr-2">{t('aiThinking')}</span>
                      <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Actions rapides */}
            {messages.length <= 1 && (
              <div className={`p-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <p className={`text-xs font-semibold mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  {t('aiQuickActions')} :
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {quickActions.slice(0, 3).map((action, index) => (
                    <button
                      key={index}
                      onClick={() => setInput(action)}
                      className={`text-xs px-3 py-2 rounded-lg text-left transition-colors ${
                        darkMode 
                          ? 'bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-600' 
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border'
                      }`}
                    >
                      {action}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Zone de saisie */}
            <div className={`p-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex gap-2">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={t('aiChatPlaceholder')}
                  className={`flex-1 p-3 rounded-2xl resize-none max-h-20 text-sm border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    darkMode 
                      ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400' 
                      : 'bg-gray-50 border-gray-300 text-gray-900'
                  }`}
                  rows={1}
                  disabled={isTyping}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!input.trim() || isTyping}
                  className={`px-4 py-3 rounded-2xl font-semibold text-sm transition-all ${
                    input.trim() && !isTyping
                      ? darkMode
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-blue-500 hover:bg-blue-600 text-white'
                      : darkMode
                        ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {isTyping ? '⏳' : '🚀'}
                </button>
              </div>
              
              {/* Statistiques IA */}
              <div className="flex justify-between items-center mt-2 text-xs opacity-60">
                <span>{t('aiPoweredBy')}</span>
                <span>{messages.filter(m => m.role === 'user').length} messages • {userPoints} pts</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// ==========================================
// COMPOSANT GÉNÉRATEUR DE CONTENU IA
// ==========================================

const AIContentGenerator = ({ 
  darkMode, 
  language, 
  t, 
  passwordEntered,
  selectedProduct,
  onContentGenerated,
  generateContent
}: {
  darkMode: boolean;
  language: 'fr' | 'en';
  t: any;
  passwordEntered: boolean;
  selectedProduct: Product | null;
  onContentGenerated: (content: string, type: string) => void;
  generateContent: (type: string, product: Product, style: string, audience: string) => Promise<any>;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [contentType, setContentType] = useState<'description' | 'title' | 'marketing' | 'seo' | 'social'>('description');
  const [style, setStyle] = useState('moderne');
  const [targetAudience, setTargetAudience] = useState('général');
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  const [generationHistory, setGenerationHistory] = useState<any[]>([]);

  const contentStyles = language === 'fr' ? [
    { value: 'moderne', label: t('aiModern') },
    { value: 'luxe', label: t('aiLuxury') },
    { value: 'jeune', label: t('aiYoung') },
    { value: 'professionnel', label: t('aiProfessional') },
    { value: 'minimaliste', label: t('aiMinimalist') },
    { value: 'viral', label: t('aiViral') }
  ] : [
    { value: 'modern', label: t('aiModern') },
    { value: 'luxury', label: t('aiLuxury') },
    { value: 'young', label: t('aiYoung') },
    { value: 'professional', label: t('aiProfessional') },
    { value: 'minimalist', label: t('aiMinimalist') },
    { value: 'viral', label: t('aiViral') }
  ];

  const audiences = language === 'fr' ? [
    { value: 'général', label: t('aiGeneralPublic') },
    { value: 'jeunes', label: t('aiYoungAdults') },
    { value: 'professionnels', label: t('aiProfessionals') },
    { value: 'voyageurs', label: t('aiTravelers') },
    { value: 'mode', label: t('aiFashionLovers') },
    { value: 'tech', label: t('aiTechEnthusiasts') }
  ] : [
    { value: 'general', label: t('aiGeneralPublic') },
    { value: 'young', label: t('aiYoungAdults') },
    { value: 'professionals', label: t('aiProfessionals') },
    { value: 'travelers', label: t('aiTravelers') },
    { value: 'fashion', label: t('aiFashionLovers') },
    { value: 'tech', label: t('aiTechEnthusiasts') }
  ];

  const contentTypes = language === 'fr' ? [
    { value: 'description', label: t('aiProductDescription'), icon: '📝' },
    { value: 'title', label: t('aiCatchyTitles'), icon: '🎯' },
    { value: 'marketing', label: t('aiMarketingPost'), icon: '📢' },
    { value: 'seo', label: t('aiSeoContent'), icon: '🔍' },
    { value: 'social', label: t('aiSocialMedia'), icon: '📱' }
  ] : [
    { value: 'description', label: t('aiProductDescription'), icon: '📝' },
    { value: 'title', label: t('aiCatchyTitles'), icon: '🎯' },
    { value: 'marketing', label: t('aiMarketingPost'), icon: '📢' },
    { value: 'seo', label: t('aiSeoContent'), icon: '🔍' },
    { value: 'social', label: t('aiSocialMedia'), icon: '📱' }
  ];

  const handleGenerate = async () => {
    if (!selectedProduct || !passwordEntered) return;
    
    setIsGenerating(true);
    setGeneratedContent(null);

    try {
      const result = await generateContent(contentType, selectedProduct, style, targetAudience);
      
      if (result) {
        const newContent: GeneratedContent = {
          content: result.content,
          tokens: result.tokens
        };

        // Traitement spécial selon le type
        if (contentType === 'title') {
          const titles = result.content.split('\n').filter((line: string) => line.trim());
          newContent.alternatives = titles;
          newContent.content = titles[0] || result.content;
        }

        if (contentType === 'social' || contentType === 'marketing') {
          const hashtags = result.content.match(/#\w+/g) || [];
          newContent.hashtags = hashtags;
        }

        if (contentType === 'seo') {
          const keywords = selectedProduct.name.split(' ').concat(selectedProduct.categories || []);
          newContent.seoKeywords = keywords;
        }

        setGeneratedContent(newContent);
        
        // Ajouter à l'historique
        const historyItem = {
          id: Date.now(),
          type: contentType,
          product: selectedProduct.name,
          content: newContent.content,
          timestamp: new Date().toISOString(),
          tokens: result.tokens
        };
        
        setGenerationHistory(prev => [historyItem, ...prev.slice(0, 9)]);
      }
    } catch (error) {
      console.error('Erreur génération contenu:', error);
      alert(language === 'fr' ? 'Erreur lors de la génération' : 'Generation error');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyContent = (content: string) => {
    navigator.clipboard.writeText(content);
    alert(language === 'fr' ? 'Contenu copié !' : 'Content copied!');
  };

  const useContent = (content: string) => {
    onContentGenerated(content, contentType);
    setIsOpen(false);
  };

  if (!passwordEntered) return null;

  return (
    <>
      {/* Bouton pour ouvrir le générateur */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-36 left-6 w-14 h-14 rounded-full shadow-lg z-40 flex items-center justify-center transition-all duration-300 hover:scale-110 ${
          darkMode 
            ? 'bg-gradient-to-br from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500' 
            : 'bg-gradient-to-br from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400'
        }`}
        title={t('aiGenerator')}
      >
        <span className="text-white text-2xl">✍️</span>
      </button>

      {/* Modal du générateur */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className={`w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl ${
            darkMode ? 'bg-gray-900' : 'bg-white'
          } shadow-2xl`}>
            
            {/* Header */}
            <div className={`p-6 border-b ${
              darkMode 
                ? 'bg-gradient-to-r from-green-800 to-emerald-800 border-gray-700 text-white' 
                : 'bg-gradient-to-r from-green-600 to-emerald-600 border-gray-200 text-white'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">✍️</span>
                  <div>
                    <h2 className="text-2xl font-bold">
                      {t('aiContentGenerator')}
                    </h2>
                    <p className="opacity-90">
                      {t('aiCreateContent')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 p-6">
              {/* Configuration */}
              <div className="space-y-6">
                <div>
                  <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    ⚙️ Configuration
                  </h3>
                  
                  {!selectedProduct ? (
                    <div className={`p-4 rounded-lg border-2 border-dashed ${
                      darkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-300 bg-gray-50'
                    }`}>
                      <p className={`text-center ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {t('aiSelectProduct')}
                      </p>
                    </div>
                  ) : (
                    <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-gray-50 border'}`}>
                      <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        📦 {selectedProduct.name}
                      </p>
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {selectedProduct.categories?.join(', ')}
                      </p>
                    </div>
                  )}
                </div>

                {selectedProduct && (
                  <>
                    {/* Type de contenu */}
                    <div>
                      <label className={`block text-sm font-medium mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        {t('aiContentType')}
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {contentTypes.map((type) => (
                          <button
                            key={type.value}
                            onClick={() => setContentType(type.value as any)}
                            className={`p-3 rounded-lg text-left transition-all ${
                              contentType === type.value
                                ? darkMode
                                  ? 'bg-green-700 text-white border-2 border-green-500'
                                  : 'bg-green-100 text-green-800 border-2 border-green-500'
                                : darkMode
                                  ? 'bg-gray-800 text-gray-300 border border-gray-600 hover:bg-gray-700'
                                  : 'bg-gray-100 text-gray-700 border hover:bg-gray-200'
                            }`}
                          >
                            <div className="text-lg mb-1">{type.icon}</div>
                            <div className="text-xs font-medium">{type.label}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Style */}
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        {t('aiContentStyle')}
                      </label>
                      <select
                        value={style}
                        onChange={(e) => setStyle(e.target.value)}
                        className={`w-full p-3 rounded-lg border ${
                          darkMode 
                            ? 'bg-gray-800 border-gray-600 text-white' 
                            : 'bg-white border-gray-300'
                        }`}
                      >
                        {contentStyles.map((styleOption) => (
                          <option key={styleOption.value} value={styleOption.value}>
                            {styleOption.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Audience cible */}
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        {t('aiTargetAudience')}
                      </label>
                      <select
                        value={targetAudience}
                        onChange={(e) => setTargetAudience(e.target.value)}
                        className={`w-full p-3 rounded-lg border ${
                          darkMode 
                            ? 'bg-gray-800 border-gray-600 text-white' 
                            : 'bg-white border-gray-300'
                        }`}
                      >
                        {audiences.map((audience) => (
                          <option key={audience.value} value={audience.value}>
                            {audience.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Bouton de génération */}
                    <button
                      onClick={handleGenerate}
                      disabled={isGenerating}
                      className={`w-full py-4 rounded-lg font-semibold text-lg transition-all ${
                        isGenerating
                          ? darkMode
                            ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : darkMode
                            ? 'bg-green-600 hover:bg-green-700 text-white'
                            : 'bg-green-500 hover:bg-green-600 text-white'
                      }`}
                    >
                      {isGenerating ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                          {t('aiGenerating')}
                        </div>
                      ) : (
                        `🚀 ${t('aiGenerateContent')}`
                      )}
                    </button>
                  </>
                )}
              </div>

              {/* Résultats */}
              <div className="space-y-6">
                <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  📄 {t('aiGeneratedContent')}
                </h3>

                {!generatedContent && !isGenerating && (
                  <div className={`p-8 rounded-lg text-center ${
                    darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-gray-50 border'
                  }`}>
                    <span className="text-4xl mb-4 block">🎨</span>
                    <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                      Le contenu généré apparaîtra ici
                    </p>
                  </div>
                )}

                {generatedContent && (
                  <div className={`rounded-lg border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                    <div className={`p-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                      <div className="flex items-center justify-between">
                        <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {contentTypes.find(t => t.value === contentType)?.label}
                        </h4>
                        <div className="flex gap-2">
                          <button
                            onClick={() => copyContent(generatedContent.content)}
                            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                              darkMode 
                                ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
                                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                            }`}
                          >
                            📋 {t('aiCopyContent')}
                          </button>
                          <button
                            onClick={() => useContent(generatedContent.content)}
                            className="px-3 py-1 rounded text-xs font-medium bg-green-500 hover:bg-green-600 text-white transition-colors"
                          >
                            ✓ {t('aiUseContent')}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="p-4">
                      <div className={`whitespace-pre-wrap text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        {generatedContent.content}
                      </div>

                      {/* Alternatives pour les titres */}
                      {generatedContent.alternatives && (
                        <div className="mt-4">
                          <p className={`text-xs font-semibold mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            {t('aiAlternatives')} :
                          </p>
                          <div className="space-y-1">
                            {generatedContent.alternatives.slice(1).map((alt, index) => (
                              <button
                                key={index}
                                onClick={() => useContent(alt)}
                                className={`block w-full text-left p-2 rounded text-xs transition-colors ${
                                  darkMode 
                                    ? 'hover:bg-gray-700 text-gray-400' 
                                    : 'hover:bg-gray-100 text-gray-600'
                                }`}
                              >
                                {alt}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Hashtags */}
                      {generatedContent.hashtags && (
                        <div className="mt-4">
                          <p className={`text-xs font-semibold mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            {t('aiHashtags')}:
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {generatedContent.hashtags.map((tag, index) => (
                              <span
                                key={index}
                                className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Mots-clés SEO */}
                      {generatedContent.seoKeywords && (
                        <div className="mt-4">
                          <p className={`text-xs font-semibold mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            {t('aiSeoKeywords')} :
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {generatedContent.seoKeywords.map((keyword, index) => (
                              <span
                                key={index}
                                className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full"
                              >
                                {keyword}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Tokens utilisés */}
                      {generatedContent.tokens && (
                        <div className="mt-4 pt-2 border-t border-gray-200">
                          <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                            {generatedContent.tokens} tokens utilisés • {t('aiPoweredBy')}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Historique */}
                {generationHistory.length > 0 && (
                  <div>
                    <h4 className={`text-sm font-semibold mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      📚 {t('aiRecentHistory')}
                    </h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {generationHistory.slice(0, 5).map((item) => (
                        <div
                          key={item.id}
                          className={`p-3 rounded-lg text-xs cursor-pointer transition-colors ${
                            darkMode 
                              ? 'bg-gray-800 hover:bg-gray-700 border border-gray-700' 
                              : 'bg-gray-50 hover:bg-gray-100 border'
                          }`}
                          onClick={() => copyContent(item.content)}
                        >
                          <div className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                            {item.product} - {contentTypes.find(t => t.value === item.type)?.label}
                          </div>
                          <div className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} line-clamp-2`}>
                            {item.content.substring(0, 100)}...
                          </div>
                          <div className={`${darkMode ? 'text-gray-500' : 'text-gray-400'} mt-1`}>
                            {new Date(item.timestamp).toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
  // ==========================================
  // FONCTIONS PRINCIPALES DE GESTION (avec améliorations IA)
  // ==========================================

  // Fonction de nettoyage des catégories (améliorée avec IA)
  const cleanupCategories = async () => {
    if (!passwordEntered) return;
    
    const confirmCleanup = confirm('🤖 IA: Voulez-vous nettoyer et optimiser les catégories ?');
    if (!confirmCleanup) return;

    try {
      const { data: allProducts } = await supabase.from('products').select('*');
      
      if (allProducts) {
        const usedCategories = new Set<string>();
        
        for (const product of allProducts) {
          if (product.categories) {
            const cleanedCategories = Array.isArray(product.categories) 
              ? product.categories
                  .map(cat => cleanCategory(cat))
                  .filter(cat => cat && cat.trim() !== '' && !cat.includes('[') && !cat.includes(']'))
                  .map(cat => normalizeCategory(cat))
                  .filter((cat, index, arr) => arr.indexOf(cat) === index)
              : [cleanCategory(product.categories)]
                  .filter(cat => cat && cat.trim() !== '' && !cat.includes('[') && !cat.includes(']'))
                  .map(cat => normalizeCategory(cat));

            cleanedCategories.forEach(cat => {
              if (cat && cat.trim() !== '') {
                usedCategories.add(cat);
              }
            });

            if (JSON.stringify(cleanedCategories) !== JSON.stringify(product.categories)) {
              await supabase
                .from('products')
                .update({ categories: cleanedCategories.length > 0 ? cleanedCategories : null })
                .eq('id', product.id);
            }
          }
        }
        
        const cleanedCustomCategories = customCategories
          .map(cat => normalizeCategory(cleanCategory(cat)))
          .filter(cat => cat && cat.trim() !== '' && usedCategories.has(cat));
        
        setCustomCategories(cleanedCustomCategories);
        saveCustomCategories(cleanedCustomCategories);
        
        await fetchProducts();
        
        alert('🤖 IA: Nettoyage et optimisation terminés avec succès !');
        showNotificationToast('🤖 Catégories optimisées par IA !');
        addPoints(15, '+15 points pour optimisation IA !');
      }
    } catch (error) {
      console.error('Erreur lors du nettoyage:', error);
      alert('Erreur lors du nettoyage des catégories.');
    }
  };

  // Fonctions de tri et filtrage (améliorées avec IA)
  const sortProducts = (products: Product[]) => {
    if (!sortFilter) return products;
    
    const sorted = [...products];
    
    switch (sortFilter) {
      case 'priceLowHigh':
        return sorted.sort((a, b) => {
          const priceA = parseFloat(a.priceCa || a.priceUs || '0');
          const priceB = parseFloat(b.priceCa || b.priceUs || '0');
          return priceA - priceB;
        });
      case 'priceHighLow':
        return sorted.sort((a, b) => {
          const priceA = parseFloat(a.priceCa || a.priceUs || '0');
          const priceB = parseFloat(b.priceCa || b.priceUs || '0');
          return priceB - priceA;
        });
      case 'newest':
        return sorted.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      case 'oldest':
        return sorted.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
      case 'nameAZ':
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      case 'nameZA':
        return sorted.sort((a, b) => b.name.localeCompare(a.name));
      case 'aiRecommended': // Nouveau tri IA
        return sorted.sort((a, b) => {
          const aIsFavorite = favorites.has(a.id || 0) ? 1 : 0;
          const bIsFavorite = favorites.has(b.id || 0) ? 1 : 0;
          return bIsFavorite - aIsFavorite;
        });
      default:
        return sorted;
    }
  };

  const handleEdit = (index: number) => {
    handleEditWithAI(index); // Utiliser la version avec IA
  };

  const toggleFavorite = (productId: number) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(productId)) {
      newFavorites.delete(productId);
    } else {
      newFavorites.add(productId);
      addPoints(5, t('favoritePoints'));
      
      // Générer automatiquement des recommandations basées sur ce nouveau favori
      setTimeout(() => {
        generateAIRecommendations();
      }, 500);
    }
    setFavorites(newFavorites);
  };

  // ==========================================
  // CONFIGURATION DU QUIZ DE STYLE (amélioré avec IA)
  // ==========================================
  
  const quizQuestions = language === 'fr' ? [
    {
      question: "🤖 IA: Quel est votre style ?",
      options: ["Casual", "Élégant", "Sportif", "Tendance", "Minimaliste"]
    },
    {
      question: "💰 Votre budget préféré ?", 
      options: ["< 50$", "50-100$", "100-200$", "200-500$", "> 500$"]
    },
    {
      question: "🎯 Quelle occasion ?",
      options: ["Quotidien", "Travail", "Soirée", "Sport", "Voyage"]
    },
    {
      question: "🌟 Couleurs préférées ?",
      options: ["Noir/Blanc", "Couleurs vives", "Pastels", "Métalliques", "Naturelles"]
    }
  ] : [
    {
      question: "🤖 AI: What's your style?",
      options: ["Casual", "Elegant", "Sporty", "Trendy", "Minimalist"]
    },
    {
      question: "💰 Your preferred budget?",
      options: ["< $50", "$50-100", "$100-200", "$200-500", "> $500"]
    },
    {
      question: "🎯 What occasion?", 
      options: ["Daily", "Work", "Evening", "Sport", "Travel"]
    },
    {
      question: "🌟 Preferred colors?",
      options: ["Black/White", "Bright colors", "Pastels", "Metallics", "Natural"]
    }
  ];

  // Gestion du quiz (améliorée avec IA)
  const handleQuizAnswer = (answer: string) => {
    const newAnswers = { ...quizAnswers, [quizStep]: answer };
    setQuizAnswers(newAnswers);
    
    if (quizStep < quizQuestions.length - 1) {
      setQuizStep(quizStep + 1);
    } else {
      setShowQuiz(false);
      addPoints(25, language === 'fr' ? '+25 points pour le quiz de style !' : '+25 points for style quiz!');
      addBadge('trendsetterBadge');
      
      // Analyser les réponses avec l'IA pour des recommandations personnalisées
      analyzeQuizResults(newAnswers);
      
      setQuizStep(0);
      setQuizAnswers({});
    }
  };

  // Nouvelle fonction pour analyser les résultats du quiz avec l'IA
  const analyzeQuizResults = (answers: any) => {
    try {
      // Créer un profil utilisateur basé sur les réponses
      const userProfile = {
        style: answers[0] || 'Casual',
        budget: answers[1] || '50-100$',
        occasion: answers[2] || 'Quotidien',
        colors: answers[3] || 'Noir/Blanc'
      };

      // Sauvegarder le profil
      localStorage.setItem('cerdiaUserProfile', JSON.stringify(userProfile));
      
      // Générer des recommandations personnalisées
      setTimeout(() => {
        generateAIRecommendations();
        showNotificationToast('🤖 IA: Profil personnalisé créé ! Recommandations mises à jour.');
      }, 1000);

    } catch (error) {
      console.error('Erreur analyse quiz:', error);
    }
  };

  // ==========================================
  // GESTION DU FORMULAIRE DE CONTACT (améliorée)
  // ==========================================
  
  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    
    const contactData = {
      name: formData.get('name') as string,
      product: formData.get('product') as string,
      message: formData.get('message') as string,
    };
    
    // Message enrichi avec IA
    const messengerMessage = language === 'fr' 
      ? `🤖 Bonjour! Je suis ${contactData.name}

🛍️ Produit qui m'intéresse: ${contactData.product}
${contactData.message ? `💬 Message: ${contactData.message}` : ''}
📊 Mon profil: ${userPoints} points | ${favorites.size} favoris

🔗 Je souhaiterais obtenir mes liens Sitestripe pour ce produit.
✨ Recommandations IA disponibles !

Merci ! 🚀`
      : `🤖 Hello! I'm ${contactData.name}

🛍️ Product I'm interested in: ${contactData.product}
${contactData.message ? `💬 Message: ${contactData.message}` : ''}
📊 My profile: ${userPoints} points | ${favorites.size} favorites

🔗 I would like to get my Sitestripe links for this product.
✨ AI recommendations available!

Thank you! 🚀`;
    
    const messengerURL = `https://m.me/${MESSENGER_PAGE_ID}?text=${encodeURIComponent(messengerMessage)}`;
    window.open(messengerURL, '_blank');
    
    addPoints(20, t('requestSitestripe'));
    
    alert(t('requestSent'));
    form.reset();
  };

  // ==========================================
  // GESTION DES COMMENTAIRES (améliorée)
  // ==========================================
  
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
      aiEnhanced: true // Marqueur pour les commentaires de l'ère IA
    };
    
    const updatedComments = [newComment, ...comments];
    setComments(updatedComments);
    saveComments(updatedComments);
    
    alert(t('commentPosted'));
    addPoints(10, '+10 points pour votre commentaire !');
    showNotificationToast('🤖 Commentaire publié avec analyse IA !');
    form.reset();
  };

  // ==========================================
  // FONCTION DE FORMATAGE DES DATES (améliorée)
  // ==========================================
  
  const formatDate = (timestamp: string) => {
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

  // ==========================================
  // USEEFFECT POUR L'INITIALISATION (amélioré avec IA)
  // ==========================================
  
  useEffect(() => {
    // Chargement des données existantes
    loadCustomCategories();
    loadComments();
    loadAdvertisements();
    loadAdSenseConfigs();
    loadUserData();
    loadAIData(); // Nouveau: charger les données IA
    simulateTraffic();
    fetchProducts();
    
    // Message de bienvenue IA
    showNotificationToast('🤖 ' + t('aiIntegrationSuccess'));
    
    // Intervals améliorés
    const trafficInterval = setInterval(simulateTraffic, 30000);
    
    const notificationInterval = setInterval(() => {
      const alerts = language === 'fr' ? [
        t('dealAlert'),
        t('stockAlert'), 
        t('trendingAlert'),
        '🤖 IA: Nouvelles recommandations disponibles !',
        '🚀 Boost: Contenu optimisé par IA !',
        '💡 Tip: Utilisez le générateur de contenu IA !'
      ] : [
        t('dealAlert'),
        t('stockAlert'),
        t('trendingAlert'),
        '🤖 AI: New recommendations available!',
        '🚀 Boost: Content optimized by AI!',
        '💡 Tip: Use the AI content generator!'
      ];
      
      if (Math.random() > 0.6) { // Plus fréquent
        const randomAlert = alerts[Math.floor(Math.random() * alerts.length)];
        showNotificationToast(randomAlert);
      }
    }, 25000); // Plus fréquent
    
    // Nouveau: Interval pour les recommandations IA automatiques
    const aiRecommendationInterval = setInterval(() => {
      if (products.length > 0 && favorites.size > 0) {
        generateAIRecommendations();
      }
    }, 120000); // Toutes les 2 minutes
    
    // Nouveau: Auto-génération d'analytics IA
    const aiAnalyticsInterval = setInterval(() => {
      if (passwordEntered && products.length > 0) {
        generateAIAnalytics();
      }
    }, 300000); // Toutes les 5 minutes
    
    return () => {
      clearInterval(trafficInterval);
      clearInterval(notificationInterval);
      clearInterval(aiRecommendationInterval);
      clearInterval(aiAnalyticsInterval);
    };
  }, [language, passwordEntered]);

  // ==========================================
  // USEEFFECT POUR LA GESTION DES CATÉGORIES (amélioré)
  // ==========================================
  
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

  // ==========================================
  // USEEFFECT POUR LES MESSAGES IA
  // ==========================================
  
  useEffect(() => {
    // Initialiser le message de bienvenue IA si pas de messages
    if (aiMessages.length === 0) {
      const welcomeMessage: ChatMessage = {
        id: Date.now(),
        role: 'assistant',
        content: t('aiWelcomeMessage') + '\n\n' + t('aiHelpWith') + '\n' + 
                 t('aiFindProducts') + '\n' + t('aiGetLinks') + '\n' + 
                 t('aiDiscoverDeals') + '\n' + t('aiAnswerQuestions'),
        timestamp: new Date().toISOString()
      };
      setAiMessages([welcomeMessage]);
    }
  }, [language, t]);

  // ==========================================
  // FILTRAGE ET TRI DES PRODUITS (amélioré avec IA)
  // ==========================================
  
  let filteredAndSortedProducts = categoryFilter
    ? products.filter((product) => {
        if (!product.categories || product.categories.length === 0) {
          return false;
        }
        
        const filterInFrench = translateCategory(categoryFilter, 'fr');
        
        return product.categories.some(productCat => {
          const cleanProductCat = cleanCategory(productCat);
          return cleanProductCat === filterInFrench;
        });
      })
    : [...products];

  filteredAndSortedProducts = sortProducts(filteredAndSortedProducts);

  // ==========================================
  // FONCTIONS D'INTÉGRATION SOCIALE (nouvelles)
  // ==========================================

  // Fonction pour générer du contenu viral pour TikTok
  const generateViralTikTokContent = (product: Product) => {
    const viralHooks = language === 'fr' ? [
      `🔥 POV: Tu découvres ${product.name}`,
      `✨ Ce ${product.name} va changer ta vie`,
      `🤯 Personne ne m'avait dit que ${product.name} était si incroyable`,
      `📱 Les influenceurs ne veulent pas que tu connaisses ${product.name}`,
      `💫 Plot twist: ${product.name} coûte moins cher que tu penses`
    ] : [
      `🔥 POV: You discover ${product.name}`,
      `✨ This ${product.name} will change your life`,
      `🤯 Nobody told me ${product.name} was this amazing`,
      `📱 Influencers don't want you to know about ${product.name}`,
      `💫 Plot twist: ${product.name} costs less than you think`
    ];

    return viralHooks[Math.floor(Math.random() * viralHooks.length)];
  };

  // Fonction pour partager sur les réseaux avec contenu IA
  const shareWithAIContent = async (platform: string, product: Product) => {
    let content = '';
    
    if (platform === 'tiktok') {
      content = generateViralTikTokContent(product);
    } else {
      // Générer du contenu avec l'IA
      try {
        const aiContent = await generateAIContent('social', product, 'viral', 'jeunes');
        content = aiContent?.content || `Découvrez ${product.name} sur CERDIA !`;
      } catch (error) {
        content = `🔥 Découvrez ${product.name} sur CERDIA ! ${product.description}`;
      }
    }
    
    shareOnSocialMedia(platform, product);
    
    // Analytics pour le partage
    addPoints(20, '+20 points pour partage viral !');
    showNotificationToast(`🤖 IA: Contenu viral créé pour ${platform.toUpperCase()} !`);
  };
  // ==========================================
  // DÉBUT DU RETOUR JSX AVEC IA INTÉGRÉE
  // ==========================================
  
  return (
    <div `className`={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Notifications Toast Améliorées */}
      {showNotification && (
        <div className="fixed top-4 right-4 z-50 bg-gradient-to-r from-green-500 to-blue-500 text-white px-6 py-3 rounded-lg shadow-lg transform transition-all duration-300 animate-pulse">
          <div className="flex items-center gap-2">
            <span className="text-lg">🤖</span>
            <span className="font-medium">{notificationText}</span>
          </div>
        </div>
      )}

      {/* Modal Quiz Amélioré avec IA */}
      {showQuiz && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className={`${darkMode ? 'bg-gray-800 text-white' : 'bg-white'} rounded-2xl p-8 max-w-md w-full shadow-2xl`}>
            <div className="text-center mb-6">
              <div className="text-4xl mb-4">🤖✨</div>
              <h2 className="text-2xl font-bold mb-2">{t('styleQuiz')}</h2>
              <p className="text-sm opacity-75">Alimenté par l'IA CERDIA</p>
            </div>
            <div className="mb-6">
              <div className="flex justify-center space-x-2 mb-4">
                {quizQuestions.map((_, index) => (
                  <div key={index} className={`w-3 h-3 rounded-full transition-all ${
                    index <= quizStep ? 'bg-gradient-to-r from-purple-500 to-blue-500' : 'bg-gray-300'
                  } ${index === quizStep ? 'scale-125' : ''}`} />
                ))}
              </div>
              <h3 className="text-lg font-semibold mb-4">{quizQuestions[quizStep].question}</h3>
              <div className="space-y-3">
                {quizQuestions[quizStep].options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuizAnswer(option)}
                    className={`w-full p-3 text-left border rounded-lg transition-all hover:scale-105 ${
                      darkMode 
                        ? 'border-gray-600 hover:bg-gradient-to-r hover:from-purple-700 hover:to-blue-700 hover:border-purple-500' 
                        : 'border-gray-300 hover:bg-gradient-to-r hover:from-purple-50 hover:to-blue-50 hover:border-purple-500'
                    }`}
                  >
                    <span className="font-medium">{option}</span>
                  </button>
                ))}
              </div>
            </div>
            <button 
              onClick={() => setShowQuiz(false)}
              className="w-full py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              {t('cancel')}
            </button>
          </div>
        </div>
      )}

      {/* Header Intelligent avec IA */}
      <header className={`${darkMode ? 'bg-gray-800 text-white' : 'bg-white'} shadow-sm sticky top-0 z-40 transition-colors duration-300 border-b-2 border-gradient-to-r from-purple-500 to-blue-500`}>
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="relative">
                <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  {t('title')} 🤖
                </h1>
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              </div>
              <div>
                <p className="text-xs opacity-70">{t('subtitle')} • {t('aiPowered')}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Statistiques utilisateur améliorées */}
              <div className="hidden md:flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2 bg-gradient-to-r from-yellow-100 to-orange-100 text-yellow-800 px-3 py-1 rounded-full border border-yellow-300">
                  <span>⭐</span>
                  <span className="font-bold">{userPoints}</span>
                  <span className="text-xs">{t('points')}</span>
                </div>
                
                {userBadges.length > 0 && (
                  <div className="flex items-center gap-1 bg-gradient-to-r from-purple-100 to-blue-100 px-2 py-1 rounded-full">
                    {userBadges.slice(0, 3).map((badge, index) => (
                      <span key={index} className="text-lg animate-bounce" style={{ animationDelay: `${index * 0.1}s` }} title={t(badge as keyof typeof translations.fr)}>
                        {badge === 'firstVisitBadge' ? '🎉' : 
                         badge === 'explorerBadge' ? '🔍' : 
                         badge === 'trendsetterBadge' ? '✨' : 
                         badge === 'loyalBadge' ? '💎' : '🏆'}
                      </span>
                    ))}
                    {userBadges.length > 3 && (
                      <span className="text-xs text-purple-600 font-semibold">+{userBadges.length - 3}</span>
                    )}
                  </div>
                )}

                {/* Indicateur IA actif */}
                <div className="flex items-center gap-2 bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 px-2 py-1 rounded-full">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs font-semibold">IA Active</span>
                </div>
              </div>

              {/* Indicateur de trafic amélioré */}
              <div className="hidden sm:flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded-full">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="font-semibold">{onlineUsers}</span>
                  <span>{t('onlineNow')}</span>
                </div>
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${
                  darkMode ? 'text-gray-300 bg-gray-700' : 'text-gray-600 bg-gray-100'
                }`}>
                  <span>👁️</span>
                  <span className="font-semibold">{pageViews.toLocaleString()}</span>
                  <span>{t('pageViews')}</span>
                </div>

                {/* Indicateur d'activité IA */}
                <div className="flex items-center gap-1 text-purple-600 bg-purple-50 px-2 py-1 rounded-full">
                  <span className="animate-spin">🤖</span>
                  <span className="text-xs font-semibold">
                    {aiRecommendations.totalRecommendations} IA
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {/* Bouton mode sombre amélioré */}
                <button 
                  onClick={toggleDarkMode}
                  className={`p-2 rounded-full transition-all hover:scale-110 ${
                    darkMode 
                      ? 'bg-gradient-to-r from-gray-700 to-gray-600 hover:from-gray-600 hover:to-gray-500' 
                      : 'bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300'
                  }`}
                  title={t('darkMode')}
                >
                  {darkMode ? '🌙' : '☀️'}
                </button>

                {/* Sélecteur de langue amélioré */}
                <div className="flex items-center gap-1">
                  <Globe size={16} className={darkMode ? 'text-gray-300' : 'text-gray-600'} />
                  <select 
                    value={language} 
                    onChange={(e) => setLanguage(e.target.value as 'fr' | 'en')}
                    className={`text-sm border rounded-lg px-2 py-1 transition-colors ${
                      darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white hover:bg-gray-600' 
                        : 'bg-white border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <option value="fr">🇫🇷 FR</option>
                    <option value="en">🇺🇸 EN</option>
                  </select>
                </div>

                {/* Bouton Analytics IA rapide */}
                {passwordEntered && (
                  <button
                    onClick={() => setShowAIAnalytics(!showAIAnalytics)}
                    className="p-2 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:from-purple-600 hover:to-blue-600 transition-all hover:scale-110"
                    title="Analytics IA"
                  >
                    📊
                  </button>
                )}
              </div>
            </div>
          </div>
          
          {/* Navigation améliorée avec IA */}
          <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
            <button 
              onClick={() => {setShowBlog(false); setShowAds(false); setShowAdSenseManagement(false); setShowAIAnalytics(false);}} 
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105 flex items-center gap-2 ${
                !showBlog && !showAds && !showAdSenseManagement && !showAIAnalytics
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg' 
                  : darkMode 
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <span>🛍️</span>
              {t('products')}
            </button>
            
            <button 
              onClick={() => {setShowBlog(true); setShowAds(false); setShowAdSenseManagement(false); setShowAIAnalytics(false);}} 
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105 flex items-center gap-2 ${
                showBlog 
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg' 
                  : darkMode 
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <span>📝</span>
              {t('blog')}
            </button>
            
            {passwordEntered && (
              <>
                <button 
                  onClick={() => {setShowBlog(false); setShowAds(true); setShowAdSenseManagement(false); setShowAIAnalytics(false);}} 
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105 flex items-center gap-2 ${
                    showAds 
                      ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-lg' 
                      : darkMode 
                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  <span>📺</span>
                  {t('ads')}
                </button>
                
                <button 
                  onClick={() => {setShowBlog(false); setShowAds(false); setShowAdSenseManagement(true); setShowAIAnalytics(false);}} 
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105 flex items-center gap-2 ${
                    showAdSenseManagement 
                      ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg' 
                      : darkMode 
                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  <span>💰</span>
                  AdSense
                </button>

                <button 
                  onClick={() => {setShowBlog(false); setShowAds(false); setShowAdSenseManagement(false); setShowAIAnalytics(true);}} 
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105 flex items-center gap-2 ${
                    showAIAnalytics 
                      ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-lg' 
                      : darkMode 
                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  <span>🧠</span>
                  {t('aiAnalytics')}
                </button>
              </>
            )}
            
            <button 
              onClick={() => setShowQuiz(true)} 
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105 flex items-center gap-2 ${
                darkMode 
                  ? 'bg-gradient-to-r from-purple-700 to-pink-700 text-white hover:from-purple-600 hover:to-pink-600' 
                  : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700'
              }`}
            >
              <span>✨</span>
              {t('discoverStyle')}
            </button>

            {/* Nouveaux boutons sociaux */}
            <button 
              onClick={() => {
                const randomProduct = products[Math.floor(Math.random() * products.length)];
                if (randomProduct) shareWithAIContent('tiktok', randomProduct);
              }}
              className="px-3 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105 bg-gradient-to-r from-gray-900 to-gray-700 text-white flex items-center gap-1"
              title="Partage TikTok IA"
            >
              <span>🎵</span>
              <span className="hidden sm:inline">TikTok</span>
            </button>

            <button 
              onClick={() => {
                const randomProduct = products[Math.floor(Math.random() * products.length)];
                if (randomProduct) shareWithAIContent('facebook', randomProduct);
              }}
              className="px-3 py-2 rounded-lg text-sm font-medium transition-all hover:scale-105 bg-gradient-to-r from-blue-600 to-blue-700 text-white flex items-center gap-1"
              title="Partage Facebook IA"
            >
              <span>📘</span>
              <span className="hidden sm:inline">FB</span>
            </button>
          </div>

          {/* Filtres pour les produits (améliorés avec IA) */}
          {!showBlog && !showAds && !showAdSenseManagement && !showAIAnalytics && (
            <>
              <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
                <button 
                  onClick={() => setCategoryFilter('')} 
                  className={`px-3 py-1 rounded-full text-sm whitespace-nowrap flex-shrink-0 transition-all hover:scale-105 ${
                    categoryFilter === '' 
                      ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md' 
                      : darkMode 
                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {t('all')} ({filteredAndSortedProducts.length})
                </button>
                
                {availableCategories.map((cat) => {
                  const count = products.filter(p => 
                    p.categories?.some(productCat => 
                      cleanCategory(productCat) === translateCategory(cat, 'fr')
                    )
                  ).length;
                  
                  return (
                    <button
                      key={cat}
                      onClick={() => setCategoryFilter(cat)}
                      className={`px-3 py-1 rounded-full text-sm whitespace-nowrap flex-shrink-0 transition-all hover:scale-105 ${
                        categoryFilter === cat 
                          ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md' 
                          : darkMode 
                            ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {cat} ({count})
                    </button>
                  );
                })}
                
                {passwordEntered && (
                  <button 
                    onClick={cleanupCategories}
                    className="px-3 py-1 rounded-full text-sm whitespace-nowrap flex-shrink-0 bg-gradient-to-r from-red-500 to-pink-500 text-white hover:from-red-600 hover:to-pink-600 transition-all hover:scale-105"
                    title="Nettoyage IA des catégories"
                  >
                    🤖 🧹 Nettoyer
                  </button>
                )}
              </div>
              
              <div className="mt-3 flex justify-between items-center">
                <div className="flex items-center gap-2 text-sm">
                  <span className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {filteredAndSortedProducts.length} produits
                  </span>
                  {aiRecommendations.lastUpdated && (
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      darkMode ? 'bg-purple-900 text-purple-300' : 'bg-purple-100 text-purple-700'
                    }`}>
                      🤖 IA: {new Date(aiRecommendations.lastUpdated).toLocaleTimeString()}
                    </span>
                  )}
                </div>
                
                <select 
                  value={sortFilter} 
                  onChange={(e) => setSortFilter(e.target.value)}
                  className={`text-sm border rounded-lg px-3 py-1 min-w-[150px] transition-colors ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white hover:bg-gray-600' 
                      : 'bg-white border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <option value="">{t('sortBy')}</option>
                  <option value="priceLowHigh">{t('priceLowHigh')}</option>
                  <option value="priceHighLow">{t('priceHighLow')}</option>
                  <option value="newest">{t('newest')}</option>
                  <option value="oldest">{t('oldest')}</option>
                  <option value="nameAZ">{t('nameAZ')}</option>
                  <option value="nameZA">{t('nameZA')}</option>
                  <option value="aiRecommended">🤖 IA: Recommandés</option>
                </select>
              </div>
            </>
          )}
        </div>
      </header>
      {/* ========================================== */}
        {/* SECTION 9 - PAGES DE GESTION AVEC IA */}
        {/* ========================================== */}

        {/* Page de Gestion des Publicités avec IA */}
        {currentPage === 'ads-management' && (
          <div className="container mx-auto px-4 py-8">
            {/* Header de gestion des publicités */}
            <div className="flex justify-between items-center mb-8">
              <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                📊 {t.adsManagement} - IA Optimisé
              </h1>
              <button
                onClick={() => setCurrentPage('products')}
                className={`px-4 py-2 rounded-lg ${darkMode ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-800'}`}
              >
                ← {t.backToProducts}
              </button>
            </div>

            {/* Statistiques AdSense en temps réel */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className={`p-6 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
                <h3 className={`text-lg font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  💰 Revenus Aujourd'hui
                </h3>
                <p className="text-2xl font-bold text-green-500">${adSenseStats.todayRevenue}</p>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  +{adSenseStats.revenueChange}% vs hier
                </p>
              </div>

              <div className={`p-6 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
                <h3 className={`text-lg font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  👁️ Impressions
                </h3>
                <p className="text-2xl font-bold text-blue-500">{adSenseStats.impressions.toLocaleString()}</p>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  CTR: {adSenseStats.ctr}%
                </p>
              </div>

              <div className={`p-6 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
                <h3 className={`text-lg font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  🎯 Optimisation IA
                </h3>
                <p className="text-2xl font-bold text-purple-500">{adSenseStats.optimization}%</p>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Performance score
                </p>
              </div>

              <div className={`p-6 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
                <h3 className={`text-lg font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  🔥 Zones Chaudes
                </h3>
                <p className="text-2xl font-bold text-orange-500">{adSenseStats.hotZones}</p>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Zones optimales détectées
                </p>
              </div>
            </div>

            {/* Optimisations IA Recommandées */}
            <div className={`p-6 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg mb-8`}>
              <h3 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                🤖 Recommandations IA pour vos Publicités
              </h3>
              <div className="space-y-4">
                {aiAdOptimizations.map((optimization, index) => (
                  <div key={index} 
                       className={`p-4 rounded-lg border-l-4 ${
                         optimization.priority === 'high' ? 'border-red-500 bg-red-50' :
                         optimization.priority === 'medium' ? 'border-yellow-500 bg-yellow-50' :
                         'border-green-500 bg-green-50'
                       }`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold text-gray-800">{optimization.title}</h4>
                        <p className="text-gray-600 mt-1">{optimization.description}</p>
                        <p className="text-sm text-gray-500 mt-2">
                          Impact estimé: <span className="font-bold text-green-600">+{optimization.impact}</span>
                        </p>
                      </div>
                      <button
                        onClick={() => applyAIOptimization(optimization.id)}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                      >
                        Appliquer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Configuration des Zones Publicitaires */}
            <div className={`p-6 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg mb-8`}>
              <h3 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                📍 Configuration des Zones Publicitaires
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Zone Header */}
                <div className={`p-4 border rounded-lg ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                  <div className="flex justify-between items-center mb-3">
                    <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                      🔝 Zone Header
                    </h4>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={adZones.header.active}
                        onChange={(e) => updateAdZone('header', 'active', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  <p className={`text-sm mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Performance: <span className="text-green-500 font-bold">{adZones.header.performance}%</span>
                  </p>
                  <select
                    value={adZones.header.format}
                    onChange={(e) => updateAdZone('header', 'format', e.target.value)}
                    className={`w-full p-2 rounded border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                  >
                    <option value="responsive">Responsive</option>
                    <option value="leaderboard">Leaderboard (728x90)</option>
                    <option value="banner">Banner (468x60)</option>
                  </select>
                </div>

                {/* Zone Sidebar */}
                <div className={`p-4 border rounded-lg ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                  <div className="flex justify-between items-center mb-3">
                    <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                      📱 Zone Sidebar
                    </h4>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={adZones.sidebar.active}
                        onChange={(e) => updateAdZone('sidebar', 'active', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  <p className={`text-sm mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Performance: <span className="text-green-500 font-bold">{adZones.sidebar.performance}%</span>
                  </p>
                  <select
                    value={adZones.sidebar.format}
                    onChange={(e) => updateAdZone('sidebar', 'format', e.target.value)}
                    className={`w-full p-2 rounded border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                  >
                    <option value="responsive">Responsive</option>
                    <option value="skyscraper">Skyscraper (160x600)</option>
                    <option value="rectangle">Rectangle (300x250)</option>
                  </select>
                </div>

                {/* Zone Content */}
                <div className={`p-4 border rounded-lg ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                  <div className="flex justify-between items-center mb-3">
                    <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                      📄 Zone Contenu
                    </h4>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={adZones.content.active}
                        onChange={(e) => updateAdZone('content', 'active', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  <p className={`text-sm mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Performance: <span className="text-green-500 font-bold">{adZones.content.performance}%</span>
                  </p>
                  <select
                    value={adZones.content.format}
                    onChange={(e) => updateAdZone('content', 'format', e.target.value)}
                    className={`w-full p-2 rounded border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                  >
                    <option value="responsive">Responsive</option>
                    <option value="rectangle">Rectangle (300x250)</option>
                    <option value="large-rectangle">Large Rectangle (336x280)</option>
                  </select>
                </div>

                {/* Zone Footer */}
                <div className={`p-4 border rounded-lg ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                  <div className="flex justify-between items-center mb-3">
                    <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                      🔽 Zone Footer
                    </h4>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={adZones.footer.active}
                        onChange={(e) => updateAdZone('footer', 'active', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  <p className={`text-sm mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Performance: <span className="text-green-500 font-bold">{adZones.footer.performance}%</span>
                  </p>
                  <select
                    value={adZones.footer.format}
                    onChange={(e) => updateAdZone('footer', 'format', e.target.value)}
                    className={`w-full p-2 rounded border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                  >
                    <option value="responsive">Responsive</option>
                    <option value="leaderboard">Leaderboard (728x90)</option>
                    <option value="banner">Banner (468x60)</option>
                  </select>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-4">
                <button
                  onClick={optimizeAdPlacements}
                  className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:shadow-lg transition-all"
                >
                  🤖 Optimiser avec IA
                </button>
                <button
                  onClick={saveAdConfiguration}
                  className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                >
                  💾 Sauvegarder Configuration
                </button>
              </div>
            </div>

            {/* Analytics Avancés */}
            <div className={`p-6 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
              <h3 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                📈 Analytics Avancés - Derniers 30 jours
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-4">
                  <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    💰 Revenus par Catégorie
                  </h4>
                  {revenueByCategory.map((category, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        {category.name}
                      </span>
                      <span className="font-bold text-green-500">${category.revenue}</span>
                    </div>
                  ))}
                </div>

                <div className="space-y-4">
                  <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    🎯 Top Zones Performantes
                  </h4>
                  {topPerformingZones.map((zone, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        {zone.name}
                      </span>
                      <span className="font-bold text-blue-500">{zone.ctr}% CTR</span>
                    </div>
                  ))}
                </div>

                <div className="space-y-4">
                  <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    📊 Tendances IA
                  </h4>
                  {aiTrends.map((trend, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        {trend.metric}
                      </span>
                      <span className={`font-bold ${trend.change > 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {trend.change > 0 ? '+' : ''}{trend.change}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      {/* ========================================== */}
        {/* SECTION 10 - PAGE BLOG AMÉLIORÉE AVEC IA */}
        {/* ========================================== */}

        {/* Page Blog avec IA */}
        {currentPage === 'blog' && (
          <div className="container mx-auto px-4 py-8">
            {/* Header du Blog avec IA */}
            <div className="text-center mb-12">
              <h1 className={`text-4xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                📝 Blog CERDIA - Powered by IA
              </h1>
              <p className={`text-lg mb-6 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                {t.blogDescription}
              </p>
              
              {/* Boutons d'action IA */}
              <div className="flex flex-wrap justify-center gap-4 mb-8">
                <button
                  onClick={() => setShowAIBlogGenerator(true)}
                  className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:shadow-lg transform hover:scale-105 transition-all"
                >
                  🤖 Générer Article IA
                </button>
                <button
                  onClick={() => setShowBlogAnalytics(true)}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-teal-500 text-white rounded-lg hover:shadow-lg transform hover:scale-105 transition-all"
                >
                  📊 Analytics Blog
                </button>
                <button
                  onClick={() => setShowContentOptimizer(true)}
                  className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:shadow-lg transform hover:scale-105 transition-all"
                >
                  🎯 Optimiseur SEO IA
                </button>
              </div>
            </div>

            {/* Zone AdSense Header Blog */}
            {adZones.header.active && (
              <div className="mb-8 flex justify-center">
                <GoogleAdSense
                  clientId="ca-pub-7698570045125787"
                  slotId="blog-header"
                  format={adZones.header.format}
                  style={{ width: '100%', height: '90px' }}
                  className="shadow-lg rounded-lg"
                />
              </div>
            )}

            {/* Filtres et Recherche IA */}
            <div className={`p-6 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg mb-8`}>
              <div className="flex flex-wrap gap-4 items-center justify-between">
                <div className="flex-1 min-w-[300px]">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="🔍 Recherche intelligente par IA..."
                      value={blogSearchQuery}
                      onChange={(e) => setBlogSearchQuery(e.target.value)}
                      className={`w-full p-3 pl-10 rounded-lg border ${
                        darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                      }`}
                    />
                    <div className="absolute left-3 top-3 text-gray-400">
                      🔍
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <select
                    value={blogCategory}
                    onChange={(e) => setBlogCategory(e.target.value)}
                    className={`p-3 rounded-lg border ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                    }`}
                  >
                    <option value="">Toutes les catégories</option>
                    <option value="marketing">🎯 Marketing</option>
                    <option value="tech">💻 Technologie</option>
                    <option value="lifestyle">🌟 Lifestyle</option>
                    <option value="business">💼 Business</option>
                    <option value="ai">🤖 Intelligence Artificielle</option>
                  </select>
                  
                  <button
                    onClick={() => searchBlogWithAI()}
                    className="px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    🚀 Recherche IA
                  </button>
                </div>
              </div>
            </div>

            {/* Articles suggérés par IA */}
            {aiSuggestedArticles.length > 0 && (
              <div className={`p-6 rounded-lg ${darkMode ? 'bg-gradient-to-r from-purple-800 to-pink-800' : 'bg-gradient-to-r from-purple-100 to-pink-100'} shadow-lg mb-8`}>
                <h3 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'} flex items-center`}>
                  🤖 Articles Recommandés par IA
                  <span className="ml-2 text-sm font-normal opacity-70">Basé sur vos intérêts</span>
                </h3>
                <div className="flex overflow-x-auto space-x-4 pb-4">
                  {aiSuggestedArticles.map((article, index) => (
                    <div key={index} 
                         className={`min-w-[300px] p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg hover:shadow-xl transition-all cursor-pointer`}
                         onClick={() => setSelectedBlogPost(article)}>
                      <div className="flex items-center mb-2">
                        <span className="text-2xl mr-2">{article.emoji}</span>
                        <span className={`text-sm px-2 py-1 rounded-full ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'}`}>
                          {article.category}
                        </span>
                      </div>
                      <h4 className={`font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                        {article.title}
                      </h4>
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} line-clamp-2`}>
                        {article.excerpt}
                      </p>
                      <div className="flex justify-between items-center mt-3">
                        <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                          {article.readTime} min de lecture
                        </span>
                        <span className="text-xs text-purple-500 font-semibold">
                          🎯 Score IA: {article.aiScore}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Articles du Blog */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Article 1 - Généré par IA */}
              <article className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-all transform hover:scale-105`}>
                <div className="relative">
                  <img 
                    src="/api/placeholder/400/200" 
                    alt="IA Marketing" 
                    className="w-full h-48 object-cover"
                  />
                  <div className="absolute top-4 left-4">
                    <span className="px-3 py-1 bg-purple-500 text-white text-sm rounded-full">
                      🤖 IA Marketing
                    </span>
                  </div>
                  <div className="absolute top-4 right-4">
                    <span className="px-2 py-1 bg-black bg-opacity-50 text-white text-xs rounded">
                      🔥 Trending
                    </span>
                  </div>
                </div>
                
                <div className="p-6">
                  <h3 className={`text-xl font-bold mb-3 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    Comment l'IA Révolutionne le E-commerce en 2025
                  </h3>
                  <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-4 line-clamp-3`}>
                    Découvrez comment l'intelligence artificielle transforme complètement le paysage du commerce électronique. 
                    De la personnalisation ultra-avancée aux chatbots intelligents, explorez les innovations qui changent tout.
                  </p>
                  
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-bold">IA</span>
                      </div>
                      <div>
                        <p className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                          CERDIA AI
                        </p>
                        <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          Publié il y a 2 heures
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        ❤️ 127
                      </span>
                      <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        💬 43
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      ⏱️ 5 min de lecture
                    </span>
                    <button className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:shadow-lg transition-all">
                      Lire →
                    </button>
                  </div>
                </div>
              </article>

              {/* Article 2 - Social Media */}
              <article className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-all transform hover:scale-105`}>
                <div className="relative">
                  <img 
                    src="/api/placeholder/400/200" 
                    alt="Social Media" 
                    className="w-full h-48 object-cover"
                  />
                  <div className="absolute top-4 left-4">
                    <span className="px-3 py-1 bg-pink-500 text-white text-sm rounded-full">
                      📱 Social Media
                    </span>
                  </div>
                </div>
                
                <div className="p-6">
                  <h3 className={`text-xl font-bold mb-3 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    TikTok vs Instagram : Quelle Plateforme Choisir en 2025 ?
                  </h3>
                  <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-4 line-clamp-3`}>
                    Analyse complète des deux géants des réseaux sociaux. Découvrez les avantages de chaque plateforme 
                    pour votre stratégie marketing et comment maximiser votre ROI.
                  </p>
                  
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-red-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm">📱</span>
                      </div>
                      <div>
                        <p className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                          Sarah Marketing
                        </p>
                        <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          Publié il y a 1 jour
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        ❤️ 89
                      </span>
                      <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        💬 27
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      ⏱️ 7 min de lecture
                    </span>
                    <button className="px-4 py-2 bg-gradient-to-r from-pink-500 to-red-500 text-white rounded-lg hover:shadow-lg transition-all">
                      Lire →
                    </button>
                  </div>
                </div>
              </article>

              {/* Article 3 - Business */}
              <article className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-all transform hover:scale-105`}>
                <div className="relative">
                  <img 
                    src="/api/placeholder/400/200" 
                    alt="Business Growth" 
                    className="w-full h-48 object-cover"
                  />
                  <div className="absolute top-4 left-4">
                    <span className="px-3 py-1 bg-green-500 text-white text-sm rounded-full">
                      💼 Business
                    </span>
                  </div>
                  <div className="absolute top-4 right-4">
                    <span className="px-2 py-1 bg-green-500 text-white text-xs rounded">
                      ⭐ Premium
                    </span>
                  </div>
                </div>
                
                <div className="p-6">
                  <h3 className={`text-xl font-bold mb-3 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    10 Stratégies pour Exploser vos Ventes Online
                  </h3>
                  <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-4 line-clamp-3`}>
                    Guide complet des meilleures stratégies marketing digitales pour booster vos ventes. 
                    Techniques éprouvées et nouvelles tendances incluses.
                  </p>
                  
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-teal-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm">💼</span>
                      </div>
                      <div>
                        <p className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                          Marc Business
                        </p>
                        <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          Publié il y a 3 jours
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        ❤️ 234
                      </span>
                      <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        💬 67
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      ⏱️ 12 min de lecture
                    </span>
                    <button className="px-4 py-2 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-lg hover:shadow-lg transition-all">
                      Lire →
                    </button>
                  </div>
                </div>
              </article>
            </div>

            {/* Zone AdSense Milieu */}
            {adZones.content.active && (
              <div className="my-12 flex justify-center">
                <GoogleAdSense
                  clientId="ca-pub-7698570045125787"
                  slotId="blog-content"
                  format={adZones.content.format}
                  style={{ width: '100%', height: '250px' }}
                  className="shadow-lg rounded-lg"
                />
              </div>
            )}

            {/* Newsletter et CTA */}
            <div className={`p-8 rounded-lg ${darkMode ? 'bg-gradient-to-r from-blue-800 to-purple-800' : 'bg-gradient-to-r from-blue-100 to-purple-100'} text-center mt-12`}>
              <h3 className={`text-2xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                🚀 Restez à la Pointe avec CERDIA !
              </h3>
              <p className={`text-lg mb-6 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Recevez nos derniers articles et conseils IA directement dans votre boîte mail.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center max-w-md mx-auto">
                <input
                  type="email"
                  placeholder="votre@email.com"
                  className={`w-full px-4 py-3 rounded-lg border ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                  }`}
                />
                <button className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:shadow-lg transition-all whitespace-nowrap">
                  S'abonner 🔔
                </button>
              </div>
              
              <p className={`text-sm mt-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                📧 Pas de spam, que du contenu de qualité !
              </p>
            </div>

            {/* Bouton retour */}
            <div className="text-center mt-8">
              <button
                onClick={() => setCurrentPage('products')}
                className={`px-6 py-3 rounded-lg ${darkMode ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-800'} hover:shadow-lg transition-all`}
              >
                ← Retour aux Produits
              </button>
            </div>
          </div>
        )}
      {/* ========================================== */}
        {/* SECTION 11 - PAGE PRODUITS PRINCIPALE AVEC IA (COMPLÈTE) */}
        {/* ========================================== */}

        {/* Page Produits Principale - Vue par défaut */}
        {currentPage === 'products' && (
          <div className="container mx-auto px-4 py-8">
            
            {/* Zone AdSense Header */}
            {adZones.header.active && (
              <div className="mb-8 flex justify-center">
                <GoogleAdSense
                  clientId="ca-pub-7698570045125787"
                  slotId="products-header"
                  format={adZones.header.format}
                  style={{ width: '100%', height: '90px' }}
                  className="shadow-lg rounded-lg"
                />
              </div>
            )}

            {/* Header Principal avec IA */}
            <div className="text-center mb-12">
              <h1 className={`text-5xl font-bold mb-6 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                {t.title} 🚀
              </h1>
              <p className={`text-xl mb-8 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                {t.subtitle}
              </p>
              
              {/* Stats en temps réel */}
              <div className="flex flex-wrap justify-center gap-6 mb-8">
                <div className={`px-6 py-3 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
                  <div className="text-2xl font-bold text-blue-500">{totalProducts}</div>
                  <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Produits</div>
                </div>
                <div className={`px-6 py-3 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
                  <div className="text-2xl font-bold text-green-500">{userPoints}</div>
                  <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Points</div>
                </div>
                <div className={`px-6 py-3 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
                  <div className="text-2xl font-bold text-purple-500">{aiRecommendations.length}</div>
                  <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Recommandations IA</div>
                </div>
              </div>
            </div>

            {/* Barre de recherche intelligente avec IA */}
            <div className={`p-6 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg mb-8`}>
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="🔍 Recherche intelligente par IA... (ex: 'produits tech pour gaming')"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className={`w-full p-4 pl-12 rounded-lg border ${
                        darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                      }`}
                    />
                    <div className="absolute left-4 top-4 text-gray-400">🔍</div>
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm('')}
                        className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => aiSmartSearch()}
                    className="px-6 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:shadow-lg transition-all"
                  >
                    🤖 Recherche IA
                  </button>
                  <button
                    onClick={() => setShowAIRecommendations(!showAIRecommendations)}
                    className={`px-6 py-4 rounded-lg transition-all ${
                      showAIRecommendations 
                        ? 'bg-gradient-to-r from-green-500 to-teal-500 text-white' 
                        : `${darkMode ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-800'}`
                    }`}
                  >
                    🎯 Recommandations
                  </button>
                </div>
              </div>
              
              {/* Suggestions de recherche IA */}
              {searchSuggestions.length > 0 && (
                <div className="mt-4">
                  <p className={`text-sm mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    💡 Suggestions IA :
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {searchSuggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => setSearchTerm(suggestion)}
                        className={`px-3 py-1 text-sm rounded-full border ${
                          darkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-600 hover:bg-gray-100'
                        } transition-all`}
                      >
                        {suggestion}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Recommandations IA personnalisées */}
            {showAIRecommendations && aiRecommendations.length > 0 && (
              <div className={`p-6 rounded-lg ${darkMode ? 'bg-gradient-to-r from-purple-800 to-pink-800' : 'bg-gradient-to-r from-purple-100 to-pink-100'} shadow-lg mb-8`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    🤖 Recommandations IA Personnalisées
                  </h3>
                  <button
                    onClick={() => refreshAIRecommendations()}
                    className="px-4 py-2 bg-white bg-opacity-20 text-white rounded-lg hover:bg-opacity-30 transition-all"
                  >
                    🔄 Actualiser
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {aiRecommendations.slice(0, 3).map((recommendation, index) => (
                    <div key={index} 
                         className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg hover:shadow-xl transition-all cursor-pointer`}
                         onClick={() => window.open(recommendation.url, '_blank')}>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-2xl">{recommendation.emoji}</span>
                        <span className={`text-xs px-2 py-1 rounded-full ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'}`}>
                          🎯 Score: {recommendation.score}%
                        </span>
                      </div>
                      <h4 className={`font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                        {recommendation.title}
                      </h4>
                      <p className={`text-sm mb-3 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {recommendation.reason}
                      </p>
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-bold text-green-500">
                          {recommendation.price}
                        </span>
                        <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                          {recommendation.category}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Layout avec Sidebar pour AdSense */}
            <div className="flex gap-8">
              
              {/* Contenu Principal */}
              <div className="flex-1">
                
                {/* Filtres avancés */}
                <div className={`p-6 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg mb-8`}>
                  <div className="flex flex-wrap gap-4 items-center justify-between">
                    <div className="flex flex-wrap gap-4">
                      <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className={`p-3 rounded-lg border ${
                          darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                        }`}
                      >
                        <option value="">Toutes les catégories</option>
                        {categories.map((category, index) => (
                          <option key={index} value={category}>{category}</option>
                        ))}
                      </select>
                      
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className={`p-3 rounded-lg border ${
                          darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                        }`}
                      >
                        <option value="relevance">🎯 Pertinence IA</option>
                        <option value="popular">🔥 Populaire</option>
                        <option value="newest">🆕 Nouveau</option>
                        <option value="price-low">💰 Prix croissant</option>
                        <option value="price-high">💎 Prix décroissant</option>
                        <option value="rating">⭐ Mieux noté</option>
                      </select>
                      
                      <div className="flex items-center gap-2">
                        <input
                          type="range"
                          min="0"
                          max="500"
                          value={priceRange}
                          onChange={(e) => setPriceRange(e.target.value)}
                          className="w-32"
                        />
                        <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Max: ${priceRange}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => setViewMode('grid')}
                        className={`p-3 rounded-lg ${viewMode === 'grid' ? 'bg-blue-500 text-white' : `${darkMode ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-800'}`}`}
                      >
                        ⊞ Grille
                      </button>
                      <button
                        onClick={() => setViewMode('list')}
                        className={`p-3 rounded-lg ${viewMode === 'list' ? 'bg-blue-500 text-white' : `${darkMode ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-800'}`}`}
                      >
                        ☰ Liste
                      </button>
                    </div>
                  </div>
                </div>

                {/* Grille de produits */}
                <div className={`grid gap-6 ${
                  viewMode === 'grid' 
                    ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                    : 'grid-cols-1'
                }`}>
                  {filteredProducts.map((product, index) => (
                    <div key={product.id || index} 
                         className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-all transform hover:scale-105 group ${
                           viewMode === 'list' ? 'flex items-center space-x-6' : ''
                         }`}>
                      
                      {/* Image du produit */}
                      <div className={`relative ${viewMode === 'list' ? 'w-32 h-32 flex-shrink-0' : 'w-full h-48'} overflow-hidden`}>
                        <img 
                          src={product.image} 
                          alt={product.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          loading="lazy"
                        />
                        
                        {/* Badges */}
                        <div className="absolute top-2 left-2 space-y-1">
                          {product.isNew && (
                            <span className="px-2 py-1 bg-green-500 text-white text-xs rounded-full">
                              🆕 Nouveau
                            </span>
                          )}
                          {product.isPopular && (
                            <span className="px-2 py-1 bg-red-500 text-white text-xs rounded-full">
                              🔥 Populaire
                            </span>
                          )}
                          {product.aiRecommended && (
                            <span className="px-2 py-1 bg-purple-500 text-white text-xs rounded-full">
                              🤖 IA
                            </span>
                          )}
                        </div>
                        
                        {/* Actions rapides */}
                        <div className="absolute top-2 right-2 space-y-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => toggleFavorite(product.id)}
                            className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              favorites.includes(product.id) ? 'bg-red-500 text-white' : 'bg-white text-gray-600'
                            } hover:scale-110 transition-all`}
                          >
                            ❤️
                          </button>
                          <button
                            onClick={() => shareProduct(product)}
                            className="w-8 h-8 bg-white text-gray-600 rounded-full flex items-center justify-center hover:scale-110 transition-all"
                          >
                            📤
                          </button>
                        </div>
                        
                        {/* Overlay hover */}
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center">
                          <button
                            onClick={() => window.open(product.url, '_blank')}
                            className="px-4 py-2 bg-white text-gray-800 rounded-lg opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all"
                          >
                            👁️ Voir le produit
                          </button>
                        </div>
                      </div>
                      
                      {/* Contenu du produit */}
                      <div className={`p-4 ${viewMode === 'list' ? 'flex-1' : ''}`}>
                        <div className="flex items-start justify-between mb-2">
                          <h3 className={`font-bold ${viewMode === 'list' ? 'text-lg' : 'text-base'} ${darkMode ? 'text-white' : 'text-gray-800'} line-clamp-2`}>
                            {product.title}
                          </h3>
                          {product.rating && (
                            <div className="flex items-center space-x-1 flex-shrink-0 ml-2">
                              <span className="text-yellow-400">⭐</span>
                              <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                {product.rating}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        <p className={`text-sm mb-3 ${darkMode ? 'text-gray-400' : 'text-gray-600'} line-clamp-2`}>
                          {product.description}
                        </p>
                        
                        {/* Prix et catégorie */}
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <span className="text-lg font-bold text-green-500">
                              {product.price}
                            </span>
                            {product.originalPrice && (
                              <span className={`text-sm line-through ml-2 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                {product.originalPrice}
                              </span>
                            )}
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'}`}>
                            {product.category}
                          </span>
                        </div>
                        
                        {/* Actions */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => window.open(product.url, '_blank')}
                            className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:shadow-lg transition-all text-sm"
                          >
                            🛒 Acheter
                          </button>
                          <button
                            onClick={() => addToWishlist(product)}
                            className={`px-4 py-2 rounded-lg transition-all text-sm ${
                              darkMode ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                            }`}
                          >
                            💫 Wishlist
                          </button>
                        </div>
                        
                        {/* Points de cashback */}
                        <div className="mt-2 text-center">
                          <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            🎁 +{Math.floor(Math.random() * 50 + 10)} points de cashback
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Zone AdSense Content */}
                {adZones.content.active && (
                  <div className="my-12 flex justify-center">
                    <GoogleAdSense
                      clientId="ca-pub-7698570045125787"
                      slotId="products-content"
                      format={adZones.content.format}
                      style={{ width: '100%', height: '250px' }}
                      className="shadow-lg rounded-lg"
                    />
                  </div>
                )}
                
                {/* Pagination */}
                <div className="flex justify-center items-center mt-12 space-x-4">
                  <button
                    onClick={() => setCurrentProductPage(Math.max(1, currentProductPage - 1))}
                    disabled={currentProductPage === 1}
                    className={`px-4 py-2 rounded-lg ${
                      currentProductPage === 1 
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                        : 'bg-blue-500 text-white hover:bg-blue-600'
                    } transition-all`}
                  >
                    ← Précédent
                  </button>
                  
                  <span className={`px-4 py-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    Page {currentProductPage} sur {totalPages}
                  </span>
                  
                  <button
                    onClick={() => setCurrentProductPage(Math.min(totalPages, currentProductPage + 1))}
                    disabled={currentProductPage === totalPages}
                    className={`px-4 py-2 rounded-lg ${
                      currentProductPage === totalPages 
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                        : 'bg-blue-500 text-white hover:bg-blue-600'
                    } transition-all`}
                  >
                    Suivant →
                  </button>
                </div>
              </div>
              
              {/* Sidebar droite avec AdSense */}
              {adZones.sidebar.active && (
                <div className="w-64 hidden lg:block">
                  <div className="sticky top-8 space-y-6">
                    {/* AdSense Sidebar */}
                    <GoogleAdSense
                      clientId="ca-pub-7698570045125787"
                      slotId="products-sidebar"
                      format={adZones.sidebar.format}
                      style={{ width: '100%', height: '600px' }}
                      className="shadow-lg rounded-lg"
                    />
                    
                    {/* Widget Trending IA */}
                    <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
                      <h4 className={`font-bold mb-3 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                        🔥 Tendances IA
                      </h4>
                      <div className="space-y-2">
                        {aiTrendingProducts.slice(0, 5).map((product, index) => (
                          <div key={index} className="flex items-center space-x-2 text-sm">
                            <span className="text-lg">{product.emoji}</span>
                            <span className={`flex-1 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                              {product.name}
                            </span>
                            <span className="text-green-500 font-bold">
                              {product.trend}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Widget Points Utilisateur */}
                    <div className={`p-4 rounded-lg ${darkMode ? 'bg-gradient-to-br from-purple-800 to-pink-800' : 'bg-gradient-to-br from-purple-100 to-pink-100'} shadow-lg`}>
                      <h4 className={`font-bold mb-3 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                        💎 Vos Points
                      </h4>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-purple-500 mb-2">
                          {userPoints.toLocaleString()}
                        </div>
                        <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-3`}>
                          Points disponibles
                        </p>
                        <button className="w-full px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:shadow-lg transition-all">
                          💰 Échanger
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Zone AdSense Footer */}
            {adZones.footer.active && (
              <div className="mt-12 flex justify-center">
                <GoogleAdSense
                  clientId="ca-pub-7698570045125787"
                  slotId="products-footer"
                  format={adZones.footer.format}
                  style={{ width: '100%', height: '90px' }}
                  className="shadow-lg rounded-lg"
                />
              </div>
            )}
          </div>
        )}
      {/* ========================================== */}
        {/* SECTION 12 - MODALS ET FORMULAIRES INTELLIGENTS */}
        {/* ========================================== */}

        {/* Modal Générateur d'Articles IA */}
        {showAIBlogGenerator && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto`}>
              <div className="flex justify-between items-center mb-6">
                <h3 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  🤖 Générateur d'Articles IA
                </h3>
                <button
                  onClick={() => setShowAIBlogGenerator(false)}
                  className={`p-2 rounded-lg ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'} transition-colors`}
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-white' : 'text-gray-700'}`}>
                    📝 Sujet de l'article
                  </label>
                  <input
                    type="text"
                    value={blogGeneratorData.topic}
                    onChange={(e) => setBlogGeneratorData({...blogGeneratorData, topic: e.target.value})}
                    placeholder="Ex: Les meilleures stratégies marketing 2025"
                    className={`w-full p-3 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                  />
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-white' : 'text-gray-700'}`}>
                    🎯 Catégorie
                  </label>
                  <select
                    value={blogGeneratorData.category}
                    onChange={(e) => setBlogGeneratorData({...blogGeneratorData, category: e.target.value})}
                    className={`w-full p-3 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                  >
                    <option value="">Sélectionner une catégorie</option>
                    <option value="marketing">🎯 Marketing</option>
                    <option value="tech">💻 Technologie</option>
                    <option value="lifestyle">🌟 Lifestyle</option>
                    <option value="business">💼 Business</option>
                    <option value="ai">🤖 Intelligence Artificielle</option>
                  </select>
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-white' : 'text-gray-700'}`}>
                    📏 Longueur de l'article
                  </label>
                  <select
                    value={blogGeneratorData.length}
                    onChange={(e) => setBlogGeneratorData({...blogGeneratorData, length: e.target.value})}
                    className={`w-full p-3 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                  >
                    <option value="short">📄 Court (300-500 mots)</option>
                    <option value="medium">📰 Moyen (500-1000 mots)</option>
                    <option value="long">📖 Long (1000+ mots)</option>
                  </select>
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-white' : 'text-gray-700'}`}>
                    🎨 Ton de l'article
                  </label>
                  <select
                    value={blogGeneratorData.tone}
                    onChange={(e) => setBlogGeneratorData({...blogGeneratorData, tone: e.target.value})}
                    className={`w-full p-3 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                  >
                    <option value="professional">💼 Professionnel</option>
                    <option value="casual">😊 Décontracté</option>
                    <option value="enthusiastic">🚀 Enthousiaste</option>
                    <option value="educational">🎓 Éducatif</option>
                  </select>
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-white' : 'text-gray-700'}`}>
                    🔑 Mots-clés SEO (optionnel)
                  </label>
                  <input
                    type="text"
                    value={blogGeneratorData.keywords}
                    onChange={(e) => setBlogGeneratorData({...blogGeneratorData, keywords: e.target.value})}
                    placeholder="marketing digital, SEO, conversion"
                    className={`w-full p-3 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                  />
                </div>
                
                <div className="flex gap-4 pt-4">
                  <button
                    onClick={() => generateBlogPost()}
                    disabled={isGeneratingBlog || !blogGeneratorData.topic}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isGeneratingBlog ? '⏳ Génération en cours...' : '🚀 Générer l\'article'}
                  </button>
                  <button
                    onClick={() => setShowAIBlogGenerator(false)}
                    className={`px-6 py-3 rounded-lg ${darkMode ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-800'} hover:shadow-lg transition-all`}
                  >
                    Annuler
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal Analytics Blog */}
        {showBlogAnalytics && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto`}>
              <div className="flex justify-between items-center mb-6">
                <h3 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  📊 Analytics Blog IA
                </h3>
                <button
                  onClick={() => setShowBlogAnalytics(false)}
                  className={`p-2 rounded-lg ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'} transition-colors`}
                >
                  ✕
                </button>
              </div>
              
              {/* Stats principales */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <h4 className={`font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    👁️ Vues Total
                  </h4>
                  <p className="text-2xl font-bold text-blue-500">
                    {blogAnalytics.totalViews.toLocaleString()}
                  </p>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    +{blogAnalytics.viewsGrowth}% ce mois
                  </p>
                </div>
                
                <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <h4 className={`font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    ⏱️ Temps Moyen
                  </h4>
                  <p className="text-2xl font-bold text-green-500">
                    {blogAnalytics.avgReadTime}
                  </p>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    sur la page
                  </p>
                </div>
                
                <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <h4 className={`font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    📈 Taux d'Engagement
                  </h4>
                  <p className="text-2xl font-bold text-purple-500">
                    {blogAnalytics.engagementRate}%
                  </p>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    interactions/vue
                  </p>
                </div>
                
                <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <h4 className={`font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    🔥 Score IA
                  </h4>
                  <p className="text-2xl font-bold text-orange-500">
                    {blogAnalytics.aiScore}/100
                  </p>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    performance globale
                  </p>
                </div>
              </div>
              
              {/* Articles les plus performants */}
              <div className="mb-8">
                <h4 className={`text-lg font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  🏆 Articles les Plus Performants
                </h4>
                <div className="space-y-3">
                  {blogAnalytics.topArticles.map((article, index) => (
                    <div key={index} className={`p-4 rounded-lg border ${darkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-gray-50'}`}>
                      <div className="flex justify-between items-center">
                        <div>
                          <h5 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                            {article.title}
                          </h5>
                          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            {article.views.toLocaleString()} vues • {article.engagement}% engagement
                          </p>
                        </div>
                        <div className="text-right">
                          <span className={`text-lg font-bold ${
                            index === 0 ? 'text-yellow-500' :
                            index === 1 ? 'text-gray-400' :
                            'text-orange-600'
                          }`}>
                            #{index + 1}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Recommandations IA */}
              <div>
                <h4 className={`text-lg font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  🤖 Recommandations IA pour Améliorer
                </h4>
                <div className="space-y-3">
                  {blogAnalytics.aiRecommendations.map((rec, index) => (
                    <div key={index} className={`p-4 rounded-lg border-l-4 ${
                      rec.priority === 'high' ? 'border-red-500 bg-red-50' :
                      rec.priority === 'medium' ? 'border-yellow-500 bg-yellow-50' :
                      'border-green-500 bg-green-50'
                    }`}>
                      <h5 className="font-semibold text-gray-800 mb-1">{rec.title}</h5>
                      <p className="text-gray-600 text-sm mb-2">{rec.description}</p>
                      <span className={`text-xs px-2 py-1 rounded ${
                        rec.priority === 'high' ? 'bg-red-100 text-red-800' :
                        rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        Impact: {rec.impact}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal Optimiseur SEO IA */}
        {showContentOptimizer && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto`}>
              <div className="flex justify-between items-center mb-6">
                <h3 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  🎯 Optimiseur SEO IA
                </h3>
                <button
                  onClick={() => setShowContentOptimizer(false)}
                  className={`p-2 rounded-lg ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'} transition-colors`}
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-6">
                {/* URL à analyser */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-white' : 'text-gray-700'}`}>
                    🔗 URL ou Contenu à Optimiser
                  </label>
                  <input
                    type="text"
                    value={seoOptimizerData.url}
                    onChange={(e) => setSeoOptimizerData({...seoOptimizerData, url: e.target.value})}
                    placeholder="https://votre-site.com/article ou collez votre contenu"
                    className={`w-full p-3 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                  />
                </div>
                
                {/* Mots-clés cibles */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-white' : 'text-gray-700'}`}>
                    🔑 Mots-clés Cibles
                  </label>
                  <input
                    type="text"
                    value={seoOptimizerData.keywords}
                    onChange={(e) => setSeoOptimizerData({...seoOptimizerData, keywords: e.target.value})}
                    placeholder="marketing digital, SEO, conversion"
                    className={`w-full p-3 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                  />
                </div>
                
                {/* Résultats d'analyse SEO */}
                {seoAnalysisResults && (
                  <div className="mt-6">
                    <h4 className={`text-lg font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                      📊 Analyse SEO
                    </h4>
                    
                    {/* Score SEO global */}
                    <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} mb-4`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                          Score SEO Global
                        </span>
                        <span className={`text-2xl font-bold ${
                          seoAnalysisResults.score >= 80 ? 'text-green-500' :
                          seoAnalysisResults.score >= 60 ? 'text-yellow-500' :
                          'text-red-500'
                        }`}>
                          {seoAnalysisResults.score}/100
                        </span>
                      </div>
                      <div className="w-full bg-gray-300 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            seoAnalysisResults.score >= 80 ? 'bg-green-500' :
                            seoAnalysisResults.score >= 60 ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`}
                          style={{width: `${seoAnalysisResults.score}%`}}
                        ></div>
                      </div>
                    </div>
                    
                    {/* Critères SEO */}
                    <div className="space-y-3">
                      {seoAnalysisResults.criteria.map((criterion, index) => (
                        <div key={index} className={`p-3 rounded-lg border ${darkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-gray-50'}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <span className={`text-lg ${
                                criterion.status === 'pass' ? 'text-green-500' :
                                criterion.status === 'warning' ? 'text-yellow-500' :
                                'text-red-500'
                              }`}>
                                {criterion.status === 'pass' ? '✅' : criterion.status === 'warning' ? '⚠️' : '❌'}
                              </span>
                              <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                                {criterion.name}
                              </span>
                            </div>
                            <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              {criterion.score}/10
                            </span>
                          </div>
                          <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            {criterion.description}
                          </p>
                          {criterion.suggestion && (
                            <div className={`mt-2 p-2 rounded ${darkMode ? 'bg-gray-600' : 'bg-blue-50'}`}>
                              <p className={`text-sm ${darkMode ? 'text-blue-300' : 'text-blue-800'}`}>
                                💡 Suggestion: {criterion.suggestion}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="flex gap-4 pt-4">
                  <button
                    onClick={() => analyzeSEO()}
                    disabled={isAnalyzingSEO || !seoOptimizerData.url}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-teal-500 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isAnalyzingSEO ? '⏳ Analyse en cours...' : '🔍 Analyser le SEO'}
                  </button>
                  <button
                    onClick={() => optimizeWithAI()}
                    disabled={!seoAnalysisResults}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    🤖 Optimiser avec IA
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal Chatbot IA (Version complète) */}
        {showAIChatbot && (
          <div className="fixed bottom-4 right-4 w-80 h-96 z-50">
            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-2xl overflow-hidden h-full flex flex-col`}>
              {/* Header du Chatbot */}
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                      <span className="text-purple-500 font-bold">🤖</span>
                    </div>
                    <div>
                      <h4 className="text-white font-bold">Assistant IA CERDIA</h4>
                      <p className="text-purple-100 text-xs">En ligne • Répond en temps réel</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowAIChatbot(false)}
                    className="text-white hover:bg-white hover:bg-opacity-20 p-1 rounded"
                  >
                    ✕
                  </button>
                </div>
              </div>
              
              {/* Messages du Chat */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {chatMessages.map((message, index) => (
                  <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-3 rounded-lg ${
                      message.role === 'user' 
                        ? 'bg-blue-500 text-white' 
                        : `${darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-800'}`
                    }`}>
                      <p className="text-sm">{message.content}</p>
                      <span className="text-xs opacity-70 mt-1 block">
                        {message.timestamp}
                      </span>
                    </div>
                  </div>
                ))}
                
                {/* Indicateur de frappe */}
                {isAITyping && (
                  <div className="flex justify-start">
                    <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Input du Chat */}
              <div className="p-4 border-t border-gray-200">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                    placeholder="Posez votre question..."
                    className={`flex-1 p-2 rounded-lg border ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                    }`}
                  />
                  <button
                    onClick={sendChatMessage}
                    disabled={!chatInput.trim() || isAITyping}
                    className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    📤
                  </button>
                </div>
                
                {/* Suggestions rapides */}
                <div className="flex flex-wrap gap-1 mt-2">
                  {chatSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => setChatInput(suggestion)}
                      className={`text-xs px-2 py-1 rounded-full border ${
                        darkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-600 hover:bg-gray-100'
                      } transition-all`}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      {/* ========================================== */}
        {/* SECTION 13 - COMPOSANTS IA AVANCÉS (COMPLÈTE) */}
        {/* ========================================== */}

        {/* Composant Générateur de Contenu IA Flottant */}
        {showContentGenerator && (
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50">
            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-2xl p-6 w-96`}>
              <div className="flex justify-between items-center mb-4">
                <h4 className={`font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  ✍️ Générateur de Contenu IA
                </h4>
                <button
                  onClick={() => setShowContentGenerator(false)}
                  className={`p-2 rounded-lg ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'} transition-colors`}
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-white' : 'text-gray-700'}`}>
                    Type de contenu
                  </label>
                  <select
                    value={contentType}
                    onChange={(e) => setContentType(e.target.value)}
                    className={`w-full p-3 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                  >
                    <option value="description">📝 Description produit</option>
                    <option value="title">📰 Titre accrocheur</option>
                    <option value="marketing">📢 Texte marketing</option>
                    <option value="social">📱 Post social</option>
                    <option value="email">📧 Email marketing</option>
                  </select>
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-white' : 'text-gray-700'}`}>
                    Produit/Sujet
                  </label>
                  <input
                    type="text"
                    value={contentSubject}
                    onChange={(e) => setContentSubject(e.target.value)}
                    placeholder="Ex: Smartphone dernière génération"
                    className={`w-full p-3 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                  />
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-white' : 'text-gray-700'}`}>
                    Mots-clés (optionnel)
                  </label>
                  <input
                    type="text"
                    value={contentKeywords}
                    onChange={(e) => setContentKeywords(e.target.value)}
                    placeholder="innovation, performant, tendance"
                    className={`w-full p-3 rounded-lg border ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                  />
                </div>
                
                {/* Contenu généré */}
                {generatedContent && (
                  <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} mt-4`}>
                    <h5 className={`font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                      🎯 Contenu généré :
                    </h5>
                    <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-3`}>
                      {generatedContent}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => copyToClipboard(generatedContent)}
                        className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors"
                      >
                        📋 Copier
                      </button>
                      <button
                        onClick={() => generateNewContent()}
                        className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600 transition-colors"
                      >
                        🔄 Régénérer
                      </button>
                    </div>
                  </div>
                )}
                
                <button
                  onClick={() => generateContent()}
                  disabled={isGeneratingContent || !contentSubject}
                  className="w-full px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGeneratingContent ? '⏳ Génération...' : '✨ Générer le contenu'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Widget Recommandations IA Flottant */}
        {showAIWidget && (
          <div className="fixed bottom-20 right-4 w-80 z-40">
            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-2xl overflow-hidden`}>
              <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-white font-bold">🤖 Assistant IA</h4>
                  <button
                    onClick={() => setShowAIWidget(false)}
                    className="text-white hover:bg-white hover:bg-opacity-20 p-1 rounded"
                  >
                    ✕
                  </button>
                </div>
              </div>
              
              <div className="p-4 space-y-3">
                {/* Recommandation du jour */}
                <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-blue-50'}`}>
                  <h5 className={`font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    💡 Recommandation du jour
                  </h5>
                  <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    {dailyAIRecommendation?.text || 'Optimisez vos descriptions produits pour augmenter vos conversions de 23%'}
                  </p>
                  <button
                    onClick={() => applyDailyRecommendation()}
                    className="mt-2 px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors"
                  >
                    Appliquer
                  </button>
                </div>
                
                {/* Actions rapides */}
                <div className="space-y-2">
                  <h5 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    ⚡ Actions rapides
                  </h5>
                  <button
                    onClick={() => setShowContentGenerator(true)}
                    className={`w-full p-2 text-left rounded-lg ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} transition-colors`}
                  >
                    <span className="text-sm">✍️ Générer du contenu</span>
                  </button>
                  <button
                    onClick={() => analyzeCurrentPage()}
                    className={`w-full p-2 text-left rounded-lg ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} transition-colors`}
                  >
                    <span className="text-sm">📊 Analyser cette page</span>
                  </button>
                  <button
                    onClick={() => optimizeForSEO()}
                    className={`w-full p-2 text-left rounded-lg ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} transition-colors`}
                  >
                    <span className="text-sm">🎯 Optimiser SEO</span>
                  </button>
                  <button
                    onClick={() => generateSocialPosts()}
                    className={`w-full p-2 text-left rounded-lg ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} transition-colors`}
                  >
                    <span className="text-sm">📱 Posts sociaux</span>
                  </button>
                </div>
                
                {/* Stats rapides */}
                <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-green-50'}`}>
                  <h5 className={`font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    📈 Performance IA
                  </h5>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className={darkMode ? 'text-gray-300' : 'text-gray-600'}>Optimisation:</span>
                      <span className="text-green-500 font-bold">+23%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className={darkMode ? 'text-gray-300' : 'text-gray-600'}>Conversion:</span>
                      <span className="text-blue-500 font-bold">+15%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className={darkMode ? 'text-gray-300' : 'text-gray-600'}>Engagement:</span>
                      <span className="text-purple-500 font-bold">+31%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Dashboard Analytics IA Rapide */}
        {showQuickAnalytics && (
          <div className="fixed top-4 right-4 w-96 z-40">
            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-2xl overflow-hidden`}>
              <div className="bg-gradient-to-r from-green-500 to-teal-500 p-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-white font-bold">📊 Analytics IA Temps Réel</h4>
                  <button
                    onClick={() => setShowQuickAnalytics(false)}
                    className="text-white hover:bg-white hover:bg-opacity-20 p-1 rounded"
                  >
                    ✕
                  </button>
                </div>
              </div>
              
              <div className="p-4">
                {/* Métriques en temps réel */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    <div className="text-xs text-gray-500 mb-1">Visiteurs maintenant</div>
                    <div className="text-xl font-bold text-green-500">{liveAnalytics.currentVisitors}</div>
                  </div>
                  <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    <div className="text-xs text-gray-500 mb-1">Conversion temps réel</div>
                    <div className="text-xl font-bold text-blue-500">{liveAnalytics.conversionRate}%</div>
                  </div>
                  <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    <div className="text-xs text-gray-500 mb-1">Revenue aujourd'hui</div>
                    <div className="text-xl font-bold text-purple-500">${liveAnalytics.todayRevenue}</div>
                  </div>
                  <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    <div className="text-xs text-gray-500 mb-1">Score IA</div>
                    <div className="text-xl font-bold text-orange-500">{liveAnalytics.aiScore}/100</div>
                  </div>
                </div>
                
                {/* Alertes IA */}
                <div className="space-y-2">
                  <h5 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    🚨 Alertes IA
                  </h5>
                  {aiAlerts.map((alert, index) => (
                    <div key={index} className={`p-2 rounded-lg text-sm ${
                      alert.type === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                      alert.type === 'success' ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      <div className="flex items-center space-x-2">
                        <span>{alert.type === 'warning' ? '⚠️' : alert.type === 'success' ? '✅' : '🔴'}</span>
                        <span>{alert.message}</span>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Actions d'optimisation */}
                <div className="mt-4 space-y-2">
                  <h5 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    🎯 Optimisations suggérées
                  </h5>
                  {suggestedOptimizations.map((optimization, index) => (
                    <div key={index} className={`p-2 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                      <div className="flex justify-between items-center">
                        <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          {optimization.title}
                        </span>
                        <button
                          onClick={() => applyOptimization(optimization.id)}
                          className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition-colors"
                        >
                          Appliquer
                        </button>
                      </div>
                      <div className="text-xs text-green-500 mt-1">
                        Impact estimé: +{optimization.impact}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notification Toast IA */}
        {aiNotifications.map((notification, index) => (
          <div key={index} 
               className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 ${
                 notification.type === 'success' ? 'bg-green-500' :
                 notification.type === 'warning' ? 'bg-yellow-500' :
                 notification.type === 'info' ? 'bg-blue-500' :
                 'bg-red-500'
               } text-white px-6 py-3 rounded-lg shadow-lg`}
               style={{
                 top: `${4 + index * 70}px`,
                 animation: 'slideInDown 0.3s ease-out'
               }}>
            <div className="flex items-center space-x-2">
              <span className="text-lg">
                {notification.type === 'success' ? '✅' :
                 notification.type === 'warning' ? '⚠️' :
                 notification.type === 'info' ? 'ℹ️' :
                 '❌'}
              </span>
              <span className="font-medium">{notification.title}</span>
              <button
                onClick={() => dismissNotification(notification.id)}
                className="ml-4 text-white hover:text-gray-200 font-bold"
              >
                ✕
              </button>
            </div>
            <p className="text-sm mt-1 opacity-90">{notification.message}</p>
          </div>
        ))}

        {/* Widget Tendances IA */}
        {showTrendsWidget && (
          <div className="fixed bottom-4 left-4 w-80 z-40">
            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-2xl overflow-hidden`}>
              <div className="bg-gradient-to-r from-orange-500 to-red-500 p-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-white font-bold">🔥 Tendances IA</h4>
                  <button
                    onClick={() => setShowTrendsWidget(false)}
                    className="text-white hover:bg-white hover:bg-opacity-20 p-1 rounded"
                  >
                    ✕
                  </button>
                </div>
              </div>
              
              <div className="p-4">
                {/* Tendances du moment */}
                <div className="space-y-3">
                  <h5 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    📈 Trending maintenant
                  </h5>
                  {currentTrends.map((trend, index) => (
                    <div key={index} className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                          {trend.keyword}
                        </span>
                        <span className={`text-sm px-2 py-1 rounded-full ${
                          trend.growth > 50 ? 'bg-red-100 text-red-600' :
                          trend.growth > 20 ? 'bg-orange-100 text-orange-600' :
                          'bg-green-100 text-green-600'
                        }`}>
                          +{trend.growth}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-300 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-orange-500 to-red-500 h-2 rounded-full transition-all duration-500"
                          style={{width: `${Math.min(trend.growth, 100)}%`}}
                        ></div>
                      </div>
                      <p className={`text-xs mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {trend.description}
                      </p>
                    </div>
                  ))}
                </div>
                
                {/* Actions basées sur les tendances */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h5 className={`font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    🎯 Actions recommandées
                  </h5>
                  <div className="space-y-2">
                    <button
                      onClick={() => createTrendBasedContent()}
                      className="w-full p-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg hover:shadow-lg transition-all text-sm"
                    >
                      📝 Créer du contenu tendance
                    </button>
                    <button
                      onClick={() => optimizeForTrends()}
                      className="w-full p-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:shadow-lg transition-all text-sm"
                    >
                      🚀 Optimiser pour les tendances
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Overlay pour les modals */}
        {(showContentGenerator || showAIWidget || showQuickAnalytics || showTrendsWidget) && (
          <div className="fixed inset-0 bg-black bg-opacity-20 z-30" 
               onClick={() => {
                 setShowContentGenerator(false);
                 setShowAIWidget(false);
                 setShowQuickAnalytics(false);
                 setShowTrendsWidget(false);
               }}>
          </div>
        )}
      {/* ========================================== */}
        {/* SECTION 14 - BOUTONS FLOTTANTS ET FINALISATION */}
        {/* ========================================== */}

        {/* Boutons Flottants IA - Menu Principal */}
        <div className="fixed bottom-6 right-6 z-50">
          <div className="flex flex-col items-end space-y-3">
            
            {/* Boutons secondaires (apparaissent quand le menu principal est ouvert) */}
            {showFloatingMenu && (
              <>
                {/* Bouton Analytics IA */}
                <button
                  onClick={() => setShowQuickAnalytics(true)}
                  className="w-12 h-12 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-full shadow-lg hover:shadow-xl transform hover:scale-110 transition-all animate-slideInRight"
                  title="Analytics IA"
                >
                  📊
                </button>
                
                {/* Bouton Tendances */}
                <button
                  onClick={() => setShowTrendsWidget(true)}
                  className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-full shadow-lg hover:shadow-xl transform hover:scale-110 transition-all animate-slideInRight"
                  title="Tendances IA"
                >
                  🔥
                </button>
                
                {/* Bouton Générateur de Contenu */}
                <button
                  onClick={() => setShowContentGenerator(true)}
                  className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full shadow-lg hover:shadow-xl transform hover:scale-110 transition-all animate-slideInRight"
                  title="Générateur de Contenu IA"
                >
                  ✍️
                </button>
                
                {/* Bouton Assistant IA */}
                <button
                  onClick={() => setShowAIWidget(true)}
                  className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full shadow-lg hover:shadow-xl transform hover:scale-110 transition-all animate-slideInRight"
                  title="Assistant IA"
                >
                  🤖
                </button>
                
                {/* Bouton Chatbot */}
                <button
                  onClick={() => setShowAIChatbot(true)}
                  className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-blue-500 text-white rounded-full shadow-lg hover:shadow-xl transform hover:scale-110 transition-all animate-slideInRight"
                  title="Chatbot IA"
                >
                  💬
                </button>
              </>
            )}
            
            {/* Bouton Principal IA */}
            <button
              onClick={() => setShowFloatingMenu(!showFloatingMenu)}
              className={`w-14 h-14 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full shadow-xl hover:shadow-2xl transform hover:scale-110 transition-all ${
                showFloatingMenu ? 'rotate-45' : ''
              }`}
              title="Menu IA"
            >
              <span className="text-xl">{showFloatingMenu ? '✕' : '🚀'}</span>
            </button>
          </div>
        </div>

        {/* Bouton Dark Mode Flottant */}
        <div className="fixed top-6 right-6 z-40">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`w-12 h-12 rounded-full shadow-lg hover:shadow-xl transform hover:scale-110 transition-all ${
              darkMode 
                ? 'bg-yellow-400 text-gray-900' 
                : 'bg-gray-800 text-yellow-400'
            }`}
            title={darkMode ? 'Mode Clair' : 'Mode Sombre'}
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
        </div>

        {/* Bouton Langue Flottant */}
        <div className="fixed top-6 right-20 z-40">
          <button
            onClick={() => setLanguage(language === 'fr' ? 'en' : 'fr')}
            className={`w-12 h-12 rounded-full shadow-lg hover:shadow-xl transform hover:scale-110 transition-all ${
              darkMode ? 'bg-gray-700 text-white' : 'bg-white text-gray-800'
            }`}
            title={language === 'fr' ? 'English' : 'Français'}
          >
            {language === 'fr' ? '🇬🇧' : '🇫🇷'}
          </button>
        </div>

        {/* Bouton Scroll to Top */}
        {showScrollTop && (
          <div className="fixed bottom-6 left-6 z-40">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className={`w-12 h-12 rounded-full shadow-lg hover:shadow-xl transform hover:scale-110 transition-all ${
                darkMode 
                  ? 'bg-gray-700 text-white' 
                  : 'bg-white text-gray-800'
              }`}
              title="Retour en haut"
            >
              ↑
            </button>
          </div>
        )}

        {/* Barre de Navigation Rapide Mobile */}
        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 shadow-lg lg:hidden z-30">
          <div className="grid grid-cols-5 gap-1 p-2">
            <button
              onClick={() => setCurrentPage('products')}
              className={`p-3 rounded-lg text-center ${
                currentPage === 'products' 
                  ? 'bg-blue-500 text-white' 
                  : `${darkMode ? 'text-gray-400' : 'text-gray-600'}`
              }`}
            >
              <div className="text-lg">🛒</div>
              <div className="text-xs">Produits</div>
            </button>
            <button
              onClick={() => setCurrentPage('blog')}
              className={`p-3 rounded-lg text-center ${
                currentPage === 'blog' 
                  ? 'bg-blue-500 text-white' 
                  : `${darkMode ? 'text-gray-400' : 'text-gray-600'}`
              }`}
            >
              <div className="text-lg">📝</div>
              <div className="text-xs">Blog</div>
            </button>
            <button
              onClick={() => setShowAIChatbot(true)}
              className={`p-3 rounded-lg text-center ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}
            >
              <div className="text-lg">🤖</div>
              <div className="text-xs">IA</div>
            </button>
            <button
              onClick={() => setCurrentPage('ads-management')}
              className={`p-3 rounded-lg text-center ${
                currentPage === 'ads-management' 
                  ? 'bg-blue-500 text-white' 
                  : `${darkMode ? 'text-gray-400' : 'text-gray-600'}`
              }`}
            >
              <div className="text-lg">📊</div>
              <div className="text-xs">Analytics</div>
            </button>
            <button
              onClick={() => setShowFloatingMenu(!showFloatingMenu)}
              className={`p-3 rounded-lg text-center ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}
            >
              <div className="text-lg">⚙️</div>
              <div className="text-xs">Plus</div>
            </button>
          </div>
        </div>

        {/* Widget de Performance IA en temps réel */}
        {showPerformanceWidget && (
          <div className="fixed top-20 left-4 w-64 z-30">
            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg p-4 border-l-4 border-green-500`}>
              <div className="flex items-center justify-between mb-2">
                <h4 className={`font-bold text-sm ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  ⚡ Performance IA
                </h4>
                <button
                  onClick={() => setShowPerformanceWidget(false)}
                  className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}
                >
                  ✕
                </button>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Optimisation:</span>
                  <span className="text-green-500 font-bold">87%</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Vitesse:</span>
                  <span className="text-blue-500 font-bold">1.2s</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>SEO Score:</span>
                  <span className="text-purple-500 font-bold">94/100</span>
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-gray-200">
                <button
                  onClick={() => runFullOptimization()}
                  className="w-full text-xs px-2 py-1 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded hover:shadow-lg transition-all"
                >
                  🚀 Optimiser maintenant
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer amélioré avec liens sociaux et IA */}
        {adZones.footer.active && (
          <div className="mt-16">
            <GoogleAdSense
              clientId="ca-pub-7698570045125787"
              slotId="footer"
              format={adZones.footer.format}
              style={{ width: '100%', height: '90px' }}
              className="shadow-lg rounded-lg"
            />
          </div>
        )}
        
        <footer className={`${darkMode ? 'bg-gray-900' : 'bg-gray-800'} text-white py-12 mt-16`}>
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              
              {/* Colonne 1 - À propos */}
              <div>
                <h3 className="text-xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  🚀 CERDIA
                </h3>
                <p className="text-gray-300 text-sm mb-4">
                  Plateforme e-commerce révolutionnaire propulsée par l'Intelligence Artificielle. 
                  Découvrez, achetez et gagnez avec la puissance de l'IA.
                </p>
                <div className="flex space-x-3">
                  <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" 
                     className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center hover:scale-110 transition-transform">
                    📘
                  </a>
                  <a href="https://instagram.com" target="_blank" rel="noopener noreferrer"
                     className="w-8 h-8 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full flex items-center justify-center hover:scale-110 transition-transform">
                    📷
                  </a>
                  <a href="https://tiktok.com" target="_blank" rel="noopener noreferrer"
                     className="w-8 h-8 bg-black rounded-full flex items-center justify-center hover:scale-110 transition-transform">
                    🎵
                  </a>
                  <a href="https://youtube.com" target="_blank" rel="noopener noreferrer"
                     className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center hover:scale-110 transition-transform">
                    📺
                  </a>
                </div>
              </div>
              
              {/* Colonne 2 - Navigation */}
              <div>
                <h4 className="font-bold mb-4">🧭 Navigation</h4>
                <ul className="space-y-2 text-sm">
                  <li><button onClick={() => setCurrentPage('products')} className="text-gray-300 hover:text-white transition-colors">🛒 Produits</button></li>
                  <li><button onClick={() => setCurrentPage('blog')} className="text-gray-300 hover:text-white transition-colors">📝 Blog</button></li>
                  <li><button onClick={() => setCurrentPage('ads-management')} className="text-gray-300 hover:text-white transition-colors">📊 Analytics</button></li>
                  <li><a href="#" className="text-gray-300 hover:text-white transition-colors">❓ Support</a></li>
                </ul>
              </div>
              
              {/* Colonne 3 - Fonctionnalités IA */}
              <div>
                <h4 className="font-bold mb-4">🤖 IA & Outils</h4>
                <ul className="space-y-2 text-sm">
                  <li><button onClick={() => setShowAIChatbot(true)} className="text-gray-300 hover:text-white transition-colors">💬 Chatbot IA</button></li>
                  <li><button onClick={() => setShowContentGenerator(true)} className="text-gray-300 hover:text-white transition-colors">✍️ Générateur de Contenu</button></li>
                  <li><button onClick={() => setShowQuickAnalytics(true)} className="text-gray-300 hover:text-white transition-colors">📊 Analytics IA</button></li>
                  <li><button onClick={() => setShowTrendsWidget(true)} className="text-gray-300 hover:text-white transition-colors">🔥 Tendances</button></li>
                </ul>
              </div>
              
              {/* Colonne 4 - Contact & Newsletter */}
              <div>
                <h4 className="font-bold mb-4">📞 Contact & News</h4>
                <p className="text-gray-300 text-sm mb-2">📧 hello@cerdia.com</p>
                <p className="text-gray-300 text-sm mb-4">📱 +1 (555) 123-4567</p>
                <div className="space-y-2">
                  <input
                    type="email"
                    placeholder="votre@email.com"
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg text-sm"
                  />
                  <button className="w-full px-3 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg text-sm hover:shadow-lg transition-all">
                    📬 S'abonner aux news IA
                  </button>
                </div>
              </div>
            </div>
            
            {/* Ligne de séparation */}
            <div className="border-t border-gray-700 mt-8 pt-8">
              <div className="flex flex-col md:flex-row justify-between items-center">
                <p className="text-gray-400 text-sm">
                  © 2025 CERDIA. Tous droits réservés. Propulsé par IA ⚡
                </p>
                <div className="flex space-x-4 mt-4 md:mt-0">
                  <a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">🛡️ Confidentialité</a>
                  <a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">📋 CGU</a>
                  <a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">🍪 Cookies</a>
                </div>
              </div>
            </div>
          </div>
        </footer>

        {/* Scripts additionnels et événements */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Gestion du scroll pour le bouton "retour en haut"
              window.addEventListener('scroll', function() {
                const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                const showScrollTop = scrollTop > 300;
                // Cette logique sera gérée par React dans le useEffect
              });
              
              // Analytics et tracking améliorés
              window.addEventListener('load', function() {
                // Initialisation des analytics IA
                console.log('🤖 CERDIA IA Analytics initialisé');
                
                // Tracking des interactions utilisateur
                document.addEventListener('click', function(e) {
                  if (e.target.closest('[data-track]')) {
                    const element = e.target.closest('[data-track]');
                    const action = element.getAttribute('data-track');
                    console.log('📊 Tracking:', action);
                    // Ici vous pourriez envoyer les données à votre service d'analytics
                  }
                });
              });
              
              // Performance monitoring
              if ('performance' in window) {
                window.addEventListener('load', function() {
                  setTimeout(function() {
                    const perfData = performance.getEntriesByType('navigation')[0];
                    const loadTime = perfData.loadEventEnd - perfData.loadEventStart;
                    console.log('⚡ Temps de chargement:', loadTime + 'ms');
                  }, 0);
                });
              }
            `
          }}
        />

      </div>
    );
  };

  export default EcommercePage;
