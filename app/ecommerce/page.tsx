'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { Pencil, Globe, Plus, Trash2, Heart } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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
    title: 'CERDIA',
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
  },
  en: {
    title: 'CERDIA',
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
  }
};

export default function EcommercePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [passwordEntered, setPasswordEntered] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [language, setLanguage] = useState<'fr' | 'en'>('fr');
  const [favorites, setFavorites] = useState<Set<number>>(new Set());
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

  // Fonction helper pour vérifier si les catégories correspondent
  const categoriesMatch = (productCategories: string[], filterCategory: string): boolean => {
    if (!productCategories || productCategories.length === 0) return false;
    
    // Normaliser le filtre vers le français (format de stockage)
    const normalizedFilter = normalizeCategory(cleanCategory(filterCategory));
    
    return productCategories.some(cat => {
      const cleanCat = cleanCategory(cat);
      const normalizedProductCat = normalizeCategory(cleanCat);
      
      return normalizedProductCat === normalizedFilter;
    });
  };

  // Charger les catégories personnalisées depuis localStorage
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

  // Sauvegarder les catégories personnalisées dans localStorage
  const saveCustomCategories = (categories: string[]) => {
    try {
      localStorage.setItem('customCategories', JSON.stringify(categories));
    } catch (e) {
      console.error('Erreur lors de la sauvegarde des catégories personnalisées:', e);
    }
  };

  useEffect(() => {
    loadCustomCategories();
    fetchProducts();
  }, []);

  // Générer les catégories disponibles
  useEffect(() => {
    // Catégories par défaut dans la langue actuelle
    const defaultCats = DEFAULT_CATEGORIES[language];
    
    // Catégories des produits existants
    const productCategories = new Set<string>();
    products.forEach(product => {
      if (Array.isArray(product.categories)) {
        product.categories.forEach(cat => {
          const cleanCat = cleanCategory(cat);
          const normalizedCat = normalizeCategory(cleanCat);
          if (normalizedCat && normalizedCat.trim() !== '' && !normalizedCat.includes('"') && !normalizedCat.includes('[') && !normalizedCat.includes(']')) {
            const translatedCat = translateCategory(normalizedCat, language);
            if (translatedCat) {
              productCategories.add(translatedCat);
            }
          }
        });
      }
    });
    
    // Catégories personnalisées traduites
    const translatedCustomCategories = customCategories
      .map(cat => translateCategory(normalizeCategory(cleanCategory(cat)), language))
      .filter(cat => cat && cat.trim() !== '');
    
    // Combiner toutes les catégories
    const allCategories = new Set([
      ...defaultCats,
      ...Array.from(productCategories),
      ...translatedCustomCategories
    ]);
    
    // Nettoyer et trier
    const cleanedCategories = Array.from(allCategories)
      .filter(cat => cat && cat.trim() !== '' && cat !== 'undefined' && cat !== 'null')
      .sort();
    
    setAvailableCategories(cleanedCategories);
  }, [products, language, customCategories]);

  const fetchProducts = async () => {
    console.log('=== RÉCUPÉRATION DES PRODUITS ===');
    const { data, error } = await supabase.from('products').select('*');
    if (!error && data) {
      console.log('Données brutes de Supabase:', data);
      
      const cleaned = data.map((p) => {
        const productCategories = Array.isArray(p.categories) 
          ? p.categories.map(cat => cleanCategory(cat)).filter(cat => cat && cat.trim() !== '' && !cat.includes('"'))
          : (p.categories ? [cleanCategory(p.categories)].filter(cat => cat && cat.trim() !== '' && !cat.includes('"')) : []);
        
        console.log(`Produit "${p.name}" - catégories DB:`, p.categories, '→ nettoyées:', productCategories);
        
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
        };
      });
      
      console.log('Produits nettoyés:', cleaned);
      setProducts(cleaned);
    } else if (error) {
      console.error('Erreur lors de la récupération:', error);
    }
  };

  const saveProduct = async () => {
    const filteredImages = newProduct.images.filter(img => img.trim() !== '');
    
    console.log('=== DEBUG SAUVEGARDE ===');
    console.log('Catégories brutes du formulaire:', newProduct.categories);
    
    // Normaliser les catégories sélectionnées vers le français pour le stockage
    const normalizedCategories = newProduct.categories
      .map(cat => {
        const cleanCat = cleanCategory(cat);
        const normalized = normalizeCategory(cleanCat);
        console.log(`Catégorie "${cat}" → nettoyée: "${cleanCat}" → normalisée: "${normalized}"`);
        return normalized;
      })
      .filter(cat => cat && cat.trim() !== '')
      .filter((cat, index, arr) => arr.indexOf(cat) === index); // Supprimer les doublons
    
    console.log('Catégories normalisées pour la DB:', normalizedCategories);
    
    const productToInsert: any = {
      name: newProduct.name,
      description: newProduct.description,
      categories: normalizedCategories.length > 0 ? normalizedCategories : null,
    };

    console.log('Objet à insérer/mettre à jour:', productToInsert);

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
        console.log('✅ Produit mis à jour avec succès');
        await fetchProducts();
        alert(t('productUpdated'));
      } else {
        console.error('❌ Erreur lors de la mise à jour:', error);
        alert(t('updateError'));
      }
    } else {
      const { error } = await supabase.from('products').insert([productToInsert]);
      if (!error) {
        console.log('✅ Produit ajouté avec succès');
        await fetchProducts();
        alert(t('productAdded'));
      } else {
        console.error('❌ Erreur lors de l\'ajout:', error);
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
      console.log(t('productDeleted'));
    } else {
      console.error(t('deleteError'), error);
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
    const normalizedCategory = normalizeCategory(cleanCategory(category));
    const translatedCategory = translateCategory(normalizedCategory, language);
    
    if (translatedCategory && translatedCategory.trim() !== '') {
      // Vérifier si cette catégorie existe déjà dans availableCategories
      const categoryExists = availableCategories.some(cat => 
        normalizeCategory(cleanCategory(cat)) === normalizedCategory
      );
      
      if (!categoryExists) {
        // Ajouter immédiatement à availableCategories
        setAvailableCategories(prev => [...prev, translatedCategory].sort());
        
        // Ajouter aux catégories personnalisées (version normalisée)
        const updatedCustomCategories = [...customCategories];
        if (!updatedCustomCategories.some(cat => normalizeCategory(cleanCategory(cat)) === normalizedCategory)) {
          updatedCustomCategories.push(normalizedCategory);
          setCustomCategories(updatedCustomCategories);
          saveCustomCategories(updatedCustomCategories);
        }
      }
    }
  };

  const handleCategoryToggle = (category: string, checked: boolean) => {
    console.log('=== TOGGLE CATÉGORIE ===');
    console.log('Catégorie cliquée:', category);
    console.log('État checked:', checked);
    console.log('Catégories actuelles avant modification:', newProduct.categories);
    
    if (checked) {
      // Ajouter la catégorie si elle n'existe pas déjà
      if (!newProduct.categories.includes(category)) {
        const updatedCategories = [...newProduct.categories, category];
        console.log('Nouvelles catégories après ajout:', updatedCategories);
        setNewProduct({ 
          ...newProduct, 
          categories: updatedCategories
        });
      } else {
        console.log('Catégorie déjà présente, pas d\'ajout');
      }
    } else {
      // Supprimer la catégorie
      const updatedCategories = newProduct.categories.filter(c => c !== category);
      console.log('Nouvelles catégories après suppression:', updatedCategories);
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
    
    const confirmCleanup = confirm('Voulez-vous nettoyer les catégories ? Cela va :\n\n1. Supprimer les catégories malformées comme "[Watch]", "[[Montre],Watch]"\n2. Supprimer les catégories non-utilisées par aucun produit\n3. Normaliser toutes les catégories restantes\n\nCette action est irréversible.');
    if (!confirmCleanup) return;

    try {
      // Récupérer tous les produits
      const { data: allProducts } = await supabase.from('products').select('*');
      
      if (allProducts) {
        // Set pour collecter toutes les catégories utilisées
        const usedCategories = new Set<string>();
        
        // Première passe : nettoyer et collecter les catégories utilisées
        for (const product of allProducts) {
          if (product.categories) {
            // Nettoyer les catégories
            const cleanedCategories = Array.isArray(product.categories) 
              ? product.categories
                  .map(cat => cleanCategory(cat))
                  .filter(cat => cat && cat.trim() !== '' && !cat.includes('[') && !cat.includes(']'))
                  .map(cat => normalizeCategory(cat))
                  .filter((cat, index, arr) => arr.indexOf(cat) === index) // Supprimer les doublons
              : [cleanCategory(product.categories)]
                  .filter(cat => cat && cat.trim() !== '' && !cat.includes('[') && !cat.includes(']'))
                  .map(cat => normalizeCategory(cat));

            // Ajouter les catégories nettoyées à la liste des catégories utilisées
            cleanedCategories.forEach(cat => {
              if (cat && cat.trim() !== '') {
                usedCategories.add(cat);
              }
            });

            // Mettre à jour le produit si les catégories ont changé
            if (JSON.stringify(cleanedCategories) !== JSON.stringify(product.categories)) {
              await supabase
                .from('products')
                .update({ categories: cleanedCategories.length > 0 ? cleanedCategories : null })
                .eq('id', product.id);
            }
          }
        }
        
        // Nettoyer aussi les catégories personnalisées
        const cleanedCustomCategories = customCategories
          .map(cat => normalizeCategory(cleanCategory(cat)))
          .filter(cat => cat && cat.trim() !== '' && usedCategories.has(cat));
        
        setCustomCategories(cleanedCustomCategories);
        saveCustomCategories(cleanedCustomCategories);
        
        // Recharger les produits pour mettre à jour l'interface
        await fetchProducts();
        
        // Afficher le résultat
        const categoriesUsedCount = usedCategories.size;
        const categoriesKept = Array.from(usedCategories).join(', ');
        
        alert(`Nettoyage terminé avec succès !\n\n✅ Catégories conservées (${categoriesUsedCount}) :\n${categoriesKept}\n\n🗑️ Toutes les catégories malformées et non-utilisées ont été supprimées.`);
      }
    } catch (error) {
      console.error('Erreur lors du nettoyage:', error);
      alert('Erreur lors du nettoyage des catégories.');
    }
  };

  // LOGIQUE DE FILTRAGE AVEC DEBUG CORRIGÉE
  const filteredProducts = categoryFilter
    ? products.filter((product) => {
        if (!product.categories || product.categories.length === 0) {
          console.log(`Produit "${product.name}" ignoré - pas de catégories`);
          return false;
        }
        
        console.log(`=== FILTRAGE POUR "${product.name}" ===`);
        console.log(`Filtre sélectionné: "${categoryFilter}"`);
        console.log(`Catégories du produit:`, product.categories);
        
        // Le filtre peut être en français ou anglais selon la langue d'interface
        // Les catégories en base sont en français normalisé
        // On doit donc vérifier les deux correspondances possibles
        
        const hasCategory = product.categories.some(productCat => {
          const cleanProductCat = cleanCategory(productCat);
          
          // Vérification directe (si même langue)
          const directMatch = cleanProductCat === categoryFilter;
          
          // Vérification avec traduction du filtre vers français
          const filterToFrench = translateCategory(categoryFilter, 'fr');
          const translatedMatch = cleanProductCat === filterToFrench;
          
          // Vérification avec traduction de la catégorie vers la langue d'interface
          const categoryToInterface = translateCategory(cleanProductCat, language);
          const interfaceMatch = categoryToInterface === categoryFilter;
          
          console.log(`  Catégorie "${productCat}":`);
          console.log(`    - Direct: "${cleanProductCat}" === "${categoryFilter}" ? ${directMatch}`);
          console.log(`    - Filtre→FR: "${cleanProductCat}" === "${filterToFrench}" ? ${translatedMatch}`);
          console.log(`    - Cat→Interface: "${categoryToInterface}" === "${categoryFilter}" ? ${interfaceMatch}`);
          
          return directMatch || translatedMatch || interfaceMatch;
        });
        
        console.log(`Produit "${product.name}" ${hasCategory ? '✅ INCLUS' : '❌ EXCLU'} du filtre`);
        return hasCategory;
      })
    : (() => {
        console.log('Aucun filtre - affichage de tous les produits');
        return [...products];
      })();

  const handleEdit = (index: number) => {
    const product = products[index];
    setEditIndex(index);
    setShowForm(true);
    
    // Récupérer les catégories du produit et les traduire selon la langue actuelle
    const translatedCategories = Array.isArray(product.categories) 
      ? product.categories
          .map(cat => cleanCategory(cat))
          .filter(cat => cat && cat.trim() !== '')
          .map(cat => translateCategory(cat, language)) // Traduire vers la langue d'affichage
      : [];
    
    const productImages = [...product.images];
    if (productImages.length === 0 || productImages[productImages.length - 1] !== '') {
      productImages.push('');
    }
    
    setNewProduct({
      ...product,
      categories: translatedCategories, // Utiliser les catégories traduites
      images: productImages
    });
  };

  const toggleFavorite = (productId: number) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(productId)) {
      newFavorites.delete(productId);
    } else {
      newFavorites.add(productId);
    }
    setFavorites(newFavorites);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{t('title')}</h1>
              <p className="text-xs text-gray-600">{t('subtitle')}</p>
            </div>
            <div className="flex items-center gap-2">
              <Globe size={16} className="text-gray-600" />
              <select 
                value={language} 
                onChange={(e) => setLanguage(e.target.value as 'fr' | 'en')}
                className="text-sm border border-gray-300 rounded px-2 py-1 bg-white"
              >
                <option value="fr">🇫🇷</option>
                <option value="en">🇺🇸</option>
              </select>
            </div>
          </div>
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
        </div>
      </header>

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
                    // Vérification simple : la catégorie est-elle déjà sélectionnée ?
                    const isChecked = newProduct.categories.includes(cat);
                    console.log(`Rendu catégorie "${cat}": checked=${isChecked}, catégories actuelles:`, newProduct.categories);
                    
                    return (
                      <label key={cat} className={`flex items-center p-2 rounded-lg text-sm cursor-pointer transition-colors ${
                        isChecked 
                          ? 'bg-blue-100 border-2 border-blue-500 text-blue-800' 
                          : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                      }`}>
                        <input 
                          type="checkbox" 
                          checked={isChecked}
                          onChange={(e) => {
                            console.log(`Checkbox "${cat}" changée: ${e.target.checked}`);
                            handleCategoryToggle(cat, e.target.checked);
                          }} 
                          className="mr-2" 
                        /> 
                        <span className="font-medium">{cat}</span>
                      </label>
                    );
                  })}
                </div>
                <input placeholder={t('addCategory')} onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const val = (e.target as HTMLInputElement).value.trim();
                      if (val) {
                        handleAddCategory(val);
                        (e.target as HTMLInputElement).value = '';
                      }
                    }
                  }} className="w-full border p-3 rounded-lg" />
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

      <main className="px-2 py-4">
        <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-2 space-y-2">
          {filteredProducts.map((product, i) => (
            <ProductCard 
              key={product.id || i} 
              product={product} 
              language={language}
              isFavorite={favorites.has(product.id || 0)}
              onToggleFavorite={() => toggleFavorite(product.id || 0)}
              onEdit={() => handleAdminAction(() => handleEdit(i))}
              showAdmin={passwordEntered}
              hasValue={hasValue}
              hasPriceValue={hasPriceValue}
              cleanCategory={cleanCategory}
              translateCategory={(cat: string) => translateCategory(cat, language)}
              t={t}
            />
          ))}
        </div>
      </main>

      <button className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center z-30" onClick={() => handleAdminAction(() => setShowForm(true))}>
        <Plus size={24} />
      </button>
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
                    <button onClick={() => setCurrent((current + 1) % images.length)} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black bg-opacity-60 hover:bg-opacity-80 text-white rounded-full w-8 h-8 flex items-center justify-center z-10 text-lg font-bold">›</button>
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
            
            {/* SUPPRESSION DE L'AFFICHAGE DES CATÉGORIES SUR LES CARTES */}
            
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

      {/* Modal de zoom d'image avec carousel */}
      {showZoom && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4" onClick={closeZoom}>
          <div className="relative max-w-full max-h-full" onClick={(e) => e.stopPropagation()}>
            <button 
              onClick={closeZoom}
              className="absolute top-4 right-4 w-10 h-10 bg-black bg-opacity-60 hover:bg-opacity-80 text-white rounded-full flex items-center justify-center z-20 backdrop-blur-sm font-bold"
            >
              ✕
            </button>
            
            {/* Navigation carousel dans le zoom */}
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
                
                {/* Indicateurs de pagination dans le zoom */}
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
