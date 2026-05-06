<script setup lang="ts">
import type { IDetailData } from '@/api';
import type { IArtplayerDanmuku, IEpisodeInfo, ISearchHint } from '@/api/danmaku';
import Artplayer from 'artplayer';
import Hls from 'hls.js';
import artplayerPluginDanmuku from 'artplayer-plugin-danmuku';
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue';
import { searchEpisodes, getComments, transformToArtplayerDanmuku } from '@/api/danmaku';
import { useHistory } from '@/composables/useHistory';

const { saveProgress } = useHistory();

const artRef = ref<HTMLElement>();
let art: Artplayer | null = null;
const videoData = reactive<{ src: string }>({ src: '' });
let currentEpisodeIndex = -1;
let lastSaveTime = 0;
let autoNext = localStorage.getItem('auto-next') !== 'false'; // default on

// Long-press speed playback state
const SPEED_RATE = 2; // 倍速播放速率
const LONG_PRESS_DELAY = 500; // 长按触发延迟(ms)
let isSpeedMode = false;
let originalRate = 1;
let longPressTimer: ReturnType<typeof setTimeout> | null = null;
let keydownActive = false; // 防止 keydown repeat 重复触发

// Danmaku state
let cachedEpisodes: IEpisodeInfo[] = [];
const danmakuTotal = ref(0);
const danmakuLoading = ref(false);
let danmakuReady: Promise<void> | null = null;
// Guard against stale async results when switching details rapidly
let fetchVersion = 0;

const props = defineProps<{
    data: IDetailData;
}>();

// Episode tab grouping (30 per tab)
const CHUNK_SIZE = 30;
const activeTab = ref(0);

const tabs = computed(() => {
    const total = props.data.vod_play_url_parse?.length || 0;
    if (total <= CHUNK_SIZE) return [];
    const result: { label: string; start: number; end: number }[] = [];
    for (let i = 0; i < total; i += CHUNK_SIZE) {
        const end = Math.min(i + CHUNK_SIZE, total);
        result.push({ label: `${i + 1}-${end}`, start: i, end });
    }
    return result;
});

const currentTabEpisodes = computed(() => {
    const urls = props.data.vod_play_url_parse || [];
    if (tabs.value.length === 0) return urls.map((url, i) => ({ url, index: i }));
    const tab = tabs.value[activeTab.value];
    if (!tab) return [];
    return urls.slice(tab.start, tab.end).map((url, i) => ({ url, index: tab.start + i }));
});

function playM3u8(video: HTMLMediaElement, url: string, artInstance: any) {
    if (Hls.isSupported()) {
        if (artInstance.hls) artInstance.hls.destroy();
        const hls = new Hls();
        hls.loadSource(url);
        hls.attachMedia(video);
        artInstance.hls = hls;
        artInstance.on('destroy', () => hls.destroy());
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = url;
    }
}

function initArtplayer(src: string, danmuku: IArtplayerDanmuku[] = []) {
    if (!artRef.value) return;
    if (art) {
        art.destroy(false);
        art = null;
    }

    art = new Artplayer({
        container: artRef.value,
        url: src,
        type: 'm3u8',
        customType: { m3u8: playM3u8 },
        autoSize: false,
        fullscreen: true,
        fullscreenWeb: true,
        pip: true,
        playbackRate: true,
        hotkey: true,
        setting: true,
        flip: true,
        aspectRatio: true,
        autoOrientation: true,
        lock: true,
        fastForward: false,
        theme: '#4285F4',
        layers: [
            {
                name: 'speedIndicator',
                html: `<div class="speed-indicator"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg><span class="speed-text">${SPEED_RATE}x 倍速播放中</span></div>`,
                style: {
                    position: 'absolute',
                    top: '12%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: '80',
                    pointerEvents: 'none',
                    display: 'none',
                },
            },
            {
                name: 'fullscreenHeader',
                html: `<div class="fs-header">
                    <button class="fs-back-btn">&lt;</button>
                    <span class="fs-title"></span>
                </div>`,
                style: {
                    position: 'absolute',
                    top: '0',
                    left: '0',
                    right: '0',
                    zIndex: '60',
                    pointerEvents: 'none',
                },
            },
        ],
        settings: [
            {
                html: '连续播放',
                icon: '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M17 1l4 4-4 4" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 11V9a4 4 0 0 1 4-4h14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M7 23l-4-4 4-4" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M21 13v2a4 4 0 0 1-4 4H3" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
                tooltip: autoNext ? '开启' : '关闭',
                switch: autoNext,
                onSwitch(item: any) {
                    const next = !item.switch;
                    autoNext = next;
                    localStorage.setItem('auto-next', String(next));
                    item.tooltip = next ? '开启' : '关闭';
                    return next;
                },
            },
            {
                html: '弹幕',
                icon: '<svg viewBox="0 0 1024 1024" width="22" height="22"><path d="M874.7 198H149.3C114.4 198 86 226.4 86 261.3v501.4c0 34.9 28.4 63.3 63.3 63.3h725.4c34.9 0 63.3-28.4 63.3-63.3V261.3c0-34.9-28.4-63.3-63.3-63.3zM320 420h-96c-17.7 0-32-14.3-32-32s14.3-32 32-32h96c17.7 0 32 14.3 32 32s-14.3 32-32 32zm224 0H416c-17.7 0-32-14.3-32-32s14.3-32 32-32h128c17.7 0 32 14.3 32 32s-14.3 32-32 32zm256 192H480c-17.7 0-32-14.3-32-32s14.3-32 32-32h320c17.7 0 32 14.3 32 32s-14.3 32-32 32zm0-192H672c-17.7 0-32-14.3-32-32s14.3-32 32-32h128c17.7 0 32 14.3 32 32s-14.3 32-32 32z" fill="currentColor"/></svg>',
                tooltip: '开启',
                switch: true,
                onSwitch(item: any) {
                    const next = !item.switch;
                    art!.plugins.artplayerPluginDanmuku[next ? 'show' : 'hide']();
                    item.tooltip = next ? '开启' : '关闭';
                    return next;
                },
            },
        ],
        plugins: [
            artplayerPluginDanmuku({
                danmuku,
                speed: 5,
                opacity: 0.8,
                fontSize: 22,
                antiOverlap: true,
                emitter: false,
                visible: true,
                theme: 'dark',
            }),
        ],
    });

    // Long-press speed playback handlers
    setupLongPressSpeed();

    // Progress tracking: throttled timeupdate + immediate on pause
    art.on('video:timeupdate', () => {
        const now = Date.now();
        if (now - lastSaveTime < 5000) return;
        lastSaveTime = now;
        flushProgress();
    });
    art.on('video:pause', () => flushProgress());

    // Auto-play next episode
    art.on('video:ended', () => {
        if (!autoNext || !art) return;
        const urls = props.data.vod_play_url_parse;
        const nextIndex = currentEpisodeIndex + 1;
        if (nextIndex < urls.length) {
            playVideo(urls[nextIndex], nextIndex);
        }
    });

    // Fullscreen header toolbar — visibility controlled by CSS
    const headerLayer = art.layers.fullscreenHeader;
    if (headerLayer) {
        const backBtn = headerLayer.querySelector('.fs-back-btn') as HTMLElement;
        const titleEl = headerLayer.querySelector('.fs-title') as HTMLElement;
        if (backBtn) {
            backBtn.style.pointerEvents = 'auto';
            backBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (!art) return;
                if (art.fullscreen) art.fullscreen = false;
                else if (art.fullscreenWeb) art.fullscreenWeb = false;
            });
        }
        const setTitle = () => {
            if (titleEl) titleEl.textContent = props.data.vod_name || '';
        };
        art.on('fullscreen', setTitle);
        art.on('fullscreenWeb', setTitle);
    }
}

// --- Long-press speed playback logic ---
function enterSpeedMode() {
    if (isSpeedMode || !art) return;
    if (art.paused) return; // 暂停状态不触发
    isSpeedMode = true;
    originalRate = art.playbackRate;
    art.playbackRate = SPEED_RATE;
    // 显示倍速指示器
    const layer = art.layers.speedIndicator;
    if (layer) layer.style.display = 'block';
}

function exitSpeedMode() {
    if (!isSpeedMode || !art) return;
    isSpeedMode = false;
    art.playbackRate = originalRate;
    // 隐藏倍速指示器
    const layer = art.layers.speedIndicator;
    if (layer) layer.style.display = 'none';
    // 清除定时器
    if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
    }
}

function setupLongPressSpeed() {
    if (!art) return;
    const container = art.template.$player;

    // --- PC: 长按左右方向键 ---
    const onKeyDown = (e: KeyboardEvent) => {
        if (!art || art.isInput) return;
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
        // 倍速模式中，阻止后续 keydown repeat 触发 Artplayer 的快进
        if (isSpeedMode) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }
        if (keydownActive) return; // 防止 repeat
        keydownActive = true;
        longPressTimer = setTimeout(() => {
            enterSpeedMode();
        }, LONG_PRESS_DELAY);
    };

    const onKeyUp = (e: KeyboardEvent) => {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
        keydownActive = false;
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
        }
        if (isSpeedMode) {
            exitSpeedMode();
        }
    };

    // --- Mobile: 长按触摸屏幕 ---
    const onTouchStart = (e: TouchEvent) => {
        if (!art) return;
        // 排除控制栏区域的触摸
        const target = e.target as HTMLElement;
        if (target.closest('.art-bottom') || target.closest('.art-control')) return;
        longPressTimer = setTimeout(() => {
            enterSpeedMode();
        }, LONG_PRESS_DELAY);
    };

    const onTouchEnd = () => {
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
        }
        if (isSpeedMode) {
            exitSpeedMode();
        }
    };

    const onTouchMove = () => {
        // 手指移动时取消长按
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
        }
    };

    // 绑定事件（capture 阶段拦截，优先于 Artplayer 的 hotkey）
    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('keyup', onKeyUp, true);
    container.addEventListener('touchstart', onTouchStart, { passive: true });
    container.addEventListener('touchend', onTouchEnd);
    container.addEventListener('touchcancel', onTouchEnd);
    container.addEventListener('touchmove', onTouchMove, { passive: true });

    // 播放器销毁时清理
    art.on('destroy', () => {
        document.removeEventListener('keydown', onKeyDown, true);
        document.removeEventListener('keyup', onKeyUp, true);
        container.removeEventListener('touchstart', onTouchStart);
        container.removeEventListener('touchend', onTouchEnd);
        container.removeEventListener('touchcancel', onTouchEnd);
        container.removeEventListener('touchmove', onTouchMove);
        exitSpeedMode();
    });
}

const resetVideo = () => {
    if (art) {
        art.destroy(false);
        art = null;
    }
    if (artRef.value) {
        artRef.value.innerHTML = '';
    }
    videoData.src = '';
};

function flushProgress() {
    if (!art || currentEpisodeIndex < 0 || !props.data.vod_id) return;
    const currentTime = art.currentTime || 0;
    const duration = art.duration || 0;
    if (duration <= 0) return;
    saveProgress({
        vodId: props.data.vod_id,
        vodName: props.data.vod_name,
        vodPic: props.data.vod_pic,
        totalEpisodes: props.data.vod_play_url_parse?.length || 0,
        currentEpisode: currentEpisodeIndex,
        currentTime,
        duration,
    });
}

const loadDanmaku = async (episodeIndex: number) => {
    if (!cachedEpisodes.length || episodeIndex >= cachedEpisodes.length) return [];
    const episode = cachedEpisodes[episodeIndex];
    const comments = await getComments(episode.episodeId);
    return transformToArtplayerDanmuku(comments);
};

const playVideo = async (src: string, index: number, seekTime?: number, autoPlay = true) => {
    currentEpisodeIndex = index;
    // Auto-switch tab to match the episode
    if (tabs.value.length > 0) {
        activeTab.value = Math.floor(index / CHUNK_SIZE);
    }
    // Immediately init player — no waiting for danmaku
    if (!art) {
        initArtplayer(src);
    } else {
        await art.switchUrl(src);
    }
    videoData.src = src;
    if (autoPlay) art?.play();

    // Seek to saved position if provided
    if (seekTime && seekTime > 0 && art) {
        art.once('video:canplay', () => {
            if (art && videoData.src === src) {
                art.currentTime = seekTime;
            }
        });
    }

    // After current click event finishes propagation, focus the player.
    // Use setTimeout(0) to escape the current event loop so ArtPlayer's
    // document:click handler won't override isFocus back to false.
    setTimeout(() => {
        (document.activeElement as HTMLElement)?.blur();
        if (art) {
            art.isFocus = true;
            art.isInput = false;
        }
    }, 0);

    // Load danmaku in background, inject when ready
    const injectDanmaku = async () => {
        if (danmakuReady) await danmakuReady;
        const danmuku = await loadDanmaku(index);
        // Guard: user may have switched to another episode/video while loading
        if (videoData.src !== src || !art) return;
        art.plugins.artplayerPluginDanmuku.config({ danmuku });
        art.plugins.artplayerPluginDanmuku.load();
    };
    injectDanmaku();
};

// Exposed to parent: fetch danmaku when detail loaded
const fetchDanmaku = async () => {
    const d = props.data;
    // Bump version so any in-flight request from previous detail becomes stale
    const version = ++fetchVersion;
    resetVideo();
    cachedEpisodes = [];
    danmakuTotal.value = 0;
    if (!d.vod_name) return;

    // Auto-load first episode without playing
    const urls = d.vod_play_url_parse;
    if (urls?.length) {
        playVideo(urls[0], 0, undefined, false);
    }

    danmakuLoading.value = true;
    let resolveDanmaku: () => void;
    danmakuReady = new Promise<void>((r) => {
        resolveDanmaku = r;
    });
    const hint: ISearchHint = {
        name: d.vod_name,
        actor: d.vod_actor,
        director: d.vod_director,
        year: d.vod_year,
    };
    const expectedEpisodes = d.vod_play_url_parse?.length || 0;
    const results = await searchEpisodes(hint, expectedEpisodes);
    // Stale check: if user switched to another detail while we were awaiting, discard
    if (version !== fetchVersion) return;
    if (results.length > 0) {
        cachedEpisodes = results[0].episodes ?? [];
        // Show the lesser of API episodes and video source episodes,
        // since episodes beyond video source count are never used.
        danmakuTotal.value = Math.min(cachedEpisodes.length, expectedEpisodes || cachedEpisodes.length);
    }
    danmakuLoading.value = false;
    resolveDanmaku!();
    danmakuReady = null;
};

defineExpose({ fetchDanmaku, playVideo });

onBeforeUnmount(() => {
    flushProgress();
    if (art) {
        art.destroy(false);
        art = null;
    }
});
</script>

<template>
    <div class="detail-view">
        <h1 class="title">
            {{ props.data.vod_name }}
        </h1>
        <div class="info">
            <img :src="props.data.vod_pic" class="avatar" />
            <div class="right">
                <div class="item">
                    导演:<span>{{ props.data.vod_director }}</span>
                </div>
                <div class="item">
                    主演:<span>{{ props.data.vod_actor }}</span>
                </div>
                <div class="item">
                    类型:<span>{{ props.data.type_name }}</span>
                </div>
                <div class="item">
                    语言:<span>{{ props.data.vod_lang }}</span>
                </div>
                <div class="item">
                    制片国家地区:<span>{{ props.data.vod_area }}</span>
                </div>
                <div class="item">
                    又名:<span>{{ props.data.vod_sub }}</span>
                </div>
                <div class="item">
                    更新时间:<span>{{ props.data.vod_time }}</span>
                </div>
                <div class="item">
                    弹幕:<span v-if="danmakuLoading">匹配中...</span>
                    <span v-else-if="danmakuTotal">已匹配 {{ danmakuTotal }} 个弹幕源</span>
                    <span v-else class="danmaku-none">暂无弹幕数据</span>
                </div>
            </div>
        </div>
        <div class="description">
            <h3 class="title">{{ props.data.vod_name }}剧情简介</h3>
            <div class="content">{{ props.data.vod_content.trim() }}</div>
        </div>
        <div class="play-container">
            <h3>
                选集<span class="episode-count">（更新至{{ props.data.vod_play_url_parse.length }}集）</span>
            </h3>
            <div v-if="tabs.length" class="episode-tabs">
                <button
                    v-for="(tab, i) in tabs"
                    :key="i"
                    :class="['tab-btn', { active: activeTab === i }]"
                    @click="activeTab = i"
                >
                    {{ tab.label }}
                </button>
            </div>
            <div class="episode-grid">
                <button
                    v-for="ep in currentTabEpisodes"
                    :key="ep.index"
                    :class="['ep-btn', { playing: videoData.src === ep.url }]"
                    @click.stop="playVideo(ep.url, ep.index)"
                >
                    {{ ep.index + 1 }}
                </button>
            </div>
        </div>
        <div class="video-wrapper">
            <div ref="artRef" class="art-player"></div>
        </div>
    </div>
</template>

<style scoped lang="less">
.detail-view {
    .title {
        margin-bottom: 10px;
        color: var(--text-primary);
    }
    .info {
        overflow: hidden;
        display: flex;
        margin-bottom: 30px;
        .avatar {
            flex: 0 0 200px;
            width: 200px;
            border-radius: 4px;
            object-fit: cover;
        }
        .right {
            flex: 1;
            margin-left: 20px;

            .item {
                line-height: 25px;
                font-size: 13px;
                color: var(--text-secondary);

                span {
                    margin-left: 10px;
                    color: var(--text-primary);
                }

                .danmaku-none {
                    color: var(--text-tertiary);
                }
            }
        }
    }

    .description {
        margin-bottom: 20px;
        .title {
            color: var(--text-accent);
        }

        .content {
            text-indent: 2em;
            color: var(--text-secondary);
            line-height: 1.8;
        }
    }

    .play-container {
        margin-bottom: 10px;
        h3 {
            margin-bottom: 10px;
            color: var(--text-primary);

            .episode-count {
                font-size: 13px;
                font-weight: normal;
                color: var(--text-secondary);
            }
        }

        .episode-tabs {
            display: flex;
            gap: 0;
            margin-bottom: 12px;
            border-bottom: 1px solid var(--border-color);

            .tab-btn {
                padding: 6px 16px;
                border: none;
                border-bottom: 2px solid transparent;
                background: none;
                color: var(--text-tertiary);
                font-size: 13px;
                cursor: pointer;
                transition: all 0.2s ease;
                white-space: nowrap;

                &:hover {
                    color: var(--text-primary);
                }

                &.active {
                    color: var(--btn-primary-bg);
                    border-bottom-color: var(--btn-primary-bg);
                    font-weight: 500;
                }
            }
        }

        .episode-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, 50px);
            gap: 6px;

            .ep-btn {
                width: 50px;
                height: 50px;
                display: flex;
                align-items: center;
                justify-content: center;
                border: 1px solid var(--border-color);
                border-radius: 6px;
                background: var(--bg-secondary);
                color: var(--text-primary);
                font-size: 13px;
                cursor: pointer;
                transition: all 0.15s ease;

                &:hover {
                    border-color: var(--btn-primary-bg);
                    color: var(--btn-primary-bg);
                    background: var(--bg-hover);
                }

                &.playing {
                    background: var(--btn-primary-bg);
                    border-color: var(--btn-primary-bg);
                    color: var(--btn-primary-text);
                }
            }
        }
    }

    .video-wrapper {
        position: relative;
        container-type: inline-size;

        .art-player {
            width: 100%;
            aspect-ratio: 16 / 9;
        }
    }
}

/* 基于播放器容器宽度自适应隐藏控制栏按钮 */
/* < 500px: 隐藏宽高比（保留全屏按钮作为移动端唯一入口） */
@container (max-width: 500px) {
    .art-player :deep(.art-control-aspectRatio) {
        display: none !important;
    }
    .art-player :deep(.art-control-time) {
        font-size: 11px !important;
    }
}

/* < 400px: 额外隐藏画中画 */
@container (max-width: 400px) {
    .art-player :deep(.art-control-pip) {
        display: none !important;
    }
}

/* < 320px: 额外隐藏翻转，只保留播放/音量/进度/设置/全屏 */
@container (max-width: 320px) {
    .art-player :deep(.art-control-flip) {
        display: none !important;
    }
}

@media screen and (max-width: 768px) {
    .detail-view {
        .info {
            flex-direction: column;
            align-items: center;
            margin-bottom: 20px;

            .avatar {
                flex: none;
                width: 100%;
                max-width: 200px;
                margin-bottom: 15px;
            }

            .right {
                margin-left: 0;
                width: 100%;
            }
        }

        .video-wrapper {
            margin-left: -16px;
            margin-right: -16px;
            width: calc(100% + 32px);

            .art-player {
                border-radius: 0;
            }
        }

        .play-container {
            .episode-tabs {
                .tab-btn {
                    padding: 5px 12px;
                    font-size: 12px;
                }
            }

            .episode-grid {
                grid-template-columns: repeat(auto-fill, 44px);
                gap: 5px;

                .ep-btn {
                    width: 44px;
                    height: 44px;
                    font-size: 12px;
                }
            }
        }
    }
}
</style>

<style lang="less">
/* Global styles for fullscreen mode (DOM is hoisted to body, outside scoped scope) */

/* Fullscreen header toolbar: hidden by default, show on hover in fullscreen, hide when locked */
.art-layer-fullscreenHeader {
    display: none !important;
}

.art-fullscreen.art-hover:not(.art-lock) .art-layer-fullscreenHeader,
.art-fullscreen-web.art-hover:not(.art-lock) .art-layer-fullscreenHeader {
    display: block !important;
}

/* Non-fullscreen: also hidden (layer is inside .art-player in normal mode) */
.art-player .art-layer-fullscreenHeader {
    display: none !important;
}

/* Fullscreen: increase control bar safe area padding */
.art-fullscreen .art-bottom,
.art-fullscreen-web .art-bottom {
    padding-bottom: max(10px, env(safe-area-inset-bottom)) !important;
    padding-left: max(16px, env(safe-area-inset-left)) !important;
    padding-right: max(16px, env(safe-area-inset-right)) !important;
}

/* Fullscreen header bar (must be global — DOM hoisted to body in fullscreen) */
.fs-header {
    display: flex;
    align-items: center;
    padding: 14px 16px;
    padding-top: max(14px, env(safe-area-inset-top));
    background: linear-gradient(to bottom, rgba(0, 0, 0, 0.5) 0%, rgba(0, 0, 0, 0.15) 70%, transparent 100%);
    color: #fff;
    min-height: 48px;

    .fs-back-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 44px;
        height: 44px;
        margin: -10px;
        margin-right: -4px;
        border: none;
        border-radius: 50%;
        background: transparent;
        color: #fff;
        font-size: 22px;
        font-weight: 300;
        cursor: pointer;
        flex-shrink: 0;
        -webkit-tap-highlight-color: transparent;

        &:active {
            background: rgba(255, 255, 255, 0.12);
        }
    }

    .fs-title {
        margin-left: 4px;
        font-size: 16px;
        font-weight: 500;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
    }
}

/* Speed indicator styles */
.speed-indicator {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 8px 16px;
    background: rgba(0, 0, 0, 0.8);
    border-radius: 16px;
    color: #fff;
    font-size: 14px;
    font-weight: 500;
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);

    .speed-text {
        margin-left: 8px;
    }
}
</style>
