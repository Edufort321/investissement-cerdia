'use client'

import Image from 'next/image'
import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* HERO SECTION */}
      <section className="max-w-6xl mx-auto px-6 py-16 text-center">
        <h1 className="text-4xl md:text-6xl font-bold text-[#0F1E47] font-serif mb-6 leading-tight">
          Une vision d’envergure alliant IA, immobilier, formation et luxe locatif
        </h1>
        <p className="text-lg text-gray-700 max-w-3xl mx-auto mb-8">
          L'intelligence au service de l'investissement. Rejoignez un réseau haut de gamme 
          et faites croître votre capital stratégiquement.
        </p>
        <Link href="/investir">
          <button className="bg-[#0F1E47] text-white px-6 py-3 rounded-full text-lg hover:bg-[#1a2960] transition">
            Devenir investisseur
          </button>
        </Link>
      </section>

      {/* SLIDE 1 – IA */}
      <section className="w-full cursor-pointer">
        <Link href="/ia">
          <Image
            src="/cerdia-slide-intelligence.png"
            alt="Intelligence artificielle CERDIA"
            width={1920}
            height={800}
            className="w-full h-auto transition-transform duration-200 hover:scale-105"
            priority
          />
        </Link>
      </section>

      {/* SLIDE 2 – IMMOBILIER */}
      <section className="w-full cursor-pointer">
        <Link href="/immobilier">
          <Image
            src="/cerdia-slide-immobilier.png"
            alt="Immobilier d'exception CERDIA"
            width={1920}
            height={800}
            className="w-full h-auto transition-transform duration-200 hover:scale-105"
          />
        </Link>
      </section>

      {/* SLIDE 3 – ECOMMERCE */}
      <section className="w-full cursor-pointer">
        <Link href="/ecommerce">
          <Image
            src="/cerdia-slide-ecommerce.png"
            alt="eCommerce CERDIA"
            width={1920}
            height={800}
            className="w-full h-auto transition-transform duration-200 hover:scale-105"
          />
        </Link>
      </section>

      {/* SLIDE 4 – LOCATION */}
      <section className="w-full cursor-pointer">
        <Link href="/location">
          <Image
            src="/cerdia-slide-location.png"
            alt="Location haut de gamme CERDIA"
            width={1920}
            height={800}
            className="w-full h-auto transition-transform duration-200 hover:scale-105"
          />
        </Link>
      </section>

      {/* SLIDE 5 – FORMATION */}
      <section className="w-full cursor-pointer">
        <Link href="/formation">
          <Image
            src="/cerdia-slide-formation.png"
            alt="Formation stratégique CERDIA"
            width={1920}
            height={800}
            className="w-full h-auto transition-transform duration-200 hover:scale-105"
          />
        </Link>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#0F1E47] text-white py-6 mt-16">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center text-sm text-center gap-2 md:gap-0">
          <p>&copy; 2025 Investissement CERDIA. Tous droits réservés.</p>
          <p>Version IA propulsée par OpenAI – Propulsé depuis le Québec 🇨🇦</p>
        </div>
      </footer>
    </div>
  )
}
