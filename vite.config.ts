import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8'))

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: [
        'favicon.ico',
        'favicon.svg',
        'favicon-16x16.png',
        'favicon-32x32.png',
        'apple-touch-icon.png',
        'icons/*.png',
      ],
      manifest: {
        name: 'iFace · 面试刷题助手',
        short_name: 'iFace',
        description: '面试刷题助手，覆盖 JS、Golang、Java、网络、项目实践等核心模块',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        lang: 'zh-CN',
        icons: [
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/icon-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/icons/icon-maskable-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,json,webmanifest}'],
        globIgnores: [
          '**/assets/pdf.worker-*.mjs',
          '**/assets/pdf-*.js',
          '**/assets/mammoth.browser-*.js',
          // Official banks are copied into IndexedDB on first load, so they are cached at
          // runtime instead of precached (~5 MB). The JSON Schema is only for bank authors.
          '**/banks/**',
          '**/schema/**',
        ],
        // Never let the Service Worker intercept /api/* requests —
        // those must always reach the Vercel serverless functions via the network.
        navigateFallbackDenylist: [/^\/api\//],
        // RegExp patterns are matched against the full URL, so same-origin routes match on
        // the pathname instead.
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkOnly',
          },
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/banks/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'bank-data',
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 120 },
            },
          },
          {
            urlPattern: ({ url }) =>
              /^\/assets\/(?:pdf|pdf\.worker|mammoth\.browser)-.*\.(?:js|mjs)$/i.test(url.pathname),
            handler: 'CacheFirst',
            options: {
              cacheName: 'document-parser-chunks',
              expiration: {
                maxEntries: 6,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
            },
          },
        ],
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        // React and the router change far less often than app code, so they get their own
        // long-lived chunk.
        manualChunks(id) {
          if (/[\\/]node_modules[\\/](react|react-dom|react-router|scheduler)[\\/]/.test(id)) {
            return 'react'
          }
        },
      },
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
})
