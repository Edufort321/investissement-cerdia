'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface Product {
  name: string;
  amazonCa: string;
  amazonCom: string;
  tiktokUrl: string;
  description: string;
  images: string[];
}

const PASSWORD = '321MdlTamara!$';

export default function EcommercePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [passwordEntered, setPasswordEntered] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [newProduct, setNewProduct] = useState<Product>({
    name: '',
    amazonCa: '',
    amazonCom: '',
    tiktokUrl: '',
    description: '',
    images: [''],
  });

  // 🔄 Charger du localStorage au démarrage
  useEffect(() => {
    const saved = localStorage.getItem('affiliatedProducts');
    if (saved) {
      setProducts(JSON.parse(saved));
    }
  }, []);

  // 💾 Sauvegarder dans localStorage à chaque changement
  useEffect(() => {
    localStorage.setItem('affiliatedProducts', JSON.stringify(products));
  }, [products]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    index?: number
  ) => {
    const { name, value } = e.target;
    if (name === 'images' && index !== undefined) {
      const updated = [...newProduct.images];
      updated[index] = value;
      setNewProduct({ ...newProduct, images: updated });
    } else {
      setNewProduct({ ...newProduct, [name]: value });
    }
  };

  const handleAddOrUpdateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedList = [...products];
    if (editingIndex !== null) {
      updatedList[editingIndex] = newProduct;
    } else {
      updatedList.push(newProduct);
    }
    setProducts(updatedList);
    setNewProduct({
      name: '',
      amazonCa: '',
      amazonCom: '',
      tiktokUrl: '',
      description: '',
      images: [''],
    });
    setEditingIndex(null);
    setShowForm(false);
  };

  const handleDeleteProduct = (index: number) => {
    const updated = [...products];
    updated.splice(index, 1);
    setProducts(updated);
  };

  const filteredImages = (images: string[]) => images.filter((img) => img);

  return (
    <main className="px-6 py-12 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Affiliation Amazon & SiteStripe</h1>

      {!passwordEntered ? (
        <div className="mb-6">
          <input
            type="password"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            placeholder="Mot de passe admin"
            className="border px-4 py-2 rounded mr-2"
          />
          <button
            onClick={() => {
              if (passwordInput === PASSWORD) setPasswordEntered(true);
              else alert('Mot de passe incorrect');
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            Entrer
          </button>
        </div>
      ) : (
        <>
          <button
            className="mb-6 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded"
            onClick={() => {
              setNewProduct({
                name: '',
                amazonCa: '',
                amazonCom: '',
                tiktokUrl: '',
                description: '',
                images: [''],
              });
              setEditingIndex(null);
              setShowForm(true);
            }}
          >
            ➕ {editingIndex !== null ? 'Modifier' : 'Ajouter'} un produit affilié
          </button>

          <button
            className="mb-6 ml-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded"
            onClick={() => {
              if (confirm('Supprimer tous les produits? Cette action est irréversible.')) {
                localStorage.removeItem('affiliatedProducts');
                setProducts([]);
              }
            }}
          >
            🗑️ Réinitialiser les produits
          </button>

          {showForm && (
            <form
              onSubmit={handleAddOrUpdateProduct}
              className="bg-white p-6 mb-12 rounded shadow-md space-y-4"
            >
              <input
                name="name"
                value={newProduct.name}
                onChange={handleInputChange}
                placeholder="Nom"
                className="w-full border p-2 rounded"
                required
              />
              <input
                name="description"
                value={newProduct.description}
                onChange={handleInputChange}
                placeholder="Description (max 100 caractères)"
                maxLength={100}
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
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
              >
                {editingIndex !== null ? 'Mettre à jour' : 'Ajouter'}
              </button>
            </form>
          )}
        </>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {products.map((product, i) => (
          <div
            key={i}
            className="bg-white p-4 rounded shadow text-center relative"
          >
            {filteredImages(product.images).length > 0 && (
              <ProductCard product={product} />
            )}
            <h3 className="font-semibold mb-1 mt-2">{product.name}</h3>
            <p className="text-sm text-gray-500 mb-2">{product.description}</p>
            <div className="flex justify-center gap-2 mb-2">
              {product.amazonCa && (
                <Link href={product.amazonCa} target="_blank">
                  <button className="bg-blue-600 text-white px-3 py-1 rounded">
                    Amazon.ca
                  </button>
                </Link>
              )}
              {product.amazonCom && (
                <Link href={product.amazonCom} target="_blank">
                  <button className="bg-black text-white px-3 py-1 rounded">
                    Amazon.com
                  </button>
                </Link>
              )}
            </div>
            {product.tiktokUrl && (
              <Link
                href={product.tiktokUrl}
                target="_blank"
                className="text-sm text-blue-700 underline"
              >
                Voir sur TikTok
              </Link>
            )}
            {passwordEntered && (
              <div className="absolute top-2 right-2 flex gap-2">
                <button
                  onClick={() => {
                    setNewProduct(product);
                    setEditingIndex(i);
                    setShowForm(true);
                  }}
                  className="text-blue-500"
                >
                  ✎
                </button>
                <button
                  onClick={() => handleDeleteProduct(i)}
                  className="text-red-500"
                >
                  ✖
                </button>
              </div>
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
          <Image
            src={images[current]}
            alt={product.name}
            fill
            className="object-contain rounded"
          />
          <button
            onClick={() => setCurrent((current - 1 + images.length) % images.length)}
            className="absolute left-0 top-1/2 -translate-y-1/2 px-2"
          >
            ◀
          </button>
          <button
            onClick={() => setCurrent((current + 1) % images.length)}
            className="absolute right-0 top-1/2 -translate-y-1/2 px-2"
          >
            ▶
          </button>
        </>
      )}
    </div>
  );
}
