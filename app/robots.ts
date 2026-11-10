import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/reviewer', '/api', '/auth', '/profile', '/reset-password'],
    },
    sitemap: 'https://www.arabicwithm.com/sitemap.xml',
    host: 'https://www.arabicwithm.com',
  }
}
