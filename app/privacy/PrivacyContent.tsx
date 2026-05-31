'use client'

import { useLanguage } from '@/contexts/LanguageContext'

export default function PrivacyContent() {
  const { language } = useLanguage()
  const fr = language === 'fr'

  return (
    <main className="min-h-screen bg-white dark:bg-gray-900 pt-20">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          {fr ? 'Politique de confidentialité' : 'Privacy Policy'}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-10">
          {fr ? 'Dernière mise à jour :' : 'Last updated:'}{' '}
          <time dateTime="2026-05-10">{fr ? '10 mai 2026' : 'May 10, 2026'}</time>
        </p>

        <article className="prose prose-gray dark:prose-invert max-w-none space-y-8 text-[15px] leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
              {fr ? 'Collecte de données' : 'Data Collection'}
            </h2>
            <p className="text-gray-700 dark:text-gray-300">
              {fr
                ? "CERDIA collecte les données nécessaires à la gestion de notre compte vendeur Amazon (commandes, inventaire, campagnes publicitaires, données de performance) via les API officielles Amazon (Selling Partner API et Amazon Ads API)."
                : "CERDIA collects data necessary for managing our Amazon seller account (orders, inventory, advertising campaigns, performance data) via official Amazon APIs (Selling Partner API and Amazon Ads API)."}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
              {fr ? 'Utilisation des données' : 'Data Use'}
            </h2>
            <p className="text-gray-700 dark:text-gray-300">
              {fr
                ? "Les données sont utilisées exclusivement pour la gestion interne de notre compte vendeur. Aucune donnée n'est partagée, vendue ou cédée à des tiers."
                : "Data is used exclusively for the internal management of our seller account. No data is shared, sold, or transferred to third parties."}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
              {fr ? 'Stockage et sécurité' : 'Storage & Security'}
            </h2>
            <p className="text-gray-700 dark:text-gray-300">
              {fr
                ? "Les données sont stockées sur Supabase (PostgreSQL chiffré au repos). L'accès est limité aux administrateurs CERDIA via authentification Supabase Auth avec MFA. Les refresh tokens sont chiffrés en AES-256-GCM avant leur stockage. Le transport est protégé par TLS 1.3."
                : "Data is stored on Supabase (PostgreSQL encrypted at rest). Access is limited to CERDIA administrators via Supabase Auth with MFA. Refresh tokens are encrypted using AES-256-GCM before storage. Transport is protected by TLS 1.3."}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
              {fr ? 'Conservation' : 'Data Retention'}
            </h2>
            <p className="text-gray-700 dark:text-gray-300">
              {fr
                ? "Les données sont conservées tant que nécessaires à l'exploitation du compte vendeur. Sur demande, des données spécifiques peuvent être supprimées dès lors qu'elles ne sont plus requises pour les obligations comptables et fiscales."
                : "Data is retained as long as necessary for the operation of the seller account. Upon request, specific data may be deleted once it is no longer required for accounting and tax obligations."}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
              {fr ? 'Contact' : 'Contact'}
            </h2>
            <p className="text-gray-700 dark:text-gray-300">
              {fr ? 'Pour toute question concernant la confidentialité, contacter' : 'For any privacy-related questions, contact'}{' '}
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
            {fr
              ? <>Cette politique s&apos;applique à l&apos;utilisation des API Amazon Selling Partner et Amazon Advertising par CERDIA. Pour la politique d&apos;Amazon, consulter{' '}</>
              : <>This policy applies to CERDIA&apos;s use of the Amazon Selling Partner and Amazon Advertising APIs. For Amazon&apos;s policy, see{' '}</>}
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
