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
        images: Array.isArray(p.imageurls) ? p.imageurls : typeof p.imageurls === 'string' ? [p.imageurls] : [],
        categories: Array.isArray(p.categories) ? p.categories : [],
        priceCa: p.price_ca?.toString() || '',
        priceUs: p.price_us?.toString() || '',
      }));
      setProducts(cleaned);
    }
  };

  const saveProduct = async () => {
    const productToInsert = {
      name: newProduct.name,
      description: newProduct.description,
      amazonca: newProduct.amazonCa,
      amazoncom: newProduct.amazonCom,
      tiktokurl: newProduct.tiktokUrl,
      imageurls: newProduct.images,
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, index?: number) => {
    const { name, value } = e.target;
    if (name === 'images' && index !== undefined) {
      const updatedImages = [...newProduct.images];
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
      const aPrice = parseFloat(a.priceCa.replace(',', '.'));
      const bPrice = parseFloat(b.priceCa.replace(',', '.'));
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
          <input name="name" value={newProduct.name} onChange={handleInputChange} placeholder="Nom" className="w-full border p-2 rounded" required />
          <input name="description" value={newProduct.description} onChange={handleInputChange} placeholder="Description" className="w-full border p-2 rounded" required />
          <input name="priceCa" value={newProduct.priceCa} onChange={handleInputChange} placeholder="Prix CAD" className="w-full border p-2 rounded" />
          <input name="priceUs" value={newProduct.priceUs} onChange={handleInputChange} placeholder="Prix USD" className="w-full border p-2 rounded" />
          <input name="amazonCa" value={newProduct.amazonCa} onChange={handleInputChange} placeholder="Lien Amazon.ca" className="w-full border p-2 rounded" />
          <input name="amazonCom" value={newProduct.amazonCom} onChange={handleInputChange} placeholder="Lien Amazon.com" className="w-full border p-2 rounded" />
          <input name="tiktokUrl" value={newProduct.tiktokUrl} onChange={handleInputChange} placeholder="Lien TikTok" className="w-full border p-2 rounded" />
          {Array.from({ length: 10 }).map((_, i) => (
            <input
              key={i}
              name="images"
              value={newProduct.images[i] || ''}
              onChange={(e) => handleInputChange(e, i)}
              placeholder={`Image ${i + 1}`}
              className="w-full border p-2 rounded"
            />
          ))}
          <div>
            <label className="font-semibold">Catégories :</label>
            <div className="flex flex-wrap gap-2">
              {availableCategories.map((cat) => (
                <label key={cat} className="text-sm">
                  <input
                    type="checkbox"
                    checked={newProduct.categories.includes(cat)}
                    onChange={(e) => {
                      const updated = e.target.checked
                        ? [...newProduct.categories, cat]
                        : newProduct.categories.filter((c) => c !== cat);
                      setNewProduct({ ...newProduct, categories: updated });
                    }}
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
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">{editIndex !== null ? 'Modifier' : 'Ajouter'}</button>
            {editIndex !== null && (
              <>
                <button type="button" onClick={resetForm} className="px-4 py-2 bg-gray-400 text-white rounded">Annuler</button>
                <button type="button" onClick={() => deleteProduct(products[editIndex].id)} className="px-4 py-2 bg-red-600 text-white rounded">Supprimer</button>
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
          <div key={product.id} className="bg-white p-3 rounded shadow text-center relative">
            <ProductCard product={product} />
            <h3 className="font-semibold mb-1 mt-2">{product.name}</h3>
            <p className="text-sm text-gray-500 mb-2">{product.description}</p>
            <p className="text-sm">Prix : {product.priceCa && `CA$ ${product.priceCa}`} {product.priceUs && ` | US$ ${product.priceUs}`}</p>
            <div className="flex justify-center gap-2 mb-2 mt-1">
              {product.amazonCa && (
                <Link href={product.amazonCa} target="_blank"><button className="bg-blue-600 text-white px-3 py-1 rounded">Amazon.ca</button></Link>
              )}
              {product.amazonCom && (
                <Link href={product.amazonCom} target="_blank"><button className="bg-black text-white px-3 py-1 rounded">Amazon.com</button></Link>
              )}
            </div>
            {product.tiktokUrl && (
              <Link href={product.tiktokUrl} target="_blank" className="text-sm text-blue-700 underline">Voir sur TikTok</Link>
            )}
            {passwordEntered && (
              <button onClick={() => { setEditIndex(i); setShowForm(true); setNewProduct(product); }} className="absolute bottom-2 right-2 text-blue-500 bg-white rounded-full p-1">
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

  return (
    <div className="relative aspect-[4/5] w-full mb-2">
      {images.length > 0 && (
        <>
          <Image
            src={images[current]}
            alt={product.name}
            fill
            className="object-contain rounded"
          />
          <button onClick={() => setCurrent((current - 1 + images.length) % images.length)} className="absolute left-0 top-1/2 -translate-y-1/2 px-2">◀</button>
          <button onClick={() => setCurrent((current + 1) % images.length)} className="absolute right-0 top-1/2 -translate-y-1/2 px-2">▶</button>
        </>
      )}
    </div>
  );
}
