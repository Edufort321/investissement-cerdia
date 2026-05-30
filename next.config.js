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
    // ⚠️ SÉCURITÉ : liste blanche stricte. Un wildcard '**' transforme l'optimiseur
    // d'images Next en proxy SSRF (fetch de n'importe quelle URL). On n'autorise que
    // les domaines réellement utilisés.
    remotePatterns: [
      { protocol: 'https', hostname: 'm.media-amazon.com' },
      { protocol: 'https', hostname: 'a.co' },
      { protocol: 'https', hostname: '**.amazonaws.com' },
      { protocol: 'https', hostname: '**.amazon.ca' },
      { protocol: 'https', hostname: '**.amazon.com' },
      { protocol: 'https', hostname: 'p16-sign-va.tiktokcdn.com' },
      { protocol: 'https', hostname: 'cdn.cerdia.ai' },
      { protocol: 'https', hostname: 'svwolnvknfmakgmjhoml.supabase.co' }, // Storage Supabase
      ...(isDev ? [{ protocol: 'http', hostname: 'localhost' }] : []),
    ],
    unoptimized: isDev || isCapacitor, // Désactivé en dev et pour Capacitor
  },
  // ⚠️ SÉCURITÉ : en-têtes HTTP appliqués à toutes les routes (sauf export Capacitor,
  // qui n'a pas de serveur). Protège contre clickjacking, sniffing, fuite de referrer.
  ...(!isCapacitor && {
    async headers() {
      return [
        {
          source: '/:path*',
          headers: [
            // HSTS : force HTTPS (2 ans, sous-domaines, preload-ready)
            { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
            // Anti-clickjacking (l'app ne doit pas être embarquée en iframe tierce)
            { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
            // Anti MIME-sniffing
            { key: 'X-Content-Type-Options', value: 'nosniff' },
            // Ne fuit pas l'URL complète en referrer cross-origin
            { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
            // Réduit les APIs navigateur accessibles
            { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self), payment=()' },
            // Empêche le navigateur de traiter le site comme un domaine de confiance FLoC
            { key: 'X-DNS-Prefetch-Control', value: 'on' },
          ],
        },
      ]
    },
  }),
};

module.exports = withPWA(nextConfig);
