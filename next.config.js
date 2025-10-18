/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV !== 'production';

const nextConfig = {
  i18n: {
    locales: ['fr', 'en'],
    defaultLocale: 'fr',
  },
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
    unoptimized: isDev, // Optimisation désactivée en dev uniquement
  },
};

module.exports = nextConfig;
