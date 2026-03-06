import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx';
import axios from 'axios';
import { JSDOM } from 'jsdom';

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [vue(), vueJsx()],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
        },
    },
    server: {
        // http://localhost:5173/api/login -> http://www.test.com/login
        proxy: {
            '/inc': {
                target: 'https://api.yzzy-api.com/inc/',
                changeOrigin: true,
                timeout: 1000000,
                // rewrite: (path) => path.replace(/^\/inc/, '') // Uncomment if path rewrite is needed
            },
            '/proxy/WAF': {
                target: 'https://api.yzzy-api.com/WAF/',
                changeOrigin: true,
                timeout: 1000000,
                // rewrite: (path) => path.replace(/^\/inc/, '') // Uncomment if path rewrite is needed
            },
            '/WAF': {
                target: 'https://api.yzzy-api.com',
                changeOrigin: true,
                timeout: 1000000,
                bypass: (req, res) => {
                    // console.log(11111, req.originalUrl);
                    // const newUrl = `https://api.yzzy-api.com${req.originalUrl}`;
                    // axios.get(newUrl).then((newUrlRes) => {
                    //     const jsDom = new JSDOM(newUrlRes.data);
                    //     const form = jsDom.window.document.getElementsByTagName('form')[0];
                    //     form.action = '/proxy' + req.originalUrl;
                    //     const img = jsDom.window.document.getElementsByTagName('img')[0];
                    //     img.src = '/proxy' + img.src;
                    //     res.
                    //     res.send({ code: 308, redirectHtmlData: jsDom.window.document.documentElement.innerHTML });
                    // });
                },
            },
        },
    },
    build: {
        rollupOptions: {
            external: ['video.js/dist/types/player'],
            output: {
                manualChunks: {
                    videoJs: ['video.js'],
                    iview: ['view-ui-plus'],
                },
            },
        },
    },
});
