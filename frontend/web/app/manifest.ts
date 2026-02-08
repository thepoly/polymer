import type { MetadataRoute } from 'next'
 
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'The Polytechnic',
    short_name: 'The Polytechnic',
    description: 'Serving the Rensselaer Community Since 1885',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#D6001C',
    icons: [
      {
        src: '/dynamicPfavicon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  }
}