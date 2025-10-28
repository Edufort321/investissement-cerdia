/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: false, // PWA activé en dev pour tester le prompt d'installation
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'supabase-cache',
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60 // 24 hours
        },
        networkTimeoutSeconds: 10
      }
    },
    {
      urlPattern: /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'image-cache',
        expiration: {
          maxEntries: 64,
          maxAgeSeconds: 30 * 24 * 60 * 60 // 30 days
        }
      }
    }
  ]
});

const isDev = process.env.NODE_ENV !== 'production';
const isCapacitor = process.env.BUILD_MODE === 'capacitor';

const nextConfig = {
  // Export statique pour Capacitor (mobile)
  ...(isCapacitor && {
    output: 'export',
    trailingSlash: true,
  }),
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  // i18n désactivé pour export statique
  ...(!isCapacitor && {
    i18n: {
      locales: ['fr', 'en'],
      defaultLocale: 'fr',
    },
  }),
  images: {
    remotePatterns: [
      // Domaines Amazon officiels
      { protocol: 'https', hostname: 'm.media-amazon.com' },
      { protocol: 'https', hostname: 'a.co' },
      { protocol: 'https', hostname: '**.amazonaws.com' },
      { protocol: 'https', hostname: '**.amazon.ca' },
      { protocol: 'https', hostname: '**.amazon.com' },

      // Ajouts recommandés
      { protocol: 'https', hostname: 'p16-sign-va.tiktokcdn.com' }, // TikTok
      { protocol: 'https', hostname: 'cdn.cerdia.ai' },             // Ton CDN futur
      { protocol: 'http', hostname: 'localhost' },                  // Tests locaux

      // Fallback généraux (attention : large ouverture)
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' }
    ],
    unoptimized: isDev || isCapacitor, // Désactivé en dev et pour Capacitor
  },
};

module.exports = withPWA(nextConfig);
