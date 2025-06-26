"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

type Lang = "fr" | "en";

interface Product {
  name: string;
  amazonCa: string;
  amazonCom: string;
  tiktokUrl: string;
  description: string;
  images: string[];
  categories: string[];
}

const PASSWORD = "321MdlTamara!$";
const STORAGE_KEY = "cerdia_products";
const defaultCategories = [
  "Montres",
  "Lunettes de soleil",
  "Sacs à dos",
  "Articles de voyage",
];

export default function EcommercePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [passwordEntered, setPasswordEntered] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [newProduct, setNewProduct] = useState<Product>({
    name: "",
    amazonCa: "",
    amazonCom: "",
    tiktokUrl: "",
    description: "",
    images: [""],
    categories: [],
  });
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState("");
  const [lang, setLang] = useState<Lang>("fr");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setProducts(JSON.parse(stored));
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
  }, [products]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    index?: number
  ) => {
    const { name, value } = e.target;
    if (name === "images" && index !== undefined) {
      const updatedImages = [...newProduct.images];
      updatedImages[index] = value;
      setNewProduct({ ...newProduct, images: updatedImages });
    } else {
      setNewProduct({ ...newProduct, [name]: value });
    }
  };

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    setProducts([...products, newProduct]);
    setNewProduct({
      name: "",
      amazonCa: "",
      amazonCom: "",
      tiktokUrl: "",
      description: "",
      images: [""],
      categories: [],
    });
    setShowForm(false);
  };

  const handleDeleteProduct = (index: number) => {
    if (!passwordEntered) return;
    const updated = [...products];
    updated.splice(index, 1);
    setProducts(updated);
  };

  const filteredProducts = selectedCategory
    ? products.filter((p) => p.categories.includes(selectedCategory))
    : products;

  const allCategories = Array.from(
    new Set([...defaultCategories, ...products.flatMap((p) => p.categories)])
  );

  return (
    <main className="px-6 py-12 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">
          {lang === "fr"
            ? "Catalogue CERDIA et coups de cœur Amazon SiteStripe"
            : "CERDIA Catalog & Amazon SiteStripe Favorites"}
        </h1>
        <button
          onClick={() => setLang(lang === "fr" ? "en" : "fr")}
          className="px-4 py-2 text-sm rounded border"
        >
          {lang === "fr" ? "ENGLISH" : "FRANÇAIS"}
        </button>
      </div>

      <div className="mb-4 space-x-2">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`px-3 py-1 rounded ${
            !selectedCategory ? "bg-blue-600 text-white" : "bg-gray-200"
          }`}
        >
          {lang === "fr" ? "Tous" : "All"}
        </button>
        {allCategories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1 rounded ${
              selectedCategory === cat ? "bg-blue-600 text-white" : "bg-gray-200"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <button
        className="mb-6 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded"
        onClick={() => {
          if (!passwordEntered) {
            const input = prompt("Mot de passe / Password");
            if (input === PASSWORD) setPasswordEntered(true);
            else return alert("Mot de passe incorrect");
          }
          setShowForm(!showForm);
        }}
      >
        ➕ {lang === "fr" ? "Ajouter un produit affilié" : "Add a product"}
      </button>

      {showForm && (
        <form
          onSubmit={handleAddProduct}
          className="bg-white p-6 mb-12 rounded shadow-md space-y-4"
        >
          <input name="name" value={newProduct.name} onChange={handleInputChange} placeholder="Nom" className="w-full border p-2 rounded" required />
          <input name="description" value={newProduct.description} onChange={handleInputChange} placeholder="Description" maxLength={100} className="w-full border p-2 rounded" required />
          <input name="amazonCa" value={newProduct.amazonCa} onChange={handleInputChange} placeholder="Lien Amazon.ca" className="w-full border p-2 rounded" />
          <input name="amazonCom" value={newProduct.amazonCom} onChange={handleInputChange} placeholder="Lien Amazon.com" className="w-full border p-2 rounded" />
          <input name="tiktokUrl" value={newProduct.tiktokUrl} onChange={handleInputChange} placeholder="Lien TikTok" className="w-full border p-2 rounded" />

          {newProduct.images.map((img, i) => (
            <input
              key={i}
              name="images"
              value={img}
              onChange={(e) => handleInputChange(e, i)}
              placeholder={`Image ${i + 1}`}
              className="w-full border p-2 rounded"
            />
          ))}

          <button
            type="button"
            onClick={() =>
              setNewProduct({ ...newProduct, images: [...newProduct.images, ""] })
            }
            className="text-sm text-blue-600 underline"
          >
            ➕ {lang === "fr" ? "Ajouter une image" : "Add image"}
          </button>

          <div>
            <label className="block mb-1 font-medium">
              {lang === "fr" ? "Catégories" : "Categories"}
            </label>
            {allCategories.map((cat) => (
              <label key={cat} className="inline-flex items-center mr-4">
                <input
                  type="checkbox"
                  checked={newProduct.categories.includes(cat)}
                  onChange={() => {
                    const checked = newProduct.categories.includes(cat);
                    const updated = checked
                      ? newProduct.categories.filter((c) => c !== cat)
                      : [...newProduct.categories, cat];
                    setNewProduct({ ...newProduct, categories: updated });
                  }}
                />
                <span className="ml-2">{cat}</span>
              </label>
            ))}
            <div className="mt-2">
              <input
                type="text"
                placeholder="Nouvelle catégorie"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="border p-2 rounded mr-2"
              />
              <button
                type="button"
                onClick={() => {
                  if (newCategory && !newProduct.categories.includes(newCategory)) {
                    setNewProduct({
                      ...newProduct,
                      categories: [...newProduct.categories, newCategory],
                    });
                    setNewCategory("");
                  }
                }}
                className="text-sm bg-gray-200 px-3 py-1 rounded"
              >
                {lang === "fr" ? "Ajouter" : "Add"}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
          >
            {lang === "fr" ? "Ajouter le produit" : "Add product"}
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {filteredProducts.map((product, i) => (
          <div key={i} className="bg-white p-4 rounded shadow text-center relative">
            <ProductCard product={product} />
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
                {lang === "fr" ? "Voir sur TikTok" : "View on TikTok"}
              </Link>
            )}
            {passwordEntered && (
              <button
                onClick={() => handleDeleteProduct(i)}
                className="absolute top-2 right-2 text-red-500"
              >
                ✖
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
