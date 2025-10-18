'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'

const images = [
  '/images/cerdia-bag-1/bag1-1.png',
  '/images/cerdia-bag-1/bag1-2.png',
  '/images/cerdia-bag-1/bag1-3.png',
  '/images/cerdia-bag-1/bag1-4.png',
  '/images/cerdia-bag-1/bag1-5.png',
  '/images/cerdia-bag-1/bag1-6.png',
  '/images/cerdia-bag-1/bag1-7.png',
  '/images/cerdia-bag-1/bag1-8.png',
  '/images/cerdia-bag-1/bag1-9-blue-navy.png',
  '/images/cerdia-bag-1/bag1-10-dark-gray.png',
]

export default function CerdiaBag1() {
  const [current, setCurrent] = useState(0)

  return (
    <section className="px-6 py-12 max-w-7xl mx-auto">
      <h2 className="text-3xl font-bold mb-6">CERDIA BAG#1 – Sac à dos professionnel multifonction</h2>
      <div className="flex flex-col md:flex-row gap-8">
        <div className="flex-1">
          <Image
            src={images[current]}
            alt="Image du sac CERDIA"
            width={600}
            height={600}
            className="rounded-xl object-cover"
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
                className={`rounded cursor-pointer border ${current === i ? 'border-blue-700' : 'border-gray-300'}`}
              />
            ))}
          </div>
        </div>

        <div className="flex-1">
          <p className="text-lg mb-4">
            Le <strong>CERDIA BAG#1</strong> est un sac à dos élégant et robuste, conçu pour les professionnels, étudiants et voyageurs.
          </p>
          <ul className="list-disc ml-5 mb-6 space-y-1">
            <li>Rangement pour ordinateur jusqu’à 17 pouces</li>
            <li>Port USB intégré (batterie non incluse)</li>
            <li>Dos ergonomique respirant</li>
            <li>Tissu Oxford imperméable</li>
            <li>Capacité : 26 L</li>
          </ul>
          <Link href="https://www.amazon.ca/dp/B09MQWWP87" target="_blank">
            <button className="bg-blue-800 text-white px-6 py-3 rounded-full hover:bg-blue-600 transition">
              Acheter sur Amazon
            </button>
          </Link>
        </div>
      </div>
    </section>
  )
}
