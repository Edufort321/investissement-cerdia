'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'

const images = Array.from({ length: 10 }, (_, i) => `/images/bag1-${i + 1}.png`)

const futureProducts = Array.from({ length: 8 }, (_, i) => ({
  name: `CERDIA FUTURE #${i + 2}`,
  images: Array.from({ length: 10 }, (_, j) => `/images/future${i + 2}-${j + 1}.png`),
  amazonLinkCA: 'https://www.amazon.ca/dp/B0CXYZ1234?tag=cerdia-20',
  amazonLinkUS: 'https://www.amazon.com/dp/B0CXYZ1234?tag=cerdiaus-20',
  tiktokLink: 'https://www.tiktok.com/@cerdia.product',
}))

export default function EcommercePage() {
  const [current, setCurrent] = useState(0)
  const [lang, setLang] = useState<'fr' | 'en'>('fr')
  const [futureCarousel, setFutureCarousel] = useState(
    futureProducts.map(() => 0)
  )

  const toggleLang = () => {
    setLang((prev) => (prev === 'fr' ? 'en' : 'fr'))
  }

  return (
    <main className="px-6 py-12 max-w-7xl mx-auto">
      {/* Langue */}
      <div className="flex justify-end mb-4">
        <button
          onClick={toggleLang}
          className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200 text-sm"
        >
          {lang === 'fr' ? 'Switch to English' : 'Passer en français'}
        </button>
      </div>

      {/* Intro */}
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

      {/* Produit principal */}
      <section className="mb-20">
        <h2 className="text-3xl font-bold mb-4">
          CERDIA BAG#1 – {lang === 'fr' ? 'Sac à dos professionnel multifonction' : 'Smart travel & work backpack'}
        </h2>
        <div className="text-sm mb-2 text-yellow-600 font-semibold">
          🔔 {lang === 'fr' ? 'Disponible bientôt sur Amazon' : 'Coming soon on Amazon'}
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Image principale avec flèches */}
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
          </div>

          {/* Texte + bouton Amazon */}
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
          </div>
        </div>
      </section>

      {/* Produits affiliés avec carrousel */}
      <section className="mb-20">
        <h2 className="text-2xl font-bold mb-6">
          {lang === 'fr'
            ? 'Affiliation Amazon & SiteStripe'
            : 'Amazon Affiliate & SiteStripe'}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {futureProducts.map((product, index) => (
            <div key={index} className="bg-white rounded-xl shadow p-4">
              <div className="relative w-full aspect-[4/5] mb-4">
                <Image
                  src={product.images[futureCarousel[index]]}
                  alt={product.name}
                  fill
                  className="object-contain rounded"
                />
                <button
                  onClick={() =>
                    setFutureCarousel((prev) => {
                      const copy = [...prev]
                      copy[index] = (copy[index] - 1 + 10) % 10
                      return copy
                    })
                  }
                  className="absolute left-0 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-70 px-2 py-1 rounded-r hover:bg-opacity-90"
                >
                  ◀
                </button>
                <button
                  onClick={() =>
                    setFutureCarousel((prev) => {
                      const copy = [...prev]
                      copy[index] = (copy[index] + 1) % 10
                      return copy
                    })
                  }
                  className="absolute right-0 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-70 px-2 py-1 rounded-l hover:bg-opacity-90"
                >
                  ▶
                </button>
              </div>
              <h3 className="text-lg font-semibold mb-1 text-center">{product.name}</h3>
              <p className="text-sm text-center text-gray-500 mb-3">
                {lang === 'fr' ? 'Disponible sur Amazon' : 'Available on Amazon'}
              </p>
              <div className="flex justify-center gap-2">
                <Link href={product.amazonLinkCA} target="_blank">
                  <button className="bg-blue-700 text-white px-4 py-2 rounded hover:bg-blue-600 text-sm">
                    Amazon.ca
                  </button>
                </Link>
                <Link href={product.amazonLinkUS} target="_blank">
                  <button className="bg-gray-800 text-white px-4 py-2 rounded hover:bg-gray-700 text-sm">
                    Amazon.com
                  </button>
                </Link>
              </div>
              <div className="text-center mt-3">
                <Link href={product.tiktokLink} target="_blank" className="text-blue-500 underline text-sm">
                  Voir sur TikTok
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer IA */}
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
