import type { MetadataRoute } from 'next'

// Référencement : autorise l'indexation des pages publiques (marketing, vision,
// investir…) et BLOQUE les zones privées/applicatives des moteurs de recherche.
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.cerdia.ai'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/dashboard',        // app investisseur (privé)
          '/admin',            // back-office
          '/commerce/admin',   // back-office commerce
          '/api/',             // routes API
          '/share',            // liens de partage (tokens, non indexables)
          '/share-investor',
          '/share-public',
          '/portfolio/fill',   // liens de remplissage (tokens)
          '/espace-actionnaire',
          '/test',
          '/test-supabase',
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  }
}
