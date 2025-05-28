'use client'

import Image from 'next/image'
import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* HERO SECTION */}
      <section className="max-w-6xl mx-auto px-6 py-16 text-center">
        <h1 className="text-4xl md:text-6xl font-bold text-[#0F1E47] font-serif mb-6 leading-tight">
          A bold vision combining AI, real estate, education and luxury rentals
        </h1>
        <p className="text-lg text-gray-700 max-w-3xl mx-auto mb-8">
          Intelligence at the service of investment. Join an exclusive network and grow your capital strategically.
        </p>
        <Link href="/en/investir">
          <button className="bg-[#0F1E47] text-white px-6 py-3 rounded-full text-lg hover:bg-[#1a2960] transition">
            Become an investor
          </button>
        </Link>
      </section>

      {/* SLIDE 1 – AI */}
      <section className="w-full cursor-pointer">
        <Link href="/en/ia">
          <Image
            src="/cerdia-slide-intelligence.png"
            alt="CERDIA Artificial Intelligence"
            width={1920}
            height={800}
            className="w-full h-auto transition-transform duration-200 hover:scale-105"
            priority
          />
        </Link>
      </section>

      {/* SLIDE 2 – REAL ESTATE */}
      <section className="w-full cursor-pointer">
        <Link href="/en/immobilier">
          <Image
            src="/cerdia-slide-immobilier.png"
            alt="CERDIA Premium Real Estate"
            width={1920}
            height={800}
            className="w-full h-auto transition-transform duration-200 hover:scale-105"
          />
        </Link>
      </section>

      {/* SLIDE 3 – ECOMMERCE */}
      <section className="w-full cursor-pointer">
        <Link href="/en/ecommerce">
          <Image
            src="/cerdia-slide-ecommerce.png"
            alt="CERDIA eCommerce"
            width={1920}
            height={800}
            className="w-full h-auto transition-transform duration-200 hover:scale-105"
          />
        </Link>
      </section>

      {/* SLIDE 4 – RENTALS */}
      <section className="w-full cursor-pointer">
        <Link href="/en/location">
          <Image
            src="/cerdia-slide-location.png"
            alt="CERDIA Luxury Rentals"
            width={1920}
            height={800}
            className="w-full h-auto transition-transform duration-200 hover:scale-105"
          />
        </Link>
      </section>

      {/* SLIDE 5 – EDUCATION */}
      <section className="w-full cursor-pointer">
        <Link href="/en/formation">
          <Image
            src="/cerdia-slide-formation.png"
            alt="CERDIA Strategic Education"
            width={1920}
            height={800}
            className="w-full h-auto transition-transform duration-200 hover:scale-105"
          />
        </Link>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#0F1E47] text-white py-6 mt-16">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center text-sm text-center gap-2 md:gap-0">
          <p>&copy; 2025 Investissement CERDIA. All rights reserved.</p>
          <p>AI-powered version by OpenAI – Based in Québec 🇨🇦</p>
        </div>
      </footer>
    </div>
  )
}
