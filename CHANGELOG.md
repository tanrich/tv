# Changelog

All notable changes to **richBox** will be documented in this file.

## [Unreleased]

## [0.6.0] - 2026-05-06

### Features

-   **长按倍速播放**: PC 端长按左/右方向键、Mobile 端长按触摸屏幕，超过 500ms 触发 2x 倍速播放，松开恢复原速；倍速时显示 "⚡ 2x 倍速播放中" 视觉提示；touchmove 滑动自动取消长按 (`DetailView.vue`)

## [0.5.0] - 2026-04-30

### Features

-   **选集 Tab 分组**: 集数按 30 个一组拆分为 Tab 页签（如 1-30、31-60、61-84），下划线指示器风格；从历史记录跳转时自动高亮到正确的 Tab (`DetailView.vue`)
-   **选集网格布局**: 集数按钮改为固定 50×50px 正方形网格（移动端 44×44px），自动流式排列，替代原有平铺 Button (`DetailView.vue`)

## [0.4.2] - 2026-04-30

### Improvements

-   **PWA 横幅文案优化**: 标题改为「添加到桌面，沉浸式观影」，副文案精简；关闭时弹出确认「是否不再提示？」，支持永久关闭 (`PwaInstallBanner.vue`, `usePWAInstall.ts`)
-   **PWA 横幅自动关闭**: 横幅显示 5 秒后自动消失，减少打扰 (`usePWAInstall.ts`)
-   **按钮风格统一**: PWA 横幅按钮改用主站 CSS 变量，亮暗色主题自动适配 (`PwaInstallBanner.vue`)

## [0.4.1] - 2026-04-30

### Features

-   **连续播放**: 播放器设置新增「连续播放」开关，默认开启，播完自动播放下一集，状态持久化到 localStorage (`DetailView.vue`)
-   **预加载第1集**: 进入详情页自动预加载第1集视频，不自动播放，减少用户等待时间 (`DetailView.vue`)

### Bug Fixes

-   **播放器 autoSize 修复**: 关闭 ArtPlayer autoSize，修复 4:3 老片控制栏被截断的问题 (`DetailView.vue`)
-   **移动端播放器全宽**: 播放器用负 margin 突破 Card 内边距，占满屏幕宽度 (`DetailView.vue`)
-   **switchUrl 异步修复**: `await art.switchUrl(src)` 等加载完成再播放，避免异步竞争 (`DetailView.vue`)
-   **刷新详情页防抖动**: `isMobile` 同步初始化 + URL 有 vodId 时立即显示详情面板，避免先闪列表再切详情 (`SearchView.vue`)
-   **iOS 全屏适配**: 移除移动端对 fullscreenWeb 按钮的 CSS 隐藏，iOS/安卓均可使用网页全屏和原生全屏 (`base.css`, `DetailView.vue`)
-   **全屏标题栏样式**: fs-header 样式从 scoped 移至全局，修复全屏 DOM 提升后样式失效导致标题栏错乱 (`DetailView.vue`)

## [0.4.0] - 2026-04-30

### Features

-   **微信/QQ 内置浏览器引导**: 检测微信和 QQ 内置浏览器环境，PWA 安装横幅改为引导用户点击右上角用系统浏览器打开 (`usePWAInstall.ts`, `PwaInstallBanner.vue`)

## [0.3.1] - 2026-04-30

### Bug Fixes

-   **搜索下拉选项**: 点击搜索提示框下拉选项后直接展示搜索结果，修复 keyword 相同时不触发搜索的问题 (`SearchView.vue`)
-   **搜索框样式优化**: 去掉左侧搜索 icon，右侧搜索按钮改为填充高亮反色样式，提升可点击感知；首页和搜索页 compact 模式同步修改 (`SearchComponent.vue`)
-   **搜索结果位置**: 修复移动端只有一项搜索结果时显示在页面中间的问题 (`SearchView.vue`)
-   **图标大小对齐**: 统一主题切换和历史记录图标的视觉大小，时钟图标增加 2px 补偿线条型图标的视觉差异，PC/Mobile 四种场景均对齐 (`HistoryPanel.vue`, `SearchView.vue`)
-   **历史面板点击切换**: 支持点击历史记录图标打开/关闭面板，解决 hover 和 click 交互竞争问题 (`HistoryPanel.vue`)

## [0.3.0] - 2026-04-29

### Features

-   **全屏返回工具栏**: 移动端全屏播放时触摸显示顶部半透明工具栏，左侧返回按钮可退出全屏，受锁定状态控制 (`DetailView.vue`)
-   **全屏安全间距**: 全屏模式下底部控制栏增加 `safe-area-inset` 安全区域适配，防止按钮贴边 (`DetailView.vue`)
-   **PWA 支持**: 添加 manifest、Service Worker 和安装引导横幅，支持离线缓存和添加到主屏幕 (`PwaInstallBanner.vue`, `usePWAInstall.ts`, `vite.config.ts`)
-   **品牌更名**: 项目从 TV 更名为 richBox，全套图标更新（favicon、PWA 图标、apple-touch-icon）
-   **历史记录**: 基于 IndexedDB 的播放历史记录功能，支持记录播放进度和续播 (`useHistory.ts`, `useHistoryDB.ts`, `HistoryPanel.vue`)
-   **弹幕系统**: 集成 danmu API，自动匹配弹幕源并注入 ArtPlayer (`danmaku.ts`)
-   **主题切换**: 亮/暗色主题切换功能 (`useTheme.ts`)
-   **播放器增强**: ArtPlayer 集成 m3u8/HLS 播放、自动旋转、锁定、快进、Container Query 按钮自适应

### Bug Fixes

-   **移动端 header 响应式**: 修复移动端 header 中 logo、搜索框、主题切换、历史记录按钮拥挤重叠问题，优化 compact 模式下各组件尺寸 (`SearchView.vue`, `SearchComponent.vue`, `HistoryPanel.vue`)
-   **代理服务器**: 修复 proxy-server 使用 pathFilter 并调整端口配置 (`proxy-server.js`)

### Chores

-   添加 playwright-mcp 和 generated-images 到 .gitignore

## [0.2.0] - 2026-03-06

### Features

-   **项目重构**: 更新 README、代理服务器配置、API 接口和搜索页面，升级依赖

## [0.1.0] - 2024-07-28

### Initial Release

-   项目初始化：Vue 3 + TypeScript + Vite + view-ui-plus
-   在线影视搜索播放基础功能（搜索、详情、m3u8 播放）
-   代理服务器、发布脚本
