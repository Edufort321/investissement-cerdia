// ✅ Fichier : app/ecommerce/page.tsx
'use client'

import { useEffect, useState } from 'react'
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

const PASSWORD_HASH = '1fd6614c80f6f38570e28538dc39ebda1bfdde84ce684da7df3aeeae5de7e941'

export default function EcommercePage() {
  const [products, setProducts] = useState<Product[]>([])
  const [showForm, setShowForm] = useState(false)
  const [password, setPassword] = useState('')
  const [newProduct, setNewProduct] = useState<Product>({
    name: '', amazonCa: '', amazonCom: '', tiktokUrl: '', description: '', images: Array(10).fill('')
  })
  const [editingIndex, setEditingIndex] = useState<number | null>(null)

  // Load products from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('products')
    if (saved) setProducts(JSON.parse(saved))
  }, [])

  useEffect(() => {
    localStorage.setItem('products', JSON.stringify(products))
  }, [products])

  const hashPassword = async (value: string) => {
    const msgUint8 = new TextEncoder().encode(value)
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8)
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')
  }

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const hashed = await hashPassword(password)
    if (hashed !== PASSWORD_HASH) return alert('Mot de passe invalide')

    if (editingIndex !== null) {
      const updated = [...products]
      updated[editingIndex] = newProduct
      setProducts(updated)
      setEditingIndex(null)
    } else {
      setProducts([...products, newProduct])
    }

    setNewProduct({ name: '', amazonCa: '', amazonCom: '', tiktokUrl: '', description: '', images: Array(10).fill('') })
    setPassword('')
    setShowForm(false)
  }

  const handleEdit = (index: number) => {
    setNewProduct(products[index])
    setEditingIndex(index)
    setShowForm(true)
  }

  const handleDelete = async (index: number) => {
    const pwd = prompt('Mot de passe requis pour supprimer') || ''
    const hashed = await hashPassword(pwd)
    if (hashed !== PASSWORD_HASH) return alert('Mot de passe invalide')
    const updated = [...products]
    updated.splice(index, 1)
    setProducts(updated)
  }

  return (
    <main className="px-6 py-12 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Affiliation Amazon & SiteStripe</h1>

      <button
        className="mb-6 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded"
        onClick={() => setShowForm(!showForm)}
      >➕ Ajouter un produit affilié</button>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 mb-12 rounded shadow-md space-y-3">
          <input name="name" value={newProduct.name} onChange={handleInputChange} placeholder="Nom du produit" className="w-full border p-2 rounded" required />
          <input name="amazonCa" value={newProduct.amazonCa} onChange={handleInputChange} placeholder="Lien Amazon.ca" className="w-full border p-2 rounded" />
          <input name="amazonCom" value={newProduct.amazonCom} onChange={handleInputChange} placeholder="Lien Amazon.com" className="w-full border p-2 rounded" />
          <input name="tiktokUrl" value={newProduct.tiktokUrl} onChange={handleInputChange} placeholder="Lien TikTok" className="w-full border p-2 rounded" />
          <input name="description" value={newProduct.description} onChange={handleInputChange} placeholder="Description courte (100 caractères)" maxLength={100} className="w-full border p-2 rounded" />
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
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mot de passe" className="w-full border p-2 rounded" required />
          <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded">
            {editingIndex !== null ? 'Mettre à jour' : 'Ajouter'}
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {products.map((product, i) => (
          <ProductCard key={i} product={product} onEdit={() => handleEdit(i)} onDelete={() => handleDelete(i)} />
        ))}
      </div>
    </main>
  )
}

function ProductCard({ product, onEdit, onDelete }: { product: Product, onEdit: () => void, onDelete: () => void }) {
  const [current, setCurrent] = useState(0)
  const images = product.images.filter((img) => img && img.trim() !== '')

  return (
    <div className="bg-white p-4 rounded shadow text-center">
      <div className="relative aspect-[4/5] w-full mb-2">
        {images.length > 0 && (
          <>
            <Image
              src={images[current]}
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
          </>
        )}
      </div>
      <h3 className="font-semibold mb-1 text-sm">{product.name}</h3>
      {product.description && <p className="text-xs text-gray-500 mb-2">{product.description}</p>}
      <p className="text-sm text-gray-500 mb-2">Disponible sur Amazon</p>
      <div className="flex justify-center gap-2 mb-2">
        {product.amazonCa && <Link href={product.amazonCa} target="_blank"><button className="bg-blue-600 text-white px-3 py-1 rounded">Amazon.ca</button></Link>}
        {product.amazonCom && <Link href={product.amazonCom} target="_blank"><button className="bg-black text-white px-3 py-1 rounded">Amazon.com</button></Link>}
      </div>
      {product.tiktokUrl && <Link href={product.tiktokUrl} target="_blank" className="text-sm text-blue-700 underline">Voir sur TikTok</Link>}
      <div className="mt-2 flex justify-center gap-2">
        <button onClick={onEdit} className="text-xs text-yellow-600">Modifier</button>
        <button onClick={onDelete} className="text-xs text-red-600">Supprimer</button>
      </div>
    </div>
  )
}
