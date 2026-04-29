import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        vue(),
        vueJsx(),
        wasm(),
        topLevelAwait(),
        VitePWA({
            registerType: 'autoUpdate',
            manifest: {
                name: 'richBox',
                short_name: 'richBox',
                description: '影视资源搜索与播放',
                theme_color: '#4285f4',
                background_color: '#ffffff',
                display: 'standalone',
                start_url: '/',
                icons: [
                    { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
                    { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
                    { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
                ],
            },
            workbox: {
                globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
                runtimeCaching: [
                    {
                        urlPattern: /^https:\/\/api\.yzzy-api\.com\/.*/i,
                        handler: 'NetworkFirst',
                        options: { cacheName: 'api-cache', expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 } },
                    },
                ],
                navigateFallback: 'index.html',
            },
        }),
    ],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
            'jieba-wasm': fileURLToPath(new URL('./node_modules/jieba-wasm/pkg/bundler/jieba_rs_wasm.js', import.meta.url)),
        },
    },
    server: {
        host: '0.0.0.0',
        proxy: {
            '/inc': {
                target: 'https://api.yzzy-api.com',
                changeOrigin: true,
                timeout: 1000000,
            },
            '/proxy/WAF': {
                target: 'https://api.yzzy-api.com',
                changeOrigin: true,
                timeout: 1000000,
                rewrite: (path) => path.replace(/^\/proxy/, ''),
            },
            '/WAF': {
                target: 'https://api.yzzy-api.com',
                changeOrigin: true,
                timeout: 1000000,
            },
            '/danmaku': {
                target: 'http://localhost:9321',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/danmaku/, ''),
            },
        },
    },
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    artplayer: ['artplayer'],
                    iview: ['view-ui-plus'],
                },
            },
        },
    },
});
