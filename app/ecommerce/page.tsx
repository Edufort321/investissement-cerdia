'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'

interface Product {
  name: string
  amazonCa: string
  amazonCom: string
  tiktokUrl: string
  description: string
  images: string[]
}

const initialProducts: Product[] = []

export default function EcommercePage() {
  const [products, setProducts] = useState<Product[]>(initialProducts)
  const [showForm, setShowForm] = useState(false)
  const [newProduct, setNewProduct] = useState<Product>({
    name: '',
    amazonCa: '',
    amazonCom: '',
    tiktokUrl: '',
    description: '',
    images: Array(10).fill('')
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, index?: number) => {
    const { name, value } = e.target
    if (name === 'images' && index !== undefined) {
      const updatedImages = [...newProduct.images]
      updatedImages[index] = value
      setNewProduct({ ...newProduct, images: updatedImages })
    } else {
      setNewProduct({ ...newProduct, [name]: value })
    }
  }

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault()
    setProducts([...products, newProduct])
    setNewProduct({
      name: '',
      amazonCa: '',
      amazonCom: '',
      tiktokUrl: '',
      description: '',
      images: Array(10).fill('')
    })
    setShowForm(false)
  }

  return (
    <main className="px-6 py-12 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Affiliation Amazon & SiteStripe</h1>

      <button
        className="mb-6 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded"
        onClick={() => setShowForm(!showForm)}
      >
        ➕ Ajouter un produit affilié
      </button>

      {showForm && (
        <form onSubmit={handleAddProduct} className="bg-white p-6 mb-12 rounded shadow-md space-y-4">
          <input
            name="name"
            value={newProduct.name}
            onChange={handleInputChange}
            placeholder="Nom du produit"
            className="w-full border p-2 rounded"
            required
          />
          <input
            name="amazonCa"
            value={newProduct.amazonCa}
            onChange={handleInputChange}
            placeholder="Lien Amazon.ca (optionnel)"
            className="w-full border p-2 rounded"
          />
          <input
            name="amazonCom"
            value={newProduct.amazonCom}
            onChange={handleInputChange}
            placeholder="Lien Amazon.com (optionnel)"
            className="w-full border p-2 rounded"
          />
          <input
            name="tiktokUrl"
            value={newProduct.tiktokUrl}
            onChange={handleInputChange}
            placeholder="Lien TikTok (optionnel)"
            className="w-full border p-2 rounded"
          />
          <input
            name="description"
            value={newProduct.description}
            onChange={handleInputChange}
            placeholder="Description (max 100 caractères)"
            maxLength={100}
            className="w-full border p-2 rounded"
          />
          {Array.from({ length: 10 }).map((_, i) => (
            <input
              key={i}
              name="images"
              value={newProduct.images[i] || ''}
              onChange={(e) => handleInputChange(e, i)}
              placeholder={`Lien image ${i + 1}`}
              className="w-full border p-2 rounded"
            />
          ))}

          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
          >
            ➕ Ajouter ce produit
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {products.map((product, i) => (
          <ProductCard key={i} product={product} />
        ))}
      </div>
    </main>
  )
}

function ProductCard({ product }: { product: Product }) {
  const [current, setCurrent] = useState(0)
  const images = product.images.filter(img => img)

  return (
    <div className="bg-white p-4 rounded shadow text-center">
      <div className="relative aspect-[4/5] w-full mb-2">
        <Image
          src={images[current] || '/placeholder.png'}
          alt={product.name}
          fill
          className="object-contain rounded"
        />
        {images.length > 1 && (
          <>
            <button onClick={() => setCurrent((current - 1 + images.length) % images.length)} className="absolute left-0 top-1/2 -translate-y-1/2 px-2">◀</button>
            <button onClick={() => setCurrent((current + 1) % images.length)} className="absolute right-0 top-1/2 -translate-y-1/2 px-2">▶</button>
          </>
        )}
      </div>
      <h3 className="font-semibold mb-1">{product.name}</h3>
      {product.description && <p className="text-sm text-gray-600 mb-1">{product.description}</p>}
      {(product.amazonCa || product.amazonCom) && (
        <p className="text-sm text-gray-500 mb-2">Disponible sur Amazon</p>
      )}
      <div className="flex justify-center gap-2 mb-2">
        {product.amazonCa && (
          <Link href={product.amazonCa} target="_blank">
            <button className="bg-blue-600 text-white px-3 py-1 rounded">Amazon.ca</button>
          </Link>
        )}
        {product.amazonCom && (
          <Link href={product.amazonCom} target="_blank">
            <button className="bg-black text-white px-3 py-1 rounded">Amazon.com</button>
          </Link>
        )}
      </div>
      {product.tiktokUrl && (
        <Link href={product.tiktokUrl} target="_blank" className="text-sm text-blue-700 underline">
          Voir sur TikTok
        </Link>
      )}
    </div>
  )
}
