/** @type {import('next').NextConfig} */
const nextConfig = {
  i18n: {
    locales: ['fr', 'en'],
    defaultLocale: 'fr',
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'm.media-amazon.com', // Images Amazon produit
      },
      {
        protocol: 'https',
        hostname: 'a.co', // Lien court (si redirige vers image)
      },
      {
        protocol: 'https',
        hostname: '**.amazonaws.com', // S3 ou autre stockage
      },
      {
        protocol: 'https',
        hostname: '**.amazon.ca', // optionnel selon les images utilisées
      },
    ],
  },
}

module.exports = nextConfig
