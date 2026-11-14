import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Wordmet',
    short_name: 'Wordmet',
    start_url: '/',
    display: 'browser',
    // The light page background (`--color-wm-bg`, design §11); the dark one only fits viewport.themeColor ([locale]/layout.tsx).
    background_color: '#f6f7fa',
    theme_color: '#f6f7fa',
    icons: [
      { src: '/icon.svg', type: 'image/svg+xml', sizes: 'any' },
      { src: '/apple-icon.png', type: 'image/png', sizes: '180x180' },
      { src: '/icon-192.png', type: 'image/png', sizes: '192x192' },
      { src: '/icon-512.png', type: 'image/png', sizes: '512x512' },
    ],
  };
}
