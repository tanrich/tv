import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [vue(), vueJsx(), wasm(), topLevelAwait()],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
            'jieba-wasm': fileURLToPath(new URL('./node_modules/jieba-wasm/pkg/bundler/jieba_rs_wasm.js', import.meta.url)),
        },
    },
    server: {
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
