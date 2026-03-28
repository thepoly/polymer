import type { MetadataRoute } from 'next'
 
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'The Polytechnic',
    short_name: 'The Poly',
    description: 'Serving the Rensselaer Community Since 1885',
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
