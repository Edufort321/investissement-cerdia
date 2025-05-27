'use client'

import Image from 'next/image'
import Link from 'next/link'

export default function InvestirPage() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <h1 className="text-4xl font-bold text-center text-blue-900 mb-8">
        💼 Rejoindre l’investissement CERDIA
      </h1>

      <p className="text-lg text-gray-700 mb-6 text-center">
        Investissement CERDIA ouvre ses portes à une sélection restreinte d’investisseurs. Notre mission : bâtir un portefeuille immobilier locatif international, optimisé par l’intelligence artificielle, avec une rentabilité durable à long terme.
      </p>

      <div className="grid md:grid-cols-2 gap-10 my-12">
        <div className="bg-white shadow rounded-lg overflow-hidden border">
          <Image src="/images/secret-garden.jpg" alt="Secret Garden" width={600} height={400} className="w-full h-64 object-cover" />
        </div>
        <div className="bg-white shadow rounded-lg overflow-hidden border">
          <Image src="/images/oasis-bay.jpg" alt="Oasis Bay" width={600} height={400} className="w-full h-64 object-cover" />
        </div>
      </div>

      <div className="text-gray-700 space-y-4">
        <p>
          L’entrée dans notre programme d’investissement est conditionnelle à une entrevue avec l’un des fondateurs. Seuls les candidats alignés avec notre vision stratégique et notre rigueur à long terme seront invités à participer.
        </p>
        <p>
          L’investissement minimum est de <strong>25 000 $</strong>, avec un engagement de <strong>5 ans minimum</strong>. Aucun frais de retrait anticipé ne sera permis. Notre approche est conçue pour maximiser la valeur à long terme et la stabilité du capital.
        </p>
        <p>
          Chaque investisseur admis bénéficiera d’un accès privilégié aux unités CERDIA, d’un suivi personnalisé, et d’un partage stratégique de la croissance.
        </p>
      </div>

      <div className="text-center mt-10">
        <Link href="/devenir-investisseur">
          <button className="bg-blue-800 text-white px-6 py-3 rounded-full text-lg hover:bg-blue-900 transition">
            Devenir investisseur
          </button>
        </Link>
      </div>
    </div>
  )
}
