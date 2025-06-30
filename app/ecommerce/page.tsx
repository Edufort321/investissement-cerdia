function ProductCard({ product, language, darkMode, isFavorite, onToggleFavorite, onEdit, showAdmin, hasValue, hasPriceValue, cleanCategory, translateCategory, t, onShare }: any) {
  const [current, setCurrent] = useState'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { Pencil, Globe, Plus, Trash2, Heart } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ID de votre page Facebook pour Messenger
const MESSENGER_PAGE_ID = 'riccerdia';

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

const PASSWORD = '321MdlTamara!$';

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

const translations = {
  fr: {
    title: 'Collection CERDIA',
    subtitle: 'Produits Sitestripe',
    all: 'Tous',
    addProduct: '➕ Ajouter',
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
    dragProduct: 'Glissez un produit ici ou tapez le nom',
    dragDropHint: '🎯 Glissez un produit de la collection ici',
    productDropped: 'Produit ajouté !',
    requestSitestripe: '+20 points pour votre demande Sitestripe !',
  },
  en: {
    title: 'Collection CERDIA',
    subtitle: 'Sitestripe Products',
    all: 'All',
    addProduct: '➕ Add',
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
    dragProduct: 'Drag a product here or type the name',
    dragDropHint: '🎯 Drag a product from the collection here',
    productDropped: 'Product added!',
    requestSitestripe: '+20 points for your Sitestripe request!',
  }
};

export default function EcommercePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showBlog, setShowBlog] = useState(false);
  const [passwordEntered, setPasswordEntered] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortFilter, setSortFilter] = useState('');
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [language, setLanguage] = useState<'fr' | 'en'>('fr');
  const [favorites, setFavorites] = useState<Set<number>>(new Set());
  const [comments, setComments] = useState<any[]>([]);
  const [pageViews, setPageViews] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState(0);
  const [userPoints, setUserPoints] = useState(0);
  const [userBadges, setUserBadges] = useState<string[]>([]);
  const [recentActivity, setRecentActivity] = useState<string[]>([]);
  const [darkMode, setDarkMode] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizStep, setQuizStep] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<any>({});
  const [showNotification, setShowNotification] = useState(false);
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

  const t = (key: keyof typeof translations.fr) => translations[language][key];

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

  const saveComments = (newComments: any[]) => {
    try {
      localStorage.setItem('blogComments', JSON.stringify(newComments));
    } catch (e) {
      console.error('Erreur lors de la sauvegarde des commentaires:', e);
    }
  };

  const simulateTraffic = () => {
    // Simuler le trafic avec des valeurs réalistes
    const baseViews = 1247;
    const randomViews = Math.floor(Math.random() * 50);
    setPageViews(baseViews + randomViews);
    
    const baseOnline = 3;
    const randomOnline = Math.floor(Math.random() * 8);
    setOnlineUsers(baseOnline + randomOnline);

    // Activité récente simulée
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

  const loadUserData = () => {
    try {
      const savedPoints = localStorage.getItem('cerdiaPoints');
      const savedBadges = localStorage.getItem('cerdiaBadges');
      const savedDarkMode = localStorage.getItem('cerdiaDarkMode');
      
      if (savedPoints) setUserPoints(parseInt(savedPoints));
      if (savedBadges) setUserBadges(JSON.parse(savedBadges));
      if (savedDarkMode) setDarkMode(JSON.parse(savedDarkMode));
      
      // Points de bienvenue pour nouveau visiteur
      if (!savedPoints) {
        addPoints(10, t('welcomePoints'));
        addBadge('firstVisitBadge');
      }
    } catch (e) {
      console.error('Erreur chargement données utilisateur:', e);
    }
  };

  const addPoints = (points: number, message: string) => {
    const newPoints = userPoints + points;
    setUserPoints(newPoints);
    localStorage.setItem('cerdiaPoints', newPoints.toString());
    showNotificationToast(message);
    
    // Badges automatiques basés sur les points
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
      showNotificationToast(`🏆 Nouveau badge: ${t(badgeKey)}`);
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

  const handleQuizAnswer = (answer: string) => {
    const newAnswers = { ...quizAnswers, [quizStep]: answer };
    setQuizAnswers(newAnswers);
    
    if (quizStep < quizQuestions.length - 1) {
      setQuizStep(quizStep + 1);
    } else {
      // Quiz terminé
      setShowQuiz(false);
      addPoints(25, language === 'fr' ? '+25 points pour le quiz de style !' : '+25 points for style quiz!');
      addBadge('trendsetterBadge');
      setQuizStep(0);
      setQuizAnswers({});
    }
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
      language: language
    };
    
    const updatedComments = [newComment, ...comments];
    setComments(updatedComments);
    saveComments(updatedComments);
    
    alert(t('commentPosted'));
    form.reset();
  };

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

  const saveCustomCategories = (categories: string[]) => {
    try {
      localStorage.setItem('customCategories', JSON.stringify(categories));
    } catch (e) {
      console.error('Erreur lors de la sauvegarde des catégories personnalisées:', e);
    }
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    
    const contactData = {
      name: formData.get('name') as string,
      product: formData.get('product') as string,
      message: formData.get('message') as string,
    };
    
    // Message pré-rempli pour Messenger selon la langue
    const messengerMessage = language === 'fr' 
      ? `Bonjour! Je suis ${contactData.name}
🛍️ Produit qui m'intéresse: ${contactData.product}
${contactData.message ? `💬 Message: ${contactData.message}` : ''}

Je souhaiterais obtenir mes liens Sitestripe pour ce produit. Merci!`
      : `Hello! I'm ${contactData.name}
🛍️ Product I'm interested in: ${contactData.product}
${contactData.message ? `💬 Message: ${contactData.message}` : ''}

I would like to get my Sitestripe links for this product. Thank you!`;
    
    // Ouvrir Messenger avec le message pré-rempli
    const messengerURL = `https://m.me/${MESSENGER_PAGE_ID}?text=${encodeURIComponent(messengerMessage)}`;
    window.open(messengerURL, '_blank');
    
    // Ajouter des points pour la demande
    addPoints(20, language === 'fr' ? '+20 points pour votre demande Sitestripe !' : '+20 points for your Sitestripe request!');
    
    // Message de confirmation
    alert(t('requestSent'));
    form.reset();
  };

  useEffect(() => {
    loadCustomCategories();
    loadComments();
    loadUserData();
    simulateTraffic();
    fetchProducts();
    
    // Mettre à jour les stats de trafic toutes les 30 secondes
    const trafficInterval = setInterval(simulateTraffic, 30000);
    
    // Notifications aléatoires
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
      
      if (Math.random() > 0.7) { // 30% de chance
        const randomAlert = alerts[Math.floor(Math.random() * alerts.length)];
        showNotificationToast(randomAlert);
      }
    }, 45000);
    
    return () => {
      clearInterval(trafficInterval);
      clearInterval(notificationInterval);
    };
  }, [language]);

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

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Toast Notifications */}
      {showNotification && (
        <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg transform transition-all duration-300 animate-pulse">
          {notificationText}
        </div>
      )}

      {/* Quiz Modal */}
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

      <header className={`${darkMode ? 'bg-gray-800 text-white' : 'bg-white'} shadow-sm sticky top-0 z-40 transition-colors duration-300`}>
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-xl font-bold">{t('title')}</h1>
              <p className="text-xs opacity-70">{t('subtitle')}</p>
            </div>
            <div className="flex items-center gap-4">
              {/* User Stats */}
              <div className="hidden md:flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2 bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full">
                  <span>⭐</span>
                  <span>{userPoints} {t('points')}</span>
                </div>
                {userBadges.length > 0 && (
                  <div className="flex items-center gap-1">
                    {userBadges.slice(0, 3).map((badge, index) => (
                      <span key={index} className="text-lg" title={t(badge)}>
                        {t(badge).split(' ')[0]}
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
          
          <div className="flex gap-4 mb-3">
            <button 
              onClick={() => setShowBlog(false)} 
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                !showBlog 
                  ? 'bg-blue-600 text-white' 
                  : darkMode 
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {t('products')}
            </button>
            <button 
              onClick={() => setShowBlog(true)} 
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
          
          {!showBlog && (
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
                  className="text-sm border border-gray-300 rounded px-3 py-1 bg-white min-w-[150px]"
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

      {showBlog && (
        <main className="px-4 py-8 max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-sm p-8">
            {/* Indicateur de trafic mobile */}
            <div className="sm:hidden mb-6 flex justify-center gap-6 text-sm">
              <div className="flex items-center gap-2 text-green-600">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>{onlineUsers} {t('onlineNow')}</span>
              </div>
              <div className="text-gray-600">
                👁️ {pageViews.toLocaleString()} {t('pageViews')}
              </div>
            </div>

            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">{t('blogTitle')}</h1>
              <p className="text-lg text-gray-600 mb-6">{t('blogSubtitle')}</p>
              <p className="text-gray-700 leading-relaxed">{t('blogContent')}</p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8 mb-8">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('blogFeatures')}</h2>
                <ul className="space-y-3">
                  <li className="flex items-center text-gray-700">
                    <span className="mr-2">{t('feature1')}</span>
                  </li>
                  <li className="flex items-center text-gray-700">
                    <span className="mr-2">{t('feature2')}</span>
                  </li>
                  <li className="flex items-center text-gray-700">
                    <span className="mr-2">{t('feature3')}</span>
                  </li>
                  <li className="flex items-center text-gray-700">
                    <span className="mr-2">{t('feature4')}</span>
                  </li>
                </ul>
              </div>
              
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('contactForm')}</h3>
                <form onSubmit={handleContactSubmit} className="space-y-4">
                  <input 
                    name="name"
                    type="text" 
                    placeholder={t('yourName')} 
                    required
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div 
                    className={`relative w-full border-2 border-dashed rounded-lg px-4 py-6 transition-all duration-300 ${
                      isDragOver 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-300'
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
                      className="w-full bg-transparent border-none outline-none text-center font-medium"
                    />
                    {isDragOver && (
                      <div className="absolute inset-0 flex items-center justify-center bg-blue-50 bg-opacity-90 rounded-lg">
                        <span className="text-blue-600 font-semibold">{t('dragDropHint')}</span>
                      </div>
                    )}
                    <div className="text-xs text-gray-500 text-center mt-2">
                      💡 {language === 'fr' ? 'Glissez un produit ou tapez le nom' : 'Drag a product or type the name'}
                    </div>
                  </div>
                  <textarea 
                    name="message"
                    placeholder={t('message')} 
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-vertical"
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
                  <p className="text-sm text-gray-600 mb-2">{t('messengerDirect')}</p>
                  <button 
                    onClick={() => window.open(`https://m.me/${MESSENGER_PAGE_ID}`, '_blank')}
                    className="text-blue-600 hover:text-blue-700 font-medium text-sm underline"
                  >
                    Messenger : Ric CERDIA
                  </button>
                </div>
              </div>
            </div>

            {/* Section Commentaires */}
            <div className="mt-12 border-t pt-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('comments')}</h2>
              
              {/* Formulaire d'ajout de commentaire */}
              <div className="bg-gray-50 rounded-xl p-6 mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('addComment')}</h3>
                <form onSubmit={handleCommentSubmit} className="space-y-4">
                  <input 
                    name="commentName"
                    type="text" 
                    placeholder={t('yourName')} 
                    required
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <textarea 
                    name="commentText"
                    placeholder={t('yourComment')} 
                    rows={4}
                    required
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-vertical"
                  />
                  <button 
                    type="submit"
                    className="bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {t('postComment')}
                  </button>
                </form>
              </div>

              {/* Liste des commentaires */}
              <div className="space-y-6">
                {comments.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>{t('noComments')}</p>
                  </div>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-semibold text-lg">
                              {comment.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">{comment.name}</h4>
                            <p className="text-sm text-gray-500">{formatDate(comment.timestamp)}</p>
                          </div>
                        </div>
                      </div>
                      <p className="text-gray-700 leading-relaxed">{comment.comment}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </main>
      )}

      {!showBlog && (
        <main className="px-2 py-4">
          {/* Mobile Stats */}
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

          {/* Bannière publicitaire top */}
          <div className="mb-6 max-w-4xl mx-auto">
            <div className={`${darkMode ? 'bg-gradient-to-r from-purple-800 to-blue-800' : 'bg-gradient-to-r from-purple-600 to-blue-600'} rounded-xl p-6 text-white text-center shadow-lg`}>
              <h3 className="text-lg font-bold mb-2">🎯 Espace Publicitaire Premium</h3>
              <p className="text-sm opacity-90 mb-3">Votre marque ici • Contactez Ric CERDIA pour réserver cet espace</p>
              <button 
                onClick={() => window.open(`https://m.me/${MESSENGER_PAGE_ID}`, '_blank')}
                className="bg-white text-purple-600 px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
              >
                💼 Réserver cet espace
              </button>
            </div>
          </div>

          {/* Recent Activity Sidebar */}
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

              {/* Pub sidebar */}
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

          <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-2 space-y-2">
            {filteredAndSortedProducts.map((product, i) => {
              // Insérer une pub tous les 6 produits
              const shouldShowAd = (i + 1) % 6 === 0;
              
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
                  
                  {/* Pub intégrée tous les 6 produits */}
                  {shouldShowAd && (
                    <div className="break-inside-avoid mb-2">
                      <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-2xl overflow-hidden shadow-sm border`}>
                        <div className={`${darkMode ? 'bg-gradient-to-br from-orange-800 to-red-800' : 'bg-gradient-to-br from-orange-500 to-red-500'} p-4 text-white text-center`}>
                          <h4 className="font-bold text-sm mb-2">🚀 Boostez vos ventes</h4>
                          <p className="text-xs opacity-90 mb-3">Obtenez plus de liens Sitestripe avec nos services premium</p>
                          <button 
                            onClick={() => {
                              window.open(`https://m.me/${MESSENGER_PAGE_ID}`, '_blank');
                              addPoints(10, language === 'fr' ? '+10 points pour la pub cliquée !' : '+10 points for ad click!');
                            }}
                            className="bg-white text-orange-600 px-3 py-1 rounded-lg text-xs font-semibold hover:bg-gray-100 transition-colors"
                          >
                            💬 Découvrir
                          </button>
                        </div>
                        <div className={`p-2 text-center ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                          <span className="text-xs opacity-60">Sponsorisé • CERDIA</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Bannière publicitaire bottom */}
          <div className="mt-8 max-w-4xl mx-auto">
            <div className={`${darkMode ? 'bg-gradient-to-r from-indigo-800 to-purple-800' : 'bg-gradient-to-r from-indigo-600 to-purple-600'} rounded-xl p-6 text-white text-center shadow-lg`}>
              <h3 className="text-lg font-bold mb-2">📈 Maximisez votre ROI</h3>
              <p className="text-sm opacity-90 mb-3">Espace publicitaire stratégique • Haute visibilité garantie</p>
              <div className="flex justify-center gap-4">
                <button 
                  onClick={() => window.open(`https://m.me/${MESSENGER_PAGE_ID}`, '_blank')}
                  className="bg-white text-indigo-600 px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
                >
                  💰 Tarifs pub
                </button>
                <button 
                  onClick={() => {
                    window.open(`https://m.me/${MESSENGER_PAGE_ID}`, '_blank');
                    addPoints(15, language === 'fr' ? '+15 points bonus pub !' : '+15 bonus ad points!');
                  }}
                  className="bg-yellow-400 text-gray-900 px-4 py-2 rounded-lg font-semibold hover:bg-yellow-300 transition-colors"
                >
                  🎯 Réserver
                </button>
              </div>
            </div>
          </div>
        </main>
      )}

      {!showBlog && (
        <button 
          className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center z-30" 
          onClick={() => handleAdminAction(() => setShowForm(true))}
        >
          <Plus size={24} />
        </button>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between">
              <h2 className="text-lg font-bold">{editIndex !== null ? t('modify') : t('add')}</h2>
              <button onClick={resetForm} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center">✕</button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); saveProduct(); }} className="p-4 space-y-4">
              <input name="name" value={newProduct.name} onChange={handleInputChange} placeholder={t('name')} className="w-full border p-3 rounded-lg" required />
              <textarea name="description" value={newProduct.description} onChange={handleInputChange} placeholder={t('description')} className="w-full border p-3 rounded-lg h-20 resize-vertical" required />
              <div className="grid grid-cols-2 gap-3">
                <input name="priceCa" value={newProduct.priceCa} onChange={handleInputChange} placeholder="Prix CAD" className="w-full border p-3 rounded-lg" type="number" step="0.01" min="0" />
                <input name="priceUs" value={newProduct.priceUs} onChange={handleInputChange} placeholder="Prix USD" className="w-full border p-3 rounded-lg" type="number" step="0.01" min="0" />
              </div>
              <input name="amazonCa" value={newProduct.amazonCa} onChange={handleInputChange} placeholder="Amazon.ca" className="w-full border p-3 rounded-lg" type="url" />
              <input name="amazonCom" value={newProduct.amazonCom} onChange={handleInputChange} placeholder="Amazon.com" className="w-full border p-3 rounded-lg" type="url" />
              <input name="tiktokUrl" value={newProduct.tiktokUrl} onChange={handleInputChange} placeholder="TikTok" className="w-full border p-3 rounded-lg" type="url" />
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-700">{t('images')}:</label>
                {newProduct.images.map((image, i) => (
                  <div key={i} className="flex gap-2">
                    <input name="images" value={image} onChange={(e) => handleInputChange(e, i)} placeholder={`Image URL ${i + 1}`} className="flex-1 border p-3 rounded-lg text-sm" type="url" />
                    {newProduct.images.length > 1 && (
                      <button type="button" onClick={() => removeImageField(i)} className="px-3 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={addImageField} className="w-full py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center justify-center gap-2">
                  <Plus size={16} />{t('addImage')}
                </button>
              </div>
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-700">{t('categories')}:</label>
                <div className="flex flex-wrap gap-2">
                  {availableCategories.map((cat) => {
                    const isChecked = newProduct.categories.includes(cat);
                    
                    return (
                      <label key={cat} className={`flex items-center p-2 rounded-lg text-sm cursor-pointer transition-colors ${
                        isChecked 
                          ? 'bg-blue-100 border-2 border-blue-500 text-blue-800' 
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
                    !passwordEntered ? 'bg-gray-100 cursor-not-allowed' : ''
                  }`} 
                />
                {newProduct.categories.length > 0 && (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-700">{t('selectedCategories')}: {newProduct.categories.join(', ')}</p>
                  </div>
                )}
              </div>
              <div className="flex gap-3 pt-4 border-t">
                <button type="button" onClick={resetForm} className="flex-1 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600">{t('cancel')}</button>
                <button type="submit" className="flex-1 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">{editIndex !== null ? t('modify') : t('save')}</button>
                {editIndex !== null && (
                  <button type="button" onClick={() => deleteProduct(products[editIndex].id)} className="px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700">🗑️</button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function ProductCard({ product, language, isFavorite, onToggleFavorite, onEdit, showAdmin, hasValue, hasPriceValue, cleanCategory, translateCategory, t }: any) {
  const [current, setCurrent] = useState(0);
  const [imageError, setImageError] = useState<{ [key: number]: boolean }>({});
  const [showZoom, setShowZoom] = useState(false);
  const [zoomImage, setZoomImage] = useState('');
  const images = Array.isArray(product.images) ? product.images.filter(Boolean) : [];

  const handleImageDoubleClick = (imageUrl: string) => {
    setZoomImage(imageUrl);
    setShowZoom(true);
  };

  const closeZoom = () => {
    setShowZoom(false);
    setZoomImage('');
  };

  return (
    <>
      <div className="break-inside-avoid mb-2">
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
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
                    <button onClick={() => setCurrent((current - 1 + images.length) % images.length)} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black bg-opacity-60 hover:bg-opacity-80 text-white rounded-full w-8 h-8 flex items-center justify-center z-10 text-lg font-bold">‹</button>
                    <button onClick={() => setCurrent((current + 1) % images.length)} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black bg-opacity-60 hover:bg-opacity-80 text-white rounded-full w-8 h-8 flex items-center justify-center z-10 text-lg font-bold">›</button>:bg-opacity-80 text-white rounded-full w-8 h-8 flex items-center justify-center z-10 text-lg font-bold">›</button>
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10">
                      {images.map((_, index) => (
                        <div key={index} className={`w-1.5 h-1.5 rounded-full ${index === current ? 'bg-white' : 'bg-white bg-opacity-50'}`} />
                      ))}
                    </div>
                  </>
                )}
                <div className="absolute top-2 right-2 flex gap-1 z-10">
                  <button onClick={onToggleFavorite} className={`w-8 h-8 rounded-full flex items-center justify-center ${isFavorite ? 'bg-red-500 text-white' : 'bg-white bg-opacity-80 text-gray-600'}`}>
                    <Heart size={16} fill={isFavorite ? 'white' : 'none'} />
                  </button>
                  {showAdmin && (
                    <button onClick={onEdit} className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center">
                      <Pencil size={14} />
                    </button>
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
            <h3 className="font-semibold text-sm text-gray-900 line-clamp-2 mb-2">{product.name}</h3>
            <p className="text-xs text-gray-600 line-clamp-3 mb-3">{product.description}</p>
            
            {(hasPriceValue(product.priceCa) || hasPriceValue(product.priceUs)) && (
              <div className="mb-3">
                <p className="font-semibold text-sm text-gray-900">
                  {t('indicativePrice')} 
                  {hasPriceValue(product.priceCa) && ` ${product.priceCa} CAD`}
                  {hasPriceValue(product.priceCa) && hasPriceValue(product.priceUs) && ' |'}
                  {hasPriceValue(product.priceUs) && ` ${product.priceUs} USD`}
                </p>
                <p className="text-xs text-gray-500 italic">{t('priceNote')}</p>
              </div>
            )}
            <div className="space-y-2">
              {(hasValue(product.amazonCa) || hasValue(product.amazonCom)) && (
                <div className="flex gap-2">
                  {hasValue(product.amazonCa) && (
                    <Link href={product.amazonCa} target="_blank" rel="noopener noreferrer" className="flex-1">
                      <button className="w-full bg-orange-500 text-white py-2 px-3 rounded-lg text-xs font-medium hover:bg-orange-600 transition-colors">🛒 Amazon.ca</button>
                    </Link>
                  )}
                  {hasValue(product.amazonCom) && (
                    <Link href={product.amazonCom} target="_blank" rel="noopener noreferrer" className="flex-1">
                      <button className="w-full bg-gray-900 text-white py-2 px-3 rounded-lg text-xs font-medium hover:bg-gray-800 transition-colors">🛒 Amazon.com</button>
                    </Link>
                  )}
                </div>
              )}
              {hasValue(product.tiktokUrl) && (
                <Link href={product.tiktokUrl} target="_blank" rel="noopener noreferrer">
                  <button className="w-full bg-black text-white py-2 px-3 rounded-lg text-xs font-medium hover:bg-gray-900 transition-colors">🎵 {t('viewOnTiktok')}</button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

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
