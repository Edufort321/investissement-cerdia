import '../styles/globals.css'
import Navbar from '../components/Navbar'
import LanguageSwitcher from '../components/LanguageSwitcher'
import Script from 'next/script'

export const metadata = {
  title: 'Investissement CERDIA',
  description: 'Une vision d'envergure alliant IA, immobilier et formation haut de gamme.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        {/* Google AdSense Script */}
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7698570045125787"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
        
        {/* Configuration AdSense automatique (optionnel) */}
        <Script id="adsense-config" strategy="afterInteractive">
          {`
            (adsbygoogle = window.adsbygoogle || []).push({
              google_ad_client: "ca-pub-7698570045125787",
              enable_page_level_ads: true
            });
          `}
        </Script>
      </head>
      <body className="bg-gray-50 text-gray-800">
        {/* Langue en haut à droite */}
        <div className="flex justify-end px-6 pt-4">
          <LanguageSwitcher />
        </div>
        
        {/* Barre de navigation */}
        <Navbar />
        
        {/* Bannière publicitaire header (optionnelle) */}
        <div className="max-w-7xl mx-auto px-6 mb-4">
          <div className="bg-white rounded-lg shadow-sm border p-2">
            <div className="text-center mb-2">
              <span className="text-xs text-gray-500">Publicité</span>
            </div>
            <div style={{ textAlign: 'center', minHeight: '90px' }}>
              <Script id="header-ad" strategy="afterInteractive">
                {`
                  (adsbygoogle = window.adsbygoogle || []).push({});
                `}
              </Script>
              <ins
                className="adsbygoogle"
                style={{ display: 'block' }}
                data-ad-client="ca-pub-7698570045125787"
                data-ad-slot="VOTRE_SLOT_ID_HEADER" // À remplacer par votre slot ID
                data-ad-format="horizontal"
                data-full-width-responsive="true"
              />
            </div>
          </div>
        </div>
        
        {/* Contenu principal */}
        <main className="p-6 max-w-7xl mx-auto">
          {children}
        </main>
        
        {/* Bannière publicitaire footer (optionnelle) */}
        <div className="max-w-7xl mx-auto px-6 mt-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border p-2">
            <div className="text-center mb-2">
              <span className="text-xs text-gray-500">Publicité</span>
            </div>
            <div style={{ textAlign: 'center', minHeight: '90px' }}>
              <Script id="footer-ad" strategy="afterInteractive">
                {`
                  (adsbygoogle = window.adsbygoogle || []).push({});
                `}
              </Script>
              <ins
                className="adsbygoogle"
                style={{ display: 'block' }}
                data-ad-client="ca-pub-7698570045125787"
                data-ad-slot="VOTRE_SLOT_ID_FOOTER" // À remplacer par votre slot ID
                data-ad-format="horizontal"
                data-full-width-responsive="true"
              />
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
