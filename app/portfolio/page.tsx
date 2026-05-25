'use client'

import { Sparkles } from 'lucide-react'

/**
 * Cette page DOIT retourner 200 (ne pas rediriger cote serveur).
 * start_url du manifest PWA pointe ici — Chrome exige un 200 dans le scope /portfolio/
 * pour activer le prompt d'installation.
 */
export default function PortfolioRoot() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-6">
      <div className="text-center max-w-xs">
        <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-xl shadow-pink-900/30">
          <Sparkles size={28} className="text-white" />
        </div>
        <h1 className="text-white text-xl font-bold mb-2">Portfolio Artistique</h1>
        <p className="text-gray-400 text-sm leading-relaxed">
          Ouvre le lien personnel que ton agence t&apos;a partagé pour accéder à ton portfolio.
        </p>
      </div>
    </div>
  )
}
