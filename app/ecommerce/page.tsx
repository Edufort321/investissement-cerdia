'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'

const images = [
  '/images/bag1-1.png',
]

const futureProducts = Array.from({ length: 8 }, (_, i) => ({
  name: `CERDIA FUTURE #${i + 2}`,
  image: `/images/cerdia-future-${i + 2}.png`,
  amazonCA: 'https://www.amazon.ca/dp/B0CXYZ1234?tag=cerdia-20',
  amazonCOM: 'https://www.amazon.com/dp/B0CXYZ1234?tag=cerdiaus-20',
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
        <h2 className="text-3xl font-bold mb-4">
          CERDIA BAG#1 – {lang === 'fr' ? 'Sac à dos professionnel multifonction' : 'Smart travel & work backpack'}
        </h2>
        <div className="text-sm mb-2 text-yellow-600 font-semibold">
          🔔 {lang === 'fr' ? 'Disponible bientôt sur Amazon' : 'Coming soon on Amazon'}
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Image principale */}
          <div className="flex-1">
            <div className="relative w-full max-w-xl aspect-[4/5] mx-auto mb-4">
              <Image
                src={images[current]}
                alt={`Image ${current + 1}`}
                fill
                className="object-contain rounded-xl"
                sizes="(max-width: 768px) 100vw, 600px"
              />
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

            <div className="flex gap-3">
              <Link href="https://www.amazon.ca/dp/B0CXYZ1234?tag=cerdia-20" target="_blank">
                <button className="bg-yellow-500 text-black px-4 py-2 rounded hover:bg-yellow-600">
                  Amazon.ca
                </button>
              </Link>
              <Link href="https://www.amazon.com/dp/B0CXYZ1234?tag=cerdiaus-20" target="_blank">
                <button className="bg-orange-400 text-black px-4 py-2 rounded hover:bg-orange-500">
                  Amazon.com
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Section Produits futurs CERDIA */}
      <section className="mb-20">
        <h2 className="text-2xl font-bold mb-6">
          {lang === 'fr' ? 'Produits CERDIA à venir' : 'Upcoming CERDIA Products'}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {futureProducts.map((product, i) => (
            <div key={i} className="flex flex-col md:flex-row gap-8">
              {/* Image */}
              <div className="flex-1">
                <div className="relative w-full max-w-xs aspect-[4/5] mx-auto mb-4">
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    className="object-contain rounded-xl"
                    sizes="(max-width: 768px) 100vw, 300px"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="flex-1">
                <h3 className="text-xl font-semibold mb-2">{product.name}</h3>
                <p className="text-sm mb-4 text-yellow-700 font-medium">
                  🔔 {lang === 'fr' ? 'Disponible bientôt sur Amazon' : 'Coming soon on Amazon'}
                </p>
                <p className="text-base mb-4 text-gray-700">
                  {lang === 'fr'
                    ? "Ce produit CERDIA fera bientôt partie de notre gamme officielle optimisée par l’IA. Idéal pour l’investissement intelligent et l’usage quotidien."
                    : "This CERDIA product will soon join our official AI-optimized line. Ideal for smart investment and everyday use."}
                </p>

                <div className="flex gap-3">
                  <a
                    href={product.amazonCA}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-yellow-500 hover:bg-yellow-600 text-black px-4 py-2 rounded text-sm"
                  >
                    Amazon.ca
                  </a>
                  <a
                    href={product.amazonCOM}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-orange-400 hover:bg-orange-500 text-black px-4 py-2 rounded text-sm"
                  >
                    Amazon.com
                  </a>
                </div>
              </div>
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
