import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  poweredByHeader: false,
  compress: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: [
      { protocol: 'https', hostname: 'i.ytimg.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'ichef.bbci.co.uk' },
      { protocol: 'https', hostname: 's.france24.com' },
      { protocol: 'https', hostname: 'cnn-arabic-images.cnn.io' },
      { protocol: 'https', hostname: 'images.skynewsarabia.com' },
      { protocol: 'https', hostname: 'www.akhbarona.com' },
    ],
  },
  experimental: {
    optimizePackageImports: [
      '@mui/material',
      '@mui/icons-material',
      '@dnd-kit/core',
      '@dnd-kit/sortable',
      'lucide-react',
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.youtube.com https://s.ytimg.com https://www.youtube.com/iframe_api",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https://i.ytimg.com https://*.tiktokcdn.com https://*.cdninstagram.com https://*.fbcdn.net https://images.unsplash.com https://ichef.bbci.co.uk https://s.france24.com https://cnn-arabic-images.cnn.io https://images.skynewsarabia.com https://www.akhbarona.com",
              "connect-src 'self' https://whbxgwucsoguqzpnpzjd.supabase.co",
              "frame-src https://www.youtube.com https://youtube.com https://www.youtube-nocookie.com https://youtube-nocookie.com https://www.instagram.com https://instagram.com https://www.tiktok.com https://www.facebook.com https://web.facebook.com",
            ].join('; '),
          },
        ],
      },
      {
        source: '/:path*\\.(woff2?|ttf|otf|eot)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ]
  },
};

export default nextConfig;
