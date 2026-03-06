# TV - 在线影视搜索播放器

基于 Vue 3 + TypeScript + Vite 构建的在线影视搜索与播放应用，支持影视搜索、详情查看及在线播放。

## 技术栈

-   **框架**：Vue 3 + TypeScript
-   **构建工具**：Vite 5
-   **UI 组件库**：View UI Plus
-   **状态管理**：Pinia
-   **路由**：Vue Router 4
-   **播放器**：Video.js
-   **HTTP 请求**：Axios
-   **代码规范**：ESLint + Prettier

## 项目结构

```
tv/
├── src/
│   ├── api/            # 接口请求封装
│   ├── assets/         # 静态资源
│   ├── common/         # 公共工具函数
│   ├── components/     # 公共组件（详情、搜索等）
│   ├── router/         # 路由配置
│   ├── stores/         # Pinia 状态管理
│   ├── views/          # 页面视图
│   ├── App.vue
│   └── main.ts
├── proxy-server.js     # 生产环境代理服务器
├── publish.sh          # 一键发布脚本
└── vite.config.ts      # Vite 配置
```

## 快速开始

### 安装依赖

```bash
npm install
```

### 本地开发

```bash
npm run dev
```

启动后访问 [http://localhost:5173](http://localhost:5173)

### 类型检查

```bash
npm run type-check
```

### 代码格式化

```bash
npm run format
npm run lint
```

### 构建生产包

```bash
npm run build
```

构建产物输出至 `dist/` 目录。

## 生产部署

项目使用 Express 代理服务器托管静态资源并转发 API 请求。

### 1. 构建项目

```bash
npm run build
```

### 2. 配置发布脚本

编辑 `publish.sh`，将 `remote_ip` 替换为实际服务器 IP：

```bash
remote_ip="YOUR_SERVER_IP"
```

### 3. 一键发布

```bash
bash publish.sh
```

脚本会通过 `rsync` 将 `dist/`、`package.json`、`proxy-server.js` 同步到远程服务器的 `/data/tv` 目录。

### 4. 在服务器上启动

```bash
cd /data/tv
npm install --production
node proxy-server.js
```

服务默认监听 **5173** 端口。

## API 代理说明

开发环境和生产环境均配置了以下代理规则：

| 本地路径       | 代理目标                        |
| -------------- | ------------------------------- |
| `/inc/*`       | `https://api.yzzy-api.com/inc/` |
| `/proxy/WAF/*` | `https://api.yzzy-api.com/WAF/` |
