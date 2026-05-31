import type { Metadata } from 'next'

// Metadata SEO dédié à la page /devenir-investisseur.
export const metadata: Metadata = {
  title: 'Devenir investisseur immobilier international | CERDIA',
  description:
    'Rejoignez le réseau d\'investisseurs CERDIA et accédez à des opportunités immobilières exclusives en République Dominicaine, en Floride et au Mexique. Processus d\'adhésion accompagné, gestion professionnelle et conformité fiscale.',
  keywords: [
    'devenir investisseur immobilier', 'adhésion investisseur', 'réseau investisseurs immobilier',
    'opportunités immobilières internationales', 'investir immobilier étranger Canada',
    'placement immobilier République Dominicaine', 'CERDIA investisseur',
  ],
  alternates: { canonical: '/devenir-investisseur' },
  openGraph: {
    title: 'Devenir investisseur immobilier international — CERDIA',
    description:
      'Accédez à des opportunités immobilières exclusives à l\'international. Adhésion accompagnée, gestion professionnelle, suivi transparent.',
    url: '/devenir-investisseur',
    type: 'website',
  },
}

export default function DevenirInvestisseurLayout({ children }: { children: React.ReactNode }) {
  return children
}
