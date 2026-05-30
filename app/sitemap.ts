import type { MetadataRoute } from 'next'

// Plan du site pour les moteurs de recherche : uniquement les pages PUBLIQUES.
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cerdia.ai'

// Pages publiques indexables (pas de pages privées dashboard/admin).
const PUBLIC_PATHS: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] }[] = [
  { path: '',                     priority: 1.0, changeFrequency: 'weekly' },
  { path: 'investir',             priority: 0.9, changeFrequency: 'weekly' },
  { path: 'devenir-investisseur', priority: 0.9, changeFrequency: 'monthly' },
  { path: 'vision-cerdia',        priority: 0.8, changeFrequency: 'monthly' },
  { path: 'immobilier',           priority: 0.8, changeFrequency: 'weekly' },
  { path: 'location',             priority: 0.7, changeFrequency: 'weekly' },
  { path: 'mon-voyage',           priority: 0.6, changeFrequency: 'monthly' },
  { path: 'cerdia-ia',            priority: 0.6, changeFrequency: 'monthly' },
  { path: 'privacy',              priority: 0.3, changeFrequency: 'yearly' },
]

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_PATHS.map(({ path, priority, changeFrequency }) => ({
    url: path ? `${BASE_URL}/${path}` : BASE_URL,
    lastModified: new Date(),
    changeFrequency,
    priority,
  }))
}
