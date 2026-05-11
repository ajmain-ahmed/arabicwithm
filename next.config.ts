import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,   // ← add this line
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
              "img-src 'self' data: blob: https://i.ytimg.com",
              "connect-src 'self' https://whbxgwucsoguqzpnpzjd.supabase.co",
              "frame-src https://www.youtube.com https://youtube.com",
            ].join('; '),
          },
        ],
      },
    ]
  },
};

export default nextConfig;