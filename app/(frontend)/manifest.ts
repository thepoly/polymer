import type { MetadataRoute } from 'next'
import { getSeo } from '@/lib/getSeo'
 
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const seo = await getSeo()

  return {
    name: seo.siteIdentity.siteName,
    short_name: seo.siteIdentity.siteShortName,
    description: seo.siteIdentity.manifestDescription,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    display_override: ['standalone', 'minimal-ui', 'browser'],
    orientation: 'portrait',
    background_color: '#ffffff',
    theme_color: '#ffffff',
    icons: [
      {
        src: '/static-app-icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  }
}
