import '../styles/globals.css'
import Navbar from '../components/Navbar'

export const metadata = {
  title: 'Investissement CERDIA',
  description: 'Une vision d’envergure alliant IA, immobilier et formation haut de gamme.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="bg-gray-50 text-gray-800">
        {/* Barre de navigation */}
        <Navbar />

        {/* Contenu principal */}
        <main className="p-6 max-w-7xl mx-auto">
          {children}
        </main>
      </body>
    </html>
  )
}
