import Link from 'next/link'
import { Home } from 'lucide-react'

export const metadata = {
  title: 'Politique de confidentialité — CERDIA',
  description:
    'Politique de confidentialité de CERDIA concernant la collecte, l\'utilisation, le stockage et la sécurité des données.',
}

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-white dark:bg-gray-900 pt-20">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 mb-8 transition-colors"
        >
          <Home size={14} /> Retour à l&apos;accueil
        </Link>

        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Politique de confidentialité
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-10">
          Dernière mise à jour : <time dateTime="2026-05-10">10 mai 2026</time>
        </p>

        <article className="prose prose-gray dark:prose-invert max-w-none space-y-8 text-[15px] leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
              Collecte de données
            </h2>
            <p className="text-gray-700 dark:text-gray-300">
              CERDIA collecte les données nécessaires à la gestion de notre compte vendeur
              Amazon (commandes, inventaire, campagnes publicitaires, données de performance)
              via les API officielles Amazon (Selling Partner API et Amazon Ads API).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
              Utilisation des données
            </h2>
            <p className="text-gray-700 dark:text-gray-300">
              Les données sont utilisées exclusivement pour la gestion interne de notre compte
              vendeur. Aucune donnée n&apos;est partagée, vendue ou cédée à des tiers.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
              Stockage et sécurité
            </h2>
            <p className="text-gray-700 dark:text-gray-300">
              Les données sont stockées sur Supabase (PostgreSQL chiffré au repos).
              L&apos;accès est limité aux administrateurs CERDIA via authentification Supabase
              Auth avec MFA. Les refresh tokens sont chiffrés en AES-256-GCM avant leur stockage.
              Le transport est protégé par TLS&nbsp;1.3.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
              Conservation
            </h2>
            <p className="text-gray-700 dark:text-gray-300">
              Les données sont conservées tant que nécessaires à l&apos;exploitation du compte
              vendeur. Sur demande, des données spécifiques peuvent être supprimées dès lors
              qu&apos;elles ne sont plus requises pour les obligations comptables et fiscales.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
              Contact
            </h2>
            <p className="text-gray-700 dark:text-gray-300">
              Pour toute question concernant la confidentialité, contacter{' '}
              <a
                href="mailto:eric.dufort@cerdia.ai"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                eric.dufort@cerdia.ai
              </a>
              .
            </p>
          </section>
        </article>

        <div className="mt-12 pt-6 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
          <p>
            Cette politique s&apos;applique à l&apos;utilisation des API Amazon Selling Partner
            et Amazon Advertising par CERDIA. Pour la politique d&apos;Amazon, consulter{' '}
            <a
              href="https://www.amazon.com/gp/help/customer/display.html?nodeId=GX7NJQ4ZB8MHFRNJ"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Amazon Privacy Notice
            </a>
            .
          </p>
        </div>
      </div>
    </main>
  )
}
