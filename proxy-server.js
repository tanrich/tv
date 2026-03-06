import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import axios from 'axios';
import { JSDOM } from 'jsdom';

const app = express();

app.use(express.static('dist'));
app.use(
    '/inc',
    createProxyMiddleware({
        target: 'https://api.yzzy-api.com/inc/',
        changeOrigin: true,
        proxyTimeout: 1000000,
        // pathRewrite: { '^/inc': '' }, // 如果需要路径重写，取消注释此行并设置相应的重写规则
    }),
);
app.use(
    '/proxy/WAF',
    createProxyMiddleware({
        target: 'https://api.yzzy-api.com/WAF/',
        changeOrigin: true,
        proxyTimeout: 1000000,
        // pathRewrite: { '^/inc': '' }, // 如果需要路径重写，取消注释此行并设置相应的重写规则
    }),
);
// app.get('/WAF/*', (req, res) => {
//     const newUrl = `https://api.yzzy-api.com${req.originalUrl}`;
//     axios.get(newUrl).then((newUrlRes) => {
//         const jsDom = new JSDOM(newUrlRes.data);
//         const form = jsDom.window.document.getElementsByTagName('form')[0];
//         form.action = '/proxy' + req.originalUrl;
//         const img = jsDom.window.document.getElementsByTagName('img')[0];
//         img.src = '/proxy' + img.src;
//         res.send({ code: 308, redirectHtmlData: jsDom.window.document.documentElement.innerHTML });
//     });
// });

app.listen(5173, () => {
    console.log('Proxy server is running on port 5173');
});
