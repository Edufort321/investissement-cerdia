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

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    const baseCategories = new Set(DEFAULT_CATEGORIES.fr);
    products.forEach(product => {
      if (Array.isArray(product.categories)) {
        product.categories.forEach(cat => {
          const cleanCat = cleanCategory(cat);
          const normalizedCat = normalizeCategory(cleanCat);
          if (normalizedCat && !normalizedCat.includes('"')) {
            baseCategories.add(normalizedCat);
          }
        });
      }
    });
    baseCategories.delete('');
    baseCategories.delete('undefined');
    const categoriesInCurrentLang = Array.from(baseCategories)
      .filter(cat => cat && cat.trim() !== '')
      .map(cat => translateCategory(cat, language));
    setAvailableCategories(categoriesInCurrentLang);
  }, [products, language]);

  const fetchProducts = async () => {
    const { data, error } = await supabase.from('products').select('*');
    if (!error && data) {
      const cleaned = data.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        amazonCa: p.amazonca || '',
        amazonCom: p.amazoncom || '',
        tiktokUrl: p.tiktokurl || '',
        images: [p.image1, p.image2, p.image3, p.image4, p.image5].filter(Boolean),
        categories: Array.isArray(p.categories) 
          ? p.categories.map(cat => cleanCategory(cat)).filter(cat => cat && cat.trim() !== '' && !cat.includes('"'))
          : (p.categories ? [cleanCategory(p.categories)].filter(cat => cat && cat.trim() !== '' && !cat.includes('"')) : []),
        priceCa: p.price_ca?.toString() || '',
        priceUs: p.price_us?.toString() || '',
      }));
      setProducts(cleaned);
    }
  };

  const saveProduct = async () => {
    const filteredImages = newProduct.images.filter(img => img.trim() !== '');
    const normalizedCategories = newProduct.categories
      .map(cat => normalizeCategory(cleanCategory(cat)))
      .filter(cat => cat && cat.trim() !== '' && !cat.includes('"'));
    
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
        console.log(t('productUpdated'));
      } else {
        console.error(t('updateError'), error);
      }
    } else {
      const { error } = await supabase.from('products').insert([productToInsert]);
      if (!error) {
        await fetchProducts();
        console.log(t('productAdded'));
      } else {
        console.error(t('addError'), error);
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
    if (category && !availableCategories.includes(category)) {
      setAvailableCategories([...availableCategories, category]);
    }
  };

  const handleCategoryToggle = (category: string, checked: boolean) => {
    const updatedCategories = checked
      ? [...newProduct.categories, category]
      : newProduct.categories.filter((c) => c !== category);
    setNewProduct({ ...newProduct, categories: updatedCategories });
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

  const filteredProducts = categoryFilter
    ? products.filter((p) => {
        if (!p.categories || p.categories.length === 0) return false;
        return p.categories.some(cat => {
          const cleanCat = cleanCategory(cat);
          const translatedCat = translateCategory(cleanCat, language);
          const normalizedFilterCat = normalizeCategory(cleanCategory(categoryFilter));
          const normalizedProductCat = normalizeCategory(cleanCat);
          return translatedCat === categoryFilter || normalizedProductCat === normalizedFilterCat;
        });
      })
    : [...products];

  const handleEdit = (index: number) => {
    const product = products[index];
    setEditIndex(index);
    setShowForm(true);
    const translatedCategories = Array.isArray(product.categories) 
      ? product.categories
          .map(cat => cleanCategory(cat))
          .filter(cat => cat && cat.trim() !== '' && !cat.includes('"'))
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
                  {availableCategories.map((cat) => (
                    <label key={cat} className="flex items-center bg-gray-50 p-2 rounded-lg text-sm">
                      <input type="checkbox" checked={newProduct.categories.includes(cat)} onChange={(e) => handleCategoryToggle(cat, e.target.checked)} className="mr-2" /> 
                      <span>{cat}</span>
                    </label>
                  ))}
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
                    <button onClick={() => setCurrent((current - 1 + images.length) % images.length)} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black bg-opacity-40 text-white rounded-full w-6 h-6 flex items-center justify-center z-10">‹</button>
                    <button onClick={() => setCurrent((current + 1) % images.length)} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black bg-opacity-40 text-white rounded-full w-6 h-6 flex items-center justify-center z-10">›</button>
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
                {/* Indicateur de double-clic */}
                <div className="absolute bottom-2 right-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded opacity-70">
                  📷 Double-clic
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
            {product.categories && product.categories.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {product.categories.map(cat => cleanCategory(cat)).filter(cat => cat && cat.trim() !== '' && !cat.includes('"')).slice(0, 2).map((cat, idx) => (
                  <span key={idx} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">{translateCategory(cat)}</span>
                ))}
              </div>
            )}
            {(hasPriceValue(product.priceCa) || hasPriceValue(product.priceUs)) && (
              <div className="mb-3">
                <p className="font-semibold text-sm text-gray-900">
                  {t('indicativePrice')} 
                  {hasPriceValue(product.priceCa) && ` ${product.priceCa}'use client';

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

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    const baseCategories = new Set(DEFAULT_CATEGORIES.fr);
    products.forEach(product => {
      if (Array.isArray(product.categories)) {
        product.categories.forEach(cat => {
          const cleanCat = cleanCategory(cat);
          const normalizedCat = normalizeCategory(cleanCat);
          if (normalizedCat && !normalizedCat.includes('"')) {
            baseCategories.add(normalizedCat);
          }
        });
      }
    });
    baseCategories.delete('');
    baseCategories.delete('undefined');
    const categoriesInCurrentLang = Array.from(baseCategories)
      .filter(cat => cat && cat.trim() !== '')
      .map(cat => translateCategory(cat, language));
    setAvailableCategories(categoriesInCurrentLang);
  }, [products, language]);

  const fetchProducts = async () => {
    const { data, error } = await supabase.from('products').select('*');
    if (!error && data) {
      const cleaned = data.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        amazonCa: p.amazonca || '',
        amazonCom: p.amazoncom || '',
        tiktokUrl: p.tiktokurl || '',
        images: [p.image1, p.image2, p.image3, p.image4, p.image5].filter(Boolean),
        categories: Array.isArray(p.categories) 
          ? p.categories.map(cat => cleanCategory(cat)).filter(cat => cat && cat.trim() !== '' && !cat.includes('"'))
          : (p.categories ? [cleanCategory(p.categories)].filter(cat => cat && cat.trim() !== '' && !cat.includes('"')) : []),
        priceCa: p.price_ca?.toString() || '',
        priceUs: p.price_us?.toString() || '',
      }));
      setProducts(cleaned);
    }
  };

  const saveProduct = async () => {
    const filteredImages = newProduct.images.filter(img => img.trim() !== '');
    const normalizedCategories = newProduct.categories
      .map(cat => normalizeCategory(cleanCategory(cat)))
      .filter(cat => cat && cat.trim() !== '' && !cat.includes('"'));
    
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
        console.log(t('productUpdated'));
      } else {
        console.error(t('updateError'), error);
      }
    } else {
      const { error } = await supabase.from('products').insert([productToInsert]);
      if (!error) {
        await fetchProducts();
        console.log(t('productAdded'));
      } else {
        console.error(t('addError'), error);
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
    if (category && !availableCategories.includes(category)) {
      setAvailableCategories([...availableCategories, category]);
    }
  };

  const handleCategoryToggle = (category: string, checked: boolean) => {
    const updatedCategories = checked
      ? [...newProduct.categories, category]
      : newProduct.categories.filter((c) => c !== category);
    setNewProduct({ ...newProduct, categories: updatedCategories });
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

  const filteredProducts = categoryFilter
    ? products.filter((p) => {
        if (!p.categories || p.categories.length === 0) return false;
        return p.categories.some(cat => {
          const cleanCat = cleanCategory(cat);
          const translatedCat = translateCategory(cleanCat, language);
          const normalizedFilterCat = normalizeCategory(cleanCategory(categoryFilter));
          const normalizedProductCat = normalizeCategory(cleanCat);
          return translatedCat === categoryFilter || normalizedProductCat === normalizedFilterCat;
        });
      })
    : [...products];

  const handleEdit = (index: number) => {
    const product = products[index];
    setEditIndex(index);
    setShowForm(true);
    const translatedCategories = Array.isArray(product.categories) 
      ? product.categories
          .map(cat => cleanCategory(cat))
          .filter(cat => cat && cat.trim() !== '' && !cat.includes('"'))
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
                  {availableCategories.map((cat) => (
                    <label key={cat} className="flex items-center bg-gray-50 p-2 rounded-lg text-sm">
                      <input type="checkbox" checked={newProduct.categories.includes(cat)} onChange={(e) => handleCategoryToggle(cat, e.target.checked)} className="mr-2" /> 
                      <span>{cat}</span>
                    </label>
                  ))}
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

}
                  {hasPriceValue(product.priceCa) && hasPriceValue(product.priceUs) && ' |'}
                  {hasPriceValue(product.priceUs) && ` ${product.priceUs}`}
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

      {/* Modal de zoom d'image */}
      {showZoom && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4" onClick={closeZoom}>
          <div className="relative max-w-full max-h-full">
            <button 
              onClick={closeZoom}
              className="absolute top-4 right-4 w-10 h-10 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-full flex items-center justify-center z-10 backdrop-blur-sm"
            >
              ✕
            </button>
            <Image
              src={zoomImage}
              alt={product.name}
              width={800}
              height={800}
              className="max-w-full max-h-full object-contain rounded-lg"
              unoptimized
              loader={({ src }) => src}
              onClick={(e) => e.stopPropagation()}
            />
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black bg-opacity-60 text-white px-4 py-2 rounded-lg backdrop-blur-sm">
              <p className="text-sm text-center">{product.name}</p>
              <p className="text-xs text-gray-300 text-center mt-1">Cliquez pour fermer</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
