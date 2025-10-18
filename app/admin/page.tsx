'use client'

import { useState } from 'react'
import Image from 'next/image'

interface ProductInput {
  name: string
  amazonLinkCA: string
  amazonLinkUS: string
  tiktokLink: string
  images: string[]
}

export default function AdminPage() {
  const [product, setProduct] = useState<ProductInput>({
    name: '',
    amazonLinkCA: '',
    amazonLinkUS: '',
    tiktokLink: '',
    images: [''],
  })

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setProduct((prev) => ({ ...prev, [name]: value }))
  }

  const handleImageChange = (index: number, value: string) => {
    const newImages = [...product.images]
    newImages[index] = value
    setProduct((prev) => ({ ...prev, images: newImages }))
  }

  const addImageField = () => {
    setProduct((prev) => ({ ...prev, images: [...prev.images, ''] }))
  }

  const handleSubmit = () => {
    console.log('Produit à sauvegarder :', product)
    alert('Produit ajouté (simulé) ✅')
    // Intégration future : POST vers API / stockage JSON / base de données
  }

  return (
    <main className="max-w-3xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Ajouter un produit affilié</h1>

      <div className="flex flex-col gap-4">
        <input
          name="name"
          value={product.name}
          onChange={handleInput}
          placeholder="Nom du produit"
          className="border px-4 py-2 rounded"
        />
        <input
          name="amazonLinkCA"
          value={product.amazonLinkCA}
          onChange={handleInput}
          placeholder="Lien Amazon.ca"
          className="border px-4 py-2 rounded"
        />
        <input
          name="amazonLinkUS"
          value={product.amazonLinkUS}
          onChange={handleInput}
          placeholder="Lien Amazon.com"
          className="border px-4 py-2 rounded"
        />
        <input
          name="tiktokLink"
          value={product.tiktokLink}
          onChange={handleInput}
          placeholder="Lien TikTok"
          className="border px-4 py-2 rounded"
        />

        <div>
          <p className="font-medium mb-2">Images du produit</p>
          {product.images.map((img, index) => (
            <input
              key={index}
              value={img}
              onChange={(e) => handleImageChange(index, e.target.value)}
              placeholder={`Image URL #${index + 1}`}
              className="border px-4 py-2 rounded mb-2 w-full"
            />
          ))}
          <button
            onClick={addImageField}
            className="text-blue-600 hover:underline text-sm mt-2"
          >
            ➕ Ajouter une image
          </button>
        </div>

        <button
          onClick={handleSubmit}
          className="bg-green-600 text-white py-2 rounded mt-4 hover:bg-green-700"
        >
          Enregistrer le produit
        </button>
      </div>
    </main>
  )
}
