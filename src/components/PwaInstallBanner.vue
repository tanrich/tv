<script setup lang="ts">
import { usePWAInstall } from '@/composables/usePWAInstall';

const { showBanner, isIOS, install, dismiss } = usePWAInstall();
</script>

<template>
    <Transition name="pwa-slide">
        <div v-if="showBanner" class="pwa-banner">
            <div class="pwa-banner__body">
                <div class="pwa-banner__icon">
                    <img src="/pwa-192x192.png" alt="richBox" width="40" height="40" />
                </div>
                <div class="pwa-banner__text">
                    <span class="pwa-banner__title">richBox</span>
                    <span class="pwa-banner__desc" v-if="!isIOS">安装到桌面，体验更流畅</span>
                    <span class="pwa-banner__desc" v-else>
                        点击
                        <svg class="pwa-banner__share-icon" width="14" height="14" viewBox="0 0 24 24" fill="none">
                            <path d="M12 2L12 16M12 2L7 7M12 2L17 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M4 14V19C4 20.1 4.9 21 6 21H18C19.1 21 20 20.1 20 19V14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        然后「添加到主屏幕」
                    </span>
                </div>
                <button v-if="!isIOS" class="pwa-banner__install" @click="install">
                    安装
                </button>
                <button class="pwa-banner__close" @click="dismiss" aria-label="关闭">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                    </svg>
                </button>
            </div>
        </div>
    </Transition>
</template>

<style scoped lang="less">
.pwa-banner {
    position: fixed;
    bottom: 16px;
    left: 16px;
    right: 16px;
    z-index: 99999;
    border-radius: 16px;
    padding: 16px;
    background: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    box-shadow:
        0 8px 32px rgba(0, 0, 0, 0.08),
        0 2px 8px rgba(0, 0, 0, 0.04);
    border: 1px solid rgba(0, 0, 0, 0.06);

    &__close {
        flex-shrink: 0;
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: none;
        background: transparent;
        color: var(--text-tertiary);
        cursor: pointer;
        border-radius: 50%;
        transition: background 0.2s, color 0.2s;
        padding: 0;
        margin-left: 4px;

        &:active {
            background: rgba(0, 0, 0, 0.08);
            color: var(--text-primary);
        }
    }

    &__body {
        display: flex;
        align-items: center;
        gap: 12px;
    }

    &__icon {
        flex-shrink: 0;
        width: 40px;
        height: 40px;
        border-radius: 10px;
        overflow: hidden;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

        img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
    }

    &__text {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

    &__title {
        font-size: 15px;
        font-weight: 600;
        color: var(--text-primary);
        line-height: 1.3;
    }

    &__desc {
        font-size: 12px;
        color: var(--text-secondary);
        line-height: 1.4;
        display: flex;
        align-items: center;
        gap: 2px;
        flex-wrap: wrap;
    }

    &__share-icon {
        display: inline-block;
        vertical-align: middle;
        color: #4285f4;
        flex-shrink: 0;
    }

    &__install {
        flex-shrink: 0;
        height: 34px;
        padding: 0 20px;
        border: none;
        border-radius: 17px;
        background: #4285f4;
        color: #fff;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: background 0.2s, transform 0.15s;
        white-space: nowrap;

        &:active {
            background: #3367d6;
            transform: scale(0.96);
        }
    }
}

/* 暗色模式 */
html[data-theme="dark"] .pwa-banner,
:global(html:not([data-theme])) .pwa-banner {
    /* 默认亮色，暗色模式下覆盖 */
}

html[data-theme="dark"] .pwa-banner {
    background: rgba(40, 40, 40, 0.85);
    border-color: rgba(255, 255, 255, 0.08);
    box-shadow:
        0 8px 32px rgba(0, 0, 0, 0.3),
        0 2px 8px rgba(0, 0, 0, 0.2);
}

html[data-theme="dark"] .pwa-banner__close:active {
    background: rgba(255, 255, 255, 0.1);
}

html[data-theme="dark"] .pwa-banner__install {
    background: #8ab4f8;
    color: #202124;
}

html[data-theme="dark"] .pwa-banner__install:active {
    background: #6d9de8;
}

@media (prefers-color-scheme: dark) {
    html:not([data-theme]) .pwa-banner {
        background: rgba(40, 40, 40, 0.85);
        border-color: rgba(255, 255, 255, 0.08);
        box-shadow:
            0 8px 32px rgba(0, 0, 0, 0.3),
            0 2px 8px rgba(0, 0, 0, 0.2);
    }

    html:not([data-theme]) .pwa-banner__close:active {
        background: rgba(255, 255, 255, 0.1);
    }

    html:not([data-theme]) .pwa-banner__install {
        background: #8ab4f8;
        color: #202124;
    }

    html:not([data-theme]) .pwa-banner__install:active {
        background: #6d9de8;
    }
}

/* 仅移动端显示 */
@media screen and (min-width: 769px) {
    .pwa-banner {
        display: none;
    }
}

/* 动画 */
.pwa-slide-enter-active {
    transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s ease;
}

.pwa-slide-leave-active {
    transition: transform 0.3s cubic-bezier(0.5, 0, 0.75, 0), opacity 0.3s ease;
}

.pwa-slide-enter-from {
    transform: translateY(100%);
    opacity: 0;
}

.pwa-slide-leave-to {
    transform: translateY(100%);
    opacity: 0;
}
</style>
