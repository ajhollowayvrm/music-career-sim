import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const BASE = '/music-career-sim/'

// https://vite.dev/config/
export default defineConfig({
  // Absolute (not './') because a PWA's start_url and scope must be absolute
  // paths, and they have to agree with where Pages actually serves this —
  // https://ajhollowayvrm.github.io/music-career-sim/. A relative base yields a
  // manifest iOS won't honor for a standalone Home Screen app.
  base: BASE,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // The whole game is static and offline-capable, so precache all of it —
      // the point is that a run works on the subway with no signal.
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: `${BASE}index.html`,
      },
      // No includeAssets: globPatterns above already sweeps public/, and listing
      // the icons again only duplicates them in the precache manifest.
      manifest: {
        id: BASE,
        start_url: BASE,
        scope: BASE,
        name: 'From the Bottom Up',
        // iOS truncates the Home Screen label around 12 chars.
        short_name: 'Bottom Up',
        description: 'A music career simulator. Bedroom demos to sold-out rooms.',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0b0a0d',
        theme_color: '#0b0a0d',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'pwa-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
})
