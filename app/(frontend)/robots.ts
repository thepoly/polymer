import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://poly.rpi.edu';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/admin/*', '/newsroom', '/newsroom/*', '/api/*'],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
