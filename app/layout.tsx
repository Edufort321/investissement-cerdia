import '../styles/globals.css'
import NavbarWrapper from '../components/NavbarWrapper'
import PWAWarning from '../components/PWAWarning'
import SuperAdminViewBanner from '../components/SuperAdminViewBanner'
import { Providers } from '../components/Providers'
import CookieConsent from '../components/CookieConsent'
import ConsentedAds from '../components/ConsentedAds'

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://cerdia.ai'
const SITE_DESCRIPTION =
  'CERDIA — Plateforme d\'investissement immobilier international alliant intelligence artificielle, ' +
  'gestion de portefeuille et formation haut de gamme. Investissez au Canada, en République Dominicaine et en Floride.'

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'CERDIA — Investissement immobilier international & IA',
    template: '%s | CERDIA',
  },
  description: SITE_DESCRIPTION,
  keywords: [
    'CERDIA', 'investissement immobilier', 'immobilier international', 'République Dominicaine',
    'Floride', 'Canada', 'NAV', 'gestion de portefeuille', 'intelligence artificielle',
    'investisseur', 'rendement immobilier',
  ],
  authors: [{ name: 'CERDIA' }],
  manifest: '/manifest.json',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'fr_CA',
    url: SITE_URL,
    siteName: 'CERDIA',
    title: 'CERDIA — Investissement immobilier international & IA',
    description: SITE_DESCRIPTION,
    images: [{ url: '/logo-cerdia3.png', width: 1200, height: 630, alt: 'CERDIA' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CERDIA — Investissement immobilier international & IA',
    description: SITE_DESCRIPTION,
    images: ['/logo-cerdia3.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'CERDIA',
  },
  formatDetection: {
    telephone: false,
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#5e5e5e',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        <meta name="theme-color" content="#5e5e5e" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="CERDIA" />
      </head>
      <body className="bg-gray-50 text-gray-800 dark:bg-gray-900 dark:text-gray-100 transition-colors duration-300">
        <Providers>
          <SuperAdminViewBanner />
          <PWAWarning />
          <NavbarWrapper />
          <main>
            {children}
          </main>
          <CookieConsent />
          <ConsentedAds />
        </Providers>
      </body>
    </html>
  )
}
