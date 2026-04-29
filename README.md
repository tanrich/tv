# richBox - 在线影视搜索播放器

基于 Vue 3 + TypeScript + Vite 构建的在线影视搜索与播放应用，支持影视搜索、详情查看、在线播放及弹幕功能。

## 功能特性

-   **影视搜索**：关键词搜索影视资源，支持分页浏览
-   **详情查看**：封面、导演、主演、类型、语言、地区、剧情简介等完整信息展示
-   **在线播放**：支持 m3u8 (HLS) 格式视频在线播放，基于 ArtPlayer 现代化播放器
-   **弹幕功能**：集成 artplayer-plugin-danmuku 弹幕插件，通过 danmu_api 服务自动匹配影视弹幕数据
-   **PWA 支持**：支持添加到桌面，移动端自动弹出安装引导横幅（Android 一键安装，iOS 操作引导）
-   **暗黑模式**：支持亮色/暗黑主题切换，默认跟随系统设置，支持手动一键切换
-   **响应式布局**：全范围自适应（手机/平板/PC），移动端采用列表与详情切换模式
-   **WAF 验证处理**：当 API 触发人机验证时，提供验证页面交互

## 技术栈

-   **框架**：Vue 3 + TypeScript
-   **构建工具**：Vite 5
-   **UI 组件库**：View UI Plus
-   **路由**：Vue Router 4
-   **播放器**：ArtPlayer.js + hls.js
-   **弹幕**：artplayer-plugin-danmuku + danmu_api
-   **HTTP 请求**：Axios
-   **代码规范**：ESLint + Prettier

## 项目结构

```
tv/
├── src/
│   ├── api/
│   │   ├── index.ts              # 影视搜索/详情 API
│   │   └── danmaku.ts            # 弹幕 API 封装
│   ├── composables/
│   │   ├── useTheme.ts           # 主题切换 composable
│   │   └── usePWAInstall.ts      # PWA 安装引导逻辑
│   ├── common/
│   │   └── util.ts               # 工具函数
│   ├── assets/
│   │   ├── base.css              # 全局样式、CSS 变量、主题系统
│   │   └── main.css              # 样式入口
│   ├── views/
│   │   ├── HomeView.vue          # 首页（搜索入口）
│   │   └── SearchView.vue        # 搜索结果页（列表 + 详情）
│   ├── components/
│   │   ├── SearchComponent.vue   # 搜索框组件
│   │   ├── DetailView.vue        # 影视详情 + 播放器 + 弹幕
│   │   └── PwaInstallBanner.vue  # PWA 安装引导横幅
│   ├── router/index.ts           # 路由配置
│   ├── App.vue
│   └── main.ts
├── proxy-server.js               # 生产环境代理服务器
├── publish.sh                    # 一键发布脚本
├── vite.config.ts                # Vite 配置
└── package.json
```

## 快速开始

### 安装依赖

```bash
pnpm install
```

### 启动弹幕服务（可选）

弹幕功能依赖 [danmu_api](https://github.com/huangxd-/danmu_api) 服务，推荐使用 Docker 启动：

```bash
docker run -d --name danmu-api -p 9321:9321 --restart unless-stopped logvar/danmu-api:latest
```

> macOS 用户可使用 [Colima](https://github.com/abiosoft/colima) 作为 Docker 运行时：`colima start` 后再执行上述命令。
>
> 如果不启动弹幕服务，视频播放功能不受影响，仅无弹幕显示。

### 本地开发

```bash
pnpm dev
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

## 键盘快捷键

播放器内置以下快捷键支持（由 ArtPlayer 提供）：

| 快捷键      | 功能         |
| ----------- | ------------ |
| `←` / `→`   | 快退 / 快进  |
| `↑` / `↓`   | 音量增 / 减  |
| `空格`      | 播放 / 暂停  |
| `F`         | 全屏切换     |

## 暗黑模式

应用支持亮色和暗黑两种主题模式：

-   **跟随系统**：默认跟随操作系统的颜色方案偏好自动切换
-   **手动切换**：点击页面右上角的太阳/月亮图标手动切换主题
-   **记忆偏好**：手动切换后，偏好会保存在 `localStorage` 中，下次访问自动应用

## 弹幕功能

弹幕数据来自 [danmu_api](https://github.com/huangxd-/danmu_api) 服务，支持从 20+ 个视频平台（爱奇艺、B 站、腾讯、优酷、芒果等）实时获取弹幕。

### 启动弹幕服务

**Docker（推荐）**：

```bash
docker run -d --name danmu-api -p 9321:9321 --restart unless-stopped logvar/danmu-api:latest
```

**Node.js 直接运行**：

```bash
git clone --depth 1 https://github.com/huangxd-/danmu_api.git
cd danmu_api && npm install --production
node danmu_api/server.js
```

服务默认监听 **9321** 端口，项目代理已配置好 `/danmaku` → `http://localhost:9321`，无需额外修改。

如需自定义弹幕服务地址，修改 `vite.config.ts`（开发环境）和 `proxy-server.js`（生产环境）中 `/danmaku` 的 `target` 即可。

> 弹幕功能为可选增强，即使 danmu_api 服务不可用，也不影响视频正常播放。

## 响应式适配

应用支持三种屏幕尺寸的自适应布局：

| 设备   | 断点            | 布局说明                                     |
| ------ | --------------- | -------------------------------------------- |
| 手机   | `≤ 768px`       | 列表与详情切换显示，详情页顶部有返回按钮     |
| 平板   | `769px ~ 1024px` | 左右分栏，列表区宽度缩窄                    |
| PC     | `> 1024px`      | 左右分栏，列表区固定宽度                     |

## 生产部署

项目使用 Express 代理服务器托管静态资源并转发 API 请求。

### 1. 构建项目

```bash
pnpm build
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

### 4. 在服务器上启动弹幕服务（可选）

```bash
docker run -d --name danmu-api -p 9321:9321 --restart unless-stopped logvar/danmu-api:latest
```

### 5. 启动应用服务

```bash
cd /data/tv
pnpm install --prod
node proxy-server.js
```

应用默认监听 **5173** 端口。

## API 代理说明

开发环境和生产环境均配置了以下代理规则：

| 本地路径       | 代理目标                            | 说明             |
| -------------- | ----------------------------------- | ---------------- |
| `/inc/*`       | `https://api.yzzy-api.com/inc/`     | 影视搜索/详情 API |
| `/proxy/WAF/*` | `https://api.yzzy-api.com/WAF/`     | WAF 验证代理     |
| `/danmaku/*`   | `http://localhost:9321`             | 弹幕 API 代理    |
