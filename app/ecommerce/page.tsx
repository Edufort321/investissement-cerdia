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
      {/* Bouton de langue */}
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
            La boutique CERDIA est née d’une idée simple : créer une passerelle entre l’eCommerce intelligent et l’investissement immobilier durable. Chaque produit vendu finance notre expansion immobilière internationale, tout en offrant des articles optimisés par notre IA.
          </p>
        </>
      ) : (
        <>
          <h1 className="text-4xl font-bold mb-4">Why this shop?</h1>
          <p className="text-lg mb-10 text-gray-700 max-w-3xl">
            The CERDIA store was born to bridge smart eCommerce with sustainable real estate investment. Every product sold helps fund our global real estate growth while offering AI-optimized gear.
          </p>
        </>
      )}

      {/* Produit vedette */}
      <section className="mb-20">
        <h2 className="text-3xl font-bold mb-4">CERDIA BAG#1 – {lang === 'fr' ? 'Sac à dos professionnel multifonction' : 'Smart travel & work backpack'}</h2>
        <div className="text-sm mb-2 text-yellow-600 font-semibold">
          🔔 {lang === 'fr' ? 'Disponible bientôt sur Amazon' : 'Coming soon on Amazon'}
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Carrousel d’images */}
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

            {/* Miniatures */}
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

          {/* Description dynamique */}
          <div className="flex-1">
            {lang === 'fr' ? (
              <>
                <p className="text-lg mb-4">
                  Le <strong>CERDIA BAG#1</strong> est un sac à dos élégant et robuste conçu pour les professionnels, étudiants et voyageurs.
                </p>
                <ul className="list-disc ml-5 mb-6">
                  <li>Pour ordinateur jusqu’à 17 pouces</li>
                  <li>Port USB intégré</li>
                  <li>Dossier respirant</li>
                  <li>Tissu imperméable</li>
                  <li>Capacité : 26 L</li>
                </ul>
              </>
            ) : (
              <>
                <p className="text-lg mb-4">
                  The <strong>CERDIA BAG#1</strong> is a smart and durable backpack for professionals, students and travelers.
                </p>
                <ul className="list-disc ml-5 mb-6">
                  <li>Fits laptops up to 17 inches</li>
                  <li>Integrated USB port</li>
                  <li>Breathable padded back</li>
                  <li>Water-resistant Oxford material</li>
                  <li>Capacity: 26 L</li>
                </ul>
              </>
            )}

            <Link href="https://www.amazon.ca" target="_blank">
              <button className="bg-blue-800 text-white px-6 py-3 rounded-full hover:bg-blue-600 transition">
                {lang === 'fr' ? 'Voir sur Amazon' : 'Visit Amazon'}
              </button>
            </Link>

            {/* Formulaire notification */}
            <div className="mt-6">
              <p className="text-sm font-medium mb-2">
                {lang === 'fr'
                  ? '🔔 Soyez notifié dès la mise en ligne :'
                  : '🔔 Be notified as soon as it’s live:'}
              </p>
              <form className="flex flex-col sm:flex-row gap-2">
                <input
                  type="email"
                  placeholder={lang === 'fr' ? 'Votre courriel' : 'Your email'}
                  className="border px-4 py-2 rounded w-full sm:w-auto"
                />
                <button
                  type="submit"
                  className="bg-blue-700 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                  {lang === 'fr' ? 'M’avertir' : 'Notify me'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Produits à venir */}
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

      {/* Mini-bannière IA */}
      <div className="bg-gray-100 text-center py-6 px-4 rounded-xl">
        <p className="text-sm text-gray-700 max-w-3xl mx-auto">
          {lang === 'fr'
            ? '🧠 Cette boutique est propulsée par l’IA CERDIA. Chaque achat finance un projet immobilier durable.'
            : '🧠 This shop is powered by CERDIA AI. Every purchase supports sustainable real estate development.'}
        </p>
      </div>
    </main>
  )
}
