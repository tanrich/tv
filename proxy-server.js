import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();

app.use(express.static('dist'));
app.use(
    '/inc',
    createProxyMiddleware({
        target: 'https://api.1080zyku.com/inc/',
        changeOrigin: true,
        // pathRewrite: { '^/inc': '' }, // 如果需要路径重写，取消注释此行并设置相应的重写规则
    }),
);

app.listen(5173, () => {
    console.log('Proxy server is running on port 5173');
});
