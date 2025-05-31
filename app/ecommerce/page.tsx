'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'

const images = [
  '/images/bag1-1.png',
  '/images/bag1-2.png',
  '/images/bag1-3.png',
  '/images/bag1-4.png',
  '/images/bag1-5.png',
  '/images/bag1-6.png',
  '/images/bag1-7.png',
  '/images/bag1-8.png',
  '/images/bag1-9-blue-navy.png',
  '/images/bag1-10-dark-gray.png',
]

const futureProducts = Array.from({ length: 8 }, (_, i) => ({
  name: `CERDIA FUTURE #${i + 2}`,
  image: `/images/cerdia-future-${i + 2}.png`,
  status: 'À venir',
}))

export default function EcommercePage() {
  const [current, setCurrent] = useState(0)
  const [lang, setLang] = useState<'fr' | 'en'>('fr')

  const toggleLang = () => {
    setLang((prev) => (prev === 'fr' ? 'en' : 'fr'))
  }

  return (
    <main className="px-6 py-12 max-w-7xl mx-auto">
      {/* Traduction */}
      <div className="flex justify-end mb-4">
        <button
          onClick={toggleLang}
          className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200 text-sm"
        >
          {lang === 'fr' ? 'Switch to English' : 'Passer en français'}
        </button>
      </div>

      {/* Vision CERDIA */}
      {lang === 'fr' ? (
        <>
          <h1 className="text-4xl font-bold mb-4">Pourquoi cette boutique ?</h1>
          <p className="text-lg mb-10 text-gray-700 max-w-3xl">
            La boutique CERDIA est née d’une idée simple : créer une passerelle entre l’eCommerce intelligent et l’investissement immobilier durable. Chaque produit vendu finance notre expansion immobilière internationale, tout en offrant aux clients des accessoires de qualité supérieure, testés, approuvés et optimisés par notre IA.
          </p>
        </>
      ) : (
        <>
          <h1 className="text-4xl font-bold mb-4">Why this shop?</h1>
          <p className="text-lg mb-10 text-gray-700 max-w-3xl">
            The CERDIA store was born from a simple idea: to bridge intelligent eCommerce with sustainable real estate investment. Every product sold helps fund our international real estate expansion while delivering high-quality, AI-optimized travel gear to our customers.
          </p>
        </>
      )}

      {/* Produit vedette CERDIA BAG#1 */}
      <section className="mb-20">
        <h2 className="text-3xl font-bold mb-6">CERDIA BAG#1 – Sac à dos professionnel multifonction</h2>
        <div className="flex flex-col md:flex-row gap-8">
          <div className="flex-1">
            <Image
              src={images[current]}
              alt="Sac à dos CERDIA"
              width={600}
              height={600}
              className="rounded-2xl object-cover"
            />
            <div className="flex gap-2 mt-4 flex-wrap">
              {images.map((img, i) => (
                <Image
                  key={i}
                  src={img}
                  width={90}
                  height={90}
                  alt={`Miniature ${i + 1}`}
                  onClick={() => setCurrent(i)}
                  className={`rounded cursor-pointer border ${current === i ? 'border-blue-600' : 'border-gray-300'}`}
                />
              ))}
            </div>
          </div>

          <div className="flex-1">
            <p className="text-lg mb-4">
              Le <strong>CERDIA BAG#1</strong> est un sac à dos élégant et robuste, conçu pour les professionnels, étudiants et voyageurs. Il combine design moderne, efficacité et résistance à l'eau.
            </p>
            <ul className="list-disc ml-5 mb-6">
              <li>Rangement ordinateur jusqu’à 17 pouces</li>
              <li>Port USB intégré</li>
              <li>Dossier respirant</li>
              <li>Tissu imperméable</li>
              <li>Capacité 26 L</li>
            </ul>
            <Link href="https://www.amazon.ca/dp/B09MQWWP87" target="_blank">
              <button className="bg-blue-800 text-white px-6 py-3 rounded-full hover:bg-blue-600 transition">
                Acheter sur Amazon
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Galerie de produits futurs */}
      <section className="mb-20">
        <h2 className="text-2xl font-bold mb-4">Prochains articles CERDIA</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {futureProducts.map((product, i) => (
            <div
              key={i}
              className="bg-white rounded-xl shadow p-4 text-center hover:shadow-md transition"
            >
              <Image
                src={product.image}
                alt={product.name}
                width={200}
                height={200}
                className="mx-auto mb-2 rounded"
              />
              <h3 className="font-semibold">{product.name}</h3>
              <p className="text-sm text-gray-500">{product.status}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Message SEO et Amazon */}
      <p className="text-center text-sm text-gray-500 mt-10 italic">
        Vous venez d’Amazon ? Bienvenue dans la boutique officielle CERDIA. Chaque achat soutient notre mission d’investissement immobilier intelligent.
      </p>
    </main>
  )
}
