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

      {/* Vision stratégique */}
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

      {/* Produit vedette */}
      <section className="mb-20">
        <h2 className="text-3xl font-bold mb-6">CERDIA BAG#1 – Sac à dos professionnel multifonction</h2>
        <div className="flex flex-col md:flex-row gap-8">
          {/* Carrousel */}
          <div className="flex-1">
            <div className="relative w-full max-w-xl aspect-[4/5] mx-auto mb-4">
              <Image
                src={images[current]}
                alt={`Image ${current + 1}`}
                fill
                className="object-contain rounded-xl"
                sizes="(max-width: 768px) 100vw, 600px"
              />
              <button
                onClick={() => setCurrent((current - 1 + images.length) % images.length)}
                className="absolute left-0 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-70 px-2 py-1 rounded-r hover:bg-opacity-90"
              >
                ◀
              </button>
              <button
                onClick={() => setCurrent((current + 1) % images.length)}
                className="absolute right-0 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-70 px-2 py-1 rounded-l hover:bg-opacity-90"
              >
                ▶
              </button>
            </div>

            <div className="flex gap-2 mt-4 flex-wrap justify-center">
              {images.map((img, i) => (
                <div
                  key={i}
                  className={`w-[90px] h-[90px] rounded overflow-hidden border ${
                    current === i ? 'border-blue-600' : 'border-gray-300'
                  } cursor-pointer`}
                  onClick={() => setCurrent(i)}
                >
                  <Image
                    src={img}
                    alt={`Miniature ${i + 1}`}
                    width={90}
                    height={90}
                    className="object-cover w-full h-full"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Description multilingue */}
          <div className="flex-1">
            {lang === 'fr' ? (
              <>
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
              </>
            ) : (
              <>
                <p className="text-lg mb-4">
                  The <strong>CERDIA BAG#1</strong> is a stylish and durable backpack designed for professionals, students, and travelers. It combines modern design with functionality and water resistance.
                </p>
                <ul className="list-disc ml-5 mb-6">
                  <li>Fits laptops up to 17 inches</li>
                  <li>Built-in USB charging port</li>
                  <li>Breathable padded back</li>
                  <li>Water-resistant Oxford fabric</li>
                  <li>26 L capacity</li>
                </ul>
                <Link href="https://www.amazon.ca/dp/B09MQWWP87" target="_blank">
                  <button className="bg-blue-800 text-white px-6 py-3 rounded-full hover:bg-blue-600 transition">
                    Buy on Amazon
                  </button>
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Produits futurs */}
      <section className="mb-20">
        <h2 className="text-2xl font-bold mb-4">
          {lang === 'fr' ? 'Prochains articles CERDIA' : 'Upcoming CERDIA Products'}
        </h2>
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
                className="mx-auto mb-2 rounded object-contain"
              />
              <h3 className="font-semibold">{product.name}</h3>
              <p className="text-sm text-gray-500">{product.status}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Message SEO Amazon */}
      <p className="text-center text-sm text-gray-500 mt-10 italic">
        {lang === 'fr'
          ? 'Vous venez d’Amazon ? Bienvenue dans la boutique officielle CERDIA. Chaque achat soutient notre mission d’investissement immobilier intelligent.'
          : 'Coming from Amazon? Welcome to the official CERDIA store. Every purchase supports our smart real estate investment mission.'}
      </p>
    </main>
  )
}
