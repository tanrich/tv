<script setup lang="ts">
import type { IDetailData } from '@/api';
import type { IArtplayerDanmuku, IEpisodeInfo, ISearchHint } from '@/api/danmaku';
import Artplayer from 'artplayer';
import Hls from 'hls.js';
import artplayerPluginDanmuku from 'artplayer-plugin-danmuku';
import { onBeforeUnmount, reactive, ref, watch } from 'vue';
import { Button } from 'view-ui-plus';
import { searchEpisodes, getComments, transformToArtplayerDanmuku } from '@/api/danmaku';
import { useHistory } from '@/composables/useHistory';

const { saveProgress } = useHistory();

const artRef = ref<HTMLElement>();
let art: Artplayer | null = null;
const videoData = reactive<{ src: string }>({ src: '' });
let currentEpisodeIndex = -1;
let lastSaveTime = 0;

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
        autoSize: true,
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
        fastForward: true,
        theme: '#4285F4',
        settings: [
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

    // Progress tracking: throttled timeupdate + immediate on pause
    art.on('video:timeupdate', () => {
        const now = Date.now();
        if (now - lastSaveTime < 5000) return;
        lastSaveTime = now;
        flushProgress();
    });
    art.on('video:pause', () => flushProgress());
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

const playVideo = async (src: string, index: number, seekTime?: number) => {
    currentEpisodeIndex = index;
    // Immediately init player & start playback — no waiting for danmaku
    if (!art) {
        initArtplayer(src);
    } else {
        art.switchUrl(src);
    }
    videoData.src = src;
    art?.play();

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

    danmakuLoading.value = true;
    let resolveDanmaku: () => void;
    danmakuReady = new Promise<void>((r) => { resolveDanmaku = r; });
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
            <h3>更新至{{ props.data.vod_play_url_parse.length }}集</h3>
            <div class="play-btn-wrapper">
                <Button
                    v-for="(url, index) in props.data.vod_play_url_parse"
                    class="play-btn"
                    :type="videoData.src === url ? 'primary' : 'default'"
                    :key="url"
                    size="large"
                    @click.stop="playVideo(url, index)"
                    >{{ index + 1 }}</Button
                >
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
        }

        .play-btn-wrapper {
            display: flex;
            flex-wrap: wrap;

            .play-btn {
                margin-right: 10px;
                margin-top: 10px;
                min-width: 50px;
                text-align: center;
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
/* < 500px: 隐藏网页全屏、宽高比 */
@container (max-width: 500px) {
    .art-player :deep(.art-control-fullscreenWeb),
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
    }
}
</style>
