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
        importScripts: ['https://cdn.pushalert.co/sw-89176.js']
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
