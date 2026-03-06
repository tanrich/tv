<script setup lang="ts">
import type Player from 'video.js/dist/types/player';
import type { IDetailData } from '@/api';
import { onMounted, reactive, ref, watch } from 'vue';
import { Key } from 'ts-keycode-enum';
import { Button } from 'view-ui-plus';
import { getComponentByDescendant } from '@/common/util';

async function initVideo(options = {}) {
    const videoJs = (await import('video.js')).default;
    return new Promise<Player>((resolve) => {
        const videoRef: Player = videoJs(
            'video',
            {
                width: 400,
                controls: true,
                muted: false,
                enableSmoothSeeking: true,
                preferFullWindow: true,
                controlBar: {
                    skipButtons: {
                        forward: 30,
                        backward: 30,
                    },
                },
                playbackRates: [0.5, 1, 1.5, 2],
                userActions: {
                    hotkeys: ({ which }: { which: number }) => {
                        switch (which) {
                            case Key.RightArrow: {
                                const SkipForward: any = getComponentByDescendant(videoRef, 'SkipForward');
                                SkipForward.handleClick();
                                break;
                            }
                            case Key.LeftArrow: {
                                const SkipBackward: any = getComponentByDescendant(videoRef, 'SkipBackward');
                                SkipBackward.handleClick();
                                break;
                            }
                            case Key.Space: {
                                videoRef.paused() ? videoRef.play() : videoRef.pause();
                            }
                        }
                    },
                },
                ...options,
            },
            () => resolve(videoRef),
        );
        return videoRef;
    });
}

const videoWrapperRef = ref<HTMLElement>();
let videoComponent: Player | undefined;
const videoData = reactive<{
    src: string;
}>({
    src: '',
});

const props = defineProps<{
    data: IDetailData;
}>();

const resetVideo = () => {
    videoComponent?.reset();
    videoData.src = '';
};
const loadVideo = async (src: string) => {
    if (!videoComponent) {
        const width = videoWrapperRef.value?.getBoundingClientRect().width ?? 400;
        videoComponent = await initVideo({ width });
    }
    videoComponent.src(src);
    videoData.src = src;
};
const playVideo = async (src: string) => {
    await loadVideo(src);
    videoComponent?.play();
    // videoData.src = `https://vip.zykbf.com/?url=${src}`;
};

onMounted(() => {
    if (props.data.vod_play_url_parse.length) {
        // setTimeout(() => loadVideo(props.data.vod_play_url_parse[0]), 2000);
    }
});

watch(
    () => props.data,
    () => {
        resetVideo();
    },
);
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
                    @click.stop="playVideo(url)"
                    >{{ index + 1 }}</Button
                >
            </div>
        </div>
        <div class="video-wrapper" ref="videoWrapperRef" @keydown.stop>
            <video id="video" class="video-js" preload="auto" @keydown.prevent></video>
            <!-- <iframe :src="videoData.src" frameborder="0"></iframe> -->
        </div>
    </div>
</template>

<style scoped lang="less">
.detail-view {
    .title {
        margin-bottom: 10px;
    }
    .info {
        overflow: hidden;
        display: flex;
        margin-bottom: 50px;
        .avatar {
            flex: 0 0 200px;
            width: 200px;
        }
        .right {
            flex: 1;
            margin-left: 20px;

            .item {
                line-height: 25px;
                font-size: 13px;
                color: #666;

                span {
                    margin-left: 10px;
                    color: #111111;
                }
            }
        }
    }

    .description {
        margin-bottom: 20px;
        .title {
            color: #007722;
        }

        .content {
            text-indent: 2em;
        }
    }

    .play-container {
        margin-bottom: 10px;
        h3 {
            margin-bottom: 10px;
        }

        .play-btn-wrapper {
            .play-btn {
                margin-right: 10px;
                margin-top: 10px;
            }
        }
    }

    .video-wrapper {
        video {
            width: 100%;
        }
    }
}
</style>
