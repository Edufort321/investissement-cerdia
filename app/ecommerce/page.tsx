'use client';

import { useEffect, useState } from 'react';
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

// Types et interfaces
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

// Données par défaut et mappings
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
// Traductions complètes
const translations = {
  fr: {
    title: 'Collection CERDIA',
    subtitle: 'Produits Sitestripe',
    all: 'Tous',
    addProduct: '➕ Ajouter Produit',
    addAd: '📺 Ajouter Publicité',
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
    manageAds: 'Gérer les publicités'
  },
  en: {
    title: 'Collection CERDIA',
    subtitle: 'Sitestripe Products',
    all: 'All',
    addProduct: '➕ Add Product',
    addAd: '📺 Add Advertisement',
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
    manageAds: 'Manage advertisements'
  }
};

// Composant Google AdSense
function GoogleAdSense({ slot, format = "auto", responsive = true, style }: {
  slot: string;
  format?: string;
  responsive?: boolean;
  style?: React.CSSProperties;
}) {
  useEffect(() => {
    try {
      // @ts-ignore
      if (window.adsbygoogle && window.adsbygoogle.push) {
        // @ts-ignore
        window.adsbygoogle.push({});
      }
    } catch (err) {
      console.error('AdSense error:', err);
    }
  }, []);

  return (
    <div style={style}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client="ca-pub-7698570045125787"
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive={responsive ? "true" : "false"}
      />
    </div>
  );
}
// Composant principal EcommercePage
export default function EcommercePage() {
  // États pour les données
  const [products, setProducts] = useState<Product[]>([]);
  const [advertisements, setAdvertisements] = useState<Advertisement[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  
  // États pour l'interface utilisateur
  const [showForm, setShowForm] = useState(false);
  const [showAdForm, setShowAdForm] = useState(false);
  const [showBlog, setShowBlog] = useState(false);
  const [showAds, setShowAds] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  
  // États pour l'authentification et filtres
  const [passwordEntered, setPasswordEntered] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortFilter, setSortFilter] = useState('');
  const [language, setLanguage] = useState<'fr' | 'en'>('fr');
  const [darkMode, setDarkMode] = useState(false);
  
  // États pour les catégories
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  
  // États pour l'édition
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [editAdIndex, setEditAdIndex] = useState<number | null>(null);
  
  // États pour les fonctionnalités utilisateur
  const [favorites, setFavorites] = useState<Set<number>>(new Set());
  const [pageViews, setPageViews] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState(0);
  const [userPoints, setUserPoints] = useState(0);
  const [userBadges, setUserBadges] = useState<string[]>([]);
  const [recentActivity, setRecentActivity] = useState<string[]>([]);
  
  // États pour le quiz et notifications
  const [quizStep, setQuizStep] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<any>({});
  const [notificationText, setNotificationText] = useState('');
  
  // États pour le drag & drop
  const [draggedProduct, setDraggedProduct] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState(false);
  
  // États pour les nouveaux éléments
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

  // Fonction de traduction
  const t = (key: keyof typeof translations.fr) => translations[language][key];

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
 // Fonctions de chargement des données
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
      }
    } catch (e) {
      console.error('Erreur chargement données utilisateur:', e);
    }
  };

  // Fonctions de sauvegarde
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

  // Fonctions de simulation de trafic et activité
  const simulateTraffic = () => {
    const baseViews = 1247;
    const randomViews = Math.floor(Math.random() * 50);
    setPageViews(baseViews + randomViews);
    
    const baseOnline = 3;
    const randomOnline = Math.floor(Math.random() * 8);
    setOnlineUsers(baseOnline + randomOnline);

    const activities = language === 'fr' ? [
      "Marie a obtenu un lien Sitestripe",
      "Jean a ajouté un produit aux favoris", 
      "Sophie a partagé un produit",
      "Alex a découvert son style",
      "Emma a gagné un badge"
    ] : [
      "Marie got a Sitestripe link",
      "Jean added a product to favorites",
      "Sophie shared a product", 
      "Alex discovered their style",
      "Emma earned a badge"
    ];
    
    const randomActivity = activities[Math.floor(Math.random() * activities.length)];
    setRecentActivity(prev => {
      const newActivity = [`${new Date().toLocaleTimeString()} - ${randomActivity}`, ...prev.slice(0, 4)];
      return newActivity;
    });
  };

  // Fonctions de points et badges
  const addPoints = (points: number, message: string) => {
    const newPoints = userPoints + points;
    setUserPoints(newPoints);
    localStorage.setItem('cerdiaPoints', newPoints.toString());
    showNotificationToast(message);
    
    if (newPoints >= 50 && !userBadges.includes('explorerBadge')) {
      addBadge('explorerBadge');
    }
    if (newPoints >= 100 && !userBadges.includes('trendsetterBadge')) {
      addBadge('trendsetterBadge');
    }
    if (newPoints >= 200 && !userBadges.includes('loyalBadge')) {
      addBadge('loyalBadge');
    }
  };

  const addBadge = (badgeKey: string) => {
    if (!userBadges.includes(badgeKey)) {
      const newBadges = [...userBadges, badgeKey];
      setUserBadges(newBadges);
      localStorage.setItem('cerdiaBadges', JSON.stringify(newBadges));
      showNotificationToast(`🏆 Nouveau badge: ${t(badgeKey as keyof typeof translations.fr)}`);
    }
  };

  const showNotificationToast = (message: string) => {
    setNotificationText(message);
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 3000);
  };

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem('cerdiaDarkMode', JSON.stringify(newDarkMode));
  };
  // Fonctions de gestion des publicités
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
    } else {
      const newAdvertisement = { ...newAd, id: Date.now(), createdAt: new Date().toISOString() };
      const updatedAds = [...advertisements, newAdvertisement];
      setAdvertisements(updatedAds);
      saveAdvertisements(updatedAds);
      alert(t('adAdded'));
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

  // Fonctions de gestion des produits
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
  // Fonctions de gestion des formulaires
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

  // Fonction de nettoyage des catégories
  const cleanupCategories = async () => {
    if (!passwordEntered) return;
    
    const confirmCleanup = confirm('Voulez-vous nettoyer les catégories ?');
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
        
        alert('Nettoyage terminé avec succès !');
      }
    } catch (error) {
      console.error('Erreur lors du nettoyage:', error);
      alert('Erreur lors du nettoyage des catégories.');
    }
  };

  // Fonctions de tri et filtrage
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
      default:
        return sorted;
    }
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

  const toggleFavorite = (productId: number) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(productId)) {
      newFavorites.delete(productId);
    } else {
      newFavorites.add(productId);
      addPoints(5, t('favoritePoints'));
    }
    setFavorites(newFavorites);
  };
  // Configuration du quiz de style
  const quizQuestions = language === 'fr' ? [
    {
      question: "Quel est votre style ?",
      options: ["Casual", "Élégant", "Sportif", "Tendance"]
    },
    {
      question: "Votre budget préféré ?", 
      options: ["< 50$", "50-100$", "100-200$", "> 200$"]
    },
    {
      question: "Quelle occasion ?",
      options: ["Quotidien", "Travail", "Soirée", "Sport"]
    }
  ] : [
    {
      question: "What's your style?",
      options: ["Casual", "Elegant", "Sporty", "Trendy"]
    },
    {
      question: "Your preferred budget?",
      options: ["< $50", "$50-100", "$100-200", "> $200"]
    },
    {
      question: "What occasion?", 
      options: ["Daily", "Work", "Evening", "Sport"]
    }
  ];

  // Gestion du quiz
  const handleQuizAnswer = (answer: string) => {
    const newAnswers = { ...quizAnswers, [quizStep]: answer };
    setQuizAnswers(newAnswers);
    
    if (quizStep < quizQuestions.length - 1) {
      setQuizStep(quizStep + 1);
    } else {
      setShowQuiz(false);
      addPoints(25, language === 'fr' ? '+25 points pour le quiz de style !' : '+25 points for style quiz!');
      addBadge('trendsetterBadge');
      setQuizStep(0);
      setQuizAnswers({});
    }
  };

  // Gestion du formulaire de contact
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
    
    addPoints(20, language === 'fr' ? '+20 points pour votre demande Sitestripe !' : '+20 points for your Sitestripe request!');
    
    alert(t('requestSent'));
    form.reset();
  };

  // Gestion des commentaires
  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    
    const newComment = {
      id: Date.now(),
      name: formData.get('commentName') as string,
      comment: formData.get('commentText') as string,
      timestamp: new Date().toISOString(),
      language: language
    };
    
    const updatedComments = [newComment, ...comments];
    setComments(updatedComments);
    saveComments(updatedComments);
    
    alert(t('commentPosted'));
    form.reset();
  };

  // Fonction de formatage des dates
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

  // useEffect pour l'initialisation
  useEffect(() => {
    loadCustomCategories();
    loadComments();
    loadAdvertisements();
    loadUserData();
    simulateTraffic();
    fetchProducts();
    
    const trafficInterval = setInterval(simulateTraffic, 30000);
    
    const notificationInterval = setInterval(() => {
      const alerts = language === 'fr' ? [
        t('dealAlert'),
        t('stockAlert'), 
        t('trendingAlert')
      ] : [
        t('dealAlert'),
        t('stockAlert'),
        t('trendingAlert')
      ];
      
      if (Math.random() > 0.7) {
        const randomAlert = alerts[Math.floor(Math.random() * alerts.length)];
        showNotificationToast(randomAlert);
      }
    }, 45000);
    
    return () => {
      clearInterval(trafficInterval);
      clearInterval(notificationInterval);
    };
  }, [language]);

  // useEffect pour la gestion des catégories
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

  // Filtrage et tri des produits
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
  // Début du retour JSX
  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Notifications Toast */}
      {showNotification && (
        <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg transform transition-all duration-300 animate-pulse">
          {notificationText}
        </div>
      )}

      {/* Modal Quiz */}
      {showQuiz && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className={`${darkMode ? 'bg-gray-800 text-white' : 'bg-white'} rounded-2xl p-8 max-w-md w-full`}>
            <h2 className="text-2xl font-bold mb-6 text-center">{t('styleQuiz')}</h2>
            <div className="mb-6">
              <div className="flex justify-center space-x-2 mb-4">
                {quizQuestions.map((_, index) => (
                  <div key={index} className={`w-3 h-3 rounded-full ${index <= quizStep ? 'bg-blue-500' : 'bg-gray-300'}`} />
                ))}
              </div>
              <h3 className="text-lg font-semibold mb-4">{quizQuestions[quizStep].question}</h3>
              <div className="space-y-3">
                {quizQuestions[quizStep].options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuizAnswer(option)}
                    className="w-full p-3 text-left border border-gray-300 rounded-lg hover:bg-blue-50 hover:border-blue-500 transition-colors"
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
            <button 
              onClick={() => setShowQuiz(false)}
              className="w-full py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
            >
              {t('cancel')}
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className={`${darkMode ? 'bg-gray-800 text-white' : 'bg-white'} shadow-sm sticky top-0 z-40 transition-colors duration-300`}>
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-xl font-bold">{t('title')}</h1>
              <p className="text-xs opacity-70">{t('subtitle')}</p>
            </div>
            <div className="flex items-center gap-4">
              {/* Statistiques utilisateur */}
              <div className="hidden md:flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2 bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full">
                  <span>⭐</span>
                  <span>{userPoints} {t('points')}</span>
                </div>
                {userBadges.length > 0 && (
                  <div className="flex items-center gap-1">
                    {userBadges.slice(0, 3).map((badge, index) => (
                      <span key={index} className="text-lg" title={t(badge as keyof typeof translations.fr)}>
                        {t(badge as keyof typeof translations.fr).split(' ')[0]}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Indicateur de trafic */}
              <div className="hidden sm:flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1 text-green-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>{onlineUsers} {t('onlineNow')}</span>
                </div>
                <div className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
                  👁️ {pageViews.toLocaleString()} {t('pageViews')}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button 
                  onClick={toggleDarkMode}
                  className={`p-2 rounded-full transition-colors ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}`}
                  title={t('darkMode')}
                >
                  {darkMode ? '🌙' : '☀️'}
                </button>
                <Globe size={16} className={darkMode ? 'text-gray-300' : 'text-gray-600'} />
                <select 
                  value={language} 
                  onChange={(e) => setLanguage(e.target.value as 'fr' | 'en')}
                  className={`text-sm border rounded px-2 py-1 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                >
                  <option value="fr">🇫🇷</option>
                  <option value="en">🇺🇸</option>
                </select>
              </div>
            </div>
          </div>
          
          {/* Navigation */}
          <div className="flex gap-4 mb-3">
            <button 
              onClick={() => {setShowBlog(false); setShowAds(false);}} 
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                !showBlog && !showAds
                  ? 'bg-blue-600 text-white' 
                  : darkMode 
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {t('products')}
            </button>
            <button 
              onClick={() => {setShowBlog(true); setShowAds(false);}} 
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                showBlog 
                  ? 'bg-blue-600 text-white' 
                  : darkMode 
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {t('blog')}
            </button>
            {passwordEntered && (
              <button 
                onClick={() => {setShowBlog(false); setShowAds(true);}} 
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  showAds 
                    ? 'bg-red-600 text-white' 
                    : darkMode 
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                📺 {t('ads')}
              </button>
            )}
            <button 
              onClick={() => setShowQuiz(true)} 
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                darkMode 
                  ? 'bg-purple-700 text-white hover:bg-purple-600' 
                  : 'bg-purple-600 text-white hover:bg-purple-700'
              }`}
            >
              ✨ {t('discoverStyle')}
            </button>
          </div>
          
          {/* Filtres pour les produits */}
          {!showBlog && !showAds && (
            <>
              <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
                <button 
                  onClick={() => setCategoryFilter('')} 
                  className={`px-3 py-1 rounded-full text-sm whitespace-nowrap flex-shrink-0 ${
                    categoryFilter === '' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {t('all')}
                </button>
                {availableCategories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-3 py-1 rounded-full text-sm whitespace-nowrap flex-shrink-0 ${
                      categoryFilter === cat ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
                {passwordEntered && (
                  <button 
                    onClick={cleanupCategories}
                    className="px-3 py-1 rounded-full text-sm whitespace-nowrap flex-shrink-0 bg-red-500 text-white hover:bg-red-600"
                    title="Nettoyer les catégories incorrectes"
                  >
                    🧹 Nettoyer
                  </button>
                )}
              </div>
              
              <div className="mt-3 flex justify-end">
                <select 
                  value={sortFilter} 
                  onChange={(e) => setSortFilter(e.target.value)}
                  className={`text-sm border rounded px-3 py-1 min-w-[150px] ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                  }`}
                >
                  <option value="">{t('sortBy')}</option>
                  <option value="priceLowHigh">{t('priceLowHigh')}</option>
                  <option value="priceHighLow">{t('priceHighLow')}</option>
                  <option value="newest">{t('newest')}</option>
                  <option value="oldest">{t('oldest')}</option>
                  <option value="nameAZ">{t('nameAZ')}</option>
                  <option value="nameZA">{t('nameZA')}</option>
                </select>
              </div>
            </>
          )}
        </div>
      </header>
      {/* Page Blog */}
      {showBlog && (
        <main className="px-4 py-8 max-w-4xl mx-auto">
          <div className={`${darkMode ? 'bg-gray-800 text-white' : 'bg-white'} rounded-2xl shadow-sm p-8`}>
            <div className="sm:hidden mb-6 flex justify-center gap-6 text-sm">
              <div className="flex items-center gap-2 text-green-600">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>{onlineUsers} {t('onlineNow')}</span>
              </div>
              <div className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
                👁️ {pageViews.toLocaleString()} {t('pageViews')}
              </div>
            </div>

            <div className="text-center mb-8">
              <h1 className={`text-3xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{t('blogTitle')}</h1>
              <p className={`text-lg mb-6 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{t('blogSubtitle')}</p>
              <p className={`leading-relaxed ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{t('blogContent')}</p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8 mb-8">
              <div>
                <h2 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{t('blogFeatures')}</h2>
                <ul className="space-y-3">
                  <li className={`flex items-center ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    <span className="mr-2">{t('feature1')}</span>
                  </li>
                  <li className={`flex items-center ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    <span className="mr-2">{t('feature2')}</span>
                  </li>
                  <li className={`flex items-center ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    <span className="mr-2">{t('feature3')}</span>
                  </li>
                  <li className={`flex items-center ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    <span className="mr-2">{t('feature4')}</span>
                  </li>
                </ul>
              </div>
              
              <div className={`rounded-xl p-6 ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{t('contactForm')}</h3>
                <form onSubmit={handleContactSubmit} className="space-y-4">
                  <input 
                    name="name"
                    type="text" 
                    placeholder={t('yourName')} 
                    required
                    className={`w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      darkMode ? 'bg-gray-600 border-gray-500 text-white placeholder-gray-400' : 'border-gray-300'
                    }`}
                  />
                  <div 
                    className={`relative w-full border-2 border-dashed rounded-lg px-4 py-6 transition-all duration-300 ${
                      isDragOver 
                        ? 'border-blue-500 bg-blue-50' 
                        : darkMode ? 'border-gray-500' : 'border-gray-300'
                    }`}
                    onDrop={(e) => {
                      e.preventDefault();
                      const productName = e.dataTransfer.getData('text/plain');
                      setDraggedProduct(productName);
                      const productInput = document.querySelector('input[name="product"]') as HTMLInputElement;
                      if (productInput) {
                        productInput.value = productName;
                      }
                      setIsDragOver(false);
                      showNotificationToast(t('productDropped'));
                      addPoints(5, language === 'fr' ? '+5 points pour le drag & drop !' : '+5 points for drag & drop!');
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragOver(true);
                    }}
                    onDragLeave={() => {
                      setIsDragOver(false);
                    }}
                  >
                    <input 
                      name="product"
                      type="text" 
                      placeholder={t('dragProduct')} 
                      required
                      className={`w-full bg-transparent border-none outline-none text-center font-medium ${
                        darkMode ? 'text-white placeholder-gray-400' : ''
                      }`}
                    />
                    {isDragOver && (
                      <div className="absolute inset-0 flex items-center justify-center bg-blue-50 bg-opacity-90 rounded-lg">
                        <span className="text-blue-600 font-semibold">{t('dragDropHint')}</span>
                      </div>
                    )}
                    <div className={`text-xs text-center mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      💡 {language === 'fr' ? 'Glissez un produit ou tapez le nom' : 'Drag a product or type the name'}
                    </div>
                  </div>
                  <textarea 
                    name="message"
                    placeholder={t('message')} 
                    rows={3}
                    className={`w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-vertical ${
                      darkMode ? 'bg-gray-600 border-gray-500 text-white placeholder-gray-400' : 'border-gray-300'
                    }`}
                  />
                  <div className="flex gap-3">
                    <button 
                      type="submit"
                      className="flex-1 bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                    >
                      💬 {t('sendToMessenger')}
                    </button>
                    <button 
                      type="button"
                      onClick={() => window.open(`https://m.me/${MESSENGER_PAGE_ID}`, '_blank')}
                      className="px-4 bg-gray-600 text-white font-semibold py-3 rounded-lg hover:bg-gray-700 transition-colors"
                      title={t('messengerDirect')}
                    >
                      📱
                    </button>
                  </div>
                </form>
                
                <div className="mt-4 text-center">
                  <p className={`text-sm mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{t('messengerDirect')}</p>
                  <button 
                    onClick={() => window.open(`https://m.me/${MESSENGER_PAGE_ID}`, '_blank')}
                    className="text-blue-600 hover:text-blue-700 font-medium text-sm underline"
                  >
                    Messenger : Ric CERDIA
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-12 border-t pt-8">
              <h2 className={`text-2xl font-bold mb-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{t('comments')}</h2>
              
              <div className={`rounded-xl p-6 mb-8 ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{t('addComment')}</h3>
                <form onSubmit={handleCommentSubmit} className="space-y-4">
                  <input 
                    name="commentName"
                    type="text" 
                    placeholder={t('yourName')} 
                    required
                    className={`w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      darkMode ? 'bg-gray-600 border-gray-500 text-white placeholder-gray-400' : 'border-gray-300'
                    }`}
                  />
                  <textarea 
                    name="commentText"
                    placeholder={t('yourComment')} 
                    rows={4}
                    required
                    className={`w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-vertical ${
                      darkMode ? 'bg-gray-600 border-gray-500 text-white placeholder-gray-400' : 'border-gray-300'
                    }`}
                  />
                  <button 
                    type="submit"
                    className="bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {t('postComment')}
                  </button>
                </form>
              </div>

              <div className="space-y-6">
                {comments.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>{t('noComments')}</p>
                  </div>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className={`border rounded-lg p-6 shadow-sm ${
                      darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'
                    }`}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-semibold text-lg">
                              {comment.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{comment.name}</h4>
                            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{formatDate(comment.timestamp)}</p>
                          </div>
                        </div>
                      </div>
                      <p className={`leading-relaxed ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{comment.comment}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </main>
      )}
      {/* Page Gestion des Publicités */}
      {showAds && passwordEntered && (
        <main className="px-4 py-8 max-w-6xl mx-auto">
          <div className={`${darkMode ? 'bg-gray-800 text-white' : 'bg-white'} rounded-2xl shadow-sm p-8`}>
            <div className="flex items-center justify-between mb-6">
              <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                📺 {t('manageAds')}
              </h1>
              <button 
                onClick={handleAddAd}
                className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                <Plus size={20} />
                {t('addAd')}
              </button>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {advertisements.map((ad, index) => (
                <div key={ad.id} className={`border rounded-xl p-6 ${
                  darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
                } ${ad.isActive ? 'ring-2 ring-green-500' : 'opacity-60'}`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                      {ad.type === 'video' ? (
                        <Video size={20} className="text-red-500" />
                      ) : (
                        <Mountain size={20} className="text-blue-500" />
                      )}
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        ad.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {ad.isActive ? t('isActive') : 'Inactif'}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleEditAd(index)}
                        className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                      >
                        <Pencil size={14} />
                      </button>
                      <button 
                        onClick={() => deleteAdvertisement(ad.id!)}
                        className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
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
                        className="w-full h-32 object-cover rounded-lg"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}

                  <h3 className={`font-semibold text-lg mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {ad.title}
                  </h3>
                  <p className={`text-sm mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    {ad.description}
                  </p>
                  <p className={`text-xs break-all ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    🔗 {ad.url}
                  </p>
                  <p className={`text-xs mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    📅 {ad.createdAt ? formatDate(ad.createdAt) : 'Date inconnue'}
                  </p>
                </div>
              ))}

              {advertisements.length === 0 && (
                <div className="col-span-full text-center py-12">
                  <div className="text-6xl mb-4">📺</div>
                  <h3 className={`text-xl font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Aucune publicité
                  </h3>
                  <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Ajoutez votre première publicité pour commencer
                  </p>
                </div>
              )}
            </div>

            {/* Aperçu de comment les publicités apparaissent */}
            {advertisements.filter(ad => ad.isActive).length > 0 && (
              <div className="mt-12 border-t pt-8">
                <h2 className={`text-2xl font-bold mb-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  👀 Aperçu des publicités actives
                </h2>
                <div className="grid md:grid-cols-2 gap-6">
                  {advertisements.filter(ad => ad.isActive).slice(0, 4).map((ad) => (
                    <div key={ad.id} className={`border rounded-2xl overflow-hidden shadow-sm ${
                      darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                    }`}>
                      <div className={`${
                        ad.type === 'video' 
                          ? darkMode ? 'bg-gradient-to-br from-red-800 to-pink-800' : 'bg-gradient-to-br from-red-500 to-pink-500'
                          : darkMode ? 'bg-gradient-to-br from-blue-800 to-purple-800' : 'bg-gradient-to-br from-blue-500 to-purple-500'
                      } p-4 text-white text-center`}>
                        <h4 className="font-bold text-sm mb-2">{ad.title}</h4>
                        <p className="text-xs opacity-90 mb-3">{ad.description}</p>
                        <button 
                          onClick={() => window.open(ad.url, '_blank')}
                          className="bg-white text-gray-900 px-3 py-1 rounded-lg text-xs font-semibold hover:bg-gray-100 transition-colors"
                        >
                          {ad.type === 'video' ? '▶️ Voir' : '🖼️ Découvrir'}
                        </button>
                      </div>
                      <div className={`p-2 text-center ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                        <span className="text-xs opacity-60">Publicité • CERDIA</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>
      )}
      {/* Page Produits Principale */}
      {!showBlog && !showAds && (
        <main className="px-2 py-4">
          {/* Statistiques mobiles */}
          <div className="md:hidden mb-4 flex justify-center gap-4 text-sm">
            <div className="flex items-center gap-2 bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full">
              <span>⭐</span>
              <span>{userPoints} {t('points')}</span>
            </div>
            <div className="flex items-center gap-1 text-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>{onlineUsers} {t('onlineNow')}</span>
            </div>
          </div>

          {/* Publicité AdSense en haut */}
          <div className="mb-6 max-w-4xl mx-auto">
            <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl shadow-lg border`}>
              <div className={`p-2 text-center ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <span className="text-xs opacity-60">Publicité • Google AdSense</span>
              </div>
              <div className="p-4">
                <GoogleAdSense 
                  slot="VOTRE_SLOT_ID_BANNER" 
                  format="horizontal"
                  style={{ minHeight: '100px' }}
                />
              </div>
            </div>
          </div>

          {/* Barre latérale gauche - Activité récente */}
          {recentActivity.length > 0 && (
            <div className="hidden lg:block fixed left-4 top-1/2 transform -translate-y-1/2 w-64 z-30">
              <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg border p-4 shadow-sm mb-4`}>
                <h3 className={`font-semibold mb-3 text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  🔥 {t('recentActivity')}
                </h3>
                <div className="space-y-2">
                  {recentActivity.slice(0, 3).map((activity, index) => (
                    <div key={index} className={`text-xs p-2 rounded ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-50 text-gray-600'}`}>
                      {activity}
                    </div>
                  ))}
                </div>
              </div>

              {/* Publicité dans la barre latérale */}
              <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-lg border p-4 shadow-sm`}>
                <h4 className={`font-semibold mb-2 text-xs ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  📢 Publicité
                </h4>
                <div className={`${darkMode ? 'bg-gradient-to-b from-green-800 to-emerald-800' : 'bg-gradient-to-b from-green-500 to-emerald-500'} rounded p-3 text-white text-center`}>
                  <p className="text-xs font-semibold mb-1">💎 VIP Deals</p>
                  <p className="text-xs opacity-90 mb-2">Accès exclusif aux meilleures offres</p>
                  <button 
                    onClick={() => window.open(`https://m.me/${MESSENGER_PAGE_ID}`, '_blank')}
                    className="bg-white text-green-600 px-2 py-1 rounded text-xs font-semibold hover:bg-gray-100 transition-colors"
                  >
                    En savoir +
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Grille de produits en colonnes */}
          <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-2 space-y-2">
            {filteredAndSortedProducts.map((product, i) => {
              const shouldShowAd = (i + 1) % 6 === 0;
              const randomAd = shouldShowAd ? getRandomActiveAd() : null;
              
              return (
                <div key={product.id || i}>
                  <ProductCard 
                    product={product} 
                    language={language}
                    darkMode={darkMode}
                    isFavorite={favorites.has(product.id || 0)}
                    onToggleFavorite={() => toggleFavorite(product.id || 0)}
                    onEdit={() => handleAdminAction(() => handleEdit(i))}
                    showAdmin={passwordEntered}
                    hasValue={hasValue}
                    hasPriceValue={hasPriceValue}
                    cleanCategory={cleanCategory}
                    translateCategory={(cat: string) => translateCategory(cat, language)}
                    t={t}
                    onShare={() => addPoints(15, t('sharePoints'))}
                  />
                  
                  {/* Publicité AdSense intégrée dans la grille */}
                  {shouldShowAd && (
                    <div className="break-inside-avoid mb-2">
                      <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-2xl overflow-hidden shadow-sm border`}>
                        <div className={`p-2 text-center ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                          <span className="text-xs opacity-60">Publicité</span>
                        </div>
                        <div className="p-2">
                          <GoogleAdSense 
                            slot="VOTRE_SLOT_ID_SQUARE"
                            format="rectangle"
                            style={{ minHeight: '200px' }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Publicité AdSense en bas */}
          <div className="mt-8 max-w-4xl mx-auto">
            <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl shadow-lg border`}>
              <div className={`p-2 text-center ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <span className="text-xs opacity-60">Publicité • Google AdSense</span>
              </div>
              <div className="p-4">
                <GoogleAdSense 
                  slot="VOTRE_SLOT_ID_FOOTER"
                  format="horizontal"
                  style={{ minHeight: '120px' }}
                />
              </div>
            </div>
          </div>
        </main>
      )}
      {/* Modal Formulaire Produit */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto`}>
            <div className={`sticky top-0 border-b px-4 py-3 flex items-center justify-between ${
              darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
            }`}>
              <h2 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {editIndex !== null ? t('modify') : t('add')} - Produit
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
                onChange={handleInputChange} 
                placeholder={t('name')} 
                className={`w-full border p-3 rounded-lg ${
                  darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300'
                }`} 
                required 
              />
              <textarea 
                name="description" 
                value={newProduct.description} 
                onChange={handleInputChange} 
                placeholder={t('description')} 
                className={`w-full border p-3 rounded-lg h-20 resize-vertical ${
                  darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300'
                }`} 
                required 
              />
              <div className="grid grid-cols-2 gap-3">
                <input 
                  name="priceCa" 
                  value={newProduct.priceCa} 
                  onChange={handleInputChange} 
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
                  onChange={handleInputChange} 
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
                onChange={handleInputChange} 
                placeholder="Amazon.ca" 
                className={`w-full border p-3 rounded-lg ${
                  darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300'
                }`} 
                type="url" 
              />
              <input 
                name="amazonCom" 
                value={newProduct.amazonCom} 
                onChange={handleInputChange} 
                placeholder="Amazon.com" 
                className={`w-full border p-3 rounded-lg ${
                  darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300'
                }`} 
                type="url" 
              />
              <input 
                name="tiktokUrl" 
                value={newProduct.tiktokUrl} 
                onChange={handleInputChange} 
                placeholder="TikTok" 
                className={`w-full border p-3 rounded-lg ${
                  darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300'
                }`} 
                type="url" 
              />
              <div className="space-y-3">
                <label className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{t('images')}:</label>
                {newProduct.images.map((image, i) => (
                  <div key={i} className="flex gap-2">
                    <input 
                      name="images" 
                      value={image} 
                      onChange={(e) => handleInputChange(e, i)} 
                      placeholder={`Image URL ${i + 1}`} 
                      className={`flex-1 border p-3 rounded-lg text-sm ${
                        darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300'
                      }`} 
                      type="url" 
                    />
                    {newProduct.images.length > 1 && (
                      <button 
                        type="button" 
                        onClick={() => removeImageField(i)} 
                        className="px-3 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
                <button 
                  type="button" 
                  onClick={addImageField} 
                  className="w-full py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center justify-center gap-2"
                >
                  <Plus size={16} />{t('addImage')}
                </button>
              </div>
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
                          onChange={(e) => handleCategoryToggle(cat, e.target.checked)} 
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
                      if (val) {
                        if (passwordEntered) {
                          handleAddCategory(val);
                          (e.target as HTMLInputElement).value = '';
                        } else {
                          if (requestPasswordOnce()) {
                            handleAddCategory(val);
                            (e.target as HTMLInputElement).value = '';
                          }
                        }
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
                  className="flex-1 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editIndex !== null ? t('modify') : t('save')}
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
      {/* Modal Formulaire Publicité */}
      {showAdForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto`}>
            <div className={`sticky top-0 border-b px-4 py-3 flex items-center justify-between ${
              darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
            }`}>
              <h2 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {editAdIndex !== null ? t('modify') : t('add')} - Publicité
              </h2>
              <button 
                onClick={resetAdForm} 
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  darkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                ✕
              </button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); saveAdvertisement(); }} className="p-4 space-y-4">
              <input 
                name="title" 
                value={newAd.title} 
                onChange={handleAdInputChange} 
                placeholder={t('adTitle')} 
                className={`w-full border p-3 rounded-lg ${
                  darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300'
                }`} 
                required 
              />
              <textarea 
                name="description" 
                value={newAd.description} 
                onChange={handleAdInputChange} 
                placeholder={t('description')} 
                className={`w-full border p-3 rounded-lg h-20 resize-vertical ${
                  darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300'
                }`} 
                required 
              />
              <input 
                name="url" 
                value={newAd.url} 
                onChange={handleAdInputChange} 
                placeholder={t('adUrl')} 
                className={`w-full border p-3 rounded-lg ${
                  darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300'
                }`} 
                type="url" 
                required 
              />
              <input 
                name="imageUrl" 
                value={newAd.imageUrl} 
                onChange={handleAdInputChange} 
                placeholder={t('adImage')} 
                className={`w-full border p-3 rounded-lg ${
                  darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-300'
                }`} 
                type="url" 
              />
              <div className="space-y-3">
                <label className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {t('adType')}:
                </label>
                <select 
                  name="type" 
                  value={newAd.type} 
                  onChange={handleAdInputChange}
                  className={`w-full border p-3 rounded-lg ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'
                  }`}
                >
                  <option value="image">🖼️ {t('imageAd')}</option>
                  <option value="video">📹 {t('videoAd')}</option>
                </select>
              </div>
              <div className="flex items-center space-x-3">
                <input 
                  type="checkbox" 
                  name="isActive" 
                  checked={newAd.isActive} 
                  onChange={handleAdInputChange}
                  className="w-4 h-4" 
                />
                <label className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {t('isActive')}
                </label>
              </div>
              
              {/* Aperçu de la publicité */}
              {newAd.title && newAd.description && (
                <div className="border-t pt-4">
                  <label className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2 block`}>
                    👀 Aperçu:
                  </label>
                  <div className={`border rounded-2xl overflow-hidden shadow-sm ${
                    darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                  }`}>
                    <div className={`${
                      newAd.type === 'video' 
                        ? darkMode ? 'bg-gradient-to-br from-red-800 to-pink-800' : 'bg-gradient-to-br from-red-500 to-pink-500'
                        : darkMode ? 'bg-gradient-to-br from-orange-800 to-red-800' : 'bg-gradient-to-br from-orange-500 to-red-500'
                    } p-4 text-white text-center`}>
                      {newAd.imageUrl && (
                        <img 
                          src={newAd.imageUrl} 
                          alt={newAd.title}
                          className="w-full h-16 object-cover rounded mb-2"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      )}
                      <h4 className="font-bold text-sm mb-2">
                        {newAd.type === 'video' ? '📹' : '🖼️'} {newAd.title}
                      </h4>
                      <p className="text-xs opacity-90 mb-3">{newAd.description}</p>
                      <div className="bg-white text-gray-900 px-3 py-1 rounded-lg text-xs font-semibold inline-block">
                        {newAd.type === 'video' ? '▶️ Voir la vidéo' : '💬 Découvrir'}
                      </div>
                    </div>
                    <div className={`p-2 text-center ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                      <span className="text-xs opacity-60">Publicité • CERDIA</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t">
                <button 
                  type="button" 
                  onClick={resetAdForm} 
                  className="flex-1 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                >
                  {t('cancel')}
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  {editAdIndex !== null ? t('modify') : t('save')}
                </button>
                {editAdIndex !== null && (
                  <button 
                    type="button" 
                    onClick={() => deleteAdvertisement(advertisements[editAdIndex].id!)} 
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

      {/* Boutons flottants */}
      {!showBlog && !showAds && (
        <button 
          className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center z-30" 
          onClick={handleAddProduct}
        >
          <Plus size={24} />
        </button>
      )}

      {showAds && passwordEntered && (
        <button 
          className="fixed bottom-6 right-6 w-14 h-14 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-lg flex items-center justify-center z-30" 
          onClick={handleAddAd}
        >
          <Video size={24} />
        </button>
      )}

    </div>
  );
}
// Composant ProductCard
function ProductCard({ product, language, darkMode, isFavorite, onToggleFavorite, onEdit, showAdmin, hasValue, hasPriceValue, cleanCategory, translateCategory, t, onShare }: any) {
  const [current, setCurrent] = useState(0);
  const [imageError, setImageError] = useState<{ [key: number]: boolean }>({});
  const [showZoom, setShowZoom] = useState(false);
  const [zoomImage, setZoomImage] = useState('');
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const images = Array.isArray(product.images) ? product.images.filter(Boolean) : [];

  const handleImageDoubleClick = (imageUrl: string) => {
    setZoomImage(imageUrl);
    setShowZoom(true);
  };

  const closeZoom = () => {
    setShowZoom(false);
    setZoomImage('');
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: product.name,
        text: product.description,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
    onShare();
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', product.name);
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  return (
    <>
      <div 
        className="break-inside-avoid mb-2"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'} rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 ${
          isHovered ? 'transform scale-105' : ''
        } ${
          isDragging ? 'opacity-50 transform rotate-2' : ''
        } border cursor-move`}>
          <div className="relative aspect-[3/4] bg-gray-100">
            {images.length > 0 ? (
              <>
                {!imageError[current] ? (
                  <Image 
                    src={images[current]} 
                    alt={product.name} 
                    fill 
                    className="object-contain cursor-pointer hover:object-cover transition-all duration-300" 
                    onError={() => setImageError({...imageError, [current]: true})} 
                    onDoubleClick={() => handleImageDoubleClick(images[current])}
                    unoptimized 
                    loader={({ src }) => src} 
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <span className="text-sm">{t('imageNotAvailable')}</span>
                  </div>
                )}
                {images.length > 1 && (
                  <>
                    <button 
                      onClick={() => setCurrent((current - 1 + images.length) % images.length)} 
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-black bg-opacity-60 hover:bg-opacity-80 text-white rounded-full w-8 h-8 flex items-center justify-center z-10 text-lg font-bold"
                    >
                      ‹
                    </button>
                    <button 
                      onClick={() => setCurrent((current + 1) % images.length)} 
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-black bg-opacity-60 hover:bg-opacity-80 text-white rounded-full w-8 h-8 flex items-center justify-center z-10 text-lg font-bold"
                    >
                      ›
                    </button>
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10">
                      {images.map((_, index) => (
                        <div key={index} className={`w-1.5 h-1.5 rounded-full ${index === current ? 'bg-white' : 'bg-white bg-opacity-50'}`} />
                      ))}
                    </div>
                  </>
                )}
                <div className="absolute top-2 right-2 flex gap-1 z-10">
                  <button 
                    onClick={onToggleFavorite} 
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                      isFavorite ? 'bg-red-500 text-white scale-110' : 'bg-white bg-opacity-80 text-gray-600'
                    }`}
                  >
                    <Heart size={16} fill={isFavorite ? 'white' : 'none'} />
                  </button>
                  <button 
                    onClick={handleShare} 
                    className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                  >
                    📤
                  </button>
                  {showAdmin && (
                    <button 
                      onClick={onEdit} 
                      className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center"
                    >
                      <Pencil size={14} />
                    </button>
                  )}
                </div>
                
                <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
                  {isHovered && (
                    <span className="bg-purple-500 text-white text-xs px-2 py-1 rounded-full font-bold animate-bounce">
                      🎯 DRAG
                    </span>
                  )}
                  {Math.random() > 0.7 && (
                    <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full font-bold animate-pulse">
                      🔥 HOT
                    </span>
                  )}
                  {Math.random() > 0.8 && (
                    <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                      ⚡ DEAL
                    </span>
                  )}
                </div>
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <span className="text-sm">{t('noImage')}</span>
              </div>
            )}
          </div>

          <div className="p-3">
            <h3 className={`font-semibold text-sm line-clamp-2 mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {product.name}
            </h3>
            <p className={`text-xs line-clamp-3 mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              {product.description}
            </p>
            
            {(hasPriceValue(product.priceCa) || hasPriceValue(product.priceUs)) && (
              <div className="mb-3">
                <p className={`font-semibold text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {t('indicativePrice')} 
                  {hasPriceValue(product.priceCa) && ` ${product.priceCa} CAD`}
                  {hasPriceValue(product.priceCa) && hasPriceValue(product.priceUs) && ' |'}
                  {hasPriceValue(product.priceUs) && ` ${product.priceUs} USD`}
                </p>
                <p className={`text-xs italic ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {t('priceNote')}
                </p>
              </div>
            )}
            <div className="space-y-2">
              {(hasValue(product.amazonCa) || hasValue(product.amazonCom)) && (
                <div className="flex gap-2">
                  {hasValue(product.amazonCa) && (
                    <Link href={product.amazonCa} target="_blank" rel="noopener noreferrer" className="flex-1">
                      <button className="w-full bg-orange-500 text-white py-2 px-3 rounded-lg text-xs font-medium hover:bg-orange-600 transition-colors">
                        🛒 Amazon.ca
                      </button>
                    </Link>
                  )}
                  {hasValue(product.amazonCom) && (
                    <Link href={product.amazonCom} target="_blank" rel="noopener noreferrer" className="flex-1">
                      <button className="w-full bg-gray-900 text-white py-2 px-3 rounded-lg text-xs font-medium hover:bg-gray-800 transition-colors">
                        🛒 Amazon.com
                      </button>
                    </Link>
                  )}
                </div>
              )}
              {hasValue(product.tiktokUrl) && (
                <Link href={product.tiktokUrl} target="_blank" rel="noopener noreferrer">
                  <button className="w-full bg-black text-white py-2 px-3 rounded-lg text-xs font-medium hover:bg-gray-900 transition-colors">
                    🎵 {t('viewOnTiktok')}
                  </button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Modal Zoom d'Image */}
      {showZoom && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4" onClick={closeZoom}>
          <div className="relative max-w-full max-h-full" onClick={(e) => e.stopPropagation()}>
            <button 
              onClick={closeZoom}
              className="absolute top-4 right-4 w-10 h-10 bg-black bg-opacity-60 hover:bg-opacity-80 text-white rounded-full flex items-center justify-center z-20 backdrop-blur-sm font-bold"
            >
              ✕
            </button>
            
            {images.length > 1 && (
              <>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    const newIndex = (current - 1 + images.length) % images.length;
                    setCurrent(newIndex);
                    setZoomImage(images[newIndex]);
                  }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-black bg-opacity-60 hover:bg-opacity-80 text-white rounded-full flex items-center justify-center z-20 backdrop-blur-sm text-2xl font-bold"
                >
                  ‹
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    const newIndex = (current + 1) % images.length;
                    setCurrent(newIndex);
                    setZoomImage(images[newIndex]);
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-black bg-opacity-60 hover:bg-opacity-80 text-white rounded-full flex items-center justify-center z-20 backdrop-blur-sm text-2xl font-bold"
                >
                  ›
                </button>
                
                <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
                  {images.map((_, index) => (
                    <button
                      key={index}
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrent(index);
                        setZoomImage(images[index]);
                      }}
                      className={`w-3 h-3 rounded-full transition-all ${
                        index === current 
                          ? 'bg-white' 
                          : 'bg-white bg-opacity-50 hover:bg-opacity-70'
                      }`}
                    />
                  ))}
                </div>
              </>
            )}

            <Image
              src={zoomImage}
              alt={product.name}
              width={800}
              height={800}
              className="max-w-full max-h-full object-contain rounded-lg"
              unoptimized
              loader={({ src }) => src}
            />
            
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black bg-opacity-60 text-white px-4 py-2 rounded-lg backdrop-blur-sm">
              <p className="text-sm text-center">{product.name}</p>
              <p className="text-xs text-gray-300 text-center mt-1">
                {images.length > 1 && `${current + 1}/${images.length} • `}
                Cliquez pour fermer
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
