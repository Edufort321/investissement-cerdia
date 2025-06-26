// Revised and secured version of the catalogue code
'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Pencil } from 'lucide-react';

interface Product {
  name: string;
  description: string;
  amazonCa: string;
  amazonCom: string;
  tiktokUrl: string;
  images: string[];
  categories: string[];
}

const PASSWORD = '321MdlTamara!$';
const DEFAULT_CATEGORIES = ['Montre', 'Lunette de soleil', 'Sac à dos', 'Article de voyage'];

export default function EcommercePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [passwordEntered, setPasswordEntered] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('');
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
  });

  useEffect(() => {
    const stored = localStorage.getItem('products');
    if (stored) setProducts(JSON.parse(stored));
  }, []);

  const saveProducts = (updated: Product[]) => {
    setProducts(updated);
    localStorage.setItem('products', JSON.stringify(updated));
  };

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

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = [...products];
    if (editIndex !== null) {
      updated[editIndex] = newProduct;
    } else {
      updated.push(newProduct);
    }
    saveProducts(updated);
    setEditIndex(null);
    setNewProduct({
      name: '', description: '', amazonCa: '', amazonCom: '',
      tiktokUrl: '', images: [''], categories: []
    });
    setShowForm(false);
  };

  const handleDeleteProduct = (index: number) => {
    if (!passwordEntered && !requestPassword()) return;
    const updated = [...products];
    updated.splice(index, 1);
    saveProducts(updated);
    setShowForm(false);
    setEditIndex(null);
  };

  const filteredProducts = categoryFilter
    ? products.filter((p) => p.categories.includes(categoryFilter))
    : products;

  return (
    <main className="px-4 py-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Catalogue CERDIA et coups de cœur Amazon SiteStripe</h1>

      <div className="mb-4 flex flex-wrap gap-2">
        <button onClick={() => setCategoryFilter('')} className="px-3 py-1 rounded bg-gray-300">Tous</button>
        {availableCategories.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`px-3 py-1 rounded ${categoryFilter === cat ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >{cat}</button>
        ))}
      </div>

      {showForm && passwordEntered && (
        <form onSubmit={handleAddProduct} className="bg-white p-6 mb-6 rounded shadow space-y-4">
          <input name="name" value={newProduct.name} onChange={handleInputChange} placeholder="Nom" className="w-full border p-2 rounded" required />
          <input name="description" value={newProduct.description} onChange={handleInputChange} placeholder="Description" maxLength={100} className="w-full border p-2 rounded" required />
          <input name="amazonCa" value={newProduct.amazonCa} onChange={handleInputChange} placeholder="Lien Amazon.ca" className="w-full border p-2 rounded" />
          <input name="amazonCom" value={newProduct.amazonCom} onChange={handleInputChange} placeholder="Lien Amazon.com" className="w-full border p-2 rounded" />
          <input name="tiktokUrl" value={newProduct.tiktokUrl} onChange={handleInputChange} placeholder="Lien TikTok" className="w-full border p-2 rounded" />

          {Array.from({ length: 10 }).map((_, i) => (
            <input key={i} name="images" value={newProduct.images[i] || ''} onChange={(e) => handleInputChange(e, i)} placeholder={`Image ${i + 1}`} className="w-full border p-2 rounded" />
          ))}

          <div>
            <label className="font-semibold">Catégories :</label>
            <div className="flex flex-wrap gap-2">
              {availableCategories.map((cat) => (
                <label key={cat} className="text-sm">
                  <input type="checkbox" checked={newProduct.categories.includes(cat)} onChange={(e) => {
                    const updated = e.target.checked
                      ? [...newProduct.categories, cat]
                      : newProduct.categories.filter((c) => c !== cat);
                    setNewProduct({ ...newProduct, categories: updated });
                  }} /> {cat}
                </label>
              ))}
            </div>
            <input placeholder="Ajouter une nouvelle catégorie" onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                const val = (e.target as HTMLInputElement).value.trim();
                if (val) {
                  handleAddCategory(val);
                  (e.target as HTMLInputElement).value = '';
                }
              }
            }} className="border p-2 rounded w-full mt-2" />
          </div>

          <div className="flex gap-4">
            <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded">{editIndex !== null ? 'Modifier' : 'Ajouter'}</button>
            {editIndex !== null && (
              <>
                <button type="button" onClick={() => { setShowForm(false); setEditIndex(null); }} className="px-4 py-2 bg-gray-400 text-white rounded">Annuler</button>
                <button type="button" onClick={() => handleDeleteProduct(editIndex)} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded">Supprimer</button>
              </>
            )}
          </div>
        </form>
      )}

      <button className="mb-6 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded" onClick={() => {
        if (!passwordEntered) requestPassword() && setShowForm(true);
        else setShowForm(!showForm);
      }}>➕ Ajouter un produit affilié</button>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProducts.map((product, i) => (
          <div key={i} className="bg-white p-3 rounded shadow text-center relative">
            <ProductCard product={product} />
            <h3 className="font-semibold mb-1 mt-2">{product.name}</h3>
            <p className="text-sm text-gray-500 mb-2">{product.description}</p>
            <div className="flex justify-center gap-2 mb-2">
              {product.amazonCa && <Link href={product.amazonCa} target="_blank"><button className="bg-blue-600 text-white px-3 py-1 rounded">Amazon.ca</button></Link>}
              {product.amazonCom && <Link href={product.amazonCom} target="_blank"><button className="bg-black text-white px-3 py-1 rounded">Amazon.com</button></Link>}
            </div>
            {product.tiktokUrl && <Link href={product.tiktokUrl} target="_blank" className="text-sm text-blue-700 underline">Voir sur TikTok</Link>}
            {passwordEntered && (
              <button onClick={() => { setEditIndex(i); setNewProduct(product); setShowForm(true); }} className="absolute bottom-2 right-2 text-blue-500 bg-white rounded-full p-1"><Pencil size={14} /></button>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}

function ProductCard({ product }: { product: Product }) {
  const [current, setCurrent] = useState(0);
  const images = product.images.filter((img) => img);

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
