import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'graphchat',
    short_name: 'graphchat',
    description: 'Persistent repository graphs for humans and AI agents.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#050816',
    theme_color: '#0b1220',
    icons: [
      {
        src: '/logo.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
      {
        src: '/logo.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
