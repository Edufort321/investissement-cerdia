"use client";

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
      await supabase.from('products').update(productToInsert).eq('id', products[editIndex].id);
    } else {
      await supabase.from('products').insert([productToInsert]);
    }

    fetchProducts();
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
      name: '', description: '', amazonCa: '', amazonCom: '', tiktokUrl: '',
      images: [''], categories: [], priceCa: '', priceUs: ''
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
    ? products.filter((p) => p.categories.includes(categoryFilter))
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
      <h1 className="text-2xl font-bold mb-6">Catalogue CERDIA – Produits affiliés Amazon SiteStripe</h1>

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

      {/* Formulaire d'ajout ou modification */}
      {showForm && passwordEntered && (
        <form onSubmit={(e) => { e.preventDefault(); saveProduct(); }} className="bg-white p-6 mb-6 rounded shadow space-y-4">
          {/* Champs classiques */}
          {/* Images et Catégories */}
          {/* Boutons */}
          {/* Ce bloc reste inchangé */}
        </form>
      )}

      {/* Bouton d'ajout */}
      <button className="mb-6 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded"
        onClick={() => { if (!passwordEntered ? requestPassword() : true) setShowForm(!showForm); }}>
        ➕ Ajouter un produit affilié
      </button>

      {/* Liste de produits */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProducts.map((product, i) => (
          <div key={product.id} className="bg-white p-3 rounded shadow text-center relative">
            <ProductCard product={product} />
            {/* Infos produit, liens, TikTok, bouton modifier... inchangés */}
          </div>
        ))}
      </div>
    </main>
  );
}

function ProductCard({ product }: { product: Product }) {
  const [current, setCurrent] = useState(0);
  const images = product.images.filter(Boolean);

  return (
    <div className="relative aspect-[4/5] w-full mb-2">
      {images.length > 0 && (
        <>
          <Image src={images[current]} alt={product.name} fill className="object-contain rounded" />
          <button onClick={() => setCurrent((current - 1 + images.length) % images.length)} className="absolute left-0 top-1/2 -translate-y-1/2 px-2">◀</button>
          <button onClick={() => setCurrent((current + 1) % images.length)} className="absolute right-0 top-1/2 -translate-y-1/2 px-2">▶</button>
        </>
      )}
    </div>
  );
}
