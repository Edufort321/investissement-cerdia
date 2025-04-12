import Image from 'next/image'
import Link from 'next/link'
import logo from '@/public/logo-cerdia.png'

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* HEADER */}
      <header className="flex items-center justify-between px-8 py-5 shadow-md bg-white">
        <div className="flex items-center">
          <Image src={logo} alt="Logo CERDIA" width={48} height={48} priority />
        </div>
        <nav className="flex gap-6">
          <Link href="/" className="bg-[#0F1E47] text-white px-4 py-2 rounded hover:bg-[#1a2960] transition">
            Accueil
          </Link>
          <Link href="#vision" className="bg-[#0F1E47] text-white px-4 py-2 rounded hover:bg-[#1a2960] transition">
            Vision
          </Link>
          <Link href="/connexion" className="bg-[#0F1E47] text-white px-4 py-2 rounded hover:bg-[#1a2960] transition">
            Connexion
          </Link>
          <Link href="/investir" className="bg-[#0F1E47] text-white px-4 py-2 rounded hover:bg-[#1a2960] transition">
            Investir
          </Link>
        </nav>
      </header>

      {/* HERO */}
      <section className="max-w-6xl mx-auto px-6 py-16 text-center">
        <h1 className="text-4xl md:text-6xl font-bold text-[#0F1E47] font-serif mb-6">
          Une vision d’envergure alliant IA, immobilier, formation et luxe locatif
        </h1>
        <p className="text-lg text-gray-700 max-w-3xl mx-auto mb-8">
          L'intelligence au service de l'investissement. Rejoignez un réseau haut de gamme 
          et faites croître votre capital stratégiquement.
        </p>
        <Link href="/investir" className="btn-primary">
          🚀 Devenir investisseur
        </Link>
      </section>

      {/* MODULES */}
      <section className="max-w-5xl mx-auto px-6 py-12 space-y-14">
        <div>
          <h2 className="text-2xl font-serif text-[#0F1E47] mb-3">🌟 Intelligence artificielle</h2>
          <p className="text-gray-700 leading-relaxed">
            CERDIA s’appuie sur une IA stratégique pour analyser, prédire et accompagner
            l’investissement de façon autonome et proactive.
          </p>
        </div>
        <div>
          <h2 className="text-2xl font-serif text-[#0F1E47] mb-3">🌳 Immobilier d’exception</h2>
          <p className="text-gray-700 leading-relaxed">
            Accédez à des projets immobiliers ciblés au Canada, au Mexique, en République dominicaine 
            et ailleurs — optimisés pour la rentabilité durable.
          </p>
        </div>
        <div>
          <h2 className="text-2xl font-serif text-[#0F1E47] mb-3">🎓 Formation stratégique</h2>
          <p className="text-gray-700 leading-relaxed">
            Programmes MBA, intelligence financière, coaching personnalisé — pour former une 
            élite entrepreneuriale.
          </p>
        </div>
        <div>
          <h2 className="text-2xl font-serif text-[#0F1E47] mb-3">🏢 Location haut de gamme</h2>
          <p className="text-gray-700 leading-relaxed">
            Une plateforme locative CERDIA avec conciergerie, options VIP et rendement optimisé.
          </p>
        </div>
      </section>
    </div>
  )
}
