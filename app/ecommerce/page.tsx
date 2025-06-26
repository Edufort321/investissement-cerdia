"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

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

const DEFAULT_CATEGORIES = [
  { key: "montre", labelFr: "Montres", labelEn: "Watches" },
  { key: "lunette", labelFr: "Lunettes de soleil", labelEn: "Sunglasses" },
  { key: "sac", labelFr: "Sacs à dos", labelEn: "Backpacks" },
  { key: "voyage", labelFr: "Articles de voyage", labelEn: "Travel Gear" },
];

export default function EcommercePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [passwordEntered, setPasswordEntered] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);
  const [language, setLanguage] = useState<"fr" | "en">("fr");
  const [customCategory, setCustomCategory] = useState("");
  const [newProduct, setNewProduct] = useState<Product>({
    name: "",
    amazonCa: "",
    amazonCom: "",
    tiktokUrl: "",
    description: "",
    images: [""],
    categories: [],
  });

  const texts = {
    fr: {
      title: "Affiliation Amazon & SiteStripe",
      addButton: "Ajouter un produit affilié",
      enterPassword: "Mot de passe admin",
      wrongPassword: "Mot de passe incorrect",
      add: "Ajouter",
      amazonCa: "Amazon.ca",
      amazonCom: "Amazon.com",
      viewOnTikTok: "Voir sur TikTok",
      name: "Nom du produit",
      desc: "Description (max 100 caractères)",
      image: "Image",
      addCategory: "Ajouter une catégorie",
      delete: "✖",
    },
    en: {
      title: "Amazon & SiteStripe Affiliate",
      addButton: "Add affiliate product",
      enterPassword: "Admin password",
      wrongPassword: "Incorrect password",
      add: "Add",
      amazonCa: "Amazon.ca",
      amazonCom: "Amazon.com",
      viewOnTikTok: "View on TikTok",
      name: "Product name",
      desc: "Description (max 100 characters)",
      image: "Image",
      addCategory: "Add a category",
      delete: "✖",
    },
  }[language];

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    index?: number
  ) => {
    const { name, value } = e.target;
    if (name === "images" && index !== undefined) {
      const updatedImages = [...newProduct.images];
      updatedImages[index] = value;
      setNewProduct({ ...newProduct, images: updatedImages });
    } else if (name === "categories") {
      const selected = Array.from(
        (e.target as HTMLSelectElement).selectedOptions
      ).map((o) => o.value);
      setNewProduct({ ...newProduct, categories: selected });
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
    const updated = [...products];
    updated.splice(index, 1);
    setProducts(updated);
  };

  const filteredProducts = selectedFilter
    ? products.filter((p) => p.categories.includes(selectedFilter))
    : products;

  const filteredImages = (images: string[]) => images.filter((img) => img);

  return (
    <main className="px-6 py-12 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">{texts.title}</h1>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as "fr" | "en")}
          className="border px-2 py-1 rounded"
        >
          <option value="fr">FR</option>
          <option value="en">EN</option>
        </select>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setSelectedFilter(null)}
          className={`px-3 py-1 rounded border ${
            selectedFilter === null ? "bg-blue-600 text-white" : ""
          }`}
        >
          All
        </button>
        {DEFAULT_CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setSelectedFilter(cat.key)}
            className={`px-3 py-1 rounded border ${
              selectedFilter === cat.key ? "bg-blue-600 text-white" : ""
            }`}
          >
            {language === "fr" ? cat.labelFr : cat.labelEn}
          </button>
        ))}
      </div>

      <button
        className="mb-6 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded"
        onClick={() => {
          if (!passwordEntered) {
            const input = prompt(texts.enterPassword);
            if (input === PASSWORD) setPasswordEntered(true);
            else alert(texts.wrongPassword);
          } else {
            setShowForm(!showForm);
          }
        }}
      >
        ➕ {texts.addButton}
      </button>

      {showForm && (
        <form
          onSubmit={handleAddProduct}
          className="bg-white p-6 mb-12 rounded shadow-md space-y-4"
        >
          <input
            name="name"
            value={newProduct.name}
            onChange={handleInputChange}
            placeholder={texts.name}
            className="w-full border p-2 rounded"
            required
          />
          <input
            name="description"
            value={newProduct.description}
            onChange={handleInputChange}
            placeholder={texts.desc}
            maxLength={100}
            className="w-full border p-2 rounded"
            required
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
              value={newProduct.images[i] || ""}
              onChange={(e) => handleInputChange(e, i)}
              placeholder={`${texts.image} ${i + 1}`}
              className="w-full border p-2 rounded"
            />
          ))}

          <select
            name="categories"
            multiple
            value={newProduct.categories}
            onChange={handleInputChange}
            className="w-full border p-2 rounded"
          >
            {DEFAULT_CATEGORIES.map((cat) => (
              <option key={cat.key} value={cat.key}>
                {language === "fr" ? cat.labelFr : cat.labelEn}
              </option>
            ))}
          </select>

          <input
            value={customCategory}
            onChange={(e) => setCustomCategory(e.target.value)}
            placeholder={texts.addCategory}
            className="w-full border p-2 rounded"
          />
          <button
            type="button"
            onClick={() => {
              if (customCategory) {
                setNewProduct({
                  ...newProduct,
                  categories: [...newProduct.categories, customCategory],
                });
                setCustomCategory("");
              }
            }}
            className="text-sm underline text-blue-600"
          >
            {texts.addCategory}
          </button>

          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
          >
            {texts.add}
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {filteredProducts.map((product, i) => (
          <div
            key={i}
            className="bg-white p-4 rounded shadow text-center relative"
          >
            {filteredImages(product.images).length > 0 && (
              <ProductCard product={product} />
            )}
            <h3 className="font-semibold mb-1 mt-2">{product.name}</h3>
            <p className="text-sm text-gray-500 mb-2">
              {product.description}
            </p>
            <div className="flex justify-center gap-2 mb-2">
              {product.amazonCa && (
                <Link href={product.amazonCa} target="_blank">
                  <button className="bg-blue-600 text-white px-3 py-1 rounded">
                    {texts.amazonCa}
                  </button>
                </Link>
              )}
              {product.amazonCom && (
                <Link href={product.amazonCom} target="_blank">
                  <button className="bg-black text-white px-3 py-1 rounded">
                    {texts.amazonCom}
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
                {texts.viewOnTikTok}
              </Link>
            )}
            {passwordEntered && (
              <button
                onClick={() => handleDeleteProduct(i)}
                className="absolute top-2 right-2 text-red-500"
              >
                {texts.delete}
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
            onClick={() =>
              setCurrent((current - 1 + images.length) % images.length)
            }
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
