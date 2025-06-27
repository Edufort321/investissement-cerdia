'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { Pencil, Globe } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Product {
  id?: number;
  name: string;
  description: string;
  amazonCa: string;
  amazonCom: string;
  tiktokUrl: string;
  images: string[];
  categories: string[];
  priceCa: string;
  priceUs: string;
}

const PASSWORD = '321MdlTamara!$';

// Catégories par défaut avec traductions
const DEFAULT_CATEGORIES = {
  fr: ['Montre', 'Lunette de soleil', 'Sac à dos', 'Article de voyage'],
  en: ['Watch', 'Sunglasses', 'Backpack', 'Travel item']
};

// Mapping pour associer les catégories FR/EN
const CATEGORY_MAPPING = {
  // Français vers Anglais
  'Montre': 'Watch',
  'Lunette de soleil': 'Sunglasses', 
  'Sac à dos': 'Backpack',
  'Article de voyage': 'Travel item',
  // Anglais vers Français  
  'Watch': 'Montre',
  'Sunglasses': 'Lunette de soleil',
  'Backpack': 'Sac à dos',
  'Travel item': 'Article de voyage'
};

// Dictionnaire de traductions
const translations = {
  fr: {
    title: 'Catalogue CERDIA connecté à Supabase',
    all: 'Tous',
    priceUp: 'Prix ↑',
    priceDown: 'Prix ↓',
    addProduct: '➕ Ajouter un produit affilié',
    name: 'Nom',
    description: 'Description',
    priceCad: 'Prix CAD',
    priceUsd: 'Prix USD',
    amazonCaLink: 'Lien Amazon.ca',
    amazonComLink: 'Lien Amazon.com',
    tiktokLink: 'Lien TikTok',
    categories: 'Catégories',
    addCategory: 'Ajouter une catégorie',
    selectedCategories: 'Catégories sélectionnées',
    modify: 'Modifier',
    add: 'Ajouter',
    cancel: 'Annuler',
    delete: 'Supprimer',
    price: 'Prix',
    noImage: 'Aucune image',
    imageNotAvailable: 'Image non disponible',
    viewOnTiktok: 'Voir sur TikTok',
    adminPassword: 'Mot de passe admin :',
    incorrectPassword: 'Mot de passe incorrect.',
    productUpdated: 'Produit mis à jour avec succès',
    productAdded: 'Produit ajouté avec succès',
    productDeleted: 'Produit supprimé avec succès',
    updateError: 'Erreur lors de la mise à jour',
    addError: 'Erreur lors de l\'ajout',
    deleteError: 'Erreur lors de la suppression',
    imageError: 'Erreur de chargement image',
    editingProduct: 'Édition du produit',
  },
  en: {
    title: 'CERDIA Catalog connected to Supabase',
    all: 'All',
    priceUp: 'Price ↑',
    priceDown: 'Price ↓',
    addProduct: '➕ Add affiliate product',
    name: 'Name',
    description: 'Description',
    priceCad: 'CAD Price',
    priceUsd: 'USD Price',
    amazonCaLink: 'Amazon.ca Link',
    amazonComLink: 'Amazon.com Link',
    tiktokLink: 'TikTok Link',
    categories: 'Categories',
    addCategory: 'Add category',
    selectedCategories: 'Selected categories',
    modify: 'Modify',
    add: 'Add',
    cancel: 'Cancel',
    delete: 'Delete',
    price: 'Price',
    noImage: 'No image',
    imageNotAvailable: 'Image not available',
    viewOnTiktok: 'View on TikTok',
    adminPassword: 'Admin password:',
    incorrectPassword: 'Incorrect password.',
    productUpdated: 'Product updated successfully',
    productAdded: 'Product added successfully',
    productDeleted: 'Product deleted successfully',
    updateError: 'Error during update',
    addError: 'Error during addition',
    deleteError: 'Error during deletion',
    imageError: 'Image loading error',
    editingProduct: 'Editing product',
  }
};

export default function EcommercePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [passwordEntered, setPasswordEntered] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | ''>('');
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [language, setLanguage] = useState<'fr' | 'en'>('fr');
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

  // Fonction pour obtenir le texte traduit
  const t = (key: keyof typeof translations.fr) => translations[language][key];

  // Fonction pour traduire une catégorie
  const translateCategory = (category: string, targetLang: 'fr' | 'en'): string => {
    if (CATEGORY_MAPPING[category as keyof typeof CATEGORY_MAPPING]) {
      return targetLang === 'fr' ? 
        (CATEGORY_MAPPING[category as keyof typeof CATEGORY_MAPPING] === category ? category : CATEGORY_MAPPING[category as keyof typeof CATEGORY_MAPPING]) :
        (CATEGORY_MAPPING[category as keyof typeof CATEGORY_MAPPING] === category ? category : CATEGORY_MAPPING[category as keyof typeof CATEGORY_MAPPING]);
    }
    return category;
  };

  // Fonction pour normaliser une catégorie (la convertir vers la forme française pour le stockage)
  const normalizeCategory = (category: string): string => {
    // Si c'est une catégorie anglaise connue, on la convertit en français
    if (CATEGORY_MAPPING[category as keyof typeof CATEGORY_MAPPING] && 
        DEFAULT_CATEGORIES.en.includes(category)) {
      return CATEGORY_MAPPING[category as keyof typeof CATEGORY_MAPPING];
    }
    return category;
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Mise à jour des catégories disponibles quand les produits changent ou la langue change
  useEffect(() => {
    const baseCategories = new Set(DEFAULT_CATEGORIES.fr);
    
    // Ajouter les catégories des produits existants (normalisées en français)
    products.forEach(product => {
      if (Array.isArray(product.categories)) {
        product.categories.forEach(cat => {
          const normalizedCat = normalizeCategory(cat);
          baseCategories.add(normalizedCat);
        });
      }
    });
    
    // Convertir vers la langue actuelle pour l'affichage
    const categoriesInCurrentLang = Array.from(baseCategories).map(cat => 
      translateCategory(cat, language)
    );
    
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
        categories: Array.isArray(p.categories) ? p.categories : (p.categories ? [p.categories] : []),
        priceCa: p.price_ca?.toString() || '',
        priceUs: p.price_us?.toString() || '',
      }));
      setProducts(cleaned);
    }
  };

  const saveProduct = async () => {
    const filteredImages = newProduct.images.filter(img => img.trim() !== '');
    
    // Normaliser les catégories avant la sauvegarde (convertir en français)
    const normalizedCategories = newProduct.categories.map(cat => normalizeCategory(cat));
    
    const productToInsert = {
      name: newProduct.name,
      description: newProduct.description,
      amazonca: newProduct.amazonCa,
      amazoncom: newProduct.amazonCom,
      tiktokurl: newProduct.tiktokUrl,
      image1: filteredImages[0] || null,
      image2: filteredImages[1] || null,
      image3: filteredImages[2] || null,
      image4: filteredImages[3] || null,
      image5: filteredImages[4] || null,
      categories: normalizedCategories.length > 0 ? normalizedCategories : null,
      price_ca: parseFloat(newProduct.priceCa.replace(',', '.')) || 0,
      price_us: parseFloat(newProduct.priceUs.replace(',', '.')) || 0,
    };

    if (editIndex !== null && products[editIndex].id) {
      const { error } = await supabase
        .from('products')
        .update(productToInsert)
        .eq('id', products[editIndex].id);
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
    console.log('Catégories mises à jour:', updatedCategories);
  };

  // Filtrage des produits avec gestion de la traduction des catégories
  const filteredProducts = categoryFilter
    ? products.filter((p) => {
        if (!p.categories) return false;
        // Vérifier si le produit a la catégorie sélectionnée (en tenant compte des traductions)
        return p.categories.some(cat => {
          const translatedCat = translateCategory(cat, language);
          const normalizedFilterCat = normalizeCategory(categoryFilter);
          const normalizedProductCat = normalizeCategory(cat);
          return translatedCat === categoryFilter || normalizedProductCat === normalizedFilterCat;
        });
      })
    : [...products];

  if (sortOrder) {
    filteredProducts.sort((a, b) => {
      const aPrice = parseFloat(a.priceCa.replace(',', '.')) || 0;
      const bPrice = parseFloat(b.priceCa.replace(',', '.')) || 0;
      return sortOrder === 'asc' ? aPrice - bPrice : bPrice - aPrice;
    });
  }

  const requestPassword = () => {
    const tryPwd = prompt(t('adminPassword'));
    if (tryPwd === PASSWORD) {
      setPasswordEntered(true);
      return true;
    } else {
      alert(t('incorrectPassword'));
      return false;
    }
  };

  const handleEdit = (index: number) => {
    const product = products[index];
    setEditIndex(index);
    setShowForm(true);
    
    // Traduire les catégories du produit vers la langue actuelle pour l'édition
    const translatedCategories = Array.isArray(product.categories) 
      ? product.categories.map(cat => translateCategory(cat, language))
      : [];
    
    setNewProduct({
      ...product,
      categories: translatedCategories,
      images: [...product.images, '', '', '', '', ''].slice(0, 5)
    });
    console.log(t('editingProduct'), product.name, 'Catégories:', translatedCategories);
  };

  return (
    <main className="px-4 py-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        
        {/* Sélecteur de langue */}
        <div className="flex items-center gap-2">
          <Globe size={20} className="text-gray-600" />
          <select 
            value={language} 
            onChange={(e) => setLanguage(e.target.value as 'fr' | 'en')}
            className="border border-gray-300 rounded px-3 py-1 bg-white"
          >
            <option value="fr">🇫🇷 Français</option>
            <option value="en">🇺🇸 English</option>
          </select>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <button 
          onClick={() => setCategoryFilter('')} 
          className={`px-3 py-1 rounded ${categoryFilter === '' ? 'bg-blue-600 text-white' : 'bg-gray-300'}`}
        >
          {t('all')}
        </button>
        {availableCategories.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`px-3 py-1 rounded ${categoryFilter === cat ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >{cat}</button>
        ))}
        <button onClick={() => setSortOrder('asc')} className="ml-auto px-3 py-1 bg-green-200 rounded">{t('priceUp')}</button>
        <button onClick={() => setSortOrder('desc')} className="px-3 py-1 bg-red-200 rounded">{t('priceDown')}</button>
      </div>

      {showForm && passwordEntered && (
        <form onSubmit={(e) => { e.preventDefault(); saveProduct(); }} className="bg-white p-6 mb-6 rounded shadow space-y-4">
          <input 
            name="name" 
            value={newProduct.name} 
            onChange={handleInputChange} 
            placeholder={t('name')} 
            className="w-full border p-2 rounded" 
            required 
          />
          <textarea 
            name="description" 
            value={newProduct.description} 
            onChange={handleInputChange} 
            placeholder={t('description')} 
            className="w-full border p-2 rounded h-20 resize-vertical" 
            required 
          />
          <input 
            name="priceCa" 
            value={newProduct.priceCa} 
            onChange={handleInputChange} 
            placeholder={t('priceCad')} 
            className="w-full border p-2 rounded" 
          />
          <input 
            name="priceUs" 
            value={newProduct.priceUs} 
            onChange={handleInputChange} 
            placeholder={t('priceUsd')} 
            className="w-full border p-2 rounded" 
          />
          <input 
            name="amazonCa" 
            value={newProduct.amazonCa} 
            onChange={handleInputChange} 
            placeholder={t('amazonCaLink')} 
            className="w-full border p-2 rounded" 
          />
          <input 
            name="amazonCom" 
            value={newProduct.amazonCom} 
            onChange={handleInputChange} 
            placeholder={t('amazonComLink')} 
            className="w-full border p-2 rounded" 
          />
          <input 
            name="tiktokUrl" 
            value={newProduct.tiktokUrl} 
            onChange={handleInputChange} 
            placeholder={t('tiktokLink')} 
            className="w-full border p-2 rounded" 
          />
          {Array.from({ length: 5 }).map((_, i) => (
            <input
              key={i}
              name="images"
              value={newProduct.images[i] || ''}
              onChange={(e) => handleInputChange(e, i)}
              placeholder={`${language === 'fr' ? 'URL Image' : 'Image URL'} ${i + 1} (ex: https://m.media-amazon.com/images/I/81SB-U4DOlL._AC_SX522_.jpg)`}
              className="w-full border p-2 rounded"
              type="url"
            />
          ))}
          <div>
            <label className="font-semibold">{t('categories')} :</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {availableCategories.map((cat) => (
                <label key={cat} className="text-sm flex items-center bg-gray-50 p-2 rounded">
                  <input
                    type="checkbox"
                    checked={newProduct.categories.includes(cat)}
                    onChange={(e) => handleCategoryToggle(cat, e.target.checked)}
                    className="mr-2"
                  /> 
                  <span>{cat}</span>
                </label>
              ))}
            </div>
            <input
              placeholder={t('addCategory')}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const val = (e.target as HTMLInputElement).value.trim();
                  if (val) {
                    handleAddCategory(val);
                    (e.target as HTMLInputElement).value = '';
                  }
                }
              }}
              className="border p-2 rounded w-full mt-2"
            />
            {newProduct.categories.length > 0 && (
              <div className="mt-2 p-2 bg-blue-50 rounded">
                <small className="text-blue-700">
                  {t('selectedCategories')}: {newProduct.categories.join(', ')}
                </small>
              </div>
            )}
          </div>
          <div className="flex gap-4">
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              {editIndex !== null ? t('modify') : t('add')}
            </button>
            {editIndex !== null && (
              <>
                <button type="button" onClick={resetForm} className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500">
                  {t('cancel')}
                </button>
                <button type="button" onClick={() => deleteProduct(products[editIndex].id)} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
                  {t('delete')}
                </button>
              </>
            )}
          </div>
        </form>
      )}

      <button
        className="mb-6 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded"
        onClick={() => {
          if (!passwordEntered) {
            if (requestPassword()) setShowForm(true);
          } else {
            setShowForm(!showForm);
          }
        }}
      >
        {t('addProduct')}
      </button>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProducts.map((product, i) => (
          <div key={product.id || i} className="bg-white p-3 rounded shadow text-center relative">
            <ProductCard product={product} language={language} />
            <h3 className="font-semibold mb-1 mt-2">{product.name}</h3>
            <p className="text-sm text-gray-500 mb-2">{product.description}</p>
            {product.categories && product.categories.length > 0 && (
              <div className="mb-2">
                {product.categories.map((cat, idx) => (
                  <span key={idx} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mr-1 mb-1">
                    {translateCategory(cat, language)}
                  </span>
                ))}
              </div>
            )}
            <p className="text-sm">
              {t('price')} : {product.priceCa && `CA$ ${product.priceCa}`} 
              {product.priceUs && ` | US$ ${product.priceUs}`}
            </p>
            <div className="flex justify-center gap-2 mb-2 mt-1">
              {product.amazonCa && (
                <Link href={product.amazonCa} target="_blank" rel="noopener noreferrer">
                  <button className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">
                    Amazon.ca
                  </button>
                </Link>
              )}
              {product.amazonCom && (
                <Link href={product.amazonCom} target="_blank" rel="noopener noreferrer">
                  <button className="bg-black text-white px-3 py-1 rounded hover:bg-gray-800">
                    Amazon.com
                  </button>
                </Link>
              )}
            </div>
            {product.tiktokUrl && (
              <Link href={product.tiktokUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-700 underline">
                {t('viewOnTiktok')}
              </Link>
            )}
            {passwordEntered && (
              <button 
                onClick={() => handleEdit(i)}
                className="absolute bottom-2 right-2 text-blue-500 bg-white rounded-full p-1 hover:bg-gray-100"
              >
                <Pencil size={14} />
              </button>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}

function ProductCard({ product, language }: { product: Product; language: 'fr' | 'en' }) {
  const [current, setCurrent] = useState(0);
  const images = Array.isArray(product.images) ? product.images.filter(Boolean) : [];
  const [imageError, setImageError] = useState<{ [key: number]: boolean }>({});

  const noImageText = language === 'fr' ? 'Aucune image' : 'No image';
  const imageNotAvailableText = language === 'fr' ? 'Image non disponible' : 'Image not available';

  if (images.length === 0) {
    return (
      <div className="relative aspect-[4/5] w-full mb-2 bg-gray-200 flex items-center justify-center rounded">
        <span className="text-gray-500">{noImageText}</span>
      </div>
    );
  }

  return (
    <div className="relative aspect-[4/5] w-full mb-2">
      {!imageError[current] ? (
        <Image
          src={images[current]}
          alt={product.name}
          fill
          className="object-contain rounded"
          onError={() => {
            console.log(language === 'fr' ? 'Erreur de chargement image:' : 'Image loading error:', images[current]);
            setImageError({...imageError, [current]: true});
          }}
          unoptimized
          priority={current === 0}
          loader={({ src }) => src}
        />
      ) : (
        <div className="w-full h-full bg-gray-200 flex items-center justify-center rounded">
          <span className="text-gray-500 text-xs">{imageNotAvailableText}</span>
          <div className="absolute bottom-1 left-1 right-1 text-xs text-gray-400 truncate">
            {images[current]}
          </div>
        </div>
      )}
      
      {images.length > 1 && (
        <>
          <button 
            onClick={() => setCurrent((current - 1 + images.length) % images.length)} 
            className="absolute left-1 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-opacity-75"
          >
            ◀
          </button>
          <button 
            onClick={() => setCurrent((current + 1) % images.length)} 
            className="absolute right-1 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-opacity-75"
          >
            ▶
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {images.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full ${
                  index === current ? 'bg-white' : 'bg-white bg-opacity-50'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
