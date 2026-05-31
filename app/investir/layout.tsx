import type { Metadata } from 'next'

// Metadata SEO dédié à la page /investir (la page est 'use client', donc le
// titre/description optimisés passent par ce layout server-side).
export const metadata: Metadata = {
  title: 'Investir en immobilier international — Rendements 6-12% | CERDIA',
  description:
    'Investissez dans l\'immobilier international avec CERDIA : projets sélectionnés en République Dominicaine, Floride et Mexique. Rendements locatifs de 6 à 12 %, gestion professionnelle et suivi transparent par part (NAV).',
  keywords: [
    'investir immobilier international', 'investissement immobilier République Dominicaine',
    'investir Floride', 'investir Mexique', 'rendement locatif', 'devenir investisseur immobilier',
    'investissement Punta Cana', 'immobilier Tulum', 'CERDIA',
  ],
  alternates: { canonical: '/investir' },
  openGraph: {
    title: 'Investir en immobilier international avec CERDIA',
    description:
      'Projets immobiliers sélectionnés en République Dominicaine, Floride et Mexique. Rendements 6-12 %, gestion professionnelle, suivi transparent.',
    url: '/investir',
    type: 'website',
  },
}

export default function InvestirLayout({ children }: { children: React.ReactNode }) {
  return children
}
