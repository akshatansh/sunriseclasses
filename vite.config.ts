import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        importScripts: ['https://cdn.pushalert.co/sw-89176.js'],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
        // ✅ Naya SW deploy hone par turant activate ho — purana cache wait na kare
        skipWaiting: true,
        clientsClaim: true,
        // ✅ HTML: hamesha network se fresh fetch karo (cache fallback hi ho)
        navigationPreload: true,
        runtimeCaching: [
          {
            // HTML pages — Network First: fresh content milega, fail pe cache
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'html-cache',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 }, // 1 day
            },
          },
          {
            // JS/CSS — StaleWhileRevalidate: fast load + background update
            urlPattern: /\.(js|css)$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'assets-cache',
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 7 }, // 7 days
            },
          },
        ],
      },
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: 'Sunrise Classes & Academy',
        short_name: 'Sunrise Classes',
        description: 'Best offline and online coaching for BSEB by SP Jha Sir',
        theme_color: '#dc2626',
        icons: [
          {
            src: 'favicon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'favicon-512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});

