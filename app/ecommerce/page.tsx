'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'

const images = [
  '/sac-1.jpg',
  '/sac-2.jpg',
  '/sac-3.jpg',
  '/sac-4.jpg',
]

export default function EcommerceProduct() {
  const [current, setCurrent] = useState(0)

  return (
    <section className="px-6 py-12 max-w-7xl mx-auto">
      <h2 className="text-3xl font-bold mb-6">Sac à dos professionnel CERDIA</h2>
      <div className="flex flex-col md:flex-row gap-8">
        <div className="flex-1">
          <Image
            src={images[current]}
            alt="Sac à dos CERDIA"
            width={600}
            height={600}
            className="rounded-2xl object-cover"
          />
          <div className="flex gap-2 mt-4">
            {images.map((img, i) => (
              <Image
                key={i}
                src={img}
                width={100}
                height={100}
                alt={`Vignette ${i}`}
                onClick={() => setCurrent(i)}
                className={`rounded cursor-pointer border ${current === i ? 'border-blue-600' : 'border-gray-300'}`}
              />
            ))}
          </div>
        </div>
        <div className="flex-1">
          <p className="text-lg mb-4">
            Sac haut de gamme, conçu pour le confort et la fonctionnalité :
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
  )
}
