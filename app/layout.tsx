import '../styles/globals.css'
import Navbar from '../components/Navbar'
import { Providers } from '../components/Providers'
import Script from 'next/script'

export const metadata = {
  title: 'Investissement CERDIA',
  description: 'Une vision d\'envergure alliant IA, immobilier et formation haut de gamme.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7698570045125787"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </head>
      <body className="bg-gray-50 text-gray-800">
        <Providers>
          <Navbar />
          <main>
            {children}
          </main>
        </Providers>
      </body>
    </html>
  )
}
