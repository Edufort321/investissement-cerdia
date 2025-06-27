'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { Pencil } from 'lucide-react';

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
const DEFAULT_CATEGORIES = ['Montre', 'Lunette de soleil', 'Sac à dos', 'Article de voyage'];

export default function EcommercePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [passwordEntered, setPasswordEntered] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | ''>('');
  const [availableCategories, setAvailableCategories] = useState(DEFAULT_CATEGORIES);
  const [editIndex, setEditIndex] = useState<number | null>(null);
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

  useEffect(() => {
    fetchProducts();
  }, []);

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
        categories: Array.isArray(p.categories) ? p.categories : [],
        priceCa: p.price_ca?.toString() || '',
        priceUs: p.price_us?.toString() || '',
      }));
      setProducts(cleaned);
    }
  };

  const saveProduct = async () => {
    // Filtrer les images vides
    const filteredImages = newProduct.images.filter(img => img.trim() !== '');
    
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
      categories: newProduct.categories,
      price_ca: parseFloat(newProduct.priceCa.replace(',', '.')) || 0,
      price_us: parseFloat(newProduct.priceUs.replace(',', '.')) || 0,
    };

    if (editIndex !== null && products[editIndex].id) {
      const { error } = await supabase
        .from('products')
        .update(productToInsert)
        .eq('id', products[editIndex].id);
      if (!error) fetchProducts();
    } else {
      const { error } = await supabase.from('products').insert([productToInsert]);
      if (!error) fetchProducts();
    }

    resetForm();
  };

  const deleteProduct = async (id: number | undefined) => {
    if (!passwordEntered || !id) return;
    await supabase.from('products').delete().eq('id', id);
    fetchProducts();
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
      // Assurer qu'il y a assez d'éléments dans le tableau
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
    if (!availableCategories.includes(category)) {
      setAvailableCategories([...availableCategories, category]);
    }
  };

  const filteredProducts = categoryFilter
    ? products.filter((p) => (p.categories || []).includes(categoryFilter))
    : [...products];

  if (sortOrder) {
    filteredProducts.sort((a, b) => {
      const aPrice = parseFloat(a.priceCa.replace(',', '.')) || 0;
      const bPrice = parseFloat(b.priceCa.replace(',', '.')) || 0;
      return sortOrder === 'asc' ? aPrice - bPrice : bPrice - aPrice;
    });
  }

  const requestPassword = () => {
    const tryPwd = prompt('Mot de passe admin :');
    if (tryPwd === PASSWORD) {
      setPasswordEntered(true);
      return true;
    } else {
      alert('Mot de passe incorrect.');
      return false;
    }
  };

  return (
    <main className="px-4 py-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Catalogue CERDIA connecté à Supabase</h1>

      <div className="mb-4 flex flex-wrap gap-2">
        <button onClick={() => setCategoryFilter('')} className="px-3 py-1 rounded bg-gray-300">Tous</button>
        {availableCategories.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`px-3 py-1 rounded ${categoryFilter === cat ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >{cat}</button>
        ))}
        <button onClick={() => setSortOrder('asc')} className="ml-auto px-3 py-1 bg-green-200 rounded">Prix ↑</button>
        <button onClick={() => setSortOrder('desc')} className="px-3 py-1 bg-red-200 rounded">Prix ↓</button>
      </div>

      {showForm && passwordEntered && (
        <form onSubmit={(e) => { e.preventDefault(); saveProduct(); }} className="bg-white p-6 mb-6 rounded shadow space-y-4">
          <input 
            name="name" 
            value={newProduct.name} 
            onChange={handleInputChange} 
            placeholder="Nom" 
            className="w-full border p-2 rounded" 
            required 
          />
          <textarea 
            name="description" 
            value={newProduct.description} 
            onChange={handleInputChange} 
            placeholder="Description" 
            className="w-full border p-2 rounded h-20 resize-vertical" 
            required 
          />
          <input 
            name="priceCa" 
            value={newProduct.priceCa} 
            onChange={handleInputChange} 
            placeholder="Prix CAD" 
            className="w-full border p-2 rounded" 
          />
          <input 
            name="priceUs" 
            value={newProduct.priceUs} 
            onChange={handleInputChange} 
            placeholder="Prix USD" 
            className="w-full border p-2 rounded" 
          />
          <input 
            name="amazonCa" 
            value={newProduct.amazonCa} 
            onChange={handleInputChange} 
            placeholder="Lien Amazon.ca" 
            className="w-full border p-2 rounded" 
          />
          <input 
            name="amazonCom" 
            value={newProduct.amazonCom} 
            onChange={handleInputChange} 
            placeholder="Lien Amazon.com" 
            className="w-full border p-2 rounded" 
          />
          <input 
            name="tiktokUrl" 
            value={newProduct.tiktokUrl} 
            onChange={handleInputChange} 
            placeholder="Lien TikTok" 
            className="w-full border p-2 rounded" 
          />
          {Array.from({ length: 5 }).map((_, i) => (
            <input
              key={i}
              name="images"
              value={newProduct.images[i] || ''}
              onChange={(e) => handleInputChange(e, i)}
              placeholder={`URL Image ${i + 1}`}
              className="w-full border p-2 rounded"
            />
          ))}
          <div>
            <label className="font-semibold">Catégories :</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {availableCategories.map((cat) => (
                <label key={cat} className="text-sm flex items-center">
                  <input
                    type="checkbox"
                    checked={newProduct.categories.includes(cat)}
                    onChange={(e) => {
                      const updated = e.target.checked
                        ? [...newProduct.categories, cat]
                        : newProduct.categories.filter((c) => c !== cat);
                      setNewProduct({ ...newProduct, categories: updated });
                    }}
                    className="mr-1"
                  /> {cat}
                </label>
              ))}
            </div>
            <input
              placeholder="Ajouter une catégorie"
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
          </div>
          <div className="flex gap-4">
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              {editIndex !== null ? 'Modifier' : 'Ajouter'}
            </button>
            {editIndex !== null && (
              <>
                <button type="button" onClick={resetForm} className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500">
                  Annuler
                </button>
                <button type="button" onClick={() => deleteProduct(products[editIndex].id)} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">
                  Supprimer
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
        ➕ Ajouter un produit affilié
      </button>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProducts.map((product, i) => (
          <div key={product.id || i} className="bg-white p-3 rounded shadow text-center relative">
            <ProductCard product={product} />
            <h3 className="font-semibold mb-1 mt-2">{product.name}</h3>
            <p className="text-sm text-gray-500 mb-2">{product.description}</p>
            <p className="text-sm">
              Prix : {product.priceCa && `CA$ ${product.priceCa}`} 
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
                Voir sur TikTok
              </Link>
            )}
            {passwordEntered && (
              <button 
                onClick={() => { 
                  setEditIndex(i); 
                  setShowForm(true); 
                  setNewProduct({
                    ...product,
                    images: [...product.images, '', '', '', '', ''].slice(0, 5) // Assurer 5 slots pour l'édition
                  }); 
                }} 
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

function ProductCard({ product }: { product: Product }) {
  const [current, setCurrent] = useState(0);
  const images = Array.isArray(product.images) ? product.images.filter(Boolean) : [];
  const [imageError, setImageError] = useState<{ [key: number]: boolean }>({});

  // Si aucune image valide, afficher un placeholder
  if (images.length === 0) {
    return (
      <div className="relative aspect-[4/5] w-full mb-2 bg-gray-200 flex items-center justify-center rounded">
        <span className="text-gray-500">Aucune image</span>
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
            console.log('Erreur de chargement image:', images[current]);
            setImageError({...imageError, [current]: true});
          }}
          unoptimized
          priority={current === 0}
        />
      ) : (
        <div className="w-full h-full bg-gray-200 flex items-center justify-center rounded">
          <span className="text-gray-500 text-xs">Image non disponible</span>
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
