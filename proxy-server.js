import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();

app.use(express.static('dist'));
app.use(
    createProxyMiddleware({
        target: 'https://api.yzzy-api.com',
        changeOrigin: true,
        proxyTimeout: 1000000,
        pathFilter: '/inc',
    }),
);
app.use(
    createProxyMiddleware({
        target: 'https://api.yzzy-api.com',
        changeOrigin: true,
        proxyTimeout: 1000000,
        pathFilter: '/proxy/WAF',
        pathRewrite: { '^/proxy': '' },
    }),
);
app.use(
    createProxyMiddleware({
        target: 'http://localhost:9321',
        changeOrigin: true,
        pathFilter: '/danmaku',
        pathRewrite: { '^/danmaku': '' },
    }),
);

app.listen(8001, () => {
    console.log('Proxy server is running on port 8001');
});
