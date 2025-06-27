/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV !== 'production';

const nextConfig = {
  i18n: {
    locales: ['fr', 'en'],
    defaultLocale: 'fr',
  },
  images: {
    remotePatterns: [
      // Amazon
      { protocol: 'https', hostname: 'm.media-amazon.com' },
      { protocol: 'https', hostname: 'a.co' },
      { protocol: 'https', hostname: '**.amazonaws.com' },
      { protocol: 'https', hostname: '**.amazon.ca' },
      { protocol: 'https', hostname: '**.amazon.com' },

      // TikTok CDN
      { protocol: 'https', hostname: 'p16-sign-va.tiktokcdn.com' },

      // Ton futur CDN personnalisé ou Cloudflare
      { protocol: 'https', hostname: 'cdn.cerdia.ai' },

      // Optionnel : localhost pour tests
      { protocol: 'http', hostname: 'localhost' }
    ],
    // Pour activer l'affichage immédiat sans erreur en dev
    unoptimized: isDev,
  },
  // Optionnel : Pour activer les fichiers statiques sitemap/robots plus tard
  // output: 'export',
};

module.exports = nextConfig;

