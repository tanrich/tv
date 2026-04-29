import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();

app.use(express.static('dist'));
app.use(
    '/inc',
    createProxyMiddleware({
        target: 'https://api.yzzy-api.com',
        changeOrigin: true,
        proxyTimeout: 1000000,
    }),
);
app.use(
    '/proxy/WAF',
    createProxyMiddleware({
        target: 'https://api.yzzy-api.com',
        changeOrigin: true,
        proxyTimeout: 1000000,
        pathRewrite: { '^/proxy': '' },
    }),
);
app.use(
    '/danmaku',
    createProxyMiddleware({
        target: 'http://localhost:9321',
        changeOrigin: true,
        pathRewrite: { '^/danmaku': '' },
    }),
);

app.listen(5173, () => {
    console.log('Proxy server is running on port 5173');
});
