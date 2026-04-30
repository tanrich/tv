<script setup lang="ts">
import { ref } from 'vue';
import { usePWAInstall } from '@/composables/usePWAInstall';

const { showBanner, isIOS, inApp, install, dismiss, dismissForever, cancelAutoClose } = usePWAInstall();
const confirming = ref(false);

function onClose() {
    cancelAutoClose();
    confirming.value = true;
}
</script>

<template>
    <Transition name="pwa-slide">
        <div v-if="showBanner" class="pwa-banner">
            <!-- 确认模式 -->
            <div v-if="confirming" class="pwa-banner__confirm">
                <span class="pwa-banner__confirm-text">是否不再提示？</span>
                <div class="pwa-banner__confirm-actions">
                    <button class="pwa-banner__confirm-btn pwa-banner__confirm-btn--yes" @click="dismissForever">是</button>
                    <button class="pwa-banner__confirm-btn pwa-banner__confirm-btn--no" @click="dismiss">否</button>
                </div>
            </div>
            <!-- 正常模式 -->
            <div v-else class="pwa-banner__body">
                <div class="pwa-banner__icon">
                    <img src="/pwa-192x192.png" alt="richBox" width="40" height="40" />
                </div>
                <div class="pwa-banner__text">
                    <span class="pwa-banner__title">添加到桌面，沉浸式观影</span>
                    <span class="pwa-banner__desc" v-if="inApp">
                        点击右上角
                        <svg class="pwa-banner__more-icon" width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <circle cx="5" cy="12" r="2" fill="currentColor"/>
                            <circle cx="12" cy="12" r="2" fill="currentColor"/>
                            <circle cx="19" cy="12" r="2" fill="currentColor"/>
                        </svg>
                        用浏览器打开
                    </span>
                    <span class="pwa-banner__desc" v-else-if="isIOS">
                        点击底部
                        <svg class="pwa-banner__share-icon" width="14" height="14" viewBox="0 0 24 24" fill="none">
                            <path d="M12 2L12 16M12 2L7 7M12 2L17 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M4 14V19C4 20.1 4.9 21 6 21H18C19.1 21 20 20.1 20 19V14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        → 添加到主屏幕
                    </span>
                    <span class="pwa-banner__desc" v-else>一键安装，随时畅享</span>
                </div>
                <button v-if="!isIOS && !inApp" class="pwa-banner__install" @click="install">
                    安装
                </button>
                <button class="pwa-banner__close" @click="onClose" aria-label="关闭">
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

    &__confirm {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
    }

    &__confirm-text {
        font-size: 14px;
        font-weight: 500;
        color: var(--text-primary);
    }

    &__confirm-actions {
        display: flex;
        gap: 8px;
        flex-shrink: 0;
    }

    &__confirm-btn {
        height: 32px;
        padding: 0 16px;
        border: none;
        border-radius: 16px;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        white-space: nowrap;
        transition: background 0.2s, transform 0.15s;
        -webkit-tap-highlight-color: transparent;

        &:active {
            transform: scale(0.96);
        }

        &--yes {
            background: var(--btn-primary-bg);
            color: var(--btn-primary-text);

            &:active {
                filter: brightness(0.9);
            }
        }

        &--no {
            background: var(--btn-default-bg);
            color: var(--btn-default-text);
            border: 1px solid var(--btn-default-border);

            &:active {
                background: var(--bg-hover);
            }
        }
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

    &__more-icon {
        display: inline-block;
        vertical-align: middle;
        color: var(--text-primary);
        flex-shrink: 0;
    }

    &__install {
        flex-shrink: 0;
        height: 34px;
        padding: 0 20px;
        border: none;
        border-radius: 17px;
        background: var(--btn-primary-bg);
        color: var(--btn-primary-text);
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: filter 0.2s, transform 0.15s;
        white-space: nowrap;

        &:active {
            filter: brightness(0.9);
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
